import { useState, useEffect, useRef, useCallback } from "react";
import * as categoryApi from "../../services/categoryApi";
import { getErrorMessage } from "../../services/apiClient";

// ── Response readers (same shape-tolerant pattern as Categories.jsx) ─────────
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

const readCategoryAttributes = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.attributes)) return payload.attributes;
  if (Array.isArray(payload?.categoryAttributes)) return payload.categoryAttributes;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

// ── Normalizers (same field-fallback pattern as Categories.jsx) ─────────────
const normalizeCategory = (c) => {
  if (!c) return c;
  return {
    ...c,
    name: c.name || c.categoryName || c.title || "Unnamed",
  };
};

const normalizeSubCategory = (s) => {
  if (!s) return s;
  return {
    ...s,
    name: s.name || s.subCategoryName || s.title || "Unnamed",
  };
};

// categoryId on a sub-category can be a populated object or a plain id string
const subCategoryCatId = (val) =>
  val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "";

// The sub-to-sub API stores the display label in `categoryvalue`
// (matches SubToSubForm.jsx / Categories.jsx).
const normalizeSubToSub = (item) => {
  if (!item) return item;
  return {
    ...item,
    name: item.categoryvalue || item.name || "Unnamed",
  };
};

// categoryId / subCategoryId on a sub-to-sub item can be populated objects
// or plain id strings.
const subToSubRefId = (val) =>
  val && typeof val === "object" ? val._id ?? val.id ?? "" : val ?? "";

let _idCounter = 0;
function uid() { return ++_idCounter; }

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, type, visible }) {
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%",
      transform: "translateX(-50%)",
      padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      zIndex: 9999, whiteSpace: "nowrap", fontFamily: "inherit",
      pointerEvents: "none",
      transition: "opacity 0.2s",
      opacity: visible ? 1 : 0,
      background: type === "success" ? "#d1fae5" : "#fee2e2",
      color: type === "success" ? "#065f46" : "#991b1b",
      border: `1px solid ${type === "success" ? "#6ee7b7" : "#fca5a5"}`,
    }}>
      {message}
    </div>
  );
}

// ── Tag Input ──────────────────────────────────────────────────────────────
function TagInput({ options, onAdd, onRemove }) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);

  const commit = () => {
    const val = inputVal.replace(/,/g, "").trim();
    if (val && !options.includes(val)) { onAdd(val); }
    setInputVal("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
    if (e.key === "Backspace" && !inputVal && options.length) {
      onRemove(options[options.length - 1]);
    }
  };

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
      minHeight: 36, padding: "5px 8px",
      border: "1px solid #d1d5db", borderRadius: 8, background: "#fff",
      cursor: "text",
    }}
      onClick={() => inputRef.current?.focus()}
    >
      {options.map(o => (
        <span key={o} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "#ede9fe", color: "#4f46e5",
          fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 999,
        }}>
          {o}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(o); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#7c3aed", fontSize: 14, lineHeight: 1, padding: 0,
              marginLeft: 1, opacity: 0.7,
            }}
          >×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={options.length ? "Add more..." : "Type option & press Enter"}
        style={{
          border: "none", outline: "none", background: "transparent",
          fontSize: 13, color: "#1a1a2e", minWidth: 80, flex: 1,
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ── Field Row ──────────────────────────────────────────────────────────────
function FieldRow({ field, onChange, onRemove }) {
  const handleTypeChange = (e) => {
    const val = e.target.value;
    onChange(field.id, "type", val);
    if (val !== "dropdown") onChange(field.id, "options", []);
  };

  const inputStyle = {
    width: "100%", height: 32, padding: "0 10px",
    border: "1px solid #d1d5db", borderRadius: 8,
    fontSize: 13, color: "#1a1a2e", background: "#fff",
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr 70px 34px",
      gap: 8, alignItems: "end",
      background: "#f9fafb", border: "1px solid #e5e7eb",
      borderRadius: 8, padding: "10px 12px", marginBottom: 8,
    }}>
      {/* Field name */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
          Field name {field.required && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
        <input
          id={"field-name-" + field.id}
          type="text"
          value={field.name}
          placeholder="e.g. Material Composition"
          onChange={e => onChange(field.id, "name", e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Type */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>Type</label>
        <select value={field.type} onChange={handleTypeChange} style={inputStyle}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="dropdown">Dropdown</option>
        </select>
      </div>

      {/* Required */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>Required</label>
        <select
          value={field.required ? "true" : "false"}
          onChange={e => onChange(field.id, "required", e.target.value === "true")}
          style={inputStyle}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(field.id)}
        title="Remove field"
        style={{
          width: 34, height: 34,
          border: "1px solid #fca5a5", borderRadius: 8,
          background: "#fff", cursor: "pointer",
          color: "#ef4444", display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
        }}
      >
        <i className="ti ti-trash" style={{ fontSize: 15 }} />
      </button>

      {/* Options row for dropdown */}
      {field.type === "dropdown" && (
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
            Options — press Enter or comma to add
          </label>
          <TagInput
            options={field.options}
            onAdd={val => onChange(field.id, "options", [...field.options, val])}
            onRemove={opt => onChange(field.id, "options", field.options.filter(o => o !== opt))}
            fieldId={field.id}
          />
        </div>
      )}
    </div>
  );
}

// ── Existing Attribute Row (read-only display of a saved attribute) ────────
function ExistingAttributeRow({ attr }) {
  const name     = attr.name || attr.fieldName || "Unnamed";
  const type     = attr.type || "text";
  const required = !!attr.required;
  const options  = Array.isArray(attr.options) ? attr.options : [];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "#fff", border: "1px solid #e5e7eb",
      borderRadius: 8, padding: "9px 12px", marginBottom: 6,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e", flex: 1 }}>
        {name}
        {required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#6366f1",
        background: "#eef2ff", padding: "3px 8px", borderRadius: 999,
        textTransform: "capitalize", flexShrink: 0,
      }}>
        {type}
      </span>
      {type === "dropdown" && options.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flexShrink: 0, maxWidth: 260 }}>
          {options.map((o, i) => (
            <span key={i} style={{
              fontSize: 10.5, color: "#6b7280", background: "#f3f4f6",
              padding: "2px 7px", borderRadius: 999,
            }}>
              {o}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CategoryAttributeFormBuilder() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subtosubcategories, setSubtosubcategories] = useState([]);

  // All sub-to-sub categories, fetched once — same "fetch all, filter client
  // side" pattern Categories.jsx uses for its tree view.
  const [allSubToSub, setAllSubToSub] = useState([]);

  const [catId, setCatId] = useState("");
  const [subcatId, setSubcatId] = useState("");
  const [subsubId, setSubsubId] = useState("");
  const [section, setSection] = useState("");
  const [customSection, setCustomSection] = useState("");

  const [fieldCount, setFieldCount] = useState("");
  const [fields, setFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });

  // ── Existing attributes for the selected category — GET /categoryattribute/category/:categoryId
  const [existingAttrs, setExistingAttrs] = useState([]);
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingError, setExistingError] = useState("");

  const focusIdRef = useRef(null);

  // ── Helpers ──
  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  const getSection = useCallback(() => {
    if (section === "__custom__") return customSection.trim();
    return section;
  }, [section, customSection]);

  // ── Generate N blank fields ──
  const generateFields = () => {
    const n = parseInt(fieldCount);
    if (!n || n < 1) { showToast("Enter a valid number of fields", "error"); return; }
    if (n > 50) { showToast("Max 50 fields at a time", "error"); return; }
    const sec = getSection() || "General";
    setFields(Array.from({ length: n }, () => ({
      id: uid(), section: sec, name: "", type: "text", required: false, options: [],
    })));
  };

  // ── Load categories — GET /api/categories (same as Categories.jsx) ──────
  useEffect(() => {
    (async () => {
      try {
        const data = await categoryApi.getCategories();
        setCategories(readCategories(data).map(normalizeCategory));
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  // ── Load subcategories — GET /api/subcategories, filtered client-side ───
  // (Categories.jsx fetches the whole list and filters by categoryId locally,
  // so we mirror that here instead of relying on a ?categoryId= query param.)
  useEffect(() => {
    if (!catId) { setSubcategories([]); setSubcatId(""); return; }
    (async () => {
      try {
        const data = await categoryApi.getSubCategories();
        const all = readSubCategories(data).map(normalizeSubCategory);
        setSubcategories(all.filter((s) => subCategoryCatId(s.categoryId) === catId));
        setSubcatId("");
        setSubsubId("");
      } catch {
        setSubcategories([]);
      }
    })();
  }, [catId]);

  // ── Load sub-to-sub categories — GET /api/subtosubcategories, filtered
  // client-side by subCategoryId (same pattern as Categories.jsx's tree). ──
  useEffect(() => {
    (async () => {
      try {
        const data = await categoryApi.getSubToSubCategories();
        setAllSubToSub(readSubToSubCategories(data).map(normalizeSubToSub));
      } catch {
        setAllSubToSub([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!subcatId) { setSubtosubcategories([]); setSubsubId(""); return; }
    const matching = allSubToSub.filter(
      (s) => subToSubRefId(s.subCategoryId) === subcatId
    );
    setSubtosubcategories(matching);
    setSubsubId("");
  }, [subcatId, allSubToSub]);

  // ── Load existing attributes for the selected category ──
  // GET /api/categoryattribute/category/:categoryId
  const fetchExistingAttrs = useCallback(async (id) => {
    if (!id) { setExistingAttrs([]); setExistingError(""); return; }
    setExistingLoading(true);
    setExistingError("");
    try {
      const data = await categoryApi.getCategoryAttributes(id);
      setExistingAttrs(readCategoryAttributes(data));
    } catch (e) {
      setExistingAttrs([]);
      setExistingError(getErrorMessage(e, "Unable to load existing attributes."));
    } finally {
      setExistingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExistingAttrs(catId);
  }, [catId, fetchExistingAttrs]);

  // ── Focus newly added field ──
  useEffect(() => {
    if (focusIdRef.current) {
      const el = document.getElementById("field-name-" + focusIdRef.current);
      if (el) el.focus();
      focusIdRef.current = null;
    }
  }, [fields]);

  // ── Field ops ──
  const addField = () => {
    const sec = getSection() || "General";
    const newId = uid();
    focusIdRef.current = newId;
    setFields(prev => [...prev, { id: newId, section: sec, name: "", type: "text", required: false, options: [] }]);
  };

  const removeField = (id) => setFields(prev => prev.filter(f => f.id !== id));

  const updateField = (id, key, value) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  // ── Submit — POST /api/categoryattribute/add ──
  const submitForm = async () => {
    const sec = getSection();
    if (!catId) { showToast("Please select a category", "error"); return; }
    if (!sec)   { showToast("Please select or enter a section", "error"); return; }
    if (!fields.length) { showToast("Add at least one field", "error"); return; }
    if (fields.find(f => !f.name.trim())) { showToast("All fields need a name", "error"); return; }

    setSubmitting(true);
    let ok = 0, fail = 0;

    for (const f of fields) {
      const body = {
        categoryId: catId,
        section: f.section || sec,
        name: f.name.trim(),
        type: f.type,
        required: f.required,
      };
      // Field names match the sub-to-sub API's own convention (subCategoryId,
      // and — if the backend supports it — subtosubcategoryId).
      if (subcatId) body.subCategoryId = subcatId;
      if (subsubId) body.subtosubcategoryId = subsubId;
      if (f.type === "dropdown" && f.options.length) body.options = f.options;

      try {
        await categoryApi.createCategoryAttribute(body);
        ok++;
      } catch {
        fail++;
      }
    }

    setSubmitting(false);

    if (fail === 0) {
      showToast(`✓ All ${ok} attributes saved!`, "success");
      _idCounter = 0;
      setFields([]);
      // Refresh the existing-attributes list so newly added fields show up immediately
      fetchExistingAttrs(catId);
    } else {
      showToast(`${ok} saved, ${fail} failed`, "error");
      fetchExistingAttrs(catId);
    }
  };

  // ── Grouped fields (form builder) ──
  const grouped = fields.reduce((acc, f) => {
    const s = f.section || "General";
    if (!acc[s]) acc[s] = [];
    acc[s].push(f);
    return acc;
  }, {});

  // ── Grouped existing attributes (loaded from API) ──
  const groupedExisting = existingAttrs.reduce((acc, a) => {
    const s = a.section || "General";
    if (!acc[s]) acc[s] = [];
    acc[s].push(a);
    return acc;
  }, {});

  const selectedCategoryName =
    categories.find(c => (c._id || c.id) === catId)?.name || "";

  // ── Styles ──
  const S = {
    body: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: "#f5f6fa", color: "#1a1a2e", minHeight: "100vh", padding: "2rem 1rem" },
    container: { maxWidth: 860, margin: "0 auto" },
    card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "1rem" },
    sectionTitle: { fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1rem" },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
    field: { display: "flex", flexDirection: "column", gap: 5 },
    label: { fontSize: 12, fontWeight: 500, color: "#374151" },
    input: { width: "100%", height: 36, padding: "0 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, color: "#1a1a2e", background: "#fff", outline: "none", fontFamily: "inherit" },
    sectionLabel: { fontSize: 11, fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 6 },
    addBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "9px 14px", border: "1.5px dashed #d1d5db", borderRadius: 8, background: "transparent", cursor: "pointer", color: "#6b7280", fontSize: 13, fontFamily: "inherit", marginTop: 6 },
    submitBtn: { width: "100%", padding: 11, background: submitting ? "#a5b4fc" : "#6366f1", color: "#fff", border: "none", borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: "0.25rem" },
    emptyState: { textAlign: "center", padding: "2rem 1rem", color: "#9ca3af", fontSize: 13 },
    refreshBtn: { display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "#6366f1", background: "transparent", border: "none", cursor: "pointer", padding: "3px 6px" },
  };

  return (
    <div style={S.body}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

      <div style={S.container}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a2e" }}>Category Attribute Form Builder</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Select category → section → edit or add fields → submit to API</p>
        </div>

        {/* Category Selection */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Category Selection</div>

          <div style={S.row2}>
            <div style={S.field}>
              <label style={S.label}>Category <span style={{ color: "#ef4444" }}>*</span></label>
              <select value={catId} onChange={e => setCatId(e.target.value)} style={S.input}>
                <option value="">{categories.length ? "Select category" : "Loading..."}</option>
                {categories.map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={S.field}>
              <label style={S.label}>Subcategory</label>
              <select value={subcatId} onChange={e => setSubcatId(e.target.value)} disabled={!catId} style={{ ...S.input, background: !catId ? "#f9fafb" : "#fff", color: !catId ? "#9ca3af" : "#1a1a2e" }}>
                <option value="">{!catId ? "Select category first" : "Select subcategory (optional)"}</option>
                {subcategories.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ ...S.row2, marginBottom: 0 }}>
            <div style={S.field}>
              <label style={S.label}>Sub-to-sub category</label>
              <select value={subsubId} onChange={e => setSubsubId(e.target.value)} disabled={!subcatId} style={{ ...S.input, background: !subcatId ? "#f9fafb" : "#fff", color: !subcatId ? "#9ca3af" : "#1a1a2e" }}>
                <option value="">{!subcatId ? "Select subcategory first" : "Select sub-to-sub (optional)"}</option>
                {subtosubcategories.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={S.field}>
              <label style={S.label}>Section <span style={{ color: "#ef4444" }}>*</span></label>
              <select value={section} onChange={e => setSection(e.target.value)} style={S.input}>
                <option value="">-- All sections --</option>
                <option value="Top Highlights">Top Highlights</option>
                <option value="Additional Information">Additional Information</option>
                <option value="Style">Style</option>
                <option value="Item Details">Item Details</option>
                <option value="__custom__">+ Custom section...</option>
              </select>
            </div>
          </div>

          {section === "__custom__" && (
            <div style={{ marginTop: 10 }}>
              <div style={S.field}>
                <label style={S.label}>Custom section name <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  value={customSection}
                  onChange={e => setCustomSection(e.target.value)}
                  placeholder="Enter section name"
                  style={S.input}
                />
              </div>
            </div>
          )}
        </div>

        {/* Existing Attributes — GET /categoryattribute/category/:categoryId */}
        {catId && (
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ ...S.sectionTitle, marginBottom: 0 }}>
                Existing Attributes{selectedCategoryName ? ` — ${selectedCategoryName}` : ""}
              </div>
              <button
                type="button"
                onClick={() => fetchExistingAttrs(catId)}
                style={S.refreshBtn}
                disabled={existingLoading}
              >
                <i className={`ti ${existingLoading ? "ti-loader-2" : "ti-refresh"}`} />
                Refresh
              </button>
            </div>

            {existingLoading && (
              <div style={S.emptyState}>
                <i className="ti ti-loader-2" style={{ fontSize: 24, display: "block", marginBottom: 8, color: "#a5b4fc" }} />
                Loading existing attributes…
              </div>
            )}

            {!existingLoading && existingError && (
              <div style={{ ...S.emptyState, color: "#ef4444" }}>
                ⚠ {existingError}
              </div>
            )}

            {!existingLoading && !existingError && existingAttrs.length === 0 && (
              <div style={S.emptyState}>
                <i className="ti ti-database-off" style={{ fontSize: 24, display: "block", marginBottom: 8, color: "#d1d5db" }} />
                No attributes saved for this category yet.
              </div>
            )}

            {!existingLoading && !existingError && existingAttrs.length > 0 && (
              Object.entries(groupedExisting).map(([sec, list]) => (
                <div key={sec} style={{ marginBottom: "1rem" }}>
                  <div style={S.sectionLabel}>
                    <i className="ti ti-layout-list" style={{ fontSize: 14 }} />
                    {sec}
                    <span style={{
                      marginLeft: "auto", fontSize: 10.5, fontWeight: 600,
                      color: "#9ca3af", textTransform: "none", letterSpacing: 0,
                    }}>
                      {list.length} field{list.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {list.map((a, i) => (
                    <ExistingAttributeRow key={a._id || a.id || i} attr={a} />
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Fields (new attributes to add) */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Add New Fields</div>

          {/* Field count generator */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ ...S.field, flex: 1 }}>
              <label style={S.label}>How many fields do you want?</label>
              <input
                type="number"
                min={1}
                max={50}
                value={fieldCount}
                onChange={e => setFieldCount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generateFields()}
                placeholder="e.g. 5"
                style={S.input}
              />
            </div>
            <button type="button" onClick={generateFields} style={{
              height: 36, padding: "0 16px", background: "#6366f1", color: "#fff",
              border: "none", borderRadius: 8, cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}>
              <i className="ti ti-wand" /> Generate
            </button>
          </div>

          {fields.length === 0 ? (
            <div style={S.emptyState}>
              <i className="ti ti-forms" style={{ fontSize: 28, display: "block", marginBottom: 8, color: "#d1d5db" }} />
              Enter a number above and click Generate.
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([sec, list]) => (
                <div key={sec} style={{ marginBottom: "1.25rem" }}>
                  <div style={S.sectionLabel}>
                    <i className="ti ti-layout-list" style={{ fontSize: 14 }} />
                    {sec}
                  </div>
                  {list.map(f => (
                    <FieldRow
                      key={f.id}
                      field={f}
                      onChange={updateField}
                      onRemove={removeField}
                    />
                  ))}
                </div>
              ))}
              <button type="button" onClick={addField} style={S.addBtn}>
                <i className="ti ti-plus" /> Add one more field
              </button>
            </>
          )}
        </div>

        {/* Submit */}
        <button type="button" onClick={submitForm} disabled={submitting} style={S.submitBtn}>
          <i className={`ti ${submitting ? "ti-loader-2" : "ti-upload"}`} />
          {submitting ? "Submitting..." : "Submit Attributes"}
        </button>
      </div>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  );
}