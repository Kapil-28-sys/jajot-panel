import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../../config/api";

const styles = `
.orders-workspace {
  --amz-blue: #007185;
  --amz-text: #0f1111;
  --amz-text-secondary: #565959;
  --amz-border: #d5d9d9;
  --amz-bg: #eaeded;
  --amz-card-bg: #ffffff;
  --amz-green: #067d62;
  --amz-red: #d13212;
  --amz-amber: #b45309;

  font-family: "Amazon Ember", Arial, sans-serif;
  background: var(--amz-bg);
  color: var(--amz-text);
  padding: 24px;
}
.orders-workspace * { box-sizing: border-box; }

.orders-workspace .page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.orders-workspace .page-header h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}
.orders-workspace .canvas-link {
  color: var(--amz-blue);
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
}
.orders-workspace .canvas-link:hover { text-decoration: underline; }

/* fixed 2x2 grid of big cards */
.orders-workspace .grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
@media (max-width: 760px) {
  .orders-workspace .grid { grid-template-columns: 1fr; }
}

.orders-workspace .card {
  background: var(--amz-card-bg);
  border: 1px solid var(--amz-border);
  border-radius: 10px;
  padding: 20px 22px;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 360px;
  transition: box-shadow 0.16s ease, transform 0.16s ease, opacity 0.16s ease, border-color 0.16s ease;
}
.orders-workspace .card.is-dragging {
  opacity: 0.35;
}
.orders-workspace .card.is-drag-over {
  border-color: var(--amz-blue);
  box-shadow: 0 0 0 2px rgba(0, 113, 133, 0.35) inset;
}
.orders-workspace .card:hover {
  box-shadow: 0 2px 10px rgba(15, 17, 17, 0.08);
}

.orders-workspace .card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2px;
}
.orders-workspace .card-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--amz-text);
  margin: 0;
}
.orders-workspace .drag-handle {
  cursor: grab;
  color: #8b9195;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  padding: 4px;
  margin: -4px;
  border-radius: 4px;
  transition: background 0.12s ease, color 0.12s ease;
}
.orders-workspace .drag-handle:hover {
  background: #f0f2f2;
  color: #565959;
}
.orders-workspace .drag-handle:active {
  cursor: grabbing;
}
.orders-workspace .card-link {
  font-size: 13px;
  color: var(--amz-blue);
  text-decoration: none;
  display: inline-block;
  margin: 2px 0 14px 0;
}
.orders-workspace .card-link:hover { text-decoration: underline; }

.orders-workspace .period-row {
  font-size: 12px;
  color: var(--amz-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.orders-workspace .pill {
  border: 1px solid var(--amz-border);
  border-radius: 14px;
  padding: 3px 11px;
  font-size: 12px;
  color: var(--amz-text);
  background: #fff;
  cursor: pointer;
}
.orders-workspace .checkbox-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--amz-text);
  margin-bottom: 12px;
}
.orders-workspace .checkbox-row input { margin: 0; }

.orders-workspace .empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--amz-text-secondary);
  padding: 12px 8px;
}
.orders-workspace .empty-state .empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
  opacity: 0.55;
}
.orders-workspace .empty-state .empty-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--amz-text);
  margin-bottom: 4px;
}
.orders-workspace .empty-state .empty-sub {
  font-size: 12px;
  color: var(--amz-text-secondary);
  max-width: 260px;
}

.orders-workspace .state-msg {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 13px;
  color: var(--amz-text-secondary);
  padding: 12px 8px;
}
.orders-workspace .state-msg.is-error { color: var(--amz-red); }

.orders-workspace .stat-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 6px;
}
.orders-workspace .stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  border-bottom: 1px solid #f0f2f2;
  padding-bottom: 14px;
}
.orders-workspace .stat-row:last-child { border-bottom: none; padding-bottom: 0; }
.orders-workspace .stat-label { font-size: 14px; color: var(--amz-text); }
.orders-workspace .stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--amz-blue);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.orders-workspace .stat-value:hover { text-decoration: underline; }
.orders-workspace .stat-sub {
  font-size: 11px;
  color: var(--amz-text-secondary);
  display: block;
  text-align: right;
  margin-top: 2px;
  font-weight: 400;
}

.orders-workspace .success-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}
.orders-workspace .success-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #f0fbf6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.orders-workspace .success-icon svg { width: 28px; height: 28px; }
.orders-workspace .success-text {
  font-size: 14px;
  color: var(--amz-text);
  max-width: 260px;
}

.orders-workspace .order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 2px;
  overflow-y: auto;
}
.orders-workspace .order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid #f0f2f2;
  padding-bottom: 11px;
}
.orders-workspace .order-row:last-child { border-bottom: none; padding-bottom: 0; }
.orders-workspace .order-main { min-width: 0; }
.orders-workspace .order-id {
  font-size: 14px;
  font-weight: 700;
  color: var(--amz-blue);
  text-decoration: none;
  display: block;
}
.orders-workspace .order-id:hover { text-decoration: underline; }
.orders-workspace .order-meta {
  font-size: 12px;
  color: var(--amz-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.orders-workspace .order-right {
  text-align: right;
  flex-shrink: 0;
}
.orders-workspace .order-total {
  font-size: 14px;
  font-weight: 700;
  color: var(--amz-text);
}
.orders-workspace .order-pill {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.orders-workspace .rates-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 12px;
}

.orders-workspace .drop-caret {
  position: absolute;
  top: -10px;
  left: 20px;
  right: 20px;
  height: 3px;
  border-radius: 2px;
  background: var(--amz-blue);
}
`;

// status -> small pill used on individual order rows
const ORDER_STATUS_META = {
  requested: { label: "Pending", bg: "#fef3e2", color: "#b45309" },
  pending: { label: "Pending", bg: "#fef3e2", color: "#b45309" },
  approved: { label: "Approved", bg: "#f0fbf6", color: "#067d62" },
  transit: { label: "In transit", bg: "#eaf6fd", color: "#0972d3" },
  in_transit: { label: "In transit", bg: "#eaf6fd", color: "#0972d3" },
  completed: { label: "Completed", bg: "#f0fbf6", color: "#067d62" },
  rejected: { label: "Rejected", bg: "#fdf0ef", color: "#d13212" },
};

const CARD_ORDER_STORAGE_KEY = "ordersWorkspaceCardOrder";
const DEFAULT_CARD_ORDER = ["orders", "returns", "claims", "deliveryRates"];

// mirrors the authConfig()/adminToken pattern used elsewhere (Orders.jsx, ManageReturns.jsx)
function authConfig() {
  const token = localStorage.getItem("adminToken");
  const valid = token && token !== "null" && token !== "undefined";
  return valid ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

// no external lib — same base64url decode pattern used to pull vendorId out of adminToken
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getVendorId() {
  const token = localStorage.getItem("adminToken");
  if (!token || token === "null" || token === "undefined") return null;
  const decoded = decodeToken(token);
  return decoded?.id || decoded?._id || decoded?.vendorId || null;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

function loadStoredCardOrder() {
  try {
    const raw = localStorage.getItem(CARD_ORDER_STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CARD_ORDER;
    // guard against a stale saved order missing/adding keys after a code change
    const valid = parsed.filter((key) => DEFAULT_CARD_ORDER.includes(key));
    const missing = DEFAULT_CARD_ORDER.filter((key) => !valid.includes(key));
    return [...valid, ...missing];
  } catch {
    return DEFAULT_CARD_ORDER;
  }
}

// Same feed ManageReturns.jsx reads (GET /api/orders/vendordata/:vendorId).
// Records are order-item / return-action rows; both the Orders card and the
// Returns card derive their view from this one fetch instead of hitting the
// backend twice. If your backend later exposes a dedicated orders endpoint
// with real fulfillment status (Shipped/Delivered/etc.), point this at that
// instead and drop the "derived from returns feed" framing below.
function useVendorData() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      const vendorId = getVendorId();
      if (!vendorId) {
        if (!cancelled) {
          setError("Couldn't determine vendor from your session. Please log in again.");
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(apiUrl(`/api/orders/vendordata/${vendorId}`), { ...authConfig() });
        const body = await safeJson(res);

        if (!res.ok || !body?.success) {
          throw new Error(body?.message || `Request failed (${res.status})`);
        }

        if (!cancelled) setRecords(body.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return { records, loading, error };
}

// Groups the raw item-level records into one row per underlying order, so the
// Orders card shows real orders instead of one row per line item / return.
function groupIntoOrders(records) {
  const byOrder = new Map();

  records.forEach((r) => {
    const order = r.orderId || {};
    const item = r.orderItemId || {};
    const key = order._id || order.order_number || r._id;
    if (!key) return;

    const lineTotal = Number(item.total ?? item.unit_price ?? 0);

    if (!byOrder.has(key)) {
      byOrder.set(key, {
        id: key,
        orderNumber: order.order_number || "—",
        date: order.createdAt || r.createdAt,
        total: 0,
        itemCount: 0,
        status: (r.status || "").toLowerCase(),
        lastActivity: r.createdAt,
      });
    }

    const entry = byOrder.get(key);
    entry.total += lineTotal;
    entry.itemCount += 1;
    // keep the status/timestamp from whichever record is most recent
    if (r.createdAt && (!entry.lastActivity || new Date(r.createdAt) > new Date(entry.lastActivity))) {
      entry.lastActivity = r.createdAt;
      entry.status = (r.status || "").toLowerCase();
    }
  });

  return Array.from(byOrder.values()).sort(
    (a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0)
  );
}

const DragHandle = (props) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="drag-handle" aria-hidden="true" {...props}>
    <circle cx="5" cy="3" r="1.3" />
    <circle cx="11" cy="3" r="1.3" />
    <circle cx="5" cy="8" r="1.3" />
    <circle cx="11" cy="8" r="1.3" />
    <circle cx="5" cy="13" r="1.3" />
    <circle cx="11" cy="13" r="1.3" />
  </svg>
);

// Amazon Seller Central style draggable widget: grab the dots, drag over
// another card, drop to swap places. Native HTML5 DnD, no external lib.
function CardShell({ title, headerLink, children, cardKey, dragState, dragHandlers }) {
  const { draggedKey, dragOverKey } = dragState;
  const { onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop } = dragHandlers;

  const isDragging = draggedKey === cardKey;
  const isDragOver = dragOverKey === cardKey && draggedKey !== cardKey;

  return (
    <div
      className={`card${isDragging ? " is-dragging" : ""}${isDragOver ? " is-drag-over" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, cardKey)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, cardKey)}
      onDragLeave={() => onDragLeave(cardKey)}
      onDrop={(e) => onDrop(e, cardKey)}
    >
      {isDragOver && <div className="drop-caret" />}
      <div className="card-header">
        <p className="card-title">{title}</p>
        <DragHandle />
      </div>
      {headerLink && (
        <a className="card-link" href={headerLink.href} target="_blank" rel="noopener noreferrer">
          {headerLink.label}
        </a>
      )}
      {children}
    </div>
  );
}

function OrdersCard(props) {
  const { records, loading, error } = props;
  const orders = useMemo(() => groupIntoOrders(records), [records]);
  const recent = orders.slice(0, 6);

  return (
    <CardShell
      {...props}
      title="Orders"
      headerLink={{
        href: "https://sellercentral.amazon.in/amazonsell/orders/mfn",
        label: "Manage orders",
      }}
    >
      <div className="period-row">
        <span className="pill">Last 90 days ▾</span>
        <span className="pill">IN · Choose marketplaces (1) ▾</span>
      </div>
      <div className="checkbox-row">
        <input type="checkbox" id="amzb" />
        <label htmlFor="amzb">Show Amazon Business only</label>
      </div>

      {loading ? (
        <div className="state-msg">Loading orders…</div>
      ) : error ? (
        <div className="state-msg is-error">{error}</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-icon" viewBox="0 0 64 64" fill="none">
            <rect x="10" y="18" width="44" height="34" rx="2" stroke="#B7BDC0" strokeWidth="2" />
            <path d="M10 26h44" stroke="#B7BDC0" strokeWidth="2" />
            <path d="M22 18v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" stroke="#B7BDC0" strokeWidth="2" />
            <circle cx="26" cy="38" r="2" fill="#B7BDC0" />
            <circle cx="38" cy="38" r="2" fill="#B7BDC0" />
          </svg>
          <div className="empty-title">No orders in this period</div>
          <div className="empty-sub">Try selecting a different time period to see more results.</div>
        </div>
      ) : (
        <div className="order-list">
          {recent.map((o) => {
            const meta = ORDER_STATUS_META[o.status] || { label: o.status || "Unknown", bg: "#f2f4f4", color: "#565959" };
            return (
              <div className="order-row" key={o.id}>
                <div className="order-main">
                  <a
                    className="order-id"
                    href={`https://sellercentral.amazon.in/amazonsell/orders/mfn?orderId=${o.orderNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {o.orderNumber}
                  </a>
                  <span className="order-meta">
                    {formatDate(o.date)} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="order-right">
                  <div className="order-total">{formatCurrency(o.total)}</div>
                  <span className="order-pill" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}

function ReturnsCard(props) {
  const { records, loading, error } = props;
  const stats = useMemo(() => {
    const pending = records.filter((r) => ["requested", "pending"].includes((r.status || "").toLowerCase())).length;
    const completed = records.filter((r) => (r.status || "").toLowerCase() === "completed").length;
    return [
      {
        label: "Pending actions",
        value: pending,
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2?returnRequestState=pendingActions&pendingActionsFilterBy=pendingActions",
      },
      {
        label: "Completed",
        value: completed,
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2?returnRequestState=completed",
      },
      {
        label: "Total returns",
        value: records.length,
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2",
      },
    ];
  }, [records]);

  return (
    <CardShell
      {...props}
      title="Returns"
      headerLink={{
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/gp/returns/list/v2",
        label: "Manage returns",
      }}
    >
      <div className="period-row">
        <span className="pill">Seller fulfilled ▾</span>
        <span className="pill">Last 90 days ▾</span>
      </div>

      {loading ? (
        <div className="state-msg">Loading returns…</div>
      ) : error ? (
        <div className="state-msg is-error">{error}</div>
      ) : (
        <div className="stat-list">
          {stats.map((s) => (
            <div className="stat-row" key={s.label}>
              <span className="stat-label">{s.label}</span>
              <a className="stat-value" href={s.href} target="_blank" rel="noopener noreferrer">
                {s.value}
              </a>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function ClaimsCard(props) {
  return (
    <CardShell {...props} title="Claims">
      <div style={{ height: 24 }} />
      <div className="success-box">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" fill="#067D62" />
            <path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="success-text">
          You do not have any outstanding claims or chargebacks. Great job!
        </div>
      </div>
    </CardShell>
  );
}

function DeliveryRatesCard(props) {
  const rates = [
    {
      label: "Late shipment",
      value: "0%",
      target: "Target under 2%",
      href: "https://sellercentral.amazon.in/amazonsell/orders/container/performance/detail/shipping?t=lsr",
    },
    {
      label: "Pre-fulfilment cancel",
      value: "0%",
      target: "Target under 2%",
      href: "https://sellercentral.amazon.in/amazonsell/orders/container/performance/detail/shipping?t=cr",
    },
  ];

  return (
    <CardShell
      {...props}
      title="Delivery Rates"
      headerLink={{
        href: "https://sellercentral.amazon.in/amazonsell/orders/container/performance/detail/shipping",
        label: "View shipping performance",
      }}
    >
      <div className="rates-list">
        {rates.map((r) => (
          <div className="stat-row" key={r.label}>
            <span className="stat-label">{r.label}</span>
            <span style={{ textAlign: "right" }}>
              <a className="stat-value" href={r.href} target="_blank" rel="noopener noreferrer">
                {r.value}
              </a>
              <span className="stat-sub">{r.target}</span>
            </span>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

const CARD_COMPONENTS = {
  orders: OrdersCard,
  returns: ReturnsCard,
  claims: ClaimsCard,
  deliveryRates: DeliveryRatesCard,
};

export default function OrdersWorkspace() {
  const { records, loading, error } = useVendorData();
  const [cardOrder, setCardOrder] = useState(DEFAULT_CARD_ORDER);
  const [draggedKey, setDraggedKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const dragImageRef = useRef(null);

  useEffect(() => {
    setCardOrder(loadStoredCardOrder());
  }, []);

  function persistOrder(next) {
    setCardOrder(next);
    try {
      localStorage.setItem(CARD_ORDER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures (e.g. private browsing) — order just won't persist
    }
  }

  function onDragStart(e, key) {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", key);
    } catch {
      // some browsers require this even if unused
    }
  }

  function onDragOver(e, key) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (key !== dragOverKey) setDragOverKey(key);
  }

  function onDragLeave(key) {
    setDragOverKey((current) => (current === key ? null : current));
  }

  function onDrop(e, targetKey) {
    e.preventDefault();
    setDragOverKey(null);
    if (!draggedKey || draggedKey === targetKey) return;

    const next = [...cardOrder];
    const fromIndex = next.indexOf(draggedKey);
    const toIndex = next.indexOf(targetKey);
    if (fromIndex === -1 || toIndex === -1) return;

    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedKey);
    persistOrder(next);
  }

  function onDragEnd() {
    setDraggedKey(null);
    setDragOverKey(null);
  }

  const dragState = { draggedKey, dragOverKey };
  const dragHandlers = { onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop };

  return (
    <div className="orders-workspace" ref={dragImageRef}>
      <style>{styles}</style>
      <div className="page-header">
        <h1>Orders</h1>
        <a className="canvas-link" href="#">
          ✎ Explore with a canvas
        </a>
      </div>

      <div className="grid">
        {cardOrder.map((key) => {
          const Card = CARD_COMPONENTS[key];
          if (!Card) return null;
          return (
            <Card
              key={key}
              cardKey={key}
              records={records}
              loading={loading}
              error={error}
              dragState={dragState}
              dragHandlers={dragHandlers}
            />
          );
        })}
      </div>
    </div>
  );
}