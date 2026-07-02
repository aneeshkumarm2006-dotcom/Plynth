import type { KeywordEntry } from '../lib/api';

interface Props {
  keywords: KeywordEntry[];
  onChange: (next: KeywordEntry[]) => void;
}

const REL_OPTIONS: KeywordEntry['rel'][] = ['dofollow', 'nofollow', 'sponsored'];

// Manage all of a post's keyword backlinks in one place. On the public page,
// occurrences of `keyword` in the body become links to `url` with the chosen
// rel (see api/_keywordLinks.ts).
export function KeywordLinks({ keywords, onChange }: Props) {
  const update = (i: number, patch: Partial<KeywordEntry>) =>
    onChange(keywords.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  const remove = (i: number) => onChange(keywords.filter((_, idx) => idx !== i));
  const add = () => onChange([...keywords, { keyword: '', url: '', rel: 'dofollow' }]);

  return (
    <div className="kw">
      {keywords.length === 0 && <p className="small muted-text">No backlinks yet. Add a keyword and the URL it should link to.</p>}
      {keywords.map((k, i) => (
        <div className="kw-row" key={i}>
          <input
            className="input"
            placeholder="keyword"
            value={k.keyword}
            onChange={(e) => update(i, { keyword: e.target.value })}
          />
          <input
            className="input"
            placeholder="https://target-url.com"
            value={k.url}
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <select className="select" value={k.rel} onChange={(e) => update(i, { rel: e.target.value as KeywordEntry['rel'] })}>
            {REL_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i)} title="Remove">
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add} style={{ marginTop: 8 }}>
        + Add keyword backlink
      </button>
    </div>
  );
}
