import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – Rorun",
  description: "How we collect, use, and protect your data. Data retention and deletion policy.",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-semibold text-slate-900 mb-3">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Collection</h2>
            <p className="text-sm text-slate-600 mb-3">
              We collect the following types of data to provide our service:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-4">
              <li>Business information (name, legal form, sector, CAC number, TIN)</li>
              <li>Transaction data (income, expenses, dates, descriptions)</li>
              <li>Bank account information (when you connect your bank - read-only access)</li>
              <li>Documents (receipts, bank statements, invoices)</li>
              <li>User account information (phone number, email, name)</li>
              <li>Usage data (how you interact with the platform)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">How We Use Your Data</h2>
            <p className="text-sm text-slate-600 mb-3">
              We use your data to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-4">
              <li>Calculate your tax obligations and eligibility</li>
              <li>Generate filing packs and reports</li>
              <li>Send you reminders about deadlines</li>
              <li>Provide customer support</li>
              <li>Improve our service</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="text-sm text-slate-600 mt-3">
              We do not sell your data to third parties. We do not use your data for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Retention</h2>
            <p className="text-sm text-slate-600">
              We retain your data for as long as your account is active, or as long as necessary to provide our service and comply with legal obligations. Tax-related data may be retained for longer periods as required by Nigerian tax law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Deletion</h2>
            <p className="text-sm text-slate-600 mb-3">
              You can request deletion of your data at any time by:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-4">
              <li>Deleting your account through the settings page</li>
              <li>Contacting us at <a href="mailto:support@rorun.ng" className="text-brand">support@rorun.ng</a></li>
            </ul>
            <p className="text-sm text-slate-600 mt-3">
              Note: Some data may be retained for legal compliance purposes even after account deletion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Data Security</h2>
            <p className="text-sm text-slate-600">
              We implement industry-standard security measures to protect your data. See our <Link href="/security" className="text-brand hover:text-brand-dark">Security page</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Your Rights</h2>
            <p className="text-sm text-slate-600 mb-3">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-4">
              <li>Access your data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Revoke bank connections</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Contact Us</h2>
            <p className="text-sm text-slate-600">
              If you have questions about this privacy policy or how we handle your data, please contact us at <a href="mailto:support@rorun.ng" className="text-brand">support@rorun.ng</a>.
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

