import type { Goal, Token, VenueDefinition } from "./types";

export const APP_NAME = "MiniPay Yield Copilot";
export const SUPPORT_EMAIL = "support@yieldcopilot.app";

export const GOAL_OPTIONS: Array<{ id: Goal; label: string; description: string }> = [
  {
    id: "keep-flexible",
    label: "Keep flexible",
    description: "Prioritize instant access and simple exits over headline APY."
  },
  {
    id: "earn-more",
    label: "Earn more",
    description: "Accept moderate complexity when the yield improvement is clear."
  },
  {
    id: "save-safely",
    label: "Save safely",
    description: "Prefer trusted, understandable venues and stable access conditions."
  }
];

export const TOKEN_OPTIONS: Array<{ id: Token; label: string }> = [
  { id: "USDT", label: "USDT" },
  { id: "USDC", label: "USDC" },
  { id: "USDm", label: "USDm" }
];

export const MOCK_VENUE_DEFINITIONS: VenueDefinition[] = [
  {
    id: "wallet-liquid",
    label: "Stay liquid in MiniPay",
    kind: "liquid",
    supportedTokens: ["USDT", "USDC", "USDm"],
    thirdParty: false,
    baseApy: 0,
    liquidityProfile: "instant",
    lockupDays: 0,
    summary: "No additional venue exposure. Funds remain ready for payments and transfers.",
    guardrails: [
      "No extra protocol hop",
      "Best when flexibility matters more than yield",
      "Acts as the baseline benchmark"
    ]
  },
  {
    id: "minipay-boost",
    label: "MiniPay Boost",
    kind: "native",
    supportedTokens: ["USDT", "USDC"],
    thirdParty: false,
    baseApy: 4.8,
    liquidityProfile: "same-day",
    lockupDays: 0,
    summary: "Native MiniPay earning path with simpler UX and trusted framing.",
    guardrails: [
      "Native MiniPay context",
      "Yield can change without notice",
      "Check exit timing before large deposits"
    ]
  },
  {
    id: "kiln",
    label: "Kiln in MiniPay",
    kind: "native",
    supportedTokens: ["USDT", "USDC"],
    thirdParty: false,
    baseApy: 6.1,
    liquidityProfile: "same-day",
    lockupDays: 3,
    summary: "Higher earning option inside the MiniPay flow with some operational complexity.",
    guardrails: [
      "Requires understanding venue-specific rules",
      "Exit path may not be instant",
      "Rates are variable"
    ]
  },
  {
    id: "direct-celo-lending",
    label: "Direct Celo Lending",
    kind: "third-party",
    supportedTokens: ["USDC", "USDm"],
    thirdParty: true,
    baseApy: 7.4,
    liquidityProfile: "locked",
    lockupDays: 7,
    summary: "Direct third-party venue with more raw yield and more protocol risk.",
    guardrails: [
      "Third-party smart contract exposure",
      "Availability should be verified at execution time",
      "Use only when yield advantage clearly justifies the extra risk"
    ]
  }
];
