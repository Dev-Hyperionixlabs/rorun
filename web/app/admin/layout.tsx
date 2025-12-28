"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  FileText,
  BookOpen,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { clearAdminKey, getAdminKey } from "@/lib/admin-key";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/content", label: "Content", icon: BookOpen },
  { href: "/admin/tax-config", label: "Tax Config", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // Check admin key after mount to avoid hydration mismatch
  useEffect(() => {
    const key = getAdminKey();
    setHasKey(!!key);
    setAuthChecked(true);
    if (!key && pathname !== "/admin/login") {
      router.replace("/admin/login?reason=unauthorized");
    }
  }, [pathname, router]);

  // Show loading state until auth check is complete
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Loading admin…</p>
      </div>
    );
  }

  // If no key and not on login page, don't render (redirect is in progress)
  if (!hasKey && pathname !== "/admin/login") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-slate-900 text-white transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-4">
          <Image
            src="/logo.png"
            alt="Rorun"
            width={80}
            height={28}
            className="h-7 w-auto brightness-0 invert"
          />
          <span className="text-xs font-medium text-slate-400">Admin</span>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 p-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 text-sm text-slate-400 hover:text-white"
            onClick={() => {
              clearAdminKey();
              router.replace("/admin/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Log out admin
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <button
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm font-medium text-slate-700">
            Rorun Admin Portal
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden md:inline">Logged in as admin</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

