import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, FileText, Eye } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security & Privacy – Rorun",
  description: "How we protect your data. Encryption, access controls, audit logs, and read-only bank access.",
};

export default function SecurityPage() {
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
          <h1 className="text-3xl font-semibold text-slate-900 mb-3">Security & Privacy</h1>
          <p className="text-slate-600">
            We take security seriously. Here&apos;s how we protect your data.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 text-brand shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Encryption at rest</h2>
                  <p className="text-sm text-slate-600">
                    All data stored in our database is encrypted at rest using industry-standard encryption. Your sensitive information is protected even if our storage is compromised.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="h-6 w-6 text-brand shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">TLS encryption in transit</h2>
                  <p className="text-sm text-slate-600">
                    All communication between your device and our servers uses TLS (Transport Layer Security) encryption. Your data is protected while in transit over the internet.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Eye className="h-6 w-6 text-brand shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Access controls</h2>
                  <p className="text-sm text-slate-600">
                    Access to your data is restricted to authorized users only. We use role-based access control (RBAC) to ensure that only you and users you explicitly invite can access your business data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <FileText className="h-6 w-6 text-brand shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Audit logs</h2>
                  <p className="text-sm text-slate-600">
                    Every action taken in the system is logged with timestamps and user information. This creates a complete audit trail for compliance and security purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 text-brand shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Read-only bank access</h2>
                  <p className="text-sm text-slate-600 mb-3">
                    When you connect your bank account, we use read-only access. This means:
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-4">
                    <li>We can only view your transactions and balances</li>
                    <li>We cannot move money or make any transactions</li>
                    <li>We cannot change your account settings</li>
                    <li>You can revoke access at any time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="h-6 w-6 text-brand shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Consent & revocation</h2>
                  <p className="text-sm text-slate-600">
                    You maintain full control over your data. You can revoke bank connections, delete your account, or request data deletion at any time. We respect your right to control your information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-600 mb-4">
            For more information about how we handle your data, see our <Link href="/privacy" className="text-brand hover:text-brand-dark">Privacy Policy</Link>.
          </p>
          <p className="text-sm text-slate-600">
            Questions about security? <a href="mailto:support@rorun.ng" className="text-brand hover:text-brand-dark">Contact us</a>.
          </p>
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

