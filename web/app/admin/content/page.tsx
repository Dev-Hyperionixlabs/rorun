"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";

interface Article {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  language: string;
  createdAt: string;
}

export default function ContentPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Article>>({});
  const [creating, setCreating] = useState(false);

  const adminKey =
    typeof window !== "undefined"
      ? localStorage.getItem("rorun_admin_key") || ""
      : "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(`${apiUrl}/admin/knowledge-articles`, {
          headers: { "x-admin-key": adminKey },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setArticles(data || []);
      } catch (err) {
        // Mock fallback
        setArticles([
          {
            id: "art-1",
            title: "What is CIT?",
            summary: "Understanding Company Income Tax in Nigeria.",
            body: "Company Income Tax (CIT) is a tax levied on the profits of companies operating in Nigeria...",
            category: "taxes",
            language: "en",
            createdAt: new Date().toISOString(),
          },
          {
            id: "art-2",
            title: "VAT Basics",
            summary: "Learn about Value Added Tax requirements.",
            body: "VAT is charged at 7.5% on goods and services...",
            category: "taxes",
            language: "en",
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [adminKey, apiUrl]);

  const startEdit = (article: Article) => {
    setEditingId(article.id);
    setEditForm({ ...article });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setCreating(false);
  };

  const saveArticle = async () => {
    try {
      if (creating) {
        const res = await fetch(`${apiUrl}/admin/knowledge-articles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify(editForm),
        });
        const newArticle = await res.json();
        setArticles([newArticle, ...articles]);
      } else if (editingId) {
        await fetch(`${apiUrl}/admin/knowledge-articles/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify(editForm),
        });
        setArticles(
          articles.map((a) =>
            a.id === editingId ? { ...a, ...editForm } : a
          ) as Article[]
        );
      }
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      cancelEdit();
    }
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setEditForm({
      title: "",
      summary: "",
      body: "",
      category: "taxes",
      language: "en",
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading content...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Knowledge Articles
          </h1>
          <p className="text-sm text-slate-500">
            Manage educational content for the Education Hub.
          </p>
        </div>
        <Button onClick={startCreate} disabled={creating}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Article
        </Button>
      </div>

      {creating && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              New Article
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Title"
              value={editForm.title || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, title: e.target.value })
              }
            />
            <Input
              placeholder="Summary"
              value={editForm.summary || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, summary: e.target.value })
              }
            />
            <textarea
              placeholder="Body (Markdown supported)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={4}
              value={editForm.body || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, body: e.target.value })
              }
            />
            <div className="flex gap-3">
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={editForm.category || "taxes"}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
              >
                <option value="taxes">Taxes</option>
                <option value="compliance">Compliance</option>
                <option value="bookkeeping">Bookkeeping</option>
                <option value="firs">FIRS</option>
              </select>
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={editForm.language || "en"}
                onChange={(e) =>
                  setEditForm({ ...editForm, language: e.target.value })
                }
              >
                <option value="en">English</option>
                <option value="pidgin">Pidgin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveArticle}>
                <Save className="mr-1.5 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {articles.map((article) => (
          <Card key={article.id}>
            <CardContent className="py-4">
              {editingId === article.id ? (
                <div className="space-y-3">
                  <Input
                    value={editForm.title || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                  />
                  <Input
                    value={editForm.summary || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, summary: e.target.value })
                    }
                  />
                  <textarea
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    rows={4}
                    value={editForm.body || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, body: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveArticle}>
                      <Save className="mr-1.5 h-4 w-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      <X className="mr-1.5 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {article.summary}
                    </p>
                    <div className="mt-2 flex gap-2 text-[10px]">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                        {article.category}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                        {article.language}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(article)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

