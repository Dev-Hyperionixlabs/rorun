"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { PublicShell } from "@/components/public/PublicShell";
import { signup } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rorun_signup_draft_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: string; email?: string };
      if (parsed?.name) setName(parsed.name);
      if (parsed?.email) setEmail(parsed.email);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "rorun_signup_draft_v1",
        JSON.stringify({ name, email })
      );
    } catch {
      // ignore
    }
  }, [name, email]);

  return (
    <PublicShell
      rightNav={
        <nav className="flex items-center gap-3 text-xs">
          <Link href="/login" className="text-slate-200 hover:text-white">
            Log in
          </Link>
        </nav>
      }
    >
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 md:px-6">
        <AuthCard
          title="Create your Rorun workspace"
          subtitle="A few details to get started. We’ll ask about your business in the next step."
          footer={
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand">
                Log in
              </Link>
            </>
          }
        >
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              try {
                await signup({ email, password, name: name || undefined });
                router.push("/onboarding");
              } catch (err: any) {
                if (err instanceof ApiError && err.code === "WEAK_PASSWORD") {
                  setError("Password is too short. Use at least 8 characters.");
                } else if (err instanceof ApiError && err.code === "EMAIL_IN_USE") {
                  setError("That email already has an account. Try logging in instead.");
                } else {
                  setError(err?.message || "Couldn’t create your account. Please try again.");
                }
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}
            <div className="space-y-1 text-sm">
              <label className="text-sm font-medium text-slate-800">Name</label>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-sm font-medium text-slate-800">
                Work email
              </label>
              <Input
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-sm font-medium text-slate-800">
                Password
              </label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold"
            >
              {submitting ? "Creating account…" : "Continue to business setup"}
            </Button>
          </form>
        </AuthCard>
      </main>
    </PublicShell>
  );
}


