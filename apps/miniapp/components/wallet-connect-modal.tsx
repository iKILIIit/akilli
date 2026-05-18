"use client";

type WalletConnectModalProps = {
  isOpen: boolean;
  isLoading: boolean;
  isMiniPayProvider: boolean;
  hasProvider: boolean;
  onConnect: () => Promise<string | undefined>;
};

export function WalletConnectModal({
  isOpen,
  isLoading,
  isMiniPayProvider,
  hasProvider,
  onConnect
}: WalletConnectModalProps) {
  if (!isOpen) {
    return null;
  }

  const isAutoConnecting = isMiniPayProvider && isLoading;
  const title = isMiniPayProvider ? "Connecting MiniPay wallet" : "Connect your wallet";
  const body = isMiniPayProvider
    ? "MiniPay can attach automatically. Once connected, we will load your stablecoin balances and unlock analysis."
    : "Connect a wallet to load your USDC, USDT, and USDm balances before running a check.";

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
          <div>See available stablecoins</div>
          <div>Run the check with real balances</div>
        </div>

        {hasProvider ? (
          <button
            type="button"
            className="primary-action wallet-modal-card__action"
            onClick={() => {
              void onConnect();
            }}
            disabled={isLoading}
          >
            {isAutoConnecting ? "Connecting…" : isMiniPayProvider ? "Retry MiniPay" : "Connect wallet"}
          </button>
        ) : (
          <div className="wallet-modal-card__notice">
            No wallet provider was detected in this browser. Open the app in MiniPay or a wallet-enabled browser.
          </div>
        )}
      </div>
    </div>
  );
}
