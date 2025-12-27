"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, BankConnection } from "@/lib/api/bank";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, Unlink, Loader2, Building2 } from "lucide-react";

interface BankConnectionsPanelProps {
  businessId: string;
}

export function BankConnectionsPanel({ businessId }: BankConnectionsPanelProps) {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [syncCooldown, setSyncCooldown] = useState<Record<string, number>>({});
  const { addToast } = useToast();

  useEffect(() => {
    loadConnections();
  }, [businessId]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await api.getConnections(businessId);
      setConnections(data);
    } catch (error: any) {
      addToast({
        title: "Failed to load connections",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (connectionId: string) => {
    try {
      setSyncing(connectionId);
      const result = await api.syncConnection(businessId, connectionId);
      addToast({
        title: "Sync completed",
        description: `Imported ${result.importedCount} transactions, skipped ${result.skippedCount} duplicates.`,
        variant: "success",
      });
      await loadConnections();
    } catch (error: any) {
      // Handle SYNC_COOLDOWN error
      if (error?.code === "SYNC_COOLDOWN" || error?.data?.code === "SYNC_COOLDOWN") {
        const retryAfterSeconds = error?.data?.retryAfterSeconds || error?.retryAfterSeconds || 600;
        setSyncCooldown((prev) => ({
          ...prev,
          [connectionId]: retryAfterSeconds,
        }));
        
        // Start countdown timer
        const interval = setInterval(() => {
          setSyncCooldown((prev) => {
            const current = prev[connectionId];
            if (current && current > 0) {
              return { ...prev, [connectionId]: current - 1 };
            }
            clearInterval(interval);
            const newState = { ...prev };
            delete newState[connectionId];
            return newState;
          });
        }, 1000);

        addToast({
          title: "Sync cooldown",
          description: error?.message || error?.data?.message || "Sync recently requested. Try again in a few minutes.",
          variant: "error",
        });
      } else {
        addToast({
          title: "Sync failed",
          description: error?.message || "Please try again later.",
          variant: "error",
        });
      }
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Are you sure you want to disconnect this bank account?")) {
      return;
    }

    try {
      setDisconnecting(connectionId);
      await api.disconnectConnection(businessId, connectionId);
      addToast({
        title: "Disconnected",
        description: "Bank account has been disconnected.",
        variant: "success",
      });
      await loadConnections();
    } catch (error: any) {
      addToast({
        title: "Failed to disconnect",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (connections.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6">
          <div className="text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm text-slate-500">
              No bank accounts connected yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-800">
          Connected Banks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connections.map((conn) => (
          <div
            key={conn.id}
            className="flex items-start justify-between rounded-xl border border-slate-100 px-3 py-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {conn.institutionName || "Bank"}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    conn.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : conn.status === "error"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {conn.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {conn.accountName || "Account"} • {conn.accountNumberMasked || "****"}
              </p>
              {conn.lastSyncedAt && (
                <p className="text-xs text-slate-400 mt-1">
                  Last synced: {new Date(conn.lastSyncedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {conn.status !== "disconnected" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSync(conn.id)}
                  disabled={
                    syncing === conn.id ||
                    (syncCooldown[conn.id] ?? 0) > 0
                  }
                  className="text-xs"
                  title={
                    (syncCooldown[conn.id] ?? 0) > 0
                      ? `Try again in ${Math.ceil(syncCooldown[conn.id] / 60)} minutes`
                      : undefined
                  }
                >
                  {syncing === conn.id ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Syncing...
                    </>
                  ) : syncCooldown[conn.id] && syncCooldown[conn.id] > 0 ? (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      {Math.ceil(syncCooldown[conn.id] / 60)}m
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Sync
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDisconnect(conn.id)}
                disabled={disconnecting === conn.id}
                className="text-xs text-red-600 hover:text-red-700"
              >
                {disconnecting === conn.id ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="mr-1 h-3 w-3" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

