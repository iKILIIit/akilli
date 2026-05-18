"use client";

import { detectMiniPayRuntime } from "@yield-copilot/celo";
import { useEffect, useState } from "react";

type RuntimeState = {
  isAvailable: boolean;
  isMiniPayProvider: boolean;
  walletAddress?: string;
};

declare global {
  interface Window {
    ethereum?: {
      isMiniPay?: boolean;
      selectedAddress?: string | null;
      request?: (args: { method: string }) => Promise<string[]>;
    };
  }
}

export function MiniPayGate() {
  const [runtime, setRuntime] = useState<RuntimeState>({
    isAvailable: false,
    isMiniPayProvider: false
  });
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    setRuntime(
      detectMiniPayRuntime(
        window.ethereum,
        typeof navigator === "undefined" ? "" : navigator.userAgent
      )
    );
  }, []);

  useEffect(() => {
    if (runtime.isMiniPayProvider && !runtime.walletAddress) {
      handleConnect();
    }
  }, [runtime.isMiniPayProvider]);

  async function handleConnect() {
    if (!window.ethereum?.request) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (address) {
        setRuntime((prev) => ({ ...prev, walletAddress: address }));
      }
    } catch {
      setConnectError("Could not connect to wallet.");
    } finally {
      setConnecting(false);
    }
  }

  function truncateAddress(address: string) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }

  const minipayOnly = process.env.NEXT_PUBLIC_MINIPAY_ONLY === "true";

  if (minipayOnly && !runtime.isAvailable) {
    return (
      <div className="notice-card danger">
        <h2>MiniPay context required</h2>
        <p>
          This build is configured for MiniPay-only execution. Open it inside MiniPay
          to test wallet auto-connect and deposit routing.
        </p>
      </div>
    );
  }

  return (
    <div className="notice-card compact">
      <p className="section-label">Runtime status</p>
      <p>
        {runtime.isAvailable
          ? "MiniPay context detected. Auto-connect can attach to the embedded wallet."
          : "Running outside MiniPay. The recommendation flow still works for desktop review."}
      </p>
      <dl className="status-grid">
        <div>
          <dt>Provider</dt>
          <dd>{runtime.isMiniPayProvider ? "MiniPay" : "Standard browser"}</dd>
        </div>
        <div>
          <dt>Wallet</dt>
          <dd>
            {runtime.walletAddress
              ? truncateAddress(runtime.walletAddress)
              : connecting
                ? "Connecting…"
                : "Not connected"}
          </dd>
        </div>
      </dl>
      {runtime.isMiniPayProvider && !runtime.walletAddress && !connecting && (
        <div className="action-row">
          {connectError ? (
            <>
              <p className="section-label">{connectError}</p>
              <button className="secondary-action" onClick={handleConnect}>
                Retry
              </button>
            </>
          ) : (
            <button className="primary-action" onClick={handleConnect}>
              Connect wallet
            </button>
          )}
        </div>
      )}
    </div>
  );
}
