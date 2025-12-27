"use client";

import { createContext, useContext, useState, useCallback } from "react";
import clsx from "clsx";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
};

interface ToastContextValue {
  addToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, variant: "default", ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "rounded-xl border bg-white px-4 py-3 shadow-card",
              toast.variant === "error" && "border-red-200 bg-red-50",
              toast.variant === "success" && "border-emerald-200 bg-emerald-50",
              !toast.variant && "border-slate-200"
            )}
          >
            <div className={clsx(
              "text-sm font-semibold",
              toast.variant === "error" && "text-red-900",
              toast.variant === "success" && "text-emerald-900",
              !toast.variant && "text-slate-900"
            )}>{toast.title}</div>
            {toast.description && (
              <div className={clsx(
                "mt-1 text-xs",
                toast.variant === "error" && "text-red-700",
                toast.variant === "success" && "text-emerald-700",
                !toast.variant && "text-slate-600"
              )}>{toast.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

