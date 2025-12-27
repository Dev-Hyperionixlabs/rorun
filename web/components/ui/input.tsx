import * as React from "react";
import { clsx } from "clsx";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, disabled, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          "flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:border-emerald-500",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100",
          className
        )}
        disabled={disabled}
        {...props}
      />
    );
  }
);


