import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import {
  Stack, Title, Text, Badge, Paper, Group, Button, Textarea,
  Divider, Loader, Center, Alert, ScrollArea, Box,
} from '@mantine/core';
import { IconMessageCircle, IconCalendarCheck, IconFileUpload, IconSend } from '@tabler/icons-react';
import {
  fetchPortalMessages, sendPortalMessage,
  fetchPortalUploads,
  fetchPortalAppointmentRequests, updatePortalAppointmentRequestRecord,
} from '../../../lib/clientApi.js';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_COLOR = {
  requested: 'blue', approved: 'green',
  scheduled: 'teal', declined: 'red',
};

// ── Message Threads ──────────────────────────────────────────────────────────

function MessageThreads({ clientId }) {
  const [threads, setThreads] = useState(null);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    fetchPortalMessages(clientId)
      .then((data) => setThreads(data.items ?? []))
      .catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async () => {
    if (!replyBody.trim() || !activeThreadId) return;
    setSending(true);
    try {
      await sendPortalMessage({ threadId: activeThreadId, body: replyBody.trim() }, clientId);
      setReplyBody('');
      load();
      notifications.show({ title: 'Sent', message: 'Reply sent to client.', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setSending(false); }
  };

  if (error) return <Alert color="red" title="Error loading messages">{error}</Alert>;
  if (threads === null) return <Center><Loader size="sm" /></Center>;
  if (threads.length === 0) return <Text c="dimmed" fz="sm">No message threads.</Text>;

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <Stack gap="sm">
      {threads.map((thread) => (
        <Paper key={thread.id} withBorder radius="sm" p="sm"
          style={{ cursor: 'pointer', background: activeThreadId === thread.id ? 'var(--mantine-color-blue-0)' : undefined }}
          onClick={() => setActiveThreadId(activeThreadId === thread.id ? null : thread.id)}>
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text fz="sm" fw={600} truncate>{thread.subject}</Text>
              <Text fz="xs" c="dimmed">{thread.messageCount ?? (thread.messages?.length ?? 0)} message(s) · Updated {formatDate(thread.updatedAt ?? thread.lastMessageAt)}</Text>
            </Stack>
            <Badge color={thread.status === 'open' ? 'green' : 'gray'} size="xs">{thread.status}</Badge>
          </Group>

          {activeThreadId === thread.id && activeThread && (
            <Stack gap="xs" mt="sm" onClick={(e) => e.stopPropagation()}>
              <Divider />
              <ScrollArea h={220}>
                <Stack gap="xs">
                  {(activeThread.messages ?? []).length === 0 && (
                    <Text fz="xs" c="dimmed">No messages in this thread yet.</Text>
                  )}
                  {(activeThread.messages ?? []).map((msg) => (
                    <Box key={msg.id} style={{
                      alignSelf: msg.senderRole === 'client' ? 'flex-start' : 'flex-end',
                      maxWidth: '80%',
                    }}>
                      <Paper withBorder radius="sm" p="xs"
                        style={{ background: msg.senderRole === 'client' ? 'var(--mantine-color-gray-0)' : 'var(--mantine-color-blue-1)' }}>
                        <Text fz="xs" c="dimmed" mb={2}>
                          {msg.senderRole === 'client' ? 'Client' : 'Staff'} · {formatDate(msg.sentAt)}
                        </Text>
                        <Text fz="sm">{msg.body ?? msg.content}</Text>
                      </Paper>
                    </Box>
                  ))}
                </Stack>
              </ScrollArea>
              <Group gap="xs" align="flex-end">
                <Textarea
                  placeholder="Reply to client…"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  autosize
                  minRows={2}
                  maxRows={4}
                  style={{ flex: 1 }}
                />
                <Button leftSection={<IconSend size={14} />} loading={sending} onClick={sendReply} disabled={!replyBody.trim()}>
                  Send
                </Button>
              </Group>
            </Stack>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

// ── Appointment Requests ─────────────────────────────────────────────────────

function AppointmentRequests({ clientId }) {
  const [requests, setRequests] = useState(null);
  const [actioning, setActioning] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    fetchPortalAppointmentRequests(clientId)
      .then((data) => setRequests((data.items ?? []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))))
      .catch((err) => setError(err.message));
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const act = async (requestId, status) => {
    setActioning(requestId);
    try {
      await updatePortalAppointmentRequestRecord({ requestId, status }, clientId);
      notifications.show({ title: 'Updated', message: `Request marked as ${status}.`, color: 'green' });
      load();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message, color: 'red' });
    } finally { setActioning(null); }
  };

  if (error) return <Alert color="red" title="Error loading requests">{error}</Alert>;
  if (requests === null) return <Center><Loader size="sm" /></Center>;
  if (requests.length === 0) return <Text c="dimmed" fz="sm">No appointment requests.</Text>;

  return (
    <Stack gap="sm">
      {requests.map((req) => (
        <Paper key={req.id} withBorder radius="sm" p="sm">
          <Group justify="space-between" wrap="nowrap" mb="xs">
            <Stack gap={2}>
              <Text fz="sm" fw={600}>{req.requestedType ?? 'Session'} request</Text>
              <Text fz="xs" c="dimmed">
                Preferred: {formatDate(req.preferredStartAt)} · Mode: {req.mode ?? 'remote'}
              </Text>
              {req.notes && <Text fz="xs" c="dimmed">Note: {req.notes}</Text>}
              <Text fz="xs" c="dimmed">Submitted: {formatDate(req.createdAt)}</Text>
            </Stack>
            <Badge color={STATUS_COLOR[req.status] ?? 'gray'} size="sm">{req.status}</Badge>
          </Group>
          {req.status === 'requested' && (
            <Group gap="xs">
              <Button size="xs" color="green" loading={actioning === req.id} onClick={() => act(req.id, 'approved')}>Approve</Button>
              <Button size="xs" color="red" variant="outline" loading={actioning === req.id} onClick={() => act(req.id, 'declined')}>Decline</Button>
              <Button size="xs" color="teal" variant="outline" loading={actioning === req.id} onClick={() => act(req.id, 'scheduled')}>Mark Scheduled</Button>
            </Group>
          )}
        </Paper>
      ))}
    </Stack>
  );
}

// ── Portal Uploads ───────────────────────────────────────────────────────────

function PortalUploads({ clientId }) {
  const [uploads, setUploads] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPortalUploads(clientId)
      .then((data) => setUploads(data.items ?? []))
      .catch((err) => setError(err.message));
  }, [clientId]);

  if (error) return <Alert color="red" title="Error loading uploads">{error}</Alert>;
  if (uploads === null) return <Center><Loader size="sm" /></Center>;
  if (uploads.length === 0) return <Text c="dimmed" fz="sm">No uploads from client.</Text>;

  return (
    <Stack gap="xs">
      {uploads.map((up) => (
        <Paper key={up.id} withBorder radius="sm" p="sm">
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text fz="sm" fw={600} truncate>{up.fileName}</Text>
              <Text fz="xs" c="dimmed">
                {up.category} · {up.mimeType} · {formatBytes(up.sizeBytes)} · Uploaded {formatDate(up.createdAt)}
              </Text>
              {up.notes && <Text fz="xs" c="dimmed">Notes: {up.notes}</Text>}
            </Stack>
            <Badge color={up.status === 'reviewed' ? 'green' : 'blue'} size="xs">{up.status}</Badge>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}

// ── Main Tab ─────────────────────────────────────────────────────────────────

export default function PortalActivityTab({ clientId }) {
  return (
    <Stack gap="xl" maw={900}>
      <Stack gap="sm">
        <Group gap="xs">
          <IconMessageCircle size={16} />
          <Title order={4} fz="sm" tt="uppercase" c="dimmed">Portal Messages</Title>
        </Group>
        <MessageThreads clientId={clientId} />
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Group gap="xs">
          <IconCalendarCheck size={16} />
          <Title order={4} fz="sm" tt="uppercase" c="dimmed">Scheduling Requests</Title>
        </Group>
        <AppointmentRequests clientId={clientId} />
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Group gap="xs">
          <IconFileUpload size={16} />
          <Title order={4} fz="sm" tt="uppercase" c="dimmed">Client Uploads</Title>
        </Group>
        <PortalUploads clientId={clientId} />
      </Stack>
    </Stack>
  );
}
