import { useCallback, useRef, useState } from 'react';
import { Alert, Button, Loader, Modal, Stack, Text } from '@mantine/core';
import { startVideoSession } from '../../lib/clientApi.js';
import { useJitsiSession } from './useJitsiSession.js';

/**
 * VideoSessionModal — opens a full-screen-ish Mantine modal embedding JaaS/Jitsi.
 *
 * @param {object} props
 * @param {boolean} props.opened          – modal open state
 * @param {() => void} props.onClose       – close handler
 * @param {string} props.appointmentId     – appointment ID to create/join session for
 * @param {string} [props.clientName]      – displayed in the modal title
 */
export function VideoSessionModal({ opened, onClose, appointmentId, clientName }) {
  const containerRef = useRef(null);
  const [sessionData, setSessionData] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  const handleClose = useCallback(() => {
    setSessionData(null);
    setStartError(null);
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
      const data = await startVideoSession(appointmentId);
      setSessionData(data);
    } catch (err) {
      setStartError(err.message ?? 'Could not start video session');
    } finally {
      setStarting(false);
    }
  }, [appointmentId, starting, sessionData]);

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
            <Button color="blue" size="md" onClick={handleStart}>
              Join Video Session
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
