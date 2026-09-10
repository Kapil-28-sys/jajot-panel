const TONE_CLASSES = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-600",
  blue: "bg-sky-50 text-sky-700",
  purple: "bg-indigo-50 text-indigo-700",
  gray: "bg-slate-100 text-slate-600",
};

// Maps common status strings to a tone. Pass an explicit `tone` prop to
// override when a status doesn't fit this default mapping.
const STATUS_TONE = {
  active: "green",
  approved: "green",
  delivered: "green",
  completed: "green",
  paid: "green",
  inactive: "gray",
  draft: "gray",
  pending: "amber",
  processing: "amber",
  shipped: "blue",
  returned: "red",
  rejected: "red",
  failed: "red",
  cancelled: "red",
};

/** Common status pill used across tables and detail pages. */
export default function StatusBadge({ status, tone, className = "" }) {
  const key = String(status || "").toLowerCase();
  const resolvedTone = tone || STATUS_TONE[key] || "gray";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TONE_CLASSES[resolvedTone]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
