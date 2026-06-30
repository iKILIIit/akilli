"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "../components/sidebar";
import { SpendingAlertModal } from "../components/spending-alert-modal";
import { WalletConnectModal } from "../components/wallet-connect-modal";
import { toast } from "../components/toast";
import { haptic } from "../lib/haptics";
import { useMiniPay } from "../hooks/use-minipay";
import { useGDStatus } from "../hooks/use-gd-status";
import { useStableTokenBalances } from "../hooks/use-stable-token-balances";
import { shouldShowGDClaimAlert, dismissGDClaimAlert } from "../lib/fx-alerts";
import {
  AI_PRICE_DISPLAY,
  FREE_LIMIT,
  getFreeAuditsRemaining,
  getFreeChatRemaining,
  recordAuditUsed,
  recordChatUsed,
  payForAI,
} from "../lib/payment";

// ── Types & constants ────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  reportType?: string;
};

type QuickAction = { label: string; reportType: string; prompt: string };

const QUICK_ACTIONS: QuickAction[] = [
  { label: "My G$ UBI",       reportType: "gd-ubi-history",  prompt: "Show me my GoodDollar UBI claim history and how much I've earned." },
  { label: "G$ Optimizer",    reportType: "gd-ubi-optimize", prompt: "How can I get more value from my GoodDollar UBI?" },
  { label: "Spending Advice", reportType: "spending-advice", prompt: "Give me personalized spending advice based on my wallet activity." },
  { label: "Account Summary", reportType: "account-summary", prompt: "Summarize my account activity for the last 90 days." },
  { label: "Wallet Audit",    reportType: "wallet-audit",    prompt: "Audit my wallet and give me a financial health score." },
  { label: "Monthly Plan",    reportType: "monthly-plan",    prompt: "Build a realistic monthly budget and savings plan based on my transaction history." },
];

const FOLLOW_UPS: Record<string, string[]> = {
  "gd-ubi-history":  ["How much G$ did I miss?", "What's my claim streak?", "How do I optimize my G$?"],
  "gd-ubi-optimize": ["Show my claim history", "What's 30 days of G$ worth?", "How do I claim G$?"],
  "spending-advice": ["What's my biggest expense?", "How can I save more?", "Compare my spending to last month"],
  "wallet-audit": ["What's my health score mean?", "How do I improve my score?", "Show my top payees"],
  "account-summary": ["Break down by category", "What were my biggest sends?", "Generate a statement"],
  "monthly-plan": ["How much should I save?", "What's my daily budget?", "Set a spending alert"],
  "wallet-statement": ["Audit my wallet", "Give spending advice", "What's my balance trend?"],
  "remittance-analysis": ["How much could I save vs Western Union?", "When's the best time to send money?", "Show my top recipients"],
};
const DEFAULT_FOLLOW_UPS = ["Tell me more", "Give me advice", "Summarize this"];

const PLACEHOLDERS = [
  "Ask about your wallet…",
  "How much did I spend this month?",
  "What's my biggest expense?",
  "Am I saving enough?",
  "Audit my wallet…",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    if (trimmed.startsWith("#### ")) {
      nodes.push(<div key={k} style={{ fontWeight: 700, fontSize: "12px", color: "var(--ink)", marginTop: "8px", marginBottom: "2px", letterSpacing: "-0.01em" }}>{trimmed.slice(5)}</div>);
      continue;
    }
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
    if (trimmed === "" || trimmed === "---" || trimmed === "***") { nodes.push(<div key={k} style={{ height: "6px" }} />); continue; }
    nodes.push(<div key={k} style={{ marginTop: "2px" }}>{inlineBold(line)}</div>);
  }
  return nodes;
}

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return <>{parts.map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong> : p)}</>;
}

async function downloadStatement(content: string, address: string) {
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
  const res = await fetch("/api/statement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, address }),
  });
  if (!res.ok) throw new Error("Could not prepare download — please try again.");
  const { id } = (await res.json()) as { id: string };
  window.open(`/api/statement?id=${id}`, "_blank");
}

// ── Icons ────────────────────────────────────────────────────────────────────

function AkiliEyes({ large }: { large?: boolean }) {
  const size = large ? 48 : 28;
  const svgW = large ? 36 : 22;
  const svgH = large ? 22 : 14;
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      background: "var(--slab)", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width={svgW} height={svgH} viewBox="0 0 22 14" fill="none" aria-hidden="true">
        <style>{`
          @keyframes akili-orbit {
            0%   { transform: translate(0px, -1.5px); }
            25%  { transform: translate(1.5px, 0px); }
            50%  { transform: translate(0px, 1.5px); }
            75%  { transform: translate(-1.5px, 0px); }
            100% { transform: translate(0px, -1.5px); }
          }
          .ak-pl { animation: akili-orbit 2s linear infinite; transform-box: fill-box; transform-origin: center; }
          .ak-pr { animation: akili-orbit 2s linear infinite; transform-box: fill-box; transform-origin: center; }
        `}</style>
        <ellipse cx="5" cy="7" rx="4.5" ry="5.5" fill="white" />
        <ellipse cx="17" cy="7" rx="4.5" ry="5.5" fill="white" />
        <circle className="ak-pl" cx="5" cy="7" r="2.2" fill="#1a1505" />
        <circle className="ak-pr" cx="17" cy="7" r="2.2" fill="#1a1505" />
      </svg>
    </div>
  );
}

function SendIcon({ disabled }: { disabled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8h12M8 3l7 5-7 5" stroke={disabled ? "var(--ink-40)" : "#fffdf7"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

// ── Main component ───────────────────────────────────────────────────────────

function HomeInner() {
  const router = useRouter();
  const miniPay = useMiniPay();
  const { balances } = useStableTokenBalances(miniPay.walletAddress);
  const gd = useGDStatus(miniPay.walletAddress);
  const searchParams = useSearchParams();
  const actionParam = searchParams.get("action");
  const autoTriggered = useRef(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // G$ claim banner
  const [gdBannerVisible, setGDBannerVisible] = useState(false);
  useEffect(() => {
    if (gd.hasUnclaimed && shouldShowGDClaimAlert()) setGDBannerVisible(true);
  }, [gd.hasUnclaimed]);

  // Wallet
  const [hasTriedAutoConnect, setHasTriedAutoConnect] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [freeAudits, setFreeAudits] = useState(FREE_LIMIT);
  const [freeChat, setFreeChat] = useState(FREE_LIMIT);
  const [paywallPending, setPaywallPending] = useState<{ content: string; reportType?: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [payingForId, setPayingForId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      if (!localStorage.getItem("akili_onboarded")) {
        router.replace("/onboarding");
      }
    } catch { /* SSR or restricted */ }
  }, [router]);

  useEffect(() => {
    setFreeAudits(getFreeAuditsRemaining());
    setFreeChat(getFreeChatRemaining());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (miniPay.isLoading || miniPay.walletAddress || !miniPay.isMiniPayProvider || hasTriedAutoConnect) return;
    setHasTriedAutoConnect(true);
    setIsAutoConnecting(true);
    void miniPay.connect().finally(() => setIsAutoConnecting(false));
  }, [hasTriedAutoConnect, miniPay]);

  useEffect(() => {
    if (!actionParam || !miniPay.walletAddress || autoTriggered.current || chatLoading) return;
    const action = QUICK_ACTIONS.find((a) => a.reportType === actionParam);
    if (action) {
      autoTriggered.current = true;
      sendMessage(action.prompt, action.reportType);
    }
  }, [miniPay.walletAddress, actionParam]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const positiveBalances = useMemo(
    () => balances.filter((b) => b.hasBalance),
    [balances],
  );

  const totalPortfolioUSD = useMemo(
    () => positiveBalances.reduce((s, b) => s + parseFloat(b.displayAmount.replace(/,/g, "") || "0"), 0),
    [positiveBalances],
  );

  const address = miniPay.walletAddress;
  const walletSummary = address
    ? "Connected"
    : isAutoConnecting || (miniPay.isMiniPayProvider && miniPay.isLoading)
      ? "Auto-connecting"
      : "Wallet required";

  const hasMessages = messages.length > 0;

  // ── Chat logic ───────────────────────────────────────────────────────────

  function newChat() {
    setMessages([]);
    setPaywallPending(null);
  }

  async function executeMessage(content: string, reportType?: string, userMsgOverride?: Message) {
    const userMsg: Message = userMsgOverride ?? { id: Date.now().toString(), role: "user", content, timestamp: new Date() };
    if (!userMsgOverride) setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setChatLoading(true);
    try {
      const endpoint = reportType ? "/api/report" : "/api/chat";
      const body = reportType
        ? { walletAddress: address, reportType, days: 90 }
        : {
            walletAddress: address,
            messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const errMsg =
          res.status === 429
            ? "You're sending messages too quickly. Please wait a moment and try again."
            : typeof data.error === "string"
              ? data.error
              : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { id: `${Date.now()}-e`, role: "assistant", content: errMsg, timestamp: new Date() }]);
        return;
      }
      const reply = (data.narrative ?? data.reply ?? "Could not get a response.") as string;
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-r`, role: "assistant", content: reply, timestamp: new Date(), ...(reportType ? { reportType } : {}) },
      ]);
      if (reportType) { recordAuditUsed(); setFreeAudits(getFreeAuditsRemaining()); }
      else { recordChatUsed(); setFreeChat(getFreeChatRemaining()); }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, role: "assistant", content: "Network error — check your connection and try again.", timestamp: new Date() },
      ]);
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
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setPaywallPending(reportType ? { content, reportType } : { content });
      return;
    }
    await executeMessage(content, reportType);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="chat-layout">
      <SpendingAlertModal walletAddress={miniPay.walletAddress} totalBalance={totalPortfolioUSD} />

      <WalletConnectModal
        isOpen={!miniPay.isLoading && !miniPay.walletAddress}
        isLoading={miniPay.isLoading}
        isMiniPayProvider={miniPay.isMiniPayProvider}
        hasProvider={miniPay.hasProvider}
        isAutoConnecting={isAutoConnecting}
        onConnect={miniPay.connect}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        balances={balances}
        totalPortfolioUSD={totalPortfolioUSD}
        walletAddress={miniPay.walletAddress}
        walletSummary={walletSummary}
        onNewChat={newChat}
        gdBalance={gd.gdBalance}
        gdEntitlement={gd.entitlement}
        isGDVerified={gd.isVerified}
      />

      {/* ── Top bar ── */}
      <header className="chat-topbar">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="chat-topbar__btn"
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="chat-topbar__title">Akili</div>

        <div className="chat-topbar__right">
          {hasMessages && (
            <button
              type="button"
              onClick={newChat}
              className="chat-topbar__btn"
              aria-label="New chat"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <div className="chat-topbar__status">
            <span
              className="chat-topbar__dot"
              style={{ background: address ? "var(--green)" : "var(--amber)" }}
            />
          </div>
        </div>
      </header>

      {/* ── Empty state (ChatGPT-style) ── */}
      {!hasMessages && (
        <div className="chat-empty">
          <AkiliEyes large />
          <h1 className="chat-empty__title">What would you like to know?</h1>
          <p className="chat-empty__subtitle">
            Track your G$ UBI, analyze your wallet, get spending advice, or audit your activity.
          </p>
          {/* G$ claim banner */}
          {gdBannerVisible && address && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "rgba(0,174,255,0.08)", border: "1px solid rgba(0,174,255,0.22)",
              borderRadius: "14px", padding: "10px 14px", width: "100%", maxWidth: "360px",
              marginBottom: "4px",
            }}>
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="16" cy="16" r="16" fill="#00AEFF" />
                <text x="16" y="21" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Arial,sans-serif">G$</text>
              </svg>
              <span style={{ fontSize: "12px", color: "var(--ink-70)", flex: 1, lineHeight: 1.4 }}>
                <strong style={{ color: "#0090cc" }}>{gd.entitlement} G$</strong> unclaimed today
              </span>
              <button
                type="button"
                onClick={() => sendMessage("How can I get more value from my GoodDollar UBI?", "gd-ubi-optimize")}
                style={{
                  fontSize: "11px", fontWeight: 600, color: "#0090cc",
                  background: "rgba(0,174,255,0.12)", border: "none",
                  borderRadius: "8px", padding: "4px 10px", cursor: "pointer", flexShrink: 0,
                }}
              >
                Optimize
              </button>
              <button
                type="button"
                onClick={() => { setGDBannerVisible(false); dismissGDClaimAlert(); }}
                aria-label="Dismiss"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-40)", padding: "0 0 0 2px", fontSize: "14px", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          )}

          <div className="chat-empty__grid">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.reportType}
                type="button"
                onClick={() => sendMessage(a.prompt, a.reportType)}
                disabled={chatLoading || !address}
                className="chat-empty__chip"
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="chat-empty__badges">
            <span
              className="chat-badge"
              style={{
                background: freeAudits > 0 ? "var(--green-soft)" : "var(--bg-soft)",
                color: freeAudits > 0 ? "var(--green-ink)" : "var(--ink-55)",
                borderColor: freeAudits > 0 ? "var(--green)" : "var(--line)",
              }}
            >
              {freeAudits > 0 ? `${freeAudits} free analyses` : `${AI_PRICE_DISPLAY}/analysis`}
            </span>
            <span
              className="chat-badge"
              style={{
                background: freeChat > 0 ? "var(--green-soft)" : "var(--bg-soft)",
                color: freeChat > 0 ? "var(--green-ink)" : "var(--ink-55)",
                borderColor: freeChat > 0 ? "var(--green)" : "var(--line)",
              }}
            >
              {freeChat > 0 ? `${freeChat} free chats` : `${AI_PRICE_DISPLAY}/chat`}
            </span>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      {hasMessages && (
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="message-enter"
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "column" : "row",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: msg.role === "assistant" ? "8px" : 0,
              }}
            >
              {msg.role === "assistant" && <AkiliEyes />}
              <div style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: msg.role === "user" ? "85%" : "calc(100% - 36px)",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user" ? "var(--ink)" : "var(--surface)",
                    color: msg.role === "user" ? "#fffdf7" : "var(--ink)",
                    fontSize: "14px",
                    lineHeight: "1.55",
                    wordBreak: "break-word",
                    border: msg.role === "assistant" ? "1px solid var(--line)" : "none",
                    boxShadow: msg.role === "assistant" ? "var(--shadow)" : "none",
                  }}
                >
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>

                {/* Follow-up suggestions */}
                {msg.role === "assistant" && msg === messages.filter((m) => m.role === "assistant").at(-1) && !chatLoading && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px", maxWidth: "85%" }}>
                    {(FOLLOW_UPS[msg.reportType ?? ""] ?? DEFAULT_FOLLOW_UPS).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendMessage(s)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          cursor: "pointer",
                          background: "var(--bg-soft)",
                          border: "1px solid var(--line)",
                          color: "var(--ink-70)",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Share */}
                {msg.role === "assistant" && msg.content.length > 40 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        void navigator.share({ title: "Akili Financial Report", text: msg.content });
                      } else {
                        void navigator.clipboard.writeText(msg.content).then(() => toast.success("Copied to clipboard"));
                      }
                    }}
                    style={{
                      marginTop: "4px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: "transparent",
                      border: "1px solid var(--line)",
                      color: "var(--ink-55)",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Share
                  </button>
                )}

                {/* Statement download */}
                {msg.role === "assistant" && msg.reportType === "wallet-statement" && address && (
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

                <div style={{ color: "var(--ink-40)", fontSize: "10px", marginTop: "4px", padding: "0 4px", display: "flex", gap: "6px" }}>
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.role === "assistant" && msg.content.length > 200 && (
                    <span>&middot; {Math.ceil(msg.content.split(/\s+/).length / 200)} min read</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {chatLoading && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <AkiliEyes />
              <div style={{
                background: "var(--surface)", border: "1px solid var(--line)",
                boxShadow: "var(--shadow)", borderRadius: "18px 18px 18px 4px",
                padding: "12px 16px", display: "flex", gap: "4px",
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: "var(--ink-40)",
                    animation: `copilot-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Paywall */}
          {paywallPending && !chatLoading && (
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <AkiliEyes />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "80%" }}>
                <div style={{
                  background: "var(--surface)", border: "1px solid var(--line)",
                  boxShadow: "var(--shadow)", borderRadius: "18px 18px 18px 4px",
                  padding: "12px 16px", fontSize: "13px", lineHeight: 1.5,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <strong>Free limit reached</strong>
                    <button type="button" onClick={() => setPaywallPending(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-40)", fontSize: "14px", padding: "0 0 0 8px", lineHeight: 1 }}>&times;</button>
                  </div>
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
                    cursor: paying ? "not-allowed" : "pointer", opacity: paying ? 0.6 : 1,
                  }}
                >
                  {paying ? "Confirming…" : `Pay ${AI_PRICE_DISPLAY} USDC`}
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="chat-input-area">
        <div className="chat-input-bar">
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={PLACEHOLDERS[placeholderIdx]}
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
                boxSizing: "border-box",
              }}
            />
            {input.length > 400 && (
              <span style={{
                position: "absolute", bottom: "6px", right: "10px",
                fontSize: "10px", color: input.length >= 490 ? "var(--coral)" : "var(--ink-40)",
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
              flexShrink: 0, transition: "background 0.15s",
            }}
            aria-label="Send message"
          >
            <SendIcon disabled={chatLoading || !input.trim()} />
          </button>
        </div>
        <div className="chat-input-privacy">Your private key never leaves your device</div>
      </div>

      <style>{`
        @keyframes copilot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}
