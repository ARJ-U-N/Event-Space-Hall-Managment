import React, { useState, useEffect, useCallback } from 'react';
import '../styles/Reports.css';
import { API_URL } from '../config';

const Reports = () => {
  const [bookings, setBookings]         = useState([]);
  const [summary, setSummary]           = useState({ total:0, approved:0, pending:0, rejected:0, cancelled:0 });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [timeframe, setTimeframe]       = useState('month');
  const [searchInput, setSearchInput]   = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (timeframe)    params.append('timeframe', timeframe);
      if (activeSearch) params.append('search', activeSearch);

      const res  = await fetch(`${API_URL}/api/bookings/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) { setBookings(data.data); setSummary(data.summary); }
      else setError(data.message || 'Failed to load reports');
    } catch { setError('Network error — check your connection.'); }
    finally  { setLoading(false); }
  }, [timeframe, activeSearch]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSearch = (e) => { e.preventDefault(); setActiveSearch(searchInput.trim()); };
  const clearSearch  = ()  => { setSearchInput(''); setActiveSearch(''); };

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

  const statusClass = (s) =>
    ({ APPROVED:'rpt-approved', PENDING:'rpt-pending', REJECTED:'rpt-rejected', CANCELLED:'rpt-cancelled' }[s] || '');

  const exportCSV = () => {
    if (!bookings.length) return;
    const esc = (v) => `"${String(v ?? '').replace(/"/g,'""')}"`;
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
      download: `report-${timeframe||'all'}-${new Date().toISOString().slice(0,10)}.csv`
    });
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const STATS = [
    { key:'total',     icon:'📋', label:'Total',     cls:'rpt-s-total'   },
    { key:'approved',  icon:'✅', label:'Approved',  cls:'rpt-s-approved'},
    { key:'pending',   icon:'⏳', label:'Pending',   cls:'rpt-s-pending' },
    { key:'rejected',  icon:'❌', label:'Rejected',  cls:'rpt-s-rejected'},
    { key:'cancelled', icon:'🚫', label:'Cancelled', cls:'rpt-s-cancelled'},
  ];

  return (
    <div className="rpt-wrap">

      {/* Stats */}
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

      {/* Filters */}
      <div className="rpt-filters">
        <div className="rpt-tf-group">
          {[['week','📅 This Week'],['month','🗓️ This Month'],['','🌐 All Time']].map(([v,lbl]) => (
            <button key={v} className={`rpt-tf-btn${timeframe===v?' active':''}`}
              onClick={() => setTimeframe(v)}>{lbl}</button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="rpt-search">
          <input id="rpt-search-input" type="text" placeholder="Search event name…"
            value={searchInput} onChange={e => setSearchInput(e.target.value)} className="rpt-search-inp" />
          <button id="rpt-search-btn" type="submit" className="rpt-search-go">🔍 Search</button>
          {activeSearch && <button type="button" className="rpt-clear-btn" onClick={clearSearch}>✕ Clear</button>}
        </form>

        <button id="rpt-export-btn" className="rpt-export-btn"
          onClick={exportCSV} disabled={!bookings.length || loading}>
          ⬇️ Download CSV
        </button>
      </div>

      {/* Table area */}
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
            <span style={{fontSize:'2.5rem'}}>📊</span>
            <h3>No bookings found</h3>
            <p>Try adjusting your filters or date range.</p>
          </div>
        ) : (
          <table className="rpt-table">
            <thead>
              <tr>
                {['#','Event Name','Hall','Date','Time','Organizer','Seats','Status'].map(h=>(
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <tr key={b._id}>
                  <td className="rpt-idx">{i+1}</td>
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
                      {b.requestedBy?.department && <span className="rpt-org-dept">{b.requestedBy.department}</span>}
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

      {!loading && bookings.length > 0 && (
        <p className="rpt-footer">
          Showing <strong>{bookings.length}</strong> booking{bookings.length!==1?'s':''}
          {timeframe==='week'  && ' · last 7 days'}
          {timeframe==='month' && ' · last 30 days'}
          {activeSearch && ` · matching "${activeSearch}"`}
        </p>
      )}
    </div>
  );
};

export default Reports;
