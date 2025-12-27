 "use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Button } from "./ui/button";
import { TaxSafetyBadge } from "./tax-safety-badge";
import { hardResetSession } from "@/lib/session";
import { BrandLink } from "./BrandLink";
import { logout } from "@/lib/api/auth";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/transactions", label: "Transactions" },
  { href: "/app/documents", label: "Documents" },
  { href: "/app/review", label: "Review" },
  { href: "/app/summary", label: "Summary" },
  { href: "/app/notifications", label: "Notifications" },
  { href: "/app/education", label: "Education" },
  { href: "/app/settings", label: "Settings" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, businesses, alerts, loading, error, refresh } = useMockApi();
  const [navOpen, setNavOpen] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Hooks must be called before any early returns
  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [alerts]
  );

  useEffect(() => {
    if (!loading && !error && !user) {
      window.location.href = "/login";
    }
  }, [loading, error, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center text-sm text-slate-500">
        Loading your workspace…
      </div>
    );
  }

  if (error) {
    const hint =
      error.includes("API is not configured") || error.includes("API_NOT_CONFIGURED")
        ? "API is not configured."
        : null;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-sm font-semibold text-slate-900">API unreachable</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => refresh()}>Retry</Button>
            <Link className="text-sm text-slate-600 hover:text-slate-900" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center text-sm text-slate-500">
        Redirecting to login…
      </div>
    );
  }

  const unreadCount = alerts.filter((a) => !a.readAt).length;
  const business =
    businesses.find((b) => b.id === user.currentBusinessId) || businesses[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="relative z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden rounded-md p-1.5 hover:bg-slate-100"
              onClick={() => setNavOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLink className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Rorun"
                width={80}
                height={28}
                className="h-7 w-auto"
                priority
              />
              <span className="text-sm font-semibold text-slate-800">Rorun</span>
              <span className="hidden text-xs text-slate-400 md:inline">Tax Safety</span>
            </BrandLink>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-xs md:block">
              <div className="font-medium text-slate-700 truncate">
                {business?.name}
              </div>
              <div className="text-[11px] text-slate-500">
                {business?.state || "—"} •{" "}
                {business?.turnoverBand === "<25m"
                  ? "Micro business"
                  : business?.turnoverBand === "25-100m"
                  ? "Small business"
                  : "Growing business"}
              </div>
            </div>
            <TaxSafetyBadge />
            <button
              className="relative rounded-full bg-slate-100 p-2 hover:bg-slate-200"
              onClick={() => setShowAlerts((v) => !v)}
            >
              <Bell className="h-4 w-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {showAlerts && (
              <div className="absolute right-4 top-14 z-30 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Alerts</p>
                  <button
                    className="text-xs text-slate-500 hover:text-slate-700"
                    onClick={() => setShowAlerts(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-auto">
                  {sortedAlerts.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">No alerts yet.</p>
                  ) : (
                    sortedAlerts.map((alert) => (
                      <div key={alert.id} className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                        <p className="text-xs text-slate-500">{alert.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            <div className="relative hidden md:block">
              <button
                type="button"
                aria-label="Open profile menu"
                data-profile-button="true"
                className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs hover:bg-slate-200"
                onClick={() => setShowProfileMenu((v) => !v)}
              >
                <span className="h-6 w-6 rounded-full bg-brand/10 text-[11px] font-semibold text-brand flex items-center justify-center">
                  {(user.name || user.email || "U").charAt(0)}
                </span>
                <span className="truncate max-w-[120px]">{user.name || user.email || "Account"}</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-12 z-40 w-48 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <Link
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    href="/app/settings?tab=profile"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    href="/app/settings"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-rose-700 hover:bg-rose-50"
                    onClick={async () => {
                      setShowProfileMenu(false);
                      try {
                        await logout();
                      } catch {
                        // ignore; we'll still clear local session
                      } finally {
                        hardResetSession();
                        window.location.href = "/login";
                      }
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl">
        <nav
          className={`fixed inset-y-0 left-0 z-20 w-56 bg-white shadow-card border-r border-slate-100 transform transition-transform md:static md:shadow-none md:translate-x-0 ${
            navOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="mt-16 space-y-1 px-4 pb-6 pt-4 md:mt-4">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={() => setNavOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <div className="font-semibold">Tax Safety tip</div>
              <p className="mt-1">
                Keep receipts for any big expenses. Rorun can remind you when a
                record looks incomplete.
              </p>
            </div>
          </div>
        </nav>

        <main className="mt-4 w-full px-4 pb-10 pt-4 md:ml-4 md:px-0">
          {children}
        </main>
      </div>
    </div>
  );
}


