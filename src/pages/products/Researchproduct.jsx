import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X, Compass, Camera, Radio, TestTube, BatteryCharging, FlaskConical } from "lucide-react";

/* =========================================================
   NO MOCK DATA — every call below hits the real API only.
   If a request fails, the UI shows an explicit error instead
   of substituting fake products.
   ========================================================= */

const API_BASE = "https://amazon-multi-vendor-3.onrender.com";

// Icons are assigned round-robin to whatever real category names the API
// returns — we no longer guess fixed category names ourselves.
const ICON_CYCLE = [Compass, Camera, Radio, TestTube, BatteryCharging, FlaskConical];
function iconForCategory(name, categoryList) {
  const names = (categoryList || []).map((c) => (c && c.name != null ? c.name : c));
  const idx = Math.max(0, names.indexOf(name));
  return ICON_CYCLE[idx % ICON_CYCLE.length];
}

function stockLabel(stock) {
  const s = Number(stock);
  if (!Number.isFinite(s)) return { cls: "in", text: "—" };
  if (s <= 0) return { cls: "out", text: "Out of stock" };
  if (s < 6) return { cls: "low", text: "Low · " + s + " left" };
  return { cls: "in", text: "In stock · " + s };
}

/* ---------- API layer — real data only, errors are surfaced, not hidden ---------- */
function useApi(apiBase, setUsingLive) {
  const apiGet = useCallback(
    async (path, params) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const url = apiBase + path + qs;
      let res;
      try {
        res = await fetch(url);
      } catch (e) {
        setUsingLive(false);
        throw new Error(`Couldn't reach the API at ${url} (${e.message}). If this is a Render.com free-tier service it may be asleep — try again in ~30s.`);
      }
      if (!res.ok) {
        setUsingLive(false);
        throw new Error(`API returned ${res.status} ${res.statusText} for ${path}`);
      }
      setUsingLive(true);
      try {
        return await res.json();
      } catch (e) {
        throw new Error(`API response for ${path} wasn't valid JSON`);
      }
    },
    [apiBase, setUsingLive]
  );

  return {
    loadProducts: () => apiGet("/api/products"),
    searchProducts: (q) => apiGet("/api/products/search", { q }),
    categoryFilter: (categoryId) => apiGet("/api/products/filters/" + encodeURIComponent(categoryId)),
    advancedFilters: (params) => apiGet("/api/products/filters", params),
    vendorFilter: (vendorId) => apiGet("/api/products/vendor/" + encodeURIComponent(vendorId)),
    inventoryFilter: (vendorId) => apiGet("/api/products/inventory/vendor/" + encodeURIComponent(vendorId)),
    productDetails: (productId) => apiGet("/api/products/" + encodeURIComponent(productId)),
    recommendations: (divid) => apiGet("/api/products/recommendations/" + encodeURIComponent(divid)),
    loadCategories: () => apiGet("/api/categories"),
  };
}

/* ---------- Response normalization for the real API schema ---------- */
// Different endpoints wrap list responses differently — handle the shapes
// this API actually uses ({success, category:{...}}, {success, data:[...]}, etc).
function unwrapArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload) return [];
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.categories)) return payload.categories;
  if (Array.isArray(payload.subCategories)) return payload.subCategories;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}
function unwrapObject(payload) {
  if (!payload) return null;
  if (payload.product) return payload.product;
  if (payload.category) return payload.category;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

// Coerces a possibly-string, possibly-currency-prefixed value ("₹1,299") into
// a real number. Returns NaN if nothing numeric is present.
function toNumber(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}
// Returns the first candidate that parses to a number > 0.
function firstPositive(...vals) {
  for (const v of vals) {
    const n = toNumber(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}
// Returns the first candidate that parses to any finite number (0 is valid —
// it means genuinely out of stock, not "missing").
function firstFinite(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const n = toNumber(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
function variantPrice(v) {
  return firstPositive(v?.offer?.salePrice, v?.offer?.price, v?.sellingPrice, v?.salePrice, v?.price, v?.finalPrice, v?.mrp, v?.cost);
}
function variantStock(v) {
  return firstFinite(v?.inventory?.stock, v?.stock, v?.quantity, v?.qty);
}

// Real product documents (per the API sheet) nest price/stock inside
// variants[].offer / variants[].inventory rather than at the top level.
// This reads the real nested fields — it never invents a value.
function normalizeProduct(raw, categoryMap) {
  if (!raw) return null;
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  const firstVariant = variants[0] || {};

  const variantPrices = variants.map(variantPrice).filter((n) => n > 0);
  const price = variantPrices.length
    ? Math.min(...variantPrices)
    : firstPositive(raw.price, raw.sellingPrice, raw.salePrice, raw.finalPrice, raw.mrp, raw.offer?.salePrice, raw.offer?.price, raw.cost, raw.amount);

  const stock = variants.length
    ? variants.reduce((sum, v) => sum + variantStock(v), 0)
    : firstFinite(raw.stock, raw.inventory?.stock, raw.quantity, raw.qty);

  const vendorObj = raw.vendorId && typeof raw.vendorId === "object" ? raw.vendorId : null;
  const vendorIdRaw = vendorObj?._id ?? raw.vendorId ?? raw.vendor_id ?? "";

  const categoryObj = raw.categoryId && typeof raw.categoryId === "object" ? raw.categoryId : null;
  const categoryIdRaw = categoryObj?._id ?? raw.categoryId ?? "";
  const category =
    categoryObj?.name ?? (categoryMap && categoryMap.get(categoryIdRaw)) ?? (typeof raw.categoryId === "string" ? raw.categoryId : "Uncategorized");

  const pd = raw.productDetails || {};
  const dims = raw.dimensions || {};
  const specs = {};
  if (raw.brandName) specs.Brand = raw.brandName;
  if (pd.material) specs.Material = pd.material;
  if (pd.manufacturer) specs.Manufacturer = pd.manufacturer;
  if (pd.modelNumber) specs["Model number"] = pd.modelNumber;
  if (dims.itemWeight) specs.Weight = `${dims.itemWeight} ${dims.itemWeightUnit || "g"}`;
  if (dims.itemDimensions) {
    const d = dims.itemDimensions;
    specs.Dimensions = `${d.length ?? "—"} × ${d.width ?? "—"} × ${d.height ?? "—"} cm`;
  }
  if (raw.safetyCompliance?.countryRegionOfOrigin) specs["Country of origin"] = raw.safetyCompliance.countryRegionOfOrigin;
  if (raw.packaging?.packagingType) specs.Packaging = raw.packaging.packagingType;

  const image =
    (Array.isArray(raw.images) && raw.images[0]) ||
    (Array.isArray(firstVariant.images) && firstVariant.images[0]) ||
    raw.image ||
    null;

  return {
    id: raw._id ?? raw.id ?? raw.productId,
    sku: firstVariant.sku ?? raw.externalProductId ?? raw.sku ?? "",
    title: raw.productName ?? raw.name ?? raw.title ?? "Untitled",
    category,
    categoryId: categoryIdRaw,
    vendorId: vendorIdRaw,
    vendor: vendorObj?.companyname ?? vendorObj?.name ?? vendorObj?.email ?? (typeof raw.vendorId === "string" ? raw.vendorId : "Unknown vendor"),
    price,
    currency: raw.currency ?? "INR",
    rating: Number(raw.rating ?? raw.avgRating ?? 0),
    stock,
    description: raw.description?.productDescription ?? raw.description ?? "",
    bulletPoints: raw.description?.bulletPoints ?? [],
    specs,
    image,
    variants,
    _raw: raw,
  };
}
function normalizeProducts(payload, categoryMap) {
  return unwrapArray(payload)
    .map((raw) => normalizeProduct(raw, categoryMap))
    .filter(Boolean);
}
function normalizeCategory(raw) {
  if (!raw) return null;
  return { id: raw._id ?? raw.id, name: raw.name ?? raw.title ?? "Unnamed category" };
}
function normalizeCategories(payload) {
  return unwrapArray(payload).map(normalizeCategory).filter(Boolean);
}

function currencySymbol(code) {
  if (code === "INR") return "₹";
  if (code === "USD") return "$";
  if (code === "EUR") return "€";
  return (code || "") + " ";
}
function formatPrice(p) {
  return currencySymbol(p.currency) + Number(p.price || 0).toLocaleString("en-IN");
}

/* =========================================================
   COMPONENT
   ========================================================= */
export default function ProductResearchPage() {
  const [usingLive, setUsingLive] = useState(false);
  const api = useApi(API_BASE, setUsingLive);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState("Full catalog");
  const [sub, setSub] = useState("—");

  const [allProducts, setAllProducts] = useState([]);

  const [activeCategory, setActiveCategory] = useState("");
  const [activeVendor, setActiveVendor] = useState("");
  const [inventoryOnly, setInventoryOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [minRating, setMinRating] = useState("0");
  const [sort, setSort] = useState("relevance");
  const [query, setQuery] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [recs, setRecs] = useState(null);

  const [categoriesList, setCategoriesList] = useState([]); // [{id, name}] from /api/categories

  // Fetch the real category list once so category filters use real IDs and
  // display real names, instead of guessing from product data alone.
  useEffect(() => {
    (async () => {
      try {
        const cats = normalizeCategories(await api.loadCategories());
        setCategoriesList(cats);
      } catch (e) {
        // Non-fatal: the sidebar falls back to categories derived from products.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryMap = useMemo(() => {
    const m = new Map();
    categoriesList.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categoriesList]);

  // Categories shown in the sidebar: prefer the real /api/categories list;
  // fall back to whatever categories/IDs actually appear on loaded products.
  const categories = useMemo(() => {
    if (categoriesList.length) return categoriesList;
    const map = new Map();
    allProducts.forEach((p) => {
      const key = p.categoryId || p.category;
      if (key && !map.has(key)) map.set(key, { id: p.categoryId || p.category, name: p.category });
    });
    return Array.from(map.values());
  }, [categoriesList, allProducts]);

  const vendors = useMemo(() => {
    const map = new Map();
    allProducts.forEach((p) => {
      const key = p.vendorId || p.vendor;
      if (key && !map.has(key)) map.set(key, { id: p.vendorId || p.vendor, name: p.vendor });
    });
    return Array.from(map.values());
  }, [allProducts]);

  const categoryCounts = useMemo(() => {
    const m = {};
    categories.forEach((c) => {
      m[c.id] = allProducts.filter((p) => p.categoryId === c.id || p.category === c.id || p.category === c.name).length;
    });
    return m;
  }, [categories, allProducts]);

  const runLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = normalizeProducts(await api.loadProducts(), categoryMap);
      setResults(data);
      setAllProducts(data);
      setTitle("Full catalog");
      setSub(data.length + " items");
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }, [api, categoryMap]);

  useEffect(() => {
    runLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* search (debounced) */
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) return; // handled by clearing filters explicitly
      setLoading(true);
      setError(null);
      try {
        const data = normalizeProducts(await api.searchProducts(query.trim()), categoryMap);
        setResults(data);
        setTitle(`Search — "${query.trim()}"`);
        setSub(data.length + " results");
      } catch (e) {
        setError(e.message);
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function pickCategory(categoryId) {
    setQuery("");
    setActiveCategory(categoryId);
    setLoading(true);
    setError(null);
    const cName = categories.find((c) => c.id === categoryId)?.name || categoryId;
    try {
      if (!categoryId) {
        const data = normalizeProducts(await api.loadProducts(), categoryMap);
        setResults(data);
        setTitle("Full catalog");
        setSub(data.length + " items");
      } else {
        const data = normalizeProducts(await api.categoryFilter(categoryId), categoryMap);
        setResults(data);
        setTitle(cName);
        setSub(data.length + " items");
      }
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function pickVendor(vendorId) {
    setActiveVendor(vendorId);
    setLoading(true);
    setError(null);
    const vName = vendors.find((v) => v.id === vendorId)?.name || vendorId;
    try {
      if (!vendorId) {
        const data = normalizeProducts(await api.loadProducts(), categoryMap);
        setResults(data);
        setTitle("Full catalog");
        setSub(data.length + " items");
      } else if (inventoryOnly) {
        const data = normalizeProducts(await api.inventoryFilter(vendorId), categoryMap);
        setResults(data);
        setTitle(vName + " — in stock");
        setSub(data.length + " items");
      } else {
        const data = normalizeProducts(await api.vendorFilter(vendorId), categoryMap);
        setResults(data);
        setTitle(vName);
        setSub(data.length + " items");
      }
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function toggleInventory() {
    const next = !inventoryOnly;
    setInventoryOnly(next);
    if (!activeVendor) return;
    setLoading(true);
    setError(null);
    const vName = vendors.find((v) => v.id === activeVendor)?.name || activeVendor;
    try {
      if (next) {
        const data = normalizeProducts(await api.inventoryFilter(activeVendor), categoryMap);
        setResults(data);
        setTitle(vName + " — in stock");
        setSub(data.length + " items");
      } else {
        const data = normalizeProducts(await api.vendorFilter(activeVendor), categoryMap);
        setResults(data);
        setTitle(vName);
        setSub(data.length + " items");
      }
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function applyAdvanced() {
    setLoading(true);
    setError(null);
    try {
      const data = normalizeProducts(await api.advancedFilters({ maxPrice, minRating }), categoryMap);
      setResults(data);
      setTitle("Filtered results");
      setSub(data.length + " items matching your filters");
    } catch (e) {
      setError(e.message);
      setResults([]);
    }
    setLoading(false);
  }

  async function clearAll() {
    setActiveCategory("");
    setActiveVendor("");
    setInventoryOnly(false);
    setMaxPrice(3000);
    setMinRating("0");
    setQuery("");
    await runLoad();
  }

  async function openProduct(id) {
    setSelectedId(id);
    setSelectedProduct(null);
    setModalError(null);
    setRecs(null);
    try {
      const p = normalizeProduct(unwrapObject(await api.productDetails(id)), categoryMap);
      setSelectedProduct(p);
      if (p) {
        try {
          const r = normalizeProducts(await api.recommendations(id), categoryMap);
          setRecs(r);
        } catch (e) {
          setRecs([]);
        }
      }
    } catch (e) {
      setModalError(e.message);
    }
  }
  function closeModal() {
    setSelectedId(null);
    setSelectedProduct(null);
    setModalError(null);
    setRecs(null);
  }

  const sortedResults = useMemo(() => {
    const arr = [...results];
    if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    else if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    return arr;
  }, [results, sort]);

  return (
    <div className="prp-root">
      <style>{CSS}</style>

      <header className="prp-top">
        <div className="prp-brand">
          <span className="prp-mark">Field Index</span>
          <span className="prp-tag">RESEARCH PRODUCT PAGE</span>
        </div>

        <div className="prp-search-wrap">
          <div className="prp-search-box">
            <Search size={15} strokeWidth={2} />
            <input
              placeholder="Search the catalog — instrument, SKU, vendor…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className={"prp-pill " + (usingLive ? "live" : "preview")}>
            {usingLive ? "● connected to api" : "○ api unreachable"}
          </span>
        </div>
      </header>

      <div className="prp-grid-shell">
        <aside className="prp-filters">
          <div className="prp-fblock">
            <h3>Category</h3>
            <div className="prp-flist">
              <div className={"prp-frow" + (activeCategory === "" ? " active" : "")} onClick={() => pickCategory("")}>
                All categories <span className="prp-count">{allProducts.length}</span>
              </div>
              {categories.length === 0 ? (
                <div className="prp-empty-sub" style={{ padding: "6px 8px" }}>No categories loaded yet.</div>
              ) : (
                categories.map((c) => (
                  <div
                    key={c.id}
                    className={"prp-frow" + (activeCategory === c.id ? " active" : "")}
                    onClick={() => pickCategory(c.id)}
                  >
                    {c.name} <span className="prp-count">{categoryCounts[c.id]}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="prp-fblock">
            <h3>Vendor</h3>
            <select value={activeVendor} onChange={(e) => pickVendor(e.target.value)}>
              <option value="">All vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="prp-fblock">
            <h3>Inventory</h3>
            <div className={"prp-toggle" + (inventoryOnly ? " on" : "")} onClick={toggleInventory}>
              <span>In-stock only (selected vendor)</span>
              <span className="prp-switch" />
            </div>
          </div>

          <div className="prp-fblock">
            <h3>Advanced Filters</h3>
            <div className="prp-range-row">
              <span className="prp-range-label">Max</span>
              <input
                type="range"
                min="0"
                max="3000"
                step="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
              />
              <span className="prp-range-val">${maxPrice}</span>
            </div>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)} style={{ marginTop: 10, marginBottom: 10 }}>
              <option value="0">Any rating</option>
              <option value="3">3★ and up</option>
              <option value="4">4★ and up</option>
              <option value="4.5">4.5★ and up</option>
            </select>
            <button className="prp-apply-btn" onClick={applyAdvanced}>
              Apply Filters
            </button>
            <button className="prp-clear-btn" onClick={clearAll}>
              Clear all
            </button>
          </div>
        </aside>

        <main className="prp-main">
          <div className="prp-main-head">
            <div>
              <h1>{title}</h1>
              <div className="prp-sub">{sub}</div>
            </div>
            <div className="prp-sort-row">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingRow label="fetching results…" />
          ) : error ? (
            <div className="prp-empty">
              <Search size={30} strokeWidth={1.6} />
              <div>Couldn't load real data from the API.</div>
              <div className="prp-empty-sub">{error}</div>
              <button className="prp-apply-btn" style={{ maxWidth: 220, margin: "14px auto 0" }} onClick={runLoad}>
                Retry
              </button>
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="prp-empty">
              <Search size={30} strokeWidth={1.6} />
              <div>No products match these filters.</div>
              <div className="prp-empty-sub">Try widening the price range or clearing a filter.</div>
            </div>
          ) : (
            <div className="prp-cardgrid">
              {sortedResults.map((p) => {
                const st = stockLabel(p.stock);
                const Icon = iconForCategory(p.category, categories);
                return (
                  <div key={p.id} className="prp-card" onClick={() => openProduct(p.id)}>
                    <div className="prp-card-icon">
                      {p.image ? (
                        <img src={p.image} alt={p.title} className="prp-card-img" onError={(e) => { e.target.style.display = "none"; }} />
                      ) : (
                        <Icon size={36} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="prp-card-body">
                      <div className="prp-card-sku">{p.sku}</div>
                      <div className="prp-card-title">{p.title}</div>
                      <div className="prp-card-vendor">{p.vendor}</div>
                      <div className="prp-card-foot">
                        <span className="prp-card-price">{formatPrice(p)}</span>
                        <span className={"prp-stock " + st.cls}>{st.text}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedId && (
        <div className="prp-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="prp-modal">
            {modalError ? (
              <div className="prp-empty" style={{ padding: 40 }}>
                <Search size={30} strokeWidth={1.6} />
                <div>Couldn't load this product from the API.</div>
                <div className="prp-empty-sub">{modalError}</div>
                <button className="prp-close-btn" style={{ margin: "16px auto 0" }} onClick={closeModal}>
                  <X size={15} />
                </button>
              </div>
            ) : !selectedProduct ? (
              <LoadingRow label="loading spec sheet…" padded />
            ) : (
              <ModalBody product={selectedProduct} recs={recs} categories={categories} onClose={closeModal} onOpen={openProduct} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingRow({ label, padded }) {
  return (
    <div className="prp-loading" style={padded ? { padding: 40 } : undefined}>
      <span className="prp-dot" />
      <span className="prp-dot" />
      <span className="prp-dot" />
      {label}
    </div>
  );
}

function ModalBody({ product: p, recs, categories, onClose, onOpen }) {
  const st = stockLabel(p.stock);
  const Icon = iconForCategory(p.category, categories || []);
  const specEntries = p.specs && typeof p.specs === "object" ? Object.entries(p.specs) : [];
  return (
    <>
      <div className="prp-modal-head">
        <div>
          <div className="prp-modal-sku">{p.sku}</div>
          <h2>{p.title}</h2>
          <div className="prp-modal-vendor">
            {p.vendor} · <span className={"prp-stock " + st.cls} style={{ marginLeft: 4 }}>{st.text}</span>
          </div>
        </div>
        <button className="prp-close-btn" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="prp-modal-body">
        <div className="prp-modal-icon">
          {p.image ? (
            <img src={p.image} alt={p.title} className="prp-modal-img" onError={(e) => { e.target.style.display = "none"; }} />
          ) : (
            <Icon size={40} strokeWidth={1.4} />
          )}
        </div>
        {p.description && <p className="prp-modal-desc">{p.description}</p>}
        {Array.isArray(p.bulletPoints) && p.bulletPoints.length > 0 && (
          <ul className="prp-modal-bullets">
            {p.bulletPoints.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        <table className="prp-spec-table">
          <tbody>
            {specEntries.map(([k, v]) => (
              <tr key={k}>
                <td>{k}</td>
                <td>{v}</td>
              </tr>
            ))}
            {p.rating > 0 && (
              <tr>
                <td>Rating</td>
                <td>{p.rating} / 5</td>
              </tr>
            )}
            <tr>
              <td>Category</td>
              <td>{p.category}</td>
            </tr>
          </tbody>
        </table>
        <div className="prp-modal-buy">
          <span className="prp-modal-price">{formatPrice(p)}</span>
          <button className="prp-modal-cta">Add to research list</button>
        </div>

        <div className="prp-rec-section">
          <h3>Recommended alongside this item</h3>
          {recs === null ? (
            <LoadingRow label="finding related items…" />
          ) : recs.length === 0 ? (
            <div className="prp-empty-sub" style={{ textAlign: "left" }}>No related items found.</div>
          ) : (
            <div className="prp-rec-grid">
              {recs.map((r) => (
                <div key={r.id} className="prp-rec-card" onClick={() => onOpen(r.id)}>
                  <div className="prp-rec-title">{r.title}</div>
                  <div className="prp-rec-price">{formatPrice(r)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   LIGHT THEME — paper/sage palette, forest-green accent
   ========================================================= */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.prp-root{
  --bg:#f5f6f1; --surface:#ffffff; --surface-sunken:#eef1ea; --border:#dde2d8; --border-soft:#e7ebe2;
  --ink:#20291f; --ink-dim:#5c6a58; --ink-faint:#94a08e;
  --accent:#2f6f4f; --accent-soft:#e3efe6; --accent-dim:#a9c9b6;
  --amber:#b9762c; --amber-soft:#f6ead9;
  --rust:#b8493d; --rust-soft:#f6e1de;
  --teal-soft:#e1f0e8;
  font-family:'Inter',sans-serif; color:var(--ink); background:var(--bg);
  min-height:100vh; display:flex; flex-direction:column;
}
.prp-root *{ box-sizing:border-box; }
.prp-root select, .prp-root input{ font-family:inherit; }

.prp-top{ display:flex; align-items:center; gap:24px; padding:18px 28px; background:var(--surface); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:40; }
.prp-brand{ display:flex; align-items:baseline; gap:10px; white-space:nowrap; }
.prp-mark{ font-family:'Fraunces',serif; font-weight:600; font-size:22px; }
.prp-tag{ font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--accent); border:1px solid var(--accent-dim); background:var(--accent-soft); padding:2px 6px; border-radius:2px; letter-spacing:.06em; }
.prp-search-wrap{ flex:1; display:flex; align-items:center; gap:10px; max-width:640px; }
.prp-search-box{ flex:1; display:flex; align-items:center; gap:8px; background:var(--surface-sunken); border:1px solid var(--border); border-radius:4px; padding:9px 12px; color:var(--ink-faint); }
.prp-search-box:focus-within{ border-color:var(--accent-dim); background:var(--surface); }
.prp-search-box input{ flex:1; background:transparent; border:none; outline:none; color:var(--ink); font-family:'IBM Plex Mono',monospace; font-size:13px; }
.prp-search-box input::placeholder{ color:var(--ink-faint); }
.prp-pill{ font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em; padding:5px 9px; border-radius:20px; border:1px solid var(--border); color:var(--ink-dim); white-space:nowrap; }
.prp-pill.live{ color:var(--accent); border-color:var(--accent-dim); background:var(--accent-soft); }
.prp-pill.preview{ color:var(--amber); border-color:#e0c398; background:var(--amber-soft); }

.prp-grid-shell{ flex:1; display:grid; grid-template-columns:260px 1fr; max-width:1400px; width:100%; margin:0 auto; }
.prp-filters{ border-right:1px solid var(--border); padding:22px 20px 60px; }
.prp-fblock{ margin-bottom:26px; }
.prp-fblock h3{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-faint); margin:0 0 10px; }
.prp-flist{ display:flex; flex-direction:column; gap:2px; }
.prp-frow{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 8px; border-radius:4px; cursor:pointer; font-size:13px; color:var(--ink-dim); border:1px solid transparent; }
.prp-frow:hover{ background:var(--surface-sunken); color:var(--ink); }
.prp-frow.active{ background:var(--accent-soft); color:var(--accent); border-color:var(--accent-dim); font-weight:600; }
.prp-count{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; color:var(--ink-faint); }
.prp-frow.active .prp-count{ color:var(--accent); }
.prp-range-row{ display:flex; align-items:center; gap:8px; }
.prp-range-row input[type=range]{ flex:1; accent-color:var(--accent); }
.prp-range-label{ font-size:11.5px; color:var(--ink-faint); width:34px; }
.prp-range-val{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--ink-dim); width:52px; text-align:right; }
.prp-root select{ width:100%; background:var(--surface); border:1px solid var(--border); color:var(--ink); border-radius:4px; padding:8px 10px; font-size:13px; }
.prp-toggle{ display:flex; align-items:center; justify-content:space-between; cursor:pointer; background:var(--surface); border:1px solid var(--border); border-radius:4px; padding:9px 10px; font-size:13px; color:var(--ink-dim); }
.prp-switch{ width:32px; height:18px; border-radius:20px; background:var(--border); position:relative; flex-shrink:0; transition:background .15s; }
.prp-switch::after{ content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.2); transition:left .15s; }
.prp-toggle.on{ border-color:var(--accent-dim); color:var(--accent); }
.prp-toggle.on .prp-switch{ background:var(--accent); }
.prp-toggle.on .prp-switch::after{ left:16px; }
.prp-apply-btn{ width:100%; background:var(--accent); color:#fff; border:none; border-radius:4px; padding:10px; font-weight:600; font-size:12.5px; letter-spacing:.03em; cursor:pointer; margin-top:10px; }
.prp-apply-btn:hover{ filter:brightness(1.08); }
.prp-clear-btn{ width:100%; background:transparent; color:var(--ink-faint); border:1px solid var(--border-soft); border-radius:4px; padding:8px; font-size:11.5px; cursor:pointer; margin-top:8px; }
.prp-clear-btn:hover{ color:var(--rust); border-color:var(--rust); }

.prp-main{ padding:24px 28px 80px; }
.prp-main-head{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:18px; flex-wrap:wrap; gap:10px; }
.prp-main-head h1{ font-family:'Fraunces',serif; font-weight:500; font-size:20px; margin:0; }
.prp-sub{ font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--ink-faint); }
.prp-sort-row{ display:flex; align-items:center; gap:8px; font-size:12px; color:var(--ink-dim); }
.prp-sort-row select{ width:auto; padding:6px 8px; font-size:12px; }

.prp-cardgrid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; }
.prp-card{ background:var(--surface); border:1px solid var(--border); border-radius:6px; cursor:pointer; overflow:hidden; display:flex; flex-direction:column; transition:border-color .15s, transform .15s, box-shadow .15s; }
.prp-card:hover{ border-color:var(--accent-dim); transform:translateY(-2px); box-shadow:0 6px 16px rgba(47,111,79,.10); }
.prp-card-icon{ height:104px; display:flex; align-items:center; justify-content:center; background:var(--surface-sunken); border-bottom:1px solid var(--border-soft); color:var(--accent-dim); overflow:hidden; }
.prp-card-img{ width:100%; height:100%; object-fit:cover; }
.prp-card-body{ padding:12px 14px 14px; display:flex; flex-direction:column; gap:6px; flex:1; }
.prp-card-sku{ font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--ink-faint); letter-spacing:.04em; }
.prp-card-title{ font-size:14px; font-weight:600; line-height:1.3; }
.prp-card-vendor{ font-size:11.5px; color:var(--ink-dim); }
.prp-card-foot{ display:flex; align-items:center; justify-content:space-between; margin-top:auto; padding-top:6px; }
.prp-card-price{ font-family:'IBM Plex Mono',monospace; font-size:14px; color:var(--accent); font-weight:600; }
.prp-stock{ font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.05em; padding:3px 6px; border-radius:3px; text-transform:uppercase; }
.prp-stock.in{ background:var(--teal-soft); color:var(--accent); }
.prp-stock.low{ background:var(--amber-soft); color:var(--amber); }
.prp-stock.out{ background:var(--rust-soft); color:var(--rust); }

.prp-empty{ text-align:center; padding:70px 20px; color:var(--ink-faint); }
.prp-empty svg{ margin-bottom:12px; opacity:.5; }
.prp-empty-sub{ font-size:12px; margin-top:4px; }
.prp-loading{ display:flex; align-items:center; gap:10px; color:var(--ink-faint); font-family:'IBM Plex Mono',monospace; font-size:12px; padding:30px 0; }
.prp-dot{ width:6px; height:6px; border-radius:50%; background:var(--accent); animation:prp-pulse 1s infinite ease-in-out; }
.prp-dot:nth-child(2){ animation-delay:.15s; } .prp-dot:nth-child(3){ animation-delay:.3s; }
@keyframes prp-pulse{ 0%,80%,100%{opacity:.25;} 40%{opacity:1;} }

.prp-overlay{ position:fixed; inset:0; background:rgba(32,41,31,.35); backdrop-filter:blur(2px); display:flex; align-items:flex-start; justify-content:center; z-index:100; padding:40px 20px; overflow-y:auto; }
.prp-modal{ background:var(--surface); border:1px solid var(--border); border-radius:8px; max-width:780px; width:100%; box-shadow:0 20px 50px rgba(32,41,31,.18); }
.prp-modal-head{ display:flex; justify-content:space-between; align-items:flex-start; padding:22px 26px; border-bottom:1px solid var(--border); gap:16px; }
.prp-modal-sku{ font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--accent); letter-spacing:.05em; margin-bottom:6px; }
.prp-modal-head h2{ font-family:'Fraunces',serif; font-weight:500; font-size:22px; margin:0 0 6px; }
.prp-modal-vendor{ color:var(--ink-dim); font-size:13px; }
.prp-close-btn{ background:var(--surface-sunken); border:1px solid var(--border); color:var(--ink-dim); width:30px; height:30px; border-radius:50%; cursor:pointer; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
.prp-close-btn:hover{ border-color:var(--rust); color:var(--rust); }
.prp-modal-body{ padding:22px 26px; }
.prp-modal-icon{ float:right; width:96px; height:96px; margin-left:16px; margin-bottom:10px; background:var(--surface-sunken); border:1px solid var(--border-soft); border-radius:6px; display:flex; align-items:center; justify-content:center; color:var(--accent-dim); overflow:hidden; }
.prp-modal-img{ width:100%; height:100%; object-fit:cover; }
.prp-modal-bullets{ margin:0 0 18px; padding-left:18px; color:var(--ink-dim); font-size:13px; line-height:1.7; }
.prp-modal-desc{ color:var(--ink-dim); font-size:13.5px; line-height:1.6; margin:0 0 18px; }
.prp-spec-table{ width:100%; border-collapse:collapse; margin-bottom:18px; }
.prp-spec-table tr{ border-bottom:1px solid var(--border-soft); }
.prp-spec-table td{ padding:8px 0; font-size:12.5px; }
.prp-spec-table td:first-child{ color:var(--ink-faint); font-family:'IBM Plex Mono',monospace; width:40%; }
.prp-modal-buy{ display:flex; align-items:center; justify-content:space-between; padding:16px 0 4px; border-top:1px solid var(--border); margin-top:6px; }
.prp-modal-price{ font-family:'IBM Plex Mono',monospace; font-size:22px; color:var(--accent); font-weight:600; }
.prp-modal-cta{ background:var(--accent); color:#fff; border:none; padding:11px 18px; border-radius:5px; font-weight:600; font-size:13px; cursor:pointer; }
.prp-modal-cta:hover{ filter:brightness(1.08); }
.prp-rec-section{ margin-top:26px; padding-top:20px; border-top:1px solid var(--border); clear:both; }
.prp-rec-section h3{ font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--ink-faint); margin:0 0 12px; }
.prp-rec-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
.prp-rec-card{ border:1px solid var(--border); border-radius:5px; padding:10px; cursor:pointer; background:var(--surface-sunken); }
.prp-rec-card:hover{ border-color:var(--accent-dim); }
.prp-rec-title{ font-size:12px; font-weight:600; margin-bottom:4px; line-height:1.3; }
.prp-rec-price{ font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--accent); }

@media (max-width: 860px){
  .prp-grid-shell{ grid-template-columns:1fr; }
  .prp-filters{ border-right:none; border-bottom:1px solid var(--border); }
  .prp-search-wrap{ order:3; width:100%; max-width:none; }
  .prp-top{ flex-wrap:wrap; }
  .prp-rec-grid{ grid-template-columns:1fr; }
}
`;