"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAdminKey, getAdminKey } from "@/lib/admin-key";
import { verifyAdminKey } from "@/lib/api/admin";

export function AdminLoginCard({ reason }: { reason: string | null }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [key, setKeyValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only access localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const existing = getAdminKey();
    if (existing) setKeyValue(existing);
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

  // Don't render form until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Card className="bg-white">
          <CardContent className="py-8 text-center text-sm text-slate-500">
            Loading…
          </CardContent>
        </Card>
      </div>
    );
  }

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
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="Enter admin key…"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {error}
            </div>
          )}
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


