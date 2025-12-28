"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAdminKey, getAdminKey } from "@/lib/admin-key";
import { verifyAdminKey } from "@/lib/api/admin";
import { ErrorState } from "@/components/ui/page-state";

export function AdminLoginCard({ reason }: { reason: string | null }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getAdminKey();
    if (existing) setKey(existing);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      setAdminKey(key.trim());
      await verifyAdminKey();
      router.replace("/admin");
    } catch (e: any) {
      setError(e?.message || "Invalid admin key.");
    } finally {
      setLoading(false);
    }
  };

  const reasonMsg =
    reason === "unauthorized"
      ? "Your admin key is missing or invalid. Please sign in."
      : null;

  return (
    <div className="mx-auto max-w-md py-10">
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Admin login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reasonMsg && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {reasonMsg}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Admin key</label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter admin key…"
            />
          </div>
          {error && <ErrorState title="Login failed" message={error} />}
          <Button
            className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
            onClick={handleLogin}
            disabled={loading || !key.trim()}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


