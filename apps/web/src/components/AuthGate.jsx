import { useState, useEffect } from 'react';
import { TextInput, PasswordInput, Button, Alert, Text, Paper, Stack, Group, Box, Divider } from '@mantine/core';
import { useI18n } from '../lib/i18nContext.jsx';
import { completePortalPasswordReset, requestPortalPasswordReset } from '../lib/clientApi.js';

export default function AuthGate({ onContinue }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('sign_in');
  const [branding, setBranding] = useState({ practiceName: '', logoUrl: '' });

  useEffect(() => {
    fetch('/api/v1/portal/public-config')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.item) {
          setBranding({
            practiceName: data.item.practiceName ?? '',
            logoUrl: data.item.logoUrl ?? '',
          });
        }
      })
      .catch(() => {});
  }, []);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error,    setError]    = useState(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loading,  setLoading]  = useState(false);

  const portalActions = [
    { href: '/portal?intent=account_signup', label: t('auth.portalCreateAccount') },
    { href: '/portal?intent=care_request', label: t('auth.portalRequestCare') },
    { href: '/portal?intent=scheduling_request', label: t('auth.portalRequestScheduling') },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLockedOut(false);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'request_reset') {
        const data = await requestPortalPasswordReset({ email: email.trim() });
        setNotice(data.notice || 'If the portal account exists, a reset code has been issued.');
        if (data.resetToken) {
          setResetToken(data.resetToken);
          setMode('complete_reset');
        }
        return;
      }

      if (mode === 'complete_reset') {
        if (newPassword !== confirmPassword) {
          setError('The new passwords must match.');
          return;
        }
        await completePortalPasswordReset({
          email: email.trim(),
          token: resetToken.trim(),
          newPassword,
        });
        setNotice('Portal password updated. Sign in with your new password.');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setMode('sign_in');
        return;
      }

      const resp = await fetch('/api/v1/auth/login', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const isLocked = resp.status === 423;
        setLockedOut(isLocked);
        setError(isLocked
          ? t('auth.error.locked')
          : (data.error || t('auth.error.invalidCredentials')));
        return;
      }
      onContinue(data.profile);
    } catch (err) {
      setError(err.message || t('auth.error.unreachable'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.2)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 40,
      }}
    >
      <Paper radius="lg" withBorder shadow="lg" style={{ width: 'min(820px, 96vw)', overflow: 'hidden' }}>
        <Group align="stretch" wrap="nowrap" gap={0}>
          {/* Intro panel */}
          <Box
            p="xl"
            style={{
              flex: '0 0 300px',
              background: 'linear-gradient(160deg, #eef2ff 0%, #f6f8fc 100%)',
              borderRight: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Box mb="md">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.practiceName || t('brand.title')}
                  style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain' }}
                />
              ) : (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect x="15" y="4" width="6" height="28" rx="3" fill="#4f46e5" fillOpacity="0.82"/>
                  <rect x="8" y="11" width="20" height="6" rx="3" fill="#4f46e5" fillOpacity="0.82"/>
                </svg>
              )}
            </Box>
            <Text fz="xs" fw={600} tt="uppercase" c="brand" ls={1} mb={4}>
              {branding.practiceName || t('brand.title')}
            </Text>
            <Text fw={700} fz="xl" mb="sm">{t('auth.welcomeBack')}</Text>
            <Text fz="sm" c="dimmed" mb="md">
              {t('auth.workspaceIntro')}
            </Text>

          </Box>

          {/* Form panel */}
          <Box p="xl" style={{ flex: 1 }}>
            <Group justify="space-between" align="flex-start" mb="lg">
              <Box>
                <Text fw={600} fz="lg">
                  {mode === 'sign_in'
                    ? t('auth.signIn')
                    : mode === 'request_reset'
                      ? t('auth.portalResetTitle')
                      : t('auth.portalResetCompleteTitle')}
                </Text>
                <Text fz="sm" c="dimmed" mt={4}>
                  {mode === 'sign_in'
                    ? 'Sign in with your practice or portal account.'
                    : mode === 'request_reset'
                      ? t('auth.portalResetIntro')
                      : t('auth.portalResetCompleteIntro')}
                </Text>
              </Box>
              {mode === 'sign_in' ? (
                <Button variant="subtle" size="xs" onClick={() => { setMode('request_reset'); setError(null); setNotice(null); }}>
                  {t('auth.portalForgotPassword')}
                </Button>
              ) : (
                <Button variant="subtle" size="xs" onClick={() => { setMode('sign_in'); setError(null); setNotice(null); }}>
                  {t('auth.portalBackToSignIn')}
                </Button>
              )}
            </Group>
            <form onSubmit={handleSubmit} noValidate>
              <Stack gap="sm">
                <TextInput
                  id="loginEmail"
                  label={t('auth.email')}
                  type="email"
                  autoComplete="username"
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                {mode === 'sign_in' ? (
                  <>
                    <PasswordInput
                      id="loginPassword"
                      label={t('auth.password')}
                      autoComplete="current-password"
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <Text fz="xs" c="dimmed">
                      {t('auth.mfaDeferred')}
                    </Text>
                  </>
                ) : null}

                {mode === 'complete_reset' ? (
                  <>
                    <TextInput
                      label={t('auth.portalResetCode')}
                      placeholder={t('auth.portalResetCodePlaceholder')}
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      disabled={loading}
                    />
                    <PasswordInput
                      label={t('auth.portalNewPassword')}
                      autoComplete="new-password"
                      placeholder={t('auth.portalNewPasswordPlaceholder')}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                    />
                    <PasswordInput
                      label={t('auth.portalConfirmPassword')}
                      autoComplete="new-password"
                      placeholder={t('auth.portalConfirmPasswordPlaceholder')}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                    />
                  </>
                ) : null}

                {error && (
                  <Alert color={lockedOut ? 'orange' : 'red'} variant="light" role="alert">
                    {error}
                  </Alert>
                )}

                {notice && (
                  <Alert color="blue" variant="light">
                    {notice}
                  </Alert>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  disabled={
                    mode === 'sign_in'
                      ? (!email || !password)
                      : mode === 'request_reset'
                        ? !email
                        : (!email || !resetToken || !newPassword || !confirmPassword)
                  }
                  fullWidth
                  mt="xs"
                >
                  {mode === 'sign_in'
                    ? t('auth.signIn')
                    : mode === 'request_reset'
                      ? t('auth.portalRequestReset')
                      : t('auth.portalCompleteReset')}
                </Button>

                {mode === 'sign_in' ? (
                  <>
                    <Divider
                      my="sm"
                      label={t('auth.portalAccessDivider')}
                      labelPosition="center"
                    />
                    <Text fz="sm" c="dimmed">
                      {t('auth.portalAccessHelp')}
                    </Text>
                    <Group grow>
                      {portalActions.map((action) => (
                        <Button
                          key={action.href}
                          component="a"
                          href={action.href}
                          variant="default"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Group>
                  </>
                ) : null}
              </Stack>
            </form>
          </Box>
        </Group>
      </Paper>
    </Box>
  );
}
