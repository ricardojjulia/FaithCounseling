import { useState, useEffect } from 'react';
import {
  Stack, Title, Text, Paper, TextInput, Select, Group, Button, Alert, Loader, Divider, Badge,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconVideo } from '@tabler/icons-react';
import { csrfHeaders } from '../../../lib/csrf.js';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

const PRACTICE_TYPE_OPTIONS = [
  { value: 'solo', label: 'Solo Practice' },
  { value: 'group', label: 'Group Practice' },
  { value: 'multi_location', label: 'Multi-Location' },
];

const TIMEZONE_OPTIONS = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
].map((tz) => ({ value: tz, label: tz.replace('America/', '').replace('Pacific/', '').replaceAll('_', ' ') + ` (${tz})` }));

export default function PracticeTab() {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Video config state — kept separate so we never accidentally round-trip
  // a stale private key back to the server.
  const [videoDraft, setVideoDraft] = useState(null);
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoDirty, setVideoDirty] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/v1/practices')
      .then((payload) => {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setPractices(items);
        if (items.length) initDraft(items[0]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function initDraft(practice) {
    setDraft({
      id: practice.id,
      name: practice.name ?? '',
      type: practice.type ?? 'solo',
      timezone: practice.timezone ?? 'America/New_York',
      faithTradition: practice.faithTradition ?? 'Christian',
      contactEmail: practice.contactEmail ?? '',
      contactPhone: practice.contactPhone ?? '',
    });
    setDirty(false);

    // Video config — never pre-populate private key (it is never returned by API).
    setVideoDraft({
      id: practice.id,
      jaasAppId: practice.jaasAppId ?? '',
      jaasApiKeyId: practice.jaasApiKeyId ?? '',
      jaasDomain: practice.jaasDomain ?? '8x8.vc',
      jaasPrivateKeyConfigured: practice.jaasPrivateKeyConfigured ?? false,
      jaasPrivateKeyPem: '', // always blank — write-only
    });
    setVideoDirty(false);
  }

  function updateVideo(field, value) {
    setVideoDraft((prev) => ({ ...prev, [field]: value }));
    setVideoDirty(true);
  }

  async function saveVideoConfig() {
    if (!videoDraft?.id) return;
    setVideoSaving(true);
    try {
      // Build patch payload — only send private key if the admin typed one.
      const body = {
        jaasAppId: videoDraft.jaasAppId || null,
        jaasApiKeyId: videoDraft.jaasApiKeyId || null,
        jaasDomain: videoDraft.jaasDomain || null,
      };
      if (videoDraft.jaasPrivateKeyPem.trim()) {
        body.jaasPrivateKeyPem = videoDraft.jaasPrivateKeyPem.trim();
      }
      const payload = await apiFetch(`/api/v1/practices/${videoDraft.id}/video-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify(body),
      });
      // Refresh local practice list so jaasPrivateKeyConfigured flag is current.
      setPractices((prev) => prev.map((p) => p.id === videoDraft.id ? payload.item : p));
      setVideoDraft((prev) => ({
        ...prev,
        jaasPrivateKeyConfigured: payload.item?.jaasPrivateKeyConfigured ?? prev.jaasPrivateKeyConfigured,
        jaasPrivateKeyPem: '', // clear the sensitive field after save
      }));
      setVideoDirty(false);
      notifications.show({ title: 'Saved', message: 'Video configuration updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setVideoSaving(false);
    }
  }

  function update(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  async function save() {
    if (!draft?.id) return;
    setSaving(true);
    try {
      const payload = await apiFetch(`/api/v1/practices/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          name: draft.name,
          type: draft.type,
          timezone: draft.timezone,
          faithTradition: draft.faithTradition,
          contactEmail: draft.contactEmail,
          contactPhone: draft.contactPhone,
        }),
      });
      setPractices((prev) => prev.map((p) => p.id === draft.id ? payload.item : p));
      setDirty(false);
      notifications.show({ title: 'Saved', message: 'Practice profile updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
  if (error) return <Alert color="red" title="Unable to load practice">{error}</Alert>;
  if (!draft) return <Text c="dimmed" fz="sm">No practice configured for this tenant.</Text>;

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Stack gap="xs" mb="md">
          <Title order={3} fz="md">Practice Profile</Title>
          <Text fz="sm" c="dimmed">Core practice identity and contact information. Changes apply across all counselor and portal surfaces.</Text>
        </Stack>
        <Divider mb="md" />
        <Stack gap="sm">
          <TextInput
            label="Practice Name"
            value={draft.name}
            onChange={(e) => update('name', e.currentTarget.value)}
            required
          />
          <Group grow>
            <Select
              label="Practice Type"
              data={PRACTICE_TYPE_OPTIONS}
              value={draft.type}
              onChange={(v) => update('type', v ?? 'solo')}
            />
            <Select
              label="Timezone"
              data={TIMEZONE_OPTIONS}
              value={draft.timezone}
              onChange={(v) => update('timezone', v ?? 'America/New_York')}
              searchable
            />
          </Group>
          <TextInput
            label="Faith Tradition"
            value={draft.faithTradition}
            onChange={(e) => update('faithTradition', e.currentTarget.value)}
            description="Displayed in portal and client-facing materials."
          />
          <Divider label="Contact" labelPosition="left" />
          <Group grow>
            <TextInput
              label="Contact Email"
              type="email"
              value={draft.contactEmail}
              onChange={(e) => update('contactEmail', e.currentTarget.value)}
            />
            <TextInput
              label="Contact Phone"
              value={draft.contactPhone}
              onChange={(e) => update('contactPhone', e.currentTarget.value)}
            />
          </Group>
          <Group justify="flex-end" mt="xs">
            {dirty && <Badge color="yellow" variant="light">Unsaved changes</Badge>}
            <Button onClick={save} loading={saving} disabled={!dirty}>Save Practice</Button>
          </Group>
        </Stack>
      </Paper>

      {practices.length > 1 && (
        <Paper withBorder radius="md" p="md">
          <Title order={4} fz="sm" mb="sm">All Practices</Title>
          <Stack gap="xs">
            {practices.map((p) => (
              <Group key={p.id} justify="space-between" wrap="nowrap">
                <Text fz="sm" fw={draft.id === p.id ? 700 : 400}>{p.name}</Text>
                <Group gap="xs">
                  <Badge size="xs" variant="outline">{p.type?.replaceAll('_', ' ')}</Badge>
                  {draft.id !== p.id && (
                    <Button size="xs" variant="subtle" onClick={() => initDraft(p)}>Edit</Button>
                  )}
                </Group>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ── Per-Practice Video / Telehealth Config ── */}
      {videoDraft && (
        <Paper withBorder radius="md" p="md">
          <Stack gap="xs" mb="md">
            <Group gap="xs">
              <IconVideo size={18} />
              <Title order={3} fz="md">Video / Telehealth Configuration</Title>
            </Group>
            <Text fz="sm" c="dimmed">
              Configure your practice&apos;s own Jitsi as a Service (JaaS) credentials so that video
              sessions are billed to your account. If left blank, the platform&apos;s default
              configuration will be used.
            </Text>
          </Stack>
          <Divider mb="md" />
          <Stack gap="sm">
            <Alert color="blue" variant="light" fz="xs">
              Credentials are encrypted at rest and are never returned by the API. The private key
              field is write-only — enter a new value only when you want to replace the stored key.
            </Alert>
            <Group grow>
              <TextInput
                label="JaaS App ID"
                placeholder="vpaas-magic-cookie-…"
                description="Found in your 8x8 JaaS dashboard under API Keys."
                value={videoDraft.jaasAppId}
                onChange={(e) => updateVideo('jaasAppId', e.currentTarget.value)}
              />
              <TextInput
                label="JaaS API Key ID"
                placeholder="vpaas-magic-cookie-…/abcd1234"
                description="The key identifier (Kid) shown in JaaS Credentials."
                value={videoDraft.jaasApiKeyId}
                onChange={(e) => updateVideo('jaasApiKeyId', e.currentTarget.value)}
              />
            </Group>
            <TextInput
              label="JaaS Domain"
              placeholder="8x8.vc"
              description="Use 8x8.vc for JaaS (default). Change only for self-hosted Jitsi."
              value={videoDraft.jaasDomain}
              onChange={(e) => updateVideo('jaasDomain', e.currentTarget.value)}
              style={{ maxWidth: 300 }}
            />
            <Textarea
              label={
                videoDraft.jaasPrivateKeyConfigured
                  ? 'JaaS Private Key — key is configured, enter new PEM to replace'
                  : 'JaaS Private Key (PEM)'
              }
              placeholder={'-----BEGIN RSA PRIVATE KEY-----\n…\n-----END RSA PRIVATE KEY-----'}
              description={
                videoDraft.jaasPrivateKeyConfigured
                  ? 'A private key is already stored. Leave blank to keep the existing key.'
                  : 'Paste the RSA private key PEM downloaded from the JaaS Credentials page.'
              }
              value={videoDraft.jaasPrivateKeyPem}
              onChange={(e) => updateVideo('jaasPrivateKeyPem', e.currentTarget.value)}
              autosize
              minRows={4}
              styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
            />
            <Group justify="flex-end" mt="xs">
              {videoDirty && <Badge color="yellow" variant="light">Unsaved changes</Badge>}
              {videoDraft.jaasPrivateKeyConfigured && !videoDraft.jaasPrivateKeyPem && (
                <Badge color="green" variant="light">Private key configured</Badge>
              )}
              <Button onClick={saveVideoConfig} loading={videoSaving} disabled={!videoDirty}>
                Save Video Config
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
