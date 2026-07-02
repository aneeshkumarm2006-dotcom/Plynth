import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type KeywordEntry, type Post, type PostInput } from '../lib/api';
import { TEMPLATES, templateByValue } from '../lib/templates';
import { slugify } from '../lib/slug';
import { runSeoChecks } from '../lib/seoCheck';
import { Tiptap } from '../components/Tiptap';
import { KeywordLinks } from '../components/KeywordLinks';
import { SeoPanel } from '../components/SeoPanel';

interface Props {
  postId: string | null; // null = new post
  onDone: () => void;
  onUnauthorized: () => void;
}

interface Form {
  title: string;
  slug: string;
  template: string;
  body: string;
  excerpt: string;
  meta_title: string;
  cover_image: string;
  author: string;
  keywords: KeywordEntry[];
  link_first_only: boolean;
  status: 'draft' | 'published';
}

const EMPTY: Form = {
  title: '',
  slug: '',
  template: 'generic',
  body: '',
  excerpt: '',
  meta_title: '',
  cover_image: '',
  author: '',
  keywords: [],
  link_first_only: true,
  status: 'draft',
};

function CharCount({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.trim().length;
  const ok = n >= min && n <= max;
  return (
    <span className="char-count" style={{ color: ok ? 'var(--sage)' : 'var(--wheat)' }}>
      {n} / {min}–{max}
    </span>
  );
}

export function Editor({ postId, onDone, onUnauthorized }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<'draft' | 'published' | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const slugEdited = useRef(false);
  // The id to update against: the post being edited, or one we just created.
  const effectiveId = postId ?? savedId;

  useEffect(() => {
    if (!postId) {
      // New post: seed the generic template body.
      setForm((f) => ({ ...f, body: templateByValue('generic')!.body }));
      return;
    }
    (async () => {
      try {
        const p = await api.getPost(postId);
        slugEdited.current = true; // don't auto-rewrite an existing slug
        setForm(fromPost(p));
      } catch (e) {
        if ((e as { status?: number }).status === 401) onUnauthorized();
        else setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId, onUnauthorized]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const onTitle = (title: string) =>
    setForm((f) => ({ ...f, title, slug: slugEdited.current ? f.slug : slugify(title) }));

  const applyTemplate = (value: string) => {
    const t = templateByValue(value);
    if (!t) return;
    const bodyIsPristine = TEMPLATES.some((tpl) => tpl.body === form.body) || form.body.trim() === '';
    if (!bodyIsPristine && !window.confirm('Replace the current content with this template? Your edits will be lost.')) {
      set('template', value);
      return;
    }
    setForm((f) => ({ ...f, template: value, body: t.body }));
  };

  const checks = useMemo(
    () =>
      runSeoChecks({
        title: form.title,
        metaTitle: form.meta_title,
        excerpt: form.excerpt,
        bodyHtml: form.body,
        keywords: form.keywords,
        coverImage: form.cover_image,
      }),
    [form]
  );

  const coverInput = useRef<HTMLInputElement>(null);
  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      set('cover_image', await api.uploadImage(file));
    } catch (err) {
      window.alert(`Cover upload failed: ${(err as Error).message}`);
    }
  };

  const save = async (status: 'draft' | 'published') => {
    setError(null);
    if (!form.title.trim()) {
      setError('A title is required.');
      return;
    }
    setSaving(true);
    const payload: PostInput = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      template: form.template,
      body: form.body,
      excerpt: form.excerpt.trim() || null,
      meta_title: form.meta_title.trim() || null,
      cover_image: form.cover_image.trim() || null,
      author: form.author.trim() || null,
      keywords: form.keywords,
      link_first_only: form.link_first_only,
      status,
    };
    try {
      if (effectiveId) {
        const updated = await api.updatePost(effectiveId, payload);
        setForm(fromPost(updated));
        setSavedStatus(status);
      } else {
        const created = await api.createPost(payload);
        // Switch to update mode so further saves don't create a duplicate.
        setSavedId(created.id);
        slugEdited.current = true;
        setForm(fromPost(created));
        setSavedStatus(status);
      }
    } catch (e) {
      if ((e as { status?: number }).status === 401) onUnauthorized();
      else setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="muted-text page">Loading…</p>;

  return (
    <div className="page editor">
      <div className="page-head">
        <button className="link-btn" onClick={onDone}>
          ← Back to posts
        </button>
        {savedStatus && (
          <span className="small" style={{ color: 'var(--sage)' }}>
            Saved{savedStatus === 'published' ? ' & published' : ' as draft'}
            {form.status === 'published' && form.slug && (
              <>
                {' · '}
                <a href={`/blog/${form.slug}`} target="_blank" rel="noreferrer">
                  view live ↗
                </a>
              </>
            )}
          </span>
        )}
      </div>

      <div className="editor-grid">
        <div className="editor-main">
          {!effectiveId && (
            <div className="field">
              <label>Template</label>
              <div className="tpl-grid">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`tpl-card${form.template === t.value ? ' is-active' : ''}`}
                    onClick={() => applyTemplate(t.value)}
                  >
                    <strong>{t.label}</strong>
                    <span className="small muted-text">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Title</label>
            <input className="input" value={form.title} onChange={(e) => onTitle(e.target.value)} placeholder="Post title" />
          </div>

          <div className="field">
            <label>Slug</label>
            <div className="slug-row">
              <span className="muted-text small">/blog/</span>
              <input
                className="input"
                value={form.slug}
                onChange={(e) => {
                  slugEdited.current = true;
                  set('slug', slugify(e.target.value));
                }}
                placeholder="post-slug"
              />
            </div>
          </div>

          <div className="field">
            <label>Content</label>
            <Tiptap value={form.body} onChange={(html) => set('body', html)} />
          </div>

          <div className="field">
            <label>Keyword backlinks</label>
            <KeywordLinks keywords={form.keywords} onChange={(k) => set('keywords', k)} />
            <label className="checkbox-row" style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                checked={form.link_first_only}
                onChange={(e) => set('link_first_only', e.target.checked)}
              />
              <span className="small">Link the first occurrence only (recommended — avoids over-optimization)</span>
            </label>
          </div>
        </div>

        <aside className="editor-side">
          <SeoPanel checks={checks} />

          <div className="card card-pad">
            <div className="field">
              <label>
                Meta title <CharCount value={form.meta_title || form.title} min={50} max={60} />
              </label>
              <input
                className="input"
                value={form.meta_title}
                onChange={(e) => set('meta_title', e.target.value)}
                placeholder={form.title || 'Defaults to the title'}
              />
            </div>
            <div className="field">
              <label>
                Meta description <CharCount value={form.excerpt} min={150} max={160} />
              </label>
              <textarea
                className="input"
                rows={3}
                value={form.excerpt}
                onChange={(e) => set('excerpt', e.target.value)}
                placeholder="Shown in search results and social shares."
              />
            </div>
            <div className="field">
              <label>Cover image</label>
              {form.cover_image ? (
                <div className="cover-preview">
                  <img src={form.cover_image} alt="cover" />
                  <button className="btn btn-ghost btn-sm" onClick={() => set('cover_image', '')}>
                    Remove
                  </button>
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => coverInput.current?.click()}>
                  Upload cover
                </button>
              )}
              <input ref={coverInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onCover} />
            </div>
            <div className="field">
              <label>Author (optional)</label>
              <input className="input" value={form.author} onChange={(e) => set('author', e.target.value)} />
            </div>
          </div>

          {error && <p className="small" style={{ color: 'var(--dust)' }}>{error}</p>}

          <div className="save-bar">
            <button className="btn btn-ghost" onClick={() => save('draft')} disabled={saving}>
              Save draft
            </button>
            <button className="btn btn-primary" onClick={() => save('published')} disabled={saving}>
              {saving ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function fromPost(p: Post): Form {
  return {
    title: p.title,
    slug: p.slug,
    template: p.template,
    body: p.body,
    excerpt: p.excerpt ?? '',
    meta_title: p.meta_title ?? '',
    cover_image: p.cover_image ?? '',
    author: p.author ?? '',
    keywords: p.keywords ?? [],
    link_first_only: p.link_first_only,
    status: p.status,
  };
}
