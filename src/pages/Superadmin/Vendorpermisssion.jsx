import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  FileText,
  Download,
  Eye,
  ShieldCheck,
  ShieldOff,
  Clock,
  Building2,
  Store,
} from "lucide-react";

/**
 * VendorPermissions.jsx
 * Super Admin > Vendors > Vendor Permissions & Documentation
 *
 * Amazon Seller Central-inspired admin UI — same token language as
 * BannerPermissions.jsx (navy #232F3E header, #FF9900 accent, #EAEDED canvas).
 *
 * Wire-up notes:
 * - Replace MOCK_VENDORS with GET /api/admin/vendors (include documents + permissions)
 * - Document approve/reject should PATCH /api/admin/vendors/:vendorId/documents/:docId
 * - Permission toggles should PATCH /api/admin/vendors/:vendorId/permissions
 * - All requests use apiUrl() + authConfig() + adminToken, parsed with safeJson()
 * - invalidateTree() after status changes if this feeds vendor counts elsewhere
 */

const DOC_TYPES = [
  { key: "gst", label: "GST certificate" },
  { key: "pan", label: "PAN card" },
  { key: "businessLicense", label: "Business license" },
  { key: "bankProof", label: "Bank account proof" },
  { key: "addressProof", label: "Address proof" },
];

const MOCK_VENDORS = [
  {
    id: "v_1001",
    name: "Orion Electronics",
    store: "orion-electronics",
    email: "contact@orionelectronics.com",
    joined: "12 Mar 2026",
    verification: "verified",
    documents: {
      gst: { status: "approved", fileName: "orion_gst.pdf", uploaded: "10 Mar 2026" },
      pan: { status: "approved", fileName: "orion_pan.pdf", uploaded: "10 Mar 2026" },
      businessLicense: { status: "approved", fileName: "orion_license.pdf", uploaded: "10 Mar 2026" },
      bankProof: { status: "approved", fileName: "orion_bank.pdf", uploaded: "11 Mar 2026" },
      addressProof: { status: "approved", fileName: "orion_address.pdf", uploaded: "11 Mar 2026" },
    },
    permissions: {
      products: true,
      orders: true,
      banners: true,
      payouts: true,
      inventory: true,
    },
  },
  {
    id: "v_1002",
    name: "Meadow & Co. Home",
    store: "meadow-home",
    email: "hello@meadowhome.com",
    joined: "28 Apr 2026",
    verification: "verified",
    documents: {
      gst: { status: "approved", fileName: "meadow_gst.pdf", uploaded: "25 Apr 2026" },
      pan: { status: "approved", fileName: "meadow_pan.pdf", uploaded: "25 Apr 2026" },
      businessLicense: { status: "approved", fileName: "meadow_license.pdf", uploaded: "26 Apr 2026" },
      bankProof: { status: "approved", fileName: "meadow_bank.pdf", uploaded: "26 Apr 2026" },
      addressProof: { status: "approved", fileName: "meadow_address.pdf", uploaded: "26 Apr 2026" },
    },
    permissions: {
      products: true,
      orders: true,
      banners: true,
      payouts: true,
      inventory: true,
    },
  },
  {
    id: "v_1003",
    name: "Kestrel Outdoors",
    store: "kestrel-outdoors",
    email: "team@kestreloutdoors.com",
    joined: "02 Jun 2026",
    verification: "rejected",
    documents: {
      gst: { status: "rejected", fileName: "kestrel_gst.pdf", uploaded: "30 May 2026" },
      pan: { status: "approved", fileName: "kestrel_pan.pdf", uploaded: "30 May 2026" },
      businessLicense: { status: "rejected", fileName: "kestrel_license.pdf", uploaded: "30 May 2026" },
      bankProof: { status: "pending", fileName: "kestrel_bank.pdf", uploaded: "01 Jun 2026" },
      addressProof: { status: "approved", fileName: "kestrel_address.pdf", uploaded: "30 May 2026" },
    },
    permissions: {
      products: false,
      orders: false,
      banners: false,
      payouts: false,
      inventory: false,
    },
  },
  {
    id: "v_1004",
    name: "Lumen Beauty Lab",
    store: "lumen-beauty",
    email: "support@lumenbeauty.co",
    joined: "15 Jul 2026",
    verification: "pending",
    documents: {
      gst: { status: "pending", fileName: "lumen_gst.pdf", uploaded: "14 Jul 2026" },
      pan: { status: "approved", fileName: "lumen_pan.pdf", uploaded: "14 Jul 2026" },
      businessLicense: { status: "pending", fileName: "lumen_license.pdf", uploaded: "14 Jul 2026" },
      bankProof: { status: "pending", fileName: "lumen_bank.pdf", uploaded: "15 Jul 2026" },
      addressProof: { status: "approved", fileName: "lumen_address.pdf", uploaded: "14 Jul 2026" },
    },
    permissions: {
      products: true,
      orders: false,
      banners: false,
      payouts: false,
      inventory: true,
    },
  },
];

const VERIFICATION_STYLES = {
  verified: "bg-green-50 text-green-800 border border-green-200",
  rejected: "bg-red-50 text-red-800 border border-red-200",
  pending: "bg-amber-50 text-amber-800 border border-amber-200",
};

const DOC_STATUS_STYLES = {
  approved: "bg-green-50 text-green-800 border border-green-200",
  rejected: "bg-red-50 text-red-800 border border-red-200",
  pending: "bg-amber-50 text-amber-800 border border-amber-200",
};

const PERMISSION_FIELDS = [
  { key: "products", label: "Products" },
  { key: "orders", label: "Orders" },
  { key: "banners", label: "Banners" },
  { key: "inventory", label: "Inventory" },
  { key: "payouts", label: "Payouts" },
];

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 ${
        disabled
          ? "bg-slate-200 cursor-not-allowed"
          : checked
          ? "bg-amber-500"
          : "bg-slate-300"
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

function docCounts(documents) {
  const values = Object.values(documents);
  return {
    total: values.length,
    approved: values.filter((d) => d.status === "approved").length,
    pending: values.filter((d) => d.status === "pending").length,
    rejected: values.filter((d) => d.status === "rejected").length,
  };
}

export default function VendorPermissions() {
  const [vendors, setVendors] = useState(MOCK_VENDORS);
  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [expanded, setExpanded] = useState(null); // vendor id
  const [docPreview, setDocPreview] = useState(null); // { vendor, docKey }

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const matchesQuery =
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        v.store.toLowerCase().includes(query.toLowerCase());
      const matchesVerification =
        verificationFilter === "all" || v.verification === verificationFilter;
      return matchesQuery && matchesVerification;
    });
  }, [vendors, query, verificationFilter]);

  const stats = useMemo(
    () => ({
      total: vendors.length,
      verified: vendors.filter((v) => v.verification === "verified").length,
      pending: vendors.filter((v) => v.verification === "pending").length,
      rejected: vendors.filter((v) => v.verification === "rejected").length,
    }),
    [vendors]
  );

  const setDocStatus = (vendorId, docKey, status) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? {
              ...v,
              documents: {
                ...v.documents,
                [docKey]: { ...v.documents[docKey], status },
              },
            }
          : v
      )
    );
    // TODO: PATCH `${apiUrl()}/admin/vendors/${vendorId}/documents/${docKey}`
    setDocPreview(null);
  };

  const togglePermission = (vendorId, field, value) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? { ...v, permissions: { ...v.permissions, [field]: value } }
          : v
      )
    );
    // TODO: PATCH `${apiUrl()}/admin/vendors/${vendorId}/permissions`
  };

  const setVerification = (vendorId, status) => {
    setVendors((prev) =>
      prev.map((v) => (v.id === vendorId ? { ...v, verification: status } : v))
    );
    // TODO: PATCH `${apiUrl()}/admin/vendors/${vendorId}/verification`
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Top nav bar */}
      <div className="bg-ink-800 text-white">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold tracking-tight">
              Seller<span className="text-amber-500">Admin</span>
            </span>
            <span className="hidden text-sm text-slate-300 sm:inline">
              Super Admin Console
            </span>
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
        <span>Vendors</span>
        <span className="mx-1.5 text-slate-400">/</span>
        <span className="font-medium text-ink-950">Permissions &amp; documentation</span>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-950">
              Vendor permissions &amp; documentation
            </h1>
            <p className="text-sm text-slate-500">
              Review onboarding documents and manage what each vendor can access.
            </p>
          </div>
          <button className="w-fit rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-1.5 text-sm font-medium text-ink-950 shadow-sm hover:from-amber-300 hover:to-amber-500">
            Export vendor list
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total vendors" value={stats.total} icon={Building2} accent="bg-blue-50 text-blue-700" />
          <StatCard label="Verified" value={stats.verified} icon={ShieldCheck} accent="bg-green-50 text-green-700" />
          <StatCard label="Pending review" value={stats.pending} icon={Clock} accent="bg-amber-50 text-amber-700" />
          <StatCard label="Rejected" value={stats.rejected} icon={ShieldOff} accent="bg-red-50 text-red-700" />
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vendor or store name"
                className="w-full rounded-control border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
            </div>
            <div className="relative">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="appearance-none rounded-control border border-line bg-white py-2.5 pl-3.5 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                <option value="all">All verification statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Vendor list */}
        <div className="space-y-3">
          {filtered.map((v) => {
            const counts = docCounts(v.documents);
            const isOpen = expanded === v.id;
            return (
              <div key={v.id} className="overflow-hidden rounded-control border border-slate-300 bg-white">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={16} className="shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight size={16} className="shrink-0 text-slate-500" />
                    )}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <Store size={16} className="text-ink-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-950">{v.name}</p>
                      <p className="text-xs text-slate-500">
                        {v.email} · Joined {v.joined}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden text-xs text-slate-500 sm:inline">
                      {counts.approved}/{counts.total} docs approved
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${VERIFICATION_STYLES[v.verification]}`}
                    >
                      {v.verification}
                    </span>
                  </div>
                </button>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Documents */}
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Submitted documents
                        </h3>
                        <div className="divide-y divide-slate-200 rounded-control border border-slate-200 bg-white">
                          {DOC_TYPES.map(({ key, label }) => {
                            const doc = v.documents[key];
                            if (!doc) return null;
                            return (
                              <div key={key} className="flex items-center justify-between gap-2 px-3 py-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText size={15} className="shrink-0 text-slate-400" />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-ink-900">{label}</p>
                                    <p className="truncate text-xs text-slate-500">
                                      {doc.fileName} · {doc.uploaded}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${DOC_STATUS_STYLES[doc.status]}`}
                                  >
                                    {doc.status}
                                  </span>
                                  <button
                                    onClick={() => setDocPreview({ vendor: v, docKey: key })}
                                    className="rounded-control border border-slate-300 p-1.5 text-ink-700 hover:bg-slate-100"
                                    aria-label={`View ${label}`}
                                  >
                                    <Eye size={13} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Permissions */}
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Access permissions
                        </h3>
                        <div className="divide-y divide-slate-200 rounded-control border border-slate-200 bg-white">
                          {PERMISSION_FIELDS.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between px-3 py-2.5">
                              <span className="text-sm text-ink-900">{label}</span>
                              <Toggle
                                checked={v.permissions[key]}
                                onChange={(val) => togglePermission(v.id, key, val)}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => setVerification(v.id, "verified")}
                            className="flex items-center gap-1 rounded-control border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
                          >
                            <Check size={13} />
                            Mark verified
                          </button>
                          <button
                            onClick={() => setVerification(v.id, "rejected")}
                            className="flex items-center gap-1 rounded-control border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                          >
                            <X size={13} />
                            Reject vendor
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-control border border-slate-300 bg-white px-3 py-10 text-center text-slate-500">
              No vendors match this search.
            </div>
          )}
        </div>
      </div>

      {/* Document preview modal */}
      {docPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-950">
                {DOC_TYPES.find((d) => d.key === docPreview.docKey)?.label} — {docPreview.vendor.name}
              </h2>
              <button onClick={() => setDocPreview(null)} className="text-slate-400 hover:text-ink-800">
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="flex h-40 items-center justify-center rounded-control border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <FileText size={28} />
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                {docPreview.vendor.documents[docPreview.docKey].fileName}
              </p>
              <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-control border border-slate-300 px-3 py-1.5 text-sm text-ink-800 hover:bg-slate-100">
                <Download size={14} />
                Download original file
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => setDocStatus(docPreview.vendor.id, docPreview.docKey, "rejected")}
                className="rounded-control border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
              >
                Reject
              </button>
              <button
                onClick={() => setDocStatus(docPreview.vendor.id, docPreview.docKey, "approved")}
                className="flex items-center gap-1 rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1.5 text-sm font-medium text-ink-950 hover:from-amber-300 hover:to-amber-500"
              >
                <Check size={14} />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}