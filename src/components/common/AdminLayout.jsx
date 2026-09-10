import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { SidebarProvider } from "../../context/SidebarContext";

export default function AdminLayout({ children }) {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-surface text-ink-950">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col md:pl-72">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div key={location.pathname} className="animate-slide-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
