import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";
import { readdir } from "fs/promises";
import { join } from "path";

export const metadata: Metadata = {
  title: "Help Center – Rorun",
  description: "Get help with Rorun. Learn how to use features, troubleshoot issues, and get the most out of your tax compliance tool.",
};

const CATEGORIES = [
  {
    name: "Getting Started",
    slug: "getting-started",
    articles: [
      { slug: "what-rorun-does", title: "What Rorun does (and what it does not do)" },
      { slug: "complete-onboarding", title: "How to complete onboarding" },
      { slug: "understanding-obligations-dashboard", title: "Understanding your obligations dashboard" },
    ],
  },
  {
    name: "Bank Import",
    slug: "bank-import",
    articles: [
      { slug: "importing-statements", title: "Importing statements (CSV/Paste/PDF)" },
      { slug: "connect-bank", title: "Connecting your bank (read-only)" },
    ],
  },
  {
    name: "Filing Pack",
    slug: "filing-pack",
    articles: [
      { slug: "generating-filing-pack", title: "Generating your filing pack" },
      { slug: "fixing-review-issues", title: "Fixing 'Review Issues'" },
    ],
  },
  {
    name: "Tasks",
    slug: "tasks",
    articles: [
      { slug: "adding-receipts", title: "Adding and attaching receipts" },
    ],
  },
  {
    name: "Accountants",
    slug: "accountants",
    articles: [],
  },
  {
    name: "Troubleshooting",
    slug: "troubleshooting",
    articles: [
      { slug: "plans-and-limits", title: "Plans and limits" },
    ],
  },
];

export default function HelpCenterPage() {
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
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-slate-900 mb-3">Help Center</h1>
          <p className="text-slate-600">
            Find answers to common questions and learn how to use Rorun.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Card key={category.slug}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {category.articles.length > 0 ? (
                  <ul className="space-y-2">
                    {category.articles.map((article) => (
                      <li key={article.slug}>
                        <Link
                          href={`/help/${article.slug}`}
                          className="text-sm text-brand hover:text-brand-dark"
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Coming soon</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <Card className="bg-slate-50">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Still need help?</h2>
              <p className="text-sm text-slate-600 mb-4">
                Can&apos;t find what you&apos;re looking for? Contact our support team.
              </p>
              <a href="mailto:support@rorun.ng">
                <Button variant="secondary">Contact Support</Button>
              </a>
            </CardContent>
          </Card>
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

