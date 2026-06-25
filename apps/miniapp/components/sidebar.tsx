"use client";

import Link from "next/link";

type Balance = {
  symbol: string;
  displayAmount: string;
  hasBalance: boolean;
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  balances: Balance[];
  totalPortfolioUSD: number;
  walletAddress: string | undefined;
  walletSummary: string;
  onNewChat: () => void;
};

// ── Token logos ───────────────────────────────────────────────────────────────

function TokenLogo({ symbol }: { symbol: string }) {
  if (symbol === "USDC")
    return (
      <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#2775CA" />
        <text x="16" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="Arial,sans-serif">USDC</text>
      </svg>
    );
  if (symbol === "USDT")
    return (
      <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#26A17B" />
        <text x="16" y="21" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="Arial,sans-serif">₮</text>
      </svg>
    );
  return <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--ink-40)", display: "inline-block" }} />;
}

// ── Nav icons (same SVG style as bottom-nav) ──────────────────────────────────

function BudgetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 7h6M6 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="currentColor" />
    </svg>
  );
}

function AlertsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 12V8a5 5 0 0110 0v4l1.2 1.5H2.8L4 12z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.5 15.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function FxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 6h12M3 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 4l2 2-2 2M7 10l-2 2 2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 14V8M7 14V4M11 14v-7M15 14V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 13V6a3 3 0 013-3h6a3 3 0 013 3v4a3 3 0 01-3 3H7l-4 2v-2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7 8h4M7 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const navItems = [
  { href: "/budget",             label: "Spend Sheet",  Icon: BudgetIcon  },
  { href: "/alerts",             label: "Alerts",       Icon: AlertsIcon  },
  { href: "/fx",                 label: "FX Rates",     Icon: FxIcon      },
  { href: "/audit",              label: "Audit Trail",  Icon: AuditIcon   },
  { href: "/copilot?tab=insights", label: "Insights",   Icon: InsightsIcon },
  { href: "/support",            label: "Support",      Icon: SupportIcon },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar({
  isOpen,
  onClose,
  balances,
  totalPortfolioUSD,
  walletAddress,
  walletSummary,
  onNewChat,
}: SidebarProps) {
  const positiveBalances = balances.filter((b) => b.hasBalance);

  return (
    <>
      <div
        className={`sidebar-overlay${isOpen ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${isOpen ? " is-open" : ""}`} aria-label="Navigation">

        {/* Header */}
        <div className="sidebar__header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="dashboard-brand__mark">A</span>
            <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.03em" }}>
              Akili
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-soft)",
              cursor: "pointer",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Wallet balance */}
        <div className="sidebar__wallet">
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: walletAddress ? "var(--green)" : "var(--amber)", flexShrink: 0,
            }} />
            <span style={{ fontSize: "11px", color: "var(--ink-55)" }}>{walletSummary}</span>
            {walletAddress && totalPortfolioUSD > 0 && (
              <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 600, color: "var(--ink-70)", fontFamily: "var(--font-mono)" }}>
                ${totalPortfolioUSD.toFixed(2)}
              </span>
            )}
          </div>
          {walletAddress && positiveBalances.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {positiveBalances.map((b) => (
                <div key={b.symbol} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "6px 8px", borderRadius: "10px", background: "var(--bg-soft)",
                }}>
                  <TokenLogo symbol={b.symbol} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>{b.symbol}</span>
                  <span style={{ marginLeft: "auto", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--ink-70)" }}>
                    {b.displayAmount}
                  </span>
                </div>
              ))}
            </div>
          )}
          {walletAddress && positiveBalances.length === 0 && (
            <p style={{ fontSize: "11px", color: "var(--ink-40)", margin: 0 }}>No stable balances yet</p>
          )}
        </div>

        {/* New Chat */}
        <button
          type="button"
          onClick={() => { onNewChat(); onClose(); }}
          className="sidebar__new-chat"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          New Chat
        </button>

        {/* Nav links */}
        <nav className="sidebar__nav">
          {navItems.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="sidebar__nav-link" onClick={onClose}>
              <span className="sidebar__nav-icon">
                <Icon />
              </span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <span style={{ fontSize: "11px", color: "var(--ink-40)" }}>
            Built on Celo · Powered by Akili AI
          </span>
          <div style={{ display: "flex", gap: "14px", marginTop: "6px" }}>
            {[
              { label: "Terms",   href: "/legal/terms"   },
              { label: "Privacy", href: "/legal/privacy" },
              { label: "Stats",   href: "/stats"         },
            ].map((item) => (
              <Link key={item.href} href={item.href} onClick={onClose}
                style={{ fontSize: "11px", color: "var(--ink-55)" }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

      </aside>
    </>
  );
}
