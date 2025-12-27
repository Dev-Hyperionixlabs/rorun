"use client";

import { useState } from "react";
import { X, HelpCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import clsx from "clsx";

interface HelpConfig {
  whatIsThis: string;
  commonMistakes: string[];
  relatedArticle: string;
}

const HELP_CONFIGS: Record<string, HelpConfig> = {
  dashboard: {
    whatIsThis: "Your obligations dashboard shows all your tax obligations (CIT, VAT, WHT) in one place. Check it regularly to stay on top of deadlines.",
    commonMistakes: [
      "Ignoring upcoming deadlines until they're overdue",
      "Not setting up email/SMS reminders",
      "Forgetting to mark obligations as fulfilled after filing"
    ],
    relatedArticle: "understanding-obligations-dashboard"
  },
  transactions: {
    whatIsThis: "The transactions page shows all your income and expenses. Import statements, connect your bank, or add transactions manually.",
    commonMistakes: [
      "Not categorizing transactions properly",
      "Forgetting to attach receipts to business expenses",
      "Importing the same statement multiple times"
    ],
    relatedArticle: "importing-statements"
  },
  review: {
    whatIsThis: "The review page flags issues that need your attention: uncategorized transactions, missing receipts, possible duplicates, and more.",
    commonMistakes: [
      "Ignoring review issues until filing time",
      "Not attaching receipts to business expenses",
      "Dismissing duplicate flags without checking"
    ],
    relatedArticle: "fixing-review-issues"
  },
  tasks: {
    whatIsThis: "Compliance tasks are actions you need to take to stay compliant. Complete tasks and attach evidence to mark them as done.",
    commonMistakes: [
      "Not attaching required evidence to tasks",
      "Dismissing tasks instead of completing them",
      "Forgetting to check task deadlines"
    ],
    relatedArticle: "adding-receipts"
  },
  wizard: {
    whatIsThis: "The guided filing wizard walks you through preparing your annual return step by step. Complete all steps for accurate filing.",
    commonMistakes: [
      "Rushing through steps without reviewing",
      "Not attaching receipts before completing",
      "Skipping the review step"
    ],
    relatedArticle: "guided-filing"
  },
  "filing-pack": {
    whatIsThis: "Filing packs contain all your transactions organized for FIRS submission. Generate packs for each tax year you need to file.",
    commonMistakes: [
      "Generating packs without fixing review issues first",
      "Not reviewing the pack before submitting",
      "Generating packs too close to deadlines"
    ],
    relatedArticle: "generating-filing-pack"
  },
  "bank-connect": {
    whatIsThis: "Connect your bank account for automatic transaction import. Bank connections are read-only - we can't move money or make transactions.",
    commonMistakes: [
      "Not revoking access when no longer needed",
      "Connecting personal accounts to business workspace",
      "Not verifying imported transactions"
    ],
    relatedArticle: "connect-bank"
  }
};

interface HelpDrawerProps {
  pageKey: string;
  className?: string;
}

export function HelpDrawer({ pageKey, className }: HelpDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = HELP_CONFIGS[pageKey];

  if (!config) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          "inline-flex items-center justify-center rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors",
          className
        )}
        aria-label="Get help"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Help</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">What is this page for?</h3>
                  <p className="text-sm text-slate-600">{config.whatIsThis}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Common mistakes to avoid</h3>
                  <ul className="space-y-2">
                    {config.commonMistakes.map((mistake, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-slate-400 mt-1">•</span>
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Learn more</h3>
                  <Link
                    href={`/help/${config.relatedArticle}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand-dark"
                  >
                    Read full article
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 border-t border-slate-200">
              <Link href="/help">
                <Button variant="secondary" className="w-full">
                  Visit Help Center
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}

