/**
 * Live Edge Function authorization/security contract for plan lines 117-121.
 *
 * Baseline checks need only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Full role/ownership/status checks additionally require dedicated active and
 * inactive test accounts. Never use a real user's credentials here.
 */

const supabaseUrl = (
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
).replace(/\/+$/, '');
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
const expiredAccessToken = process.env.EDGE_TEST_EXPIRED_ACCESS_TOKEN ?? '';
const testUserEmail = process.env.EDGE_TEST_USER_EMAIL ?? '';
const testUserPassword = process.env.EDGE_TEST_USER_PASSWORD ?? '';
const inactiveAccessTokenFromEnv = process.env.EDGE_TEST_INACTIVE_ACCESS_TOKEN ?? '';
const inactiveUserEmail = process.env.EDGE_TEST_INACTIVE_USER_EMAIL ?? '';
const inactiveUserPassword = process.env.EDGE_TEST_INACTIVE_USER_PASSWORD ?? '';
const foreignTicketId = process.env.EDGE_TEST_FOREIGN_TICKET_ID ?? '';
const foreignReservationId = process.env.EDGE_TEST_FOREIGN_RESERVATION_ID ?? '';

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing Supabase URL or anon key in the test environment.');
}

const zeroUuid = '00000000-0000-4000-8000-000000000000';
const unsafeResponsePattern =
  /(?:stack\s*trace|traceback|sqlstate|postgres|postgrest|schema\s+cache|service_role|supabase_service_role_key|deno\.env|\bat\s+file:\/\/)/i;

const protectedRequests = [
  ['backup-restore-data', { action: 'create_backup' }],
  ['export-audit-logs', {}],
  ['update-user-email', { userId: zeroUuid, email: 'security-test.invalid@example.com' }],
  ['meeting-room-telegram-notify', { event: 'reservation_created', reservationId: zeroUuid }],
  ['spd-service-telegram-notify', { event: 'ticket_created', ticketId: zeroUuid }],
  ['record-audit-log', { module: 'security_test', action: 'authorization_contract' }],
  ['record-login-attempt', { email: 'security-test.invalid@example.com', success: true }],
];

const results = [];

async function invoke(functionName, { token, body, rawBody } = {}) {
  const headers = {
    apikey: anonKey,
    'content-type': 'application/json',
  };

  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers,
    body: rawBody ?? JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(15_000),
  });
  const responseText = await response.text();

  if (unsafeResponsePattern.test(responseText)) {
    throw new Error(`${functionName} exposed an internal implementation detail.`);
  }

  return { status: response.status, responseText };
}

function record(name, expected, actual) {
  const passed = expected.includes(actual);
  results.push({ name, passed, expected: expected.join('/'), actual });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: HTTP ${actual}`);
}

function createExpiredUntrustedJwt() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: zeroUuid, exp: 1 })}.invalid-signature`;
}

// A supplied token proves expiration independently of signature validity. The
// fallback still verifies that an expired/untrusted JWT cannot authenticate.
const tokenForExpiryCheck = expiredAccessToken || createExpiredUntrustedJwt();
const expiryCheckLabel = expiredAccessToken
  ? 'issued expired token'
  : 'expired/untrusted token';
for (const [functionName, body] of protectedRequests) {
  const response = await invoke(functionName, { token: tokenForExpiryCheck, body });
  record(`${expiryCheckLabel}: ${functionName}`, [401], response.status);
}

// Safe validation checks on the intentionally public failed-login endpoint.
let response = await invoke('record-login-attempt', { rawBody: '{invalid-json' });
record('malformed JSON is rejected', [400], response.status);

response = await invoke('record-login-attempt', {
  body: { email: 'a'.repeat(5_000), success: false },
});
record('oversized request is rejected', [413], response.status);

let nonPrivilegedToken = '';
if (testUserEmail && testUserPassword) {
  const signInResponse = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: testUserPassword }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const signInBody = await signInResponse.json().catch(() => ({}));
  nonPrivilegedToken = signInBody.access_token ?? '';

  if (!nonPrivilegedToken) {
    throw new Error('The dedicated non-privileged Edge test account could not sign in.');
  }

  for (const [functionName, body] of [
    ['backup-restore-data', { action: 'create_backup' }],
    ['export-audit-logs', {}],
    ['update-user-email', { userId: zeroUuid, email: 'security-test.invalid@example.com' }],
  ]) {
    const forbiddenResponse = await invoke(functionName, {
      token: nonPrivilegedToken,
      body,
    });
    record(`insufficient role: ${functionName}`, [403], forbiddenResponse.status);
  }

  for (const [functionName, body] of [
    ['update-user-email', {}],
    ['meeting-room-telegram-notify', {}],
    ['spd-service-telegram-notify', {}],
    ['record-audit-log', {}],
  ]) {
    const invalidResponse = await invoke(functionName, {
      token: nonPrivilegedToken,
      body,
    });
    record(`invalid fields: ${functionName}`, [400], invalidResponse.status);
  }

  if (foreignTicketId) {
    const ownershipResponse = await invoke('spd-service-telegram-notify', {
      token: nonPrivilegedToken,
      body: { event: 'ticket_created', ticketId: foreignTicketId },
    });
    record('foreign ticket ownership is enforced', [403], ownershipResponse.status);
  }

  if (foreignReservationId) {
    const ownershipResponse = await invoke('meeting-room-telegram-notify', {
      token: nonPrivilegedToken,
      body: { event: 'reservation_created', reservationId: foreignReservationId },
    });
    record('foreign reservation ownership is enforced', [403], ownershipResponse.status);
  }
}

let inactiveAccessToken = inactiveAccessTokenFromEnv;
if (!inactiveAccessToken && inactiveUserEmail && inactiveUserPassword) {
  const inactiveSignInResponse = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: anonKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email: inactiveUserEmail, password: inactiveUserPassword }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const inactiveSignInBody = await inactiveSignInResponse.json().catch(() => ({}));
  inactiveAccessToken = inactiveSignInBody.access_token ?? '';
}

if (inactiveAccessToken) {
  for (const [functionName, body] of protectedRequests) {
    const inactiveResponse = await invoke(functionName, {
      token: inactiveAccessToken,
      body,
    });
    record(`inactive account: ${functionName}`, [403], inactiveResponse.status);
  }
}

let inactiveGatewayChecked = false;
if (inactiveUserEmail && inactiveUserPassword) {
  const gatewayResponse = await invoke('login-gateway', {
    body: { email: inactiveUserEmail, password: inactiveUserPassword },
  });
  record('login gateway rejects inactive account', [403], gatewayResponse.status);
  inactiveGatewayChecked = true;
}

const failures = results.filter((result) => !result.passed);
if (failures.length > 0) {
  throw new Error(`${failures.length} Edge Function security check(s) failed.`);
}

console.log(`PASS: ${results.length} executed Edge Function security checks.`);

if (!expiredAccessToken) {
  console.warn('SKIP: set EDGE_TEST_EXPIRED_ACCESS_TOKEN to certify a genuinely issued, expired token.');
}
if (!nonPrivilegedToken) {
  console.warn('SKIP: set EDGE_TEST_USER_EMAIL and EDGE_TEST_USER_PASSWORD for role and authenticated payload checks.');
}
if (!foreignTicketId || !foreignReservationId) {
  console.warn('SKIP: set both foreign record IDs to certify ticket and reservation ownership checks.');
}
if (!inactiveAccessToken) {
  console.warn('SKIP: set EDGE_TEST_INACTIVE_ACCESS_TOKEN or inactive test credentials to certify inactive-account rejection.');
}
if (!inactiveGatewayChecked) {
  console.warn('SKIP: set EDGE_TEST_INACTIVE_USER_EMAIL and EDGE_TEST_INACTIVE_USER_PASSWORD to certify login-gateway rejection.');
}

if (
  !expiredAccessToken ||
  !nonPrivilegedToken ||
  !foreignTicketId ||
  !foreignReservationId ||
  !inactiveAccessToken ||
  !inactiveGatewayChecked
) {
  process.exitCode = 2;
} else {
  console.log('PASS: all plan checks 117-121 have complete live evidence.');
}
