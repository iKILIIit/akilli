import type { PropsWithChildren, ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

type AppShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  intro: string;
  aside?: ReactNode;
  step?: {
    current: number;
    total: number;
    label: string;
  };
}>;

export function AppShell({
  eyebrow,
  title,
  intro,
  aside,
  children,
  step
}: AppShellProps) {
  return (
    <main className="page-shell">
      <div className="app-surface">
        <header className="app-topbar">
          <div className="brand-lockup">
            <p className="brand-kicker">MiniPay Yield Copilot</p>
            <p className="brand-subtle">MiniPay savings companion</p>
          </div>
          <div className="top-status">Celo</div>
        </header>

        <section className="hero-panel">
          <div className="hero-row">
            <div className="hero-strip">
              <span className="device-pill">MiniPay only</span>
              <span className="device-pill muted">Stablecoins</span>
            </div>
            {step ? (
              <div className="step-badge">
                <span>
                  {step.current}/{step.total}
                </span>
                <strong>{step.label}</strong>
              </div>
            ) : null}
          </div>
          <div className="hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="intro">{intro}</p>
          </div>
          {step ? (
            <div className="progress-track" aria-hidden="true">
              <span
                className="progress-fill"
                style={{ width: `${(step.current / step.total) * 100}%` }}
              />
            </div>
          ) : null}
          {aside ? <div className="hero-aside">{aside}</div> : null}
        </section>

        <section className="content-grid">{children}</section>

        <BottomNav />
      </div>
    </main>
  );
}
