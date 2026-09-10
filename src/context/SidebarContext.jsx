import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const SidebarContext = createContext(null);

/**
 * Tracks whether the mobile sidebar drawer is open. Lives above
 * Navbar + Sidebar inside AdminLayout so the hamburger button in the
 * navbar can control the drawer rendered by the sidebar.
 */
export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the drawer automatically whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
