import type { Token } from "@yield-copilot/shared";

export const stableTokens: Record<
  Token,
  { symbol: Token; decimals: number; displayName: string }
> = {
  USDT: {
    symbol: "USDT",
    decimals: 6,
    displayName: "Tether USD"
  },
  USDC: {
    symbol: "USDC",
    decimals: 6,
    displayName: "USD Coin"
  },
  USDm: {
    symbol: "USDm",
    decimals: 18,
    displayName: "Mento Dollar"
  }
};
