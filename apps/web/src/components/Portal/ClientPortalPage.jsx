import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  FileInput,
  Group,
  Loader,
  MultiSelect,
  PasswordInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  changeAuthenticatedPassword,
  createPortalAppointmentRequestRecord,
  createPortalDataRightsRequest,
  createPortalUploadRecord,
  fetchPortalDataRights,
  fetchPortalDocuments,
  fetchPortalIntakePackets,
  fetchPortalOverview,
  fetchPortalProfile,
  fetchPortalUploads,
  updatePortalDocumentRecord,
  updatePortalIntakePacket,
  updatePortalProfile,
} from '../../lib/clientApi.js';
import { frontendTelemetry } from '../../lib/frontendTelemetry.js';
import { useSurfaceTelemetry } from '../../lib/useSurfaceTelemetry.js';
import { useI18n } from '../../lib/i18nContext.jsx';

const PORTAL_TAB_SURFACES = {
  dashboard: 'portal.dashboard',
  profile: 'portal.profile',
  appointments: 'portal.appointments',
  documents: 'portal.documents',
  counselor: 'portal.counselor',
  financials: 'portal.giving',
  resources: 'portal.resources',
  dataRights: 'portal.data_rights',
};

const EDUCATION_LEVELS = [
  { value: '', label: 'Not specified' },
  { value: 'high_school', label: 'High school' },
  { value: 'associate', label: 'Associate degree' },
  { value: 'bachelors', label: 'Bachelor degree' },
  { value: 'masters', label: 'Master degree' },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'other', label: 'Other' },
];

const APPOINTMENT_REQUEST_TYPES = [
  { value: 'session', label: 'New session' },
  { value: 'reschedule', label: 'Reschedule an appointment' },
  { value: 'cancel', label: 'Cancel an appointment' },
  { value: 'follow_up', label: 'Request follow-up' },
];

const UPLOAD_CATEGORIES = [
  { value: 'supporting_document', label: 'Supporting document' },
  { value: 'insurance_card', label: 'Insurance card' },
  { value: 'referral_attachment', label: 'Referral attachment' },
  { value: 'other', label: 'Other' },
];

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatCurrencyFromCents(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount / 100 : 0);
}

function formatBytes(value) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function requestStatusColor(status) {
  return {
    requested: 'blue',
    approved: 'green',
    declined: 'red',
    scheduled: 'teal',
  }[status] ?? 'gray';
}

function accountStatusColor(status) {
  return {
    active: 'green',
    invited: 'yellow',
    locked: 'red',
    revoked: 'red',
  }[status] ?? 'gray';
}

function dataRightsStatusColor(status) {
  return {
    completed: 'green',
    under_review: 'blue',
    requested: 'blue',
    restricted: 'red',
    denied: 'red',
  }[status] ?? 'gray';
}

function documentStatusColor(status) {
  return {
    signed: 'green',
    completed: 'green',
    assigned: 'yellow',
    in_progress: 'blue',
  }[status] ?? 'gray';
}

function profileToDraft(profile) {
  return {
    preferredName: profile?.preferredName ?? '',
    contactEmail: profile?.contactEmail ?? '',
    contactPhone: profile?.contactPhone ?? '',
    contactPreferences: {
      preferredContactMethod: profile?.contactPreferences?.preferredContactMethod ?? 'email',
      okToText: Boolean(profile?.contactPreferences?.okToText),
      okToLeaveMessage: profile?.contactPreferences?.okToLeaveMessage !== false,
      enabledChannels: Array.isArray(profile?.contactPreferences?.enabledChannels)
        ? profile.contactPreferences.enabledChannels
        : [],
    },
    profileDetails: {
      demographics: {
        pronouns: profile?.profileDetails?.demographics?.pronouns ?? '',
        maritalStatus: profile?.profileDetails?.demographics?.maritalStatus ?? '',
      },
      education: {
        level: profile?.profileDetails?.education?.level ?? '',
        occupation: profile?.profileDetails?.education?.occupation ?? '',
      },
      affiliationsText: Array.isArray(profile?.profileDetails?.affiliations)
        ? profile.profileDetails.affiliations.join(', ')
        : '',
    },
  };
}

function defaultPortalData() {
  return {
    overview: null,
    profile: null,
    documents: [],
    intakePackets: [],
    uploads: [],
    dataRights: {
      items: [],
      summary: null,
    },
  };
}

function triggerJsonDownload(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = value.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function ClientPortalPage({
  currentUser,
  clients = [],
  initialClientId = null,
  initialTab = 'dashboard',
  onSignOut = async () => {},
}) {
  const { t } = useI18n();
  const userRole = currentUser?.role ?? null;
  const isClientRole = userRole === 'client';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [portalData, setPortalData] = useState(defaultPortalData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileDraft, setProfileDraft] = useState(profileToDraft(null));
  const [savingProfile, setSavingProfile] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [actingDocumentId, setActingDocumentId] = useState('');
  const [actingIntakePacketId, setActingIntakePacketId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDraft, setUploadDraft] = useState({
    category: 'supporting_document',
    notes: '',
  });
  const [exportingData, setExportingData] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionNotes, setDeletionNotes] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [requestDraft, setRequestDraft] = useState({
    requestedType: 'session',
    preferredStartAt: '',
    preferredEndAt: '',
    mode: 'remote',
    notes: '',
  });

  const previewClients = Array.isArray(clients) ? clients : [];
  const effectiveClientId = isClientRole ? null : selectedClientId;
  const activeSurfaceId = PORTAL_TAB_SURFACES[activeTab] ?? 'portal.dashboard';
  const overview = portalData.overview;
  const profile = portalData.profile;

  useEffect(() => {
    setActiveTab(initialTab || 'dashboard');
  }, [initialTab]);

  useEffect(() => {
    if (isClientRole) return;
    if (!initialClientId) return;
    setSelectedClientId(initialClientId);
  }, [initialClientId, isClientRole]);

  useSurfaceTelemetry(activeSurfaceId, {
    surfaceKind: 'tab',
    workflow: 'portal',
  });

  useEffect(() => {
    if (isClientRole) return;
    if (selectedClientId || !previewClients.length) return;
    setSelectedClientId(previewClients[0].id);
  }, [isClientRole, previewClients, selectedClientId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isClientRole && !effectiveClientId) {
        setLoading(false);
        setPortalData(defaultPortalData());
        setProfileDraft(profileToDraft(null));
        setError('');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [overviewPayload, profilePayload, documentsPayload, intakePayload, uploadsPayload, dataRightsPayload] = await Promise.all([
          fetchPortalOverview(effectiveClientId),
          fetchPortalProfile(effectiveClientId),
          fetchPortalDocuments(effectiveClientId),
          fetchPortalIntakePackets(effectiveClientId),
          fetchPortalUploads(effectiveClientId),
          fetchPortalDataRights(effectiveClientId),
        ]);
        if (cancelled) return;
        const nextProfile = profilePayload?.item ?? null;
        setPortalData({
          overview: overviewPayload,
          profile: nextProfile,
          documents: documentsPayload?.items ?? [],
          intakePackets: intakePayload?.items ?? [],
          uploads: uploadsPayload?.items ?? [],
          dataRights: {
            items: dataRightsPayload?.items ?? [],
            summary: dataRightsPayload?.summary ?? null,
          },
        });
        setProfileDraft(profileToDraft(nextProfile));
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Unable to load portal data.');
        frontendTelemetry.trackUiError('portal', 'load_failure', {
          workflow: 'portal',
          statusClass: err.statusClass ?? '5xx',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [effectiveClientId, isClientRole]);

  const contactPreferenceOptions = overview?.settings?.contactPreferenceOptions?.map((value) => ({
    value,
    label: value.replaceAll('_', ' '),
  })) ?? [
    { value: 'email', label: 'email' },
    { value: 'sms', label: 'sms' },
    { value: 'phone', label: 'phone' },
    { value: 'portal_message', label: 'portal message' },
  ];
  const nextAppointment = overview?.upcomingAppointments?.[0] ?? null;
  const pendingForms = overview?.assignedForms?.length ?? 0;
  const pendingDocuments = Array.isArray(overview?.documents)
    ? overview.documents.filter((item) => !['completed', 'signed'].includes(item.status)).length
    : 0;
  const openRequests = Array.isArray(overview?.appointmentRequests)
    ? overview.appointmentRequests.filter((item) => item.status === 'requested').length
    : 0;
  const dataRightsSummary = portalData.dataRights.summary;

  async function reloadPortalData() {
    const [overviewPayload, profilePayload, documentsPayload, intakePayload, uploadsPayload, dataRightsPayload] = await Promise.all([
      fetchPortalOverview(effectiveClientId),
      fetchPortalProfile(effectiveClientId),
      fetchPortalDocuments(effectiveClientId),
      fetchPortalIntakePackets(effectiveClientId),
      fetchPortalUploads(effectiveClientId),
      fetchPortalDataRights(effectiveClientId),
    ]);
    const nextProfile = profilePayload?.item ?? null;
    setPortalData({
      overview: overviewPayload,
      profile: nextProfile,
      documents: documentsPayload?.items ?? [],
      intakePackets: intakePayload?.items ?? [],
      uploads: uploadsPayload?.items ?? [],
      dataRights: {
        items: dataRightsPayload?.items ?? [],
        summary: dataRightsPayload?.summary ?? null,
      },
    });
    setProfileDraft(profileToDraft(nextProfile));
  }

  async function handleProfileSave() {
    setSavingProfile(true);
    try {
      const payload = {
        ...profileDraft,
        profileDetails: {
          demographics: profileDraft.profileDetails.demographics,
          education: profileDraft.profileDetails.education,
          affiliations: profileDraft.profileDetails.affiliationsText
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        },
      };
      const response = await updatePortalProfile(payload, effectiveClientId);
      setPortalData((current) => ({ ...current, profile: response.item }));
      setProfileDraft(profileToDraft(response.item));
      notifications.show({
        title: 'Profile saved',
        message: 'Your portal profile preferences were updated.',
        color: 'green',
      });
      frontendTelemetry.trackAction('portal.profile', 'save_profile', 'success', {
        workflow: 'portal_profile',
      });
    } catch (err) {
      notifications.show({
        title: 'Save failed',
        message: err.message || 'Unable to save portal profile.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.profile', 'save_profile', 'failure', {
        workflow: 'portal_profile',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePortalPasswordChange() {
    if (!passwordDraft.currentPassword || !passwordDraft.newPassword || !passwordDraft.confirmPassword) {
      notifications.show({
        title: 'Missing password fields',
        message: 'Enter your current password and confirm the new one.',
        color: 'yellow',
      });
      frontendTelemetry.trackValidationError('portal.profile', 'portal_password_change', {
        action: 'change_password',
      });
      return;
    }

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      notifications.show({
        title: 'Passwords do not match',
        message: 'The new password and confirmation must match.',
        color: 'yellow',
      });
      frontendTelemetry.trackValidationError('portal.profile', 'portal_password_change', {
        action: 'change_password',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const response = await changeAuthenticatedPassword({
        currentPassword: passwordDraft.currentPassword,
        newPassword: passwordDraft.newPassword,
      });
      notifications.show({
        title: 'Password updated',
        message: 'Sign in again with your new portal password.',
        color: 'green',
      });
      frontendTelemetry.trackAction('portal.profile', 'change_password', 'success', {
        workflow: 'portal_password_change',
      });
      setPasswordDraft({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      if (response?.signOutRequired) {
        await onSignOut();
      }
    } catch (err) {
      notifications.show({
        title: 'Password update failed',
        message: err.message || 'Unable to change the portal password.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.profile', 'change_password', 'failure', {
        workflow: 'portal_password_change',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleAppointmentRequestSubmit() {
    if (!requestDraft.preferredStartAt || !requestDraft.preferredEndAt) {
      frontendTelemetry.trackValidationError('portal.appointments', 'portal_appointment_request', {
        action: 'submit_request',
      });
      notifications.show({
        title: 'Missing times',
        message: 'Choose a preferred start and end time before submitting.',
        color: 'yellow',
      });
      return;
    }

    setSubmittingRequest(true);
    try {
      await createPortalAppointmentRequestRecord(requestDraft, effectiveClientId);
      await reloadPortalData();
      setRequestDraft({
        requestedType: 'session',
        preferredStartAt: '',
        preferredEndAt: '',
        mode: 'remote',
        notes: '',
      });
      notifications.show({
        title: 'Request sent',
        message: 'Your appointment request was sent to the practice.',
        color: 'green',
      });
      frontendTelemetry.trackAction('portal.appointments', 'submit_request', 'success', {
        workflow: 'portal_appointment_request',
      });
    } catch (err) {
      notifications.show({
        title: 'Request failed',
        message: err.message || 'Unable to submit appointment request.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.appointments', 'submit_request', 'failure', {
        workflow: 'portal_appointment_request',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setSubmittingRequest(false);
    }
  }

  async function handleDocumentAction(document) {
    const nextStatus = document.requiresSignature ? 'signed' : 'completed';
    setActingDocumentId(document.id);
    try {
      await updatePortalDocumentRecord({
        assignmentId: document.id,
        status: nextStatus,
      }, effectiveClientId);
      await reloadPortalData();
      notifications.show({
        title: 'Document updated',
        message: `Document marked as ${nextStatus}.`,
        color: 'green',
      });
      frontendTelemetry.trackAction('portal.documents', 'update_document', 'success', {
        workflow: 'portal_documents',
      });
    } catch (err) {
      notifications.show({
        title: 'Update failed',
        message: err.message || 'Unable to update the document.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.documents', 'update_document', 'failure', {
        workflow: 'portal_documents',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setActingDocumentId('');
    }
  }

  async function handleIntakePacketComplete(packet) {
    setActingIntakePacketId(packet.id);
    try {
      await updatePortalIntakePacket({
        intakePacketId: packet.id,
        status: 'completed',
        assignedForms: packet.assignedForms,
      }, effectiveClientId);
      await reloadPortalData();
      notifications.show({
        title: 'Intake packet submitted',
        message: 'The practice has been notified that your packet is complete.',
        color: 'green',
      });
      frontendTelemetry.trackAction('portal.documents', 'complete_intake', 'success', {
        workflow: 'portal_documents',
      });
    } catch (err) {
      notifications.show({
        title: 'Submission failed',
        message: err.message || 'Unable to complete the intake packet.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.documents', 'complete_intake', 'failure', {
        workflow: 'portal_documents',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setActingIntakePacketId('');
    }
  }

  async function handleUploadSubmit() {
    if (!uploadFile) {
      notifications.show({
        title: 'Choose a file',
        message: 'Select a file before uploading.',
        color: 'yellow',
      });
      frontendTelemetry.trackValidationError('portal.documents', 'portal_upload', {
        action: 'upload_file',
      });
      return;
    }

    if (uploadFile.size > 2 * 1024 * 1024) {
      notifications.show({
        title: 'File too large',
        message: 'Portal uploads must be 2 MB or smaller.',
        color: 'red',
      });
      frontendTelemetry.trackValidationError('portal.documents', 'portal_upload', {
        action: 'upload_file',
      });
      return;
    }

    setUploading(true);
    try {
      const contentBase64 = await fileToBase64(uploadFile);
      await createPortalUploadRecord({
        category: uploadDraft.category,
        notes: uploadDraft.notes,
        fileName: uploadFile.name,
        mimeType: uploadFile.type || 'application/octet-stream',
        contentBase64,
      }, effectiveClientId);
      await reloadPortalData();
      setUploadFile(null);
      setUploadDraft({ category: 'supporting_document', notes: '' });
      notifications.show({
        title: 'Upload complete',
        message: 'Your file was added to the portal for staff review.',
        color: 'green',
      });
      frontendTelemetry.trackAction('portal.documents', 'upload_file', 'success', {
        workflow: 'portal_upload',
      });
    } catch (err) {
      notifications.show({
        title: 'Upload failed',
        message: err.message || 'Unable to upload the file.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.documents', 'upload_file', 'failure', {
        workflow: 'portal_upload',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleExportData() {
    setExportingData(true);
    try {
      const response = await createPortalDataRightsRequest({
        requestType: 'export_data',
      }, effectiveClientId);
      triggerJsonDownload(response.fileName || 'faithcounseling-export.json', response.exportPackage);
      await reloadPortalData();
      notifications.show({
        title: 'Export ready',
        message: 'A JSON export of your data has been downloaded.',
        color: 'green',
      });
      frontendTelemetry.trackAction('portal.data_rights', 'export_data', 'success', {
        workflow: 'portal_data_rights',
      });
    } catch (err) {
      notifications.show({
        title: 'Export failed',
        message: err.message || 'Unable to create your data export.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.data_rights', 'export_data', 'failure', {
        workflow: 'portal_data_rights',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setExportingData(false);
    }
  }

  async function handleDeletionRequest() {
    setRequestingDeletion(true);
    try {
      const response = await createPortalDataRightsRequest({
        requestType: 'delete_request',
        notes: deletionNotes,
      }, effectiveClientId);
      await reloadPortalData();
      notifications.show({
        title: 'Deletion request recorded',
        message: response.notice || 'The practice will review your request.',
        color: response.item?.status === 'restricted' ? 'yellow' : 'green',
      });
      setDeletionNotes('');
      frontendTelemetry.trackAction('portal.data_rights', 'request_deletion', 'success', {
        workflow: 'portal_data_rights',
      });
    } catch (err) {
      notifications.show({
        title: 'Request failed',
        message: err.message || 'Unable to create the deletion request.',
        color: 'red',
      });
      frontendTelemetry.trackAction('portal.data_rights', 'request_deletion', 'failure', {
        workflow: 'portal_data_rights',
        statusClass: err.statusClass ?? '4xx',
      });
    } finally {
      setRequestingDeletion(false);
    }
  }

  return (
    <Stack p="md" gap="md">
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={2}>Client Portal</Title>
          <Text c="dimmed" size="sm">
            {overview?.settings?.practiceName || 'FaithCounseling'} portal overview, profile preferences, secure uploads, and data-rights self-service.
          </Text>
        </Box>
        {!isClientRole ? (
          <Select
            label="Preview client"
            placeholder="Select a client"
            value={selectedClientId}
            onChange={setSelectedClientId}
            data={previewClients.map((client) => ({
              value: client.id,
              label: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.id,
            }))}
            searchable
            maw={320}
          />
        ) : null}
      </Group>

      {!isClientRole ? (
        <Alert color="blue" variant="light" title={t('portal.staffPreviewTitle')}>
          {t('portal.staffPreviewBody')}
        </Alert>
      ) : null}

      {loading ? (
        <Paper withBorder radius="md" p="xl">
          <Group justify="center" gap="sm">
            <Loader size="sm" />
            <Text>{t('portal.loading')}</Text>
          </Group>
        </Paper>
      ) : error ? (
        <Alert color="red" title={t('portal.loadErrorTitle')}>{error}</Alert>
      ) : !isClientRole && !effectiveClientId ? (
        <Alert color="yellow" title={t('portal.clientRequiredTitle')}>
          {t('portal.clientRequiredBody')}
        </Alert>
      ) : (
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'dashboard')}>
          <Tabs.List>
            <Tabs.Tab value="dashboard">{t('portal.tab.dashboard')}</Tabs.Tab>
            <Tabs.Tab value="profile">{t('portal.tab.profile')}</Tabs.Tab>
            <Tabs.Tab value="appointments">{t('portal.tab.appointments')}</Tabs.Tab>
            <Tabs.Tab value="documents">{t('portal.tab.documents')}</Tabs.Tab>
            <Tabs.Tab value="counselor">{t('portal.tab.counselor')}</Tabs.Tab>
            <Tabs.Tab value="financials">{t('portal.tab.giving')}</Tabs.Tab>
            <Tabs.Tab value="resources">{t('portal.tab.resources')}</Tabs.Tab>
            <Tabs.Tab value="dataRights">{t('portal.tab.dataRights')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="dashboard" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.dashboard.nextAppointment')}</Text>
                  <Text fw={700} mt={8}>{nextAppointment ? formatDateTime(nextAppointment.startsAt) : t('portal.dashboard.noAppointment')}</Text>
                  <Text size="sm" c="dimmed" mt={4}>
                    {nextAppointment ? `${nextAppointment.counselorName || t('portal.tab.counselor')} • ${nextAppointment.locationName || 'TBD'}` : t('portal.dashboard.requestBelow')}
                  </Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.dashboard.pendingForms')}</Text>
                  <Text fw={700} mt={8}>{pendingForms}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Assigned forms waiting for completion.</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.dashboard.pendingDocuments')}</Text>
                  <Text fw={700} mt={8}>{pendingDocuments}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Documents that still need review or signature.</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    {t('portal.dashboard.suggestedOffering')}
                  </Text>
                  <Text fw={700} mt={8}>{formatCurrencyFromCents(overview?.settings?.suggestedOfferingCents ?? 0)}</Text>
                  <Text size="sm" c="dimmed" mt={4}>{openRequests} open appointment request(s).</Text>
                </Card>
              </SimpleGrid>

              {overview?.assignedCounselor ? (
                <Paper withBorder radius="md" p="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.dashboard.assignedCounselor')}</Text>
                      <Title order={4} mt={6}>
                        {overview.assignedCounselor.firstName} {overview.assignedCounselor.lastName}
                      </Title>
                      <Text size="sm" c="dimmed" mt={4}>
                        {(overview.assignedCounselor.role || 'counselor').replaceAll('_', ' ')}
                      </Text>
                    </Box>
                    {overview.account?.status ? (
                      <Badge color={accountStatusColor(overview.account.status)} variant="light">
                        {overview.account.status}
                      </Badge>
                    ) : null}
                  </Group>
                  {overview.assignedCounselor.bio ? (
                    <Text size="sm" mt="sm">{overview.assignedCounselor.bio}</Text>
                  ) : null}
                </Paper>
              ) : null}

              <SimpleGrid cols={{ base: 1, lg: 2 }}>
                <Paper withBorder radius="md" p="md">
                  <Title order={4}>{t('portal.dashboard.upcomingAppointments')}</Title>
                  <Stack gap="sm" mt="md">
                    {overview?.upcomingAppointments?.length ? overview.upcomingAppointments.slice(0, 4).map((appointment) => (
                      <Paper key={appointment.id} withBorder radius="sm" p="sm">
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={600}>{formatDateTime(appointment.startsAt)}</Text>
                            <Text size="sm" c="dimmed">
                              {appointment.appointmentType?.replaceAll('_', ' ') || 'session'} with {appointment.counselorName || 'Counselor'}
                            </Text>
                          </Box>
                          <Badge variant="light">{appointment.status}</Badge>
                        </Group>
                      </Paper>
                    )) : (
                      <Text c="dimmed" size="sm">No appointments are on the schedule yet.</Text>
                    )}
                  </Stack>
                </Paper>

                <Paper withBorder radius="md" p="md">
                  <Title order={4}>{t('portal.dashboard.helpfulResources')}</Title>
                  <Stack gap="sm" mt="md">
                    {overview?.resources?.length ? overview.resources.slice(0, 4).map((resource) => (
                      <Paper key={resource.id} withBorder radius="sm" p="sm">
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={600}>{resource.title}</Text>
                            <Text size="sm" c="dimmed" mt={4}>{resource.content}</Text>
                          </Box>
                          <Badge variant="light">{resource.resourceType}</Badge>
                        </Group>
                      </Paper>
                    )) : (
                      <Text c="dimmed" size="sm">No portal resources have been published yet.</Text>
                    )}
                  </Stack>
                </Paper>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="profile" pt="md">
            <Stack gap="md">
              <Paper withBorder radius="md" p="md">
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <TextInput
                      label={t('portal.profile.preferredName')}
                      value={profileDraft.preferredName}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, preferredName: event.currentTarget.value }))}
                    />
                    <Select
                      label={t('portal.profile.preferredContactMethod')}
                      value={profileDraft.contactPreferences.preferredContactMethod}
                      onChange={(value) => setProfileDraft((current) => ({
                        ...current,
                        contactPreferences: {
                          ...current.contactPreferences,
                          preferredContactMethod: value || 'email',
                        },
                      }))}
                      data={contactPreferenceOptions}
                    />
                    <TextInput
                      label={t('portal.profile.contactEmail')}
                      type="email"
                      value={profileDraft.contactEmail}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, contactEmail: event.currentTarget.value }))}
                    />
                    <TextInput
                      label={t('portal.profile.contactPhone')}
                      value={profileDraft.contactPhone}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, contactPhone: event.currentTarget.value }))}
                    />
                    <MultiSelect
                      label={t('portal.profile.enabledChannels')}
                      data={contactPreferenceOptions}
                      value={profileDraft.contactPreferences.enabledChannels}
                      onChange={(value) => setProfileDraft((current) => ({
                        ...current,
                        contactPreferences: {
                          ...current.contactPreferences,
                          enabledChannels: value,
                        },
                      }))}
                    />
                    <TextInput
                      label={t('portal.profile.pronouns')}
                      value={profileDraft.profileDetails.demographics.pronouns}
                      onChange={(event) => setProfileDraft((current) => ({
                        ...current,
                        profileDetails: {
                          ...current.profileDetails,
                          demographics: {
                            ...current.profileDetails.demographics,
                            pronouns: event.currentTarget.value,
                          },
                        },
                      }))}
                    />
                    <TextInput
                      label={t('portal.profile.maritalStatus')}
                      value={profileDraft.profileDetails.demographics.maritalStatus}
                      onChange={(event) => setProfileDraft((current) => ({
                        ...current,
                        profileDetails: {
                          ...current.profileDetails,
                          demographics: {
                            ...current.profileDetails.demographics,
                            maritalStatus: event.currentTarget.value,
                          },
                        },
                      }))}
                    />
                    <Select
                      label={t('portal.profile.educationLevel')}
                      value={profileDraft.profileDetails.education.level}
                      onChange={(value) => setProfileDraft((current) => ({
                        ...current,
                        profileDetails: {
                          ...current.profileDetails,
                          education: {
                            ...current.profileDetails.education,
                            level: value || '',
                          },
                        },
                      }))}
                      data={EDUCATION_LEVELS}
                    />
                    <TextInput
                      label={t('portal.profile.occupation')}
                      value={profileDraft.profileDetails.education.occupation}
                      onChange={(event) => setProfileDraft((current) => ({
                        ...current,
                        profileDetails: {
                          ...current.profileDetails,
                          education: {
                            ...current.profileDetails.education,
                            occupation: event.currentTarget.value,
                          },
                        },
                      }))}
                    />
                  </SimpleGrid>

                  <Textarea
                    label={t('portal.profile.affiliations')}
                    description={t('portal.profile.affiliationsHelp')}
                    minRows={3}
                    value={profileDraft.profileDetails.affiliationsText}
                    onChange={(event) => setProfileDraft((current) => ({
                      ...current,
                      profileDetails: {
                        ...current.profileDetails,
                        affiliationsText: event.currentTarget.value,
                      },
                    }))}
                  />

                  <Group justify="flex-end">
                    <Button loading={savingProfile} onClick={handleProfileSave}>
                      {t('portal.profile.save')}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              {isClientRole ? (
                <Paper withBorder radius="md" p="md">
                  <Stack gap="md">
                    <Box>
                      <Title order={4}>{t('portal.profile.accessTitle')}</Title>
                      <Text c="dimmed" size="sm" mt={6}>
                        {t('portal.profile.accessBody')}
                      </Text>
                    </Box>
                    <PasswordInput
                      label={t('portal.profile.currentPassword')}
                      autoComplete="current-password"
                      value={passwordDraft.currentPassword}
                      onChange={(event) => setPasswordDraft((current) => ({ ...current, currentPassword: event.currentTarget.value }))}
                    />
                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                      <PasswordInput
                        label={t('portal.profile.newPassword')}
                        autoComplete="new-password"
                        value={passwordDraft.newPassword}
                        onChange={(event) => setPasswordDraft((current) => ({ ...current, newPassword: event.currentTarget.value }))}
                      />
                      <PasswordInput
                        label={t('portal.profile.confirmPassword')}
                        autoComplete="new-password"
                        value={passwordDraft.confirmPassword}
                        onChange={(event) => setPasswordDraft((current) => ({ ...current, confirmPassword: event.currentTarget.value }))}
                      />
                    </SimpleGrid>
                    <Group justify="flex-end">
                      <Button loading={changingPassword} onClick={handlePortalPasswordChange}>
                        {t('portal.profile.changePassword')}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              ) : null}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="appointments" pt="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }}>
              <Paper withBorder radius="md" p="md">
                <Title order={4}>{t('portal.appointments.requestTitle')}</Title>
                <Stack gap="md" mt="md">
                  <Select
                    label={t('portal.appointments.requestType')}
                    value={requestDraft.requestedType}
                    onChange={(value) => setRequestDraft((current) => ({ ...current, requestedType: value || 'session' }))}
                    data={APPOINTMENT_REQUEST_TYPES}
                  />
                  <SimpleGrid cols={{ base: 1, md: 2 }}>
                    <TextInput
                      label={t('portal.appointments.preferredStart')}
                      type="datetime-local"
                      value={requestDraft.preferredStartAt}
                      onChange={(event) => setRequestDraft((current) => ({ ...current, preferredStartAt: event.currentTarget.value }))}
                    />
                    <TextInput
                      label={t('portal.appointments.preferredEnd')}
                      type="datetime-local"
                      value={requestDraft.preferredEndAt}
                      onChange={(event) => setRequestDraft((current) => ({ ...current, preferredEndAt: event.currentTarget.value }))}
                    />
                  </SimpleGrid>
                  <Select
                    label={t('portal.appointments.visitMode')}
                    value={requestDraft.mode}
                    onChange={(value) => setRequestDraft((current) => ({ ...current, mode: value || 'remote' }))}
                    data={[
                      { value: 'remote', label: 'Remote' },
                      { value: 'in_person', label: 'In person' },
                    ]}
                  />
                  <Textarea
                    label={t('portal.appointments.notes')}
                    minRows={3}
                    value={requestDraft.notes}
                    onChange={(event) => setRequestDraft((current) => ({ ...current, notes: event.currentTarget.value }))}
                  />
                  <Group justify="flex-end">
                    <Button loading={submittingRequest} onClick={handleAppointmentRequestSubmit}>
                      {t('portal.appointments.submit')}
                    </Button>
                  </Group>
                </Stack>
              </Paper>

              <Paper withBorder radius="md" p="md">
                <Title order={4}>{t('portal.appointments.recentTitle')}</Title>
                <Stack gap="sm" mt="md">
                  {overview?.appointmentRequests?.length ? overview.appointmentRequests.map((item) => (
                    <Paper key={item.id} withBorder radius="sm" p="sm">
                      <Group justify="space-between" align="flex-start">
                        <Box>
                          <Text fw={600}>{item.requestedType?.replaceAll('_', ' ') || 'session'}</Text>
                          <Text size="sm" c="dimmed">
                            {formatDateTime(item.preferredStartAt)} to {formatDateTime(item.preferredEndAt)}
                          </Text>
                          {item.notes ? <Text size="sm" mt={6}>{item.notes}</Text> : null}
                        </Box>
                        <Badge color={requestStatusColor(item.status)} variant="light">
                          {item.status}
                        </Badge>
                      </Group>
                    </Paper>
                  )) : (
                    <Text c="dimmed" size="sm">No appointment requests have been submitted yet.</Text>
                  )}
                </Stack>
              </Paper>
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="documents" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Assigned forms</Text>
                  <Text fw={700} mt={8}>{overview?.assignedForms?.length ?? 0}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Outstanding form tasks for your care team.</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Portal documents</Text>
                  <Text fw={700} mt={8}>{portalData.documents.length}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Consent packets and shared documents.</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Secure uploads</Text>
                  <Text fw={700} mt={8}>{portalData.uploads.length}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Files you have submitted for staff review.</Text>
                </Card>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, lg: 2 }}>
                <Paper withBorder radius="md" p="md">
                  <Title order={4}>{t('portal.documents.assignedFormsTitle')}</Title>
                  <Stack gap="sm" mt="md">
                    {overview?.assignedForms?.length ? overview.assignedForms.map((item) => (
                      <Paper key={item.id} withBorder radius="sm" p="sm">
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={600}>{item.formTitle || item.formKey}</Text>
                            <Text size="sm" c="dimmed">
                              {(item.assignmentType || 'assigned').replaceAll('_', ' ')}
                              {item.dueAt ? ` • due ${formatDate(item.dueAt)}` : ''}
                            </Text>
                            {item.notes ? <Text size="sm" mt={6}>{item.notes}</Text> : null}
                          </Box>
                          <Badge variant="light">{item.status}</Badge>
                        </Group>
                      </Paper>
                    )) : (
                      <Text c="dimmed" size="sm">No forms are waiting right now.</Text>
                    )}

                    {portalData.intakePackets.map((packet) => (
                      <Paper key={packet.id} withBorder radius="sm" p="sm">
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={600}>Intake packet</Text>
                            <Text size="sm" c="dimmed">
                              {packet.assignedForms?.length ? packet.assignedForms.join(', ') : 'No forms listed'}
                            </Text>
                            <Text size="sm" c="dimmed" mt={4}>
                              Status: {packet.status}
                              {packet.submittedAt ? ` • submitted ${formatDateTime(packet.submittedAt)}` : ''}
                            </Text>
                          </Box>
                          {!['completed', 'reviewed'].includes(packet.status) ? (
                            <Button
                              size="xs"
                              loading={actingIntakePacketId === packet.id}
                              onClick={() => handleIntakePacketComplete(packet)}
                            >
                              Mark complete
                            </Button>
                          ) : (
                            <Badge color="green" variant="light">{packet.status}</Badge>
                          )}
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>

                <Paper withBorder radius="md" p="md">
                  <Title order={4}>{t('portal.documents.portalDocumentsTitle')}</Title>
                  <Stack gap="sm" mt="md">
                    {portalData.documents.length ? portalData.documents.map((document) => (
                      <Paper key={document.id} withBorder radius="sm" p="sm">
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={600}>{document.templateTitle || document.templateId || 'Document'}</Text>
                            <Text size="sm" c="dimmed">
                              {document.requiresSignature ? 'Signature required' : 'Review required'}
                              {document.completedAt ? ` • completed ${formatDateTime(document.completedAt)}` : ''}
                            </Text>
                          </Box>
                          {!['completed', 'signed'].includes(document.status) ? (
                            <Button
                              size="xs"
                              loading={actingDocumentId === document.id}
                              onClick={() => handleDocumentAction(document)}
                            >
                              {document.requiresSignature ? t('portal.documents.signDocument') : t('portal.documents.markComplete')}
                            </Button>
                          ) : (
                            <Badge color={documentStatusColor(document.status)} variant="light">
                              {document.status}
                            </Badge>
                          )}
                        </Group>
                      </Paper>
                    )) : (
                      <Text c="dimmed" size="sm">No portal documents are currently assigned.</Text>
                    )}
                  </Stack>
                </Paper>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, lg: 2 }}>
                <Paper withBorder radius="md" p="md">
                  <Title order={4}>{t('portal.documents.uploadTitle')}</Title>
                  <Stack gap="md" mt="md">
                    <FileInput
                      label="Choose file"
                      placeholder="Select a file"
                      value={uploadFile}
                      onChange={setUploadFile}
                      clearable
                    />
                    <Select
                      label="Upload category"
                      value={uploadDraft.category}
                      onChange={(value) => setUploadDraft((current) => ({ ...current, category: value || 'supporting_document' }))}
                      data={UPLOAD_CATEGORIES}
                    />
                    <Textarea
                      label="Notes"
                      minRows={3}
                      value={uploadDraft.notes}
                      onChange={(event) => setUploadDraft((current) => ({ ...current, notes: event.currentTarget.value }))}
                    />
                    <Group justify="flex-end">
                      <Button loading={uploading} onClick={handleUploadSubmit}>
                        {t('portal.documents.uploadFile')}
                      </Button>
                    </Group>
                  </Stack>
                </Paper>

                <Paper withBorder radius="md" p="md">
                  <Title order={4}>{t('portal.documents.uploadHistoryTitle')}</Title>
                  <Stack gap="sm" mt="md">
                    {portalData.uploads.length ? portalData.uploads.map((upload) => (
                      <Paper key={upload.id} withBorder radius="sm" p="sm">
                        <Group justify="space-between" align="flex-start">
                          <Box>
                            <Text fw={600}>{upload.fileName}</Text>
                            <Text size="sm" c="dimmed">
                              {upload.category?.replaceAll('_', ' ')} • {formatBytes(upload.sizeBytes)} • {formatDateTime(upload.createdAt)}
                            </Text>
                            {upload.notes ? <Text size="sm" mt={6}>{upload.notes}</Text> : null}
                          </Box>
                          <Badge variant="light">{upload.status}</Badge>
                        </Group>
                      </Paper>
                    )) : (
                      <Text c="dimmed" size="sm">No uploads have been submitted yet.</Text>
                    )}
                  </Stack>
                </Paper>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="counselor" pt="md">
            <Stack gap="md">
              {overview?.assignedCounselor ? (
                <Paper withBorder radius="md" p="md">
                  <Group justify="space-between" align="flex-start">
                    <Box>
                      <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Assigned counselor</Text>
                      <Title order={4} mt={6}>
                        {overview.assignedCounselor.firstName} {overview.assignedCounselor.lastName}
                      </Title>
                      <Text size="sm" c="dimmed" mt={4}>
                        {(overview.assignedCounselor.role || 'counselor').replaceAll('_', ' ')}
                      </Text>
                    </Box>
                    {overview.account?.status ? (
                      <Badge color={accountStatusColor(overview.account.status)} variant="light">
                        {overview.account.status}
                      </Badge>
                    ) : null}
                  </Group>
                  {overview.assignedCounselor.bio ? (
                    <Text size="sm" mt="sm">{overview.assignedCounselor.bio}</Text>
                  ) : (
                    <Text size="sm" mt="sm" c="dimmed">Your practice has not published a counselor bio yet.</Text>
                  )}
                </Paper>
              ) : (
                <Alert color="yellow" title={t('portal.counselor.noAssignedTitle')}>
                  {t('portal.counselor.noAssignedBody')}
                </Alert>
              )}

              <Paper withBorder radius="md" p="md">
                <Title order={4}>{t('portal.counselor.directoryTitle')}</Title>
                <Text c="dimmed" size="sm" mt={6}>
                  {overview?.settings?.showPublicCounselorDirectory
                    ? 'Available counselors published by this practice.'
                    : 'The practice has limited directory visibility. You can still view your assigned counselor above.'}
                </Text>
                <Stack gap="sm" mt="md">
                  {overview?.counselorDirectory?.length ? overview.counselorDirectory.map((counselor) => (
                    <Paper key={counselor.staffId} withBorder radius="sm" p="sm">
                      <Group justify="space-between" align="flex-start">
                        <Box>
                          <Text fw={600}>{counselor.firstName} {counselor.lastName}</Text>
                          <Text size="sm" c="dimmed">
                            {(counselor.role || 'counselor').replaceAll('_', ' ')}
                            {counselor.licenseType ? ` • ${counselor.licenseType.toUpperCase()}` : ''}
                          </Text>
                          {counselor.bio ? <Text size="sm" mt={6}>{counselor.bio}</Text> : null}
                        </Box>
                        <Badge variant="light">
                          {(counselor.supervisionStatus || 'not_required').replaceAll('_', ' ')}
                        </Badge>
                      </Group>
                    </Paper>
                  )) : (
                    <Text c="dimmed" size="sm">No additional counselor directory entries are published right now.</Text>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="financials" pt="md">
            <Stack gap="md">
              <Paper withBorder radius="md" p="md">
                <Text c="dimmed" size="sm">{overview?.settings?.offeringMinistryNote || t('portal.giving.ministryNote')}</Text>
                <Text fw={600} mt={4}>{t('portal.giving.suggestedPerSession', { amount: formatCurrencyFromCents(overview?.settings?.suggestedOfferingCents ?? 0) })}</Text>
              </Paper>
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.giving.suggestedOffering')}</Text>
                  <Text fw={700} mt={8}>{formatCurrencyFromCents(overview?.settings?.suggestedOfferingCents ?? 0)}</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.giving.receivedOfferings')}</Text>
                  <Text fw={700} mt={8}>{formatCurrency(overview?.balances?.paid ?? 0)}</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.giving.totalSuggested')}</Text>
                  <Text fw={700} mt={8}>{formatCurrency(overview?.balances?.total ?? 0)}</Text>
                </Card>
              </SimpleGrid>

              <Paper withBorder radius="md" p="md">
                <Title order={4}>{t('portal.giving.recentOfferingsTitle')}</Title>
                <Stack gap="sm" mt="md">
                  {overview?.paymentHistory?.length ? overview.paymentHistory.map((payment) => (
                    <Paper key={payment.id} withBorder radius="sm" p="sm">
                      <Group justify="space-between" align="flex-start">
                        <Box>
                          <Text fw={600}>{formatCurrencyFromCents(payment.amount ?? payment.amountCents ?? 0)}</Text>
                          <Text size="sm" c="dimmed">
                            {formatDateTime(payment.receivedAt || payment.paidAt)} • {(payment.paymentMethod || payment.method || 'offering').replaceAll('_', ' ')}
                          </Text>
                          {payment.reference ? <Text size="sm" mt={6}>Reference: {payment.reference}</Text> : null}
                        </Box>
                        <Badge variant="light">received</Badge>
                      </Group>
                    </Paper>
                  )) : (
                    <Text c="dimmed" size="sm">No offerings have been recorded yet.</Text>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="resources" pt="md">
            <Paper withBorder radius="md" p="md">
              <Title order={4}>{t('portal.resources.title')}</Title>
              <Text c="dimmed" size="sm" mt={6}>
                {t('portal.resources.body')}
              </Text>
              <Stack gap="sm" mt="md">
                {overview?.resources?.length ? overview.resources.map((resource) => (
                  <Paper key={resource.id} withBorder radius="sm" p="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Text fw={600}>{resource.title}</Text>
                        <Text size="sm" c="dimmed" mt={4}>{resource.content}</Text>
                        {resource.publishedAt ? (
                          <Text size="xs" c="dimmed" mt={6}>Published {formatDate(resource.publishedAt)}</Text>
                        ) : null}
                      </Box>
                      <Badge variant="light">{resource.resourceType}</Badge>
                    </Group>
                  </Paper>
                )) : (
                  <Text c="dimmed" size="sm">No client-facing resources are published yet.</Text>
                )}
              </Stack>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="dataRights" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.dataRights.retention')}</Text>
                  <Text fw={700} mt={8}>{dataRightsSummary?.retentionPolicy?.clinicalRecordsSchedule?.replaceAll('_', ' ') || '10 years'}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Clinical records may require retention before deletion.</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.dataRights.legalHold')}</Text>
                  <Text fw={700} mt={8}>{dataRightsSummary?.retentionPolicy?.legalHoldEnabled ? 'Enabled' : 'Not enabled'}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Deletion is restricted while legal hold is active.</Text>
                </Card>
                <Card withBorder radius="md" p="md">
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{t('portal.dataRights.currentRequests')}</Text>
                  <Text fw={700} mt={8}>{portalData.dataRights.items.length}</Text>
                  <Text size="sm" c="dimmed" mt={4}>Export and deletion requests on file.</Text>
                </Card>
              </SimpleGrid>

              <Paper withBorder radius="md" p="md">
                <Title order={4}>{t('portal.dataRights.exportTitle')}</Title>
                <Text c="dimmed" size="sm" mt={6}>
                  Download a JSON export of your client and portal records, including appointments, profile data, forms, portal messages, uploads, and balances.
                </Text>
                <SimpleGrid cols={{ base: 2, md: 5 }} mt="md">
                  {Object.entries(dataRightsSummary?.counts ?? {}).map(([key, value]) => (
                    <Card key={key} withBorder radius="sm" p="sm">
                      <Text c="dimmed" size="xs" tt="uppercase" fw={700}>{key.replaceAll(/([A-Z])/g, ' $1').replaceAll('_', ' ')}</Text>
                      <Text fw={700} mt={6}>{value}</Text>
                    </Card>
                  ))}
                </SimpleGrid>
                <Group justify="flex-end" mt="md">
                  <Button loading={exportingData} onClick={handleExportData}>
                    {t('portal.dataRights.exportButton')}
                  </Button>
                </Group>
              </Paper>

              <Paper withBorder radius="md" p="md">
                <Title order={4}>{t('portal.dataRights.deletionTitle')}</Title>
                <Text c="dimmed" size="sm" mt={6}>
                  Deletion requests are policy-aware. Clinical, billing, audit, and legal retention rules may delay or restrict full erasure.
                </Text>
                <Textarea
                  mt="md"
                  label="Reason or additional notes"
                  minRows={3}
                  value={deletionNotes}
                  onChange={(event) => setDeletionNotes(event.currentTarget.value)}
                />
                <Group justify="flex-end" mt="md">
                  <Button color="red" loading={requestingDeletion} onClick={handleDeletionRequest}>
                    {t('portal.dataRights.deleteButton')}
                  </Button>
                </Group>
              </Paper>

              <Paper withBorder radius="md" p="md">
                <Title order={4}>Request history</Title>
                <Stack gap="sm" mt="md">
                  {portalData.dataRights.items.length ? portalData.dataRights.items.map((item) => (
                    <Paper key={item.id} withBorder radius="sm" p="sm">
                      <Group justify="space-between" align="flex-start">
                        <Box>
                          <Text fw={600}>{item.requestType?.replaceAll('_', ' ')}</Text>
                          <Text size="sm" c="dimmed">
                            Requested {formatDateTime(item.requestedAt)}
                            {item.resolvedAt ? ` • resolved ${formatDateTime(item.resolvedAt)}` : ''}
                            {item.reasonCode ? ` • ${item.reasonCode.replaceAll('_', ' ')}` : ''}
                          </Text>
                          {item.notes ? <Text size="sm" mt={6}>{item.notes}</Text> : null}
                        </Box>
                        <Badge color={dataRightsStatusColor(item.status)} variant="light">
                          {item.status}
                        </Badge>
                      </Group>
                    </Paper>
                  )) : (
                    <Text c="dimmed" size="sm">No export or deletion requests have been made yet.</Text>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      )}
    </Stack>
  );
}
