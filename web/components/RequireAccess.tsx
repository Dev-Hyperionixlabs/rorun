"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { canAccess, FeatureKey, PlanId } from "@/lib/entitlements";

export function RequireAccess({
  planId,
  feature,
  children,
  upgradeHref = "/app/settings?tab=plan",
  lockedCopy,
}: {
  planId: PlanId | string | null | undefined;
  feature: FeatureKey;
  children: React.ReactNode;
  upgradeHref?: string;
  lockedCopy?: { title: string; description?: string; cta?: string };
}) {
  if (canAccess(planId, feature)) return <>{children}</>;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <div className="flex items-center gap-3">
        <Lock className="h-4 w-4 text-amber-700" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            {lockedCopy?.title || "Upgrade to unlock"}
          </p>
          {lockedCopy?.description && (
            <p className="text-xs text-amber-700 mt-0.5">{lockedCopy.description}</p>
          )}
        </div>
        <Link href={upgradeHref}>
          <Button variant="secondary" size="sm" className="text-xs">
            {lockedCopy?.cta || "Upgrade"}
          </Button>
        </Link>
      </div>
    </div>
  );
}


