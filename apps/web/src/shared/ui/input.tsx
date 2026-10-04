import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}

export function Field({
  label,
  error,
  hint,
  className = "",
  id,
  ...rest
}: FieldProps) {
  const inputId = id ?? `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        {...rest}
        className={`px-3 py-2.5 rounded-lg border bg-background outline-none transition focus:ring-2 focus:ring-primary/30 ${
          error ? "border-danger" : "border-border focus:border-primary"
        }`}
      />
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
