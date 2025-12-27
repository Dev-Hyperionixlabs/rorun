import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { PublicShell } from "@/components/public/PublicShell";

export default function SignupPage() {
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
          <form className="space-y-4">
            <div className="space-y-1 text-sm">
              <label className="text-sm font-medium text-slate-800">Name</label>
              <Input placeholder="Your name" />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-sm font-medium text-slate-800">
                Work email (optional)
              </label>
              <Input type="email" placeholder="you@business.com" />
            </div>
            <Link href="/onboarding">
              <Button className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold">
                Continue to business setup
              </Button>
            </Link>
          </form>
        </AuthCard>
      </main>
    </PublicShell>
  );
}


