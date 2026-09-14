import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { readJsonObject, RequestBodyError } from '../_shared/request-security.ts';
import { consumeRateLimit, rateLimitHeaders, type RateLimitClient } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SMARTDSP_ALLOWED_ORIGIN') ?? 'https://smart-dsp.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-backup-restore-cron-secret',
  'Access-Control-Max-Age': '86400',
};

const backupTables = [
  'profiles',
  'departments',
  'course_categories',
  'training_records',
  'certificates',
  'development_analysis',
  'login_history',
  'audit_logs',
  'system_settings',
  'site_content_documents',
  'site_content_history',
  'portal_user_manuals',
  'strategy_events',
  'meeting_room_reservations',
  'it_assets',
  'it_asset_evaluation_settings',
  'spd_service_categories',
  'spd_service_request_subjects',
  'spd_service_tickets',
  'spd_service_ticket_timeline',
  'spd_service_satisfaction_surveys',
  'spd_service_notification_settings',
  'spd_assistant_sources',
  'spd_assistant_knowledge',
  'spd_assistant_page_contexts',
  'spd_assistant_conversations',
  'spd_assistant_messages',
  'spd_assistant_feedback',
  'public_visit_sessions',
  'public_page_views',
] as const;

const backupStorageBuckets = [
  'site-content-assets',
  'spd-assistant-imports',
  'spd-service-request-guides',
] as const;

const backupStorageBucketSet = new Set<string>(backupStorageBuckets);
const maxRestoreRowsPerTable = 100_000;
const maxRestoreRowsTotal = 250_000;

type BackupTableName = typeof backupTables[number];

type Caller = {
  type: 'manual' | 'scheduler';
  userId: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
};

type BackupPayload = {
  schema_version: 1;
  app: 'PTDMS';
  backup_id: string;
  created_at: string;
  created_by: Caller;
  tables: Record<string, unknown[]>;
  storage_manifest: Array<Record<string, unknown>>;
  summary: {
    table_count: number;
    row_count: number;
    storage_object_count: number;
  };
};

type StorageRestoreFile = {
  bucket: string;
  path: string;
  name?: string;
  content_type?: string;
  size?: number;
  base64: string;
};

type StorageRestoreResponse = {
  ok?: boolean;
  folder_id?: string;
  manifest_count?: number;
  returned_files?: number;
  total_bytes?: number;
  files?: StorageRestoreFile[];
  errors?: Array<{ bucket?: string; path?: string; error: string }>;
  error?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function getBearerToken(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

async function authorizeBackupRequest(req: Request, adminClient: ReturnType<typeof createClient>) {
  const cronSecret = Deno.env.get('BACKUP_RESTORE_CRON_SECRET');
  const requestSecret = req.headers.get('x-backup-restore-cron-secret') || '';

  if (cronSecret && requestSecret === cronSecret) {
    return {
      authorized: true,
      caller: {
        type: 'scheduler',
        userId: null,
        email: null,
        name: 'Google Apps Script Daily Backup',
        role: 'scheduler',
      } as Caller,
    };
  }

  const token = getBearerToken(req);
  if (!token) {
    return { authorized: false, status: 401, reason: 'missing_authorization' };
  }

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return { authorized: false, status: 401, reason: 'invalid_authorization' };
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('user_id, full_name, role, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('backup authorization profile lookup failed', profileError);
    return { authorized: false, status: 500, reason: 'profile_lookup_failed' };
  }

  if (profile?.role !== 'super_admin' || profile?.status !== 'active') {
    return { authorized: false, status: 403, reason: 'super_admin_required' };
  }

  return {
    authorized: true,
    caller: {
      type: 'manual',
      userId: user.id,
      email: user.email ?? null,
      name: profile.full_name ?? null,
      role: profile.role ?? null,
    } as Caller,
  };
}

function pickTables(input: unknown): BackupTableName[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...backupTables];
  }

  const allowed = new Set<string>(backupTables);
  const selected = input.filter((table): table is BackupTableName => typeof table === 'string' && allowed.has(table));
  return selected.length > 0 ? selected : [...backupTables];
}

async function exportTables(adminClient: ReturnType<typeof createClient>, tables: BackupTableName[]) {
  const result: Record<string, unknown[]> = {};
  let rowCount = 0;

  for (const table of tables) {
    const rows: unknown[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await adminClient
        .from(table)
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`table_export_failed:${table}:${error.message}`);
      }

      const batch = Array.isArray(data) ? data : [];
      rows.push(...batch);
      rowCount += batch.length;

      if (batch.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    result[table] = rows;
  }

  return { tables: result, rowCount };
}

async function listStorageObjects(adminClient: ReturnType<typeof createClient>) {
  const objects: Array<Record<string, unknown>> = [];

  async function walk(bucketName: string, prefix = '') {
    const { data, error } = await adminClient.storage.from(bucketName).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('backup storage list failed', { bucketName, prefix, error: error.message });
      return;
    }

    for (const item of data || []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = !item.id && !item.metadata;

      if (isFolder) {
        await walk(bucketName, path);
        continue;
      }

      const signed = await adminClient.storage.from(bucketName).createSignedUrl(path, 60 * 60).catch(() => ({ data: null, error: null }));
      objects.push({
        bucket: bucketName,
        path,
        name: item.name,
        id: item.id ?? null,
        updated_at: item.updated_at ?? null,
        created_at: item.created_at ?? null,
        metadata: item.metadata ?? null,
        signed_url: signed.data?.signedUrl ?? null,
      });
    }
  }

  for (const bucketName of backupStorageBuckets) {
    await walk(bucketName);
  }

  return objects;
}

async function sendBackupToAppsScript(backup: BackupPayload) {
  const appsScriptUrl = Deno.env.get('BACKUP_RESTORE_APPS_SCRIPT_URL');
  const backupSecret = Deno.env.get('BACKUP_RESTORE_SECRET');

  if (!appsScriptUrl || !backupSecret) {
    return { ok: false, skipped: true, reason: 'missing_backup_restore_env' };
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Backup-Restore-Secret': backupSecret,
    },
    body: JSON.stringify({
      event: 'ptdms_backup_created',
      export_secret: backupSecret,
      backup,
    }),
  });

  const responseText = await response.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (!response.ok || parsed?.ok === false) {
    console.error('backup Apps Script request failed', {
      status: response.status,
      body: String(parsed?.error || responseText || response.statusText).slice(0, 500),
    });
    return {
      ok: false,
      skipped: false,
      reason: 'apps_script_request_failed',
      status: response.status,
    };
  }

  return {
    ok: true,
    skipped: false,
    result: parsed || { message: responseText },
  };
}

async function requestStorageFilesFromAppsScript(folderIdOrUrl: string) {
  const appsScriptUrl = Deno.env.get('BACKUP_RESTORE_APPS_SCRIPT_URL');
  const backupSecret = Deno.env.get('BACKUP_RESTORE_SECRET');

  if (!appsScriptUrl || !backupSecret) {
    throw new Error('missing_backup_restore_env');
  }

  const response = await fetch(appsScriptUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Backup-Restore-Secret': backupSecret,
    },
    body: JSON.stringify({
      event: 'ptdms_restore_storage',
      export_secret: backupSecret,
      backup_folder_url: folderIdOrUrl,
      max_files: 200,
      max_bytes: 25 * 1024 * 1024,
    }),
  });

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > 36 * 1024 * 1024) {
    throw new Error('storage_restore_response_too_large');
  }

  const responseText = await response.text();
  if (new TextEncoder().encode(responseText).byteLength > 36 * 1024 * 1024) {
    throw new Error('storage_restore_response_too_large');
  }
  let parsed: StorageRestoreResponse | null = null;
  try {
    parsed = JSON.parse(responseText) as StorageRestoreResponse;
  } catch {
    parsed = null;
  }

  if (!response.ok || parsed?.ok === false || !parsed) {
    throw new Error(String(parsed?.error || responseText || response.statusText || 'storage_restore_fetch_failed').slice(0, 500));
  }

  if (!Array.isArray(parsed.files) || parsed.files.length > 200) {
    throw new Error('invalid_storage_restore_file_count');
  }

  return parsed;
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function restoreStorageFiles(adminClient: ReturnType<typeof createClient>, folderIdOrUrl: string) {
  const driveResult = await requestStorageFilesFromAppsScript(folderIdOrUrl);
  const restored: Record<string, number> = {};
  const errors: Array<{ bucket: string; path: string; error: string }> = [];
  let totalDecodedBytes = 0;

  for (const file of driveResult.files || []) {
    if (!file.bucket || !file.path || !file.base64) {
      continue;
    }

    if (!backupStorageBucketSet.has(file.bucket)) {
      errors.push({
        bucket: file.bucket,
        path: file.path,
        error: 'bucket_not_allowed',
      });
      continue;
    }

    try {
      const bytes = base64ToUint8Array(file.base64);
      totalDecodedBytes += bytes.byteLength;
      if (totalDecodedBytes > 25 * 1024 * 1024) {
        errors.push({
          bucket: file.bucket,
          path: file.path,
          error: 'restore_bytes_limit_exceeded',
        });
        break;
      }
      const { error } = await adminClient.storage
        .from(file.bucket)
        .upload(file.path, bytes, {
          upsert: true,
          contentType: file.content_type || 'application/octet-stream',
        });

      if (error) {
        errors.push({ bucket: file.bucket, path: file.path, error: error.message });
        continue;
      }

      restored[file.bucket] = (restored[file.bucket] || 0) + 1;
    } catch (error) {
      errors.push({
        bucket: file.bucket,
        path: file.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const error of driveResult.errors || []) {
    errors.push({
      bucket: String(error.bucket || ''),
      path: String(error.path || ''),
      error: error.error,
    });
  }

  return {
    restored,
    errors,
    manifest_count: driveResult.manifest_count || 0,
    returned_files: driveResult.returned_files || 0,
    total_bytes: driveResult.total_bytes || 0,
    folder_id: driveResult.folder_id || null,
  };
}
async function recordBackupAudit(
  adminClient: ReturnType<typeof createClient>,
  caller: Caller,
  action: string,
  status: 'success' | 'fail',
  metadata: Record<string, unknown>,
) {
  await adminClient.from('audit_logs').insert({
    actor_id: caller.userId,
    actor_user_id: caller.userId,
    actor_email: caller.email,
    actor_name: caller.name,
    actor_role: caller.role,
    module: 'backup_restore',
    action,
    resource_type: 'backup_restore',
    route: '/admin/security',
    target_type: 'backup_restore',
    status,
    metadata,
    export_status: 'pending',
  }).then(() => null, () => null);
}

function parseBackupPayload(input: unknown): BackupPayload | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const value = input as Record<string, unknown>;
  const tables = value.tables;
  const backupId = typeof value.backup_id === 'string' ? value.backup_id : '';
  const createdAt = typeof value.created_at === 'string' ? value.created_at : '';

  if (
    value.app !== 'PTDMS'
    || value.schema_version !== 1
    || !tables
    || typeof tables !== 'object'
    || Array.isArray(tables)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(backupId)
    || !createdAt
    || Number.isNaN(Date.parse(createdAt))
  ) {
    return null;
  }

  const allowedTables = new Set<string>(backupTables);
  if (Object.entries(tables).some(([table, rows]) => !allowedTables.has(table) || !Array.isArray(rows))) {
    return null;
  }

  const rowCounts = Object.values(tables).map((rows) => (rows as unknown[]).length);
  if (
    rowCounts.some((count) => count > maxRestoreRowsPerTable)
    || rowCounts.reduce((total, count) => total + count, 0) > maxRestoreRowsTotal
  ) {
    return null;
  }

  return value as BackupPayload;
}

async function restoreTables(adminClient: ReturnType<typeof createClient>, backup: BackupPayload) {
  const restored: Record<string, number> = {};
  const errors: Array<{ table: string; error: string }> = [];

  for (const table of backupTables) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    const chunkSize = 250;
    let restoredRows = 0;

    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize) as Record<string, unknown>[];
      const { error } = await adminClient.from(table).upsert(chunk);

      if (error) {
        errors.push({ table, error: error.message });
        break;
      }

      restoredRows += chunk.length;
    }

    if (restoredRows > 0) {
      restored[table] = restoredRows;
    }
  }

  return { restored, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, reason: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, reason: 'missing_supabase_env' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const authResult = await authorizeBackupRequest(req, adminClient);
  if (!authResult.authorized) {
    return jsonResponse({ ok: false, reason: authResult.reason }, authResult.status);
  }

  const caller = authResult.caller;
  const rateLimit = await consumeRateLimit(
    adminClient as unknown as RateLimitClient,
    'backup-restore-data',
    caller.userId ?? caller.type,
    6,
    15 * 60,
  ).catch(() => null);
  if (!rateLimit) {
    return jsonResponse({ ok: false, reason: 'rate_limit_unavailable' }, 503);
  }
  if (!rateLimit.allowed) {
    return jsonResponse(
      { ok: false, reason: 'rate_limited' },
      429,
      rateLimitHeaders(rateLimit),
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(req, 25 * 1024 * 1024);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse({ ok: false, reason: error.reason }, error.status);
    }
    throw error;
  }
  const action = typeof body.action === 'string' ? body.action : '';

  try {
    if (action === 'create_backup') {
      const selectedTables = pickTables(body.tables);
      const backupId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      console.log('backup create started', { backup_id: backupId, table_count: selectedTables.length, include_storage: body.includeStorage !== false });
      const exported = await exportTables(adminClient, selectedTables);
      console.log('backup tables exported', { backup_id: backupId, row_count: exported.rowCount });
      const storageManifest = body.includeStorage === false ? [] : await listStorageObjects(adminClient);
      console.log('backup storage manifest created', { backup_id: backupId, storage_object_count: storageManifest.length });
      const backup: BackupPayload = {
        schema_version: 1,
        app: 'PTDMS',
        backup_id: backupId,
        created_at: createdAt,
        created_by: caller,
        tables: exported.tables,
        storage_manifest: storageManifest,
        summary: {
          table_count: selectedTables.length,
          row_count: exported.rowCount,
          storage_object_count: storageManifest.length,
        },
      };

      const hasAppsScriptConfig = Boolean(Deno.env.get('BACKUP_RESTORE_APPS_SCRIPT_URL') && Deno.env.get('BACKUP_RESTORE_SECRET'));
      if (!hasAppsScriptConfig) {
        const appsScript = { ok: false, skipped: true, reason: 'missing_backup_restore_env' };
        let auditWarning: string | null = null;
        try {
          await recordBackupAudit(adminClient, caller, 'backup_created', 'fail', {
            backup_id: backupId,
            table_count: backup.summary.table_count,
            row_count: backup.summary.row_count,
            storage_object_count: backup.summary.storage_object_count,
            apps_script: appsScript,
          });
        } catch (auditError) {
          auditWarning = 'backup_audit_failed';
          console.error('backup audit failed after backup creation', { backup_id: backupId, message: auditWarning });
        }

        return jsonResponse({
          ok: true,
          backup_id: backupId,
          created_at: createdAt,
          summary: backup.summary,
          apps_script: appsScript,
          audit_warning: auditWarning,
        });
      }

      const uploadTask = (async () => {
        try {
          console.log('backup apps script upload started', { backup_id: backupId });
          const appsScript = await sendBackupToAppsScript(backup);
          console.log('backup apps script upload finished', { backup_id: backupId, ok: appsScript.ok, skipped: appsScript.skipped, reason: appsScript.reason || null });

          try {
            await recordBackupAudit(adminClient, caller, 'backup_created', appsScript.ok ? 'success' : 'fail', {
              backup_id: backupId,
              table_count: backup.summary.table_count,
              row_count: backup.summary.row_count,
              storage_object_count: backup.summary.storage_object_count,
              apps_script: appsScript,
            });
          } catch (auditError) {
            const message = auditError instanceof Error ? auditError.message : 'backup_audit_failed';
            console.error('backup audit failed after backup creation', { backup_id: backupId, message });
          }
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : 'backup_apps_script_upload_failed';
          console.error('backup apps script upload failed', { backup_id: backupId, message });
        }
      })();

      const edgeRuntime = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
      if (edgeRuntime?.waitUntil) {
        edgeRuntime.waitUntil(uploadTask);
      } else {
        uploadTask.catch((error) => console.error('backup background upload failed', { backup_id: backupId, message: error instanceof Error ? error.message : String(error) }));
      }

      return jsonResponse({
        ok: true,
        backup_id: backupId,
        created_at: createdAt,
        summary: backup.summary,
        apps_script: { queued: true, skipped: false },
        audit_warning: null,
      });
    }

    if (action === 'restore_backup') {
      if (caller.type === 'scheduler') {
        return jsonResponse({ ok: false, reason: 'scheduler_restore_not_allowed' }, 403);
      }
      const backup = parseBackupPayload(body.backup);
      if (!backup) {
        return jsonResponse({ ok: false, reason: 'invalid_backup_payload' }, 400);
      }

      const result = await restoreTables(adminClient, backup);
      await recordBackupAudit(adminClient, caller, 'backup_restored', result.errors.length === 0 ? 'success' : 'fail', {
        backup_id: backup.backup_id,
        restored: result.restored,
        errors: result.errors.map(({ table }) => ({ table, error: 'restore_failed' })),
      });

      return jsonResponse({
        ok: result.errors.length === 0,
        backup_id: backup.backup_id,
        restored: result.restored,
        errors: result.errors.map(({ table }) => ({
          table,
          error: 'restore_failed',
        })),
      }, result.errors.length === 0 ? 200 : 207);
    }

    if (action === 'restore_storage_from_drive') {
      if (caller.type === 'scheduler') {
        return jsonResponse({ ok: false, reason: 'scheduler_restore_not_allowed' }, 403);
      }

      const folderIdOrUrl = typeof body.backupFolderUrl === 'string' ? body.backupFolderUrl.trim() : '';
      if (!folderIdOrUrl) {
        return jsonResponse({ ok: false, reason: 'missing_backup_folder_id' }, 400);
      }

      const result = await restoreStorageFiles(adminClient, folderIdOrUrl);
      await recordBackupAudit(adminClient, caller, 'backup_storage_restored', result.errors.length === 0 ? 'success' : 'fail', {
        folder_id: result.folder_id,
        restored: result.restored,
        manifest_count: result.manifest_count,
        returned_files: result.returned_files,
        total_bytes: result.total_bytes,
        errors: result.errors,
      });

      return jsonResponse({
        ok: result.errors.length === 0,
        restored_storage: result.restored,
        storage_restore: {
          folder_id: result.folder_id,
          manifest_count: result.manifest_count,
          returned_files: result.returned_files,
          total_bytes: result.total_bytes,
        },
        errors: result.errors.map(({ bucket, path }) => ({
          bucket,
          path,
          error: 'storage_restore_failed',
        })),
      }, result.errors.length === 0 ? 200 : 207);
    }

    return jsonResponse({ ok: false, reason: 'unknown_action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    console.error('backup-restore-data failed', { action, message });
    await recordBackupAudit(adminClient, caller, action || 'unknown', 'fail', { error: message });
    return jsonResponse({ ok: false, reason: 'operation_failed' }, 500);
  }
});
