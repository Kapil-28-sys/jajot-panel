import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-amber-500 text-ink-950 hover:bg-amber-400 focus-visible:ring-amber-500/30 shadow-sm shadow-amber-500/20",
  secondary: "bg-ink-950 text-white hover:bg-ink-800 focus-visible:ring-ink-950/20",
  outline: "border border-line bg-white text-ink-800 hover:bg-surface focus-visible:ring-slate-300",
  danger: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-300",
  ghost: "text-ink-700 hover:bg-surface focus-visible:ring-slate-300",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3 text-sm gap-2",
};

/**
 * Common button used across the app. Keep every clickable action consistent:
 * same radius, focus ring, disabled/loading behavior.
 */
export default function Button({
  as: Component = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  children,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <Component
      disabled={Component === "button" ? isDisabled : undefined}
      aria-disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-control font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && Icon && <Icon size={16} />}
      {children}
    </Component>
  );
}
