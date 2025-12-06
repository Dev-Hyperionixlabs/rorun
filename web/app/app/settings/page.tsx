"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { updateNotificationSettingsApi, getNotificationSettingsApi } from "@/lib/api/notifications";

const tabs = [
  { id: "plan", label: "Plan" },
  { id: "profile", label: "Profile" },
  { id: "workspace", label: "Workspace" },
  { id: "notifications", label: "Notifications" },
];

export default function SettingsPage() {
  const search = useSearchParams();
  const router = useRouter();
  const defaultTab = search.get("tab") || "plan";
  const [tab, setTab] = useState(defaultTab);

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

  useEffect(() => {
    async function load() {
      if (!business) return;
      try {
        const planId = await getCurrentPlan(business.id);
        if (planId) setCurrentPlan(planId);
      } catch {
        // ignore and keep mock state
      }
    }
    load();
  }, [business, setCurrentPlan]);

  const handleSelect = (id: PlanId) => {
    setError(null);
    setCurrentPlan(id);
    if (!business) return;
    setCurrentPlanApi(business.id, id).catch((e) => {
      setError(e?.message || "Failed to update plan");
    });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Choose your plan
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Choose a plan to preview gated features. Billing is not wired yet in this demo.
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
                    className="w-full rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    onClick={() => handleSelect(plan.id)}
                  >
                    Choose {plan.name}
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
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [language, setLanguage] = useState(user.preferredLanguage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      </CardContent>
    </Card>
  );
}

function WorkspaceSettingsSection() {
  const { businesses, updateBusiness } = useMockApi();
  const business = businesses[0];
  const [name, setName] = useState(business.name);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [currency] = useState("NGN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [dueSoon, setDueSoon] = useState(true);
  const [veryClose, setVeryClose] = useState(true);
  const [monthlyReminder, setMonthlyReminder] = useState(true);
  const [missingReceipts, setMissingReceipts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!business) return;
      try {
        const settings = await getNotificationSettingsApi(business.id);
        if (settings && mounted) {
          setDueSoon(settings.deadlineDueSoon);
          setVeryClose(settings.deadlineVerySoon);
          setMonthlyReminder(settings.monthlyReminder);
          setMissingReceipts(settings.missingReceipts);
        }
      } catch {
        // ignore, stay default
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [business]);

  const persist = async (next: {
    deadlineDueSoon: boolean;
    deadlineVerySoon: boolean;
    monthlyReminder: boolean;
    missingReceipts: boolean;
  }) => {
    if (!business) return;
    setLoading(true);
    setError(null);
    try {
      await updateNotificationSettingsApi(business.id, next);
    } catch (e: any) {
      setError(e?.message || "Failed to save notification settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-900">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ToggleRow
          label="Deadline reminders (due soon)"
          description="Get notified when filings are coming up."
          checked={dueSoon}
          onChange={(v) => {
            setDueSoon(v);
            persist({
              deadlineDueSoon: v,
              deadlineVerySoon: veryClose,
              monthlyReminder,
              missingReceipts,
            });
          }}
        />
        <ToggleRow
          label="Deadline reminders (very close)"
          description="Stronger reminders when you are days away."
          checked={veryClose}
          onChange={(v) => {
            setVeryClose(v);
            persist({
              deadlineDueSoon: dueSoon,
              deadlineVerySoon: v,
              monthlyReminder,
              missingReceipts,
            });
          }}
        />
        <ToggleRow
          label="Monthly “log your activity” reminder"
          description="Stay on top of records coverage."
          checked={monthlyReminder}
          onChange={(v) => {
            setMonthlyReminder(v);
            persist({
              deadlineDueSoon: dueSoon,
              deadlineVerySoon: veryClose,
              monthlyReminder: v,
              missingReceipts,
            });
          }}
        />
        <ToggleRow
          label="High-value transaction missing receipt alerts"
          description="Get alerted when big expenses are missing receipts."
          checked={missingReceipts}
          onChange={(v) => {
            setMissingReceipts(v);
            persist({
              deadlineDueSoon: dueSoon,
              deadlineVerySoon: veryClose,
              monthlyReminder,
              missingReceipts: v,
            });
          }}
        />
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        {loading && <p className="text-xs text-slate-500">Saving…</p>}
      </CardContent>
    </Card>
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