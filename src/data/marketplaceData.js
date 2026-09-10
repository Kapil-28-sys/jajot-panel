export const vendors = [
  {
    id: "vdr-apex",
    name: "Apex Electronics",
    owner: "Rohit Mehra",
    email: "seller@apexelectronics.in",
    status: "Active",
    category: "Mobiles & Accessories",
    fulfillment: "FBA",
    rating: 4.8,
    city: "Bengaluru",
    joined: "Jan 2025",
    sla: "98.6%",
  },
  {
    id: "vdr-home",
    name: "HomeNest India",
    owner: "Ananya Rao",
    email: "ops@homenest.in",
    status: "Active",
    category: "Home & Kitchen",
    fulfillment: "Easy Ship",
    rating: 4.6,
    city: "Delhi",
    joined: "Mar 2025",
    sla: "96.4%",
  },
  {
    id: "vdr-style",
    name: "StyleCraft Apparel",
    owner: "Kabir Sethi",
    email: "admin@stylecraft.co",
    status: "Review",
    category: "Fashion",
    fulfillment: "Seller Flex",
    rating: 4.2,
    city: "Mumbai",
    joined: "Aug 2025",
    sla: "91.8%",
  },
];

export const products = [
  {
    id: "PRD-8812",
    vendorId: "vdr-apex",
    name: "Noise cancelling wireless earbuds",
    asin: "B0APEX8812",
    category: "Electronics",
    price: 3299,
    stock: 186,
    sold: 1240,
    status: "Buy Box",
    image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PRD-5510",
    vendorId: "vdr-apex",
    name: "65W fast charging adapter",
    asin: "B0APEX5510",
    category: "Mobile Accessories",
    price: 1199,
    stock: 42,
    sold: 820,
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PRD-3120",
    vendorId: "vdr-home",
    name: "Cast iron non-stick cookware set",
    asin: "B0HOME3120",
    category: "Home & Kitchen",
    price: 2499,
    stock: 12,
    sold: 410,
    status: "Low Stock",
    image: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PRD-6634",
    vendorId: "vdr-home",
    name: "Memory foam pillow pack",
    asin: "B0HOME6634",
    category: "Furniture",
    price: 1799,
    stock: 73,
    sold: 560,
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1587750059638-e7e8c57d700c?auto=format&fit=crop&w=160&q=80",
  },
  {
    id: "PRD-9044",
    vendorId: "vdr-style",
    name: "Cotton oversized hoodie",
    asin: "B0STYLE9044",
    category: "Fashion",
    price: 1499,
    stock: 0,
    sold: 295,
    status: "Suppressed",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=160&q=80",
  },
];

export const orders = [
  { id: "ORD-10091", vendorId: "vdr-apex", customer: "Priya Sharma", date: "03 Jun 2026", status: "Shipped", total: 6598, items: 2, channel: "Prime" },
  { id: "ORD-10090", vendorId: "vdr-home", customer: "Arjun Patel", date: "03 Jun 2026", status: "Pending", total: 2499, items: 1, channel: "Amazon.in" },
  { id: "ORD-10087", vendorId: "vdr-style", customer: "Meera Nair", date: "02 Jun 2026", status: "Returned", total: 1499, items: 1, channel: "Amazon.in" },
  { id: "ORD-10084", vendorId: "vdr-apex", customer: "kaps sharma", date: "02 Jun 2026", status: "Delivered", total: 1199, items: 1, channel: "Prime" },
  { id: "ORD-10078", vendorId: "vdr-home", customer: "Rahul verma", date: "01 Jun 2026", status: "Delivered", total: 3598, items: 2, channel: "Amazon.in" },
];

export const customers = [
  { id: "CUS-01", vendorId: "vdr-apex", name: "Priya Sharma", email: "priya@example.com", orders: 7, ltv: 28640, status: "Repeat" },
  { id: "CUS-02", vendorId: "vdr-home", name: "Arjun Patel", email: "arjun@example.com", orders: 3, ltv: 8197, status: "Active" },
  { id: "CUS-03", vendorId: "vdr-style", name: "Meera Nair", email: "meera@example.com", orders: 2, ltv: 2998, status: "Return Risk" },
  { id: "CUS-04", vendorId: "vdr-apex", name: "kaps sharma", email: "nitin@example.com", orders: 5, ltv: 14890, status: "Active" },
];

export const performance = [
  { vendorId: "vdr-apex", revenue: 4289000, orders: 2180, conversion: "8.9%", returnRate: "2.1%", health: 94, growth: "+18.4%" },
  { vendorId: "vdr-home", revenue: 2315000, orders: 1240, conversion: "6.8%", returnRate: "3.4%", health: 88, growth: "+11.7%" },
  { vendorId: "vdr-style", revenue: 945000, orders: 520, conversion: "4.2%", returnRate: "7.8%", health: 71, growth: "-3.6%" },
];

export const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const vendorName = (vendorId) =>
  vendors.find((vendor) => vendor.id === vendorId)?.name || "Marketplace";

export const summaryFor = (vendorId = "all") => {
  const scopedPerformance =
    vendorId === "all"
      ? performance
      : performance.filter((item) => item.vendorId === vendorId);
  const scopedProducts =
    vendorId === "all"
      ? products
      : products.filter((item) => item.vendorId === vendorId);

  return scopedPerformance.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      orders: acc.orders + item.orders,
      health: acc.health + item.health,
      vendors: acc.vendors + 1,
      products: acc.products,
      lowStock: acc.lowStock,
    }),
    {
      revenue: 0,
      orders: 0,
      health: 0,
      vendors: 0,
      products: scopedProducts.length,
      lowStock: scopedProducts.filter((item) => item.stock < 15).length,
    }
  );
};
