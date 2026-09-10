import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ImageOff,
} from "lucide-react";
import { getCurrentSession } from "../../config/localAuth";

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";
const PAGE_SIZE = 10;

/* ---------------- helpers ---------------- */

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (e) {
    throw new Error(`Server returned invalid response (${res.status}): ${text.slice(0, 200)}`);
  }
}

const formatMoney = (n) =>
  typeof n === "number" && !Number.isNaN(n) ? `\u20b9${n.toLocaleString("en-IN")}` : "\u2014";

const attrSummary = (attributes = []) =>
  attributes
    .filter((a) => a?.name && a?.value)
    .map((a) => `${a.name.trim()}: ${a.value}`)
    .join(" \u00b7 ");

const idStr = (v) => {
  if (v == null) return "";
  if (typeof v === "object") return String(v._id ?? v.id ?? "").trim();
  return String(v).trim();
};

// ── endpoint #16 — GET /products/filters/:inventory ──
// "inventory" here is a stock-level bucket: low | medium | high.
// Response shape isn't confirmed from the backend yet — this reads
// data.data first, then falls back to a bare array, same defensive
// pattern used everywhere else in this file. Adjust once you see the
// real payload.
async function fetchFilteredByInventory(level, token) {
  const res = await fetch(`${API_BASE}/products/filters/${level}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await safeJson(res);
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Failed to filter by stock level (${res.status})`);
  }
  return Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
}

// ── endpoint #17 — GET /products/inventory/vendor/:vendorId ──
// Pulls the vendor's real, live stock numbers straight from the
// inventory collection. Used as a manual "sync" so numbers on this
// table don't drift from what /products/inventory (populated, but
// possibly stale) is showing.
async function fetchInventoryByVendor(vId, token) {
  const res = await fetch(`${API_BASE}/products/inventory/vendor/${vId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await safeJson(res);
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Failed to sync vendor inventory (${res.status})`);
  }
  return Array.isArray(data) ? data : (data.data ?? data.inventory ?? []);
}

function mergeVendorInventoryRows(items, rows) {
  return items.map((it) => {
    const pid = it.productId?._id ?? it.productId;
    const vid = it.variantId?._id ?? it.variantId;
    const match = rows.find(
      (r) =>
        String(r.productId ?? r.product) === String(pid) &&
        String(r.variantId ?? r.variant) === String(vid)
    );
    if (!match) return it;
    return { ...it, stock: match.stock ?? it.stock };
  });
}

// ── endpoint #18 — PUT /products/inventory/:vendorId/:productId/:variantId ──
// Direct, single-call update of one variant's stock, offer, maxQty and
// isActive — scoped by vendor. This is the ONLY update call handleSave
// makes now. The old approach of GET-whole-product → patch variants[]
// client-side → PUT-whole-product (and later, a doomed second call to
// the non-existent `PUT /products/inventory/:id`) is gone — that route
// was never registered on the backend and always 404'd.
//
// ids are sent both in the URL (which the route uses to locate the
// record) and in the body (in case the controller reads them from
// req.body too) — confirmed working against this exact payload shape
// in Postman.
async function putVariantInventory(vId, productId, variantId, payload, token) {
  const res = await fetch(`${API_BASE}/products/inventory/${vId}/${productId}/${variantId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      vendorId: vId,
      productId,
      variantId,
      ...payload,
    }),
  });
  const data = await safeJson(res);
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Failed to sync variant inventory (${res.status})`);
  }
  return data;
}

/* ---------------- component ---------------- */

export default function Inventory() {
  const session = getCurrentSession();
  const role = session?.role; // "Super Admin" | "Vendor"
  const token = session?.adminToken || localStorage.getItem("adminToken");

  const vendorId = useMemo(() => {
    if (role !== "Vendor" || !token) return null;
    const payload = decodeJwtPayload(token);
    return payload?.id || null;
  }, [role, token]);

  const isSuperAdmin = role === "Super Admin";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all"); // all | in_stock | out_of_stock
  const [levelFilter, setLevelFilter] = useState(""); // "" | low | medium | high  (endpoint #16)
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false); // endpoint #17 manual sync

  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (levelFilter) {
        const list = await fetchFilteredByInventory(levelFilter, token);
        setItems(list);
        return;
      }
      const params = new URLSearchParams();
      if (vendorId) params.set("vendorId", vendorId);
      if (statusTab !== "all") params.set("stockStatus", statusTab);

      const res = await fetch(`${API_BASE}/products/inventory?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await safeJson(res);
      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Failed to load inventory (${res.status})`);
      }
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || "Something went wrong while loading inventory.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [vendorId, statusTab, levelFilter, token]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    setPage(1);
  }, [search, statusTab, levelFilter]);

  // endpoint #17 — manual sync button, vendor-scoped only
  const syncFromVendorInventory = async () => {
    if (!vendorId) return;
    setSyncing(true);
    setError("");
    try {
      const rows = await fetchInventoryByVendor(vendorId, token);
      setItems((prev) => mergeVendorInventoryRows(prev, rows));
    } catch (err) {
      setError(err.message || "Failed to sync inventory from vendor endpoint.");
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const name = it.productId?.productName?.toLowerCase() || "";
      const sku = it.variantId?.sku?.toLowerCase() || "";
      const vendor = it.vendorId?.name?.toLowerCase() || "";
      const brand = it.productId?.brandName?.toLowerCase() || "";
      return name.includes(q) || sku.includes(q) || vendor.includes(q) || brand.includes(q);
    });
  }, [items, search]);

  const counts = useMemo(
    () => ({
      all: items.length,
      in_stock: items.filter((it) => it.stockStatus === "in_stock").length,
      out_of_stock: items.filter((it) => it.stockStatus === "out_of_stock").length,
    }),
    [items]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openEdit = (item) => {
    setSaveError("");
    setEditingItem({
      _id: item._id,
      productId: item.productId?._id ?? item.productId ?? null,
      variantId: item.variantId?._id ?? item.variantId ?? null,
      // vendor scope needed for endpoint #18 — Super Admin rows carry
      // their own vendorId; Vendor-session rows fall back to the
      // logged-in vendor's own id.
      vendorIdForItem: item.vendorId?._id ?? item.vendorId ?? vendorId ?? null,
      productName: item.productId?.productName || "Unnamed product",
      sku: item.variantId?.sku || "\u2014",
      mrp: item.variantId?.offer?.mrp ?? 0,
      sellingPrice: item.variantId?.offer?.sellingPrice ?? 0,
      salePrice: item.variantId?.offer?.salePrice ?? 0,
      stock: item.stock ?? 0,
      maxQty: item.maxQty ?? 0,
      isActive: !!item.isActive,
    });
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingItem(null);
  };

  const updateField = (field, value) => {
    setEditingItem((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setSaving(true);
    setSaveError("");
    try {
      if (!editingItem.vendorIdForItem || !editingItem.productId || !editingItem.variantId) {
        throw new Error("Missing vendor, product, or variant id for this row.");
      }

      // Single source of truth for the update — endpoint #18 above.
      // The old bare `PUT /products/inventory/:id` call is gone; that
      // route never existed on the backend and always 404'd.
      await putVariantInventory(
        editingItem.vendorIdForItem,
        editingItem.productId,
        editingItem.variantId,
        {
          stock: Number(editingItem.stock) || 0,
          maxQty: Number(editingItem.maxQty) || 0,
          isActive: editingItem.isActive,
          offer: {
            mrp: Number(editingItem.mrp) || 0,
            sellingPrice: Number(editingItem.sellingPrice) || 0,
            salePrice: Number(editingItem.salePrice) || 0,
          },
        },
        token
      );

      await fetchInventory();
      setEditingItem(null);
    } catch (err) {
      setSaveError(err.message || "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const StockBadge = ({ status }) =>
    status === "in_stock" ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
        <CheckCircle2 className="h-3 w-3" /> In stock
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
        <XCircle className="h-3 w-3" /> Out of stock
      </span>
    );

  const tabs = [
    { key: "all", label: "All Inventory", count: counts.all },
    { key: "in_stock", label: "In Stock", count: counts.in_stock },
    { key: "out_of_stock", label: "Out of Stock", count: counts.out_of_stock },
  ];

  const levelTabs = ["low", "medium", "high"]; // endpoint #16 buckets

  return (
    <div className="min-h-screen bg-surface p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-950">Manage Inventory</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {isSuperAdmin
              ? "View and update pricing & stock across all vendors."
              : "View and update pricing & stock for your listings."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isSuperAdmin && (
            <button
              onClick={syncFromVendorInventory}
              disabled={syncing}
              title="Pull latest stock from /products/inventory/vendor/:vendorId"
              className="inline-flex items-center gap-2 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync inventory
            </button>
          )}
          <button
            onClick={fetchInventory}
            className="inline-flex items-center gap-2 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-card border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 pt-2">
          <div className="flex flex-wrap items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setLevelFilter(""); setStatusTab(tab.key); }}
                className={`rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                  !levelFilter && statusTab === tab.key
                    ? "border-b-2 border-amber-600 text-ink-950"
                    : "border-b-2 border-transparent text-slate-500 hover:text-ink-900"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                    !levelFilter && statusTab === tab.key ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* endpoint #16 — stock-level buckets */}
          <div className="flex items-center gap-1 pb-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400 mr-1">Level</span>
            {levelTabs.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(levelFilter === lvl ? "" : lvl)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                  levelFilter === lvl
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-slate-200 bg-white text-ink-700 hover:border-amber-600 hover:text-amber-700"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, SKU, brand or vendor"
              className="w-full rounded-control border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
            />
          </div>
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-ink-800">{filtered.length}</span> results
          </div>
        </div>

        {error && (
          <div className="m-3 flex items-start gap-2 rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Couldn't load inventory</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-ink-700">Product</th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-left font-semibold text-ink-700">Vendor</th>
                )}
                <th className="px-4 py-3 text-right font-semibold text-ink-700">MRP</th>
                <th className="px-4 py-3 text-right font-semibold text-ink-700">Selling Price</th>
                <th className="px-4 py-3 text-right font-semibold text-ink-700">Sale Price</th>
                <th className="px-4 py-3 text-center font-semibold text-ink-700">Stock</th>
                <th className="px-4 py-3 text-center font-semibold text-ink-700">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-ink-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                    Loading inventory\u2026
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                    <Package className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    No inventory items match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => {
                  const image = item.variantId?.images?.[0] || item.productId?.images?.[0];
                  const offer = item.variantId?.offer || {};
                  const attrs = attrSummary(item.variantId?.attributes);
                  return (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-control border border-slate-200 bg-slate-50">
                            {image ? (
                              <img
                                src={image}
                                alt={item.productId?.productName || "Product"}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageOff className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-amber-600">
                              {item.productId?.productName || "Unnamed product"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              SKU: {item.variantId?.sku || "\u2014"}
                            </p>
                            {attrs && (
                              <p className="mt-0.5 truncate text-xs text-slate-400" title={attrs}>
                                {attrs}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {isSuperAdmin && (
                        <td className="px-4 py-3 text-ink-700">
                          {item.vendorId?.name ? (
                            <div>
                              <p className="font-medium text-ink-800">{item.vendorId.name}</p>
                              <p className="text-xs text-slate-400">{item.vendorId.companyname}</p>
                            </div>
                          ) : (
                            "\u2014"
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right text-slate-400 line-through">
                        {formatMoney(offer.mrp)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink-900">
                        {formatMoney(offer.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">
                        {formatMoney(offer.salePrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-ink-900">{item.stock ?? 0}</span>
                        <span className="text-xs text-slate-400"> / max {item.maxQty ?? 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <StockBadge status={item.stockStatus} />
                          <span
                            className={`text-xs font-medium ${
                              item.isActive ? "text-green-600" : "text-slate-400"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-1 rounded-control border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-800 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-control border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-control border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-card bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <h2 className="text-base font-semibold text-ink-950">Manage Pricing & Inventory</h2>
                <p className="text-xs text-slate-500">
                  {editingItem.productName} \u00b7 SKU: {editingItem.sku}
                </p>
              </div>
              <button onClick={closeEdit} className="rounded-control p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700">MRP (\u20b9)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.mrp}
                    onChange={(e) => updateField("mrp", e.target.value)}
                    className="w-full rounded-control border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700">Selling Price</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.sellingPrice}
                    onChange={(e) => updateField("sellingPrice", e.target.value)}
                    className="w-full rounded-control border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700">Sale Price</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.salePrice}
                    onChange={(e) => updateField("salePrice", e.target.value)}
                    className="w-full rounded-control border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700">Stock (available qty)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.stock}
                    onChange={(e) => updateField("stock", e.target.value)}
                    className="w-full rounded-control border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-700">Max Qty per order</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.maxQty}
                    onChange={(e) => updateField("maxQty", e.target.value)}
                    className="w-full rounded-control border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-ink-800">
                <input
                  type="checkbox"
                  checked={editingItem.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="h-4 w-4 rounded-control border-slate-300 text-amber-600 focus:ring-amber-600"
                />
                Listing is active
              </label>

              {saveError && (
                <div className="flex items-start gap-2 rounded-control border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="rounded-control border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-control bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Saving\u2026" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}