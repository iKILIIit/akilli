"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMiniPay } from "../../hooks/use-minipay";
import { BottomNav } from "../../components/bottom-nav";
import { toast } from "../../components/toast";
import {
  TRAIL_FREE_LIMIT, TRAIL_PRICE_DISPLAY,
  getFreeTrailRemaining, recordTrailUsed, payForTrail,
} from "../../lib/payment";
import type { TrailGraph, TrailNode } from "../api/audit/route";

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isValidAddress(s: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── SVG Transaction Tree ──────────────────────────────────────────────────────

function TreeNode({ node, cx, cy, direction }: { node: TrailNode; cx: number; cy: number; direction: "in" | "out" }) {
  const color = direction === "in" ? "#22c55e" : "#f97066";
  const bg = direction === "in" ? "rgba(34,197,94,0.12)" : "rgba(249,112,102,0.12)";
  const label = node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label;
  const amount = `$${node.totalIn > 0 ? node.totalIn.toFixed(2) : node.totalOut.toFixed(2)}`;

  return (
    <g>
      <circle cx={cx} cy={cy} r={28} fill={bg} stroke={color} strokeWidth={1.5} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={8} fontWeight={700} fontFamily="monospace">{label}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--ink-70)" fontSize={7.5} fontFamily="monospace">{amount}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--ink-40)" fontSize={6.5}>{node.txCount} tx</text>
    </g>
  );
}

function TransactionTree({ graph }: { graph: TrailGraph }) {
  const W = 340;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2;
  const R = 130; // radius from center to satellite nodes

  const senders = graph.topSenders.slice(0, 5);
  const receivers = graph.topReceivers.slice(0, 5);

  // Layout senders on the left arc, receivers on the right arc
  function arcPos(index: number, total: number, side: "left" | "right") {
    const spread = Math.min(140, total * 30);
    const startAngle = 180 - spread / 2;
    const angle = total === 1 ? 180 : startAngle + (index / (total - 1)) * spread;
    const rad = (angle * Math.PI) / 180;
    const baseX = side === "left" ? cx - R * Math.cos(Math.PI - rad) : cx + R * Math.cos(rad);
    const baseY = cy - R * Math.sin(rad) + cy * 0;
    // Simpler: just fan out from 150°–210° for left, 330°–30° for right
    const fanAngle = side === "left"
      ? 150 + (total === 1 ? 0 : (index / (total - 1)) * 60) // 150° to 210°
      : -30 + (total === 1 ? 0 : (index / (total - 1)) * 60); // -30° to 30°
    const fanRad = (fanAngle * Math.PI) / 180;
    return { x: cx + R * Math.cos(fanRad), y: cy + R * Math.sin(fanRad) };
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Lines from center to senders */}
      {senders.map((n, i) => {
        const pos = arcPos(i, senders.length, "left");
        return (
          <line key={`ls-${i}`}
            x1={cx} y1={cy} x2={pos.x} y2={pos.y}
            stroke="rgba(34,197,94,0.35)" strokeWidth={1.5} strokeDasharray="4 3" />
        );
      })}
      {/* Lines from center to receivers */}
      {receivers.map((n, i) => {
        const pos = arcPos(i, receivers.length, "right");
        return (
          <line key={`lr-${i}`}
            x1={cx} y1={cy} x2={pos.x} y2={pos.y}
            stroke="rgba(249,112,102,0.35)" strokeWidth={1.5} strokeDasharray="4 3" />
        );
      })}

      {/* Sender nodes */}
      {senders.map((n, i) => {
        const pos = arcPos(i, senders.length, "left");
        return <TreeNode key={`sn-${i}`} node={n} cx={pos.x} cy={pos.y} direction="in" />;
      })}
      {/* Receiver nodes */}
      {receivers.map((n, i) => {
        const pos = arcPos(i, receivers.length, "right");
        return <TreeNode key={`rn-${i}`} node={n} cx={pos.x} cy={pos.y} direction="out" />;
      })}

      {/* Center node */}
      <circle cx={cx} cy={cy} r={36} fill="var(--slab)" />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="var(--slab-ink)" fontSize={8} fontWeight={700} fontFamily="monospace">
        {shorten(graph.center.address)}
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7}>
        ↓ ${graph.center.totalIn.toFixed(0)} in
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={7}>
        ↑ ${graph.center.totalOut.toFixed(0)} out
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={6.5}>
        {graph.center.txCount} tx
      </text>
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type AuditResult = {
  walletAddress: string;
  graph: TrailGraph;
  narrative: string;
  periodDays: number;
  fetchedAt: string;
};

export default function AuditPage() {
  const { walletAddress: myAddress } = useMiniPay();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [freeRemaining, setFreeRemaining] = useState(TRAIL_FREE_LIMIT);

  useEffect(() => {
    setFreeRemaining(getFreeTrailRemaining());
  }, []);

  async function runAudit(address: string) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address.trim(), days: 90 }),
      });
      const data = await res.json() as AuditResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Audit failed");
      setResult(data);
      recordTrailUsed();
      setFreeRemaining(getFreeTrailRemaining());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Audit failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const addr = input.trim();
    if (!isValidAddress(addr)) {
      toast.error("Paste a valid Celo wallet address (0x…)");
      return;
    }

    if (freeRemaining > 0) {
      await runAudit(addr);
      return;
    }

    if (!myAddress) {
      toast.error("Connect your wallet to pay for an audit.");
      return;
    }

    setPaying(true);
    try {
      await payForTrail();
      toast.success("Payment confirmed — running audit…");
      await runAudit(addr);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="page-shell" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div style={{
        padding: "calc(14px + env(safe-area-inset-top)) 16px 0",
        background: "rgba(244,241,234,0.92)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--line)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
          <Link href="/support" className="dashboard-topbar__icon" aria-label="Back">
            <BackIcon />
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Wallet Audit Trail
            </div>
            <div style={{ fontSize: "11px", color: "var(--ink-55)" }}>
              Trace any Celo wallet's transaction history
            </div>
          </div>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px",
            background: freeRemaining > 0 ? "var(--green-soft)" : "var(--bg-soft)",
            color: freeRemaining > 0 ? "var(--green-ink)" : "var(--ink-55)",
            border: `1px solid ${freeRemaining > 0 ? "var(--green)" : "var(--line)"}`,
          }}>
            {freeRemaining > 0 ? `${freeRemaining} free` : TRAIL_PRICE_DISPLAY}
          </span>
        </div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "100px" }}>

        {/* Address input */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "18px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px"
        }}>
          <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Wallet address to audit
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="0x… paste any Celo address"
            style={{
              width: "100%", padding: "10px 12px", borderRadius: "12px",
              border: "1px solid var(--line)", background: "var(--bg)",
              fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--ink)",
              outline: "none", boxSizing: "border-box"
            }}
            onPaste={e => {
              const pasted = e.clipboardData.getData("text").trim();
              if (isValidAddress(pasted)) {
                e.preventDefault();
                setInput(pasted);
              }
            }}
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || paying || !input.trim()}
            style={{
              width: "100%", padding: "13px", borderRadius: "999px", border: "none",
              background: loading || paying ? "var(--line)" : "var(--ink)",
              color: "#fffdf7", fontSize: "14px", fontWeight: 700, cursor: loading || paying ? "not-allowed" : "pointer"
            }}
          >
            {paying ? "Paying…" : loading ? "Auditing wallet…" : freeRemaining > 0 ? "Audit wallet (free)" : `Audit wallet (${TRAIL_PRICE_DISPLAY})`}
          </button>
          <p style={{ fontSize: "11px", color: "var(--ink-40)", textAlign: "center", margin: 0 }}>
            {TRAIL_FREE_LIMIT} free audit · {TRAIL_PRICE_DISPLAY} USDC after · any public Celo wallet
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px",
            padding: "32px", textAlign: "center", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center"
          }}>
            <div style={{ display: "flex", gap: "5px" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: "7px", height: "7px", borderRadius: "50%", background: "var(--ink-40)",
                  animation: `copilot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                }} />
              ))}
            </div>
            <p style={{ fontSize: "13px", color: "var(--ink-55)", margin: 0 }}>
              Fetching transactions and building tree…
            </p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Legend */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#22c55e" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "rgba(34,197,94,0.2)", border: "1.5px solid #22c55e", display: "inline-block" }} />
                Inflows (money in)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#f97066" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "rgba(249,112,102,0.2)", border: "1.5px solid #f97066", display: "inline-block" }} />
                Outflows (money out)
              </span>
            </div>

            {/* Tree */}
            <div style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: "18px", padding: "16px", display: "flex", justifyContent: "center", overflowX: "auto"
            }}>
              <TransactionTree graph={result.graph} />
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { label: "Total in", value: `$${result.graph.center.totalIn.toFixed(2)}`, color: "#22c55e" },
                { label: "Total out", value: `$${result.graph.center.totalOut.toFixed(2)}`, color: "#f97066" },
                { label: "Transactions", value: String(result.graph.center.txCount), color: "var(--ink)" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "var(--surface)", border: "1px solid var(--line)",
                  borderRadius: "14px", padding: "12px", textAlign: "center"
                }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</div>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", marginTop: "2px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Top counterparties list */}
            {(result.graph.topSenders.length > 0 || result.graph.topReceivers.length > 0) && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", overflow: "hidden" }}>
                {result.graph.topSenders.slice(0, 4).map((n, i) => (
                  <div key={`s${i}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "11px 16px", borderBottom: "1px solid var(--line)", gap: "8px"
                  }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.label}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#22c55e", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      +${n.totalIn.toFixed(2)}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--ink-40)", flexShrink: 0 }}>{n.txCount}×</span>
                  </div>
                ))}
                {result.graph.topReceivers.slice(0, 4).map((n, i, arr) => (
                  <div key={`r${i}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "11px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none", gap: "8px"
                  }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#f97066", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.label}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#f97066", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      −${n.totalOut.toFixed(2)}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--ink-40)", flexShrink: 0 }}>{n.txCount}×</span>
                  </div>
                ))}
              </div>
            )}

            {/* AI Narrative */}
            {result.narrative && result.narrative !== "AI narrative unavailable." && (
              <div style={{
                background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: "18px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px"
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Forensic Summary · AI
                </div>
                <div style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--ink)" }}>
                  {result.narrative.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i} style={{ margin: "0 0 8px" }}>{p}</p>
                  ))}
                </div>
                <div style={{ fontSize: "10px", color: "var(--ink-40)" }}>
                  Last {result.periodDays} days · {new Date(result.fetchedAt).toLocaleString()}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div style={{
            background: "var(--surface)", border: "1px solid var(--line)",
            borderRadius: "18px", padding: "28px 16px", textAlign: "center",
            display: "flex", flexDirection: "column", gap: "8px", alignItems: "center"
          }}>
            <div style={{ fontSize: "32px" }}>🔍</div>
            <strong style={{ fontSize: "14px" }}>Trace any Celo wallet</strong>
            <p style={{ fontSize: "12px", color: "var(--ink-55)", margin: 0, maxWidth: "26ch" }}>
              Paste a wallet address above to see who sent money, where it went, and an AI forensic summary.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
