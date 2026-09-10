import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentSession } from "../../config/localAuth"; // adjust path as per your project structure

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

// Safely parses a fetch Response as JSON. If the server returned HTML
// (404 page, 500 error page, login redirect, etc.) this throws a clear,
// readable error instead of crashing with "Unexpected token '<'".
async function safeJson(res, context = "request") {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error(`[${context}] Non-JSON response (status ${res.status}):`, raw.slice(0, 300));
    throw new Error(
      `Server returned an unexpected response for ${context} (status ${res.status}). ` +
        `This usually means the API route doesn't exist, the URL is malformed, or the token is invalid/expired.`
    );
  }
}

export default function Banners() {
  const navigate = useNavigate();
  const location = useLocation();
  const bannerBasePath = location.pathname.startsWith("/admin")
    ? "/admin/banners"
    : "/vendor/banners";
  const [auth, setAuth] = useState(null);
  const [token, setToken] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [imgErrorIds, setImgErrorIds] = useState({});

  useEffect(() => {
    const session = getCurrentSession();
    const storedToken = localStorage.getItem("adminToken");
    const superAdmin = session?.role === "Super Admin";

    setAuth(session);
    setToken(storedToken);
    setIsSuperAdmin(superAdmin);
  }, []);

  useEffect(() => {
    if (token === null) return;
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchBanners = async () => {
    setLoading(true);
    setError("");
    try {
      if (!token) {
        throw new Error("No auth token found. Please log in again.");
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Vendors should only ever see the banners they created.
      // Super Admin sees everything, so no vendor filter is applied for them.
      // NOTE: confirm the actual field name your session object uses for the
      // vendor's own id (it may be auth._id, auth.id, or auth.vendorId).
      const vendorId = auth?._id || auth?.id || auth?.vendorId;
      const url = !isSuperAdmin && vendorId
        ? `${API_BASE}/admin/banners?venderid=${vendorId}`
        : `${API_BASE}/admin/banners`;

      console.log("Fetching banners from:", url); // remove once confirmed working

      const res = await fetch(url, { headers });
      const data = await safeJson(res, "fetch banners");

      if (!res.ok) throw new Error(data?.message || `Failed to load banners (status ${res.status})`);

      const list = data?.data || data?.banners || data || [];
      setBanners(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || "Something went wrong while loading banners");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (banner) => {
    setTogglingId(banner._id);
    try {
      const res = await fetch(`${API_BASE}/admin/banners/${banner._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !banner.is_active }),
      });
      const data = await safeJson(res, "toggle banner status");
      if (!res.ok) throw new Error(data?.message || "Failed to update status");

      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (err) {
      alert(err.message || "Could not update banner status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title}"? This cannot be undone.`)) return;

    setDeletingId(banner._id);
    try {
      const res = await fetch(`${API_BASE}/admin/banners/${banner._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await safeJson(res, "delete banner").catch(() => ({}));
        throw new Error(data?.message || `Failed to delete banner (status ${res.status})`);
      }
      setBanners((prev) => prev.filter((b) => b._id !== banner._id));
    } catch (err) {
      alert(err.message || "Could not delete banner");
    } finally {
      setDeletingId(null);
    }
  };

  const isCurrentlyLive = (banner) => {
    if (!banner.is_active) return false;
    if (!banner.starts_at || !banner.ends_at) return banner.is_active; // no window set
    const now = new Date();
    return now >= new Date(banner.starts_at) && now <= new Date(banner.ends_at);
  };

  const filteredBanners = banners.filter((b) => {
    if (statusFilter === "active") return b.is_active;
    if (statusFilter === "inactive") return !b.is_active;
    return true;
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Banners</h1>
          <p style={styles.subheading}>
            Manage promotional banners shown across the storefront
          </p>
        </div>
        <button style={styles.createBtn} onClick={() => navigate(`${bannerBasePath}/add`)}>
          + Create Banner
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          {["all", "active", "inactive"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                ...styles.filterBtn,
                ...(statusFilter === f ? styles.filterBtnActive : {}),
              }}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
        <span style={styles.countText}>
          {filteredBanners.length} banner{filteredBanners.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={styles.emptyState}>Loading banners…</div>
      ) : filteredBanners.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>No banners found</p>
          <p style={{ margin: "6px 0 16px", fontSize: "13px", color: "#6b7280" }}>
            Create your first promotional banner to get started.
          </p>
          <button style={styles.createBtn} onClick={() => navigate(`${bannerBasePath}/add`)}>
            + Create Banner
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredBanners.map((banner) => {
            const live = isCurrentlyLive(banner);
            const imgFailed = imgErrorIds[banner._id];

            return (
              <div key={banner._id} style={styles.card}>
                <div style={styles.imageWrap}>
                  {banner.image_url && !imgFailed ? (
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      style={styles.image}
                      onError={() =>
                        setImgErrorIds((prev) => ({ ...prev, [banner._id]: true }))
                      }
                    />
                  ) : (
                    <div style={styles.imagePlaceholder}>No image</div>
                  )}

                  <div style={styles.imageOverlay}>
                    {banner.discount_percentage ? (
                      <span style={styles.discountBadge}>
                        {banner.discount_percentage}% OFF
                      </span>
                    ) : null}
                    <span
                      style={{
                        ...styles.liveBadge,
                        background: live ? "#067d62" : "#6b7280",
                      }}
                    >
                      {live ? "● Live now" : banner.is_active ? "Scheduled" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <h3 style={styles.cardTitle}>{banner.title}</h3>

                  <div style={styles.tagsRow}>
                    {banner.categoryId?.name && (
                      <span style={styles.tag}>{banner.categoryId.name}</span>
                    )}
                    {isSuperAdmin && banner.vendorId?.name && (
                      <span style={styles.tagAlt}>
                        {banner.vendorId?.companyname || banner.vendorId?.name}
                      </span>
                    )}
                    {banner.specialization && (
                      <span style={styles.tag}>{banner.specialization}</span>
                    )}
                  </div>

                  <div style={styles.metaLine}>
                    <span style={styles.metaKey}>Session</span>
                    <span style={styles.metaVal}>{banner.session_type || "—"}</span>
                  </div>
                  <div style={styles.metaLine}>
                    <span style={styles.metaKey}>Linked Products</span>
                    <span style={styles.metaVal}>{banner.product_count ?? 0}</span>
                  </div>
                  <div style={styles.metaLine}>
                    <span style={styles.metaKey}>Window</span>
                    <span style={styles.metaVal}>
                      {banner.starts_at && banner.ends_at
                        ? `${new Date(banner.starts_at).toLocaleDateString()} → ${new Date(
                            banner.ends_at
                          ).toLocaleDateString()}`
                        : "No date range set"}
                    </span>
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      style={styles.toggleBtn}
                      onClick={() => handleToggleActive(banner)}
                      disabled={togglingId === banner._id}
                    >
                      {togglingId === banner._id
                        ? "Updating…"
                        : banner.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>
                    <button
                      style={styles.editBtn}
                      onClick={() => navigate(`${bannerBasePath}/edit/${banner._id}`)}
                    >
                      Edit
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(banner)}
                      disabled={deletingId === banner._id}
                    >
                      {deletingId === banner._id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    padding: "24px",
    background: "#f3f4f6",
    minHeight: "100vh",
    fontFamily: "Inter, Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  heading: { fontSize: "22px", fontWeight: 700, color: "#111827", margin: 0 },
  subheading: { fontSize: "13px", color: "#6b7280", marginTop: "4px" },
  createBtn: {
    background: "#f0a500",
    color: "#111",
    fontWeight: 700,
    border: "none",
    borderRadius: "8px",
    padding: "10px 18px",
    fontSize: "14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  filterGroup: {
    display: "flex",
    gap: "8px",
    background: "#fff",
    padding: "4px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
  filterBtn: {
    border: "none",
    background: "transparent",
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#6b7280",
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "#111827",
    color: "#fff",
  },
  countText: { fontSize: "13px", color: "#6b7280", fontWeight: 500 },
  errorBox: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "10px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    marginBottom: "16px",
  },
  emptyState: {
    background: "#fff",
    borderRadius: "10px",
    padding: "48px 24px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#fff",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: "160px",
    background: "linear-gradient(135deg,#1f2937,#111827)",
  },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    fontSize: "13px",
  },
  imageOverlay: {
    position: "absolute",
    top: "10px",
    left: "10px",
    right: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  discountBadge: {
    background: "#cc0c39",
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  liveBadge: {
    color: "#fff",
    fontWeight: 600,
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
  },
  cardBody: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  tagsRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  tag: {
    background: "#f3f4f6",
    color: "#374151",
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "4px",
  },
  tagAlt: {
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "4px",
  },
  metaLine: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
  },
  metaKey: { color: "#6b7280", fontWeight: 600 },
  metaVal: { color: "#111827", fontWeight: 500 },
  cardActions: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  toggleBtn: {
    flex: 1,
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  editBtn: {
    flex: 1,
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  deleteBtn: {
    flex: 1,
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    padding: "8px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
};