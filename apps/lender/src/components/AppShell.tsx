import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Logo, NotificationBell, ProfileMenu, Sidebar, type SidebarItem } from '@plynth/shared/ui';
import { useAuth } from '@plynth/supabase/auth';
import { LENDER_MOCK } from '@plynth/shared/mock';

const NAV: SidebarItem[] = [
  { group: 'Marketplace' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'matched', label: 'Matched deals' },
  { id: 'pipeline', label: 'Pipeline' },
  { group: 'Strategy' },
  { id: 'criteria', label: 'Criteria' },
  { id: 'funded', label: 'Funded' },
  { group: 'Account' },
  { id: 'account', label: 'Account' },
];

const ROUTE_TO_ID: Record<string, string> = {
  '/': 'dashboard',
  '/matched': 'matched',
  '/pipeline': 'pipeline',
  '/criteria': 'criteria',
  '/funded': 'funded',
  '/account': 'account',
};

const ID_TO_ROUTE: Record<string, string> = {
  dashboard: '/',
  matched: '/matched',
  pipeline: '/pipeline',
  criteria: '/criteria',
  funded: '/funded',
  account: '/account',
};

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const active =
    ROUTE_TO_ID[location.pathname] ??
    (location.pathname.startsWith('/deals') ? 'matched' : undefined);

  const displayName = LENDER_MOCK.user.name;
  const initials = LENDER_MOCK.user.initials;
  const firmName = profile?.firm_name ?? LENDER_MOCK.user.firm;

  return (
    <div>
      <div className="topbar">
        <Logo onClick={() => navigate('/')} />
        <span
          className="micro"
          style={{
            color: 'var(--muted)',
            borderLeft: '1px solid var(--border)',
            paddingLeft: 12,
            marginLeft: 4,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          For Lenders
        </span>
        <div className="spacer" />
        <NotificationBell
          userId={profile?.id}
          onOpenEntity={(type, id) => {
            if (type === 'offer' || type === 'deal') navigate(`/deals/${id}`);
          }}
        />
        <ProfileMenu
          name={displayName}
          sub={firmName}
          initials={initials}
          items={[
            { label: 'Account', onClick: () => navigate('/account') },
            { label: 'Criteria', onClick: () => navigate('/criteria') },
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
