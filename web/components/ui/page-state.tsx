"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function useSlowLoading(loading: boolean, ms = 12000) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = window.setTimeout(() => setSlow(true), ms);
    return () => window.clearTimeout(t);
  }, [loading, ms]);

  return slow;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return <p className="text-sm text-slate-500">{label}</p>;
}

export function ErrorState({
  title = "Couldn’t load",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm font-semibold text-rose-900">{title}</p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      <div className="mt-3 flex items-center gap-3">
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
        <Link className="text-sm text-slate-600 hover:text-slate-900" href="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  message,
  ctaLabel,
  onCta,
}: {
  title: string;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
      {ctaLabel && onCta && (
        <div className="mt-4 flex justify-center">
          <Button onClick={onCta}>{ctaLabel}</Button>
        </div>
      )}
    </div>
  );
}


