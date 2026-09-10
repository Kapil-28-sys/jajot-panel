import { KeyRound, ShieldCheck, ToggleRight, UserCog } from "lucide-react";

const roles = [
  { name: "Super Admin", access: "All vendors, billing, catalog moderation, reports", users: 2 },
  { name: "Vendor Admin", access: "Own products, orders, customers, revenue dashboard", users: 14 },
  { name: "Vendor Staff", access: "Inventory updates, order processing, support notes", users: 31 },
];

const policies = [
  "Vendors can only view their own orders, products, users, revenue, and performance.",
  "Superadmin can create vendors and review every vendor performance panel.",
  "Suppressed listings and low-stock alerts require vendor action before catalog approval.",
];

export default function Settings() {
  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
        <p className="text-sm font-medium text-amber-600">Marketplace configuration</p>
        <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">Settings</h1>
        <p className="text-sm text-slate-500">Control roles, permissions, vendor panel rules, and marketplace safeguards.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="rounded-card border border-line bg-surface-raised shadow-card">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <UserCog size={19} className="text-amber-700" />
            <h2 className="font-bold">Role access</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {roles.map((role) => (
              <div key={role.name} className="grid gap-3 px-5 py-4 md:grid-cols-[180px_1fr_90px] md:items-center">
                <p className="font-bold text-ink-950">{role.name}</p>
                <p className="text-sm text-slate-500">{role.access}</p>
                <p className="text-sm font-bold">{role.users} users</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={19} className="text-amber-700" />
            <h2 className="font-bold">Vendor panel rules</h2>
          </div>
          <div className="space-y-3">
            {policies.map((policy) => (
              <div key={policy} className="rounded-control border border-slate-200 p-3 text-sm text-ink-800">
                {policy}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Two-step vendor login", "Required for every seller account"],
          ["Order data isolation", "Vendor scoped by vendorId"],
          ["Catalog approval", "Manual review for restricted categories"],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <KeyRound size={18} className="text-amber-700" />
              <ToggleRight size={28} className="text-emerald-600" />
            </div>
            <p className="font-bold text-ink-950">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
