"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { PublicShell } from "@/components/public/PublicShell";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

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
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/onboarding");
            }}
          >
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
                Work email (optional)
              </label>
              <Input
                type="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold"
            >
              Continue to business setup
            </Button>
          </form>
        </AuthCard>
      </main>
    </PublicShell>
  );
}


