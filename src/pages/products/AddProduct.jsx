  // AddProduct.jsx
  // path: src/pages/products/AddProduct.jsx

  import { useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import {
    ChevronRight, ChevronDown, ChevronUp, ArrowLeft, PackagePlus, ShieldCheck,
    Plus, Trash2, Tag, Layers, X, GripVertical, Image as ImageIcon,
    Check, Info, Sparkles, Box, FileText, Image, Palette,
    Shield, Search, Hash, AlertCircle, Package, Zap, Copy
  } from "lucide-react";
  import { getCurrentSession } from "../../config/localAuth";

  const BASE_URL   = "https://amazon-multi-vendor-3.onrender.com/api";
  const ADD_URL    = "https://amazon-multi-vendor-3.onrender.com/api/products/add";
  const USERS_URL  = "https://amazon-multi-vendor-3.onrender.com/api/users";

  // ── Category / Sub-category / Sub-to-sub-category / Attribute endpoints ──
  const CATEGORIES_URL    = `${BASE_URL}/categories`;
  const SUBCATEGORIES_URL = `${BASE_URL}/subcategories`;
  const SUBTOSUB_URL      = `${BASE_URL}/subtosubcategories`;
  const CATEGORYATTR_URL  = `${BASE_URL}/categoryattribute`;

  // Attribute types that carry a pre-defined options[] list (same set as
  // Attribute.jsx's OPTIONS_TYPES) — these are the ones that can be picked
  // via "Add existing" in the Attributes & Variants builder.
  const OPTIONS_TYPES = ["dropdown", "multiselect", "color"];

  const authConfig = () => {
    const token = localStorage.getItem("adminToken");
    const isUsableToken = token && token !== "null" && token !== "undefined";
    return isUsableToken ? { Authorization: `Bearer ${token}` } : {};
  };

  const readCategories = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.categories)) return payload.categories;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const readSubCategories = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.subCategories)) return payload.subCategories;
    if (Array.isArray(payload?.subcategories)) return payload.subcategories;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const readSubToSubCategories = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.subtosubcategories)) return payload.subtosubcategories;
    return [];
  };

  const normalizeCategory = (c) => {
    if (!c) return c;
    return { ...c, name: c.name || c.categoryName || c.title || "Unnamed" };
  };

  const normalizeSubCategory = (s) => {
    if (!s) return s;
    return { ...s, name: s.name || s.subCategoryName || s.title || "Unnamed" };
  };

  const normalizeSubToSub = (item) => {
    if (!item) return item;
    return { ...item, name: item.categoryvalue || item.name || "Unnamed" };
  };

  const subCategoryCatId = (val) =>
    val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "";
  const subToSubRefId = (val) =>
    val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "";

  function looksLikeObjectId(v) {
    return typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
  }

  function deepFindObjectId(obj, keyed = true, depth = 0, seen = new Set()) {
    if (!obj || typeof obj !== "object" || depth > 6 || seen.has(obj)) return "";
    seen.add(obj);

    const idKeyPattern = /(^_?id$|vendorid|userid|vendor_id|user_id)/i;

    for (const [key, val] of Object.entries(obj)) {
      if (key.toLowerCase() === "token") continue;
      if (looksLikeObjectId(val) && (!keyed || idKeyPattern.test(key))) return val;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (key.toLowerCase() === "token") continue;
      if (val && typeof val === "object") {
        const found = deepFindObjectId(val, keyed, depth + 1, seen);
        if (found) return found;
      }
    }
    return "";
  }

  function collectLocalStorageObjects() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") out.push(parsed);
        } catch { /* not JSON, skip */ }
      }
    } catch { /* localStorage unavailable */ }
    return out;
  }

  function getSessionIdentifier(session) {
    const raw = (() => {
      try {
        const s = localStorage.getItem("adminSession");
        return s ? JSON.parse(s) : {};
      } catch {
        return {};
      }
    })();

    const email =
      session?.email || session?.user?.email || raw?.email || raw?.user?.email || "";
    const phone =
      session?.phone || session?.mobile || session?.number ||
      session?.user?.phone || session?.user?.mobile || session?.user?.number ||
      raw?.phone || raw?.mobile || raw?.number ||
      raw?.user?.phone || raw?.user?.mobile || raw?.user?.number || "";
    const username =
      session?.username || session?.user?.username || raw?.username || raw?.user?.username || "";

    let directId = deepFindObjectId(session, true) || deepFindObjectId(raw, true);

    if (!directId) {
      for (const obj of collectLocalStorageObjects()) {
        directId = deepFindObjectId(obj, true);
        if (directId) break;
      }
    }

    if (!directId) {
      directId = deepFindObjectId(session, false);
    }
    if (!directId) {
      for (const obj of collectLocalStorageObjects()) {
        directId = deepFindObjectId(obj, false);
        if (directId) break;
      }
    }

    return { email, phone, username, directId };
  }

  async function fetchVendorIdFromUsersApi(session) {
    const { email, phone, username, directId } = getSessionIdentifier(session);

    if (directId) {
      console.log("✅ Vendor resolved from session (fast path):", directId);
      return directId;
    }
    console.warn("⚠️ No ObjectId found in session via fast path. Raw session was:", session);

    try {
      const res  = await fetch(USERS_URL);
      const json = await res.json();
      const users = Array.isArray(json) ? json : (json.data ?? json.users ?? []);

      const normPhone = (v) => String(v ?? "").replace(/\D/g, "");

      let match = null;
      if (email)
        match = users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
      if (!match && phone) {
        const p = normPhone(phone);
        match = p.length > 0
          ? users.find((u) => normPhone(u.phone || u.mobile || u.number) === p)
          : null;
      }
      if (!match && username)
        match = users.find((u) => (u.username || "") === username);

      if (match?._id) {
        console.log("✅ Vendor resolved from /api/users:", match);
        return match._id;
      }

      console.warn(
        "⚠️ No matching user found in /api/users for session identifier:",
        { email, phone, username },
        "Users returned:", users
      );
    } catch (e) {
      console.error("❌ Failed fetching /api/users:", e);
    }

    return "";
  }

  const inp =
    "mt-1 w-full rounded-card border border-slate-200 px-3.5 py-2.5 text-sm outline-none " +
    "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white transition-all " +
    "placeholder:text-slate-400 shadow-sm hover:border-slate-300";

  const selectInp =
    "mt-1 w-full rounded-card border border-slate-200 px-3.5 py-2.5 text-sm outline-none " +
    "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white transition-all " +
    "shadow-sm hover:border-slate-300 cursor-pointer";

  function SectionTitle({ icon: Icon, label }) {
    return (
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-card bg-amber-50">
          {Icon && <Icon size={14} className="text-amber-600" />}
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
    );
  }

  function generateSlug(text) {
    return text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function dedupeAttrs(raw) {
    const seen = new Set();
    return raw.filter(({ name }) => seen.has(name) ? false : (seen.add(name), true));
  }
  function cartesian(arrays) {
    if (!arrays.length) return [[]];
    const [first, ...rest] = arrays;
    const restCombos = cartesian(rest);
    return first.flatMap((v) => restCombos.map((combo) => [v, ...combo]));
  }

  function variantSignature(attrs) {
    return attrs.map((a) => `${a.name}:${a.value}`).sort().join("|");
  }

  function buildVariantsFromMeta(attributesMeta) {
    const filled = attributesMeta.filter(
      (g) => g.forVariations !== false && g.name.trim() && g.values.some((v) => v.trim())
    );
    if (!filled.length) return [];
    const combos = cartesian(filled.map((g) => g.values.filter((v) => v.trim())));
    return combos.map((combo) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enabled: true,
      manageStock: true,
      sku: "",
      gtin: "",
      attributes: filled.map((g, i) => ({ name: g.name, value: combo[i] })),
      images: [],
      description: "",
      weight: "",
      dimensions: { length: "", width: "", height: "" },
      shippingClass: "",
      taxClass: "",
      stockStatus: "instock",
      inventory: { stock: "", quantity: "" },
      offer: {
        mrp: "",
        sellingPrice: "",
        salePrice: "",
        handlingTime: 2,
        itemCondition: "New",
        maximumOrderQuantity: 5,
      },
    }));
  }

  function regenerateVariants(existing, attributesMeta) {
    const fresh = buildVariantsFromMeta(attributesMeta);
    const byKey = new Map(existing.map((v) => [variantSignature(v.attributes), v]));
    return fresh.map((v) => {
      const match = byKey.get(variantSignature(v.attributes));
      return match ? { ...match, id: v.id, attributes: v.attributes } : v;
    });
  }

  function StepBadge({ n, label, active, done }) {
    return (
      <div className={`flex items-center gap-2.5 transition-all ${active ? "opacity-100" : done ? "opacity-80" : "opacity-40"}`}>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
          done ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
            : active ? "bg-amber-600 text-white shadow-md shadow-amber-500/30"
            : "bg-slate-200 text-slate-500"
        }`}>
          {done ? <Check size={14} /> : n}
        </span>
        <div>
          <p className={`text-xs font-bold ${active ? "text-ink-950" : "text-slate-500"}`}>{label}</p>
        </div>
      </div>
    );
  }

  function AttrField({ attr, value, onChange }) {
    const change = (e) => onChange(attr._id, e.target.value);
    const label = <>{attr.name}{attr.required && <span className="ml-1 text-red-500">*</span>}</>;
    if (attr.type === "dropdown") {
      return (
        <label className="block text-sm font-medium text-ink-800">{label}
          <select value={value} onChange={change} className={selectInp}>
            <option value="">Select…</option>
            {attr.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      );
    }
    return (
      <label className="block text-sm font-medium text-ink-800">{label}
        <input type={attr.type === "number" ? "number" : "text"} value={value} onChange={change}
          placeholder={`Enter ${attr.name.toLowerCase()}`} className={inp} />
      </label>
    );
  }

  function ValueTokenBox({ options, values, onChange, allowCreate }) {
    const [pending, setPending] = useState("");
    const remaining = options.filter((o) => !values.includes(o));
    const allSelected = options.length > 0 && values.length === options.length;

    const add = (v) => {
      const val = (v || "").trim();
      if (!val || values.includes(val)) return;
      onChange([...values, val]);
    };
    const remove = (v) => onChange(values.filter((x) => x !== v));

    return (
      <div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-card border border-slate-200 bg-white px-2.5 py-2 min-h-[42px] focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-control bg-slate-100 pl-2 pr-1 py-1 text-xs font-medium text-ink-800">
              {v}
              <button type="button" onClick={() => remove(v)}
                className="flex h-4 w-4 items-center justify-center rounded-control text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
          {remaining.length > 0 && (
            <select value="" onChange={(e) => add(e.target.value)}
              className="flex-1 min-w-[110px] border-0 text-xs text-slate-500 outline-none bg-transparent cursor-pointer">
              <option value="">{values.length ? "Add another value…" : "Select value(s)…"}</option>
              {remaining.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {values.length === 0 && remaining.length === 0 && !allowCreate && (
            <span className="text-xs text-slate-400">No options configured.</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => onChange([...options])} disabled={!options.length || allSelected}
            className="rounded-card border border-slate-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Select all
          </button>
          <button type="button" onClick={() => onChange([])} disabled={!values.length}
            className="rounded-card border border-slate-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Select none
          </button>
          {allowCreate && (
            <div className="flex items-center gap-1.5 ml-auto">
              <input value={pending} onChange={(e) => setPending(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(pending); setPending(""); } }}
                placeholder="New value…"
                className="w-28 rounded-card border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-amber-500" />
              <button type="button" onClick={() => { add(pending); setPending(""); }}
                className="rounded-card border border-dashed border-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 transition-colors">
                Create value
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function AttributePanel({ group, onUpdate, onRemove }) {
    const [open, setOpen] = useState(true);
    const isCategory = !!group.fromCategory;

    return (
      <div className="rounded-card border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-b border-slate-100 cursor-pointer"
          onClick={() => setOpen((o) => !o)}>
          <div className="flex items-center gap-2.5 min-w-0">
            <GripVertical size={14} className="text-slate-300 shrink-0" />
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-amber-100">
              <Tag size={12} className="text-amber-600" />
            </span>
            <p className="text-sm font-bold text-ink-900 truncate">{group.name || "Untitled attribute"}</p>
            {isCategory && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                From category
              </span>
            )}
            {group.values.length > 0 && (
              <span className="text-xs font-semibold text-amber-600 shrink-0">
                {group.values.length} value{group.values.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline">
              Remove
            </button>
            {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
          </div>
        </div>

        {open && (
          <div className="px-4 py-4 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-400">
              Name
              {isCategory ? (
                <p className="mt-1 text-sm font-semibold text-ink-900">{group.name}</p>
              ) : (
                <input value={group.name} onChange={(e) => onUpdate({ ...group, name: e.target.value })}
                  placeholder="e.g. Color" className={inp} />
              )}
            </label>

            <label className="block text-xs font-bold uppercase tracking-wide text-slate-400">
              Value(s)
              <ValueTokenBox
                options={isCategory ? group.options : group.values}
                values={group.values}
                onChange={(values) => onUpdate({ ...group, values })}
                allowCreate={!isCategory}
              />
            </label>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-700">
                <input type="checkbox" checked={group.visible !== false}
                  onChange={(e) => onUpdate({ ...group, visible: e.target.checked })}
                  className="h-4 w-4 rounded-control border-slate-300 text-amber-600 focus:ring-amber-500" />
                Visible on the product page
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-ink-700">
                <input type="checkbox" checked={group.forVariations !== false}
                  onChange={(e) => onUpdate({ ...group, forVariations: e.target.checked })}
                  className="h-4 w-4 rounded-control border-slate-300 text-amber-600 focus:ring-amber-500" />
                Used for variations
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  function AttributesMetaBuilder({ attributesMeta, setAttributesMeta, attributes }) {
    const dropdownAttrs = attributes.filter(
      (a) => OPTIONS_TYPES.includes(a.type) && Array.isArray(a.options) && a.options.length > 0
    );
    const addedIds = new Set(attributesMeta.filter((g) => g.fromCategory).map((g) => g.catId));
    const availableAttrs = dropdownAttrs.filter((a) => !addedIds.has(a._id));
    const [pendingAttrId, setPendingAttrId] = useState("");
    const [savedFlash, setSavedFlash] = useState(false);

    const addExisting = () => {
      const attr = dropdownAttrs.find((a) => a._id === pendingAttrId);
      if (!attr) return;
      setAttributesMeta((prev) => [...prev, {
        id: attr._id, catId: attr._id, fromCategory: true,
        name: attr.name, options: attr.options, values: [], visible: true, forVariations: true,
      }]);
      setPendingAttrId("");
    };

    const addNew = () => setAttributesMeta((prev) => [...prev, {
      id: `custom-${Date.now()}`, fromCategory: false,
      name: "", options: [], values: [], visible: true, forVariations: true,
    }]);

    const updateGroup = (id, next) => setAttributesMeta((prev) => prev.map((g) => (g.id === id ? next : g)));
    const removeGroup = (id) => setAttributesMeta((prev) => prev.filter((g) => g.id !== id));

    const saveAttributes = () => {
      // Nothing to POST separately — attributesMeta already lives in parent
      // state and is sent with the product payload on final submit. This
      // button just gives WooCommerce-style visual confirmation so the flow
      // reads the same: configure attributes → Save attributes → generate variations.
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    };

    return (
      <div className="space-y-4">
        <div className="rounded-card border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm text-slate-500 mb-3">
            Add descriptive pieces of information customers can use to find this product, like "Color" or "Size" —
            then pick which values apply, and which attributes should generate variations.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={addNew}
              className="rounded-card border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors">
              Add new
            </button>
            {availableAttrs.length > 0 && (
              <div className="flex items-center gap-2">
                <select value={pendingAttrId} onChange={(e) => setPendingAttrId(e.target.value)}
                  className={`${selectInp} mt-0 w-52`}>
                  <option value="">Add existing…</option>
                  {availableAttrs.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                <button type="button" onClick={addExisting} disabled={!pendingAttrId}
                  className="rounded-card bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-40 transition-colors">
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {attributesMeta.length === 0 && (
          <div className="rounded-card border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-card bg-slate-100 mx-auto mb-3">
              <Tag size={20} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">No attributes added yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Add an existing category attribute (like Color, Size) or create a custom one.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {attributesMeta.map((g) => (
            <AttributePanel key={g.id} group={g}
              onUpdate={(next) => updateGroup(g.id, next)}
              onRemove={() => removeGroup(g.id)} />
          ))}
        </div>

        {attributesMeta.length > 0 && (
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={saveAttributes}
              className="rounded-card bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/30 hover:bg-amber-700 transition-all">
              Save attributes
            </button>
            {savedFlash && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check size={13} strokeWidth={3} /> Attributes saved — now generate variations below
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  const STOCK_STATUSES = [
    ["instock", "In stock"],
    ["outofstock", "Out of stock"],
    ["onbackorder", "On backorder"],
  ];

  // Fixed, non-attribute condition options for the bulk table's Condition column
  const ITEM_CONDITIONS = ["New", "Refurbished", "Used - Like New", "Used - Good"];

  // Best-effort auto-pick of an attribute by name pattern — used only to seed
  // sensible defaults (e.g. pre-selecting "Product Name" / "Brand" attributes
  // if the category already has them configured under those names).
  const guessAttrId = (attributes, pattern) => {
    const found = attributes.find((a) => pattern.test(a.name));
    return found ? found._id : "";
  };

  // ── Single variation row — collapsed summary now shows an inline <select>
  // per attribute (WooCommerce-style: #615  [L ▾]  [128 GB ▾]  Remove  Edit)
  // so you can retarget which combination a row represents without opening it.
  function VariantRow({ variant, index, attributesMeta, forceOpen, forceOpenTick, onChange, onRemove }) {
    const [open, setOpen] = useState(false);

    // "Expand / Close" link in the toolbar bumps forceOpenTick — sync every
    // row's local open state whenever it fires, even if the same button is
    // clicked twice in a row.
    useEffect(() => {
      if (forceOpen !== undefined) setOpen(forceOpen);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forceOpenTick]);

    const upd = (patch) => onChange({ ...variant, ...patch });
    const updNested = (key, patch) => onChange({ ...variant, [key]: { ...variant[key], ...patch } });
    const missingPrice = !variant.offer.mrp && !variant.offer.sellingPrice;

    // For each attribute currently on this variant, find its full option list
    // (from attributesMeta) so we can render a proper dropdown instead of a
    // static chip — matching the reference screenshots.
    const optionsFor = (attrName) => {
      const group = attributesMeta.find((g) => g.name === attrName);
      return group ? (group.fromCategory ? group.options : group.values) : [];
    };
    const setAttrValue = (attrName, value) => {
      upd({ attributes: variant.attributes.map((a) => (a.name === attrName ? { ...a, value } : a)) });
    };

    return (
      <div className={`rounded-card border ${missingPrice ? "border-amber-200" : "border-slate-200"} bg-white shadow-sm overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-amber-50/20 transition-colors">
          <GripVertical size={14} className="text-slate-300 shrink-0" />
          <span className="text-xs font-mono text-slate-400 shrink-0 w-10">#{index + 1}</span>

          <div className="flex flex-wrap gap-2 flex-1 min-w-[160px]">
            {variant.attributes.map((a) => {
              const opts = optionsFor(a.name);
              return (
                <label key={a.name} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium hidden sm:inline">{a.name}:</span>
                  {opts.length ? (
                    <select value={a.value} onChange={(e) => setAttrValue(a.name, e.target.value)}
                      className="rounded-control border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-amber-700 outline-none focus:border-amber-500 cursor-pointer">
                      {!opts.includes(a.value) && a.value && <option value={a.value}>{a.value}</option>}
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={a.value} onChange={(e) => setAttrValue(a.name, e.target.value)}
                      className="w-20 rounded-control border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-amber-700 outline-none focus:border-amber-500" />
                  )}
                </label>
              );
            })}
          </div>

          {missingPrice && (
            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
              No price
            </span>
          )}
          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
            <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-amber-600 hover:underline">
              {open ? "Close" : "Edit"}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-slate-100 px-4 py-5 grid gap-6 md:grid-cols-[112px_1fr]">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-24 items-center justify-center rounded-card border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
                {variant.images[0]
                  ? <img src={variant.images[0]} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                  : <ImageIcon size={22} className="text-slate-300" />}
              </div>
              <input value={variant.images[0] ?? ""} onChange={(e) => upd({ images: e.target.value ? [e.target.value] : [] })}
                placeholder="Image URL"
                className="w-full rounded-card border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-amber-500" />
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-700">SKU
                  <input value={variant.sku} onChange={(e) => upd({ sku: e.target.value })} placeholder="SKU-001" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">GTIN, UPC, EAN, or ISBN
                  <input value={variant.gtin ?? ""} onChange={(e) => upd({ gtin: e.target.value })} placeholder="Optional" className={inp} />
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                  <input type="checkbox" checked={variant.enabled !== false} onChange={(e) => upd({ enabled: e.target.checked })}
                    className="h-4 w-4 rounded-control border-slate-300 text-amber-600" />
                  Enabled
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                  <input type="checkbox" checked={!!variant.manageStock} onChange={(e) => upd({ manageStock: e.target.checked })}
                    className="h-4 w-4 rounded-control border-slate-300 text-amber-600" />
                  Manage stock?
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-700">Regular price (₹)
                  <input type="number" value={variant.offer.mrp} onChange={(e) => updNested("offer", { mrp: e.target.value })}
                    placeholder="Variation price (required)" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Sale price (₹)
                  <input type="number" value={variant.offer.salePrice} onChange={(e) => updNested("offer", { salePrice: e.target.value })}
                    placeholder="Optional" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Selling price (₹)
                  <input type="number" value={variant.offer.sellingPrice} onChange={(e) => updNested("offer", { sellingPrice: e.target.value })}
                    placeholder="0.00" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Max order qty
                  <input type="number" min="1" value={variant.offer.maximumOrderQuantity}
                    onChange={(e) => updNested("offer", { maximumOrderQuantity: Number(e.target.value) })} className={inp} />
                </label>
              </div>

              {variant.manageStock ? (
                <label className="block text-xs font-semibold text-ink-700">Quantity
                  <input type="number" value={variant.inventory.stock}
                    onChange={(e) => updNested("inventory", { stock: e.target.value, quantity: e.target.value })}
                    placeholder="0" className={inp} />
                </label>
              ) : (
                <label className="block text-xs font-semibold text-ink-700">Stock status
                  <select value={variant.stockStatus} onChange={(e) => upd({ stockStatus: e.target.value })} className={selectInp}>
                    {STOCK_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-700">Weight (kg)
                  <input type="number" value={variant.weight} onChange={(e) => upd({ weight: e.target.value })} className={inp} />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["length", "width", "height"].map((k) => (
                    <label key={k} className="block text-xs font-semibold text-ink-700 capitalize">{k}
                      <input type="number" value={variant.dimensions[k]}
                        onChange={(e) => updNested("dimensions", { [k]: e.target.value })} className={inp} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-700">Shipping class
                  <select value={variant.shippingClass} onChange={(e) => upd({ shippingClass: e.target.value })} className={selectInp}>
                    <option value="">Same as parent</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-ink-700">Tax class
                  <select value={variant.taxClass} onChange={(e) => upd({ taxClass: e.target.value })} className={selectInp}>
                    <option value="">Same as parent</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold text-ink-700">Description
                <textarea value={variant.description} onChange={(e) => upd({ description: e.target.value })}
                  rows={3} className={`${inp} resize-none`} />
              </label>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Variations panel (toolbar + warnings + list) ──
  function VariantsPanel({ attributesMeta, variants, setVariants }) {
    const [bulkAction, setBulkAction] = useState("");
    const [bulkValue, setBulkValue] = useState("");
    const [expandAll, setExpandAll] = useState(false);
    const [expandTick, setExpandTick] = useState(0);

    const regenerate = () => setVariants((prev) => regenerateVariants(prev, attributesMeta));

    const addBlankManual = () => setVariants((prev) => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enabled: true, manageStock: true, sku: "", gtin: "",
      attributes: attributesMeta.filter((g) => g.forVariations !== false && g.name.trim()).map((g) => ({ name: g.name, value: "" })),
      images: [], description: "", weight: "",
      dimensions: { length: "", width: "", height: "" },
      shippingClass: "", taxClass: "", stockStatus: "instock",
      inventory: { stock: "", quantity: "" },
      offer: { mrp: "", sellingPrice: "", salePrice: "", handlingTime: 2, itemCondition: "New", maximumOrderQuantity: 5 },
    }]);

    const updateAt = (idx, next) => setVariants((prev) => prev.map((v, i) => (i === idx ? next : v)));
    const removeAt = (idx) => setVariants((prev) => prev.filter((_, i) => i !== idx));

    const applyBulk = () => {
      if (!bulkAction) return;
      if (bulkAction === "deleteAll") { setVariants([]); setBulkAction(""); setBulkValue(""); return; }
      setVariants((prev) => prev.map((v) => {
        switch (bulkAction) {
          case "price":     return { ...v, offer: { ...v.offer, mrp: bulkValue, sellingPrice: bulkValue } };
          case "sale":      return { ...v, offer: { ...v.offer, salePrice: bulkValue } };
          case "stockIn":   return { ...v, manageStock: false, stockStatus: "instock" };
          case "stockOut":  return { ...v, manageStock: false, stockStatus: "outofstock" };
          case "enableAll": return { ...v, enabled: true };
          case "disableAll":return { ...v, enabled: false };
          default: return v;
        }
      }));
      setBulkAction(""); setBulkValue("");
    };

    const missingPriceCount = variants.filter((v) => !v.offer.mrp && !v.offer.sellingPrice).length;
    const hasVariableAttrs = attributesMeta.some((g) => g.forVariations !== false && g.values.some((v) => v.trim()));

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={regenerate}
            className="rounded-card border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors">
            {variants.length ? "Regenerate variations" : "Generate variations"}
          </button>
          <button type="button" onClick={addBlankManual}
            className="rounded-card border border-slate-200 px-3.5 py-2 text-xs font-bold text-ink-700 hover:bg-slate-50 transition-colors">
            Add manually
          </button>
          <div className="flex items-center gap-2">
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className={`${selectInp} mt-0 w-44`}>
              <option value="">Bulk actions…</option>
              <option value="price">Set regular price</option>
              <option value="sale">Set sale price</option>
              <option value="stockIn">Set all in stock</option>
              <option value="stockOut">Set all out of stock</option>
              <option value="enableAll">Enable all</option>
              <option value="disableAll">Disable all</option>
              <option value="deleteAll">Delete all variations</option>
            </select>
            {(bulkAction === "price" || bulkAction === "sale") && (
              <input value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} placeholder="₹"
                className="w-20 rounded-card border border-slate-200 px-2 py-2 text-xs outline-none focus:border-amber-500" />
            )}
            <button type="button" onClick={applyBulk} disabled={!bulkAction}
              className="rounded-card bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-40 transition-colors">
              Apply
            </button>
          </div>

          {/* WooCommerce-style right-aligned "N variations (Expand / Close)" */}
          <div className="ml-auto text-xs text-slate-500">
            {variants.length} variation{variants.length !== 1 ? "s" : ""}{" "}
            (
            <button type="button" className="text-amber-600 hover:underline font-semibold"
              onClick={() => { setExpandAll(true); setExpandTick((t) => t + 1); }}>
              Expand
            </button>
            {" / "}
            <button type="button" className="text-amber-600 hover:underline font-semibold"
              onClick={() => { setExpandAll(false); setExpandTick((t) => t + 1); }}>
              Close
            </button>
            )
          </div>
        </div>

        {missingPriceCount > 0 && (
          <div className="flex items-center gap-2 rounded-card border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
            <AlertCircle size={13} className="shrink-0" />
            {missingPriceCount} variation{missingPriceCount !== 1 ? "s" : ""} do{missingPriceCount === 1 ? "es" : ""} not have a price. Variations without prices won't show in your store.
          </div>
        )}

        {variants.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm text-slate-400 font-medium">
              {hasVariableAttrs
                ? 'Click "Generate variations" to build every combination.'
                : 'Select values on at least one attribute marked "Used for variations" above, then generate.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-500">{variants.length} variation{variants.length !== 1 ? "s" : ""}</p>
            {variants.map((v, i) => (
              <VariantRow key={v.id ?? i} variant={v} index={i} attributesMeta={attributesMeta}
                forceOpen={expandAll} forceOpenTick={expandTick}
                onChange={(next) => updateAt(i, next)} onRemove={() => removeAt(i)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── TAB 1: Basic Info (single product only) ────────────────────
  function TabBasicInfo({ form, setForm, categories, subCategories, subToSubCategories,
    catLoading, subCatLoading, attrLoading, selectedCat, selectedSub, selectedSubSub,
    selectedCatName, selectedSubName, attributes, attrValues, setAttrValues,
    handleCatChange, handleSubChange, handleSubSubChange }) {
    return (
      <div className="space-y-8">
        <SectionTitle icon={Hash} label="Identifiers" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800 md:col-span-2">
            Product Name <span className="text-red-500">*</span>
            <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })}
              placeholder="e.g. Women Floral Printed Top" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Item Name
            <input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              placeholder="e.g. Omaan Women Casual Top" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Product Type
            <input value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}
              placeholder="e.g. Apparel" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Brand Name
            <input value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              placeholder="e.g. Omaan" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Recommended Browse Node
            <input value={form.recommendedBrowseNode} onChange={(e) => setForm({ ...form, recommendedBrowseNode: e.target.value })}
              placeholder="e.g. Women Tops" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            External Product ID
            <input value={form.externalProductId} onChange={(e) => setForm({ ...form, externalProductId: e.target.value })}
              placeholder="e.g. OMAAN-TOP-001" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Base Price (₹)
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Opening Stock
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="0" className={inp} />
          </label>
        </div>

        <SectionTitle icon={Layers} label="Category" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800">
            Category <span className="text-red-500">*</span>
            {catLoading ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 p-2.5">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" /> Loading…
              </div>
            ) : (
              <select value={selectedCat} onChange={(e) => handleCatChange(e.target.value)} className={selectInp}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            )}
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Sub-category <span className="text-red-500">*</span>
            {subCatLoading ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 p-2.5">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" /> Loading…
              </div>
            ) : (
              <select value={selectedSub} onChange={(e) => handleSubChange(e.target.value)}
                disabled={!subCategories.length} className={`${selectInp} disabled:cursor-not-allowed disabled:opacity-50`}>
                <option value="">Select sub-category…</option>
                {subCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            )}
          </label>
          <label className="block text-sm font-semibold text-ink-800 md:col-span-2">
            Sub-to-sub category <span className="text-xs font-normal text-slate-400">(optional)</span>
            <select value={selectedSubSub} onChange={(e) => handleSubSubChange(e.target.value)}
              disabled={!subToSubCategories.length} className={`${selectInp} disabled:cursor-not-allowed disabled:opacity-50`}>
              <option value="">
                {!selectedSub ? "Select sub-category first" : subToSubCategories.length ? "Select sub-to-sub category…" : "None available for this sub-category"}
              </option>
              {subToSubCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        {attrLoading && (
          <div className="flex items-center gap-3 rounded-card border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600 shrink-0" />
            Loading product attribute fields…
          </div>
        )}
        {!attrLoading && attributes.length > 0 && (
          <div className="rounded-card border border-slate-100 bg-slate-50/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Category Attributes — {attributes.length} fields</p>
              <span className="text-xs text-white bg-amber-500 px-2 py-0.5 rounded-full font-medium">{attributes.filter((a) => a.required).length} required</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {attributes.map((attr) => (
                <AttrField key={attr._id} attr={attr} value={attrValues[attr._id] ?? ""}
                  onChange={(id, val) => setAttrValues((prev) => ({ ...prev, [id]: val }))} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function TabDescription({ desc, setDesc }) {
    const addBullet    = () => setDesc((d) => ({ ...d, bulletPoints: [...d.bulletPoints, ""] }));
    const removeBullet = (i) => setDesc((d) => ({ ...d, bulletPoints: d.bulletPoints.filter((_, idx) => idx !== i) }));
    const updateBullet = (i, v) => setDesc((d) => ({ ...d, bulletPoints: d.bulletPoints.map((x, idx) => idx === i ? v : x) }));
    return (
      <div className="space-y-8">
        <SectionTitle icon={FileText} label="Product Description" />
        <label className="block text-sm font-semibold text-ink-800">
          Product Description
          <textarea value={desc.productDescription}
            onChange={(e) => setDesc((d) => ({ ...d, productDescription: e.target.value }))}
            rows={5} placeholder="Detailed product description…" className={`${inp} resize-none`} />
        </label>

        <SectionTitle icon={Zap} label="Bullet Points" />
        <div className="space-y-2.5">
          {desc.bulletPoints.map((bp, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">{i + 1}</span>
              <input value={bp} onChange={(e) => updateBullet(i, e.target.value)}
                placeholder={`Bullet point ${i + 1}`}
                className="flex-1 rounded-card border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm hover:border-slate-300" />
              {desc.bulletPoints.length > 1 && (
                <button onClick={() => removeBullet(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addBullet} className="flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors mt-2 ml-9">
            <Plus size={14} /> Add bullet point
          </button>
        </div>

        <SectionTitle icon={Search} label="Search & Meta Keywords" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800">
            Metadata <span className="text-xs font-normal text-slate-400">(space separated)</span>
            <input value={desc.metadata} onChange={(e) => setDesc((d) => ({ ...d, metadata: e.target.value }))}
              placeholder="women floral printed top casual wear" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Meta Keywords <span className="text-xs font-normal text-slate-400">(comma separated)</span>
            <input value={desc.metaKeywords} onChange={(e) => setDesc((d) => ({ ...d, metaKeywords: e.target.value }))}
              placeholder="women top, floral top, casual wear" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800 md:col-span-2">
            Search Keywords <span className="text-xs font-normal text-slate-400">(comma separated)</span>
            <input value={desc.searchKeywords} onChange={(e) => setDesc((d) => ({ ...d, searchKeywords: e.target.value }))}
              placeholder="women clothing, summer top, fashion top" className={inp} />
          </label>
        </div>
      </div>
    );
  }

  function TabProductDetails({ details, setDetails }) {
    const upd    = (k, v) => setDetails((d) => ({ ...d, [k]: v }));
    const updDim = (section, k, v) => setDetails((d) => ({ ...d, [section]: { ...d[section], [k]: v } }));
    const addFeature    = () => setDetails((d) => ({ ...d, specialFeatures: [...d.specialFeatures, ""] }));
    const removeFeature = (i) => setDetails((d) => ({ ...d, specialFeatures: d.specialFeatures.filter((_, idx) => idx !== i) }));
    const updateFeature = (i, v) => setDetails((d) => ({ ...d, specialFeatures: d.specialFeatures.map((x, idx) => idx === i ? v : x) }));
    const addComp    = () => setDetails((d) => ({ ...d, includedComponents: [...d.includedComponents, ""] }));
    const removeComp = (i) => setDetails((d) => ({ ...d, includedComponents: d.includedComponents.filter((_, idx) => idx !== i) }));
    const updateComp = (i, v) => setDetails((d) => ({ ...d, includedComponents: d.includedComponents.map((x, idx) => idx === i ? v : x) }));
    const listInp = "flex-1 rounded-card border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm hover:border-slate-300";
    return (
      <div className="space-y-8">
        <SectionTitle icon={Tag} label="Target & Type" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800">Target Audience<input value={details.targetAudienceKeyword} onChange={(e) => upd("targetAudienceKeyword", e.target.value)} placeholder="e.g. Women" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Item Type Name<input value={details.itemTypeName} onChange={(e) => upd("itemTypeName", e.target.value)} placeholder="e.g. Top" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Generic Keyword<input value={details.genericKeyword} onChange={(e) => upd("genericKeyword", e.target.value)} placeholder="e.g. Women Top" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Occasion<input value={details.occasion} onChange={(e) => upd("occasion", e.target.value)} placeholder="e.g. Casual" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Theme<input value={details.theme} onChange={(e) => upd("theme", e.target.value)} placeholder="e.g. Floral" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Item Shape / Fit<input value={details.itemShape} onChange={(e) => upd("itemShape", e.target.value)} placeholder="e.g. Regular Fit" className={inp} /></label>
        </div>

        <SectionTitle icon={Box} label="Manufacturer" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800">Manufacturer<input value={details.manufacturer} onChange={(e) => upd("manufacturer", e.target.value)} placeholder="e.g. Omaan Fashion Pvt Ltd" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Manufacturer Contact<input value={details.manufacturerContactInfo} onChange={(e) => upd("manufacturerContactInfo", e.target.value)} placeholder="e.g. support@omaan.com" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Model Number<input value={details.modelNumber} onChange={(e) => upd("modelNumber", e.target.value)} placeholder="e.g. WT-101" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Part Number<input value={details.partNumber} onChange={(e) => upd("partNumber", e.target.value)} placeholder="e.g. OMAAN-WT-101" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Material<input value={details.material} onChange={(e) => upd("material", e.target.value)} placeholder="e.g. Cotton" className={inp} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-ink-800">Unit Count<input type="number" value={details.unitCount} onChange={(e) => upd("unitCount", e.target.value)} placeholder="1" className={inp} /></label>
            <label className="block text-sm font-semibold text-ink-800">Unit Type<input value={details.unitCountType} onChange={(e) => upd("unitCountType", e.target.value)} placeholder="Piece" className={inp} /></label>
          </div>
        </div>

        <SectionTitle icon={Sparkles} label="Special Features" />
        <div className="space-y-2.5">
          {details.specialFeatures.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <input value={f} onChange={(e) => updateFeature(i, e.target.value)} placeholder={`Feature ${i + 1}, e.g. Lightweight`} className={listInp} />
              {details.specialFeatures.length > 1 && (
                <button onClick={() => removeFeature(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><X size={14} /></button>
              )}
            </div>
          ))}
          <button onClick={addFeature} className="flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors mt-1"><Plus size={14} /> Add feature</button>
        </div>

        <SectionTitle icon={Package} label="Included Components" />
        <div className="space-y-2.5">
          {details.includedComponents.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <input value={c} onChange={(e) => updateComp(i, e.target.value)} placeholder={`Component ${i + 1}, e.g. 1 Women Top`} className={listInp} />
              {details.includedComponents.length > 1 && (
                <button onClick={() => removeComp(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><X size={14} /></button>
              )}
            </div>
          ))}
          <button onClick={addComp} className="flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors mt-1"><Plus size={14} /> Add component</button>
        </div>

        <SectionTitle icon={Box} label="Item Dimensions (cm)" />
        <div className="grid gap-5 md:grid-cols-3">
          {["length","width","height"].map((k) => (
            <label key={k} className="block text-sm font-semibold text-ink-800 capitalize">{k}
              <input type="number" value={details.itemDimensions[k]} onChange={(e) => updDim("itemDimensions", k, e.target.value)} placeholder="0" className={inp} />
            </label>
          ))}
        </div>

        <SectionTitle icon={Box} label="Package Dimensions (cm)" />
        <div className="grid gap-5 md:grid-cols-3">
          {["length","width","height"].map((k) => (
            <label key={k} className="block text-sm font-semibold text-ink-800 capitalize">{k}
              <input type="number" value={details.packageDimensions[k]} onChange={(e) => updDim("packageDimensions", k, e.target.value)} placeholder="0" className={inp} />
            </label>
          ))}
        </div>

        <SectionTitle icon={Package} label="Weight & Packaging" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800">Item Weight<input type="number" value={details.itemWeight} onChange={(e) => upd("itemWeight", e.target.value)} placeholder="200" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Weight Unit<select value={details.itemWeightUnit} onChange={(e) => upd("itemWeightUnit", e.target.value)} className={selectInp}><option>grams</option><option>kg</option><option>lbs</option><option>oz</option></select></label>
          <label className="block text-sm font-semibold text-ink-800">Package Weight (grams)<input type="number" value={details.packageWeight} onChange={(e) => upd("packageWeight", e.target.value)} placeholder="250" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Packaging Type<input value={details.packagingType} onChange={(e) => upd("packagingType", e.target.value)} placeholder="e.g. Polybag" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Source Type<select value={details.sourceType} onChange={(e) => upd("sourceType", e.target.value)} className={selectInp}><option>Manufacturer</option><option>Distributor</option><option>Reseller</option></select></label>
          <label className="block text-sm font-semibold text-ink-800">Fulfillment Channel<select value={details.fulfillmentChannel} onChange={(e) => upd("fulfillmentChannel", e.target.value)} className={selectInp}><option>Seller</option><option>Marketplace</option><option>FBA</option></select></label>
          <label className="block text-sm font-semibold text-ink-800">Number of Packs<input type="number" value={details.numberOfPacks} onChange={(e) => upd("numberOfPacks", e.target.value)} placeholder="1" className={inp} /></label>
        </div>
      </div>
    );
  }

  function TabImages({ images, setImages, bulkMode }) {
    const addImage    = () => setImages((p) => [...p, ""]);
    const removeImage = (i) => setImages((p) => p.filter((_, idx) => idx !== i));
    const updateImage = (i, v) => setImages((p) => p.map((x, idx) => idx === i ? v : x));
    return (
      <div className="space-y-6">
        <SectionTitle icon={Image} label={bulkMode ? "Shared Gallery Images" : "Product Images"} />
        <p className="text-sm text-slate-500 -mt-4">
          {bulkMode
            ? "These apply to every product in the batch, in addition to each product's own image list (set on the Products tab)."
            : "Add image URLs for the main product listing."}
        </p>
        <div className="space-y-3">
          {images.map((url, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
                {url
                  ? <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display="none"; }} />
                  : <ImageIcon size={18} className="text-slate-300" />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input value={url} onChange={(e) => updateImage(i, e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 rounded-card border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm hover:border-slate-300" />
                  {images.length > 1 && (
                    <button onClick={() => removeImage(i)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {i === 0 ? <span className="text-amber-600 font-medium">★ Main listing image</span> : `Image ${i + 1}`}
                </p>
              </div>
            </div>
          ))}
          <button onClick={addImage}
            className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-amber-200 py-3.5 text-sm font-semibold text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-all mt-2">
            <Plus size={15} /> Add image URL
          </button>
        </div>
      </div>
    );
  }

  // ── TAB: Attributes & Variants ──
  function TabVariants({ attributesMeta, setAttributesMeta, variants, setVariants, attributes }) {
    return (
      <div className="space-y-8">
        <SectionTitle icon={Tag} label="Attributes" />
        <AttributesMetaBuilder attributesMeta={attributesMeta} setAttributesMeta={setAttributesMeta} attributes={attributes} />

        <SectionTitle icon={Layers} label="Variations" />
        <VariantsPanel attributesMeta={attributesMeta} variants={variants} setVariants={setVariants} />
      </div>
    );
  }

  function TabSafety({ safety, setSafety }) {
    const upd = (k, v) => setSafety((s) => ({ ...s, [k]: v }));
    return (
      <div className="space-y-8">
        <SectionTitle icon={Shield} label="Origin & Compliance" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800">Country / Region of Origin<input value={safety.countryRegionOfOrigin} onChange={(e) => upd("countryRegionOfOrigin", e.target.value)} placeholder="e.g. India" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Dangerous Goods Regulation<select value={safety.dangerousGoodsRegulation} onChange={(e) => upd("dangerousGoodsRegulation", e.target.value)} className={selectInp}><option value="No">No</option><option value="Yes">Yes</option></select></label>
          <label className="block text-sm font-semibold text-ink-800">Buyer Age Restriction<input value={safety.buyerAgeRestriction} onChange={(e) => upd("buyerAgeRestriction", e.target.value)} placeholder="e.g. None / 18+ / 13+" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Regulatory Compliance Certification<input value={safety.regulatoryComplianceCertification} onChange={(e) => upd("regulatoryComplianceCertification", e.target.value)} placeholder="e.g. Textile Certified" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800 md:col-span-2">Mandatory Cautionary Statement<input value={safety.mandatoryCautionaryStatement} onChange={(e) => upd("mandatoryCautionaryStatement", e.target.value)} placeholder="e.g. Keep away from fire" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Safety Attestation<input value={safety.safetyAttestation} onChange={(e) => upd("safetyAttestation", e.target.value)} placeholder="e.g. Safe Product" className={inp} /></label>
          <label className="block text-sm font-semibold text-ink-800">Safety Attestation Address<input value={safety.safetyAttestationAddress} onChange={(e) => upd("safetyAttestationAddress", e.target.value)} placeholder="e.g. Jaipur, Rajasthan" className={inp} /></label>
        </div>

        <SectionTitle icon={Package} label="Shipping & Gift" />
        <div className="flex flex-wrap gap-4">
          {[["shipsGlobally","Ships Globally"],["giftMessageAvailable","Gift Message Available"],["giftWrapAvailable","Gift Wrap Available"]].map(([k, label]) => (
            <label key={k} className={`flex items-center gap-3 cursor-pointer rounded-card border-2 px-4 py-3 transition-all ${
              safety[k] ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"
            }`}>
              <div className={`flex h-5 w-5 items-center justify-center rounded-control border-2 transition-all ${
                safety[k] ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-white"
              }`}>
                {safety[k] && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
              <input type="checkbox" checked={safety[k]} onChange={(e) => upd(k, e.target.checked)} className="sr-only" />
              <span className="text-sm font-semibold text-ink-800">{label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  function TabSeo({ seo, setSeo, slug, setSlug, setSlugEdited, productName }) {
    const descLen  = seo.metaDesc.length;
    const titleLen = seo.metaTitle.length;
    const descColor = descLen > 160 ? "#ef4444" : descLen > 130 ? "#f59e0b" : descLen > 0 ? "#22c55e" : "#94a3b8";
    return (
      <div className="space-y-6">
        <SectionTitle icon={Search} label="SEO Settings" />
        <label className="block text-sm font-semibold text-ink-800">
          <div className="flex items-center justify-between mb-1">
            <span>Meta Title</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${titleLen > 60 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>{titleLen}/60</span>
          </div>
          <input value={seo.metaTitle} onChange={(e) => setSeo((s) => ({ ...s, metaTitle: e.target.value }))}
            maxLength={70} placeholder="Title shown in Google results…" className={inp} />
        </label>
        <label className="block text-sm font-semibold text-ink-800">
          <div className="flex items-center justify-between mb-1">
            <span>Meta Description</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100" style={{ color: descColor }}>{descLen}/160</span>
          </div>
          <textarea value={seo.metaDesc} onChange={(e) => setSeo((s) => ({ ...s, metaDesc: e.target.value }))}
            rows={3} placeholder="Short description shown under title in Google…" className={`${inp} resize-none`} />
        </label>
        <label className="block text-sm font-semibold text-ink-800">
          <div className="flex items-center justify-between mb-1">
            <span>URL Slug</span>
            {slug && <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-control">/products/{slug}</span>}
          </div>
          <div className="mt-1 flex overflow-hidden rounded-card border border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-sm transition-all">
            <span className="flex items-center bg-slate-100 px-3 text-xs text-slate-500 border-r border-slate-200 whitespace-nowrap font-mono">/products/</span>
            <input value={slug} onChange={(e) => { setSlug(generateSlug(e.target.value)); setSlugEdited(true); }}
              placeholder="auto-generated-from-name"
              className="flex-1 bg-white px-3 py-2.5 text-sm font-mono text-amber-600 outline-none" />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Auto-generated from product name. Edit manually if needed.</p>
        </label>

        <div className="rounded-card border border-slate-200 bg-slate-50/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search size={13} className="text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Google Search Preview</p>
          </div>
          <div className="rounded-card border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-0.5 text-xs text-emerald-600 font-medium">yoursite.com/products/<span>{slug || "product-slug"}</span></p>
            <p className="text-lg font-medium leading-snug text-slate-400 cursor-default">{seo.metaTitle || productName || "Product Title — Your Store"}</p>
            <p className="mt-1 text-sm leading-snug text-ink-700">{seo.metaDesc ? seo.metaDesc.slice(0, 160) : "Your meta description will appear here…"}</p>
          </div>
          <p className="mt-2.5 text-xs text-slate-400">Approximation of how your product appears on Google.</p>
        </div>
      </div>
    );
  }

  // ── Bulk variant row shape ──
  // In bulk mode the batch is really ONE product (Product Name lives once, at
  // the top, as "Base Product Name") with MANY variants underneath it — same
  // shape as a normal product's "variants" array in the API payload:
  // { variantName, sku, productUrl, mrp, sellingPrice, salePrice, handlingTime,
  //   itemCondition, images, attributes, inventory: { stock, maxQty, isActive } }
  //
  // variantName is auto-derived from this row's attribute values only (e.g.
  // "Silver" + "42 mm" -> "Silver 42 mm"); productName is NOT part of the row
  // anymore — it's set once, at the top of the tab.
  function buildBulkComboRow(comboAttrs) {
    const autoName = comboAttrs.map((a) => a.value).filter(Boolean).join(" ");
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enabled: true,
      attributes: comboAttrs, // [{ name, value }] — the combination this row represents
      variantName: autoName,
      sku: "",
      productUrl: "",
      productUrlEdited: false,
      mrp: "",
      sellingPrice: "",
      salePrice: "",
      handlingTime: 2,
      itemCondition: "New",
      images: [""],
      inventory: { stock: "", maxQty: 5 },
    };
  }

  function buildBulkCombosFromMeta(attributesMeta) {
    const filled = attributesMeta.filter(
      (g) => g.forVariations !== false && g.name.trim() && g.values.some((v) => v.trim())
    );
    if (!filled.length) return [];
    const combos = cartesian(filled.map((g) => g.values.filter((v) => v.trim())));
    return combos.map((combo) => buildBulkComboRow(filled.map((g, i) => ({ name: g.name, value: combo[i] }))));
  }

  function regenerateBulkCombos(existing, attributesMeta) {
    const fresh = buildBulkCombosFromMeta(attributesMeta);
    const byKey = new Map(existing.map((c) => [variantSignature(c.attributes), c]));
    return fresh.map((c) => {
      const match = byKey.get(variantSignature(c.attributes));
      return match ? { ...match, id: c.id, attributes: c.attributes } : c;
    });
  }

  // ── Single combination row — collapsed shows one inline <select> per
  // combination attribute (e.g. 2 fields for Color × Size), the variant name,
  // price/stock glance, and Edit/Remove. Expanded shows just the variant-level
  // fields: Variant Name, SKU, Product URL, Images, Pricing & Inventory —
  // matching the target "variants[]" schema exactly (no Product Name, Brand,
  // Tags, or Description here — those live once at the top of the tab / on
  // the shared Description & Images tabs).
  function BulkComboRow({ combo, index, attributesMeta, forceOpen, forceOpenTick, onChange, onRemove }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
      if (forceOpen !== undefined) setOpen(forceOpen);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forceOpenTick]);

    const upd = (patch) => onChange({ ...combo, ...patch });
    const updNested = (key, patch) => onChange({ ...combo, [key]: { ...combo[key], ...patch } });

    const missingPrice = !combo.mrp && !combo.sellingPrice;
    const missingName = !combo.variantName.trim();

    const optionsFor = (attrName) => {
      const group = attributesMeta.find((g) => g.name === attrName);
      return group ? (group.fromCategory ? group.options : group.values) : [];
    };
    const setAttrValue = (attrName, value) => {
      upd({ attributes: combo.attributes.map((a) => (a.name === attrName ? { ...a, value } : a)) });
    };

    const addImage    = () => upd({ images: [...combo.images, ""] });
    const removeImage = (i) => upd({ images: combo.images.filter((_, idx) => idx !== i) });
    const updateImage = (i, v) => upd({ images: combo.images.map((x, idx) => idx === i ? v : x) });

    return (
      <div className={`rounded-card border ${missingPrice || missingName ? "border-amber-200" : "border-slate-200"} bg-white shadow-sm overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-amber-50/20 transition-colors">
          <GripVertical size={14} className="text-slate-300 shrink-0" />
          <span className="text-xs font-mono text-slate-400 shrink-0 w-10">#{index + 1}</span>

          {/* Inline combination fields — one <select> per attribute used for variations */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {combo.attributes.map((a) => {
              const opts = optionsFor(a.name);
              return (
                <label key={a.name} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium hidden sm:inline">{a.name}:</span>
                  {opts.length ? (
                    <select value={a.value} onChange={(e) => setAttrValue(a.name, e.target.value)}
                      className="rounded-control border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-amber-700 outline-none focus:border-amber-500 cursor-pointer">
                      {!opts.includes(a.value) && a.value && <option value={a.value}>{a.value}</option>}
                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={a.value} onChange={(e) => setAttrValue(a.name, e.target.value)}
                      className="w-20 rounded-control border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-amber-700 outline-none focus:border-amber-500" />
                  )}
                </label>
              );
            })}
          </div>

          <span className="text-xs font-semibold text-ink-800 truncate max-w-[220px]">
            {combo.variantName || <span className="text-slate-400 font-normal italic">Untitled variant</span>}
          </span>

          {missingName && (
            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
              No name
            </span>
          )}
          {missingPrice && (
            <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
              No price
            </span>
          )}

          <div className="flex items-center gap-3 shrink-0 ml-auto">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-700 cursor-pointer">
              <input type="checkbox" checked={combo.enabled !== false} onChange={(e) => upd({ enabled: e.target.checked })}
                className="h-3.5 w-3.5 rounded-control border-slate-300 text-amber-600" />
              Enabled
            </label>
            <button type="button" onClick={onRemove} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
            <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-amber-600 hover:underline">
              {open ? "Close" : "Edit"}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-slate-100 px-4 py-5 space-y-6">

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Identifiers</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-700">Variant Name <span className="text-red-500">*</span>
                  <input value={combo.variantName} onChange={(e) => upd({ variantName: e.target.value })}
                    placeholder="e.g. Silver Stainless Steel Watch" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">SKU
                  <input value={combo.sku} onChange={(e) => upd({ sku: e.target.value })}
                    placeholder="e.g. TITAN-NEO-SLV" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700 md:col-span-2">Product URL
                  <div className="mt-1 flex overflow-hidden rounded-card border border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-sm transition-all">
                    <span className="flex items-center bg-slate-100 px-2 text-[11px] text-slate-500 border-r border-slate-200 whitespace-nowrap font-mono">/products/</span>
                    <input value={combo.productUrl || generateSlug(combo.variantName)}
                      onChange={(e) => upd({ productUrl: generateSlug(e.target.value), productUrlEdited: true })}
                      placeholder="auto-generated" className="flex-1 bg-white px-2 py-2 text-xs font-mono text-amber-600 outline-none" />
                  </div>
                </label>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Images</p>
              <div className="space-y-2">
                {combo.images.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-slate-200 bg-slate-50 overflow-hidden">
                      {url ? <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = "none"; }} /> : <ImageIcon size={13} className="text-slate-300" />}
                    </div>
                    <input value={url} onChange={(e) => updateImage(i, e.target.value)} placeholder="https://example.com/image.jpg"
                      className="flex-1 rounded-card border border-slate-200 px-3 py-2 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                    {combo.images.length > 1 && (
                      <button type="button" onClick={() => removeImage(i)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-slate-400 hover:bg-red-50 hover:text-red-500">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addImage} className="text-xs font-semibold text-amber-600 hover:underline">+ Add image URL</button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Pricing & Inventory</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-700">MRP / Regular price (₹)
                  <input type="number" value={combo.mrp} onChange={(e) => upd({ mrp: e.target.value })}
                    placeholder="Required" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Selling price (₹)
                  <input type="number" value={combo.sellingPrice} onChange={(e) => upd({ sellingPrice: e.target.value })}
                    placeholder="0.00" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Sale price (₹)
                  <input type="number" value={combo.salePrice} onChange={(e) => upd({ salePrice: e.target.value })}
                    placeholder="Optional" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Item condition
                  <select value={combo.itemCondition} onChange={(e) => upd({ itemCondition: e.target.value })} className={selectInp}>
                    {ITEM_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-ink-700">Handling time (days)
                  <input type="number" min="0" value={combo.handlingTime}
                    onChange={(e) => upd({ handlingTime: Number(e.target.value) })} className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Stock quantity
                  <input type="number" value={combo.inventory.stock}
                    onChange={(e) => updNested("inventory", { stock: e.target.value })} placeholder="0" className={inp} />
                </label>
                <label className="block text-xs font-semibold text-ink-700">Max order qty
                  <input type="number" min="1" value={combo.inventory.maxQty}
                    onChange={(e) => updNested("inventory", { maxQty: Number(e.target.value) })} className={inp} />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Combinations panel (toolbar + warnings + list) — one row per variant of
  // the single bulk product.
  function BulkCombosPanel({ attributesMeta, combos, setCombos }) {
    const [bulkAction, setBulkAction] = useState("");
    const [bulkValue, setBulkValue] = useState("");
    const [expandAll, setExpandAll] = useState(false);
    const [expandTick, setExpandTick] = useState(0);

    const regenerate = () => setCombos((prev) => regenerateBulkCombos(prev, attributesMeta));

    const addBlankManual = () => setCombos((prev) => [...prev, buildBulkComboRow(
      attributesMeta.filter((g) => g.forVariations !== false && g.name.trim()).map((g) => ({ name: g.name, value: "" }))
    )]);

    const updateAt = (idx, next) => setCombos((prev) => prev.map((c, i) => (i === idx ? next : c)));
    const removeAt = (idx) => setCombos((prev) => prev.filter((_, i) => i !== idx));

    const applyBulk = () => {
      if (!bulkAction) return;
      if (bulkAction === "deleteAll") { setCombos([]); setBulkAction(""); setBulkValue(""); return; }
      setCombos((prev) => prev.map((c) => {
        switch (bulkAction) {
          case "autoName":
            return { ...c, variantName: c.attributes.map((a) => a.value).filter(Boolean).join(" ") };
          case "price":     return { ...c, mrp: bulkValue, sellingPrice: bulkValue };
          case "sale":      return { ...c, salePrice: bulkValue };
          case "stock":     return { ...c, inventory: { ...c.inventory, stock: bulkValue } };
          case "enableAll": return { ...c, enabled: true };
          case "disableAll":return { ...c, enabled: false };
          default: return c;
        }
      }));
      setBulkAction(""); setBulkValue("");
    };

    const missingPriceCount = combos.filter((c) => !c.mrp && !c.sellingPrice).length;
    const missingNameCount  = combos.filter((c) => !c.variantName.trim()).length;
    const hasVariableAttrs  = attributesMeta.some((g) => g.forVariations !== false && g.values.some((v) => v.trim()));

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={regenerate}
            className="rounded-card border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors">
            {combos.length ? "Regenerate variants" : "Generate variants"}
          </button>
          <button type="button" onClick={addBlankManual}
            className="rounded-card border border-slate-200 px-3.5 py-2 text-xs font-bold text-ink-700 hover:bg-slate-50 transition-colors">
            Add manually
          </button>
          <div className="flex items-center gap-2">
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className={`${selectInp} mt-0 w-44`}>
              <option value="">Bulk actions…</option>
              <option value="autoName">Auto-fill names from attributes</option>
              <option value="price">Set regular price</option>
              <option value="sale">Set sale price</option>
              <option value="stock">Set stock qty</option>
              <option value="enableAll">Enable all</option>
              <option value="disableAll">Disable all</option>
              <option value="deleteAll">Delete all variants</option>
            </select>
            {(bulkAction === "price" || bulkAction === "sale" || bulkAction === "stock") && (
              <input value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} placeholder={bulkAction === "stock" ? "qty" : "₹"}
                className="w-20 rounded-card border border-slate-200 px-2 py-2 text-xs outline-none focus:border-amber-500" />
            )}
            <button type="button" onClick={applyBulk} disabled={!bulkAction}
              className="rounded-card bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-40 transition-colors">
              Apply
            </button>
          </div>

          <div className="ml-auto text-xs text-slate-500">
            {combos.length} variant{combos.length !== 1 ? "s" : ""}{" "}
            (
            <button type="button" className="text-amber-600 hover:underline font-semibold"
              onClick={() => { setExpandAll(true); setExpandTick((t) => t + 1); }}>
              Expand
            </button>
            {" / "}
            <button type="button" className="text-amber-600 hover:underline font-semibold"
              onClick={() => { setExpandAll(false); setExpandTick((t) => t + 1); }}>
              Close
            </button>
            )
          </div>
        </div>

        {missingNameCount > 0 && (
          <div className="flex items-center gap-2 rounded-card border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
            <AlertCircle size={13} className="shrink-0" />
            {missingNameCount} variant{missingNameCount !== 1 ? "s" : ""} still need{missingNameCount === 1 ? "s" : ""} a Variant Name — open each row to fill it in, or use "Auto-fill names from attributes".
          </div>
        )}
        {missingPriceCount > 0 && (
          <div className="flex items-center gap-2 rounded-card border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700">
            <AlertCircle size={13} className="shrink-0" />
            {missingPriceCount} variant{missingPriceCount !== 1 ? "s" : ""} do{missingPriceCount === 1 ? "es" : ""} not have a price yet.
          </div>
        )}

        {combos.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <p className="text-sm text-slate-400 font-medium">
              {hasVariableAttrs
                ? 'Click "Generate variants" to build one row per combination.'
                : 'Add attributes above, select their values, mark them "Used for variations", then generate.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-500">{combos.length} variant{combos.length !== 1 ? "s" : ""} in this product</p>
            {combos.map((c, i) => (
              <BulkComboRow key={c.id ?? i} combo={c} index={i} attributesMeta={attributesMeta}
                forceOpen={expandAll} forceOpenTick={expandTick}
                onChange={(next) => updateAt(i, next)} onRemove={() => removeAt(i)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── TAB: Bulk Products — attribute-driven variant builder ──
  // One product (Base Product Name, filled once here) with many variants.
  // Add attributes, pick values, generate every combination, then fine-tune
  // each variant's own name/sku/price/stock/images below.
  function TabBulkProducts({
    attributes, attrLoading, attributesMeta, setAttributesMeta, combos, setCombos,
    sharedProductType, setSharedProductType, sharedBrowseNode, setSharedBrowseNode,
    baseProductName, setBaseProductName,
    brandName, setBrandName, sku, setSku, tags, setTags,
  }) {
    const namedCount = combos.filter((c) => c.variantName.trim()).length;

    return (
      <div className="space-y-8">
        <SectionTitle icon={Info} label="Applies to the whole product" />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-semibold text-ink-800 md:col-span-2">
            Base Product Name <span className="text-red-500">*</span>
            <input value={baseProductName} onChange={(e) => setBaseProductName(e.target.value)}
              placeholder="e.g. Titan Neo Analog Watch" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Brand Name
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Titan" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            SKU
            <input value={sku} onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. TITAN-NEO" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Product Type
            <input value={sharedProductType} onChange={(e) => setSharedProductType(e.target.value)}
              placeholder="e.g. Watches" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800">
            Recommended Browse Node
            <input value={sharedBrowseNode} onChange={(e) => setSharedBrowseNode(e.target.value)}
              placeholder="e.g. Men's Watches" className={inp} />
          </label>
          <label className="block text-sm font-semibold text-ink-800 md:col-span-2">
            Tags <span className="text-xs font-normal text-slate-400">(comma separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="watch, analog, men" className={inp} />
          </label>
        </div>

        {attrLoading && (
          <div className="flex items-center gap-3 rounded-card border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600 shrink-0" />
            Loading category attribute fields…
          </div>
        )}

        <SectionTitle icon={Tag} label="Attributes" />
        <p className="text-sm text-slate-500 -mt-4">
          Add attributes like "Color" or "Size" — same as a single product's Attributes & Variants tab. Values marked
          "Used for variations" are combined below into one variant row per combination.
        </p>
        <AttributesMetaBuilder attributesMeta={attributesMeta} setAttributesMeta={setAttributesMeta} attributes={attributes} />

        <SectionTitle icon={Layers} label={`Variants${combos.length ? ` — ${combos.length} row${combos.length !== 1 ? "s" : ""}, ${namedCount} named` : ""}`} />
        <BulkCombosPanel attributesMeta={attributesMeta} combos={combos} setCombos={setCombos} />
      </div>
    );
  }

  const TABS = [
    { id: "basic",    label: "Basic Info",            icon: Hash },
    { id: "desc",     label: "Description",           icon: FileText },
    { id: "details",  label: "Product Details",       icon: Box },
    { id: "images",   label: "Images",                icon: Image },
    { id: "variants", label: "Attributes & Variants", icon: Palette },
    { id: "safety",   label: "Safety",                icon: Shield },
    { id: "seo",      label: "SEO",                   icon: Search },
  ];

  const BULK_TABS = [
    { id: "products", label: "Products",         icon: Package },
    { id: "desc",      label: "Description",      icon: FileText },
    { id: "details",   label: "Product Details",  icon: Box },
    { id: "images",    label: "Images (shared)",  icon: Image },
    { id: "safety",    label: "Safety",           icon: Shield },
  ];

  export default function AddProduct() {
    const navigate = useNavigate();
    const session  = getCurrentSession();

    const [vendorId,        setVendorId]        = useState("");
    const [vendorResolving, setVendorResolving]  = useState(true);

    useEffect(() => {
      let cancelled = false;
      setVendorResolving(true);
      fetchVendorIdFromUsersApi(session).then((id) => {
        if (!cancelled) {
          setVendorId(id);
          setVendorResolving(false);
        }
      });
      return () => { cancelled = true; };
    }, []);

    const [step,      setStep]      = useState(1);
    const [activeTab, setActiveTab] = useState("basic");

    const [listingMode, setListingMode] = useState(null);

    const [categories,    setCategories]    = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [catLoading,    setCatLoading]    = useState(false);
    const [subCatLoading, setSubCatLoading] = useState(false);
    const [selectedCat,   setSelectedCat]   = useState("");
    const [selectedSub,   setSelectedSub]   = useState("");
    const [selectedCatName, setSelectedCatName] = useState("");
    const [selectedSubName, setSelectedSubName] = useState("");

    const [allSubToSub,         setAllSubToSub]         = useState([]);
    const [subToSubCategories,  setSubToSubCategories]  = useState([]);
    const [selectedSubSub,      setSelectedSubSub]      = useState("");
    const [selectedSubSubName,  setSelectedSubSubName]  = useState("");

    const [attributes,  setAttributes]  = useState([]);
    const [attrValues,  setAttrValues]  = useState({});
    const [attrLoading, setAttrLoading] = useState(false);

    const [form, setForm] = useState({
      productName: "", itemName: "", productType: "", brandName: "",
      recommendedBrowseNode: "", externalProductId: "", price: "", stock: "",
    });

    const [desc, setDesc] = useState({
      productDescription: "", bulletPoints: [""],
      metadata: "", metaKeywords: "", searchKeywords: "",
    });
    const [details, setDetails] = useState({
      targetAudienceKeyword: "", modelNumber: "", manufacturer: "", genericKeyword: "",
      specialFeatures: [""], material: "", itemTypeName: "", occasion: "", partNumber: "",
      itemShape: "", theme: "", manufacturerContactInfo: "", unitCount: 1, unitCountType: "Piece",
      includedComponents: [""],
      itemDimensions:    { length: "", width: "", height: "" },
      packageDimensions: { length: "", width: "", height: "" },
      itemWeight: "", itemWeightUnit: "grams", packageWeight: "",
      packagingType: "", sourceType: "Manufacturer", fulfillmentChannel: "Seller", numberOfPacks: 1,
    });
    const [images, setImages] = useState([""]);
    const [safety, setSafety] = useState({
      countryRegionOfOrigin: "India", dangerousGoodsRegulation: "No",
      buyerAgeRestriction: "None", mandatoryCautionaryStatement: "",
      regulatoryComplianceCertification: "", safetyAttestation: "",
      safetyAttestationAddress: "", shipsGlobally: true,
      giftMessageAvailable: false, giftWrapAvailable: false,
    });

    const [attributesMeta, setAttributesMeta] = useState([]);
    const [variants,       setVariants]       = useState([]);
    const [seo,        setSeo]        = useState({ metaTitle: "", metaDesc: "" });
    const [slug,       setSlug]       = useState("");
    const [slugEdited, setSlugEdited] = useState(false);

    const [bulkAttributesMeta, setBulkAttributesMeta] = useState([]);
    const [bulkCombos,        setBulkCombos]        = useState([]);
    const [bulkProductType,   setBulkProductType]   = useState("");
    const [bulkBrowseNode,    setBulkBrowseNode]    = useState("");
    const [bulkBaseName,      setBulkBaseName]      = useState("");
    const [bulkBrandName,     setBulkBrandName]     = useState("");
    const [bulkSku,           setBulkSku]           = useState("");
    const [bulkTags,          setBulkTags]          = useState("");
    const [bulkSubmitting,    setBulkSubmitting]    = useState(false);
    const [bulkProgress,      setBulkProgress]      = useState({ done: 0, total: 0, errors: [] });

    const [submitting,  setSubmitting]  = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
      const dropdownAttrs = attributes.filter(
        (a) => OPTIONS_TYPES.includes(a.type) && Array.isArray(a.options) && a.options.length > 0
      );
      const validById = new Map(dropdownAttrs.map((a) => [a._id, a]));
      setAttributesMeta((prev) => {
        const customGroups = prev.filter((g) => !g.fromCategory);
        const keptCatGroups = prev
          .filter((g) => g.fromCategory && validById.has(g.catId))
          .map((g) => {
            const attr = validById.get(g.catId);
            return { ...g, name: attr.name, options: attr.options, values: g.values.filter((v) => attr.options.includes(v)) };
          });
        return [...keptCatGroups, ...customGroups];
      });
    }, [attributes]);

    useEffect(() => {
      const dropdownAttrs = attributes.filter(
        (a) => OPTIONS_TYPES.includes(a.type) && Array.isArray(a.options) && a.options.length > 0
      );
      const validById = new Map(dropdownAttrs.map((a) => [a._id, a]));
      setBulkAttributesMeta((prev) => {
        const customGroups = prev.filter((g) => !g.fromCategory);
        const keptCatGroups = prev
          .filter((g) => g.fromCategory && validById.has(g.catId))
          .map((g) => {
            const attr = validById.get(g.catId);
            return { ...g, name: attr.name, options: attr.options, values: g.values.filter((v) => attr.options.includes(v)) };
          });
        return [...keptCatGroups, ...customGroups];
      });
    }, [attributes]);

    useEffect(() => {
      if (!slugEdited && form.productName) setSlug(generateSlug(form.productName));
      if (!seo.metaTitle && form.productName) setSeo((s) => ({ ...s, metaTitle: form.productName }));
    }, [form.productName]);

    useEffect(() => {
      setCatLoading(true);
      fetch(CATEGORIES_URL, { headers: authConfig() })
        .then((r) => r.json())
        .then((d) => setCategories(readCategories(d).map(normalizeCategory)))
        .catch(console.error)
        .finally(() => setCatLoading(false));
    }, []);

    useEffect(() => {
      fetch(SUBTOSUB_URL, { headers: authConfig() })
        .then((r) => r.json())
        .then((d) => setAllSubToSub(readSubToSubCategories(d).map(normalizeSubToSub)))
        .catch((e) => { console.error(e); setAllSubToSub([]); });
    }, []);

    useEffect(() => {
      if (!selectedSub) { setSubToSubCategories([]); return; }
      setSubToSubCategories(
        allSubToSub.filter((s) => subToSubRefId(s.subCategoryId) === selectedSub)
      );
    }, [selectedSub, allSubToSub]);

    const handleCatChange = async (catId) => {
      const cat = categories.find((c) => c._id === catId);
      setSelectedCat(catId); setSelectedCatName(cat?.name ?? "");
      setSelectedSub(""); setSelectedSubName("");
      setSelectedSubSub(""); setSelectedSubSubName("");
      setSubCategories([]); setSubToSubCategories([]);
      setAttributes([]); setAttrValues({});
      setListingMode(null); setBulkCombos([]); setBulkAttributesMeta([]);
      if (!catId) return;
      setSubCatLoading(true);
      try {
        const res  = await fetch(SUBCATEGORIES_URL, { headers: authConfig() });
        const data = await res.json();
        const all  = readSubCategories(data).map(normalizeSubCategory);
        setSubCategories(all.filter((s) => subCategoryCatId(s.categoryId) === catId));
      } catch (e) { console.error(e); }
      finally { setSubCatLoading(false); }
    };

    const handleSubChange = async (subId) => {
      const sub = subCategories.find((s) => s._id === subId);
      setSelectedSub(subId); setSelectedSubName(sub?.name ?? "");
      setSelectedSubSub(""); setSelectedSubSubName("");
      setAttributes([]); setAttrValues({});
      setListingMode(null); setBulkCombos([]); setBulkAttributesMeta([]);
      if (!subId) return;
      setAttrLoading(true);
      try {
        const res     = await fetch(`${CATEGORYATTR_URL}/category/${selectedCat}`, { headers: authConfig() });
        const json    = await res.json();
        const raw     = Array.isArray(json) ? json : (json.data ?? []);
        const deduped = dedupeAttrs(raw);
        const defaults = {};
        deduped.forEach((a) => { defaults[a._id] = ""; });
        setAttributes(deduped); setAttrValues(defaults);
      } catch (e) { console.error(e); }
      finally { setAttrLoading(false); }
    };

    const handleSubSubChange = (subSubId) => {
      const subsub = subToSubCategories.find((s) => s._id === subSubId);
      setSelectedSubSub(subSubId);
      setSelectedSubSubName(subsub?.name ?? "");
    };

    const chooseMode = (mode) => {
      setListingMode(mode);
      if (mode === "bulk") {
        setActiveTab("products");
      } else {
        setActiveTab("basic");
      }
      setStep(2);
    };

    const buildSharedPayloadParts = () => ({
      metadata: desc.metadata,
      metaKeywords: desc.metaKeywords.split(",").map((s) => s.trim()).filter(Boolean),
      searchKeywords: desc.searchKeywords.split(",").map((s) => s.trim()).filter(Boolean),
      description: {
        productDescription: desc.productDescription,
        bulletPoints: desc.bulletPoints.filter((b) => b.trim()),
      },
      productDetails: {
        targetAudienceKeyword: details.targetAudienceKeyword,
        modelNumber: details.modelNumber,
        manufacturer: details.manufacturer,
        genericKeyword: details.genericKeyword,
        specialFeatures: details.specialFeatures.filter((f) => f.trim()),
        material: details.material,
        itemTypeName: details.itemTypeName,
        occasion: details.occasion,
        partNumber: details.partNumber,
        itemShape: details.itemShape,
        theme: details.theme,
        manufacturerContactInfo: details.manufacturerContactInfo,
        unitCount: Number(details.unitCount || 1),
        unitCountType: details.unitCountType,
        includedComponents: details.includedComponents.filter((c) => c.trim()),
      },
      dimensions: {
        itemDimensions: {
          length: Number(details.itemDimensions.length || 0),
          width:  Number(details.itemDimensions.width  || 0),
          height: Number(details.itemDimensions.height || 0),
        },
        packageDimensions: {
          length: Number(details.packageDimensions.length || 0),
          width:  Number(details.packageDimensions.width  || 0),
          height: Number(details.packageDimensions.height || 0),
        },
        itemWeight:     Number(details.itemWeight    || 0),
        itemWeightUnit: details.itemWeightUnit,
        packageWeight:  Number(details.packageWeight || 0),
      },
      packaging: {
        packagingType:      details.packagingType,
        sourceType:         details.sourceType,
        fulfillmentChannel: details.fulfillmentChannel,
        numberOfPacks:      Number(details.numberOfPacks || 1),
      },
      safetyCompliance: {
        countryRegionOfOrigin:             safety.countryRegionOfOrigin,
        dangerousGoodsRegulation:          safety.dangerousGoodsRegulation,
        buyerAgeRestriction:               safety.buyerAgeRestriction,
        mandatoryCautionaryStatement:      safety.mandatoryCautionaryStatement,
        regulatoryComplianceCertification: safety.regulatoryComplianceCertification,
        safetyAttestation:                 safety.safetyAttestation,
        safetyAttestationAddress:          safety.safetyAttestationAddress,
        shipsGlobally:                     safety.shipsGlobally,
        complianceMedia:                   [],
      },
      giftOptions: {
        giftMessageAvailable: safety.giftMessageAvailable,
        giftWrapAvailable:    safety.giftWrapAvailable,
      },
    });

    const addListing = async () => {
      setSubmitError("");

      if (!vendorId) {
        setSubmitError("Vendor ID not found in session. Please re-login and try again.");
        return;
      }

      const shared = buildSharedPayloadParts();
      const payload = {
        vendorId:              vendorId,
        productName:           form.productName,
        itemName:              form.itemName,
        productType:           form.productType,
        recommendedBrowseNode: form.recommendedBrowseNode,
        brandName:             form.brandName,
        externalProductId:     form.externalProductId,
        sku:                   form.externalProductId,
        price:                 Number(form.price  || 0),
        stock:                 Number(form.stock  || 0),
        categoryId:            selectedCat,
        subcategoryId:         selectedSub,
       subtosubcategoryid:    selectedSubSub || null ,
        ...shared,
        images: images.filter((u) => u.trim()),
        attributes: attributes.map((a) => ({ attributeId: a._id, name: a.name, value: attrValues[a._id] ?? "" })),
        attributesMeta: attributesMeta
          .filter((g) => g.name.trim() && g.values.some((v) => v.trim()))
          .map((g) => ({
            name: g.name.trim(),
            values: g.values.filter((v) => v.trim()),
            visible: g.visible !== false,
            forVariations: g.forVariations !== false,
          })),
        variants: variants
          .filter((v) => v.enabled !== false)
          .map((v) => ({
            sku: v.sku,
            gtin: v.gtin || "",
            attributes: v.attributes,
            images: v.images.filter((u) => u.trim()),
            description: v.description || "",
            weight: Number(v.weight || 0),
            dimensions: {
              length: Number(v.dimensions.length || 0),
              width:  Number(v.dimensions.width  || 0),
              height: Number(v.dimensions.height || 0),
            },
            shippingClass: v.shippingClass || "",
            taxClass: v.taxClass || "",
            inventory: {
              stock:    Number(v.inventory.stock || 0),
              quantity: Number(v.inventory.stock || 0),
              maxQty:   Number(v.offer.maximumOrderQuantity || 5),
            },
            stockStatus: v.manageStock ? undefined : v.stockStatus,
            offer: {
              mrp:                  Number(v.offer.mrp          || 0),
              sellingPrice:         Number(v.offer.sellingPrice || 0),
              salePrice:            Number(v.offer.salePrice    || 0),
              handlingTime:         v.offer.handlingTime,
              itemCondition:        v.offer.itemCondition,
              maximumOrderQuantity: Number(v.offer.maximumOrderQuantity || 5),
            },
          })),
        slug:            slug || generateSlug(form.productName),
        metaTitle:       seo.metaTitle || form.productName,
        metaDescription: seo.metaDesc,
      };

      console.log("📦 Submitting payload:", JSON.stringify(payload, null, 2));
      setSubmitting(true);
      try {
        const res = await fetch(ADD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authConfig() },
          body: JSON.stringify(payload),
        });
        const responseText = await res.text();
        console.log(`📨 Response ${res.status}:`, responseText);
        if (!res.ok) {
          let errMsg = `Server error ${res.status}`;
          try { const e = JSON.parse(responseText); errMsg = e.message || e.error || e.msg || errMsg; } catch (_) {}
          throw new Error(errMsg);
        }
        navigate("/admin/products", { state: { added: true } });
      } catch (e) {
        console.error("❌ Submit error:", e);
        setSubmitError(e.message || "Failed to save. Please try again.");
      } finally {
        setSubmitting(false);
      }
    };

    // ── Bulk submit — builds ONE product payload (Base Product Name, shared
    // description/images/details/safety) with a "variants" array built from
    // every enabled row in bulkCombos — matching the target product JSON
    // shape exactly: { productName, itemName, productUrl, categoryId,
    // subcategoryId, subtosubcategoryid, vendorId, brandName, sku,
    // description, images, isActive, status, tags, attributes[], variants[] },
    // where each variants[] entry is { variantName, sku, productUrl, mrp,
    // sellingPrice, salePrice, handlingTime, itemCondition, images,
    // attributes, inventory }.
    //
    // FIX: this previously sent subCategoryId / subToSubCategoryId (camelCase)
    // which don't match the backend Product schema's actual field names —
    // subcategoryId / subtosubcategoryid — so Mongoose treated them as
    // missing and threw "Path ... is required." Both are now sent under the
    // schema's real key names, matching addListing().
    const findCatAttrDef = (name) => attributes.find((a) => a.name === name);

    const buildBulkProductPayload = () => {
      const enabledCombos = bulkCombos.filter((c) => c.enabled !== false);
      const baseSlug = generateSlug(bulkBaseName);

      // Category attributes not used for variation (e.g. Movement, Warranty)
      // sit on the top-level attributes[] array, same shape as the sample
      // JSON's top-level "attributes" entries.
      const usedAttrNames = new Set(bulkAttributesMeta.filter((g) => g.forVariations !== false).map((g) => g.name));
      const topLevelAttrs = attributes
        .filter((a) => !usedAttrNames.has(a.name))
        .map((a) => ({
          name: a.name,
          code: a.code || generateSlug(a.name),
          value: attrValues[a._id] ?? "",
          type: a.type || "text",
          unit: a.unit || "",
        }));

      return {
        productName: bulkBaseName,
        itemName: bulkBaseName,
        productUrl: baseSlug,
        categoryId: selectedCat,
        subcategoryId: selectedSub,
        subtosubcategoryid: selectedSubSub || "",
        vendorId,
        brandName: bulkBrandName,
        sku: bulkSku,
        description: {
          productDescription: desc.productDescription,
          bulletPoints: desc.bulletPoints.filter((b) => b.trim()),
        },
        images: images.filter((u) => u.trim()),
        isActive: true,
        status: "draft",
        tags: bulkTags.split(",").map((s) => s.trim()).filter(Boolean),
        attributes: topLevelAttrs,
        variants: enabledCombos.map((c) => {
          const variantSlug = c.productUrl || generateSlug(c.variantName);
          const variantAttrs = c.attributes.map((a) => {
            const def = findCatAttrDef(a.name);
            return { name: a.name, code: def?.code || generateSlug(a.name), value: a.value };
          });
          return {
            variantName: c.variantName,
            sku: c.sku,
            productUrl: variantSlug,
            mrp: Number(c.mrp || 0),
            sellingPrice: Number(c.sellingPrice || 0),
            salePrice: Number(c.salePrice || 0),
            handlingTime: c.handlingTime,
            itemCondition: c.itemCondition,
            images: c.images.filter((u) => u.trim()),
            attributes: variantAttrs,
            inventory: {
              stock: Number(c.inventory.stock || 0),
              maxQty: Number(c.inventory.maxQty || 5),
              isActive: c.enabled !== false,
            },
          };
        }),
      };
    };

    const addBulkListing = async () => {
      setSubmitError("");

      if (!vendorId) {
        setSubmitError("Vendor ID not found in session. Please re-login and try again.");
        return;
      }
      if (!bulkBaseName.trim()) {
        setSubmitError("Base Product Name is required.");
        return;
      }

      const enabledCombos = bulkCombos.filter((c) => c.enabled !== false);
      if (!enabledCombos.length) {
        setSubmitError("No enabled variants to save. Generate or add at least one variant.");
        return;
      }
      const missingNames = enabledCombos.filter((c) => !c.variantName.trim());
      if (missingNames.length) {
        setSubmitError(`${missingNames.length} variant(s) are missing a Variant Name — fill those in before saving.`);
        return;
      }

      const payload = buildBulkProductPayload();
      console.log("📦 Submitting bulk product payload:", JSON.stringify(payload, null, 2));

      setBulkSubmitting(true);
      setBulkProgress({ done: 0, total: 1, errors: [] });
      try {
        const res = await fetch(ADD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authConfig() },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        console.log(`📨 Response ${res.status}:`, text);
        if (!res.ok) {
          let msg = `Server error ${res.status}`;
          try { const e = JSON.parse(text); msg = e.message || e.error || e.msg || msg; } catch (_) {}
          throw new Error(msg);
        }
        setBulkProgress({ done: 1, total: 1, errors: [] });
        navigate("/admin/products", { state: { added: true, bulkCount: enabledCombos.length } });
      } catch (e) {
        console.error("❌ Bulk submit failed:", e);
        setSubmitError(e.message || "Failed to save. Please try again.");
      } finally {
        setBulkSubmitting(false);
      }
    };

    const canSubmit      = form.productName.trim() && selectedCat && selectedSub && !!vendorId && !vendorResolving && !submitting;

    const enabledBulkCombos = bulkCombos.filter((c) => c.enabled !== false);
    const canSubmitBulk =
      bulkBaseName.trim() &&
      enabledBulkCombos.length > 0 &&
      enabledBulkCombos.every((c) => c.variantName.trim()) &&
      selectedCat && selectedSub && !!vendorId && !vendorResolving && !bulkSubmitting;

    const step1Ready     = selectedCat && selectedSub && !attrLoading;
    const metaGroupCount = attributesMeta.filter((g) => g.name.trim() && g.values.some((v) => v.trim())).length;

    const tabCls = (t) =>
      `flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
        activeTab === t
          ? "border-amber-500 text-amber-700 bg-amber-50/50"
          : "border-transparent text-slate-500 hover:text-ink-800 hover:bg-slate-50"
      }`;

    const currentTabs = listingMode === "bulk" ? BULK_TABS : TABS;

    return (
      <div className="space-y-5 min-h-screen bg-slate-50/50">

        <div className="rounded-card border border-line bg-surface-raised p-6 shadow-card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/admin/products")}
                className="flex items-center gap-2 rounded-card border border-slate-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                <ArrowLeft size={15} /> Back
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-0.5">Inventory Command Center</p>
                <h1 className="text-[1.65rem] font-bold tracking-tight text-ink-950 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-card bg-gradient-to-br from-amber-500 to-purple-600 shadow-md shadow-amber-500/30">
                    <PackagePlus size={18} className="text-white" />
                  </div>
                  Add Marketplace Listing
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-card px-5 py-3 border border-slate-100">
              <StepBadge n={1} label="Choose Category" active={step === 1} done={step > 1} />
              <div className="flex items-center gap-1 mx-2">
                <div className={`h-0.5 w-8 rounded-full transition-all ${step > 1 ? "bg-amber-500" : "bg-slate-200"}`} />
                <ChevronRight size={13} className={step > 1 ? "text-amber-500" : "text-slate-300"} />
              </div>
              <StepBadge n={2} label={listingMode === "bulk" ? "Fill Products" : "Fill & Submit"} active={step === 2} done={false} />
            </div>
          </div>

          <div className={`mt-5 inline-flex items-center gap-2.5 rounded-card border px-4 py-2.5 text-xs ${
            vendorResolving ? "border-slate-200 bg-slate-50 text-slate-500"
              : vendorId ? "border-amber-100 bg-amber-50 text-amber-700"
              : "border-red-200 bg-red-50 text-red-600"
          }`}>
            {vendorResolving ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500 shrink-0" />
                <span>Resolving vendor from session…</span>
              </>
            ) : vendorId ? (
              <>
                <ShieldCheck size={14} className="shrink-0 text-amber-500" />
                <span>Vendor ID: <strong className="font-mono">{vendorId}</strong></span>
              </>
            ) : (
              <>
                <ShieldCheck size={14} className="shrink-0 text-red-500" />
                <span>Vendor ID not found — check console, please re-login.</span>
              </>
            )}
          </div>
        </div>

        {step === 1 && (
          <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
            <div className="border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-amber-50/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-card bg-amber-600 text-white text-sm font-bold shadow-md shadow-amber-500/30">1</div>
                <div>
                  <h2 className="font-bold text-ink-950">Choose Category</h2>
                  <p className="text-sm text-slate-500">Select category and sub-category first. Attribute fields load automatically.</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-semibold text-ink-800">
                  Category <span className="text-red-500">*</span>
                  {catLoading ? (
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 py-2.5 px-3.5">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" /> Loading…
                    </div>
                  ) : (
                    <select value={selectedCat} onChange={(e) => handleCatChange(e.target.value)} className={selectInp}>
                      <option value="">Select category…</option>
                      {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  )}
                </label>
                <label className="block text-sm font-semibold text-ink-800">
                  Sub-category <span className="text-red-500">*</span>
                  {subCatLoading ? (
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 py-2.5 px-3.5">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" /> Loading…
                    </div>
                  ) : (
                    <select value={selectedSub} onChange={(e) => handleSubChange(e.target.value)}
                      disabled={!subCategories.length} className={`${selectInp} disabled:cursor-not-allowed disabled:opacity-50`}>
                      <option value="">Select sub-category…</option>
                      {subCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  )}
                </label>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-semibold text-ink-800">
                  Sub-to-sub category <span className="text-xs font-normal text-slate-400">(optional)</span>
                  <select value={selectedSubSub} onChange={(e) => handleSubSubChange(e.target.value)}
                    disabled={!subToSubCategories.length} className={`${selectInp} disabled:cursor-not-allowed disabled:opacity-50`}>
                    <option value="">
                      {!selectedSub ? "Select sub-category first" : subToSubCategories.length ? "Select sub-to-sub category…" : "None available for this sub-category"}
                    </option>
                    {subToSubCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </label>
              </div>
              {attrLoading && (
                <div className="flex items-center gap-3 rounded-card border border-amber-100 bg-amber-50 px-4 py-3.5 text-sm text-amber-700">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600 shrink-0" />
                  Loading product attribute fields…
                </div>
              )}
              {!attrLoading && attributes.length > 0 && (
                <div className="flex items-center gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                    <Check size={13} className="text-white" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-emerald-700">
                    <strong>{attributes.length} attribute fields</strong> loaded for <em>{selectedCatName} › {selectedSubName}{selectedSubSubName ? ` › ${selectedSubSubName}` : ""}</em>.
                    <span className="ml-1 text-emerald-600 font-medium">({attributes.filter((a) => a.required).length} required)</span>
                  </p>
                </div>
              )}

              {step1Ready && (
                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <button type="button" onClick={() => chooseMode("single")}
                    className="flex flex-col items-start gap-2 rounded-card border-2 border-slate-200 bg-white p-5 text-left hover:border-amber-400 hover:bg-amber-50/40 transition-all shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-card bg-amber-100">
                      <PackagePlus size={18} className="text-amber-600" />
                    </div>
                    <p className="font-bold text-ink-950">Single Product</p>
                    <p className="text-xs text-slate-500">Add one product with its own full details, images, variants and SEO — the classic step-by-step form.</p>
                  </button>
                  <button type="button" onClick={() => chooseMode("bulk")}
                    className="flex flex-col items-start gap-2 rounded-card border-2 border-slate-200 bg-white p-5 text-left hover:border-amber-400 hover:bg-amber-50/40 transition-all shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-card bg-amber-100">
                      <Layers size={18} className="text-amber-600" />
                    </div>
                    <p className="font-bold text-ink-950">Multiple Products (Bulk)</p>
                    <p className="text-xs text-slate-500">Add one product with many variants (e.g. colors/sizes) at once — a table driven by this category's attributes. Shared details are filled once.</p>
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <button onClick={() => navigate("/admin/products")} className="rounded-card border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-slate-100 transition-all">Cancel</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="overflow-hidden rounded-card border border-line bg-surface-raised shadow-card">
            <div className="border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-amber-50/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-card bg-amber-600 text-white text-sm font-bold shadow-md shadow-amber-500/30">2</div>
                <div>
                  <h2 className="font-bold text-ink-950">{listingMode === "bulk" ? `Bulk Product — ${bulkCombos.length} variant${bulkCombos.length !== 1 ? "s" : ""}` : "Product Details"}</h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <span className="font-semibold text-ink-800">{selectedCatName}</span>
                    <ChevronRight size={12} />
                    <span className="font-semibold text-ink-800">{selectedSubName}</span>
                    {selectedSubSubName && (
                      <>
                        <ChevronRight size={12} />
                        <span className="font-semibold text-ink-800">{selectedSubSubName}</span>
                      </>
                    )}
                    <button onClick={() => setStep(1)} className="ml-2 text-amber-600 hover:text-amber-700 font-semibold hover:underline">Change</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-none bg-white">
              {currentTabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.id} className={tabCls(t.id)} onClick={() => setActiveTab(t.id)}>
                    <Icon size={13} />
                    {t.label}
                    {t.id === "variants" && metaGroupCount > 0 && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">{metaGroupCount}</span>
                    )}
                    {t.id === "products" && bulkCombos.length > 0 && (
                      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">{bulkCombos.length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-6">
              {listingMode === "bulk" ? (
                <>
                  {activeTab === "products" && (
                    <TabBulkProducts
                      attributes={attributes} attrLoading={attrLoading}
                      attributesMeta={bulkAttributesMeta} setAttributesMeta={setBulkAttributesMeta}
                      combos={bulkCombos} setCombos={setBulkCombos}
                      sharedProductType={bulkProductType} setSharedProductType={setBulkProductType}
                      sharedBrowseNode={bulkBrowseNode} setSharedBrowseNode={setBulkBrowseNode}
                      baseProductName={bulkBaseName} setBaseProductName={setBulkBaseName}
                      brandName={bulkBrandName} setBrandName={setBulkBrandName}
                      sku={bulkSku} setSku={setBulkSku}
                      tags={bulkTags} setTags={setBulkTags}
                    />
                  )}
                  {activeTab === "desc"    && <TabDescription desc={desc} setDesc={setDesc} />}
                  {activeTab === "details" && <TabProductDetails details={details} setDetails={setDetails} />}
                  {activeTab === "images"  && <TabImages images={images} setImages={setImages} bulkMode />}
                  {activeTab === "safety"  && <TabSafety safety={safety} setSafety={setSafety} />}
                </>
              ) : (
                <>
                  {activeTab === "basic"    && <TabBasicInfo form={form} setForm={setForm} categories={categories}
                    subCategories={subCategories} subToSubCategories={subToSubCategories}
                    catLoading={catLoading} subCatLoading={subCatLoading}
                    attrLoading={attrLoading} selectedCat={selectedCat} selectedSub={selectedSub} selectedSubSub={selectedSubSub}
                    selectedCatName={selectedCatName} selectedSubName={selectedSubName}
                    attributes={attributes} attrValues={attrValues} setAttrValues={setAttrValues}
                    handleCatChange={handleCatChange} handleSubChange={handleSubChange} handleSubSubChange={handleSubSubChange} />}
                  {activeTab === "desc"     && <TabDescription desc={desc} setDesc={setDesc} />}
                  {activeTab === "details"  && <TabProductDetails details={details} setDetails={setDetails} />}
                  {activeTab === "images"   && <TabImages images={images} setImages={setImages} />}
                  {activeTab === "variants" && <TabVariants attributesMeta={attributesMeta} setAttributesMeta={setAttributesMeta} variants={variants} setVariants={setVariants} attributes={attributes} />}
                  {activeTab === "safety"   && <TabSafety safety={safety} setSafety={setSafety} />}
                  {activeTab === "seo"      && <TabSeo seo={seo} setSeo={setSeo} slug={slug} setSlug={setSlug} setSlugEdited={setSlugEdited} productName={form.productName} />}
                </>
              )}
            </div>

            {listingMode === "bulk" && bulkSubmitting && (
              <div className="mx-6 mb-4 rounded-card border border-amber-100 bg-amber-50 px-4 py-3.5">
                <div className="flex items-center justify-between mb-2 text-sm text-amber-700">
                  <span className="font-semibold">Saving product…</span>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
                </div>
                <div className="h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all animate-pulse" style={{ width: "100%" }} />
                </div>
              </div>
            )}

            {submitError && (
              <div className="mx-6 mb-4 flex items-center gap-3 rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertCircle size={16} className="shrink-0" />
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 rounded-card border border-slate-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-slate-100 transition-all">
                <ArrowLeft size={15} /> Back
              </button>
              <div className="flex gap-3">
                <button onClick={() => navigate("/admin/products")} className="rounded-card border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-slate-100 transition-all">Cancel</button>
                {listingMode === "bulk" ? (
                  <button onClick={addBulkListing} disabled={!canSubmitBulk}
                    className="inline-flex items-center gap-2.5 rounded-card bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-amber-700 transition-all">
                    {bulkSubmitting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                    {bulkSubmitting ? "Saving…" : `Save Product (${bulkCombos.length} variant${bulkCombos.length !== 1 ? "s" : ""})`}
                  </button>
                ) : (
                  <button onClick={addListing} disabled={!canSubmit}
                    className="inline-flex items-center gap-2.5 rounded-card bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/30 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-amber-700 transition-all">
                    {submitting && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                    {submitting ? "Saving…" : "Save Listing"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }