import type {
  PolicyAction,
  PolicyExecutionRequest,
  PolicyVenueConfig,
  RecommendationRequest,
  RecommendationAction,
  VenueResult,
  Token
} from "@yield-copilot/shared";
import { celoMainnet } from "./chains";

export const policyRouterAbi = [
  {
    type: "function",
    name: "executePolicyAction",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "action", type: "uint8" },
          { name: "venueIdHash", type: "bytes32" },
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "minOutputAmount", type: "uint256" },
          { name: "quoteTimestamp", type: "uint64" },
          { name: "quoteExpiresAt", type: "uint64" },
          { name: "maxSlippageBps", type: "uint16" },
          { name: "recipient", type: "address" }
        ]
      }
    ],
    outputs: []
  }
] as const;

export const policyActionOrder: PolicyAction[] = [
  "stay-liquid",
  "deposit-minipay-boost",
  "deposit-kiln",
  "deposit-direct-celo-lending"
];

export const defaultPolicyVenueConfigs: Record<string, PolicyVenueConfig> = {
  "wallet-liquid": {
    venueId: "wallet-liquid",
    action: "stay-liquid",
    chainId: celoMainnet.id,
    executorAddress: "0x0000000000000000000000000000000000000000",
    acceptedTokens: ["USDT", "USDC", "USDm"],
    maxAmount: "1000000",
    minUserRiskScore: 0,
    cooldownSeconds: 0,
    maxQuoteAgeSeconds: 3600,
    requiresRecipientMatch: true
  },
  "minipay-boost": {
    venueId: "minipay-boost",
    action: "deposit-minipay-boost",
    chainId: celoMainnet.id,
    executorAddress: "0x1111111111111111111111111111111111111111",
    acceptedTokens: ["USDT", "USDC"],
    maxAmount: "25000",
    minUserRiskScore: 0,
    cooldownSeconds: 3600,
    maxQuoteAgeSeconds: 900,
    requiresRecipientMatch: true
  },
  kiln: {
    venueId: "kiln",
    action: "deposit-kiln",
    chainId: celoMainnet.id,
    executorAddress: "0x2222222222222222222222222222222222222222",
    acceptedTokens: ["USDT", "USDC"],
    maxAmount: "50000",
    minUserRiskScore: 35,
    cooldownSeconds: 6 * 3600,
    maxQuoteAgeSeconds: 900,
    requiresRecipientMatch: true
  },
  "direct-celo-lending": {
    venueId: "direct-celo-lending",
    action: "deposit-direct-celo-lending",
    chainId: celoMainnet.id,
    executorAddress: "0x3333333333333333333333333333333333333333",
    acceptedTokens: ["USDC", "USDm"],
    maxAmount: "10000",
    minUserRiskScore: 60,
    cooldownSeconds: 12 * 3600,
    maxQuoteAgeSeconds: 600,
    requiresRecipientMatch: true
  }
};

function venueIdToPolicyAction(venueId: string): PolicyAction {
  switch (venueId) {
    case "wallet-liquid":
      return "stay-liquid";
    case "minipay-boost":
      return "deposit-minipay-boost";
    case "kiln":
      return "deposit-kiln";
    case "direct-celo-lending":
      return "deposit-direct-celo-lending";
    default:
      throw new Error(`No policy action is defined for venue ${venueId}.`);
  }
}

function tokenAddressForSymbol(token: Token) {
  switch (token) {
    case "USDT":
      return "0x0000000000000000000000000000000000001001";
    case "USDC":
      return "0x0000000000000000000000000000000000001002";
    case "USDm":
      return "0x0000000000000000000000000000000000001003";
  }
}

function quoteWindowFromFreshness(freshness: VenueResult["freshnessStatus"]) {
  switch (freshness) {
    case "fresh":
      return 10 * 60;
    case "stale":
      return 3 * 60;
    case "unavailable":
      return 60;
  }
}

export function buildPolicyExecutionRequest(
  input: RecommendationRequest,
  venue: VenueResult,
  recommendedAction: RecommendationAction
): PolicyExecutionRequest {
  const action = venueIdToPolicyAction(venue.id);
  const now = Math.floor(Date.now() / 1000);
  const maxQuoteAgeSeconds = quoteWindowFromFreshness(venue.freshnessStatus);
  const minOutputAmount =
    recommendedAction === "stay-liquid"
      ? input.amount
      : Math.max(Number(input.amount) + venue.estimatedNetReturn, 0).toFixed(2);

  return {
    user: input.walletAddress,
    action,
    venueId: venue.id,
    token: input.token,
    amount: input.amount,
    minOutputAmount,
    quoteTimestamp: now,
    quoteExpiresAt: now + maxQuoteAgeSeconds,
    maxSlippageBps: action === "stay-liquid" ? 0 : 150,
    recipient: input.walletAddress
  };
}

export function getPolicyVenueConfig(venueId: string) {
  const config = defaultPolicyVenueConfigs[venueId];

  if (!config) {
    throw new Error(`No policy venue config is defined for venue ${venueId}.`);
  }

  return config;
}

export function getPolicyTokenAddress(token: Token) {
  return tokenAddressForSymbol(token);
}

export function getPolicyActionIndex(action: PolicyAction) {
  const index = policyActionOrder.indexOf(action);

  if (index < 0) {
    throw new Error(`Unknown policy action ${action}.`);
  }

  return index;
}
