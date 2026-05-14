import { resolveVenueQuotes } from "@yield-copilot/celo";
import type { RecommendationRequest, YieldQuote } from "@yield-copilot/shared";

export function discoverVenueQuotes(input: RecommendationRequest): YieldQuote[] {
  return resolveVenueQuotes(input);
}
