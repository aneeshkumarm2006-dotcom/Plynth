import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo, NotificationBell, ProfileMenu, Sidebar, type SidebarItem } from '@plynth/shared/ui';
import { useAuth } from '@plynth/supabase/auth';
import { BROKER_MOCK } from '@plynth/shared/mock';

const NAV: SidebarItem[] = [
  { group: 'Marketplace' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'submit', label: 'Submit a deal' },
  { group: 'Discover' },
  { id: 'lenders', label: 'Lenders' },
  { id: 'funded', label: 'Funded' },
  { group: 'Account' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'settings', label: 'Settings' },
];

const ROUTE_TO_ID: Record<string, string> = {
  '/': 'dashboard',
  '/pipeline': 'pipeline',
  '/submit': 'submit',
  '/lenders': 'lenders',
  '/funded': 'funded',
  '/notifications': 'notifications',
  '/settings': 'settings',
};

const ID_TO_ROUTE: Record<string, string> = {
  dashboard: '/',
  pipeline: '/pipeline',
  submit: '/submit',
  lenders: '/lenders',
  funded: '/funded',
  notifications: '/notifications',
  settings: '/settings',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const active =
    ROUTE_TO_ID[location.pathname] ??
    (location.pathname.startsWith('/deals') ? 'pipeline' : undefined);

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : BROKER_MOCK.user.name;
  const initials =
    (profile?.first_name?.[0] ?? 'M') + (profile?.last_name?.[0] ?? 'C');
  const subline = profile?.brokerage_name ?? BROKER_MOCK.user.brokerage;

  return (
    <div>
      <div className="topbar">
        <Logo onClick={() => navigate('/')} />
        <div className="spacer" />
        <NotificationBell
          userId={profile?.id}
          onOpenEntity={(type, id) => {
            if (type === 'offer' || type === 'deal') navigate(`/deals/${id}`);
          }}
          onSeeAll={() => navigate('/notifications')}
        />
        <ProfileMenu
          name={displayName}
          sub={subline}
          initials={initials}
          items={[
            { label: 'Settings', onClick: () => navigate('/settings') },
            { label: 'Sign out', onClick: () => signOut(), danger: true },
          ]}
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
