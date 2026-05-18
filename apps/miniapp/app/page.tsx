"use client";

import type { Token } from "@yield-copilot/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "../components/bottom-nav";
import { WalletConnectModal } from "../components/wallet-connect-modal";
import { useMiniPay } from "../hooks/use-minipay";
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

function CompassIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.5 6.5L10 10l-3.5 1.5L8 8z" fill="currentColor" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M3 14V8M8 14V4M13 14v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 16h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function truncateWalletAddress(address?: string) {
  if (!address) {
    return "Waiting for wallet";
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function HomePage() {
  const router = useRouter();
  const miniPay = useMiniPay();
  const { balances, isLoading: balancesLoading } = useStableTokenBalances(
    miniPay.walletAddress
  );
  const [selectedToken, setSelectedToken] = useState<Token>("USDC");
  const [hasTriedAutoConnect, setHasTriedAutoConnect] = useState(false);

  const positiveBalances = useMemo(
    () => balances.filter((balance) => balance.hasBalance),
    [balances]
  );

  useEffect(() => {
    if (
      miniPay.isLoading ||
      miniPay.walletAddress ||
      !miniPay.isMiniPayProvider ||
      hasTriedAutoConnect
    ) {
      return;
    }

    setHasTriedAutoConnect(true);
    void miniPay.connect();
  }, [
    hasTriedAutoConnect,
    miniPay.isLoading,
    miniPay.isMiniPayProvider,
    miniPay.walletAddress,
    miniPay
  ]);

  useEffect(() => {
    if (positiveBalances.length === 0) {
      return;
    }

    const [firstPositiveBalance] = positiveBalances;
    if (firstPositiveBalance && !positiveBalances.some((balance) => balance.symbol === selectedToken)) {
      setSelectedToken(firstPositiveBalance.symbol);
    }
  }, [positiveBalances, selectedToken]);

  const selectedBalance =
    positiveBalances.find((balance) => balance.symbol === selectedToken) ??
    balances.find((balance) => balance.symbol === selectedToken);
  const canRunAnalysis = Boolean(
    miniPay.walletAddress && selectedBalance && selectedBalance.hasBalance
  );
  const walletSummary = miniPay.walletAddress
    ? truncateWalletAddress(miniPay.walletAddress)
    : miniPay.isMiniPayProvider
      ? "Auto-connecting"
      : "Wallet required";

  const baseParams = useMemo(() => {
    const params = new URLSearchParams({
      goal: "earn-more",
      token: selectedToken,
      amount: selectedBalance?.inputAmount && selectedBalance.inputAmount !== "0"
        ? selectedBalance.inputAmount
        : "2400",
      timeHorizonDays: "30",
      riskComfort: "low"
    });

    if (miniPay.walletAddress) {
      params.set("walletAddress", miniPay.walletAddress);
    }

    return params.toString();
  }, [miniPay.walletAddress, selectedBalance?.inputAmount, selectedToken]);

  function handleRunCheck() {
    if (!canRunAnalysis) {
      if (!miniPay.walletAddress) {
        void miniPay.connect();
      }
      return;
    }

    router.push(`/check?${baseParams}`);
  }

  return (
    <main className="page-shell dashboard-enter">
      <WalletConnectModal
        isOpen={!miniPay.isLoading && !miniPay.walletAddress}
        isLoading={miniPay.isLoading}
        isMiniPayProvider={miniPay.isMiniPayProvider}
        hasProvider={miniPay.hasProvider}
        onConnect={miniPay.connect}
      />

      <div className="dashboard">
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <span className="dashboard-brand__mark">Y</span>
            <div className="dashboard-brand__name">Yield Copilot</div>
          </div>
          <div className="dashboard-topbar__actions">
            <Link href={`/alerts?${baseParams}`} className="dashboard-topbar__icon" aria-label="View alerts">
              <BellIcon />
            </Link>
            <Link href="/support" className="dashboard-avatar" aria-label="Open support">AM</Link>
          </div>
        </header>

        <button type="button" className="dashboard-search-card" onClick={handleRunCheck}>
          <span className="dashboard-search-card__icon">
            <SearchIcon />
          </span>
          <span>
            {canRunAnalysis
              ? `What should I do with my ${selectedToken}?`
              : "Connect wallet to start a check"}
          </span>
          <span className="dashboard-search-card__spark">
            <SparkIcon />
          </span>
        </button>

        <section className="dashboard-home-stack">
          <article className="dashboard-hero-home">
            <div className="dashboard-hero-home__glow" aria-hidden="true" />
            <div className="dashboard-hero-home__top">
              <p className="section-label section-label--on-dark">
                {miniPay.isMiniPayProvider ? "MiniPay wallet" : "Wallet preview"}
              </p>
              <div className="dashboard-hero-home__status">
                <span className="dashboard-hero-home__dot" />
                <span>{walletSummary}</span>
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
              {canRunAnalysis
                ? `Best route first for your ${selectedToken}. Backup stays ready if the fit changes.`
                : "Connect first, review available stablecoins, then run the check with a real balance."}
            </p>

            <div className="dashboard-hero-home__split-card">
              <div>
                <span>Top pick</span>
                <strong>Kiln in MiniPay</strong>
                <small>6.1% APY · Low risk</small>
              </div>
              <div>
                <span>Backup</span>
                <strong>MiniPay Boost</strong>
                <small>4.8% APY · Flexible</small>
              </div>
            </div>

            <div className="dashboard-hero-home__footer dashboard-hero-home__footer--bundle">
              <div className="dashboard-hero-home__range">Range 4.8 – 6.1%</div>
              <button
                type="button"
                className="dashboard-primary-link"
                onClick={handleRunCheck}
                disabled={!canRunAnalysis}
              >
                {canRunAnalysis ? "Run a check" : "Connect to continue"}
                <ArrowRightIcon />
              </button>
            </div>
          </article>

          <div className="dashboard-section-head">
            <p className="section-label">Stable balances</p>
            <span>{balancesLoading ? "Refreshing" : walletSummary}</span>
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
              <span>Add USDC, USDT, or USDm to unlock analysis.</span>
            </div>
          ) : null}

          <div className="dashboard-section-head">
            <p className="section-label">Decision tools</p>
            <button type="button" className="dashboard-inline-button" onClick={handleRunCheck}>
              Start
            </button>
          </div>

          <div className="dashboard-action-row">
            <button type="button" className="dashboard-action-card dashboard-action-card--warm" onClick={handleRunCheck}>
              <div className="dashboard-pin__icon dashboard-pin__icon--green">
                <CompassIcon />
              </div>
              <div className="dashboard-action-card__title">Fresh recommendation</div>
              <div className="dashboard-pin__meta">
                {canRunAnalysis
                  ? `Run against your ${selectedToken} balance.`
                  : "Connect wallet first."}
              </div>
            </button>

            <Link href={`/position?${baseParams}`} className="dashboard-action-card dashboard-action-card--soft">
              <div className="dashboard-pin__icon dashboard-pin__icon--amber">
                <ChartIcon />
              </div>
              <div className="dashboard-action-card__title">Position tracking</div>
              <div className="dashboard-pin__meta">One position open · healthy.</div>
            </Link>

            <Link href={`/chat?${baseParams}`} className="dashboard-chat-card dashboard-chat-card--bundle">
              <div className="dashboard-chat-card__avatar" aria-hidden="true">
                <span />
              </div>
              <div className="dashboard-chat-card__copy">
                <div className="dashboard-action-card__title">Copilot chat</div>
                <div className="dashboard-pin__meta">Ask a question, get a route. Plain answers.</div>
              </div>
              <span className="dashboard-chat-card__arrow">
                <ArrowRightIcon />
              </span>
            </Link>
          </div>

          <div className="dashboard-section-head">
            <p className="section-label">Today&apos;s read</p>
          </div>

          <div className="dashboard-insight-row">
            <Link href={`/recommendation?${baseParams}`} className="dashboard-insight-card dashboard-insight-card--chart">
              <div className="dashboard-insight-card__top">
                <span>Yield range · 30d</span>
                <span className="inline-chip inline-chip--green">+0.4%</span>
              </div>
              <h3>
                4.8<span>–</span>6.1<small>%</small>
              </h3>
              <svg viewBox="0 0 120 32" width="100%" height="32" preserveAspectRatio="none">
                <path
                  d="M0,22 L12,20 L24,23 L36,18 L48,17 L60,15 L72,12 L84,14 L96,10 L108,9 L120,7"
                  fill="none"
                  stroke="oklch(0.68 0.12 145)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M0,22 L12,20 L24,23 L36,18 L48,17 L60,15 L72,12 L84,14 L96,10 L108,9 L120,7 L120,32 L0,32 Z"
                  fill="oklch(0.68 0.12 145 / 0.10)"
                />
              </svg>
            </Link>

            <Link href={`/alerts?${baseParams}`} className="dashboard-insight-card">
              <div className="dashboard-insight-card__top dashboard-insight-card__top--plain">
                <span>Monitoring</span>
              </div>
              <div className="dashboard-monitoring">
                <div className="dashboard-monitoring__ring">
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" stroke="rgba(22,20,14,0.12)" strokeWidth="3" fill="none" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      stroke="oklch(0.68 0.12 145)"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="88 113"
                      transform="rotate(-90 22 22)"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>4/5</span>
                </div>
                <div className="dashboard-monitoring__copy">
                  <strong>Rules armed.</strong>
                  <span>Quiet day so far.</span>
                </div>
              </div>
              <small>{canRunAnalysis ? "Last refresh just now" : "Connect wallet to arm alerts"}</small>
            </Link>
          </div>
        </section>

        <BottomNav />
      </div>
    </main>
  );
}
