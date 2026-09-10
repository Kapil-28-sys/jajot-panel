import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Slide-in panel from the left or right. Used for the mobile sidebar and
 * any other off-canvas panel (filters, detail views, etc.).
 */
export default function Drawer({ open, onClose, side = "left", title, width = "w-72", children }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className={`absolute inset-0 bg-ink-950/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute inset-y-0 ${side}-0 flex ${width} max-w-[85vw] flex-col bg-ink-950 text-white shadow-pop transition-transform duration-200 ${
          open ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full"
        }`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <p className="text-sm font-bold">{title}</p>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
