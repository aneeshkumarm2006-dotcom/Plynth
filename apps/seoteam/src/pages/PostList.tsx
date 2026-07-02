import { useEffect, useMemo, useState } from 'react';
import { api, type Post } from '../lib/api';

interface Props {
  onNew: () => void;
  onEdit: (id: string) => void;
  onUnauthorized: () => void;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PostList({ onNew, onEdit, onUnauthorized }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setPosts(await api.listPosts());
    } catch (e) {
      if ((e as { status?: number }).status === 401) onUnauthorized();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts
      .filter((p) => statusFilter === 'all' || p.status === statusFilter)
      .filter((p) => !q || p.title.toLowerCase().includes(q));
  }, [posts, statusFilter, search]);

  const setStatus = async (p: Post, status: 'draft' | 'published') => {
    setBusyId(p.id);
    try {
      await api.updatePost(p.id, { status });
      await load();
    } catch (e) {
      window.alert(`Could not update: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: Post) => {
    if (!window.confirm(`Delete “${p.title}”? This cannot be undone.`)) return;
    setBusyId(p.id);
    try {
      await api.deletePost(p.id);
      await load();
    } catch (e) {
      window.alert(`Could not delete: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h2">Blog posts</h1>
          <p className="small muted-text">Publish and manage SEO posts. Changes go live instantly — no redeploy.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + New post
        </button>
      </div>

      <div className="toolbar">
        <div className="seg">
          {(['all', 'published', 'draft'] as const).map((s) => (
            <button key={s} className={`seg-btn${statusFilter === s ? ' is-active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <input className="input" placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
      </div>

      {loading ? (
        <p className="muted-text">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card card-pad empty-state">
          <p className="muted-text">No posts yet. Create your first one.</p>
          <button className="btn btn-secondary" onClick={onNew} style={{ marginTop: 12 }}>
            + New post
          </button>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Published</th>
              <th className="num">Views</th>
              <th className="actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id}>
                <td>
                  <button className="link-btn" onClick={() => onEdit(p.id)}>
                    {p.title || '(untitled)'}
                  </button>
                  {p.status === 'published' && (
                    <a className="small muted-text view-link" href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                      /blog/{p.slug} ↗
                    </a>
                  )}
                </td>
                <td>
                  <span className={`badge ${p.status === 'published' ? 'badge-pass' : 'badge-draft'}`}>{p.status}</span>
                </td>
                <td className="small">{fmtDate(p.published_at)}</td>
                <td className="num">{p.views}</td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => onEdit(p.id)} disabled={busyId === p.id}>
                    Edit
                  </button>
                  {p.status === 'published' ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => setStatus(p, 'draft')} disabled={busyId === p.id}>
                      Unpublish
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setStatus(p, 'published')} disabled={busyId === p.id}>
                      Publish
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => remove(p)} disabled={busyId === p.id}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
