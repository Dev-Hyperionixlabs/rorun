"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestOtp, verifyOtp } from "@/lib/api/auth";

export function LoginFormCard({ reason }: { reason?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (step === "phone") {
        await requestOtp(phone);
        setStep("otp");
        return;
      }

      await verifyOtp(phone, otp);
      router.push("/app/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Log in to Rorun"
      subtitle="Use your email and password to continue."
      footer={
        <>
          New to Rorun?{" "}
          <Link href="/signup" className="font-medium text-brand">
            Start free
          </Link>
          <span className="mx-2 text-slate-400">•</span>
          <Link href="/help" className="font-medium text-brand">
            Help
          </Link>
        </>
      }
    >
      {reason === "session_expired" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Session expired. Please log in again.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1 text-sm">
          <label className="text-sm font-medium text-slate-800">
            Phone number
          </label>
          <Input
            placeholder="+2348012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {step === "otp" && (
          <div className="space-y-1 text-sm">
            <label className="text-sm font-medium text-slate-800">OTP</label>
            <Input
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-500">
              Enter the 6-digit code sent to your phone.
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold"
        >
          {isSubmitting
            ? "Please wait..."
            : step === "phone"
              ? "Send OTP"
              : "Verify & continue"}
        </Button>

        {step === "otp" && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800"
              onClick={() => setStep("phone")}
              disabled={isSubmitting}
            >
              Change phone
            </button>
            <button
              type="button"
              className="text-brand hover:opacity-80"
              onClick={async () => {
                setIsSubmitting(true);
                setError(null);
                try {
                  await requestOtp(phone);
                } catch (e: any) {
                  setError(e?.message || "Failed to resend OTP");
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
            >
              Resend OTP
            </button>
          </div>
        )}
      </form>
    </AuthCard>
  );
}


