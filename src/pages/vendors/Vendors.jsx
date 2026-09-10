import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { CheckCircle2, Package, Plus, Search, Store, TrendingUp, Users, X, Loader2, XCircle, Eye, Phone } from "lucide-react";
import DataPager from "../../components/common/DataPager";
import MetricCard from "../../components/common/MetricCard";

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

// Helper: pick phone number from whichever field name the backend actually uses
// Backend confirmed field is "number"
const getPhone = (vendor) =>
  vendor?.number || vendor?.phone || vendor?.mobile || vendor?.phoneNumber || vendor?.contactNumber || "—";

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showForm, setShowForm] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "vendor",
    companyname: "",
    category: "General Merchandise",
    phone: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Try common token key names used across the project's localAuth.js
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("vendorToken") ||
    localStorage.getItem("authToken");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // GET all users (vendors)
  const fetchVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/users`, authHeaders);
      const list = Array.isArray(res.data) ? res.data : res.data?.users || res.data?.data || [];
      // Only vendors (in case super admins are also returned)
      const vendorList = list.filter((u) => (u.role || "vendor") === "vendor");
      setVendors(vendorList);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
      setError(err?.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GET single user by id
  const fetchVendorById = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/users/${id}`, authHeaders);
      setSelectedVendor(res.data?.user || res.data);
    } catch (err) {
      console.error("Failed to fetch vendor:", err);
      setError(err?.response?.data?.message || "Failed to load vendor details");
    }
  };

  // PATCH/PUT status update
  const updateVendorStatus = async (id, status) => {
    setStatusUpdating(id);
    try {
      try {
        await axios.patch(`${API_BASE}/users/status/${id}`, { status }, authHeaders);
      } catch (patchErr) {
        // If PATCH isn't supported (404/405), fall back to PUT on the same endpoint
        if (patchErr?.response?.status === 404 || patchErr?.response?.status === 405) {
          await axios.put(`${API_BASE}/users/status/${id}`, { status }, authHeaders);
        } else {
          throw patchErr;
        }
      }
      setVendors((current) =>
        current.map((v) => (v._id === id ? { ...v, status } : v))
      );
    } catch (err) {
      // Log full details so the real cause (401 auth, 400 bad payload, 404 wrong route) is visible
      console.error("Failed to update status:", {
        status: err?.response?.status,
        data: err?.response?.data,
        url: `${API_BASE}/users/status/${id}`,
        tokenPresent: Boolean(token),
      });
      const backendMsg = err?.response?.data?.message || err?.response?.data?.error;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError("Auth failed — check that the token key in localStorage matches what localAuth.js stores.");
      } else if (err?.response?.status === 404) {
        setError("Route not found — check API_BASE and the /users/status/:id path against your backend routes.");
      } else {
        setError(backendMsg || "Failed to update vendor status");
      }
    } finally {
      setStatusUpdating(null);
    }
  };

  const visibleVendors = useMemo(
    () =>
      vendors.filter((vendor) =>
        `${vendor.companyname || ""} ${vendor.email || ""} ${vendor.category || ""} ${getPhone(vendor)}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query, vendors]
  );

  const pagedVendors = visibleVendors.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  // POST create vendor (assuming same /api/users endpoint handles creation)
  const createVendor = async (event) => {
    event.preventDefault();
    if (!form.companyname.trim() || !form.email.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/users`, form, authHeaders);
      const newVendor = res.data?.user || res.data;
      setVendors((current) => [newVendor, ...current]);
      setForm({
        email: "",
        password: "",
        role: "vendor",
        companyname: "",
        category: "General Merchandise",
        phone: "",
        city: "",
        state: "",
        pincode: "",
      });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create vendor:", err);
      setError(err?.response?.data?.message || "Failed to create vendor");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">
              Superadmin workspace
            </p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">Vendor management</h1>
            <p className="text-sm text-slate-500">
              Create sellers, review onboarding, and monitor catalog performance.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search vendors"
                className="w-full rounded-control border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-400"
            >
              <Plus size={17} />
              Add vendor
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total vendors" value={visibleVendors.length} helper="seller panels in view" icon={Store} tone="orange" />
        <MetricCard
          label="Active sellers"
          value={visibleVendors.filter((vendor) => vendor.status === "active").length}
          helper="approved for selling"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard label="Vendor products" value={0} helper="catalog listings owned" icon={Package} tone="purple" />
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-ink-950">Vendor panels</h2>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-control border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Plus size={16} />
            Add vendor
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            Loading vendors...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-800 text-white">
                <tr>
                  <th className="px-5 py-3 font-semibold">Vendor</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedVendors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No vendors found.
                    </td>
                  </tr>
                )}
                {pagedVendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-surface">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => fetchVendorById(vendor._id)}
                        className="font-bold text-ink-950 hover:text-amber-700 hover:underline"
                      >
                        {vendor.companyname || "Unnamed store"}
                      </button>
                      <p className="text-xs text-slate-500">{vendor.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-ink-800">
                        <Phone size={14} className="text-slate-400" />
                        {getPhone(vendor)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink-800">{vendor.city}{vendor.city && vendor.state ? ", " : ""}{vendor.state}</p>
                      <p className="text-xs text-slate-500">{vendor.pincode}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-ink-800">
                        <Package size={15} className="text-purple-600" />
                        {vendor.category || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {vendor.status === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                          <CheckCircle2 size={14} />
                          Active
                        </span>
                      ) : vendor.status === "blocked" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
                          <XCircle size={14} />
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                          {vendor.status || "Review"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchVendorById(vendor._id)}
                          title="View details"
                          className="rounded-control border border-slate-300 p-1.5 text-ink-700 hover:bg-slate-100 hover:text-amber-700"
                        >
                          <Eye size={16} />
                        </button>
                        {vendor.status !== "active" && (
                          <button
                            disabled={statusUpdating === vendor._id}
                            onClick={() => updateVendorStatus(vendor._id, "active")}
                            className="rounded-control border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        {vendor.status !== "blocked" && (
                          <button
                            disabled={statusUpdating === vendor._id}
                            onClick={() => updateVendorStatus(vendor._id, "blocked")}
                            className="rounded-control border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Block
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <DataPager
              total={visibleVendors.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={updatePageSize}
            />
          </div>
        )}
      </div>

      {/* Add vendor modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold">Add vendor</h2>
                <p className="text-xs text-slate-300">New vendors start in review.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-control p-2 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createVendor} className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-medium text-ink-800">
                Company name
                <input
                  value={form.companyname}
                  onChange={(event) => setForm({ ...form, companyname: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="text-sm font-medium text-ink-800">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="text-sm font-medium text-ink-800">
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="text-sm font-medium text-ink-800">
                Phone number
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="text-sm font-medium text-ink-800">
                Category
                <input
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="text-sm font-medium text-ink-800">
                City
                <input
                  value={form.city}
                  onChange={(event) => setForm({ ...form, city: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="text-sm font-medium text-ink-800">
                State
                <input
                  value={form.state}
                  onChange={(event) => setForm({ ...form, state: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>
              <label className="text-sm font-medium text-ink-800">
                Pincode
                <input
                  value={form.pincode}
                  onChange={(event) => setForm({ ...form, pincode: event.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button className="inline-flex items-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-400">
                  <Store size={17} />
                  Create vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View single vendor modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <h2 className="text-lg font-bold">{selectedVendor.companyname || "Vendor details"}</h2>
              <button onClick={() => setSelectedVendor(null)} className="rounded-control p-2 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2 p-5 text-sm">
              <p><span className="font-semibold text-ink-800">Email:</span> {selectedVendor.email}</p>
              <p><span className="font-semibold text-ink-800">Phone:</span> {getPhone(selectedVendor)}</p>
              <p><span className="font-semibold text-ink-800">Category:</span> {selectedVendor.category}</p>
              <p><span className="font-semibold text-ink-800">City:</span> {selectedVendor.city}</p>
              <p><span className="font-semibold text-ink-800">State:</span> {selectedVendor.state}</p>
              <p><span className="font-semibold text-ink-800">Pincode:</span> {selectedVendor.pincode}</p>
              <p><span className="font-semibold text-ink-800">Status:</span> {selectedVendor.status}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}