import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

export function ScreenFrame({
  children,
  nav = true,
  className,
}: PropsWithChildren<{ nav?: boolean; className?: string }>) {
  return (
    <main className="page-shell">
      <div className={className ? `app-surface ${className}` : "app-surface"}>
        {children}
        {nav ? <BottomNav /> : null}
      </div>
    </main>
  );
}

export function HeaderBar({
  left,
  title,
  subtle,
  right,
}: {
  left?: ReactNode;
  title?: string;
  subtle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="app-topbar screen-topbar">
      <div className="screen-topbar__left">
        {left}
        {title ? (
          <div className="screen-topbar__title-wrap">
            <div className="screen-topbar__title">{title}</div>
            {subtle ? <div className="screen-topbar__subtle">{subtle}</div> : null}
          </div>
        ) : null}
      </div>
      <div className="screen-topbar__right">{right}</div>
    </header>
  );
}

export function BackButton({ href }: { href: string }) {
  return (
    <Link href={href} className="top-icon-button" aria-label="Go back">
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
        <path
          d="M11 3.5L4.5 9l6.5 5.5M5 9h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

export function StepDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="step-line">
      <div className="step-track" aria-hidden="true">
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={index < current ? "step-track__item is-active" : "step-track__item"}
          />
        ))}
      </div>
      <span>Step {current} of {total}</span>
    </div>
  );
}
