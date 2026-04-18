/**
 * TemplatePicker — system-level clinical note template selector.
 *
 * Props:
 *   value          {string|null}  currently selected template id
 *   onChange       {fn(id, template)}  called when selection changes
 *   clientFaithPreference {string|null}  'integrated'|'separate'|null
 *   hasExistingContent {boolean}  true if draft already has text
 */

import { useState, useEffect } from 'react';
import { Select, Text, Modal, Button, Group, Badge } from '@mantine/core';

const CATEGORY_LABELS = {
  standard: 'Standard Clinical',
  faith_integrated: 'Faith-Integrated',
  specialty: 'Specialty',
  crisis: 'Crisis & Safety',
};

async function apiFetchTemplates() {
  const res = await fetch('/api/v1/note-templates');
  if (!res.ok) throw new Error('Failed to load templates');
  const data = await res.json();
  return data.items ?? [];
}

export default function TemplatePicker({
  value,
  onChange,
  clientFaithPreference,
  hasExistingContent = false,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetchTemplates()
      .then((items) => { if (!cancelled) setTemplates(items); })
      .catch(() => { /* fail silently — template picker is non-critical */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Build grouped Select data
  const categoryOrder = ['standard', 'faith_integrated', 'specialty', 'crisis'];
  const grouped = categoryOrder.map((cat) => {
    const items = templates.filter((t) => t.category === cat);
    if (!items.length) return null;
    return {
      group: CATEGORY_LABELS[cat] ?? cat,
      items: items.map((t) => {
        const isFaithRecommended =
          cat === 'faith_integrated' && clientFaithPreference === 'integrated';
        return {
          value: t.id,
          label: t.name + (isFaithRecommended ? ' ★' : ''),
        };
      }),
    };
  }).filter(Boolean);

  const handleChange = (id) => {
    if (!id) {
      onChange(null, null);
      return;
    }
    // If there's already content, ask for confirmation first
    if (hasExistingContent) {
      setPendingId(id);
      setConfirmOpen(true);
    } else {
      const tmpl = templates.find((t) => t.id === id) ?? null;
      onChange(id, tmpl);
    }
  };

  const confirmApply = () => {
    const tmpl = templates.find((t) => t.id === pendingId) ?? null;
    onChange(pendingId, tmpl);
    setPendingId(null);
    setConfirmOpen(false);
  };

  const cancelApply = () => {
    setPendingId(null);
    setConfirmOpen(false);
  };

  return (
    <>
      <Select
        label="Note Template"
        description={
          clientFaithPreference === 'integrated'
            ? 'Faith-integrated templates are recommended for this client (★)'
            : 'Choose a structured note format or leave blank to use free text'
        }
        placeholder={loading ? 'Loading templates…' : 'Select a template (optional)…'}
        data={grouped}
        value={value ?? null}
        onChange={handleChange}
        clearable
        searchable
        disabled={loading || templates.length === 0}
        leftSection={
          value ? (
            <Badge
              size="xs"
              color={
                (templates.find((t) => t.id === value)?.category === 'crisis' ? 'red'
                  : templates.find((t) => t.id === value)?.category === 'faith_integrated' ? 'teal'
                  : 'blue')
              }
              style={{ pointerEvents: 'none' }}
            >
              {CATEGORY_LABELS[templates.find((t) => t.id === value)?.category] ?? ''}
            </Badge>
          ) : null
        }
      />

      {/* Overwrite confirmation modal */}
      <Modal
        opened={confirmOpen}
        onClose={cancelApply}
        title="Apply template?"
        size="sm"
        centered
      >
        <Text size="sm" mb="md">
          Applying a template will overwrite your current note content. This cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" size="sm" onClick={cancelApply}>Cancel</Button>
          <Button color="blue" size="sm" onClick={confirmApply}>Apply Template</Button>
        </Group>
      </Modal>
    </>
  );
}
