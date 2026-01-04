"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMockApi } from "@/lib/mock-api";
import { FEATURE_LABELS, PLANS, PlanFeatureKey, PlanId } from "@/lib/plans";
import clsx from "clsx";
import { getCurrentPlan, setCurrentPlanApi } from "@/lib/api/plan";
import { updateProfileApi } from "@/lib/api/profile";
import { updateBusinessApi } from "@/lib/api/business";
import { hardResetSession } from "@/lib/session";
import { logout } from "@/lib/api/auth";
import { useToast } from "@/components/ui/toast";
import {
  getNotificationPreferences,
  updateNotificationPreference,
  NotificationPreference,
} from "@/lib/api/notifications";
import { useFeatures } from "@/hooks/use-features";
import { Lock } from "lucide-react";

const tabs = [
  { id: "plan", label: "Plan" },
  { id: "profile", label: "Profile" },
  { id: "workspace", label: "Workspace" },
  { id: "notifications", label: "Notifications" },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const search = useSearchParams();
  const router = useRouter();
  const searchTab = search.get("tab") || "plan";
  const normalizedTab = tabs.some((t) => t.id === searchTab) ? searchTab : "plan";
  const [tab, setTab] = useState(normalizedTab);

  // Keep UI state in sync with URL (e.g. when navigating via profile menu or back/forward).
  useEffect(() => {
    setTab(normalizedTab);
  }, [normalizedTab]);

  const handleTab = (id: string) => {
    setTab(id);
    router.push(`/app/settings?tab=${id}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your workspace and account preferences.</p>
      </div>

      <div className="mb-2 flex gap-3 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={clsx(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px",
              tab === t.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
            onClick={() => handleTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "plan" && <PlanSettingsSection />}
      {tab === "profile" && <ProfileSettingsSection />}
      {tab === "workspace" && <WorkspaceSettingsSection />}
      {tab === "notifications" && <NotificationsSettingsSection />}
    </div>
  );
}

function PlanSettingsSection() {
  const { currentPlanId, setCurrentPlan, businesses } = useMockApi();
  const { addToast } = useToast();
  const business = businesses[0];
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      if (!business) return;
      try {
        // Check for payment success
        const status = searchParams.get("status");
        if (status === "success") {
          addToast({ title: "Payment successful!", description: "Your plan has been upgraded." });
          // Poll billing status until active
          const pollStatus = async () => {
            try {
              const { getBillingStatus } = await import("@/lib/api/billing");
              const status = await getBillingStatus(business.id);
              setBillingStatus(status);
              if (status.subscription?.status === "active") {
                router.replace("/app/settings?tab=plan");
              } else {
                setTimeout(pollStatus, 2000);
              }
            } catch (e) {
              console.error("Failed to poll billing status", e);
            }
          };
          pollStatus();
        }

        const planId = await getCurrentPlan(business.id);
        if (planId) setCurrentPlan(planId);

        // Load billing status
        try {
          const { getBillingStatus } = await import("@/lib/api/billing");
          const status = await getBillingStatus(business.id);
          setBillingStatus(status);
        } catch {
          // Ignore if billing API not available
        }
      } catch {
        // ignore and keep mock state
      }
    }
    load();
  }, [business, setCurrentPlan, searchParams, router, addToast]);

  const handleSelect = async (id: PlanId) => {
    if (!business) return;
    
    // Accountant plan - open contact form
    if (id === "accountant") {
      const subject = encodeURIComponent("Rorun Accountant Plan Inquiry");
      const body = encodeURIComponent(`Hi Rorun team,\n\nI'm interested in the Accountant plan for my firm.\n\nBusiness: ${business.name}\n\nPlease get in touch to discuss.\n\nThanks!`);
      window.open(`mailto:hello@rorun.ng?subject=${subject}&body=${body}`, "_blank");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(id);
    let usedDirect = false;

    try {
      // Prefer real billing if available; otherwise fall back to server-side plan switch.
      if (id !== "free") {
        try {
          const { createCheckoutSession } = await import("@/lib/api/billing");
          const { authorizationUrl } = await createCheckoutSession(business.id, id);
          if (authorizationUrl) {
            window.location.href = authorizationUrl;
            return;
          }
        } catch (e: any) {
          // billing not configured or failed; fall back to direct plan change
          console.warn("Billing checkout failed, using direct plan change:", e?.message);
          usedDirect = true;
        }
      }

      // Direct plan change (simulated billing for testing or free plan)
      const updated = await setCurrentPlanApi(business.id, id);
      setCurrentPlan(updated);
      setSuccess(`Plan updated to ${PLANS.find(p => p.id === id)?.name || id}!`);
      addToast({ 
        title: "Plan updated", 
        description: usedDirect
          ? `Billing isn’t enabled yet — switched you to ${PLANS.find(p => p.id === id)?.name || id} for now.`
          : `You're now on the ${PLANS.find(p => p.id === id)?.name || id} plan.`,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to update plan. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const currentSubscription = billingStatus?.subscription;
  const isProcessing = searchParams.get("status") === "success" && currentSubscription?.status !== "active";

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}
      {currentSubscription && (
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <span className={clsx(
                "font-semibold",
                currentSubscription.status === "active" ? "text-emerald-600" : "text-amber-600"
              )}>
                {currentSubscription.status === "active" ? "Active" : 
                 currentSubscription.status === "past_due" ? "Past Due" :
                 currentSubscription.status === "canceled" ? "Canceled" : currentSubscription.status}
              </span>
            </div>
            {currentSubscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span>Next renewal:</span>
                <span>{new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            )}
            {isProcessing && (
              <p className="text-xs text-amber-600 mt-2">
                Payment processing... Please wait while we confirm your subscription.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Choose your plan
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Upgrade to unlock more features. Payment is processed securely via Paystack.
          {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isSelected = plan.id === currentPlanId;
          const bullets = Object.entries(plan.features)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => FEATURE_LABELS[key as PlanFeatureKey]);
          return (
            <Card
              key={plan.id}
              className={clsx(
                "flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm transition",
                isSelected
                  ? "border-emerald-600 ring-1 ring-emerald-500"
                  : "border-slate-200 hover:border-emerald-300"
              )}
            >
              <div className="relative mb-2">
                {plan.highlight && (
                  <span className="absolute right-0 -top-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm">
                    Most popular
                  </span>
                )}
                <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500">{plan.tagline}</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">{plan.priceLabel}</p>
              <p className="mt-1 text-[11px] text-slate-500">{plan.bestFor}</p>
              <ul className="mt-3 space-y-1 flex-1">
                {bullets.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                {isSelected ? (
                  <button
                    className="w-full rounded-full border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                    disabled
                  >
                    Current plan
                  </button>
                ) : (
                  <button
                    className="w-full rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => handleSelect(plan.id)}
                    disabled={loading === plan.id || isProcessing}
                  >
                    {loading === plan.id 
                      ? "Processing..." 
                      : plan.id === "accountant" 
                        ? "Contact sales" 
                        : plan.id === "free" 
                          ? "Downgrade to Free" 
                          : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ProfileSettingsSection() {
  const { user, updateUser } = useMockApi();
  const { addToast } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [language, setLanguage] = useState(user?.preferredLanguage);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6 text-sm text-slate-500">
          Loading profile...
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    setSaving(true);
    setError(null);
    updateUser({ name, email: email || undefined, preferredLanguage: language as any });
    updateProfileApi({ name, email: email || undefined, preferredLanguage: language })
      .catch((e) => setError(e?.message || "Failed to save profile"))
      .finally(() => setSaving(false));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // ignore
    } finally {
      hardResetSession();
      addToast({ title: "Logged out", description: "You've been signed out successfully." });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Preferred language">
          <Select
            value={language}
            onChange={(v) => setLanguage(v as "en" | "pidgin")}
            options={[
              { value: "en", label: "English" },
              { value: "pidgin", label: "English + Pidgin" },
            ]}
          />
        </Field>
        <Button
          className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save profile"}
        </Button>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

        <div className="pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkspaceSettingsSection() {
  const { businesses, updateBusiness } = useMockApi();
  const business = businesses[0];
  const { addToast } = useToast();
  const [name, setName] = useState(business?.name || "");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [currency] = useState("NGN");
  const [profile, setProfile] = useState(() => ({
    vatRegistered: !!(business as any)?.vatRegistered,
    annualTurnoverNGN: (business as any)?.annualTurnoverNGN ?? "",
    fixedAssetsNGN: (business as any)?.fixedAssetsNGN ?? "",
    employeeCount: (business as any)?.employeeCount ?? "",
    accountingYearEndMonth: (business as any)?.accountingYearEndMonth ?? "",
    accountingYearEndDay: (business as any)?.accountingYearEndDay ?? "",
    isProfessionalServices: !!(business as any)?.isProfessionalServices,
    claimsTaxIncentives: !!(business as any)?.claimsTaxIncentives,
    isNonResident: !!(business as any)?.isNonResident,
    sellsIntoNigeria: !!(business as any)?.sellsIntoNigeria,
    einvoicingEnabled: !!(business as any)?.einvoicingEnabled,
  }));

  const [invoiceConfig, setInvoiceConfig] = useState(() => {
    const vatRegistered = !!(business as any)?.vatRegistered;
    const defaultTaxType = (business as any)?.defaultTaxType ?? (vatRegistered ? "vat" : "none");
    const defaultTaxRate = (business as any)?.defaultTaxRate;
    const defaultTaxRatePct =
      defaultTaxRate === null || defaultTaxRate === undefined
        ? vatRegistered
          ? "7.5"
          : ""
        : String(Number(defaultTaxRate) * 100);
    const defaultTaxLabel = (business as any)?.defaultTaxLabel ?? (vatRegistered ? "VAT" : "");

    return {
      invoiceDisplayName: (business as any)?.invoiceDisplayName ?? "",
      invoiceLogoUrl: (business as any)?.invoiceLogoUrl ?? "",
      invoiceAddressLine1: (business as any)?.invoiceAddressLine1 ?? "",
      invoiceAddressLine2: (business as any)?.invoiceAddressLine2 ?? "",
      invoiceCity: (business as any)?.invoiceCity ?? "",
      invoiceState: (business as any)?.invoiceState ?? "",
      invoiceCountry: (business as any)?.invoiceCountry ?? "Nigeria",
      invoicePostalCode: (business as any)?.invoicePostalCode ?? "",
      invoiceFooterNote: (business as any)?.invoiceFooterNote ?? "",
      invoiceTemplateKey: (business as any)?.invoiceTemplateKey ?? "classic",
      paymentBankName: (business as any)?.paymentBankName ?? "",
      paymentAccountName: (business as any)?.paymentAccountName ?? "",
      paymentAccountNumber: (business as any)?.paymentAccountNumber ?? "",
      paymentInstructionsNote: (business as any)?.paymentInstructionsNote ?? "",
      defaultTaxType,
      defaultTaxRatePct,
      defaultTaxLabel,
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  if (!business) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6 text-sm text-slate-500">
          Loading workspace...
        </CardContent>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateBusiness(business.id, {
        name,
        vatRegistered: !!profile.vatRegistered,
        annualTurnoverNGN: profile.annualTurnoverNGN === "" ? null : Number(profile.annualTurnoverNGN),
        fixedAssetsNGN: profile.fixedAssetsNGN === "" ? null : Number(profile.fixedAssetsNGN),
        employeeCount: profile.employeeCount === "" ? null : Number(profile.employeeCount),
        accountingYearEndMonth:
          profile.accountingYearEndMonth === "" ? null : Number(profile.accountingYearEndMonth),
        accountingYearEndDay: profile.accountingYearEndDay === "" ? null : Number(profile.accountingYearEndDay),
        isProfessionalServices: !!profile.isProfessionalServices,
        claimsTaxIncentives: !!profile.claimsTaxIncentives,
        isNonResident: !!profile.isNonResident,
        sellsIntoNigeria: !!profile.sellsIntoNigeria,
        einvoicingEnabled: !!profile.einvoicingEnabled,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to save workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoiceSettings = async () => {
    setSavingInvoice(true);
    setInvoiceError(null);

    try {
      const template = (invoiceConfig.invoiceTemplateKey || "classic").toLowerCase();
      if (!["classic", "modern", "minimal"].includes(template)) {
        throw new Error("Template must be Classic, Modern, or Minimal.");
      }

      const taxType = (invoiceConfig.defaultTaxType || "none").toLowerCase();
      if (!["none", "vat", "wht", "custom"].includes(taxType)) {
        throw new Error("Default tax type must be none, VAT, WHT, or custom.");
      }

      let taxRateDecimal: number | null = null;
      if (taxType !== "none") {
        const pctRaw = (invoiceConfig.defaultTaxRatePct || "").trim();
        const pct = pctRaw === "" ? NaN : Number(pctRaw);
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
          throw new Error("Tax rate must be a valid percentage between 0 and 100.");
        }
        taxRateDecimal = pct / 100;
      }

      await updateBusiness(business.id, {
        invoiceDisplayName: invoiceConfig.invoiceDisplayName.trim() || null,
        invoiceLogoUrl: invoiceConfig.invoiceLogoUrl.trim() || null,
        invoiceAddressLine1: invoiceConfig.invoiceAddressLine1.trim() || null,
        invoiceAddressLine2: invoiceConfig.invoiceAddressLine2.trim() || null,
        invoiceCity: invoiceConfig.invoiceCity.trim() || null,
        invoiceState: invoiceConfig.invoiceState.trim() || null,
        invoiceCountry: invoiceConfig.invoiceCountry.trim() || null,
        invoicePostalCode: invoiceConfig.invoicePostalCode.trim() || null,
        invoiceFooterNote: invoiceConfig.invoiceFooterNote.trim() || null,
        invoiceTemplateKey: template as any,
        paymentBankName: invoiceConfig.paymentBankName.trim() || null,
        paymentAccountName: invoiceConfig.paymentAccountName.trim() || null,
        paymentAccountNumber: invoiceConfig.paymentAccountNumber.trim() || null,
        paymentInstructionsNote: invoiceConfig.paymentInstructionsNote.trim() || null,
        defaultTaxType: taxType as any,
        defaultTaxRate: taxType === "none" ? null : taxRateDecimal,
        defaultTaxLabel: taxType === "none" ? null : (invoiceConfig.defaultTaxLabel.trim() || null),
      });

      addToast({
        title: "Invoice settings saved",
        description: "Your invoice branding and defaults were updated.",
        variant: "success",
      });
    } catch (e: any) {
      const msg = e?.message || "Failed to save invoice settings";
      setInvoiceError(msg);
      addToast({ title: "Couldn’t save invoice settings", description: msg, variant: "error" });
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">Workspace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Workspace name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Default tax year">
          <Input
            type="number"
            value={taxYear}
            onChange={(e) => setTaxYear(parseInt(e.target.value, 10))}
          />
        </Field>
        <Field label="Currency">
          <Input value={currency} disabled />
        </Field>

        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">Tax profile (for rules + deadlines)</p>
          <p className="mt-1 text-xs text-slate-600">
            These fields improve the legal precision of tax rules and obligations. Existing workspaces can leave them blank.
          </p>

          <div className="mt-3 space-y-3">
            <ToggleRow
              label="VAT registered"
              description="Set true if the business is currently VAT registered."
              checked={!!profile.vatRegistered}
              onChange={(v) => setProfile((p) => ({ ...p, vatRegistered: v }))}
              disabled={saving}
            />

            <Field label="Annual turnover (₦)">
              <Input
                type="number"
                inputMode="decimal"
                value={profile.annualTurnoverNGN}
                onChange={(e) => setProfile((p) => ({ ...p, annualTurnoverNGN: e.target.value }))}
                placeholder="e.g. 25000000"
              />
            </Field>

            <Field label="Fixed assets (₦)">
              <Input
                type="number"
                inputMode="decimal"
                value={profile.fixedAssetsNGN}
                onChange={(e) => setProfile((p) => ({ ...p, fixedAssetsNGN: e.target.value }))}
                placeholder="e.g. 5000000"
              />
            </Field>

            <Field label="Employee count">
              <Input
                type="number"
                inputMode="numeric"
                value={profile.employeeCount}
                onChange={(e) => setProfile((p) => ({ ...p, employeeCount: e.target.value }))}
                placeholder="e.g. 12"
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Accounting year end month">
                <Select
                  value={String(profile.accountingYearEndMonth || "")}
                  onChange={(v) => setProfile((p) => ({ ...p, accountingYearEndMonth: v }))}
                  options={[
                    { value: "", label: "Select month…" },
                    { value: "1", label: "January" },
                    { value: "2", label: "February" },
                    { value: "3", label: "March" },
                    { value: "4", label: "April" },
                    { value: "5", label: "May" },
                    { value: "6", label: "June" },
                    { value: "7", label: "July" },
                    { value: "8", label: "August" },
                    { value: "9", label: "September" },
                    { value: "10", label: "October" },
                    { value: "11", label: "November" },
                    { value: "12", label: "December" },
                  ]}
                />
              </Field>
              <Field label="Accounting year end day (1–31)">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={profile.accountingYearEndDay}
                  onChange={(e) => setProfile((p) => ({ ...p, accountingYearEndDay: e.target.value }))}
                  placeholder="e.g. 31"
                />
              </Field>
            </div>

            <ToggleRow
              label="Professional services"
              description="For professional service businesses (consulting, legal, medical, etc)."
              checked={!!profile.isProfessionalServices}
              onChange={(v) => setProfile((p) => ({ ...p, isProfessionalServices: v }))}
              disabled={saving}
            />

            <ToggleRow
              label="Claims tax incentives"
              description="Set true if the business claims incentives (e.g., pioneer status)."
              checked={!!profile.claimsTaxIncentives}
              onChange={(v) => setProfile((p) => ({ ...p, claimsTaxIncentives: v }))}
              disabled={saving}
            />

            <ToggleRow
              label="Non-resident business"
              description="Set true if the business is non-resident."
              checked={!!profile.isNonResident}
              onChange={(v) => setProfile((p) => ({ ...p, isNonResident: v }))}
              disabled={saving}
            />

            <ToggleRow
              label="Sells into Nigeria"
              description="Set true if the business sells into Nigeria (important for VAT rules)."
              checked={!!profile.sellsIntoNigeria}
              onChange={(v) => setProfile((p) => ({ ...p, sellsIntoNigeria: v }))}
              disabled={saving}
            />

            <ToggleRow
              label="E-invoicing enabled"
              description="Set true if the business has enabled e-invoicing requirements."
              checked={!!profile.einvoicingEnabled}
              onChange={(v) => setProfile((p) => ({ ...p, einvoicingEnabled: v }))}
              disabled={saving}
            />
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">Invoices</p>
          <p className="mt-1 text-xs text-slate-600">
            Configure invoice branding, template, payment instructions, and default tax settings.
          </p>

          <div className="mt-3 space-y-4">
            {/* A) Branding */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-800">Invoice branding</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Display name falls back to your workspace name if left blank.
              </p>

              <div className="mt-3 space-y-3">
                <Field label="Invoice display name">
                  <Input
                    value={invoiceConfig.invoiceDisplayName}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceDisplayName: e.target.value }))}
                    placeholder={business.name}
                  />
                </Field>
                <Field label="Logo URL (optional)">
                  <Input
                    value={invoiceConfig.invoiceLogoUrl}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceLogoUrl: e.target.value }))}
                    placeholder="https://…"
                  />
                </Field>

                <Field label="Address line 1">
                  <Input
                    value={invoiceConfig.invoiceAddressLine1}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceAddressLine1: e.target.value }))}
                    placeholder="Street address"
                  />
                </Field>
                <Field label="Address line 2">
                  <Input
                    value={invoiceConfig.invoiceAddressLine2}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceAddressLine2: e.target.value }))}
                    placeholder="Suite, floor, etc. (optional)"
                  />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="City">
                    <Input
                      value={invoiceConfig.invoiceCity}
                      onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceCity: e.target.value }))}
                      placeholder="e.g. Lagos"
                    />
                  </Field>
                  <Field label="State">
                    <Input
                      value={invoiceConfig.invoiceState}
                      onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceState: e.target.value }))}
                      placeholder="e.g. Lagos"
                    />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Country">
                    <Input
                      value={invoiceConfig.invoiceCountry}
                      onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceCountry: e.target.value }))}
                      placeholder="Nigeria"
                    />
                  </Field>
                  <Field label="Postal code">
                    <Input
                      value={invoiceConfig.invoicePostalCode}
                      onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoicePostalCode: e.target.value }))}
                      placeholder="e.g. 100001"
                    />
                  </Field>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">Footer note (optional)</label>
                  <Textarea
                    value={invoiceConfig.invoiceFooterNote}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, invoiceFooterNote: e.target.value }))}
                    placeholder="e.g. Thank you for your business."
                  />
                </div>
              </div>
            </div>

            {/* B) Template default */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-800">Invoice template</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Choose a default layout. This will affect PDF/export later.
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {([
                  { key: "classic", label: "Classic" },
                  { key: "modern", label: "Modern" },
                  { key: "minimal", label: "Minimal" },
                ] as const).map((t) => {
                  const active = (invoiceConfig.invoiceTemplateKey || "classic") === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setInvoiceConfig((p) => ({ ...p, invoiceTemplateKey: t.key }))}
                      className={clsx(
                        "rounded-xl border p-3 text-left transition",
                        active ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="mb-2 rounded-lg border border-slate-200 bg-white p-2">
                        <div className="h-2 w-1/2 rounded bg-slate-200" />
                        <div className="mt-2 h-2 w-full rounded bg-slate-100" />
                        <div className="mt-1 h-2 w-5/6 rounded bg-slate-100" />
                        <div className="mt-3 h-6 w-full rounded bg-slate-100" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {t.key === "classic"
                          ? "Balanced and familiar."
                          : t.key === "modern"
                          ? "Clean, bold header."
                          : "Lightweight and simple."}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* C) Payment instructions */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-800">Payment instructions</p>
              <p className="mt-1 text-[11px] text-slate-500">
                These will be displayed on invoice views and PDFs later.
              </p>

              <div className="mt-3 space-y-3">
                <Field label="Bank name">
                  <Input
                    value={invoiceConfig.paymentBankName}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, paymentBankName: e.target.value }))}
                    placeholder="e.g. GTBank"
                  />
                </Field>
                <Field label="Account name">
                  <Input
                    value={invoiceConfig.paymentAccountName}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, paymentAccountName: e.target.value }))}
                    placeholder="e.g. Rorun Tax Ltd"
                  />
                </Field>
                <Field label="Account number">
                  <Input
                    inputMode="numeric"
                    value={invoiceConfig.paymentAccountNumber}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, paymentAccountNumber: e.target.value }))}
                    placeholder="e.g. 0123456789"
                  />
                </Field>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-800">Payment note (optional)</label>
                  <Textarea
                    value={invoiceConfig.paymentInstructionsNote}
                    onChange={(e) => setInvoiceConfig((p) => ({ ...p, paymentInstructionsNote: e.target.value }))}
                    placeholder="e.g. Transfer to the account above and send proof."
                  />
                </div>
              </div>
            </div>

            {/* D) Tax defaults */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-800">Tax defaults</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Prefills new invoices. You can override per invoice later.
              </p>

              <div className="mt-3 space-y-3">
                <Field label="Default tax type">
                  <Select
                    value={String(invoiceConfig.defaultTaxType || "none")}
                    onChange={(v) => setInvoiceConfig((p) => ({ ...p, defaultTaxType: v }))}
                    options={[
                      { value: "none", label: "None" },
                      { value: "vat", label: "VAT" },
                      { value: "wht", label: "WHT" },
                      { value: "custom", label: "Custom" },
                    ]}
                  />
                </Field>

                {(invoiceConfig.defaultTaxType || "none") !== "none" && (
                  <>
                    <Field label="Default tax rate (%)">
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={invoiceConfig.defaultTaxRatePct}
                        onChange={(e) => setInvoiceConfig((p) => ({ ...p, defaultTaxRatePct: e.target.value }))}
                        placeholder="e.g. 7.5"
                      />
                    </Field>
                    <Field label="Default tax label">
                      <Input
                        value={invoiceConfig.defaultTaxLabel}
                        onChange={(e) => setInvoiceConfig((p) => ({ ...p, defaultTaxLabel: e.target.value }))}
                        placeholder="e.g. VAT"
                      />
                    </Field>
                  </>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              className="rounded-full"
              onClick={handleSaveInvoiceSettings}
              disabled={savingInvoice}
            >
              {savingInvoice ? "Saving…" : "Save invoice settings"}
            </Button>
            {invoiceError && <p className="text-xs font-semibold text-rose-600">{invoiceError}</p>}
          </div>
        </div>

        <Button
          className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save workspace"}
        </Button>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

function NotificationsSettingsSection() {
  const { businesses } = useMockApi();
  const business = businesses[0];
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hasFeature } = useFeatures(business?.id || null);

  // Hooks must be called unconditionally
  useEffect(() => {
    if (!business) return;
    loadPreferences();
  }, [business]);

  const loadPreferences = async () => {
    if (!business) return;
    try {
      setLoading(true);
      const prefs = await getNotificationPreferences(business.id);
      setPreferences(prefs);
    } catch (e: any) {
      setError(e?.message || "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  };

  const getPreference = (channel: "in_app" | "email" | "sms") => {
    return preferences.find((p) => p.channel === channel);
  };

  const updatePreference = async (
    channel: "in_app" | "email" | "sms",
    enabled: boolean,
    rulesJson?: NotificationPreference["rulesJson"]
  ) => {
    if (!business) return;
    setSaving(channel);
    setError(null);
    try {
      const updated = await updateNotificationPreference(business.id, channel, enabled, rulesJson);
      setPreferences((prev) => {
        const filtered = prev.filter((p) => p.channel !== channel);
        return [...filtered, updated];
      });
    } catch (e: any) {
      setError(e?.message || "Failed to update preference");
    } finally {
      setSaving(null);
    }
  };

  const inAppPref = getPreference("in_app");
  const emailPref = getPreference("email");
  const smsPref = getPreference("sms");

  const canUseEmail = hasFeature("yearEndFilingPack"); // Basic+
  const canUseSms = hasFeature("enhancedSummaryReports"); // Business+

  if (loading) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6">
          <p className="text-sm text-slate-500">Loading notification preferences...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            label="In-app reminders"
            description="See notifications in your dashboard (Free+)"
            checked={inAppPref?.enabled ?? true}
            onChange={(v) => updatePreference("in_app", v)}
            disabled={saving === "in_app"}
          />

          <div className="relative">
            <ToggleRow
              label="Email reminders"
              description="Get notified via email (Basic+)"
              checked={emailPref?.enabled ?? false}
              onChange={(v) => updatePreference("email", v)}
              disabled={!canUseEmail || saving === "email"}
            />
            {!canUseEmail && (
              <div className="absolute inset-0 flex items-center justify-end pr-3 pointer-events-none">
                <Lock className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </div>

          <div className="relative">
            <ToggleRow
              label="SMS reminders"
              description="Get notified via SMS (Business+)"
              checked={smsPref?.enabled ?? false}
              onChange={(v) => updatePreference("sms", v)}
              disabled={!canUseSms || saving === "sms"}
            />
            {!canUseSms && (
              <div className="absolute inset-0 flex items-center justify-end pr-3 pointer-events-none">
                <Lock className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        </CardContent>
      </Card>

      {emailPref?.enabled && canUseEmail && (
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Email Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Remind me about deadlines
              </label>
              <p className="text-xs text-slate-500">
                Days before deadline:{" "}
                {emailPref.rulesJson?.deadlineDays?.join(", ") || "7, 3, 1"}
              </p>
              {canUseSms && (
                <p className="text-xs text-amber-600">
                  Custom schedule available in Business+ plan
                </p>
              )}
            </div>
            <ToggleRow
              label="Daily overdue digest"
              description="Get a summary of overdue tasks each evening"
              checked={emailPref.rulesJson?.dailyDigest !== false}
              onChange={(v) =>
                updatePreference("email", true, {
                  ...emailPref.rulesJson,
                  dailyDigest: v,
                })
              }
              disabled={saving === "email"}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 text-sm">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}