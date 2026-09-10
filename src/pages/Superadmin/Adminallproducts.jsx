import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Bell, Settings, ChevronDown, Menu, Package, Star,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle,
  Filter, Download, Plus, MoreVertical, Edit3, Trash2, Eye,
  ArrowUpDown, ChevronLeft, ChevronRight, Loader2, RefreshCw, ImageOff,
  X, Tag, Building2, Calendar, Hash, Link2, Truck, Gift, Boxes, IndianRupee, Layers
} from "lucide-react";

// ---- Live data source -------------------------------------------------

const API_URL = "https://amazon-multi-vendor-3.onrender.com/api/products";

// Normalize a raw API record into the flat shape the table renders.
// Pricing/stock DO exist in this API — they live one level down, inside
// each product's `variants[]` array (variants[].offer, variants[].inventory),
// not on the product root. We roll those up here so the table/modal can
// show real price + stock instead of skipping the fields.
function normalize(raw) {
  const variants = (raw.variants || []).map((v) => ({
    id: v._id,
    name: v.variantName || "—",
    sku: v.sku || "—",
    productUrl: v.productUrl || null,
    attributes: (v.attributes || []).filter((a) => a.value),
    images: (v.images || []).filter((u) => u && u.startsWith("http")),
    isActive: !!v.isActive,
    mrp: v?.offer?.mrp ?? null,
    sellingPrice: v?.offer?.sellingPrice ?? null,
    salePrice: v?.offer?.salePrice ?? null,
    itemCondition: v?.offer?.itemCondition || null,
    handlingTime: v?.offer?.handlingTime ?? null,
    stock: v?.inventory?.stock ?? null,
    maxQty: v?.inventory?.maxQty ?? null,
    stockStatus: v?.inventory?.stockStatus || null,
  }));

  // Roll-ups used for the table row / stat cards.
  const activeVariants = variants.filter((v) => v.isActive);
  const sellPrices = variants.map((v) => v.salePrice ?? v.sellingPrice).filter((n) => typeof n === "number");
  const minPrice = sellPrices.length ? Math.min(...sellPrices) : null;
  const maxPrice = sellPrices.length ? Math.max(...sellPrices) : null;
  const totalStock = variants.reduce((sum, v) => sum + (typeof v.stock === "number" ? v.stock : 0), 0);
  const inStock = variants.some((v) => v.stockStatus === "in_stock" && (v.stock ?? 0) > 0);

  return {
    id: raw._id,
    sku: raw.sku || "—",
    name: raw.productName || raw.itemName || "Untitled product",
    itemName: raw.itemName || null,
    brand: raw.brandName || "—",
    category: raw?.categoryId?.name || "Uncategorized",
    categorySlug: raw?.categoryId?.slug || null,
    subcategoryId: raw.subcategoryId || null,
    subtosubcategoryid: raw.subtosubcategoryid || null,
    vendor: raw?.vendorId?.companyname || raw?.vendorId?.name || "—",
    vendorCity: raw?.vendorId?.city || null,
    vendorState: raw?.vendorId?.state || null,
    vendorEmail: raw?.vendorId?.email || null,
    vendorPhone: raw?.vendorId?.number || null,
    status: raw.status || "draft",
    isActive: !!raw.isActive,
    tags: raw.tags || [],
    image: (raw.images && raw.images.find((u) => u && u.startsWith("http"))) || null,
    images: (raw.images || []).filter((u) => u && u.startsWith("http")),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    // Extra detail kept only for the "view details" modal — not shown in the table.
    productUrl: raw.productUrl || null,
    externalProductId: raw.externalProductId || null,
    productType: raw.productType || null,
    recommendedBrowseNode: raw.recommendedBrowseNode || null,
    description: raw?.description?.productDescription || "",
    bulletPoints: raw?.description?.bulletPoints || [],
    attributes: (raw.attributes || []).filter((a) => a.value),
    attributesMeta: raw.attributesMeta || [],
    productDetails: raw.productDetails || {},
    dimensions: raw.dimensions || {},
    packaging: raw.packaging || {},
    safetyCompliance: raw.safetyCompliance || {},
    externalInfo: raw.externalInfo || {},
    giftOptions: raw.giftOptions || {},
    metadata: raw.metadata || "",
    metaKeywords: raw.metaKeywords || [],
    searchKeywords: raw.searchKeywords || [],
    // ---- Variants (pricing + stock live here) ----
    variants,
    variantCount: variants.length,
    activeVariantCount: activeVariants.length,
    minPrice,
    maxPrice,
    totalStock,
    inStock,
  };
}

const STATUS_STYLES = {
  "active": { bg: "#EAF6EC", fg: "#0F7B3F", icon: CheckCircle2, label: "Active" },
  "draft": { bg: "#FFF4E5", fg: "#B15400", icon: AlertTriangle, label: "Draft" },
  "inactive": { bg: "#F2F2F2", fg: "#565959", icon: XCircle, label: "Inactive" },
  "rejected": { bg: "#FDEAEA", fg: "#C7371F", icon: XCircle, label: "Rejected" },
};

const STOCK_STYLES = {
  "in_stock": { bg: "#EAF6EC", fg: "#0F7B3F", label: "In stock" },
  "low_stock": { bg: "#FFF4E5", fg: "#B15400", label: "Low stock" },
  "out_of_stock": { bg: "#FDEAEA", fg: "#C7371F", label: "Out of stock" },
};

const statusStyle = (s) => STATUS_STYLES[(s || "").toLowerCase()] || STATUS_STYLES.inactive;
const stockStyle = (s) => STOCK_STYLES[(s || "").toLowerCase()] || { bg: "#F2F2F2", fg: "#565959", label: s || "Unknown" };

const fmt = (n) => n.toLocaleString("en-US");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const fmtRupee = (n) => (typeof n === "number" ? `₹${fmt(n)}` : "—");

// ---- Component --------------------------------------------------------

export default function AllProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiTotal, setApiTotal] = useState(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [vendor, setVendor] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [viewProduct, setViewProduct] = useState(null);
  const pageSize = 8;

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}?page=1&limit=100`);
      if (!res.ok) throw new Error(`API returned ${res.status} ${res.statusText}`);
      const json = await res.json();
      const list = json.data || [];

      // The list endpoint does NOT include `variants` (pricing/stock) for
      // any product — only the single-product detail endpoint does. Fetch
      // each product's detail in parallel and merge its variants in, so
      // the table's Price/Stock columns and the modal both show real data.
      const withVariants = await Promise.all(
        list.map(async (raw) => {
          try {
            const dRes = await fetch(`${API_URL}/${raw._id}`);
            if (!dRes.ok) return raw; // fall back to list data for this row
            const dJson = await dRes.json();
            const detail = dJson.data || dJson.product || dJson;
            return { ...raw, variants: detail.variants || [] };
          } catch {
            return raw; // network hiccup on this one product — don't fail the whole load
          }
        })
      );

      const rows = withVariants.map(normalize);
      setProducts(rows);
      setApiTotal(json?.pagination?.total ?? rows.length);
    } catch (err) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const vendors = useMemo(() => {
    const set = new Set(products.map((p) => p.vendor).filter((v) => v && v !== "—"));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    let rows = products.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q);
      const matchesCat = category === "All" || p.category === category;
      const matchesVendor = vendor === "All" || p.vendor === vendor;
      const matchesStatus = statusFilter === "All" || p.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesQuery && matchesCat && matchesVendor && matchesStatus;
    });
    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (sortKey === "createdAt" || sortKey === "updatedAt") {
        return (new Date(av) - new Date(bv)) * dir;
      }
      if (sortKey === "minPrice" || sortKey === "totalStock") {
        return ((av ?? -Infinity) - (bv ?? -Infinity)) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [products, query, category, vendor, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (pageRows.every((p) => selected.has(p.id))) {
      const next = new Set(selected);
      pageRows.forEach((p) => next.delete(p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pageRows.forEach((p) => next.add(p.id));
      setSelected(next);
    }
  };

  const stats = useMemo(() => {
    const total = apiTotal ?? products.length;
    const active = products.filter((p) => p.status.toLowerCase() === "active").length;
    const draft = products.filter((p) => p.status.toLowerCase() === "draft").length;
    const withImages = products.filter((p) => !!p.image).length;
    const totalStock = products.reduce((sum, p) => sum + (p.totalStock || 0), 0);
    return { total, active, draft, withImages, totalStock };
  }, [products, apiTotal]);

  return (
    <div style={{ fontFamily: "'Amazon Ember', Arial, sans-serif", background: "#EAEDED", minHeight: "100%", color: "#0F1111" }}>
      <style>{`
        .spin { animation: admin-spin 0.9s linear infinite; }
        @keyframes admin-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>


      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 48px" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>All Products</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#565959" }}>
              {loading ? "Loading catalog…" : `${fmt(filtered.length)} of ${fmt(stats.total)} products`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnSecondary} onClick={loadProducts} disabled={loading}>
              {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
            </button>
            <button style={btnSecondary}><Download size={14} /> Export</button>
            {/* <button style={btnPrimary}><Plus size={14} /> Add product</button> */}
          </div>
        </div>

        {error && (
          <div style={{ background: "#FDEAEA", border: "1px solid #F0B7AE", color: "#C7371F", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} />
            Couldn't load products from the API ({error}). If this is a CORS or cold-start issue, try Refresh — the server may need a moment to wake up.
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <StatCard label="Total products" value={fmt(stats.total)} icon={Package} accent="#146EB4" />
          <StatCard label="Active" value={fmt(stats.active)} icon={CheckCircle2} accent="#0F7B3F" />
          <StatCard label="Draft" value={fmt(stats.draft)} icon={AlertTriangle} accent="#B15400" />
          <StatCard label="Categories" value={fmt(categories.length - 1)} icon={Filter} accent="#146EB4" />
          <StatCard label="Units in stock" value={fmt(stats.totalStock)} icon={Boxes} accent="#FF9900" />
        </div>

        {/* Filters bar */}
        <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: 8, padding: 14, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <FilterPill icon={Filter} label="Category">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={selectStyle}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </FilterPill>
          <FilterPill icon={Building2} label="Vendor">
            <select value={vendor} onChange={(e) => { setVendor(e.target.value); setPage(1); }} style={selectStyle}>
              {vendors.map((v) => <option key={v}>{v}</option>)}
            </select>
          </FilterPill>
          <FilterPill label="Status">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
              <option>All</option>
              <option>Active</option>
              <option>Draft</option>
              <option>Inactive</option>
              <option>Rejected</option>
            </select>
          </FilterPill>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#565959" }}>
            {selected.size > 0 ? `${selected.size} selected` : ""}
          </div>
          {selected.size > 0 && (
            <>
              <button style={btnSecondary}><Edit3 size={13} /> Bulk edit</button>
              <button style={{ ...btnSecondary, color: "#C7371F", borderColor: "#C7371F" }}><Trash2 size={13} /> Remove</button>
            </>
          )}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: 8, overflow: "hidden" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0", color: "#565959" }}>
              <Loader2 size={28} className="spin" />
              <span style={{ fontSize: 13 }}>Fetching products from the API…</span>
            </div>
          ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F7F8F8", borderBottom: "1px solid #D5D9D9", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", width: 36 }}>
                    <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((p) => selected.has(p.id))} onChange={toggleSelectAll} />
                  </th>
                  <Th label="Product" k="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Brand" k="brand" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Vendor" k="vendor" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <th style={{ ...thStyle, textAlign: "right", paddingRight: 16 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((p) => {
                  const st = statusStyle(p.status);
                  const StIcon = st.icon;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid #EEE" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} />
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <div style={{ width: 40, height: 40, borderRadius: 6, background: "#F0F2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                            {p.image ? (
                              <img
                                src={p.image}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
                              />
                            ) : null}
                            <div style={{ display: p.image ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                              <Package size={16} color="#999" />
                            </div>
                          </div>
                          <div>
                            <div style={{ color: "#0066C0", fontWeight: 500, maxWidth: 300, lineHeight: 1.3 }}>{p.name}</div>
                            <div style={{ color: "#565959", fontSize: 11 }}>{p.category}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{p.brand}</td>
                      <td style={tdStyle}>{p.vendor}</td>
                      <td style={tdStyle}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: st.bg, color: st.fg, padding: "3px 8px", borderRadius: 12, fontSize: 11.5, fontWeight: 600 }}>
                          <StIcon size={12} /> {st.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", paddingRight: 16 }}>
                        <div style={{ display: "inline-flex", gap: 10, color: "#565959" }}>
                          <Eye size={15} style={{ cursor: "pointer" }} onClick={() => setViewProduct(p)} />
                          {/* <Edit3 size={15} style={{ cursor: "pointer" }} />
                          <MoreVertical size={15} style={{ cursor: "pointer" }} /> */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#565959" }}>
                      No products match your filters. Try clearing search or category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid #EEE", fontSize: 12.5, color: "#565959" }}>
            <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtn(page === 1)}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} style={{ ...pageBtn(false), background: n === page ? "#FF9900" : "#fff", color: n === page ? "#0F1111" : "#0F1111", fontWeight: n === page ? 700 : 400, borderColor: n === page ? "#FF9900" : "#D5D9D9" }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtn(page === totalPages)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewProduct && <ProductModal product={viewProduct} onClose={() => setViewProduct(null)} />}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid #F0F0F0" }}>
      <Icon size={14} color="#565959" style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#565959", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#0F1111", marginTop: 2, wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}

function VariantCard({ v }) {
  const st = stockStyle(v.stockStatus);
  const discount = v.mrp && v.salePrice && v.mrp > v.salePrice ? Math.round(((v.mrp - v.salePrice) / v.mrp) * 100) : null;
  return (
    <div style={{ border: "1px solid #E3E6E6", borderRadius: 8, padding: 12, display: "flex", gap: 12 }}>
      <div style={{ width: 64, height: 64, borderRadius: 6, background: "#F0F2F2", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {v.images[0] ? (
          <img src={v.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <Package size={20} color="#999" />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{v.name}</div>
            <div style={{ fontSize: 11.5, color: "#565959", fontFamily: "monospace" }}>{v.sku}</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: st.bg, color: st.fg, padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
            {st.label}
          </span>
        </div>

        {v.attributes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {v.attributes.map((a, i) => (
              <span key={i} style={{ border: "1px solid #D5D9D9", background: "#F7F8F8", borderRadius: 6, padding: "2px 8px", fontSize: 11.5 }}>
                {a.name}: <strong>{a.value}</strong>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {v.salePrice != null && (
            <span style={{ fontSize: 16, fontWeight: 700, color: "#B12704" }}>{fmtRupee(v.salePrice)}</span>
          )}
          {v.mrp != null && v.mrp !== v.salePrice && (
            <span style={{ fontSize: 12.5, color: "#565959", textDecoration: "line-through" }}>{fmtRupee(v.mrp)}</span>
          )}
          {discount != null && (
            <span style={{ fontSize: 12, color: "#0F7B3F", fontWeight: 600 }}>{discount}% off</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 12, color: "#565959", flexWrap: "wrap" }}>
          <span>Stock: <strong style={{ color: "#0F1111" }}>{v.stock ?? "—"}</strong></span>
          <span>Max qty/order: <strong style={{ color: "#0F1111" }}>{v.maxQty ?? "—"}</strong></span>
          {v.itemCondition && <span>Condition: <strong style={{ color: "#0F1111" }}>{v.itemCondition}</strong></span>}
          {v.handlingTime != null && <span>Handling: <strong style={{ color: "#0F1111" }}>{v.handlingTime}d</strong></span>}
        </div>
      </div>
    </div>
  );
}

function ProductModal({ product: p, onClose }) {
  const st = statusStyle(p.status);
  const StIcon = st.icon;
  const gallery = p.images && p.images.length ? p.images : (p.image ? [p.image] : []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,17,17,0.55)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 10, width: "100%", maxWidth: 780, maxHeight: "88vh",
          overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.25)", fontFamily: "inherit",
        }}
      >
        {/* Modal header */}
        <div style={{ position: "sticky", top: 0, background: "#131921", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "10px 10px 0 0" }}>
          <div>
            <div style={{ fontSize: 11, color: "#AAB7C4", textTransform: "uppercase", letterSpacing: 0.4 }}>Product details</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{p.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Top summary: images + key facts */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: 180 }}>
              {gallery.length > 0 ? gallery.slice(0, 4).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  style={{ width: 84, height: 84, borderRadius: 8, objectFit: "cover", background: "#F0F2F2", border: "1px solid #E3E6E6" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )) : (
                <div style={{ width: 84, height: 84, borderRadius: 8, background: "#F0F2F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Package size={22} color="#999" />
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: st.bg, color: st.fg, padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  <StIcon size={12} /> {st.label}
                </span>
                {p.minPrice != null && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#EAF2FB", color: "#146EB4", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                    <IndianRupee size={12} /> {fmtRupee(p.minPrice)}{p.maxPrice != null && p.maxPrice !== p.minPrice ? ` – ${fmtRupee(p.maxPrice)}` : ""}
                  </span>
                )}
                {p.variantCount > 0 && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#F0F2F2", color: "#333", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                    <Layers size={12} /> {p.variantCount} variant{p.variantCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <DetailRow icon={Tag} label="Brand" value={p.brand} />
              {p.itemName && p.itemName !== p.name && <DetailRow icon={Tag} label="Item name" value={p.itemName} />}
              <DetailRow icon={Filter} label="Category" value={p.category} />
              {p.productType && <DetailRow icon={Package} label="Product type" value={p.productType} />}
              {p.recommendedBrowseNode && <DetailRow icon={Filter} label="Browse node" value={p.recommendedBrowseNode} />}
              <DetailRow icon={Building2} label="Vendor" value={p.vendor} />
              {(p.vendorCity || p.vendorState) && <DetailRow icon={Building2} label="Vendor location" value={[p.vendorCity, p.vendorState].filter(Boolean).join(", ")} />}
              {p.vendorEmail && <DetailRow icon={Link2} label="Vendor email" value={p.vendorEmail} />}
              {p.vendorPhone && <DetailRow icon={Link2} label="Vendor phone" value={p.vendorPhone} />}
              <DetailRow icon={Hash} label="SKU" value={p.sku} />
              {p.externalProductId && <DetailRow icon={Hash} label="External product ID" value={p.externalProductId} />}
              {p.productUrl && <DetailRow icon={Link2} label="Product URL" value={p.productUrl} />}
              <DetailRow icon={CheckCircle2} label="Active" value={p.isActive ? "Yes" : "No"} />
              <DetailRow icon={Boxes} label="Total stock across variants" value={p.variantCount > 0 ? `${fmt(p.totalStock)} units` : null} />
              <DetailRow icon={Calendar} label="Created" value={fmtDate(p.createdAt)} />
              <DetailRow icon={Calendar} label="Last updated" value={fmtDate(p.updatedAt)} />
            </div>
          </div>

          {/* Description */}
          {p.description && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Description</SectionTitle>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#333", margin: 0 }}>{p.description}</p>
            </div>
          )}

          {/* Bullet points */}
          {p.bulletPoints?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Highlights</SectionTitle>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "#333" }}>
                {p.bulletPoints.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}

          {/* Variants — pricing, stock, per-variant attributes/images */}
          {p.variants?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Variants, pricing &amp; stock ({p.variants.length})</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.variants.map((v) => <VariantCard key={v.id} v={v} />)}
              </div>
            </div>
          )}

          {/* Legacy attribute meta (product-level variant options, when present) */}
          {p.attributesMeta?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Variant options</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {p.attributesMeta.map((a, i) => (
                  <div key={`v-${i}`}>
                    <div style={{ fontSize: 11.5, color: "#565959", fontWeight: 600, marginBottom: 5 }}>{a.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(a.values || []).map((val, j) => (
                        <span key={j} style={{ border: "1px solid #D5D9D9", background: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12.5, fontWeight: 500 }}>
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specifications — single-value attributes (not variant options) */}
          {p.attributes?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Specifications</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                {p.attributes.map((a, i) => (
                  <MiniFact key={`a-${i}`} label={a.name} value={`${a.value}${a.unit ? ` ${a.unit}` : ""}`} />
                ))}
              </div>
            </div>
          )}

          {/* Product details block (manufacturer info etc.) */}
          {p.productDetails && Object.keys(p.productDetails).some((k) => {
            const v = p.productDetails[k];
            return Array.isArray(v) ? v.length > 0 : !!v;
          }) && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Manufacturing &amp; specs</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {p.productDetails.manufacturer && <MiniFact label="Manufacturer" value={p.productDetails.manufacturer} />}
                {p.productDetails.manufacturerContactInfo && <MiniFact label="Manufacturer contact" value={p.productDetails.manufacturerContactInfo} />}
                {p.productDetails.modelNumber && <MiniFact label="Model number" value={p.productDetails.modelNumber} />}
                {p.productDetails.partNumber && <MiniFact label="Part number" value={p.productDetails.partNumber} />}
                {p.productDetails.material && <MiniFact label="Material" value={p.productDetails.material} />}
                {p.productDetails.itemTypeName && <MiniFact label="Item type" value={p.productDetails.itemTypeName} />}
                {p.productDetails.itemShape && <MiniFact label="Item shape" value={p.productDetails.itemShape} />}
                {p.productDetails.genericKeyword && <MiniFact label="Generic keyword" value={p.productDetails.genericKeyword} />}
                {p.productDetails.targetAudienceKeyword && <MiniFact label="Target audience" value={p.productDetails.targetAudienceKeyword} />}
                {p.productDetails.occasion && <MiniFact label="Occasion" value={p.productDetails.occasion} />}
                {p.productDetails.theme && <MiniFact label="Theme" value={p.productDetails.theme} />}
                {p.productDetails.unitCount && <MiniFact label="Unit count" value={`${p.productDetails.unitCount} ${p.productDetails.unitCountType || ""}`} />}
                {p.productDetails.specialFeatures?.length > 0 && <MiniFact label="Special features" value={p.productDetails.specialFeatures.join(", ")} />}
                {p.productDetails.includedComponents?.length > 0 && <MiniFact label="Included components" value={p.productDetails.includedComponents.join(", ")} />}
              </div>
            </div>
          )}

          {/* Dimensions & packaging */}
          {(p.dimensions?.itemWeight || p.dimensions?.itemDimensions?.length || p.packaging?.packagingType) && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Dimensions &amp; packaging</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {p.dimensions?.itemDimensions && (p.dimensions.itemDimensions.length || p.dimensions.itemDimensions.width || p.dimensions.itemDimensions.height) && (
                  <MiniFact label="Item dimensions (L×W×H)" value={`${p.dimensions.itemDimensions.length ?? "—"} × ${p.dimensions.itemDimensions.width ?? "—"} × ${p.dimensions.itemDimensions.height ?? "—"} cm`} />
                )}
                {p.dimensions?.packageDimensions && (p.dimensions.packageDimensions.length || p.dimensions.packageDimensions.width || p.dimensions.packageDimensions.height) && (
                  <MiniFact label="Package dimensions (L×W×H)" value={`${p.dimensions.packageDimensions.length ?? "—"} × ${p.dimensions.packageDimensions.width ?? "—"} × ${p.dimensions.packageDimensions.height ?? "—"} cm`} />
                )}
                {p.dimensions?.itemWeight && <MiniFact label="Item weight" value={`${p.dimensions.itemWeight} ${p.dimensions.itemWeightUnit || "g"}`} />}
                {p.dimensions?.packageWeight && <MiniFact label="Package weight" value={`${p.dimensions.packageWeight} ${p.dimensions.itemWeightUnit || "g"}`} />}
                {p.packaging?.packagingType && <MiniFact label="Packaging" value={p.packaging.packagingType} />}
                {p.packaging?.sourceType && <MiniFact label="Source type" value={p.packaging.sourceType} />}
                {p.packaging?.fulfillmentChannel && <MiniFact label="Fulfillment" value={p.packaging.fulfillmentChannel} />}
                {p.packaging?.numberOfPacks && <MiniFact label="Number of packs" value={p.packaging.numberOfPacks} />}
              </div>
            </div>
          )}

          {/* Safety / compliance */}
          {(p.safetyCompliance?.countryRegionOfOrigin || p.safetyCompliance?.regulatoryComplianceCertification) && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Safety &amp; compliance</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {p.safetyCompliance.countryRegionOfOrigin && <MiniFact label="Country of origin" value={p.safetyCompliance.countryRegionOfOrigin} />}
                {p.safetyCompliance.regulatoryComplianceCertification && <MiniFact label="Certifications" value={p.safetyCompliance.regulatoryComplianceCertification} />}
                {p.safetyCompliance.dangerousGoodsRegulation && <MiniFact label="Dangerous goods" value={p.safetyCompliance.dangerousGoodsRegulation} />}
                {p.safetyCompliance.buyerAgeRestriction && <MiniFact label="Age restriction" value={p.safetyCompliance.buyerAgeRestriction} />}
                {p.safetyCompliance.safetyAttestation && <MiniFact label="Safety attestation" value={p.safetyCompliance.safetyAttestation} />}
                {p.safetyCompliance.safetyAttestationAddress && <MiniFact label="Attestation address" value={p.safetyCompliance.safetyAttestationAddress} />}
                {p.safetyCompliance.mandatoryCautionaryStatement && <MiniFact label="Cautionary statement" value={p.safetyCompliance.mandatoryCautionaryStatement} />}
                {p.safetyCompliance.shipsGlobally !== undefined && <MiniFact label="Ships globally" value={p.safetyCompliance.shipsGlobally ? "Yes" : "No"} />}
              </div>
            </div>
          )}

          {/* External / importer info */}
          {(p.externalInfo?.externalProductInfoEntity || p.externalInfo?.importerContactInformation || p.externalInfo?.packerContactInformation) && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Import &amp; external info</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {p.externalInfo.externalProductInfo && <MiniFact label="Product origin" value={p.externalInfo.externalProductInfo} />}
                {p.externalInfo.externalProductInfoEntity && <MiniFact label="Origin entity" value={p.externalInfo.externalProductInfoEntity} />}
                {p.externalInfo.importerContactInformation && <MiniFact label="Importer contact" value={p.externalInfo.importerContactInformation} />}
                {p.externalInfo.packerContactInformation && <MiniFact label="Packer contact" value={p.externalInfo.packerContactInformation} />}
              </div>
            </div>
          )}

          {/* Gift options */}
          {(p.giftOptions?.giftMessageAvailable !== undefined || p.giftOptions?.giftWrapAvailable !== undefined) && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Gift options</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {p.giftOptions.giftMessageAvailable !== undefined && <MiniFact label="Gift message" value={p.giftOptions.giftMessageAvailable ? "Available" : "Not available"} />}
                {p.giftOptions.giftWrapAvailable !== undefined && <MiniFact label="Gift wrap" value={p.giftOptions.giftWrapAvailable ? "Available" : "Not available"} />}
              </div>
            </div>
          )}

          {/* Keywords */}
          {(p.searchKeywords?.length > 0 || p.metaKeywords?.length > 0) && (
            <div style={{ marginBottom: 18 }}>
              <SectionTitle>Keywords</SectionTitle>
              {p.searchKeywords?.length > 0 && (
                <div style={{ marginBottom: p.metaKeywords?.length > 0 ? 8 : 0 }}>
                  <div style={{ fontSize: 11, color: "#565959", marginBottom: 4 }}>Search keywords</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {p.searchKeywords.map((k, i) => (
                      <span key={i} style={{ background: "#EAF2FB", color: "#146EB4", fontSize: 12, padding: "3px 10px", borderRadius: 12 }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {p.metaKeywords?.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#565959", marginBottom: 4 }}>Meta keywords</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {p.metaKeywords.map((k, i) => (
                      <span key={i} style={{ background: "#F0F2F2", color: "#333", fontSize: 12, padding: "3px 10px", borderRadius: 12 }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {p.tags?.length > 0 && (
            <div>
              <SectionTitle>Tags</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.tags.map((t, i) => (
                  <span key={i} style={{ background: "#F0F2F2", color: "#333", fontSize: 12, padding: "3px 10px", borderRadius: 12 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F1111", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #E3E6E6" }}>
      {children}
    </div>
  );
}

function MiniFact({ label, value }) {
  return (
    <div style={{ background: "#F7F8F8", borderRadius: 6, padding: "8px 10px" }}>
      <div style={{ fontSize: 10.5, color: "#565959", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

// ---- Small pieces -------------------------------------------------------

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #D5D9D9", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${accent}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={accent} />
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: "#565959" }}>{label}</div>
      </div>
    </div>
  );
}

function FilterPill({ icon: Icon, label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #D5D9D9", borderRadius: 6, padding: "4px 8px", fontSize: 12.5 }}>
      {Icon && <Icon size={13} color="#565959" />}
      <span style={{ color: "#565959" }}>{label}:</span>
      {children}
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onClick }) {
  const active = sortKey === k;
  return (
    <th style={thStyle}>
      <button onClick={() => onClick(k)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", font: "inherit", color: active ? "#0F1111" : "#565959", fontWeight: active ? 700 : 600, padding: 0 }}>
        {label} <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.4 }} />
      </button>
    </th>
  );
}

// ---- Styles ---------------------------------------------------------------

const thStyle = { padding: "10px 12px", fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.3, color: "#565959", fontWeight: 700 };
const tdStyle = { padding: "10px 12px", verticalAlign: "middle" };
const selectStyle = { border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: 12.5, color: "#0F1111", cursor: "pointer" };

const btnPrimary = {
  display: "flex", alignItems: "center", gap: 6, background: "#FF9900", color: "#0F1111",
  border: "1px solid #A46201", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const btnSecondary = {
  display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#0F1111",
  border: "1px solid #D5D9D9", borderRadius: 6, padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
};

function pageBtn(disabled) {
  return {
    width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid #D5D9D9", borderRadius: 4, background: "#fff", fontSize: 12,
    cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1,
  };
}