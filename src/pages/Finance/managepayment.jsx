import React, { useState } from "react";

const styles = `
.manage-payment-page {
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
.manage-payment-page * { box-sizing: border-box; }

.manage-payment-page .page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.manage-payment-page .page-header h1 { font-size: 21px; font-weight: 700; margin: 0; }
.manage-payment-page .btn {
  border: 1px solid var(--amz-border);
  background: #fff;
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--amz-text);
}
.manage-payment-page .btn:hover { background: #f7f8f8; }
.manage-payment-page .btn-primary {
  background: linear-gradient(to bottom, #f7dfa5, #f0c14b);
  border: 1px solid #a88734;
  color: #111;
}
.manage-payment-page .btn-primary:hover { background: linear-gradient(to bottom, #f5d78e, #eeb933); }

/* summary strip */
.manage-payment-page .summary-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 800px) { .manage-payment-page .summary-strip { grid-template-columns: 1fr; } }
.manage-payment-page .summary-card {
  background: var(--amz-card-bg);
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 16px;
}
.manage-payment-page .summary-card .label { font-size: 12px; color: var(--amz-text-secondary); margin-bottom: 6px; }
.manage-payment-page .summary-card .amount { font-size: 22px; font-weight: 700; }
.manage-payment-page .summary-card .amount.positive { color: var(--amz-green); }
.manage-payment-page .summary-card .sub { font-size: 12px; color: var(--amz-text-secondary); margin-top: 4px; }

/* tabs */
.manage-payment-page .card { background: var(--amz-card-bg); border: 1px solid var(--amz-border); border-radius: 8px; overflow: hidden; margin-bottom: 16px; }
.manage-payment-page .tabs { display: flex; gap: 4px; padding: 0 16px; border-bottom: 1px solid var(--amz-border); overflow-x: auto; }
.manage-payment-page .tab {
  padding: 14px 12px; font-size: 13px; font-weight: 500; color: var(--amz-text-secondary);
  cursor: pointer; border-bottom: 3px solid transparent; white-space: nowrap;
}
.manage-payment-page .tab.active { color: var(--amz-text); border-bottom-color: var(--amz-orange); font-weight: 700; }

/* filter bar */
.manage-payment-page .filter-bar { display: flex; align-items: center; gap: 10px; padding: 14px 16px; flex-wrap: wrap; border-bottom: 1px solid var(--amz-border); }
.manage-payment-page .search-box { flex: 1; min-width: 220px; display: flex; align-items: center; border: 1px solid var(--amz-border); border-radius: 8px; padding: 8px 10px; gap: 8px; }
.manage-payment-page .search-box input { border: none; outline: none; font-size: 13px; flex: 1; color: var(--amz-text); }
.manage-payment-page .search-box svg { color: #8b9195; flex-shrink: 0; }
.manage-payment-page .filter-pill { border: 1px solid var(--amz-border); border-radius: 8px; padding: 8px 12px; font-size: 13px; background: #fff; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.manage-payment-page .filter-pill:hover { background: #f7f8f8; }

/* table */
.manage-payment-page table { width: 100%; border-collapse: collapse; font-size: 13px; }
.manage-payment-page thead th { text-align: left; padding: 10px 14px; background: #f7f8f8; color: var(--amz-text-secondary); font-weight: 700; font-size: 12px; border-bottom: 1px solid var(--amz-border); white-space: nowrap; }
.manage-payment-page tbody td { padding: 12px 14px; border-bottom: 1px solid #f0f2f2; color: var(--amz-text); }
.manage-payment-page tbody tr:last-child td { border-bottom: none; }
.manage-payment-page tbody tr:hover { background: #fafafa; }

.manage-payment-page .badge {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; white-space: nowrap;
}
.manage-payment-page .badge-dot { width: 6px; height: 6px; border-radius: 50%; }
.manage-payment-page .badge-completed { background: var(--amz-green-bg); color: var(--amz-green); }
.manage-payment-page .badge-completed .badge-dot { background: var(--amz-green); }
.manage-payment-page .badge-processing { background: var(--amz-orange-bg); color: #8a5a00; }
.manage-payment-page .badge-processing .badge-dot { background: var(--amz-orange); }
.manage-payment-page .badge-failed { background: var(--amz-red-bg); color: var(--amz-red); }
.manage-payment-page .badge-failed .badge-dot { background: var(--amz-red); }

.manage-payment-page .amount-cell { font-weight: 700; }

.manage-payment-page .table-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; font-size: 12px; color: var(--amz-text-secondary); }
.manage-payment-page .pagination { display: flex; gap: 4px; align-items: center; }
.manage-payment-page .page-btn { border: 1px solid var(--amz-border); background: #fff; border-radius: 6px; min-width: 28px; height: 28px; font-size: 12px; cursor: pointer; color: var(--amz-text); }
.manage-payment-page .page-btn.active { background: var(--amz-blue-dark); color: #fff; border-color: var(--amz-blue-dark); }
.manage-payment-page .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* bank account card */
.manage-payment-page .layout { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 900px) { .manage-payment-page .layout { grid-template-columns: 1fr; } }
.manage-payment-page .card-pad { padding: 16px; }
.manage-payment-page .card-pad h2 { font-size: 15px; font-weight: 700; margin: 0 0 12px 0; }
.manage-payment-page .bank-row {
  display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--amz-border); border-radius: 8px;
}
.manage-payment-page .bank-icon {
  width: 38px; height: 38px; border-radius: 6px; background: #f0fbfc; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.manage-payment-page .bank-detail .bank-name { font-size: 13px; font-weight: 600; color: var(--amz-text); }
.manage-payment-page .bank-detail .bank-sub { font-size: 12px; color: var(--amz-text-secondary); margin-top: 2px; }
.manage-payment-page .bank-default {
  margin-left: auto; font-size: 11px; font-weight: 700; color: var(--amz-green); background: var(--amz-green-bg); padding: 2px 8px; border-radius: 10px;
}
.manage-payment-page .sidebar-note { font-size: 12px; color: var(--amz-text-secondary); line-height: 1.5; }
.manage-payment-page .policy-link { display: inline-block; margin-top: 10px; color: var(--amz-blue); text-decoration: none; font-size: 13px; }
.manage-payment-page .policy-link:hover { text-decoration: underline; }
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

const BankIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M2 8l8-5 8 5" stroke="#007185" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 8v8h14V8" stroke="#007185" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 11v3M10 11v3M13 11v3" stroke="#007185" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TABS = [
  { key: "all", label: "All disbursements" },
  { key: "completed", label: "Completed" },
  { key: "processing", label: "Processing" },
  { key: "failed", label: "Failed" },
];

const PAYMENTS = [
  { id: "PYT-994211", date: "12 Jul 2026", period: "28 Jun – 11 Jul 2026", bank: "HDFC Bank ••1234", amount: "₹42,180.00", status: "completed" },
  { id: "PYT-993087", date: "28 Jun 2026", period: "14 Jun – 27 Jun 2026", bank: "HDFC Bank ••1234", amount: "₹38,940.00", status: "completed" },
  { id: "PYT-992014", date: "26 Jul 2026", period: "12 Jul – 25 Jul 2026", bank: "HDFC Bank ••1234", amount: "₹45,760.00", status: "processing" },
  { id: "PYT-990873", date: "14 Jun 2026", period: "31 May – 13 Jun 2026", bank: "HDFC Bank ••1234", amount: "₹31,200.00", status: "completed" },
  { id: "PYT-989440", date: "31 May 2026", period: "17 May – 30 May 2026", bank: "HDFC Bank ••1234", amount: "₹5,420.00", status: "failed" },
];

const statusMeta = {
  completed: { label: "Completed", cls: "badge-completed" },
  processing: { label: "Processing", cls: "badge-processing" },
  failed: { label: "Failed", cls: "badge-failed" },
};

export default function ManagePayment() {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");

  const visible = activeTab === "all" ? PAYMENTS : PAYMENTS.filter((p) => p.status === activeTab);
  const filtered = visible.filter(
    (p) => p.id.toLowerCase().includes(query.toLowerCase()) || p.bank.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="manage-payment-page">
      <style>{styles}</style>

      <div className="page-header">
        <h1>Manage Payment</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn">Download statement</button>
          <button className="btn btn-primary">Add bank account</button>
        </div>
      </div>

      <div className="summary-strip">
        <div className="summary-card">
          <div className="label">Available balance</div>
          <div className="amount positive">₹42,180.00</div>
          <div className="sub">Next disbursement on 20 Jul 2026</div>
        </div>
        <div className="summary-card">
          <div className="label">Total disbursed (last 90 days)</div>
          <div className="amount">₹1,63,500.00</div>
          <div className="sub">Across 6 disbursements</div>
        </div>
        <div className="summary-card">
          <div className="label">Disbursement cycle</div>
          <div className="amount">14 days</div>
          <div className="sub">Every 2nd &amp; 4th week</div>
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
              <div className="search-box">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search by disbursement ID or bank account"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="filter-pill">Last 90 days <ChevronDown /></div>
              <div className="filter-pill">Bank account <ChevronDown /></div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Disbursement ID</th>
                    <th>Date</th>
                    <th>Settlement period</th>
                    <th>Bank account</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const meta = statusMeta[p.status];
                    return (
                      <tr key={p.id}>
                        <td><a href="#" style={{ color: "var(--amz-blue)", textDecoration: "none" }}>{p.id}</a></td>
                        <td>{p.date}</td>
                        <td>{p.period}</td>
                        <td>{p.bank}</td>
                        <td className="amount-cell">{p.amount}</td>
                        <td>
                          <span className={`badge ${meta.cls}`}>
                            <span className="badge-dot" />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>1–{filtered.length} of {filtered.length} disbursements</span>
              <div className="pagination">
                <button className="page-btn" disabled>‹</button>
                <button className="page-btn active">1</button>
                <button className="page-btn" disabled>›</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card card-pad">
            <h2>Bank accounts</h2>
            <div className="bank-row">
              <div className="bank-icon"><BankIcon /></div>
              <div className="bank-detail">
                <div className="bank-name">HDFC Bank ••1234</div>
                <div className="bank-sub">Added 3 Jan 2026</div>
              </div>
              <span className="bank-default">Default</span>
            </div>
            <a className="policy-link" href="#">+ Add another bank account</a>
          </div>

          <div className="card card-pad">
            <h2>Need help?</h2>
            <div className="sidebar-note">
              Disbursements are made to your default bank account on your set cycle. Failed disbursements are automatically retried within 3 business days.
            </div>
            <a className="policy-link" href="#">Read disbursement policy →</a>
            <br />
            <a className="policy-link" href="#">Contact Seller Support →</a>
          </div>
        </div>
      </div>
    </div>
  );
}