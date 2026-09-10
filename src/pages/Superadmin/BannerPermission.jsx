import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Check,
  X,
  Info,
  Settings2,
  ImageIcon,
  ShieldCheck,
  ShieldOff,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/**
 * BannerPermissions.jsx
 * Super Admin > Banners
 *
 * Amazon Seller Central-inspired admin UI.
 *
 * ---- API WIRING ----
 * Base URL: https://amazon-multi-vendor-3.onrender.com
 *
 *   GET   /api/admin/banners           -> list banners (each banner has a nested
 *                                          vendorId: { _id, name, companyname } and
 *                                          categoryId: { _id, name, slug })
 *   GET   /api/admin/banners/:id       -> fetch a single banner (used to refresh the
 *                                          edit modal with latest data)
 *   PATCH /api/admin/banners/:id/toggle -> flip a banner's is_active state (no body —
 *                                          the server toggles whatever it's currently set to)
 *   PATCH /api/banners/:id             -> update other banner fields (title,
 *                                          discount_percentage, starts_at, ends_at)
 *
 * NOTE: the real response shape is banner-level (title, image_url, vendorId,
 * categoryId, discount_percentage, is_active, starts_at/ends_at, product_count) —
 * not the earlier vendor-permission shape (canCreate/canPublishLive/maxActiveBanners).
 * The table below has been rebuilt to match what the API actually returns.
 */

const API_BASE = "https://amazon-multi-vendor-3.onrender.com";

const ACTIVE_STYLES = {
  true: "bg-green-50 text-green-800 border border-green-200",
  false: "bg-red-50 text-red-800 border border-red-200",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body?.message || message;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new Error(message);
  }
  // Some PATCH endpoints may return 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

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
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? "translate-x-4.5" : "translate-x-1"
        }`}
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-control border border-slate-200 bg-white px-4 py-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accent}`}
      >
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-ink-950">{value}</p>
      </div>
    </div>
  );
}

export default function BannerPermissions() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null); // banner object or null
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Track ids of any in-flight per-row toggle requests, so we can disable
  // just that row's controls instead of locking the whole table.
  const [pendingIds, setPendingIds] = useState(new Set());

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch("/api/admin/banners");
      // Real shape: { success, total, data: [...] }. Also tolerate a bare array.
      const list = Array.isArray(res) ? res : res?.data || [];
      setBanners(list);
    } catch (err) {
      setLoadError(err.message || "Failed to load banners.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return banners.filter((b) => {
      const matchesQuery =
        b.title?.toLowerCase().includes(q) ||
        b.vendorId?.name?.toLowerCase().includes(q) ||
        b.vendorId?.companyname?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && b.is_active) ||
        (statusFilter === "inactive" && !b.is_active);
      return matchesQuery && matchesStatus;
    });
  }, [banners, query, statusFilter]);

  const stats = useMemo(
    () => ({
      total: banners.length,
      active: banners.filter((b) => b.is_active).length,
      inactive: banners.filter((b) => !b.is_active).length,
      vendors: new Set(banners.map((b) => b.vendorId?._id)).size,
    }),
    [banners]
  );

  const setRowPending = (id, isPending) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Toggles is_active for a single banner via PATCH /api/admin/banners/:id/toggle
  // (a true toggle endpoint — it flips whatever the current state is server-side,
  // so no body is sent)
  const toggleActive = async (bannerId, value) => {
    setActionError(null);
    const prevBanners = banners;
    setBanners((prev) =>
      prev.map((b) => (b._id === bannerId ? { ...b, is_active: value } : b))
    );
    setRowPending(bannerId, true);
    try {
      await apiFetch(`/api/admin/banners/${bannerId}/toggle`, {
        method: "PATCH",
      });
    } catch (err) {
      setBanners(prevBanners); // roll back on failure
      setActionError(err.message || "Failed to update banner.");
    } finally {
      setRowPending(bannerId, false);
    }
  };

  const bulkSetActive = async (bannerIds, value) => {
    setActionError(null);
    // Only toggle rows that actually need to change — the endpoint flips
    // whatever state a banner is currently in, so hitting it on a banner
    // already at the desired state would flip it the wrong way.
    const idsToToggle = bannerIds.filter((id) => {
      const banner = banners.find((b) => b._id === id);
      return banner && !!banner.is_active !== value;
    });
    if (idsToToggle.length === 0) {
      setSelected([]);
      return;
    }
    const prevBanners = banners;
    setBanners((prev) =>
      prev.map((b) =>
        idsToToggle.includes(b._id) ? { ...b, is_active: value } : b
      )
    );
    idsToToggle.forEach((id) => setRowPending(id, true));
    try {
      await Promise.all(
        idsToToggle.map((id) =>
          apiFetch(`/api/admin/banners/${id}/toggle`, { method: "PATCH" })
        )
      );
    } catch (err) {
      setBanners(prevBanners);
      setActionError(err.message || "Failed to update banners.");
    } finally {
      idsToToggle.forEach((id) => setRowPending(id, false));
    }
    setSelected([]);
  };

  const toggleSelected = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((b) => selected.includes(b._id));

  const bulkDeactivate = () => bulkSetActive(selected, false);
  const bulkActivate = () => bulkSetActive(selected, true);

  // Opens the edit modal, then refreshes with GET /api/admin/banners/:id
  // so the form reflects the latest server state.
  const openEditModal = async (banner) => {
    setEditing(banner);
    setActionError(null);
    setEditLoading(true);
    try {
      const fresh = await apiFetch(`/api/admin/banners/${banner._id}`);
      const data = fresh?.data || fresh;
      if (data) setEditing({ ...banner, ...data });
    } catch (err) {
      // Non-fatal: keep showing the row's cached data if the refresh fails
      console.error("Failed to refresh banner detail:", err);
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setActionError(null);
    const original = banners.find((b) => b._id === editing._id);
    try {
      await apiFetch(`/api/banners/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editing.title,
          discount_percentage: editing.discount_percentage,
          starts_at: editing.starts_at,
          ends_at: editing.ends_at,
        }),
      });
      // Active state has its own toggle endpoint — only hit it if it changed
      if (original && !!original.is_active !== !!editing.is_active) {
        await apiFetch(`/api/admin/banners/${editing._id}/toggle`, {
          method: "PATCH",
        });
      }
      setBanners((prev) =>
        prev.map((b) => (b._id === editing._id ? editing : b))
      );
      setEditing(null);
    } catch (err) {
      setActionError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Page header */}
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-950">Banners</h1>
            <p className="text-sm text-slate-500">
              Review and manage storefront banners submitted by vendors.
            </p>
          </div>
          <button className="w-fit rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-1.5 text-sm font-medium text-ink-950 shadow-sm hover:from-amber-300 hover:to-amber-500">
            Export banner report
          </button>
        </div>

        {/* Action error banner */}
        {actionError && (
          <div className="mb-4 flex items-start justify-between gap-2 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{actionError}</p>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total banners"
            value={stats.total}
            icon={ImageIcon}
            accent="bg-blue-50 text-blue-700"
          />
          <StatCard
            label="Active"
            value={stats.active}
            icon={ShieldCheck}
            accent="bg-green-50 text-green-700"
          />
          <StatCard
            label="Inactive"
            value={stats.inactive}
            icon={ShieldOff}
            accent="bg-red-50 text-red-700"
          />
          <StatCard
            label="Vendors represented"
            value={stats.vendors}
            icon={Clock}
            accent="bg-amber-50 text-amber-700"
          />
        </div>

        {/* Info banner */}
        <div className="mb-4 flex items-start gap-2 rounded-control border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            Turning a banner off removes it from the storefront immediately without
            deleting it — vendors can be re-activated later.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search banner title or vendor"
                className="w-full rounded-control border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-control border border-line bg-white py-2.5 pl-3.5 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                <option value="all">All banners</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
            <button
              onClick={loadBanners}
              className="rounded-control border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-800 hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          {selected.length > 0 && (
            <div className="flex items-center gap-2 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-sm">
              <span className="text-ink-700">{selected.length} selected</span>
              <button
                onClick={bulkActivate}
                className="rounded-control border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
              >
                Activate
              </button>
              <button
                onClick={bulkDeactivate}
                className="rounded-control border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
              >
                Deactivate
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-control border border-slate-300 bg-white">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Loading banners…
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-red-700">
              <AlertTriangle size={18} />
              <p>{loadError}</p>
              <button
                onClick={loadBanners}
                className="mt-1 rounded-control border border-slate-300 px-3 py-1 text-xs font-medium text-ink-800 hover:bg-slate-100"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={() =>
                          setSelected(
                            allVisibleSelected ? [] : filtered.map((b) => b._id)
                          )
                        }
                        className="h-3.5 w-3.5 accent-amber-500"
                      />
                    </th>
                    <th className="px-3 py-2.5">Banner</th>
                    <th className="px-3 py-2.5">Vendor</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Discount</th>
                    <th className="px-3 py-2.5">Active</th>
                    <th className="px-3 py-2.5">Runs</th>
                    <th className="px-3 py-2.5">Products</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const rowPending = pendingIds.has(b._id);
                    return (
                      <tr
                        key={b._id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.includes(b._id)}
                            onChange={() => toggleSelected(b._id)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            {b.image_url ? (
                              <img
                                src={b.image_url}
                                alt={b.title}
                                className="h-9 w-14 shrink-0 rounded-control border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded-control border border-slate-200 bg-slate-50 text-slate-300">
                                <ImageIcon size={14} />
                              </div>
                            )}
                            <p className="font-medium text-ink-950">{b.title}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="text-ink-950">{b.vendorId?.name || "—"}</p>
                          <p className="text-xs text-slate-500">
                            {b.vendorId?.companyname}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-ink-800">
                          {b.categoryId?.name || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-ink-800">
                          {b.discount_percentage ?? 0}%
                        </td>
                        <td className="px-3 py-2.5">
                          <Toggle
                            checked={!!b.is_active}
                            disabled={rowPending}
                            onChange={(val) => toggleActive(b._id, val)}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">
                          <p>{formatDate(b.starts_at)}</p>
                          <p>→ {formatDate(b.ends_at)}</p>
                        </td>
                        <td className="px-3 py-2.5 text-ink-800">
                          {b.product_count ?? 0}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => openEditModal(b)}
                            className="inline-flex items-center gap-1 rounded-control border border-slate-300 px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-slate-100"
                          >
                            <Settings2 size={13} />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-slate-500">
                        No banners match this search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit permission modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-950">
                Edit banner — {editing.title}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-ink-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              {editLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={12} className="animate-spin" />
                  Refreshing latest data…
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-900">
                  Title
                </label>
                <input
                  type="text"
                  value={editing.title || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full rounded-control border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-900">Active</p>
                  <p className="text-xs text-slate-500">
                    Controls whether this banner shows on the storefront
                  </p>
                </div>
                <Toggle
                  checked={!!editing.is_active}
                  onChange={(val) =>
                    setEditing((prev) => ({ ...prev, is_active: val }))
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-900">
                  Discount percentage
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.discount_percentage ?? 0}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      discount_percentage: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-control border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-900">
                    Starts
                  </label>
                  <input
                    type="date"
                    value={editing.starts_at ? editing.starts_at.slice(0, 10) : ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        starts_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : prev.starts_at,
                      }))
                    }
                    className="w-full rounded-control border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-900">
                    Ends
                  </label>
                  <input
                    type="date"
                    value={editing.ends_at ? editing.ends_at.slice(0, 10) : ""}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        ends_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : prev.ends_at,
                      }))
                    }
                    className="w-full rounded-control border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-control border border-slate-300 px-3 py-1.5 text-sm text-ink-800 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-1 rounded-control border border-amber-600 bg-gradient-to-b from-amber-200 to-amber-400 px-3 py-1.5 text-sm font-medium text-ink-950 hover:from-amber-300 hover:to-amber-500 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}