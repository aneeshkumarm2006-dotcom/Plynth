// HTML sanitization for blog post bodies.
// -----------------------------------------------------------------------------
// The #1 risk on the public blog is stored XSS: Tiptap output and content
// pasted from Word/Google Docs can carry <script>, event handlers, or
// javascript: URLs. We sanitize with an ALLOWLIST on every write (create +
// update) so the stored `body` is already safe, and rely on the strict CSP as a
// second line of defense. Never trust client-side sanitization.

import sanitizeHtml from 'sanitize-html';

// Only tags a blog body legitimately needs. Anything else (script, style,
// iframe, object, form, …) is dropped.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark',
  'a', 'img',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  // Links and images may only point at http(s) (+ mailto for links). This is
  // what blocks javascript:, data:, and vbscript: URLs.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  // Drop the content of disallowed tags entirely (e.g. <script>…</script>).
  disallowedTagsMode: 'discard',
  // Any external link opened in a new tab must not leak window.opener.
  transformTags: {
    a: (tagName, attribs) => {
      const out = { ...attribs };
      if (out.target === '_blank') {
        const rel = new Set((out.rel || '').split(/\s+/).filter(Boolean));
        rel.add('noopener');
        rel.add('noreferrer');
        out.rel = Array.from(rel).join(' ');
      }
      return { tagName, attribs: out };
    },
  },
};

export function sanitizeBody(dirty: string): string {
  if (!dirty) return '';
  return sanitizeHtml(dirty, OPTIONS);
}
