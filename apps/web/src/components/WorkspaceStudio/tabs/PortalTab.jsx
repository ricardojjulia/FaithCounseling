import { useState, useEffect, useCallback } from 'react';
import {
  Stack, Select, Accordion, Badge, Group, Text, Button, Paper, Title,
  Divider, Loader, Alert, TextInput, ActionIcon, Tooltip, SimpleGrid,
  ThemeIcon, Box,
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
  return { active: 'green', invited: 'yellow', locked: 'red' }[status] ?? 'gray';
}

function apptRequestStatusColor(status) {
  return { requested: 'blue', approved: 'green', declined: 'red', scheduled: 'teal' }[status] ?? 'gray';
}

function resourceTypeColor(type) {
  return { devotional: 'violet', education: 'blue', document: 'gray', form: 'orange' }[type] ?? 'gray';
}

// ── sub-components ────────────────────────────────────────────────────────────

function AccountSection({ account, clientId, onRefresh }) {
  const [email, setEmail]   = useState(account?.email ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setEmail(account?.email ?? ''); }, [account]);

  const createAccount = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/v1/portal/accounts', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ clientId, email: email.trim(), status: 'invited' }),
      });
      notifications.show({ title: 'Invited', message: 'Portal account created and invitation queued.', color: 'green' });
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
        {account.status !== 'locked' && (
          <Button size="xs" color="red" variant="light" loading={saving} onClick={() => setStatus('locked')}>
            Lock Access
          </Button>
        )}
        {account.status === 'locked' && (
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

  const pendingApptRequests = (overview?.appointmentRequests ?? []).filter((r) => r.status === 'requested').length;
  const openThreads = (overview?.messageThreads ?? []).filter((t) => t.status === 'open').length;

  return (
    <Stack gap="lg" maw={900}>
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
