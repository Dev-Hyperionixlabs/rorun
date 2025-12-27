import type { Metadata } from "next";
import "./globals.css";
import { MockApiProvider } from "@/lib/mock-api";
import { InteractionAudit } from "@/components/dev/InteractionAudit";

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
        <MockApiProvider>{children}</MockApiProvider>
        <InteractionAudit />
      </body>
    </html>
  );
}


