import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Reports.css';
import { API_URL } from '../config';

const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const Reports = () => {
  // ── Data state ───────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary]   = useState({ total:0, approved:0, pending:0, rejected:0, cancelled:0 });
  const [hallOptions, setHallOptions] = useState([]); // unique halls from response
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // ── Row 1 filters ────────────────────────────────────────────────────────
  const [timeframe, setTimeframe]       = useState('month');
  const [searchInput, setSearchInput]   = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // ── Row 2 filters (advanced) ─────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHall, setFilterHall]     = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Derived: are any advanced filters active?
  const hasAdvanced = filterStatus || filterHall || startDate || endDate;

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      // Row 1
      if (activeSearch) params.append('search', activeSearch);

      // Date: specific range overrides timeframe
      if (startDate || endDate) {
        if (startDate) params.append('startDate', startDate);
        if (endDate)   params.append('endDate', endDate);
      } else if (timeframe) {
        params.append('timeframe', timeframe);
      }

      // Row 2 advanced
      if (filterStatus) params.append('status', filterStatus);
      if (filterHall)   params.append('hallId', filterHall);

      const res  = await fetch(`${API_URL}/api/bookings/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        setBookings(data.data);
        setSummary(data.summary);
        setHallOptions(data.halls || []);
      } else {
        setError(data.message || 'Failed to load reports');
      }
    } catch {
      setError('Network error — check your connection.');
    } finally {
      setLoading(false);
    }
  }, [timeframe, activeSearch, filterStatus, filterHall, startDate, endDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (e) => { e.preventDefault(); setActiveSearch(searchInput.trim()); };
  const clearSearch  = ()  => { setSearchInput(''); setActiveSearch(''); };

  const clearAll = () => {
    setTimeframe('month');
    setSearchInput(''); setActiveSearch('');
    setFilterStatus(''); setFilterHall('');
    setStartDate(''); setEndDate('');
  };

  // When date range is used, disable timeframe presets
  const handleTimeframe = (v) => {
    setStartDate(''); setEndDate('');
    setTimeframe(v);
  };

  const handleDateChange = (field, val) => {
    setTimeframe(''); // clear preset when using manual dates
    if (field === 'start') setStartDate(val);
    else setEndDate(val);
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  const exportCSV = () => {
    if (!bookings.length) return;
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Event Name','Hall','Hall No.','Date','Start','End','Organizer','Department','Seats','Status'];
    const rows = bookings.map(b => [
      esc(b.programmeName), esc(b.hall?.name), esc(b.hall?.number),
      esc(fmtDate(b.eventDate)), esc(b.startTime), esc(b.endTime),
      esc(b.requestedBy?.name), esc(b.requestedBy?.department),
      b.numberOfSeats, b.status
    ]);
    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const url  = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' }));
    const link = Object.assign(document.createElement('a'), {
      href: url,
      download: `report-${new Date().toISOString().slice(0,10)}.csv`
    });
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const statusClass = (s) =>
    ({ APPROVED:'rpt-approved', PENDING:'rpt-pending', REJECTED:'rpt-rejected', CANCELLED:'rpt-cancelled' }[s] || '');

  const STATS = [
    { key:'total',     icon:'📋', label:'Total',     cls:'rpt-s-total'    },
    { key:'approved',  icon:'✅', label:'Approved',  cls:'rpt-s-approved' },
    { key:'pending',   icon:'⏳', label:'Pending',   cls:'rpt-s-pending'  },
    { key:'rejected',  icon:'❌', label:'Rejected',  cls:'rpt-s-rejected' },
    { key:'cancelled', icon:'🚫', label:'Cancelled', cls:'rpt-s-cancelled'},
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rpt-wrap">

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="rpt-stats">
        {STATS.map(({ key, icon, label, cls }) => (
          <div key={key} className={`rpt-stat ${cls}`}>
            <span className="rpt-stat-icon">{icon}</span>
            <div className="rpt-stat-info">
              <strong>{summary[key]}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Timeframe + Search + Export ───────────────────────────── */}
      <div className="rpt-filters rpt-row1">
        {/* Timeframe presets */}
        <div className="rpt-tf-group">
          {[['week','📅 Week'],['month','🗓️ Month'],['','🌐 All']].map(([v, lbl]) => (
            <button
              key={v}
              className={`rpt-tf-btn${timeframe === v && !startDate && !endDate ? ' active' : ''}`}
              onClick={() => handleTimeframe(v)}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="rpt-search">
          <input
            id="rpt-search-input"
            type="text"
            placeholder="Search event name…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="rpt-search-inp"
          />
          <button id="rpt-search-btn" type="submit" className="rpt-search-go">🔍</button>
          {activeSearch && (
            <button type="button" className="rpt-clear-btn" onClick={clearSearch}>✕</button>
          )}
        </form>

        {/* Advanced toggle */}
        <button
          className={`rpt-adv-toggle${hasAdvanced ? ' has-filters' : ''}`}
          onClick={() => setAdvancedOpen(o => !o)}
          title="Advanced Filters"
        >
          ⚙️ Filters{hasAdvanced ? ` (${[filterStatus, filterHall, startDate, endDate].filter(Boolean).length})` : ''}
          <span className={`rpt-adv-caret${advancedOpen ? ' open' : ''}`}>▾</span>
        </button>

        {/* Export */}
        <button
          id="rpt-export-btn"
          className="rpt-export-btn"
          onClick={exportCSV}
          disabled={!bookings.length || loading}
        >
          ⬇️ CSV
        </button>
      </div>

      {/* ── Row 2: Advanced Filters (collapsible) ────────────────────────── */}
      {advancedOpen && (
        <div className="rpt-adv-bar">
          {/* Status dropdown */}
          <div className="rpt-adv-field">
            <label htmlFor="rpt-status-sel">Status</label>
            <select
              id="rpt-status-sel"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="rpt-select"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Hall dropdown (populated from response) */}
          <div className="rpt-adv-field">
            <label htmlFor="rpt-hall-sel">Hall</label>
            <select
              id="rpt-hall-sel"
              value={filterHall}
              onChange={e => setFilterHall(e.target.value)}
              className="rpt-select"
            >
              <option value="">All Halls</option>
              {hallOptions.map(h => (
                <option key={h._id} value={h._id}>
                  {h.name}{h.number ? ` (#${h.number})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Start date */}
          <div className="rpt-adv-field">
            <label htmlFor="rpt-start-date">From Date</label>
            <input
              id="rpt-start-date"
              type="date"
              value={startDate}
              onChange={e => handleDateChange('start', e.target.value)}
              className="rpt-date-inp"
              max={endDate || undefined}
            />
          </div>

          {/* End date */}
          <div className="rpt-adv-field">
            <label htmlFor="rpt-end-date">To Date</label>
            <input
              id="rpt-end-date"
              type="date"
              value={endDate}
              onChange={e => handleDateChange('end', e.target.value)}
              className="rpt-date-inp"
              min={startDate || undefined}
            />
          </div>

          {/* Clear all */}
          {hasAdvanced && (
            <button className="rpt-clear-all-btn" onClick={clearAll}>
              ✕ Clear All
            </button>
          )}
        </div>
      )}

      {/* ── Active filter chips ───────────────────────────────────────────── */}
      {(activeSearch || hasAdvanced || (timeframe && timeframe !== 'month')) && (
        <div className="rpt-chips">
          {timeframe === 'week'  && !startDate && !endDate && <span className="rpt-chip">Last 7 days</span>}
          {timeframe === ''      && !startDate && !endDate && <span className="rpt-chip">All Time</span>}
          {startDate  && <span className="rpt-chip">From: <strong>{startDate}</strong></span>}
          {endDate    && <span className="rpt-chip">To: <strong>{endDate}</strong></span>}
          {activeSearch && <span className="rpt-chip">Search: <strong>{activeSearch}</strong></span>}
          {filterStatus && <span className="rpt-chip">Status: <strong>{filterStatus}</strong></span>}
          {filterHall   && <span className="rpt-chip">Hall: <strong>{hallOptions.find(h => h._id === filterHall)?.name || filterHall}</strong></span>}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rpt-table-wrap">
        {loading ? (
          <div className="rpt-state"><div className="rpt-spinner" /><p>Loading reports…</p></div>
        ) : error ? (
          <div className="rpt-state rpt-err">
            <span>⚠️</span><p>{error}</p>
            <button className="rpt-retry" onClick={fetchReports}>Retry</button>
          </div>
        ) : !bookings.length ? (
          <div className="rpt-state">
            <span style={{ fontSize:'2.5rem' }}>📊</span>
            <h3>No bookings found</h3>
            <p>Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <table className="rpt-table">
            <thead>
              <tr>
                {['#','Event Name','Hall','Date','Time','Organizer','Seats','Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b._id}>
                  <td className="rpt-idx">{i + 1}</td>
                  <td className="rpt-name">{b.programmeName}</td>
                  <td>
                    <span className="rpt-hall-name">{b.hall?.name ?? '—'}</span>
                    {b.hall?.number && <span className="rpt-hall-num"> #{b.hall.number}</span>}
                  </td>
                  <td className="rpt-date">{fmtDate(b.eventDate)}</td>
                  <td className="rpt-time">{b.startTime} – {b.endTime}</td>
                  <td>
                    <div className="rpt-org">
                      <span className="rpt-org-name">{b.requestedBy?.name ?? '—'}</span>
                      {b.requestedBy?.department && (
                        <span className="rpt-org-dept">{b.requestedBy.department}</span>
                      )}
                    </div>
                  </td>
                  <td className="rpt-seats">{b.numberOfSeats}</td>
                  <td><span className={`rpt-pill ${statusClass(b.status)}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {!loading && bookings.length > 0 && (
        <p className="rpt-footer">
          Showing <strong>{bookings.length}</strong> booking{bookings.length !== 1 ? 's' : ''}
          {timeframe === 'week'  && !startDate && ' · last 7 days'}
          {timeframe === 'month' && !startDate && ' · last 30 days'}
          {activeSearch && ` · matching "${activeSearch}"`}
          {filterStatus && ` · status: ${filterStatus}`}
        </p>
      )}
    </div>
  );
};

export default Reports;
