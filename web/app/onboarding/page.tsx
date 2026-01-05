"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockApi } from "@/lib/mock-api";
import { BusinessRole, NIGERIAN_STATES } from "@/lib/types";
import { Select } from "@/components/ui/select";
import { BrandLink } from "@/components/BrandLink";
import { createBusiness } from "@/lib/api/businesses";
import { useToast } from "@/components/ui/toast";
import { Switch } from "@/components/ui/switch";

const steps = [
  "Basics",
  "Business type",
  "Sector",
  "Registration",
  "Turnover",
  "Tax details"
] as const;

type OnboardingFormState = {
  name: string;
  role: BusinessRole | "";
  legalForm: any;
  sector: string;
  state: string;
  hasCAC: boolean;
  hasTIN: boolean;
  vatRegistered: boolean;
  turnoverBand: any;
  annualTurnoverNGN: string;
  fixedAssetsNGN: string;
  employeeCount: string;
  accountingYearEndMonth: string;
  accountingYearEndDay: string;
  isProfessionalServices: boolean;
  claimsTaxIncentives: boolean;
  isNonResident: boolean;
  sellsIntoNigeria: boolean;
  einvoicingEnabled: boolean;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { businesses, updateBusiness, evaluateEligibility, refresh } = useMockApi();
  const business = businesses[0];
  const { addToast } = useToast();
  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem("rorun_onboarding_draft_v1");
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { step?: number };
      return typeof parsed.step === "number" ? parsed.step : 0;
    } catch {
      return 0;
    }
  });
  const [loading, setLoading] = useState(false);

  const isSeedBusiness = business?.name?.trim() === "Demo Ventures";

  const defaultForm: OnboardingFormState = {
    name: isSeedBusiness ? "" : business?.name ?? "",
    role: (isSeedBusiness ? "" : (business?.role as BusinessRole)) as BusinessRole | "",
    legalForm: (isSeedBusiness ? "" : (business as any)?.legalForm) as any,
    sector: isSeedBusiness ? "" : business?.sector ?? "",
    state: isSeedBusiness ? "" : business?.state ?? "",
    hasCAC: isSeedBusiness ? false : (business as any)?.hasCAC ?? false,
    hasTIN: isSeedBusiness ? false : (business as any)?.hasTIN ?? false,
    vatRegistered: isSeedBusiness ? false : business?.vatRegistered ?? false,
    turnoverBand: (isSeedBusiness ? "" : (business as any)?.turnoverBand) as any,
    annualTurnoverNGN: String((business as any)?.annualTurnoverNGN ?? ""),
    fixedAssetsNGN: String((business as any)?.fixedAssetsNGN ?? ""),
    employeeCount: String((business as any)?.employeeCount ?? ""),
    accountingYearEndMonth: String((business as any)?.accountingYearEndMonth ?? ""),
    accountingYearEndDay: String((business as any)?.accountingYearEndDay ?? ""),
    isProfessionalServices: !!(business as any)?.isProfessionalServices,
    claimsTaxIncentives: !!(business as any)?.claimsTaxIncentives,
    isNonResident: !!(business as any)?.isNonResident,
    sellsIntoNigeria: !!(business as any)?.sellsIntoNigeria,
    einvoicingEnabled: !!(business as any)?.einvoicingEnabled,
  };

  const [form, setForm] = useState<OnboardingFormState>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("rorun_onboarding_draft_v1");
        if (raw) {
          const parsed = JSON.parse(raw) as { form?: Partial<OnboardingFormState> };
          if (parsed?.form) return { ...defaultForm, ...parsed.form };
        }
      } catch {
        // ignore
      }
    }
    return defaultForm;
  });

  // Persist draft so Back / refresh doesn't wipe the onboarding info.
  useEffect(() => {
    try {
      localStorage.setItem(
        "rorun_onboarding_draft_v1",
        JSON.stringify({ step, form })
      );
    } catch {
      // ignore
    }
  }, [step, form]);

  const canContinue =
    (step === 0 && form.name.trim().length > 0 && !!form.role) ||
    (step === 1 && !!form.legalForm) ||
    (step === 2 && !!form.sector && !!form.state) ||
    (step === 3 && true) ||
    (step === 4 && !!form.turnoverBand) ||
    (step === 5 && true);

  const goNext = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    // Step 1: allow user to exit onboarding back to signup
    router.push("/signup");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let businessId = business?.id;

      if (!businessId) {
        const created = await createBusiness({
          name: form.name,
          legalForm: String(form.legalForm || ""),
          sector: form.sector || undefined,
          state: form.state || undefined,
          vatRegistered: !!form.vatRegistered,
          estimatedTurnoverBand: form.turnoverBand ? String(form.turnoverBand) : undefined,
          annualTurnoverNGN: form.annualTurnoverNGN.trim() ? Number(form.annualTurnoverNGN) : null,
          fixedAssetsNGN: form.fixedAssetsNGN.trim() ? Number(form.fixedAssetsNGN) : null,
          employeeCount: form.employeeCount.trim() ? Number(form.employeeCount) : null,
          accountingYearEndMonth: form.accountingYearEndMonth.trim() ? Number(form.accountingYearEndMonth) : null,
          accountingYearEndDay: form.accountingYearEndDay.trim() ? Number(form.accountingYearEndDay) : null,
          isProfessionalServices: !!form.isProfessionalServices,
          claimsTaxIncentives: !!form.claimsTaxIncentives,
          isNonResident: !!form.isNonResident,
          sellsIntoNigeria: !!form.sellsIntoNigeria,
          einvoicingEnabled: !!form.einvoicingEnabled,
        });
        businessId = created.id;
      } else {
        await updateBusiness(businessId, {
          name: form.name,
          legalForm: (form.legalForm || undefined) as any,
          sector: form.sector || undefined,
          state: form.state || undefined,
          vatRegistered: !!form.vatRegistered,
          estimatedTurnoverBand: form.turnoverBand ? String(form.turnoverBand) : undefined,
          annualTurnoverNGN: form.annualTurnoverNGN.trim() ? Number(form.annualTurnoverNGN) : null,
          fixedAssetsNGN: form.fixedAssetsNGN.trim() ? Number(form.fixedAssetsNGN) : null,
          employeeCount: form.employeeCount.trim() ? Number(form.employeeCount) : null,
          accountingYearEndMonth: form.accountingYearEndMonth.trim() ? Number(form.accountingYearEndMonth) : null,
          accountingYearEndDay: form.accountingYearEndDay.trim() ? Number(form.accountingYearEndDay) : null,
          isProfessionalServices: !!form.isProfessionalServices,
          claimsTaxIncentives: !!form.claimsTaxIncentives,
          isNonResident: !!form.isNonResident,
          sellsIntoNigeria: !!form.sellsIntoNigeria,
          einvoicingEnabled: !!form.einvoicingEnabled,
        } as any);
      }

      if (businessId) {
        // Eligibility is "best effort" — if it fails, we still finish onboarding
        // and let the dashboard load. We'll re-calc tax safety later.
        try {
          await evaluateEligibility(businessId);
        } catch (e: any) {
          addToast({
            title: "Workspace created",
            description: "We’ll calculate your tax safety shortly. You can continue to the dashboard now.",
            variant: "success",
          });
        }
      }

      // Ensure app state is fresh (business list, alerts, etc.)
      // so dashboard doesn't immediately think there's no workspace.
      await refresh();
    } finally {
      setLoading(false);
    }
    try {
      localStorage.removeItem("rorun_onboarding_draft_v1");
      localStorage.removeItem("rorun_signup_draft_v1");
    } catch {
      // ignore
    }
    router.push("/app/dashboard?from=onboarding");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <BrandLink className="flex items-center gap-2 mb-2">
            <Image
              src="/logo.png"
              alt="Rorun"
              width={80}
              height={28}
              className="h-6 w-auto"
            />
            <span className="text-xs text-slate-400">Onboarding</span>
          </BrandLink>
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
                  placeholder="e.g. Chuks Logistics"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-800">
                  Your role in the business
                </label>
                <Select
                  value={form.role || ""}
                  onChange={(value) =>
                    setForm((f) => ({ ...f, role: value as BusinessRole }))
                  }
                  placeholder="Select your role"
                  options={[
                    { value: "Owner", label: "Owner" },
                    { value: "Co-owner / Partner", label: "Co-founder" },
                    { value: "Manager", label: "Manager" },
                    { value: "Accountant / Finance", label: "Accountant" },
                    { value: "Operations / Staff", label: "Staff" }
                  ]}
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
                <Select
                  value={form.sector}
                  onChange={(value) => setForm((f) => ({ ...f, sector: value }))}
                  placeholder="Select sector"
                  options={[
                    { value: "Retail / Trade", label: "Retail / Trade" },
                    { value: "Food & Drinks", label: "Food & Drinks" },
                    { value: "Professional services", label: "Professional services" },
                    { value: "Tech / Online business", label: "Tech / Online business" },
                    { value: "Manufacturing", label: "Manufacturing" },
                    { value: "Other", label: "Other" }
                  ]}
                />
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
                &quot;No&quot; yet.
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

          {step === 5 && (
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                Optional: add more details to make your tax rules and deadlines more accurate. You can edit these later in Settings.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">Annual turnover (₦)</label>
                  <Input
                    inputMode="numeric"
                    value={form.annualTurnoverNGN}
                    onChange={(e) => setForm((f) => ({ ...f, annualTurnoverNGN: e.target.value }))}
                    placeholder="e.g. 25000000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">Fixed assets (₦)</label>
                  <Input
                    inputMode="numeric"
                    value={form.fixedAssetsNGN}
                    onChange={(e) => setForm((f) => ({ ...f, fixedAssetsNGN: e.target.value }))}
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">Employee count</label>
                  <Input
                    inputMode="numeric"
                    value={form.employeeCount}
                    onChange={(e) => setForm((f) => ({ ...f, employeeCount: e.target.value }))}
                    placeholder="e.g. 3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">Accounting year end</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      inputMode="numeric"
                      value={form.accountingYearEndMonth}
                      onChange={(e) => setForm((f) => ({ ...f, accountingYearEndMonth: e.target.value }))}
                      placeholder="Month (1–12)"
                    />
                    <Input
                      inputMode="numeric"
                      value={form.accountingYearEndDay}
                      onChange={(e) => setForm((f) => ({ ...f, accountingYearEndDay: e.target.value }))}
                      placeholder="Day (1–31)"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { key: "isProfessionalServices", label: "Professional services business" },
                  { key: "claimsTaxIncentives", label: "Claims tax incentives" },
                  { key: "isNonResident", label: "Non-resident business" },
                  { key: "sellsIntoNigeria", label: "Sells into Nigeria" },
                  { key: "einvoicingEnabled", label: "E-invoicing enabled" },
                ].map((row) => (
                  <div key={row.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="text-sm font-medium text-slate-800">{row.label}</div>
                    <Switch
                      checked={Boolean((form as any)[row.key])}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, [row.key]: Boolean(v) } as any))}
                    />
                  </div>
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
            >
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button type="button" size="sm" onClick={goNext} disabled={!canContinue}>
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                loading={loading}
                disabled={!canContinue}
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


