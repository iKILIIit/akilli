"use client";

import { useState, useEffect, Suspense } from "react";
import { useMiniPay } from "../../hooks/use-minipay";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type SpendingCategory = { label: string; amount: number; color: string; percentage: number };

type InsightsData = {
  spendingBreakdown: {
    categories: SpendingCategory[];
    topCounterparties: { label: string; amount: number; token: string; count: number }[];
    byToken: { token: string; received: number; sent: number }[];
    dailyAvgSpend: number;
    mostActiveDay: string;
  };
  financialHealth: { narrative: string; healthScore?: number; healthLabel?: string };
  monthlyPlan: { narrative: string };
  totalReceived: Record<string, number>;
  totalSent: Record<string, number>;
  totalGasFeesUSD: number;
  transactionCount: number;
};

// ── Markdown helpers ──────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    const k = key++;
    const trimmed = line.trimStart();
    if (trimmed.startsWith("### ")) {
      nodes.push(<div key={k} style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)", marginTop: "10px", marginBottom: "2px", letterSpacing: "-0.01em" }}>{trimmed.slice(4)}</div>);
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      nodes.push(<div key={k} style={{ display: "flex", gap: "6px", marginTop: "2px" }}><span style={{ color: "var(--ink-55)", flexShrink: 0, marginTop: "1px" }}>&bull;</span><span>{inlineBold(trimmed.slice(2))}</span></div>);
      continue;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        nodes.push(<div key={k} style={{ display: "flex", gap: "6px", marginTop: "2px" }}><span style={{ color: "var(--ink-55)", flexShrink: 0, minWidth: "14px" }}>{match[1]}.</span><span>{inlineBold(match[2] ?? "")}</span></div>);
        continue;
      }
    }
    if (trimmed === "") { nodes.push(<div key={k} style={{ height: "4px" }} />); continue; }
    nodes.push(<div key={k} style={{ marginTop: "2px" }}>{inlineBold(line)}</div>);
  }
  return nodes;
}

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return <>{parts.map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong> : p)}</>;
}

// ── Charts ────────────────────────────────────────────────────────────────────

function DonutChart({ categories }: { categories: SpendingCategory[] }) {
  const r = 48;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const visible = categories.filter((c) => c.percentage > 0);
  let accumulated = 0;
  return (
    <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-soft)" strokeWidth="13" />
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {visible.map((cat) => {
            const len = (cat.percentage / 100) * circ;
            const offset = accumulated;
            accumulated += len;
            return (
              <circle key={cat.label} cx={cx} cy={cy} r={r} fill="none" stroke={cat.color} strokeWidth="13"
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} />
            );
          })}
        </g>
      </svg>
      <div style={{ display: "grid", gap: "7px", flex: 1 }}>
        {visible.map((cat) => (
          <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: cat.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "12px", color: "var(--ink-70)" }}>{cat.label}</span>
              <span style={{ fontSize: "10px", color: "var(--ink-40)", marginLeft: "4px" }}>${cat.amount.toFixed(2)}</span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--ink-55)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{cat.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TokenBarChart({ byToken }: { byToken: { token: string; received: number; sent: number }[] }) {
  const max = Math.max(...byToken.flatMap((t) => [t.received, t.sent]), 1);
  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {byToken.map((t) => (
        <div key={t.token}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: "8px" }}>{t.token}</span>
          <div style={{ display: "grid", gap: "5px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--ink-40)", width: "24px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>In</span>
              <div style={{ flex: 1, height: "8px", background: "var(--bg-soft)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(t.received / max) * 100}%`, background: "var(--green)", borderRadius: "4px", transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: "11px", color: "var(--green-ink)", fontFamily: "var(--font-mono)", minWidth: "60px", textAlign: "right" }}>${t.received.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--ink-40)", width: "24px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>Out</span>
              <div style={{ flex: 1, height: "8px", background: "var(--bg-soft)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(t.sent / max) * 100}%`, background: "var(--coral)", borderRadius: "4px", transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: "11px", color: "var(--coral-ink)", fontFamily: "var(--font-mono)", minWidth: "60px", textAlign: "right" }}>${t.sent.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthRing({ score, label }: { score: number; label: string }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color =
    score >= 80 ? "oklch(0.68 0.12 145)" :
    score >= 65 ? "oklch(0.74 0.12 75)" :
    score >= 50 ? "oklch(0.68 0.16 35)" : "oklch(0.55 0.2 20)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--line-strong)" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" transform="rotate(-90 48 48)" />
        <text x="48" y="52" textAnchor="middle" fill="var(--ink)" fontSize="20" fontWeight="700">{score}</text>
      </svg>
      <span style={{ color, fontSize: "13px", fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function CopilotInner() {
  const { walletAddress: address, hasProvider: isConnected } = useMiniPay();

  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insightsDays, setInsightsDays] = useState(90);

  useEffect(() => {
    if (address && !insights && !insightsLoading) {
      void loadInsights();
    }
  }, [address]);

  async function loadInsights(days = insightsDays) {
    if (!address) return;
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, days }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInsights(data);
    } catch (e) {
      setInsightsError(e instanceof Error ? e.message : "Failed to load insights");
    } finally {
      setInsightsLoading(false);
    }
  }

  if (!isConnected || !address) {
    return (
      <main className="page-shell">
        <div className="dashboard">
          <header className="dashboard-topbar">
            <Link href="/" className="dashboard-topbar__icon" aria-label="Back">
              <BackIcon />
            </Link>
            <div className="dashboard-brand__name">Insights</div>
          </header>
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "14px" }}>🔗</div>
            <strong style={{ fontSize: "1.1rem" }}>Connect your wallet</strong>
            <p className="intro" style={{ margin: "8px auto 0", maxWidth: "28ch" }}>
              Connect your MiniPay wallet to view your financial insights.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      background: "var(--bg)", width: "min(100%, 390px)", margin: "0 auto",
      fontFamily: "var(--font-sans)"
    }}>

      {/* Header */}
      <div style={{
        padding: "calc(14px + env(safe-area-inset-top)) 16px 12px",
        background: "rgba(244, 241, 234, 0.92)",
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 20,
        borderBottom: "1px solid var(--line)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link href="/" className="dashboard-topbar__icon" aria-label="Back to home">
            <BackIcon />
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--ink)", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>Insights</div>
            <div style={{ color: "var(--ink-55)", fontSize: "11px" }}>Your wallet analysis</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: "40px" }}>

        {/* Date range selector */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setInsightsDays(d); setInsights(null); void loadInsights(d); }}
              style={{
                padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                background: insightsDays === d ? "var(--ink)" : "var(--surface)",
                color: insightsDays === d ? "#fffdf7" : "var(--ink-55)",
                border: `1px solid ${insightsDays === d ? "var(--ink)" : "var(--line)"}`,
              }}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {insightsLoading && (
          <div className="stack-lg">
            {[120, 80, 100].map((w, i) => (
              <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "22px", padding: "18px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ height: "12px", width: `${w}px`, borderRadius: "6px", background: "var(--line-strong)", animation: "copilot-pulse 1.4s ease-in-out infinite" }} />
                <div style={{ height: "10px", width: "80%", borderRadius: "6px", background: "var(--line)", animation: "copilot-pulse 1.4s ease-in-out 0.2s infinite" }} />
                <div style={{ height: "10px", width: "60%", borderRadius: "6px", background: "var(--line)", animation: "copilot-pulse 1.4s ease-in-out 0.4s infinite" }} />
              </div>
            ))}
            <div style={{ textAlign: "center", color: "var(--ink-55)", fontSize: "12px", paddingTop: "4px" }}>Analyzing your wallet with AI…</div>
          </div>
        )}

        {/* Error */}
        {insightsError && (
          <div className="notice-card danger">
            <strong style={{ fontSize: "0.88rem" }}>Analysis failed</strong>
            <p style={{ fontSize: "0.82rem" }}>{insightsError}</p>
            <button type="button" onClick={() => void loadInsights()} className="secondary-action" style={{ width: "auto", padding: "0 16px", minHeight: "36px", fontSize: "0.82rem" }}>
              Retry
            </button>
          </div>
        )}

        {/* Empty wallet */}
        {insights && !insightsLoading && insights.transactionCount === 0 && (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "var(--surface)", borderRadius: "22px", border: "1px solid var(--line)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
            <strong style={{ fontSize: "1rem", color: "var(--ink)" }}>No transactions yet</strong>
            <p style={{ color: "var(--ink-55)", fontSize: "0.88rem", marginTop: "6px", maxWidth: "26ch", margin: "6px auto 0" }}>
              Once you start sending and receiving stablecoins, Akili will analyze your activity here.
            </p>
          </div>
        )}

        {/* Insights */}
        {insights && !insightsLoading && insights.transactionCount > 0 && (
          <div className="stack-lg">

            {/* Financial health */}
            <div>
              <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                <p className="section-label">Financial health</p>
              </div>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)", borderRadius: "22px", padding: "18px 16px", display: "flex", gap: "16px", alignItems: "center" }}>
                {insights.financialHealth.healthScore !== undefined && (
                  <HealthRing score={insights.financialHealth.healthScore} label={insights.financialHealth.healthLabel ?? ""} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--ink-70)", fontSize: "13px", lineHeight: "1.6" }}>
                    {renderMarkdown(insights.financialHealth.narrative)}
                  </div>
                </div>
              </div>
            </div>

            {/* Spending breakdown */}
            {insights.spendingBreakdown.categories.length > 0 && (
              <div>
                <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                  <p className="section-label">Spending breakdown</p>
                  <span style={{ fontSize: "0.72rem", color: "var(--ink-55)", fontFamily: "var(--font-mono)" }}>
                    ${insights.spendingBreakdown.dailyAvgSpend.toFixed(2)}/day · peak: {insights.spendingBreakdown.mostActiveDay}
                  </span>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)", borderRadius: "22px", padding: "18px 16px" }}>
                  <DonutChart categories={insights.spendingBreakdown.categories} />
                </div>
              </div>
            )}

            {/* Token activity */}
            {insights.spendingBreakdown.byToken.length > 0 && (
              <div>
                <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                  <p className="section-label">Token activity</p>
                  <span style={{ fontSize: "0.72rem", color: "var(--ink-55)" }}>
                    {insights.transactionCount} txs · ${insights.totalGasFeesUSD.toFixed(4)} network fees
                  </span>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "var(--shadow)", borderRadius: "22px", padding: "18px 16px" }}>
                  <TokenBarChart byToken={insights.spendingBreakdown.byToken} />
                </div>
              </div>
            )}

            {/* Top counterparties */}
            {insights.spendingBreakdown.topCounterparties.length > 0 && (
              <div>
                <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                  <p className="section-label">Top contacts &amp; protocols</p>
                </div>
                <div className="list-card">
                  {insights.spendingBreakdown.topCounterparties.map((cp, i) => (
                    <div key={cp.label} className={`list-card__row${i === insights.spendingBreakdown.topCounterparties.length - 1 ? " list-card__row--last" : ""}`}>
                      <div style={{ flex: 1 }}>
                        <strong>{cp.label}</strong>
                        <p>{cp.count} transaction{cp.count !== 1 ? "s" : ""}</p>
                      </div>
                      <span style={{ color: "var(--coral-ink)", fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        ${cp.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly plan */}
            <div>
              <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                <p className="section-label">Monthly plan</p>
              </div>
              <div className="notice-card" style={{ background: "var(--surface)" }}>
                <div style={{ color: "var(--ink-70)", fontSize: "13px", lineHeight: "1.6" }}>
                  {renderMarkdown(insights.monthlyPlan.narrative)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" onClick={() => void loadInsights()} className="secondary-action" style={{ flex: 1 }}>
                Refresh
              </button>
              <Link href="/?action=account-summary" className="secondary-action" style={{ flex: 1, textAlign: "center" }}>
                Ask Akili →
              </Link>
            </div>

          </div>
        )}

        {/* Not loaded yet */}
        {!insights && !insightsLoading && !insightsError && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "12px" }}>
            <p style={{ color: "var(--ink-55)", fontSize: "14px" }}>No insights loaded yet.</p>
            <button type="button" onClick={() => void loadInsights()} className="primary-action" style={{ width: "auto", padding: "0 24px" }}>
              Load insights
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes copilot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>

    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={null}>
      <CopilotInner />
    </Suspense>
  );
}
