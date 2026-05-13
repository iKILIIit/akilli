import { generateRecommendation } from "@yield-copilot/agents";
import type { RecommendationRequest } from "@yield-copilot/shared";

export function recommendVenue(input: RecommendationRequest) {
  return generateRecommendation(input);
}
