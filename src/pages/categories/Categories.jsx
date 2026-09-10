import { useEffect, useMemo, useState } from "react";
import {
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Image,
  Layers,
  List,
  PackageSearch,
  Plus,
  ShieldAlert,
  X,
  Pencil,
  Trash2,
  Search,
  Route,
  Tags,
  Tag,
} from "lucide-react";
import { products } from "../../data/marketplaceData";
import DataPager from "../../components/common/DataPager";
import MetricCard from "../../components/common/MetricCard";
import { isAuthError } from "../../services/apiClient";
import * as categoryApi from "../../services/categoryApi";

const readCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const readCategory = (payload) => {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.category) return payload.category;
  if (payload.result) return payload.result;
  if (payload._id || payload.id || payload.name || payload.categoryName) return payload;
  return null;
};

const categoryKey = (category) => category._id || category.id || category.name;

// Backend may return either `status: "active"/"inactive"` or `isActive: boolean`.
// Normalize every category coming from the API into a shape the UI can rely on,
// while keeping the original fields intact too.
const normalizeCategory = (category) => {
  if (!category) return category;
  const normalized = {
    ...category,
    name: category.name || category.categoryName || category.title || "",
    image: category.image || category.categoryImage || category.imageUrl || "",
    parentId:
      category.parentId ||
      category.parent ||
      category.parentCategory ||
      category.parent_id ||
      null,
    children: Array.isArray(category.children) ? category.children.map(normalizeCategory) : undefined,
  };
  if (normalized.status) return normalized;
  const status =
    typeof normalized.isActive === "boolean"
      ? normalized.isActive
        ? "active"
        : "inactive"
      : "inactive";
  return { ...normalized, status };
};

const statusClass = (status) => {
  if (status?.toLowerCase() === "active")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
};

const EMPTY_FORM = { name: "", image: "", status: "active", parentId: "" };

const AUTH_ERROR_MESSAGE =
  "Your session has expired or is invalid. Please log in again to manage categories.";

const categoryPayload = (form) => ({
  name: form.name.trim(),
  categoryName: form.name.trim(),
  title: form.name.trim(),
  image: form.image.trim(),
  isActive: form.status === "active",
  status: form.status,
  parentId: form.parentId || null,
  parent: form.parentId || null,
});

const createCategory = (form) => categoryApi.createCategory(categoryPayload(form));
const updateCategory = (id, form) => categoryApi.updateCategory(id, categoryPayload(form));
const deleteCategoryRequest = (id) => categoryApi.deleteCategory(id);
const fetchTreeRequest = () => categoryApi.getCategoryTree();
const fetchChildrenRequest = (id) => categoryApi.getCategoryChildren(id);
const fetchParentsRequest = (id) => categoryApi.getCategoryParents(id);

// ── Sub category API ────────────────────────────────────────────────────────

const readSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.subCategories)) return payload.subCategories;
  if (Array.isArray(payload?.subcategories)) return payload.subcategories;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const readSubCategory = (payload) => {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.subCategory) return payload.subCategory;
  if (payload.result) return payload.result;
  if (payload._id || payload.id || payload.name) return payload;
  return null;
};

const subCategoryKey = (sub) => sub._id || sub.id || sub.name;

// Wraps a subcategory as a leaf tree node so it can be merged into the
// category tree view alongside real nested categories.
const subCategoryToTreeNode = (sub) => ({
  _id: sub._id || sub.id,
  id: sub._id || sub.id,
  name: sub.name,
  status: sub.status,
  image: sub.image,
  hasChildren: false,
  isSubCategory: true,
  raw: sub,
});

// categoryId on a sub-category can come back as a plain id string OR a
// populated object like { _id, name } depending on the backend's population.
const subCategoryCatId = (val) =>
  val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "";

const normalizeSubCategory = (sub) => {
  if (!sub) return sub;
  const normalized = {
    ...sub,
    name: sub.name || sub.subCategoryName || sub.title || "",
    image: sub.image || sub.subCategoryImage || sub.imageUrl || "",
  };
  if (normalized.status) return normalized;
  const status =
    typeof normalized.isActive === "boolean"
      ? normalized.isActive
        ? "active"
        : "inactive"
      : "inactive";
  return { ...normalized, status };
};

const EMPTY_SUB_FORM = { categoryId: "", name: "", image: "", status: "active" };

const subCategoryPayload = (form) => ({
  categoryId: form.categoryId.trim(),
  name: form.name.trim(),
  image: form.image.trim() || "default.jpg",
  status: form.status,
  isActive: form.status === "active",
});

const createSubCategory = (form) => categoryApi.createSubCategory(subCategoryPayload(form));
const updateSubCategory = (id, form) => categoryApi.updateSubCategory(id, subCategoryPayload(form));
const deleteSubCategoryRequest = (id) => categoryApi.deleteSubCategory(id);

// ── Sub-to-sub category API ─────────────────────────────────────────────────

const readSubToSubCategories = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.subtosubcategories)) return payload.subtosubcategories;
  return [];
};

const readSubToSubCategory = (payload) => {
  if (!payload) return null;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.result) return payload.result;
  if (payload._id || payload.id) return payload;
  return null;
};

const subToSubKey = (item) => item._id || item.id;

// categoryId / subCategoryId on a sub-to-sub item can be a populated object
// or a plain id string, same pattern as subCategoryCatId above.
const subToSubRefId = (val) =>
  val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "";

// The API stores the display label in `categoryvalue` (matches SubToSubForm.jsx).
const normalizeSubToSub = (item) => {
  if (!item) return item;
  const normalized = { ...item, name: item.categoryvalue || item.name || "" };
  if (normalized.status) return normalized;
  const status =
    typeof normalized.isActive === "boolean"
      ? normalized.isActive
        ? "active"
        : "inactive"
      : "inactive";
  return { ...normalized, status };
};

// Wraps a sub-to-sub category as a leaf tree node, nested under its parent
// sub-category node (third level of the tree).
const subToSubToTreeNode = (item) => ({
  _id: item._id || item.id,
  id: item._id || item.id,
  name: item.categoryvalue || item.name,
  status: item.status,
  isSubToSub: true,
  raw: item,
});

const EMPTY_SUBSUB_FORM = { categoryId: "", subCategoryId: "", categoryvalue: "", status: "active" };

const subToSubPayload = (form) => ({
  categoryId: form.categoryId,
  subCategoryId: form.subCategoryId,
  categoryvalue: form.categoryvalue.trim(),
  status: form.status,
  isActive: form.status === "active",
});

const createSubToSub = (form) => categoryApi.createSubToSubCategory(subToSubPayload(form));
const updateSubToSub = (id, form) => categoryApi.updateSubToSubCategory(id, subToSubPayload(form));
const deleteSubToSubRequest = (id) => categoryApi.deleteSubToSubCategory(id);

// ── Tree node (recursive, 3 levels: category → sub category → sub-to-sub) ──
function TreeNode({
  node,
  depth,
  expandedIds,
  childrenCache,
  loadingIds,
  onToggle,
  onEdit,
  onDelete,
  onViewPath,
  onEditSub,
  onDeleteSub,
  onAddSubSub,
  onEditSubSub,
  onDeleteSubSub,
}) {
  const key = categoryKey(node);
  const isExpanded = expandedIds.has(key);
  const cachedChildren = childrenCache[key];
  // sub-to-sub nodes are always leaves; categories & sub-categories can expand
  const canExpand = !node.isSubToSub;
  const childList = cachedChildren || node.children || [];

  const icon = node.isSubToSub ? (
    <Tag size={13} className="shrink-0 text-slate-400" />
  ) : node.isSubCategory ? (
    <Tags size={14} className="shrink-0 text-slate-400" />
  ) : (
    <Box size={15} className="shrink-0 text-amber-700" />
  );

  const nameClass = node.isSubToSub
    ? "text-ink-700"
    : node.isSubCategory
    ? "font-medium text-ink-800"
    : "font-bold text-ink-950";

  const badgeLabel = node.isSubToSub ? "Sub-Sub" : node.isSubCategory ? "Sub" : null;

  const handleEdit = () => {
    if (node.isSubToSub) onEditSubSub(node.raw);
    else if (node.isSubCategory) onEditSub(node.raw);
    else onEdit(node);
  };

  const handleDelete = () => {
    if (node.isSubToSub) onDeleteSubSub(node.raw);
    else if (node.isSubCategory) onDeleteSub(node.raw);
    else onDelete(node);
  };

  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 border-b border-slate-50 px-3 py-2 hover:bg-surface"
        style={{ paddingLeft: 12 + depth * 22 }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            onClick={() => canExpand && onToggle(node)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-control ${
              canExpand ? "text-slate-500 hover:bg-slate-100" : "invisible"
            }`}
          >
            {loadingIds.has(key) ? (
              <span className="h-3 w-3 animate-pulse rounded-full bg-slate-300" />
            ) : isExpanded ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )}
          </button>
          {icon}
          <span className={`truncate ${nameClass}`}>{node.name}</span>
          {badgeLabel && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {badgeLabel}
            </span>
          )}
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ring-1 ${statusClass(
              node.status
            )}`}
          >
            {node.status || "inactive"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!node.isSubCategory && !node.isSubToSub && (
            <button
              onClick={() => onViewPath(node)}
              className="inline-flex items-center gap-1 rounded-control border border-slate-200 px-2 py-1 text-xs font-medium text-ink-700 hover:border-amber-500 hover:text-amber-700"
            >
              <Route size={12} />
              Path
            </button>
          )}
          {node.isSubCategory && (
            <button
              onClick={() => onAddSubSub(node)}
              className="inline-flex items-center gap-1 rounded-control border border-slate-200 px-2 py-1 text-xs font-medium text-ink-700 hover:border-amber-500 hover:text-amber-700"
              title="Add sub-to-sub category"
            >
              <Plus size={12} />
            </button>
          )}
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-1 rounded-control border border-slate-200 px-2 py-1 text-xs font-medium text-ink-700 hover:border-amber-500 hover:text-amber-700"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 rounded-control border border-red-100 px-2 py-1 text-xs font-medium text-red-500 hover:border-red-400 hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {childList.length > 0 ? (
            childList.map((child) => (
              <TreeNode
                key={categoryKey(child)}
                node={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                childrenCache={childrenCache}
                loadingIds={loadingIds}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewPath={onViewPath}
                onEditSub={onEditSub}
                onDeleteSub={onDeleteSub}
                onAddSubSub={onAddSubSub}
                onEditSubSub={onEditSubSub}
                onDeleteSubSub={onDeleteSubSub}
              />
            ))
          ) : (
            <p
              className="px-3 py-2 text-xs text-slate-400"
              style={{ paddingLeft: 12 + (depth + 1) * 22 }}
            >
              {node.isSubCategory ? "No sub-to-sub categories." : "No subcategories."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  // categories | subcategories — top-level page tab
  const [activeTab, setActiveTab] = useState("categories");

  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // list | tree
  const [viewMode, setViewMode] = useState("list");
  const [treeData, setTreeData] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [childrenCache, setChildrenCache] = useState({});
  const [loadingChildIds, setLoadingChildIds] = useState(new Set());

  // Add / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add, object = edit
  const [form, setForm] = useState(EMPTY_FORM);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Path (breadcrumb) modal — powered by GET /api/categories/parents/:id
  const [pathModal, setPathModal] = useState(null); // { category, path, loading, error }

  // Filter / search
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // ── Sub category state ───────────────────────────────────────────────────
  const [subCategories, setSubCategories] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [subDeleting, setSubDeleting] = useState(false);
  const [subError, setSubError] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(5);

  const [showSubForm, setShowSubForm] = useState(false);
  const [subEditTarget, setSubEditTarget] = useState(null);
  const [subForm, setSubForm] = useState(EMPTY_SUB_FORM);
  const [subDeleteTarget, setSubDeleteTarget] = useState(null);

  // ── Sub-to-sub category state ────────────────────────────────────────────
  const [subToSubCategories, setSubToSubCategories] = useState([]);
  const [subSubLoading, setSubSubLoading] = useState(false);
  const [subSubSaving, setSubSubSaving] = useState(false);
  const [subSubDeleting, setSubSubDeleting] = useState(false);
  const [subSubError, setSubSubError] = useState("");

  const [showSubSubForm, setShowSubSubForm] = useState(false);
  const [subSubEditTarget, setSubSubEditTarget] = useState(null);
  const [subSubForm, setSubSubForm] = useState(EMPTY_SUBSUB_FORM);
  const [subSubDeleteTarget, setSubSubDeleteTarget] = useState(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q)
    );
  }, [categories, search]);

  const activeCategories = useMemo(
    () =>
      categories.filter((c) => c.status?.toLowerCase() === "active").length,
    [categories]
  );

  const pagedCategories = filteredCategories.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const parentOptions = useMemo(
    () =>
      categories.filter(
        (c) => !editTarget || categoryKey(c) !== categoryKey(editTarget)
      ),
    [categories, editTarget]
  );

  const parentNameFor = (parentId) => {
    if (!parentId) return null;
    const parent = categories.find((c) => categoryKey(c) === parentId);
    return parent?.name || null;
  };

  // ── Sub category derived ─────────────────────────────────────────────────
  const categoryNameFor = (categoryIdVal) => {
    const id = subCategoryCatId(categoryIdVal);
    if (typeof categoryIdVal === "object" && categoryIdVal?.name) return categoryIdVal.name;
    return categories.find((c) => categoryKey(c) === id)?.name || "—";
  };

  const filteredSubCategories = useMemo(() => {
    if (!subSearch.trim()) return subCategories;
    const q = subSearch.toLowerCase();
    return subCategories.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.status?.toLowerCase().includes(q) ||
        categoryNameFor(s.categoryId).toLowerCase().includes(q)
    );
  }, [subCategories, subSearch, categories]);

  const activeSubCategories = useMemo(
    () => subCategories.filter((s) => s.status?.toLowerCase() === "active").length,
    [subCategories]
  );

  const pagedSubCategories = filteredSubCategories.slice(
    (subPage - 1) * subPageSize,
    subPage * subPageSize
  );

  // ── API helpers ───────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await categoryApi.getCategories();
      setCategories(readCategories(data).map(normalizeCategory));
    } catch (err) {
      setError(
        isAuthError(err)
          ? AUTH_ERROR_MESSAGE
          : err.response?.data?.message || "Unable to load categories."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTree = async () => {
    try {
      setTreeLoading(true);
      setError("");
      const data = await fetchTreeRequest();
      setTreeData(readCategories(data).map(normalizeCategory));
    } catch (err) {
      setError(
        isAuthError(err)
          ? AUTH_ERROR_MESSAGE
          : err.response?.data?.message || "Unable to load category tree."
      );
    } finally {
      setTreeLoading(false);
    }
  };

  // ── Sub category API helpers — GET /api/subcategories ───────────────────
  const fetchSubCategories = async () => {
    try {
      setSubLoading(true);
      setSubError("");
      const data = await categoryApi.getSubCategories();
      setSubCategories(readSubCategories(data).map(normalizeSubCategory));
    } catch (err) {
      setSubError(
        isAuthError(err)
          ? AUTH_ERROR_MESSAGE
          : err.response?.data?.message || "Unable to load sub categories."
      );
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (viewMode === "tree" && treeData.length === 0) {
      fetchTree();
    }
  }, [viewMode]);

  useEffect(() => {
    if (activeTab === "subcategories" && subCategories.length === 0) {
      fetchSubCategories();
    }
  }, [activeTab]);

  const updatePageSize = (size) => {
    setPageSize(size);
    setPage(1);
  };

  // Loads subcategories on demand (once) so the tree view can merge them in
  // as leaf nodes under their parent category, without waiting on the
  // separate Sub Categories tab to have been opened first.
  const ensureSubCategories = async () => {
    if (subCategories.length > 0) return subCategories;
    try {
      setSubLoading(true);
      const data = await categoryApi.getSubCategories();
      const list = readSubCategories(data).map(normalizeSubCategory);
      setSubCategories(list);
      return list;
    } catch {
      // Don't block tree rendering if subcategories fail to load — the
      // category-to-category children will still show.
      return [];
    } finally {
      setSubLoading(false);
    }
  };

  // Loads sub-to-sub categories on demand (once) so the tree view can merge
  // them in as leaf nodes under their parent sub-category.
  const ensureSubToSubCategories = async () => {
    if (subToSubCategories.length > 0) return subToSubCategories;
    try {
      setSubSubLoading(true);
      const data = await categoryApi.getSubToSubCategories();
      const list = readSubToSubCategories(data).map(normalizeSubToSub);
      setSubToSubCategories(list);
      return list;
    } catch {
      return [];
    } finally {
      setSubSubLoading(false);
    }
  };

  const toggleTreeNode = async (node) => {
    const key = categoryKey(node);
    const next = new Set(expandedIds);

    if (next.has(key)) {
      next.delete(key);
      setExpandedIds(next);
      return;
    }

    next.add(key);
    setExpandedIds(next);

    // Already merged and cached from a previous expand.
    if (childrenCache[key]) return;

    const nodeId = node._id || node.id;

    try {
      setLoadingChildIds((prev) => new Set(prev).add(key));

      // Level 2 → 3: this node is a sub-category — load its sub-to-sub
      // categories (always leaves, no further nesting).
      if (node.isSubCategory) {
        const subSubs = await ensureSubToSubCategories();
        const matching = subSubs
          .filter((s) => subToSubRefId(s.subCategoryId) === nodeId)
          .map(subToSubToTreeNode);
        setChildrenCache((prev) => ({ ...prev, [key]: matching }));
        return;
      }

      // Level 1 → 2: this node is a category.
      // 1. Nested category children (category-to-category parentId relation).
      let categoryChildren = Array.isArray(node.children) ? node.children : [];
      if (categoryChildren.length === 0) {
        try {
          const data = await fetchChildrenRequest(nodeId);
          categoryChildren = readCategories(data).map(normalizeCategory);
        } catch {
          categoryChildren = [];
        }
      }

      // 2. Real subcategories tied to this category via categoryId.
      const subs = await ensureSubCategories();
      const matchingSubs = subs
        .filter((s) => subCategoryCatId(s.categoryId) === nodeId)
        .map(subCategoryToTreeNode);

      setChildrenCache((prev) => ({
        ...prev,
        [key]: [...categoryChildren, ...matchingSubs],
      }));
    } finally {
      setLoadingChildIds((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  };

  const openPath = async (category) => {
    setPathModal({ category, path: [], loading: true, error: "" });
    try {
      const data = await fetchParentsRequest(category._id || category.id);
      const path = readCategories(data).map(normalizeCategory);
      setPathModal({ category, path, loading: false, error: "" });
    } catch (err) {
      setPathModal({
        category,
        path: [],
        loading: false,
        error: err.response?.data?.message || "Unable to load category path.",
      });
    }
  };

  // ── Open / close modals ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (category) => {
    setEditTarget(category);
    setForm({
      name: category.name,
      image: category.image || "",
      status: category.status || "active",
      parentId: category.parentId || "",
    });
    setError("");
    setShowForm(true);
  };

  const openDelete = (category) => {
    setDeleteTarget(category);
    setError("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setError("");
  };

  const closeDelete = () => {
    setDeleteTarget(null);
    setError("");
  };

  const closePath = () => setPathModal(null);

  // Invalidate cached tree/children data so the tree view refetches next time
  // it's opened, keeping it consistent with the flat list after a mutation.
  const invalidateTree = () => {
    setTreeData([]);
    setChildrenCache({});
    setExpandedIds(new Set());
  };

  // ── Save (create or update) ───────────────────────────────────────────────
  const saveCategory = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      setError("");

      if (editTarget) {
        const data = await updateCategory(editTarget._id || editTarget.id, form);
        const updatedCategory = readCategory(data);

        if (data?.success !== false && updatedCategory) {
          const updated = normalizeCategory(updatedCategory);
          setCategories((prev) =>
            prev.map((c) =>
              categoryKey(c) === categoryKey(editTarget) ? updated : c
            )
          );
          invalidateTree();
        } else {
          setError(data?.message || "Unable to update category.");
          await fetchCategories();
        }
      } else {
        // POST /api/categories/add
        const data = await createCategory(form);
        const createdCategory = readCategory(data);

        if (data?.success !== false && createdCategory) {
          setCategories((prev) => [normalizeCategory(createdCategory), ...prev]);
          invalidateTree();
        } else {
          setError(data?.message || "Unable to create category.");
          await fetchCategories();
        }
        setPage(1);
      }

      closeForm();
    } catch (err) {
      console.error("saveCategory failed:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        isNetworkError: !err.response,
      });

      if (!err.response) {
        setError(
          "Unable to reach the server. It may be waking up (Render free tier) — try again in a few seconds, or check CORS/network in devtools."
        );
      } else if (isAuthError(err)) {
        setError(AUTH_ERROR_MESSAGE);
      } else {
        setError(
          err.response?.data?.message ||
            `Unable to save category (status ${err.response.status}).`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteCategory = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setError("");
      const data = await deleteCategoryRequest(deleteTarget._id || deleteTarget.id);

      if (data?.success === false) {
        setError(data?.message || "Unable to delete category.");
        return;
      }

      setCategories((prev) =>
        prev.filter((c) => categoryKey(c) !== categoryKey(deleteTarget))
      );
      invalidateTree();
      closeDelete();
      setPage(1);
    } catch (err) {
      setError(
        isAuthError(err)
          ? AUTH_ERROR_MESSAGE
          : err.response?.data?.message || "Unable to delete category."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Sub category modal helpers ───────────────────────────────────────────
  const openSubAdd = () => {
    setSubEditTarget(null);
    setSubForm(EMPTY_SUB_FORM);
    setSubError("");
    setShowSubForm(true);
  };

  const openSubEdit = (sub) => {
    setSubEditTarget(sub);
    setSubForm({
      categoryId: subCategoryCatId(sub.categoryId),
      name: sub.name || "",
      image: sub.image || "",
      status: sub.status || "active",
    });
    setSubError("");
    setShowSubForm(true);
  };

  const openSubDelete = (sub) => {
    setSubDeleteTarget(sub);
    setSubError("");
  };

  const closeSubForm = () => {
    setShowSubForm(false);
    setSubEditTarget(null);
    setSubError("");
  };

  const closeSubDelete = () => {
    setSubDeleteTarget(null);
    setSubError("");
  };

  // ── Sub category save (create or update) — POST /add, PUT /update/:id ───
  const saveSubCategory = async (event) => {
    event.preventDefault();
    if (!subForm.name.trim()) return;
    if (!subForm.categoryId.trim()) {
      setSubError("Please select a parent category.");
      return;
    }

    try {
      setSubSaving(true);
      setSubError("");

      if (subEditTarget) {
        const data = await updateSubCategory(
          subEditTarget._id || subEditTarget.id,
          subForm
        );
        const updated = readSubCategory(data);
        if (data?.success !== false && updated) {
          const normalized = normalizeSubCategory(updated);
          setSubCategories((prev) =>
            prev.map((s) =>
              subCategoryKey(s) === subCategoryKey(subEditTarget) ? normalized : s
            )
          );
          invalidateTree();
        } else {
          setSubError(data?.message || "Unable to update sub category.");
          await fetchSubCategories();
        }
      } else {
        const data = await createSubCategory(subForm);
        const created = readSubCategory(data);
        if (data?.success !== false && created) {
          setSubCategories((prev) => [normalizeSubCategory(created), ...prev]);
          invalidateTree();
        } else {
          setSubError(data?.message || "Unable to create sub category.");
          await fetchSubCategories();
        }
        setSubPage(1);
      }

      closeSubForm();
    } catch (err) {
      if (!err.response) {
        setSubError(
          "Unable to reach the server. It may be waking up (Render free tier) — try again in a few seconds, or check CORS/network in devtools."
        );
      } else if (isAuthError(err)) {
        setSubError(AUTH_ERROR_MESSAGE);
      } else {
        setSubError(
          err.response?.data?.message ||
            `Unable to save sub category (status ${err.response.status}).`
        );
      }
    } finally {
      setSubSaving(false);
    }
  };

  // ── Sub category delete — DELETE /delete/:id ──────────────────────────────
  const deleteSubCategory = async () => {
    if (!subDeleteTarget) return;
    try {
      setSubDeleting(true);
      setSubError("");
      const data = await deleteSubCategoryRequest(
        subDeleteTarget._id || subDeleteTarget.id
      );

      if (data?.success === false) {
        setSubError(data?.message || "Unable to delete sub category.");
        return;
      }

      setSubCategories((prev) =>
        prev.filter((s) => subCategoryKey(s) !== subCategoryKey(subDeleteTarget))
      );
      invalidateTree();
      closeSubDelete();
      setSubPage(1);
    } catch (err) {
      setSubError(
        isAuthError(err)
          ? AUTH_ERROR_MESSAGE
          : err.response?.data?.message || "Unable to delete sub category."
      );
    } finally {
      setSubDeleting(false);
    }
  };

  // ── Sub-to-sub category modal helpers ────────────────────────────────────
  const openSubSubAdd = (subCategoryNode) => {
    const raw = subCategoryNode.raw;
    setSubSubEditTarget(null);
    setSubSubForm({
      categoryId: subCategoryCatId(raw.categoryId),
      subCategoryId: raw._id || raw.id,
      categoryvalue: "",
      status: "active",
    });
    setSubSubError("");
    setShowSubSubForm(true);
  };

  const openSubSubEdit = (item) => {
    setSubSubEditTarget(item);
    setSubSubForm({
      categoryId: subToSubRefId(item.categoryId),
      subCategoryId: subToSubRefId(item.subCategoryId),
      categoryvalue: item.categoryvalue || item.name || "",
      status: item.status || "active",
    });
    setSubSubError("");
    setShowSubSubForm(true);
  };

  const openSubSubDelete = (item) => {
    setSubSubDeleteTarget(item);
    setSubSubError("");
  };

  const closeSubSubForm = () => {
    setShowSubSubForm(false);
    setSubSubEditTarget(null);
    setSubSubError("");
  };

  const closeSubSubDelete = () => {
    setSubSubDeleteTarget(null);
    setSubSubError("");
  };

  // ── Sub-to-sub category save (create or update) ──────────────────────────
  const saveSubSubCategory = async (event) => {
    event.preventDefault();
    if (!subSubForm.categoryvalue.trim()) return;
    if (!subSubForm.categoryId || !subSubForm.subCategoryId) {
      setSubSubError("Please select category and sub category.");
      return;
    }

    try {
      setSubSubSaving(true);
      setSubSubError("");

      if (subSubEditTarget) {
        const data = await updateSubToSub(
          subSubEditTarget._id || subSubEditTarget.id,
          subSubForm
        );
        const updated = readSubToSubCategory(data);
        if (data?.success !== false && updated) {
          const normalized = normalizeSubToSub(updated);
          setSubToSubCategories((prev) =>
            prev.map((s) =>
              subToSubKey(s) === subToSubKey(subSubEditTarget) ? normalized : s
            )
          );
          invalidateTree();
        } else {
          setSubSubError(data?.message || "Unable to update sub-to-sub category.");
        }
      } else {
        const data = await createSubToSub(subSubForm);
        const created = readSubToSubCategory(data);
        if (data?.success !== false && created) {
          setSubToSubCategories((prev) => [normalizeSubToSub(created), ...prev]);
          invalidateTree();
        } else {
          setSubSubError(data?.message || "Unable to create sub-to-sub category.");
        }
      }

      closeSubSubForm();
    } catch (err) {
      if (!err.response) {
        setSubSubError(
          "Unable to reach the server. It may be waking up (Render free tier) — try again in a few seconds, or check CORS/network in devtools."
        );
      } else if (isAuthError(err)) {
        setSubSubError(AUTH_ERROR_MESSAGE);
      } else {
        setSubSubError(
          err.response?.data?.message ||
            `Unable to save sub-to-sub category (status ${err.response.status}).`
        );
      }
    } finally {
      setSubSubSaving(false);
    }
  };

  // ── Sub-to-sub category delete ───────────────────────────────────────────
  const deleteSubSubCategory = async () => {
    if (!subSubDeleteTarget) return;
    try {
      setSubSubDeleting(true);
      setSubSubError("");
      const data = await deleteSubToSubRequest(
        subSubDeleteTarget._id || subSubDeleteTarget.id
      );

      if (data?.success === false) {
        setSubSubError(data?.message || "Unable to delete sub-to-sub category.");
        return;
      }

      setSubToSubCategories((prev) =>
        prev.filter((s) => subToSubKey(s) !== subToSubKey(subSubDeleteTarget))
      );
      invalidateTree();
      closeSubSubDelete();
    } catch (err) {
      setSubSubError(
        isAuthError(err)
          ? AUTH_ERROR_MESSAGE
          : err.response?.data?.message || "Unable to delete sub-to-sub category."
      );
    } finally {
      setSubSubDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">
              Catalog governance
            </p>
            <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">
              Categories
            </h1>
            <p className="text-sm text-slate-500">
              Create marketplace categories and review live catalog groups.
            </p>
          </div>
          <button
            onClick={activeTab === "categories" ? openAdd : openSubAdd}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-400"
          >
            <Plus size={17} />
            {activeTab === "categories" ? "Add category" : "Add sub category"}
          </button>
        </div>

        {/* Page-level tab switcher */}
        <div className="mt-4 inline-flex rounded-control border border-slate-200 p-0.5">
          <button
            onClick={() => setActiveTab("categories")}
            className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-bold ${
              activeTab === "categories"
                ? "bg-ink-800 text-white"
                : "text-ink-700 hover:bg-slate-50"
            }`}
          >
            <Layers size={14} />
            Categories
          </button>
          <button
            onClick={() => setActiveTab("subcategories")}
            className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm font-bold ${
              activeTab === "subcategories"
                ? "bg-ink-800 text-white"
                : "text-ink-700 hover:bg-slate-50"
            }`}
          >
            <Tags size={14} />
            Sub Categories
          </button>
        </div>
      </div>

      {/* ── Metrics ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {activeTab === "categories" ? (
          <>
            <MetricCard
              label="Categories"
              value={categories.length}
              helper="catalog groups"
              icon={Layers}
              tone="purple"
            />
            <MetricCard
              label="Listings mapped"
              value={products.length}
              helper="products assigned"
              icon={PackageSearch}
              tone="blue"
            />
            <MetricCard
              label="Active"
              value={activeCategories}
              helper="available categories"
              icon={CheckCircle2}
              tone="green"
            />
          </>
        ) : (
          <>
            <MetricCard
              label="Sub Categories"
              value={subCategories.length}
              helper="nested groups"
              icon={Tags}
              tone="purple"
            />
            <MetricCard
              label="Parent categories"
              value={categories.length}
              helper="available to nest under"
              icon={Layers}
              tone="blue"
            />
            <MetricCard
              label="Active"
              value={activeSubCategories}
              helper="available sub categories"
              icon={CheckCircle2}
              tone="green"
            />
          </>
        )}
      </div>

      {/* ── Categories table card ── */}
      {activeTab === "categories" && (
      <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
        {/* Table header bar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers size={19} className="text-amber-700" />
            <h2 className="font-bold">Category map</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View mode toggle */}
            <div className="inline-flex rounded-control border border-slate-200 p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1 rounded-control px-2.5 py-1 text-xs font-bold ${
                  viewMode === "list"
                    ? "bg-ink-800 text-white"
                    : "text-ink-700 hover:bg-slate-50"
                }`}
              >
                <List size={13} />
                List
              </button>
              <button
                onClick={() => setViewMode("tree")}
                className={`inline-flex items-center gap-1 rounded-control px-2.5 py-1 text-xs font-bold ${
                  viewMode === "tree"
                    ? "bg-ink-800 text-white"
                    : "text-ink-700 hover:bg-slate-50"
                }`}
              >
                <GitBranch size={13} />
                Tree
              </button>
            </div>

            {viewMode === "list" && (
              <div className="relative w-full sm:w-64">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by name or status…"
                  className="w-full rounded-control border border-slate-200 py-1.5 pl-8 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-700"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {(loading || (viewMode === "tree" && treeLoading)) && (
              <span className="text-sm text-slate-500">Loading…</span>
            )}
            {error && !showForm && !deleteTarget && !pathModal && (
              <span className="text-sm font-medium text-red-600">{error}</span>
            )}
          </div>
        </div>

        {/* List view */}
        {viewMode === "list" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-800 text-white">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Parent</th>
                    <th className="px-5 py-3 font-semibold">Image</th>
                    <th className="px-5 py-3 font-semibold">Listings</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedCategories.map((category) => (
                    <tr
                      key={categoryKey(category)}
                      className="hover:bg-surface"
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 font-bold text-ink-950">
                          <Box size={17} className="text-amber-700" />
                          {category.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-ink-700">
                        {parentNameFor(category.parentId) || (
                          <span className="text-slate-400">Top-level</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-ink-700">
                          <Image size={16} className="text-slate-400" />
                          {category.image || "No image"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {
                          products.filter(
                            (p) => p.category === category.name
                          ).length
                        }
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${statusClass(
                            category.status
                          )}`}
                        >
                          {category.status?.toLowerCase() === "active" ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <ShieldAlert size={14} />
                          )}
                          {category.status || "inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPath(category)}
                            className="inline-flex items-center gap-1 rounded-control border border-slate-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-amber-500 hover:text-amber-700 transition-colors"
                          >
                            <Route size={13} />
                            Path
                          </button>
                          <button
                            onClick={() => openEdit(category)}
                            className="inline-flex items-center gap-1 rounded-control border border-slate-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-amber-500 hover:text-amber-700 transition-colors"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() => openDelete(category)}
                            className="inline-flex items-center gap-1 rounded-control border border-red-100 px-2.5 py-1 text-xs font-medium text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!loading && filteredCategories.length === 0 && (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-slate-500"
                        colSpan={6}
                      >
                        {search
                          ? `No categories match "${search}".`
                          : "No categories found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <DataPager
              total={filteredCategories.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={updatePageSize}
            />
          </>
        )}

        {/* Tree view — GET /api/categories/tree, lazy children via
            GET /api/categories/children/:id, real sub categories merged from
            GET /api/subcategories, and sub-to-sub categories merged from
            GET /api/subtosubcategories */}
        {viewMode === "tree" && (
          <div>
            {treeData.length === 0 && !treeLoading && (
              <p className="px-5 py-8 text-center text-slate-500">
                No categories found.
              </p>
            )}
            {(subLoading || subSubLoading) && treeData.length > 0 && (
              <p className="px-5 py-2 text-xs text-slate-400">Loading nested categories…</p>
            )}
            {treeData.map((node) => (
              <TreeNode
                key={categoryKey(node)}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                childrenCache={childrenCache}
                loadingIds={loadingChildIds}
                onToggle={toggleTreeNode}
                onEdit={openEdit}
                onDelete={openDelete}
                onViewPath={openPath}
                onEditSub={openSubEdit}
                onDeleteSub={openSubDelete}
                onAddSubSub={openSubSubAdd}
                onEditSubSub={openSubSubEdit}
                onDeleteSubSub={openSubSubDelete}
              />
            ))}
          </div>
        )}
      </div>
      )}

      {/* ── Sub categories table card ── */}
      {activeTab === "subcategories" && (
      <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Tags size={19} className="text-amber-700" />
            <h2 className="font-bold">Sub category map</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={subSearch}
                onChange={(e) => {
                  setSubSearch(e.target.value);
                  setSubPage(1);
                }}
                placeholder="Filter by name, category, or status…"
                className="w-full rounded-control border border-slate-200 py-1.5 pl-8 pr-8 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
              />
              {subSearch && (
                <button
                  onClick={() => setSubSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {subLoading && <span className="text-sm text-slate-500">Loading…</span>}
            {subError && !showSubForm && !subDeleteTarget && (
              <span className="text-sm font-medium text-red-600">{subError}</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-white">
              <tr>
                <th className="px-5 py-3 font-semibold">Sub Category</th>
                <th className="px-5 py-3 font-semibold">Parent Category</th>
                <th className="px-5 py-3 font-semibold">Image</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedSubCategories.map((sub) => (
                <tr key={subCategoryKey(sub)} className="hover:bg-surface">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 font-bold text-ink-950">
                      <Tags size={17} className="text-amber-700" />
                      {sub.name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-ink-700">
                    {categoryNameFor(sub.categoryId)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-ink-700">
                      <Image size={16} className="text-slate-400" />
                      {sub.image || "No image"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${statusClass(
                        sub.status
                      )}`}
                    >
                      {sub.status?.toLowerCase() === "active" ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <ShieldAlert size={14} />
                      )}
                      {sub.status || "inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openSubEdit(sub)}
                        className="inline-flex items-center gap-1 rounded-control border border-slate-200 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-amber-500 hover:text-amber-700 transition-colors"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => openSubDelete(sub)}
                        className="inline-flex items-center gap-1 rounded-control border border-red-100 px-2.5 py-1 text-xs font-medium text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!subLoading && filteredSubCategories.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                    {subSearch
                      ? `No sub categories match "${subSearch}".`
                      : "No sub categories found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DataPager
          total={filteredSubCategories.length}
          page={subPage}
          pageSize={subPageSize}
          onPageChange={setSubPage}
          onPageSizeChange={(size) => {
            setSubPageSize(size);
            setSubPage(1);
          }}
        />
      </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-control bg-white shadow-pop">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold">
                  {editTarget ? "Edit category" : "Add category"}
                </h2>
                <p className="text-xs text-slate-300">
                  {editTarget
                    ? "Update category details in the live catalog."
                    : "Create a category in the live catalog."}
                </p>
              </div>
              <button
                onClick={closeForm}
                className="rounded-control p-2 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={saveCategory} className="grid gap-4 p-5">
              {error && (
                <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {error}
                </p>
              )}

              <label className="text-sm font-medium text-ink-800">
                Category name
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  placeholder="Electronics"
                  required
                />
              </label>

              <label className="text-sm font-medium text-ink-800">
                Parent category
                <select
                  value={form.parentId}
                  onChange={(e) =>
                    setForm({ ...form, parentId: e.target.value })
                  }
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="">None (top-level category)</option>
                  {parentOptions.map((c) => (
                    <option key={categoryKey(c)} value={categoryKey(c)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-ink-800">
                Image
                <input
                  value={form.image}
                  onChange={(e) =>
                    setForm({ ...form, image: e.target.value })
                  }
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  placeholder="electronics.jpg"
                />
              </label>

              <label className="text-sm font-medium text-ink-800">
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={17} />
                  {saving
                    ? "Saving…"
                    : editTarget
                    ? "Update category"
                    : "Save category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-control bg-white shadow-pop">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="font-bold">Delete category</h2>
                <p className="text-xs text-slate-300">
                  This action cannot be undone.
                </p>
              </div>
              <button
                onClick={closeDelete}
                className="rounded-control p-2 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {error && (
                <p className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {error}
                </p>
              )}
              <p className="text-sm text-ink-800">
                Are you sure you want to delete{" "}
                <span className="font-bold text-ink-950">
                  "{deleteTarget.name}"
                </span>
                ? All associated data will be permanently removed.
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={closeDelete}
                  className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteCategory}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub category Add / Edit Modal — POST /add, PUT /update/:id ── */}
      {showSubForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold">
                  {subEditTarget ? "Edit sub category" : "Add sub category"}
                </h2>
                <p className="text-xs text-slate-300">
                  {subEditTarget
                    ? "Update sub category details in the live catalog."
                    : "Create a sub category nested inside a parent category."}
                </p>
              </div>
              <button onClick={closeSubForm} className="rounded-control p-2 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveSubCategory} className="grid gap-4 p-5">
              {subError && (
                <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {subError}
                </p>
              )}

              <label className="text-sm font-medium text-ink-800">
                Parent category
                <select
                  value={subForm.categoryId}
                  onChange={(e) => setSubForm({ ...subForm, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  required
                >
                  <option value="">— Select a category —</option>
                  {categories.map((c) => (
                    <option key={categoryKey(c)} value={categoryKey(c)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-ink-800">
                Sub category name
                <input
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  placeholder="Mobiles"
                  required
                />
              </label>

              <label className="text-sm font-medium text-ink-800">
                Image
                <input
                  value={subForm.image}
                  onChange={(e) => setSubForm({ ...subForm, image: e.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  placeholder="mobiles.jpg (leave blank for default)"
                />
              </label>

              <label className="text-sm font-medium text-ink-800">
                Status
                <select
                  value={subForm.status}
                  onChange={(e) => setSubForm({ ...subForm, status: e.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeSubForm}
                  className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subSaving}
                  className="inline-flex items-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={17} />
                  {subSaving
                    ? "Saving…"
                    : subEditTarget
                    ? "Update sub category"
                    : "Save sub category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sub category Delete Confirm Modal — DELETE /delete/:id ── */}
      {subDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="font-bold">Delete sub category</h2>
                <p className="text-xs text-slate-300">This action cannot be undone.</p>
              </div>
              <button onClick={closeSubDelete} className="rounded-control p-2 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {subError && (
                <p className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {subError}
                </p>
              )}
              <p className="text-sm text-ink-800">
                Are you sure you want to delete{" "}
                <span className="font-bold text-ink-950">"{subDeleteTarget.name}"</span>?
                All associated data will be permanently removed.
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={closeSubDelete}
                  className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSubCategory}
                  disabled={subDeleting}
                  className="inline-flex items-center gap-2 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  {subDeleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-to-sub category Add / Edit Modal — POST /add, PUT /:id ── */}
      {showSubSubForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold">
                  {subSubEditTarget ? "Edit sub-to-sub category" : "Add sub-to-sub category"}
                </h2>
                <p className="text-xs text-slate-300">
                  Third-level entry nested inside a sub category.
                </p>
              </div>
              <button onClick={closeSubSubForm} className="rounded-control p-2 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveSubSubCategory} className="grid gap-4 p-5">
              {subSubError && (
                <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {subSubError}
                </p>
              )}

              <label className="text-sm font-medium text-ink-800">
                Parent category
                <select
                  value={subSubForm.categoryId}
                  onChange={(e) =>
                    setSubSubForm({ ...subSubForm, categoryId: e.target.value, subCategoryId: "" })
                  }
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  required
                >
                  <option value="">— Select a category —</option>
                  {categories.map((c) => (
                    <option key={categoryKey(c)} value={categoryKey(c)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-ink-800">
                Parent sub category
                <select
                  value={subSubForm.subCategoryId}
                  onChange={(e) =>
                    setSubSubForm({ ...subSubForm, subCategoryId: e.target.value })
                  }
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:bg-slate-50"
                  disabled={!subSubForm.categoryId}
                  required
                >
                  <option value="">
                    {subSubForm.categoryId ? "— Select a sub category —" : "Select category first"}
                  </option>
                  {subCategories
                    .filter((s) => subCategoryCatId(s.categoryId) === subSubForm.categoryId)
                    .map((s) => (
                      <option key={subCategoryKey(s)} value={subCategoryKey(s)}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-medium text-ink-800">
                Name
                <input
                  value={subSubForm.categoryvalue}
                  onChange={(e) => setSubSubForm({ ...subSubForm, categoryvalue: e.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  placeholder="e.g. Running Shoes"
                  required
                />
              </label>

              <label className="text-sm font-medium text-ink-800">
                Status
                <select
                  value={subSubForm.status}
                  onChange={(e) => setSubSubForm({ ...subSubForm, status: e.target.value })}
                  className="mt-1 w-full rounded-control border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeSubSubForm}
                  className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subSubSaving}
                  className="inline-flex items-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={17} />
                  {subSubSaving ? "Saving…" : subSubEditTarget ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sub-to-sub category Delete Confirm Modal — DELETE /:id ── */}
      {subSubDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="font-bold">Delete sub-to-sub category</h2>
                <p className="text-xs text-slate-300">This action cannot be undone.</p>
              </div>
              <button onClick={closeSubSubDelete} className="rounded-control p-2 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              {subSubError && (
                <p className="mb-3 rounded-control bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {subSubError}
                </p>
              )}
              <p className="text-sm text-ink-800">
                Are you sure you want to delete{" "}
                <span className="font-bold text-ink-950">
                  "{subSubDeleteTarget.categoryvalue || subSubDeleteTarget.name}"
                </span>
                ?
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={closeSubSubDelete}
                  className="rounded-control border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSubSubCategory}
                  disabled={subSubDeleting}
                  className="inline-flex items-center gap-2 rounded-control bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  {subSubDeleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Path (breadcrumb) Modal — GET /api/categories/parents/:id ── */}
      {pathModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-control bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-200 bg-ink-800 px-5 py-4 text-white">
              <div>
                <h2 className="font-bold">Category path</h2>
                <p className="text-xs text-slate-300">
                  Lineage for "{pathModal.category?.name}".
                </p>
              </div>
              <button
                onClick={closePath}
                className="rounded-control p-2 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              {pathModal.loading && (
                <p className="text-sm text-slate-500">Loading path…</p>
              )}
              {pathModal.error && (
                <p className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
                  {pathModal.error}
                </p>
              )}
              {!pathModal.loading && !pathModal.error && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {pathModal.path.length === 0 ? (
                    <span className="text-slate-500">
                      This is a top-level category with no parents.
                    </span>
                  ) : (
                    pathModal.path.map((ancestor, idx) => (
                      <span key={categoryKey(ancestor)} className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-ink-800">
                          {ancestor.name}
                        </span>
                        {idx < pathModal.path.length - 1 && (
                          <ChevronRight size={14} className="text-slate-400" />
                        )}
                      </span>
                    ))
                  )}
                  <ChevronRight size={14} className="text-slate-400" />
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-1 font-bold text-amber-700">
                    {pathModal.category?.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}