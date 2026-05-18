import type { PropsWithChildren, ReactNode } from "react";
import Link from "next/link";
import { BottomNav } from "./bottom-nav";

type AppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  intro: string;
  aside?: ReactNode;
  backHref?: string;
  rightSlot?: ReactNode;
  step?: {
    current: number;
    total: number;
    label: string;
  };
  /** When true, hides the hero panel and uses minimal chrome */
  minimal?: boolean;
}>;

export function AppShell({
  eyebrow,
  title,
  intro,
  aside,
  backHref,
  rightSlot,
  children,
  step,
  minimal,
}: AppShellProps) {
  if (minimal) {
    return (
      <main className="page-shell">
        <div className="app-surface app-surface--minimal">
          <section className="content-grid">{children}</section>
          <BottomNav />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="app-surface">
        <header className="app-topbar">
          {backHref ? (
            <Link href={backHref} className="top-icon-button" aria-label="Go back">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M11 3.5L4.5 9l6.5 5.5M5 9h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : (
            <div className="brand-lockup">
              <Link href="/" className="brand-kicker">
                Yield Copilot
              </Link>
            </div>
          )}
          <div className="top-status-wrap">
            {rightSlot ?? (step ? <div className="top-status">{step.current}/{step.total} · {step.label}</div> : <div className="top-status">Celo live</div>)}
          </div>
        </header>

        <section className="hero-panel">
          {step ? (
            <div className="step-line">
              <div className="step-track" aria-hidden="true">
                {Array.from({ length: step.total }).map((_, index) => (
                  <span
                    key={index}
                    className={index < step.current ? "step-track__item is-active" : "step-track__item"}
                  />
                ))}
              </div>
              <span>Step {step.current} of {step.total}</span>
            </div>
          ) : null}
          <div className="hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="intro">{intro}</p>
          </div>
          {aside ? <div className="hero-aside">{aside}</div> : null}
        </section>

        <section className="content-grid">{children}</section>

        <BottomNav />
      </div>
    </main>
  );
}
