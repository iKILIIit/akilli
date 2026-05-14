import type {
  QuoteFreshness,
  QuoteSource,
  RecommendationRequest,
  VenueAvailability,
  VenueDefinition,
  YieldQuote
} from "@yield-copilot/shared";

export type VenueInput = RecommendationRequest;
export type QuoteInput = RecommendationRequest;

export type AdapterQuoteSnapshot = {
  apy: number;
  available: boolean;
  availabilityReasons: string[];
  estimatedOneTimeFee: number;
  estimatedGrossReturn: number;
  estimatedNetReturn: number;
  quoteUpdatedAt: string;
  quoteSource: QuoteSource;
  freshnessStatus: QuoteFreshness;
  sourceLabel: string;
};

export type YieldVenueAdapter = {
  definition: VenueDefinition;
  getAvailability(input: VenueInput): VenueAvailability;
  getQuoteSnapshot(input: QuoteInput): AdapterQuoteSnapshot;
};

export function toYieldQuote(
  definition: VenueDefinition,
  input: QuoteInput,
  snapshot: AdapterQuoteSnapshot
): YieldQuote {
  return {
    id: definition.id,
    label: definition.label,
    kind: definition.kind,
    token: input.token,
    apy: snapshot.apy,
    available: snapshot.available,
    availabilityReasons: snapshot.availabilityReasons,
    supportedTokens: definition.supportedTokens,
    thirdParty: definition.thirdParty,
    liquidityProfile: definition.liquidityProfile,
    lockupDays: definition.lockupDays,
    quoteSource: snapshot.quoteSource,
    freshnessStatus: snapshot.freshnessStatus,
    sourceLabel: snapshot.sourceLabel,
    exitWindowLabel: definition.liquidityProfile === "instant"
      ? "Instant"
      : definition.liquidityProfile === "same-day"
        ? definition.lockupDays > 0
          ? `Same day to ${definition.lockupDays} day exit`
          : "Same day"
        : `Around ${Math.max(definition.lockupDays, 1)} day exit`,
    summary: definition.summary,
    guardrails: definition.guardrails,
    estimatedGrossReturn: snapshot.estimatedGrossReturn,
    estimatedNetReturn: snapshot.estimatedNetReturn,
    estimatedOneTimeFee: snapshot.estimatedOneTimeFee,
    quoteUpdatedAt: snapshot.quoteUpdatedAt
  };
}
