"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { api } from "@/lib/api/client";
import { X, Upload, FileText } from "lucide-react";

interface ImportWizardProps {
  businessId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportBatch {
  id: string;
  status: string;
  lines: ImportLine[];
}

interface ImportLine {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  direction: string;
  suggestedCategoryId: string | null;
}

export function ImportWizard({ businessId, onClose, onSuccess }: ImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sourceType, setSourceType] = useState<"csv" | "paste">("paste");
  const [rawText, setRawText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleStep1Next = async () => {
    if (sourceType === "paste" && !rawText.trim()) {
      addToast({
        title: "Error",
        description: "Please paste your statement text",
        variant: "error",
      });
      return;
    }

    if (sourceType === "csv" && !csvFile) {
      addToast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    try {
      let createDto: any = { sourceType };
      
      if (sourceType === "paste") {
        createDto.rawText = rawText;
      } else {
        // For CSV, we'd upload the file first, then create import with documentId
        // For now, read file content and send as rawText
        const text = await csvFile!.text();
        createDto.rawText = text;
        createDto.sourceType = "csv";
      }

      const result = await api.post<{ id: string }>(
        `/businesses/${businessId}/imports`,
        createDto
      );

      setBatchId(result.id);
      
      // Parse the import
      await api.post(`/businesses/${businessId}/imports/${result.id}/parse`);
      
      // Fetch the batch with lines
      const batchData = await api.get<ImportBatch>(
        `/businesses/${businessId}/imports/${result.id}`
      );
      
      setBatch(batchData);
      setSelectedLines(new Set(batchData.lines.map((l) => l.id)));
      setStep(2);
    } catch (e: any) {
      addToast({
        title: "Import failed",
        description: e?.message || "Failed to create import",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Next = () => {
    if (selectedLines.size === 0) {
      addToast({
        title: "No lines selected",
        description: "Please select at least one line to import",
        variant: "error",
      });
      return;
    }
    setStep(3);
  };

  const handleApprove = async () => {
    if (!batchId) return;

    setLoading(true);
    try {
      await api.post(`/businesses/${businessId}/imports/${batchId}/approve`, {
        lineIds: Array.from(selectedLines),
      });

      addToast({
        title: "Import successful",
        description: `Created ${selectedLines.size} transaction${selectedLines.size > 1 ? "s" : ""}`,
        variant: "success",
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      addToast({
        title: "Approval failed",
        description: e?.message || "Failed to create transactions",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLine = (lineId: string) => {
    const newSelected = new Set(selectedLines);
    if (newSelected.has(lineId)) {
      newSelected.delete(lineId);
    } else {
      newSelected.add(lineId);
    }
    setSelectedLines(newSelected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex items-center justify-between pb-2">
          <CardTitle className="text-lg">Import bank statement</CardTitle>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto space-y-4">
          {/* Step 1: Choose method */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setSourceType("paste")}
                  className={`flex-1 rounded-xl border p-4 text-left ${
                    sourceType === "paste"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">Paste statement</div>
                  <div className="text-xs text-slate-600">
                    Copy and paste your bank statement text
                  </div>
                </button>
                <button
                  onClick={() => setSourceType("csv")}
                  className={`flex-1 rounded-xl border p-4 text-left ${
                    sourceType === "csv"
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">Upload CSV</div>
                  <div className="text-xs text-slate-600">
                    Upload a CSV file with transactions
                  </div>
                </button>
              </div>

              {sourceType === "paste" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">
                    Paste your statement
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Date | Description | Amount&#10;01/01/2024 | Payment from Client | ₦50,000&#10;02/01/2024 | Office supplies | ₦15,000"
                    className="w-full h-48 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
              )}

              {sourceType === "csv" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">
                    Select CSV file
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && batch && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Preview parsed lines ({batch.lines.length} found)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Select the lines you want to import. Uncheck any you want to skip.
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-auto">
                {batch.lines.map((line) => (
                  <label
                    key={line.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                      selectedLines.has(line.id)
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLines.has(line.id)}
                      onChange={() => toggleLine(line.id)}
                      className="rounded border-slate-300"
                    />
                    <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                      <div className="text-slate-600">
                        {new Date(line.date).toLocaleDateString()}
                      </div>
                      <div className="col-span-2 text-slate-900">
                        {line.description || "No description"}
                      </div>
                      <div className={`font-semibold text-right ${
                        line.direction === "credit" ? "text-emerald-700" : "text-red-700"
                      }`}>
                        {line.direction === "credit" ? "+" : "-"}₦{Number(line.amount).toLocaleString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="text-xs text-slate-500">
                {selectedLines.size} of {batch.lines.length} lines selected
              </div>
            </div>
          )}

          {/* Step 3: Approve */}
          {step === 3 && (
            <div className="space-y-4 text-center py-8">
              <div className="rounded-full bg-emerald-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Ready to import
              </h3>
              <p className="text-sm text-slate-600">
                This will create {selectedLines.size} transaction{selectedLines.size > 1 ? "s" : ""} in your account.
              </p>
            </div>
          )}
        </CardContent>

        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              Back
            </Button>
          )}
          {step === 1 && (
            <div />
          )}
          <div className="flex gap-2 ml-auto">
            {step < 3 ? (
              <Button
                onClick={step === 1 ? handleStep1Next : handleStep2Next}
                disabled={loading}
              >
                {loading ? "Processing..." : step === 1 ? "Parse" : "Continue"}
              </Button>
            ) : (
              <Button onClick={handleApprove} disabled={loading}>
                {loading ? "Creating..." : "Approve & Import"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

