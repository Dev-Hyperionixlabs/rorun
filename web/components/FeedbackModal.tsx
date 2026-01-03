"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { submitFeedback } from "@/lib/api/feedback";

export function FeedbackModal({
  open,
  onClose,
  businessId,
}: {
  open: boolean;
  onClose: () => void;
  businessId?: string | null;
}) {
  const { addToast } = useToast();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => message.trim().length >= 5 && !submitting, [message, submitting]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        message: message.trim(),
        email: email.trim() || undefined,
        pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        businessId: businessId || undefined,
      });
      addToast({
        title: "Feedback sent",
        description: "Thanks — we’ll review this shortly.",
        variant: "success",
      });
      setMessage("");
      setEmail("");
      onClose();
    } catch (e: any) {
      addToast({
        title: "Couldn’t send feedback",
        description: e?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-3">
        <Card className="w-full md:max-w-lg bg-white rounded-2xl shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Send feedback
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">What happened?</label>
              <textarea
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                rows={5}
                placeholder="Tell us what you were trying to do, what you expected, and what happened."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                We automatically attach the current page URL.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">Email (optional)</label>
              <Input
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {submitting ? "Sending…" : "Send"}
              </Button>
              <Button variant="secondary" className="rounded-full" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


