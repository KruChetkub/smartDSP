import { supabase } from '../lib/supabase';
import { runSupabaseQuery } from '../lib/supabase-query';
import { sanitizePlainTextInput, optionalPlainTextInput, sanitizeUrlInput } from '../utils/inputSecurity';
import type { Profile, TrainingRecord, Certificate, DevelopmentAnalysis } from '../types/database.types';
import { getMonthFromDate, normalizeTrainingType, type TrainingFormValues } from '../features/self-service/training-form.schema';
import { getSafeUserErrorMessage } from '../utils/errorHandling';

export type TrainingRecordFilters = {
  search?: string;
  year?: number;
  month?: number;
  category?: string;
  department?: string;
};

export type TrainingRecordRow = TrainingRecord & {
  personnel_name: string;
  employee_code: string | null;
  position: string;
  department: string;
  work_group: string;
  certificate_name: string | null;
  certificate_link: string | null;
};

export type CreateTrainingRecordInput = TrainingFormValues & {
  userId: string;
  actorId: string;
};

export type UpdateTrainingRecordInput = TrainingFormValues;

export type TrainingImportInputRow = {
  recordId?: string;
  employeeCode?: string;
  personnelName: string;
  trainingType: string;
  courseName: string;
  organizer: string;
  date: string;
  year: number;
  certificateName?: string;
  certificateLink?: string;
};

export type TrainingImportResultItem = {
  rowNumber: number;
  status: 'created' | 'updated' | 'skipped' | 'error';
  personnelName: string;
  courseName: string;
  message: string;
};

export type TrainingImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  items: TrainingImportResultItem[];
};

function normalizeLookup(value: string | null | undefined) {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildTrainingDedupeKey(userId: string, course: string, date: string, organizer: string) {
  return [userId, normalizeLookup(course), date, normalizeLookup(organizer)].join('|');
}

function toTrainingFormValues(row: TrainingImportInputRow): TrainingFormValues {
  return {
    trainingType: normalizeTrainingType(row.trainingType),
    courseName: sanitizePlainTextInput(row.courseName, { fieldName: 'ชื่อหลักสูตร', maxLength: 500, allowNewlines: false }),
    organizer: sanitizePlainTextInput(row.organizer, { fieldName: 'หน่วยงานผู้จัด', maxLength: 300, allowNewlines: false }),
    date: row.date,
    year: row.year,
    certificateName: optionalPlainTextInput(row.certificateName, { fieldName: 'ชื่อใบประกาศ', maxLength: 300, allowNewlines: false }) || '',
    certificateLink: sanitizeUrlInput(row.certificateLink, { fieldName: 'ลิงก์ใบประกาศ', maxLength: 1000 }) || '',
    developmentArea: '',
    skillGroup: '',
    targetDirection: '',
  };
}
function emptyToNull(value: string | undefined, options: { fieldName: string; maxLength: number; allowNewlines?: boolean }) {
  return optionalPlainTextInput(value, options);
}

function hasCertificateContent(certificate: Pick<Certificate, 'certificate_name' | 'certificate_link' | 'file_path'> | null) {
  return Boolean(certificate?.certificate_name || certificate?.certificate_link || certificate?.file_path);
}

function hasDevelopmentContent(analysis: Pick<DevelopmentAnalysis, 'development_area' | 'skill_group' | 'target_direction'> | null) {
  return Boolean(analysis?.development_area || analysis?.skill_group || analysis?.target_direction);
}

export async function listTrainingRecords(filters: TrainingRecordFilters = {}): Promise<TrainingRecordRow[]> {
  let query = supabase
    .from('training_records')
    .select('id, user_id, course, category, subcategory, organizer, date, month, year, created_by, created_at, updated_at')
    .order('date', { ascending: false });

  if (filters.year) {
    query = query.eq('year', filters.year);
  }

  if (filters.month) {
    query = query.eq('month', filters.month);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.search?.trim()) {
    query = query.ilike('course', `%${filters.search.trim()}%`);
  }

  const { data } = await runSupabaseQuery(query, 'โหลดรายการอบรม');

  const records = (data || []) as TrainingRecord[];
  const userIds = [...new Set(records.map((record) => record.user_id))];

  if (userIds.length === 0) {
    return [];
  }

  const { data: profilesData } = await runSupabaseQuery(
    supabase
      .from('profiles')
      .select('user_id, employee_code, full_name, position, department, work_group, status, role')
      .in('user_id', userIds),
    'โหลดข้อมูลบุคลากรของรายการอบรม',
  );

  const rawProfiles = (profilesData || []) as (Pick<Profile, 'user_id' | 'employee_code' | 'full_name' | 'position' | 'department' | 'work_group'> & { status?: string | null; role?: string | null })[];
  const activeProfiles = rawProfiles.filter((p) => (p.status ? p.status === 'active' : true) && p.role !== 'super_admin');
  const profileByUser = new Map(activeProfiles.map((profile) => [profile.user_id, profile]));
  const activeUserIds = new Set(activeProfiles.map((profile) => profile.user_id));
  const activeRecords = records.filter((record) => activeUserIds.has(record.user_id));
  const recordIds = activeRecords.map((record) => record.id);
  const { data: certificatesData } = await runSupabaseQuery(
    supabase
      .from('certificates')
      .select('training_id, certificate_name, certificate_link, file_path, created_at')
      .in('training_id', recordIds)
      .order('created_at', { ascending: false }),
    'โหลดข้อมูลใบประกาศของรายการอบรม',
  );
  const certificateByTrainingId = new Map<string, Pick<Certificate, 'certificate_name' | 'certificate_link' | 'file_path'>>();

  ((certificatesData || []) as Pick<Certificate, 'training_id' | 'certificate_name' | 'certificate_link' | 'file_path'>[])
    .filter(hasCertificateContent)
    .forEach((certificate) => {
      if (!certificateByTrainingId.has(certificate.training_id)) {
        certificateByTrainingId.set(certificate.training_id, certificate);
      }
    });

  return activeRecords
    .map((record) => {
      const profile = profileByUser.get(record.user_id);
      const certificate = certificateByTrainingId.get(record.id);

      return {
        ...record,
        personnel_name: profile?.full_name || '-',
        employee_code: profile?.employee_code || null,
        position: profile?.position || '-',
        department: profile?.department || '-',
        work_group: profile?.work_group || '-',
        certificate_name: certificate?.certificate_name || null,
        certificate_link: certificate?.certificate_link || null,
      };
    })
    .filter((record) => {
      if (filters.department && record.department !== filters.department) {
        return false;
      }

      if (filters.search?.trim()) {
        const search = filters.search.trim().toLowerCase();
        return (
          record.course.toLowerCase().includes(search) ||
          record.personnel_name.toLowerCase().includes(search) ||
          record.organizer.toLowerCase().includes(search)
        );
      }

      return true;
    });
}

export async function listTrainingReportRecords(year?: number): Promise<TrainingRecordRow[]> {
  const { data } = await runSupabaseQuery(
    supabase.rpc('list_training_report_records', { p_year: year ?? null }),
    'โหลดข้อมูลรายงานการอบรม',
  );

  return data || [];
}

export async function createTrainingRecord(input: CreateTrainingRecordInput): Promise<TrainingRecord> {
  const month = getMonthFromDate(input.date);

  if (!month) {
    throw new Error('วันที่อบรมไม่ถูกต้อง');
  }

  const now = new Date().toISOString();
  const courseName = sanitizePlainTextInput(input.courseName, { fieldName: 'ชื่อหลักสูตร', maxLength: 500, allowNewlines: false });
  const trainingType = normalizeTrainingType(input.trainingType);
  const organizer = sanitizePlainTextInput(input.organizer, { fieldName: 'หน่วยงานผู้จัด', maxLength: 300, allowNewlines: false });
  const certificateName = emptyToNull(input.certificateName, { fieldName: 'ชื่อใบประกาศ', maxLength: 300, allowNewlines: false });
  const certificateLink = sanitizeUrlInput(input.certificateLink, { fieldName: 'ลิงก์ใบประกาศ', maxLength: 1000 });
  const developmentArea = emptyToNull(input.developmentArea, { fieldName: 'ประเด็นการพัฒนา', maxLength: 1000 });
  const skillGroup = emptyToNull(input.skillGroup, { fieldName: 'กลุ่มทักษะ', maxLength: 300, allowNewlines: false });
  const targetDirection = emptyToNull(input.targetDirection, { fieldName: 'ทิศทางการพัฒนา', maxLength: 1000 });
  let trainingId = '';

  try {
    const { data } = await runSupabaseQuery(
      supabase.rpc('create_training_record_with_details', {
        p_user_id: input.userId,
        p_course: courseName,
        p_category: trainingType,
        p_subcategory: null,
        p_organizer: organizer,
        p_date: input.date,
        p_year: input.year,
        p_certificate_name: certificateName,
        p_certificate_link: certificateLink,
        p_development_area: developmentArea,
        p_skill_group: skillGroup,
        p_target_direction: targetDirection,
      }),
      'บันทึกข้อมูลอบรม',
    );

    trainingId = data || '';
  } catch (err) {
    if (err instanceof Error && /DUPLICATE_TRAINING_RECORD|duplicate key|unique|already exists|idx_training_records_unique_dedupe/i.test(err.message)) {
      throw new Error('พบรายการอบรมหลักสูตรนี้ในวันที่และผู้จัดเดียวกันแล้ว (ข้อมูลซ้ำ)');
    }

    if (err instanceof Error && /create_training_record_with_details|Could not find the function|PGRST202|schema cache/i.test(err.message)) {
      throw new Error('ยังไม่ได้ติดตั้งฟังก์ชันบันทึกข้อมูลอบรมใน Supabase กรุณารัน migration 202605110002_create_training_record_rpc.sql ก่อนใช้งาน');
    }

    throw err;
  }

  if (!trainingId) {
    throw new Error('บันทึกข้อมูลอบรมไม่สำเร็จ: Supabase ไม่ได้ส่งรหัสรายการกลับมา');
  }

  return {
    id: trainingId,
    user_id: input.userId,
    course: courseName,
    category: trainingType,
    subcategory: null,
    organizer,
    date: input.date,
    month,
    year: input.year,
    created_by: input.actorId,
    created_at: now,
    updated_at: now,
  };
}

export async function getTrainingRecordDetails(id: string) {
  const [{ data: record }, { data: certificates }, { data: analysisRows }] = await Promise.all([
    runSupabaseQuery(
      supabase
        .from('training_records')
        .select('*')
        .eq('id', id)
        .single(),
      'โหลดข้อมูลอบรม',
    ),
    runSupabaseQuery(
      supabase
        .from('certificates')
        .select('*')
        .eq('training_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      'โหลดข้อมูลใบประกาศ',
    ),
    runSupabaseQuery(
      supabase
        .from('development_analysis')
        .select('*')
        .eq('training_id', id)
        .order('created_at', { ascending: false })
        .limit(1),
      'โหลดข้อมูลวิเคราะห์การพัฒนา',
    ),
  ]);

  if (!record) {
    throw new Error('ไม่พบข้อมูลอบรมที่ต้องการแก้ไข');
  }

  const certificate = ((certificates || []) as Certificate[]).find(hasCertificateContent) || null;
  const analysis = ((analysisRows || []) as DevelopmentAnalysis[]).find(hasDevelopmentContent) || null;

  return {
    record: record as TrainingRecord,
    certificate: certificate as Certificate | null,
    analysis: analysis as DevelopmentAnalysis | null,
  };
}

export async function updateTrainingRecord(id: string, input: UpdateTrainingRecordInput): Promise<TrainingRecord> {
  const month = getMonthFromDate(input.date);
  if (!month) throw new Error('วันที่อบรมไม่ถูกต้อง');

  const courseName = sanitizePlainTextInput(input.courseName, { fieldName: 'ชื่อหลักสูตร', maxLength: 500, allowNewlines: false });
  const trainingType = normalizeTrainingType(input.trainingType);
  const organizer = sanitizePlainTextInput(input.organizer, { fieldName: 'หน่วยงานผู้จัด', maxLength: 300, allowNewlines: false });

  const { data: trainingRecord } = await runSupabaseQuery(
    supabase
      .from('training_records')
      .update({
        course: courseName,
        category: trainingType,
        subcategory: null,
        organizer,
        date: input.date,
        month,
        year: input.year,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, user_id, course, category, subcategory, organizer, date, month, year, created_by, created_at, updated_at')
      .single(),
    'อัปเดตข้อมูลอบรม',
  );

  if (!trainingRecord) {
    throw new Error('ไม่พบข้อมูลอบรมที่ต้องการอัปเดต');
  }

  const record = trainingRecord as TrainingRecord;

  // Handle Certificate Update (Manual Upsert)
  const certificateName = emptyToNull(input.certificateName, { fieldName: 'ชื่อใบประกาศ', maxLength: 300, allowNewlines: false });
  const certificateLink = sanitizeUrlInput(input.certificateLink, { fieldName: 'ลิงก์ใบประกาศ', maxLength: 1000 });

  const { data: existingCertificates } = await runSupabaseQuery(
    supabase
      .from('certificates')
      .select('id')
      .eq('training_id', id),
    'โหลดใบประกาศเดิม',
  );

  const hasExistingCertificate = (existingCertificates || []).length > 0;

  if (certificateName || certificateLink) {
    if (hasExistingCertificate) {
      await runSupabaseQuery(
        supabase
          .from('certificates')
          .update({
            certificate_name: certificateName,
            certificate_link: certificateLink,
          })
          .eq('training_id', id),
        'อัปเดตข้อมูลใบประกาศ',
      );
    } else {
      await runSupabaseQuery(
        supabase.from('certificates').insert({
          training_id: id,
          certificate_name: certificateName,
          certificate_link: certificateLink,
        }),
        'เพิ่มข้อมูลใบประกาศ',
      );
    }
  } else if (hasExistingCertificate) {
    await runSupabaseQuery(
      supabase
        .from('certificates')
        .update({
          certificate_name: null,
          certificate_link: null,
          file_path: null,
        })
        .eq('training_id', id),
      'ล้างข้อมูลใบประกาศ',
    );
  }

  // Handle Development Analysis Update (Manual Upsert)
  const developmentArea = emptyToNull(input.developmentArea, { fieldName: 'ประเด็นการพัฒนา', maxLength: 1000 });
  const skillGroup = emptyToNull(input.skillGroup, { fieldName: 'กลุ่มทักษะ', maxLength: 300, allowNewlines: false });
  const targetDirection = emptyToNull(input.targetDirection, { fieldName: 'ทิศทางการพัฒนา', maxLength: 1000 });

  const { data: existingDevelopmentRows } = await runSupabaseQuery(
    supabase
      .from('development_analysis')
      .select('id')
      .eq('training_id', id),
    'โหลดข้อมูลวิเคราะห์เดิม',
  );

  const hasExistingDevelopment = (existingDevelopmentRows || []).length > 0;

  if (developmentArea || skillGroup || targetDirection) {
    if (hasExistingDevelopment) {
      await runSupabaseQuery(
        supabase
          .from('development_analysis')
          .update({
            development_area: developmentArea,
            skill_group: skillGroup,
            target_direction: targetDirection,
          })
          .eq('training_id', id),
        'อัปเดตข้อมูลวิเคราะห์การพัฒนา',
      );
    } else {
      await runSupabaseQuery(
        supabase.from('development_analysis').insert({
          training_id: id,
          user_id: record.user_id,
          development_area: developmentArea,
          skill_group: skillGroup,
          target_direction: targetDirection,
        }),
        'เพิ่มข้อมูลวิเคราะห์การพัฒนา',
      );
    }
  } else if (hasExistingDevelopment) {
    await runSupabaseQuery(
      supabase
        .from('development_analysis')
        .update({
          development_area: null,
          skill_group: null,
          target_direction: null,
        })
        .eq('training_id', id),
      'ล้างข้อมูลวิเคราะห์การพัฒนา',
    );
  }

  return record;
}

export async function importTrainingRecordsFromRows(rows: TrainingImportInputRow[], actorId: string): Promise<TrainingImportResult> {
  const result: TrainingImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  if (rows.length === 0) {
    return result;
  }

  const [{ data: profilesData }, { data: existingRecordsData }] = await Promise.all([
    runSupabaseQuery(
      supabase
        .from('profiles')
        .select('user_id, employee_code, full_name, status')
        .neq('role', 'super_admin')
        .eq('status', 'active'),
      'โหลดข้อมูลบุคลากรสำหรับนำเข้าอบรม',
    ),
    runSupabaseQuery(
      supabase
        .from('training_records')
        .select('id, user_id, course, category, subcategory, organizer, date, month, year, created_by, created_at, updated_at'),
      'โหลดข้อมูลอบรมเดิมสำหรับนำเข้า',
    ),
  ]);

  const profiles = (profilesData || []) as Pick<Profile, 'user_id' | 'employee_code' | 'full_name'>[];
  const profileById = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const profileByEmployeeCode = new Map(
    profiles
      .filter((profile) => profile.employee_code)
      .map((profile) => [normalizeLookup(profile.employee_code), profile]),
  );
  const profileByName = new Map(profiles.map((profile) => [normalizeLookup(profile.full_name), profile]));

  const existingRecords = (existingRecordsData || []) as TrainingRecord[];
  const recordById = new Map(existingRecords.map((record) => [record.id, record]));
  const recordByDedupeKey = new Map(
    existingRecords.map((record) => [buildTrainingDedupeKey(record.user_id, record.course, record.date, record.organizer), record]),
  );

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];
    const label = row.courseName || '-';

    try {
      if (!row.courseName.trim() || !row.organizer.trim() || !row.date || !row.year) {
        throw new Error('กรุณากรอกชื่อหลักสูตร ผู้จัด วันที่อบรม และปีงบประมาณให้ครบ');
      }

      let existingRecord = row.recordId ? recordById.get(row.recordId.trim()) : undefined;
      let profile = existingRecord ? profileById.get(existingRecord.user_id) : undefined;

      if (!profile && row.employeeCode?.trim()) {
        profile = profileByEmployeeCode.get(normalizeLookup(row.employeeCode));
      }

      if (!profile && row.personnelName.trim()) {
        profile = profileByName.get(normalizeLookup(row.personnelName));
      }

      if (!profile) {
        throw new Error('ไม่พบบุคลากรตามรหัสหรือชื่อที่ระบุ');
      }

      const values = toTrainingFormValues(row);
      const dedupeKey = buildTrainingDedupeKey(profile.user_id, values.courseName, values.date, values.organizer);
      existingRecord = existingRecord || recordByDedupeKey.get(dedupeKey);

      if (existingRecord) {
        const updatedRecord = await updateTrainingRecord(existingRecord.id, values);
        recordById.set(updatedRecord.id, updatedRecord);
        recordByDedupeKey.set(buildTrainingDedupeKey(updatedRecord.user_id, updatedRecord.course, updatedRecord.date, updatedRecord.organizer), updatedRecord);
        result.updated += 1;
        result.items.push({
          rowNumber,
          status: 'updated',
          personnelName: profile.full_name,
          courseName: values.courseName,
          message: 'อัปเดตข้อมูลเดิมแล้ว',
        });
        continue;
      }

      const createdRecord = await createTrainingRecord({
        ...values,
        userId: profile.user_id,
        actorId,
      });
      recordById.set(createdRecord.id, createdRecord);
      recordByDedupeKey.set(buildTrainingDedupeKey(createdRecord.user_id, createdRecord.course, createdRecord.date, createdRecord.organizer), createdRecord);
      result.created += 1;
      result.items.push({
        rowNumber,
        status: 'created',
        personnelName: profile.full_name,
        courseName: values.courseName,
        message: 'เพิ่มข้อมูลใหม่แล้ว',
      });
    } catch (err) {
      result.failed += 1;
      result.items.push({
        rowNumber,
        status: 'error',
        personnelName: row.personnelName || '-',
        courseName: label,
        message: getSafeUserErrorMessage(err, 'ไม่สามารถนำเข้ารายการนี้ได้'),
      });
    }
  }

  return result;
}
export async function deleteTrainingRecord(id: string): Promise<void> {
  await runSupabaseQuery(supabase.from('training_records').delete().eq('id', id), 'ลบข้อมูลอบรม');
}

