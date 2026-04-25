import { Alert, Badge, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';

export function PageSurface({ title, description, actions, children }) {
  return (
    <Stack gap="md" p="md">
      {(title || description || actions) && (
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            {title && <Title order={2} fz="lg">{title}</Title>}
            {description && (
              <Text fz="sm" c="dimmed" mt={4}>
                {description}
              </Text>
            )}
          </div>
          {actions ? <Group gap="xs">{actions}</Group> : null}
        </Group>
      )}
      {children}
    </Stack>
  );
}

export function SectionSurface({ children, ...props }) {
  return (
    <Paper withBorder radius="md" p="md" {...props}>
      {children}
    </Paper>
  );
}

export function SectionHeader({ title, description, actions, meta }) {
  return (
    <Stack gap="xs" mb="md">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={3} fz="md">{title}</Title>
          {description && (
            <Text fz="sm" c="dimmed">
              {description}
            </Text>
          )}
        </div>
        {actions ? <Group gap="xs">{actions}</Group> : null}
      </Group>
      {meta ? <Group gap="xs">{meta}</Group> : null}
    </Stack>
  );
}

export function SurfaceStatCard({ label, value, color = 'blue', children, style, ...props }) {
  return (
    <SectionSurface style={{ textAlign: 'center', ...style }} {...props}>
      <Text fz="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>
        {label}
      </Text>
      <Badge size="xl" variant="light" color={color} radius="sm">
        {value}
      </Badge>
      {children}
    </SectionSurface>
  );
}

export function SurfaceState({ type = 'empty', title, message, icon }) {
  if (type === 'loading') {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
        {message ? <Text fz="sm" c="dimmed">{message}</Text> : null}
      </Group>
    );
  }

  if (type === 'error') {
    return (
      <Alert color="red" title={title || 'Unable to load data'}>
        {message}
      </Alert>
    );
  }

  return (
    <Group justify="center" py="xl" gap="xs" c="dimmed">
      {icon}
      <Text fz="sm">{message || title}</Text>
    </Group>
  );
}
