import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: "Giret · Tryggere kjøp og salg av brukt elbil",
  description:
    "Historikk for 1 000 kr i året. Salgsrapport for 400 kr. Følg rekkevidde og lading over tid, som supplement til uavhengig batterikontroll.",
  openGraph: {
    title: "Giret · Tryggere kjøp og salg av brukt elbil",
    description:
      "Følg batterinivå og rekkevidde over tid for 1 000 kr i året, eller del en salgsrapport for 400 kr.",
    locale: "nb_NO",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={sans.variable}
      lang="nb"
    >
      <body>{children}</body>
    </html>
  );
}
