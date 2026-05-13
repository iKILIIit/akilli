import { assessVenueRisk } from "./risk-guard";
import type {
  RecommendationRequest,
  RecommendationResponse,
  VenueResult,
  YieldQuote
} from "@yield-copilot/shared";

type RankedVenue = VenueResult;

function scoreVenue(input: RecommendationRequest, venue: YieldQuote): number {
  const amount = Number(input.amount);
  let score = venue.apy * 7;

  if (!venue.available) {
    score -= 100;
  }

  if (input.goal === "keep-flexible") {
    score += venue.liquidityProfile === "instant" ? 26 : venue.liquidityProfile === "same-day" ? 9 : -18;
  }

  if (input.goal === "earn-more") {
    score += venue.apy * 2.5;
    score += venue.liquidityProfile === "locked" ? 5 : 0;
  }

  if (input.goal === "save-safely") {
    score += venue.kind === "liquid" ? 20 : venue.kind === "native" ? 14 : -8;
  }

  if (input.riskComfort === "low") {
    score += venue.kind === "liquid" ? 18 : venue.kind === "native" ? 6 : -26;
  } else {
    score += venue.kind === "third-party" ? 4 : 0;
  }

  if (input.timeHorizonDays < venue.lockupDays) {
    score -= 40;
  }

  if (input.timeHorizonDays >= 30 && venue.id === "kiln") {
    score += 6;
  }

  if (amount < 25 && venue.kind !== "liquid") {
    score -= 6;
  }

  return Number(score.toFixed(2));
}

function explainVenue(input: RecommendationRequest, venue: YieldQuote, score: number): string[] {
  const explanations = [
    `${venue.label} offers ${venue.apy.toFixed(2)}% APY for ${input.token}.`,
    venue.summary
  ];

  if (input.goal === "keep-flexible") {
    explanations.push(
      venue.liquidityProfile === "instant"
        ? "It fits a flexibility-first goal because access remains immediate."
        : "It trades some flexibility for yield, so it is better when you can wait to exit."
    );
  }

  if (input.goal === "earn-more") {
    explanations.push(
      venue.apy > 0 ? "It improves idle balance productivity versus staying liquid." : "It preserves optionality instead of chasing yield."
    );
  }

  if (input.goal === "save-safely") {
    explanations.push(
      venue.kind === "third-party"
        ? "The extra complexity weakens the safety-first fit despite the higher APY."
        : "The venue is easier to explain and monitor than long-tail DeFi alternatives."
    );
  }

  explanations.push(`Deterministic fit score: ${score.toFixed(2)}.`);
  return explanations;
}

export function rankVenues(input: RecommendationRequest, venues: YieldQuote[]): RankedVenue[] {
  return venues
    .map((venue) => {
      const risk = assessVenueRisk(venue);
      const score = scoreVenue(input, venue);

      return {
        ...venue,
        score,
        riskLabel: risk.label,
        riskReasons: risk.reasons,
        warnings: [...risk.warnings, ...venue.guardrails],
        rationale: explainVenue(input, venue, score),
        actionLabel: venue.id === "wallet-liquid" ? "Keep liquid" : `Move into ${venue.label}`
      };
    })
    .sort((left, right) => right.score - left.score);
}

export function buildRecommendationSummary(
  rankedVenues: RankedVenue[]
): Pick<RecommendationResponse, "rationale" | "warnings"> {
  const [top, backup] = rankedVenues;

  if (!top) {
    return {
      rationale: ["No supported venue qualified for the current input."],
      warnings: ["Expand venue coverage or relax the request constraints."]
    };
  }

  return {
    rationale: [
      `${top.label} is the best fit for the current goal and constraints.`,
      backup ? `${backup.label} remains the fallback if the user wants a different risk or liquidity tradeoff.` : "No backup venue qualified."
    ],
    warnings: Array.from(new Set([...(top?.warnings ?? []), ...(backup?.warnings ?? [])])).slice(0, 5)
  };
}
