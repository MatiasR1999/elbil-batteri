import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { PanelNav } from "@/components/panel-nav";
import { getPanelUser } from "@/lib/panel/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel · Giret",
  description: "Oversikter over elbilen din.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { email } = await getPanelUser();

  if (!email) {
    redirect("/login");
  }

  return (
    <div className="landing panel">
      <PanelNav email={email} />
      <div className="panel-main">{children}</div>
    </div>
  );
}
