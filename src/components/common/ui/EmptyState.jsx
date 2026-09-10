import { Inbox } from "lucide-react";
import Button from "./Button";

/** Common "nothing here" state used for empty tables/lists. */
export default function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing to show",
  description,
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-16 text-center ${className}`}>
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-slate-400">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-ink-950">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
