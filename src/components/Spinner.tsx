// Inline spinner that inherits the current text colour (works on coloured buttons).
export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

// Convenience: a spinner + label, for button pending states.
export function Pending({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner /> {label}
    </span>
  );
}
