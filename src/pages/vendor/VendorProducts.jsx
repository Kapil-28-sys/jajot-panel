// Products.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertTriangle, Eye, PackageCheck,
  PackagePlus, Search, SlidersHorizontal,
  Pencil, Trash2, X,
  CheckCircle, Archive as ArchiveIcon, Copy,
  Boxes, Save, Power, PowerOff, RefreshCw,
} from "lucide-react";
import { inr, vendorName, vendors } from "../../data/marketplaceData";
import DataPager from "../../components/common/DataPager";
import MetricCard from "../../components/common/MetricCard";

// ── Centralized products API (all 21 endpoints) ──
// productsApi.js
// path: src/api/productsApi.js

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";
const CATEGORIES_URL = `${API_BASE}/categories`;

// ── Auth token resolution (same logic Products.jsx already used) ──
function findTokenDeep(obj, depth = 0, seen = new Set()) {
  if (!obj || typeof obj !== "object" || depth > 6 || seen.has(obj)) return "";
  seen.add(obj);
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string" && key.toLowerCase() === "token" && val.trim()) return val;
  }
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === "object") {
      const found = findTokenDeep(val, depth + 1, seen);
      if (found) return found;
    }
  }
  return "";
}

function resolveAuthToken() {
  const adminToken = localStorage.getItem("adminToken");
  if (adminToken && adminToken.trim() && adminToken !== "null" && adminToken !== "undefined") {
    return adminToken;
  }
  const flat = localStorage.getItem("token");
  if (flat && flat.trim() && flat !== "null" && flat !== "undefined") return flat;
  try {
    const raw = localStorage.getItem("adminSession");
    if (raw) {
      const parsed = JSON.parse(raw);
      const nested = findTokenDeep(parsed);
      if (nested) return nested;
    }
  } catch { /* not JSON, ignore */ }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === "adminToken" || key === "token") continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const found = findTokenDeep(parsed);
          if (found) return found;
        }
      } catch { /* not JSON, skip */ }
    }
  } catch { /* localStorage unavailable */ }
  return "";
}

function authHeaders() {
  const token = resolveAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const client = axios.create({ baseURL: API_BASE });
client.interceptors.request.use((config) => {
  config.headers = { ...config.headers, ...authHeaders() };
  return config;
});

// ── All product endpoints ──
const productsApi = {
  // #1 — create a new product
  create: (data) => client.post("/products/add", data),
  getAll: (params) => client.get("/products", { params }),
  getById: (productId) => client.get(`/products/${productId}`),
  update: (productId, data) => client.put(`/products/${productId}`, data),
  remove: (productId) => client.delete(`/products/${productId}`),
  publish: (productId) => client.patch(`/products/${productId}/publish`),
  archive: (productId) => client.patch(`/products/${productId}/archive`),
  duplicate: (productId) => client.post(`/products/${productId}/duplicate`),

  // ── FIXED — bulk-update / bulk-delete ──
  // The backend was returning 400 "At least one product id is required"
  // even though the frontend was sending a valid, non-empty `productIds`
  // array. That means the handler on /products/bulk-update (and likely
  // /products/bulk-delete) is not reading `req.body.productIds` the way
  // this client originally sent it. Since the backend source isn't
  // accessible from here, these two calls now try the original shape
  // first, then automatically fall back through the next most common
  // shapes — but ONLY when the server keeps complaining specifically
  // about a missing product id (400 + "product id" in the message).
  // Any other error (auth, 500, etc.) surfaces immediately instead of
  // being masked by retries.
  bulkUpdate: async (productIds, update) => {
    const attempts = [
      { productIds, update },           // shape A (nested) — original
      { productIds, ...update },        // shape B (flattened update fields)
      { ids: productIds, update },      // shape C (alt key name, nested)
      { ids: productIds, ...update },   // shape D (alt key name, flattened)
    ];
    let lastErr;
    for (const body of attempts) {
      try {
        return await client.post("/products/bulk-update", body);
      } catch (e) {
        lastErr = e;
        const msg = (e.response?.data?.message || "").toLowerCase();
        if (e.response?.status !== 400 || !msg.includes("product id")) throw e;
      }
    }
    throw lastErr;
  },
  bulkDelete: async (productIds) => {
    const attempts = [
      { productIds },     // shape A — original
      { ids: productIds }, // shape B — alt key name
    ];
    let lastErr;
    for (const body of attempts) {
      try {
        return await client.post("/products/bulk-delete", body);
      } catch (e) {
        lastErr = e;
        const msg = (e.response?.data?.message || "").toLowerCase();
        if (e.response?.status !== 400 || !msg.includes("product id")) throw e;
      }
    }
    throw lastErr;
  },

  filtter: (params) => client.get("/products/filtter", { params }),
  search: (query, extraParams = {}) => client.get("/products/search", { params: { q: query, ...extraParams } }),
  recommendations: (divid) => client.get(`/products/recommendations/${divid}`),
  // #15 — generic filters (no id), returns available filter facets
  filters: (params) => client.get("/products/filters", { params }),
  filtersByCategory: (categoryId) => client.get(`/products/filters/${categoryId}`),
  filtersByInventory: (inventory) => client.get(`/products/filters/${inventory}`),
  inventoryByVendor: (vendorId) => client.get(`/products/inventory/vendor/${vendorId}`),
  updateVariantInventory: (vendorId, productId, variantId, data) =>
    client.put(`/products/inventory/${vendorId}/${productId}/${variantId}`, data),
  updateVariantStatus: (variantId, status) =>
    client.patch(`/products/variant/${variantId}/status`, { status }),
  byVendor: (vendorId) => client.get(`/products/vendor/${vendorId}`),
  productMisc: () => client.get("/products/product"),
};


import axios from "axios";

const STATUS_OPTIONS = ["All", "Active", "Draft", "Suppressed", "Pending"];
const normStatus = (s) => (s ?? "").toString().trim().toLowerCase();
const idStr = (val) => {
  if (val == null) return "";
  if (typeof val === "object") return String(val._id ?? val.id ?? "").trim();
  return String(val).trim();
};

const stockClass = (p) => {
  if (normStatus(p.status) === "suppressed") return "bg-red-50 text-red-700 ring-red-200";
  if (p.stock < 15)             return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
};

function deriveProductMetrics(p) {
  const variants = Array.isArray(p.variants) ? p.variants : [];

  if (variants.length === 0) {
    return {
      stock: p.stock ?? p.totalStock ?? 0,
      minMrp: p.mrp ?? p.price ?? null,
      minSelling: p.sellingPrice ?? p.price ?? null,
      minSale: p.salePrice ?? p.price ?? null,
      variantCount: 0,
    };
  }

  let totalStock = 0;
  let minMrp = null;
  let minSelling = null;
  let minSale = null;

  variants.forEach((v) => {
    totalStock += Number(v.inventory?.stock ?? v.stock ?? 0);
    const offer = v.offer ?? {};
    const mrpVal     = offer.mrp ?? offer.price ?? null;
    const sellingVal = offer.sellingPrice ?? offer.price ?? null;
    const saleVal    = offer.salePrice ?? null;

    if (mrpVal != null)     minMrp     = minMrp     == null ? mrpVal     : Math.min(minMrp, mrpVal);
    if (sellingVal != null) minSelling = minSelling == null ? sellingVal : Math.min(minSelling, sellingVal);
    if (saleVal != null)    minSale    = minSale    == null ? saleVal    : Math.min(minSale, saleVal);
  });

  return { stock: totalStock, minMrp, minSelling, minSale, variantCount: variants.length };
}

function matchesInventoryLevel(stock, level) {
  if (!level) return true;
  if (level === "low") return stock < 15;
  if (level === "medium") return stock >= 15 && stock < 50;
  if (level === "high") return stock >= 50;
  return true;
}

// ── inventory merge helper ──
// GET /products (and /products/vendor/:vendorId) don't populate each
// variant's nested `inventory` sub-document the way GET /products/:id
// does. That's why the table showed stock as 0 right after a page
// refresh even though the single-product view/edit modal showed the
// correct number (it uses getById, which DOES populate inventory).
//
// FIXED — /products/inventory/vendor/:vendorId returns rows where
// `productId` and `variantId` are POPULATED OBJECTS
// (e.g. productId: { _id, productName }, variantId: { _id, variantName, ... }),
// not plain id strings. The previous version compared them with
// String(r.productId) === String(pid), which stringifies an object to
// "[object Object]" and can never match a real id — so the merge always
// silently found nothing, and stock kept showing stale/0 values even
// though the sync call itself succeeded with no error. This now uses
// idStr() (already used elsewhere in this file) so it correctly unwraps
// either a populated object or a raw string on both sides of the
// comparison. Also carries over maxQty / isActive from the same
// response, since the PUT endpoint returns those on the same row.
function mergeInventoryRows(list, rows) {
  return list.map((p) => {
    const pid = p._id ?? p.id;
    if (!Array.isArray(p.variants) || !p.variants.length) return p;
    const patchedVariants = p.variants.map((v) => {
      const match = rows.find((r) => {
        const rProductId = idStr(r.productId ?? r.product);
        const rVariantId = idStr(r.variantId ?? r.variant);
        return rProductId === idStr(pid) && rVariantId === idStr(v._id);
      });
      if (!match) return v;
      return {
        ...v,
        inventory: {
          ...v.inventory,
          stock: match.stock ?? v.inventory?.stock,
          maxQty: match.maxQty ?? v.inventory?.maxQty,
          isActive: match.isActive ?? v.inventory?.isActive,
        },
      };
    });
    return { ...p, variants: patchedVariants };
  });
}

function DeleteModal({ product, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}>
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Trash2 size={22} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-ink-950">Delete product?</h3>
        <p className="mt-1 text-sm text-slate-500">
          <strong className="text-ink-800">{product?.productName ?? product?.name}</strong> will be
          permanently removed. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {deleting && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteModal({ count, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}>
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Trash2 size={22} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-ink-950">Delete {count} products?</h3>
        <p className="mt-1 text-sm text-slate-500">
          This will permanently remove <strong className="text-ink-800">{count}</strong> selected products. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            {deleting && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {deleting ? "Deleting…" : `Yes, delete ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const isEmpty = (v) =>
  v === null || v === undefined || v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);

function Field({ label, value }) {
  if (isEmpty(value)) return null;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-ink-900 break-words">
        {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </p>
    </div>
  );
}

function BulletList({ label, items }) {
  if (isEmpty(items)) return null;
  const list = Array.isArray(items) ? items : [items];
  return (
    <div className="sm:col-span-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-ink-900">
        {list.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-control border border-slate-100 bg-slate-50/60 p-4">
      <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-amber-700">{title}</h4>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function VariantEditRow({ variant, vendorId, productId, onSaved }) {
  const [stock, setStock] = useState(variant.inventory?.stock ?? variant.stock ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStock(variant.inventory?.stock ?? variant.stock ?? "");
  }, [variant.inventory?.stock, variant.stock]);

  const isActive = normStatus(variant.status || "active") !== "inactive";

  const attrsList = Array.isArray(variant.attributes)
    ? variant.attributes.map((a) => `${a.name}: ${a.value}`)
    : Object.entries(variant.attributes ?? {}).map(([k, v]) => `${k}: ${v}`);

  const mrpDisplay     = variant.offer?.mrp ?? variant.offer?.price;
  const sellingDisplay = variant.offer?.sellingPrice ?? variant.offer?.price;
  const saleDisplay    = variant.offer?.salePrice;

  // FIXED — PUT /products/inventory/:vendorId/:productId/:variantId already
  // returns the fully updated inventory doc in `data`
  // ({ stock, maxQty, isActive, stockStatus, productId: {...}, variantId: {...} }).
  // Previously this ignored the response body and just called onSaved()
  // to trigger a full getById() refetch — an extra round trip that also
  // depended on mergeInventoryRows, which was broken (see note above).
  // Now the fresh doc is used to update the input immediately and is
  // passed up via onSaved(updated) so the parent can patch state directly
  // without waiting on a refetch.
  const saveStock = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await productsApi.updateVariantInventory(
        vendorId,
        productId,
        variant._id,
        { stock: Number(stock || 0) }
      );
      const updated = res.data?.data ?? res.data;
      setStock(updated?.stock ?? stock);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      onSaved?.(updated);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to update stock.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    setStatusBusy(true);
    setError("");
    try {
      await productsApi.updateVariantStatus(variant._id, isActive ? "inactive" : "active");
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to update variant status.");
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <tr>
      <td className="py-2 pr-3 font-mono text-ink-800">{variant.sku}</td>
      <td className="py-2 pr-3 text-ink-800">
        {attrsList.join(", ")}
      </td>
      <td className="py-2 pr-3 text-slate-500 line-through">{mrpDisplay != null ? inr(mrpDisplay) : "—"}</td>
      <td className="py-2 pr-3 text-ink-800">{sellingDisplay != null ? inr(sellingDisplay) : "—"}</td>
      <td className="py-2 pr-3 font-bold text-ink-950">{saleDisplay != null ? inr(saleDisplay) : "—"}</td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-16 rounded-control border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-amber-500"
          />
          <button
            onClick={saveStock}
            disabled={saving}
            title="Save stock"
            className="flex h-6 w-6 items-center justify-center rounded-control border border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50"
          >
            {saving ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" /> : <Save size={12} />}
          </button>
          {savedFlash && <CheckCircle size={13} className="text-emerald-600" />}
        </div>
      </td>
      <td className="py-2 pr-3 text-ink-800">{variant.offer?.itemCondition ?? "—"}</td>
      <td className="py-2 pr-3">
        <button
          onClick={toggleStatus}
          disabled={statusBusy}
          title={isActive ? "Deactivate variant" : "Activate variant"}
          className={`flex h-6 w-6 items-center justify-center rounded-control border transition-colors disabled:opacity-50 ${
            isActive ? "border-slate-200 text-emerald-600 hover:border-red-400 hover:text-red-600"
                     : "border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
          }`}
        >
          {statusBusy ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-ink-700" />
          ) : isActive ? <Power size={12} /> : <PowerOff size={12} />}
        </button>
        {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
      </td>
    </tr>
  );
}

function ViewModal({ loading, error, payload, fallbackName, onClose, onRefresh }) {
  const p        = payload?.product ?? null;
  const variants = payload?.variants ?? [];
  const vendorIdForProduct = typeof p?.vendorId === "object" ? p.vendorId?._id : p?.vendorId;

  const displayName = p?.productName ?? p?.itemName ?? fallbackName ?? "—";
  const desc         = p?.description ?? {};
  const details       = p?.productDetails ?? {};
  const dims           = p?.dimensions ?? {};
  const packaging       = p?.packaging ?? {};
  const safety            = p?.safetyCompliance ?? {};
  const gift                = p?.giftOptions ?? {};
  const images               = p?.images ?? [];
  const attributesMeta         = p?.attributesMeta ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-card bg-white shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <p className="text-sm font-medium text-amber-600">Product details</p>
            <h3 className="mt-0.5 text-lg font-bold text-ink-950">{displayName}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-ink-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">

          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
              Loading full product details…
            </div>
          )}

          {!loading && error && (
            <div className="py-10 text-center text-sm text-red-500">⚠ {error}</div>
          )}

          {!loading && !error && p && (
            <>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${displayName} ${i + 1}`}
                      className="h-24 w-24 rounded-control object-cover ring-1 ring-slate-200"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ))}
                </div>
              )}

              <SectionCard title="Basic info">
                <Field label="Product name"   value={p.productName} />
                <Field label="Item name"      value={p.itemName} />
                <Field label="Brand"          value={p.brandName} />
                <Field label="Product type"   value={p.productType} />
                <Field label="Browse node"    value={p.recommendedBrowseNode} />
                <Field label="External ID"    value={p.externalProductId} />
                <Field label="Vendor"         value={vendorName(p.vendorId)} />
                <Field label="Category ID"    value={p.categoryId} />
                <Field label="Product ID"     value={p._id} />
              </SectionCard>

              {(desc.productDescription || desc.bulletPoints?.length > 0) && (
                <div className="rounded-control border border-slate-100 bg-slate-50/60 p-4">
                  <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-amber-700">Description</h4>
                  {desc.productDescription && (
                    <p className="mb-3 whitespace-pre-wrap text-sm text-ink-800">{desc.productDescription}</p>
                  )}
                  {desc.bulletPoints?.length > 0 && (
                    <ul className="list-disc space-y-1 pl-4 text-sm text-ink-900">
                      {desc.bulletPoints.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <SectionCard title="Product details">
                <Field label="Manufacturer"       value={details.manufacturer} />
                <Field label="Model number"       value={details.modelNumber} />
                <Field label="Part number"        value={details.partNumber} />
                <Field label="Item type"          value={details.itemTypeName} />
                <Field label="Generic keyword"    value={details.genericKeyword} />
                <Field label="Target audience"    value={details.targetAudienceKeyword} />
                <Field label="Material"           value={details.material} />
                <Field label="Item shape"         value={details.itemShape} />
                <Field label="Theme"              value={details.theme} />
                <Field label="Occasion"           value={details.occasion} />
                <Field label="Unit count"         value={details.unitCount != null ? `${details.unitCount} ${details.unitCountType ?? ""}` : null} />
                <Field label="Manufacturer contact" value={details.manufacturerContactInfo} />
                <BulletList label="Special features"    items={details.specialFeatures} />
                <BulletList label="Included components" items={details.includedComponents} />
              </SectionCard>

              {(dims.itemDimensions || dims.packageDimensions || dims.itemWeight) && (
                <SectionCard title="Dimensions & weight">
                  <Field
                    label="Item dimensions (L×W×H)"
                    value={dims.itemDimensions ? `${dims.itemDimensions.length} × ${dims.itemDimensions.width} × ${dims.itemDimensions.height}` : null}
                  />
                  <Field
                    label="Package dimensions (L×W×H)"
                    value={dims.packageDimensions ? `${dims.packageDimensions.length} × ${dims.packageDimensions.width} × ${dims.packageDimensions.height}` : null}
                  />
                  <Field label="Item weight"    value={dims.itemWeight != null ? `${dims.itemWeight} ${dims.itemWeightUnit ?? ""}` : null} />
                  <Field label="Package weight" value={dims.packageWeight} />
                </SectionCard>
              )}

              {!isEmpty(packaging) && (
                <SectionCard title="Packaging">
                  <Field label="Packaging type"       value={packaging.packagingType} />
                  <Field label="Source type"          value={packaging.sourceType} />
                  <Field label="Fulfillment channel"  value={packaging.fulfillmentChannel} />
                  <Field label="Number of packs"      value={packaging.numberOfPacks} />
                </SectionCard>
              )}

              {!isEmpty(safety) && (
                <SectionCard title="Safety & compliance">
                  <Field label="Country / region of origin" value={safety.countryRegionOfOrigin} />
                  <Field label="Dangerous goods"             value={safety.dangerousGoodsRegulation} />
                  <Field label="Buyer age restriction"       value={safety.buyerAgeRestriction} />
                  <Field label="Regulatory certification"    value={safety.regulatoryComplianceCertification} />
                  <Field label="Safety attestation"          value={safety.safetyAttestation} />
                  <Field label="Attestation address"         value={safety.safetyAttestationAddress} />
                  <Field label="Ships globally"               value={safety.shipsGlobally} />
                  <Field label="Cautionary statement"        value={safety.mandatoryCautionaryStatement} />
                </SectionCard>
              )}

              {!isEmpty(gift) && (
                <SectionCard title="Gift options">
                  <Field label="Gift wrap available"    value={gift.giftWrapAvailable} />
                  <Field label="Gift message available" value={gift.giftMessageAvailable} />
                </SectionCard>
              )}

              {(p.metadata || p.metaKeywords?.length > 0 || p.searchKeywords?.length > 0) && (
                <SectionCard title="SEO & keywords">
                  <Field label="Metadata" value={p.metadata} />
                  <BulletList label="Meta keywords"   items={p.metaKeywords} />
                  <BulletList label="Search keywords" items={p.searchKeywords} />
                </SectionCard>
              )}

              {attributesMeta.length > 0 && (
                <div className="rounded-control border border-slate-100 bg-slate-50/60 p-4">
                  <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-amber-700">Attributes</h4>
                  <div className="space-y-2">
                    {attributesMeta.map((a) => (
                      <div key={a._id ?? a.name}>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{a.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(a.values ?? []).map((v, i) => (
                            <span key={i} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-800 ring-1 ring-slate-200">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {variants.length > 0 && (
                <div className="rounded-control border border-slate-100 bg-slate-50/60 p-4">
                  <h4 className="mb-3 text-xs font-black uppercase tracking-wide text-amber-700">
                    Variants <span className="text-slate-400">({variants.length})</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 pr-3 font-semibold">SKU</th>
                          <th className="py-2 pr-3 font-semibold">Attributes</th>
                          <th className="py-2 pr-3 font-semibold">MRP</th>
                          <th className="py-2 pr-3 font-semibold">Selling</th>
                          <th className="py-2 pr-3 font-semibold">Sale</th>
                          <th className="py-2 pr-3 font-semibold">Stock</th>
                          <th className="py-2 pr-3 font-semibold">Condition</th>
                          <th className="py-2 pr-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {variants.map((v) => (
                          <VariantEditRow
                            key={v._id}
                            variant={v}
                            vendorId={vendorIdForProduct}
                            productId={p._id}
                            onSaved={onRefresh}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(p.createdAt || p.updatedAt) && (
                <SectionCard title="Timestamps">
                  <Field label="Created at" value={p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN") : null} />
                  <Field label="Updated at" value={p.updatedAt ? new Date(p.updatedAt).toLocaleString("en-IN") : null} />
                </SectionCard>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-slate-100 bg-white px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const location = useLocation();

  const vendorIdFromStorage = (() => {
    const flat = localStorage.getItem("vendorId");
    if (flat && flat.trim() && flat !== "null" && flat !== "undefined") return flat;
    try {
      const raw = localStorage.getItem("adminSession");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.vendorId) return parsed.vendorId;
        if (parsed?.user?.vendorId) return parsed.user.vendorId;
      }
    } catch { /* not JSON, ignore */ }
    return null;
  })();
  const scopeToOwnVendor = Boolean(vendorIdFromStorage);

  const [catalog,         setCatalog]         = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError,   setProductsError]   = useState("");
  const [successMsg,      setSuccessMsg]       = useState("");

  const [vendorId,      setVendorId]      = useState("all");
  const [query,         setQuery]         = useState("");
  const [statusFilter,  setStatusFilter]  = useState("All");
  const [showFilters,   setShowFilters]   = useState(false);
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(5);

  const [inventoryFilter,     setInventoryFilter]     = useState("");
  const [categoryFilter,      setCategoryFilter]      = useState("");
  const [categoryFacetValues, setCategoryFacetValues] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [bulkBusy,       setBulkBusy]       = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting,   setBulkDeleting]   = useState(false);

  const [actionState, setActionState] = useState({ id: null, type: null });

  // endpoint #17 (/products/inventory/vendor/:vendorId) sync state
  const [inventorySyncing, setInventorySyncing] = useState(false);

  // category id -> name lookup. GET /products doesn't populate
  // categoryId with { _id, name }, only the raw ObjectId string, so the
  // table/filter fell back to "—" every time. Fetch /categories once and
  // resolve names ourselves regardless of what shape categoryId comes in.
  const [categoryLookup, setCategoryLookup] = useState({});

  useEffect(() => {
    fetch(CATEGORIES_URL, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.categories ?? d.data ?? []);
        const map = {};
        list.forEach((c) => {
          const id = c._id ?? c.id;
          const name = c.name || c.categoryName || c.title || "Unnamed";
          if (id) map[id] = name;
        });
        setCategoryLookup(map);
      })
      .catch(() => setCategoryLookup({}));
  }, []);

  const [viewOpen,     setViewOpen]     = useState(false);
  const [viewLoading,  setViewLoading]  = useState(false);
  const [viewError,    setViewError]    = useState("");
  const [viewPayload,  setViewPayload]  = useState(null);
  const [viewFallback, setViewFallback] = useState("");
  const [viewProductId, setViewProductId] = useState(null);

  const openView = async (p) => {
    const id = p._id ?? p.id;
    setViewProductId(id);
    setViewOpen(true);
    setViewLoading(true);
    setViewError("");
    setViewPayload(null);
    setViewFallback(p.productName ?? p.name ?? "");

    try {
      const res = await productsApi.getById(id);
      setViewPayload(res.data);
    } catch (e) {
      setViewError(e.response?.data?.message || e.message || "Failed to load product details.");
    } finally {
      setViewLoading(false);
    }
  };

  // FIXED — refreshView now accepts the fresh inventory doc returned
  // directly by PUT /products/inventory/:vendorId/:productId/:variantId
  // (shape: { stock, maxQty, isActive, productId: {_id,...}, variantId:
  // {_id,...} }). When it's provided we patch viewPayload and catalog
  // in-place instead of firing a full getById() refetch — cheaper, and
  // avoids depending on a second round trip. If no payload is passed
  // (e.g. after a variant status toggle, or any other caller that still
  // wants a full refresh) it falls back to the original getById() path.
  const refreshView = async (updatedInventory) => {
    if (updatedInventory) {
      const updVariantId  = idStr(updatedInventory.variantId);
      const updProductId  = idStr(updatedInventory.productId);

      setViewPayload((prev) => {
        if (!prev?.variants) return prev;
        return {
          ...prev,
          variants: prev.variants.map((v) =>
            idStr(v._id) === updVariantId
              ? {
                  ...v,
                  inventory: {
                    ...v.inventory,
                    stock: updatedInventory.stock,
                    maxQty: updatedInventory.maxQty,
                    isActive: updatedInventory.isActive,
                  },
                }
              : v
          ),
        };
      });

      setCatalog((prev) =>
        mergeInventoryRows(prev, [
          {
            productId: updProductId,
            variantId: updVariantId,
            stock: updatedInventory.stock,
            maxQty: updatedInventory.maxQty,
            isActive: updatedInventory.isActive,
          },
        ])
      );
      return;
    }

    if (!viewProductId) return;
    try {
      const res = await productsApi.getById(viewProductId);
      setViewPayload(res.data);
      const updated = res.data?.product ?? res.data;
      if (updated?._id) {
        setCatalog((prev) =>
          prev.map((p) => ((p._id ?? p.id) === updated._id ? { ...p, ...updated } : p))
        );
      }
    } catch { /* keep showing last-known payload on refresh failure */ }
  };

  const closeView = () => {
    setViewOpen(false);
    setViewPayload(null);
    setViewError("");
    setViewProductId(null);
  };

  useEffect(() => {
    if (location.state?.added) {
      setSuccessMsg("Product added successfully!");
      window.history.replaceState({}, "");
      const t = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(t);
    }
    if (location.state?.updated) {
      setSuccessMsg("Product updated successfully!");
      window.history.replaceState({}, "");
      const t = setTimeout(() => setSuccessMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  // ── fetch catalog — ENDPOINT #20 (/products/vendor/:vendorId) is
  // wired in: vendor-scoped sessions hit the vendor-specific endpoint
  // directly instead of pulling ALL products (every vendor's) and
  // filtering client-side. Super Admin / "all vendors" view still uses
  // the generic getAll() (endpoint #2).
  //
  // The list endpoints (getAll / byVendor) don't populate each variant's
  // nested `inventory.stock` the way GET /products/:id does. For
  // vendor-scoped sessions we pull the real numbers from
  // /products/inventory/vendor/:vendorId (endpoint #17, same one the
  // "Sync inventory" button uses) and merge them in right after the
  // catalog loads, using the now-fixed mergeInventoryRows(), so the
  // table is correct without needing a manual sync click. ──
  const fetchProducts = async () => {
    setProductsLoading(true);
    setProductsError("");
    try {
      const res = scopeToOwnVendor
        ? await productsApi.byVendor(vendorIdFromStorage)   // #20
        : await productsApi.getAll();                       // #2
      const d = res.data;
      let list = Array.isArray(d) ? d : (d.data ?? d.products ?? []);

      if (scopeToOwnVendor) {
        try {
          const invRes = await productsApi.inventoryByVendor(vendorIdFromStorage);
          const rows = Array.isArray(invRes.data) ? invRes.data : (invRes.data?.data ?? invRes.data?.inventory ?? []);
          list = mergeInventoryRows(list, rows);
        } catch { /* inventory merge failed — table still shows whatever the list endpoint returned */ }
      }

      setCatalog(list);
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Failed to load products.");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setProductsLoading(true);
        setProductsError("");
        try {
          const res = await productsApi.search(query.trim());
          const d = res.data;
          setCatalog(Array.isArray(d) ? d : (d.data ?? d.products ?? d.results ?? []));
        } catch (e) {
          setProductsError(e.response?.data?.message || e.message || "Search failed.");
        } finally {
          setProductsLoading(false);
        }
      } else {
        fetchProducts();
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!categoryFilter) { setCategoryFacetValues(null); return; }
    productsApi.filtersByCategory(categoryFilter)
      .then((res) => setCategoryFacetValues(res.data))
      .catch(() => setCategoryFacetValues(null));
  }, [categoryFilter]);

  // ── ENDPOINT #17 (/products/inventory/vendor/:vendorId). Manual sync
  // button — still here for an on-demand pull; fetchProducts() above now
  // also does this automatically on load/refresh. Confirmed response
  // shape from a live call:
  //   [{ _id, vendorId: {...}, variantId: {...}, productId: {...},
  //      stock, maxQty, isActive, stockStatus, createdAt, updatedAt }, ...]
  // productId/variantId are POPULATED OBJECTS here — mergeInventoryRows
  // now unwraps them with idStr() instead of stringifying the object.
  const syncInventoryFromVendor = async () => {
    if (!vendorIdFromStorage) return;
    setInventorySyncing(true);
    setProductsError("");
    try {
      const res = await productsApi.inventoryByVendor(vendorIdFromStorage);
      const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data?.inventory ?? []);
      setCatalog((prev) => mergeInventoryRows(prev, rows));
      setSuccessMsg("Inventory synced from server.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Failed to sync inventory. Check the /products/inventory/vendor/:vendorId response shape.");
    } finally {
      setInventorySyncing(false);
    }
  };

  const visibleProducts = useMemo(
    () => catalog.filter((p) => {
      const productVendorId = typeof p.vendorId === "object" && p.vendorId !== null
        ? p.vendorId._id
        : p.vendorId;

      const matchV = scopeToOwnVendor
        ? productVendorId === vendorIdFromStorage
        : (vendorId === "all" || productVendorId === vendorId);

      const matchS = statusFilter === "All" || normStatus(p.status ?? "Active") === normStatus(statusFilter);

      const productCategoryId = idStr(p.categoryId);
      const matchC = !categoryFilter || productCategoryId === idStr(categoryFilter);

      const { stock } = deriveProductMetrics(p);
      const matchI = matchesInventoryLevel(stock, inventoryFilter);

      return matchV && matchS && matchC && matchI;
    }),
    [catalog, vendorId, statusFilter, scopeToOwnVendor, vendorIdFromStorage, categoryFilter, inventoryFilter]
  );

  const pagedProducts  = visibleProducts.slice((page - 1) * pageSize, page * pageSize);
  const updatePageSize = (size) => { setPageSize(size); setPage(1); };

  // Filter out any product without a usable id so selection state never
  // holds `undefined`/`null` entries that would otherwise slip into a
  // bulk request payload.
  const pagedIds = pagedProducts.map((p) => p._id ?? p.id).filter(Boolean);
  const allPagedSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPagedSelected) {
        pagedIds.forEach((id) => next.delete(id));
      } else {
        pagedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const id = deleteTarget._id ?? deleteTarget.id;
      await productsApi.remove(id);
      setCatalog((prev) => prev.filter((p) => (p._id ?? p.id) !== id));
      setSuccessMsg("Product deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      console.error("Delete failed:", e.response?.status, e.response?.data ?? e.message);
      setProductsError(
        e.response?.data?.message
          || (e.response?.status ? `Failed to delete product (server said: ${e.response.status}).` : null)
          || e.message
          || "Failed to delete product. Please try again."
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const runBulkStatusUpdate = async (status) => {
    const ids = Array.from(selectedIds).filter(Boolean);
    if (!ids.length) {
      setProductsError("No valid product IDs selected — try reselecting the rows.");
      return;
    }
    setBulkBusy(true);
    setProductsError("");
    try {
      await productsApi.bulkUpdate(ids, { status });
      setCatalog((prev) => prev.map((p) => (ids.includes(p._id ?? p.id) ? { ...p, status } : p)));
      setSuccessMsg(`${ids.length} product(s) updated to ${status}.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      clearSelection();
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds).filter(Boolean);
    if (!ids.length) {
      setProductsError("No valid product IDs selected — try reselecting the rows.");
      return;
    }
    setBulkDeleting(true);
    setProductsError("");
    try {
      await productsApi.bulkDelete(ids);
      setCatalog((prev) => prev.filter((p) => !ids.includes(p._id ?? p.id)));
      setSuccessMsg(`${ids.length} product(s) deleted.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      clearSelection();
    } catch (e) {
      setProductsError(e.response?.data?.message || e.message || "Bulk delete failed.");
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const runProductAction = async (product, type) => {
    const id = product._id ?? product.id;
    setActionState({ id, type });
    setProductsError("");

    try {
      let res;
      if (type === "publish") res = await productsApi.publish(id);
      else if (type === "archive") res = await productsApi.archive(id);
      else if (type === "duplicate") res = await productsApi.duplicate(id);

      const returned = res?.data?.product ?? res?.data?.data ?? res?.data ?? null;

      if (type === "duplicate") {
        const newProduct = returned && typeof returned === "object" && (returned._id || returned.id)
          ? returned
          : null;
        if (newProduct) {
          setCatalog((prev) => [newProduct, ...prev]);
        } else {
          await fetchProducts();
        }
        setSuccessMsg("Product duplicated successfully!");
      } else {
        const newStatus =
          (returned && typeof returned === "object" && returned.status) ||
          (type === "publish" ? "Active" : "Suppressed");
        setCatalog((prev) =>
          prev.map((p) => ((p._id ?? p.id) === id ? { ...p, status: newStatus } : p))
        );
        setSuccessMsg(type === "publish" ? "Product published successfully!" : "Product archived successfully!");
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e) {
      setProductsError(
        e.response?.data?.message || e.message || `Failed to ${type} product. Please try again.`
      );
    } finally {
      setActionState({ id: null, type: null });
    }
  };

  const catalogCategoryFacets = useMemo(() => {
    const seen = new Map();
    catalog.forEach((p) => {
      const raw = p.categoryId;
      const id = idStr(raw);
      if (!id || seen.has(id)) return;
      const name = (raw && typeof raw === "object" ? raw.name : null) ?? categoryLookup[id] ?? p.category ?? id;
      seen.set(id, { _id: id, name });
    });
    return Array.from(seen.values());
  }, [catalog, categoryLookup]);

  const facetCategories = catalogCategoryFacets;
  const facetInventoryLevels = ["low", "medium", "high"];

  return (
    <div className="space-y-5">

      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {bulkDeleteOpen && (
        <BulkDeleteModal
          count={selectedIds.size}
          onCancel={() => setBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
          deleting={bulkDeleting}
        />
      )}

      {viewOpen && (
        <ViewModal
          loading={viewLoading}
          error={viewError}
          payload={viewPayload}
          fallbackName={viewFallback}
          onClose={closeView}
          onRefresh={refreshView}
        />
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-control border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">
          <span className="text-base">✓</span>
          {successMsg}
        </div>
      )}

      <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">Inventory command center</p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">Products and catalog</h1>
            <p className="text-sm text-slate-500">
              {scopeToOwnVendor
                ? "Your listings — stock health, ASIN status, and catalog ownership."
                : "Monitor vendor listings, stock health, ASIN status, and catalog ownership."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {!scopeToOwnVendor && (
              <select
                value={vendorId}
                onChange={(e) => { setVendorId(e.target.value); setPage(1); }}
                className="rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
              >
                <option value="all">All vendors</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search catalog, slug… (2+ chars searches server)"
                className="w-full rounded-control border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 sm:w-80"
              />
            </div>

            {/* endpoint #17 sync button, vendor-scoped sessions only */}
            {scopeToOwnVendor && (
              <button
                onClick={syncInventoryFromVendor}
                disabled={inventorySyncing}
                title="Pull latest stock numbers from /products/inventory/vendor/:vendorId"
                className="inline-flex items-center justify-center gap-2 rounded-control border border-slate-300 px-4 py-2 text-sm font-bold text-ink-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {inventorySyncing ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-ink-700" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Sync inventory
              </button>
            )}

            <button
              onClick={() => navigate("/vendor/products/add")}
              className="inline-flex items-center justify-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-600 transition-colors"
            >
              <PackagePlus size={17} /> Add listing
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Visible listings"  value={visibleProducts.length}                                        helper="catalog records in view"   icon={Eye}           tone="blue"   />
        <MetricCard
          label="Low stock"
          value={visibleProducts.filter((p) => deriveProductMetrics(p).stock < 15).length}
          helper="needs replenishment"
          icon={AlertTriangle}
          tone="orange"
        />
        <MetricCard label="Suppressed"        value={visibleProducts.filter((p) => normStatus(p.status) === "suppressed").length} helper="requires catalog action" icon={PackageCheck}  tone="red"    />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-control border border-amber-200 bg-amber-50 px-5 py-3">
          <span className="text-sm font-bold text-amber-700">{selectedIds.size} selected</span>
          <button
            onClick={() => runBulkStatusUpdate("Active")}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 rounded-control border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <CheckCircle size={13} /> Publish
          </button>
          <button
            onClick={() => runBulkStatusUpdate("Suppressed")}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 rounded-control border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
          >
            <ArchiveIcon size={13} /> Archive
          </button>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 rounded-control border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={13} /> Delete
          </button>
          {bulkBusy && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />}
          <button onClick={clearSelection} className="ml-auto text-xs text-amber-500 hover:underline">Clear selection</button>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-ink-950">Marketplace catalog</h2>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-control border px-3 py-2 text-sm font-medium transition-colors
              ${showFilters ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-300 hover:bg-slate-50"}`}
          >
            <SlidersHorizontal size={16} /> Filters
            {(statusFilter !== "All" || categoryFilter || inventoryFilter) && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                {[statusFilter !== "All", !!categoryFilter, !!inventoryFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</span>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors
                    ${statusFilter === s
                      ? "border-amber-500 bg-amber-500 text-ink-950"
                      : "border-slate-200 bg-white text-ink-700 hover:border-amber-500 hover:text-amber-700"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {facetCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="rounded-control border border-slate-300 px-2 py-1 text-xs outline-none focus:border-amber-500"
                >
                  <option value="">All</option>
                  {facetCategories.map((c) => (
                    <option key={c._id ?? c.id ?? c} value={c._id ?? c.id ?? c}>{c.name ?? c}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Inventory</span>
              <select
                value={inventoryFilter}
                onChange={(e) => { setInventoryFilter(e.target.value); setPage(1); }}
                className="rounded-control border border-slate-300 px-2 py-1 text-xs outline-none focus:border-amber-500"
              >
                <option value="">All</option>
                {facetInventoryLevels.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>

            {(statusFilter !== "All" || categoryFilter || inventoryFilter) && (
              <button
                onClick={() => { setStatusFilter("All"); setCategoryFilter(""); setInventoryFilter(""); setPage(1); }}
                className="ml-auto text-xs text-slate-400 hover:text-ink-800 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-white">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPagedSelected}
                    onChange={toggleSelectAllOnPage}
                    className="h-4 w-4 rounded-control border-slate-300"
                  />
                </th>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Vendor</th>
                <th className="px-5 py-3 font-semibold">Inventory</th>
                <th className="px-5 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {productsLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500 mr-2 align-middle" />
                    Loading products…
                  </td>
                </tr>
              )}

              {!productsLoading && productsError && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-red-500">
                    ⚠ {productsError}
                  </td>
                </tr>
              )}

              {!productsLoading && !productsError && pagedProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                    No products found.
                  </td>
                </tr>
              )}

              {!productsLoading && !productsError && pagedProducts.map((p) => {
                const displayName     = p.productName ?? p.name ?? "—";
                const displayStatus   = p.status ?? "Active";
                const displayImage    = p.image ?? p.images?.[0] ?? p.variants?.[0]?.images?.[0] ?? "";
                const displayAsin     = p.asin ?? p.sku ?? p.variants?.[0]?.sku ?? "—";
                const displayCategory = (p.categoryId && typeof p.categoryId === "object" ? p.categoryId.name : null)
                  ?? categoryLookup[idStr(p.categoryId)]
                  ?? p.category
                  ?? "—";
                const productId       = p._id ?? p.id;
                const isPublished     = normStatus(displayStatus) === "active";
                const isBusy          = actionState.id === productId;
                const isChecked       = selectedIds.has(productId);

                const { stock: displayStock } = deriveProductMetrics(p);

                return (
                  <tr key={productId} className={`hover:bg-surface ${isChecked ? "bg-amber-50/40" : ""}`}>

                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(productId)}
                        className="h-4 w-4 rounded-control border-slate-300"
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {displayImage ? (
                          <img src={displayImage} alt={displayName} className="h-12 w-12 rounded-control object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className="h-12 w-12 rounded-control bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-300 text-xs">N/A</div>
                        )}
                        <div>
                          <p className="font-bold text-ink-950 max-w-[180px] truncate">{displayName}</p>
                          <p className="text-xs text-slate-500">{displayAsin} · {displayCategory}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium">{vendorName(p.vendorId)}</td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${stockClass({ stock: displayStock, status: displayStatus })}`}>
                        {displayStock < 15 && <AlertTriangle size={13} />}
                        {displayStatus} · {displayStock}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openView(p)}
                          title="View product details"
                          className="flex h-8 w-8 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye size={14} />
                        </button>

                        {isPublished ? (
                          <button
                            onClick={() => runProductAction(p, "archive")}
                            disabled={isBusy}
                            title="Archive product"
                            className="flex h-8 w-8 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy && actionState.type === "archive" ? (
                              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
                            ) : (
                              <ArchiveIcon size={14} />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => runProductAction(p, "publish")}
                            disabled={isBusy}
                            title="Publish product"
                            className="flex h-8 w-8 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy && actionState.type === "publish" ? (
                              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-600" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => runProductAction(p, "duplicate")}
                          disabled={isBusy}
                          title="Duplicate product"
                          className="flex h-8 w-8 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBusy && actionState.type === "duplicate" ? (
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>

                        <button
                          onClick={() => openView(p)}
                          title="Manage inventory"
                          className="flex h-8 w-8 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                        >
                          <Boxes size={14} />
                        </button>

                        <button
                          onClick={() => navigate(`/vendor/products/${productId}/edit`)}
                          title="Edit product"
                          className="flex h-8 w-8 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-amber-500 hover:text-amber-700 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Delete product"
                          className="flex h-8 w-8 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:border-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>

        <DataPager
          total={visibleProducts.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      </div>

    </div>
  );
}