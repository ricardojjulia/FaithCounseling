import http from 'node:http';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

let server;
let baseUrl;

before(async () => {
  process.env.FAITH_API_DISABLE_LISTEN = '1';
  const { handleApiRequest } = await import('../src/index.js');
  server = http.createServer(handleApiRequest);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  delete process.env.FAITH_API_DISABLE_LISTEN;
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

async function requestJson(path, {
  method = 'GET',
  role = 'counselor',
  staffId = 's-001',
  tenantId = 'system',
  body,
} = {}) {
  const headers = {
    'x-tenant-id': tenantId,
    'x-staff-role': role,
    'x-staff-id': staffId,
  };

  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

test('assigned counselor can read an assigned client detail route', async () => {
  const response = await requestJson('/v1/clients/c-001', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body?.item?.id, 'c-001');
});

test('assigned counselor is denied from reading another counselor client detail route', async () => {
  const response = await requestJson('/v1/clients/c-003', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 403);
  assert.equal(response.body?.error, 'Access to this resource is not permitted');
});

test('practice admin client collections are not implicitly scoped by staff header identity', async () => {
  const response = await requestJson('/v1/clients', {
    role: 'practice_admin',
    staffId: 's-001',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    (response.body?.items ?? []).map((item) => item.id),
    ['c-001', 'c-002', 'c-003', 'c-004', 'c-005'],
  );
});

test('counselor client collections stay on assigned scope even with a counselorId override', async () => {
  const response = await requestJson('/v1/clients?counselorId=s-002', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    (response.body?.items ?? []).map((item) => item.id),
    ['c-001', 'c-002', 'c-004'],
  );
});

test('filtered counselor form assignment read denies unassigned client access', async () => {
  const response = await requestJson('/v1/forms/assignments?clientId=c-003', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 403);
  assert.equal(response.body?.error, 'Access to this resource is not permitted');
});

test('broad counselor form assignment collection auto-scopes to assigned clients', async () => {
  const allowed = await requestJson('/v1/forms/assignments', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(allowed.status, 200);
  assert.deepEqual(
    (allowed.body?.items ?? []).map((item) => item.clientId),
    ['c-001'],
  );

  const response = await requestJson('/v1/forms/assignments', {
    role: 'counselor',
    staffId: 's-002',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body?.items ?? [], []);
});

test('broad counselor document assignment collection auto-scopes to assigned clients', async () => {
  const allowed = await requestJson('/v1/document-assignments', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual(
    (allowed.body?.items ?? []).map((item) => item.assigneeId),
    ['c-001'],
  );

  const deniedScope = await requestJson('/v1/document-assignments', {
    role: 'counselor',
    staffId: 's-002',
  });
  assert.equal(deniedScope.status, 200);
  assert.deepEqual(deniedScope.body?.items ?? [], []);
});

test('broad counselor inventory assignment collection auto-scopes to assigned clients', async () => {
  const allowed = await requestJson('/v1/inventory-assignments', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual(
    (allowed.body?.items ?? []).map((item) => item.clientId),
    ['c-001'],
  );

  const deniedScope = await requestJson('/v1/inventory-assignments', {
    role: 'counselor',
    staffId: 's-002',
  });
  assert.equal(deniedScope.status, 200);
  assert.deepEqual(deniedScope.body?.items ?? [], []);
});

test('broad counselor form submission collection auto-scopes to assigned clients', async () => {
  const allowed = await requestJson('/v1/forms/submissions', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual(
    (allowed.body?.items ?? []).map((item) => item.clientId),
    ['c-001', 'c-004', 'c-004', 'c-004'],
  );

  const deniedScope = await requestJson('/v1/forms/submissions', {
    role: 'counselor',
    staffId: 's-002',
  });
  assert.equal(deniedScope.status, 200);
  assert.deepEqual(deniedScope.body?.items ?? [], []);
});

test('broad counselor waitlist collection auto-scopes to assigned clients', async () => {
  const response = await requestJson('/v1/waitlist', {
    role: 'counselor',
    staffId: 's-002',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    (response.body?.items ?? []).map((item) => item.clientId),
    ['c-003'],
  );
});

test('broad counselor faith referral collection auto-scopes to assigned clients', async () => {
  const deniedScope = await requestJson('/v1/faith/referral-coordination', {
    role: 'counselor',
    staffId: 's-002',
  });
  assert.equal(deniedScope.status, 200);
  assert.deepEqual(deniedScope.body?.items ?? [], []);

  const allowedScope = await requestJson('/v1/faith/referral-coordination', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(allowedScope.status, 200);
  assert.deepEqual(
    (allowedScope.body?.items ?? []).map((item) => item.clientId),
    ['c-001'],
  );
});

test('broad counselor reminder collection auto-scopes to assigned clients', async () => {
  const allowedScope = await requestJson('/v1/reminders', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(allowedScope.status, 200);
  assert.deepEqual(
    (allowedScope.body?.items ?? []).map((item) => item.clientId).sort(),
    ['c-001', 'c-002'],
  );

  const deniedScope = await requestJson('/v1/reminders', {
    role: 'counselor',
    staffId: 's-002',
  });
  assert.equal(deniedScope.status, 200);
  assert.deepEqual(deniedScope.body?.items ?? [], []);
});

test('counselor cannot create reminders for another counselor client appointment', async () => {
  const response = await requestJson('/v1/reminders', {
    method: 'POST',
    role: 'counselor',
    staffId: 's-001',
    body: {
      appointmentId: 'a-003',
      status: 'pending',
      reminderType: 'appointment',
      deliveryChannel: 'email',
    },
  });

  assert.equal(response.status, 403);
  assert.equal(response.body?.error, 'Access to this resource is not permitted');
});

test('counselor appointment mutation is assignment-gated', async () => {
  const denied = await requestJson('/v1/appointments/a-003', {
    method: 'PATCH',
    role: 'counselor',
    staffId: 's-001',
    body: {
      status: 'completed',
    },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body?.error, 'Access to this resource is not permitted');

  const allowed = await requestJson('/v1/appointments/a-001', {
    method: 'PATCH',
    role: 'counselor',
    staffId: 's-001',
    body: {
      status: 'checked_in',
    },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body?.item?.id, 'a-001');
  assert.equal(allowed.body?.item?.status, 'checked_in');
});

test('counselor appointment collections stay on assigned scope even with a counselorId override', async () => {
  const response = await requestJson('/v1/appointments?counselorId=s-002', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    (response.body?.items ?? []).map((item) => item.id),
    ['a-001', 'a-002', 'a-004'],
  );
});

test('counselor waitlist update is assignment-gated', async () => {
  const denied = await requestJson('/v1/waitlist', {
    method: 'PATCH',
    role: 'counselor',
    staffId: 's-001',
    body: {
      clientId: 'c-003',
      priorityRank: 2,
    },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body?.error, 'Access to this resource is not permitted');

  const allowed = await requestJson('/v1/waitlist', {
    method: 'PATCH',
    role: 'counselor',
    staffId: 's-002',
    body: {
      clientId: 'c-003',
      priorityRank: 2,
      notes: 'Updated from route-level auth test.',
    },
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body?.item?.clientId, 'c-003');
  assert.equal(allowed.body?.item?.priorityRank, 2);
});

test('counselor offerings list and summary stay assignment-scoped after recording an offering', async () => {
  const beforeSummary = await requestJson('/v1/offerings/summary', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(beforeSummary.status, 200);

  const deniedCreate = await requestJson('/v1/offerings', {
    method: 'POST',
    role: 'counselor',
    staffId: 's-001',
    body: {
      clientId: 'c-003',
      amountCents: 2500,
      receivedOn: '2026-04-02',
      note: 'Should be denied',
    },
  });
  assert.equal(deniedCreate.status, 403);

  const createResponse = await requestJson('/v1/offerings', {
    method: 'POST',
    role: 'counselor',
    staffId: 's-001',
    body: {
      clientId: 'c-001',
      amountCents: 2500,
      receivedOn: '2026-04-02',
      note: 'Recorded in auth route test',
    },
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body?.item?.clientId, 'c-001');

  const listResponse = await requestJson('/v1/offerings', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(listResponse.status, 200);
  assert.ok(
    (listResponse.body?.items ?? []).some((item) => item.id === createResponse.body?.item?.id && item.clientId === 'c-001'),
  );
  assert.ok(
    !(listResponse.body?.items ?? []).some((item) => item.clientId === 'c-003'),
  );

  const afterSummary = await requestJson('/v1/offerings/summary', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(afterSummary.status, 200);
  assert.equal(afterSummary.body?.count, (beforeSummary.body?.count ?? 0) + 1);
  assert.equal(afterSummary.body?.totalCents, (beforeSummary.body?.totalCents ?? 0) + 2500);
});

test('counselor scheduling calendar narrows availability to the signed-in counselor scope', async () => {
  const response = await requestJson('/v1/scheduling/calendar', {
    role: 'counselor',
    staffId: 's-002',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    (response.body?.availability ?? []).map((item) => item.staffId),
    ['s-002'],
  );
  assert.deepEqual(
    (response.body?.counselorCalendars ?? []).map((item) => item.counselorName),
    ['Hannah Torres'],
  );
});

test('counselor scheduling calendar ignores counselor override filters and stays assigned-scoped', async () => {
  const response = await requestJson('/v1/scheduling/calendar?counselorId=s-001&counselorName=Rachel%20Jordan', {
    role: 'counselor',
    staffId: 's-002',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    (response.body?.availability ?? []).map((item) => item.staffId),
    ['s-002'],
  );
  assert.deepEqual(
    (response.body?.counselorCalendars ?? []).map((item) => item.counselorName),
    ['Hannah Torres'],
  );
  assert.deepEqual(
    (response.body?.counselorCalendars?.[0]?.appointments ?? []).map((item) => item.id),
    ['a-003'],
  );
});

test('counselor operations summary ignores counselor override filters and stays assigned-scoped', async () => {
  const response = await requestJson('/v1/operations/summary?counselorId=s-002', {
    role: 'counselor',
    staffId: 's-001',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body?.summary?.counts?.totalClients, 3);
  assert.deepEqual(
    (response.body?.summary?.todaySchedule?.items ?? []).map((item) => item.id),
    ['a-001', 'a-002', 'a-004'],
  );
  assert.deepEqual(
    (response.body?.summary?.todaySchedule?.workload ?? []).map((item) => item.counselorId),
    ['s-001'],
  );
});

test('counselor appointment series supports no-db list create update flows with assigned-client scope', async () => {
  const initialList = await requestJson('/v1/scheduling/series?counselorId=s-002', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(initialList.status, 200);
  assert.deepEqual(
    (initialList.body?.items ?? []).map((item) => item.id),
    ['ser-001'],
  );

  const deniedCreate = await requestJson('/v1/scheduling/series', {
    method: 'POST',
    role: 'counselor',
    staffId: 's-001',
    body: {
      counselorId: 's-001',
      clientId: 'c-003',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=WE',
      startDate: '2026-04-02',
      durationMinutes: 50,
    },
  });
  assert.equal(deniedCreate.status, 403);

  const createResponse = await requestJson('/v1/scheduling/series', {
    method: 'POST',
    role: 'counselor',
    staffId: 's-001',
    body: {
      counselorId: 's-001',
      clientId: 'c-001',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=WE',
      startDate: '2026-04-02',
      durationMinutes: 50,
    },
  });
  assert.equal(createResponse.status, 201);
  assert.equal(createResponse.body?.item?.clientId, 'c-001');

  const listAfterCreate = await requestJson('/v1/scheduling/series?clientId=c-001', {
    role: 'counselor',
    staffId: 's-001',
  });
  assert.equal(listAfterCreate.status, 200);
  assert.ok(
    (listAfterCreate.body?.items ?? []).some((item) => item.id === createResponse.body?.item?.id),
  );

  const updateResponse = await requestJson('/v1/scheduling/series', {
    method: 'PATCH',
    role: 'counselor',
    staffId: 's-001',
    body: {
      id: createResponse.body?.item?.id,
      status: 'paused',
    },
  });
  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body?.item?.status, 'paused');
});
