"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/bank";
import { useToast } from "@/components/ui/toast";
import { Loader2, Link2 } from "lucide-react";
import { api as http } from "@/lib/api/client";

interface MonoConnectButtonProps {
  businessId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    MonoConnect: any;
    Connect: any;
  }
}

async function loadMonoScript(): Promise<void> {
  // Mono connect script defines window.Connect (not window.MonoConnect).
  // See: https://connect.withmono.com/connect.js
  if (typeof window === "undefined") return;
  if (window.Connect || window.MonoConnect) return;

  // Avoid adding the script tag multiple times
  const existing = Array.from(document.getElementsByTagName("script")).find((s) =>
    (s.src || "").includes("connect.withmono.com/connect.js")
  );
  if (!existing) {
    const script = document.createElement("script");
    script.src = "https://connect.withmono.com/connect.js";
    script.async = true;
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load bank connection SDK"));
      document.head.appendChild(script);
    });
  }

  // Poll briefly for the global to be attached (script can load before attaching globals)
  const started = Date.now();
  while (Date.now() - started < 3000) {
    if (window.Connect || window.MonoConnect) return;
    await new Promise((r) => setTimeout(r, 150));
  }
}

function resolveMonoConnector(): any | null {
  const w: any = typeof window !== "undefined" ? window : {};
  const candidates = [
    w.Connect,
    w.MonoConnect,
    w.Connect?.default,
    w.MonoConnect?.default,
    w.Connect?.MonoConnect,
    w.MonoConnect?.MonoConnect,
  ].filter(Boolean);

  return candidates[0] || null;
}

function createMonoInstance(Connector: any, options: any): any | null {
  if (!Connector) return null;

  // Function export: try `new`, then direct call.
  if (typeof Connector === "function") {
    try {
      return new Connector(options);
    } catch {
      try {
        return Connector(options);
      } catch {
        return null;
      }
    }
  }

  // Object export: try init/create factories.
  if (typeof Connector === "object") {
    const init = (Connector.init || Connector.create || Connector.connect) as any;
    if (typeof init === "function") {
      try {
        return init(options);
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function MonoConnectButton({
  businessId,
  onSuccess,
  onError,
}: MonoConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [periodDays, setPeriodDays] = useState(90);
  const [consentText, setConsentText] = useState("");
  const [consentTextVersion, setConsentTextVersion] = useState("");
  const { addToast } = useToast();
  const allowNonNg =
    (process.env.NEXT_PUBLIC_BANK_CONNECT_ALLOW_NON_NG ?? "true").toLowerCase() === "true";

  const handleConnectClick = async () => {
    try {
      setLoading(true);

      // Get Mono config from server (includes consent text)
      const config = await api.initMono(businessId);
      setConsentText(config.consentText);
      setConsentTextVersion(config.consentTextVersion);
      setShowConsentModal(true);
    } catch (error: any) {
      const message = error?.message || "Failed to initialize bank connection";
      addToast({
        title: "Error",
        description: message,
        variant: "error",
      });
      await api
        .logConnectAttempt(businessId, {
          provider: "mono",
          success: false,
          reason: error?.code || message,
        })
        .catch(() => {});
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConsentConfirm = async () => {
    if (!consentAccepted) {
      addToast({
        title: "Consent required",
        description: "You must accept the consent to connect your bank account.",
        variant: "error",
      });
      return;
    }

    setShowConsentModal(false);
    setConnecting(true);

    try {
      // Optional geo guard (configurable). Default allows non-NG to attempt connect.
      let countryCode: string | null = null;
      try {
        const geo = await http.get<{ countryCode: string | null; isNG: boolean | null }>(`/geo`, {
          skipAuth: true,
          timeoutMs: 6000,
        });
        countryCode = geo?.countryCode || null;
        if (!allowNonNg && geo?.isNG === false) {
          await api
            .logConnectAttempt(businessId, {
              provider: "mono",
              success: false,
              reason: "GEO_BLOCK",
              countryCode: countryCode || undefined,
            })
            .catch(() => {});
          throw new Error("Bank connect is not available in your region. Please use Upload statement.");
        }
      } catch {
        // Best-effort only: do not block on geo failures.
      }

      try {
        await loadMonoScript();
      } catch {
        await api
          .logConnectAttempt(businessId, {
            provider: "mono",
            success: false,
            reason: "SDK_LOAD_FAIL",
            countryCode: countryCode || undefined,
          })
          .catch(() => {});
        throw new Error(
          "Bank connection could not load. This is often caused by browser protections or network filtering. Try disabling content blockers for rorun.ng, or use Upload statement."
        );
      }

      // Mono's script defines `window.Connect` (preferred). Keep backward-compat with `window.MonoConnect`.
      const Connector = resolveMonoConnector();
      if (!Connector) {
        await api
          .logConnectAttempt(businessId, {
            provider: "mono",
            success: false,
            reason: "SDK_NOT_AVAILABLE",
            countryCode: countryCode || undefined,
          })
          .catch(() => {});
        throw new Error(
          "Bank connector loaded but didn't initialize correctly in this browser. Please try Chrome/Safari without content blockers, or use Upload statement."
        );
      }

      // Get Mono config again to ensure we have the latest publicKey
      const config = await api.initMono(businessId);

      const monoInstance = createMonoInstance(Connector, {
        key: config.publicKey,
        onSuccess: async (payload: any) => {
          try {
            const code =
              payload?.code ||
              payload?.authorizationCode ||
              payload?.authorization_code;
            if (!code) {
              throw new Error("Mono did not return an authorization code.");
            }
            // Exchange code for connection with consent and scope
            const connection = await api.exchangeMono(businessId, {
              code,
              consentAccepted: true,
              scope: { periodDays },
              consentTextVersion: config.consentTextVersion,
            });

            // Immediately sync and import transactions so compliance evaluation can use the data.
            try {
              await api.syncConnection(businessId, connection.id);
            } catch (syncErr: any) {
              // Non-blocking: connection still succeeded.
              await api
                .logConnectAttempt(businessId, {
                  provider: "mono",
                  success: false,
                  reason: `SYNC_FAILED:${syncErr?.code || syncErr?.message || "unknown"}`,
                })
                .catch(() => {});
            }
            await api
              .logConnectAttempt(businessId, {
                provider: "mono",
                success: true,
              })
              .catch(() => {});
            addToast({
              title: "Bank connected",
              description: "Connected and syncing transactions for compliance evaluation.",
              variant: "success",
            });
            onSuccess?.();
          } catch (error: any) {
            const message = error?.message || "Failed to connect bank account";
            addToast({
              title: "Connection failed",
              description: message,
              variant: "error",
            });
            await api
              .logConnectAttempt(businessId, {
                provider: "mono",
                success: false,
                reason: error?.code || message,
              })
              .catch(() => {});
            onError?.(message);
          } finally {
            setConnecting(false);
          }
        },
        onClose: () => {
          setConnecting(false);
        },
      });

      if (!monoInstance) {
        await api
          .logConnectAttempt(businessId, {
            provider: "mono",
            success: false,
            reason: "SDK_SHAPE_UNEXPECTED",
            countryCode: countryCode || undefined,
          })
          .catch(() => {});
        throw new Error(
          "Bank connector could not start in this browser. Please use Upload statement or try another browser."
        );
      }

      // Different SDK shapes use different method names.
      try { monoInstance.setup?.(); } catch {}
      try { monoInstance.open?.(); } catch {}
      try { monoInstance.show?.(); } catch {}
    } catch (error: any) {
      const message = error?.message || "Failed to initialize bank connection";
      addToast({
        title: "Error",
        description: message,
        variant: "error",
      });
      onError?.(message);
      setConnecting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleConnectClick}
        disabled={loading || connecting}
        className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
      >
        {loading || connecting ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            {connecting ? "Connecting..." : "Loading..."}
          </>
        ) : (
          <>
            <Link2 className="mr-1.5 h-4 w-4" />
            Connect your bank
          </>
        )}
      </Button>

      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Bank Connection Consent
            </h3>
            <p className="text-sm text-slate-600 mb-4">{consentText}</p>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Import period:
              </label>
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              >
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-slate-700">
                  I accept the terms and consent to connect my bank account
                </span>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConsentModal(false);
                  setConsentAccepted(false);
                }}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConsentConfirm}
                disabled={!consentAccepted}
                className="text-sm bg-emerald-600 hover:bg-emerald-700"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

