import { useEffect, useState } from 'react';
import {
  Avatar,
  DefList,
  Field,
  SectionDivider,
  SettingToggle,
} from '@plynth/shared/ui';
import { BROKER_MOCK } from '@plynth/shared/mock';
import { formatDateTime } from '@plynth/shared/utils';
import { auditService, type AuditLogRow } from '@plynth/supabase/services';
import { useAuth } from '@plynth/supabase/auth';
import { useToastFire } from '../components/ToastContext';

const TABS = [
  ['profile', 'Profile'],
  ['brokerage', 'Brokerage'],
  ['notifications', 'Notifications'],
  ['activity', 'Activity log'],
  ['billing', 'Billing'],
] as const;

type Tab = (typeof TABS)[number][0];

export function Settings() {
  const [tab, setTab] = useState<Tab>('profile');
  const toast = useToastFire();
  const { profile } = useAuth();
  const [activity, setActivity] = useState<AuditLogRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'activity' || !profile) return;
    setActivityLoading(true);
    auditService
      .listForUser(profile.id)
      .then(setActivity)
      .finally(() => setActivityLoading(false));
  }, [tab, profile]);

  const onExport = () => {
    const csv = auditService.toCSV(activity);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plynth-activity.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Activity log exported', sub: `${activity.length} entries.` });
  };

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>Account</h1>
      <p className="lead" style={{ fontSize: 16, marginBottom: 32 }}>
        Manage your profile, brokerage, and preferences.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(([id, lbl]) => (
            <a
              key={id}
              className={'nav-item' + (tab === id ? ' active' : '')}
              onClick={() => setTab(id)}
            >
              {lbl}
            </a>
          ))}
        </div>

        <div>
          {tab === 'profile' && (
            <div className="fade-in">
              <SectionDivider n="01" label="Profile" />
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <Avatar initials={BROKER_MOCK.user.initials} size={64} />
                <button className="btn btn-ghost btn-sm">Change photo</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Full name">
                  <input className="input" defaultValue={BROKER_MOCK.user.name} />
                </Field>
                <Field label="Email">
                  <input className="input" defaultValue={BROKER_MOCK.user.email} />
                </Field>
                <Field label="Phone">
                  <input className="input input-num" defaultValue="(416) 555-0142" />
                </Field>
                <Field label="Years in business">
                  <select className="select">
                    <option>6–10</option>
                    <option>More than 10</option>
                  </select>
                </Field>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => toast({ title: 'Profile updated' })}
              >
                Save changes
              </button>
            </div>
          )}

          {tab === 'brokerage' && (
            <div className="fade-in">
              <SectionDivider n="02" label="Brokerage" />
              <DefList
                items={[
                  ['Brokerage', BROKER_MOCK.user.brokerage],
                  ['Regulator', 'FSRA — Ontario'],
                  ['License', 'M08009124'],
                  ['Province', BROKER_MOCK.user.province],
                  ['Verification status', 'Verified'],
                ]}
              />
              <button className="btn btn-ghost" style={{ marginTop: 18 }}>
                Update brokerage details
              </button>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="fade-in">
              <SectionDivider n="03" label="Notifications" />
              {([
                ['New offers', true],
                ['Offer expiring soon', true],
                ['Lender views your deal', false],
                ['Deal funded', true],
                ['Weekly pipeline digest', true],
              ] as Array<[string, boolean]>).map(([l, on]) => (
                <SettingToggle key={l} label={l} on={on} />
              ))}
            </div>
          )}

          {tab === 'activity' && (
            <div className="fade-in">
              <SectionDivider
                n="04"
                label="Activity log"
                meta="PIPEDA — 7 years retention"
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 18,
                }}
              >
                <p className="small muted-text" style={{ maxWidth: '52ch' }}>
                  Every action you take on Plynth is recorded — immutable and exportable
                  for compliance review.
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={onExport}
                  disabled={!activity.length}
                >
                  Export CSV
                </button>
              </div>
              {activityLoading ? (
                <div className="skel" style={{ width: 280, height: 16 }} />
              ) : activity.length === 0 ? (
                <div className="empty" style={{ padding: '40px 0' }}>
                  <div className="em-title" style={{ fontSize: 18 }}>
                    No recent activity
                  </div>
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['When', 'Action', 'Entity', 'IP'].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: 'left',
                              padding: '12px 16px',
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: 'var(--text-2)',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activity.map((row, i) => (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom:
                              i < activity.length - 1
                                ? '1px solid var(--border)'
                                : 'none',
                          }}
                        >
                          <td
                            className="num"
                            style={{
                              padding: '12px 16px',
                              fontSize: 13,
                              color: 'var(--text-2)',
                            }}
                          >
                            {formatDateTime(row.created_at)}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13 }}>
                            {row.action}
                          </td>
                          <td
                            style={{
                              padding: '12px 16px',
                              fontSize: 13,
                              color: 'var(--text-2)',
                            }}
                          >
                            {row.entity_type ?? '—'} {row.entity_id ?? ''}
                          </td>
                          <td
                            className="num"
                            style={{
                              padding: '12px 16px',
                              fontSize: 12,
                              color: 'var(--text-2)',
                            }}
                          >
                            {row.ip_address ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'billing' && (
            <div className="fade-in">
              <SectionDivider
                n="05"
                label="Billing"
                meta="Brokers transact at funding"
              />
              <div
                className="card card-pad"
                style={{ background: '#FCFAF5', marginBottom: 20 }}
              >
                <p className="small muted-text">
                  Plynth is free for brokers. A success fee of 0.25% applies only when a
                  deal funds through the marketplace, invoiced at closing.
                </p>
              </div>
              <DefList
                items={[
                  ['Plan', 'Broker — no subscription'],
                  ['Success fee', '0.25% at funding'],
                  ['Funded this year', '$38.6M CAD'],
                  ['Fees invoiced YTD', '$96,500 CAD'],
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
