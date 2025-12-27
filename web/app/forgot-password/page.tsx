"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicShell } from "@/components/public/PublicShell";
import { AuthCard } from "@/components/auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetPasswordDirect } from "@/lib/api/auth";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <PublicShell>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 md:px-6">
        <AuthCard
          title="Reset your password"
          subtitle="For now, set a new password directly so you can continue testing."
          footer={
            <>
              Remembered it?{" "}
              <Link href="/login" className="font-medium text-brand">
                Back to login
              </Link>
            </>
          }
        >
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              try {
                await resetPasswordDirect({ email, password });
                addToast({
                  title: "Password updated",
                  description: "You can now log in with your new password.",
                  variant: "success",
                });
                window.location.href = "/login";
              } catch (err: any) {
                setError(err?.message || "Could not reset password");
              } finally {
                setSubmitting(false);
              }
            }}
          >
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
              <label className="text-sm font-medium text-slate-800">
                New password
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
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </AuthCard>
      </main>
    </PublicShell>
  );
}


