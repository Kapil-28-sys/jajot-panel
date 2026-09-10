import React, { useState } from "react";

const styles = `
.resolve-claim-page {
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
.resolve-claim-page * { box-sizing: border-box; }

/* top nav / breadcrumb */
.resolve-claim-page .breadcrumb {
  font-size: 13px;
  color: var(--amz-text-secondary);
  margin-bottom: 10px;
}
.resolve-claim-page .breadcrumb a {
  color: var(--amz-blue);
  text-decoration: none;
}
.resolve-claim-page .breadcrumb a:hover { text-decoration: underline; }

.resolve-claim-page .page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
  flex-wrap: wrap;
  gap: 10px;
}
.resolve-claim-page .title-block h1 {
  font-size: 21px;
  font-weight: 700;
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.resolve-claim-page .title-block .claim-id {
  font-size: 13px;
  color: var(--amz-text-secondary);
}
.resolve-claim-page .header-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  background: var(--amz-orange-bg);
  color: #8a5a00;
}
.resolve-claim-page .header-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--amz-orange); }

.resolve-claim-page .deadline-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--amz-red-bg);
  border: 1px solid #f5c6c0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--amz-red);
  margin: 14px 0 18px 0;
}
.resolve-claim-page .deadline-banner strong { font-weight: 700; }

/* layout */
.resolve-claim-page .layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 900px) {
  .resolve-claim-page .layout { grid-template-columns: 1fr; }
}

.resolve-claim-page .card {
  background: var(--amz-card-bg);
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 18px;
  margin-bottom: 16px;
}
.resolve-claim-page .card h2 {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 14px 0;
}
.resolve-claim-page .card h3 {
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

/* summary grid */
.resolve-claim-page .summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 24px;
}
.resolve-claim-page .summary-item .label {
  font-size: 12px;
  color: var(--amz-text-secondary);
  margin-bottom: 3px;
}
.resolve-claim-page .summary-item .value {
  font-size: 13px;
  color: var(--amz-text);
  font-weight: 500;
}
.resolve-claim-page .summary-item .value.link {
  color: var(--amz-blue);
  cursor: pointer;
}
.resolve-claim-page .summary-item .value.link:hover { text-decoration: underline; }
.resolve-claim-page .summary-item .value.amount {
  font-size: 16px;
  font-weight: 700;
  color: var(--amz-red);
}

/* product row */
.resolve-claim-page .product-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 0;
  border-top: 1px solid #f0f2f2;
  margin-top: 12px;
}
.resolve-claim-page .product-thumb {
  width: 52px;
  height: 52px;
  border-radius: 6px;
  border: 1px solid var(--amz-border);
  background: #f7f8f8;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.resolve-claim-page .product-detail .name { font-size: 13px; font-weight: 500; color: var(--amz-text); margin-bottom: 3px; }
.resolve-claim-page .product-detail .meta { font-size: 12px; color: var(--amz-text-secondary); }

/* timeline */
.resolve-claim-page .timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.resolve-claim-page .timeline-item {
  display: flex;
  gap: 12px;
  position: relative;
  padding-bottom: 20px;
}
.resolve-claim-page .timeline-item:last-child { padding-bottom: 0; }
.resolve-claim-page .timeline-marker {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--amz-blue-dark);
  margin-top: 4px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.resolve-claim-page .timeline-item:not(:last-child) .timeline-marker::after {
  content: "";
  position: absolute;
  top: 10px;
  left: 4px;
  width: 1px;
  height: 34px;
  background: var(--amz-border);
}
.resolve-claim-page .timeline-content .timeline-title { font-size: 13px; font-weight: 500; color: var(--amz-text); }
.resolve-claim-page .timeline-content .timeline-date { font-size: 12px; color: var(--amz-text-secondary); margin-top: 2px; }

/* evidence list */
.resolve-claim-page .evidence-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.resolve-claim-page .evidence-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--amz-border);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
}
.resolve-claim-page .evidence-item svg { flex-shrink: 0; color: #8b9195; }
.resolve-claim-page .evidence-item .name { flex: 1; color: var(--amz-text); }
.resolve-claim-page .evidence-item a { color: var(--amz-blue); font-size: 12px; text-decoration: none; }
.resolve-claim-page .evidence-item a:hover { text-decoration: underline; }

/* response options */
.resolve-claim-page .option-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.resolve-claim-page .option-card {
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.resolve-claim-page .option-card.selected {
  border-color: var(--amz-blue);
  background: #f0fbfc;
  box-shadow: 0 0 0 1px var(--amz-blue);
}
.resolve-claim-page .option-card input { margin-top: 3px; }
.resolve-claim-page .option-card .option-title { font-size: 13px; font-weight: 700; color: var(--amz-text); margin-bottom: 2px; }
.resolve-claim-page .option-card .option-sub { font-size: 12px; color: var(--amz-text-secondary); }

/* textarea + upload */
.resolve-claim-page label.field-label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  margin: 16px 0 6px 0;
}
.resolve-claim-page textarea {
  width: 100%;
  min-height: 90px;
  border: 1px solid var(--amz-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  color: var(--amz-text);
}
.resolve-claim-page textarea:focus { outline: none; border-color: var(--amz-blue); box-shadow: 0 0 0 1px var(--amz-blue); }
.resolve-claim-page .char-count { font-size: 11px; color: var(--amz-text-secondary); text-align: right; margin-top: 4px; }

.resolve-claim-page .upload-box {
  border: 1.5px dashed var(--amz-border);
  border-radius: 8px;
  padding: 22px;
  text-align: center;
  color: var(--amz-text-secondary);
  font-size: 13px;
  cursor: pointer;
  margin-top: 6px;
}
.resolve-claim-page .upload-box:hover { border-color: var(--amz-blue); background: #f7fbfb; }
.resolve-claim-page .upload-box svg { margin-bottom: 6px; }
.resolve-claim-page .upload-box .upload-hint { font-size: 11px; margin-top: 2px; }

/* footer actions */
.resolve-claim-page .form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f2;
}
.resolve-claim-page .btn {
  border: 1px solid var(--amz-border);
  background: #fff;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--amz-text);
}
.resolve-claim-page .btn:hover { background: #f7f8f8; }
.resolve-claim-page .btn-primary {
  background: linear-gradient(to bottom, #f7dfa5, #f0c14b);
  border: 1px solid #a88734;
  color: #111;
}
.resolve-claim-page .btn-primary:hover { background: linear-gradient(to bottom, #f5d78e, #eeb933); }
.resolve-claim-page .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* sidebar */
.resolve-claim-page .sidebar-note {
  font-size: 12px;
  color: var(--amz-text-secondary);
  line-height: 1.5;
}
.resolve-claim-page .policy-link {
  display: inline-block;
  margin-top: 8px;
  color: var(--amz-blue);
  text-decoration: none;
  font-size: 13px;
}
.resolve-claim-page .policy-link:hover { text-decoration: underline; }

.resolve-claim-page .success-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--amz-green-bg);
  border: 1px solid #bfe6d8;
  border-radius: 8px;
  padding: 14px;
  color: var(--amz-green);
  font-size: 13px;
  margin-bottom: 16px;
}
`;

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="7.3" stroke="currentColor" strokeWidth="1.4" />
    <path d="M9 5v4l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 1.5h5.5L13 5v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const UploadIcon = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <path d="M13 17V6" stroke="#8B9195" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M8 10.5L13 5.5L18 10.5" stroke="#8B9195" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 18v2.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5V18" stroke="#8B9195" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const CheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="9" fill="#067D62" />
    <path d="M6 10.5l2.5 2.5L14.5 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RESPONSE_OPTIONS = [
  {
    key: "accept",
    title: "Accept liability and issue refund",
    sub: "You agree with the claim. The refund amount will be deducted from your account balance.",
  },
  {
    key: "dispute",
    title: "Dispute this claim",
    sub: "You believe this claim is invalid. Provide evidence to support your response.",
  },
  {
    key: "info",
    title: "Request more information",
    sub: "Ask the customer or Amazon for additional details before responding.",
  },
];

export default function ResolveClaim() {
  const [selectedOption, setSelectedOption] = useState("dispute");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const maxChars = 2000;

  return (
    <div className="resolve-claim-page">
      <style>{styles}</style>

      <div className="breadcrumb">
        <a href="#">Orders</a> &nbsp;›&nbsp; <a href="#">Claims</a> &nbsp;›&nbsp; Resolve claim
      </div>

      <div className="page-header">
        <div className="title-block">
          <h1>
            Resolve claim
            <span className="header-badge">
              <span className="dot" />
              Action required
            </span>
          </h1>
          <div className="claim-id">Claim ID: AZ-CLM-8842910 · Order 408-1234567-8901234</div>
        </div>
      </div>

      <div className="deadline-banner">
        <ClockIcon />
        <span>
          <strong>Respond by 21 Jul 2026, 11:59 PM IST.</strong> If you don't respond in time, this claim will be automatically granted in the customer's favor.
        </span>
      </div>

      {submitted && (
        <div className="success-banner">
          <CheckCircle />
          Your response has been submitted. Amazon will review it and notify you of the outcome within 2 business days.
        </div>
      )}

      <div className="layout">
        {/* LEFT COLUMN */}
        <div>
          <div className="card">
            <h2>Claim summary</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="label">Claim type</div>
                <div className="value">A-to-z Guarantee claim</div>
              </div>
              <div className="summary-item">
                <div className="label">Claim reason</div>
                <div className="value">Item not as described</div>
              </div>
              <div className="summary-item">
                <div className="label">Amount claimed</div>
                <div className="value amount">₹1,499.00</div>
              </div>
              <div className="summary-item">
                <div className="label">Claim filed on</div>
                <div className="value">14 Jul 2026</div>
              </div>
              <div className="summary-item">
                <div className="label">Order date</div>
                <div className="value">3 Jul 2026</div>
              </div>
              <div className="summary-item">
                <div className="label">Order ID</div>
                <div className="value link">408-1234567-8901234</div>
              </div>
            </div>

            <div className="product-row">
              <div className="product-thumb">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="#B7BDC0" strokeWidth="1.5" />
                  <path d="M3 15l5-5 4 4 5-6 4 5" stroke="#B7BDC0" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="product-detail">
                <div className="name">Wireless Bluetooth Earbuds - Black</div>
                <div className="meta">SKU: WBE-BLK-01 · ASIN: B0C9XXXXX3 · Qty: 1</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Customer's statement</h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--amz-text)", margin: "0 0 4px 0" }}>
              "The earbuds I received don't match the listing photos — the color is different and one earbud has no sound at all. I want a full refund."
            </p>
          </div>

          <div className="card">
            <h3>Evidence provided by customer</h3>
            <div className="evidence-list">
              <div className="evidence-item">
                <FileIcon />
                <span className="name">photo_earbud_defect.jpg</span>
                <a href="#">View</a>
              </div>
              <div className="evidence-item">
                <FileIcon />
                <span className="name">order_screenshot.png</span>
                <a href="#">View</a>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Your response</h2>
            <div className="option-list">
              {RESPONSE_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className={`option-card ${selectedOption === opt.key ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="response"
                    checked={selectedOption === opt.key}
                    onChange={() => setSelectedOption(opt.key)}
                  />
                  <div>
                    <div className="option-title">{opt.title}</div>
                    <div className="option-sub">{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>

            <label className="field-label" htmlFor="comment">
              Explain your response
            </label>
            <textarea
              id="comment"
              placeholder="Provide details to support your response. Include tracking numbers, dates, or policy references where relevant."
              value={comment}
              maxLength={maxChars}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="char-count">{comment.length}/{maxChars}</div>

            <label className="field-label">Upload supporting evidence (optional)</label>
            <div className="upload-box">
              <UploadIcon />
              <div>Drag files here or click to upload</div>
              <div className="upload-hint">PDF, JPG or PNG · Max 10MB per file</div>
            </div>

            <div className="form-actions">
              <button className="btn">Save as draft</button>
              <button
                className="btn btn-primary"
                disabled={comment.trim().length === 0}
                onClick={() => setSubmitted(true)}
              >
                Submit response
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <div className="card">
            <h2>Claim timeline</h2>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <div className="timeline-title">Claim filed by customer</div>
                  <div className="timeline-date">14 Jul 2026, 4:12 PM</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <div className="timeline-title">Amazon requested seller response</div>
                  <div className="timeline-date">14 Jul 2026, 4:20 PM</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <div className="timeline-title">Awaiting your response</div>
                  <div className="timeline-date">Due 21 Jul 2026</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Need help?</h2>
            <div className="sidebar-note">
              Review the A-to-z Guarantee policy to understand what qualifies for seller protection before responding to this claim.
            </div>
            <a className="policy-link" href="#">Read A-to-z Guarantee policy →</a>
            <br />
            <a className="policy-link" href="#">Contact Seller Support →</a>
          </div>
        </div>
      </div>
    </div>
  );
}