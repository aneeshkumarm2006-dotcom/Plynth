// Public surface of the Plynth telemetry SDK.
//
//   import { initTelemetry, track, captureError } from '@plynth/supabase/telemetry';
//   initTelemetry({ app: 'broker' });
//
// All functions fail silently and never throw into app code. In mock
// mode (no Supabase env) the SDK is a pure no-op.
export {
  initTelemetry,
  track,
  trackTiming,
  trackPageView,
  captureError,
  flush,
  type TelemetryApp,
  type EventSeverity,
  type ErrorContext,
} from './core';
