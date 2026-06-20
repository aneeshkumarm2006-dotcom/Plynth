import { useState } from 'react';
import {
  DefList,
  FigurePlaceholder,
  SectionDivider,
  StatBlock,
} from '@plynth/shared/ui';
import { useToastFire } from '../components/ToastContext';

const TABS = [
  ['subscription', 'Subscription'],
  ['usage', 'Usage'],
  ['payment', 'Payment'],
  ['profile', 'Profile'],
] as const;

type Tab = (typeof TABS)[number][0];

export function Account() {
  const [tab, setTab] = useState<Tab>('subscription');
  const [tier, setTier] = useState<'Starter' | 'Professional' | 'Enterprise'>(
    'Professional'
  );
  const toast = useToastFire();

  return (
    <div className="page" style={{ maxWidth: 920 }}>
      <h1 className="h1" style={{ marginBottom: 8 }}>
        Account
      </h1>
      <p className="lead" style={{ fontSize: 16, marginBottom: 32 }}>
        Manage your subscription, usage, and firm profile.
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
          {tab === 'subscription' && (
            <div className="fade-in">
              <SectionDivider
                n="01"
                label="Subscription"
                meta="Billed monthly in CAD"
              />
              <div
                className="card card-pad"
                style={{
                  marginBottom: 24,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderColor: 'var(--amber)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <span className="h4">Professional</span>
                    <span className="pill pill-matched">Current</span>
                  </div>
                  <div className="small muted-text">
                    Unlimited matched deals · analytics · priority matching
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="num"
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 30,
                      fontWeight: 600,
                      color: 'var(--slate-deep)',
                    }}
                  >
                    $599
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>/mo</span>
                  </div>
                  <div className="micro muted-text">Renews Jul 1, 2026</div>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                }}
              >
                {(
                  [
                    ['Starter', '$299'],
                    ['Professional', '$599'],
                    ['Enterprise', '$999'],
                  ] as Array<['Starter' | 'Professional' | 'Enterprise', string]>
                ).map(([name, price]) => (
                  <div
                    key={name}
                    onClick={() => setTier(name)}
                    style={{
                      border:
                        '1px solid ' +
                        (tier === name ? 'var(--slate)' : 'var(--border)'),
                      background:
                        tier === name ? 'var(--slate-bg)' : 'var(--white)',
                      borderRadius: 8,
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'all 200ms',
                    }}
                  >
                    <div
                      className="small"
                      style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
                    >
                      {name}
                    </div>
                    <div
                      className="num"
                      style={{
                        fontFamily: 'var(--serif)',
                        fontSize: 22,
                        fontWeight: 600,
                        color: 'var(--slate-deep)',
                        marginTop: 4,
                      }}
                    >
                      {price}
                      <span style={{ fontSize: 11, color: 'var(--text-2)' }}>/mo</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    toast({
                      title: 'Subscription updated to ' + tier,
                      sub: 'Prorated to your next billing date.',
                    })
                  }
                >
                  Change plan
                </button>
                <button
                  className="btn btn-tertiary"
                  style={{ color: 'var(--dust)' }}
                  onClick={() =>
                    toast({
                      title: 'Cancel subscription',
                      sub: 'Your plan stays active until Jul 1 — contact support to confirm.',
                    })
                  }
                >
                  Cancel subscription
                </button>
              </div>
            </div>
          )}

          {tab === 'usage' && (
            <div className="fade-in">
              <SectionDivider n="02" label="Usage" meta="June 2026" />
              <div
                className="stat-strip"
                style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}
              >
                <StatBlock value="47" label="Deals Reviewed" />
                <StatBlock value="5" label="Offers Made" />
                <StatBlock value="2" label="Funded" />
              </div>
              <p className="body muted-text" style={{ maxWidth: '56ch' }}>
                You've reviewed 47 deals this month against your Professional plan's
                unlimited allowance. Your win rate of 31% is above the marketplace median
                of 24%.
              </p>
            </div>
          )}

          {tab === 'payment' && (
            <div className="fade-in">
              <SectionDivider n="03" label="Payment method" meta="Secured by Stripe" />
              <div
                className="card card-pad"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <FigurePlaceholder
                    label="VISA"
                    style={{ width: 48, height: 32, borderRadius: 4 }}
                  />
                  <div>
                    <div
                      className="small"
                      style={{ fontWeight: 600, color: 'var(--slate-deep)' }}
                    >
                      •••• 4242
                    </div>
                    <div className="micro muted-text">Expires 09 / 28</div>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => toast({ title: 'Update payment method', sub: 'Opens the secure Stripe portal.' })}
                >
                  Update
                </button>
              </div>
              <DefList
                items={[
                  ['Billing email', 'eleanor@fortressmic.ca'],
                  ['Next charge', '$599.00 CAD on Jul 1'],
                  ['Tax', 'HST included'],
                ]}
              />
            </div>
          )}

          {tab === 'profile' && (
            <div className="fade-in">
              <SectionDivider n="04" label="Firm profile" />
              <DefList
                items={[
                  ['Firm', 'Fortress MIC'],
                  ['Type', 'Mortgage Investment Corp.'],
                  ['Registration', 'OSC — Ontario'],
                  ['AUM', '$100M–$500M'],
                  ['Primary contact', 'Eleanor Whitfield'],
                ]}
              />
              <button
                className="btn btn-ghost"
                style={{ marginTop: 18 }}
                onClick={() =>
                  toast({
                    title: 'Firm details are verified',
                    sub: 'Registration and AUM changes go through compliance review.',
                  })
                }
              >
                Edit firm details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
