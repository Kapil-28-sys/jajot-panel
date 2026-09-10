import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Package,
  Clock,
  Wallet,
  CheckCircle2,
  Search,
  Eye,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiUrl } from "../../config/api";

// status -> pill classes + row rail color + display label
const STATUS_META = {
  requested: { label: "Pending action", pill: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", rail: "#f79009" },
  pending: { label: "Pending action", pill: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500", rail: "#f79009" },
  approved: { label: "Approved", pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", rail: "#17b26a" },
  transit: { label: "In transit", pill: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500", rail: "#2e90fa" },
  in_transit: { label: "In transit", pill: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500", rail: "#2e90fa" },
  completed: { label: "Completed", pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500", rail: "#17b26a" },
  rejected: { label: "Rejected", pill: "bg-rose-50 text-rose-700 ring-rose-600/20", dot: "bg-rose-500", rail: "#f04438" },
};

const STATUS_OPTIONS = ["pending", "approved", "transit", "completed", "rejected"];

const TABS = [
  { key: "pendingActions", label: "Pending actions", statuses: ["requested", "pending"] },
  { key: "all", label: "All returns", statuses: null },
  { key: "inTransit", label: "In transit", statuses: ["transit", "in_transit"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
];

// mirrors the authConfig()/adminToken pattern used elsewhere (Orders.jsx, Products.jsx)
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

// Status lives on the same record this list endpoint returns
// (GET /api/orders/vendordata/:vendorId), so the update reuses that same
// route family instead of a separate one — just addressed by the return's
// own _id and sent as PATCH. If your backend expects PUT, or a different
// param/body shape, this is the one place to adjust.
async function updateReturnStatus(returnId, status) {
  const res = await fetch(apiUrl(`/api/orders/vendordata/${returnId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(authConfig().headers || {}) },
    body: JSON.stringify({ status }),
  });
  const body = await safeJson(res);
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `Update failed (${res.status})`);
  }
  return body;
}

function formatDate(iso, withTime) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const base = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (!withTime) return base;
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${base}, ${time}`;
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatAddress(addr) {
  if (!addr) return "—";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country]
    .filter(Boolean)
    .join(", ");
}

// Flattens one returns record from GET /orders/vendordata/:vendorId, keeping the
// raw nested record around too so the detail modal has everything it needs.
function mapReturnRecord(r) {
  const order = r.orderId || {};
  const item = r.orderItemId || {};
  const product = r.productId || {};
  const variant = r.variantId || {};
  const thumb = (variant.images && variant.images[0]) || (product.images && product.images[0]) || null;
  const refundAmount = Number(item.total ?? item.unit_price ?? 0);

  return {
    id: r._id,
    orderId: order.order_number || order._id || "—",
    date: formatDate(r.createdAt),
    productName: item.product_name || product.productName || "—",
    sku: variant.sku || product.sku || "—",
    thumb,
    qty: r.quantity ?? item.quantity ?? 1,
    reason: r.reason || "—",
    notes: r.notes || "",
    status: (r.status || "").toLowerCase(),
    refundAmount,
    refund: formatCurrency(refundAmount),
    raw: r,
  };
}

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded-control bg-slate-200/80 ${className}`} />;
}

function SkeletonRows({ rows = 5 }) {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="flex items-center gap-3" key={i}>
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
          <Skeleton className="h-5 w-24 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Clickable status pill -> small floating menu (no external lib) listing the
// other statuses. Used in the table row and in the modal.
function StatusEditor({ status, returnId, busy, onChange, align = "left" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const meta = STATUS_META[status] || { label: status || "Unknown", pill: "bg-slate-100 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" };

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEscape);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
        className="disabled:cursor-default disabled:opacity-70"
      >
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.pill}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {busy ? "Updating…" : meta.label}
          <ChevronDown size={12} className="opacity-60" />
        </span>
      </button>

      {open && (
        <ul
          className={`absolute z-20 mt-1.5 w-44 overflow-hidden rounded-card border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {STATUS_OPTIONS.map((key) => {
            const optMeta = STATUS_META[key];
            const isActive = key === status;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (key !== status) onChange(returnId, key);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                    isActive ? "bg-slate-50 font-medium text-slate-900" : "text-slate-600"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${optMeta.dot}`} />
                  {optMeta.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReturnDetailModal({ record, busy, onClose, onStatusChange }) {
  useEffect(() => {
    function onEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  if (!record) return null;
  const r = record.raw;
  const order = r.orderId || {};
  const item = r.orderItemId || {};
  const product = r.productId || {};
  const variant = r.variantId || {};
  const customer = r.customerId || {};

  const Row = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-card bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Return · {order.order_number || "—"}
            </div>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-900">{record.productName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-wrap gap-3 rounded-card border border-slate-100 p-3">
            {record.thumb ? (
              <img
                src={record.thumb}
                alt={record.productName}
                className="h-16 w-16 shrink-0 rounded-card border border-slate-100 object-cover"
              />
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-card border border-slate-100 bg-slate-50" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-slate-900">{record.productName}</div>
              <div className="mt-0.5 text-sm text-slate-500">
                Brand: {product.brandName || "—"} · SKU: {variant.sku || product.sku || "—"}
              </div>
              <div className="text-sm text-slate-500">
                Variant: {variant.variantName || "—"} · Qty returned: {record.qty}
              </div>
              <div className="mt-2">
                <StatusEditor status={record.status} returnId={record.id} busy={busy} onChange={onStatusChange} />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-card border border-amber-200 bg-amber-50 px-3 py-2.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Reason for return</div>
            <div className="mt-0.5 text-sm text-amber-900">{record.reason}</div>
            {record.notes && <div className="mt-1 text-sm text-amber-800">Customer note: {record.notes}</div>}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-slate-100 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</div>
              <div className="divide-y divide-slate-100">
                <Row label="Name" value={customer.name || "—"} />
                <Row label="Email" value={<span className="block max-w-[180px] truncate">{customer.email || "—"}</span>} />
                <Row label="Phone" value={customer.number || "—"} />
                <Row label="Shipping" value={formatAddress(order.shipping_address)} />
                <Row label="Billing" value={formatAddress(order.billing_address)} />
              </div>
            </div>
            <div className="rounded-card border border-slate-100 p-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Order &amp; refund</div>
              <div className="divide-y divide-slate-100">
                <Row label="Order number" value={order.order_number || "—"} />
                <Row label="Order placed" value={formatDate(order.createdAt)} />
                <Row label="Return requested" value={formatDate(r.createdAt, true)} />
                <Row label="Payment method" value={order.payment_method || "—"} />
                <Row label="Unit price" value={formatCurrency(item.unit_price)} />
                <Row label="Refund amount" value={formatCurrency(item.total ?? item.unit_price)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, iconBg, iconColor, label, value, sub, valueColor = "text-slate-900" }) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-slate-200 bg-white p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-card text-base ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`mt-1 text-xl font-bold leading-none ${valueColor}`}>{value}</div>
        <div className="mt-1 text-xs text-slate-400">{sub}</div>
      </div>
    </div>
  );
}

export default function ManageReturns() {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function fetchReturns() {
      setLoading(true);
      setError(null);

      const vendorId = getVendorId();
      if (!vendorId) {
        setError("Couldn't determine vendor from your session. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl(`/api/orders/vendordata/${vendorId}`), { ...authConfig() });
        const body = await safeJson(res);

        if (!res.ok || !body?.success) {
          throw new Error(body?.message || `Request failed (${res.status})`);
        }

        setReturns((body.data || []).map(mapReturnRecord));
      } catch (err) {
        setError(err.message || "Failed to load returns");
      } finally {
        setLoading(false);
      }
    }

    fetchReturns();
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedId ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const selectedReturn = useMemo(
    () => returns.find((r) => r.id === selectedId) || null,
    [returns, selectedId]
  );

  const tabCounts = useMemo(() => {
    const counts = {};
    TABS.forEach((t) => {
      counts[t.key] = t.statuses ? returns.filter((r) => t.statuses.includes(r.status)).length : returns.length;
    });
    return counts;
  }, [returns]);

  const summary = useMemo(() => {
    const total = returns.length;
    const pending = returns.filter((r) => ["requested", "pending"].includes(r.status)).length;
    const completed = returns.filter((r) => r.status === "completed").length;
    const refundValue = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, refundValue, completionRate };
  }, [returns]);

  const visibleReturns = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab || !tab.statuses) return returns;
    return returns.filter((r) => tab.statuses.includes(r.status));
  }, [returns, activeTab]);

  const filtered = visibleReturns.filter(
    (r) =>
      r.orderId.toLowerCase().includes(query.toLowerCase()) ||
      r.productName.toLowerCase().includes(query.toLowerCase())
  );

  async function handleStatusChange(returnId, nextStatus) {
    const previous = returns.find((r) => r.id === returnId)?.status;
    setUpdatingId(returnId);
    setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, status: nextStatus } : r)));

    try {
      await updateReturnStatus(returnId, nextStatus);
      setToast({ type: "success", message: `Status updated to "${STATUS_META[nextStatus]?.label}".` });
    } catch (err) {
      setReturns((prev) => prev.map((r) => (r.id === returnId ? { ...r, status: previous } : r)));
      setToast({ type: "error", message: err.message || "Couldn't update status." });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      {/* header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vendor workspace</div>
          <h1 className="mt-0.5 text-xl font-bold text-slate-900">Manage Returns</h1>
        </div>
        <div className="flex gap-2">
          <button className="rounded-card border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Export report
          </button>
          <button className="rounded-card bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500">
            Return settings
          </button>
        </div>
      </div>

      {/* summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<Package size={18} />} iconBg="bg-amber-50" iconColor="text-amber-600"
          label="Total returns" value={loading ? "—" : summary.total} sub="Last 90 days"
        />
        <SummaryCard
          icon={<Clock size={18} />} iconBg="bg-amber-50" iconColor="text-amber-600"
          label="Needs action" value={loading ? "—" : summary.pending} sub="Awaiting your decision"
          valueColor="text-amber-600"
        />
        <SummaryCard
          icon={<Wallet size={18} />} iconBg="bg-sky-50" iconColor="text-sky-600"
          label="Refund value" value={loading ? "—" : formatCurrency(summary.refundValue)} sub="Across all statuses"
          valueColor="text-sky-600"
        />
        <SummaryCard
          icon={<CheckCircle2 size={18} />} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          label="Completion rate" value={loading ? "—" : `${summary.completionRate}%`} sub="Resolved returns"
          valueColor="text-emerald-600"
        />
      </div>

      {/* main card */}
      <div className="overflow-hidden rounded-card border border-slate-200 bg-white">
        {/* tabs */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 pt-2">
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-amber-600 text-amber-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                  {tabCounts[t.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex h-9 items-center gap-2 rounded-card border border-slate-300 bg-white px-3" style={{ maxWidth: 320, width: "100%" }}>
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID or product name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-full w-full border-0 text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
          <button className="h-9 rounded-card border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Last 90 days ▾
          </button>
          <button className="h-9 rounded-card border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
            IN · Marketplaces (1) ▾
          </button>
          <button className="h-9 rounded-card border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Return reason ▾
          </button>
        </div>

        {/* body */}
        {loading ? (
          <SkeletonRows rows={5} />
        ) : error ? (
          <div className="py-14 text-center">
            <div className="mb-1 font-semibold text-rose-600">Couldn't load returns</div>
            <div className="text-sm text-slate-500">{error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mb-1 font-semibold text-slate-800">No returns found</div>
            <div className="text-sm text-slate-500">Try a different search term or change your filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="w-32 px-4 py-3">Return date</th>
                  <th className="w-28 px-4 py-3 text-right">Refund</th>
                  <th className="w-44 px-4 py-3">Status</th>
                  <th className="w-16 px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, idx) => {
                  const meta = STATUS_META[r.status] || { rail: "#98a2b3" };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3" style={{ borderLeft: `3px solid ${meta.rail}` }}>
                        <div className="flex items-center gap-3">
                          {r.thumb ? (
                            <img
                              src={r.thumb}
                              alt={r.productName}
                              className="h-10 w-10 shrink-0 rounded-card border border-slate-100 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded-card border border-slate-100 bg-slate-50" />
                          )}
                          <div className="min-w-0">
                            <div className="max-w-[280px] truncate font-medium text-slate-900">{r.productName}</div>
                            <div className="whitespace-nowrap text-xs text-slate-500">Order {r.orderId} · Qty {r.qty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{r.refund}</td>
                      <td className="px-4 py-3">
                        <StatusEditor
                          status={r.status}
                          returnId={r.id}
                          busy={updatingId === r.id}
                          onChange={handleStatusChange}
                          align={idx >= filtered.length - 2 ? "right" : "left"}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedId(r.id)}
                          title="View full details"
                          className="inline-flex items-center justify-center rounded-card border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* footer */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
            <span className="text-xs text-slate-500">1–{filtered.length} of {filtered.length} returns</span>
            <div className="flex items-center gap-1 text-sm">
              <button disabled className="rounded-control p-1 text-slate-300">
                <ChevronLeft size={16} />
              </button>
              <button className="rounded-control bg-amber-600 px-2.5 py-1 font-medium text-white">1</button>
              <button disabled className="rounded-control p-1 text-slate-300">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedReturn && (
        <ReturnDetailModal
          record={selectedReturn}
          busy={updatingId === selectedReturn.id}
          onClose={() => setSelectedId(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[100] rounded-card px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.type === "error" ? "bg-rose-600" : "bg-slate-900"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}