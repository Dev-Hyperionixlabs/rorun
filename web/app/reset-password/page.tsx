import { PublicShell } from "@/components/public/PublicShell";
import { ResetPasswordCard } from "./reset-password-card";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const token =
    typeof searchParams?.token === "string" ? searchParams.token : undefined;

  return (
    <PublicShell>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 md:px-6">
        <ResetPasswordCard token={token} />
      </main>
    </PublicShell>
  );
}


