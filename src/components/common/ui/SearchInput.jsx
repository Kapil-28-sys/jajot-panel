import { Search, X } from "lucide-react";

/** Common search box used above tables/lists throughout the app. */
export default function SearchInput({ value, onChange, placeholder = "Search", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-control border border-line bg-white py-2.5 pl-10 pr-9 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-surface hover:text-ink-800"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
