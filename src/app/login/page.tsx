import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getPanelUser } from "@/lib/panel/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Logg inn · Giret",
  description: "Logg inn for å se oversikter over elbilen din.",
};

export default async function LoginPage() {
  const { email } = await getPanelUser();

  if (email) {
    redirect("/app");
  }

  return (
    <main className="landing login-page">
      <div className="login-card">
        <Link className="landing-wordmark" href="/">
          <span aria-hidden="true" className="landing-logo-mark">
            <span />
          </span>
          Giret
        </Link>
        <p className="landing-overline">Innlogging</p>
        <h1>Åpne panelet for bilen din.</h1>
        <p>
          Utsiden forklarer produktet. Innsiden er oversiktene: batterinivå,
          rekkevidde, lading og historikk.
        </p>
        <form action="/api/panel/session" method="post">
          <button className="login-button" type="submit">
            Logg inn
          </button>
        </form>
        <Link className="login-back" href="/">
          Tilbake til forsiden
        </Link>
      </div>
    </main>
  );
}
