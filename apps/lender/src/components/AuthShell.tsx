import type { ReactNode } from 'react';
import { Logo } from '@plynth/shared/ui';

export function AuthShell({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: number;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '64px 24px',
      }}
    >
      <div
        style={{
          marginBottom: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Logo size={32} />
        <span
          className="micro"
          style={{
            color: 'var(--muted)',
            borderLeft: '1px solid var(--border)',
            paddingLeft: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          For Lenders
        </span>
      </div>
      <div
        className="card fade-in"
        style={{
          width: '100%',
          maxWidth: wide || 440,
          padding: '40px 40px 36px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {children}
      </div>
      <p
        className="micro muted-text"
        style={{
          marginTop: 28,
          maxWidth: 380,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Plynth serves registered Canadian private lenders. Subscriptions billed in CAD.
      </p>
    </div>
  );
}
