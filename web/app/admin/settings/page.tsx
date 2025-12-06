"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const [adminKey, setAdminKey] = useState(
    typeof window !== "undefined"
      ? localStorage.getItem("rorun_admin_key") || ""
      : ""
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("rorun_admin_key", adminKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin Settings</h1>
        <p className="text-sm text-slate-500">
          Configure admin portal authentication.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Key className="h-4 w-4" />
            Admin API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">
            Enter your admin secret key to authenticate API requests. This key
            is stored locally in your browser.
          </p>
          <Input
            type="password"
            placeholder="Enter admin key..."
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleSave}>
              <Save className="mr-1.5 h-4 w-4" />
              Save Key
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600">
                ✓ Saved to local storage
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900">
            Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">API URL</span>
              <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Environment</span>
              <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {process.env.NODE_ENV}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

