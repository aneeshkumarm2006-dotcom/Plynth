import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo, ProfileMenu, Sidebar, type SidebarItem } from '@plynth/shared/ui';
import { useAuth } from '@plynth/supabase/auth';

const NAV: SidebarItem[] = [
  { group: 'Monitor' },
  { id: 'overview', label: 'Overview' },
  { id: 'health', label: 'System health' },
  { id: 'activity', label: 'Activity' },
  { id: 'alerts', label: 'Alerts' },
  { group: 'Insights' },
  { id: 'funnel', label: 'Funnel & matching' },
  { group: 'Directory' },
  { id: 'users', label: 'Users' },
  { group: 'Marketplace' },
  { id: 'deals', label: 'Deals' },
  { id: 'offers', label: 'Offers' },
];

const ROUTE_TO_ID: Record<string, string> = {
  '/': 'overview',
  '/health': 'health',
  '/activity': 'activity',
  '/alerts': 'alerts',
  '/funnel': 'funnel',
  '/users': 'users',
  '/deals': 'deals',
  '/offers': 'offers',
};

const ID_TO_ROUTE: Record<string, string> = {
  overview: '/',
  health: '/health',
  activity: '/activity',
  alerts: '/alerts',
  funnel: '/funnel',
  users: '/users',
  deals: '/deals',
  offers: '/offers',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // /users/:id detail pages keep the "Users" nav item active.
  const active =
    ROUTE_TO_ID[location.pathname] ??
    (location.pathname.startsWith('/users/') ? 'users' : undefined);

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : 'Plynth Operations';
  const initials =
    (profile?.first_name?.[0] ?? 'P') + (profile?.last_name?.[0] ?? 'O');

  return (
    <div>
      <div className="topbar">
        <Logo onClick={() => navigate('/')} />
        <span
          className="eyebrow"
          style={{ color: 'var(--amber-deep)', marginLeft: 12 }}
        >
          Admin
        </span>
        <div className="spacer" />
        <ProfileMenu
          name={displayName}
          sub={profile?.email}
          initials={initials}
          items={[{ label: 'Sign out', onClick: () => signOut(), danger: true }]}
        />
      </div>
      <div className="app">
        <Sidebar
          items={NAV}
          active={active}
          onNavigate={(id) => navigate(ID_TO_ROUTE[id] ?? '/')}
        />
        <div className="app-main">{children}</div>
      </div>
    </div>
  );
}
