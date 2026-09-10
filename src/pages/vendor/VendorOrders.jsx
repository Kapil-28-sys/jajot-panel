import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, RotateCcw, Search, Timer, Truck, X } from "lucide-react";
import DataPager from "../../components/common/DataPager";
import MetricCard from "../../components/common/MetricCard";

const inr = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const statusClass = {
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Shipped: "bg-sky-50 text-sky-700 ring-sky-200",
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Returned: "bg-red-50 text-red-700 ring-red-200",
  Cancelled: "bg-slate-50 text-ink-800 ring-slate-200",
};

const paymentStatusClass = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Failed: "bg-red-50 text-red-700 ring-red-200",
  Refunded: "bg-slate-50 text-ink-800 ring-slate-200",
};

// Keep this list in sync with whatever your backend accepts for `status`.
const STATUS_OPTIONS = ["Pending", "Shipped", "Delivered", "Returned", "Cancelled"];

const toTitleCase = (str = "") => (str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "-");

const formatDate = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (iso) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Backend billing_address / shipping_address ek object hota hai
// { line1, line2, city, state, pincode, country } - isko readable string me convert karo.
// Pehle code `.address` field dhoondh raha tha jo exist hi nahi karti thi, isliye
// address hamesha blank aa raha tha.
const formatAddress = (addr) => {
  if (!addr) return null;
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country].filter(
    Boolean
  );
  return parts.length ? parts.join(", ") : null;
};

// 👇 localStorage me "adminSession" ke naam se ek JSON object save hota hai
// jisme email, name, role, allowedPaths ke saath vendorId bhi already maujood hai.
const ADMIN_SESSION_KEY = "adminSession";

const getAdminSession = () => {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse adminSession:", err);
    return null;
  }
};

const getVendorIdFromSession = () => {
  const session = getAdminSession();
  return session?.vendorId || null;
};

// ---------- Order details modal ----------
function OrderDetailsModal({ order, onClose, onStatusChange, statusUpdating }) {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-control bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-sm font-medium text-amber-600">Order details</p>
            <h2 className="text-lg font-bold text-ink-950">{order.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-control p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Vendor</p>
              <p className="mt-1 font-medium text-ink-950">{order.vendorName}</p>
              <p className="text-xs text-slate-500">{order.vendorEmail}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Placed on</p>
              <p className="mt-1 font-medium text-ink-950">{order.dateTime}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Shipping address</p>
              <p className="mt-1 text-sm text-ink-800">{order.shippingAddress}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Billing address</p>
              <p className="mt-1 text-sm text-ink-800">{order.billingAddress}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment method</p>
              <div className="mt-1 flex items-center gap-1 text-sm text-ink-800">
                <Truck size={14} />
                {order.channel}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment status</p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                  paymentStatusClass[order.paymentStatus] || "bg-slate-50 text-ink-800 ring-slate-200"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Order status</p>
              <select
                value={order.status}
                disabled={statusUpdating}
                onChange={(e) => onStatusChange(order, e.target.value)}
                className={`mt-1 w-full rounded-full border-0 px-2.5 py-1 text-xs font-bold ring-1 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                  statusClass[order.status] || "bg-slate-50 text-ink-800 ring-slate-200"
                } ${statusUpdating ? "opacity-60" : ""}`}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Items</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1.5 text-left font-semibold">Product</th>
                  <th className="py-1.5 text-right font-semibold">Qty</th>
                  <th className="py-1.5 text-right font-semibold">Unit price</th>
                  <th className="py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{inr(item.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold">{inr(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="pt-3 text-right font-semibold text-ink-700">
                    Subtotal
                  </td>
                  <td className="pt-3 text-right font-bold">{inr(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right font-semibold text-ink-700">
                    Total
                  </td>
                  <td className="text-right text-base font-bold text-amber-700">{inr(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            Order ID: <span className="font-mono">{order.mongoId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal + status-update state
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      setLoading(true);
      setError(null);

      const vendorId = getVendorIdFromSession();

      if (!vendorId) {
        if (!cancelled) {
          setError("Vendor ID not found. Please login again.");
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`https://amazon-multi-vendor-3.onrender.com/api/orders/vendor/${vendorId}`);
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const json = await res.json();
        if (!json.success) throw new Error("API returned an unsuccessful response");
        if (!cancelled) setOrders(json.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, []);

  // Normalize API orders into the shape the table/cards/modal expect
  const normalizedOrders = useMemo(
    () =>
      orders.map((order) => {
        const shippingAddr = formatAddress(order.shipping_address);
        const billingAddr = formatAddress(order.billing_address);

        return {
          id: order.order_number,
          mongoId: order._id,
          vendorName: order.vendorId?.companyname?.trim() || order.vendorId?.email || "Unknown vendor",
          vendorEmail: order.vendorId?.email || "-",
          customerAddress: shippingAddr || billingAddr || "Guest customer",
          shippingAddress: shippingAddr || "-",
          billingAddress: billingAddr || "-",
          channel: order.payment_method || "-",
          paymentStatus: toTitleCase(order.payment_status),
          date: formatDate(order.createdAt),
          dateTime: formatDateTime(order.createdAt),
          itemCount: order.items?.length || 0,
          items: (order.items || []).map((item) => ({
            id: item._id,
            name: item.product_name || "Unnamed product",
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || 0,
            total: item.total ?? (item.unit_price || 0) * (item.quantity || 0),
          })),
          subtotal: order.subtotal,
          total: order.total,
          currency: order.currency || "INR",
          status: toTitleCase(order.status),
          raw: order,
        };
      }),
    [orders]
  );

  const visibleOrders = useMemo(
    () =>
      normalizedOrders.filter((order) => {
        const itemNames = order.items.map((i) => i.name).join(" ");
        const haystack = `${order.id} ${order.customerAddress} ${order.status} ${order.vendorName} ${itemNames}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [normalizedOrders, query]
  );

  const pagedOrders = visibleOrders.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const selectedOrder = useMemo(
    () => normalizedOrders.find((o) => o.mongoId === selectedOrderId) || null,
    [normalizedOrders, selectedOrderId]
  );

  // ---- Status update handler ----
  // NOTE: confirm this endpoint/method/payload against your actual backend route
  // for updating an order's status (it may be PUT/PATCH and a different path).
  const handleStatusChange = async (order, newStatusLabel) => {
    const previousStatusRaw = order.raw.status;
    const newStatusApiValue = newStatusLabel.toLowerCase();

    setStatusUpdatingId(order.mongoId);
    // Optimistic update so the badge/select reflects the change immediately
    setOrders((prev) =>
      prev.map((o) => (o._id === order.mongoId ? { ...o, status: newStatusApiValue } : o))
    );

    try {
      const res = await fetch(
        `https://amazon-multi-vendor-3.onrender.com/api/orders/${order.mongoId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatusApiValue }),
        }
      );
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error("API returned an unsuccessful response");
    } catch (err) {
      // Revert on failure
      setOrders((prev) =>
        prev.map((o) => (o._id === order.mongoId ? { ...o, status: previousStatusRaw } : o))
      );
      window.alert(`Could not update status: ${err.message || "unknown error"}`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const metricStatuses = [
    { status: "Pending", icon: Timer, tone: "orange" },
    { status: "Shipped", icon: Truck, tone: "blue" },
    { status: "Delivered", icon: CheckCircle2, tone: "green" },
    { status: "Returned", icon: RotateCcw, tone: "red" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">Order operations</p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">Orders</h1>
            <p className="text-sm text-slate-500">Track marketplace orders across vendors, fulfillment channels, and delivery status.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search orders, products, address"
                className="w-full rounded-control border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:w-80"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {metricStatuses.map((item) => (
          <MetricCard
            key={item.status}
            label={item.status}
            value={visibleOrders.filter((order) => order.status === item.status).length}
            helper="orders in queue"
            icon={item.icon}
            tone={item.tone}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <ClipboardListIcon />
          <h2 className="font-bold">Order queue</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Loading orders…</span>
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-red-600">
            Failed to load orders: {error}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No orders found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-800 text-white">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Vendor</th>
                    <th className="px-5 py-3 font-semibold">Address</th>
                    <th className="px-5 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface">
                      <td className="px-5 py-4">
                        <p className="font-bold text-amber-600">{order.id}</p>
                        <p className="text-xs text-slate-500">{order.dateTime} · {order.itemCount} item(s)</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium">{order.vendorName}</p>
                        <p className="text-xs text-slate-500">{order.vendorEmail}</p>
                      </td>
                      <td className="px-5 py-4 max-w-[220px] truncate" title={order.customerAddress}>
                        {order.customerAddress}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-ink-800">
                          <Truck size={15} />
                          {order.channel}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                            paymentStatusClass[order.paymentStatus] || "bg-slate-50 text-ink-800 ring-slate-200"
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold">{inr(order.total)}</td>
                      <td className="px-5 py-4">
                        <select
                          value={order.status}
                          disabled={statusUpdatingId === order.mongoId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(order, e.target.value)}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-bold ring-1 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                            statusClass[order.status] || "bg-slate-50 text-ink-800 ring-slate-200"
                          } ${statusUpdatingId === order.mongoId ? "opacity-60" : ""}`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setSelectedOrderId(order.mongoId)}
                          className="inline-flex items-center justify-center rounded-full p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                          title="View order details"
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataPager
              total={visibleOrders.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={updatePageSize}
            />
          </>
        )}
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        onStatusChange={handleStatusChange}
        statusUpdating={statusUpdatingId === selectedOrder?.mongoId}
      />
    </div>
  );
}

// Small inline icon so we don't need an extra import line change elsewhere in your codebase
function ClipboardListIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#c45500"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}