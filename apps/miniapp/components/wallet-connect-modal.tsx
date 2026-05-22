"use client";

type WalletConnectModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  isMiniPayProvider: boolean;
  hasProvider: boolean;
  isAutoConnecting?: boolean;
  onConnect: () => Promise<string | undefined>;
};

export function WalletConnectModal({
  isOpen,
  isLoading,
  isMiniPayProvider,
  hasProvider,
  isAutoConnecting = false,
  onConnect
}: WalletConnectModalProps) {
  if (!isOpen || isAutoConnecting) {
    return null;
  }

  const title = isMiniPayProvider ? "Connecting MiniPay wallet" : "Connect your wallet";
  const body = isMiniPayProvider
    ? "MiniPay can attach automatically. Once connected, we will load your stablecoin balances and unlock analysis."
    : "Connect any Celo-compatible wallet — MiniPay, MetaMask, or Coinbase Wallet — to unlock AI analysis.";

  return (
    <div className="wallet-modal-shell" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
      <div className="wallet-modal-backdrop" />
      <div className="wallet-modal-card">
        <div className="wallet-modal-card__eyebrow">
          {isMiniPayProvider ? "MiniPay detected" : "Wallet required"}
        </div>
        <h2 id="wallet-modal-title">{title}</h2>
        <p>{body}</p>

        <div className="wallet-modal-card__points">
          <div>Connect once</div>
          <div>See your stablecoin balances</div>
          <div>Run AI analysis on your real activity</div>
        </div>

        {hasProvider ? (
          <button
            type="button"
            className="primary-action wallet-modal-card__action"
            onClick={() => { void onConnect(); }}
            disabled={isLoading}
          >
            {isMiniPayProvider ? "Retry MiniPay" : "Connect wallet"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="wallet-modal-card__notice">
              No wallet detected in this browser.
            </div>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="primary-action wallet-modal-card__action"
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              Install MetaMask
            </a>
            <p style={{ fontSize: "12px", color: "var(--ink-55)", textAlign: "center", margin: 0 }}>
              Or open in MiniPay on mobile
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
