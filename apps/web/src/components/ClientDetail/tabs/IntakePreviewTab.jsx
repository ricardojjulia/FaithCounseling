import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { fetchClientIntakePreview } from '../../../lib/clientApi.js';
import { frontendTelemetry } from '../../../lib/frontendTelemetry.js';
import { useSurfaceTelemetry } from '../../../lib/useSurfaceTelemetry.js';

function KeyValueList({ title, items, emptyLabel = 'No details available yet.' }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Title order={4}>{title}</Title>
      <Stack gap="sm" mt="sm">
        {items.length === 0 ? (
          <Text size="sm" c="dimmed">{emptyLabel}</Text>
        ) : items.map((item) => (
          <div key={`${title}-${item.label}`}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">{item.label}</Text>
            <Text size="sm">{item.value}</Text>
          </div>
        ))}
      </Stack>
    </Paper>
  );
}

function urgencyColor(level) {
  if (level === 'critical') return 'red';
  if (level === 'moderate') return 'yellow';
  return 'gray';
}

export default function IntakePreviewTab({ clientId }) {
  useSurfaceTelemetry('client.intake_preview', { surfaceKind: 'tab', workflow: 'client_detail' });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchClientIntakePreview(clientId)
      .then((payload) => {
        if (cancelled) return;
        const item = payload?.item ?? null;
        setPreview(item);
        setLoading(false);
        if (!item?.eligible) {
          frontendTelemetry.trackEmptyState('client.intake_preview', 'ineligible_preview', {
            surfaceKind: 'tab',
            workflow: 'client_detail',
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Unable to load intake preview.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const screeningSignals = useMemo(
    () => Array.isArray(preview?.screeningSignals) ? preview.screeningSignals : [],
    [preview?.screeningSignals],
  );
  const careRoutes = useMemo(
    () => Array.isArray(preview?.careRoutes) ? preview.careRoutes : [],
    [preview?.careRoutes],
  );
  const areasToAssess = useMemo(
    () => Array.isArray(preview?.areasToAssess) ? preview.areasToAssess : [],
    [preview?.areasToAssess],
  );
  const reportedConditions = useMemo(
    () => Array.isArray(preview?.reportedConditions) ? preview.reportedConditions : [],
    [preview?.reportedConditions],
  );

  if (loading) {
    return (
      <Group py="lg">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">Loading intake preview...</Text>
      </Group>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Unable to load intake preview">
        {error}
      </Alert>
    );
  }

  if (!preview) {
    return (
      <Alert color="gray" title="No intake preview available">
        No intake preview data is available for this client.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Alert color="blue" title="Counselor review support">
        {preview.disclaimer}
      </Alert>

      {!preview.eligible ? (
        <Alert color="yellow" title="Preview not currently active">
          <Stack gap={4}>
            {(preview.reasons ?? []).map((reason) => (
              <Text key={reason} size="sm">{reason}</Text>
            ))}
          </Stack>
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Paper withBorder radius="md" p="md">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">Intake status</Text>
          <Text size="lg" fw={700} mt={4}>
            {preview.intake?.completed ? 'Complete' : 'Incomplete'}
          </Text>
          <Text size="sm" c="dimmed" mt={6}>
            Packet status: {preview.intake?.packetStatus ?? 'Not on file'}
          </Text>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">Held sessions</Text>
          <Text size="lg" fw={700} mt={4}>{preview.sessions?.heldSessionCount ?? 0}</Text>
          <Text size="sm" c="dimmed" mt={6}>
            Future appointments: {preview.sessions?.futureAppointmentCount ?? 0}
          </Text>
        </Paper>

        <Paper withBorder radius="md" p="md">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">Next appointment</Text>
          <Text size="lg" fw={700} mt={4}>
            {preview.sessions?.nextAppointmentAt
              ? new Date(preview.sessions.nextAppointmentAt).toLocaleString()
              : 'Not scheduled'}
          </Text>
          <Text size="sm" c="dimmed" mt={6}>
            Generated {preview.generatedAt ? new Date(preview.generatedAt).toLocaleString() : 'just now'}
          </Text>
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <KeyValueList title="Reported Context" items={preview.reportedContext ?? []} />
        <KeyValueList title="Presenting Concerns" items={preview.presentingConcerns ?? []} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <KeyValueList title="Reported Contributors" items={preview.reportedContributors ?? []} />
        <Paper withBorder radius="md" p="md">
          <Title order={4}>Reported Conditions And History</Title>
          <Stack gap="xs" mt="sm">
            {reportedConditions.length === 0 ? (
              <Text size="sm" c="dimmed">No reported prior diagnoses, medications, or hospitalization details were found in the submitted intake materials.</Text>
            ) : reportedConditions.map((entry) => (
              <Group key={entry} align="flex-start" wrap="nowrap">
                <ThemeIcon color="gray" variant="light" size="sm" mt={2}>•</ThemeIcon>
                <Text size="sm">{entry}</Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" align="center">
          <Title order={4}>Screening Signals</Title>
          <Text size="sm" c="dimmed">{screeningSignals.length} item(s)</Text>
        </Group>
        <Stack gap="sm" mt="sm">
          {screeningSignals.length === 0 ? (
            <Text size="sm" c="dimmed">No scored assessments are currently available in the intake record.</Text>
          ) : screeningSignals.map((signal) => (
            <Paper key={`${signal.formKey}-${signal.title}-${signal.submittedAt}`} radius="sm" p="sm" bg="var(--mantine-color-gray-0)">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={600} size="sm">{signal.title}</Text>
                  <Text size="xs" c="dimmed">
                    {signal.scoreValue != null && signal.scoreLabel
                      ? `${signal.scoreLabel}: ${signal.scoreValue}`
                      : 'Structured intake signal'}
                  </Text>
                </div>
                <Badge color={urgencyColor(signal.urgency)} variant="light">
                  {signal.urgency}
                </Badge>
              </Group>
              {signal.interpretationLabel ? (
                <Text size="sm" mt={6}>{signal.interpretationLabel}</Text>
              ) : null}
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" align="center">
          <Title order={4}>Care Route Hypotheses</Title>
          <Text size="sm" c="dimmed">Provisional, counselor-reviewed</Text>
        </Group>
        <Stack gap="sm" mt="sm">
          {careRoutes.map((route) => (
            <Paper key={route.id} radius="sm" p="sm" bg="var(--mantine-color-blue-0)">
              <Group justify="space-between" align="center">
                <Text fw={700} size="sm">{route.title}</Text>
                <Badge variant="light">{route.confidence} confidence</Badge>
              </Group>
              {(route.basis ?? []).length > 0 ? (
                <Stack gap={4} mt="xs">
                  {route.basis.map((basis) => (
                    <Text key={basis} size="sm" c="dimmed">{basis}</Text>
                  ))}
                </Stack>
              ) : null}
              {route.reviewPrompt ? (
                <Text size="sm" mt="xs">{route.reviewPrompt}</Text>
              ) : null}
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Title order={4}>Areas To Assess In First Session</Title>
        <Stack gap="xs" mt="sm">
          {areasToAssess.length === 0 ? (
            <Text size="sm" c="dimmed">No first-session prompts are available yet.</Text>
          ) : areasToAssess.map((item) => (
            <Group key={item} align="flex-start" wrap="nowrap">
              <ThemeIcon color="blue" variant="light" size="sm" mt={2}>•</ThemeIcon>
              <Text size="sm">{item}</Text>
            </Group>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
