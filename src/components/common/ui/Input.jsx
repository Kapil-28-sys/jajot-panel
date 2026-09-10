import { forwardRef, useId } from "react";

/**
 * Common text input with label / error / helper text so every form field
 * looks and behaves the same across the app.
 */
const Input = forwardRef(function Input(
  { label, error, helperText, required, className = "", containerClassName = "", ...props },
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
      <input
        ref={ref}
        id={id}
        className={`w-full rounded-control border px-3.5 py-2.5 text-sm text-ink-950 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-surface disabled:text-slate-400 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
            : "border-line focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
        } ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="mt-1.5 text-xs text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
