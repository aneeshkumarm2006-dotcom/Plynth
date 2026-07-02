import { describe, it, expect } from 'vitest';
import { sanitizeBody } from '../../api/_sanitize';

describe('sanitizeBody', () => {
  it('strips <script> tags and their content', () => {
    const out = sanitizeBody('<p>hi</p><script>alert(1)</script>');
    expect(out).toBe('<p>hi</p>');
  });

  it('drops inline event handlers', () => {
    const out = sanitizeBody('<p onclick="steal()">hi</p>');
    expect(out).not.toContain('onclick');
    expect(out).toContain('hi');
  });

  it('removes javascript: URLs on links', () => {
    const out = sanitizeBody('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain('javascript:');
  });

  it('removes data: URLs on images (SVG XSS vector)', () => {
    const out = sanitizeBody('<img src="data:text/html,<script>alert(1)</script>"/>');
    expect(out).not.toContain('data:');
  });

  it('keeps safe formatting, links and images', () => {
    const html =
      '<h2>Title</h2><p><strong>bold</strong> and <em>italic</em></p>' +
      '<ul><li>one</li></ul><a href="https://ok.test">link</a>' +
      '<img src="https://cdn.test/a.png" alt="a"/>';
    const out = sanitizeBody(html);
    expect(out).toContain('<h2>Title</h2>');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<li>one</li>');
    expect(out).toContain('href="https://ok.test"');
    expect(out).toContain('src="https://cdn.test/a.png"');
    expect(out).toContain('alt="a"');
  });

  it('forces noopener/noreferrer on target=_blank links', () => {
    const out = sanitizeBody('<a href="https://ok.test" target="_blank">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('drops disallowed structural tags like iframe/style/form', () => {
    const out = sanitizeBody('<iframe src="https://evil.test"></iframe><style>*{}</style><form></form><p>ok</p>');
    expect(out).toBe('<p>ok</p>');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeBody('')).toBe('');
  });
});
