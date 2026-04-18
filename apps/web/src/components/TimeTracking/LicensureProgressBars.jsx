import { useEffect, useState } from 'react';
import { Stack, Paper, Text, Progress, Group, Loader, Alert } from '@mantine/core';

const CATEGORY_LABELS = {
  direct_clinical:        'Direct Clinical',
  indirect_admin:         'Indirect / Administrative',
  supervision_individual: 'Individual Supervision',
  supervision_group:      'Group Supervision',
  ce_spiritual:           'CE / Spiritual Formation',
  ministry_coordination:  'Ministry Coordination',
};

export default function LicensureProgressBars({ userId } = {}) {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    Promise.all([
      fetch(`/api/v1/licensure-goals`).then((r) => r.json()),
      fetch(`/api/v1/time-entries/summary${query}`).then((r) => r.json()),
    ])
      .then(([goalsData, summaryData]) => {
        setGoals(goalsData.items ?? []);
        setSummary(summaryData.summary ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Loader size="sm" />;
  if (error) return <Alert color="red">{error}</Alert>;
  if (!goals.length) return null;

  const minutesByCategory = Object.fromEntries(summary.map((s) => [s.category, s.totalMinutes]));

  return (
    <Stack gap="sm">
      <Text fw={600} size="sm">Licensure Progress</Text>
      {goals.map((goal) => {
        const achieved = goal.categoryFilter
          ? goal.categoryFilter.reduce((acc, cat) => acc + (minutesByCategory[cat] ?? 0), 0)
          : Object.values(minutesByCategory).reduce((a, b) => a + b, 0);
        const pct = goal.targetMinutes > 0 ? Math.min(100, Math.round((achieved / goal.targetMinutes) * 100)) : 0;
        const achievedHrs = Math.floor(achieved / 60);
        const targetHrs  = Math.floor(goal.targetMinutes / 60);

        return (
          <Paper key={goal.id} withBorder radius="md" p="sm">
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={600}>{goal.label}</Text>
              <Text size="xs" c="dimmed">{achievedHrs}h / {targetHrs}h</Text>
            </Group>
            {goal.categoryFilter && (
              <Text size="xs" c="dimmed" mb={4}>
                {goal.categoryFilter.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')}
              </Text>
            )}
            <Progress value={pct} color={pct >= 100 ? 'teal' : 'indigo'} size="sm" radius="xl" />
            <Text size="xs" c="dimmed" mt={4}>{pct}% complete</Text>
          </Paper>
        );
      })}
    </Stack>
  );
}
