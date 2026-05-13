import { getVenueDefinitions } from "@yield-copilot/celo";
import type { RecommendationRequest, YieldQuote } from "@yield-copilot/shared";

const tokenApyOffset = {
  USDT: -0.15,
  USDC: 0,
  USDm: 0.35
} as const;

export function discoverVenueQuotes(input: RecommendationRequest): YieldQuote[] {
  const amount = Number(input.amount);

  return getVenueDefinitions()
    .filter((venue) => venue.supportedTokens.includes(input.token))
    .map((venue) => {
      const availabilityReasons: string[] = [];
      let available = true;

      if (venue.id === "direct-celo-lending" && amount < 50) {
        available = false;
        availabilityReasons.push("Minimum size for direct lending starts at 50 units.");
      }

      if (venue.id === "kiln" && input.timeHorizonDays < 7) {
        availabilityReasons.push("Short horizons may not fully benefit from Kiln's setup overhead.");
      }

      if (venue.id === "wallet-liquid") {
        availabilityReasons.push("Always available as the baseline option.");
      }

      const horizonBonus =
        venue.liquidityProfile === "locked" && input.timeHorizonDays >= 30 ? 0.35 : 0;

      return {
        id: venue.id,
        label: venue.label,
        kind: venue.kind,
        token: input.token,
        apy: Number((venue.baseApy + tokenApyOffset[input.token] + horizonBonus).toFixed(2)),
        available,
        availabilityReasons,
        supportedTokens: venue.supportedTokens,
        thirdParty: venue.thirdParty,
        liquidityProfile: venue.liquidityProfile,
        lockupDays: venue.lockupDays,
        summary: venue.summary,
        guardrails: venue.guardrails
      };
    });
}
