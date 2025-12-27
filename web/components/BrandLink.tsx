"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { getStoredAuthToken } from "@/lib/auth-token";

export function BrandLink({
  children,
  className,
  loggedInHref = "/app/dashboard",
  loggedOutHref = "/",
  ariaLabel = "Rorun home",
}: {
  children: ReactNode;
  className?: string;
  loggedInHref?: string;
  loggedOutHref?: string;
  ariaLabel?: string;
}) {
  const href = useMemo(() => {
    const token = getStoredAuthToken();
    return token ? loggedInHref : loggedOutHref;
  }, [loggedInHref, loggedOutHref]);

  return (
    <Link aria-label={ariaLabel} href={href} className={className}>
      {children}
    </Link>
  );
}


