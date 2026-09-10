import { Loader2 } from "lucide-react";

/** Simple centered spinner for full-section loading states. */
export function Loader({ label = "Loading...", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-16 text-center ${className}`}>
      <Loader2 size={24} className="animate-spin text-amber-500" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

/** A single skeleton bar. Compose these for custom skeleton layouts. */
export function SkeletonLine({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

/** Skeleton placeholder for a data table while it loads. */
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-6 px-5 py-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLine key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton placeholder for a grid of metric/summary cards. */
export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-card border border-line bg-surface-raised p-5 shadow-card">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="mt-3 h-6 w-16" />
          <SkeletonLine className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export default Loader;
