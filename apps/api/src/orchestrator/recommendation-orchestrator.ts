import { buildExecutionPlan } from "@yield-copilot/agents";
import { recommendationRequestSchema, type RecommendationRequest } from "@yield-copilot/shared";
import { getAvailableVenues } from "../services/venue-registry";
import { recommendVenue } from "../services/recommendation-service";

export function orchestrateRecommendation(input: RecommendationRequest) {
  const parsed = recommendationRequestSchema.parse(input);
  const venues = getAvailableVenues(parsed);
  const recommendation = recommendVenue(parsed);

  return {
    venues,
    recommendation,
    executionPlan: buildExecutionPlan(parsed, recommendation.recommended)
  };
}
