"use client";

import { useState } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";

export default function EducationPage() {
  const { knowledge } = useMockApi();
  const [selectedArticle, setSelectedArticle] = useState<typeof knowledge[0] | null>(null);

  if (selectedArticle) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to articles
        </button>

        <Card className="bg-white">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-700">
                {selectedArticle.language === "pidgin" ? "Pidgin" : "English"}
              </span>
              <CardTitle className="text-lg font-semibold text-slate-900">
                {selectedArticle.title}
              </CardTitle>
            </div>
            <button
              onClick={() => setSelectedArticle(null)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-slate max-w-none">
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {selectedArticle.content}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Education</h1>
        <p className="text-sm text-slate-500">Quick reads to stay tax-safe.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {knowledge.map((article) => (
          <Card key={article.id} className="bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-slate-800">
                  {article.title}
                </CardTitle>
                {article.language === "pidgin" && (
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                    Pidgin
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500 line-clamp-3">{article.content}</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-transparent"
                onClick={() => setSelectedArticle(article)}
              >
                Read →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

