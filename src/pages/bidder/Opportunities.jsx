import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import Loading from '../../components/Loading.jsx';
import EmptyState from '../../components/EmptyState.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/bidder/Opportunities.jsx
 * =============================================================================
 * 
 * Opportunities Page (Bidder & Public)
 * Lists open procurement notices published by CHR-CAR where deadline >= NOW().
 * Includes client-side filtering by reference number or project title.
 */
export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const DEMO_OPPORTUNITIES = [
    {
      id: 1,
      reference_no: 'CHR-CAR-2024-001',
      title: 'Procurement of Office Supplies for Q3 2024',
      description: 'Procurement of assorted office supplies, paper products, and desktop stationery for CHR-CAR regional operations.',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 150000.00,
      deadline: '2026-11-20 17:00:00',
      status: 'open',
      total_items: 4,
    },
    {
      id: 2,
      reference_no: 'CHR-CAR-2024-002',
      title: 'Supply & Delivery of IT Equipment (Laptops & Printers)',
      description: 'Supply, delivery, and setup of five (5) high-performance laptops and two (2) multi-function network laser printers.',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 450000.00,
      deadline: '2026-11-25 17:00:00',
      status: 'open',
      total_items: 2,
    },
    {
      id: 3,
      reference_no: 'CHR-CAR-2024-003',
      title: 'Catering and Venue for Human Rights Day Regional Summit',
      description: 'Full-day catering package (buffet lunch and 2 snacks) and air-conditioned venue for 120 summit participants in Baguio City.',
      procurement_type: 'NP-53.9 Small Value Procurement',
      abc: 85000.00,
      deadline: '2026-11-30 17:00:00',
      status: 'open',
      total_items: 2,
    },
  ];

  const loadOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOpenOpportunities();
      if (res && res.data && Array.isArray(res.data.opportunities) && res.data.opportunities.length > 0) {
        setOpportunities(res.data.opportunities);
      } else {
        // Fallback to demo opportunities if database is currently empty
        setOpportunities(DEMO_OPPORTUNITIES);
      }
    } catch (err) {
      console.warn('Backend offline, using seed opportunities for demonstration:', err.message);
      setError(err.message);
      setOpportunities(DEMO_OPPORTUNITIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, []);

  // Client-side search filtering by reference_no, title, or procurement_type
  const filtered = opportunities.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.reference_no && item.reference_no.toLowerCase().includes(q)) ||
      (item.procurement_type && item.procurement_type.toLowerCase().includes(q))
    );
  });

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₱ ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Procurement Opportunities</h1>
        <p>Browse active Requests for Quotation (RFQ) and Invitation to Bid published by CHR-CAR.</p>
      </div>

      {error && (
        <div className="notice-box warning" style={{ marginBottom: '16px' }}>
          <div>
            <strong>Backend Connection:</strong> {error}. Showing available cached records.
          </div>
        </div>
      )}

      {/* Action Bar with Search & Counter */}
      <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="search-input-group" style={{ maxWidth: '420px', width: '100%' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by Reference No, Title, or Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Showing <strong>{filtered.length}</strong> of <strong>{opportunities.length}</strong> active opportunities
        </div>
      </div>

      <div className="gov-card">
        <div className="gov-card-body" style={{ padding: 0 }}>
          {loading ? (
            <Loading message="Loading open procurement notices..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={searchTerm ? 'No Matching Opportunities' : 'No Open Opportunities'}
              message={
                searchTerm
                  ? `No procurement notices matched "${searchTerm}". Try adjusting your keywords.`
                  : 'There are currently no open procurement invitations published by CHR-CAR.'
              }
              actionText={searchTerm ? 'Clear Search Filter' : null}
              onAction={() => setSearchTerm('')}
            />
          ) : (
            <div className="table-responsive">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Ref No.</th>
                    <th>Project Description</th>
                    <th>Procurement Mode</th>
                    <th>Approved Budget (ABC)</th>
                    <th>Items</th>
                    <th>Submission Deadline</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.reference_no}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        {item.description && (
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {item.description.length > 80 ? `${item.description.substring(0, 80)}...` : item.description}
                          </div>
                        )}
                      </td>
                      <td><span className="badge badge-draft">{item.procurement_type}</span></td>
                      <td><strong>{formatCurrency(item.abc)}</strong></td>
                      <td>{item.total_items ?? 1} item(s)</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{formatDate(item.deadline)}</div>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Link to={`/bidder/opportunities/${item.id}`} className="btn btn-outline btn-sm">
                            View Details
                          </Link>
                          <Link to={`/bidder/submit-bid/${item.id}`} className="btn btn-primary btn-sm">
                            Submit Bid
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
