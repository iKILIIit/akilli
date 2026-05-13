import { buildExecutionPlan } from "./execution-agent";
import { buildRecommendationSummary, rankVenues } from "./goal-planner";
import { buildPositionSnapshot } from "./monitor-agent";
import { discoverVenueQuotes } from "./yield-scout";
import type { RecommendationRequest, RecommendationResponse } from "@yield-copilot/shared";

export * from "./execution-agent";
export * from "./goal-planner";
export * from "./monitor-agent";
export * from "./risk-guard";
export * from "./yield-scout";

export function generateRecommendation(
  input: RecommendationRequest
): RecommendationResponse {
  const ranked = rankVenues(input, discoverVenueQuotes(input));
  const [recommended, backup] = ranked;

  if (!recommended) {
    throw new Error("No supported venues are available for this request.");
  }

  const summary = buildRecommendationSummary(ranked);

  return {
    recommended,
    backup: backup ?? null,
    rationale: summary.rationale,
    warnings: summary.warnings,
    generatedAt: new Date().toISOString(),
    executionPlan: buildExecutionPlan(input, recommended)
  };
}

export function generatePositionView(input: RecommendationRequest) {
  const recommendation = generateRecommendation(input);
  return buildPositionSnapshot(recommendation.recommended, input.amount);
}
