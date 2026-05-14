import {
  MOCK_VENUE_DEFINITIONS,
  type RecommendationRequest,
  type VenueAvailability,
  type YieldQuote
} from "@yield-copilot/shared";
import type { AdapterQuoteSnapshot, YieldVenueAdapter } from "./adapter";
import { toYieldQuote } from "./adapter";

const tokenApyOffset = {
  USDT: -0.15,
  USDC: 0,
  USDm: 0.35
} as const;

const quoteLagMinutes: Record<string, number> = {
  "wallet-liquid": 1,
  "minipay-boost": 6,
  kiln: 14,
  "direct-celo-lending": 35
};

const oneTimeFeeEstimate: Record<string, number> = {
  "wallet-liquid": 0,
  "minipay-boost": 0.12,
  kiln: 0.28,
  "direct-celo-lending": 0.65
};

function buildAvailability(
  input: RecommendationRequest,
  venueId: string
): VenueAvailability {
  const amount = Number(input.amount);
  const reasons: string[] = [];
  let available = true;

  if (venueId === "wallet-liquid") {
    reasons.push("Always available as the baseline option.");
  }

  if (venueId === "kiln" && input.timeHorizonDays < 7) {
    reasons.push("Short horizons may not fully benefit from Kiln's setup overhead.");
  }

  if (venueId === "direct-celo-lending" && amount < 50) {
    available = false;
    reasons.push("Minimum size for direct lending starts at 50 units.");
  }

  return {
    venueId,
    available,
    reasons,
    ...(venueId === "direct-celo-lending" ? { minAmount: "50" } : {})
  };
}

function buildReturnEstimate(
  input: RecommendationRequest,
  apy: number,
  fee: number
) {
  const amount = Number(input.amount);
  const estimatedGrossReturn = Number(
    ((amount * (apy / 100) * input.timeHorizonDays) / 365).toFixed(2)
  );
  const estimatedOneTimeFee = Number(fee.toFixed(2));
  const estimatedNetReturn = Number((estimatedGrossReturn - estimatedOneTimeFee).toFixed(2));

  return {
    estimatedGrossReturn,
    estimatedOneTimeFee,
    estimatedNetReturn
  };
}

function buildFreshnessStatus(venueId: string, available: boolean): AdapterQuoteSnapshot["freshnessStatus"] {
  if (!available) {
    return "unavailable";
  }

  if (venueId === "direct-celo-lending") {
    return "stale";
  }

  return "fresh";
}

function buildStaticAdapter(venueId: string): YieldVenueAdapter {
  const definition = MOCK_VENUE_DEFINITIONS.find((venue) => venue.id === venueId);

  if (!definition) {
    throw new Error(`Unknown venue definition: ${venueId}`);
  }

  return {
    definition,
    getAvailability(input) {
      return buildAvailability(input, definition.id);
    },
    getQuoteSnapshot(input) {
      const availability = buildAvailability(input, definition.id);
      const horizonBonus =
        definition.liquidityProfile === "locked" && input.timeHorizonDays >= 30 ? 0.35 : 0;
      const riskBuffer =
        definition.id === "kiln" && input.timeHorizonDays < 14 ? -0.25 : 0;
      const apy = Number(
        (definition.baseApy + tokenApyOffset[input.token] + horizonBonus + riskBuffer).toFixed(2)
      );
      const fee = oneTimeFeeEstimate[definition.id] ?? 0.4;
      const freshnessStatus = buildFreshnessStatus(definition.id, availability.available);
      const quoteLag = quoteLagMinutes[definition.id] ?? 20;

      return {
        apy,
        available: availability.available,
        availabilityReasons: availability.reasons,
        ...buildReturnEstimate(input, apy, fee),
        quoteUpdatedAt: new Date(Date.now() - quoteLag * 60_000).toISOString(),
        quoteSource: definition.id === "direct-celo-lending" ? "mock-fallback" : "adapter-model",
        freshnessStatus,
        sourceLabel:
          definition.id === "direct-celo-lending"
            ? "Fallback venue model"
            : "Scaffolded venue adapter"
      };
    }
  };
}

const venueAdapters = [
  buildStaticAdapter("wallet-liquid"),
  buildStaticAdapter("minipay-boost"),
  buildStaticAdapter("kiln"),
  buildStaticAdapter("direct-celo-lending")
];

export function getYieldVenueAdapters() {
  return venueAdapters;
}

export function getVenueDefinitions() {
  return venueAdapters.map((adapter) => adapter.definition);
}

export function resolveVenueQuotes(input: RecommendationRequest): YieldQuote[] {
  return venueAdapters
    .filter((adapter) => adapter.definition.supportedTokens.includes(input.token))
    .map((adapter) => toYieldQuote(adapter.definition, input, adapter.getQuoteSnapshot(input)));
}
