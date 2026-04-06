import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { Stack, Title, SimpleGrid, TextInput, Select, Textarea, Checkbox, Button, Group, Text, Badge } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { upsertClientLegal, upsertClinicalHistory, patchClient } from '../../../lib/clientApi.js';

function strToDate(s) { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d; }
function dateToStr(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export default function LegalAdminTab({ client, clientId }) {
  const legal = client.legal ?? {};
  const ch    = client.clinical ?? {};
  const isMinor = !!client.is_minor;

  const [showGuardian,   setShowGuardian]   = useState(isMinor || !!(legal.guardian_name));
  const [courtOrdered,   setCourtOrdered]   = useState(!!(legal.court_ordered || client.court_ordered));
  const [saving,         setSaving]         = useState(false);

  // Guardian
  const [guardianName,          setGuardianName]          = useState(legal.guardian_name          ?? '');
  const [guardianRelationship,  setGuardianRelationship]  = useState(legal.guardian_relationship  ?? '');
  const [guardianPhone,         setGuardianPhone]         = useState(legal.guardian_phone         ?? '');
  const [guardianEmail,         setGuardianEmail]         = useState(legal.guardian_email         ?? '');
  const [guardianLine1,         setGuardianLine1]         = useState(legal.guardian_address?.line1  ?? '');
  const [guardianCity,          setGuardianCity]          = useState(legal.guardian_address?.city   ?? '');
  const [guardianState,         setGuardianState]         = useState(legal.guardian_address?.state  ?? '');
  const [guardianPostal,        setGuardianPostal]        = useState(legal.guardian_address?.postal ?? '');

  // Court
  const [courtCaseNumber,  setCourtCaseNumber]  = useState(legal.court_case_number     ?? '');
  const [courtOrderExpires,setCourtOrderExpires]= useState(legal.court_order_expires || null);
  const [courtContactName, setCourtContactName] = useState(legal.court_contact?.name   ?? '');
  const [courtContactPhone,setCourtContactPhone]= useState(legal.court_contact?.phone  ?? '');
  const [courtAttorneyName,setCourtAttorneyName]= useState(legal.court_contact?.attorney ?? '');
  const [custodyNotes,     setCustodyNotes]     = useState(legal.custody_notes          ?? '');

  // Admin
  const [referralSourceDetail, setReferralSourceDetail] = useState(client.referral_source_detail ?? '');
  const [pcpName,              setPcpName]              = useState(ch.pcp_name     ?? '');
  const [pcpPractice,          setPcpPractice]          = useState(ch.pcp_practice ?? '');
  const [pcpPhone,             setPcpPhone]             = useState(ch.pcp_phone    ?? '');
  const [preferredPharmacy,    setPreferredPharmacy]    = useState(typeof ch.preferred_pharmacy === 'object' && ch.preferred_pharmacy ? JSON.stringify(ch.preferred_pharmacy) : (ch.preferred_pharmacy ?? ''));

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertClientLegal(clientId, {
        guardian_name:         guardianName.trim()         || null,
        guardian_relationship: guardianRelationship        || null,
        guardian_phone:        guardianPhone.trim()        || null,
        guardian_email:        guardianEmail.trim()        || null,
        guardian_address: { line1: guardianLine1.trim(), city: guardianCity.trim(), state: guardianState.trim(), postal: guardianPostal.trim() },
        court_ordered:         courtOrdered ? 1 : 0,
        court_case_number:     courtCaseNumber.trim()      || null,
        court_order_expires:   dateToStr(courtOrderExpires),
        court_contact: { name: courtContactName.trim() || null, phone: courtContactPhone.trim() || null, attorney: courtAttorneyName.trim() || null },
        custody_notes:         custodyNotes.trim()         || null,
      });
      await upsertClinicalHistory(clientId, {
        pcp_name: pcpName.trim() || null, pcp_practice: pcpPractice.trim() || null,
        pcp_phone: pcpPhone.trim() || null, preferred_pharmacy: preferredPharmacy.trim() || null,
      });
      await patchClient(clientId, { referral_source_detail: referralSourceDetail.trim() || null, court_ordered: courtOrdered ? 1 : 0 });
      notifications.show({ title: 'Saved', message: 'Legal & administrative record saved.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  return (
    <Stack gap="xl" maw={900}>
      {/* Guardian */}
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <Title order={4} fz="sm" tt="uppercase" c="dimmed">Guardian Information</Title>
            {isMinor && <Badge size="xs" color="yellow" variant="light">Minor Client</Badge>}
          </Group>
          {!isMinor && (
            <Button variant="subtle" size="xs" onClick={() => setShowGuardian((v) => !v)}>
              {showGuardian ? 'Hide Guardian Info' : 'Show Guardian Info'}
            </Button>
          )}
        </Group>
        {showGuardian && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Guardian Full Name"    value={guardianName}         onChange={(e) => setGuardianName(e.target.value)} />
            <Select    label="Relationship"          data={[{ value: '', label: '— Select —' }, { value: 'parent', label: 'Parent' }, { value: 'legal guardian', label: 'Legal Guardian' }, { value: 'power of attorney', label: 'Power of Attorney' }, { value: 'other', label: 'Other' }]} value={guardianRelationship} onChange={(v) => setGuardianRelationship(v ?? '')} />
            <TextInput label="Guardian Phone" type="tel"   value={guardianPhone}  onChange={(e) => setGuardianPhone(e.target.value)} />
            <TextInput label="Guardian Email" type="email" value={guardianEmail}  onChange={(e) => setGuardianEmail(e.target.value)} />
            <TextInput label="Address Line 1" value={guardianLine1}   onChange={(e) => setGuardianLine1(e.target.value)} />
            <TextInput label="City"           value={guardianCity}    onChange={(e) => setGuardianCity(e.target.value)} />
            <TextInput label="State"          value={guardianState}   onChange={(e) => setGuardianState(e.target.value)} maxLength={64} />
            <TextInput label="ZIP"            value={guardianPostal}  onChange={(e) => setGuardianPostal(e.target.value)} />
          </SimpleGrid>
        )}
      </Stack>

      {/* Court Order */}
      <Stack gap="sm">
        <Title order={4} fz="sm" tt="uppercase" c="dimmed">Court Order</Title>
        <Checkbox label="Client is court-ordered to attend counseling" checked={courtOrdered} onChange={(e) => setCourtOrdered(e.currentTarget.checked)} />
        {courtOrdered && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput  label="Case Number"              value={courtCaseNumber}  onChange={(e) => setCourtCaseNumber(e.target.value)} />
              <DateInput  label="Court Order Expires" valueFormat="MM/DD/YYYY" placeholder="MM/DD/YYYY" value={courtOrderExpires} onChange={setCourtOrderExpires} />
              <TextInput  label="Court Officer / Contact Name" value={courtContactName}  onChange={(e) => setCourtContactName(e.target.value)} />
              <TextInput  label="Court Contact Phone" type="tel" value={courtContactPhone} onChange={(e) => setCourtContactPhone(e.target.value)} />
              <TextInput  label="Attorney Name"        value={courtAttorneyName}  onChange={(e) => setCourtAttorneyName(e.target.value)} />
            </SimpleGrid>
            <Textarea label="Custody Notes" rows={3} value={custodyNotes} onChange={(e) => setCustodyNotes(e.target.value)} />
          </>
        )}
      </Stack>

      {/* Administrative */}
      <Stack gap="sm">
        <Title order={4} fz="sm" tt="uppercase" c="dimmed">Administrative</Title>
        <TextInput label="Referral Source Detail" value={referralSourceDetail} onChange={(e) => setReferralSourceDetail(e.target.value)} placeholder="e.g. Referred by Dr. Smith at First Baptist" />
        <Text fz="xs" c="dimmed" fs="italic">The PCP and Pharmacy fields below are also editable on the Clinical History tab.</Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput label="Primary Care Physician" value={pcpName}          onChange={(e) => setPcpName(e.target.value)} />
          <TextInput label="PCP Practice / Clinic"  value={pcpPractice}      onChange={(e) => setPcpPractice(e.target.value)} />
          <TextInput label="PCP Phone" type="tel"    value={pcpPhone}         onChange={(e) => setPcpPhone(e.target.value)} />
          <TextInput label="Preferred Pharmacy"      value={preferredPharmacy} onChange={(e) => setPreferredPharmacy(e.target.value)} placeholder="Pharmacy name, address" />
        </SimpleGrid>
      </Stack>

      <Group><Button loading={saving} onClick={handleSave}>Save Legal & Admin</Button></Group>
    </Stack>
  );
}
