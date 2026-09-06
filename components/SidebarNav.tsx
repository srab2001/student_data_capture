"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Highlights the current page — split out from Header so Header can stay an async server component. */
export function SidebarNav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Main">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="sidebar-link"
          aria-current={pathname === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
