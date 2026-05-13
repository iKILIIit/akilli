import { buildExecutionPlan, generateRecommendation } from "@yield-copilot/agents";
import { executionPlanRequestSchema, recommendationRequestSchema } from "@yield-copilot/shared";

export function handleExecutionPlan(body: unknown) {
  const input = executionPlanRequestSchema.parse(body);
  const recommendationInput = recommendationRequestSchema.parse({
    walletAddress: input.walletAddress ?? "0x0000000000000000000000000000000000000000",
    token: input.token,
    amount: input.amount,
    goal: "save-safely",
    timeHorizonDays: 30,
    riskComfort: "low"
  });
  const recommendation = generateRecommendation(recommendationInput);
  const venue = [recommendation.recommended, recommendation.backup].find(
    (candidate) => candidate?.id === input.venueId
  );

  if (!venue) {
    throw new Error("Requested venue does not match the current deterministic recommendation set.");
  }

  return buildExecutionPlan(recommendationInput, venue);
}
