import { useCallback, useRef, useState } from 'react';
import { Alert, Anchor, Button, CopyButton, Group, Loader, Modal, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { startVideoSession, startAdHocVideoSession, generateClientJoinToken, generateAdHocClientJoinToken } from '../../lib/clientApi.js';
import { useJitsiSession } from './useJitsiSession.js';

/**
 * VideoSessionModal — opens a full-screen-ish Mantine modal embedding JaaS/Jitsi.
 *
 * @param {object} props
 * @param {boolean} props.opened          – modal open state
 * @param {() => void} props.onClose       – close handler
 * @param {string} [props.appointmentId]   – appointment ID (scheduled session)
 * @param {string} [props.clientId]        – client ID (ad-hoc session, used when no appointmentId)
 * @param {string} [props.clientName]      – displayed in the modal title
 */
export function VideoSessionModal({ opened, onClose, appointmentId, clientId, clientName }) {
  const containerRef = useRef(null);
  const [sessionData, setSessionData] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  // Client join link state
  const [joinUrl, setJoinUrl]           = useState(null);
  const [joinUrlLoading, setJoinUrlLoading] = useState(false);
  const [joinUrlError, setJoinUrlError] = useState(null);

  const handleClose = useCallback(() => {
    setSessionData(null);
    setStartError(null);
    setJoinUrl(null);
    setJoinUrlError(null);
    onClose();
  }, [onClose]);

  const { loaded, error: jitsiError, disposeApi } = useJitsiSession({
    jwt: sessionData?.jwt ?? null,
    domain: sessionData?.domain ?? null,
    roomName: sessionData?.roomName ?? null,
    containerNode: containerRef.current,
    onLeft: handleClose,
  });

  // Kick off the session when the modal first opens and we don't have data yet.
  const handleStart = useCallback(async () => {
    if (starting || sessionData) return;
    setStarting(true);
    setStartError(null);
    try {
      const data = appointmentId
        ? await startVideoSession(appointmentId)
        : await startAdHocVideoSession(clientId);
      setSessionData(data);
    } catch (err) {
      setStartError(err.message ?? 'Could not start video session');
    } finally {
      setStarting(false);
    }
  }, [appointmentId, clientId, starting, sessionData]);

  // Generate a client join link (separate from counselor session).
  const handleGetClientLink = useCallback(async () => {
    if (joinUrlLoading || joinUrl) return;
    setJoinUrlLoading(true);
    setJoinUrlError(null);
    try {
      let result;
      if (appointmentId) {
        result = await generateClientJoinToken(appointmentId);
      } else {
        // Ad-hoc: we need the room name from an already-started session, or we
        // start the session first.  If session hasn't started yet, start it now.
        let data = sessionData;
        if (!data) {
          setStarting(true);
          data = await startAdHocVideoSession(clientId);
          setSessionData(data);
          setStarting(false);
        }
        result = await generateAdHocClientJoinToken(clientId, data.roomName);
      }
      setJoinUrl(result.joinUrl);
    } catch (err) {
      setJoinUrlError(err.message ?? 'Could not generate client link');
    } finally {
      setJoinUrlLoading(false);
    }
  }, [appointmentId, clientId, joinUrl, joinUrlLoading, sessionData]);

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={clientName ? `Video Session — ${clientName}` : 'Video Session'}
      size="90vw"
      styles={{ body: { padding: 0 } }}
      withCloseButton
    >
      <Stack gap={0} style={{ height: '80vh' }}>
        {/* Pre-launch state */}
        {!sessionData && !starting && !startError && (
          <Stack align="center" justify="center" style={{ flex: 1 }} gap="md" p="xl">
            <Text>Ready to join the video session with {clientName ?? 'your client'}?</Text>

            {/* Client join link section */}
            <Stack gap="xs" style={{ width: '100%', maxWidth: 480 }}>
              {!joinUrl && (
                <Button
                  variant="light"
                  color="teal"
                  size="sm"
                  loading={joinUrlLoading}
                  onClick={handleGetClientLink}
                >
                  Get Client Join Link
                </Button>
              )}
              {joinUrlError && (
                <Text c="red" fz="sm">{joinUrlError}</Text>
              )}
              {joinUrl && (
                <Stack gap="xs">
                  <Text fz="sm" fw={500}>Share this link with your client:</Text>
                  <Group gap="xs" wrap="nowrap">
                    <TextInput
                      value={joinUrl}
                      readOnly
                      style={{ flex: 1 }}
                      size="xs"
                    />
                    <CopyButton value={joinUrl} timeout={2500}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied!' : 'Copy link'}>
                          <Button size="xs" variant={copied ? 'filled' : 'default'} color={copied ? 'teal' : undefined} onClick={copy}>
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                  <Anchor
                    href={`mailto:?subject=Your%20Video%20Session%20Link&body=Please%20click%20the%20link%20below%20to%20join%20your%20session%3A%0A%0A${encodeURIComponent(joinUrl)}`}
                    target="_blank"
                    fz="sm"
                  >
                    Open in email client
                  </Anchor>
                </Stack>
              )}
            </Stack>

            <Button color="blue" size="md" onClick={handleStart}>
              {appointmentId ? 'Join Video Session' : 'Start Ad-hoc Session'}
            </Button>
          </Stack>
        )}

        {/* Loading JWT from API */}
        {starting && (
          <Stack align="center" justify="center" style={{ flex: 1 }} gap="sm">
            <Loader />
            <Text c="dimmed" fz="sm">Starting session…</Text>
          </Stack>
        )}

        {/* API or JaaS error */}
        {(startError || jitsiError) && (
          <Stack align="center" justify="center" style={{ flex: 1 }} p="xl">
            <Alert color="red" title="Could not start video session" style={{ maxWidth: 400 }}>
              {startError ?? jitsiError}
            </Alert>
            <Button variant="default" onClick={handleClose}>Close</Button>
          </Stack>
        )}

        {/* JaaS embed container — visible once sessionData is ready */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            display: sessionData && !startError && !jitsiError ? 'block' : 'none',
            minHeight: 0,
          }}
        />

        {/* Client link bar — shown during live session */}
        {sessionData && !startError && !jitsiError && (
          <Group
            gap="xs"
            p="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border, #dee2e6)', flexShrink: 0 }}
            wrap="nowrap"
          >
            {!joinUrl ? (
              <Button
                size="xs"
                variant="light"
                color="teal"
                loading={joinUrlLoading}
                onClick={handleGetClientLink}
              >
                Get Client Join Link
              </Button>
            ) : (
              <>
                <TextInput value={joinUrl} readOnly size="xs" style={{ flex: 1 }} />
                <CopyButton value={joinUrl} timeout={2500}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy client link'}>
                      <Button size="xs" variant={copied ? 'filled' : 'default'} color={copied ? 'teal' : undefined} onClick={copy}>
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    </Tooltip>
                  )}
                </CopyButton>
                <Anchor
                  href={`mailto:?subject=Your%20Video%20Session%20Link&body=Please%20click%20the%20link%20below%20to%20join%20your%20session%3A%0A%0A${encodeURIComponent(joinUrl)}`}
                  target="_blank"
                  fz="xs"
                >
                  Email
                </Anchor>
              </>
            )}
            {joinUrlError && <Text c="red" fz="xs">{joinUrlError}</Text>}
          </Group>
        )}

        {/* Waiting for JaaS script to mount */}
        {sessionData && !loaded && !jitsiError && (
          <Stack
            align="center"
            justify="center"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            gap="sm"
          >
            <Loader />
            <Text c="dimmed" fz="sm">Loading video…</Text>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
