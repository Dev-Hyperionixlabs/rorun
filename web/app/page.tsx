import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Rorun"
            width={80}
            height={28}
            className="h-7 w-auto brightness-0 invert"
            priority
          />
          <span className="text-xs text-slate-300">
            Tax safety for Nigerian SMEs
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/login" className="text-slate-200 hover:text-white">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-10 px-4 pb-16 pt-6 md:flex-row md:items-center md:px-6">
        <section className="max-w-xl space-y-5">
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Calm, simple tax safety for{" "}
            <span className="text-brand-light">Nigerian businesses</span>.
          </h1>
          <p className="text-sm text-slate-200 md:text-base">
            Rorun tells you your tax status, keeps basic income and expense
            records, warns you before deadlines and gives you a clean year-end
            pack. No accounting degree, no wahala.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
            <span className="chip bg-emerald-500/20 text-emerald-200">
              0% CIT friendly
            </span>
            <span className="chip bg-slate-800 text-slate-100">
              Built for WhatsApp-era businesses
            </span>
            <span className="chip bg-slate-800 text-slate-100">
              English + Pidgin content
            </span>
          </div>
          <div className="flex flex-col gap-2 pt-2 text-xs text-slate-200 md:flex-row md:items-center md:gap-4">
            <Link href="/signup">
              <Button size="lg" className="w-full md:w-auto">
                Start tax check in 2 minutes
              </Button>
            </Link>
            <p className="text-[11px] md:text-xs">
              No card required • Works on your phone • You can invite your
              accountant later
            </p>
          </div>
        </section>

        <section className="w-full max-w-md">
          <div className="rounded-3xl bg-slate-50 text-slate-900 shadow-2xl p-6 max-w-md">
            <p className="text-xs font-semibold tracking-wide text-slate-600 mb-3 uppercase">
              See your tax safety in one glance
            </p>

            <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
              {/* CIT column */}
              <div className="rounded-2xl bg-slate-900 text-slate-50 p-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">CIT</span>
                  <span className="rounded-full bg-emerald-500 text-[10px] font-semibold px-2 py-0.5">
                    0% – exempt
                  </span>
                </div>
                <p className="text-[11px] text-slate-100/90 leading-snug">
                  Your turnover is below ₦25m, so company income tax is 0%. You
                  still need to file annually.
                </p>
              </div>

              {/* VAT + deadline column */}
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-100 text-slate-900 p-3">
                  <div className="text-[11px] font-semibold mb-1">VAT</div>
                  <p className="text-[11px] text-amber-700 font-medium">
                    Not required (for now)
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 text-slate-900 p-3">
                  <div className="text-[11px] font-semibold mb-1">
                    Next deadline
                  </div>
                  <p className="text-[11px] text-slate-700">
                    45 days • Annual return
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs text-emerald-900 leading-snug">
                Rorun keeps an eye on your thresholds and lets you know before
                anything changes. Focus on customers, not tax panic.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


