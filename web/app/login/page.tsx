"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { storeAuthToken } from "@/lib/auth-token";
import { PublicShell } from "@/components/public/PublicShell";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reason = searchParams.get("reason");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In lieu of live auth, accept any input and stash a placeholder token
      storeAuthToken("local-session-token");
      router.push("/app/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicShell
      rightNav={
        <nav className="flex items-center gap-3 text-xs">
          <Link href="/signup">
            <Button size="sm">Start free</Button>
          </Link>
        </nav>
      }
    >
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 md:px-6">
        <AuthCard
          title="Log in to Rorun"
          subtitle="Use your email and password to continue."
          footer={
            <>
              New to Rorun?{" "}
              <Link href="/signup" className="font-medium text-brand">
                Start free
              </Link>
            </>
          }
        >
          {reason === "session_expired" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Session expired. Please log in again.
            </div>
          )}
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1 text-sm">
              <label className="text-sm font-medium text-slate-800">Email</label>
              <Input
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-sm font-medium text-slate-800">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold"
            >
              {isSubmitting ? "Signing in..." : "Continue"}
            </Button>
          </form>
        </AuthCard>
      </main>
    </PublicShell>
  );
}
