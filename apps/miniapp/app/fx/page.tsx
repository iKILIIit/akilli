"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { haptic } from "../../lib/haptics";
import {
  type FxRates,
  type LocalCurrency,
  CURRENCY_META,
  convertUSD,
  fetchFxRates,
} from "../../lib/currency";
import {
  type FxAlert,
  type FxAlertDirection,
  addFxAlert,
  checkTriggeredFxAlerts,
  getFxAlerts,
  removeFxAlert,
  toggleFxAlert,
} from "../../lib/fx-alerts";
import { lockInEscrow } from "../../lib/escrow";

const TRACKED: LocalCurrency[] = ["NGN", "KES", "GHS", "ZAR"];

const ROUTES = [
  { method: "MiniPay (USDT on Celo)", fee: "< $0.01 gas", totalCost: "~0.01%", speed: "< 5 seconds", highlight: true },
  { method: "Western Union", fee: "3 – 7% of amount", totalCost: "~5%", speed: "1 – 3 days", highlight: false },
  { method: "M-Pesa / Bank Wire", fee: "2 – 5% + fixed fee", totalCost: "~3%", speed: "Minutes – hours", highlight: false },
];

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendArrow({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "flat") return <span style={{ color: "var(--ink-40)", fontSize: "10px" }}>—</span>;
  return (
    <span style={{ color: dir === "up" ? "#22C55E" : "#EF4444", fontSize: "11px", fontWeight: 700 }}>
      {dir === "up" ? "↑" : "↓"}
    </span>
  );
}

export default function FxPage() {
  const [rates, setRates] = useState<FxRates | null>(null);
  const [prevRates, setPrevRates] = useState<Record<string, number>>({});
  const [alerts, setAlerts] = useState<FxAlert[]>([]);
  const [triggered, setTriggered] = useState<FxAlert[]>([]);
  const [usdAmount, setUsdAmount] = useState("");
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertCurrency, setAlertCurrency] = useState<LocalCurrency>("NGN");
  const [alertTarget, setAlertTarget] = useState("");
  const [alertDirection, setAlertDirection] = useState<FxAlertDirection>("above");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Auto-send escrow state
  const [showAutoSend, setShowAutoSend] = useState(false);
  const [autoToken, setAutoToken] = useState<"USDC" | "USDT">("USDC");
  const [autoRecipient, setAutoRecipient] = useState("");
  const [autoAmount, setAutoAmount] = useState("");
  const [autoCurrency, setAutoCurrency] = useState<LocalCurrency>("NGN");
  const [autoRate, setAutoRate] = useState("");
  const [autoStatus, setAutoStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [autoTxHash, setAutoTxHash] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("akili_fx_rates_prev");
      if (raw) setPrevRates(JSON.parse(raw) as Record<string, number>);
    } catch { /* ignore */ }

    void fetchFxRates().then(r => {
      try {
        const existing = localStorage.getItem("akili_fx_rates");
        if (existing) {
          const prev = JSON.parse(existing) as FxRates;
          localStorage.setItem("akili_fx_rates_prev", JSON.stringify(prev.rates));
          setPrevRates(prev.rates);
        }
      } catch { /* ignore */ }
      setRates(r);
      setTriggered(checkTriggeredFxAlerts(r.rates));
    });
    setAlerts(getFxAlerts());
  }, []);

  function refreshAlerts() { setAlerts(getFxAlerts()); }

  function handleAddAlert() {
    const target = parseFloat(alertTarget);
    if (isNaN(target) || target <= 0) return;
    addFxAlert({ currency: alertCurrency, targetRate: target, direction: alertDirection, enabled: true });
    refreshAlerts();
    setAlertTarget("");
    setShowAlertForm(false);
    setSaved(true);
    haptic("medium");
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAutoSend() {
    const amount = parseFloat(autoAmount);
    const rate   = parseFloat(autoRate);
    if (!autoRecipient.startsWith("0x") || isNaN(amount) || amount <= 0 || isNaN(rate) || rate <= 0) return;

    const eth = window.ethereum;
    const accounts = eth?.request ? await (eth.request.bind(eth) as (a: { method: string }) => Promise<unknown>)({ method: "eth_requestAccounts" }) as string[] : undefined;
    const account  = accounts?.[0];
    if (!account) return;

    setAutoStatus("pending");
    haptic("medium");
    try {
      const { orderTx } = await lockInEscrow({
        token: autoToken,
        recipient: autoRecipient,
        amountUSD: amount,
        targetRate: rate,
        currency: autoCurrency,
        account,
      });
      setAutoTxHash(orderTx);
      setAutoStatus("done");
      haptic("heavy");
      setAutoRecipient("");
      setAutoAmount("");
      setAutoRate("");
    } catch {
      setAutoStatus("error");
    }
  }

  function trend(currency: LocalCurrency): "up" | "down" | "flat" {
    if (!rates) return "flat";
    const cur = rates.rates[currency] ?? 0;
    const prev = prevRates[currency] ?? cur;
    if (cur > prev * 1.001) return "up";
    if (cur < prev * 0.999) return "down";
    return "flat";
  }

  const usd = parseFloat(usdAmount) || 0;

  return (
    <main className="page-shell">
      <div className="dashboard">
        <div style={{
          padding: "calc(14px + env(safe-area-inset-top)) 16px 12px",
          background: "rgba(244,241,234,0.92)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 20,
          borderBottom: "1px solid var(--line)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link href="/" className="dashboard-topbar__icon" aria-label="Back to home">
              <BackIcon />
            </Link>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--ink)", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>FX Rates</div>
              <div style={{ color: "var(--ink-55)", fontSize: "11px" }}>
                {rates
                  ? `Updated ${new Date(rates.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Loading…"}
              </div>
            </div>
            {saved && <span style={{ fontSize: "11px", color: "var(--green-ink)", fontWeight: 600 }}>Saved ✓</span>}
          </div>
        </div>

        <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {triggered.length > 0 && (
            <div style={{ background: "#FFF9E6", border: "1px solid #F5C842", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#8B6914", marginBottom: "4px" }}>Rate target reached!</div>
              {triggered.map(a => (
                <div key={a.id} style={{ fontSize: "12px", color: "#8B6914", marginTop: "2px" }}>
                  {CURRENCY_META[a.currency].flag} {a.currency} is now {a.direction} your target of {a.targetRate.toLocaleString()}
                </div>
              ))}
            </div>
          )}

          {/* Live rate cards */}
          <div>
            <div style={{ fontSize: "11px", color: "var(--ink-55)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Live rates · 1 USD =
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {TRACKED.map(cur => {
                const meta = CURRENCY_META[cur];
                const rate = rates?.rates[cur] ?? 0;
                const t = trend(cur);
                return (
                  <div key={cur} style={{
                    background: "var(--surface)", border: "1px solid var(--line)",
                    borderRadius: "16px", padding: "14px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "var(--ink-55)" }}>{meta.flag} {cur}</span>
                      <TrendArrow dir={t} />
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                      {rate > 0
                        ? rate >= 1000
                          ? Math.round(rate).toLocaleString("en")
                          : rate.toFixed(2)
                        : "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--ink-40)", marginTop: "3px" }}>{meta.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick converter */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
              Quick Converter
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-soft)", borderRadius: "12px", padding: "10px 14px", border: "1px solid var(--line)", marginBottom: "10px" }}>
              <span style={{ color: "var(--ink-55)", fontWeight: 600 }}>$</span>
              <input
                type="number"
                value={usdAmount}
                onChange={e => setUsdAmount(e.target.value)}
                placeholder="Enter USD amount"
                min="0"
                step="0.01"
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "18px", fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}
              />
              <span style={{ fontSize: "11px", color: "var(--ink-40)" }}>USD</span>
            </div>
            {usd > 0 && rates ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {TRACKED.map(cur => {
                  const meta = CURRENCY_META[cur];
                  const converted = convertUSD(usd, cur, rates);
                  return (
                    <div key={cur} style={{ background: "var(--bg-soft)", borderRadius: "10px", padding: "8px 10px" }}>
                      <div style={{ fontSize: "10px", color: "var(--ink-40)", marginBottom: "2px" }}>{meta.flag} {cur}</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
                        {meta.symbol}{converted >= 10000
                          ? Math.round(converted).toLocaleString("en")
                          : converted.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--ink-40)", textAlign: "center" }}>
                Type an amount to see local equivalents
              </div>
            )}
          </div>

          {/* Route advisory */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
              Send Route Advisory
            </div>
            {usd > 0 ? (
              <div style={{
                background: "var(--green-soft)", border: "1px solid var(--green)",
                borderRadius: "12px", padding: "10px 12px", marginBottom: "10px"
              }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--green-ink)", marginBottom: "2px" }}>
                  Sending ${usd.toFixed(2)} via MiniPay saves ~${(usd * 0.05).toFixed(2)}
                </div>
                <div style={{ fontSize: "11px", color: "var(--green-ink)", opacity: 0.8 }}>
                  vs. traditional services charging ~5% in fees
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--ink-55)", marginBottom: "10px" }}>
                Enter an amount above to see savings estimate.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {ROUTES.map(r => (
                <div key={r.method} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 10px", borderRadius: "10px",
                  background: r.highlight ? "var(--green-soft)" : "var(--bg-soft)",
                  border: r.highlight ? "1px solid var(--green)" : "1px solid transparent"
                }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: r.highlight ? 700 : 500, color: r.highlight ? "var(--green-ink)" : "var(--ink-70)" }}>
                      {r.method}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--ink-40)", marginTop: "1px" }}>{r.speed}</div>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: r.highlight ? "var(--green-ink)" : "var(--ink-55)", textAlign: "right", flexShrink: 0, marginLeft: "8px" }}>
                    {r.totalCost}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "10px", color: "var(--ink-40)", marginTop: "8px", lineHeight: 1.5 }}>
              Recipient exchanges USDT → local currency via MiniPay or a local exchange.
            </div>
          </div>

          {/* Auto-send escrow */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>Auto-Send at Target Rate</div>
                <div style={{ fontSize: "11px", color: "var(--ink-55)", marginTop: "2px" }}>
                  Lock USDC/USDT in escrow — Akili sends automatically when rate hits your target
                </div>
              </div>
              <span style={{ fontSize: "22px" }}>⚡</span>
            </div>

            {autoStatus === "done" ? (
              <div style={{ background: "var(--green-soft)", border: "1px solid var(--green)", borderRadius: "14px", padding: "14px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", marginBottom: "6px" }}>✓</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--green-ink)", marginBottom: "4px" }}>Funds locked in escrow</div>
                <div style={{ fontSize: "11px", color: "var(--green-ink)", opacity: 0.8, marginBottom: "8px" }}>
                  Akili will send automatically when {autoCurrency} hits your target rate
                </div>
                <a
                  href={`https://celoscan.io/tx/${autoTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: "var(--green-ink)", textDecoration: "underline" }}
                >
                  View on Celoscan →
                </a>
                <button
                  type="button"
                  onClick={() => { setAutoStatus("idle"); setShowAutoSend(false); }}
                  style={{ display: "block", width: "100%", marginTop: "10px", padding: "9px", borderRadius: "10px", border: "1px solid var(--line)", background: "transparent", color: "var(--ink-70)", fontSize: "12px", cursor: "pointer" }}
                >
                  Set another order
                </button>
              </div>
            ) : showAutoSend ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                <div style={{ display: "flex", gap: "6px" }}>
                  {(["USDC", "USDT"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setAutoToken(t)}
                      style={{
                        flex: 1, padding: "8px", borderRadius: "10px", fontSize: "12px", cursor: "pointer",
                        border: `1.5px solid ${autoToken === t ? "var(--ink)" : "var(--line)"}`,
                        background: autoToken === t ? "var(--ink)" : "transparent",
                        color: autoToken === t ? "#fffdf7" : "var(--ink-70)", fontWeight: 600
                      }}>
                      {t}
                    </button>
                  ))}
                </div>

                <div>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Recipient address</div>
                  <input
                    type="text"
                    value={autoRecipient}
                    onChange={e => setAutoRecipient(e.target.value)}
                    placeholder="0x..."
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--bg-soft)", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Amount (USD)</div>
                    <input
                      type="number"
                      value={autoAmount}
                      onChange={e => setAutoAmount(e.target.value)}
                      placeholder="50"
                      min="1"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--bg-soft)", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Currency</div>
                    <select
                      value={autoCurrency}
                      onChange={e => setAutoCurrency(e.target.value as LocalCurrency)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--bg-soft)", fontSize: "13px", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
                    >
                      {TRACKED.map(c => <option key={c} value={c}>{CURRENCY_META[c].flag} {c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    Send when 1 USD ≥ ? {autoCurrency}
                    {rates && (
                      <span style={{ marginLeft: "6px", color: "var(--ink-40)", textTransform: "none", letterSpacing: 0 }}>
                        Now: {Math.round(rates.rates[autoCurrency] ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={autoRate}
                    onChange={e => setAutoRate(e.target.value)}
                    placeholder={`e.g. ${Math.round((rates?.rates[autoCurrency] ?? 1600) * 1.02).toLocaleString()}`}
                    min="0"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--line)", background: "var(--bg-soft)", fontSize: "14px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                {autoStatus === "error" && (
                  <div style={{ fontSize: "12px", color: "#EF4444", textAlign: "center" }}>
                    Transaction failed or was rejected. Try again.
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => { setShowAutoSend(false); setAutoStatus("idle"); }}
                    style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1px solid var(--line)", background: "transparent", color: "var(--ink-70)", fontSize: "13px", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoSend}
                    disabled={autoStatus === "pending" || !autoRecipient || !autoAmount || !autoRate}
                    style={{
                      flex: 2, padding: "11px", borderRadius: "12px", border: "none",
                      background: "var(--ink)", color: "#fffdf7",
                      fontSize: "13px", fontWeight: 600, cursor: "pointer",
                      opacity: autoStatus === "pending" || !autoRecipient || !autoAmount || !autoRate ? 0.5 : 1
                    }}>
                    {autoStatus === "pending" ? "Confirm in wallet…" : "Lock & Schedule Send"}
                  </button>
                </div>

                <div style={{ fontSize: "10px", color: "var(--ink-40)", lineHeight: 1.5, textAlign: "center" }}>
                  You will sign 2 transactions: approve token spend, then lock in escrow.
                  Funds are returned if you cancel before execution.
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowAutoSend(true); haptic("light"); }}
                style={{
                  width: "100%", padding: "13px", borderRadius: "14px",
                  border: "1.5px dashed var(--line-strong)",
                  background: "transparent", color: "var(--ink-70)",
                  fontSize: "14px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                }}>
                <span>⚡</span> Schedule Auto-Send
              </button>
            )}
          </div>

          {/* FX alerts */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p className="section-label">FX Rate Alerts</p>
              {alerts.length > 0 && (
                <span style={{ fontSize: "11px", color: "var(--ink-55)" }}>
                  {alerts.filter(a => a.enabled).length}/{alerts.length} active
                </span>
              )}
            </div>

            {alerts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {alerts.map(alert => (
                  <div key={alert.id} style={{
                    background: "var(--surface)", border: "1px solid var(--line)",
                    borderRadius: "14px", padding: "10px 12px",
                    display: "flex", alignItems: "center", gap: "10px",
                    opacity: alert.enabled ? 1 : 0.55
                  }}>
                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{CURRENCY_META[alert.currency].flag}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                        {alert.currency} {alert.direction === "above" ? "≥" : "≤"} {alert.targetRate.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--ink-40)", marginTop: "1px" }}>
                        {alert.enabled ? "Watching" : "Disabled"} · Now:{" "}
                        {rates?.rates[alert.currency] != null
                          ? Math.round(rates.rates[alert.currency]!).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { toggleFxAlert(alert.id); refreshAlerts(); }}
                      style={{
                        width: "34px", height: "19px", borderRadius: "10px", border: "none", cursor: "pointer",
                        background: alert.enabled ? "var(--green)" : "var(--line-strong)",
                        position: "relative", flexShrink: 0,
                      }}
                      aria-label={alert.enabled ? "Disable alert" : "Enable alert"}
                    >
                      <span style={{
                        position: "absolute", top: "2.5px",
                        left: alert.enabled ? "17px" : "2.5px",
                        width: "14px", height: "14px", borderRadius: "50%",
                        background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transition: "left 0.15s"
                      }} />
                    </button>
                    {confirmDelete === alert.id ? (
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button type="button"
                          onClick={() => { removeFxAlert(alert.id); refreshAlerts(); setConfirmDelete(null); }}
                          style={{ padding: "3px 8px", borderRadius: "6px", background: "var(--coral)", color: "#fff", border: "none", fontSize: "10px", fontWeight: 600, cursor: "pointer" }}>
                          Del
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)}
                          style={{ padding: "3px 8px", borderRadius: "6px", background: "transparent", border: "1px solid var(--line)", fontSize: "10px", cursor: "pointer", color: "var(--ink-55)" }}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDelete(alert.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-40)", padding: "4px", flexShrink: 0 }}>
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAlertForm ? (
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "14px" }}>New FX Alert</div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Currency</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {TRACKED.map(cur => (
                      <button key={cur} type="button" onClick={() => setAlertCurrency(cur)}
                        style={{
                          padding: "5px 12px", borderRadius: "999px", fontSize: "12px", cursor: "pointer",
                          border: `1.5px solid ${alertCurrency === cur ? "var(--ink)" : "var(--line)"}`,
                          background: alertCurrency === cur ? "var(--ink)" : "transparent",
                          color: alertCurrency === cur ? "#fffdf7" : "var(--ink-70)", fontWeight: 500
                        }}>
                        {CURRENCY_META[cur].flag} {cur}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Alert when rate is</div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["above", "below"] as const).map(d => (
                      <button key={d} type="button" onClick={() => setAlertDirection(d)}
                        style={{
                          flex: 1, padding: "8px", borderRadius: "10px", fontSize: "12px", cursor: "pointer",
                          border: `1.5px solid ${alertDirection === d ? "var(--ink)" : "var(--line)"}`,
                          background: alertDirection === d ? "var(--ink)" : "transparent",
                          color: alertDirection === d ? "#fffdf7" : "var(--ink-70)", fontWeight: 500
                        }}>
                        {d === "above" ? "↑ Above" : "↓ Below"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "10px", color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    Target rate (1 USD = ? {alertCurrency})
                    {rates && (
                      <span style={{ marginLeft: "6px", color: "var(--ink-40)", textTransform: "none", letterSpacing: 0 }}>
                        Current: {Math.round(rates.rates[alertCurrency] ?? 0).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-soft)", borderRadius: "12px", padding: "10px 14px", border: "1px solid var(--line)" }}>
                    <input
                      type="number"
                      value={alertTarget}
                      onChange={e => setAlertTarget(e.target.value)}
                      placeholder={`e.g. ${Math.round((rates?.rates[alertCurrency] ?? 1600) * 1.05).toLocaleString()}`}
                      min="0"
                      step="1"
                      style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "16px", fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono)" }}
                    />
                    <span style={{ fontSize: "11px", color: "var(--ink-40)" }}>{alertCurrency}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={() => { setShowAlertForm(false); setAlertTarget(""); }}
                    style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1px solid var(--line)", background: "transparent", color: "var(--ink-70)", fontSize: "13px", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAlert}
                    disabled={!alertTarget || parseFloat(alertTarget) <= 0}
                    style={{
                      flex: 2, padding: "11px", borderRadius: "12px", border: "none",
                      background: "var(--ink)", color: "#fffdf7",
                      fontSize: "13px", fontWeight: 600, cursor: "pointer",
                      opacity: !alertTarget || parseFloat(alertTarget) <= 0 ? 0.4 : 1
                    }}>
                    Set Alert
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowAlertForm(true); haptic("light"); }}
                style={{
                  width: "100%", padding: "13px", borderRadius: "16px",
                  border: "1.5px dashed var(--line-strong)",
                  background: "transparent", color: "var(--ink-70)",
                  fontSize: "14px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                }}>
                <span>+</span> Set FX Rate Alert
              </button>
            )}

            {alerts.length === 0 && !showAlertForm && (
              <div style={{ textAlign: "center", padding: "24px 20px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "16px", marginTop: "8px" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔔</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>No FX alerts set</div>
                <p style={{ fontSize: "11px", color: "var(--ink-55)", margin: 0, lineHeight: 1.5 }}>
                  Get notified when NGN, KES, GHS, or ZAR hit your target rate.
                </p>
              </div>
            )}
          </div>

          <Link href="/copilot?action=remittance-analysis" style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: "16px", padding: "13px 14px",
              display: "flex", alignItems: "center", gap: "12px"
            }}>
              <span style={{ fontSize: "22px", flexShrink: 0 }}>📊</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>Remittance Cost Audit</div>
                <div style={{ fontSize: "11px", color: "var(--ink-55)", marginTop: "1px" }}>
                  See what your cross-border sends actually cost vs traditional methods
                </div>
              </div>
              <span style={{ fontSize: "14px", color: "var(--ink-40)", flexShrink: 0 }}>→</span>
            </div>
          </Link>

        </div>
      </div>
    </main>
  );
}
