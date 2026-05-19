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
  }
};

// CIP-64 fee abstraction adapter addresses (Celo mainnet)
// Use these — NOT the token addresses — when setting feeCurrency on transactions
export const feeCurrencyAdapters: Partial<Record<Token, `0x${string}`>> = {
  USDC: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
  USDT: "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72"
};

export const stableTokenList = Object.values(stableTokens);
