import { recommendationRequestSchema } from "@yield-copilot/shared";
import { getAvailableVenues } from "../services/venue-registry";

export function handleVenues(query: Record<string, string | undefined>) {
  const input = recommendationRequestSchema.parse({
    walletAddress: query.walletAddress ?? "0x0000000000000000000000000000000000000000",
    token: query.token ?? "USDC",
    amount: query.amount ?? "150",
    goal: query.goal ?? "save-safely",
    timeHorizonDays: Number(query.timeHorizonDays ?? 30),
    riskComfort: query.riskComfort ?? "low"
  });

  return getAvailableVenues(input);
}
