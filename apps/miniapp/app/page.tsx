"use client";

import type { Token } from "@yield-copilot/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "../components/bottom-nav";
import { WalletConnectModal } from "../components/wallet-connect-modal";
import { useMiniPay } from "../hooks/use-minipay";
import { usePullToRefresh } from "../hooks/use-pull-to-refresh";
import { useStableTokenBalances } from "../hooks/use-stable-token-balances";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.2v3.2M7 9.6v3.2M1.2 7h3.2M9.6 7h3.2M3 3l2.2 2.2M8.8 8.8L11 11M3 11l2.2-2.2M8.8 5.2L11 3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
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

  useEffect(() => {
    try {
      if (!localStorage.getItem("akili_onboarded")) {
        router.replace("/onboarding");
      }
    } catch { /* ignore — SSR or restricted */ }
  }, [router]);

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

        <Link
          href={canAnalyze ? "/copilot" : "#"}
          className="dashboard-search-card"
          aria-label="Open AI Copilot"
          onClick={(e) => { if (!canAnalyze) { e.preventDefault(); void miniPay.connect(); } }}
        >
          <span className="dashboard-search-card__icon">
            <SearchIcon />
          </span>
          <span>
            {canAnalyze ? "Ask about your wallet…" : "Connect wallet to start analysis"}
          </span>
          <span className="dashboard-search-card__spark">
            <SparkIcon />
          </span>
        </Link>

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
                title={miniPay.walletAddress ? truncateWalletAddress(miniPay.walletAddress) : undefined}
              >
                <span className="dashboard-hero-home__dot" />
                <span>{addressCopied ? "Copied!" : walletSummary}</span>
              </div>
            </div>

            <div className="dashboard-balance-card__amount">
              {selectedBalance?.hasBalance
                ? `${selectedBalance.displayAmount} ${selectedBalance.symbol}`
                : miniPay.walletAddress
                  ? "0 stable balance"
                  : "••••"}
            </div>

            <div className="dashboard-hero-home__eye">
              <EyeOffIcon />
            </div>

            <p className="dashboard-hero-home__headline">
              {canAnalyze
                ? "Analyze your spending, audit your wallet, and get a personalized financial health score."
                : "Connect your wallet to unlock AI-powered financial insights."}
            </p>

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
              <div className="dashboard-hero-home__range">
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
            <span>{pullRefreshing || balancesLoading ? "Refreshing…" : miniPay.walletAddress ? "Live" : walletSummary}</span>
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
                <span className={`token-card__dot token-card__dot--${balance.symbol.toLowerCase()}`} aria-hidden="true" />
                <strong>{balance.symbol}</strong>
                <small>{balance.displayAmount}</small>
              </button>
            ))}
          </div>

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
                <a
                  href="https://minipay.opera.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-action"
                  style={{ marginTop: "10px", display: "inline-block", textDecoration: "none" }}
                >
                  Get MiniPay to deposit
                </a>
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
                {canAnalyze ? "Personalized tips from your activity." : "Connect wallet first."}
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
              <div className="dashboard-pin__meta">Health score and risk check.</div>
            </Link>

            <Link href="/copilot" className="dashboard-chat-card dashboard-chat-card--bundle">
              <div className="dashboard-chat-card__avatar" aria-hidden="true">
                <span />
              </div>
              <div className="dashboard-chat-card__copy">
                <div className="dashboard-action-card__title">Ask the Copilot</div>
                <div className="dashboard-pin__meta">Plain answers about your wallet.</div>
              </div>
              <span className="dashboard-chat-card__arrow">
                <ArrowRightIcon />
              </span>
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
        </section>

        <footer style={{ padding: "12px 16px 4px", display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
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
    </main>
  );
}
