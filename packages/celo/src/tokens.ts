import type { Token } from "@yield-copilot/shared";

export const stableTokens: Record<
  Token,
  { symbol: Token; decimals: number; displayName: string; address: `0x${string}` }
> = {
  USDT: {
    symbol: "USDT",
    decimals: 6,
    displayName: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
  },
  USDC: {
    symbol: "USDC",
    decimals: 6,
    displayName: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
  },
  USDm: {
    symbol: "USDm",
    decimals: 18,
    displayName: "Mento Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a"
  }
};

export const stableTokenList = Object.values(stableTokens);
