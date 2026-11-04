import React from 'react';

/**
 * StatusBadge Component
 * Reusable visual indicator for opportunity, bid, workflow, payment, and audit log statuses.
 */
export default function StatusBadge({ status }) {
  if (!status && status !== 0) return null;

  const s = String(status).trim().toLowerCase();

  let badgeClass = 'badge-draft';
  let label = status;

  switch (s) {
    // Opportunity statuses
    case 'open':
    case 'published':
      badgeClass = 'badge-published';
      label = 'Open / Active';
      break;
    case 'draft':
      badgeClass = 'badge-draft';
      label = 'Draft';
      break;
    case 'closed':
      badgeClass = 'badge-closed';
      label = 'Closed';
      break;
    case 'awarded':
      badgeClass = 'badge-selected';
      label = 'Awarded';
      break;
    case 'completed':
      badgeClass = 'badge-selected';
      label = 'Completed';
      break;

    // Bid statuses
    case 'submitted':
      badgeClass = 'badge-submitted';
      label = 'Submitted';
      break;
    case 'under_review':
      badgeClass = 'badge-review';
      label = 'Under Review';
      break;
    case 'selected':
      badgeClass = 'badge-selected';
      label = 'Selected';
      break;
    case 'not_selected':
      badgeClass = 'badge-not-selected';
      label = 'Not Selected';
      break;
    case 'withdrawn':
      badgeClass = 'badge-closed';
      label = 'Withdrawn';
      break;

    // Payment statuses
    case 'paid':
      badgeClass = 'badge-paid';
      label = 'Paid / Disbursed';
      break;
    case 'for_billing':
      badgeClass = 'badge-for-billing';
      label = 'For Billing';
      break;
    case 'processing':
      badgeClass = 'badge-processing';
      label = 'Processing';
      break;
    case 'not_for_billing':
      badgeClass = 'badge-draft';
      label = 'Not for Billing';
      break;

    // Audit actions
    case 'login':
    case 'logout':
      badgeClass = 'badge-auth';
      label = status.toUpperCase();
      break;
    case 'create_opportunity':
    case 'create_transaction':
    case 'submit_bid':
      badgeClass = 'badge-create';
      label = status.replace(/_/g, ' ').toUpperCase();
      break;
    case 'update_stage':
    case 'advance_stage':
      badgeClass = 'badge-stage';
      label = status.replace(/_/g, ' ').toUpperCase();
      break;
    case 'select_bid':
    case 'award':
      badgeClass = 'badge-selected';
      label = status.replace(/_/g, ' ').toUpperCase();
      break;

    default:
      badgeClass = 'badge-neutral';
      label = status;
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
}
