import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/** Common pagination footer used under every table/list in the app. */
export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing <span className="font-semibold text-ink-950">{start}-{end}</span> of{" "}
        <span className="font-semibold text-ink-950">{total}</span>
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Rows
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-control border border-line bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center overflow-hidden rounded-control border border-line">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 text-slate-600 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="border-x border-line px-3 py-1.5 text-sm font-semibold text-ink-950">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 text-slate-600 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
