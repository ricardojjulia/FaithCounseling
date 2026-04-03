import { useEffect, useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import {
  Stack, Title, Paper, Group, Badge, SimpleGrid, TextInput, Select, Textarea,
  Checkbox, Button, Text, Loader,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  createClientDiagnosis, updateClientDiagnosis, deleteClientDiagnosis,
  createClientMedication, updateClientMedication, deleteClientMedication,
  createClientAllergy,    updateClientAllergy,    deleteClientAllergy,
  fetchDsm5TrLookup,
} from '../../../lib/clientApi.js';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';
import { useI18n } from '../../../lib/i18nContext.jsx';

function strToDate(s) { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; }
function dateToStr(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

const DIAGNOSIS_SYSTEM_OPTIONS = [
  { value: 'DSM-5-TR', label: 'DSM-5-TR' },
  { value: 'DSM-5', label: 'DSM-5' },
  { value: 'ICD-10', label: 'ICD-10' },
  { value: 'ICD-11', label: 'ICD-11' },
];

const DIAGNOSIS_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rule_out', label: 'Rule Out' },
  { value: 'deferred', label: 'Deferred' },
];

const DIAGNOSIS_LOOKUP_LIMIT = 12;

function rowKey() {
  return Math.random();
}

function normalizeDiagnosisRow(diagnosis = {}) {
  return {
    _key: rowKey(),
    _dirty: false,
    _deleted: false,
    id: diagnosis.id ?? null,
    codeSystem: diagnosis.codeSystem ?? diagnosis.code_system ?? 'DSM-5-TR',
    code: diagnosis.code ?? '',
    description: diagnosis.description ?? '',
    onsetDate: diagnosis.onsetDate ?? diagnosis.onset_date ?? null,
    status: diagnosis.status ?? 'active',
    isPrimary: Boolean(diagnosis.isPrimary ?? diagnosis.is_primary),
    notes: diagnosis.notes ?? '',
  };
}

function createDiagnosisDraft() {
  return {
    _key: rowKey(),
    _dirty: true,
    _deleted: false,
    id: null,
    codeSystem: 'DSM-5-TR',
    code: '',
    description: '',
    onsetDate: null,
    status: 'active',
    isPrimary: false,
    notes: '',
  };
}

function buildDiagnosisLookupValue(code, description) {
  return code && description ? `${code}::${description}` : null;
}

function trackDiagnosisAction(action, result = 'success', extras = {}) {
  frontendTelemetry.trackAction('client.diagnoses', action, result, {
    workflow: 'client_detail',
    surfaceKind: 'tab',
    ...extras,
  });
}

function DiagnosisLookupField({ row, onSelect, t }) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectedValue = buildDiagnosisLookupValue(row.code, row.description);
  const data = useMemo(() => {
    if (!selectedValue) return options;
    if (options.some((option) => option.value === selectedValue)) return options;
    return [{ value: selectedValue, label: `${row.code} ${row.description}`, code: row.code, description: row.description }, ...options];
  }, [options, row.code, row.description, selectedValue]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setOptions([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await fetchDsm5TrLookup(search.trim(), DIAGNOSIS_LOOKUP_LIMIT);
        if (cancelled) return;
        const items = Array.isArray(result?.items) ? result.items : [];
        setOptions(items.map((item) => ({
          value: buildDiagnosisLookupValue(item.code, item.description),
          label: `${item.code} ${item.description}`,
          code: item.code,
          description: item.description,
        })));
        setError(null);
        trackDiagnosisAction('dsm_lookup_search');
        if (items.length === 0) {
          frontendTelemetry.trackEmptyState('client.diagnoses', 'dsm_lookup_no_match', {
            workflow: 'client_detail',
            surfaceKind: 'tab',
          });
        }
      } catch (err) {
        if (cancelled) return;
        setOptions([]);
        setError(err.message || 'Unable to load DSM-5-TR matches.');
        trackDiagnosisAction('dsm_lookup_search', 'failure', {
          statusClass: err?.statusClass ?? 'unknown',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  return (
    <Stack gap={4} mb="xs">
      <Select
        label={t('client.diagnoses.lookupLabel')}
        placeholder={t('client.diagnoses.lookupPlaceholder')}
        description={t('client.diagnoses.lookupDescription')}
        searchable
        clearable
        value={selectedValue}
        searchValue={search}
        onSearchChange={setSearch}
        data={data}
        nothingFoundMessage={search.trim().length < 2 ? t('client.diagnoses.lookupMinChars') : t('client.diagnoses.lookupEmpty')}
        rightSection={loading ? <Loader size="xs" /> : null}
        onChange={(value) => {
          const selected = data.find((item) => item.value === value);
          if (!selected) return;
          onSelect({
            codeSystem: 'DSM-5-TR',
            code: selected.code,
            description: selected.description,
          });
          setSearch(`${selected.code} ${selected.description}`);
          trackDiagnosisAction('dsm_lookup_select');
        }}
      />
      {error ? <Text size="xs" c="red">{error || t('client.diagnoses.lookupError')}</Text> : null}
    </Stack>
  );
}

// ── Diagnoses ─────────────────────────────────────────────────────────────────

function DiagnosisRow({ row, onChange, onDelete, t }) {
  return (
    <Paper withBorder radius="sm" p="sm" style={{ background: row.isPrimary ? 'var(--mantine-color-blue-0)' : undefined }}>
      <DiagnosisLookupField
        row={row}
        t={t}
        onSelect={(lookupMatch) => {
          onChange('codeSystem', lookupMatch.codeSystem);
          onChange('code', lookupMatch.code);
          onChange('description', lookupMatch.description);
        }}
      />
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
        <Select label="System" data={DIAGNOSIS_SYSTEM_OPTIONS} value={row.codeSystem} onChange={(value) => onChange('codeSystem', value ?? 'DSM-5-TR')} />
        <TextInput label="Code" value={row.code} placeholder="F41.1" onChange={(e) => onChange('code', e.target.value)} />
        <TextInput label="Description" value={row.description} onChange={(e) => onChange('description', e.target.value)} />
        <DateInput label="Onset Date" value={strToDate(row.onsetDate)} valueFormat="YYYY-MM-DD" onChange={(value) => onChange('onsetDate', dateToStr(value))} />
        <Select label="Status" data={DIAGNOSIS_STATUS_OPTIONS} value={row.status} onChange={(value) => onChange('status', value ?? 'active')} />
      </SimpleGrid>
      <TextInput label="Notes" mt="xs" value={row.notes} onChange={(e) => onChange('notes', e.target.value)} />
      <Group justify="space-between" mt="xs">
        <Group gap="xs">
          <Checkbox label="Primary Diagnosis" checked={!!row.isPrimary} onChange={(e) => onChange('isPrimary', e.currentTarget.checked)} />
          {row.isPrimary && <Badge size="xs" color="blue">PRIMARY</Badge>}
        </Group>
        <Button size="compact-xs" color="red" variant="subtle" onClick={onDelete}>Remove</Button>
      </Group>
    </Paper>
  );
}

function DiagnosesList({ clientId, initialDiagnoses, t }) {
  const sorted = [...(initialDiagnoses ?? [])]
    .map((diagnosis) => normalizeDiagnosisRow(diagnosis))
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary));
  const [rows, setRows] = useState(sorted);
  const [saving, setSaving] = useState(false);

  const handleChange = (key, field, value) => {
    setRows((prev) => {
      let updated = prev.map((row) => row._key === key ? { ...row, [field]: value, _dirty: true } : row);
      if (field === 'isPrimary' && value) {
        updated = updated.map((row) => row._key === key ? row : { ...row, isPrimary: false, _dirty: true });
      }
      return updated;
    });
  };

  const handleDelete = (key) => {
    setRows((prev) => prev.map((row) => row._key === key ? { ...row, _deleted: true } : row));
    trackDiagnosisAction('diagnosis_remove');
  };

  const handleAdd = () => {
    setRows((prev) => [...prev, createDiagnosisDraft()]);
    trackDiagnosisAction('diagnosis_add');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const nextRows = [];
      for (const row of rows) {
        if (row._deleted) {
          if (row.id) await deleteClientDiagnosis(clientId, row.id);
          continue;
        }

        if (!row.code.trim() || !row.description.trim()) {
          frontendTelemetry.trackValidationError('client.diagnoses', 'client_detail', {
            surfaceKind: 'tab',
            action: 'diagnosis_save',
            validationState: 'missing_required_fields',
          });
          throw new Error(t('client.diagnoses.validationRequired'));
        }

        if (!row._dirty) {
          nextRows.push({ ...row, _dirty: false });
          continue;
        }

        const data = {
          codeSystem: row.codeSystem,
          code: row.code.trim(),
          description: row.description.trim(),
          onsetDate: row.onsetDate || null,
          status: row.status,
          isPrimary: row.isPrimary,
          notes: row.notes.trim() || null,
        };

        if (row.id) {
          const result = await updateClientDiagnosis(clientId, row.id, data);
          nextRows.push({ ...normalizeDiagnosisRow(result?.item ?? result), _key: row._key });
        } else {
          const result = await createClientDiagnosis(clientId, data);
          nextRows.push({ ...normalizeDiagnosisRow(result?.item ?? result), _key: row._key });
        }
      }

      setRows(nextRows);
      trackDiagnosisAction('diagnosis_save');
      notifications.show({ title: 'Saved', message: 'Diagnoses saved.', color: 'green' });
    } catch (err) {
      trackDiagnosisAction('diagnosis_save', 'failure', {
        statusClass: err?.statusClass ?? 'unknown',
      });
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const visible = rows.filter((row) => !row._deleted);
  return (
    <Stack gap="sm">
      <Title order={4} fz="sm" tt="uppercase" c="dimmed">Diagnoses</Title>
      {visible.length === 0 && <Text c="dimmed" fz="sm">No diagnoses on file.</Text>}
      {visible.map((row) => <DiagnosisRow key={row._key} row={row} t={t} onChange={(field, value) => handleChange(row._key, field, value)} onDelete={() => handleDelete(row._key)} />)}
      <Group gap="xs">
        <Button variant="outline" size="xs" onClick={handleAdd}>+ Add Diagnosis</Button>
        <Button size="xs" loading={saving} onClick={handleSave}>Save All Diagnoses</Button>
      </Group>
    </Stack>
  );
}

// ── Medications ───────────────────────────────────────────────────────────────

function MedicationRow({ row, onChange, onDelete }) {
  return (
    <Paper withBorder radius="sm" p="sm" style={{ opacity: row.is_active ? 1 : 0.75 }}>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        <TextInput label="Medication Name" value={row.med_name}  onChange={(e) => onChange('med_name',  e.target.value)} />
        <TextInput label="Dose"            value={row.dose}      placeholder="50 mg"    onChange={(e) => onChange('dose',      e.target.value)} />
        <TextInput label="Frequency"       value={row.frequency} placeholder="once daily" onChange={(e) => onChange('frequency', e.target.value)} />
        <Select label="Route" data={[{ value: 'oral', label: 'Oral' }, { value: 'IM', label: 'IM' }, { value: 'topical', label: 'Topical' }, { value: 'other', label: 'Other' }]} value={row.route} onChange={(v) => onChange('route', v ?? 'oral')} />
        <TextInput label="Prescriber"    value={row.prescriber} onChange={(e) => onChange('prescriber', e.target.value)} />
        <DateInput label="Start Date" valueFormat="YYYY-MM-DD" value={strToDate(row.start_date)} onChange={(v) => onChange('start_date', dateToStr(v))} />
        <DateInput label="End Date"   valueFormat="YYYY-MM-DD" value={strToDate(row.end_date)}   onChange={(v) => onChange('end_date',   dateToStr(v))} />
        <TextInput label="Reason / Indication" value={row.reason} onChange={(e) => onChange('reason', e.target.value)} />
      </SimpleGrid>
      <TextInput label="Notes" mt="xs" value={row.notes} onChange={(e) => onChange('notes', e.target.value)} />
      <Group justify="space-between" mt="xs">
        <Checkbox label="Currently Active" checked={!!row.is_active} onChange={(e) => onChange('is_active', e.currentTarget.checked)} />
        <Button size="compact-xs" color="red" variant="subtle" onClick={onDelete}>Remove</Button>
      </Group>
    </Paper>
  );
}

function MedicationsList({ clientId, initialMedications }) {
  const sorted = [...(initialMedications ?? [])].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));
  const [rows,             setRows]             = useState(sorted.map((m) => ({ ...m, _key: Math.random(), _dirty: false, _deleted: false })));
  const [showDiscontinued, setShowDiscontinued] = useState(false);
  const [saving,           setSaving]           = useState(false);

  const handleChange = (key, field, value) => setRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value, _dirty: true } : r));
  const handleDelete = (key) => setRows((prev) => prev.map((r) => r._key === key ? { ...r, _deleted: true } : r));
  const handleAdd    = () => setRows((prev) => [...prev, { _key: Math.random(), id: null, med_name: '', dose: '', frequency: '', route: 'oral', prescriber: '', start_date: '', end_date: '', is_active: true, reason: '', notes: '', _dirty: true, _deleted: false }]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        if (r._deleted) { if (r.id) await deleteClientMedication(clientId, r.id); }
        else if (r._dirty) {
          const data = { med_name: r.med_name.trim(), dose: r.dose.trim() || null, frequency: r.frequency.trim() || null, route: r.route || null, prescriber: r.prescriber.trim() || null, start_date: r.start_date || null, end_date: r.end_date || null, is_active: r.is_active ? 1 : 0, reason: r.reason.trim() || null, notes: r.notes.trim() || null };
          if (r.id) { await updateClientMedication(clientId, r.id, data); }
          else { const result = await createClientMedication(clientId, data); r.id = result.item?.id ?? result.id; }
        }
      }
      setRows((prev) => prev.filter((r) => !r._deleted).map((r) => ({ ...r, _dirty: false })));
      notifications.show({ title: 'Saved', message: 'Medications saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  const visible      = rows.filter((r) => !r._deleted);
  const active       = visible.filter((r) => r.is_active);
  const discontinued = visible.filter((r) => !r.is_active);

  return (
    <Stack gap="sm">
      <Title order={4} fz="sm" tt="uppercase" c="dimmed">Medications</Title>
      {active.length === 0 && <Text c="dimmed" fz="sm">No active medications.</Text>}
      {active.map((row) => <MedicationRow key={row._key} row={row} onChange={(f, v) => handleChange(row._key, f, v)} onDelete={() => handleDelete(row._key)} />)}
      {discontinued.length > 0 && (
        <Stack gap="xs">
          <Button variant="subtle" size="xs" onClick={() => setShowDiscontinued((v) => !v)}>
            {showDiscontinued ? 'Hide' : 'Show'} Discontinued ({discontinued.length})
          </Button>
          {showDiscontinued && discontinued.map((row) => <MedicationRow key={row._key} row={row} onChange={(f, v) => handleChange(row._key, f, v)} onDelete={() => handleDelete(row._key)} />)}
        </Stack>
      )}
      <Group gap="xs">
        <Button variant="outline" size="xs" onClick={handleAdd}>+ Add Medication</Button>
        <Button size="xs" loading={saving} onClick={handleSave}>Save All Medications</Button>
      </Group>
    </Stack>
  );
}

// ── Allergies ─────────────────────────────────────────────────────────────────

function AllergyRow({ row, onChange, onDelete }) {
  return (
    <Paper withBorder radius="sm" p="sm">
      <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
        <TextInput label="Substance" value={row.substance} onChange={(e) => onChange('substance', e.target.value)} />
        <TextInput label="Reaction"  value={row.reaction}  onChange={(e) => onChange('reaction',  e.target.value)} />
        <Select label="Severity" data={[{ value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }, { value: 'life_threatening', label: 'Life-Threatening' }, { value: 'unknown', label: 'Unknown' }]} value={row.severity} onChange={(v) => onChange('severity', v ?? 'unknown')} />
        <Select label="Type" data={[{ value: 'drug', label: 'Drug' }, { value: 'food', label: 'Food' }, { value: 'environmental', label: 'Environmental' }, { value: 'other', label: 'Other' }]} value={row.allergy_type} onChange={(v) => onChange('allergy_type', v ?? 'drug')} />
        <DateInput label="Onset Date" valueFormat="YYYY-MM-DD" value={strToDate(row.onset_date)} onChange={(v) => onChange('onset_date', dateToStr(v))} />
      </SimpleGrid>
      <Group justify="space-between" mt="xs">
        <Checkbox label="Active" checked={!!row.is_active} onChange={(e) => onChange('is_active', e.currentTarget.checked)} />
        <Button size="compact-xs" color="red" variant="subtle" onClick={onDelete}>Remove</Button>
      </Group>
    </Paper>
  );
}

function AllergiesList({ clientId, initialAllergies }) {
  const [rows,             setRows]             = useState((initialAllergies ?? []).map((a) => ({ ...a, _key: Math.random(), _dirty: false, _deleted: false })));
  const [noKnownAllergies, setNoKnownAllergies] = useState(false);
  const [saving,           setSaving]           = useState(false);

  const handleChange = (key, field, value) => setRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value, _dirty: true } : r));
  const handleDelete = (key) => setRows((prev) => prev.map((r) => r._key === key ? { ...r, _deleted: true } : r));
  const handleAdd    = () => { if (!noKnownAllergies) setRows((prev) => [...prev, { _key: Math.random(), id: null, substance: '', reaction: '', severity: 'unknown', allergy_type: 'drug', onset_date: '', is_active: true, _dirty: true, _deleted: false }]); };
  const handleNka    = (checked) => { setNoKnownAllergies(checked); if (checked) setRows((prev) => prev.map((r) => ({ ...r, _deleted: true }))); };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        if (r._deleted) { if (r.id) await deleteClientAllergy(clientId, r.id); }
        else if (r._dirty) {
          const data = { substance: r.substance.trim(), reaction: r.reaction.trim() || null, severity: r.severity, allergy_type: r.allergy_type, onset_date: r.onset_date || null, is_active: r.is_active ? 1 : 0 };
          if (r.id) { await updateClientAllergy(clientId, r.id, data); }
          else { const result = await createClientAllergy(clientId, data); r.id = result.item?.id ?? result.id; }
        }
      }
      setRows((prev) => prev.filter((r) => !r._deleted).map((r) => ({ ...r, _dirty: false })));
      notifications.show({ title: 'Saved', message: 'Allergies saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  const visible = rows.filter((r) => !r._deleted);
  return (
    <Stack gap="sm">
      <Title order={4} fz="sm" tt="uppercase" c="dimmed">Allergies</Title>
      <Checkbox label="No Known Allergies (NKA)" checked={noKnownAllergies} onChange={(e) => handleNka(e.currentTarget.checked)} />
      {!noKnownAllergies && (
        <>
          {visible.length === 0 && <Text c="dimmed" fz="sm">No allergies on file.</Text>}
          {visible.map((row) => <AllergyRow key={row._key} row={row} onChange={(f, v) => handleChange(row._key, f, v)} onDelete={() => handleDelete(row._key)} />)}
        </>
      )}
      <Group gap="xs">
        {!noKnownAllergies && <Button variant="outline" size="xs" onClick={handleAdd}>+ Add Allergy</Button>}
        <Button size="xs" loading={saving} onClick={handleSave}>Save All Allergies</Button>
      </Group>
    </Stack>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function DiagnosesTab({ client, clientId }) {
  const { t } = useI18n();

  return (
    <Stack gap="xl" maw={900}>
      <DiagnosesList  clientId={clientId} initialDiagnoses={client.diagnoses  ?? []} t={t} />
      <MedicationsList clientId={clientId} initialMedications={client.medications ?? []} />
      <AllergiesList   clientId={clientId} initialAllergies={client.allergies  ?? []} />
    </Stack>
  );
}
