import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, IndianRupee, PackageCheck, RefreshCw, ShoppingCart, Store } from "lucide-react";
import { apiUrl, assetUrl } from "../../config/api";
import { getCurrentSession } from "../../config/localAuth";

const vcFormatINR = (value = 0) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const vcTimeAgo = (dateStr) => {
  if (!dateStr) return "recently";
  const time = new Date(dateStr).getTime();
  if (Number.isNaN(time)) return "recently";

  const diffMs = Date.now() - time;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getOffer = (item) => item?.variantId?.offer || item?.variant?.offer || item?.offer || {};
const getProduct = (item) => item?.pid || item?.productId || item?.product || {};
const getVariant = (item) => item?.variantId || item?.variant || {};
const getVendor = (item) => item?.venderid || item?.vendorId || item?.vendor || {};

const getPrice = (item) => {
  const offer = getOffer(item);
  return Number(
    offer.salePrice ||
      offer.sellingPrice ||
      item?.salePrice ||
      item?.price ||
      getVariant(item)?.price ||
      0
  );
};

const getImage = (item) => {
  const product = getProduct(item);
  const variant = getVariant(item);
  const image =
    variant?.images?.[0] ||
    variant?.image ||
    product?.images?.[0] ||
    product?.image ||
    product?.thumbnail ||
    "";

  return assetUrl(image);
};

// Builds the cart-by-vendor URL safely, collapsing any accidental
// double slashes (e.g. base URL ending in "/" + path starting with "/")
// which some hosts/proxies (Render included) will 404 on.
const buildVendorCartUrl = (vendorId) => {
  const raw = apiUrl(`/api/cart/vendor/${vendorId}`);
  // Collapse "//" that isn't part of "http(s)://"
  return raw.replace(/([^:])\/{2,}/g, "$1/");
};

export default function VendorCartPage() {
  const [session, setSession] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const s = getCurrentSession();
    setSession(s);
    setSessionChecked(true);
  }, []);

  // Derived, not stateful — vendorId and any "couldn't resolve" flag
  // are computed together so they can never be out of sync with
  // each other across renders.
  const vendorId = useMemo(() => {
    if (!sessionChecked) return null; // still loading session, don't decide yet

    return (
      session?.vendorId ||
      session?._id ||
      session?.id ||
      session?.vendor?._id ||
      localStorage.getItem("vendorId") ||
      localStorage.getItem("userId") ||
      ""
    );
  }, [session, sessionChecked]);

  useEffect(() => {
    if (vendorId === null) {
      // session still resolving
      return;
    }

    if (!vendorId) {
      setLoading(false);
      setError("Could not determine your vendor ID. Please log in again.");
      return;
    }

    const loadCart = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(buildVendorCartUrl(vendorId), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        // Some backends 404 when there are simply no cart items for a
        // vendor instead of returning an empty array with 200. Treat
        // that case as "no items" rather than a hard error.
        if (res.status === 404) {
          setItems([]);
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || data?.error || "Failed to load cart data");
        }

        const list = data?.data || data?.items || data?.cart || (Array.isArray(data) ? data : []);

        // Extra safety net: even though the API is expected to filter by
        // vendor already, double-check client-side so a backend bug can
        // never leak another vendor's products into this view.
        const onlyThisVendor = Array.isArray(list)
          ? list.filter((item) => {
              const v = getVendor(item);
              const itemVendorId = v?._id || item?.pid?.vendorId || "";
              return !itemVendorId || String(itemVendorId) === String(vendorId);
            })
          : [];

        setItems(onlyThisVendor);
      } catch (err) {
        setError(err.message || "Something went wrong while loading cart data");
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [vendorId, refreshKey]);

  const stats = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + Number(item?.qty || item?.quantity || 0), 0);
    const potentialRevenue = items.reduce(
      (sum, item) => sum + Number(item?.qty || item?.quantity || 0) * getPrice(item),
      0
    );
    const avgDiscount = items.length
      ? Math.round(
          items.reduce((sum, item) => sum + Number(item?.offerDiscount || item?.discount || 0), 0) /
            items.length
        )
      : 0;
    const uniqueCarts = new Set(items.map((item) => item?.divid || item?.cartId || item?.userId || item?._id)).size;

    return { totalUnits, potentialRevenue, avgDiscount, uniqueCarts };
  }, [items]);

  const vendor = getVendor(items[0]) || {};
  const vendorName = vendor?.companyname || vendor?.businessName || vendor?.name || session?.name || "Vendor";

  return (
    <div className="min-h-screen bg-surface p-6 text-ink-950">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-ink-800 px-3 py-1 text-xs font-semibold text-white">
            <ShoppingCart size={14} />
            Customer cart activity
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Products Added To Cart</h1>
          <p className="mt-1 text-sm text-slate-500">
            See which of your products customers have saved in their carts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-control border border-slate-200 bg-white px-4 py-2 text-sm">
            <span className="text-slate-500">Vendor:</span>{" "}
            <span className="font-semibold">{vendorName}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="inline-flex items-center gap-2 rounded-control bg-amber-500 px-4 py-2 text-sm font-bold text-ink-950 hover:bg-amber-400 disabled:opacity-60"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartStat icon={PackageCheck} label="Products in carts" value={items.length} />
        <CartStat icon={ShoppingCart} label="Total units" value={stats.totalUnits} />
        <CartStat icon={IndianRupee} label="Potential revenue" value={vcFormatINR(stats.potentialRevenue)} />
        <CartStat icon={Store} label="Avg. discount" value={`${stats.avgDiscount}%`} />
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load vendor cart data</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-control border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold">Cart Products</h2>
            <p className="text-xs text-slate-500">
              Vendor ID: <span className="font-mono">{vendorId}</span>
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-500">
            {stats.uniqueCarts} customer cart{stats.uniqueCarts === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-14 animate-pulse rounded-control border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
            <ShoppingCart size={42} className="mb-3 text-slate-300" />
            <h3 className="text-lg font-bold">No cart activity yet</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              When customers add your products to cart, those products will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3 text-right">MRP</th>
                  <th className="px-5 py-3 text-right">Sale price</th>
                  <th className="px-5 py-3 text-center">Discount</th>
                  <th className="px-5 py-3 text-center">Qty</th>
                  <th className="px-5 py-3">Added</th>
                  <th className="px-5 py-3">Cart ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <VendorCartRow key={item?._id || `${item?.divid}-${index}`} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CartStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-control border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-ink-800 text-white">
        <Icon size={18} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function VendorCartRow({ item }) {
  const product = getProduct(item);
  const variant = getVariant(item);
  const offer = getOffer(item);
  const qty = Number(item?.qty || item?.quantity || 0);
  const discount = Number(item?.offerDiscount || item?.discount || 0);
  const salePrice = getPrice(item);
  const mrp = Number(offer?.mrp || offer?.sellingPrice || item?.mrp || 0);
  const image = getImage(item);
  const productName = product?.productName || product?.name || "Product";
  const brand = product?.brandName || product?.brand || "Marketplace";
  const sku = variant?.sku || product?.sku || item?.sku || "N/A";
  const cartId = item?.divid || item?.cartId || item?._id || "";
  const variantText = variant?.attributes?.[0]?.value || variant?.variantName || variant?.color || "";

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-control border border-slate-200 bg-slate-100">
            {image ? (
              <img src={image} alt={productName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-slate-400">No image</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold uppercase tracking-wide text-amber-600">{brand}</p>
            <p className="truncate font-semibold">{productName}</p>
            {variantText && <p className="truncate text-xs text-slate-500">{variantText}</p>}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 font-mono text-xs text-slate-600">{sku}</td>
      <td className="px-5 py-3 text-right">
        {mrp > salePrice ? (
          <span className="text-slate-400 line-through">{vcFormatINR(mrp)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-right font-bold text-red-600">{vcFormatINR(salePrice)}</td>
      <td className="px-5 py-3 text-center">
        {discount > 0 ? (
          <span className="inline-block rounded-control bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-500">
            {discount}%
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-5 py-3 text-center font-semibold">{qty}</td>
      <td className="px-5 py-3 text-xs text-slate-500">{vcTimeAgo(item?.createdAt || item?.updatedAt)}</td>
      <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-600">
        {cartId ? `#${String(cartId).slice(0, 8)}` : "N/A"}
      </td>
    </tr>
  );
}