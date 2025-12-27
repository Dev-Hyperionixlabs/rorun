"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getFilingPackStatus,
  getFilingPackHistory,
  generateFilingPack,
  regenerateFilingPack,
  getFilingPackDownloadUrl,
  FilingPack,
} from "@/lib/api/filingPacks";
import { useFeatures } from "@/hooks/use-features";
import { useToast } from "@/components/ui/toast";
import {
  Loader2,
  Download,
  FileText,
  FileSpreadsheet,
  Archive,
  AlertCircle,
  Lock,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface FilingPackCardProps {
  businessId: string;
  taxYear?: number;
}

export function FilingPackCard({ businessId, taxYear }: FilingPackCardProps) {
  const year = taxYear || new Date().getFullYear();
  const [pack, setPack] = useState<FilingPack | null>(null);
  const [history, setHistory] = useState<FilingPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasFeature } = useFeatures(businessId);
  const { addToast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);

  const canGenerate = hasFeature("yearEndFilingPack");

  useEffect(() => {
    loadPack();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [businessId, year]);

  const loadPack = async () => {
    try {
      setLoading(true);
      const result = await getFilingPackStatus(businessId, year);
      setPack(result.pack);

      // Start polling if pack is queued or generating
      if (result.pack && (result.pack.status === "queued" || result.pack.status === "generating")) {
        startPolling();
      }
    } catch (error: any) {
      addToast({
        title: "Failed to load filing pack",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (isPollingRef.current) return;
    
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    isPollingRef.current = true;
    let pollCount = 0;
    const maxQuickPolls = 30; // 60 seconds at 2s intervals
    let currentInterval = 2000;

    const poll = async () => {
      if (!isPollingRef.current) return;

      try {
        const result = await getFilingPackStatus(businessId, year);
        if (result.pack) {
          setPack(result.pack);

          // Stop polling if ready or failed
          if (result.pack.status === "ready" || result.pack.status === "failed") {
            isPollingRef.current = false;
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setGenerating(false);
            return;
          }

          pollCount++;
          if (pollCount >= maxQuickPolls && currentInterval === 2000) {
            // Slow down to 5 seconds after 60 seconds
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }
            currentInterval = 5000;
            pollingIntervalRef.current = setInterval(poll, currentInterval);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // Initial poll
    poll();

    // Set up interval (2 seconds)
    pollingIntervalRef.current = setInterval(poll, currentInterval);
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      addToast({
        title: "Plan upgrade required",
        description: "Filing pack generation requires Basic plan or higher.",
        variant: "error",
      });
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      await generateFilingPack(businessId, year);
      await loadPack();
      startPolling();
      addToast({
        title: "Pack generation started",
        description: "Your filing pack is being generated. This may take a few minutes.",
        variant: "success",
      });
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || "Failed to generate filing pack";
      setError(errorMessage);

      if (error?.code === "PLAN_UPGRADE_REQUIRED" || error?.data?.code === "PLAN_UPGRADE_REQUIRED") {
        addToast({
          title: "Plan upgrade required",
          description: "Filing pack generation requires Basic plan or higher.",
          variant: "error",
        });
      } else {
        addToast({
          title: "Generation failed",
          description: errorMessage,
          variant: "error",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!pack) return;

    try {
      setGenerating(true);
      setError(null);
      await regenerateFilingPack(businessId, pack.id);
      await loadPack();
      startPolling();
      addToast({
        title: "Pack regeneration started",
        description: "A new version is being generated.",
        variant: "success",
      });
    } catch (error: any) {
      const errorMessage =
        error?.data?.message || error?.message || "Failed to regenerate filing pack";
      setError(errorMessage);
      addToast({
        title: "Regeneration failed",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const loadHistory = async () => {
    try {
      const result = await getFilingPackHistory(businessId, year);
      setHistory(result.packs);
      setShowHistory(true);
    } catch (error: any) {
      addToast({
        title: "Failed to load history",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      queued: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        icon: Clock,
        label: "Queued",
      },
      generating: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        icon: Loader2,
        label: "Generating",
      },
      ready: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        icon: FileText,
        label: "Ready",
      },
      failed: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: AlertCircle,
        label: "Failed",
      },
    };
    return badges[status] || badges.queued;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-800">
            FIRS Filing Pack
          </CardTitle>
          {pack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!showHistory) {
                  loadHistory();
                } else {
                  setShowHistory(false);
                }
              }}
              className="text-xs"
            >
              {showHistory ? "Hide" : "View"} history
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canGenerate ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <Lock className="h-4 w-4 text-amber-700" />
              <p className="text-sm text-amber-900">
                Filing pack generation requires Basic plan or higher.
              </p>
            </div>
            <Link href="/app/pricing">
              <Button variant="secondary" className="w-full text-sm">
                Upgrade to unlock
              </Button>
            </Link>
          </div>
        ) : pack ? (
          <>
            <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const badge = getStatusBadge(pack.status);
                    const Icon = badge.icon;
                    return (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.bg} ${badge.text}`}
                      >
                        {pack.status === "generating" ? (
                          <Icon className="h-3 w-3 animate-spin" />
                        ) : (
                          <Icon className="h-3 w-3" />
                        )}
                        {badge.label}
                      </span>
                    );
                  })()}
                  <span className="text-xs text-slate-500">Version {pack.version}</span>
                </div>
                <p className="text-sm font-medium text-slate-900">
                  Tax Year {pack.taxYear}
                </p>
                {pack.completedAt && (
                  <p className="text-xs text-slate-500 mt-1">
                    Completed {new Date(pack.completedAt).toLocaleDateString()}
                  </p>
                )}
                {pack.errorMessage && (
                  <p className="text-xs text-red-600 mt-1">{pack.errorMessage}</p>
                )}
              </div>
            </div>

            {pack.status === "ready" && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Download:</p>
                <div className="flex flex-wrap gap-2">
                  {pack.pdfUrl && (
                    <a
                      href={getFilingPackDownloadUrl(businessId, pack.id, "pdf")}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-3 w-3" />
                      PDF
                    </a>
                  )}
                  {pack.csvUrl && (
                    <a
                      href={getFilingPackDownloadUrl(businessId, pack.id, "csv")}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <FileSpreadsheet className="h-3 w-3" />
                      CSV
                    </a>
                  )}
                  {pack.zipUrl && (
                    <a
                      href={getFilingPackDownloadUrl(businessId, pack.id, "zip")}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Archive className="h-3 w-3" />
                      ZIP
                    </a>
                  )}
                </div>
              </div>
            )}

            {pack.status === "failed" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRegenerate}
                disabled={generating}
                className="w-full text-xs"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  "Try again"
                )}
              </Button>
            )}

            {pack.status !== "ready" && pack.status !== "failed" && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Pack is being generated. This may take a few minutes.</span>
              </div>
            )}

            {pack.status === "ready" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRegenerate}
                disabled={generating}
                className="w-full text-xs"
              >
                Generate new version
              </Button>
            )}

            {showHistory && history.length > 1 && (
              <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                <p className="text-xs font-medium text-slate-700">Previous versions:</p>
                {history
                  .filter((p) => p.id !== pack.id)
                  .map((p) => {
                    const badge = getStatusBadge(p.status);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div>
                          <span className="text-xs font-medium text-slate-900">
                            Version {p.version}
                          </span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        {p.status === "ready" && (
                          <div className="flex gap-1">
                            {p.pdfUrl && (
                              <a
                                href={getFilingPackDownloadUrl(businessId, p.id, "pdf")}
                                className="text-xs text-emerald-600 hover:text-emerald-700"
                              >
                                PDF
                              </a>
                            )}
                            {p.zipUrl && (
                              <a
                                href={getFilingPackDownloadUrl(businessId, p.id, "zip")}
                                className="text-xs text-emerald-600 hover:text-emerald-700"
                              >
                                ZIP
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Generate a FIRS-ready filing pack with PDF summary, CSV transactions, and all
              attachments in a ZIP bundle.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate FIRS filing pack"
              )}
            </Button>
            {error && (
              <p className="text-xs font-semibold text-red-600">{error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

