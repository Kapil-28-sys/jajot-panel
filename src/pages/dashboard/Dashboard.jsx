import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Box,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  inr,
  orders,
  performance,
  products,
  summaryFor,
  vendorName,
  vendors,
} from "../../data/marketplaceData";
import MetricCard from "../../components/common/MetricCard";
import { getCurrentSession } from "../../config/localAuth";

const rolePanelCopy = {
  "Super Admin": {
    eyebrow: "Super Admin performance center",
    title: "Marketplace command dashboard",
    description: "Track vendor revenue, catalog quality, order health, returns, and growth across the full marketplace.",
  },
  "Assistant Super Admin": {
    eyebrow: "Assistant Super Admin operations center",
    title: "Marketplace operations dashboard",
    description: "Review products, customer activity, categories, orders, and operational alerts assigned to your role.",
  },
  Vendor: {
    eyebrow: "Vendor performance panel",
    title: "Vendor seller dashboard",
    description: "Track your catalog, orders, stock alerts, account health, and recent marketplace performance.",
  },
};

export default function Dashboard() {
  const session = getCurrentSession();
  const isVendor = session.role === "Vendor";
  const panelCopy = rolePanelCopy[session.role] || rolePanelCopy["Super Admin"];
  const [vendorId, setVendorId] = useState(isVendor ? vendors[0]?.id || "all" : "all");
  const scopedVendorId = isVendor ? vendors[0]?.id || "all" : vendorId;
  const summary = summaryFor(scopedVendorId);
  const scopedPerformance = useMemo(
    () => (scopedVendorId === "all" ? performance : performance.filter((item) => item.vendorId === scopedVendorId)),
    [scopedVendorId]
  );
  const scopedOrders = scopedVendorId === "all" ? orders : orders.filter((order) => order.vendorId === scopedVendorId);
  const scopedProducts = scopedVendorId === "all" ? products : products.filter((product) => product.vendorId === scopedVendorId);
  const visibleVendors = scopedVendorId === "all" ? vendors : vendors.filter((vendor) => vendor.id === scopedVendorId);

  const metrics = [
    { label: "Revenue", value: inr(summary.revenue), icon: CircleDollarSign, tone: "green", helper: "settled marketplace revenue" },
    { label: "Orders", value: summary.orders.toLocaleString("en-IN"), icon: ClipboardList, tone: "blue", helper: "last 30 days" },
    { label: "Products", value: summary.products, icon: Box, tone: "purple", helper: `${summary.lowStock} need stock action` },
    { label: isVendor ? "Panel" : "Vendors", value: isVendor ? "Vendor" : scopedVendorId === "all" ? vendors.length : 1, icon: Building2, tone: "orange", helper: isVendor ? "seller access" : "active seller panels" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-control bg-ink-800 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-500">
              {panelCopy.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              {isVendor ? vendorName(scopedVendorId) : panelCopy.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              {panelCopy.description}
            </p>
          </div>

          {!isVendor && (
            <select
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
              className="w-full rounded-control border border-white/20 bg-white px-3 py-2 text-sm font-medium text-ink-950 outline-none lg:w-72"
            >
              <option value="all">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  Vendor: {vendor.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-card border border-line bg-surface-raised shadow-card">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-bold text-ink-950">
              <BarChart3 size={19} className="text-amber-700" />
              Vendor performance
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {scopedPerformance.map((item) => (
              <div key={item.vendorId} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_170px_140px_110px] md:items-center">
                <div>
                  <p className="font-bold text-ink-950">{vendorName(item.vendorId)}</p>
                  <p className="text-xs text-slate-500">{item.orders.toLocaleString("en-IN")} orders · {item.conversion} conversion</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Revenue</p>
                  <p className="font-bold">{inr(item.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Account health</p>
                  <div className="mt-1 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${item.health}%` }} />
                  </div>
                </div>
                <p className={`font-bold ${item.growth.startsWith("-") ? "text-red-600" : "text-emerald-700"}`}>
                  {item.growth}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 font-bold text-ink-950">
            <AlertTriangle size={19} className="text-amber-700" />
            Operational alerts
          </h2>
          <div className="mt-4 space-y-3">
            {scopedProducts
              .filter((product) => product.stock < 15 || product.status === "Suppressed")
              .map((product) => (
                <div key={product.id} className="rounded-control border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-bold text-ink-950">{product.name}</p>
                  <p className="text-xs text-ink-700">
                    {vendorName(product.vendorId)} · {product.status} · {product.stock} units
                  </p>
                </div>
              ))}
            {scopedOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="rounded-control border border-slate-200 p-3">
                <p className="text-sm font-bold text-ink-950">{order.id}</p>
                <p className="text-xs text-ink-700">
                  {order.status} · {vendorName(order.vendorId)} · {inr(order.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {visibleVendors.map((vendor) => (
          <div key={vendor.id} className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-ink-950">{vendor.name}</p>
                <p className="text-xs text-slate-500">{vendor.category}</p>
              </div>
              <span className="flex items-center gap-1 rounded-control bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                <Star size={13} fill="currentColor" />
                {vendor.rating}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">Fulfillment SLA</span>
              <span className="font-bold text-ink-950">{vendor.sla}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Growth</span>
              <span className="flex items-center gap-1 font-bold text-emerald-700">
                <TrendingUp size={15} />
                {performance.find((item) => item.vendorId === vendor.id)?.growth || "New"}
              </span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
