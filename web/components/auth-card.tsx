"use client";

import * as React from "react";
import Image from "next/image";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="Rorun"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
          )}
        </div>
        <div className="mt-6 space-y-4">{children}</div>
        {footer && (
          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}


