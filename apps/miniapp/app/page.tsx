"use client";

import type { Token } from "@yield-copilot/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "../components/bottom-nav";
import { SpendingAlertModal } from "../components/spending-alert-modal";
import { WalletConnectModal } from "../components/wallet-connect-modal";
import { useMiniPay } from "../hooks/use-minipay";
import { usePullToRefresh } from "../hooks/use-pull-to-refresh";
import { useStableTokenBalances } from "../hooks/use-stable-token-balances";
import {
  type FxRates,
  type LocalCurrency,
  CURRENCY_META,
  convertUSD,
  fetchFxRates,
  formatLocal,
  getPreferredCurrency,
  setPreferredCurrency,
} from "../lib/currency";

function USDCLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <circle cx="16" cy="16" r="12.8" fill="white" fillOpacity="0.15" />
      <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z" fill="none" />
      <text x="16" y="20" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="Arial,sans-serif">USDC</text>
      <circle cx="16" cy="16" r="15" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

function USDTLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <circle cx="16" cy="16" r="12.8" fill="white" fillOpacity="0.15" />
      <text x="16" y="21" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="Arial,sans-serif">₮</text>
      <circle cx="16" cy="16" r="15" stroke="white" strokeOpacity="0.2" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

function TokenLogo({ symbol }: { symbol: string }) {
  if (symbol === "USDC") return <USDCLogo />;
  if (symbol === "USDT") return <USDTLogo />;
  return <span className={`token-card__dot token-card__dot--${symbol.toLowerCase()}`} aria-hidden="true" />;
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 7h8M7.5 3.5L11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M4 12V8a5 5 0 0110 0v4l1.2 1.5H2.8L4 12z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.5 15.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8s2.3-4.5 6.5-4.5c1.4 0 2.6.4 3.6 1M14 8s-1.1 2.2-3.5 3.6M2 2l12 12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpendingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M3 14V8M8 14V4M13 14v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 16h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 8h4M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function truncateWalletAddress(address?: string) {
  if (!address) return "Waiting for wallet";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const LOCAL_CURRENCIES: LocalCurrency[] = ["USD", "NGN", "KES", "GHS", "ZAR"];

export default function HomePage() {
  const router = useRouter();
  const miniPay = useMiniPay();
  const { balances, isLoading: balancesLoading, refresh: refreshBalances } = useStableTokenBalances(miniPay.walletAddress);
  const isMiniPay = miniPay.isMiniPayProvider;
  const { refreshing: pullRefreshing } = usePullToRefresh({ onRefresh: refreshBalances });
  const [selectedToken, setSelectedToken] = useState<Token>("USDC");
  const [hasTriedAutoConnect, setHasTriedAutoConnect] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [localCurrency, setLocalCurrency] = useState<LocalCurrency>("USD");
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [streak, setStreak] = useState(0);
  const currencyBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem("akili_onboarded")) {
        router.replace("/onboarding");
      }
    } catch { /* ignore — SSR or restricted */ }
  }, [router]);

  useEffect(() => {
    setLocalCurrency(getPreferredCurrency());
    void fetchFxRates().then(setFxRates);
  }, []);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const last = localStorage.getItem("akili_last_open");
      const cur = parseInt(localStorage.getItem("akili_streak") ?? "0", 10);
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const next = last === today ? cur : last === yesterday ? cur + 1 : 1;
      localStorage.setItem("akili_last_open", today);
      localStorage.setItem("akili_streak", String(next));
      setStreak(next);
    } catch { /* ignore */ }
  }, []);

  function copyAddress() {
    if (!miniPay.walletAddress) return;
    void navigator.clipboard.writeText(miniPay.walletAddress).then(() => {
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    });
  }

  const positiveBalances = useMemo(
    () => balances.filter((balance) => balance.hasBalance),
    [balances]
  );

  const totalPortfolioUSD = useMemo(
    () => positiveBalances.reduce((s, b) => s + parseFloat(b.displayAmount.replace(/,/g, "") || "0"), 0),
    [positiveBalances]
  );

  useEffect(() => {
    if (miniPay.isLoading || miniPay.walletAddress || !miniPay.isMiniPayProvider || hasTriedAutoConnect) return;
    setHasTriedAutoConnect(true);
    setIsAutoConnecting(true);
    void miniPay.connect().finally(() => setIsAutoConnecting(false));
  }, [hasTriedAutoConnect, miniPay]);

  useEffect(() => {
    if (positiveBalances.length === 0) return;
    const [firstPositiveBalance] = positiveBalances;
    if (firstPositiveBalance && !positiveBalances.some((b) => b.symbol === selectedToken)) {
      setSelectedToken(firstPositiveBalance.symbol);
    }
  }, [positiveBalances, selectedToken]);

  const selectedBalance =
    positiveBalances.find((b) => b.symbol === selectedToken) ??
    balances.find((b) => b.symbol === selectedToken);

  const canAnalyze = Boolean(miniPay.walletAddress);
  const walletSummary = miniPay.walletAddress
    ? "Connected"
    : isAutoConnecting || (miniPay.isMiniPayProvider && miniPay.isLoading)
      ? "Auto-connecting"
      : "Wallet required";

  return (
    <main className="page-shell dashboard-enter">
      <SpendingAlertModal
        walletAddress={miniPay.walletAddress}
        totalBalance={totalPortfolioUSD}
      />

      <WalletConnectModal
        isOpen={!miniPay.isLoading && !miniPay.walletAddress}
        isLoading={miniPay.isLoading}
        isMiniPayProvider={miniPay.isMiniPayProvider}
        hasProvider={miniPay.hasProvider}
        isAutoConnecting={isAutoConnecting}
        onConnect={miniPay.connect}
      />

      <div className="dashboard">
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <span className="dashboard-brand__mark">A</span>
            <div className="dashboard-brand__name">Akili</div>
          </div>
          <div className="dashboard-topbar__actions">
            <Link href="/alerts" className="dashboard-topbar__icon" aria-label="View alerts">
              <BellIcon />
            </Link>
            <Link href="/support" className="dashboard-avatar" aria-label="Open support">AM</Link>
          </div>
        </header>

        <section className="dashboard-home-stack">
          <article className="dashboard-hero-home">
            <div className="dashboard-hero-home__glow" aria-hidden="true" />
            <div className="dashboard-hero-home__top">
              <p className="section-label section-label--on-dark">
                AI Financial Copilot
              </p>
              <div
                className="dashboard-hero-home__status"
                onClick={miniPay.walletAddress ? copyAddress : undefined}
                style={{ cursor: miniPay.walletAddress ? "pointer" : "default" }}
                title={miniPay.walletAddress ?? undefined}
                role={miniPay.walletAddress ? "button" : undefined}
                aria-label={miniPay.walletAddress ? `Copy wallet address: ${truncateWalletAddress(miniPay.walletAddress)}` : undefined}
                tabIndex={miniPay.walletAddress ? 0 : undefined}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") copyAddress(); }}
              >
                <span className="dashboard-hero-home__dot" />
                <span>{addressCopied ? "Copied!" : walletSummary}</span>
              </div>
              {streak > 1 && (
                <span style={{
                  fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.12)", borderRadius: "20px",
                  padding: "2px 7px", letterSpacing: "0.02em"
                }}>
                  🔥 {streak}d
                </span>
              )}
            </div>

            {/* Balance + eye icon on one row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div className="dashboard-balance-card__amount">
                  {selectedBalance?.hasBalance
                    ? `${selectedBalance.displayAmount} ${selectedBalance.symbol}`
                    : miniPay.walletAddress
                      ? "0 stable balance"
                      : "••••"}
                </div>
                {positiveBalances.length > 1 && (
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", marginTop: "2px" }}>Portfolio: ${totalPortfolioUSD.toFixed(2)}</div>
                )}
              </div>
              <div style={{ color: "var(--slab-ink-70)", marginTop: "6px", flexShrink: 0 }}>
                <EyeOffIcon />
              </div>
            </div>

            {/* Local currency + currency selector on one row */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {miniPay.walletAddress && fxRates && localCurrency !== "USD" && (() => {
                return totalPortfolioUSD > 0 ? (
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-mono)" }}>
                    ≈ {formatLocal(convertUSD(totalPortfolioUSD, localCurrency, fxRates), localCurrency)}
                  </span>
                ) : null;
              })()}
              <button
                ref={currencyBtnRef}
                type="button"
                onClick={() => {
                  if (!showCurrencyPicker && currencyBtnRef.current) {
                    const r = currencyBtnRef.current.getBoundingClientRect();
                    setPickerPos({ top: r.bottom + 6, left: r.left });
                  }
                  setShowCurrencyPicker(p => !p);
                }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: "999px", padding: "3px 10px", cursor: "pointer",
                  fontSize: "11px", color: "rgba(255,255,255,0.85)", fontWeight: 600
                }}
              >
                {CURRENCY_META[localCurrency].flag} {localCurrency} ▾
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { label: "Spending Advice", action: "spending-advice" },
                { label: "Wallet Audit", action: "wallet-audit" },
                { label: "Statement", action: "wallet-statement" },
              ].map((item) => (
                <Link
                  key={item.action}
                  href={canAnalyze ? `/copilot?action=${item.action}` : "/copilot"}
                  className="inline-chip inline-chip--slab"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="dashboard-hero-home__footer dashboard-hero-home__footer--bundle">
              <div className="dashboard-hero-home__range" style={{ fontSize: "0.6rem" }}>
                {canAnalyze ? "Wallet connected · ready" : "Wallet required"}
              </div>
              <Link href="/copilot" className="dashboard-primary-link">
                Open Copilot
                <ArrowRightIcon />
              </Link>
            </div>
          </article>

          <div className="dashboard-section-head">
            <p className="section-label">Stable balances</p>
            <span>{pullRefreshing || balancesLoading ? "Refreshing…" : miniPay.walletAddress ? `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : walletSummary}</span>
          </div>

          <div className="wallet-token-grid">
            {balances.map((balance) => (
              <button
                key={balance.symbol}
                type="button"
                className={
                  selectedToken === balance.symbol
                    ? "wallet-token-card is-selected"
                    : "wallet-token-card"
                }
                onClick={() => setSelectedToken(balance.symbol)}
                disabled={!miniPay.walletAddress}
                aria-pressed={selectedToken === balance.symbol}
                aria-label={`${balance.symbol} balance: ${balance.displayAmount}`}
              >
                <TokenLogo symbol={balance.symbol} />
                <strong>{balance.symbol}</strong>
                <small>{balance.displayAmount}</small>
              </button>
            ))}
          </div>

          <Link href="/audit" style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: "18px", padding: "14px 16px",
              display: "flex", alignItems: "center", gap: "14px"
            }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "14px", flexShrink: 0,
                background: "var(--slab)", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "20px"
              }}>🔍</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>Wallet Audit Trail</div>
                <div style={{ fontSize: "11px", color: "var(--ink-55)", marginTop: "2px" }}>
                  Trace any Celo wallet — see where money came from and went
                </div>
              </div>
              <span style={{ fontSize: "14px", color: "var(--ink-40)", flexShrink: 0 }}>→</span>
            </div>
          </Link>

          {miniPay.walletAddress && !balancesLoading && positiveBalances.length === 0 ? (
            <div className="wallet-empty-card">
              <strong>No stable balances found.</strong>
              <span>Add USDC or USDT to unlock analysis.</span>
              {isMiniPay ? (
                <a
                  href="https://link.minipay.xyz/add_cash?tokens=USDm,USDC,USDT"
                  className="primary-action"
                  style={{ marginTop: "10px", display: "inline-block", textDecoration: "none" }}
                >
                  Deposit via MiniPay
                </a>
              ) : (
                <span style={{ marginTop: "10px", fontSize: "13px", color: "var(--ink-55)" }}>
                  Transfer USDC or USDT to your wallet on the Celo network.
                </span>
              )}
            </div>
          ) : null}

          <div className="dashboard-section-head">
            <p className="section-label">AI analysis</p>
            <Link href="/copilot" className="dashboard-inline-button">Open all</Link>
          </div>

          <div className="dashboard-action-row">
            <Link
              href={canAnalyze ? "/copilot?action=spending-advice" : "/copilot"}
              className="dashboard-action-card dashboard-action-card--warm"
            >
              <div className="dashboard-pin__icon dashboard-pin__icon--green">
                <SpendingIcon />
              </div>
              <div className="dashboard-action-card__title">Spending Advice</div>
              <div className="dashboard-pin__meta">
                {canAnalyze ? "Where your money goes · how to save more." : "Connect wallet first."}
              </div>
            </Link>

            <Link
              href={canAnalyze ? "/copilot?action=wallet-audit" : "/copilot"}
              className="dashboard-action-card dashboard-action-card--soft"
            >
              <div className="dashboard-pin__icon dashboard-pin__icon--amber">
                <AuditIcon />
              </div>
              <div className="dashboard-action-card__title">Wallet Audit</div>
              <div className="dashboard-pin__meta">Financial health score · risk check.</div>
            </Link>

          </div>

          <div className="dashboard-insight-row">
            <Link
              href={canAnalyze ? "/copilot?action=account-summary" : "/copilot"}
              className="dashboard-insight-card"
            >
              <div className="dashboard-insight-card__top dashboard-insight-card__top--plain">
                <span>Account summary</span>
              </div>
              <div className="dashboard-monitoring">
                <div className="dashboard-monitoring__copy">
                  <strong>90-day view.</strong>
                  <span>Income, spend &amp; net position.</span>
                </div>
              </div>
              <small>{canAnalyze ? "AI-generated · on demand" : "Connect wallet"}</small>
            </Link>

            <Link
              href={canAnalyze ? "/copilot?action=wallet-statement" : "/copilot"}
              className="dashboard-insight-card"
            >
              <div className="dashboard-insight-card__top dashboard-insight-card__top--plain">
                <span>Statement</span>
              </div>
              <div className="dashboard-monitoring">
                <div className="dashboard-monitoring__copy">
                  <strong>Formal export.</strong>
                  <span>Proof of financial activity.</span>
                </div>
              </div>
              <small>{canAnalyze ? "Generate any time" : "Connect wallet"}</small>
            </Link>
          </div>

          {canAnalyze && (
            <Link
              href="/budget"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "12px", borderRadius: "16px",
                background: "var(--surface)", border: "1px solid var(--line)",
                textDecoration: "none", fontSize: "13px", fontWeight: 600, color: "var(--ink-70)"
              }}
            >
              📊 View Spend Sheet →
            </Link>
          )}
        </section>

        <footer style={{ padding: "4px 16px 4px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--ink-40)" }}>Built on Celo · Powered by Akili AI</span>
        </footer>

        <footer style={{ padding: "8px 16px 4px", display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { label: "Terms", href: "/legal/terms" },
            { label: "Privacy", href: "/legal/privacy" },
            { label: "Support", href: "/support" },
            { label: "Stats", href: "/stats" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ fontSize: "0.72rem", color: "var(--ink-55)", textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ))}
        </footer>

        <BottomNav />
      </div>

      {/* Currency picker rendered outside overflow:hidden card so it isn't clipped */}
      {showCurrencyPicker && (
        <>
          <div
            onClick={() => setShowCurrencyPicker(false)}
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
          />
          <div style={{
            position: "fixed", top: pickerPos.top, left: pickerPos.left, zIndex: 200,
            background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px",
            padding: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            display: "flex", flexDirection: "column", gap: "2px", minWidth: "160px"
          }}>
            {LOCAL_CURRENCIES.map(cur => (
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
                <span style={{ fontSize: "11px", color: "var(--ink-40)", marginLeft: "auto" }}>{CURRENCY_META[cur].symbol}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
