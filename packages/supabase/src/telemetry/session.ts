// Session identity + PII sanitization for the telemetry SDK.
//
// session_id is generated once per browser tab session and cached in
// sessionStorage so it survives reloads within that tab but is fresh
// for a new tab — it correlates a burst of events/errors without
// being a stable user identifier (user_id is attached server-side).

const SID_KEY = 'plynth.telemetry.sid';

function uuid(): string {
  // crypto.randomUUID is available in all modern browsers; fall back
  // to a non-crypto id rather than throw if it is somehow absent.
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return '00000000-0000-4000-8000-' + Math.abs(hash(String(performance.now()))).toString(16).padStart(12, '0').slice(0, 12);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SID_KEY);
    if (existing) return existing;
    const fresh = uuid();
    sessionStorage.setItem(SID_KEY, fresh);
    return fresh;
  } catch {
    // Private mode / storage disabled — fall back to a per-load id.
    return uuid();
  }
}

// Current route without query string or fragment. Telemetry must
// never carry query params (they routinely hold tokens / ids / PII).
export function currentRoute(): string {
  try {
    return window.location.pathname || '/';
  } catch {
    return '/';
  }
}

// ---- PII guardrail (STRICT allowlist) ----
// props/context are developer-supplied. We only keep scalar values
// (string | number | boolean), drop any key whose name looks like it
// could carry personal data, truncate strings, and cap the object
// size. This is the client-side backstop; the ingest RPC also caps
// free text. Never pass borrower names, emails, addresses, etc.
const PII_KEY = /(email|mail|name|phone|tel|address|street|postal|zip|sin|ssn|dob|birth|borrower|first_?name|last_?name|full_?name|password|token|secret)/i;
const MAX_KEYS = 12;
const MAX_STR = 200;

export function sanitizeProps(
  props: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!props || typeof props !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  let n = 0;
  for (const key of Object.keys(props)) {
    if (n >= MAX_KEYS) break;
    if (PII_KEY.test(key)) continue;
    const v = props[key];
    if (typeof v === 'string') {
      out[key] = v.length > MAX_STR ? v.slice(0, MAX_STR) : v;
      n++;
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[key] = v;
      n++;
    }
    // objects/arrays/null are dropped — they are the main PII vector.
  }
  return n > 0 ? out : undefined;
}
