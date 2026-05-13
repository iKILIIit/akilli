import { generatePositionView } from "@yield-copilot/agents";
import type { RecommendationRequest } from "@yield-copilot/shared";

export function getPositionView(input: RecommendationRequest) {
  return generatePositionView(input);
}
