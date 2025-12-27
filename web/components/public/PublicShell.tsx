import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BrandLink } from "@/components/BrandLink";

export function PublicTopNav({
  right,
}: {
  right?: React.ReactNode;
}) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
      <BrandLink className="flex items-center gap-2">
        <Image
          src="/logo.png"
          alt="Rorun"
          width={80}
          height={28}
          className="h-7 w-auto brightness-0 invert"
          priority
        />
        <span className="text-xs text-slate-300">Tax safety for Nigerian SMEs</span>
      </BrandLink>

      {right ?? (
        <nav className="flex items-center gap-3 text-xs">
          <Link href="/login" className="text-slate-200 hover:text-white">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free</Button>
          </Link>
        </nav>
      )}
    </header>
  );
}

export function PublicShell({
  children,
  rightNav,
}: {
  children: React.ReactNode;
  rightNav?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <PublicTopNav right={rightNav} />
      {children}
    </div>
  );
}


