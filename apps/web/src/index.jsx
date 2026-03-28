import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import App from './App';
import { theme } from './theme';
import { frontendTelemetry } from './lib/frontendTelemetry.js';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import './index.css';

frontendTelemetry.start();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <DatesProvider settings={{ firstDayOfWeek: 0 }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>
);
