"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app", label: "Oversikt" },
  { href: "/app/historikk", label: "Historikk" },
  { href: "/app/rapport", label: "Salgsrapport" },
];

export function PanelNavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Panelmeny">
      {links.map((link) => {
        const active =
          link.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(link.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : undefined}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
