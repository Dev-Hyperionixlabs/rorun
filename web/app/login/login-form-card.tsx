"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function LoginFormCard({ reason }: { reason?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login({ email, password });
      router.push("/app/dashboard");
    } catch (err: any) {
      // Map error codes to user-friendly messages
      const code = err instanceof ApiError ? err.code : undefined;
      const status = err instanceof ApiError ? err.status : 0;

      let message: string;
      switch (code) {
        case "INVALID_CREDENTIALS":
        case "NO_PASSWORD_SET":
          message = err.message; // Use server's message - it's already user-friendly
          break;
        case "DB_SCHEMA_MISSING_COLUMN":
          message = "Login is temporarily unavailable. Please try again in a few minutes.";
          break;
        case "LOGIN_UNAVAILABLE":
          message = "Login is temporarily unavailable. Please try again shortly.";
          break;
        default:
          // For 401 without specific code, or generic errors
          if (status === 401) {
            message = "Incorrect email or password.";
          } else if (status === 500 || status === 0) {
            message = "Something went wrong on our end. Please try again in a moment.";
          } else {
            message = err?.message || "Couldn't log you in. Please try again.";
          }
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Log in to Rorun"
      subtitle="Use your email and password to continue."
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
            Email
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
          {isSubmitting ? "Please wait..." : "Continue"}
        </Button>
        <div className="text-center text-xs">
          <Link href="/forgot-password" className="text-slate-500 hover:text-slate-800">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}


