// Server-side HTML rendering for the public blog (/blog, /blog/:slug, 404).
// -----------------------------------------------------------------------------
// Emits complete documents with full technical SEO: <title>, meta description,
// canonical, Open Graph + Twitter cards, and JSON-LD (BlogPosting +
// BreadcrumbList). JSON-LD ships with a per-request `nonce` because the site
// CSP is script-src 'self'; the blog function sets a matching
// `script-src 'self' 'nonce-…'` header so the structured data is allowed while
// injected scripts are still blocked. Styling mirrors public/index.html tokens.

import { randomBytes } from 'node:crypto';
import { escapeHtml } from './_http';
import type { PublishedListItem, PublishedPost } from './_blogData';

const BRAND = 'Plynth';

function siteOrigin(): string {
  return (process.env.SITE_URL || 'https://plynth.com').replace(/\/$/, '');
}

// Escape a string for safe embedding inside <script type="application/ld+json">.
function jsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function readingTime(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const STYLES = `
  :root{--slate:#3b547a;--slate-deep:#1f2d44;--offwhite:#faf6ef;--white:#fff;
    --amber:#d4a574;--amber-deep:#b8895a;--text-2:#6b7280;--border:#e5e0d6;
    --serif:'Source Serif 4',Georgia,serif;--sans:'Inter',system-ui,sans-serif}
  *{box-sizing:border-box}
  body{margin:0;font-family:var(--sans);background:var(--offwhite);color:var(--slate-deep);line-height:1.6}
  a{color:var(--slate)}
  .wrap{max-width:760px;margin:0 auto;padding:40px 24px 80px}
  .top{display:flex;align-items:center;gap:10px;margin-bottom:40px;text-decoration:none;color:inherit}
  .wordmark{font-family:var(--serif);font-size:22px;font-weight:600}
  h1{font-family:var(--serif);font-weight:600;letter-spacing:-0.02em;line-height:1.15;margin:0 0 12px}
  .index-title{font-size:clamp(30px,4vw,42px);margin-bottom:32px}
  .meta{color:var(--text-2);font-size:14px;margin:0 0 24px}
  .cover{width:100%;border-radius:10px;border:1px solid var(--border);margin:8px 0 28px}
  .body{font-size:17px}
  .body img{max-width:100%;height:auto;border-radius:8px}
  .body h2{font-family:var(--serif);font-size:26px;margin:36px 0 12px}
  .body h3{font-family:var(--serif);font-size:21px;margin:28px 0 10px}
  .body pre{background:#1f2d44;color:#faf6ef;padding:16px;border-radius:8px;overflow:auto}
  .body blockquote{border-left:3px solid var(--amber);margin:20px 0;padding:4px 0 4px 18px;color:var(--text-2)}
  .card{display:block;background:var(--white);border:1px solid var(--border);border-radius:10px;
    overflow:hidden;text-decoration:none;color:inherit;margin-bottom:20px;transition:border-color .2s,box-shadow .2s}
  .card:hover{border-color:var(--slate);box-shadow:0 8px 24px rgba(31,45,68,.08)}
  .card img{width:100%;height:200px;object-fit:cover;display:block}
  .card-body{padding:20px 22px}
  .card h2{font-family:var(--serif);font-size:22px;margin:0 0 8px}
  .card p{color:var(--text-2);font-size:15px;margin:0 0 10px}
  .empty{color:var(--text-2)}
  footer{margin-top:64px;padding-top:24px;border-top:1px solid var(--border);color:var(--text-2);font-size:13px}
`;

function head(opts: {
  title: string;
  description: string;
  canonical: string;
  image?: string | null;
  type: 'website' | 'article';
  nonce: string;
  jsonLdBlocks: string[];
}): string {
  const desc = escapeHtml(opts.description || `${BRAND} blog`);
  const img = opts.image ? escapeHtml(opts.image) : '';
  const ogImage = img ? `<meta property="og:image" content="${img}"/><meta name="twitter:image" content="${img}"/>` : '';
  const scripts = opts.jsonLdBlocks
    .map((b) => `<script type="application/ld+json" nonce="${opts.nonce}">${b}</script>`)
    .join('');
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${desc}"/>
<link rel="canonical" href="${escapeHtml(opts.canonical)}"/>
<meta property="og:site_name" content="${BRAND}"/>
<meta property="og:type" content="${opts.type}"/>
<meta property="og:title" content="${escapeHtml(opts.title)}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:url" content="${escapeHtml(opts.canonical)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(opts.title)}"/>
<meta name="twitter:description" content="${desc}"/>
${ogImage}
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@500;600&family=Inter:wght@400;500;600&display=swap"/>
<style>${STYLES}</style>
${scripts}
</head>`;
}

const topBar = `<a class="top" href="/blog"><span class="wordmark">${BRAND}</span><span style="color:var(--text-2);font-size:14px">Blog</span></a>`;
const footer = `<footer>&copy; ${BRAND}. Insights for Canadian mortgage brokers and private lenders.</footer>`;

export function renderIndex(items: PublishedListItem[], nonce: string): string {
  const origin = siteOrigin();
  const breadcrumb = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
    ],
  });
  const cards = items.length
    ? items
        .map((p) => {
          const url = `/blog/${encodeURIComponent(p.slug)}`;
          const cover = p.cover_image
            ? `<img src="${escapeHtml(p.cover_image)}" alt="${escapeHtml(p.title)}" loading="lazy"/>`
            : '';
          return `<a class="card" href="${url}">${cover}<div class="card-body">
<h2>${escapeHtml(p.title)}</h2>
<p>${escapeHtml(p.excerpt || '')}</p>
<div class="meta">${fmtDate(p.published_at)}</div></div></a>`;
        })
        .join('')
    : `<p class="empty">No posts published yet — check back soon.</p>`;

  return (
    head({
      title: `Blog — ${BRAND}`,
      description: `Insights, guides and updates from ${BRAND}.`,
      canonical: `${origin}/blog`,
      type: 'website',
      nonce,
      jsonLdBlocks: [breadcrumb],
    }) +
    `<body><div class="wrap">${topBar}<h1 class="index-title">Blog</h1>${cards}${footer}</div></body></html>`
  );
}

// bodyHtml MUST already be sanitized + keyword-linked by the caller.
export function renderPost(post: PublishedPost, bodyHtml: string, nonce: string): string {
  const origin = siteOrigin();
  const canonical = `${origin}/blog/${encodeURIComponent(post.slug)}`;
  const title = post.meta_title || post.title;
  const description = post.excerpt || post.title;

  const blogPosting = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    image: post.cover_image || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    author: { '@type': post.author ? 'Person' : 'Organization', name: post.author || BRAND },
    publisher: { '@type': 'Organization', name: BRAND },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  });
  const breadcrumb = jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${origin}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
    ],
  });

  const cover = post.cover_image
    ? `<img class="cover" src="${escapeHtml(post.cover_image)}" alt="${escapeHtml(post.title)}"/>`
    : '';
  const byline = [post.author ? `By ${escapeHtml(post.author)}` : '', fmtDate(post.published_at), `${readingTime(bodyHtml)} min read`]
    .filter(Boolean)
    .join(' · ');

  return (
    head({
      title,
      description,
      canonical,
      image: post.cover_image,
      type: 'article',
      nonce,
      jsonLdBlocks: [blogPosting, breadcrumb],
    }) +
    `<body><div class="wrap">${topBar}
<h1>${escapeHtml(post.title)}</h1>
<p class="meta">${byline}</p>
${cover}
<div class="body">${bodyHtml}</div>
${footer}</div></body></html>`
  );
}

// Full security header set for blog responses. vercel.json excludes /blog from
// the global header block (a single CSP with a per-request nonce can't live in
// static config), so these functions must emit the equivalent hardening here.
// The CSP allows the JSON-LD via 'nonce-<n>' and the Google Fonts origins used
// by the rendered page; everything else stays locked down.
export function blogSecurityHeaders(nonce: string): Record<string, string> {
  return {
    'Content-Security-Policy':
      `default-src 'self'; ` +
      `script-src 'self' 'nonce-${nonce}'; ` +
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
      `font-src 'self' https://fonts.gstatic.com data:; ` +
      `img-src 'self' data: https:; ` +
      `connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; ` +
      `object-src 'none'; form-action 'self'`,
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

// 16-byte base64 nonce for the JSON-LD script tags.
export function makeNonce(): string {
  return randomBytes(16).toString('base64');
}

export function renderNotFound(nonce: string): string {
  const origin = siteOrigin();
  return (
    head({
      title: `Not found — ${BRAND}`,
      description: 'This post could not be found.',
      canonical: `${origin}/blog`,
      type: 'website',
      nonce,
      jsonLdBlocks: [],
    }) +
    `<body><div class="wrap">${topBar}<h1>Post not found</h1>
<p class="meta">This post may have been unpublished or the link is incorrect.</p>
<p><a href="/blog">← Back to the blog</a></p>${footer}</div></body></html>`
  );
}
