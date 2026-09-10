import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  X,
  Check,
  Eye,
  Download,
  Wallet,
  Clock,
  AlertCircle,
  Banknote,
  Ban,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

/**
 * PaymentsPage.jsx
 * Super Admin > Payments
 *
 * Amazon Seller Central "Payments" dashboard, adapted for a Super Admin
 * overseeing all vendor disbursements. Same token language as
 * BannerPermissions.jsx / VendorPermissions.jsx (navy #232F3E header,
 * #FF9900 accent, #EAEDED canvas).
 *
 * Wire-up notes:
 * - Replace MOCK_PAYOUTS with GET /api/admin/payments/payouts
 * - Replace MOCK_TXNS with GET /api/admin/payments/payouts/:payoutId/transactions
 * - Approve/hold/retry actions should PATCH /api/admin/payments/payouts/:payoutId
 * - All requests use apiUrl() + authConfig() + adminToken, parsed with safeJson()
 * - invalidateTree() after status changes if payout totals feed the dashboard
 */

const MOCK_PAYOUTS = [
  {
    id: "po_9001",
    vendor: "Orion Electronics",
    store: "orion-electronics",
    period: "01 Jul – 15 Jul 2026",
    orders: 214,
    grossSales: 486200,
    commission: 48620,
    refunds: 9100,
    adjustments: -1200,
    netPayable: 427280,
    status: "paid",
    method: "Bank transfer",
    payoutDate: "18 Jul 2026",
  },
  {
    id: "po_9002",
    vendor: "Meadow & Co. Home",
    store: "meadow-home",
    period: "01 Jul – 15 Jul 2026",
    orders: 132,
    grossSales: 291800,
    commission: 29180,
    refunds: 4200,
    adjustments: 0,
    netPayable: 258420,
    status: "processing",
    method: "Bank transfer",
    payoutDate: "Scheduled 21 Jul 2026",
  },
  {
    id: "po_9003",
    vendor: "Kestrel Outdoors",
    store: "kestrel-outdoors",
    period: "01 Jul – 15 Jul 2026",
    orders: 41,
    grossSales: 78300,
    commission: 7830,
    refunds: 12100,
    adjustments: -2500,
    netPayable: 55870,
    status: "on_hold",
    method: "Bank transfer",
    payoutDate: "On hold — document review",
  },
  {
    id: "po_9004",
    vendor: "Lumen Beauty Lab",
    store: "lumen-beauty",
    period: "01 Jul – 15 Jul 2026",
    orders: 87,
    grossSales: 156400,
    commission: 15640,
    refunds: 3100,
    adjustments: 0,
    netPayable: 137660,
    status: "failed",
    method: "Bank transfer",
    payoutDate: "Failed 19 Jul 2026",
  },
  {
    id: "po_9005",
    vendor: "Northbound Coffee Roasters",
    store: "northbound-coffee",
    period: "01 Jul – 15 Jul 2026",
    orders: 305,
    grossSales: 612900,
    commission: 61290,
    refunds: 6700,
    adjustments: 800,
    netPayable: 545710,
    status: "pending",
    method: "Bank transfer",
    payoutDate: "Scheduled 21 Jul 2026",
  },
];

const MOCK_TXNS = [
  { id: "ord_4471", type: "Order", amount: 2400, date: "03 Jul 2026" },
  { id: "ord_4488", type: "Order", amount: 1850, date: "05 Jul 2026" },
  { id: "rfd_1129", type: "Refund", amount: -650, date: "07 Jul 2026" },
  { id: "ord_4502", type: "Order", amount: 3200, date: "09 Jul 2026" },
  { id: "fee_0091", type: "Commission fee", amount: -320, date: "09 Jul 2026" },
  { id: "ord_4519", type: "Order", amount: 1990, date: "12 Jul 2026" },
];

const STATUS_META = {
  paid: { label: "Paid", style: "bg-green-50 text-green-800 border border-green-200" },
  processing: { label: "Processing", style: "bg-blue-50 text-blue-800 border border-blue-200" },
  pending: { label: "Pending", style: "bg-amber-50 text-amber-800 border border-amber-200" },
  on_hold: { label: "On hold", style: "bg-slate-100 text-ink-800 border border-slate-300" },
  failed: { label: "Failed", style: "bg-red-50 text-red-800 border border-red-200" },
};

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-slate-200 bg-white px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accent}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-ink-950">{value}</p>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const [payouts, setPayouts] = useState(MOCK_PAYOUTS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [detail, setDetail] = useState(null); // payout object or null

  const filtered = useMemo(() => {
    return payouts.filter((p) => {
      const matchesQuery = p.vendor.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [payouts, query, statusFilter]);

  const stats = useMemo(() => {
    const totalPayable = payouts.reduce((sum, p) => sum + p.netPayable, 0);
    const paid = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.netPayable, 0);
    const pendingCount = payouts.filter((p) => ["pending", "processing"].includes(p.status)).length;
    const flaggedCount = payouts.filter((p) => ["on_hold", "failed"].includes(p.status)).length;
    return { totalPayable, paid, pendingCount, flaggedCount };
  }, [payouts]);

  const toggleSelected = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));

  const setStatus = (id, status, payoutDate) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status, payoutDate: payoutDate ?? p.payoutDate } : p))
    );
    // TODO: PATCH `${apiUrl()}/admin/payments/payouts/${id}`
  };

  const bulkApprove = () => {
    setPayouts((prev) =>
      prev.map((p) =>
        selected.includes(p.id) && p.status !== "paid"
          ? { ...p, status: "processing", payoutDate: "Scheduled 21 Jul 2026" }
          : p
      )
    );
    setSelected([]);
  };

  const bulkHold = () => {
    setPayouts((prev) =>
      prev.map((p) => (selected.includes(p.id) ? { ...p, status: "on_hold", payoutDate: "On hold — manual review" } : p))
    );
    setSelected([]);
  };

  return (
    <div className="min-h-screen bg-surface">
   
     

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-950">Payments</h1>
            <p className="text-sm text-slate-500">
              Review vendor disbursements for the current settlement cycle.
            </p>
          </div>
          <button className="w-fit rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-1.5 text-sm font-medium text-ink-950 shadow-sm hover:from-amber-300 hover:to-amber-500">
            Export settlement report
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total payable" value={formatCurrency(stats.totalPayable)} icon={Wallet} accent="bg-blue-50 text-blue-700" />
          <StatCard label="Already paid" value={formatCurrency(stats.paid)} icon={Banknote} accent="bg-green-50 text-green-700" />
          <StatCard label="Pending / processing" value={stats.pendingCount} icon={Clock} accent="bg-amber-50 text-amber-700" />
          <StatCard label="On hold / failed" value={stats.flaggedCount} icon={AlertCircle} accent="bg-red-50 text-red-700" />
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vendor name"
                className="w-full rounded-control border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-control border border-line bg-white py-2.5 pl-3.5 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="on_hold">On hold</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center gap-2 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-sm">
              <span className="text-ink-700">{selected.length} selected</span>
              <button
                onClick={bulkApprove}
                className="rounded-control border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
              >
                Approve payout
              </button>
              <button
                onClick={bulkHold}
                className="rounded-control border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-slate-100"
              >
                Put on hold
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-control border border-slate-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => setSelected(allVisibleSelected ? [] : filtered.map((p) => p.id))}
                      className="h-3.5 w-3.5 accent-amber-500"
                    />
                  </th>
                  <th className="px-3 py-2.5">Vendor</th>
                  <th className="px-3 py-2.5">Period</th>
                  <th className="px-3 py-2.5">Gross sales</th>
                  <th className="px-3 py-2.5">Commission</th>
                  <th className="px-3 py-2.5">Refunds</th>
                  <th className="px-3 py-2.5">Net payable</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggleSelected(p.id)}
                        className="h-3.5 w-3.5 accent-amber-500"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-ink-950">{p.vendor}</p>
                      <p className="text-xs text-slate-500">{p.orders} orders · {p.method}</p>
                    </td>
                    <td className="px-3 py-2.5 text-ink-700">{p.period}</td>
                    <td className="px-3 py-2.5 text-ink-800">{formatCurrency(p.grossSales)}</td>
                    <td className="px-3 py-2.5 text-ink-800">{formatCurrency(p.commission)}</td>
                    <td className="px-3 py-2.5 text-ink-800">{formatCurrency(p.refunds)}</td>
                    <td className="px-3 py-2.5 font-medium text-ink-950">{formatCurrency(p.netPayable)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[p.status].style}`}>
                        {STATUS_META[p.status].label}
                      </span>
                      <p className="mt-0.5 text-xs text-slate-400">{p.payoutDate}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setDetail(p)}
                        className="inline-flex items-center gap-1 rounded-control border border-slate-300 px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-slate-100"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-slate-500">
                      No payouts match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payout detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-ink-950">{detail.vendor}</h2>
                <p className="text-xs text-slate-500">{detail.period}</p>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-ink-800">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 rounded-control border border-slate-200 bg-slate-50 p-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Gross sales</p>
                  <p className="font-medium text-ink-950">{formatCurrency(detail.grossSales)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Commission</p>
                  <p className="font-medium text-ink-950">-{formatCurrency(detail.commission)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Refunds</p>
                  <p className="font-medium text-ink-950">-{formatCurrency(detail.refunds)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Adjustments</p>
                  <p className="font-medium text-ink-950">
                    {detail.adjustments >= 0 ? "+" : "-"}{formatCurrency(Math.abs(detail.adjustments))}
                  </p>
                </div>
                <div className="col-span-2 border-t border-slate-200 pt-2">
                  <p className="text-xs text-slate-500">Net payable</p>
                  <p className="text-base font-semibold text-ink-950">{formatCurrency(detail.netPayable)}</p>
                </div>
              </div>

              {/* Transaction list */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Transaction breakdown
                </h3>
                <div className="divide-y divide-slate-100 rounded-control border border-slate-200">
                  {MOCK_TXNS.map((t) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        {t.amount >= 0 ? (
                          <ArrowUpRight size={14} className="text-green-600" />
                        ) : (
                          <ArrowDownRight size={14} className="text-red-600" />
                        )}
                        <div>
                          <p className="text-ink-900">{t.type}</p>
                          <p className="text-xs text-slate-500">{t.id} · {t.date}</p>
                        </div>
                      </div>
                      <span className={t.amount >= 0 ? "text-ink-950" : "text-red-700"}>
                        {t.amount >= 0 ? "+" : "-"}{formatCurrency(Math.abs(t.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="flex w-full items-center justify-center gap-1.5 rounded-control border border-slate-300 px-3 py-1.5 text-sm text-ink-800 hover:bg-slate-100">
                <Download size={14} />
                Download settlement statement
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => {
                  setStatus(detail.id, "on_hold", "On hold — manual review");
                  setDetail(null);
                }}
                className="flex items-center gap-1 rounded-control border border-slate-300 px-3 py-1.5 text-sm text-ink-800 hover:bg-slate-100"
              >
                <Ban size={14} />
                Put on hold
              </button>
              <button
                onClick={() => {
                  setStatus(detail.id, "processing", "Scheduled 21 Jul 2026");
                  setDetail(null);
                }}
                className="flex items-center gap-1 rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1.5 text-sm font-medium text-ink-950 hover:from-amber-300 hover:to-amber-500"
              >
                <Check size={14} />
                Approve payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}