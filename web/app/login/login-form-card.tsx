"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api/auth";

export function LoginFormCard({ reason }: { reason?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login({ phone });
      router.push("/app/dashboard");
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Log in to Rorun"
      subtitle="Use your phone number to continue."
      footer={
        <>
          New to Rorun?{" "}
          <Link href="/signup" className="font-medium text-brand">
            Start free
          </Link>
          <span className="mx-2 text-slate-400">•</span>
          <Link href="/help" className="font-medium text-brand">
            Help
          </Link>
        </>
      }
    >
      {reason === "session_expired" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Session expired. Please log in again.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1 text-sm">
          <label className="text-sm font-medium text-slate-800">
            Phone number
          </label>
          <Input
            placeholder="+2348012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold"
        >
          {isSubmitting ? "Please wait..." : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}


