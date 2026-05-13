import { recommendationRequestSchema } from "@yield-copilot/shared";
import { orchestrateRecommendation } from "../orchestrator/recommendation-orchestrator";

export function handleRecommend(body: unknown) {
  const input = recommendationRequestSchema.parse(body);
  return orchestrateRecommendation(input);
}
