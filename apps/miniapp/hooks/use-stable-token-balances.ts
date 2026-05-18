"use client";

import { stableTokenList } from "@yield-copilot/celo";
import { useCallback, useEffect, useState } from "react";
import { formatUnits, http, createPublicClient, parseAbi } from "viem";
import { celo } from "viem/chains";

const erc20BalanceAbi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)"
]);

const publicClient = createPublicClient({
  chain: celo,
  transport: http(celo.rpcUrls.default.http[0])
});

function trimTrailingZeros(value: string) {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/(?:\.0+|(\.\d*?[1-9])0+)$/, "$1");
}

function formatDisplayAmount(value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: numericValue >= 100 ? 2 : numericValue >= 1 ? 3 : 6
  });
}

export type StableTokenBalance = {
  symbol: (typeof stableTokenList)[number]["symbol"];
  displayName: string;
  decimals: number;
  address: `0x${string}`;
  rawBalance: bigint;
  inputAmount: string;
  displayAmount: string;
  hasBalance: boolean;
};

type StableTokenBalancesState = {
  balances: StableTokenBalance[];
  isLoading: boolean;
};

export type UseStableTokenBalancesResult = StableTokenBalancesState & {
  refresh: () => Promise<void>;
};

function buildEmptyBalances(): StableTokenBalance[] {
  return stableTokenList.map((token) => ({
    symbol: token.symbol,
    displayName: token.displayName,
    decimals: token.decimals,
    address: token.address,
    rawBalance: 0n,
    inputAmount: "0",
    displayAmount: "0",
    hasBalance: false
  }));
}

export function useStableTokenBalances(
  walletAddress?: string
): UseStableTokenBalancesResult {
  const [state, setState] = useState<StableTokenBalancesState>({
    balances: buildEmptyBalances(),
    isLoading: false
  });

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setState({
        balances: buildEmptyBalances(),
        isLoading: false
      });
      return;
    }

    setState((current) => ({
      ...current,
      isLoading: true
    }));

    try {
      const results = await publicClient.multicall({
        allowFailure: true,
        contracts: stableTokenList.map((token) => ({
          address: token.address,
          abi: erc20BalanceAbi,
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`]
        }))
      });

      setState({
        balances: stableTokenList.map((token, index) => {
          const result = results[index];
          const rawBalance =
            result?.status === "success" && typeof result.result === "bigint"
              ? result.result
              : 0n;
          const normalizedAmount = trimTrailingZeros(
            formatUnits(rawBalance, token.decimals)
          );

          return {
            symbol: token.symbol,
            displayName: token.displayName,
            decimals: token.decimals,
            address: token.address,
            rawBalance,
            inputAmount: normalizedAmount,
            displayAmount: formatDisplayAmount(normalizedAmount),
            hasBalance: rawBalance > 0n
          };
        }),
        isLoading: false
      });
    } catch {
      setState({
        balances: buildEmptyBalances(),
        isLoading: false
      });
    }
  }, [walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh
  };
}
