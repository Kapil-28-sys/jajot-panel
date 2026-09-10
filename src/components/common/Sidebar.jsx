import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Box, Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Package,
  PackageSearch,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { getCurrentSession } from "../../config/localAuth";
import { useSidebar } from "../../context/SidebarContext";
import Drawer from "./ui/Drawer";

const navItems = [
  { name: "Performance", path: "/admin", icon: LayoutDashboard, end: true, roles: ["Super Admin", "Assistant Super Admin", "Vendor"] },
 
    {
    name: "Vendor",
    icon: PackageSearch,
    items: [
        { name: "vendor Enquiry", path: "/admin/vendors" },
      { name: "vendor Permission", path: "/admin/vendorpermission" },
    
    ],
    roles: ["Super Admin"],
  },
  {
    name: "Product",
    icon: PackageSearch,
    items: [
      { name: "Workspace", path: "/vendor/workspace" },
      { name: "Add product", path: "/vendor/products/add" },
      { name: "Manage product", path: "/vendor/products" },
      { name: "Manage pricing", path: "/vendor/finance" },
      { name: "Attribute", path: "/vendor/attribute" },
      { name: "Analyse review", path: "/vendor/reviews" },
      { name: "Research product", path: "/vendor/researchproduct" },
      { name: "Product report", path: "/vendor/products/reports" },
    ],
    roles: ["Vendor"],
  },
 
  {
    name: "Banner",
    icon: PackageSearch,
    items: [
      { name: "Banner", path: "/vendor/banners" },
      { name: "Add Banner", path: "/vendor/banners/add" },

    ],
    roles: ["Vendor"],
  },
  {
    name: "Banner",
    icon: PackageSearch,
    items: [
      { name: "Banner Permission", path: "/admin/bannerpermission" },
    ],
    roles: ["Super Admin"],
  },
    {
    name: "Products",
    icon: PackageSearch,
    items: [
      { name: "All products", path: "/admin/allproduct" },
      { name: "productsales", path: "/admin/productsales" },

    ],
    roles: ["Super Admin"],
  },
  

  {
    name: "Orders",
    icon: ClipboardList,
    items: [
      { name: "Workspace", path: "/vendor/orderworkspce" },
      { name: "Manage Orders", path: "/vendor/orders" },
      { name: "Manage  Returns", path: "/vendor/managereturn" },
      { name: "Reslove Claims", path: "/vendor/resolveclaims" },
      { name: "Orders report", path: "/vendor/ordereport" },
    ],
    roles: ["Vendor"],
  },

  {
    name: "Finance",
    icon: ClipboardList,
    items: [
      { name: "Financeworkspce", path: "/vendor/Financeworkspce" },
      { name: "managepayment", path: "/vendor/managepayment" },
      { name: "managetaxes", path: "/vendor/managetaxes" },
      { name: "Profitanalysis", path: "/vendor/Profitanalysis" },
      { name: "Financereport", path: "/vendor/Financereport" },
    ],
    roles: ["Vendor"],
  },
  

  { name: "Customers", path: "/admin/users", icon: Users, roles: ["Super Admin"] },

  { name: "Payment", path: "/admin/payment", icon: Users, roles: ["Super Admin"] },
  { name: "Shipping", path: "/admin/shipping", icon: Users, roles: ["Super Admin"] },



  {
    name: "Categories",
    icon: Box,
    items: [
      { name: "Category", path: "/admin/categories" },
      { name: "Sub Category", path: "/admin/subcategory" },
      { name: "Sub to Sub Category", path: "/admin/subtosubcategory" },
      { name: "Category Attribute", path: "/admin/categoryattribute" },
    ],
    roles: ["Super Admin", "Assistant Super Admin", "Vendor"],
  },

  { name: "Settings", path: "/admin/settings", icon: Settings, roles: ["Super Admin"] },
 
  { name: "Customer Carts", path: "/vendor/cart", icon: ShoppingCart, roles: ["Vendor"] },
];

export default function Sidebar() {
  const location = useLocation();
  const session = getCurrentSession();
  const visibleNavItems = navItems.filter((item) => item.roles.includes(session.role));
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();

  const isSubActive = (item) =>
    item.items?.some(
      (sub) =>
        location.pathname === sub.path ||
        location.pathname.startsWith(sub.path + "/")
    );

  const [openSections, setOpenSections] = useState(() => {
    const initial = {};
    navItems.forEach((item) => {
      if (item.items) {
        initial[item.name] = isSubActive(item);
      }
    });
    return initial;
  });

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev };
      navItems.forEach((item) => {
        if (item.items && isSubActive(item)) {
          next[item.name] = true;
        }
      });
      return next;
    });
  }, [location.pathname]);

  const toggleSection = (name) => {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive
      ? "bg-amber-500/10 text-amber-400"
      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
    }`;

  const navContent = (
    <>
      <div className="border-b border-white/[0.06] px-4 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-bold text-ink-950">
            {(session.name || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{session.name}</p>
            <p className="truncate text-xs text-slate-400">{session.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;

          if (item.items) {
            const isActiveSection = isSubActive(item);
            const isOpen = !!openSections[item.name];

            return (
              <div key={item.name} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(item.name)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActiveSection
                      ? "bg-white/[0.06] text-white"
                      : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                    }`}
                >
                  <Icon size={17} strokeWidth={2} className={isActiveSection ? "text-amber-400" : "text-slate-400"} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>

                {isOpen && (
                  <div className="ml-[22px] space-y-0.5 border-l border-white/10 pl-4">
                    {item.items.map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        end
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2 text-sm transition ${isActive
                            ? "bg-amber-500/10 font-semibold text-amber-400"
                            : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                          }`
                        }
                      >
                        {sub.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink key={item.path} to={item.path} end={item.end} className={linkClass}>
              <Icon size={17} strokeWidth={2} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="rounded-xl bg-white/[0.04] px-3 py-3 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Multi-vendor Seller Hub</p>
          <p className="mt-0.5">v2.0 · Admin console</p>
        </div>
      </div>
    </>
  );

  const brand = (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-ink-950 shadow-lg shadow-amber-500/20">
        <Store size={19} strokeWidth={2.5} />
      </div>
      <div>
        <h1 className="text-[15px] font-bold leading-tight tracking-tight">Seller Hub</h1>
        <p className="text-[11px] text-slate-400">Marketplace admin</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-72 shrink-0 flex-col overflow-hidden bg-ink-950 text-white md:flex">
        <div className="px-5 py-5">{brand}</div>
        {navContent}
      </aside>

      {/* Mobile sidebar drawer, opened via the navbar's menu button */}
      <div className="md:hidden">
        <Drawer open={sidebarOpen} onClose={() => setSidebarOpen(false)} side="left" width="w-72">
          <div className="px-5 py-5">{brand}</div>
          {navContent}
        </Drawer>
      </div>
    </>
  );
}
