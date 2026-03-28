import { useState } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button, SimpleGrid,
  Badge, Alert, Box, Divider,
} from '@mantine/core';

import FormRunner from './FormRunner.jsx';

// ─── Original forms ───────────────────────────────────────────────────────────
import { ShortIntakeForm }            from './forms/ShortIntakeForm.js';
import { LongIntakeForm }             from './forms/LongIntakeForm.js';
import { AnxietyAssessment }          from './forms/AnxietyAssessment.js';
import { SelfHarmAssessment }         from './forms/SelfHarmAssessment.js';

// ─── v3.0.0 — 15 new clinical & faith-based forms ────────────────────────────
import { PHQ9 }                       from './forms/PHQ9.js';
import { BeckAnxietyInventory }       from './forms/BeckAnxietyInventory.js';
import { PCL5 }                       from './forms/PCL5.js';
import { RosenbergSelfEsteem }        from './forms/RosenbergSelfEsteem.js';
import { ASRSv1 }                     from './forms/ASRSv1.js';
import { OCIRevised }                 from './forms/OCIRevised.js';
import { AUDIT }                      from './forms/AUDIT.js';
import { DASS21 }                     from './forms/DASS21.js';
import { ACEQuestionnaire }           from './forms/ACEQuestionnaire.js';
import { CouplesAssessment }          from './forms/CouplesAssessment.js';
import { GriefAssessment }            from './forms/GriefAssessment.js';
import { BurnoutAssessment }          from './forms/BurnoutAssessment.js';
import { SpiritualWellnessInventory } from './forms/SpiritualWellnessInventory.js';
import { FamilySystemsAssessment }    from './forms/FamilySystemsAssessment.js';
import { InsomniaSeverityIndex }      from './forms/InsomniaSeverityIndex.js';

// ─── Category definitions (display order) ────────────────────────────────────
const CATEGORIES = [
  { id: 'intake',       label: 'Intake Forms',        icon: '📋' },
  { id: 'depression',   label: 'Depression',           icon: '🌧️' },
  { id: 'anxiety',      label: 'Anxiety & OCD',        icon: '💨' },
  { id: 'trauma',       label: 'Trauma & PTSD',        icon: '🛡️' },
  { id: 'self',         label: 'Self & Identity',      icon: '🌱' },
  { id: 'adhd',         label: 'Attention (ADHD)',     icon: '⚡' },
  { id: 'substance',    label: 'Substance Use',        icon: '🍂' },
  { id: 'sleep',        label: 'Sleep',                icon: '🌙' },
  { id: 'clinical',     label: 'Clinical Safety',      icon: '⚠️' },
  { id: 'relationship', label: 'Relationships',        icon: '💑' },
  { id: 'grief',        label: 'Grief & Loss',         icon: '🕊️' },
  { id: 'burnout',      label: 'Burnout & Wellness',   icon: '🕯️' },
  { id: 'faith',        label: 'Faith & Spirituality', icon: '✝️' },
  { id: 'family',       label: 'Family Systems',       icon: '🏠' },
];

// ─── Form catalog — 19 forms total ───────────────────────────────────────────
const FORM_CATALOG = [
  // Intake
  { formDef: ShortIntakeForm,            category: 'intake',       badgeLabel: 'Intake',     badgeColor: 'indigo' },
  { formDef: LongIntakeForm,             category: 'intake',       badgeLabel: 'Intake',     badgeColor: 'indigo' },
  // Depression
  { formDef: PHQ9,                       category: 'depression',   badgeLabel: 'Screener',   badgeColor: 'teal' },
  { formDef: DASS21,                     category: 'depression',   badgeLabel: 'Assessment', badgeColor: 'teal' },
  // Anxiety & OCD
  { formDef: AnxietyAssessment,          category: 'anxiety',      badgeLabel: 'Screener',   badgeColor: 'teal' },
  { formDef: BeckAnxietyInventory,       category: 'anxiety',      badgeLabel: 'Assessment', badgeColor: 'teal' },
  { formDef: OCIRevised,                 category: 'anxiety',      badgeLabel: 'Assessment', badgeColor: 'teal' },
  // Trauma & PTSD
  { formDef: PCL5,                       category: 'trauma',       badgeLabel: 'Assessment', badgeColor: 'orange' },
  { formDef: ACEQuestionnaire,           category: 'trauma',       badgeLabel: 'Screening',  badgeColor: 'orange' },
  // Self & Identity
  { formDef: RosenbergSelfEsteem,        category: 'self',         badgeLabel: 'Assessment', badgeColor: 'teal' },
  // ADHD
  { formDef: ASRSv1,                     category: 'adhd',         badgeLabel: 'Screener',   badgeColor: 'yellow' },
  // Substance
  { formDef: AUDIT,                      category: 'substance',    badgeLabel: 'Screening',  badgeColor: 'orange' },
  // Sleep
  { formDef: InsomniaSeverityIndex,      category: 'sleep',        badgeLabel: 'Assessment', badgeColor: 'blue' },
  // Clinical Safety
  { formDef: SelfHarmAssessment,         category: 'clinical',     badgeLabel: 'Clinical',   badgeColor: 'red',    crisisAlert: true },
  // Relationships
  { formDef: CouplesAssessment,          category: 'relationship', badgeLabel: 'Counseling', badgeColor: 'pink' },
  // Grief & Loss
  { formDef: GriefAssessment,            category: 'grief',        badgeLabel: 'Counseling', badgeColor: 'gray' },
  // Burnout & Wellness
  { formDef: BurnoutAssessment,          category: 'burnout',      badgeLabel: 'Counseling', badgeColor: 'orange' },
  // Faith & Spirituality
  { formDef: SpiritualWellnessInventory, category: 'faith',        badgeLabel: 'Faith',      badgeColor: 'violet' },
  // Family Systems
  { formDef: FamilySystemsAssessment,    category: 'family',       badgeLabel: 'Counseling', badgeColor: 'green' },
];

// ─── Individual form card ─────────────────────────────────────────────────────
function FormCard({ entry, onSelect }) {
  const { formDef, badgeLabel, badgeColor, crisisAlert } = entry;

  return (
    <Paper
      withBorder
      radius="lg"
      p="xl"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderTop: crisisAlert ? '3px solid var(--mantine-color-red-6)' : '3px solid var(--mantine-color-brand-5)',
        background: 'var(--surface)',
        transition: 'box-shadow 0.15s',
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Text fz="2rem" style={{ lineHeight: 1 }}>{formDef.icon}</Text>
        <Group gap="xs">
          <Badge color={badgeColor} variant="light" size="sm" radius="sm">
            {badgeLabel}
          </Badge>
          <Badge color="gray" variant="outline" size="sm" radius="sm">
            ~{formDef.estimatedMinutes} min
          </Badge>
        </Group>
      </Group>

      <Stack gap={4}>
        <Title order={5} style={{ color: 'var(--text)' }}>{formDef.title}</Title>
        <Text fz="sm" c="dimmed" lineClamp={3}>{formDef.description}</Text>
      </Stack>

      <Stack gap={4}>
        <Text fz="xs" c="dimmed">
          {formDef.sections?.length ?? 0} sections · {countFields(formDef)} fields
        </Text>
        {crisisAlert && (
          <Alert color="red" radius="md" p="xs" fz="xs">
            <Text fz="xs" fw={600}>
              ⚠ Clinical use. In crisis? Call/text <strong>988</strong> or text <strong>HOME to 741741</strong>.
            </Text>
          </Alert>
        )}
      </Stack>

      <Button
        fullWidth
        mt="auto"
        variant={crisisAlert ? 'outline' : 'filled'}
        color={crisisAlert ? 'red' : 'brand'}
        radius="md"
        onClick={() => onSelect(entry)}
      >
        Open Form
      </Button>
    </Paper>
  );
}

function countFields(formDef) {
  return (formDef.sections ?? []).reduce((sum, sec) => sum + sec.fields.length, 0);
}

// ─── Library header ───────────────────────────────────────────────────────────
function LibraryHeader() {
  return (
    <Box>
      <Group gap="xs" mb={4}>
        <Text fz="1.5rem">📄</Text>
        <Title order={3} style={{ color: 'var(--text)' }}>Client Documents</Title>
      </Group>
      <Text fz="sm" c="dimmed" maw={560}>
        Electronic forms for counseling assessments and intake. All forms include a Faith &amp; Spiritual
        Profile section rooted in Christian principles. Complete in-session or assign for self-completion.
      </Text>
      <Divider mt="lg" />
    </Box>
  );
}

// ─── Main DocumentsPage ───────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [activeEntry, setActiveEntry] = useState(null);

  // Show form runner if a form is selected
  if (activeEntry) {
    return (
      <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <FormRunner formDef={activeEntry.formDef} onClose={() => setActiveEntry(null)} />
      </Box>
    );
  }

  // Show form library
  return (
    <Box
      style={{
        background: 'var(--bg)',
        minHeight: '100%',
        padding: '24px',
      }}
    >
      <Stack gap="xl" maw={1200} mx="auto">
        <LibraryHeader />

        {CATEGORIES.map((cat) => {
          const forms = FORM_CATALOG.filter((e) => e.category === cat.id);
          if (!forms.length) return null;
          return (
            <Stack key={cat.id} gap="sm">
              <Group gap="xs" align="center">
                <Text fz="lg" style={{ lineHeight: 1 }}>{cat.icon}</Text>
                <Title order={4} style={{ color: 'var(--text)' }}>{cat.label}</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {forms.map((entry) => (
                  <FormCard key={entry.formDef.id} entry={entry} onSelect={setActiveEntry} />
                ))}
              </SimpleGrid>
            </Stack>
          );
        })}

        {/* Christian counseling note */}
        <Paper withBorder p="lg" radius="lg" style={{ background: 'var(--mantine-color-brand-0)' }}>
          <Group gap="md" align="flex-start">
            <Text fz="1.5rem">✝️</Text>
            <Stack gap={4}>
              <Text fw={600} fz="sm">Christian Counseling Integration</Text>
              <Text fz="sm" c="dimmed">
                Every form in this library includes a <strong>Faith &amp; Spiritual Profile</strong> or{' '}
                <strong>Faith Dimension</strong> section. These sections invite clients to share their
                spiritual life, how faith shapes their healing, and their openness to prayer and Scripture
                within the counseling relationship.
              </Text>
              <Text fz="xs" c="dimmed" mt={4} fs="italic">
                "He heals the brokenhearted and binds up their wounds." — Psalm 147:3
              </Text>
            </Stack>
          </Group>
        </Paper>
      </Stack>
    </Box>
  );
}
