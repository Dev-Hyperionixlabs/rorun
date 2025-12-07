"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockApi } from "@/lib/mock-api";
import { BUSINESS_ROLES, BusinessRole, NIGERIAN_STATES } from "@/lib/types";
import { Select } from "@/components/ui/select";

const steps = [
  "Basics",
  "Business type",
  "Sector",
  "Registration",
  "Turnover"
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { businesses, updateBusiness, evaluateEligibility } = useMockApi();
  const business = businesses[0];
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: business.name,
    role: (business.role as BusinessRole) ?? "Owner",
    legalForm: business.legalForm,
    sector: business.sector,
    state: business.state,
    hasCAC: business.hasCAC,
    hasTIN: business.hasTIN,
    vatRegistered: business.vatRegistered,
    turnoverBand: business.turnoverBand
  });

  const goNext = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    updateBusiness(business.id, form);
    const result = await evaluateEligibility(business.id);
    setLoading(false);
    router.push("/app/dashboard?from=onboarding");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Image
              src="/logo.png"
              alt="Rorun"
              width={80}
              height={28}
              className="h-6 w-auto"
            />
            <span className="text-xs text-slate-400">Onboarding</span>
          </div>
          <div>
            <CardTitle className="text-base">
              Let&apos;s understand your business and tax position
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Step {step + 1} of {steps.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-1 text-[11px] text-slate-500">
            {steps.map((label, idx) => (
              <div
                key={label}
                className={`h-1 flex-1 rounded-full ${
                  idx <= step ? "bg-brand" : "bg-slate-200"
                }`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">
                  Business name
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Sunrise Traders"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">
                  Your role in the business
                </label>
                <Select
                  value={form.role}
                  onChange={(value) =>
                    setForm((f) => ({ ...f, role: value as BusinessRole }))
                  }
                  placeholder="Select role"
                  options={BUSINESS_ROLES.map((role) => ({
                    value: role,
                    label: role
                  }))}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">
                How is this business set up legally? Don&apos;t worry if you&apos;re
                not fully registered yet.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: "sole_proprietor",
                    label: "Sole proprietor",
                    hint: "You and the business are the same person"
                  },
                  {
                    id: "freelancer",
                    label: "Freelancer / contractor",
                    hint: "You invoice clients in your own name"
                  },
                  {
                    id: "company",
                    label: "Company (Ltd)",
                    hint: "Registered with CAC as a company"
                  },
                  {
                    id: "partnership",
                    label: "Partnership",
                    hint: "2 or more people, sharing profit"
                  }
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        legalForm: option.id as any
                      }))
                    }
                    className={`rounded-lg border p-3 text-left text-xs ${
                      form.legalForm === option.id
                        ? "border-brand bg-brand/5"
                        : "border-slate-200 hover:border-brand/60"
                    }`}
                  >
                    <div className="font-medium text-slate-800">
                      {option.label}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {option.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">
                  Main sector
                </label>
                <select
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1"
                  value={form.sector}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sector: e.target.value }))
                  }
                >
                  <option>Retail / Trade</option>
                  <option>Food &amp; Drinks</option>
                  <option>Professional services</option>
                  <option>Tech / Online business</option>
                  <option>Manufacturing</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">
                  State
                </label>
                <Select
                  value={form.state}
                  onChange={(value) => setForm((f) => ({ ...f, state: value }))}
                  placeholder="Select state"
                  options={NIGERIAN_STATES.map((state) => ({
                    value: state,
                    label: state
                  }))}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">
                What registration do you already have? It&apos;s okay if some are
                &quot;No&quot; for now.
              </p>
              <div className="space-y-2">
                {[
                  {
                    id: "hasCAC",
                    label: "Registered with CAC",
                    help: "You have a CAC certificate or BN number"
                  },
                  {
                    id: "hasTIN",
                    label: "Has Tax Identification Number (TIN)",
                    help: "Either personal or company TIN"
                  },
                  {
                    id: "vatRegistered",
                    label: "Registered for VAT",
                    help: "You have a VAT/TIN and file monthly or want to"
                  }
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="text-xs">
                      <div className="font-medium text-slate-800">
                        {item.label}
                      </div>
                      <p className="text-[11px] text-slate-500">{item.help}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          (form as any)[item.id] ? "primary" : "secondary"
                        }
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            [item.id]: true
                          }))
                        }
                      >
                        Yes
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          !(form as any)[item.id] ? "primary" : "secondary"
                        }
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            [item.id]: false
                          }))
                        }
                      >
                        No
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                Roughly how much does this business make in 12 months? A
                comfortable guess is fine.
              </p>
              <div className="space-y-2">
                {[
                  {
                    id: "<25m",
                    label: "Less than ₦25m",
                    hint: "Very small / micro – most likely 0% CIT"
                  },
                  {
                    id: "25-100m",
                    label: "₦25m – ₦100m",
                    hint: "Small but growing – some rules change here"
                  },
                  {
                    id: ">100m",
                    label: "More than ₦100m",
                    hint: "Larger SME – we&apos;ll highlight bigger obligations"
                  }
                ].map((band) => (
                  <button
                    key={band.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        turnoverBand: band.id as any
                      }))
                    }
                    className={`w-full rounded-lg border p-3 text-left text-xs ${
                      form.turnoverBand === band.id
                        ? "border-brand bg-brand/5"
                        : "border-slate-200 hover:border-brand/60"
                    }`}
                  >
                    <div className="font-medium text-slate-800">
                      {band.label}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {band.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button type="button" size="sm" onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                loading={loading}
              >
                See my tax safety
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


