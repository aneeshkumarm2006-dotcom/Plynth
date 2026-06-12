import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@plynth/shared/plynth.css';
import './admin.css';
import { AuthProvider } from '@plynth/supabase/auth';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.PROD ? '/admin' : '/'}>
      <AuthProvider portalRole="admin">
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
