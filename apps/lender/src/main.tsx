import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@plynth/shared/plynth.css';
import { AuthProvider } from '@plynth/supabase/auth';
import { initTelemetry } from '@plynth/supabase/telemetry';
import { App } from './App';

initTelemetry({ app: 'lender' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      basename={import.meta.env.PROD ? '/lender' : '/'}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider portalRole="lender">
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
