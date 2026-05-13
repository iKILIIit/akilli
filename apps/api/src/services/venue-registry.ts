import { discoverVenueQuotes } from "@yield-copilot/agents";
import type { RecommendationRequest } from "@yield-copilot/shared";

export function getAvailableVenues(input: RecommendationRequest) {
  return discoverVenueQuotes(input);
}
