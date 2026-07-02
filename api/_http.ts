// Shared request/response typing + tiny HTTP helpers for the Plynth
// serverless functions. Kept dependency-free (no @vercel/node at build
// time) and matching the minimal-interface style of notify-email.ts.
// The leading underscore marks this as a private helper, not a route.

export interface VercelReq {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface VercelRes {
  status(code: number): VercelRes;
  setHeader(name: string, value: string | string[]): void;
  json(body: unknown): void;
  send(body: string): void;
  end(): void;
}

// Parse a Cookie header into a name→value map. Returns {} when absent.
export function parseCookies(req: VercelReq): Record<string, string> {
  const raw = req.headers['cookie'];
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// Read a single query param (first value if repeated).
export function queryParam(req: VercelReq, name: string): string | undefined {
  const v = req.query?.[name];
  return Array.isArray(v) ? v[0] : v;
}

// Body may arrive as a parsed object or a raw JSON string depending on
// the content-type; normalize to an object (null on parse failure).
export function jsonBody(req: VercelReq): Record<string, unknown> | null {
  const b = req.body;
  if (b && typeof b === 'object') return b as Record<string, unknown>;
  if (typeof b === 'string') {
    try { return JSON.parse(b) as Record<string, unknown>; } catch { return null; }
  }
  return null;
}

// Minimal HTML escaper for text interpolated into server-rendered pages
// and meta attributes. Mirrors api/_render.ts's escape.
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );
}
