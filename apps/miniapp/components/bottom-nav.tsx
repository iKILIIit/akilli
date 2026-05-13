"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@yield-copilot/ui";

const navItems = [
  { href: "/", label: "Start" },
  { href: "/recommendation", label: "Result" },
  { href: "/position", label: "Position" },
  { href: "/alerts", label: "Alerts" }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx("bottom-nav-link", isActive && "is-active")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
