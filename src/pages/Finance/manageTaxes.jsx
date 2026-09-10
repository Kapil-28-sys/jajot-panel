import React, { useState } from "react";

const styles = `
.manage-taxes-page {
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

  font-family: "Amazon Ember", Arial, sans-serif;
  background: var(--amz-bg);
  color: var(--amz-text);
  padding: 24px;
  min-height: 100vh;
}
.manage-taxes-page * { box-sizing: border-box; }

.manage-taxes-page .page-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
}
.manage-taxes-page .page-header h1 { font-size: 21px; font-weight: 700; margin: 0; }
.manage-taxes-page .btn {
  border: 1px solid var(--amz-border); background: #fff; border-radius: 8px; padding: 9px 16px;
  font-size: 13px; font-weight: 500; cursor: pointer; color: var(--amz-text);
}
.manage-taxes-page .btn:hover { background: #f7f8f8; }
.manage-taxes-page .btn-primary {
  background: linear-gradient(to bottom, #f7dfa5, #f0c14b); border: 1px solid #a88734; color: #111;
}
.manage-taxes-page .btn-primary:hover { background: linear-gradient(to bottom, #f5d78e, #eeb933); }

/* GSTIN status card */
.manage-taxes-page .gstin-card {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  background: var(--amz-card-bg); border: 1px solid var(--amz-border); border-radius: 8px; padding: 16px 18px; margin-bottom: 16px;
}
.manage-taxes-page .gstin-left { display: flex; align-items: center; gap: 14px; }
.manage-taxes-page .gstin-icon {
  width: 42px; height: 42px; border-radius: 8px; background: var(--amz-green-bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.manage-taxes-page .gstin-detail .gstin-number { font-size: 15px; font-weight: 700; color: var(--amz-text); }
.manage-taxes-page .gstin-detail .gstin-sub { font-size: 12px; color: var(--amz-text-secondary); margin-top: 2px; }
.manage-taxes-page .gstin-status {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700;
  background: var(--amz-green-bg); color: var(--amz-green);
}
.manage-taxes-page .gstin-status .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--amz-green); }

/* summary strip */
.manage-taxes-page .summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
@media (max-width: 1000px) { .manage-taxes-page .summary-strip { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .manage-taxes-page .summary-strip { grid-template-columns: 1fr; } }
.manage-taxes-page .summary-card { background: var(--amz-card-bg); border: 1px solid var(--amz-border); border-radius: 8px; padding: 16px; }
.manage-taxes-page .summary-card .label { font-size: 12px; color: var(--amz-text-secondary); margin-bottom: 6px; }
.manage-taxes-page .summary-card .amount { font-size: 20px; font-weight: 700; color: var(--amz-text); }
.manage-taxes-page .summary-card .sub { font-size: 12px; color: var(--amz-text-secondary); margin-top: 4px; }

/* card */
.manage-taxes-page .card { background: var(--amz-card-bg); border: 1px solid var(--amz-border); border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.manage-taxes-page .card-pad { padding: 16px; }
.manage-taxes-page .card-pad h2 { font-size: 15px; font-weight: 700; margin: 0 0 4px 0; }
.manage-taxes-page .card-sub { font-size: 12px; color: var(--amz-text-secondary); margin-bottom: 14px; }

/* tabs */
.manage-taxes-page .tabs { display: flex; gap: 4px; padding: 0 16px; border-bottom: 1px solid var(--amz-border); overflow-x: auto; }
.manage-taxes-page .tab {
  padding: 14px 12px; font-size: 13px; font-weight: 500; color: var(--amz-text-secondary);
  cursor: pointer; border-bottom: 3px solid transparent; white-space: nowrap;
}
.manage-taxes-page .tab.active { color: var(--amz-text); border-bottom-color: var(--amz-orange); font-weight: 700; }

/* filter bar */
.manage-taxes-page .filter-bar { display: flex; align-items: center; gap: 10px; padding: 14px 16px; flex-wrap: wrap; border-bottom: 1px solid var(--amz-border); }
.manage-taxes-page .filter-pill { border: 1px solid var(--amz-border); border-radius: 8px; padding: 8px 12px; font-size: 13px; background: #fff; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.manage-taxes-page .filter-pill:hover { background: #f7f8f8; }

/* table */
.manage-taxes-page table { width: 100%; border-collapse: collapse; font-size: 13px; }
.manage-taxes-page thead th { text-align: left; padding: 10px 14px; background: #f7f8f8; color: var(--amz-text-secondary); font-weight: 700; font-size: 12px; border-bottom: 1px solid var(--amz-border); white-space: nowrap; }
.manage-taxes-page tbody td { padding: 12px 14px; border-bottom: 1px solid #f0f2f2; color: var(--amz-text); }
.manage-taxes-page tbody tr:last-child td { border-bottom: none; }
.manage-taxes-page tbody tr:hover { background: #fafafa; }

.manage-taxes-page .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.manage-taxes-page .badge-dot { width: 6px; height: 6px; border-radius: 50%; }
.manage-taxes-page .badge-filed { background: var(--amz-green-bg); color: var(--amz-green); }
.manage-taxes-page .badge-filed .badge-dot { background: var(--amz-green); }
.manage-taxes-page .badge-due { background: var(--amz-orange-bg); color: #8a5a00; }
.manage-taxes-page .badge-due .badge-dot { background: var(--amz-orange); }
.manage-taxes-page .badge-overdue { background: var(--amz-red-bg); color: var(--amz-red); }
.manage-taxes-page .badge-overdue .badge-dot { background: var(--amz-red); }

.manage-taxes-page .action-link { color: var(--amz-blue); text-decoration: none; font-size: 13px; font-weight: 500; }
.manage-taxes-page .action-link:hover { text-decoration: underline; }

/* state tax table (rate breakdown) */
.manage-taxes-page .rate-table td, .manage-taxes-page .rate-table th { text-align: right; }
.manage-taxes-page .rate-table td:first-child, .manage-taxes-page .rate-table th:first-child { text-align: left; }

/* layout */
.manage-taxes-page .layout { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 900px) { .manage-taxes-page .layout { grid-template-columns: 1fr; } }
.manage-taxes-page .sidebar-note { font-size: 12px; color: var(--amz-text-secondary); line-height: 1.5; }
.manage-taxes-page .policy-link { display: inline-block; margin-top: 10px; color: var(--amz-blue); text-decoration: none; font-size: 13px; }
.manage-taxes-page .policy-link:hover { text-decoration: underline; }

.manage-taxes-page .checklist-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0f2f2; }
.manage-taxes-page .checklist-item:last-child { border-bottom: none; }
.manage-taxes-page .checklist-item .check-icon { flex-shrink: 0; margin-top: 1px; }
.manage-taxes-page .checklist-item .check-text { font-size: 13px; color: var(--amz-text); }
.manage-taxes-page .checklist-item .check-sub { font-size: 12px; color: var(--amz-text-secondary); margin-top: 2px; }
`;

const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GstIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <rect x="2" y="4" width="18" height="14" rx="2" stroke="#067D62" strokeWidth="1.5" />
    <path d="M2 8h18" stroke="#067D62" strokeWidth="1.5" />
    <path d="M5 13h6" stroke="#067D62" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CheckIcon = ({ done }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="8" fill={done ? "#067D62" : "#F0F2F2"} stroke={done ? "none" : "#D5D9D9"} strokeWidth="1.2" />
    {done && <path d="M5.5 9.2l2.2 2.2 4.8-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);

const TABS = [
  { key: "all", label: "All filings" },
  { key: "filed", label: "Filed" },
  { key: "due", label: "Due" },
  { key: "overdue", label: "Overdue" },
];

const FILINGS = [
  { period: "Jun 2026", type: "GSTR-1", dueDate: "11 Jul 2026", filedOn: "9 Jul 2026", status: "filed" },
  { period: "Jun 2026", type: "GSTR-3B", dueDate: "20 Jul 2026", filedOn: "—", status: "due" },
  { period: "May 2026", type: "GSTR-1", dueDate: "11 Jun 2026", filedOn: "10 Jun 2026", status: "filed" },
  { period: "May 2026", type: "GSTR-3B", dueDate: "20 Jun 2026", filedOn: "18 Jun 2026", status: "filed" },
  { period: "Apr 2026", type: "GSTR-3B", dueDate: "20 May 2026", filedOn: "—", status: "overdue" },
];

const RATE_BREAKDOWN = [
  { category: "Apparel & clothing", rate: "5%", taxable: "₹1,24,300", tax: "₹6,215" },
  { category: "Electronics accessories", rate: "18%", taxable: "₹86,400", tax: "₹15,552" },
  { category: "Home & kitchen", rate: "12%", taxable: "₹42,900", tax: "₹5,148" },
  { category: "Footwear (under ₹1000)", rate: "5%", taxable: "₹18,200", tax: "₹910" },
];

const statusMeta = {
  filed: { label: "Filed", cls: "badge-filed" },
  due: { label: "Due", cls: "badge-due" },
  overdue: { label: "Overdue", cls: "badge-overdue" },
};

export default function ManageTaxes() {
  const [activeTab, setActiveTab] = useState("all");

  const filtered = activeTab === "all" ? FILINGS : FILINGS.filter((f) => f.status === activeTab);

  return (
    <div className="manage-taxes-page">
      <style>{styles}</style>

      <div className="page-header">
        <h1>Manage Taxes</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn">Download tax report</button>
          <button className="btn btn-primary">Update GSTIN</button>
        </div>
      </div>

      <div className="gstin-card">
        <div className="gstin-left">
          <div className="gstin-icon"><GstIcon /></div>
          <div className="gstin-detail">
            <div className="gstin-number">08ABCDE1234F1Z5</div>
            <div className="gstin-sub">Registered as Apex Distributors Pvt Ltd · Rajasthan</div>
          </div>
        </div>
        <span className="gstin-status"><span className="dot" />Verified</span>
      </div>

      <div className="summary-strip">
        <div className="summary-card">
          <div className="label">Tax collected (this month)</div>
          <div className="amount">₹27,825.00</div>
          <div className="sub">1–16 Jul 2026</div>
        </div>
        <div className="summary-card">
          <div className="label">Next filing due</div>
          <div className="amount">GSTR-3B</div>
          <div className="sub">Due 20 Jul 2026</div>
        </div>
        <div className="summary-card">
          <div className="label">TCS deducted by Amazon</div>
          <div className="amount">₹4,218.00</div>
          <div className="sub">Last 30 days</div>
        </div>
        <div className="summary-card">
          <div className="label">Overdue filings</div>
          <div className="amount" style={{ color: "var(--amz-red)" }}>1</div>
          <div className="sub"><a href="#" style={{ color: "var(--amz-blue)", textDecoration: "none" }}>Review now</a></div>
        </div>
      </div>

      <div className="layout">
        <div>
          <div className="card">
            <div className="tabs">
              {TABS.map((t) => (
                <div key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
                  {t.label}
                </div>
              ))}
            </div>
            <div className="filter-bar">
              <div className="filter-pill">Financial year 2026–27 <ChevronDown /></div>
              <div className="filter-pill">Filing type <ChevronDown /></div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Filing type</th>
                    <th>Due date</th>
                    <th>Filed on</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, i) => {
                    const meta = statusMeta[f.status];
                    return (
                      <tr key={i}>
                        <td>{f.period}</td>
                        <td>{f.type}</td>
                        <td>{f.dueDate}</td>
                        <td>{f.filedOn}</td>
                        <td>
                          <span className={`badge ${meta.cls}`}>
                            <span className="badge-dot" />
                            {meta.label}
                          </span>
                        </td>
                        <td>
                          <a className="action-link" href="#">
                            {f.status === "filed" ? "View filing" : "File now"}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card card-pad">
            <h2>Tax rate breakdown</h2>
            <div className="card-sub">By product category, current month</div>
            <div style={{ overflowX: "auto" }}>
              <table className="rate-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>GST rate</th>
                    <th>Taxable value</th>
                    <th>Tax collected</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_BREAKDOWN.map((r) => (
                    <tr key={r.category}>
                      <td>{r.category}</td>
                      <td>{r.rate}</td>
                      <td>{r.taxable}</td>
                      <td>{r.tax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="card card-pad">
            <h2>Compliance checklist</h2>
            <div className="checklist-item">
              <CheckIcon done />
              <div>
                <div className="check-text">GSTIN verified</div>
                <div className="check-sub">Confirmed on 3 Jan 2026</div>
              </div>
            </div>
            <div className="checklist-item">
              <CheckIcon done />
              <div>
                <div className="check-text">PAN linked</div>
                <div className="check-sub">Matches business registration</div>
              </div>
            </div>
            <div className="checklist-item">
              <CheckIcon done={false} />
              <div>
                <div className="check-text">GSTR-3B for Jun 2026 pending</div>
                <div className="check-sub">Due 20 Jul 2026</div>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <h2>Need help?</h2>
            <div className="sidebar-note">
              Amazon collects TCS on your behalf as per GST rules. Make sure your GSTIN and HSN codes are up to date to avoid filing mismatches.
            </div>
            <a className="policy-link" href="#">Read GST &amp; TCS policy →</a>
            <br />
            <a className="policy-link" href="#">Contact tax support →</a>
          </div>
        </div>
      </div>
    </div>
  );
}