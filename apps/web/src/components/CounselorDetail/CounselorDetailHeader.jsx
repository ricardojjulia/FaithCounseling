import { Group, Button, Title, Badge, Text, Box, Paper } from '@mantine/core';
import { useI18n } from '../../lib/i18nContext.jsx';

const ROLE_COLOR = {
  counselor:        'green',
  intern:           'yellow',
  practice_admin:   'blue',
  practice_owner:   'violet',
  platform_admin:   'red',
  scheduler_biller: 'gray',
};

export default function CounselorDetailHeader({ counselor, onBack }) {
  const { t } = useI18n();
  const displayName = `${counselor.firstName ?? ''} ${counselor.lastName ?? ''}`.trim() || counselor.id;

  return (
    <Paper radius={0} withBorder style={{ borderLeft: 0, borderRight: 0, borderTop: 0 }} p="md">
      <Group gap="md" wrap="wrap">
        <Button variant="default" size="sm" onClick={onBack}>← {t('nav.counselors')}</Button>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" wrap="wrap" align="center">
            <Title order={1} fz="xl" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </Title>
            <Badge color={ROLE_COLOR[counselor.role] || 'gray'} variant="light" tt="capitalize">
              {t(`role.${counselor.role || 'counselor'}`)}
            </Badge>
          </Group>
          <Group gap="lg" mt={4}>
            {counselor.licenseType && <Text fz="sm" c="dimmed">{t('counselorDetail.license')}: {counselor.licenseType.toUpperCase()}</Text>}
            {counselor.supervisionStatus && counselor.supervisionStatus !== 'not_required' && (
              <Text fz="sm" c="dimmed">{t('counselorDetail.supervision')}: {counselor.supervisionStatus}</Text>
            )}
            <Text fz="sm" c="dimmed">{t('counselorDetail.id')}: {counselor.id}</Text>
          </Group>
        </Box>
      </Group>
    </Paper>
  );
}
