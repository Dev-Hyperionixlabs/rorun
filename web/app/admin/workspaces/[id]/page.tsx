"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Download, RefreshCw, UserCog } from "lucide-react";
import clsx from "clsx";
import { PLANS, PlanId } from "@/lib/plans";

interface WorkspaceDetail {
  business: {
    id: string;
    name: string;
    state: string;
    sector: string;
    legalForm: string;
    ownerUserId: string;
    createdAt: string;
  };
  planId: string;
  firsReady: {
    score: number;
    band: "low" | "medium" | "high";
    reasons: string[];
  };
  transactions: {
    yearToDateCount: number;
    lastTransactionAt: string | null;
  };
  filingPacks: {
    id: string;
    taxYear: number;
    status: string;
    pdfUrl: string | null;
    csvUrl: string | null;
    createdAt: string;
  }[];
}

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState<PlanId>("free");
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const adminKey = typeof window !== "undefined" ? localStorage.getItem("rorun_admin_key") || "" : "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`${apiUrl}/admin/workspaces/${id}`, {
          headers: { "x-admin-key": adminKey },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setWorkspace(data);
        setPlanId((data.planId as PlanId) || "free");
      } catch (err) {
        // Mock fallback
        setWorkspace({
          business: {
            id,
            name: "Ajala Ventures",
            state: "Lagos",
            sector: "Retail",
            legalForm: "sole_proprietor",
            ownerUserId: "user-1",
            createdAt: new Date().toISOString(),
          },
          planId: "basic",
          firsReady: {
            score: 72,
            band: "medium",
            reasons: ["MEDIUM_RECORDS_COVERAGE", "LOW_RECEIPT_COVERAGE"],
          },
          transactions: {
            yearToDateCount: 48,
            lastTransactionAt: new Date().toISOString(),
          },
          filingPacks: [],
        });
        setPlanId("basic");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, adminKey, apiUrl]);

  const handlePlanChange = async (newPlan: PlanId) => {
    setPlanId(newPlan);
    setUpdatingPlan(true);
    try {
      await fetch(`${apiUrl}/admin/workspaces/${id}/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ planId: newPlan }),
      });
    } catch (err) {
      console.error("Failed to update plan", err);
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const year = new Date().getFullYear();
      await fetch(`${apiUrl}/admin/workspaces/${id}/filing-packs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ year }),
      });
      // Refresh data
      window.location.reload();
    } catch (err) {
      console.error("Failed to regenerate", err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleImpersonate = async () => {
    if (!workspace) return;
    setImpersonating(true);
    try {
      const res = await fetch(`${apiUrl}/admin/impersonate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ userId: workspace.business.ownerUserId }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("rorun_auth_token", data.token);
        window.open("/app/dashboard", "_blank");
      }
    } catch (err) {
      console.error("Impersonation failed", err);
    } finally {
      setImpersonating(false);
    }
  };

  const bandColor = (band: string) => {
    if (band === "high") return "bg-emerald-100 text-emerald-700";
    if (band === "medium") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Workspace not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            {workspace.business.name}
          </h1>
          <p className="text-sm text-slate-500">
            {workspace.business.state} • {workspace.business.sector}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              FIRS-Ready Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {workspace.firsReady.score}%
              </span>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  bandColor(workspace.firsReady.band)
                )}
              >
                {workspace.firsReady.band === "high"
                  ? "Green"
                  : workspace.firsReady.band === "medium"
                    ? "Amber"
                    : "Red"}
              </span>
            </div>
            {workspace.firsReady.reasons.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {workspace.firsReady.reasons.map((r) => (
                  <li key={r}>• {r.replace(/_/g, " ").toLowerCase()}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Transactions (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {workspace.transactions.yearToDateCount}
            </div>
            {workspace.transactions.lastTransactionAt && (
              <p className="mt-1 text-xs text-slate-500">
                Last:{" "}
                {new Date(
                  workspace.transactions.lastTransactionAt
                ).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={planId}
              onChange={(val) => handlePlanChange(val as PlanId)}
              options={PLANS.map((p) => ({ value: p.id, label: p.name }))}
              disabled={updatingPlan}
            />
            <p className="mt-2 text-[10px] text-slate-400">
              Change plan instantly for this workspace.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Filing Packs
          </CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <RefreshCw
              className={clsx("mr-1.5 h-4 w-4", regenerating && "animate-spin")}
            />
            Regenerate
          </Button>
        </CardHeader>
        <CardContent>
          {workspace.filingPacks.length === 0 ? (
            <p className="text-sm text-slate-500">
              No filing packs generated yet.
            </p>
          ) : (
            <div className="space-y-2">
              {workspace.filingPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Tax Year {pack.taxYear}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created:{" "}
                      {new Date(pack.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {pack.pdfUrl && (
                      <a
                        href={pack.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    )}
                    {pack.csvUrl && (
                      <a
                        href={pack.csvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">
            Admin Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="secondary" onClick={handleImpersonate} disabled={impersonating}>
            <UserCog className="mr-1.5 h-4 w-4" />
            {impersonating ? "Opening..." : "Impersonate User"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

