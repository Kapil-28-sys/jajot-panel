import { useEffect } from "react";
import { X } from "lucide-react";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Common centered modal. Handles the overlay, escape-to-close, and a
 * consistent header/body/footer layout so every dialog in the app matches.
 */
export default function Modal({ open, onClose, title, description, size = "md", footer, children }) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[90vh] w-full ${SIZES[size] || SIZES.md} flex-col overflow-hidden rounded-card bg-white shadow-pop animate-scale-in`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              {title && <h2 className="text-base font-bold text-ink-950">{title}</h2>}
              {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-surface hover:text-ink-800"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
