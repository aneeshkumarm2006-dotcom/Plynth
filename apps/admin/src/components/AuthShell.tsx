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
      <div style={{ marginBottom: 40 }}>
        <Logo size={32} />
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
        style={{ marginTop: 28, maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}
      >
        Plynth operates a marketplace for licensed Canadian mortgage professionals.
        Administrative access is restricted to Plynth operations.
      </p>
    </div>
  );
}
