"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/lib/api/auth";
import { useToast } from "@/components/ui/toast";

export function ResetPasswordCard({ token }: { token?: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingToken = !token || token.trim().length < 10;

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a new password for your account."
      footer={
        <>
          <Link href="/login" className="font-medium text-brand">
            Back to login
          </Link>
        </>
      }
    >
      {missingToken ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          This reset link is missing or invalid. Please request a new one.
          <div className="mt-2">
            <Link href="/forgot-password" className="font-medium text-brand">
              Request a new reset link
            </Link>
          </div>
        </div>
      ) : (
        <>
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
                await resetPassword({ token: token!, password });
                addToast({
                  title: "Password updated",
                  description: "You can now log in with your new password.",
                  variant: "success",
                });
                router.push("/login");
              } catch (err: any) {
                setError(err?.message || "Could not reset password");
              } finally {
                setSubmitting(false);
              }
            }}
          >
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
        </>
      )}
    </AuthCard>
  );
}


