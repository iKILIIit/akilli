"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "../../components/bottom-nav";
import { useMiniPay } from "../../hooks/use-minipay";
import { useStableTokenBalances } from "../../hooks/use-stable-token-balances";
import {
  type AlertPeriod,
  type CategoryLimits,
  getCategoryLimits,
  getRules,
  setCategoryLimit,
  clearCategoryLimit,
} from "../../lib/budget-store";
import { upsertContact, getContactMap, resolveLabel } from "../../lib/contacts";
import {
  type FxRates,
  type LocalCurrency,
  CURRENCY_META,
  convertUSD,
  fetchFxRates,
  formatLocal,
  getPreferredCurrency,
  setPreferredCurrency,
} from "../../lib/currency";
import { getAllNotes, setNote } from "../../lib/notes";
import { detectRecurring } from "../../lib/recurring";

type Tx = {
  hash: string;
  timestamp: number;
  type: string;
  category: string;
  amount: string;
  token: string;
  counterparty: string;
  counterpartyLabel: string;
};

type WalletData = {
  transactions: Tx[];
  totalReceived: Record<string, number>;
  totalSent: Record<string, number>;
  totalGasFeesUSD: number;
};

const PERIODS: { label: string; value: AlertPeriod; seconds: number }[] = [
  { label: "Today",   value: "daily",     seconds: 86_400 },
  { label: "Week",    value: "weekly",    seconds: 7 * 86_400 },
  { label: "Month",   value: "monthly",   seconds: 30 * 86_400 },
  { label: "Quarter", value: "quarterly", seconds: 90 * 86_400 },
];

const CATEGORY_META: Record<string, { label: string; color: string; emoji: string }> = {
  transfer: { label: "Transfers",       color: "#60A5FA", emoji: "💸" },
  defi:     { label: "Savings & DeFi",  color: "#3DD68C", emoji: "🌱" },
  fee:      { label: "Network Fees",    color: "#F97316", emoji: "⛽" },
  unknown:  { label: "Other",           color: "#94A3B8", emoji: "📦" },
};

const FREQ_LABEL = { weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly" };

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 5h5M4.5 7.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function BudgetBar({ label, emoji, color, actual, limit, localAmt, onSetLimit, onClearLimit }: {
  label: string; emoji: string; color: string; actual: number; limit?: number | undefined; localAmt?: string | undefined;
  onSetLimit?: (v: number) => void; onClearLimit?: () => void;
}) {
  const pct = limit ? Math.min(100, (actual / limit) * 100) : 0;
  const over = limit ? actual > limit : false;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function submit() {
    const n = parseFloat(draft);
    if (n > 0) onSetLimit?.(n);
    setEditing(false);
    setDraft("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "var(--ink-70)", display: "flex", alignItems: "center", gap: "5px" }}>
          <span>{emoji}</span> {label}
        </span>
        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "6px" }}>
          <div>
            <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: over ? "var(--coral-ink)" : "var(--ink-70)", fontWeight: 600 }}>
              ${actual.toFixed(2)}{limit ? ` / $${limit}` : ""}
            </span>
            {localAmt && (
              <div style={{ fontSize: "10px", color: "var(--ink-40)", fontFamily: "var(--font-mono)" }}>{localAmt}</div>
            )}
          </div>
          {onSetLimit && !editing && (
            <button
              type="button"
              onClick={() => { setEditing(true); setDraft(limit ? String(limit) : ""); }}
              style={{ fontSize: "10px", color: "var(--ink-40)", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", borderRadius: "6px" }}
            >
              {limit ? "✏️" : "+ limit"}
            </button>
          )}
          {limit && onClearLimit && !editing && (
            <button type="button" onClick={onClearLimit} style={{ fontSize: "10px", color: "var(--ink-40)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Monthly limit ($)"
            autoFocus
            min="0"
            step="1"
            style={{ flex: 1, fontSize: "12px", padding: "5px 8px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--bg-soft)", outline: "none", color: "var(--ink)" }}
            onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setEditing(false); setDraft(""); } }}
          />
          <button type="button" onClick={submit} style={{ padding: "5px 10px", borderRadius: "8px", background: "var(--ink)", color: "#fffdf7", border: "none", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Set</button>
          <button type="button" onClick={() => { setEditing(false); setDraft(""); }} style={{ padding: "5px 8px", borderRadius: "8px", background: "transparent", border: "1px solid var(--line)", fontSize: "11px", cursor: "pointer", color: "var(--ink-55)" }}>✕</button>
        </div>
      )}

      {limit ? (
        <div style={{ height: "6px", borderRadius: "3px", background: "var(--line)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: over ? "var(--coral)" : color, borderRadius: "3px", transition: "width 0.6s ease" }} />
        </div>
      ) : (
        <div style={{ height: "6px", borderRadius: "3px", background: color, opacity: 0.3 }} />
      )}
    </div>
  );
}

export default function BudgetPage() {
  const router = useRouter();
  const { walletAddress } = useMiniPay();
  const { balances } = useStableTokenBalances(walletAddress);
  const [period, setPeriod] = useState<AlertPeriod>("monthly");
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Currency
  const [localCurrency, setLocalCurrency] = useState<LocalCurrency>("USD");
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Contacts
  const [contactMap, setContactMap] = useState<Map<string, string>>(new Map());
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [contactText, setContactText] = useState("");

  // Notes
  const [allNotes, setAllNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Transaction list toggle + search
  const [showTxList, setShowTxList] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txTokenFilter, setTxTokenFilter] = useState<string>("all");

  // Category limits
  const [categoryLimits, setCategoryLimitsState] = useState<CategoryLimits>({});

  const totalBalance = useMemo(
    () => balances.reduce((s, b) => s + (parseFloat(b.displayAmount.replace(/,/g, "")) || 0), 0),
    [balances]
  );

  useEffect(() => {
    setLocalCurrency(getPreferredCurrency());
    void fetchFxRates().then(setFxRates);
    setContactMap(getContactMap());
    setAllNotes(getAllNotes());
    setCategoryLimitsState(getCategoryLimits());
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    setError("");
    fetch(`/api/wallet?address=${walletAddress}&days=92`)
      .then(r => r.json())
      .then((d: WalletData) => setWallet(d))
      .catch(() => setError("Could not load transactions."))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const periodSeconds = PERIODS.find(p => p.value === period)!.seconds;
  const cutoff = Math.floor(Date.now() / 1000) - periodSeconds;

  const periodTxs = useMemo(
    () => wallet?.transactions.filter(t => t.timestamp >= cutoff) ?? [],
    [wallet, cutoff]
  );

  const totalSpent = useMemo(
    () => periodTxs.filter(t => t.type === "sent" || t.type === "contract").reduce((s, t) => s + parseFloat(t.amount), 0),
    [periodTxs]
  );

  const totalReceived = useMemo(
    () => periodTxs.filter(t => t.type === "received").reduce((s, t) => s + parseFloat(t.amount), 0),
    [periodTxs]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of periodTxs) {
      if (tx.type !== "sent" && tx.type !== "contract") continue;
      map[tx.category] = (map[tx.category] ?? 0) + parseFloat(tx.amount);
    }
    return map;
  }, [periodTxs]);

  const topCounterparties = useMemo(() => {
    const map = new Map<string, { amount: number; address: string }>();
    for (const tx of periodTxs) {
      if (tx.type !== "sent" && tx.type !== "contract") continue;
      const key = tx.counterpartyLabel;
      const entry = map.get(key) ?? { amount: 0, address: tx.counterparty };
      entry.amount += parseFloat(tx.amount);
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .map(([label, { amount, address }]) => ({
        label,
        displayName: resolveLabel(label, contactMap),
        amount,
        address,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [periodTxs, contactMap]);

  const recurringPatterns = useMemo(
    () => wallet ? detectRecurring(wallet.transactions.map(t => ({
      timestamp: t.timestamp,
      type: t.type,
      amount: t.amount,
      counterpartyLabel: resolveLabel(t.counterpartyLabel, contactMap),
    }))) : [],
    [wallet, contactMap]
  );

  const txList = useMemo(
    () => [...periodTxs].sort((a, b) => b.timestamp - a.timestamp),
    [periodTxs]
  );

  const filteredTxs = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return txList.filter(tx => {
      if (txTokenFilter !== "all" && tx.token !== txTokenFilter) return false;
      if (!q) return true;
      const contactName = resolveLabel(tx.counterpartyLabel, contactMap).toLowerCase();
      return contactName.includes(q) || tx.counterpartyLabel.toLowerCase().includes(q) || (allNotes[tx.hash] ?? "").toLowerCase().includes(q);
    });
  }, [txList, txSearch, txTokenFilter, contactMap, allNotes]);

  const availableTokens = useMemo(() => {
    const set = new Set(txList.map(t => t.token));
    return Array.from(set).sort();
  }, [txList]);

  async function downloadCSV() {
    const header = "Date,Type,Category,Token,Amount,Counterparty,Note";
    const rows = txList.map(tx => [
      new Date(tx.timestamp * 1000).toISOString().slice(0, 10),
      tx.type,
      tx.category,
      tx.token,
      parseFloat(tx.amount).toFixed(6),
      `"${resolveLabel(tx.counterpartyLabel, contactMap).replace(/"/g, '""')}"`,
      `"${(allNotes[tx.hash] ?? "").replace(/"/g, '""')}"`,
    ].join(","));
    const csvContent = header + "\n" + rows.join("\n");
    const filename = `akili-${walletAddress!.slice(0, 6)}-${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const file = new File([blob], filename, { type: "text/csv" });

    // Web Share API — triggers native share/save sheet on iOS and Android WebViews
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Akili Transactions" });
      return;
    }

    // Desktop fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  const savingsGoalRules = useMemo(
    () => getRules().filter(r => r.enabled && r.type === "savings_goal"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wallet]
  );

  function toLocal(usd: number): string | undefined {
    if (!fxRates || localCurrency === "USD") return undefined;
    return formatLocal(convertUSD(usd, localCurrency, fxRates), localCurrency);
  }

  function saveContactName() {
    if (!editingContact) return;
    upsertContact(editingContact, contactText);
    setContactMap(getContactMap());
    setEditingContact(null);
    setContactText("");
  }

  function saveNote(hash: string) {
    setNote(hash, noteText);
    setAllNotes(getAllNotes());
    setEditingNote(null);
    setNoteText("");
  }

  function formatDate(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString("en", { month: "short", day: "numeric" });
  }

  function isAddressLike(label: string): boolean {
    return /^0x[0-9a-fA-F]{4,}/.test(label) || (label.includes("…") && label.startsWith("0x"));
  }

  if (!walletAddress) {
    return (
      <main className="page-shell">
        <div className="dashboard">
          <header className="dashboard-topbar">
            <div className="dashboard-brand">
              <span className="dashboard-brand__mark">A</span>
              <div className="dashboard-brand__name">Budget</div>
            </div>
          </header>
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "14px" }}>📊</div>
            <strong style={{ fontSize: "1.1rem" }}>Connect your wallet</strong>
            <p style={{ color: "var(--ink-55)", fontSize: "0.88rem", marginTop: "8px" }}>
              Connect MiniPay to see your spend sheet.
            </p>
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="dashboard">
        {/* Header */}
        <div style={{
          padding: "calc(14px + env(safe-area-inset-top)) 16px 0",
          background: "rgba(244, 241, 234, 0.92)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 20,
          borderBottom: "1px solid var(--line)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <Link href="/" className="dashboard-topbar__icon" aria-label="Back">
              <BackIcon />
            </Link>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--ink)", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>Spend Sheet</div>
              <div style={{ color: "var(--ink-55)", fontSize: "11px" }}>Where your money went</div>
            </div>

            {/* Currency selector */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowCurrencyPicker(p => !p)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "var(--bg-soft)", border: "1px solid var(--line)",
                  borderRadius: "999px", padding: "4px 10px", cursor: "pointer",
                  fontSize: "11px", color: "var(--ink-70)", fontWeight: 600
                }}
              >
                {CURRENCY_META[localCurrency].flag} {localCurrency} ▾
              </button>
              {showCurrencyPicker && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
                  background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px",
                  padding: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                  display: "flex", flexDirection: "column", gap: "2px", minWidth: "160px"
                }}>
                  {(["USD", "NGN", "KES", "GHS", "ZAR"] as LocalCurrency[]).map(cur => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => {
                        setLocalCurrency(cur);
                        setPreferredCurrency(cur);
                        setShowCurrencyPicker(false);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        padding: "8px 10px", borderRadius: "10px", border: "none",
                        background: cur === localCurrency ? "var(--bg-soft)" : "transparent",
                        cursor: "pointer", fontSize: "13px", color: "var(--ink)", textAlign: "left"
                      }}
                    >
                      <span>{CURRENCY_META[cur].flag}</span>
                      <span style={{ fontWeight: cur === localCurrency ? 700 : 400 }}>{cur}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/alerts")}
              style={{ fontSize: "11px", color: "var(--ink-55)", background: "transparent", padding: "4px 8px", border: "1px solid var(--line)", borderRadius: "8px", cursor: "pointer" }}
            >
              Set Alerts
            </button>
          </div>

          {/* Period selector */}
          <div className="segmented-row" style={{ margin: "0 0 12px" }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`segmented-row__item${period === p.value ? " is-active" : ""}`}
              >
                {p.label}
                {period === p.value && periodTxs.length > 0 && (
                  <span style={{ marginLeft: "4px", fontSize: "9px", opacity: 0.7 }}>({periodTxs.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: "80px", borderRadius: "18px", background: "var(--surface)", border: "1px solid var(--line)", animation: "pulse 1.4s ease-in-out infinite" }} />
              ))}
            </div>
          )}

          {error && <div className="notice-card danger"><strong>{error}</strong></div>}

          {!loading && wallet && (
            <>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "14px" }}>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Spent</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--coral-ink)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
                    ${totalSpent.toFixed(2)}
                  </div>
                  {toLocal(totalSpent) && (
                    <div style={{ fontSize: "11px", color: "var(--ink-40)", fontFamily: "var(--font-mono)" }}>≈ {toLocal(totalSpent)}</div>
                  )}
                  <div style={{ fontSize: "10px", color: "var(--ink-40)", marginTop: "2px" }}>{periodTxs.filter(t => t.type === "sent" || t.type === "contract").length} txns</div>
                </div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "14px" }}>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Received</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--green-ink)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
                    ${totalReceived.toFixed(2)}
                  </div>
                  {toLocal(totalReceived) && (
                    <div style={{ fontSize: "11px", color: "var(--ink-40)", fontFamily: "var(--font-mono)" }}>≈ {toLocal(totalReceived)}</div>
                  )}
                  <div style={{ fontSize: "10px", color: "var(--ink-40)", marginTop: "2px" }}>Balance: ${totalBalance.toFixed(2)}</div>
                </div>
              </div>

              {/* Gas fees callout */}
              {wallet && wallet.totalGasFeesUSD > 0 && (
                <div style={{ background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: "14px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--ink-55)" }}>⛽ Network fees paid</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-70)", fontFamily: "var(--font-mono)" }}>${wallet.totalGasFeesUSD.toFixed(4)}</span>
                </div>
              )}

              {/* Net position */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", color: "var(--ink-55)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Net position</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: (totalReceived - totalSpent) >= 0 ? "var(--green-ink)" : "var(--coral-ink)", fontFamily: "var(--font-mono)" }}>
                      {(totalReceived - totalSpent) >= 0 ? "+" : ""}${(totalReceived - totalSpent).toFixed(2)}
                    </span>
                    {toLocal(Math.abs(totalReceived - totalSpent)) && (
                      <div style={{ fontSize: "10px", color: "var(--ink-40)", fontFamily: "var(--font-mono)" }}>≈ {toLocal(Math.abs(totalReceived - totalSpent))}</div>
                    )}
                  </div>
                </div>
                {(totalReceived + totalSpent) > 0 && (
                  <div style={{ height: "8px", borderRadius: "4px", overflow: "hidden", background: "var(--line)", display: "flex" }}>
                    <div style={{ height: "100%", width: `${(totalReceived / (totalReceived + totalSpent)) * 100}%`, background: "var(--green)", transition: "width 0.6s ease" }} />
                    <div style={{ height: "100%", flex: 1, background: "var(--coral)" }} />
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                  <span style={{ fontSize: "10px", color: "var(--green-ink)" }}>In</span>
                  <span style={{ fontSize: "10px", color: "var(--coral-ink)" }}>Out</span>
                </div>
              </div>

              {/* Savings goals progress */}
              {savingsGoalRules.length > 0 && (
                <div>
                  <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                    <p className="section-label">🎯 Savings goals</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {savingsGoalRules.map(rule => {
                      const pct = Math.min(100, (totalBalance / rule.amount) * 100);
                      const reached = totalBalance >= rule.amount;
                      const barColor = reached ? "var(--green)" : pct >= 75 ? "var(--amber)" : "oklch(0.6 0.14 260)";
                      return (
                        <div key={rule.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", padding: "12px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{rule.label}</span>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: reached ? "var(--green-ink)" : "var(--ink-70)", fontFamily: "var(--font-mono)" }}>
                                ${totalBalance.toFixed(2)} / ${rule.amount}
                              </span>
                              {toLocal(rule.amount) && (
                                <div style={{ fontSize: "10px", color: "var(--ink-40)", fontFamily: "var(--font-mono)" }}>
                                  goal: {toLocal(rule.amount)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ height: "8px", borderRadius: "4px", background: "var(--line)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "4px", transition: "width 0.6s ease" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                            <span style={{ fontSize: "10px", color: "var(--ink-40)" }}>{pct.toFixed(1)}%</span>
                            {reached
                              ? <span style={{ fontSize: "10px", color: "var(--green-ink)", fontWeight: 600 }}>Goal reached!</span>
                              : <span style={{ fontSize: "10px", color: "var(--ink-40)" }}>
                                ${(rule.amount - totalBalance).toFixed(2)} to go
                              </span>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spending by category */}
              {Object.keys(byCategory).length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "16px" }}>
                  <div className="dashboard-section-head" style={{ marginBottom: "14px" }}>
                    <p className="section-label">By category</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {Object.entries(byCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([cat, amt]) => {
                        const meta = CATEGORY_META[cat] ?? CATEGORY_META.unknown!;
                        return (
                          <BudgetBar
                            key={cat}
                            label={meta.label}
                            emoji={meta.emoji}
                            color={meta.color}
                            actual={amt}
                            limit={categoryLimits[cat] ?? undefined}
                            localAmt={toLocal(amt)}
                            onSetLimit={v => {
                              setCategoryLimit(cat, v);
                              setCategoryLimitsState(getCategoryLimits());
                            }}
                            onClearLimit={() => {
                              clearCategoryLimit(cat);
                              setCategoryLimitsState(getCategoryLimits());
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Top payees */}
              {topCounterparties.length > 0 && (
                <div>
                  <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                    <p className="section-label">Top payees</p>
                    <span style={{ fontSize: "11px", color: "var(--ink-40)" }}>Tap name to rename</span>
                  </div>
                  <div className="list-card">
                    {topCounterparties.map(({ label, displayName, amount }, i) => (
                      <div key={label} className={`list-card__row${i === topCounterparties.length - 1 ? " list-card__row--last" : ""}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                        {editingContact === label ? (
                          <div style={{ display: "flex", gap: "6px", width: "100%", alignItems: "center" }}>
                            <input
                              type="text"
                              value={contactText}
                              onChange={e => setContactText(e.target.value)}
                              placeholder="Enter a name…"
                              autoFocus
                              style={{ flex: 1, fontSize: "13px", padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--bg-soft)", outline: "none", color: "var(--ink)" }}
                              onKeyDown={e => { if (e.key === "Enter") saveContactName(); if (e.key === "Escape") { setEditingContact(null); setContactText(""); } }}
                            />
                            <button type="button" onClick={saveContactName} style={{ padding: "6px 12px", borderRadius: "8px", background: "var(--ink)", color: "#fffdf7", border: "none", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Save</button>
                            <button type="button" onClick={() => { setEditingContact(null); setContactText(""); }} style={{ padding: "6px 8px", borderRadius: "8px", background: "transparent", border: "1px solid var(--line)", fontSize: "12px", cursor: "pointer", color: "var(--ink-55)" }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                            <div style={{ flex: 1 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAddressLike(label)) {
                                    setEditingContact(label);
                                    setContactText(displayName !== label ? displayName : "");
                                  }
                                }}
                                style={{
                                  background: "none", border: "none", padding: 0, cursor: isAddressLike(label) ? "pointer" : "default",
                                  fontSize: "13px", fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: "5px"
                                }}
                              >
                                {displayName}
                                {isAddressLike(label) && <span style={{ color: "var(--ink-40)" }}><EditIcon /></span>}
                              </button>
                              {displayName !== label && (
                                <div style={{ fontSize: "10px", color: "var(--ink-40)", marginTop: "1px" }}>{label}</div>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--coral-ink)", fontFamily: "var(--font-mono)" }}>
                                ${amount.toFixed(2)}
                              </span>
                              {toLocal(amount) && (
                                <div style={{ fontSize: "10px", color: "var(--ink-40)", fontFamily: "var(--font-mono)" }}>{toLocal(amount)}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recurring payments */}
              {recurringPatterns.length > 0 && (
                <div>
                  <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                    <p className="section-label">🔁 Recurring payments</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {recurringPatterns.map(pat => {
                      const daysUntil = Math.round((pat.nextExpected - Date.now() / 1000) / 86400);
                      const overdue = daysUntil < 0;
                      return (
                        <div key={pat.counterparty} style={{
                          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px",
                          padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px"
                        }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--bg-soft)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>🔁</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pat.counterparty}</div>
                            <div style={{ fontSize: "11px", color: "var(--ink-55)" }}>
                              {FREQ_LABEL[pat.frequency]} · {pat.occurrences}× · avg ${pat.avgAmount.toFixed(2)}
                              {toLocal(pat.avgAmount) && ` ≈ ${toLocal(pat.avgAmount)}`}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: overdue ? "var(--coral-ink)" : "var(--green-ink)" }}>
                              {overdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? "Due today" : `In ${daysUntil}d`}
                            </div>
                            <div style={{ fontSize: "10px", color: "var(--ink-40)" }}>next expected</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Transaction list */}
              <div>
                <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                  <p className="section-label">Transactions</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {txList.length > 0 && (
                      <button
                        type="button"
                        onClick={downloadCSV}
                        style={{ fontSize: "11px", color: "var(--ink-55)", background: "var(--bg-soft)", border: "1px solid var(--line)", borderRadius: "8px", cursor: "pointer", padding: "3px 8px", fontWeight: 500 }}
                      >
                        ↓ CSV
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowTxList(p => !p)}
                      style={{ fontSize: "11px", color: "var(--ink-55)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                    >
                      {showTxList ? "Hide" : `Show ${txList.length}`}
                    </button>
                  </div>
                </div>

                {showTxList && (
                  <>
                    {/* Search + token filter */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: (txSearch || txTokenFilter !== "all") ? "4px" : "10px" }}>
                      <input
                        type="text"
                        value={txSearch}
                        onChange={e => setTxSearch(e.target.value)}
                        placeholder="Search contacts or notes…"
                        style={{
                          flex: 1, fontSize: "12px", padding: "8px 12px", borderRadius: "10px",
                          border: "1px solid var(--line)", background: "var(--bg-soft)",
                          outline: "none", color: "var(--ink)",
                        }}
                      />
                      {availableTokens.length > 1 && (
                        <select
                          value={txTokenFilter}
                          onChange={e => setTxTokenFilter(e.target.value)}
                          style={{
                            fontSize: "12px", padding: "8px 10px", borderRadius: "10px",
                            border: "1px solid var(--line)", background: "var(--bg-soft)",
                            color: "var(--ink)", outline: "none", cursor: "pointer",
                          }}
                        >
                          <option value="all">All tokens</option>
                          {availableTokens.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>

                    {(txSearch || txTokenFilter !== "all") && (
                      <div style={{ fontSize: "11px", color: "var(--ink-55)", marginBottom: "6px", paddingLeft: "2px" }}>
                        {filteredTxs.length} result{filteredTxs.length !== 1 ? "s" : ""} of {txList.length}
                      </div>
                    )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {filteredTxs.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--ink-55)", fontSize: "13px" }}>
                        {txSearch || txTokenFilter !== "all" ? "No matching transactions." : "No transactions in this period."}
                      </div>
                    ) : filteredTxs.map(tx => {
                      const isOut = tx.type === "sent" || tx.type === "contract";
                      const contactName = resolveLabel(tx.counterpartyLabel, contactMap);
                      const note = allNotes[tx.hash] ?? "";
                      return (
                        <div key={tx.hash} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ fontSize: "18px", flexShrink: 0 }}>
                              {tx.type === "received" ? "📥" : tx.type === "failed" ? "❌" : tx.category === "defi" ? "🌱" : "📤"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {contactName}
                              </div>
                              <div style={{ fontSize: "10px", color: "var(--ink-40)" }}>{formatDate(tx.timestamp)} · {tx.token}</div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: isOut ? "var(--coral-ink)" : "var(--green-ink)", fontFamily: "var(--font-mono)" }}>
                                {isOut ? "-" : "+"}${parseFloat(tx.amount).toFixed(2)}
                              </div>
                              {toLocal(parseFloat(tx.amount)) && (
                                <div style={{ fontSize: "10px", color: "var(--ink-40)", fontFamily: "var(--font-mono)" }}>
                                  {toLocal(parseFloat(tx.amount))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Note */}
                          {editingNote === tx.hash ? (
                            <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                              <input
                                type="text"
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Add a note…"
                                autoFocus
                                maxLength={120}
                                style={{ flex: 1, fontSize: "12px", padding: "5px 8px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--bg-soft)", outline: "none", color: "var(--ink)" }}
                                onKeyDown={e => { if (e.key === "Enter") saveNote(tx.hash); if (e.key === "Escape") { setEditingNote(null); setNoteText(""); } }}
                              />
                              <button type="button" onClick={() => saveNote(tx.hash)} style={{ padding: "5px 10px", borderRadius: "8px", background: "var(--ink)", color: "#fffdf7", border: "none", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Save</button>
                              <button type="button" onClick={() => { setEditingNote(null); setNoteText(""); }} style={{ padding: "5px 8px", borderRadius: "8px", background: "transparent", border: "1px solid var(--line)", fontSize: "11px", cursor: "pointer", color: "var(--ink-55)" }}>✕</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setEditingNote(tx.hash); setNoteText(note); }}
                              style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", padding: 0, cursor: "pointer", color: note ? "var(--ink-55)" : "var(--ink-40)", fontSize: "11px" }}
                            >
                              <NoteIcon />
                              {note || "Add note"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </div>

              {periodTxs.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-55)", fontSize: "14px" }}>
                  No transactions in this period.
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push("/alerts")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "14px", borderRadius: "16px", width: "100%",
                  background: "var(--ink)", color: "#fffdf7", border: "none",
                  fontSize: "14px", fontWeight: 600, cursor: "pointer"
                }}
              >
                ⚡ Set Spending Alerts
              </button>
            </>
          )}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
      <BottomNav />
    </main>
  );
}
