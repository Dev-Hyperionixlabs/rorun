"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getTask,
  startTask,
  completeTask,
  dismissTask,
  addEvidence,
  removeEvidence,
  ComplianceTask,
} from "@/lib/api/compliance";
import { getDocuments, Document } from "@/lib/api/documents";
import { getBusinesses } from "@/lib/api/businesses";
import { useToast } from "@/components/ui/toast";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Paperclip,
  X,
  Upload,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useFeatures } from "@/hooks/use-features";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [task, setTask] = useState<ComplianceTask | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const { addToast } = useToast();
  const { hasFeature } = useFeatures(businessId);

  useEffect(() => {
    loadBusiness();
  }, []);

  useEffect(() => {
    if (businessId) {
      loadTask();
      loadDocuments();
    }
  }, [businessId, taskId]);

  const loadBusiness = async () => {
    try {
      const businesses = await getBusinesses();
      if (businesses && businesses.length > 0) {
        setBusinessId(businesses[0].id);
      }
    } catch (error: any) {
      console.error("Failed to load business:", error);
    }
  };

  const loadTask = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const data = await getTask(businessId, taskId);
      setTask(data);
    } catch (error: any) {
      addToast({
        title: "Failed to load task",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
      router.push("/app/tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!businessId) return;

    try {
      const data = await getDocuments(businessId);
      setDocuments(data);
    } catch (error: any) {
      console.error("Failed to load documents:", error);
    }
  };

  const handleAction = async (action: "start" | "complete" | "dismiss") => {
    if (!businessId || !task) return;

    try {
      setActionLoading(action);
      if (action === "start") {
        await startTask(businessId, task.id);
      } else if (action === "complete") {
        await completeTask(businessId, task.id);
      } else {
        await dismissTask(businessId, task.id);
      }
      addToast({
        title: `Task ${action === "start" ? "started" : action === "complete" ? "completed" : "dismissed"}`,
        variant: "success",
      });
      await loadTask();
    } catch (error: any) {
      const requestId = error?.data?.requestId || error?.data?.requestID || error?.data?.request_id;
      addToast({
        title: "Action failed",
        description:
          (error?.message || "Please try again later.") +
          (requestId ? ` (requestId: ${requestId})` : ""),
        variant: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddEvidence = async () => {
    if (!businessId || !task || !selectedDocumentId) return;

    try {
      await addEvidence(businessId, task.id, selectedDocumentId);
      addToast({
        title: "Evidence added",
        variant: "success",
      });
      setShowEvidenceModal(false);
      setSelectedDocumentId("");
      await loadTask();
    } catch (error: any) {
      addToast({
        title: "Failed to add evidence",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    }
  };

  const handleRemoveEvidence = async (linkId: string) => {
    if (!businessId || !task) return;

    try {
      await removeEvidence(businessId, task.id, linkId);
      addToast({
        title: "Evidence removed",
        variant: "success",
      });
      await loadTask();
    } catch (error: any) {
      addToast({
        title: "Failed to remove evidence",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      overdue: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: AlertCircle,
        label: "Overdue",
      },
      open: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        icon: Clock,
        label: "Open",
      },
      in_progress: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        icon: Clock,
        label: "In Progress",
      },
      done: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        icon: CheckCircle2,
        label: "Done",
      },
      dismissed: {
        bg: "bg-slate-100",
        text: "text-slate-700",
        icon: XCircle,
        label: "Dismissed",
      },
    };
    return badges[status] || badges.open;
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLinkedDocumentIds = () => {
    return new Set(task?.evidenceLinks?.map((link) => link.documentId) || []);
  };

  const availableDocuments = documents.filter(
    (doc) => !getLinkedDocumentIds().has(doc.id)
  );

  const requiredTypes = task?.evidenceSpecJson?.requiredTypes || [];

  if (loading || !businessId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-slate-500">Task not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const badge = getStatusBadge(task.status);
  const Icon = badge.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/app/tasks">
          <Button variant="ghost" size="sm" className="text-xs">
            ← Back to tasks
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.bg} ${badge.text}`}
                >
                  <Icon className="h-3 w-3" />
                  {badge.label}
                </span>
                <span className="text-xs text-slate-500">
                  {task.category} • {task.frequency}
                </span>
              </div>
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <p className="mt-2 text-sm text-slate-600">{task.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>Due: {formatDueDate(task.dueDate)}</span>
                {task.completedAt && (
                  <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>
                )}
              </div>
              {task.taskKey?.startsWith("annual_return") && hasFeature("yearEndFilingPack") && (
                <div className="mt-4">
                  <Link href={`/app/filing-wizard/${task.taxYear}/annual`}>
                    <Button variant="secondary" size="sm" className="text-xs">
                      <FileText className="mr-1.5 h-3 w-3" />
                      Open guided filing wizard
                    </Button>
                  </Link>
                </div>
              )}
            </div>
            <div className="ml-4 flex flex-col gap-2">
              {task.status === "open" || task.status === "overdue" ? (
                <Button
                  size="sm"
                  variant={task.status === "overdue" ? "danger" : "primary"}
                  onClick={() => handleAction("start")}
                  disabled={actionLoading === "start"}
                >
                  {actionLoading === "start" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Start"
                  )}
                </Button>
              ) : task.status === "in_progress" ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleAction("complete")}
                  disabled={actionLoading === "complete"}
                >
                  {actionLoading === "complete" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Mark complete"
                  )}
                </Button>
              ) : null}
              {task.status !== "done" && task.status !== "dismissed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAction("dismiss")}
                  disabled={actionLoading === "dismiss"}
                >
                  {actionLoading === "dismiss" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Dismiss"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Evidence Section */}
      {task.evidenceRequired && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800">
                Evidence
              </CardTitle>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowEvidenceModal(true)}
              >
                <Paperclip className="mr-1.5 h-3 w-3" />
                Attach document
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {requiredTypes.length > 0 && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-700 mb-1">
                  Required evidence types:
                </p>
                <div className="flex flex-wrap gap-2">
                  {requiredTypes.map((type) => (
                    <span
                      key={type}
                      className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700"
                    >
                      {type.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {task.evidenceLinks && task.evidenceLinks.length > 0 ? (
              <div className="space-y-2">
                {task.evidenceLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {link.document?.type || "Document"}
                        </p>
                        {link.note && (
                          <p className="text-xs text-slate-500">{link.note}</p>
                        )}
                        <p className="text-xs text-slate-400">
                          Added {new Date(link.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const href = (((link.document as any)?.viewUrl) || link.document?.storageUrl) as
                          | string
                          | undefined;
                        if (!href) return null;
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            View
                          </a>
                        );
                      })()}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveEvidence(link.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No evidence attached yet. Click &quot;Attach document&quot; to add evidence.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evidence Modal */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Attach Document
            </h3>
            <div className="space-y-3">
              {availableDocuments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No available documents.{" "}
                  <Link href="/app/documents" className="text-emerald-600 hover:text-emerald-700">
                    Upload a document
                  </Link>{" "}
                  first.
                </p>
              ) : (
                <>
                  <label className="text-sm font-medium text-slate-700 block">
                    Select document:
                  </label>
                  <select
                    value={selectedDocumentId}
                    onChange={(e) => setSelectedDocumentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="">Choose a document...</option>
                    {availableDocuments.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.type || "Document"} - {new Date(doc.createdAt).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowEvidenceModal(false);
                  setSelectedDocumentId("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEvidence}
                disabled={!selectedDocumentId}
              >
                Attach
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

