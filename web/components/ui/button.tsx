import * as React from "react";
import { clsx } from "clsx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref
  ) {
    const base =
      "inline-flex items-center justify-center rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2";

    const variants: Record<string, string> = {
      primary: "bg-brand text-white hover:bg-brand-dark border border-brand",
      secondary:
        "bg-white text-slate-900 hover:bg-slate-50 border border-slate-300",
      ghost: "bg-transparent text-slate-700 hover:bg-slate-100 border border-transparent",
      danger: "bg-danger text-white hover:bg-red-600 border border-danger"
    };

    const sizes: Record<string, string> = {
      sm: "px-3 py-1.5 text-xs h-8",
      md: "px-4 py-2 text-sm h-10",
      lg: "px-5 py-2.5 text-base h-12"
    };

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        data-ui="Button"
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {loading && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);


