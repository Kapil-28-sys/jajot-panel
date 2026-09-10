import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Common select input. Accepts either `options` (array of {value, label})
 * or raw <option> children for full control.
 */
const Select = forwardRef(function Select(
  { label, error, helperText, required, options, placeholder, className = "", containerClassName = "", children, ...props },
  ref
) {
  const autoId = useId();
  const id = props.id || autoId;

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-800">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={`w-full appearance-none rounded-control border bg-white px-3.5 py-2.5 pr-9 text-sm text-ink-950 outline-none transition disabled:cursor-not-allowed disabled:bg-surface disabled:text-slate-400 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              : "border-line focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
          } ${className}`}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
});

export default Select;
