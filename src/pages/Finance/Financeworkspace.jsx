import React from "react";

const styles = `
.finance-workspace {
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
.finance-workspace * { box-sizing: border-box; }

.finance-workspace .page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.finance-workspace .page-header h1 {
  font-size: 21px;
  font-weight: 700;
  margin: 0;
}
.finance-workspace .canvas-link {
  color: var(--amz-blue);
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
}
.finance-workspace .canvas-link:hover { text-decoration: underline; }

/* top summary strip */
.finance-workspace .summary-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 1000px) {
  .finance-workspace .summary-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .finance-workspace .summary-strip { grid-template-columns: 1fr; }
}
.finance-workspace .summary-card {
  background: var(--amz-card-bg);
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 16px;
}
.finance-workspace .summary-card .label {
  font-size: 12px;
  color: var(--amz-text-secondary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.finance-workspace .summary-card .amount {
  font-size: 22px;
  font-weight: 700;
  color: var(--amz-text);
  margin-bottom: 4px;
}
.finance-workspace .summary-card .amount.positive { color: var(--amz-green); }
.finance-workspace .summary-card .amount.negative { color: var(--amz-red); }
.finance-workspace .summary-card .sub {
  font-size: 12px;
  color: var(--amz-text-secondary);
}
.finance-workspace .summary-card .sub a {
  color: var(--amz-blue);
  text-decoration: none;
}
.finance-workspace .summary-card .sub a:hover { text-decoration: underline; }

/* main grid */
.finance-workspace .grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 900px) {
  .finance-workspace .grid { grid-template-columns: 1fr; }
}

.finance-workspace .card {
  background: var(--amz-card-bg);
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
}
.finance-workspace .card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2px;
}
.finance-workspace .card-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--amz-text);
  margin: 0;
}
.finance-workspace .card-link {
  font-size: 13px;
  color: var(--amz-blue);
  text-decoration: none;
  display: inline-block;
  margin: 2px 0 12px 0;
}
.finance-workspace .card-link:hover { text-decoration: underline; }
.finance-workspace .drag-handle {
  cursor: grab;
  color: #8b9195;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* bar chart (payout trend) */
.finance-workspace .bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 140px;
  padding: 10px 4px 0 4px;
}
.finance-workspace .bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
  justify-content: flex-end;
}
.finance-workspace .bar {
  width: 100%;
  max-width: 34px;
  border-radius: 4px 4px 0 0;
  background: var(--amz-blue);
}
.finance-workspace .bar.muted { background: #c9e7ea; }
.finance-workspace .bar-label {
  font-size: 11px;
  color: var(--amz-text-secondary);
}

/* fee breakdown list */
.finance-workspace .breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.finance-workspace .breakdown-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.finance-workspace .breakdown-row .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.finance-workspace .breakdown-row .name {
  flex: 1;
  font-size: 13px;
  color: var(--amz-text);
}
.finance-workspace .breakdown-row .value {
  font-size: 13px;
  font-weight: 700;
  color: var(--amz-text);
}
.finance-workspace .breakdown-bar-track {
  height: 6px;
  border-radius: 3px;
  background: #f0f2f2;
  margin-top: 14px;
  overflow: hidden;
  display: flex;
}
.finance-workspace .breakdown-bar-seg { height: 100%; }

/* transactions table */
.finance-workspace .table-card {
  background: var(--amz-card-bg);
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  overflow: hidden;
}
.finance-workspace .table-card .card-header {
  padding: 16px 16px 0 16px;
}
.finance-workspace table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 12px;
}
.finance-workspace thead th {
  text-align: left;
  padding: 10px 16px;
  background: #f7f8f8;
  color: var(--amz-text-secondary);
  font-weight: 700;
  font-size: 12px;
  border-top: 1px solid var(--amz-border);
  border-bottom: 1px solid var(--amz-border);
  white-space: nowrap;
}
.finance-workspace tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f2f2;
  color: var(--amz-text);
}
.finance-workspace tbody tr:last-child td { border-bottom: none; }
.finance-workspace tbody tr:hover { background: #fafafa; }

.finance-workspace .txn-type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.finance-workspace .txn-type.credit { background: var(--amz-green-bg); color: var(--amz-green); }
.finance-workspace .txn-type.debit { background: var(--amz-red-bg); color: var(--amz-red); }
.finance-workspace .txn-type.pending { background: var(--amz-orange-bg); color: #8a5a00; }

.finance-workspace .amount-cell { font-weight: 700; }
.finance-workspace .amount-cell.positive { color: var(--amz-green); }
.finance-workspace .amount-cell.negative { color: var(--amz-red); }

.finance-workspace .table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 12px;
  color: var(--amz-text-secondary);
}
`;

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="5.8" stroke="#8B9195" strokeWidth="1.1" />
    <path d="M6.5 5.8V9.5" stroke="#8B9195" strokeWidth="1.1" strokeLinecap="round" />
    <circle cx="6.5" cy="4" r="0.7" fill="#8B9195" />
  </svg>
);

const DragHandle = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="drag-handle" aria-hidden="true">
    <circle cx="5" cy="3" r="1.3" /><circle cx="11" cy="3" r="1.3" />
    <circle cx="5" cy="8" r="1.3" /><circle cx="11" cy="8" r="1.3" />
    <circle cx="5" cy="13" r="1.3" /><circle cx="11" cy="13" r="1.3" />
  </svg>
);

const PAYOUT_TREND = [
  { label: "Feb", value: 62, muted: true },
  { label: "Mar", value: 78, muted: true },
  { label: "Apr", value: 55, muted: true },
  { label: "May", value: 90, muted: true },
  { label: "Jun", value: 70, muted: true },
  { label: "Jul", value: 100, muted: false },
];

const FEE_BREAKDOWN = [
  { name: "Referral fees", value: "₹18,420", pct: 42, color: "#007185" },
  { name: "Fulfilment fees", value: "₹12,860", pct: 29, color: "#e47911" },
  { name: "Storage fees", value: "₹6,240", pct: 14, color: "#7e57c2" },
  { name: "Advertising spend", value: "₹6,680", pct: 15, color: "#c9c9c9" },
];

const TRANSACTIONS = [
  { date: "16 Jul 2026", desc: "Order settlement — 408-1234567-8901234", type: "credit", label: "Credit", amount: "+ ₹1,499.00" },
  { date: "15 Jul 2026", desc: "Referral fee — B0C9XXXXX3", type: "debit", label: "Fee", amount: "− ₹149.90" },
  { date: "15 Jul 2026", desc: "FBA fulfilment fee — B0C9XXXXX2", type: "debit", label: "Fee", amount: "− ₹58.00" },
  { date: "14 Jul 2026", desc: "Refund to customer — 408-9988776-6554433", type: "debit", label: "Refund", amount: "− ₹1,499.00" },
  { date: "12 Jul 2026", desc: "Scheduled disbursement to bank ••1234", type: "pending", label: "Pending", amount: "₹42,180.00" },
];

export default function FinanceWorkspace() {
  const maxBar = Math.max(...PAYOUT_TREND.map((p) => p.value));

  return (
    <div className="finance-workspace">
      <style>{styles}</style>

      <div className="page-header">
        <h1>Finance</h1>
        <a className="canvas-link" href="#">✎ Explore with a canvas</a>
      </div>

      {/* Top summary strip */}
      <div className="summary-strip">
        <div className="summary-card">
          <div className="label">Available balance <InfoIcon /></div>
          <div className="amount positive">₹42,180.00</div>
          <div className="sub"><a href="#">View balance details</a></div>
        </div>
        <div className="summary-card">
          <div className="label">Next disbursement <InfoIcon /></div>
          <div className="amount">₹42,180.00</div>
          <div className="sub">Scheduled for 20 Jul 2026</div>
        </div>
        <div className="summary-card">
          <div className="label">Reserved balance <InfoIcon /></div>
          <div className="amount">₹5,640.00</div>
          <div className="sub"><a href="#">Why is this reserved?</a></div>
        </div>
        <div className="summary-card">
          <div className="label">Unresolved fees <InfoIcon /></div>
          <div className="amount negative">₹0.00</div>
          <div className="sub">No fees pending action</div>
        </div>
      </div>

      <div className="grid">
        {/* Payout trend */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Disbursement trend</p>
            <DragHandle />
          </div>
          <a className="card-link" href="#">View payment history</a>
          <div className="bar-chart">
            {PAYOUT_TREND.map((p) => (
              <div className="bar-col" key={p.label}>
                <div
                  className={`bar ${p.muted ? "muted" : ""}`}
                  style={{ height: `${(p.value / maxBar) * 100}%` }}
                />
                <div className="bar-label">{p.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fee breakdown */}
        <div className="card">
          <div className="card-header">
            <p className="card-title">Fee breakdown (last 30 days)</p>
            <DragHandle />
          </div>
          <a className="card-link" href="#">Manage taxes &amp; fees</a>
          <div className="breakdown-list">
            {FEE_BREAKDOWN.map((f) => (
              <div className="breakdown-row" key={f.name}>
                <span className="dot" style={{ background: f.color }} />
                <span className="name">{f.name}</span>
                <span className="value">{f.value}</span>
              </div>
            ))}
          </div>
          <div className="breakdown-bar-track">
            {FEE_BREAKDOWN.map((f) => (
              <div
                key={f.name}
                className="breakdown-bar-seg"
                style={{ width: `${f.pct}%`, background: f.color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="table-card">
        <div className="card-header">
          <p className="card-title">Recent transactions</p>
          <DragHandle />
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map((t, i) => (
              <tr key={i}>
                <td>{t.date}</td>
                <td>{t.desc}</td>
                <td>
                  <span className={`txn-type ${t.type}`}>{t.label}</span>
                </td>
                <td
                  className={`amount-cell ${
                    t.amount.startsWith("+") ? "positive" : t.amount.startsWith("−") ? "negative" : ""
                  }`}
                >
                  {t.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="table-footer">
          <span>Showing 5 of 128 transactions</span>
          <a href="#" style={{ color: "var(--amz-blue)", textDecoration: "none" }}>
            View all transactions →
          </a>
        </div>
      </div>
    </div>
  );
}