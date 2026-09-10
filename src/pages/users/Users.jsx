import { useMemo, useState } from "react";
import { Mail, Repeat, Search, TrendingUp, UserRound, Users as UsersIcon } from "lucide-react";
import { customers, inr, vendorName, vendors } from "../../data/marketplaceData";
import DataPager from "../../components/common/DataPager";
import MetricCard from "../../components/common/MetricCard";

const statusClass = {
  Repeat: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Active: "bg-sky-50 text-sky-700 ring-sky-200",
  "Return Risk": "bg-red-50 text-red-700 ring-red-200",
};

export default function Users() {
  const [vendorId, setVendorId] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const visibleCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const matchesVendor = vendorId === "all" || customer.vendorId === vendorId;
        const matchesQuery = `${customer.name} ${customer.email} ${vendorName(customer.vendorId)}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesVendor && matchesQuery;
      }),
    [query, vendorId]
  );

  const totalLtv = visibleCustomers.reduce((sum, customer) => sum + customer.ltv, 0);
  const pagedCustomers = visibleCustomers.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">Customer insights</p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">Users and buyers</h1>
            <p className="text-sm text-slate-500">View customers attached to each vendor, order history, and return risk.</p>
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
                placeholder="Search customers"
                className="w-full rounded-control border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:w-80"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visible customers" value={visibleCustomers.length} helper="buyers in current view" icon={UsersIcon} tone="blue" />
        <MetricCard label="Customer LTV" value={inr(totalLtv)} helper="combined lifetime value" icon={TrendingUp} tone="green" />
        <MetricCard label="Repeat buyers" value={visibleCustomers.filter((customer) => customer.status === "Repeat").length} helper="high-retention accounts" icon={Repeat} tone="purple" />
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <UsersIcon size={19} className="text-amber-700" />
          <h2 className="font-bold">Customer list</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-white">
              <tr>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Vendor</th>
                <th className="px-5 py-3 font-semibold">Orders</th>
                <th className="px-5 py-3 font-semibold">Lifetime value</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-surface">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-control bg-ink-800 text-white">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-ink-950">{customer.name}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail size={13} />
                          {customer.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium">{vendorName(customer.vendorId)}</td>
                  <td className="px-5 py-4">{customer.orders}</td>
                  <td className="px-5 py-4 font-bold">{inr(customer.ltv)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass[customer.status]}`}>
                      {customer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DataPager
          total={visibleCustomers.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      </div>
    </div>
  );
}
