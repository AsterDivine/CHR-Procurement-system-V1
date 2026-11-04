import React from 'react';
import { Link } from 'react-router-dom';

/**
 * EmptyState Component
 * Clean government-styled placeholder when tables or lists have zero records.
 */
export default function EmptyState({
  title = 'No Records Found',
  message = 'There are currently no items to display in this section.',
  actionText = null,
  actionLink = null,
  onAction = null,
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: 'var(--color-bg-light)',
      border: '1px dashed var(--color-border)',
      borderRadius: '4px',
      margin: '16px 0',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#e2e8f0',
        color: '#64748b',
        fontSize: '20px',
        marginBottom: '12px',
        fontWeight: 'bold',
      }}>
        !
      </div>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--color-text)' }}>
        {title}
      </h4>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
        {message}
      </p>

      {actionText && actionLink && (
        <Link to={actionLink} className="btn btn-primary btn-sm">
          {actionText}
        </Link>
      )}

      {actionText && onAction && !actionLink && (
        <button type="button" onClick={onAction} className="btn btn-primary btn-sm">
          {actionText}
        </button>
      )}
    </div>
  );
}
