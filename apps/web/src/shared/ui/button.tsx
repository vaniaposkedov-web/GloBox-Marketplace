import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:bg-primary/50",
  secondary:
    "border border-border bg-background text-foreground hover:bg-black/5 disabled:opacity-50",
  ghost: "text-foreground hover:bg-black/5 disabled:opacity-50",
  danger: "bg-danger text-white hover:bg-red-700 disabled:bg-danger/50",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : null}
      {children}
    </button>
  );
}
