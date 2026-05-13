import { recommendationRequestSchema } from "@yield-copilot/shared";
import { getPositionView } from "../services/position-monitor-service";

export function handlePositions(address: string, query: Record<string, string | undefined>) {
  const input = recommendationRequestSchema.parse({
    walletAddress: address,
    token: query.token ?? "USDC",
    amount: query.amount ?? "150",
    goal: query.goal ?? "save-safely",
    timeHorizonDays: Number(query.timeHorizonDays ?? 30),
    riskComfort: query.riskComfort ?? "low"
  });

  return getPositionView(input);
}
