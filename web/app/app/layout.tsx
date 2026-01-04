import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import Script from "next/script";

export default function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      {/* Load Mono Connect SDK once globally (reduces per-click flakiness). */}
      <Script
        src="https://connect.withmono.com/connect.js"
        strategy="afterInteractive"
      />
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}


