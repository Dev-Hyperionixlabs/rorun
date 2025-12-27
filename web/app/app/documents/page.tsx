"use client";

import { Suspense, useRef, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Eye, Lock, Landmark } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { useFeatures } from "@/hooks/use-features";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <DocumentsPageInner />
    </Suspense>
  );
}

function DocumentsPageInner() {
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter");
  const { documents, addDocument, transactions, loading, currentBusinessId, businesses } = useMockApi();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const businessId = currentBusinessId || businesses[0]?.id || null;
  const { hasFeature } = useFeatures(businessId);
  const canConnectBank = businessId ? hasFeature("bank_connect") : false;

  // Find high-value transactions without receipts
  const highValueWithoutDocs = useMemo(() => {
    if (filter !== "missing-receipts") return [];
    const HIGH_VALUE_THRESHOLD = 50000; // ₦50,000
    const currentYear = new Date().getFullYear();
    return transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        return (
          d.getFullYear() === currentYear &&
          tx.type === "expense" &&
          tx.amount >= HIGH_VALUE_THRESHOLD &&
          !tx.hasDocument
        );
      })
      .slice(0, 5);
  }, [filter, transactions]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      await addDocument(file);
      addToast({
        title: "Document uploaded",
        description: `${file.name} has been added successfully.`,
      });
    } catch (err: any) {
      addToast({
        title: "Upload failed",
        description: err?.message || "Unable to upload document",
      });
    }

    setUploading(false);
    e.target.value = "";
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading documents…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500">
            Receipts and supporting files linked to transactions.
          </p>
        </div>
        <Button
          onClick={handleUploadClick}
          disabled={uploading}
          className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {/* Bank connection upsell (user requested visible upgrade CTA) */}
      {businessId && !canConnectBank && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-white/70 p-2 border border-amber-200">
                <Landmark className="h-4 w-4 text-amber-800" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Connect your bank</p>
                <p className="mt-1 text-xs text-amber-700">
                  Link your bank to pull transactions automatically and reduce manual entry. Requires Basic plan or higher.
                </p>
              </div>
              <Link href="/app/pricing">
                <Button size="sm" variant="secondary" className="text-xs">
                  <Lock className="mr-1 h-3.5 w-3.5" />
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {filter === "missing-receipts" && highValueWithoutDocs.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                High-value expenses missing receipts
              </p>
              <p className="text-xs text-amber-700">
                {highValueWithoutDocs.length} expense{highValueWithoutDocs.length > 1 ? "s" : ""} over ₦50,000 without receipts. Upload receipts to improve your tax safety score.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {highValueWithoutDocs.map((tx) => (
                  <div
                    key={tx.id}
                    className="text-xs bg-white px-2 py-1 rounded border border-amber-200"
                  >
                    {tx.description} • ₦{tx.amount.toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 mb-4">
              No documents yet. Upload a receipt to get started.
            </p>
            <Button
              onClick={handleUploadClick}
              disabled={uploading}
              className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white">
          <CardContent className="divide-y divide-slate-100 px-0">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {doc.type || doc.fileType || "Document"} •{" "}
                      {new Date(doc.uploadedAt || (doc as any).createdAt).toDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(doc.url || doc.fileUrl) && (
                    <a
                      href={doc.url || doc.fileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

