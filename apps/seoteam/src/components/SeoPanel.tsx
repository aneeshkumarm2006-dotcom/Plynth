import type { SeoCheck } from '../lib/seoCheck';

// Pass / warn indicators so writers know whether a post is SEO-ready.
export function SeoPanel({ checks }: { checks: SeoCheck[] }) {
  const warnings = checks.filter((c) => c.status === 'warn').length;
  return (
    <div className="seo-panel card card-pad">
      <div className="seo-panel-head">
        <h3 className="h3">SEO checks</h3>
        <span className={`badge ${warnings === 0 ? 'badge-pass' : 'badge-warn'}`}>
          {warnings === 0 ? 'Ready' : `${warnings} to review`}
        </span>
      </div>
      <ul className="seo-list">
        {checks.map((c) => (
          <li key={c.label} className="seo-item">
            <span className={`seo-dot seo-dot-${c.status}`} aria-hidden />
            <span className="seo-label">{c.label}</span>
            <span className="seo-detail muted-text">{c.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
