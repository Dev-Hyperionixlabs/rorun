"use client";

import { useRef, useState } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Eye } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function DocumentsPage() {
  const { documents, addDocument } = useMockApi();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Add to mock data
    addDocument({
      id: `doc-${Date.now()}`,
      fileName: file.name,
      type: file.type.includes("pdf") ? "pdf" : "image",
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    });

    addToast({
      title: "Document uploaded",
      description: `${file.name} has been added successfully.`,
    });

    setUploading(false);
    e.target.value = "";
  };

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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

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
                      {doc.type} • {new Date(doc.uploadedAt).toDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.url && (
                    <a
                      href={doc.url}
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

