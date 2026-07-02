import { useEffect, useState } from 'react';
import { api } from './lib/api';
import { Login } from './pages/Login';
import { PostList } from './pages/PostList';
import { Editor } from './pages/Editor';

type Auth = 'checking' | 'in' | 'out';
type View = { name: 'list' } | { name: 'new' } | { name: 'edit'; id: string };

export function App() {
  const [auth, setAuth] = useState<Auth>('checking');
  const [view, setView] = useState<View>({ name: 'list' });

  const check = async () => {
    try {
      const r = await api.session();
      setAuth(r.authenticated ? 'in' : 'out');
    } catch {
      setAuth('out');
    }
  };

  useEffect(() => {
    check();
  }, []);

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setAuth('out');
    setView({ name: 'list' });
  };

  if (auth === 'checking') return <div className="boot muted-text">Loading…</div>;
  if (auth === 'out') return <Login onSuccess={() => { setAuth('in'); setView({ name: 'list' }); }} />;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          Plynth <span>SEO</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          Sign out
        </button>
      </header>
      <main>
        {view.name === 'list' && (
          <PostList
            onNew={() => setView({ name: 'new' })}
            onEdit={(id) => setView({ name: 'edit', id })}
            onUnauthorized={() => setAuth('out')}
          />
        )}
        {view.name === 'new' && (
          <Editor postId={null} onDone={() => setView({ name: 'list' })} onUnauthorized={() => setAuth('out')} />
        )}
        {view.name === 'edit' && (
          <Editor key={view.id} postId={view.id} onDone={() => setView({ name: 'list' })} onUnauthorized={() => setAuth('out')} />
        )}
      </main>
    </div>
  );
}
