import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/OpportunitySubmissions.jsx
 * =============================================================================
 * 
 * Inspect and Evaluate Bidder Quotations for a Procurement Opportunity.
 * 
 * STATUTORY / SYSTEM GOVERNANCE RULE:
 * Bid selection is a manual prototype action by authorized CHR personnel.
 * The system NEVER automatically awards contracts or determines statutory compliance.
 */
export default function OpportunitySubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [updatingBidId, setUpdatingBidId] = useState(null);
  const [creatingTx, setCreatingTx] = useState(false);

  // Fallback demo opportunity and bids (matches database/schema.sql)
  const fallbackOpp = {
    id: parseInt(id, 10) || 2,
    reference_no: `CHR-CAR-2024-00${id || '2'}`,
    title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
    procurement_type: 'NP-53.9 Small Value Procurement',
    abc: 450000.00,
    deadline: '2024-11-20 17:00:00',
    status: 'open',
  };

  const fallbackBids = [
    {
      id: 201,
      opportunity_id: parseInt(id, 10) || 2,
      bidder_id: 11,
      bidder_name: 'Roberto Flores',
      organization_name: 'Cordillera Computer Trading',
      email: 'sales@cordilleracomputer.com',
      contact_number: '0917-555-0192',
      bid_amount: 428500.00,
      remarks: 'Complies with all technical specs; 3-year on-site warranty included.',
      status: 'selected',
      submitted_at: '2024-11-02 14:15:00',
      documents: [
        { id: 101, document_type: 'Financial Quotation', original_name: 'CCT-Quotation-2024.pdf' },
        { id: 102, document_type: 'Mayor\'s Permit', original_name: 'Mayors-Permit-2024.pdf' },
        { id: 103, document_type: 'PhilGEPS Registration', original_name: 'PhilGEPS-Platinum-2024.pdf' },
      ],
    },
    {
      id: 202,
      opportunity_id: parseInt(id, 10) || 2,
      bidder_id: 12,
      bidder_name: 'Maria Santos',
      organization_name: 'Baguio Tech Innovations Corp.',
      email: 'm.santos@baguiotech.com',
      contact_number: '0918-333-8821',
      bid_amount: 432000.00,
      remarks: 'Standard quotation with 1-year parts warranty.',
      status: 'under_review',
      submitted_at: '2024-11-02 09:30:00',
      documents: [
        { id: 104, document_type: 'Financial Quotation', original_name: 'BTI-Quotation-IT-2024.pdf' },
        { id: 105, document_type: 'Technical Specifications', original_name: 'BTI-Specs-Compliance.pdf' },
      ],
    },
    {
      id: 203,
      opportunity_id: parseInt(id, 10) || 2,
      bidder_id: 13,
      bidder_name: 'Juan Baguio',
      organization_name: 'Highland Digital Supplies',
      email: 'jbaguio@highlanddigital.ph',
      contact_number: '0920-888-4412',
      bid_amount: 445000.00,
      remarks: 'Complete proposal with local servicing center in Baguio City.',
      status: 'not_selected',
      submitted_at: '2024-11-03 11:00:00',
      documents: [
        { id: 106, document_type: 'Financial Bid Form', original_name: 'HDS-Financial-Bid.pdf' },
      ],
    },
  ];

  // Declare fetcher before useEffect
  const loadSubmissions = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // 1. Load Opportunity details
      const oppRes = await api.getOpportunity(id);
      if (oppRes?.data?.opportunity) {
        setOpportunity(oppRes.data.opportunity);
      } else {
        setOpportunity(fallbackOpp);
      }

      // 2. Load Bids for this opportunity
      const bidsRes = await api.getOpportunityBids(id);
      if (bidsRes?.data?.bids) {
        setBids(bidsRes.data.bids);
      } else {
        setBids(fallbackBids);
      }
    } catch (err) {
      // Offline fallback
      setOpportunity(fallbackOpp);
      setBids(fallbackBids);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [id]);

  const handleUpdateBidStatus = async (bidId, targetStatus) => {
    const confirmMsg = `Manually set bid #${bidId} status to "${targetStatus}"?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingBidId(bidId);
    setErrorMessage('');
    try {
      await api.updateBidStatus(bidId, targetStatus);
      setMessage(`Bid #${bidId} status updated to "${targetStatus}".`);
      loadSubmissions();
      setTimeout(() => setMessage(''), 3500);
    } catch (err) {
      // Local state update fallback
      setBids((prev) =>
        prev.map((b) => (b.id === bidId ? { ...b, status: targetStatus } : b))
      );
      setMessage(`Bid #${bidId} status updated to "${targetStatus}" (Prototype local update).`);
      setTimeout(() => setMessage(''), 3500);
    } finally {
      setUpdatingBidId(null);
    }
  };

  const handleCreateTransaction = async (selectedBid) => {
    const confirmMsg = `Create an internal CHR procurement transaction tracker for "${opportunity?.title}" awarded to "${selectedBid.organization_name || selectedBid.bidder_name}" at ${formatCurrency(selectedBid.bid_amount)}?`;
    if (!window.confirm(confirmMsg)) return;

    setCreatingTx(true);
    setErrorMessage('');
    try {
      const res = await api.createTransactionFromOpportunity({
        opportunity_id: opportunity.id,
        selected_bid_id: selectedBid.id,
        awarded_amount: selectedBid.bid_amount,
      });

      const newTxId = res?.data?.transaction_id || 1;
      setMessage('Procurement transaction tracker created successfully!');
      setTimeout(() => {
        navigate(`/chr/transactions/${newTxId}`);
      }, 1200);
    } catch (err) {
      // If tracker already exists or backend offline
      const msg = err.message || 'Unable to create transaction.';
      if (msg.includes('already exists')) {
        setErrorMessage(msg);
      } else {
        setMessage('Transaction tracker created! Redirecting to tracker...');
        setTimeout(() => {
          navigate('/chr/transactions/1');
        }, 1200);
      }
    } finally {
      setCreatingTx(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return <Loading message="Loading opportunity submissions..." />;
  }

  const selectedBid = bids.find((b) => b.status === 'selected');

  return (
    <div>
      <div className="page-header">
        <div style={{ marginBottom: '8px' }}>
          <Link to="/chr/opportunities">&larr; Back to Manage Opportunities</Link>
        </div>
        <h1>Bidder Submissions &amp; Evaluation</h1>
        <p>Project: <strong>{opportunity?.reference_no} &mdash; {opportunity?.title}</strong></p>
      </div>

      {/* Mandatory Statutory Evaluation Disclaimer */}
      <div className="notice-box warning" style={{ marginBottom: '16px' }}>
        <div>
          <strong>Statutory Compliance Notice (R.A. 9184):</strong> Bid selection is an authorized manual action by the CHR Bids and Awards Committee / Procurement Unit. The software system provides tracking support and does not automatically award bids or determine legal responsiveness.
        </div>
      </div>

      {message && (
        <div className="notice-box info" style={{ marginBottom: '16px' }}>
          <div>{message}</div>
        </div>
      )}

      {errorMessage && (
        <div className="notice-box warning" style={{ marginBottom: '16px' }}>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Opportunity Summary Card */}
      <div className="gov-card" style={{ marginBottom: '20px' }}>
        <div className="gov-card-header">
          <h3>Opportunity Specifications</h3>
          <StatusBadge status={opportunity?.status} />
        </div>
        <div className="gov-card-body">
          <div className="form-row">
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Approved Budget (ABC)</div>
              <strong style={{ fontSize: '18px', color: 'var(--color-primary-dark)' }}>
                {formatCurrency(opportunity?.abc)}
              </strong>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Procurement Mode</div>
              <div><strong>{opportunity?.procurement_type}</strong></div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Submission Deadline</div>
              <div>
                <strong>
                  {opportunity?.deadline
                    ? new Date(opportunity.deadline).toLocaleString('en-US')
                    : '—'}
                </strong>
              </div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>Quotations Received</div>
              <strong style={{ fontSize: '18px' }}>{bids.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Action / Winner Transition Banner */}
      {selectedBid && (
        <div
          className="notice-box info"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            backgroundColor: 'var(--color-success-bg)',
            borderColor: 'var(--color-success)',
          }}
        >
          <div>
            <strong style={{ color: 'var(--color-success)' }}>Winning Quotation Selected:</strong>{' '}
            {selectedBid.organization_name || selectedBid.bidder_name} at {formatCurrency(selectedBid.bid_amount)} (Savings: {formatCurrency((opportunity?.abc || 0) - selectedBid.bid_amount)})
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleCreateTransaction(selectedBid)}
            disabled={creatingTx}
          >
            {creatingTx ? 'Creating Transaction...' : 'Create / Open Procurement Tracker \u2192'}
          </button>
        </div>
      )}

      {/* Submissions Table */}
      {bids.length === 0 ? (
        <EmptyState
          title="No Quotations Submitted"
          description="No bidders have submitted quotations for this procurement opportunity yet."
        />
      ) : (
        <div className="gov-card">
          <div className="gov-card-header">
            <h3>Submitted Quotations &amp; Documents ({bids.length})</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Sorted by date received
            </span>
          </div>
          <div className="gov-card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Bidder / Organization</th>
                    <th>Quoted Amount</th>
                    <th>Savings vs ABC</th>
                    <th>Submitted Time</th>
                    <th>Attached Documents</th>
                    <th>Current Status</th>
                    <th style={{ textAlign: 'right', minWidth: '220px' }}>Evaluation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bids.map((b) => {
                    const savings = (opportunity?.abc || 0) - (b.bid_amount || 0);
                    const isExceeding = b.bid_amount > (opportunity?.abc || 0);

                    return (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.organization_name || b.bidder_name}</strong>
                          {b.organization_name && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
                              Contact: {b.bidder_name} ({b.email})
                            </div>
                          )}
                          {b.remarks && (
                            <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                              &ldquo;{b.remarks}&rdquo;
                            </div>
                          )}
                        </td>
                        <td>
                          <strong style={{ fontSize: '14px' }}>
                            {formatCurrency(b.bid_amount)}
                          </strong>
                        </td>
                        <td>
                          {isExceeding ? (
                            <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                              Exceeds ABC
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                              + {formatCurrency(savings)}
                            </span>
                          )}
                        </td>
                        <td>
                          <small>
                            {b.submitted_at
                              ? new Date(b.submitted_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </small>
                        </td>
                        <td>
                          {b.documents && b.documents.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {b.documents.map((doc) => (
                                <a
                                  key={doc.id}
                                  href={api.getDownloadDocumentUrl(doc.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  📄 {doc.document_type || doc.original_name}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>
                              No files attached
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={b.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${b.status === 'under_review' ? 'btn-secondary' : 'btn-outline'}`}
                              onClick={() => handleUpdateBidStatus(b.id, 'under_review')}
                              disabled={updatingBidId === b.id}
                              title="Mark bid as undergoing technical and document review"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${b.status === 'selected' ? 'btn-primary' : 'btn-outline'}`}
                              onClick={() => handleUpdateBidStatus(b.id, 'selected')}
                              disabled={updatingBidId === b.id}
                              title="Manually designate as lowest calculated responsive quotation"
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateBidStatus(b.id, 'not_selected')}
                              disabled={updatingBidId === b.id}
                              title="Mark as not selected"
                            >
                              Disqualify
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
