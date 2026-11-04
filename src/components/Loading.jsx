import React from 'react';

/**
 * Loading Component
 * Displays a clean government-styled spinner and status message
 * while asynchronous API requests are pending.
 */
export default function Loading({ message = 'Loading data from CHR server...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      color: 'var(--color-text-muted)',
      textAlign: 'center',
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '16px',
      }} />
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
        {message}
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
