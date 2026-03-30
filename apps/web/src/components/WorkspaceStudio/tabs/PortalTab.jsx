import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Select, Accordion, Badge, Group, Text, Button, Paper, Title,
  Divider, Loader, Alert, TextInput, ActionIcon, Tooltip, SimpleGrid,
  ThemeIcon, Box, Textarea, Switch, MultiSelect,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { csrfHeaders } from '../../../lib/csrf.js';

// ── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const b = await res.json(); msg = b.error || b.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function accountStatusColor(status) {
  return { active: 'green', invited: 'yellow', locked: 'red', revoked: 'red' }[status] ?? 'gray';
}

function apptRequestStatusColor(status) {
  return { requested: 'blue', approved: 'green', declined: 'red', scheduled: 'teal' }[status] ?? 'gray';
}

function resourceTypeColor(type) {
  return { devotional: 'violet', education: 'blue', document: 'gray', form: 'orange' }[type] ?? 'gray';
}

function dataRightStatusColor(status) {
  return { requested: 'blue', under_review: 'blue', completed: 'green', restricted: 'orange', denied: 'red' }[status] ?? 'gray';
}

// ── sub-components ────────────────────────────────────────────────────────────

function AccountSection({ account, clientId, onRefresh }) {
  const [email, setEmail]   = useState(account?.email ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEmail(account?.email ?? ''); }, [account]);

  const createAccount = async () => {
    setSaving(true);
    try {
      const data = await apiFetch('/api/v1/portal/accounts', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ clientId, email: email.trim(), status: 'invited' }),
      });
      notifications.show({
        title: 'Invited',
        message: data?.temporaryPassword
          ? `Portal account created. Temporary password: ${data.temporaryPassword}`
          : 'Portal account created and invitation queued.',
        color: 'green',
        autoClose: false,
      });
      onRefresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  const setStatus = async (status) => {
    setSaving(true);
    try {
      await apiFetch('/api/v1/portal/accounts', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify({ clientId, accountId: account.id, status }),
      });
      notifications.show({ title: 'Updated', message: `Portal account ${status}.`, color: 'green' });
      onRefresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  if (!account) {
    return (
      <Stack gap="sm">
        <Alert color="blue" variant="light" title="No Portal Account">
          This client does not have a portal account yet. Enter their email and send an invitation.
        </Alert>
        <Group align="flex-end" gap="sm" maw={480}>
          <TextInput
            label="Client Email"
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button loading={saving} onClick={createAccount} disabled={!email.trim()}>
            Send Invite
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Box>
          <Text fz="xs" c="dimmed" tt="uppercase" fw={600}>Status</Text>
          <Badge color={accountStatusColor(account.status)} variant="filled" mt={4}>
            {account.status}
          </Badge>
        </Box>
        <Box>
          <Text fz="xs" c="dimmed" tt="uppercase" fw={600}>Email</Text>
          <Text fz="sm" mt={4}>{account.email || '—'}</Text>
        </Box>
        <Box>
          <Text fz="xs" c="dimmed" tt="uppercase" fw={600}>Last Login</Text>
          <Text fz="sm" mt={4}>{fmtDate(account.lastLoginAt)}</Text>
        </Box>
        <Box>
          <Text fz="xs" c="dimmed" tt="uppercase" fw={600}>Invited</Text>
          <Text fz="sm" mt={4}>{fmtDate(account.invitedAt)}</Text>
        </Box>
      </SimpleGrid>

      <Group gap="xs" mt="xs">
        {account.status === 'invited' && (
          <Button size="xs" loading={saving} onClick={() => setStatus('active')}>
            Activate
          </Button>
        )}
        {account.status !== 'locked' && account.status !== 'revoked' && (
          <Button size="xs" color="red" variant="light" loading={saving} onClick={() => setStatus('locked')}>
            Lock Access
          </Button>
        )}
        {(account.status === 'locked' || account.status === 'revoked') && (
          <Button size="xs" color="green" variant="light" loading={saving} onClick={() => setStatus('active')}>
            Restore Access
          </Button>
        )}
        <Button size="xs" variant="default" loading={saving} onClick={() => setStatus('invited')}>
          Re-send Invite
        </Button>
      </Group>
    </Stack>
  );
}

function IntakeSection({ forms }) {
  if (!forms?.length) {
    return <Text c="dimmed" fz="sm">No intake packets on file.</Text>;
  }
  return (
    <Stack gap="xs">
      {forms.map((form) => (
        <Paper key={form.id} withBorder radius="sm" p="sm">
          <Group justify="space-between">
            <Box>
              <Text fz="sm" fw={500}>{form.title ?? form.type ?? 'Intake Packet'}</Text>
              <Text fz="xs" c="dimmed">Sent {fmtDate(form.sentAt ?? form.createdAt)}</Text>
            </Box>
            <Badge
              color={form.status === 'completed' ? 'green' : form.status === 'submitted' ? 'teal' : 'yellow'}
              variant="light"
            >
              {form.status ?? 'pending'}
            </Badge>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

function DocumentsSection({ documents }) {
  if (!documents?.length) {
    return <Text c="dimmed" fz="sm">No documents assigned.</Text>;
  }
  return (
    <Stack gap="xs">
      {documents.map((doc) => (
        <Paper key={doc.id} withBorder radius="sm" p="sm">
          <Group justify="space-between">
            <Box>
              <Text fz="sm" fw={500}>{doc.templateTitle ?? 'Document'}</Text>
              <Text fz="xs" c="dimmed">Assigned {fmtDate(doc.assignedAt ?? doc.createdAt)}</Text>
            </Box>
            <Badge
              color={doc.status === 'completed' ? 'green' : doc.status === 'signed' ? 'teal' : 'yellow'}
              variant="light"
            >
              {doc.status ?? 'pending'}
            </Badge>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

function ResourcesSection({ resources, clientId, onRefresh }) {
  const [title, setTitle]     = useState('');
  const [type, setType]       = useState('education');
  const [content, setContent] = useState('');
  const [saving, setSaving]   = useState(false);
  const [adding, setAdding]   = useState(false);

  const publish = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/v1/portal/resources', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ clientId, title: title.trim(), resourceType: type, content: content.trim() }),
      });
      notifications.show({ title: 'Published', message: 'Resource published to client portal.', color: 'green' });
      setTitle(''); setContent(''); setAdding(false);
      onRefresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSaving(false); }
  };

  return (
    <Stack gap="sm">
      {!resources?.length && !adding && (
        <Text c="dimmed" fz="sm">No resources published yet.</Text>
      )}

      {resources?.map((res) => (
        <Paper key={res.id} withBorder radius="sm" p="sm">
          <Group justify="space-between" mb={4}>
            <Text fz="sm" fw={500}>{res.title}</Text>
            <Badge color={resourceTypeColor(res.resourceType)} variant="light" size="xs">
              {res.resourceType}
            </Badge>
          </Group>
          {res.content && <Text fz="xs" c="dimmed" lineClamp={2}>{res.content}</Text>}
          <Text fz="xs" c="dimmed" mt={4}>Published {fmtDate(res.publishedAt)}</Text>
        </Paper>
      ))}

      {adding ? (
        <Paper withBorder radius="sm" p="sm">
          <Stack gap="xs">
            <Group gap="sm">
              <TextInput
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ flex: 1 }}
                size="xs"
              />
              <Select
                label="Type"
                size="xs"
                data={['education', 'devotional', 'document', 'form']}
                value={type}
                onChange={(v) => setType(v ?? 'education')}
                w={130}
              />
            </Group>
            <TextInput
              label="Content / Description"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              size="xs"
            />
            <Group gap="xs">
              <Button size="xs" loading={saving} onClick={publish} disabled={!title.trim()}>Publish</Button>
              <Button size="xs" variant="default" onClick={() => setAdding(false)}>Cancel</Button>
            </Group>
          </Stack>
        </Paper>
      ) : (
        <Button variant="outline" size="xs" onClick={() => setAdding(true)}>+ Publish Resource</Button>
      )}
    </Stack>
  );
}

function PortalSettingsSection({
  settingsDraft,
  onSettingsChange,
  onSave,
  saving,
  loading,
  catalogOptions,
}) {
  if (loading) {
    return (
      <Paper withBorder radius="md" p="md">
        <Group justify="center" py="md"><Loader size="sm" /></Group>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Box>
            <Title order={3} fz="md">Portal Branding & Access</Title>
            <Text fz="sm" c="dimmed">
              Control what aspiring and active clients see on the public portal before deeper client self-service ships.
            </Text>
          </Box>
          <Button size="xs" onClick={onSave} loading={saving}>Save Portal Settings</Button>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <TextInput
            label="Practice Name"
            value={settingsDraft.practiceName ?? ''}
            onChange={(event) => onSettingsChange('practiceName', event.currentTarget.value)}
          />
          <TextInput
            label="Support Email"
            type="email"
            value={settingsDraft.supportEmail ?? ''}
            onChange={(event) => onSettingsChange('supportEmail', event.currentTarget.value)}
          />
          <TextInput
            label="Logo URL"
            placeholder="https://example.com/logo.png"
            value={settingsDraft.logoUrl ?? ''}
            onChange={(event) => onSettingsChange('logoUrl', event.currentTarget.value)}
          />
          <Select
            label="Registration Policy"
            data={[
              { value: 'invite_only', label: 'Invite only' },
              { value: 'review_required', label: 'Self-register with review' },
              { value: 'instant_activation', label: 'Immediate activation' },
            ]}
            value={settingsDraft.registrationMode ?? 'review_required'}
            onChange={(value) => onSettingsChange('registrationMode', value ?? 'review_required')}
          />
          <TextInput
            label="Brand Color"
            placeholder="#1f7a8c"
            value={settingsDraft.brandColor ?? ''}
            onChange={(event) => onSettingsChange('brandColor', event.currentTarget.value)}
          />
          <TextInput
            label="Accent Color"
            placeholder="#f0f7f8"
            value={settingsDraft.accentColor ?? ''}
            onChange={(event) => onSettingsChange('accentColor', event.currentTarget.value)}
          />
        </SimpleGrid>

        <TextInput
          label="Portal Headline"
          value={settingsDraft.welcomeHeadline ?? ''}
          onChange={(event) => onSettingsChange('welcomeHeadline', event.currentTarget.value)}
        />
        <Textarea
          label="Welcome Message"
          minRows={3}
          value={settingsDraft.welcomeMessage ?? ''}
          onChange={(event) => onSettingsChange('welcomeMessage', event.currentTarget.value)}
        />
        <Textarea
          label="Help Message"
          minRows={2}
          value={settingsDraft.helpMessage ?? ''}
          onChange={(event) => onSettingsChange('helpMessage', event.currentTarget.value)}
        />

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <MultiSelect
            label="Client-Managed Contact Preferences"
            data={[
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
              { value: 'phone', label: 'Phone' },
              { value: 'portal_message', label: 'Portal message' },
            ]}
            value={settingsDraft.contactPreferenceOptions ?? []}
            onChange={(value) => onSettingsChange('contactPreferenceOptions', value)}
          />
          <MultiSelect
            label="Default Signup Forms"
            data={catalogOptions}
            searchable
            value={settingsDraft.defaultSignupFormKeys ?? []}
            onChange={(value) => onSettingsChange('defaultSignupFormKeys', value)}
          />
        </SimpleGrid>

        <Group gap="lg" wrap="wrap">
          <Switch
            label="Show Create Account"
            checked={Boolean(settingsDraft.allowCreateAccount)}
            onChange={(event) => onSettingsChange('allowCreateAccount', event.currentTarget.checked)}
          />
          <Switch
            label="Allow Care Requests"
            checked={Boolean(settingsDraft.allowCareRequests)}
            onChange={(event) => onSettingsChange('allowCareRequests', event.currentTarget.checked)}
          />
          <Switch
            label="Allow Scheduling Requests"
            checked={Boolean(settingsDraft.allowSchedulingRequests)}
            onChange={(event) => onSettingsChange('allowSchedulingRequests', event.currentTarget.checked)}
          />
          <Switch
            label="Show Public Counselor Directory"
            checked={Boolean(settingsDraft.showPublicCounselorDirectory)}
            onChange={(event) => onSettingsChange('showPublicCounselorDirectory', event.currentTarget.checked)}
          />
        </Group>
      </Stack>
    </Paper>
  );
}

function MessagesSection({ messageThreads, clientId }) {
  if (!messageThreads?.length) {
    return <Text c="dimmed" fz="sm">No message threads.</Text>;
  }
  return (
    <Stack gap="xs">
      {messageThreads.map((thread) => (
        <Paper key={thread.id} withBorder radius="sm" p="sm">
          <Group justify="space-between">
            <Box>
              <Text fz="sm" fw={500}>{thread.subject || 'Untitled Thread'}</Text>
              <Text fz="xs" c="dimmed">
                {thread.messageCount ?? 0} message{thread.messageCount !== 1 ? 's' : ''} · Last {fmtDateTime(thread.updatedAt)}
              </Text>
            </Box>
            <Group gap="xs">
              {thread.unreadForClient > 0 && (
                <Badge color="red" size="xs" variant="filled">{thread.unreadForClient} new</Badge>
              )}
              <Badge color={thread.status === 'open' ? 'blue' : 'gray'} variant="light" size="xs">
                {thread.status}
              </Badge>
            </Group>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

function AppointmentRequestsSection({ appointmentRequests, onRefresh, selectedClientId, onSchedulePortalRequest }) {
  const [updating, setUpdating] = useState(null);

  const updateStatus = async (reqId, status) => {
    setUpdating(reqId);
    try {
      await apiFetch('/api/v1/portal/appointment-requests', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify({ requestId: reqId, status }),
      });
      notifications.show({ title: 'Updated', message: `Request ${status}.`, color: 'green' });
      onRefresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setUpdating(null); }
  };

  if (!appointmentRequests?.length) {
    return <Text c="dimmed" fz="sm">No appointment requests.</Text>;
  }

  return (
    <Stack gap="xs">
      {appointmentRequests.map((req) => (
        <Paper key={req.id} withBorder radius="sm" p="sm">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Group gap="xs" mb={2}>
                <Badge color={apptRequestStatusColor(req.status)} variant="light" size="xs">
                  {req.status}
                </Badge>
                <Badge color={req.mode === 'remote' ? 'blue' : 'teal'} variant="outline" size="xs">
                  {req.mode ?? 'in-person'}
                </Badge>
              </Group>
              <Text fz="sm">
                Preferred: {fmtDateTime(req.preferredStartAt)}
              </Text>
              {req.notes && (
                <Text fz="xs" c="dimmed" mt={2}>"{req.notes}"</Text>
              )}
              <Text fz="xs" c="dimmed">Submitted {fmtDateTime(req.createdAt)}</Text>
            </Box>
            {req.status === 'requested' && (
              <Group gap="xs">
                <Button
                  size="xs"
                  color="green"
                  variant="light"
                  loading={updating === req.id}
                  onClick={() => updateStatus(req.id, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  loading={updating === req.id}
                  onClick={() => updateStatus(req.id, 'declined')}
                >
                  Decline
                </Button>
                <Button
                  size="xs"
                  variant="default"
                  loading={updating === req.id}
                  onClick={() => onSchedulePortalRequest?.(selectedClientId, req)}
                >
                  Schedule
                </Button>
              </Group>
            )}
            {req.status === 'approved' && (
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="default"
                  loading={updating === req.id}
                  onClick={() => onSchedulePortalRequest?.(selectedClientId, req)}
                >
                  Schedule
                </Button>
              </Group>
            )}
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

function BalanceSection({ balances }) {
  if (!balances) return <Text c="dimmed" fz="sm">No billing data.</Text>;
  return (
    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
      {[
        { label: 'Total Billed', value: `$${(balances.total ?? 0).toFixed(2)}`, color: 'gray' },
        { label: 'Amount Paid', value: `$${(balances.paid ?? 0).toFixed(2)}`, color: 'green' },
        { label: 'Outstanding', value: `$${(balances.outstanding ?? 0).toFixed(2)}`, color: balances.outstanding > 0 ? 'red' : 'gray' },
      ].map(({ label, value, color }) => (
        <Paper key={label} withBorder radius="sm" p="sm" ta="center">
          <Text fz="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
          <Text fz="xl" fw={700} c={color} mt={4}>{value}</Text>
        </Paper>
      ))}
    </SimpleGrid>
  );
}

function PublicRequestsSection({ items, loading, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);

  const setStatus = async (requestId, status) => {
    setUpdatingId(requestId);
    try {
      const response = await apiFetch('/api/v1/portal/public-requests', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify({ requestId, status }),
      });
      const activation = response?.activation ?? null;
      const activationMessage = activation?.status === 'activated'
        ? ` Portal access activated. Temporary password: ${activation.temporaryPassword}`
        : activation?.status === 'existing_account'
          ? ' A portal account already existed for this request.'
          : '';
      notifications.show({
        title: 'Updated',
        message: `Request marked ${status}.${activationMessage}`,
        color: status === 'declined' ? 'red' : 'green',
      });
      onRefresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <Paper withBorder radius="md" p="md">
        <Group justify="center" py="md"><Loader size="sm" /></Group>
      </Paper>
    );
  }

  if (!items.length) {
    return (
      <Paper withBorder radius="md" p="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Box>
              <Title order={3} fz="md">Public Requests</Title>
              <Text fz="sm" c="dimmed">
                Review create-account, care, and scheduling requests coming from the public portal.
              </Text>
            </Box>
            <Button size="xs" variant="default" onClick={onRefresh}>Refresh Queue</Button>
          </Group>
          <Text c="dimmed" fz="sm">No public portal requests yet.</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Box>
            <Title order={3} fz="md">Public Requests</Title>
            <Text fz="sm" c="dimmed">
              Review create-account, care, and scheduling requests coming from the public portal.
            </Text>
          </Box>
          <Button size="xs" variant="default" onClick={onRefresh}>Refresh Queue</Button>
        </Group>

        {items.map((item) => (
          <Paper key={item.id} withBorder radius="sm" p="sm">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Box maw={520}>
                <Group gap="xs" mb={4} wrap="wrap">
                  <Badge variant="light" color={item.status === 'requested' ? 'orange' : item.status === 'approved' ? 'green' : item.status === 'declined' ? 'red' : 'blue'}>
                    {item.status}
                  </Badge>
                  <Badge variant="outline" color="gray">
                    {item.requestType?.replaceAll('_', ' ') ?? 'request'}
                  </Badge>
                </Group>
                <Text fz="sm" fw={600}>{item.firstName} {item.lastName}</Text>
                <Text fz="xs" c="dimmed">{item.email}{item.phone ? ` • ${item.phone}` : ''}</Text>
                {(item.preferredContactMethod || item.preferredContactWindow) && (
                  <Text fz="xs" c="dimmed" mt={4}>
                    Preferred contact: {item.preferredContactMethod || 'unspecified'}
                    {item.preferredContactWindow ? ` • ${item.preferredContactWindow}` : ''}
                  </Text>
                )}
                {item.requestedServices?.length > 0 && (
                  <Group gap={6} mt={6} wrap="wrap">
                    {item.requestedServices.map((service) => (
                      <Badge key={service} size="xs" variant="dot" color="teal">
                        {service.replaceAll('_', ' ')}
                      </Badge>
                    ))}
                  </Group>
                )}
                {item.onboardingDetails && Object.keys(item.onboardingDetails).length > 0 ? (
                  <Text fz="xs" c="dimmed" mt={6}>
                    Onboarding: {[
                      item.onboardingDetails.preferredName ? `preferred name ${item.onboardingDetails.preferredName}` : null,
                      item.onboardingDetails.pronouns ? `pronouns ${item.onboardingDetails.pronouns}` : null,
                      item.onboardingDetails.educationLevel ? `education ${String(item.onboardingDetails.educationLevel).replaceAll('_', ' ')}` : null,
                      item.onboardingDetails.faithPreference ? `faith ${item.onboardingDetails.faithPreference}` : null,
                      item.onboardingDetails.referralSource ? `referral ${item.onboardingDetails.referralSource}` : null,
                    ].filter(Boolean).join(' • ')}
                  </Text>
                ) : null}
                {item.notes && (
                  <Text fz="xs" c="dimmed" mt={6}>
                    {item.notes}
                  </Text>
                )}
                <Text fz="xs" c="dimmed" mt={6}>Submitted {fmtDateTime(item.createdAt)}</Text>
              </Box>

              <Group gap="xs" wrap="wrap">
                {item.status === 'requested' && (
                  <Button
                    size="xs"
                    variant="default"
                    loading={updatingId === item.id}
                    onClick={() => setStatus(item.id, 'reviewing')}
                  >
                    Start Review
                  </Button>
                )}
                {item.status !== 'approved' && (
                  <Button
                    size="xs"
                    color="green"
                    variant="light"
                    loading={updatingId === item.id}
                    onClick={() => setStatus(item.id, 'approved')}
                  >
                    Approve
                  </Button>
                )}
                {item.status !== 'declined' && (
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    loading={updatingId === item.id}
                    onClick={() => setStatus(item.id, 'declined')}
                  >
                    Decline
                  </Button>
                )}
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}

function DataRightsRequestsSection({ items, loading, onRefresh }) {
  const [updatingId, setUpdatingId] = useState(null);

  const runAction = async (requestId, status, reasonCode) => {
    setUpdatingId(requestId);
    try {
      await apiFetch('/api/v1/portal/data-rights/review', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify({ requestId, status, reasonCode }),
      });
      notifications.show({
        title: 'Updated',
        message: `Deletion request marked ${status.replaceAll('_', ' ')}.`,
        color: status === 'completed' ? 'green' : status === 'restricted' ? 'yellow' : 'red',
      });
      onRefresh();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <Paper withBorder radius="md" p="md">
        <Group justify="center" py="md"><Loader size="sm" /></Group>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Box>
            <Title order={3} fz="md">Data Rights Requests</Title>
            <Text fz="sm" c="dimmed">
              Review portal deletion requests and complete policy-aware portal erasure when appropriate.
            </Text>
          </Box>
          <Button size="xs" variant="default" onClick={onRefresh}>Refresh Queue</Button>
        </Group>

        {!items.length ? (
          <Text c="dimmed" fz="sm">No data-right review items are waiting.</Text>
        ) : items.map((item) => {
          const resolved = ['completed', 'restricted', 'denied'].includes(item.status);
          return (
            <Paper key={item.id} withBorder radius="sm" p="sm">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Box maw={540}>
                  <Group gap="xs" mb={4} wrap="wrap">
                    <Badge variant="light" color={dataRightStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                    <Badge variant="outline" color="gray">
                      {(item.requestType || 'delete_request').replaceAll('_', ' ')}
                    </Badge>
                  </Group>
                  <Text fz="sm" fw={600}>{item.clientId}</Text>
                  <Text fz="xs" c="dimmed">
                    Requested {fmtDateTime(item.requestedAt)}
                    {item.resolvedAt ? ` • resolved ${fmtDateTime(item.resolvedAt)}` : ''}
                  </Text>
                  {item.reasonCode ? (
                    <Text fz="xs" c="dimmed" mt={4}>
                      Reason: {item.reasonCode.replaceAll('_', ' ')}
                    </Text>
                  ) : null}
                  {item.notes ? (
                    <Text fz="xs" c="dimmed" mt={6}>
                      {item.notes}
                    </Text>
                  ) : null}
                </Box>

                {!resolved ? (
                  <Group gap="xs" wrap="wrap">
                    <Button
                      size="xs"
                      color="green"
                      variant="light"
                      loading={updatingId === item.id}
                      onClick={() => runAction(item.id, 'completed', 'portal_erasure_completed')}
                    >
                      Fulfill
                    </Button>
                    <Button
                      size="xs"
                      color="yellow"
                      variant="light"
                      loading={updatingId === item.id}
                      onClick={() => runAction(item.id, 'restricted', 'retention_obligation_remaining')}
                    >
                      Restrict
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      loading={updatingId === item.id}
                      onClick={() => runAction(item.id, 'denied', 'request_denied')}
                    >
                      Deny
                    </Button>
                  </Group>
                ) : null}
              </Group>
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
}

// ── accordion item label helper ───────────────────────────────────────────────

function AccordionLabel({ title, count, countColor }) {
  return (
    <Group gap="sm">
      <Text fz="sm" fw={600}>{title}</Text>
      {count != null && (
        <Badge size="xs" color={count > 0 ? (countColor ?? 'blue') : 'gray'} variant="light">
          {count}
        </Badge>
      )}
    </Group>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function PortalTab({ onSchedulePortalRequest }) {
  const [clients,        setClients]        = useState([]);
  const [clientId,       setClientId]       = useState(null);
  const [overview,       setOverview]       = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError,  setOverviewError]  = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [publicRequestsLoading, setPublicRequestsLoading] = useState(true);
  const [publicRequests, setPublicRequests] = useState([]);
  const [dataRightsLoading, setDataRightsLoading] = useState(true);
  const [dataRightsRequests, setDataRightsRequests] = useState([]);
  const [settingsDraft, setSettingsDraft] = useState({
    practiceName: 'FaithCounseling',
    logoUrl: '',
    brandColor: '#1f7a8c',
    accentColor: '#f0f7f8',
    welcomeHeadline: 'FaithCounseling Client Portal',
    welcomeMessage: '',
    helpMessage: '',
    supportEmail: '',
    registrationMode: 'review_required',
    allowCreateAccount: true,
    allowCareRequests: true,
    allowSchedulingRequests: true,
    showPublicCounselorDirectory: false,
    financialMode: 'offerings',
    suggestedOfferingCents: 12000,
    offeringMinistryNote: 'Your gift helps sustain this counseling ministry and expand care for others.',
    contactPreferenceOptions: ['email', 'sms', 'phone', 'portal_message'],
    defaultSignupFormKeys: [],
  });
  const [catalogOptions, setCatalogOptions] = useState([]);

  // Load client list for the picker
  useEffect(() => {
    apiFetch('/api/v1/clients?limit=200')
      .then((data) => {
        const items = data?.items ?? [];
        setClients(items.map((c) => ({
          value: c.id,
          label: `${c.firstName} ${c.lastName}`,
        })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/v1/portal/settings'),
      apiFetch('/api/v1/forms/catalog'),
      apiFetch('/api/v1/portal/public-requests'),
      apiFetch('/api/v1/portal/data-rights/review'),
    ])
      .then(([settingsData, formData, publicRequestData, dataRightsData]) => {
        const item = settingsData?.item ?? {};
        setSettingsDraft((current) => ({ ...current, ...item }));
        const options = (formData?.items ?? []).map((entry) => ({
          value: entry.formKey,
          label: entry.title ?? entry.formKey,
        }));
        setCatalogOptions(options);
        setPublicRequests(publicRequestData?.items ?? []);
        setDataRightsRequests((dataRightsData?.items ?? []).filter((entry) => entry.requestType === 'delete_request'));
      })
      .catch((err) => {
        notifications.show({ title: 'Portal settings unavailable', message: err.message, color: 'red' });
      })
      .finally(() => {
        setSettingsLoading(false);
        setPublicRequestsLoading(false);
        setDataRightsLoading(false);
      });
  }, []);

  const loadPublicRequests = useCallback(() => {
    setPublicRequestsLoading(true);
    apiFetch('/api/v1/portal/public-requests')
      .then((data) => setPublicRequests(data?.items ?? []))
      .catch((err) => {
        notifications.show({ title: 'Portal requests unavailable', message: err.message, color: 'red' });
      })
      .finally(() => setPublicRequestsLoading(false));
  }, []);

  const loadDataRightsRequests = useCallback(() => {
    setDataRightsLoading(true);
    apiFetch('/api/v1/portal/data-rights/review')
      .then((data) => setDataRightsRequests((data?.items ?? []).filter((entry) => entry.requestType === 'delete_request')))
      .catch((err) => {
        notifications.show({ title: 'Data-right queue unavailable', message: err.message, color: 'red' });
      })
      .finally(() => setDataRightsLoading(false));
  }, []);

  const loadOverview = useCallback((cid) => {
    if (!cid) { setOverview(null); return; }
    setOverviewLoading(true);
    setOverviewError(null);
    apiFetch(`/api/v1/portal/overview?clientId=${encodeURIComponent(cid)}`)
      .then((data) => setOverview(data))
      .catch((err) => setOverviewError(err.message))
      .finally(() => setOverviewLoading(false));
  }, []);

  const handleClientChange = (val) => {
    setClientId(val);
    loadOverview(val);
  };

  const handleSettingsChange = (field, value) => {
    setSettingsDraft((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const data = await apiFetch('/api/v1/portal/settings', {
        method: 'PATCH',
        headers: csrfHeaders(),
        body: JSON.stringify(settingsDraft),
      });
      setSettingsDraft((current) => ({ ...current, ...(data?.item ?? {}) }));
      notifications.show({ title: 'Saved', message: 'Portal settings updated.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const pendingApptRequests = (overview?.appointmentRequests ?? []).filter((r) => r.status === 'requested').length;
  const openThreads = (overview?.messageThreads ?? []).filter((t) => t.status === 'open').length;

  return (
    <Stack gap="lg" maw={900}>
      <Alert color="teal" title="Client Portal Access" variant="light">
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Text fz="sm">
            Public client portal entry is available at <strong>/portal</strong>. New request submissions are captured by the system,
            and standard onboarding forms are auto-assigned when a portal account is created.
          </Text>
          <Button component="a" href="/portal" target="_blank" rel="noreferrer" size="xs" variant="outline">
            Open Portal Page
          </Button>
        </Group>
      </Alert>

      <PortalSettingsSection
        settingsDraft={settingsDraft}
        onSettingsChange={handleSettingsChange}
        onSave={saveSettings}
        saving={settingsSaving}
        loading={settingsLoading}
        catalogOptions={catalogOptions}
      />

      <PublicRequestsSection
        items={publicRequests}
        loading={publicRequestsLoading}
        onRefresh={loadPublicRequests}
      />

      <DataRightsRequestsSection
        items={dataRightsRequests}
        loading={dataRightsLoading}
        onRefresh={loadDataRightsRequests}
      />

      {/* Client picker */}
      <Select
        label="Select Client"
        placeholder="Search by name…"
        data={clients}
        value={clientId}
        onChange={handleClientChange}
        searchable
        clearable
        maw={420}
      />

      {!clientId && (
        <Text c="dimmed" fz="sm">Select a client above to manage their portal.</Text>
      )}

      {clientId && overviewLoading && (
        <Group justify="center" py="xl"><Loader size="sm" /></Group>
      )}

      {clientId && overviewError && (
        <Alert color="red" title="Failed to load portal overview">{overviewError}</Alert>
      )}

      {clientId && overview && !overviewLoading && (
        <>
          {/* Client identity strip */}
          <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-default-hover)">
            <Group gap="sm">
              <Text fz="sm" fw={600}>
                {overview.client?.firstName} {overview.client?.lastName}
              </Text>
              <Badge
                color={accountStatusColor(overview.account?.status ?? 'none')}
                variant={overview.account ? 'filled' : 'outline'}
                size="sm"
              >
                {overview.account ? `Portal: ${overview.account.status}` : 'No Portal Account'}
              </Badge>
              {pendingApptRequests > 0 && (
                <Badge color="orange" variant="light" size="sm">
                  {pendingApptRequests} pending request{pendingApptRequests !== 1 ? 's' : ''}
                </Badge>
              )}
              {openThreads > 0 && (
                <Badge color="blue" variant="light" size="sm">
                  {openThreads} open thread{openThreads !== 1 ? 's' : ''}
                </Badge>
              )}
            </Group>
          </Paper>

          {/* Expandable sections */}
          <Accordion multiple variant="separated" radius="md">

            <Accordion.Item value="account">
              <Accordion.Control>
                <AccordionLabel
                  title="Portal Account"
                  count={overview.account ? 1 : 0}
                  countColor={accountStatusColor(overview.account?.status ?? 'none')}
                />
              </Accordion.Control>
              <Accordion.Panel>
                <AccountSection
                  account={overview.account}
                  clientId={clientId}
                  onRefresh={() => loadOverview(clientId)}
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="appointment-requests">
              <Accordion.Control>
                <AccordionLabel
                  title="Appointment Requests"
                  count={overview.appointmentRequests?.length ?? 0}
                  countColor={pendingApptRequests > 0 ? 'orange' : 'gray'}
                />
              </Accordion.Control>
              <Accordion.Panel>
                <AppointmentRequestsSection
                  appointmentRequests={overview.appointmentRequests}
                  onRefresh={() => loadOverview(clientId)}
                  selectedClientId={clientId}
                  onSchedulePortalRequest={onSchedulePortalRequest}
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="messages">
              <Accordion.Control>
                <AccordionLabel
                  title="Secure Messages"
                  count={overview.messageThreads?.length ?? 0}
                  countColor="blue"
                />
              </Accordion.Control>
              <Accordion.Panel>
                <MessagesSection
                  messageThreads={overview.messageThreads}
                  clientId={clientId}
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="resources">
              <Accordion.Control>
                <AccordionLabel
                  title="Resources & Content"
                  count={overview.resources?.length ?? 0}
                  countColor="violet"
                />
              </Accordion.Control>
              <Accordion.Panel>
                <ResourcesSection
                  resources={overview.resources}
                  clientId={clientId}
                  onRefresh={() => loadOverview(clientId)}
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="intake">
              <Accordion.Control>
                <AccordionLabel
                  title="Intake Packets"
                  count={overview.forms?.length ?? 0}
                  countColor="teal"
                />
              </Accordion.Control>
              <Accordion.Panel>
                <IntakeSection forms={overview.forms} />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="documents">
              <Accordion.Control>
                <AccordionLabel
                  title="Assigned Documents"
                  count={overview.documents?.length ?? 0}
                  countColor="gray"
                />
              </Accordion.Control>
              <Accordion.Panel>
                <DocumentsSection documents={overview.documents} />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="balance">
              <Accordion.Control>
                <AccordionLabel
                  title="Billing Balance"
                  count={overview.balances?.outstanding > 0 ? null : undefined}
                />
              </Accordion.Control>
              <Accordion.Panel>
                <BalanceSection balances={overview.balances} />
              </Accordion.Panel>
            </Accordion.Item>

          </Accordion>
        </>
      )}
    </Stack>
  );
}
