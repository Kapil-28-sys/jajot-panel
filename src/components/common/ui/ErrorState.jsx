import { AlertTriangle } from "lucide-react";
import Button from "./Button";

/** Common "something went wrong" state for failed API calls. */
export default function ErrorState({ message = "Something went wrong. Please try again.", onRetry, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-16 text-center ${className}`}>
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertTriangle size={22} />
      </div>
      <p className="text-sm font-semibold text-ink-950">Couldn't load this data</p>
      <p className="max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
