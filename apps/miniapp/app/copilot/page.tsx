"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useMiniPay } from "../../hooks/use-minipay";
import { BottomNav } from "../../components/bottom-nav";
import { toast } from "../../components/toast";
import { haptic } from "../../lib/haptics";
import {
  AI_PRICE_DISPLAY, FREE_LIMIT,
  getFreeAuditsRemaining, getFreeChatRemaining,
  recordAuditUsed, recordChatUsed, payForAI,
} from "../../lib/payment";
import Link from "next/link";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reportType?: string;
};

type QuickAction = { label: string; reportType: string; prompt: string };

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

const FOLLOW_UPS: Record<string, string[]> = {
  "spending-advice":  ["What's my biggest expense?", "How can I save more?", "Compare my spending to last month"],
  "wallet-audit":     ["What's my health score mean?", "How do I improve my score?", "Show my top payees"],
  "account-summary":  ["Break down by category", "What were my biggest sends?", "Generate a statement"],
  "monthly-plan":     ["How much should I save?", "What's my daily budget?", "Set a spending alert"],
  "wallet-statement": ["Audit my wallet", "Give spending advice", "What's my balance trend?"],
};
const DEFAULT_FOLLOW_UPS = ["Tell me more", "Give me advice", "Summarize this"];

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Spending Advice", reportType: "spending-advice", prompt: "Give me personalized spending advice based on my wallet activity." },
  { label: "Account Summary", reportType: "account-summary", prompt: "Summarize my account activity for the last 90 days." },
  { label: "Wallet Audit", reportType: "wallet-audit", prompt: "Audit my wallet and give me a financial health score." },
  { label: "Monthly Plan", reportType: "monthly-plan", prompt: "Build a realistic monthly budget and savings plan based on my transaction history." },
  { label: "Statement", reportType: "wallet-statement", prompt: "Generate a formal wallet statement of my transactions." },
];

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const k = key++;
    const trimmed = line.trimStart();

    // ### Header
    if (trimmed.startsWith("### ")) {
      nodes.push(
        <div key={k} style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink)", marginTop: "10px", marginBottom: "2px", letterSpacing: "-0.01em" }}>
          {trimmed.slice(4)}
        </div>
      );
      continue;
    }

    // Bullet line
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      nodes.push(
        <div key={k} style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
          <span style={{ color: "var(--ink-55)", flexShrink: 0, marginTop: "1px" }}>•</span>
          <span>{inlineBold(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        nodes.push(
          <div key={k} style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
            <span style={{ color: "var(--ink-55)", flexShrink: 0, minWidth: "14px" }}>{match[1]}.</span>
            <span>{inlineBold(match[2] ?? "")}</span>
          </div>
        );
        continue;
      }
    }

    // Empty line — spacing
    if (trimmed === "") {
      nodes.push(<div key={k} style={{ height: "4px" }} />);
      continue;
    }

    // Normal paragraph line
    nodes.push(<div key={k} style={{ marginTop: "2px" }}>{inlineBold(line)}</div>);
  }

  return nodes;
}

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : p
      )}
    </>
  );
}

async function downloadStatement(content: string, address: string) {
  // iOS — generate client-side PDF and use Web Share API with file
  // Check capability before loading jsPDF so Android skips the heavy import
  const testBlob = new Blob([""], { type: "application/pdf" });
  const testFile = new File([testBlob], "test.pdf", { type: "application/pdf" });
  if (navigator.canShare?.({ files: [testFile] })) {
    const { jsPDF } = await import("jspdf");
    const date = new Date().toISOString().slice(0, 10);
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const usableW = pageW - margin * 2;
    let y = 22;
    doc.setFillColor(61, 214, 140);
    doc.rect(0, 0, pageW, 16, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text("AKILI — AI Financial Copilot", margin, 10.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Wallet Statement", pageW - margin, 10.5, { align: "right" });
    doc.setTextColor(60, 60, 60); doc.setFontSize(8);
    doc.text(`Wallet: ${address}`, margin, y); y += 5;
    doc.text(`Network: Celo Mainnet  ·  Generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}`, margin, y);
    y += 2; doc.setDrawColor(200, 200, 200); doc.line(margin, y + 2, pageW - margin, y + 2); y += 7;
    for (const raw of content.split("\n")) {
      if (y > 272) { doc.addPage(); y = 20; }
      const line = raw.trimStart();
      if (line.startsWith("### ")) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
        doc.text(line.slice(4), margin, y); y += 6;
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
        const w = doc.splitTextToSize("• " + line.slice(2).replace(/\*\*/g, ""), usableW - 4);
        doc.text(w, margin + 2, y); y += (w as string[]).length * 5;
      } else if (line === "") { y += 2; }
      else {
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
        const w = doc.splitTextToSize(line.replace(/\*\*/g, ""), usableW);
        doc.text(w, margin, y); y += (w as string[]).length * 5;
      }
    }
    const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i); const ph = doc.internal.pageSize.getHeight();
      doc.setDrawColor(200, 200, 200); doc.line(margin, ph - 12, pageW - margin, ph - 12);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text("Generated by Akili · akilii-minipay.vercel.app", margin, ph - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageW - margin, ph - 7, { align: "right" });
    }
    const filename = `akili-statement-${address.slice(0, 6)}-${date}.pdf`;
    const blob = doc.output("blob");
    await navigator.share({ files: [new File([blob], filename, { type: "application/pdf" })], title: "Akili Wallet Statement" });
    return;
  }

  // Android + Desktop — server generates PDF, served as real https:// URL
  // Android WebView honours https:// downloads; blob:/data: URIs are blocked
  const res = await fetch("/api/statement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, address }),
  });
  if (!res.ok) throw new Error("Could not prepare download — please try again.");
  const { id } = await res.json() as { id: string };
  window.open(`/api/statement?id=${id}`, "_blank");
}

// ── Charts ────────────────────────────────────────────────────────────────────

function DonutChart({ categories }: { categories: SpendingCategory[] }) {
  const r = 48;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const visible = categories.filter(c => c.percentage > 0);

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
              <circle
                key={cat.label}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={cat.color}
                strokeWidth="13"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
      </svg>
      <div style={{ display: "grid", gap: "7px", flex: 1 }}>
        {visible.map(cat => (
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
  const max = Math.max(...byToken.flatMap(t => [t.received, t.sent]), 1);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {byToken.map(t => (
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
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
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

function SendIcon({ disabled }: { disabled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8h12M8 3l7 5-7 5"
        stroke={disabled ? "var(--ink-40)" : "#fffdf7"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M5 7l3 4 3-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function CopilotInner() {
  const { walletAddress: address, hasProvider: isConnected } = useMiniPay();
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");
  const tabParam = searchParams.get("tab");
  const autoTriggered = useRef(false);

  const [tab, setTab] = useState<"chat" | "insights">(tabParam === "insights" ? "insights" : "chat");
  const [showIntro, setShowIntro] = useState(false);
  const [payingForId, setPayingForId] = useState<string | null>(null);
  const [freeAudits, setFreeAudits] = useState(FREE_LIMIT);
  const [freeChat, setFreeChat] = useState(FREE_LIMIT);
  const [paywallPending, setPaywallPending] = useState<{ content: string; reportType?: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi! I'm Akili, your AI financial assistant. I can analyze your wallet, give spending advice, audit your activity, or generate a formal statement. What would you like to know?",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insightsDays, setInsightsDays] = useState(90);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFreeAudits(getFreeAuditsRemaining());
    setFreeChat(getFreeChatRemaining());
    try {
      if (!localStorage.getItem("akili_copilot_intro_seen")) {
        setShowIntro(true);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (tab === "insights" && !insights && address && !insightsLoading) {
      loadInsights();
    }
  }, [tab, address]);

  useEffect(() => {
    if (!actionParam || !address || autoTriggered.current || chatLoading) return;
    const action = QUICK_ACTIONS.find(a => a.reportType === actionParam);
    if (action) {
      autoTriggered.current = true;
      sendMessage(action.prompt, action.reportType);
    }
  }, [address, actionParam]);

  async function loadInsights(days = insightsDays) {
    if (!address) return;
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, days })
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

  async function executeMessage(content: string, reportType?: string, userMsgOverride?: Message) {
    const userMsg: Message = userMsgOverride ?? { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
    if (!userMsgOverride) setMessages(prev => [...prev, userMsg]);
    setInput("");
    setChatLoading(true);
    try {
      const endpoint = reportType ? "/api/report" : "/api/chat";
      const body = reportType
        ? { walletAddress: address, reportType, days: 90 }
        : {
            walletAddress: address,
            messages: [...messages, userMsg]
              .filter(m => m.id !== "welcome")
              .map(m => ({ role: m.role, content: m.content }))
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        const errMsg =
          res.status === 429
            ? "You're sending messages too quickly. Please wait a moment and try again."
            : typeof data.error === "string" ? data.error
            : "Something went wrong. Please try again.";
        setMessages(prev => [...prev, { id: `${Date.now()}-e`, role: "assistant", content: errMsg, timestamp: new Date() }]);
        return;
      }
      const reply = (data.narrative ?? data.reply ?? "Could not get a response.") as string;
      setMessages(prev => [...prev, {
        id: `${Date.now()}-r`,
        role: "assistant",
        content: reply,
        timestamp: new Date(),
        ...(reportType ? { reportType } : {})
      }]);
      // Record usage and refresh counters
      if (reportType) { recordAuditUsed(); setFreeAudits(getFreeAuditsRemaining()); }
      else { recordChatUsed(); setFreeChat(getFreeChatRemaining()); }
    } catch {
      setMessages(prev => [...prev, {
        id: `${Date.now()}-e`,
        role: "assistant",
        content: "Network error — check your connection and try again.",
        timestamp: new Date()
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function sendMessage(content: string, reportType?: string) {
    if (!content.trim() || !address) return;
    haptic("light");
    const isReport = Boolean(reportType);
    const remaining = isReport ? getFreeAuditsRemaining() : getFreeChatRemaining();
    if (remaining === 0) {
      const userMsg: Message = { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
      setMessages(prev => [...prev, userMsg]);
      setInput("");
      setPaywallPending(reportType ? { content, reportType } : { content });
      return;
    }
    await executeMessage(content, reportType);
  }

  if (!isConnected || !address) {
    return (
      <main className="page-shell">
        <div className="dashboard">
          <header className="dashboard-topbar">
            <div className="dashboard-brand">
              <span className="dashboard-brand__mark">A</span>
              <div className="dashboard-brand__name">Akili</div>
            </div>
          </header>
          <div className="hero-panel" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "14px" }}>🔗</div>
            <strong style={{ fontSize: "1.1rem" }}>Connect your wallet</strong>
            <p className="intro" style={{ margin: "8px auto 0", maxWidth: "28ch" }}>
              Connect your MiniPay wallet to start your AI financial analysis.
            </p>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  function dismissIntro() {
    try { localStorage.setItem("akili_copilot_intro_seen", "1"); } catch { /* ignore */ }
    setShowIntro(false);
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: "var(--bg)",
      width: "min(100%, 390px)",
      margin: "0 auto",
      fontFamily: "var(--font-sans)"
    }}>

      {/* One-time intro modal */}
      {showIntro && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "var(--surface)", borderRadius: "26px 26px 0 0",
            padding: "28px 24px calc(28px + env(safe-area-inset-bottom))",
            width: "min(100%, 390px)", display: "flex", flexDirection: "column", gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{
                width: "40px", height: "40px", borderRadius: "14px",
                background: "var(--slab)", color: "var(--slab-ink)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "18px", flexShrink: 0
              }}>A</span>
              <div>
                <strong style={{ fontSize: "16px", display: "block" }}>Meet Akili Agent</strong>
                <span style={{ fontSize: "12px", color: "var(--ink-55)" }}>AI-powered wallet analysis</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { icon: "✦", label: "3 free analyses", detail: "Spending advice, wallet audit, monthly plan, statement & more" },
                { icon: "✦", label: "3 free chat messages", detail: "Ask anything about your wallet in plain language" },
                { icon: "✦", label: `${AI_PRICE_DISPLAY} USDC per use after`, detail: "Paid instantly via your connected wallet — no sign-up" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "14px", marginTop: "1px", flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <strong style={{ fontSize: "13px", display: "block" }}>{item.label}</strong>
                    <span style={{ fontSize: "12px", color: "var(--ink-55)" }}>{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={dismissIntro}
              style={{
                marginTop: "4px", width: "100%", padding: "14px",
                borderRadius: "999px", border: "none",
                background: "var(--slab)", color: "var(--slab-ink)",
                fontSize: "15px", fontWeight: 700, cursor: "pointer"
              }}
            >
              Got it — let&apos;s go
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: "calc(14px + env(safe-area-inset-top)) 16px 0",
        background: "rgba(244, 241, 234, 0.92)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderBottom: "1px solid var(--line)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <Link href="/" className="dashboard-topbar__icon" aria-label="Back to home">
            <BackIcon />
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ color: "var(--ink)", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Akili
            </div>
            <div style={{ color: "var(--ink-55)", fontSize: "11px" }}>
              {address.slice(0, 6)}…{address.slice(-4)}
            </div>
          </div>
          {tab === "chat" && messages.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setMessages([{ id: "welcome", role: "assistant", content: "Hi! I'm Akili, your AI financial assistant. I can analyze your wallet, give spending advice, audit your activity, or generate a formal statement. What would you like to know?", timestamp: new Date() }]);
                setPaywallPending(null);
              }}
              style={{ fontSize: "11px", color: "var(--ink-55)", background: "transparent", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: "8px", cursor: "pointer" }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="segmented-row" role="tablist" aria-label="Akili sections" style={{ margin: "0 0 12px" }}>
          {(["chat", "insights"] as const).map(t => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`segmented-row__item${tab === t ? " is-active" : ""}`}
            >
              {t === "chat" ? "Chat" : "Insights"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat tab ── */}
      {tab === "chat" && (
        <div className="tab-panel-enter" style={{ display: "contents" }}>
          <div style={{ padding: "6px 16px 0", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <span style={{
              fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px",
              background: freeAudits > 0 ? "var(--green-soft)" : "var(--bg-soft)",
              color: freeAudits > 0 ? "var(--green-ink)" : "var(--ink-55)",
              border: `1px solid ${freeAudits > 0 ? "var(--green)" : "var(--line)"}`,
            }}>
              {freeAudits > 0 ? `${freeAudits} analyses` : `${AI_PRICE_DISPLAY}/analysis`}
            </span>
            <span style={{
              fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px",
              background: freeChat > 0 ? "var(--green-soft)" : "var(--bg-soft)",
              color: freeChat > 0 ? "var(--green-ink)" : "var(--ink-55)",
              border: `1px solid ${freeChat > 0 ? "var(--green)" : "var(--line)"}`,
            }}>
              {freeChat > 0 ? `${freeChat} chats` : `${AI_PRICE_DISPLAY}/chat`}
            </span>
          </div>
          <div className="brief-chip-row" style={{ padding: "6px 16px 10px", overflowX: "auto", flexWrap: "nowrap", borderBottom: "1px solid var(--line)", flexShrink: 0 }}>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.reportType}
                type="button"
                onClick={() => sendMessage(a.prompt, a.reportType)}
                disabled={chatLoading}
                className="brief-chip"
                style={{ whiteSpace: "nowrap", flexShrink: 0, opacity: chatLoading ? 0.5 : 1, cursor: chatLoading ? "not-allowed" : "pointer" }}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: "160px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map(msg => (
              <div key={msg.id} className="message-enter" style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "var(--ink)" : "var(--surface)",
                  color: msg.role === "user" ? "#fffdf7" : "var(--ink)",
                  fontSize: "14px",
                  lineHeight: "1.55",
                  wordBreak: "break-word",
                  border: msg.role === "assistant" ? "1px solid var(--line)" : "none",
                  boxShadow: msg.role === "assistant" ? "var(--shadow)" : "none"
                }}>
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>

                {/* Follow-up suggestions for the last assistant message */}
                {msg.role === "assistant" && msg.id !== "welcome" && msg === messages.filter(m => m.role === "assistant").at(-1) && !chatLoading && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px", maxWidth: "85%" }}>
                    {(FOLLOW_UPS[msg.reportType ?? ""] ?? DEFAULT_FOLLOW_UPS).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendMessage(s)}
                        style={{
                          padding: "4px 10px", borderRadius: "999px", fontSize: "11px", cursor: "pointer",
                          background: "var(--bg-soft)", border: "1px solid var(--line)", color: "var(--ink-70)"
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Share button for all assistant messages */}
                {msg.role === "assistant" && msg.content.length > 40 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        void navigator.share({ title: "Akili Financial Report", text: msg.content });
                      } else {
                        void navigator.clipboard.writeText(msg.content).then(() => {
                          toast.success("Copied to clipboard");
                        });
                      }
                    }}
                    style={{
                      marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "5px",
                      padding: "4px 10px", borderRadius: "999px", background: "transparent",
                      border: "1px solid var(--line)", color: "var(--ink-55)",
                      fontSize: "11px", cursor: "pointer"
                    }}
                  >
                    Share
                  </button>
                )}

                {/* Download button for statement reports — free (paid at analysis level) */}
                {msg.role === "assistant" && msg.reportType === "wallet-statement" && (
                  <button
                    type="button"
                    disabled={payingForId === msg.id}
                    onClick={async () => {
                      setPayingForId(msg.id);
                      try {
                        await downloadStatement(msg.content, address);
                        toast.success("Statement ready");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Download failed");
                      } finally {
                        setPayingForId(null);
                      }
                    }}
                    style={{
                      marginTop: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      color: "var(--ink-70)",
                      fontSize: "12px",
                      fontWeight: 500,
                      cursor: payingForId === msg.id ? "not-allowed" : "pointer",
                      boxShadow: "var(--shadow)",
                      opacity: payingForId === msg.id ? 0.6 : 1,
                    }}
                  >
                    <DownloadIcon />
                    {payingForId === msg.id ? "Opening…" : "Download PDF"}
                  </button>
                )}

                <div style={{ color: "var(--ink-40)", fontSize: "10px", marginTop: "4px", padding: "0 4px" }}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div style={{ display: "flex" }}>
                <div style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  boxShadow: "var(--shadow)",
                  borderRadius: "18px 18px 18px 4px",
                  padding: "12px 16px",
                  display: "flex",
                  gap: "4px"
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "var(--ink-40)",
                      animation: `copilot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}
            {/* Paywall prompt */}
            {paywallPending && !chatLoading && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{
                  width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                  background: "var(--slab)", color: "var(--slab-ink)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "12px"
                }}>A</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "80%" }}>
                  <div style={{
                    background: "var(--surface)", border: "1px solid var(--line)",
                    boxShadow: "var(--shadow)", borderRadius: "18px 18px 18px 4px",
                    padding: "12px 16px", fontSize: "13px", lineHeight: 1.5
                  }}>
                    <strong style={{ display: "block", marginBottom: "4px" }}>Free limit reached</strong>
                    You&apos;ve used your {FREE_LIMIT} free {paywallPending.reportType ? "analyses" : "chat messages"}.
                    Pay {AI_PRICE_DISPLAY} USDC to continue.
                  </div>
                  <button
                    type="button"
                    disabled={paying}
                    onClick={async () => {
                      setPaying(true);
                      try {
                        await payForAI();
                        toast.success("Payment confirmed");
                        const { content, reportType } = paywallPending;
                        setPaywallPending(null);
                        await executeMessage(content, reportType);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Payment failed");
                      } finally {
                        setPaying(false);
                      }
                    }}
                    style={{
                      alignSelf: "flex-start", display: "inline-flex", alignItems: "center",
                      gap: "6px", padding: "8px 16px", borderRadius: "999px",
                      background: "var(--slab)", color: "var(--slab-ink)",
                      border: "none", fontSize: "13px", fontWeight: 600,
                      cursor: paying ? "not-allowed" : "pointer", opacity: paying ? 0.6 : 1
                    }}
                  >
                    {paying ? "Confirming…" : `Pay ${AI_PRICE_DISPLAY} USDC`}
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Privacy note */}
          <div style={{ textAlign: "center", fontSize: "10px", color: "var(--ink-40)", padding: "0 16px 2px", flexShrink: 0 }}>
            🔒 Your private key never leaves your device
          </div>

          {/* Input bar */}
          <div style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "calc(78px + env(safe-area-inset-bottom))",
            width: "min(calc(100vw - 24px), 366px)",
            padding: "10px 12px",
            borderRadius: "22px",
            background: "rgba(255, 255, 255, 0.96)",
            border: "1px solid var(--line)",
            boxShadow: "0 10px 30px rgba(22, 20, 14, 0.08)",
            display: "flex",
            gap: "8px",
            alignItems: "flex-end",
            zIndex: 15
          }}>
            <div style={{ flex: 1, position: "relative" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 500))}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask about your wallet…"
                rows={1}
                maxLength={500}
                style={{
                  width: "100%",
                  background: "var(--surface-warm)",
                  border: "1px solid var(--line)",
                  borderRadius: "16px",
                  padding: "10px 14px",
                  color: "var(--ink)",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  fontFamily: "var(--font-sans)",
                  lineHeight: "1.4",
                  boxSizing: "border-box"
                }}
              />
              {input.length > 400 && (
                <span style={{
                  position: "absolute", bottom: "6px", right: "10px",
                  fontSize: "10px", color: input.length >= 490 ? "var(--coral)" : "var(--ink-40)"
                }}>
                  {500 - input.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={chatLoading || !input.trim()}
              style={{
                width: "40px", height: "40px", borderRadius: "50%",
                background: chatLoading || !input.trim() ? "var(--bg-soft)" : "var(--ink)",
                border: "1px solid var(--line)",
                cursor: chatLoading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s"
              }}
              aria-label="Send message"
            >
              <SendIcon disabled={chatLoading || !input.trim()} />
            </button>
          </div>
        </div>
      )}

      {/* ── Insights tab ── */}
      {tab === "insights" && (
        <div className="tab-panel-enter" style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: "100px" }}>
          {/* Date range selector */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => { setInsightsDays(d); setInsights(null); void loadInsights(d); }}
                style={{
                  padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                  background: insightsDays === d ? "var(--ink)" : "var(--surface)",
                  color: insightsDays === d ? "#fffdf7" : "var(--ink-55)",
                  border: `1px solid ${insightsDays === d ? "var(--ink)" : "var(--line)"}`
                }}
              >
                {d}d
              </button>
            ))}
          </div>

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

          {insightsError && (
            <div className="notice-card danger">
              <strong style={{ fontSize: "0.88rem" }}>Analysis failed</strong>
              <p style={{ fontSize: "0.82rem" }}>{insightsError}</p>
              <button type="button" onClick={() => void loadInsights()} className="secondary-action" style={{ width: "auto", padding: "0 16px", minHeight: "36px", fontSize: "0.82rem" }}>
                Retry
              </button>
            </div>
          )}

          {insights && !insightsLoading && insights.transactionCount === 0 && (
            <div style={{
              textAlign: "center", padding: "40px 24px",
              background: "var(--surface)", borderRadius: "22px",
              border: "1px solid var(--line)"
            }}>
              <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
              <strong style={{ fontSize: "1rem", color: "var(--ink)" }}>No transactions yet</strong>
              <p style={{ color: "var(--ink-55)", fontSize: "0.88rem", marginTop: "6px", maxWidth: "26ch", margin: "6px auto 0" }}>
                Once you start sending and receiving stablecoins, Akili will analyze your activity here.
              </p>
            </div>
          )}

          {insights && !insightsLoading && insights.transactionCount > 0 && (
            <div className="stack-lg">
              {/* Financial Health */}
              <div>
                <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                  <p className="section-label">Financial health</p>
                </div>
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--line)",
                  boxShadow: "var(--shadow)", borderRadius: "22px",
                  padding: "18px 16px", display: "flex", gap: "16px", alignItems: "center"
                }}>
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

              {/* Spending breakdown — donut chart */}
              {insights.spendingBreakdown.categories.length > 0 && (
                <div>
                  <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                    <p className="section-label">Spending breakdown</p>
                    <span style={{ fontSize: "0.72rem", color: "var(--ink-55)", fontFamily: "var(--font-mono)" }}>
                      ${insights.spendingBreakdown.dailyAvgSpend.toFixed(2)}/day avg
                    </span>
                  </div>
                  <div style={{
                    background: "var(--surface)", border: "1px solid var(--line)",
                    boxShadow: "var(--shadow)", borderRadius: "22px", padding: "18px 16px"
                  }}>
                    <DonutChart categories={insights.spendingBreakdown.categories} />
                  </div>
                </div>
              )}

              {/* Token activity — bar chart */}
              {insights.spendingBreakdown.byToken.length > 0 && (
                <div>
                  <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                    <p className="section-label">Token activity</p>
                    <span style={{ fontSize: "0.72rem", color: "var(--ink-55)" }}>
                      {insights.transactionCount} txs · ${insights.totalGasFeesUSD.toFixed(4)} network fees
                    </span>
                  </div>
                  <div style={{
                    background: "var(--surface)", border: "1px solid var(--line)",
                    boxShadow: "var(--shadow)", borderRadius: "22px", padding: "18px 16px"
                  }}>
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

              <button type="button" onClick={() => void loadInsights()} className="secondary-action">
                Refresh analysis
              </button>
            </div>
          )}

          {!insights && !insightsLoading && !insightsError && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "12px" }}>
              <p style={{ color: "var(--ink-55)", fontSize: "14px" }}>No insights loaded yet.</p>
              <button type="button" onClick={() => void loadInsights()} className="primary-action" style={{ width: "auto", padding: "0 24px" }}>
                Load insights
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes copilot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes copilot-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <BottomNav />
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
