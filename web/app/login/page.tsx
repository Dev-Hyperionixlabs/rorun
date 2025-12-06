"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { storeAuthToken } from "@/lib/auth-token";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // In lieu of live auth, accept any input and stash a placeholder token
      storeAuthToken("mock-demo-token");
      router.push("/app/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Log in to Rorun"
      subtitle="For now we’ll use a simple email login. In production this would match your phone / OTP setup."
      footer={
        <>
          New to Rorun?{" "}
          <Link href="/signup" className="font-medium text-brand">
            Start free
          </Link>
        </>
      }
    >
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
  );
}
