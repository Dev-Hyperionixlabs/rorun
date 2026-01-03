"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight } from "lucide-react";
import { ErrorState } from "@/components/ui/page-state";
import { AdminUser, getAdminUsers } from "@/lib/api/admin";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await getAdminUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setUsers([]);
        setError(e?.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    })().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => {
      const hay = `${u.name || ""} ${u.email || ""} ${u.phone || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [users, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">Search and view user accounts.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search name, email, or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm text-slate-500">Loading users…</div>
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn’t load users"
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-500">No users found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <Link key={u.id} href={`/admin/users/${u.id}`}>
              <Card className="cursor-pointer transition hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {u.name || "Unnamed user"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 truncate">
                      {u.email || "—"} • {u.phone || "—"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


