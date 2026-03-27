# Mantine UI Migration

**Status:** Delivered in the repository. Current repository release is `v1.6.0`; this document remains as the implementation record for the Mantine migration.

## Purpose

Replace the hand-rolled CSS component system with Mantine v7, a production-grade React component library that uses native CSS (no runtime CSS-in-JS). The goal is a more polished, accessible, consistent UI with less custom CSS to maintain, while preserving the existing brand color palette and design language.

## Branch

All work is on `feature/mantine-ui`. Revert with `git checkout main` at any time.

## Mantine Packages

| Package | Purpose |
| --- | --- |
| `@mantine/core` | AppShell, Button, TextInput, PasswordInput, Select, Modal, Tabs, Table, Badge, Paper, Card, SimpleGrid, Group, Stack, Burger, Alert, Loader, Checkbox, Textarea, NumberInput, ActionIcon |
| `@mantine/hooks` | useDisclosure (modal/sidebar open state), useForm available via @mantine/form |
| `@mantine/form` | Form state, validation, field bindings for all create/edit forms |
| `@mantine/dates` | DateInput for license, certification, malpractice, employment date fields |
| `@mantine/notifications` | Replace inline notice/error state across all components with toast notifications |

## Theme

Map existing CSS variables to a Mantine theme in `apps/web/src/theme.js`:

```js
import { createTheme, MantineColorsTuple } from '@mantine/core';

const brand: MantineColorsTuple = [
  '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc',
  '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
  '#3730a3', '#312e81',
];

export const theme = createTheme({
  primaryColor: 'brand',
  colors: { brand },
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  defaultRadius: 'md',
  components: {
    Button: { defaultProps: { radius: 'md' } },
    Modal: { defaultProps: { radius: 'lg', centered: true } },
    Paper: { defaultProps: { radius: 'lg', withBorder: true } },
  },
});
```

## Component Mapping

| Current | Mantine replacement |
| --- | --- |
| `<button className="action-btn">` | `<Button variant="default">` |
| `<button className="action-btn primary">` | `<Button>` |
| `<button className="action-btn danger">` | `<Button color="red" variant="light">` |
| `<input className="auth-input">` | `<TextInput>` |
| `<input type="password">` | `<PasswordInput>` |
| `<select className="auth-select">` | `<Select>` |
| `modal-backdrop` + `modal-sheet` | `<Modal>` |
| `.tab-list` + `.tab-button` | `<Tabs>` |
| `.um-table` | `<Table striped highlightOnHover>` |
| `.panel` | `<Paper p="md">` |
| `.panel-head` | `<Group justify="space-between">` |
| `.metrics` grid | `<SimpleGrid>` with `<Paper>` |
| `.workspace-grid` | `<SimpleGrid>` |
| `.status-pill` / role badge | `<Badge>` |
| `.um-notice` / `.auth-error` | `notifications.show(...)` via `@mantine/notifications` |
| `.sidebar` | `<AppShell.Navbar>` |
| `.topbar` | `<AppShell.Header>` |
| `.hamburger-menu` | `<Burger>` |
| `<input type="date">` | `<DateInput>` from `@mantine/dates` |
| Form state (useState per field) | `useForm` from `@mantine/form` |
| Loading button state | `loading` prop on `<Button>` |
| `<section className="panel">` | `<Paper component="section">` |
| `.sidebar.open` + backdrop logic | `useDisclosure()` + AppShell `navbar.collapsed` |

## Migration Phases

### Phase 1 — Install, PostCSS, MantineProvider, Theme

Files:
- `apps/web/package.json` — add Mantine packages
- `apps/web/postcss.config.cjs` — NEW (required by Mantine)
- `apps/web/src/main.jsx` or `index.jsx` — wrap with MantineProvider + Notifications
- `apps/web/src/theme.js` — NEW (brand theme)
- `apps/web/src/App.jsx` — add MantineProvider wrapper

### Phase 2 — AppShell (Sidebar + TopBar layout)

Replace the `app-shell` / `sidebar` / `topbar` / `sidebar-backdrop` pattern with `<AppShell>`.

Files:
- `apps/web/src/App.jsx`
- `apps/web/src/components/Sidebar.jsx`
- `apps/web/src/components/TopBar.jsx`

Key changes:
- `App.jsx`: render `<AppShell>` with `<AppShell.Header>` and `<AppShell.Navbar>`
- `Sidebar.jsx`: use `<AppShell.Navbar>`, `<NavLink>`, `<Stack>`, `<Burger>`
- `TopBar.jsx`: use `<AppShell.Header>`, `<Group>`, `<Burger>`, `<Badge>` for connection status, `<Select>` for language switcher

### Phase 3 — Notifications

Replace all `notice`/`error` useState patterns across every component with `notifications.show()`.

Affected files: `UserMaintenance.jsx`, `ClientForm.jsx`, all counselor tabs, all client tabs

Pattern:
```jsx
// Before
const [notice, setNotice] = useState('');
const [error, setError] = useState(null);

// After
import { notifications } from '@mantine/notifications';
notifications.show({ title: 'Saved', message: '...', color: 'green' });
notifications.show({ title: 'Error', message: err.message, color: 'red' });
```

### Phase 4 — Modals

Replace `modal-backdrop` + `modal-sheet` div pattern with `<Modal>`.

Files:
- `apps/web/src/components/UserMaintenance.jsx` — Create/Edit user modal
- `apps/web/src/components/ClientModal.jsx` — Client create/edit modal
- `apps/web/src/components/ClientPickerModal.jsx` — Client picker

### Phase 5 — Forms with useForm

Replace per-field `useState` form state with `useForm` from `@mantine/form`.

Files: `UserMaintenance.jsx`, `ClientForm.jsx`, all CounselorDetail tab forms that have save functionality (ProfileTab, LicensesTab, SpecialtiesTab, CounselorFaithProfileTab, CertificationsTab, EmploymentTab)

Pattern:
```jsx
const form = useForm({
  initialValues: { firstName: '', lastName: '', email: '', role: 'counselor' },
  validate: { email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email') },
});
// <TextInput {...form.getInputProps('firstName')} />
```

### Phase 6 — Tables

Replace `.um-table` with Mantine `<Table>`.

Files: `UserMaintenance.jsx`

### Phase 7 — Tabs

Replace `.tab-list` + `.tab-button` pattern with `<Tabs>`.

Files:
- `apps/web/src/components/WorkspaceGrid.jsx` — Workspace Studio tabs (10 tabs)
- `apps/web/src/components/ClientDetail/ClientDetailTabs.jsx`
- `apps/web/src/components/CounselorDetail/CounselorDetailTabs.jsx`

### Phase 8 — Cards and Metrics Layout

Replace `.metric-card`, `.panel`, `.workspace-grid` with `<Paper>`, `<Card>`, `<SimpleGrid>`.

Files: `Metrics.jsx`, `WorkspaceGrid.jsx`

### Phase 9 — Auth Page

Redesign `AuthGate.jsx` using Mantine:
- `<Paper>` for card
- `<TextInput>` / `<PasswordInput>` for fields
- `<Button loading={...}>` for submit
- `<Alert>` for lockout message

### Phase 10 — Detail Headers and Badges

Replace inline badge styles in `ClientDetailHeader.jsx` and `CounselorDetailHeader.jsx` with `<Badge>` and `<Button variant="subtle">` for back button.

### Phase 11 — DateInput in Tab Forms

Replace date `<input type="date">` fields in `LicensesTab.jsx`, `CertificationsTab.jsx`, and `EmploymentTab.jsx` with `<DateInput>` from `@mantine/dates`.

### Phase 12 — CSS Cleanup

After all components are migrated, remove replaced rules from `App.css` and `index.css`. Retain only the CSS variables and any app-specific layout rules not covered by Mantine.

## Files Changed (Complete List)

| File | Change |
| --- | --- |
| `apps/web/package.json` | Add 5 Mantine packages |
| `apps/web/postcss.config.cjs` | NEW — PostCSS config required by Mantine |
| `apps/web/src/theme.js` | NEW — Mantine theme with brand colors |
| `apps/web/src/main.jsx` | Wrap with MantineProvider + Notifications |
| `apps/web/src/App.jsx` | AppShell layout |
| `apps/web/src/components/Sidebar.jsx` | AppShell.Navbar, NavLink, Burger |
| `apps/web/src/components/TopBar.jsx` | AppShell.Header, Group, Badge |
| `apps/web/src/components/Metrics.jsx` | SimpleGrid, Paper, Badge |
| `apps/web/src/components/WorkspaceGrid.jsx` | SimpleGrid, Paper, Tabs, Button |
| `apps/web/src/components/AuthGate.jsx` | Paper, TextInput, PasswordInput, Button, Alert |
| `apps/web/src/components/ClientPickerModal.jsx` | Modal, TextInput |
| `apps/web/src/components/ClientModal.jsx` | Modal |
| `apps/web/src/components/ClientForm.jsx` | TextInput, Select, Button, useForm |
| `apps/web/src/components/UserMaintenance.jsx` | Modal, Table, TextInput, Select, PasswordInput, Button, useForm, notifications |
| `apps/web/src/components/ClientDetail/ClientDetailHeader.jsx` | Badge, Button, Group |
| `apps/web/src/components/ClientDetail/ClientDetailTabs.jsx` | Tabs |
| `apps/web/src/components/CounselorDetail/CounselorDetailHeader.jsx` | Badge, Button, Group |
| `apps/web/src/components/CounselorDetail/CounselorDetailTabs.jsx` | Tabs |
| `apps/web/src/components/CounselorDetail/sharedStyles.js` | Remove (replaced by Mantine) |
| All CounselorDetail tab files (7) | TextInput, Select, Checkbox, Textarea, Button, DateInput, notifications, useForm |
| `apps/web/src/App.css` | Remove replaced rules, keep app-specific layout |
| `apps/web/src/index.css` | Retain CSS variables, remove replaced rules |

## Acceptance Criteria

- App builds successfully with `pnpm --filter web build`
- Login page renders with Mantine inputs and button
- Sidebar opens/closes with Mantine AppShell responsive behavior
- User Maintenance table renders with Mantine Table; modal opens with Mantine Modal
- Counselor detail tabs render with Mantine Tabs
- Create/edit counselor form uses Mantine inputs and useForm validation
- Notifications appear on save success and error (not inline text)
- Date fields in licenses, certifications, employment use Mantine DateInput
- No console errors about missing PostCSS or Mantine provider
- All existing functionality (CRUD, RBAC, navigation) works identically

## Current Status

In progress — on branch `feature/mantine-ui`.
