import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/public/PublicShell";
import { LoginFormCard } from "./login-form-card";
import { PublicFeedbackButton } from "@/components/public/PublicFeedbackButton";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const reason =
    typeof searchParams?.reason === "string" ? searchParams.reason : undefined;
  return (
    <PublicShell
      rightNav={
        <nav className="flex items-center gap-3 text-xs">
          <PublicFeedbackButton />
          <Link href="/signup">
            <Button size="sm">Start free</Button>
          </Link>
        </nav>
      }
    >
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 md:px-6">
        <LoginFormCard reason={reason} />
      </main>
    </PublicShell>
  );
}
