"use client";

import { ADDRESSES } from "@yield-copilot/celo";
import { useCallback, useEffect, useState } from "react";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { celo } from "viem/chains";

const client = createPublicClient({ chain: celo, transport: http(celo.rpcUrls.default.http[0]) });

const ubiAbi = parseAbi([
  "function checkEntitlement(address _member) view returns (uint256)",
]);
const identityAbi = parseAbi([
  "function isWhitelisted(address account) view returns (bool)",
]);
const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

export type GDStatusResult = {
  gdBalance: string;        // formatted, 2 dp
  gdBalanceRaw: bigint;
  entitlement: string;      // G$ claimable right now, formatted
  entitlementRaw: bigint;
  isVerified: boolean;
  hasUnclaimed: boolean;
  isLoading: boolean;
};

const EMPTY: GDStatusResult = {
  gdBalance: "0.00",
  gdBalanceRaw: 0n,
  entitlement: "0.00",
  entitlementRaw: 0n,
  isVerified: false,
  hasUnclaimed: false,
  isLoading: false,
};

export function useGDStatus(walletAddress?: string): GDStatusResult & { refresh: () => Promise<void> } {
  const [state, setState] = useState<GDStatusResult>(EMPTY);

  const refresh = useCallback(async () => {
    if (!walletAddress) { setState(EMPTY); return; }

    setState(s => ({ ...s, isLoading: true }));

    try {
      const results = await client.multicall({
        allowFailure: true,
        contracts: [
          { address: ADDRESSES.GD_TOKEN,      abi: erc20Abi,    functionName: "balanceOf",        args: [walletAddress as `0x${string}`] },
          { address: ADDRESSES.GD_UBI_SCHEME, abi: ubiAbi,      functionName: "checkEntitlement", args: [walletAddress as `0x${string}`] },
          { address: ADDRESSES.GD_IDENTITY,   abi: identityAbi, functionName: "isWhitelisted",    args: [walletAddress as `0x${string}`] },
        ],
      });

      // G$ has 2 decimals on Celo
      const gdBalanceRaw   = results[0]?.status === "success" ? (results[0].result as bigint) : 0n;
      const entitlementRaw = results[1]?.status === "success" ? (results[1].result as bigint) : 0n;
      const isVerified     = results[2]?.status === "success" ? (results[2].result as boolean) : false;

      setState({
        gdBalance:      formatUnits(gdBalanceRaw, 18),
        gdBalanceRaw,
        entitlement:    formatUnits(entitlementRaw, 18),
        entitlementRaw,
        isVerified,
        hasUnclaimed:   entitlementRaw > 0n,
        isLoading:      false,
      });
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [walletAddress]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { ...state, refresh };
}
