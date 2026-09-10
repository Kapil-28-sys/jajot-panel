import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogIn, LogOut, Menu, Search, ShieldCheck } from "lucide-react";
import { clearSession, getCurrentSession } from "../../config/localAuth";
import { useSidebar } from "../../context/SidebarContext";

export default function Navbar() {
  const navigate = useNavigate();
  const [session, setSession] = useState(getCurrentSession);
  const { setOpen: setSidebarOpen } = useSidebar();

  const logout = () => {
    clearSession();
    setSession({
      loggedIn: false,
      role: "Guest",
      name: "Not signed in",
    });
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface-raised/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="relative min-w-0 flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-control border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10"
            placeholder="Search products, orders, vendors…"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-800 lg:flex">
            <ShieldCheck size={14} className="text-amber-500" />
            {session.role}
          </div>

          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
          >
            <Bell size={19} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-white" />
          </button>

          {session.loggedIn ? (
            <button
              onClick={logout}
              className="hidden items-center gap-2 rounded-control border border-line px-3.5 py-2 text-sm font-medium text-ink-800 transition hover:bg-slate-100 sm:inline-flex"
            >
              <LogOut size={15} />
              Logout
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="hidden items-center gap-2 rounded-control bg-amber-500 px-3.5 py-2 text-sm font-bold text-ink-950 transition hover:bg-amber-400 sm:inline-flex"
            >
              <LogIn size={15} />
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
