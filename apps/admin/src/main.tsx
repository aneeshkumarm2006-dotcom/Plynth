import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@plynth/shared/plynth.css';
import './admin.css';
import { AuthProvider } from '@plynth/supabase/auth';
import { initTelemetry } from '@plynth/supabase/telemetry';
import { App } from './App';

initTelemetry({ app: 'admin' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.PROD ? '/admin' : '/'}>
      <AuthProvider portalRole="admin">
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
