"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicShell } from "@/components/public/PublicShell";
import { AuthCard } from "@/components/auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/api/auth";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <PublicShell>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 md:px-6">
        <AuthCard
          title="Reset your password"
          subtitle="Enter your email and we’ll send you a reset link."
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
                await requestPasswordReset(email);
                addToast({
                  title: "Check your inbox",
                  description:
                    "If an account exists for that email, we’ve sent a reset link.",
                  variant: "success",
                });
              } catch (err: any) {
                setError(err?.message || "Could not request a reset link");
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

            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </AuthCard>
      </main>
    </PublicShell>
  );
}


