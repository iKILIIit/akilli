"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@yield-copilot/ui";

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M2.5 8.5L9 3l6.5 5.5V15a.8.8 0 01-.8.8h-3.4v-4.5H6.7v4.5H3.3a.8.8 0 01-.8-.8V8.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 14V8M8 14V4M13 14v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 16h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M9 2.5l1.3 3.8L14 7.7l-3.7 1.3L9 12.8 7.7 9 4 7.7l3.7-1.4L9 2.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 12V8a5 5 0 0110 0v4l1.2 1.5H2.8L4 12z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.5 15.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function navMatch(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  if (href === "/position") {
    return pathname.startsWith("/position") || pathname.startsWith("/recommendation");
  }

  return pathname.startsWith(href);
}

function NavPill({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <>
      <span className="bottom-nav-link__icon-wrap">{icon}</span>
      <span>{label}</span>
    </>
  );
}

const navItems = [
  { href: "/", label: "Home", icon: <HomeIcon /> },
  { href: "/check", label: "Check", icon: <CheckIcon /> },
  { href: "/position", label: "Track", icon: <HistoryIcon /> },
  { href: "/alerts", label: "Alerts", icon: <SettingsIcon /> },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {navItems.map((item) => {
        const isActive = navMatch(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx("bottom-nav-link", isActive && "is-active")}
            aria-label={item.label}
          >
            <NavPill icon={item.icon} label={item.label} />
          </Link>
        );
      })}
    </nav>
  );
}
