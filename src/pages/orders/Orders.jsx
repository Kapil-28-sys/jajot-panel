import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, RotateCcw, Search, Timer, Truck } from "lucide-react";
import { inr, orders, vendorName, vendors } from "../../data/marketplaceData";
import DataPager from "../../components/common/DataPager";
import MetricCard from "../../components/common/MetricCard";

const statusClass = {
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Shipped: "bg-sky-50 text-sky-700 ring-sky-200",
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Returned: "bg-red-50 text-red-700 ring-red-200",
};

export default function Orders() {
  const [vendorId, setVendorId] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesVendor = vendorId === "all" || order.vendorId === vendorId;
        const matchesQuery = `${order.id} ${order.customer} ${order.status} ${vendorName(order.vendorId)}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesVendor && matchesQuery;
      }),
    [query, vendorId]
  );

  const pagedOrders = visibleOrders.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

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
            <select
              value={vendorId}
              onChange={(event) => {
                setVendorId(event.target.value);
                setPage(1);
              }}
              className="rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            >
              <option value="all">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search orders"
                className="w-full rounded-control border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:w-80"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { status: "Pending", icon: Timer, tone: "orange" },
          { status: "Shipped", icon: Truck, tone: "blue" },
          { status: "Delivered", icon: CheckCircle2, tone: "green" },
          { status: "Returned", icon: RotateCcw, tone: "red" },
        ].map((item) => (
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
          <ClipboardList size={19} className="text-amber-700" />
          <h2 className="font-bold">Order queue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-white">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Vendor</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Fulfillment</th>
                <th className="px-5 py-3 font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-surface">
                  <td className="px-5 py-4">
                    <p className="font-bold text-amber-600">{order.id}</p>
                    <p className="text-xs text-slate-500">{order.date} · {order.items} item(s)</p>
                  </td>
                  <td className="px-5 py-4 font-medium">{vendorName(order.vendorId)}</td>
                  <td className="px-5 py-4">{order.customer}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-ink-800">
                      <Truck size={15} />
                      {order.channel}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold">{inr(order.total)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass[order.status]}`}>
                      {order.status}
                    </span>
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
      </div>
    </div>
  );
}
