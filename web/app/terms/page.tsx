import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service – Rorun",
  description: "Terms of service for using Rorun.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Rorun"
              width={80}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
              Pricing
            </Link>
            <Link href="/help" className="text-slate-600 hover:text-slate-900">
              Help
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-3">Terms of Service</h1>
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Acceptance of Terms</h2>
            <p className="text-sm text-slate-600">
              By accessing and using Rorun, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Service Description</h2>
            <p className="text-sm text-slate-600">
              Rorun provides tax compliance and record-keeping services for Nigerian SMEs. We help you understand your tax obligations, track transactions, and generate filing packs. We are not a tax advisor or accounting firm, and our service does not constitute professional tax or accounting advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">User Responsibilities</h2>
            <p className="text-sm text-slate-600 mb-3">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-4">
              <li>Providing accurate information about your business</li>
              <li>Ensuring the accuracy of transaction data you enter or import</li>
              <li>Complying with all applicable Nigerian tax laws</li>
              <li>Maintaining the security of your account</li>
              <li>Using the service in accordance with these terms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Limitation of Liability</h2>
            <p className="text-sm text-slate-600">
              Rorun is provided &quot;as is&quot; without warranties of any kind. We are not liable for any errors, omissions, or inaccuracies in the information provided through our service. You are responsible for verifying all information before filing with FIRS or other tax authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Subscription and Payment</h2>
            <p className="text-sm text-slate-600">
              Paid subscriptions are billed monthly. You can cancel your subscription at any time. Refunds are handled on a case-by-case basis. See our <Link href="/pricing" className="text-brand hover:text-brand-dark">Pricing page</Link> for current plan details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Termination</h2>
            <p className="text-sm text-slate-600">
              We reserve the right to suspend or terminate your account if you violate these terms. You may terminate your account at any time through the settings page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Changes to Terms</h2>
            <p className="text-sm text-slate-600">
              We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact</h2>
            <p className="text-sm text-slate-600">
              Questions about these terms? Contact us at <a href="mailto:support@rorun.ng" className="text-brand">support@rorun.ng</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 border-t border-slate-200 mt-12">
        <div className="text-center text-sm text-slate-600">
          <p>© {new Date().getFullYear()} Rorun. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

