"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/ui/page-state";
import { getAdminUser } from "@/lib/api/admin";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    user: any;
    businesses: Array<{ id: string; name: string }>;
    memberOf: Array<{ businessId: string; name: string; role: string }>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await getAdminUser(id);
        setData(res);
      } catch (e: any) {
        setData(null);
        setError(e?.message || "Failed to load user.");
      } finally {
        setLoading(false);
      }
    })().catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading user…</div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn’t load user"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!data?.user) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            User not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const user = data.user;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {user.name || "Unnamed user"}
          </h1>
          <p className="text-sm text-slate-500">{user.email || "—"} • {user.phone || "—"}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Account</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Created</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Owned workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.businesses || []).length === 0 ? (
              <p className="text-sm text-slate-500">None</p>
            ) : (
              (data.businesses || []).map((b) => (
                <Link key={b.id} href={`/admin/workspaces/${b.id}`} className="block">
                  <Button variant="secondary" size="sm" className="w-full justify-between">
                    <span className="truncate">{b.name}</span>
                    <span className="text-xs text-slate-500">View</span>
                  </Button>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Member of</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.memberOf || []).length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            (data.memberOf || []).map((m) => (
              <Link key={`${m.businessId}:${m.role}`} href={`/admin/workspaces/${m.businessId}`} className="block">
                <Button variant="secondary" size="sm" className="w-full justify-between">
                  <span className="truncate">{m.name}</span>
                  <span className="text-xs text-slate-500">{m.role}</span>
                </Button>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


