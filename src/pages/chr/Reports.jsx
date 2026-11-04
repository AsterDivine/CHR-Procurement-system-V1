import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/pages/chr/Reports.jsx
 * =============================================================================
 * 
 * Reports & Accomplishment Monitoring for CHR Personnel.
 * Features:
 * - Multi-criteria filtering (Date Range, Opportunity Status, Stage, Budget Source)
 * - Summary KPI cards (Total ABC, Total Contract Awards, Total Public Savings)
 * - Detailed tabular breakdown of all procurement activities
 * - Backend CSV Export with automatic offline CSV generation fallback
 * - Window printing with clean government print stylesheet & signatory block
 */

const PROCUREMENT_STAGES = [
  'Purchase Request',
  'Request for Quotation',
  'Abstract / Canvass',
  'BAC Resolution',
  'Notice of Award',
  'Purchase Order',
  'Notice to Proceed',
  'Delivery / Implementation',
  'Inspection / Evaluation',
  'Billing / Payment',
  'Completed',
];

const DEFAULT_BUDGET_SOURCES = [
  { id: 1, name: 'GAA 2024 - MOOE Regular Fund (Demo)', fiscal_year: 2024 },
  { id: 2, name: 'GAA 2024 - Capital Outlay IT Fund (Demo)', fiscal_year: 2024 },
  { id: 3, name: 'CHR Human Rights Protection Special Project Fund (Demo)', fiscal_year: 2024 },
];

const DEMO_REPORT_RECORDS = [
  {
    transaction_id: 1,
    control_no: 'TXN-2024-001',
    reference_no: 'CHR-CAR-2024-001',
    title: 'Procurement of Office Supplies for Q3 2024',
    opportunity_status: 'open',
    abc: 150000.0,
    awarded_amount: 142500.0,
    savings: 7500.0,
    current_stage: 'Abstract / Canvass',
    payment_status: 'not_for_billing',
    budget_source: 'GAA 2024 - MOOE Regular Fund (Demo)',
    budget_source_id: 1,
    winning_supplier_rep: 'Juan Dela Cruz',
    selected_company: 'Highland Paper & Office Depot',
    created_at: '2024-08-10 09:30:00',
  },
  {
    transaction_id: 2,
    control_no: 'TXN-2024-002',
    reference_no: 'CHR-CAR-2024-002',
    title: 'Supply and Delivery of IT Equipment for Legal and Investigation Unit',
    opportunity_status: 'open',
    abc: 450000.0,
    awarded_amount: 428000.0,
    savings: 22000.0,
    current_stage: 'Request for Quotation',
    payment_status: 'not_for_billing',
    budget_source: 'GAA 2024 - Capital Outlay IT Fund (Demo)',
    budget_source_id: 2,
    winning_supplier_rep: 'Maria Santos',
    selected_company: 'Cordillera Computer & Cyber Solutions',
    created_at: '2024-08-15 14:15:00',
  },
  {
    transaction_id: 3,
    control_no: 'TXN-2024-003',
    reference_no: 'CHR-CAR-2024-003',
    title: 'Preventive Maintenance and Spare Parts for CHR-CAR Service Vehicles',
    opportunity_status: 'awarded',
    abc: 85000.0,
    awarded_amount: 79500.0,
    savings: 5500.0,
    current_stage: 'Notice of Award',
    payment_status: 'not_for_billing',
    budget_source: 'GAA 2024 - MOOE Regular Fund (Demo)',
    budget_source_id: 1,
    winning_supplier_rep: 'Arthur Baguio',
    selected_company: 'Baguio Auto Tech Services',
    created_at: '2024-08-01 11:00:00',
  },
  {
    transaction_id: 4,
    control_no: 'TXN-2024-004',
    reference_no: 'CHR-CAR-2024-004',
    title: 'Meals, Venue, and Accommodation for Regional Human Rights Summit',
    opportunity_status: 'completed',
    abc: 120000.0,
    awarded_amount: 114000.0,
    savings: 6000.0,
    current_stage: 'Completed',
    payment_status: 'paid',
    budget_source: 'CHR Human Rights Protection Special Project Fund (Demo)',
    budget_source_id: 3,
    winning_supplier_rep: 'Elena Fernandez',
    selected_company: 'Crown Convention Center & Hotel',
    created_at: '2024-07-20 10:00:00',
  },
];

export default function Reports() {
  const { user } = useAuth();

  // Filters State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [budgetSourceId, setBudgetSourceId] = useState('');

  // Data & UI State
  const [budgetSources, setBudgetSources] = useState(DEFAULT_BUDGET_SOURCES);
  const [records, setRecords] = useState([]);
  const [totals, setTotals] = useState({ total_abc: 0, total_awarded: 0, total_savings: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Load Budget Sources once on mount
  useEffect(() => {
    async function loadBudgets() {
      try {
        const res = await api.getBudgetList();
        if (res.data && res.data.length > 0) {
          setBudgetSources(res.data);
        }
      } catch {
        // Fallback to DEFAULT_BUDGET_SOURCES
      }
    }
    loadBudgets();
  }, []);

  // Fetch report data based on active filters
  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (fromDate) params.append('date_from', fromDate);
    if (toDate) params.append('date_to', toDate);
    if (statusFilter) params.append('status', statusFilter);
    if (stageFilter) params.append('stage', stageFilter);
    if (budgetSourceId) params.append('budget_source_id', budgetSourceId);

    try {
      const res = await api.getProcurementReport(params.toString());
      if (res.data) {
        setRecords(res.data.records || []);
        setTotals(res.data.totals || { total_abc: 0, total_awarded: 0, total_savings: 0 });
      }
    } catch {
      // Offline fallback: filter demo data client-side
      let filtered = [...DEMO_REPORT_RECORDS];

      if (fromDate) {
        filtered = filtered.filter((r) => r.created_at.slice(0, 10) >= fromDate);
      }
      if (toDate) {
        filtered = filtered.filter((r) => r.created_at.slice(0, 10) <= toDate);
      }
      if (statusFilter) {
        filtered = filtered.filter((r) => r.opportunity_status === statusFilter);
      }
      if (stageFilter) {
        filtered = filtered.filter((r) => r.current_stage === stageFilter);
      }
      if (budgetSourceId) {
        filtered = filtered.filter((r) => String(r.budget_source_id) === String(budgetSourceId));
      }

      const sumAbc = filtered.reduce((acc, r) => acc + (Number(r.abc) || 0), 0);
      const sumAwarded = filtered.reduce((acc, r) => acc + (Number(r.awarded_amount) || 0), 0);
      const sumSavings = filtered.reduce((acc, r) => acc + (Number(r.savings) || 0), 0);

      setRecords(filtered);
      setTotals({
        total_abc: sumAbc,
        total_awarded: sumAwarded,
        total_savings: sumSavings,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setStatusFilter('');
    setStageFilter('');
    setBudgetSourceId('');
    setTimeout(() => {
      fetchReport();
    }, 50);
  };

  // CSV Export with seamless backend link and offline client generation fallback
  const handleExportCSV = async () => {
    setExporting(true);

    const params = new URLSearchParams();
    if (fromDate) params.append('date_from', fromDate);
    if (toDate) params.append('date_to', toDate);
    if (statusFilter) params.append('status', statusFilter);
    if (stageFilter) params.append('stage', stageFilter);
    if (budgetSourceId) params.append('budget_source_id', budgetSourceId);

    const queryString = params.toString();
    const exportUrl = api.getExportCsvUrl(queryString);

    try {
      // First attempt downloading via backend endpoint
      const response = await fetch(exportUrl, { credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `CHR_Procurement_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        setExporting(false);
        return;
      }
      throw new Error('Backend export returned non-200');
    } catch {
      // Graceful offline fallback: Build CSV in browser
      const headers = [
        'Control No.',
        'Reference No.',
        'Project Title',
        'Status',
        'Current Stage',
        'Budget Source',
        'ABC (PHP)',
        'Awarded Amount (PHP)',
        'Government Savings (PHP)',
        'Selected Bidder / Company',
        'Date Created',
      ];

      const csvRows = [
        headers.join(','),
        ...records.map((r) => [
          `"${r.control_no || ''}"`,
          `"${r.reference_no || ''}"`,
          `"${(r.title || '').replace(/"/g, '""')}"`,
          `"${r.opportunity_status || ''}"`,
          `"${r.current_stage || ''}"`,
          `"${(r.budget_source || '').replace(/"/g, '""')}"`,
          (Number(r.abc) || 0).toFixed(2),
          r.awarded_amount !== null ? Number(r.awarded_amount).toFixed(2) : '0.00',
          r.savings !== null ? Number(r.savings).toFixed(2) : '0.00',
          `"${(r.selected_company || r.winning_supplier_rep || 'Pending Selection').replace(/"/g, '""')}"`,
          `"${r.created_at || ''}"`,
        ].join(',')),
        '',
        `"TOTALS","","","","","",(PHP) ${totals.total_abc.toFixed(2)},(PHP) ${totals.total_awarded.toFixed(2)},(PHP) ${totals.total_savings.toFixed(2)},"",""`,
      ];

      const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `CHR_CAR_Procurement_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '₱0.00';
    return `₱${Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="reports-container">
      {/* Formal Government Printable Letterhead (Visible only when printing) */}
      <div className="print-header">
        <div className="print-seal">REPUBLIC OF THE PHILIPPINES</div>
        <h3>COMMISSION ON HUMAN RIGHTS</h3>
        <p>Regional Office &mdash; Cordillera Administrative Region (CAR)</p>
        <p style={{ fontStyle: 'italic', fontSize: '11px', marginTop: '2px' }}>
          Procurement Unit &bull; Bids and Awards Committee Secretariat
        </p>
        <h2 style={{ marginTop: '12px', borderBottom: '2px solid #000', paddingBottom: '4px' }}>
          PROCUREMENT ACCOMPLISHMENT AND FINANCIAL MONITORING REPORT
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px' }}>
          <div>
            <strong>Report Filter:</strong>{' '}
            {fromDate || toDate ? `Period: ${fromDate || 'Start'} to ${toDate || 'Present'}` : 'All Recorded Transactions'}
            {stageFilter ? ` | Stage: ${stageFilter}` : ''}
            {statusFilter ? ` | Status: ${statusFilter}` : ''}
          </div>
          <div>
            <strong>Generated:</strong> {new Date().toLocaleDateString()} by {user?.full_name || 'CHR Personnel'}
          </div>
        </div>
      </div>

      {/* Screen Page Header (Hidden during printing) */}
      <div className="page-header no-print">
        <div>
          <h2>Procurement Accomplishment &amp; Financial Reports</h2>
          <p className="page-subtitle">
            Generate audit-ready accomplishment reports, monitor public funds utilization, and export government transaction ledgers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrint}
            title="Open browser print dialogue formatted for legal/letter bond paper"
          >
            🖨️ Print Report
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCSV}
            disabled={exporting || records.length === 0}
            title="Download CSV spreadsheet for COA or DBM reporting"
          >
            {exporting ? 'Exporting...' : '📥 Export to CSV'}
          </button>
        </div>
      </div>

      {/* Filter Card (Hidden during printing) */}
      <div className="filter-card no-print" style={{
        background: '#ffffff',
        border: '1px solid var(--color-border-light)',
        borderRadius: 'var(--border-radius-md)',
        padding: '18px 20px',
        marginBottom: '20px',
        boxShadow: 'var(--box-shadow-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary-dark)' }}>
            Report Query Parameters
          </h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
            style={{ fontSize: '12px' }}
          >
            Reset Filters
          </button>
        </div>

        <form onSubmit={handleApplyFilter} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '14px',
          alignItems: 'flex-end',
        }}>
          <div>
            <label className="form-label" htmlFor="filter-from-date">Date From</label>
            <input
              id="filter-from-date"
              type="date"
              className="form-control"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="filter-to-date">Date To</label>
            <input
              id="filter-to-date"
              type="date"
              className="form-control"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="filter-status">Opportunity Status</label>
            <select
              id="filter-status"
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Opportunity Statuses</option>
              <option value="draft">Draft</option>
              <option value="open">Open / Active</option>
              <option value="closed">Closed</option>
              <option value="awarded">Awarded</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="filter-stage">Procurement Stage</label>
            <select
              id="filter-stage"
              className="form-control"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All 11 Workflow Stages</option>
              {PROCUREMENT_STAGES.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="filter-budget">Funding / Budget Source</label>
            <select
              id="filter-budget"
              className="form-control"
              value={budgetSourceId}
              onChange={(e) => setBudgetSourceId(e.target.value)}
            >
              <option value="">All Funding Sources</option>
              {budgetSources.map((bs) => (
                <option key={bs.id} value={bs.id}>
                  {bs.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', height: '38px' }}
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* KPI Financial Metric Summary Cards */}
      <div className="report-kpi-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div className="stat-card" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border-light)',
          borderLeft: '4px solid var(--color-primary)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px 18px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total Programmed ABC
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-primary-dark)', marginTop: '4px' }}>
            {formatCurrency(totals.total_abc)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
            Approved Budget for the Contract
          </div>
        </div>

        <div className="stat-card" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border-light)',
          borderLeft: '4px solid var(--color-accent-gold)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px 18px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total Contract Awards
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-accent-gold)', marginTop: '4px' }}>
            {formatCurrency(totals.total_awarded)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
            Committed Bid Amounts
          </div>
        </div>

        <div className="stat-card" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border-light)',
          borderLeft: '4px solid var(--color-success)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px 18px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total Government Savings
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
            {formatCurrency(totals.total_savings)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
            ABC ceiling vs awarded differential
          </div>
        </div>

        <div className="stat-card" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border-light)',
          borderLeft: '4px solid var(--color-info)',
          borderRadius: 'var(--border-radius-md)',
          padding: '14px 18px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total Records Filtered
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-info)', marginTop: '4px' }}>
            {records.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
            Matching transactions
          </div>
        </div>
      </div>

      {/* Report Records Table */}
      <div className="report-table-wrapper" style={{
        background: '#ffffff',
        border: '1px solid var(--color-border-light)',
        borderRadius: 'var(--border-radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--box-shadow-sm)',
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            Loading procurement accomplishment data...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-danger)' }}>
            <p><strong>Failed to retrieve report data:</strong> {error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '10px' }}
              onClick={fetchReport}
            >
              Retry Query
            </button>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-main)' }}>
              No Procurement Records Found
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              No transactions matched the selected filter criteria. Try clearing the filters to view all records.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={handleResetFilters}
            >
              Clear Filter Constraints
            </button>
          </div>
        ) : (
          <table className="data-table print-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border-medium)' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px' }}>Control No.</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px' }}>Reference &amp; Project Title</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px' }}>Funding Source</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px' }}>Current Stage</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px' }}>ABC (₱)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px' }}>Awarded (₱)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '12px' }}>Savings (₱)</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '12px' }}>Winning Bidder / Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr
                  key={r.transaction_id || idx}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    background: idx % 2 === 0 ? '#ffffff' : '#fcfdfd',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '13px' }}>
                    {r.control_no || 'N/A'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: 600 }}>
                      {r.reference_no}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-main)' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '2px' }}>
                      Opp. Status: <StatusBadge status={r.opportunity_status} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {r.budget_source || 'Unassigned GAA Source'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--color-text-main)',
                    }}>
                      {r.current_stage}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, fontSize: '13px' }}>
                    {formatCurrency(r.abc)}
                  </td>
                  <td style={{
                    padding: '10px 14px',
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: r.awarded_amount ? 'var(--color-accent-gold)' : 'var(--color-text-subtle)',
                  }}>
                    {r.awarded_amount ? formatCurrency(r.awarded_amount) : '—'}
                  </td>
                  <td style={{
                    padding: '10px 14px',
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: r.savings && Number(r.savings) > 0 ? 'var(--color-success)' : 'var(--color-text-subtle)',
                  }}>
                    {r.savings !== null && r.savings !== undefined ? formatCurrency(r.savings) : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                    {r.selected_company ? (
                      <div>
                        <strong>{r.selected_company}</strong>
                        {r.winning_supplier_rep && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
                            Rep: {r.winning_supplier_rep}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
                        Pending Award
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid var(--color-border-medium)' }}>
                <td colSpan="4" style={{ padding: '12px 14px', textAlign: 'right', textTransform: 'uppercase', fontSize: '12px' }}>
                  Aggregate Fiscal Totals ({records.length} Transactions):
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', color: 'var(--color-primary-dark)' }}>
                  {formatCurrency(totals.total_abc)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', color: 'var(--color-accent-gold)' }}>
                  {formatCurrency(totals.total_awarded)}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: '13px', color: 'var(--color-success)' }}>
                  {formatCurrency(totals.total_savings)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Formal Government Signatory Block (Visible only in Print) */}
      <div className="print-signatories">
        <div className="signatory-col">
          <p>Prepared by:</p>
          <div className="signature-line"></div>
          <strong>{user?.full_name || 'CHR Personnel'}</strong>
          <p>BAC Secretariat / Procurement Unit</p>
        </div>

        <div className="signatory-col">
          <p>Reviewed &amp; Certified Correct:</p>
          <div className="signature-line"></div>
          <strong>ENGR. ROMULO S. DACANAY</strong>
          <p>BAC Chairperson, CHR-CAR</p>
        </div>

        <div className="signatory-col">
          <p>Approved by:</p>
          <div className="signature-line"></div>
          <strong>ATTY. HAROLD D. KUB-ARON</strong>
          <p>Regional Director / Head of Procuring Entity (HoPE)</p>
        </div>
      </div>
    </div>
  );
}
