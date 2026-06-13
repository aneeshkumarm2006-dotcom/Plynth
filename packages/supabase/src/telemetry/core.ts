// Telemetry SDK core — batched, non-blocking, fails silently.
//
// The entire surface is wrapped so it can NEVER throw into app code:
// every public function is try/catch → no-op on error, and a flush
// failure is swallowed (the queue is cleared regardless — telemetry
// loss is acceptable, app stability is not).
//
// Transport: one supabase.rpc('ingest_telemetry', { p_events, p_errors })
// per flush. supabase-js attaches the caller's auth token, and the
// RPC pins user_id := auth.uid() server-side.
//
// Mock mode (!hasSupabase): init installs a pure no-op path — no
// network, no queue flush — so the mock-mode test suite stays green.

import { supabase, hasSupabase } from '../client';
import { getSessionId, currentRoute, sanitizeProps } from './session';

export type TelemetryApp = 'broker' | 'lender' | 'admin';
export type EventSeverity = 'info' | 'warning' | 'error' | 'fatal';

export interface ErrorContext {
  source?: 'unhandled' | 'rpc' | 'supabase' | 'react_boundary';
  severity?: EventSeverity;
  route?: string;
  context?: Record<string, unknown>;
}

interface QueuedEvent {
  session_id: string;
  app: TelemetryApp;
  event_type: string;
  route?: string;
  duration_ms?: number;
  props?: Record<string, unknown>;
}

interface QueuedError {
  session_id: string;
  app: TelemetryApp;
  severity: EventSeverity;
  source: string;
  name?: string;
  message: string;
  stack?: string;
  route?: string;
  context?: Record<string, unknown>;
}

const FLUSH_AT = 20; // flush once the queue reaches this many items
const FLUSH_MS = 5000; // …or this often, whichever comes first
const MAX_QUEUE = 200; // hard cap; drop oldest on overflow

let app: TelemetryApp | null = null;
let enabled = false; // true only when initialized AND live (not mock)
let sampleRate = 1;
let eventQueue: QueuedEvent[] = [];
let errorQueue: QueuedError[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function live(): boolean {
  return enabled && app !== null && hasSupabase && !!supabase;
}

function schedule() {
  if (eventQueue.length + errorQueue.length >= FLUSH_AT) {
    void flush();
  }
}

function push<T>(queue: T[], item: T) {
  queue.push(item);
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
}

export function track(eventType: string, props?: Record<string, unknown>): void {
  try {
    if (!live()) return;
    push(eventQueue, {
      session_id: getSessionId(),
      app: app!,
      event_type: eventType,
      route: currentRoute(),
      props: sanitizeProps(props),
    });
    schedule();
  } catch {
    /* never throw into app code */
  }
}

export function trackTiming(eventType: string, durationMs: number, props?: Record<string, unknown>): void {
  try {
    if (!live()) return;
    push(eventQueue, {
      session_id: getSessionId(),
      app: app!,
      event_type: eventType,
      route: currentRoute(),
      duration_ms: Number.isFinite(durationMs) ? Math.round(durationMs) : undefined,
      props: sanitizeProps(props),
    });
    schedule();
  } catch {
    /* ignore */
  }
}

export function trackPageView(route?: string): void {
  try {
    if (!live()) return;
    push(eventQueue, {
      session_id: getSessionId(),
      app: app!,
      event_type: 'page_view',
      route: route ?? currentRoute(),
    });
    schedule();
  } catch {
    /* ignore */
  }
}

export function captureError(err: unknown, ctx: ErrorContext = {}): void {
  try {
    if (!live()) return;
    const e = err as { name?: string; message?: string; stack?: string } | undefined;
    const message =
      (typeof err === 'string' ? err : e?.message) ?? String(err ?? '(no message)');
    push(errorQueue, {
      session_id: getSessionId(),
      app: app!,
      severity: ctx.severity ?? 'error',
      source: ctx.source ?? 'unhandled',
      name: e?.name,
      message,
      stack: e?.stack,
      route: ctx.route ?? currentRoute(),
      context: sanitizeProps(ctx.context),
    });
    // Errors are higher value — flush promptly.
    void flush();
  } catch {
    /* ignore */
  }
}

export async function flush(): Promise<void> {
  if (!live()) {
    eventQueue = [];
    errorQueue = [];
    return;
  }
  if (eventQueue.length === 0 && errorQueue.length === 0) return;

  const events = eventQueue;
  const errors = errorQueue;
  eventQueue = [];
  errorQueue = [];

  try {
    await supabase!.rpc('ingest_telemetry', { p_events: events, p_errors: errors });
  } catch {
    // Swallow — do NOT re-queue indefinitely. Telemetry loss is fine.
  }
}

export function initTelemetry(opts: { app: TelemetryApp; sampleRate?: number }): void {
  try {
    app = opts.app;
    sampleRate = opts.sampleRate ?? 1;

    // Mock mode (no Supabase): stay a pure no-op. Nothing is queued
    // or flushed, so tests and demo mode never touch the network.
    if (!hasSupabase || !supabase) {
      enabled = false;
      return;
    }

    // Optional sampling for high-frequency event apps.
    if (sampleRate < 1) {
      try {
        if (Math.random() > sampleRate) {
          enabled = false;
          return;
        }
      } catch {
        /* if Math.random is unavailable, just enable */
      }
    }

    enabled = true;

    if (timer === null) {
      timer = setInterval(() => void flush(), FLUSH_MS);
    }

    // Flush on tab hide / unload (best-effort).
    try {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void flush();
      });
      window.addEventListener('pagehide', () => void flush());

      // Auto-capture uncaught errors and unhandled promise rejections.
      window.addEventListener('error', (ev: ErrorEvent) => {
        captureError(ev.error ?? ev.message, { source: 'unhandled', severity: 'error' });
      });
      window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
        captureError(ev.reason, { source: 'unhandled', severity: 'error' });
      });
    } catch {
      /* non-browser env */
    }
  } catch {
    enabled = false;
  }
}
