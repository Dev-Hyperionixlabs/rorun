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
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist form during navigation (back/forward) but clear on refresh
  useEffect(() => {
    // Detect page refresh vs navigation
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const isRefresh = navEntries.length > 0 && navEntries[0].type === "reload";

    if (isRefresh) {
      // Clear draft on refresh
      sessionStorage.removeItem("rorun_signup_draft_v1");
      return;
    }

    // Restore draft on navigation (back/forward)
    try {
      const raw = sessionStorage.getItem("rorun_signup_draft_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: string; email?: string };
      if (parsed?.name) setName(parsed.name);
      if (parsed?.email) setEmail(parsed.email);
    } catch {
      // ignore
    }
  }, []);

  // Save draft as user types (for back/forward navigation)
  useEffect(() => {
    // Only save if there's actual content
    if (!name && !email) {
      sessionStorage.removeItem("rorun_signup_draft_v1");
      return;
    }
    try {
      sessionStorage.setItem(
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
                const code = err instanceof ApiError ? err.code : undefined;
                const status = err instanceof ApiError ? err.status : 0;

                let message: string;
                switch (code) {
                  case "WEAK_PASSWORD":
                    message = "Password is too short. Use at least 8 characters.";
                    break;
                  case "EMAIL_IN_USE":
                    message = err.message; // Server message is already good
                    break;
                  case "DB_SCHEMA_MISSING_COLUMN":
                    message = "Sign up is temporarily unavailable. Please try again in a few minutes.";
                    break;
                  case "SIGNUP_FAILED":
                    message = "Could not create your account right now. Please try again shortly.";
                    break;
                  default:
                    if (status === 500 || status === 0) {
                      message = "Something went wrong on our end. Please try again in a moment.";
                    } else {
                      message = err?.message || "Couldn't create your account. Please try again.";
                    }
                }
                setError(message);
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
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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


