"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, disabled, className }: SelectProps) {
  return (
    <div className={clsx("relative", className)}>
      <select
        className={clsx(
          "block w-full h-10 appearance-none rounded-xl border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:border-emerald-500",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
        )}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 z-10" />
    </div>
  );
}


