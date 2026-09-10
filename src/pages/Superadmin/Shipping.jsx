import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  X,
  Check,
  Truck,
  PackageCheck,
  Clock,
  AlertTriangle,
  MapPin,
  Copy,
  Settings2,
  Plus,
} from "lucide-react";

/**
 * ShippingPage.jsx
 * Super Admin > Shipping
 *
 * Amazon Seller Central "Shipping settings" + "Manage orders" hybrid,
 * scoped to what a Super Admin actually needs across all vendors:
 * live shipment status, and carrier/zone rate configuration.
 * Same token language as BannerPermissions.jsx / VendorPermissions.jsx /
 * PaymentsPage.jsx (navy #232F3E header, #FF9900 accent, #EAEDED canvas).
 *
 * Deliberately left out (not a Super Admin concern on Amazon):
 * - Label printing / packing slips -> vendor-side fulfillment action
 * - Pick/pack/box dimensions -> vendor-side listing detail
 * - Address book / return address -> per-vendor settings, not platform-wide
 *
 * Wire-up notes:
 * - Replace MOCK_SHIPMENTS with GET /api/admin/shipping/shipments
 * - Replace MOCK_CARRIERS with GET /api/admin/shipping/carriers
 * - Carrier toggle / rate edits should PATCH /api/admin/shipping/carriers/:carrierId
 * - All requests use apiUrl() + authConfig() + adminToken, parsed with safeJson()
 */

const MOCK_SHIPMENTS = [
  {
    id: "ord_7741",
    vendor: "Orion Electronics",
    carrier: "Delhivery",
    tracking: "DL774112093IN",
    destination: "Pune, MH",
    status: "in_transit",
    eta: "23 Jul 2026",
  },
  {
    id: "ord_7742",
    vendor: "Meadow & Co. Home",
    carrier: "Bluedart",
    tracking: "BD991823741",
    destination: "Jaipur, RJ",
    status: "delivered",
    eta: "Delivered 20 Jul 2026",
  },
  {
    id: "ord_7743",
    vendor: "Kestrel Outdoors",
    carrier: "Delhivery",
    tracking: "DL774119284IN",
    destination: "Kochi, KL",
    status: "delayed",
    eta: "Was due 19 Jul 2026",
  },
  {
    id: "ord_7744",
    vendor: "Lumen Beauty Lab",
    carrier: "Xpressbees",
    tracking: "XB3348219974",
    destination: "Indore, MP",
    status: "rto",
    eta: "Returning to origin",
  },
  {
    id: "ord_7745",
    vendor: "Northbound Coffee Roasters",
    carrier: "Bluedart",
    tracking: "BD991829012",
    destination: "Ajmer, RJ",
    status: "in_transit",
    eta: "22 Jul 2026",
  },
  {
    id: "ord_7746",
    vendor: "Orion Electronics",
    carrier: "Xpressbees",
    tracking: "XB3348227761",
    destination: "Nagpur, MH",
    status: "pending_pickup",
    eta: "Pickup scheduled 22 Jul 2026",
  },
];

const MOCK_CARRIERS = [
  {
    id: "c_1",
    name: "Delhivery",
    zonesCovered: "Pan-India",
    baseRate: 45,
    codAvailable: true,
    enabled: true,
  },
  {
    id: "c_2",
    name: "Bluedart",
    zonesCovered: "Metro + Tier 1",
    baseRate: 68,
    codAvailable: true,
    enabled: true,
  },
  {
    id: "c_3",
    name: "Xpressbees",
    zonesCovered: "Pan-India",
    baseRate: 40,
    codAvailable: true,
    enabled: true,
  },
  {
    id: "c_4",
    name: "Ekart",
    zonesCovered: "Tier 2 + Tier 3",
    baseRate: 38,
    codAvailable: false,
    enabled: false,
  },
];

const STATUS_META = {
  in_transit: { label: "In transit", style: "bg-blue-50 text-blue-800 border border-blue-200" },
  delivered: { label: "Delivered", style: "bg-green-50 text-green-800 border border-green-200" },
  delayed: { label: "Delayed", style: "bg-amber-50 text-amber-800 border border-amber-200" },
  rto: { label: "RTO", style: "bg-red-50 text-red-800 border border-red-200" },
  pending_pickup: { label: "Pending pickup", style: "bg-slate-100 text-ink-800 border border-slate-300" },
};

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 ${
        checked ? "bg-amber-500" : "bg-slate-300"
      }`}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-150"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
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

export default function ShippingPage() {
  const [tab, setTab] = useState("shipments"); // shipments | carriers
  const [shipments] = useState(MOCK_SHIPMENTS);
  const [carriers, setCarriers] = useState(MOCK_CARRIERS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trackingView, setTrackingView] = useState(null); // shipment object
  const [editingCarrier, setEditingCarrier] = useState(null);

  const filtered = useMemo(() => {
    return shipments.filter((s) => {
      const matchesQuery =
        s.vendor.toLowerCase().includes(query.toLowerCase()) ||
        s.tracking.toLowerCase().includes(query.toLowerCase()) ||
        s.id.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [shipments, query, statusFilter]);

  const stats = useMemo(
    () => ({
      inTransit: shipments.filter((s) => s.status === "in_transit").length,
      delivered: shipments.filter((s) => s.status === "delivered").length,
      delayed: shipments.filter((s) => s.status === "delayed").length,
      rto: shipments.filter((s) => s.status === "rto").length,
    }),
    [shipments]
  );

  const toggleCarrier = (id, val) => {
    setCarriers((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: val } : c)));
    // TODO: PATCH `${apiUrl()}/admin/shipping/carriers/${id}` { enabled: val }
  };

  return (
    <div className="min-h-screen bg-surface">
     

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-950">Shipping</h1>
            <p className="text-sm text-slate-500">
              Track shipments across vendors and manage which carriers are active on the platform.
            </p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="In transit" value={stats.inTransit} icon={Truck} accent="bg-blue-50 text-blue-700" />
          <StatCard label="Delivered" value={stats.delivered} icon={PackageCheck} accent="bg-green-50 text-green-700" />
          <StatCard label="Delayed" value={stats.delayed} icon={Clock} accent="bg-amber-50 text-amber-700" />
          <StatCard label="RTO" value={stats.rto} icon={AlertTriangle} accent="bg-red-50 text-red-700" />
        </div>

        {/* Tabs */}
        <div className="mb-3 flex gap-1 border-b border-slate-300">
          {[
            { key: "shipments", label: "Shipments" },
            { key: "carriers", label: "Carriers & rates" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                tab === t.key
                  ? "border-amber-500 text-ink-950"
                  : "border-transparent text-slate-500 hover:text-ink-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "shipments" ? (
          <>
            {/* Toolbar */}
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search order, vendor, or tracking ID"
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
                    <option value="pending_pickup">Pending pickup</option>
                    <option value="in_transit">In transit</option>
                    <option value="delayed">Delayed</option>
                    <option value="delivered">Delivered</option>
                    <option value="rto">RTO</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-control border border-slate-300 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2.5">Order</th>
                      <th className="px-3 py-2.5">Vendor</th>
                      <th className="px-3 py-2.5">Carrier</th>
                      <th className="px-3 py-2.5">Tracking ID</th>
                      <th className="px-3 py-2.5">Destination</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-ink-950">{s.id}</td>
                        <td className="px-3 py-2.5 text-ink-800">{s.vendor}</td>
                        <td className="px-3 py-2.5 text-ink-800">{s.carrier}</td>
                        <td className="px-3 py-2.5 text-ink-700">{s.tracking}</td>
                        <td className="px-3 py-2.5 text-ink-700">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {s.destination}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[s.status].style}`}>
                            {STATUS_META[s.status].label}
                          </span>
                          <p className="mt-0.5 text-xs text-slate-400">{s.eta}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => setTrackingView(s)}
                            className="inline-flex items-center gap-1 rounded-control border border-slate-300 px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-slate-100"
                          >
                            <Truck size={13} />
                            Track
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                          No shipments match this search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Carriers & rates */}
            <div className="mb-3 flex items-center justify-end">
              <button className="flex items-center gap-1 rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1.5 text-sm font-medium text-ink-950 hover:from-amber-300 hover:to-amber-500">
                <Plus size={14} />
                Add carrier
              </button>
            </div>

            <div className="overflow-hidden rounded-control border border-slate-300 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2.5">Carrier</th>
                      <th className="px-3 py-2.5">Zones covered</th>
                      <th className="px-3 py-2.5">Base rate</th>
                      <th className="px-3 py-2.5">COD available</th>
                      <th className="px-3 py-2.5">Active</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carriers.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-ink-950">{c.name}</td>
                        <td className="px-3 py-2.5 text-ink-700">{c.zonesCovered}</td>
                        <td className="px-3 py-2.5 text-ink-800">₹{c.baseRate} / shipment</td>
                        <td className="px-3 py-2.5">
                          {c.codAvailable ? (
                            <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-700">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <Toggle checked={c.enabled} onChange={(val) => toggleCarrier(c.id, val)} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => setEditingCarrier(c)}
                            className="inline-flex items-center gap-1 rounded-control border border-slate-300 px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-slate-100"
                          >
                            <Settings2 size={13} />
                            Edit rate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tracking modal */}
      {trackingView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Tracking — {trackingView.id}</h2>
              <button onClick={() => setTrackingView(null)} className="text-slate-400 hover:text-ink-800">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Carrier</span>
                <span className="text-ink-950">{trackingView.carrier}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tracking ID</span>
                <span className="flex items-center gap-1 text-ink-950">
                  {trackingView.tracking}
                  <Copy size={12} className="cursor-pointer text-slate-400 hover:text-ink-800" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Destination</span>
                <span className="text-ink-950">{trackingView.destination}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[trackingView.status].style}`}>
                  {STATUS_META[trackingView.status].label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Estimate</span>
                <span className="text-ink-950">{trackingView.eta}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => setTrackingView(null)}
                className="rounded-control border border-slate-300 px-3 py-1.5 text-sm text-ink-800 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit carrier rate modal */}
      {editingCarrier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Edit {editingCarrier.name} rate</h2>
              <button onClick={() => setEditingCarrier(null)} className="text-slate-400 hover:text-ink-800">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-900">Base rate (₹ / shipment)</label>
                <input
                  type="number"
                  defaultValue={editingCarrier.baseRate}
                  className="w-full rounded-control border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-900">Zones covered</label>
                <input
                  type="text"
                  defaultValue={editingCarrier.zonesCovered}
                  className="w-full rounded-control border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => setEditingCarrier(null)}
                className="rounded-control border border-slate-300 px-3 py-1.5 text-sm text-ink-800 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => setEditingCarrier(null)}
                className="flex items-center gap-1 rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1.5 text-sm font-medium text-ink-950 hover:from-amber-300 hover:to-amber-500"
              >
                <Check size={14} />
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}