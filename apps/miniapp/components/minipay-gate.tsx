"use client";

import { useMiniPay } from "../hooks/use-minipay";

export function MiniPayGate() {
  const runtime = useMiniPay();

  const minipayOnly = process.env.NEXT_PUBLIC_MINIPAY_ONLY === "true";

  if (!runtime.isLoading && minipayOnly && !runtime.isAvailable) {
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
        {runtime.isLoading
          ? "Checking MiniPay runtime..."
          : runtime.isAvailable
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
              ? "Connected"
              : runtime.isLoading
                ? "Checking wallet"
                : "Waiting for MiniPay"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
