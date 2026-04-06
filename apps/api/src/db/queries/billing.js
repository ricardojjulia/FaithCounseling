import pool from '../pool.js';
import { encryptJson, decryptJson } from '../../lib/encrypt.js';

function toSqlTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizeCurrency(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

function rowToServiceCode(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    name: row.name,
    category: row.category,
    defaultDurationMinutes: row.default_duration_minutes,
    status: row.status,
    description: row.name,
    billingCategory: row.category,
    createdAt: row.created_at,
  };
}

function rowToFeeSchedule(row) {
  const lines = typeof row.schedule_lines === 'string' ? JSON.parse(row.schedule_lines) : row.schedule_lines;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    status: row.status,
    currency: row.currency,
    lines: lines ?? [],
    insurancePlans: lines ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToInvoice(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    appointmentId: row.appointment_id,
    issuedAt: row.issued_at instanceof Date ? row.issued_at.toISOString() : row.issued_at,
    dueAt: row.due_at instanceof Date ? row.due_at.toISOString() : row.due_at,
    lineItems: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
    insurance: row.insurance_enc ? decryptJson(row.insurance_enc) : null,
    insuranceInfo: row.insurance_enc ? decryptJson(row.insurance_enc) : null,
    status: row.status,
    dueDate: row.due_at instanceof Date ? row.due_at.toISOString() : row.due_at,
    claimStatus: row.claim_status,
    subtotal: normalizeCurrency(row.subtotal),
    adjustments: normalizeCurrency(row.adjustments),
    total: normalizeCurrency(row.total),
    totalAmount: normalizeCurrency(row.total),
    amountPaid: normalizeCurrency(row.amount_paid),
    balance: normalizeCurrency(row.balance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPayment(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    invoiceId: row.invoice_id,
    amount: row.amount,
    paymentMethod: row.method,
    method: row.method,
    paidAt: row.received_at instanceof Date ? row.received_at.toISOString() : row.received_at,
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : row.received_at,
    reference: row.reference,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function rowToSuperbill(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    invoiceId: row.invoice_id,
    generatedAt: row.generated_at instanceof Date ? row.generated_at.toISOString() : row.generated_at,
    serviceDate: row.generated_at instanceof Date ? row.generated_at.toISOString() : row.generated_at,
    diagnosisCodes: row.diagnosis_codes_enc
      ? decryptJson(row.diagnosis_codes_enc)
      : (typeof row.diagnosis_codes === 'string' ? JSON.parse(row.diagnosis_codes) : row.diagnosis_codes),
    serviceLines: typeof row.service_lines === 'string' ? JSON.parse(row.service_lines) : row.service_lines,
    createdAt: row.created_at,
  };
}

function rowToClaim(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceId: row.invoice_id,
    submittedAt: row.submitted_at instanceof Date ? row.submitted_at.toISOString() : row.submitted_at,
    status: row.status,
    externalReference: row.external_reference,
    notes: row.notes,
    adjudicationNotes: row.notes,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Service Codes
// ---------------------------------------------------------------------------

export async function listServiceCodes(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM service_codes WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToServiceCode);
}

export async function getServiceCodeById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM service_codes WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToServiceCode(rows[0]);
}

export async function createServiceCode({ id, tenantId, code, name, category, defaultDurationMinutes, status }) {
  await pool.query(
    `INSERT INTO service_codes (id, tenant_id, code, name, category, default_duration_minutes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, code, name, category, defaultDurationMinutes, status]
  );
  return getServiceCodeById(id, tenantId);
}

export async function updateServiceCode(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.code !== undefined) { setClauses.push('code = ?'); values.push(fields.code); }
  if (fields.name !== undefined) { setClauses.push('name = ?'); values.push(fields.name); }
  if (fields.category !== undefined) { setClauses.push('category = ?'); values.push(fields.category); }
  if (fields.defaultDurationMinutes !== undefined) { setClauses.push('default_duration_minutes = ?'); values.push(fields.defaultDurationMinutes); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE service_codes SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  return getServiceCodeById(id, tenantId);
}

// ---------------------------------------------------------------------------
// Fee Schedules
// ---------------------------------------------------------------------------

export async function listFeeSchedules(tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM fee_schedules WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToFeeSchedule);
}

export async function getFeeScheduleById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM fee_schedules WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToFeeSchedule(rows[0]);
}

export async function createFeeSchedule({
  id,
  tenantId,
  name,
  status,
  currency,
  lines,
}) {
  await pool.query(
    `INSERT INTO fee_schedules
       (id, tenant_id, name, status, currency, schedule_lines)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, tenantId, name, status, currency, JSON.stringify(lines ?? [])]
  );
  return getFeeScheduleById(id, tenantId);
}

export async function updateFeeSchedule(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.name !== undefined) { setClauses.push('name = ?'); values.push(fields.name); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.currency !== undefined) { setClauses.push('currency = ?'); values.push(fields.currency); }
  if (fields.lines !== undefined) { setClauses.push('schedule_lines = ?'); values.push(JSON.stringify(fields.lines)); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE fee_schedules SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  return getFeeScheduleById(id, tenantId);
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export async function listInvoices(tenantId, clientId) {
  if (clientId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM invoices WHERE tenant_id = ? AND client_id = ?',
      [tenantId, clientId]
    );
    return rows.map(rowToInvoice);
  }
  const [rows] = await pool.query(
    'SELECT * FROM invoices WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToInvoice);
}

export async function getInvoiceById(id, tenantId) {
  const [rows] = await pool.query(
    'SELECT * FROM invoices WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToInvoice(rows[0]);
}

export async function createInvoice({
  id,
  tenantId,
  clientId,
  appointmentId,
  issuedAt,
  dueAt,
  lineItems,
  insuranceInfo,
  status,
  claimStatus,
  subtotal,
  adjustments,
  total,
  amountPaid,
  balance,
}) {
  await pool.query(
    `INSERT INTO invoices
       (id, tenant_id, client_id, appointment_id, issued_at, due_at, status, line_items,
        insurance_enc, claim_status, subtotal, adjustments, total, amount_paid, balance)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      appointmentId,
      toSqlTimestamp(issuedAt),
      toSqlTimestamp(dueAt),
      status,
      JSON.stringify(lineItems),
      insuranceInfo ? encryptJson(insuranceInfo) : null,
      claimStatus ?? 'not_submitted',
      subtotal,
      adjustments,
      total,
      amountPaid,
      balance,
    ]
  );
  return getInvoiceById(id, tenantId);
}

export async function updateInvoice(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.appointmentId !== undefined) { setClauses.push('appointment_id = ?'); values.push(fields.appointmentId); }
  if (fields.issuedAt !== undefined) { setClauses.push('issued_at = ?'); values.push(toSqlTimestamp(fields.issuedAt)); }
  if (fields.dueAt !== undefined) { setClauses.push('due_at = ?'); values.push(toSqlTimestamp(fields.dueAt)); }
  if (fields.lineItems !== undefined) { setClauses.push('line_items = ?'); values.push(JSON.stringify(fields.lineItems)); }
  if (fields.insuranceInfo !== undefined) { setClauses.push('insurance_enc = ?'); values.push(encryptJson(fields.insuranceInfo)); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.claimStatus !== undefined) { setClauses.push('claim_status = ?'); values.push(fields.claimStatus); }
  if (fields.subtotal !== undefined) { setClauses.push('subtotal = ?'); values.push(fields.subtotal); }
  if (fields.adjustments !== undefined) { setClauses.push('adjustments = ?'); values.push(fields.adjustments); }
  if (fields.total !== undefined) { setClauses.push('total = ?'); values.push(fields.total); }
  if (fields.amountPaid !== undefined) { setClauses.push('amount_paid = ?'); values.push(fields.amountPaid); }
  if (fields.balance !== undefined) { setClauses.push('balance = ?'); values.push(fields.balance); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE invoices SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  return getInvoiceById(id, tenantId);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function listPayments(tenantId, invoiceId) {
  if (invoiceId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE tenant_id = ? AND invoice_id = ?',
      [tenantId, invoiceId]
    );
    return rows.map(rowToPayment);
  }
  const [rows] = await pool.query(
    'SELECT * FROM payments WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToPayment);
}

export async function createPayment({
  id,
  tenantId,
  clientId,
  invoiceId,
  amount,
  method,
  receivedAt,
  reference,
  notes,
}) {
  await pool.query(
    `INSERT INTO payments
       (id, tenant_id, client_id, invoice_id, amount, method, received_at, reference, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, clientId, invoiceId, amount, method, toSqlTimestamp(receivedAt), reference, notes]
  );
  const [rows] = await pool.query(
    'SELECT * FROM payments WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToPayment(rows[0]);
}

// ---------------------------------------------------------------------------
// Superbills
// ---------------------------------------------------------------------------

export async function listSuperbills(tenantId, clientId) {
  if (clientId !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM superbills WHERE tenant_id = ? AND client_id = ?',
      [tenantId, clientId]
    );
    return rows.map(rowToSuperbill);
  }
  const [rows] = await pool.query(
    'SELECT * FROM superbills WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToSuperbill);
}

export async function createSuperbill({
  id,
  tenantId,
  clientId,
  invoiceId,
  generatedAt,
  diagnosisCodes,
  serviceLines,
}) {
  await pool.query(
    `INSERT INTO superbills
       (id, tenant_id, client_id, invoice_id, generated_at, diagnosis_codes_enc, service_lines)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tenantId,
      clientId,
      invoiceId,
      toSqlTimestamp(generatedAt),
      encryptJson(diagnosisCodes),
      JSON.stringify(serviceLines),
    ]
  );
  const [rows] = await pool.query(
    'SELECT * FROM superbills WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToSuperbill(rows[0]);
}

export async function updateSuperbill(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.clientId !== undefined) { setClauses.push('client_id = ?'); values.push(fields.clientId); }
  if (fields.invoiceId !== undefined) { setClauses.push('invoice_id = ?'); values.push(fields.invoiceId); }
  if (fields.generatedAt !== undefined) { setClauses.push('generated_at = ?'); values.push(toSqlTimestamp(fields.generatedAt)); }
  if (fields.diagnosisCodes !== undefined) { setClauses.push('diagnosis_codes_enc = ?'); values.push(encryptJson(fields.diagnosisCodes)); }
  if (fields.serviceLines !== undefined) { setClauses.push('service_lines = ?'); values.push(JSON.stringify(fields.serviceLines)); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE superbills SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM superbills WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToSuperbill(rows[0]);
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function listClaims(tenantId, status) {
  if (status !== undefined) {
    const [rows] = await pool.query(
      'SELECT * FROM claims WHERE tenant_id = ? AND status = ?',
      [tenantId, status]
    );
    return rows.map(rowToClaim);
  }
  const [rows] = await pool.query(
    'SELECT * FROM claims WHERE tenant_id = ?',
    [tenantId]
  );
  return rows.map(rowToClaim);
}

export async function createClaim({
  id,
  tenantId,
  invoiceId,
  submittedAt,
  status,
  externalReference,
  notes,
}) {
  await pool.query(
    `INSERT INTO claims
       (id, tenant_id, invoice_id, submitted_at, status, external_reference, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, invoiceId, toSqlTimestamp(submittedAt), status, externalReference, notes]
  );
  const [rows] = await pool.query(
    'SELECT * FROM claims WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  return rowToClaim(rows[0]);
}

export async function updateClaim(id, tenantId, fields) {
  const setClauses = [];
  const values = [];

  if (fields.invoiceId !== undefined) { setClauses.push('invoice_id = ?'); values.push(fields.invoiceId); }
  if (fields.submittedAt !== undefined) { setClauses.push('submitted_at = ?'); values.push(toSqlTimestamp(fields.submittedAt)); }
  if (fields.status !== undefined) { setClauses.push('status = ?'); values.push(fields.status); }
  if (fields.externalReference !== undefined) { setClauses.push('external_reference = ?'); values.push(fields.externalReference); }
  if (fields.notes !== undefined) { setClauses.push('notes = ?'); values.push(fields.notes); }

  if (setClauses.length > 0) {
    values.push(id, tenantId);
    await pool.query(
      `UPDATE claims SET ${setClauses.join(', ')} WHERE id = ? AND tenant_id = ?`,
      values
    );
  }

  const [rows] = await pool.query(
    'SELECT * FROM claims WHERE id = ? AND tenant_id = ?',
    [id, tenantId]
  );
  if (rows.length === 0) return null;
  return rowToClaim(rows[0]);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getAgingReport(tenantId, asOfIso = new Date().toISOString()) {
  const [rows] = await pool.query(
    'SELECT client_id, due_at, balance FROM invoices WHERE tenant_id = ? AND balance > 0',
    [tenantId]
  );
  const asOf = new Date(asOfIso).getTime();
  const totals = { outstanding: 0, current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };
  const byClient = new Map();

  for (const row of rows) {
    const balance = normalizeCurrency(row.balance);
    totals.outstanding = normalizeCurrency(totals.outstanding + balance);
    const dueAt = new Date(row.due_at).getTime();
    const daysPastDue = Number.isFinite(dueAt) ? Math.floor((asOf - dueAt) / (24 * 60 * 60 * 1000)) : 0;
    if (daysPastDue <= 0) totals.current = normalizeCurrency(totals.current + balance);
    else if (daysPastDue <= 30) totals.days1to30 = normalizeCurrency(totals.days1to30 + balance);
    else if (daysPastDue <= 60) totals.days31to60 = normalizeCurrency(totals.days31to60 + balance);
    else if (daysPastDue <= 90) totals.days61to90 = normalizeCurrency(totals.days61to90 + balance);
    else totals.over90 = normalizeCurrency(totals.over90 + balance);

    const key = row.client_id || 'unknown';
    const current = byClient.get(key) ?? { clientId: key, clientName: key, outstanding: 0, invoiceCount: 0 };
    current.outstanding = normalizeCurrency(current.outstanding + balance);
    current.invoiceCount += 1;
    byClient.set(key, current);
  }

  return {
    totals,
    clients: Array.from(byClient.values()).sort((a, b) => b.outstanding - a.outstanding),
  };
}
