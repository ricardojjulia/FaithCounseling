import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import {
  Stack, Title, SimpleGrid, TextInput, PasswordInput, Select, Button, Group,
  Text, Paper, Divider,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
  patchClient, createClientPhone, updateClientPhone, deleteClientPhone,
  createClientAddress, updateClientAddress, deleteClientAddress,
  fetchStaff,
} from '../../../lib/clientApi.js';

const STATUS_OPTIONS    = [{ value: 'active', label: 'Active' }, { value: 'waitlist', label: 'Waitlist' }, { value: 'inactive', label: 'Inactive' }, { value: 'discharged', label: 'Discharged' }];
const LANGUAGE_OPTIONS  = ['English', 'Spanish', 'French', 'Mandarin', 'Cantonese', 'Vietnamese', 'Arabic', 'Korean', 'Tagalog', 'Portuguese', 'Russian', 'Haitian Creole', 'Other'].map((l) => ({ value: l, label: l }));
const MARITAL_OPTIONS   = ['single', 'married', 'separated', 'divorced', 'widowed', 'partnered', 'other'].map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }));
const EMPLOY_OPTIONS    = ['employed_full_time', 'employed_part_time', 'self_employed', 'unemployed', 'student', 'retired', 'disability', 'other'].map((s) => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));
const PHONE_TYPE_OPTIONS = ['cell', 'home', 'work', 'fax'].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
const ADDR_TYPE_OPTIONS  = ['primary', 'mailing', 'other'].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
const EMPLOYED = ['employed_full_time', 'employed_part_time', 'self_employed'];

function strToDate(s) { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; }
function dateToStr(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

export default function DemographicsTab({ client, clientId }) {
  // Identity
  const [firstName,    setFirstName]    = useState(client.firstName    ?? '');
  const [middleName,   setMiddleName]   = useState(client.middleName   ?? '');
  const [lastName,     setLastName]     = useState(client.lastName     ?? '');
  const [preferredName,setPreferredName]= useState(client.preferredName ?? '');
  const [pronouns,     setPronouns]     = useState(client.pronouns     ?? '');
  const [dateOfBirth,  setDateOfBirth]  = useState(strToDate(client.dateOfBirth));
  const [ssnLast4,     setSsnLast4]     = useState(client.ssnLast4     ?? '');
  const [status,       setStatus]       = useState(client.status       ?? 'active');
  const [idSaving,     setIdSaving]     = useState(false);

  // Demographics
  const [genderIdentity,      setGenderIdentity]      = useState(client.genderIdentity      ?? '');
  const [biologicalSex,       setBiologicalSex]       = useState(client.biologicalSex       ?? '');
  const [raceEthnicity,       setRaceEthnicity]       = useState(client.raceEthnicity       ?? '');
  const [maritalStatus,       setMaritalStatus]       = useState(client.maritalStatus       ?? '');
  const [languagePreference,  setLanguagePreference]  = useState(client.languagePreference  ?? 'English');
  const [employmentStatus,    setEmploymentStatus]    = useState(client.employmentStatus    ?? '');
  const [employerName,        setEmployerName]        = useState(client.employerName        ?? '');
  const [demoSaving,          setDemoSaving]          = useState(false);

  // Email
  const [email,        setEmail]        = useState(client.email ?? '');
  const [emailSaving,  setEmailSaving]  = useState(false);

  // Phones
  const initPhones = (client.phones ?? []).map((p) => ({ ...p, _key: Math.random(), _deleted: false, _dirty: false }));
  const [phones, setPhones] = useState(initPhones);
  const [phonesSaving, setPhonesSaving] = useState(false);

  // Addresses
  const initAddresses = (client.addresses ?? []).map((a) => ({ ...a, _key: Math.random(), _deleted: false, _dirty: false }));
  const [addresses, setAddresses] = useState(initAddresses);
  const [addrSaving, setAddrSaving] = useState(false);

  // Counselor assignment
  const [primaryCounselorId, setPrimaryCounselorId] = useState(client.primaryCounselorId ?? null);
  const [counselorOptions,   setCounselorOptions]   = useState([]);
  const [counselorSaving,    setCounselorSaving]    = useState(false);

  useEffect(() => {
    fetchStaff()
      .then((data) => {
        const counselors = (data?.items ?? [])
          .filter((s) => s.role === 'counselor' || s.role === 'intern')
          .map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}${s.role === 'intern' ? ' (Intern)' : ''}` }));
        setCounselorOptions(counselors);
      })
      .catch(() => {});
  }, []);

  const saveCounselor = async () => {
    setCounselorSaving(true);
    try {
      await patchClient(clientId, { primaryCounselorId: primaryCounselorId ?? null });
      notifications.show({ title: 'Saved', message: 'Counselor assignment saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setCounselorSaving(false); }
  };

  const age = calcAge(dateOfBirth);

  const saveIdentity = async () => {
    setIdSaving(true);
    try {
      await patchClient(clientId, {
        firstName: firstName.trim(), middleName: middleName.trim(),
        lastName: lastName.trim(), preferredName: preferredName.trim(),
        pronouns: pronouns.trim(), dateOfBirth: dateToStr(dateOfBirth),
        ssnLast4: ssnLast4.trim() || null, status,
      });
      notifications.show({ title: 'Saved', message: 'Identity saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setIdSaving(false); }
  };

  const saveDemographics = async () => {
    setDemoSaving(true);
    try {
      await patchClient(clientId, {
        genderIdentity: genderIdentity.trim(), biologicalSex: biologicalSex || null,
        raceEthnicity: raceEthnicity.trim(), maritalStatus: maritalStatus || null,
        languagePreference: languagePreference || 'English',
        employmentStatus: employmentStatus || null,
        employerName: EMPLOYED.includes(employmentStatus) ? employerName.trim() : null,
      });
      notifications.show({ title: 'Saved', message: 'Demographics saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setDemoSaving(false); }
  };

  const saveEmail = async () => {
    setEmailSaving(true);
    try {
      await patchClient(clientId, { email: email.trim() || null });
      notifications.show({ title: 'Saved', message: 'Email saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setEmailSaving(false); }
  };

  const updatePhone   = (key, field, val) => setPhones((prev) => prev.map((p) => p._key === key ? { ...p, [field]: val, _dirty: true } : p));
  const removePhone   = (key) => setPhones((prev) => prev.map((p) => p._key === key ? { ...p, _deleted: true } : p));
  const addPhone      = () => setPhones((prev) => [...prev, { _key: Math.random(), id: null, phone_type: 'cell', number: '', extension: '', is_preferred: false, ok_to_text: false, ok_to_leave_msg: true, _deleted: false, _dirty: true }]);

  const savePhones = async () => {
    setPhonesSaving(true);
    try {
      for (const p of phones) {
        if (p._deleted) { if (p.id) await deleteClientPhone(clientId, p.id); }
        else if (p._dirty) {
          const data = { phone_type: p.phone_type, number: p.number, extension: p.extension || null, is_preferred: p.is_preferred ? 1 : 0, ok_to_text: p.ok_to_text ? 1 : 0, ok_to_leave_msg: p.ok_to_leave_msg ? 1 : 0 };
          if (p.id) { await updateClientPhone(clientId, p.id, data); }
          else { const r = await createClientPhone(clientId, data); p.id = r.item?.id ?? r.id; }
        }
      }
      setPhones((prev) => prev.filter((p) => !p._deleted).map((p) => ({ ...p, _dirty: false })));
      notifications.show({ title: 'Saved', message: 'Phones saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setPhonesSaving(false); }
  };

  const updateAddress = (key, field, val) => setAddresses((prev) => prev.map((a) => a._key === key ? { ...a, [field]: val, _dirty: true } : a));
  const removeAddress = (key) => setAddresses((prev) => prev.map((a) => a._key === key ? { ...a, _deleted: true } : a));
  const addAddress    = () => setAddresses((prev) => [...prev, { _key: Math.random(), id: null, addr_type: 'primary', line1: '', line2: '', city: '', state: '', postal: '', country: 'US', is_preferred: false, _deleted: false, _dirty: true }]);

  const saveAddresses = async () => {
    setAddrSaving(true);
    try {
      for (const a of addresses) {
        if (a._deleted) { if (a.id) await deleteClientAddress(clientId, a.id); }
        else if (a._dirty) {
          const data = { addr_type: a.addr_type, line1: a.line1, line2: a.line2 || null, city: a.city, state: a.state, postal: a.postal, country: a.country || 'US', is_preferred: a.is_preferred ? 1 : 0 };
          if (a.id) { await updateClientAddress(clientId, a.id, data); }
          else { const r = await createClientAddress(clientId, data); a.id = r.item?.id ?? r.id; }
        }
      }
      setAddresses((prev) => prev.filter((a) => !a._deleted).map((a) => ({ ...a, _dirty: false })));
      notifications.show({ title: 'Saved', message: 'Addresses saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setAddrSaving(false); }
  };

  const visiblePhones    = phones.filter((p) => !p._deleted);
  const visibleAddresses = addresses.filter((a) => !a._deleted);

  return (
    <Stack gap="xl" maw={900}>
      {/* Care Team */}
      <Stack gap="sm">
        <Title order={4} fz="sm" tt="uppercase" c="dimmed">Care Team</Title>
        <Group align="flex-end" gap="sm" maw={420}>
          <Select
            label="Primary Counselor"
            placeholder="Unassigned"
            data={counselorOptions}
            value={primaryCounselorId}
            onChange={(v) => setPrimaryCounselorId(v ?? null)}
            clearable
            searchable
            style={{ flex: 1 }}
          />
          <Button loading={counselorSaving} onClick={saveCounselor}>Save</Button>
        </Group>
      </Stack>

      <Divider />

      {/* Identity */}
      <Stack gap="sm">
        <Title order={4} fz="sm" tt="uppercase" c="dimmed">Legal Identity</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <TextInput label="Legal First Name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <TextInput label="Legal Middle Name"        value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
          <TextInput label="Legal Last Name"  required value={lastName}  onChange={(e) => setLastName(e.target.value)} />
          <TextInput label="Preferred Name / Goes By" value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />
          <TextInput label="Pronouns" placeholder="e.g. she/her, they/them" value={pronouns} onChange={(e) => setPronouns(e.target.value)} />
          <DateInput label={age !== null ? `Date of Birth (${age} yrs)` : 'Date of Birth'} valueFormat="YYYY-MM-DD" value={dateOfBirth} onChange={setDateOfBirth} />
          <PasswordInput label="SSN Last 4" maxLength={4} value={ssnLast4} onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <Select label="Status" data={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v ?? 'active')} />
        </SimpleGrid>
        <Group><Button loading={idSaving} onClick={saveIdentity}>Save Identity</Button></Group>
      </Stack>

      <Divider />

      {/* Demographics */}
      <Stack gap="sm">
        <Title order={4} fz="sm" tt="uppercase" c="dimmed">Demographics</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput label="Gender Identity" placeholder="e.g. Man, Woman, Non-binary" value={genderIdentity} onChange={(e) => setGenderIdentity(e.target.value)} />
          <Select label="Biological Sex" data={[{ value: '', label: '— Select —' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'intersex', label: 'Intersex' }, { value: 'unknown', label: 'Unknown' }]} value={biologicalSex} onChange={(v) => setBiologicalSex(v ?? '')} />
          <TextInput label="Race / Ethnicity" placeholder="e.g. Hispanic or Latino" value={raceEthnicity} onChange={(e) => setRaceEthnicity(e.target.value)} />
          <Select label="Marital Status" data={[{ value: '', label: '— Select —' }, ...MARITAL_OPTIONS]} value={maritalStatus} onChange={(v) => setMaritalStatus(v ?? '')} />
          <Select label="Language Preference" data={LANGUAGE_OPTIONS} value={languagePreference} onChange={(v) => setLanguagePreference(v ?? 'English')} />
          <Select label="Employment Status" data={[{ value: '', label: '— Select —' }, ...EMPLOY_OPTIONS]} value={employmentStatus} onChange={(v) => setEmploymentStatus(v ?? '')} />
          {EMPLOYED.includes(employmentStatus) && (
            <TextInput label="Employer Name" value={employerName} onChange={(e) => setEmployerName(e.target.value)} />
          )}
        </SimpleGrid>
        <Group><Button loading={demoSaving} onClick={saveDemographics}>Save Demographics</Button></Group>
      </Stack>

      <Divider />

      {/* Contact */}
      <Stack gap="sm">
        <Title order={4} fz="sm" tt="uppercase" c="dimmed">Contact Information</Title>

        {/* Email */}
        <Group align="flex-end" gap="sm">
          <TextInput label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" style={{ flex: 1 }} />
          <Button loading={emailSaving} onClick={saveEmail}>Save Email</Button>
        </Group>

        {/* Phones */}
        <Stack gap="xs" mt="sm">
          <Text fw={600} fz="sm">Phone Numbers</Text>
          {visiblePhones.length === 0 && <Text c="dimmed" fz="sm">No phones added.</Text>}
          {visiblePhones.map((p) => (
            <Paper key={p._key} withBorder radius="sm" p="sm">
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                <Select data={PHONE_TYPE_OPTIONS} value={p.phone_type} onChange={(v) => updatePhone(p._key, 'phone_type', v ?? 'cell')} />
                <TextInput type="tel" placeholder="(555) 555-5555" value={p.number} onChange={(e) => updatePhone(p._key, 'number', e.target.value)} />
                <TextInput placeholder="Ext." value={p.extension ?? ''} onChange={(e) => updatePhone(p._key, 'extension', e.target.value)} />
                <Group gap="sm" wrap="nowrap">
                  <input type="checkbox" checked={!!p.is_preferred}   onChange={(e) => updatePhone(p._key, 'is_preferred',   e.target.checked)} /> <Text fz="xs">Preferred</Text>
                  <input type="checkbox" checked={!!p.ok_to_text}     onChange={(e) => updatePhone(p._key, 'ok_to_text',     e.target.checked)} /> <Text fz="xs">Text</Text>
                  <input type="checkbox" checked={!!p.ok_to_leave_msg} onChange={(e) => updatePhone(p._key, 'ok_to_leave_msg', e.target.checked)} /> <Text fz="xs">Msg</Text>
                  <Button size="compact-xs" color="red" variant="subtle" onClick={() => removePhone(p._key)}>×</Button>
                </Group>
              </SimpleGrid>
            </Paper>
          ))}
          <Group gap="xs">
            <Button variant="outline" size="xs" onClick={addPhone}>+ Add Phone</Button>
            <Button size="xs" loading={phonesSaving} onClick={savePhones}>Save Phones</Button>
          </Group>
        </Stack>

        {/* Addresses */}
        <Stack gap="xs" mt="sm">
          <Text fw={600} fz="sm">Addresses</Text>
          {visibleAddresses.length === 0 && <Text c="dimmed" fz="sm">No addresses added.</Text>}
          {visibleAddresses.map((a) => (
            <Paper key={a._key} withBorder radius="sm" p="sm">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                <Select label="Type" data={ADDR_TYPE_OPTIONS} value={a.addr_type} onChange={(v) => updateAddress(a._key, 'addr_type', v ?? 'primary')} />
                <TextInput label="Line 1" value={a.line1} onChange={(e) => updateAddress(a._key, 'line1', e.target.value)} />
                <TextInput label="Line 2" value={a.line2 ?? ''} onChange={(e) => updateAddress(a._key, 'line2', e.target.value)} placeholder="Apt, Suite…" />
                <TextInput label="City"    value={a.city}   onChange={(e) => updateAddress(a._key, 'city',   e.target.value)} />
                <TextInput label="State"   value={a.state}  onChange={(e) => updateAddress(a._key, 'state',  e.target.value)} placeholder="CA" />
                <TextInput label="Postal"  value={a.postal} onChange={(e) => updateAddress(a._key, 'postal', e.target.value)} />
                <TextInput label="Country" value={a.country} onChange={(e) => updateAddress(a._key, 'country', e.target.value)} maxLength={4} />
              </SimpleGrid>
              <Group justify="space-between" mt="xs">
                <Group gap="xs">
                  <input type="checkbox" checked={!!a.is_preferred} onChange={(e) => updateAddress(a._key, 'is_preferred', e.target.checked)} />
                  <Text fz="xs">Preferred address</Text>
                </Group>
                <Button size="compact-xs" color="red" variant="subtle" onClick={() => removeAddress(a._key)}>Remove</Button>
              </Group>
            </Paper>
          ))}
          <Group gap="xs">
            <Button variant="outline" size="xs" onClick={addAddress}>+ Add Address</Button>
            <Button size="xs" loading={addrSaving} onClick={saveAddresses}>Save Addresses</Button>
          </Group>
        </Stack>
      </Stack>
    </Stack>
  );
}
