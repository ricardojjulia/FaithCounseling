import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import App from './App';
import { theme } from './theme';
import { I18nProvider, useI18n } from './lib/i18nContext.jsx';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import './index.css';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'churchcore.colorScheme' });

function AppRuntime() {
  const { locale } = useI18n();

  return (
    <>
      <Notifications position="top-right" />
      <DatesProvider settings={{ firstDayOfWeek: 0, locale }}>
        <App />
      </DatesProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} colorSchemeManager={colorSchemeManager} defaultColorScheme="auto">
      <I18nProvider>
        <AppRuntime />
      </I18nProvider>
    </MantineProvider>
  </React.StrictMode>
);
