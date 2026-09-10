import React, { useState } from "react";

const styles = `
.order-reports-page {
  --amz-blue: #007185;
  --amz-blue-dark: #003553;
  --amz-text: #0f1111;
  --amz-text-secondary: #565959;
  --amz-border: #d5d9d9;
  --amz-bg: #eaeded;
  --amz-card-bg: #ffffff;
  --amz-green: #067d62;
  --amz-green-bg: #f0fbf6;
  --amz-orange: #e47911;
  --amz-orange-bg: #fef4e8;
  --amz-red: #b12704;
  --amz-red-bg: #fdf1f0;
  --amz-blue-bg: #eaf2fd;

  font-family: "Amazon Ember", Arial, sans-serif;
  background: var(--amz-bg);
  color: var(--amz-text);
  padding: 24px;
  min-height: 100vh;
}
.order-reports-page * { box-sizing: border-box; }

.order-reports-page .breadcrumb {
  font-size: 13px;
  color: var(--amz-text-secondary);
  margin-bottom: 10px;
}
.order-reports-page .breadcrumb a { color: var(--amz-blue); text-decoration: none; }
.order-reports-page .breadcrumb a:hover { text-decoration: underline; }

.order-reports-page .page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}
.order-reports-page .page-header h1 { font-size: 21px; font-weight: 700; margin: 0; }
.order-reports-page .page-sub { font-size: 13px; color: var(--amz-text-secondary); margin-top: 4px; }

.order-reports-page .btn {
  border: 1px solid var(--amz-border);
  background: #fff;
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--amz-text);
}
.order-reports-page .btn:hover { background: #f7f8f8; }
.order-reports-page .btn-primary {
  background: linear-gradient(to bottom, #f7dfa5, #f0c14b);
  border: 1px solid #a88734;
  color: #111;
}
.order-reports-page .btn-primary:hover { background: linear-gradient(to bottom, #f5d78e, #eeb933); }
.order-reports-page .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.order-reports-page .btn-small { padding: 6px 12px; font-size: 12px; }

.order-reports-page .tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px;
  border-bottom: 1px solid var(--amz-border);
  background: #fff;
  border-radius: 8px 8px 0 0;
  overflow-x: auto;
}
.order-reports-page .tab {
  padding: 14px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--amz-text-secondary);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}
.order-reports-page .tab.active {
  color: var(--amz-text);
  border-bottom-color: var(--amz-orange);
  font-weight: 700;
}

.order-reports-page .card {
  background: var(--amz-card-bg);
  border: 1px solid var(--amz-border);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 20px;
  margin-bottom: 16px;
}
.order-reports-page .card.standalone {
  border-top: 1px solid var(--amz-border);
  border-radius: 8px;
}
.order-reports-page .card h2 { font-size: 15px; font-weight: 700; margin: 0 0 14px 0; }

/* generate form */
.order-reports-page .form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  align-items: end;
}
@media (max-width: 900px) {
  .order-reports-page .form-grid { grid-template-columns: repeat(2, 1fr); }
}
.order-reports-page .field label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--amz-text);
  margin-bottom: 6px;
}
.order-reports-page select,
.order-reports-page input[type="date"] {
  width: 100%;
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 13px;
  color: var(--amz-text);
  background: #fff;
  font-family: inherit;
}
.order-reports-page select:focus,
.order-reports-page input[type="date"]:focus {
  outline: none;
  border-color: var(--amz-blue);
  box-shadow: 0 0 0 1px var(--amz-blue);
}
.order-reports-page .report-type-desc {
  font-size: 12px;
  color: var(--amz-text-secondary);
  margin-top: 10px;
  background: #f7f8f8;
  border-radius: 6px;
  padding: 10px 12px;
}

/* filter bar for report list */
.order-reports-page .filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.order-reports-page .search-box {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  gap: 8px;
}
.order-reports-page .search-box input { border: none; outline: none; font-size: 13px; flex: 1; }
.order-reports-page .search-box svg { color: #8b9195; flex-shrink: 0; }
.order-reports-page .filter-pill {
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* table */
.order-reports-page table { width: 100%; border-collapse: collapse; font-size: 13px; }
.order-reports-page thead th {
  text-align: left;
  padding: 10px 14px;
  background: #f7f8f8;
  color: var(--amz-text-secondary);
  font-weight: 700;
  font-size: 12px;
  border-bottom: 1px solid var(--amz-border);
  white-space: nowrap;
}
.order-reports-page tbody td {
  padding: 12px 14px;
  border-bottom: 1px solid #f0f2f2;
  color: var(--amz-text);
  vertical-align: middle;
}
.order-reports-page tbody tr:hover { background: #fafafa; }
.order-reports-page tbody tr:last-child td { border-bottom: none; }

.order-reports-page .report-name { font-weight: 500; color: var(--amz-text); }
.order-reports-page .report-id { font-size: 11px; color: var(--amz-text-secondary); margin-top: 2px; }

.order-reports-page .badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.order-reports-page .badge-dot { width: 6px; height: 6px; border-radius: 50%; }
.order-reports-page .badge-ready { background: var(--amz-green-bg); color: var(--amz-green); }
.order-reports-page .badge-ready .badge-dot { background: var(--amz-green); }
.order-reports-page .badge-processing { background: var(--amz-orange-bg); color: #8a5a00; }
.order-reports-page .badge-processing .badge-dot { background: var(--amz-orange); animation: pulse 1.4s infinite; }
.order-reports-page .badge-failed { background: var(--amz-red-bg); color: var(--amz-red); }
.order-reports-page .badge-failed .badge-dot { background: var(--amz-red); }
.order-reports-page .badge-scheduled { background: var(--amz-blue-bg); color: #0967d2; }
.order-reports-page .badge-scheduled .badge-dot { background: #0967d2; }

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}

.order-reports-page .action-link {
  color: var(--amz-blue);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.order-reports-page .action-link:hover { text-decoration: underline; }
.order-reports-page .action-link.disabled { color: #8b9195; cursor: not-allowed; pointer-events: none; }

.order-reports-page .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 56px 20px;
  color: var(--amz-text-secondary);
}
.order-reports-page .empty-state .empty-icon { width: 64px; height: 64px; margin-bottom: 14px; opacity: 0.55; }
.order-reports-page .empty-state .empty-title { font-size: 14px; font-weight: 700; color: var(--amz-text); margin-bottom: 6px; }
.order-reports-page .empty-state .empty-sub { font-size: 13px; max-width: 300px; }

.order-reports-page .table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 2px 0 2px;
  font-size: 12px;
  color: var(--amz-text-secondary);
  flex-wrap: wrap;
  gap: 10px;
}
.order-reports-page .pagination { display: flex; gap: 4px; align-items: center; }
.order-reports-page .page-btn {
  border: 1px solid var(--amz-border);
  background: #fff;
  border-radius: 6px;
  min-width: 28px;
  height: 28px;
  font-size: 12px;
  cursor: pointer;
  color: var(--amz-text);
}
.order-reports-page .page-btn.active { background: var(--amz-blue-dark); color: #fff; border-color: var(--amz-blue-dark); }
.order-reports-page .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M7 1.5v7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M3.5 6L7 9.5L10.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="empty-icon" viewBox="0 0 64 64" fill="none">
    <rect x="12" y="8" width="40" height="48" rx="3" stroke="#B7BDC0" strokeWidth="2" />
    <path d="M20 20h24M20 28h24M20 36h16" stroke="#B7BDC0" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const TABS = ["All order reports", "Scheduled reports", "Custom reports"];

const REPORT_TYPES = [
  {
    value: "unshipped",
    label: "Unshipped Orders Report",
    desc: "Lists all orders that have not yet been marked as shipped, useful for daily fulfilment tracking.",
  },
  {
    value: "all_orders",
    label: "All Orders Report",
    desc: "A complete list of orders placed within the selected date range, including status and totals.",
  },
  {
    value: "flat_file",
    label: "Flat File Order Report",
    desc: "Tab-delimited order data formatted for bulk upload into inventory or accounting systems.",
  },
  {
    value: "returns",
    label: "Order Returns Report",
    desc: "Summarizes return requests, reasons, and refund amounts for the selected period.",
  },
  {
    value: "cancelled",
    label: "Cancelled Orders Report",
    desc: "Lists all orders cancelled by buyers or sellers within the selected date range.",
  },
];

const INITIAL_REPORTS = [
  {
    id: "RPT-99213045",
    name: "All Orders Report",
    range: "1 Jul 2026 – 15 Jul 2026",
    requested: "16 Jul 2026, 9:14 AM",
    format: "CSV",
    status: "ready",
    size: "482 KB",
  },
  {
    id: "RPT-99212988",
    name: "Unshipped Orders Report",
    range: "10 Jul 2026 – 17 Jul 2026",
    requested: "17 Jul 2026, 7:02 AM",
    format: "CSV",
    status: "processing",
    size: "—",
  },
  {
    id: "RPT-99211872",
    name: "Order Returns Report",
    range: "1 Jun 2026 – 30 Jun 2026",
    requested: "1 Jul 2026, 6:45 AM",
    format: "XLSX",
    status: "ready",
    size: "210 KB",
  },
  {
    id: "RPT-99209341",
    name: "Flat File Order Report",
    range: "1 Jun 2026 – 15 Jun 2026",
    requested: "16 Jun 2026, 8:30 AM",
    format: "TXT",
    status: "failed",
    size: "—",
  },
  {
    id: "RPT-99201120",
    name: "All Orders Report",
    range: "Weekly · every Monday",
    requested: "Recurring",
    format: "CSV",
    status: "scheduled",
    size: "—",
  },
];

const statusMeta = {
  ready: { label: "Ready", cls: "badge-ready" },
  processing: { label: "Processing", cls: "badge-processing" },
  failed: { label: "Failed", cls: "badge-failed" },
  scheduled: { label: "Scheduled", cls: "badge-scheduled" },
};

export default function OrderReports() {
  const [activeTab, setActiveTab] = useState(0);
  const [reportType, setReportType] = useState("unshipped");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-17");
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [query, setQuery] = useState("");

  const selectedType = REPORT_TYPES.find((t) => t.value === reportType);

  const handleGenerate = () => {
    const newReport = {
      id: `RPT-${Math.floor(90000000 + Math.random() * 9999999)}`,
      name: selectedType.label,
      range: `${startDate} – ${endDate}`,
      requested: "Just now",
      format: "CSV",
      status: "processing",
      size: "—",
    };
    setReports([newReport, ...reports]);
  };

  const visibleReports = reports.filter((r) => {
    if (activeTab === 1) return r.status === "scheduled";
    if (activeTab === 2) return false;
    return true;
  });

  const filtered = visibleReports.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="order-reports-page">
      <style>{styles}</style>

      <div className="breadcrumb">
        <a href="#">Orders</a> &nbsp;›&nbsp; Order Reports
      </div>

      <div className="page-header">
        <div>
          <h1>Order Reports</h1>
          <div className="page-sub">Generate and download reports about your orders, returns, and fulfilment.</div>
        </div>
        <button className="btn">Manage scheduled reports</button>
      </div>

      {/* GENERATE REPORT CARD */}
      <div className="card standalone">
        <h2>Request a new report</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="reportType">Report type</label>
            <select id="reportType" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="startDate">Start date</label>
            <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="endDate">End date</label>
            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="field">
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleGenerate}>
              Request report
            </button>
          </div>
        </div>
        {selectedType && <div className="report-type-desc">{selectedType.desc}</div>}
      </div>

      {/* REPORTS LIST */}
      <div className="tabs">
        {TABS.map((t, i) => (
          <div key={t} className={`tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
            {t}
          </div>
        ))}
      </div>
      <div className="card">
        <div className="filter-bar">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search by report name or ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="filter-pill">Last 90 days <ChevronDown /></div>
          <div className="filter-pill">Format <ChevronDown /></div>
          <div className="filter-pill">Status <ChevronDown /></div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <EmptyIcon />
            <div className="empty-title">No reports found</div>
            <div className="empty-sub">Request a new report above, or adjust your search and filters.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Date range</th>
                  <th>Requested</th>
                  <th>Format</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = statusMeta[r.status];
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="report-name">{r.name}</div>
                        <div className="report-id">{r.id}</div>
                      </td>
                      <td>{r.range}</td>
                      <td>{r.requested}</td>
                      <td>{r.format}</td>
                      <td>{r.size}</td>
                      <td>
                        <span className={`badge ${meta.cls}`}>
                          <span className="badge-dot" />
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        {r.status === "ready" ? (
                          <a className="action-link" href="#" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <DownloadIcon /> Download
                          </a>
                        ) : r.status === "failed" ? (
                          <a className="action-link" href="#">Retry</a>
                        ) : r.status === "scheduled" ? (
                          <a className="action-link" href="#">Edit schedule</a>
                        ) : (
                          <span className="action-link disabled">Download</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="table-footer">
            <span>1–{filtered.length} of {filtered.length} reports</span>
            <div className="pagination">
              <button className="page-btn" disabled>‹</button>
              <button className="page-btn active">1</button>
              <button className="page-btn" disabled>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}