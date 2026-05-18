"use client";

import { detectMiniPayRuntime, type MiniPayRuntime } from "@yield-copilot/celo";
import { useCallback, useEffect, useState } from "react";

type EthereumWithMiniPay = {
  isMiniPay?: boolean;
  selectedAddress?: string | null;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  request?: (args: { method: string }) => Promise<unknown>;
};

type MiniPayHookState = MiniPayRuntime & {
  hasProvider: boolean;
  isLoading: boolean;
};

export type UseMiniPayResult = MiniPayHookState & {
  connect: () => Promise<string | undefined>;
  refresh: () => void;
};

declare global {
  interface Window {
    ethereum?: EthereumWithMiniPay;
  }
}

function getRuntimeSnapshot(): MiniPayRuntime {
  if (typeof window === "undefined") {
    return {
      isAvailable: false,
      isMiniPayProvider: false,
    };
  }

  return detectMiniPayRuntime(
    window.ethereum,
    typeof navigator === "undefined" ? "" : navigator.userAgent,
  );
}

export function useMiniPay(): UseMiniPayResult {
  const [runtime, setRuntime] = useState<MiniPayHookState>({
    isAvailable: false,
    isMiniPayProvider: false,
    hasProvider: false,
    isLoading: true,
  });

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") {
      setRuntime({
        isAvailable: false,
        isMiniPayProvider: false,
        hasProvider: false,
        isLoading: false,
      });
      return;
    }

    const ethereum = window.ethereum;
    const snapshot = getRuntimeSnapshot();
    let walletAddress = snapshot.walletAddress;

    if (!walletAddress && ethereum?.request) {
      try {
        const accounts = await ethereum.request({
          method: "eth_accounts",
        });

        if (Array.isArray(accounts)) {
          const account = accounts[0];
          walletAddress = typeof account === "string" ? account : undefined;
        }
      } catch {
        walletAddress = snapshot.walletAddress;
      }
    }

    setRuntime({
      ...snapshot,
      ...(walletAddress ? { walletAddress } : {}),
      hasProvider: Boolean(ethereum?.request),
      isLoading: false,
    });
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const ethereum = window.ethereum;
    if (!ethereum?.request) {
      refresh();
      return ethereum?.selectedAddress ?? undefined;
    }

    try {
      const response = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (Array.isArray(response)) {
        const account = response[0];
        const walletAddress = typeof account === "string" ? account : undefined;
        setRuntime((current) => ({
          ...current,
          ...getRuntimeSnapshot(),
          ...(walletAddress ? { walletAddress } : {}),
          hasProvider: true,
          isLoading: false,
        }));
        return walletAddress;
      }

      await refresh();
      return ethereum.selectedAddress ?? undefined;
    } catch {
      await refresh();
      return undefined;
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();

    if (typeof window === "undefined") {
      return undefined;
    }

    const ethereum = window.ethereum;
    if (!ethereum?.on || !ethereum.removeListener) {
      return undefined;
    }

    const handleChange = () => {
      void refresh();
    };
    ethereum.on("accountsChanged", handleChange);
    ethereum.on("connect", handleChange);
    ethereum.on("disconnect", handleChange);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleChange);
      ethereum.removeListener?.("connect", handleChange);
      ethereum.removeListener?.("disconnect", handleChange);
    };
  }, [refresh]);

  return {
    ...runtime,
    connect,
    refresh,
  };
}
