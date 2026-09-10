import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import * as categoryApi from "../../services/categoryApi";
import { getErrorMessage } from "../../services/apiClient";

// ── Category / Sub-category response normalization ──────────────────────
// Backends here are inconsistent about response shape (flat array vs
// { categories: [...] } vs { data: [...] }) and field names (name vs
// categoryName vs title), so normalize everything the same way the
// Categories page does.
const readCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeCategory = (category) => {
  if (!category) return category;
  return {
    ...category,
    name: category.name || category.categoryName || category.title || "",
  };
};

const readSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subCategories)) return payload.subCategories;
  if (Array.isArray(payload?.subcategories)) return payload.subcategories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeSubCategory = (sub) => {
  if (!sub) return sub;
  return {
    ...sub,
    name: sub.name || sub.subCategoryName || sub.title || "",
  };
};

// categoryId and subCategoryId may be populated objects or plain ID strings
const getName = (field) => (typeof field === "object" && field !== null ? field.name : null);
const getId = (field) => (typeof field === "object" && field !== null ? field._id : field);

// The API stores the display label in `categoryvalue` (not `name`).
// This helper resolves it from whichever field is present.
const getDisplayName = (item) => item?.categoryvalue || item?.name || "";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/* ─────────────────────── Toast ─────────────────────── */
function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-card px-5 py-3.5 text-sm font-medium shadow-lg text-white transition-all ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {toast.message}
    </div>
  );
}

/* ─────────────────────── Modal ─────────────────────── */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg rounded-card bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="rounded-control p-1 hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────── SelectField ─────────────────────── */
function SelectField({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none rounded-control border border-slate-300 bg-white px-3 py-2.5 pr-9 text-sm text-slate-800 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o._id || o.id} value={o._id || o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

/* ─────────────────────── SubToSubForm ─────────────────────── */
/**
 * API contract (POST /subtosubcategories/add & PUT /subtosubcategories/:id):
 *   categoryId      – ObjectId of the selected category
 *   subCategoryId   – ObjectId of the selected sub-category
 *   categoryvalue   – display name / label for this sub-to-sub entry  ← was wrongly sent as `name`
 *   subcategoryvalue– (optional) sub-category label string
 *   status          – "active" | "inactive"
 *
 * Category list  : GET /api/categories       (normalized via readCategories/normalizeCategory)
 * Sub-category list: GET /api/subcategories?categoryId=:id (normalized via readSubCategories/normalizeSubCategory)
 * Both require Authorization: Bearer <adminToken>.
 */
function SubToSubForm({ initial, categories, onSubmit, loading, submitLabel }) {
  const [form, setForm] = useState({
    categoryId: getId(initial?.categoryId) || "",
    subCategoryId: getId(initial?.subCategoryId) || "",
    // `categoryvalue` is the real display-name field the API expects
    categoryvalue: initial?.categoryvalue || initial?.name || "",
    subcategoryvalue: initial?.subcategoryvalue || "",
    status: initial?.status || "active",
  });

  const [subcategories, setSubcategories] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState("");

  // Fetch sub-categories whenever the parent category changes
  useEffect(() => {
    if (!form.categoryId) {
      setSubcategories([]);
      setSubError("");
      setForm((f) => ({ ...f, subCategoryId: "", subcategoryvalue: "" }));
      return;
    }
    setSubLoading(true);
    setSubError("");
    categoryApi
      .getSubCategories()
      .then((res) => {
        const all = readSubCategories(res).map(normalizeSubCategory);
        setSubcategories(all.filter((s) => getId(s.categoryId) === form.categoryId));
      })
      .catch((err) => {
        setSubcategories([]);
        setSubError(getErrorMessage(err, "Unable to load sub categories."));
      })
      .finally(() => setSubLoading(false));
  }, [form.categoryId]);

  // When a sub-category is chosen, also store its name in subcategoryvalue
  const handleSubCategoryChange = (id) => {
    const match = subcategories.find((s) => (s._id || s.id) === id);
    setForm((f) => ({
      ...f,
      subCategoryId: id,
      subcategoryvalue: match?.name || "",
    }));
  };

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      categoryId: form.categoryId,
      subCategoryId: form.subCategoryId,
      categoryvalue: form.categoryvalue,       // ← correct field name for the API
      subcategoryvalue: form.subcategoryvalue,
      status: form.status,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {subError && (
        <div className="flex items-center gap-2 rounded-control bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle size={14} />
          {subError}
        </div>
      )}

      <SelectField
        label="Category"
        value={form.categoryId}
        onChange={set("categoryId")}
        options={categories}
        placeholder="Select a category"
      />

      <SelectField
        label="Sub Category"
        value={form.subCategoryId}
        onChange={handleSubCategoryChange}
        options={subcategories}
        placeholder={
          subLoading
            ? "Loading…"
            : form.categoryId
            ? "Select a sub category"
            : "Select category first"
        }
        disabled={!form.categoryId || subLoading}
      />

      {/* categoryvalue is the label/name for this sub-to-sub entry */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          name="categoryvalue"
          value={form.categoryvalue}
          onChange={handle}
          required
          placeholder="e.g. Running Shoes"
          className="w-full rounded-control border border-slate-300 px-3 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Status toggle */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">Status</label>
        <div className="flex items-center gap-4">
          {["active", "inactive"].map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="radio"
                name="status"
                value={s}
                checked={form.status === s}
                onChange={handle}
                className="accent-amber-500"
              />
              <span className="capitalize">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-control bg-amber-500 px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-600 disabled:opacity-60 transition"
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────── DeleteModal ─────────────────────── */
function DeleteModal({ open, item, onConfirm, onClose, loading }) {
  return (
    <Modal open={open} title="Delete Sub-to-Sub Category" onClose={onClose}>
      <p className="text-sm text-slate-600">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-slate-800">"{getDisplayName(item)}"</span>? This action
        cannot be undone.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center gap-2 rounded-control bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Delete
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────── Pagination ─────────────────────── */
function Pagination({ currentPage, totalPages, pageSize, onPageChange, onPageSizeChange, totalItems }) {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>
          Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{" "}
          <span className="font-medium text-slate-700">{totalItems}</span> entries
        </span>
        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none rounded-control border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs text-slate-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-7 w-7 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
        >
          <ChevronLeft size={14} />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="flex h-7 w-7 items-center justify-center text-xs text-slate-400">
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`flex h-7 w-7 items-center justify-center rounded-control border text-xs font-medium transition ${
                page === currentPage
                  ? "border-amber-500 bg-amber-500 text-ink-950"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-control border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Page ─────────────────────── */
export default function SubToSubCategory() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const fetchItems = useCallback(() => {
    setLoading(true);
    categoryApi
      .getSubToSubCategories()
      .then((res) => {
        const list = Array.isArray(res) ? res : res.data || res.subtosubcategories || [];
        setItems(list);
      })
      .catch((err) => showToast(getErrorMessage(err, "Failed to load sub-to-sub categories"), "error"))
      .finally(() => setLoading(false));
  }, []);

  const fetchCategories = useCallback(() => {
    categoryApi
      .getCategories()
      .then((res) => {
        setCategories(readCategories(res).map(normalizeCategory));
      })
      .catch((err) => showToast(getErrorMessage(err, "Failed to load categories"), "error"));
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, [fetchCategories, fetchItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleAdd = async (form) => {
    setMutating(true);
    try {
      const res = await categoryApi.createSubToSubCategory(form);
      if (res.success === false || res.error) throw new Error(res.message || res.error);
      showToast("Sub-to-sub category added successfully");
      setAddOpen(false);
      fetchItems();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to add"), "error");
    } finally {
      setMutating(false);
    }
  };

  const handleEdit = async (form) => {
    setMutating(true);
    try {
      const res = await categoryApi.updateSubToSubCategory(editItem._id, form);
      if (res.success === false || res.error) throw new Error(res.message || res.error);
      showToast("Sub-to-sub category updated");
      setEditItem(null);
      fetchItems();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to update"), "error");
    } finally {
      setMutating(false);
    }
  };

  const handleDelete = async () => {
    setMutating(true);
    try {
      const res = await categoryApi.deleteSubToSubCategory(deleteItem._id);
      if (res.success === false || res.error) throw new Error(res.message || res.error);
      showToast("Deleted successfully");
      setDeleteItem(null);
      fetchItems();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to delete"), "error");
    } finally {
      setMutating(false);
    }
  };

  // Search across `categoryvalue` (the real name field), category name, sub-category name
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const catName = getName(item.categoryId) || "";
        const subName = getName(item.subCategoryId) || "";
        const displayName = getDisplayName(item);
        const q = search.toLowerCase();
        return (
          displayName.toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q) ||
          subName.toLowerCase().includes(q)
        );
      }),
    [items, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const uniqueCats = new Set(items.map((i) => getId(i.categoryId)).filter(Boolean)).size;
  const uniqueSubs = new Set(items.map((i) => getId(i.subCategoryId)).filter(Boolean)).size;

  // Status normalisation: API stores "active"/"inactive" strings or boolean
  const isActive = (item) => {
    if (typeof item.status === "boolean") return item.status;
    return String(item.status).toLowerCase() === "active";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-control bg-ink-950 text-amber-500">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sub-to-Sub Categories</h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage third-level category hierarchy</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchItems}
              className="flex items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-amber-600 transition shadow-sm"
            >
              <Plus size={16} />
              Add Sub-to-Sub Category
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: items.length, color: "bg-ink-950 text-white" },
            { label: "Categories Covered", value: uniqueCats, color: "bg-white text-slate-800 border border-slate-200" },
            { label: "Sub Categories Covered", value: uniqueSubs, color: "bg-white text-slate-800 border border-slate-200" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-card px-5 py-4 shadow-sm ${stat.color}`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className={`text-xs mt-0.5 ${stat.color.includes("131921") ? "text-slate-400" : "text-slate-500"}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category…"
              className="w-full rounded-control border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          {search && (
            <p className="text-sm text-slate-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="rounded-card border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-surface">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Sub Category</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Loader2 size={24} className="mx-auto animate-spin text-amber-500" />
                    <p className="mt-3 text-sm text-slate-500">Loading…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Layers size={32} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      {search ? "No results found" : "No sub-to-sub categories yet"}
                    </p>
                    {!search && (
                      <button
                        onClick={() => setAddOpen(true)}
                        className="mt-3 text-sm text-amber-500 hover:underline font-medium"
                      >
                        Add your first one →
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => (
                  <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                      {(safePage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {/* Use categoryvalue (the real name field) with fallback */}
                      {getDisplayName(item) || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        {getName(item.categoryId) || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {getName(item.subCategoryId) || item.subcategoryvalue || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          isActive(item)
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {isActive(item) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditItem(item)}
                          className="flex items-center gap-1.5 rounded-control border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="flex items-center gap-1.5 rounded-control border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && filtered.length > 0 && (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal open={addOpen} title="Add Sub-to-Sub Category" onClose={() => setAddOpen(false)}>
        <SubToSubForm
          categories={categories}
          onSubmit={handleAdd}
          loading={mutating}
          submitLabel="Add Category"
        />
      </Modal>

      <Modal open={!!editItem} title="Edit Sub-to-Sub Category" onClose={() => setEditItem(null)}>
        {editItem && (
          <SubToSubForm
            initial={editItem}
            categories={categories}
            onSubmit={handleEdit}
            loading={mutating}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      <DeleteModal
        open={!!deleteItem}
        item={deleteItem}
        onConfirm={handleDelete}
        onClose={() => setDeleteItem(null)}
        loading={mutating}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}