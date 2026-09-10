import { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://amazon-multi-vendor-3.onrender.com";
const PAGE_SIZE = 6;
const USER_STORAGE_KEY = "adminSession";
const VENDOR_ID_STORAGE_KEY = "vendorId";
const VENDOR_ID_RESOLVED_EVENT = "vendorid:resolved";
const VENDOR_ID_POLL_MS = 200;
const VENDOR_ID_POLL_TIMEOUT_MS = 10000;

/* ---------------------------------------------------------------------- */
/* Vendor id resolution                                                   */
/* ---------------------------------------------------------------------- */

function readVendorIdFromUserObject(storage) {
  try {
    const raw = storage.getItem(USER_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.vendorId || "";
  } catch {
    return "";
  }
}

function readVendorIdFromStorage() {
  // Try sessionStorage first (fast path for the current tab), then
  // localStorage. In each, prefer the real "user" object's .vendorId
  // field (the shape this app actually uses), then fall back to a
  // standalone "vendorId" key if one is ever set directly.
  try {
    const fromUserSession = readVendorIdFromUserObject(sessionStorage);
    if (fromUserSession) return fromUserSession;
    const fromSession = sessionStorage.getItem(VENDOR_ID_STORAGE_KEY);
    if (fromSession) return fromSession;
  } catch {
    // sessionStorage can throw in some privacy modes / SSR — ignore and fall through
  }
  try {
    const fromUserLocal = readVendorIdFromUserObject(localStorage);
    if (fromUserLocal) return fromUserLocal;
    const fromLocal = localStorage.getItem(VENDOR_ID_STORAGE_KEY);
    if (fromLocal) return fromLocal;
  } catch {
    // ignore
  }
  return "";
}

/**
 * Resolves vendorId reactively. Tries, in order: prop -> getVendorId() ->
 * storage (sync) -> storage (polled) / custom event -> gives up after
 * VENDOR_ID_POLL_TIMEOUT_MS.
 */
function useResolvedVendorId(vendorIdProp, getVendorId) {
  const [vendorId, setVendorId] = useState(() => vendorIdProp || readVendorIdFromStorage());
  const [resolving, setResolving] = useState(!vendorIdProp && !readVendorIdFromStorage());

  useEffect(() => {
    if (vendorIdProp) {
      setVendorId(vendorIdProp);
      setResolving(false);
      return;
    }

    const already = readVendorIdFromStorage();
    if (already) {
      setVendorId(already);
      setResolving(false);
      return;
    }

    setResolving(true);
    let cancelled = false;

    const tryResolve = (id) => {
      if (cancelled) return;
      const resolved = id || readVendorIdFromStorage();
      if (resolved) {
        setVendorId(resolved);
        setResolving(false);
      }
    };

    // If the caller gave us a direct hook into their real session/auth
    // call, prefer it — it's the most reliable source, no guessing needed.
    if (typeof getVendorId === "function") {
      Promise.resolve()
        .then(() => getVendorId())
        .then((id) => {
          if (id) {
            tryResolve(id);
            try {
              sessionStorage.setItem(VENDOR_ID_STORAGE_KEY, id);
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {
          // swallow — storage polling below is still a valid fallback
        });
    }

    const onCustomEvent = (e) => tryResolve(e?.detail);
    const onStorageEvent = (e) => {
      if (!e.key || e.key === VENDOR_ID_STORAGE_KEY || e.key === USER_STORAGE_KEY) tryResolve();
    };
    window.addEventListener(VENDOR_ID_RESOLVED_EVENT, onCustomEvent);
    window.addEventListener("storage", onStorageEvent);

    const start = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - start > VENDOR_ID_POLL_TIMEOUT_MS) {
        clearInterval(interval);
        setResolving(false);
        return;
      }
      tryResolve();
    }, VENDOR_ID_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(VENDOR_ID_RESOLVED_EVENT, onCustomEvent);
      window.removeEventListener("storage", onStorageEvent);
    };
  }, [vendorIdProp, getVendorId]);

  return [vendorId, resolving];
}

function resolveImageUrl(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${BASE_URL}/${image.replace(/^\/+/, "")}`;
}

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reviews)) return payload.reviews;
  return [];
}

function normalizeOne(payload) {
  return payload?.data ?? payload?.review ?? payload;
}

/* ---------------------------------------------------------------------- */
/* API calls — backend resource is "product_review"                       */
/* ---------------------------------------------------------------------- */

async function apiGetVendorReviews(vendorId) {
  const res = await fetch(`${BASE_URL}/api/product_review/vendor/${vendorId}`);
  if (!res.ok) throw new Error(`Failed to load reviews (${res.status})`);
  return normalizeList(await res.json());
}

async function apiUpdateReview(id, payload) {
  const res = await fetch(`${BASE_URL}/api/product_review/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update review (${res.status})`);
  return normalizeOne(await res.json());
}

async function apiDeleteReview(id) {
  const res = await fetch(`${BASE_URL}/api/product_review/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete review (${res.status})`);
  return true;
}

const getId = (r) => r?._id || r?.id;

// pid / variantId may come back as plain string ids OR populated objects
// ({ _id, productName } / { _id, sku, ... }) depending on the endpoint.
function getPidId(review) {
  const pid = review?.pid;
  if (!pid) return null;
  return typeof pid === "string" ? pid : pid._id || null;
}

function getPidLabel(review) {
  const pid = review?.pid;
  if (!pid) return null;
  return typeof pid === "string" ? pid : pid.productName || pid._id || null;
}

function getVariantLabel(review) {
  const variant = review?.variantId;
  if (!variant) return null;
  return typeof variant === "string" ? variant : variant.sku || variant.variantName || variant._id || null;
}

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/* ---------------------------------------------------------------------- */
/* Small building blocks                                                  */
/* ---------------------------------------------------------------------- */

function Stars({ value = 0, size = 16 }) {
  const clamped = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="vrp-stars" style={{ fontSize: size }} role="img" aria-label={`${clamped} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fillPct = Math.max(0, Math.min(1, clamped - i)) * 100;
        return (
          <svg key={i} viewBox="0 0 20 20" width="1em" height="1em">
            <defs>
              <linearGradient id={`vrp-star-${i}-${clamped}`}>
                <stop offset={`${fillPct}%`} stopColor="#ffa41c" />
                <stop offset={`${fillPct}%`} stopColor="#e3e6e6" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#vrp-star-${i}-${clamped})`}
              d="M10 15.27 15.18 18.5 13.82 12.53 18.5 8.47 12.36 7.96 10 2.5 7.64 7.96 1.5 8.47 6.18 12.53 4.82 18.5z"
            />
          </svg>
        );
      })}
    </span>
  );
}

function RatingBars({ counts, total, activeStar, onSelect }) {
  return (
    <div className="vrp-bars">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = counts[star] || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        const active = activeStar === star;
        return (
          <button
            key={star}
            type="button"
            className={`vrp-bar-row${active ? " vrp-bar-row--active" : ""}`}
            onClick={() => onSelect(active ? null : star)}
          >
            <span className="vrp-bar-label">{star} star</span>
            <span className="vrp-bar-track">
              <span className="vrp-bar-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="vrp-bar-pct">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Main panel                                                             */
/* ---------------------------------------------------------------------- */

export default function VendorReviewsPanel({ vendorId: vendorIdProp, getVendorId }) {
  const [vendorId, resolvingVendorId] = useResolvedVendorId(vendorIdProp, getVendorId);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [activeStar, setActiveStar] = useState(null);
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [lightbox, setLightbox] = useState(null);

  async function load() {
    if (!vendorId) {
      if (!resolvingVendorId) {
        setError("No vendorId found. Pass a vendorId prop, or set it in sessionStorage/localStorage.");
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetVendorReviews(vendorId);
      setReviews(data);
    } catch (err) {
      setError(err.message || "Could not load your reviews.");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const productOptions = useMemo(() => {
    const map = new Map();
    reviews.forEach((r) => {
      const id = getPidId(r);
      if (id && !map.has(id)) map.set(id, getPidLabel(r) || id);
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [reviews]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      const star = Math.round(Number(r.rating)) || 0;
      if (counts[star] !== undefined) counts[star] += 1;
      sum += Number(r.rating) || 0;
    });
    const average = total ? sum / total : 0;
    const withPhotos = reviews.filter((r) => (Array.isArray(r.image) ? r.image.length : r.image)).length;
    const critical = counts[1] + counts[2];
    return { total, counts, average, withPhotos, critical };
  }, [reviews]);

  const visible = useMemo(() => {
    let list = [...reviews];
    if (productFilter !== "all") list = list.filter((r) => getPidId(r) === productFilter);
    if (activeStar) list = list.filter((r) => Math.round(Number(r.rating)) === activeStar);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) => r.userName?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case "highest":
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "lowest":
        list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [reviews, productFilter, activeStar, search, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  function openEdit(review) {
    setEditing(review);
    setEditError(null);
    setEditForm({
      userName: review.userName || "",
      description: review.description || "",
      rating: review.rating || 5,
      image: Array.isArray(review.image) ? review.image.join(", ") : review.image || "",
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    try {
      const id = getId(editing);
      const payload = {
        userName: editForm.userName,
        description: editForm.description,
        rating: Number(editForm.rating),
        image: editForm.image.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const updated = await apiUpdateReview(id, payload);
      setReviews((prev) => prev.map((r) => (getId(r) === id ? { ...r, ...payload, ...updated } : r)));
      setEditing(null);
    } catch (err) {
      setEditError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = getId(deleteTarget);
    setDeletingId(id);
    try {
      await apiDeleteReview(id);
      setReviews((prev) => prev.filter((r) => getId(r) !== id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || "Could not delete review.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="vrp">
      <style>{CSS}</style>

      <header className="vrp-topbar">
        <div>
          <p className="vrp-eyebrow">Vendor Panel</p>
          <h1 className="vrp-title">My Reviews</h1>
        </div>
        <button type="button" className="vrp-btn vrp-btn--ghost" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {!vendorId && resolvingVendorId ? (
        <div className="vrp-empty">Resolving your vendor session…</div>
      ) : !vendorId ? (
        <div className="vrp-empty">
          Couldn't find a vendorId. Make sure you're logged in (so <code>localStorage</code>/
          <code>sessionStorage</code> key <code>"adminSession"</code> has a <code>vendorId</code> field), or pass a{" "}
          <code>vendorId</code> / <code>getVendorId</code> prop directly.
        </div>
      ) : (
        <>
          <section className="vrp-overview">
            <div className="vrp-summary-card">
              <div className="vrp-average">
                <p className="vrp-average-number">{stats.average.toFixed(1)}</p>
                <Stars value={stats.average} size={22} />
                <p className="vrp-average-sub">
                  {stats.total} review{stats.total === 1 ? "" : "s"} across your products
                </p>
              </div>
              <RatingBars counts={stats.counts} total={stats.total} activeStar={activeStar} onSelect={setActiveStar} />
            </div>

            <div className="vrp-stat-grid">
              <div className="vrp-stat">
                <p className="vrp-stat-label">Total reviews</p>
                <p className="vrp-stat-value">{stats.total}</p>
              </div>
              <div className="vrp-stat">
                <p className="vrp-stat-label">Average rating</p>
                <p className="vrp-stat-value">{stats.average.toFixed(2)} / 5</p>
              </div>
              <div className="vrp-stat">
                <p className="vrp-stat-label">Needs attention (1–2★)</p>
                <p className="vrp-stat-value vrp-stat-value--danger">{stats.critical}</p>
              </div>
              <div className="vrp-stat">
                <p className="vrp-stat-label">With photos</p>
                <p className="vrp-stat-value">{stats.withPhotos}</p>
              </div>
            </div>
          </section>

          <section className="vrp-filters">
            <div className="vrp-field vrp-field--grow">
              <label htmlFor="vrp-search">Search</label>
              <input
                id="vrp-search"
                type="search"
                placeholder="Search by reviewer name or text…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="vrp-field">
              <label htmlFor="vrp-product">Product</label>
              <select id="vrp-product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
                <option value="all">All products</option>
                {productOptions.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="vrp-field">
              <label htmlFor="vrp-sort">Sort by</label>
              <select id="vrp-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest rating</option>
                <option value="lowest">Lowest rating</option>
              </select>
            </div>
            <p className="vrp-count">{visible.length} matching</p>
          </section>

          {error && <p className="vrp-error">{error}</p>}

          {loading ? (
            <div className="vrp-empty">Loading your reviews…</div>
          ) : pageItems.length === 0 ? (
            <div className="vrp-empty">No reviews match the current filters.</div>
          ) : (
            <ul className="vrp-list">
              {pageItems.map((review) => {
                const id = getId(review);
                const images = Array.isArray(review.image) ? review.image : review.image ? [review.image] : [];
                const date = formatDate(review.createdAt || review.updatedAt);
                return (
                  <li key={id} className="vrp-card">
                    <div className="vrp-card-head">
                      <div className="vrp-avatar">{initials(review.userName)}</div>
                      <div className="vrp-identity">
                        <p className="vrp-name">{review.userName || "Anonymous"}</p>
                        <div className="vrp-meta-row">
                          <Stars value={review.rating} size={13} />
                          {date && <span className="vrp-date">Reviewed on {date}</span>}
                        </div>
                      </div>
                      <div className="vrp-actions">
                        <button type="button" className="vrp-icon-btn" onClick={() => openEdit(review)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="vrp-icon-btn vrp-icon-btn--danger"
                          onClick={() => setDeleteTarget(review)}
                          disabled={deletingId === id}
                        >
                          {deletingId === id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>

                    <p className="vrp-body">{review.description}</p>

                    {images.length > 0 && (
                      <div className="vrp-images">
                        {images.map((img, i) => {
                          const src = resolveImageUrl(img);
                          return (
                            <button
                              key={i}
                              type="button"
                              className="vrp-thumb"
                              onClick={() => setLightbox(src)}
                              aria-label={`View image ${i + 1}`}
                            >
                              <img src={src} alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="vrp-ids">
                      {getPidLabel(review) && (
                        <span>
                          Product: <code>{getPidLabel(review)}</code>
                        </span>
                      )}
                      {getVariantLabel(review) && (
                        <span>
                          Variant: <code>{getVariantLabel(review)}</code>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pageCount > 1 && (
            <nav className="vrp-pagination">
              <button className="vrp-page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                ‹ Prev
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`vrp-page-btn${p === page ? " vrp-page-btn--active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button className="vrp-page-btn" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>
                Next ›
              </button>
            </nav>
          )}
        </>
      )}

      {editing && editForm && (
        <div className="vrp-overlay" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="vrp-modal">
            <div className="vrp-modal-head">
              <h2>Edit review</h2>
              <button type="button" className="vrp-close" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>
            <form className="vrp-modal-body" onSubmit={saveEdit}>
              <div className="vrp-field">
                <label>Reviewer name</label>
                <input
                  type="text"
                  value={editForm.userName}
                  onChange={(e) => setEditForm({ ...editForm, userName: e.target.value })}
                  required
                />
              </div>
              <div className="vrp-field">
                <label>Rating</label>
                <div className="vrp-rating-row">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={editForm.rating}
                    onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                  />
                  <Stars value={Number(editForm.rating)} size={18} />
                  <span>{Number(editForm.rating).toFixed(1)}</span>
                </div>
              </div>
              <div className="vrp-field">
                <label>Review text</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  required
                />
              </div>
              <div className="vrp-field">
                <label>Image filenames (comma separated)</label>
                <input
                  type="text"
                  value={editForm.image}
                  onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                  placeholder="review1.jpg, review2.jpg"
                />
              </div>
              {editError && <p className="vrp-error">{editError}</p>}
              <div className="vrp-modal-footer">
                <button type="button" className="vrp-btn vrp-btn--ghost" onClick={() => setEditing(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="vrp-btn vrp-btn--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="vrp-overlay" onMouseDown={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="vrp-modal vrp-modal--sm">
            <div className="vrp-modal-head">
              <h2>Delete this review?</h2>
              <button type="button" className="vrp-close" onClick={() => setDeleteTarget(null)}>
                ×
              </button>
            </div>
            <div className="vrp-modal-body">
              <p>
                This will permanently delete {deleteTarget.userName || "this reviewer"}'s review. This can't be
                undone.
              </p>
              <div className="vrp-modal-footer">
                <button type="button" className="vrp-btn vrp-btn--ghost" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button type="button" className="vrp-btn vrp-btn--danger" onClick={confirmDelete}>
                  {deletingId ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="vrp-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Review enlarged" />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Styles (Amazon-inspired palette, scoped with .vrp- prefix)             */
/* ---------------------------------------------------------------------- */

const CSS = `
.vrp { --navy:#131921; --navy-800:#232f3e; --orange:#ff9900; --orange-dark:#e88a00;
  --star:#ffa41c; --bg:#eaeded; --surface:#fff; --border:#d5d9d9; --text:#0f1111;
  --text-600:#565959; --text-400:#8a8f8f; --link:#007185; --link-hover:#c7511f;
  --danger:#b12704; --danger-bg:#fdf2f0; --success:#067d62;
  background:var(--bg); color:var(--text); font-family:'Segoe UI',Roboto,Arial,sans-serif;
  max-width:1000px; margin:0 auto; padding:0 0 40px; }
.vrp *{box-sizing:border-box;}
.vrp-topbar{ background:var(--navy); color:#fff; padding:16px 20px; display:flex;
  align-items:center; justify-content:space-between; border-bottom:3px solid var(--orange);
  border-radius:8px 8px 0 0; margin-bottom:18px; }
.vrp-eyebrow{ margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#cfd7de; }
.vrp-title{ margin:2px 0 0; font-size:20px; font-weight:800; }
.vrp-overview{ display:grid; grid-template-columns:300px 1fr; gap:14px; padding:0 4px; margin-bottom:14px; }
.vrp-summary-card{ background:var(--surface); border:1px solid var(--border); border-radius:8px;
  box-shadow:0 1px 2px rgba(15,17,17,.08); padding:18px; display:flex; flex-direction:column; gap:14px; }
.vrp-average{ text-align:center; padding-bottom:12px; border-bottom:1px solid var(--border); }
.vrp-average-number{ margin:0; font-size:38px; font-weight:800; line-height:1; }
.vrp-average-sub{ margin:8px 0 0; font-size:12.5px; color:var(--text-600); }
.vrp-stars{ display:inline-flex; gap:2px; color:var(--star); }
.vrp-bars{ display:flex; flex-direction:column; gap:6px; }
.vrp-bar-row{ display:grid; grid-template-columns:48px 1fr 38px; align-items:center; gap:8px;
  background:none; border:1px solid transparent; border-radius:4px; padding:3px 6px; cursor:pointer; text-align:left; }
.vrp-bar-row:hover{ background:#f4f4f4; }
.vrp-bar-row--active{ background:#fff4e0; border-color:var(--orange); }
.vrp-bar-label{ font-size:12.5px; color:var(--link); }
.vrp-bar-track{ height:12px; background:#f0f0f0; border-radius:7px; overflow:hidden; }
.vrp-bar-fill{ height:100%; background:var(--star); border-radius:7px; transition:width .3s ease; }
.vrp-bar-pct{ font-size:12.5px; color:var(--text-600); text-align:right; }
.vrp-stat-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.vrp-stat{ background:var(--surface); border:1px solid var(--border); border-radius:8px;
  padding:14px 16px; box-shadow:0 1px 2px rgba(15,17,17,.08); }
.vrp-stat-label{ margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-600); font-weight:700; }
.vrp-stat-value{ margin:0; font-size:24px; font-weight:800; }
.vrp-stat-value--danger{ color:var(--danger); }
.vrp-filters{ background:var(--surface); border:1px solid var(--border); border-radius:8px;
  box-shadow:0 1px 2px rgba(15,17,17,.08); padding:14px 16px; display:flex; flex-wrap:wrap;
  align-items:flex-end; gap:10px; margin:0 4px 14px; }
.vrp-field{ display:flex; flex-direction:column; gap:4px; min-width:140px; }
.vrp-field--grow{ flex:1 1 240px; }
.vrp-field label{ font-size:11px; font-weight:700; color:var(--text-600); text-transform:uppercase; letter-spacing:.04em; }
.vrp-field input, .vrp-field select, .vrp-field textarea{ border:1px solid #949494; border-radius:4px;
  padding:8px 10px; font-size:14px; font-family:inherit; }
.vrp-count{ margin:0 0 8px; font-size:12.5px; color:var(--text-600); }
.vrp-error{ background:var(--danger-bg); border:1px solid #f3c8bd; color:var(--danger); padding:10px 14px;
  border-radius:6px; font-size:13.5px; margin:0 4px 14px; }
.vrp-empty{ background:var(--surface); border:1px dashed var(--border); border-radius:8px; padding:44px 20px;
  text-align:center; color:var(--text-600); font-size:14px; margin:0 4px; }
.vrp-list{ list-style:none; margin:0 4px; padding:0; display:flex; flex-direction:column; gap:12px; }
.vrp-card{ background:var(--surface); border:1px solid var(--border); border-radius:8px;
  box-shadow:0 1px 2px rgba(15,17,17,.08); padding:16px 18px; }
.vrp-card-head{ display:flex; align-items:flex-start; gap:12px; }
.vrp-avatar{ width:34px; height:34px; border-radius:50%; background:var(--navy-800); color:#fff;
  font-size:12.5px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.vrp-identity{ flex:1; min-width:0; }
.vrp-name{ margin:0 0 3px; font-weight:700; font-size:14px; }
.vrp-meta-row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.vrp-date{ font-size:12px; color:var(--text-600); }
.vrp-actions{ display:flex; gap:6px; flex-shrink:0; }
.vrp-icon-btn{ background:none; border:1px solid var(--border); border-radius:6px; padding:6px 10px;
  font-size:12px; font-weight:600; color:var(--link); cursor:pointer; }
.vrp-icon-btn:hover{ background:#f0f2f2; }
.vrp-icon-btn--danger{ color:var(--danger); }
.vrp-icon-btn--danger:hover{ background:var(--danger-bg); }
.vrp-icon-btn:disabled{ opacity:.5; cursor:not-allowed; }
.vrp-body{ margin:12px 0 0; font-size:14px; line-height:1.55; white-space:pre-wrap; }
.vrp-images{ display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
.vrp-thumb{ width:60px; height:60px; padding:0; border:1px solid var(--border); border-radius:6px;
  overflow:hidden; cursor:zoom-in; background:#f4f4f4; }
.vrp-thumb img{ width:100%; height:100%; object-fit:cover; display:block; }
.vrp-ids{ margin-top:12px; padding-top:10px; border-top:1px solid #f0f0f0; display:flex; gap:16px;
  flex-wrap:wrap; font-size:11px; color:var(--text-400); }
.vrp-ids code{ font-family:monospace; color:var(--text-600); }
.vrp-pagination{ display:flex; align-items:center; justify-content:center; gap:6px; padding:14px 0 0; flex-wrap:wrap; }
.vrp-page-btn{ border:1px solid var(--border); background:var(--surface); border-radius:6px; padding:7px 12px;
  font-size:13px; cursor:pointer; color:var(--link); font-weight:600; }
.vrp-page-btn:hover:not(:disabled){ background:#f0f2f2; }
.vrp-page-btn:disabled{ opacity:.45; cursor:not-allowed; }
.vrp-page-btn--active{ background:var(--navy-800); color:#fff; border-color:var(--navy-800); }
.vrp-btn{ border-radius:8px; padding:9px 16px; font-size:13.5px; font-weight:600; cursor:pointer; border:1px solid transparent; }
.vrp-btn--primary{ background:linear-gradient(to bottom,#f7dfa5,var(--orange)); border-color:#a88734 #9c7e31 #846a29; color:#0f1111; }
.vrp-btn--primary:hover{ background:linear-gradient(to bottom,#f5d78b,var(--orange-dark)); }
.vrp-btn--ghost{ background:var(--surface); border-color:#949494; color:var(--text); }
.vrp-btn--ghost:hover{ background:#f0f2f2; }
.vrp-btn--danger{ background:var(--surface); border-color:var(--danger); color:var(--danger); }
.vrp-btn--danger:hover{ background:var(--danger-bg); }
.vrp-overlay{ position:fixed; inset:0; background:rgba(15,17,17,.6); display:flex; align-items:center;
  justify-content:center; z-index:200; padding:16px; }
.vrp-modal{ background:var(--surface); border-radius:8px; box-shadow:0 8px 28px rgba(15,17,17,.25);
  width:100%; max-width:460px; max-height:90vh; overflow-y:auto; }
.vrp-modal--sm{ max-width:400px; }
.vrp-modal-head{ display:flex; align-items:center; justify-content:space-between; padding:16px 20px;
  border-bottom:1px solid var(--border); }
.vrp-modal-head h2{ margin:0; font-size:16px; }
.vrp-close{ background:none; border:none; font-size:22px; line-height:1; cursor:pointer; color:var(--text-600); }
.vrp-modal-body{ padding:18px 20px 20px; display:flex; flex-direction:column; gap:14px; }
.vrp-rating-row{ display:flex; align-items:center; gap:10px; }
.vrp-rating-row input[type=range]{ flex:1; }
.vrp-modal-footer{ display:flex; justify-content:flex-end; gap:10px; }
.vrp-lightbox{ position:fixed; inset:0; background:rgba(15,17,17,.85); display:flex; align-items:center;
  justify-content:center; z-index:300; cursor:zoom-out; padding:24px; }
.vrp-lightbox img{ max-width:min(90vw,700px); max-height:85vh; border-radius:6px; }
@media (max-width:720px){ .vrp-overview{ grid-template-columns:1fr; } .vrp-stat-grid{ grid-template-columns:1fr 1fr; } }
`;