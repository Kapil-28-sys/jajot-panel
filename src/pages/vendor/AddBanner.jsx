import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentSession } from "../../config/localAuth"; // adjust path as per your project structure

const API_BASE = "https://amazon-multi-vendor-3.onrender.com/api";

export default function AddBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const bannerBasePath = location.pathname.startsWith("/admin")
    ? "/admin/banners"
    : "/vendor/banners";
  const [auth, setAuth] = useState(null);
  const [token, setToken] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);

  const [form, setForm] = useState({
    title: "",
    image_url: "",
    vendorId: "",
    categoryId: "",
    discount_percentage: "",
    starts_at: "",
    ends_at: "",
    session_type: "home_page",
    specialization: "offer",
    is_active: true,
  });

  // localStorage / session logic must run only on client (Next.js SSR safety)
  useEffect(() => {
    const session = getCurrentSession();
    const storedToken = localStorage.getItem("adminToken");
    const superAdmin = session?.role === "Super Admin";

    setAuth(session);
    setToken(storedToken);
    setIsSuperAdmin(superAdmin);

    setForm((p) => ({
      ...p,
      vendorId: superAdmin ? "" : session?.vendorId || "",
    }));
  }, []);

  useEffect(() => {
    if (token === null) return; // wait until token is resolved on client

    const fetchMeta = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const catRes = await fetch(`${API_BASE}/categories`, { headers });
        const catData = await catRes.json();
        setCategories(catData?.data || catData?.categories || catData || []);

        if (isSuperAdmin) {
          const venRes = await fetch(`${API_BASE}/admin/vendors`, { headers });
          const venData = await venRes.json();
          setVendors(venData?.data || venData?.vendors || venData || []);
        }
      } catch (err) {
        console.error("meta fetch failed", err);
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isSuperAdmin]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (name === "image_url") setImgError(false);
  };

  const toISO = (localDateTimeStr) => {
    if (!localDateTimeStr) return "";
    return new Date(localDateTimeStr).toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.title ||
      !form.image_url ||
      !form.categoryId ||
      !form.starts_at ||
      !form.ends_at ||
      !form.session_type ||
      !form.specialization
    ) {
      setError("Please fill all required fields.");
      return;
    }
    if (isSuperAdmin && !form.vendorId) {
      setError("Please select a vendor.");
      return;
    }

    const payload = {
      title: form.title,
      image_url: form.image_url,
      vendorId: form.vendorId,
      categoryId: form.categoryId,
      discount_percentage: Number(form.discount_percentage) || 0,
      starts_at: toISO(form.starts_at),
      ends_at: toISO(form.ends_at),
      session_type: form.session_type,
      specialization: form.specialization,
      is_active: form.is_active,
    };

    // Debug log - remove after confirming payload is correct
    console.log("Banner payload being sent:", payload);

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/admin/banners`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to create banner");

      navigate(bannerBasePath);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.heading}>Create Banner</h1>
        <button style={styles.backBtn} onClick={() => navigate(bannerBasePath)}>
          ← Back to Banners
        </button>
      </div>

      <div style={styles.layout}>
        {/* FORM */}
        <form onSubmit={handleSubmit} style={styles.formCard}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.field}>
            <label style={styles.label}>Banner Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Nike T-Shirts — 40% OFF"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Image URL *</label>
            <input
              type="text"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="https://yourcdn.com/nike-banner.jpg"
              style={styles.input}
            />
          </div>

          {isSuperAdmin && (
            <div style={styles.field}>
              <label style={styles.label}>Vendor *</label>
              <select
                name="vendorId"
                value={form.vendorId}
                onChange={handleChange}
                style={styles.input}
                disabled={loadingMeta}
              >
                <option value="">Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.businessName || v.name || v.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Category *</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              style={styles.input}
              disabled={loadingMeta}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Discount Percentage</label>
            <input
              type="number"
              name="discount_percentage"
              value={form.discount_percentage}
              onChange={handleChange}
              placeholder="40"
              min="0"
              max="100"
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Session Type *</label>
              <select
                name="session_type"
                value={form.session_type}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="home_page">Home Page</option>
                <option value="category_page">Category Page</option>
                <option value="product_page">Product Page</option>
                <option value="vendor_page">Vendor Page</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Specialization *</label>
              <select
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="offer">Offer</option>
                <option value="new_arrival">New Arrival</option>
                <option value="trending">Trending</option>
                <option value="clearance">Clearance</option>
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                style={{ width: "16px", height: "16px" }}
              />
              Active (banner will be live if within date window)
            </label>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Starts At *</label>
              <input
                type="datetime-local"
                name="starts_at"
                value={form.starts_at}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Ends At *</label>
              <input
                type="datetime-local"
                name="ends_at"
                value={form.ends_at}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <button type="submit" style={styles.submitBtn} disabled={submitting}>
            {submitting ? "Creating..." : "Create Banner"}
          </button>
        </form>

        {/* AMAZON STYLE PREVIEW */}
        <div style={styles.previewCol}>
          <h3 style={styles.previewLabel}>Live Preview</h3>

          <div style={styles.banner}>
            {form.image_url && !imgError ? (
              // Using plain <img> intentionally since banner URL is dynamic/user-entered.
              // If you want next/image optimization, add the domain to next.config.js images.remotePatterns
              <img
                src={form.image_url}
                alt="banner"
                style={styles.bannerImg}
                onError={() => setImgError(true)}
              />
            ) : (
              <div style={styles.bannerPlaceholder}>
                {imgError ? "Image failed to load" : "Image preview will appear here"}
              </div>
            )}

            <div style={styles.bannerOverlay}>
              {form.discount_percentage ? (
                <span style={styles.discountBadge}>
                  {form.discount_percentage}% OFF
                </span>
              ) : null}
              <h2 style={styles.bannerTitle}>
                {form.title || "Your banner title here"}
              </h2>
              <button style={styles.shopNowBtn}>Shop now</button>
            </div>
          </div>

          <div style={styles.metaCard}>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Category</span>
              <span style={styles.metaVal}>
                {categories.find((c) => c._id === form.categoryId)?.name || "—"}
              </span>
            </div>
            {isSuperAdmin && (
              <div style={styles.metaRow}>
                <span style={styles.metaKey}>Vendor</span>
                <span style={styles.metaVal}>
                  {vendors.find((v) => v._id === form.vendorId)?.businessName ||
                    vendors.find((v) => v._id === form.vendorId)?.name ||
                    "—"}
                </span>
              </div>
            )}
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Live Window</span>
              <span style={styles.metaVal}>
                {form.starts_at && form.ends_at
                  ? `${new Date(form.starts_at).toLocaleString()} → ${new Date(
                      form.ends_at
                    ).toLocaleString()}`
                  : "—"}
              </span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Session Type</span>
              <span style={styles.metaVal}>{form.session_type || "—"}</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Specialization</span>
              <span style={styles.metaVal}>{form.specialization || "—"}</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Status</span>
              <span style={styles.metaVal}>{form.is_active ? "Active" : "Inactive"}</span>
            </div>
          </div>
        </div>
      </div>
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
    alignItems: "center",
    marginBottom: "20px",
  },
  heading: { fontSize: "22px", fontWeight: 700, color: "#111827" },
  backBtn: {
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: "14px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    alignItems: "start",
  },
  formCard: {
    background: "#fff",
    borderRadius: "10px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  row: { display: "flex", gap: "12px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#374151" },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },
  submitBtn: {
    marginTop: "8px",
    background: "#f0a500",
    color: "#111",
    fontWeight: 700,
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    cursor: "pointer",
  },
  errorBox: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "10px 12px",
    borderRadius: "6px",
    fontSize: "13px",
  },
  previewCol: { position: "sticky", top: "20px" },
  previewLabel: { fontSize: "14px", fontWeight: 600, marginBottom: "10px", color: "#374151" },
  banner: {
    position: "relative",
    width: "100%",
    height: "320px",
    borderRadius: "10px",
    overflow: "hidden",
    background: "linear-gradient(135deg,#1f2937,#111827)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  bannerImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  bannerPlaceholder: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    fontSize: "14px",
  },
  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(90deg, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0) 75%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "32px",
    gap: "12px",
  },
  discountBadge: {
    background: "#cc0c39",
    color: "#fff",
    fontWeight: 700,
    fontSize: "13px",
    padding: "4px 10px",
    borderRadius: "4px",
    width: "fit-content",
  },
  bannerTitle: {
    color: "#fff",
    fontSize: "28px",
    fontWeight: 800,
    maxWidth: "70%",
    textShadow: "0 2px 6px rgba(0,0,0,0.5)",
    margin: 0,
  },
  shopNowBtn: {
    width: "fit-content",
    background: "#f0a500",
    border: "none",
    borderRadius: "20px",
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  metaCard: {
    background: "#fff",
    borderRadius: "10px",
    padding: "16px",
    marginTop: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "13px",
  },
  metaKey: { color: "#6b7280", fontWeight: 600 },
  metaVal: { color: "#111827", fontWeight: 500, textAlign: "right" },
};
