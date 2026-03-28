import { useState, useMemo } from 'react';
import {
  Stack, Title, Text, Paper, Group, Button, TextInput, Textarea, Select,
  Radio, Checkbox, NumberInput, Badge, Progress, Divider, Alert, SimpleGrid,
  ActionIcon, Box, Stepper,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';

// ─── Scale field (1–10 or 0–10 numeric selector) ─────────────────────────────
function ScaleField({ field, value, onChange }) {
  const options = [];
  for (let i = field.min; i <= field.max; i++) options.push(i);
  return (
    <Stack gap={4}>
      <Text fz="sm" fw={500}>{field.label}{field.required && <Text component="span" c="red"> *</Text>}</Text>
      <Group gap={4} wrap="wrap">
        {options.map((n) => (
          <Button
            key={n}
            size="xs"
            variant={String(value) === String(n) ? 'filled' : 'default'}
            onClick={() => onChange(String(n))}
            style={{ minWidth: 36 }}
          >
            {n}
          </Button>
        ))}
      </Group>
      <Group justify="space-between">
        <Text fz="xs" c="dimmed">{field.minLabel}</Text>
        <Text fz="xs" c="dimmed">{field.maxLabel}</Text>
      </Group>
    </Stack>
  );
}

// ─── GAD-7 style scale (radio row with label options) ────────────────────────
function GadScaleField({ field, value, onChange }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Text fz="sm" fw={500} mb="xs">
        {field.label}
        {field.required && <Text component="span" c="red"> *</Text>}
      </Text>
      <Radio.Group value={value ?? ''} onChange={onChange}>
        <Group gap="md" wrap="wrap">
          {field.options.map((opt) => (
            <Radio
              key={opt.value}
              value={opt.value}
              label={<Text fz="xs">{opt.label}</Text>}
            />
          ))}
        </Group>
      </Radio.Group>
    </Paper>
  );
}

// ─── Checkboxes field ─────────────────────────────────────────────────────────
function CheckboxesField({ field, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };
  return (
    <Stack gap={4}>
      <Text fz="sm" fw={500}>{field.label}{field.required && <Text component="span" c="red"> *</Text>}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={4}>
        {field.options.map((opt) => (
          <Checkbox
            key={opt}
            label={opt}
            checked={selected.includes(opt)}
            onChange={() => toggle(opt)}
            size="sm"
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

// ─── Single field renderer ────────────────────────────────────────────────────
function FieldRenderer({ field, value, onChange }) {
  // Conditional display (showIf)
  // Note: showIf is evaluated by the section renderer using the full answers object.

  const commonProps = {
    label: (
      <Text fz="sm" fw={500}>
        {field.label}
        {field.required && <Text component="span" c="red"> *</Text>}
      </Text>
    ),
    placeholder: field.placeholder,
    value: value ?? '',
    onChange: (e) => onChange(typeof e === 'string' || e === null ? (e ?? '') : e?.target?.value ?? ''),
  };

  switch (field.type) {
    case 'text':
    case 'tel':
    case 'email':
      return <TextInput {...commonProps} type={field.type} />;

    case 'number':
      return (
        <NumberInput
          label={commonProps.label}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={(v) => onChange(v)}
          min={field.min}
          max={field.max}
        />
      );

    case 'date':
      return (
        <DateInput
          label={commonProps.label}
          placeholder={field.placeholder || 'MM/DD/YYYY'}
          value={value ? new Date(value) : null}
          onChange={(d) => onChange(d ? d.toISOString().split('T')[0] : '')}
          valueFormat="MM/DD/YYYY"
          clearable
        />
      );

    case 'textarea':
      return (
        <Textarea
          {...commonProps}
          minRows={field.minRows ?? 3}
          autosize
        />
      );

    case 'select':
      return (
        <Select
          label={commonProps.label}
          placeholder={field.placeholder || '— Select —'}
          data={field.options?.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)) ?? []}
          value={value ?? null}
          onChange={(v) => onChange(v ?? '')}
          clearable
          searchable
        />
      );

    case 'radio':
      return (
        <Stack gap={4}>
          <Text fz="sm" fw={500}>
            {field.label}
            {field.required && <Text component="span" c="red"> *</Text>}
          </Text>
          <Radio.Group value={value ?? ''} onChange={onChange}>
            <Group gap="md" wrap="wrap">
              {field.options?.map((opt) => (
                <Radio key={opt} value={opt} label={opt} size="sm" />
              ))}
            </Group>
          </Radio.Group>
        </Stack>
      );

    case 'checkboxes':
      return <CheckboxesField field={field} value={value} onChange={onChange} />;

    case 'scale':
      return <ScaleField field={field} value={value} onChange={onChange} />;

    case 'gad_scale':
      return <GadScaleField field={field} value={value} onChange={onChange} />;

    default:
      return null;
  }
}

// ─── Score banner for scorable forms ─────────────────────────────────────────
function ScoreBanner({ form, answers }) {
  if (!form.scorable) return null;

  // GAD-7 numeric score
  if (form.scoreFields) {
    const total = form.scoreFields.reduce((sum, id) => sum + (parseInt(answers[id] ?? '0', 10) || 0), 0);
    const interp = form.scoreInterpretation(total);
    return (
      <Alert color={interp.color} title={`${form.scoreLabel}: ${total} / ${form.scoreMax} — ${interp.label}`} radius="md">
        {interp.description}
      </Alert>
    );
  }

  // Risk level (self-harm)
  if (form.scoreInterpretation) {
    const interp = form.scoreInterpretation(answers);
    return (
      <Alert color={interp.color} title={`${form.scoreLabel}: ${interp.label}`} radius="md">
        {interp.description}
      </Alert>
    );
  }

  return null;
}

// ─── Print styles injection ───────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  .print-section { break-inside: avoid; }
}
`;

// ─── Main FormRunner  ─────────────────────────────────────────────────────────
export default function FormRunner({ formDef, onClose }) {
  const [answers, setAnswers] = useState({});
  const [activeStep, setActiveStep] = useState(0);

  const sections = formDef.sections;
  const totalSections = sections.length;

  const setAnswer = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Determine if a field should be visible based on showIf
  const isVisible = (field) => {
    if (!field.showIf) return true;
    const dep = answers[field.showIf.field];
    if (field.showIf.value !== undefined) return dep === field.showIf.value;
    if (field.showIf.values !== undefined) return field.showIf.values.includes(dep);
    return true;
  };

  const currentSection = sections[activeStep];

  const visibleFields = useMemo(
    () => (currentSection?.fields ?? []).filter(isVisible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSection, answers],
  );

  const answeredCount = useMemo(() => {
    let count = 0;
    for (const section of sections) {
      for (const field of section.fields) {
        if (!isVisible(field)) continue;
        const val = answers[field.id];
        if (val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) count++;
      }
    }
    return count;
  }, [sections, answers]);

  const totalFieldCount = useMemo(() => {
    let count = 0;
    for (const section of sections) {
      for (const field of section.fields) {
        if (!isVisible(field)) continue;
        count++;
      }
    }
    return count;
  }, [sections, answers]);

  const percentComplete = totalFieldCount > 0 ? Math.round((answeredCount / totalFieldCount) * 100) : 0;

  const splitIntoColumns = (fields) => {
    const halves = fields.filter((f) => f.half);
    if (halves.length === 0) return fields.map((f) => ({ field: f, colSpan: 2 }));
    return fields.map((f) => ({ field: f, colSpan: f.half ? 1 : 2 }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClear = () => {
    if (window.confirm('Clear all answers and start over?')) {
      setAnswers({});
      setActiveStep(0);
    }
  };

  return (
    <Stack gap={0} style={{ minHeight: '100%' }}>
      {/* Print styles */}
      <style>{PRINT_STYLE}</style>

      {/* Header */}
      <Box
        className="no-print"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2}>
            <Group gap="xs">
              <Text fz="lg">{formDef.icon}</Text>
              <Title order={4} style={{ color: 'var(--text)' }}>{formDef.title}</Title>
            </Group>
            <Text fz="xs" c="dimmed">
              Section {activeStep + 1} of {totalSections} · {percentComplete}% completed · ~{formDef.estimatedMinutes} min
            </Text>
          </Stack>
          <Group gap="xs" className="no-print">
            <Button variant="default" size="xs" onClick={handlePrint}>Print / Save PDF</Button>
            <Button variant="default" size="xs" onClick={handleClear} color="red">Clear</Button>
            <Button variant="default" size="xs" onClick={onClose}>← Back to Documents</Button>
          </Group>
        </Group>
        <Progress value={percentComplete} mt="xs" size="sm" color="brand" radius="xl" />
      </Box>

      {/* Body */}
      <Box
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--bg)',
        }}
      >
        <SimpleGrid
          cols={{ base: 1, lg: 2 }}
          spacing="xl"
          style={{ maxWidth: 1100, margin: '0 auto' }}
        >
          {/* Left: section nav */}
          <Box className="no-print" style={{ lg: { position: 'sticky', top: 24, alignSelf: 'start' } }}>
            <Paper withBorder p="md" radius="lg" mb="md">
              <Text fw={700} fz="sm" mb="sm" c="dimmed" tt="uppercase" ls={1}>Sections</Text>
              <Stack gap={4}>
                {sections.map((sec, idx) => (
                  <Button
                    key={sec.id}
                    variant={idx === activeStep ? 'filled' : 'subtle'}
                    size="xs"
                    justify="start"
                    fullWidth
                    onClick={() => setActiveStep(idx)}
                    color={sec.color === 'red' ? 'red' : 'brand'}
                    leftSection={
                      <Badge
                        size="xs"
                        variant={idx === activeStep ? 'white' : 'light'}
                        color={sec.color === 'red' ? 'red' : 'brand'}
                      >
                        {idx + 1}
                      </Badge>
                    }
                  >
                    <Text fz="xs" fw={500}>{sec.title}</Text>
                    {sec.color === 'red' && (
                      <Badge size="xs" color="red" ml="auto" variant="dot">Safety</Badge>
                    )}
                  </Button>
                ))}
              </Stack>
            </Paper>

            {/* Score banner (shown in side panel) */}
            <ScoreBanner form={formDef} answers={answers} />
          </Box>

          {/* Right: current section content */}
          <Stack gap="lg" className="print-section">
            <Paper withBorder p="xl" radius="lg">
              <Stack gap="md">
                <Stack gap={4}>
                  <Group gap="xs">
                    {currentSection.color === 'red' && (
                      <Badge color="red" size="sm">Safety</Badge>
                    )}
                    <Title order={4}>{currentSection.title}</Title>
                  </Group>
                  {currentSection.description && (
                    <Text
                      fz="sm"
                      c="dimmed"
                      style={{
                        whiteSpace: 'pre-line',
                        borderLeft: '3px solid var(--mantine-color-brand-5)',
                        paddingLeft: 12,
                      }}
                    >
                      {currentSection.description}
                    </Text>
                  )}
                </Stack>

                <Divider />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {visibleFields.map((field) => {
                    const colSpan = field.half ? 1 : 2;
                    return (
                      <Box key={field.id} style={{ gridColumn: colSpan === 2 ? '1 / -1' : undefined }}>
                        <FieldRenderer
                          field={field}
                          value={answers[field.id]}
                          onChange={(val) => setAnswer(field.id, val)}
                        />
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            </Paper>

            {/* Navigation */}
            <Group justify="space-between" className="no-print">
              <Button
                variant="default"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((s) => s - 1)}
              >
                ← Previous
              </Button>
              <Text fz="xs" c="dimmed">{activeStep + 1} / {totalSections}</Text>
              {activeStep < totalSections - 1 ? (
                <Button onClick={() => setActiveStep((s) => s + 1)}>
                  Next →
                </Button>
              ) : (
                <Button color="green" onClick={handlePrint}>
                  Complete & Print
                </Button>
              )}
            </Group>
          </Stack>
        </SimpleGrid>
      </Box>
    </Stack>
  );
}
