import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Package,
  IndianRupee,
  Award,
  Store,
} from "lucide-react";

/**
 * ProductSalesAnalytics.jsx
 * Super Admin > Reports > Highest product sales
 *
 * Modeled on Amazon's Business Reports > "Detail page sales and traffic"
 * and Seller Central's Best Sellers view: date range, vendor scope,
 * a sales trend line, a top-products bar chart, and a ranked table.
 * Same token language as the other Super Admin pages (navy #232F3E
 * header, #FF9900 accent, #EAEDED canvas).
 *
 * Requires: recharts (already a project dependency per past debugging)
 *
 * Wire-up notes:
 * - Replace MOCK_PRODUCTS / MOCK_TREND with GET /api/admin/reports/product-sales
 *   query params: vendorId ("all" or specific), range (7d/30d/90d)
 * - Vendor dropdown options should come from GET /api/admin/vendors (id + name)
 * - All requests use apiUrl() + authConfig() + adminToken, parsed with safeJson()
 */

const VENDORS = [
  { id: "all", name: "All vendors" },
  { id: "v_1001", name: "Orion Electronics" },
  { id: "v_1002", name: "Meadow & Co. Home" },
  { id: "v_1003", name: "Kestrel Outdoors" },
  { id: "v_1004", name: "Lumen Beauty Lab" },
  { id: "v_1005", name: "Northbound Coffee Roasters" },
];

const MOCK_PRODUCTS = [
  { id: "p_1", name: "Wireless ANC Headphones", vendorId: "v_1001", vendor: "Orion Electronics", category: "Electronics", unitsSold: 1842, revenue: 1289400, growth: 12.4 },
  { id: "p_2", name: "Cast Iron Dutch Oven 5L", vendorId: "v_1002", vendor: "Meadow & Co. Home", category: "Home & Kitchen", unitsSold: 1520, revenue: 987600, growth: 8.1 },
  { id: "p_3", name: "Insulated Trail Backpack 30L", vendorId: "v_1003", vendor: "Kestrel Outdoors", category: "Outdoors", unitsSold: 1310, revenue: 745900, growth: -3.6 },
  { id: "p_4", name: "Vitamin C Serum 30ml", vendorId: "v_1004", vendor: "Lumen Beauty Lab", category: "Beauty", unitsSold: 2290, revenue: 686900, growth: 21.7 },
  { id: "p_5", name: "Single-Origin Coffee Beans 1kg", vendorId: "v_1005", vendor: "Northbound Coffee Roasters", category: "Grocery", unitsSold: 1980, revenue: 594100, growth: 15.2 },
  { id: "p_6", name: "USB-C Fast Charger 65W", vendorId: "v_1001", vendor: "Orion Electronics", category: "Electronics", unitsSold: 2410, revenue: 578300, growth: 6.9 },
  { id: "p_7", name: "Linen Throw Blanket", vendorId: "v_1002", vendor: "Meadow & Co. Home", category: "Home & Kitchen", unitsSold: 1105, revenue: 441200, growth: -1.2 },
  { id: "p_8", name: "Trekking Poles (Pair)", vendorId: "v_1003", vendor: "Kestrel Outdoors", category: "Outdoors", unitsSold: 890, revenue: 400500, growth: 4.4 },
  { id: "p_9", name: "Hydrating Face Mist 100ml", vendorId: "v_1004", vendor: "Lumen Beauty Lab", category: "Beauty", unitsSold: 1670, revenue: 350700, growth: 9.8 },
  { id: "p_10", name: "Cold Brew Concentrate 500ml", vendorId: "v_1005", vendor: "Northbound Coffee Roasters", category: "Grocery", unitsSold: 1420, revenue: 298200, growth: 3.1 },
];

const MOCK_TREND = [
  { date: "1 Jul", revenue: 182000 },
  { date: "4 Jul", revenue: 201000 },
  { date: "7 Jul", revenue: 194000 },
  { date: "10 Jul", revenue: 227000 },
  { date: "13 Jul", revenue: 215000 },
  { date: "16 Jul", revenue: 248000 },
  { date: "19 Jul", revenue: 262000 },
  { date: "21 Jul", revenue: 251000 },
];

function formatCurrency(n) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function formatCompact(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
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

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm">
      <p className="text-slate-500">{label}</p>
      <p className="font-medium text-ink-950">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function ProductSalesAnalytics() {
  const [vendorId, setVendorId] = useState("all");
  const [range, setRange] = useState("30d");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("revenue"); // revenue | unitsSold

  const scoped = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => vendorId === "all" || p.vendorId === vendorId);
  }, [vendorId]);

  const filtered = useMemo(() => {
    return scoped
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }, [scoped, query, sortBy]);

  const topTen = useMemo(
    () =>
      [...scoped]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((p) => ({ name: p.name.length > 16 ? p.name.slice(0, 16) + "…" : p.name, revenue: p.revenue })),
    [scoped]
  );

  const stats = useMemo(() => {
    const totalUnits = scoped.reduce((s, p) => s + p.unitsSold, 0);
    const totalRevenue = scoped.reduce((s, p) => s + p.revenue, 0);
    const avgGrowth = scoped.reduce((s, p) => s + p.growth, 0) / (scoped.length || 1);
    const topProduct = [...scoped].sort((a, b) => b.revenue - a.revenue)[0];
    return { totalUnits, totalRevenue, avgGrowth, topProduct };
  }, [scoped]);

  const selectedVendorName = VENDORS.find((v) => v.id === vendorId)?.name ?? "All vendors";

  return (
    <div className="min-h-screen bg-surface">
      {/* Top nav bar */}
      <div className="bg-ink-800 text-white">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold tracking-tight">
              Seller<span className="text-amber-500">Admin</span>
            </span>
            <span className="hidden text-sm text-slate-300 sm:inline">Super Admin Console</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-200">
            <span>admin@platform.com</span>
            <div className="h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-ink-950">
              SA
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="border-b border-slate-300 bg-white px-4 py-2 text-sm text-slate-500">
        <span>Dashboard</span>
        <span className="mx-1.5 text-slate-400">/</span>
        <span>Reports</span>
        <span className="mx-1.5 text-slate-400">/</span>
        <span className="font-medium text-ink-950">Highest product sales</span>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header + scope controls */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-950">Highest product sales</h1>
            <p className="text-sm text-slate-500">
              Best-selling products {vendorId === "all" ? "across all vendors" : `for ${selectedVendorName}`}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="appearance-none rounded-control border border-line bg-white py-2.5 pl-3.5 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                {VENDORS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <div className="relative">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="appearance-none rounded-control border border-line bg-white py-2.5 pl-3.5 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Units sold" value={stats.totalUnits.toLocaleString("en-IN")} icon={Package} accent="bg-blue-50 text-blue-700" />
          <StatCard label="Total revenue" value={formatCompact(stats.totalRevenue)} icon={IndianRupee} accent="bg-green-50 text-green-700" />
          <StatCard
            label="Avg. growth"
            value={`${stats.avgGrowth >= 0 ? "+" : ""}${stats.avgGrowth.toFixed(1)}%`}
            icon={stats.avgGrowth >= 0 ? TrendingUp : TrendingDown}
            accent={stats.avgGrowth >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
          />
          <StatCard label="Top product" value={stats.topProduct ? stats.topProduct.name.slice(0, 14) + (stats.topProduct.name.length > 14 ? "…" : "") : "—"} icon={Award} accent="bg-amber-50 text-amber-700" />
        </div>

        {/* Charts */}
        <div className="mb-5 grid gap-4 lg:grid-cols-5">
          {/* Revenue trend */}
          <div className="rounded-control border border-slate-300 bg-white p-4 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-950">Revenue trend</h2>
              <span className="text-xs text-slate-500">
                {range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last 90 days"}
              </span>
            </div>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={MOCK_TREND} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#d1d5db" }} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => formatCompact(v)}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="revenue" stroke="#FF9900" strokeWidth={2} dot={{ r: 3, fill: "#FF9900" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top products bar */}
          <div className="rounded-control border border-slate-300 bg-white p-4 lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-ink-950">Top 10 by revenue</h2>
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={topTen} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatCompact(v)} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" fill="#232F3E" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product name"
              className="w-full rounded-control border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-control border border-line bg-white py-2.5 pl-3.5 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            >
              <option value="revenue">Sort by revenue</option>
              <option value="unitsSold">Sort by units sold</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Ranked table */}
        <div className="overflow-hidden rounded-control border border-slate-300 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-3 py-2.5">Rank</th>
                  <th className="px-3 py-2.5">Product</th>
                  {vendorId === "all" && <th className="px-3 py-2.5">Vendor</th>}
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Units sold</th>
                  <th className="px-3 py-2.5">Revenue</th>
                  <th className="px-3 py-2.5">Growth</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-500">#{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-ink-950">{p.name}</td>
                    {vendorId === "all" && (
                      <td className="px-3 py-2.5 text-ink-700">
                        <span className="inline-flex items-center gap-1">
                          <Store size={12} className="text-slate-400" />
                          {p.vendor}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-ink-700">{p.category}</td>
                    <td className="px-3 py-2.5 text-ink-800">{p.unitsSold.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2.5 font-medium text-ink-950">{formatCurrency(p.revenue)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${p.growth >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {p.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {p.growth >= 0 ? "+" : ""}
                        {p.growth.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={vendorId === "all" ? 7 : 6} className="px-3 py-10 text-center text-slate-500">
                      No products match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}