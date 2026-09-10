/**
 * Common page header used at the top of every module page: title,
 * description, and a right-aligned slot for actions/filters.
 */
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-sm font-medium text-amber-600">{eyebrow}</p>}
          <h1 className="mt-1 text-[1.65rem] font-bold tracking-tight text-ink-950">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{actions}</div>}
      </div>
    </div>
  );
}
