import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X, Trash2, Pencil, AlertCircle } from "lucide-react";
import { getCurrentSession } from "../../config/localAuth"; // adjust path if different in your project

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

// Tried in order until one responds with a usable list.
// If your real category-list route is known, put it FIRST and delete the rest.
const CATEGORY_LIST_ENDPOINTS = [
  "/categories",
  "/category",
  "/category/all",
  "/admin/category",
];

// Tried in order until one responds with a usable list, scoped to the selected category.
// If your real subcategory-list route is known, put it FIRST and delete the rest.
function subcategoryListEndpoints(categoryId) {
  return [
    `/subcategories`, // real route: fetch all, filter client-side by categoryId
    `/subcategories/category/${categoryId}`,
    `/subcategories?categoryId=${categoryId}`,
    `/subcategories/by-category/${categoryId}`,
    `/subcategory/category/${categoryId}`,
  ];
}

// Tried in order until one responds with a usable list, scoped to the selected subcategory.
// If your real sub-to-subcategory-list route is known, put it FIRST and delete the rest.
function subtosubcategoryListEndpoints(subcategoryId) {
  return [
    `/subtosubcategories`, // real route: fetch all, filter client-side by subcategoryId
    `/subtosubcategories/subcategory/${subcategoryId}`,
    `/subtosubcategories?subcategoryId=${subcategoryId}`,
    `/subtosubcategories/by-subcategory/${subcategoryId}`,
    `/subtosubcategory/subcategory/${subcategoryId}`,
  ];
}

const ATTRIBUTE_TYPE_OPTIONS = [
  { value: "dropdown", label: "Dropdown" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" },
  { value: "color", label: "Color" },
  { value: "multiselect", label: "Multi-select" },
];

const OPTIONS_TYPES = ["dropdown", "multiselect", "color"]; // types that need an options[] list

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { success: false, message: text || "Invalid server response" };
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function extractList(data, keys = []) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return [];
}

export default function Attribute() {
  const session = getCurrentSession?.() || null;

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryFetchFailed, setCategoryFetchFailed] = useState(false);
  const [manualCategoryId, setManualCategoryId] = useState("");

  const [subcategories, setSubcategories] = useState([]);
  const [subcategoryId, setSubcategoryId] = useState("");
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [subcategoryFetchFailed, setSubcategoryFetchFailed] = useState(false);
  const [manualSubcategoryId, setManualSubcategoryId] = useState("");

  const [subtosubcategories, setSubtosubcategories] = useState([]);
  const [subtosubcategoryId, setSubtosubcategoryId] = useState("");
  const [loadingSubtosubcategories, setLoadingSubtosubcategories] = useState(false);
  const [subtosubcategoryFetchFailed, setSubtosubcategoryFetchFailed] = useState(false);
  const [manualSubtosubcategoryId, setManualSubtosubcategoryId] = useState("");

  const [attributes, setAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [attributesError, setAttributesError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ---- value (options) modal state ----
  const [valueModal, setValueModal] = useState(null); // the attribute currently being edited, or null when closed
  const [valueOptions, setValueOptions] = useState([]);
  const [valueDraft, setValueDraft] = useState("");
  const [valueDefault, setValueDefault] = useState("");
  const [savingValues, setSavingValues] = useState(false);
  const [valueError, setValueError] = useState("");

  const emptyForm = {
    name: "",
    code: "",
    codeTouched: false,
    type: "dropdown",
    required: false,
    searchable: false,
    filterable: false,
    comparable: false,
    variantAttribute: false,
    visibleOnProductPage: true,
    unit: "",
    minLength: "",
    options: [],
    optionDraft: "",
    defaultValue: "",
    status: "active",
  };
  const [form, setForm] = useState(emptyForm);

  const showOptions = OPTIONS_TYPES.includes(form.type);
  const effectiveCategoryId = categoryId || manualCategoryId.trim();
  const effectiveSubcategoryId = subcategoryId || manualSubcategoryId.trim();
  const effectiveSubtosubcategoryId = subtosubcategoryId || manualSubtosubcategoryId.trim();

  /* ---------------- fetch categories (tries multiple known routes) ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setCategoryFetchFailed(false);

      for (const path of CATEGORY_LIST_ENDPOINTS) {
        try {
          const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
          if (!res.ok) continue;
          const data = await safeJson(res);
          const list = extractList(data, ["categories"]);
          if (list.length > 0) {
            if (!cancelled) setCategories(list);
            if (!cancelled) setLoadingCategories(false);
            return;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!cancelled) {
        setCategoryFetchFailed(true);
        setLoadingCategories(false);
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- fetch subcategories for selected category ---------------- */
  useEffect(() => {
    // reset downstream selections whenever the category changes
    setSubcategories([]);
    setSubcategoryId("");
    setManualSubcategoryId("");
    setSubcategoryFetchFailed(false);
    setSubtosubcategories([]);
    setSubtosubcategoryId("");
    setManualSubtosubcategoryId("");
    setSubtosubcategoryFetchFailed(false);

    if (!effectiveCategoryId) return;

    let cancelled = false;

    async function loadSubcategories() {
      setLoadingSubcategories(true);
      setSubcategoryFetchFailed(false);

      for (const path of subcategoryListEndpoints(effectiveCategoryId)) {
        try {
          const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
          if (!res.ok) continue;
          const data = await safeJson(res);
          let list = extractList(data, ["subcategories"]);
          // if we hit the "fetch all" fallback route, filter client-side by categoryId
          if (path === "/subcategories") {
            list = list.filter(
              (s) => (s.categoryId?._id || s.categoryId || s.category) === effectiveCategoryId
            );
          }
          if (list.length > 0) {
            if (!cancelled) setSubcategories(list);
            if (!cancelled) setLoadingSubcategories(false);
            return;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!cancelled) {
        setSubcategoryFetchFailed(true);
        setLoadingSubcategories(false);
      }
    }

    loadSubcategories();
    return () => {
      cancelled = true;
    };
  }, [effectiveCategoryId]);

  /* ---------------- fetch sub-to-subcategories for selected subcategory ---------------- */
  useEffect(() => {
    // reset downstream selection whenever the subcategory changes
    setSubtosubcategories([]);
    setSubtosubcategoryId("");
    setManualSubtosubcategoryId("");
    setSubtosubcategoryFetchFailed(false);

    if (!effectiveSubcategoryId) return;

    let cancelled = false;

    async function loadSubtosubcategories() {
      setLoadingSubtosubcategories(true);
      setSubtosubcategoryFetchFailed(false);

      for (const path of subtosubcategoryListEndpoints(effectiveSubcategoryId)) {
        try {
          const res = await fetch(`${API_BASE}${path}`, { headers: getAuthHeaders() });
          if (!res.ok) continue;
          const data = await safeJson(res);
          let list = extractList(data, ["subtosubcategories"]);
          // if we hit the "fetch all" fallback route, filter client-side by subcategoryId
          if (path === "/subtosubcategories") {
            list = list.filter(
              (s) =>
                (s.subcategoryId?._id || s.subcategoryId || s.subcategory) ===
                effectiveSubcategoryId
            );
          }
          if (list.length > 0) {
            if (!cancelled) setSubtosubcategories(list);
            if (!cancelled) setLoadingSubtosubcategories(false);
            return;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!cancelled) {
        setSubtosubcategoryFetchFailed(true);
        setLoadingSubtosubcategories(false);
      }
    }

    loadSubtosubcategories();
    return () => {
      cancelled = true;
    };
  }, [effectiveSubcategoryId]);

  /* ---------------- fetch attributes for selected category ---------------- */
  useEffect(() => {
    if (!effectiveCategoryId) {
      setAttributes([]);
      return;
    }
    let cancelled = false;

    async function loadAttributes() {
      setLoadingAttributes(true);
      setAttributesError("");
      try {
        const res = await fetch(
          `${API_BASE}/categoryattribute/category/${effectiveCategoryId}`,
          { headers: getAuthHeaders() }
        );
        const data = await safeJson(res);
        if (!res.ok) {
          throw new Error(data?.message || `Failed to load attributes (${res.status})`);
        }
        const list = extractList(data);
        if (!cancelled) setAttributes(list);
      } catch (err) {
        if (!cancelled) {
          setAttributes([]);
          setAttributesError(err.message || "Failed to load attributes");
        }
      } finally {
        if (!cancelled) setLoadingAttributes(false);
      }
    }

    loadAttributes();
    return () => {
      cancelled = true;
    };
  }, [effectiveCategoryId]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function handleNameChange(value) {
    setForm((f) => ({
      ...f,
      name: value,
      code: f.codeTouched ? f.code : slugify(value),
    }));
  }

  function handleTypeChange(value) {
    setForm((f) => ({
      ...f,
      type: value,
      options: OPTIONS_TYPES.includes(value) ? f.options : [],
      defaultValue: "",
    }));
  }

  function addOption() {
    const val = form.optionDraft.trim();
    if (!val) return;
    if (form.options.includes(val)) {
      setForm((f) => ({ ...f, optionDraft: "" }));
      return;
    }
    setForm((f) => ({ ...f, options: [...f.options, val], optionDraft: "" }));
  }

  function removeOption(opt) {
    setForm((f) => ({
      ...f,
      options: f.options.filter((o) => o !== opt),
      defaultValue: f.defaultValue === opt ? "" : f.defaultValue,
    }));
  }

  function handleEdit(attr) {
    setEditingId(attr._id);

    // populate the category / subcategory / sub-to-subcategory chain so the
    // dropdowns above reflect what this attribute is actually attached to
    const attrCategoryId = attr.categoryId?._id || attr.categoryId || "";
    const attrSubcategoryId = attr.subcategoryId?._id || attr.subcategoryId || "";
    const attrSubtosubcategoryId = attr.subtosubcategoryId?._id || attr.subtosubcategoryId || "";

    if (attrCategoryId && attrCategoryId !== effectiveCategoryId) {
      setCategoryId(attrCategoryId);
    }
    if (attrSubcategoryId) {
      setManualSubcategoryId(attrSubcategoryId);
      setSubcategoryId(attrSubcategoryId);
    }
    if (attrSubtosubcategoryId) {
      setManualSubtosubcategoryId(attrSubtosubcategoryId);
      setSubtosubcategoryId(attrSubtosubcategoryId);
    }

    setForm({
      name: attr.name || "",
      code: attr.code || slugify(attr.name || ""),
      codeTouched: true,
      type: attr.type || "dropdown",
      required: !!attr.required,
      searchable: !!attr.searchable,
      filterable: !!attr.filterable,
      comparable: !!attr.comparable,
      variantAttribute: !!attr.variantAttribute,
      visibleOnProductPage: attr.visibleOnProductPage !== false,
      unit: attr.unit || "",
      minLength: attr.validation?.minLength ?? "",
      options: attr.options || [],
      optionDraft: "",
      defaultValue: attr.defaultValue || "",
      status: attr.status || "active",
    });
    setError("");
  }

  async function handleDelete(id) {
    if (!confirm("Delete this attribute?")) return;
    try {
      const res = await fetch(`${API_BASE}/categoryattribute/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to delete attribute");
      }
      setAttributes((prev) => prev.filter((a) => a._id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      alert(err.message || "Failed to delete attribute");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!effectiveCategoryId) {
      setError("Please select (or enter) a category first.");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (showOptions && form.options.length === 0) {
      setError("Add at least one option for this attribute type.");
      return;
    }

    const payload = {
      categoryId: effectiveCategoryId,
      subcategoryId: effectiveSubcategoryId || undefined,
      subtosubcategoryId: effectiveSubtosubcategoryId || undefined,
      name: form.name.trim(),
      code: form.code.trim() || slugify(form.name),
      type: form.type,
      required: form.required,
      searchable: form.searchable,
      filterable: form.filterable,
      comparable: form.comparable,
      variantAttribute: form.variantAttribute,
      visibleOnProductPage: form.visibleOnProductPage,
      unit: form.unit.trim(),
      validation: form.minLength !== "" ? { minLength: Number(form.minLength) } : {},
      options: showOptions ? form.options : [],
      defaultValue: form.defaultValue,
      status: form.status,
    };

    setSubmitting(true);
    try {
      const url = editingId
        ? `${API_BASE}/categoryattribute/${editingId}`
        : `${API_BASE}/categoryattribute/add`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to save attribute (${res.status})`);
      }

      const saved = data.data || data;
      setAttributes((prev) =>
        editingId
          ? prev.map((a) => (a._id === editingId ? saved : a))
          : [...prev, saved]
      );
      resetForm();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- value (options) modal handlers ---------------- */

  function openValueModal(attr) {
    setValueModal(attr);
    setValueOptions(attr.options || []);
    setValueDefault(attr.defaultValue || "");
    setValueDraft("");
    setValueError("");
  }

  function closeValueModal() {
    if (savingValues) return; // don't allow closing mid-save
    setValueModal(null);
    setValueOptions([]);
    setValueDraft("");
    setValueDefault("");
    setValueError("");
  }

  function addValueOption() {
    const val = valueDraft.trim();
    if (!val) return;
    if (valueOptions.includes(val)) {
      setValueDraft("");
      return;
    }
    setValueOptions((prev) => [...prev, val]);
    setValueDraft("");
  }

  function removeValueOption(opt) {
    setValueOptions((prev) => prev.filter((o) => o !== opt));
    setValueDefault((prev) => (prev === opt ? "" : prev));
  }

  async function handleSaveValues() {
    if (!valueModal) return;
    setValueError("");

    if (valueOptions.length === 0) {
      setValueError("Add at least one value.");
      return;
    }

    const payload = {
      categoryId: valueModal.categoryId?._id || valueModal.categoryId,
      subcategoryId: valueModal.subcategoryId?._id || valueModal.subcategoryId || undefined,
      subtosubcategoryId:
        valueModal.subtosubcategoryId?._id || valueModal.subtosubcategoryId || undefined,
      name: valueModal.name,
      code: valueModal.code,
      type: valueModal.type,
      required: !!valueModal.required,
      searchable: !!valueModal.searchable,
      filterable: !!valueModal.filterable,
      comparable: !!valueModal.comparable,
      variantAttribute: !!valueModal.variantAttribute,
      visibleOnProductPage: valueModal.visibleOnProductPage !== false,
      unit: valueModal.unit || "",
      validation: valueModal.validation || {},
      options: valueOptions,
      defaultValue: valueDefault,
      status: valueModal.status || "active",
    };

    setSavingValues(true);
    try {
      const res = await fetch(`${API_BASE}/categoryattribute/${valueModal._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed to save values (${res.status})`);
      }

      const saved = data.data || data;
      setAttributes((prev) =>
        prev.map((a) => (a._id === valueModal._id ? { ...a, ...saved } : a))
      );
      closeValueModal();
    } catch (err) {
      setValueError(err.message || "Failed to save values");
    } finally {
      setSavingValues(false);
    }
  }

  const selectedCategoryName = useMemo(
    () => categories.find((c) => c._id === categoryId)?.name || "",
    [categories, categoryId]
  );

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Category Attributes</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Define custom attributes (Brand, Size, RAM, etc.) for a category.
        </p>

        {/* Category / Subcategory / Sub-to-subcategory selectors */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
          {/* Category */}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Category</label>
            {!categoryFetchFailed ? (
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  resetForm();
                }}
                className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {loadingCategories ? "Loading categories..." : "Select a category"}
                </option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5 rounded-control bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Couldn't auto-load categories. Paste a category ID below, and update{" "}
                    <code>CATEGORY_LIST_ENDPOINTS</code> with your real route.
                  </span>
                </div>
                <input
                  type="text"
                  value={manualCategoryId}
                  onChange={(e) => {
                    setManualCategoryId(e.target.value);
                    resetForm();
                  }}
                  placeholder="Paste category _id"
                  className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Subcategory */}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Subcategory</label>
            {!effectiveCategoryId ? (
              <select disabled className="w-full rounded-control border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400">
                <option>Select a category first</option>
              </select>
            ) : !subcategoryFetchFailed ? (
              <select
                value={subcategoryId}
                onChange={(e) => {
                  setSubcategoryId(e.target.value);
                  setManualSubcategoryId("");
                }}
                className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {loadingSubcategories ? "Loading subcategories..." : "Select a subcategory (optional)"}
                </option>
                {subcategories.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5 rounded-control bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Couldn't auto-load subcategories. Paste a subcategory ID below, and update{" "}
                    <code>subcategoryListEndpoints()</code> with your real route.
                  </span>
                </div>
                <input
                  type="text"
                  value={manualSubcategoryId}
                  onChange={(e) => setManualSubcategoryId(e.target.value)}
                  placeholder="Paste subcategory _id (optional)"
                  className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Sub-to-subcategory */}
          <div className="space-y-2">
            <label className="block text-sm font-medium mb-1">Sub-to-subcategory</label>
            {!effectiveSubcategoryId ? (
              <select disabled className="w-full rounded-control border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-400">
                <option>Select a subcategory first</option>
              </select>
            ) : !subtosubcategoryFetchFailed ? (
              <select
                value={subtosubcategoryId}
                onChange={(e) => {
                  setSubtosubcategoryId(e.target.value);
                  setManualSubtosubcategoryId("");
                }}
                className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {loadingSubtosubcategories
                    ? "Loading..."
                    : "Select a sub-to-subcategory (optional)"}
                </option>
                {subtosubcategories.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5 rounded-control bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Couldn't auto-load sub-to-subcategories. Paste an ID below, and update{" "}
                    <code>subtosubcategoryListEndpoints()</code> with your real route.
                  </span>
                </div>
                <input
                  type="text"
                  value={manualSubtosubcategoryId}
                  onChange={(e) => setManualSubtosubcategoryId(e.target.value)}
                  placeholder="Paste sub-to-subcategory _id (optional)"
                  className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {!effectiveCategoryId ? (
          <div className="rounded-card border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-400">
            Select a category to view or add its attributes.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
            {/* Attributes table */}
            <div className="bg-white border border-neutral-200 rounded-card overflow-hidden h-fit">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-100 text-left text-neutral-600">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Options</th>
                    <th className="px-4 py-3 font-medium">Flags</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAttributes && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-neutral-400">
                        <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                        Loading attributes{selectedCategoryName ? ` for ${selectedCategoryName}` : ""}...
                      </td>
                    </tr>
                  )}
                  {!loadingAttributes && attributesError && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-red-500 text-xs">
                        {attributesError}
                      </td>
                    </tr>
                  )}
                  {!loadingAttributes && !attributesError && attributes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-neutral-400">
                        No attributes yet for this category.
                      </td>
                    </tr>
                  )}
                  {!loadingAttributes &&
                    !attributesError &&
                    attributes.map((attr) => {
                      const canHaveValues = OPTIONS_TYPES.includes(attr.type);
                      return (
                        <tr key={attr._id} className="border-t border-neutral-200 align-top">
                          <td className="px-4 py-3 font-medium">
                            {canHaveValues ? (
                              <button
                                type="button"
                                onClick={() => openValueModal(attr)}
                                className="text-blue-600 hover:underline underline-offset-2"
                                title="Click to add / manage values"
                              >
                                {attr.name}
                              </button>
                            ) : (
                              attr.name
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-600">{attr.code}</td>
                          <td className="px-4 py-3 text-neutral-600">{attr.type}</td>
                          <td className="px-4 py-3 text-neutral-500">
                            {(attr.options || []).length > 0 ? (
                              attr.options.join(", ")
                            ) : (
                              <span className="italic text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-neutral-500 text-xs">
                            {[
                              attr.required && "Required",
                              attr.searchable && "Searchable",
                              attr.filterable && "Filterable",
                              attr.comparable && "Comparable",
                              attr.variantAttribute && "Variant",
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                                attr.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {attr.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-neutral-500">
                              <button
                                onClick={() => handleEdit(attr)}
                                className="hover:text-blue-600"
                                title="Edit"
                                type="button"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(attr._id)}
                                className="hover:text-red-600"
                                title="Delete"
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Add / edit form */}
            <div className="bg-white border border-neutral-200 rounded-card p-5 h-fit">
              <h2 className="text-base font-semibold mb-4">
                {editingId ? "Edit attribute" : "Add attribute"}
                {!editingId && selectedCategoryName ? ` to ${selectedCategoryName}` : ""}
              </h2>

              {error && (
                <div className="mb-3 rounded-control bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Brand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: slugify(e.target.value), codeTouched: true }))
                    }
                    className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. brand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ATTRIBUTE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {showOptions && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Options</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.optionDraft}
                        onChange={(e) => setForm((f) => ({ ...f, optionDraft: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addOption();
                          }
                        }}
                        className="flex-1 rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. Apple"
                      />
                      <button
                        type="button"
                        onClick={addOption}
                        className="rounded-control border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {form.options.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {form.options.map((opt, idx) => (
                          <span
                            key={`${opt}-${idx}`}
                            className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs"
                          >
                            {opt}
                            <button
                              type="button"
                              onClick={() => removeOption(opt)}
                              className="text-neutral-400 hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Default value</label>
                  {showOptions ? (
                    <select
                      value={form.defaultValue}
                      onChange={(e) => setForm((f) => ({ ...f, defaultValue: e.target.value }))}
                      className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {form.options.map((opt, idx) => (
                        <option key={`${opt}-${idx}`} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.defaultValue}
                      onChange={(e) => setForm((f) => ({ ...f, defaultValue: e.target.value }))}
                      className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <input
                      type="text"
                      value={form.unit}
                      onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                      className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. GB"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Min length</label>
                    <input
                      type="number"
                      min={0}
                      value={form.minLength}
                      onChange={(e) => setForm((f) => ({ ...f, minLength: e.target.value }))}
                      className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["required", "Required"],
                    ["searchable", "Searchable"],
                    ["filterable", "Filterable"],
                    ["comparable", "Comparable"],
                    ["variantAttribute", "Variant attribute"],
                    ["visibleOnProductPage", "Visible on product page"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="h-4 w-4 rounded-control border-neutral-300"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-control bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingId ? "Update attribute" : "Add attribute"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-control border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Manage values modal ---------------- */}
      {valueModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeValueModal}
        >
          <div
            className="w-full max-w-md rounded-card bg-white shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">Manage values</h3>
                <p className="text-xs text-neutral-500">
                  {valueModal.name} <span className="text-neutral-400">({valueModal.code})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeValueModal}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {valueError && (
                <div className="rounded-control bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                  {valueError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Add a value</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addValueOption();
                      }
                    }}
                    placeholder="e.g. Xiaomi"
                    className="flex-1 rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addValueOption}
                    className="rounded-control border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Current values ({valueOptions.length})
                </label>
                {valueOptions.length === 0 ? (
                  <p className="text-xs italic text-neutral-400">
                    No values yet — add one above.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {valueOptions.map((opt, idx) => (
                      <span
                        key={`${opt}-${idx}`}
                        className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs"
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => removeValueOption(opt)}
                          className="text-neutral-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Default value</label>
                <select
                  value={valueDefault}
                  onChange={(e) => setValueDefault(e.target.value)}
                  className="w-full rounded-control border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {valueOptions.map((opt, idx) => (
                    <option key={`${opt}-${idx}`} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
              <button
                type="button"
                onClick={closeValueModal}
                disabled={savingValues}
                className="rounded-control border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveValues}
                disabled={savingValues}
                className="flex items-center gap-2 rounded-control bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingValues && <Loader2 className="h-4 w-4 animate-spin" />}
                Save values
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}