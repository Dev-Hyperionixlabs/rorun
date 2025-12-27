import type { Metadata } from "next";
import "./globals.css";
import { MockApiProvider } from "@/lib/mock-api";
import { InteractionAudit } from "@/components/dev/InteractionAudit";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Rorun – Tax Safety for Nigerian SMEs",
  description: "Keep your Nigerian SME tax-safe with simple eligibility, records and alerts.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <MockApiProvider>{children}</MockApiProvider>
          <InteractionAudit />
        </ToastProvider>
      </body>
    </html>
  );
}


