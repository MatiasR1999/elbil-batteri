import Link from "next/link";

import { PanelNavLinks } from "@/components/panel-nav-links";

export function PanelNav({ email }: { email: string }) {
  return (
    <aside className="panel-nav">
      <Link className="panel-wordmark" href="/">
        Giret
      </Link>
      <p className="panel-nav-kicker">Min bil</p>
      <PanelNavLinks />
      <div className="panel-nav-user">
        <span>{email}</span>
        <form action="/api/panel/session" method="post">
          <input name="intent" type="hidden" value="out" />
          <button type="submit">Logg ut</button>
        </form>
      </div>
    </aside>
  );
}
