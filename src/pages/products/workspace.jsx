import { useEffect, useState } from "react";
import axios from "axios";
import { Bell, Plus, ImagePlus, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

const statusStyles = {
  Delivered: "bg-green-100 text-green-700",
  Processing: "bg-amber-100 text-amber-700",
  Cancelled: "bg-red-100 text-red-700",
  Pending: "bg-amber-100 text-amber-700",
};

// Amazon-ish accent: blue for primary series, amber for secondary
const CHART_BLUE = "#2563eb";
const CHART_BLUE_SOFT = "#93c5fd";
const CHART_AMBER = "#f59e0b";

export default function Dashboard() {
  const [vendor, setVendor] = useState(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    salesGrowth: 0,
    orders: 0,
    pendingOrders: 0,
    productsLive: 0,
    outOfStock: 0,
    avgRating: 0,
    reviewCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [chartRange, setChartRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const vendorId = localStorage.getItem("vendorId");
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const [vendorRes, statsRes, ordersRes] = await Promise.all([
          axios.get(`${API_BASE}/vendor/${vendorId}`, { headers }),
          axios.get(`${API_BASE}/vendor/${vendorId}/stats`, { headers }),
          axios.get(`${API_BASE}/vendor/${vendorId}/orders?limit=5`, {
            headers,
          }),
        ]);

        setVendor(vendorRes.data);
        setStats({
          totalSales: statsRes.data.totalSales ?? 0,
          salesGrowth: statsRes.data.salesGrowth ?? 0,
          orders: statsRes.data.orders ?? 0,
          pendingOrders: statsRes.data.pendingOrders ?? 0,
          productsLive: statsRes.data.productsLive ?? 0,
          outOfStock: statsRes.data.outOfStock ?? 0,
          avgRating: statsRes.data.avgRating ?? 0,
          reviewCount: statsRes.data.reviewCount ?? 0,
        });
        setRecentOrders(ordersRes.data.orders ?? ordersRes.data ?? []);
        setError(null);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    // Charts fetched independently so a missing/unready analytics endpoint
    // never breaks the rest of the dashboard.
    const fetchCharts = async () => {
      try {
        setChartsLoading(true);
        const [trendRes, productsRes] = await Promise.all([
          axios.get(
            `${API_BASE}/vendor/${vendorId}/sales-trend?range=${chartRange}`,
            { headers }
          ),
          axios.get(`${API_BASE}/vendor/${vendorId}/top-products?limit=6`, {
            headers,
          }),
        ]);

        setSalesTrend(trendRes.data.trend ?? trendRes.data ?? []);
        setTopProducts(productsRes.data.products ?? productsRes.data ?? []);
      } catch (err) {
        console.error("Chart fetch error:", err);
        setSalesTrend([]);
        setTopProducts([]);
      } finally {
        setChartsLoading(false);
      }
    };

    fetchDashboard();
    fetchCharts();
  }, [chartRange]);

  const formatCurrency = (amount) =>
    `₹${Number(amount).toLocaleString("en-IN")}`;

  const formatCompactCurrency = (amount) => {
    const n = Number(amount);
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${n}`;
  };

  const hasTrendData = salesTrend && salesTrend.length > 0;
  const hasProductData = topProducts && topProducts.length > 0;
  const maxProductSales = hasProductData
    ? Math.max(...topProducts.map((p) => p.sales ?? p.totalSales ?? 0))
    : 0;

  return (
    <div className="p-0">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-lg font-medium text-ink-950">
            Welcome back{vendor?.name ? `, ${vendor.name}` : ""}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            Here's how your store is doing today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 flex items-center justify-center rounded-card border border-slate-200 hover:bg-slate-50">
            <Bell size={16} />
          </button>
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
            {vendor?.name
              ? vendor.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "VN"}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-card px-4 py-2">
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Total sales"
          value={loading ? "—" : formatCurrency(stats.totalSales)}
          sub={
            loading
              ? ""
              : `${stats.salesGrowth >= 0 ? "+" : ""}${stats.salesGrowth}% this week`
          }
          subColor={stats.salesGrowth >= 0 ? "text-green-600" : "text-red-600"}
        />
        <MetricCard
          label="Orders"
          value={loading ? "—" : stats.orders}
          sub={loading ? "" : `${stats.pendingOrders} pending`}
        />
        <MetricCard
          label="Products live"
          value={loading ? "—" : stats.productsLive}
          sub={loading ? "" : `${stats.outOfStock} out of stock`}
        />
        <MetricCard
          label="Avg rating"
          value={loading ? "—" : stats.avgRating}
          sub={loading ? "" : `${stats.reviewCount} reviews`}
        />
      </div>

      {/* Product performance */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[15px] font-medium text-ink-950">
          Product performance
        </p>
        <div className="flex items-center gap-1 bg-slate-100 rounded-card p-0.5">
          {["7d", "30d", "90d"].map((range) => (
            <button
              key={range}
              onClick={() => setChartRange(range)}
              className={`text-xs px-2.5 py-1 rounded-control transition-colors ${
                chartRange === range
                  ? "bg-white text-ink-950 shadow-sm"
                  : "text-slate-500 hover:text-ink-800"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-6">
        {/* Sales trend - growing area chart */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-card p-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-sm font-medium text-ink-950">
                Sales trend
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Revenue over the last {chartRange}
              </p>
            </div>
            {hasTrendData && (
              <span
                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-control ${
                  stats.salesGrowth >= 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {stats.salesGrowth >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {Math.abs(stats.salesGrowth)}%
              </span>
            )}
          </div>

          <div className="h-56 mt-2">
            {chartsLoading ? (
              <ChartSkeleton />
            ) : !hasTrendData ? (
              <EmptyChartState message="No sales data for this period yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesTrend}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="salesGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={CHART_BLUE}
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_BLUE}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatCompactCurrency}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), "Sales"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke={CHART_BLUE}
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top products - bar chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-card p-4">
          <p className="text-sm font-medium text-ink-950">Top products</p>
          <p className="text-xs text-slate-500 mt-0.5">By units sold</p>

          <div className="h-56 mt-2">
            {chartsLoading ? (
              <ChartSkeleton />
            ) : !hasProductData ? (
              <EmptyChartState message="No product sales yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={{ stroke: "#e5e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#374151" }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                    tickFormatter={(name) =>
                      name && name.length > 14
                        ? `${name.slice(0, 14)}…`
                        : name
                    }
                  />
                  <Tooltip
                    formatter={(value) => [value, "Units sold"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Bar dataKey="sales" radius={[0, 4, 4, 0]}>
                    {topProducts.map((entry, i) => (
                      <Cell
                        key={entry._id ?? i}
                        fill={
                          (entry.sales ?? entry.totalSales ?? 0) ===
                          maxProductSales
                            ? CHART_BLUE
                            : CHART_BLUE_SOFT
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[15px] font-medium text-ink-950">
          Recent orders
        </p>
        <span className="text-sm text-blue-600 cursor-pointer hover:underline">
          View all
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-card overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-left">
              <th className="font-normal px-3.5 py-2.5">Order</th>
              <th className="font-normal px-3.5 py-2.5">Customer</th>
              <th className="font-normal px-3.5 py-2.5">Status</th>
              <th className="font-normal px-3.5 py-2.5 text-right">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3.5 py-6 text-center text-slate-400">
                  Loading orders…
                </td>
              </tr>
            ) : recentOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3.5 py-6 text-center text-slate-400">
                  No recent orders.
                </td>
              </tr>
            ) : (
              recentOrders.map((order, i) => (
                <tr
                  key={order._id ?? i}
                  className={
                    i !== recentOrders.length - 1
                      ? "border-b border-slate-200"
                      : ""
                  }
                >
                  <td className="px-3.5 py-2.5">
                    #{order.orderNumber ?? order._id?.slice(-5)}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {order.customerName ?? "—"}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-control ${
                        statusStyles[order.status] ??
                        "bg-slate-100 text-ink-700"
                      }`}
                    >
                      {order.status ?? "Pending"}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {formatCurrency(order.amount ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <a
          href="/vendor/products/add"
          className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-card py-2.5 text-sm hover:bg-slate-50"
        >
          <Plus size={16} />
          Add product
        </a>
        <a
          href="/vendor/banners/add"
          className="flex-1 flex items-center justify-center gap-2 border border-slate-200 rounded-card py-2.5 text-sm hover:bg-slate-50"
        >
          <ImagePlus size={16} />
          Add banner
        </a>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, subColor = "text-slate-500" }) {
  return (
    <div className="bg-slate-50 rounded-card p-4">
      <p className="text-sm text-slate-500 mb-1.5">{label}</p>
      <p className="text-[22px] font-medium text-ink-950">{value}</p>
      {sub && <p className={`text-xs mt-1.5 ${subColor}`}>{sub}</p>}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="w-full h-full flex items-end gap-2 px-2 pb-2 animate-pulse">
      {[40, 65, 50, 80, 60, 90, 55].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-slate-100 rounded-t-sm"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function EmptyChartState({ message }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-1">
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}