"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMockApi } from "@/lib/mock-api";
import { FEATURE_LABELS, PLANS, PlanFeatureKey, PlanId } from "@/lib/plans";
import clsx from "clsx";
import { getCurrentPlan, setCurrentPlanApi } from "@/lib/api/plan";
import { updateProfileApi } from "@/lib/api/profile";
import { updateBusinessApi } from "@/lib/api/business";
import { logoutToHome } from "@/lib/session";
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
  const business = businesses[0];
  const [error, setError] = useState<string | null>(null);
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
  }, [business, setCurrentPlan, searchParams, router]);

  const handleSelect = async (id: PlanId) => {
    if (!business) return;
    setError(null);
    setLoading(id);

    try {
      if (id === "free") {
        // Free plan - no payment needed
        setCurrentPlan(id);
        await setCurrentPlanApi(business.id, id);
      } else {
        // Paid plan - create checkout session
        const { createCheckoutSession } = await import("@/lib/api/billing");
        const { authorizationUrl } = await createCheckoutSession(business.id, id);
        // Redirect to Paystack
        window.location.href = authorizationUrl;
        return; // Don't clear loading state, we're redirecting
      }
    } catch (e: any) {
      setError(e?.message || "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const currentSubscription = billingStatus?.subscription;
  const isProcessing = searchParams.get("status") === "success" && currentSubscription?.status !== "active";

  return (
    <div className="space-y-4">
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
                    {loading === plan.id ? "Processing..." : plan.id === "accountant" ? "Contact us" : `Choose ${plan.name}`}
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
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [language, setLanguage] = useState(user?.preferredLanguage);
  const [saving, setSaving] = useState(false);
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

        <div className="pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={() => logoutToHome()}>
            Log out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkspaceSettingsSection() {
  const { businesses, updateBusiness } = useMockApi();
  const business = businesses[0];
  const [name, setName] = useState(business?.name || "");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [currency] = useState("NGN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!business) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6 text-sm text-slate-500">
          Loading workspace...
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    setSaving(true);
    setError(null);
    updateBusiness(business.id, { name });
    updateBusinessApi(business.id, { name })
      .catch((e) => setError(e?.message || "Failed to save workspace"))
      .finally(() => setSaving(false));
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