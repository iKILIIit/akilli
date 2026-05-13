import { recommendationRequestSchema, type RecommendationRequest } from "@yield-copilot/shared";

export const defaultRecommendationInput: RecommendationRequest = {
  walletAddress: "0x0000000000000000000000000000000000000000",
  token: "USDC",
  amount: "150",
  goal: "save-safely",
  timeHorizonDays: 30,
  riskComfort: "low"
};

type SearchParamValue = string | string[] | undefined;

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRecommendationInput(
  searchParams?: Record<string, SearchParamValue>
): RecommendationRequest {
  return recommendationRequestSchema.parse({
    walletAddress:
      firstValue(searchParams?.walletAddress) ?? defaultRecommendationInput.walletAddress,
    token: firstValue(searchParams?.token) ?? defaultRecommendationInput.token,
    amount: firstValue(searchParams?.amount) ?? defaultRecommendationInput.amount,
    goal: firstValue(searchParams?.goal) ?? defaultRecommendationInput.goal,
    timeHorizonDays: Number(
      firstValue(searchParams?.timeHorizonDays) ?? defaultRecommendationInput.timeHorizonDays
    ),
    riskComfort:
      firstValue(searchParams?.riskComfort) ?? defaultRecommendationInput.riskComfort
  });
}
