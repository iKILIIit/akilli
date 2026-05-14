import { assessVenueRisk } from "./risk-guard";
import type {
  RecommendationRequest,
  RecommendationResponse,
  VenueResult,
  YieldQuote
} from "@yield-copilot/shared";

type RankedVenue = VenueResult;

function formatUnits(amount: number) {
  return amount.toFixed(2);
}

function scoreVenue(input: RecommendationRequest, venue: YieldQuote): number {
  const amount = Number(input.amount);
  let score = venue.apy * 6;
  score += Math.max(venue.estimatedNetReturn, -2);

  if (!venue.available) {
    score -= 100;
  }

  if (venue.freshnessStatus === "stale") {
    score -= 8;
  }

  if (venue.quoteSource === "mock-fallback") {
    score -= 5;
  }

  if (input.goal === "keep-flexible") {
    score += venue.liquidityProfile === "instant" ? 28 : venue.liquidityProfile === "same-day" ? 8 : -22;
  }

  if (input.goal === "earn-more") {
    score += venue.apy * 2.25;
    score += Math.max(venue.estimatedNetReturn, 0) * 1.75;
    score += venue.liquidityProfile === "locked" ? 4 : 0;
  }

  if (input.goal === "save-safely") {
    score += venue.kind === "liquid" ? 22 : venue.kind === "native" ? 14 : -10;
  }

  if (input.riskComfort === "low") {
    score += venue.kind === "liquid" ? 18 : venue.kind === "native" ? 6 : -28;
  } else {
    score += venue.kind === "third-party" ? 6 : 0;
  }

  if (input.timeHorizonDays < venue.lockupDays) {
    score -= 40;
  }

  if (input.timeHorizonDays <= 14 && venue.liquidityProfile === "locked") {
    score -= 14;
  }

  if (venue.estimatedNetReturn <= 0 && venue.kind !== "liquid") {
    score -= 16;
  }

  if (input.timeHorizonDays >= 30 && venue.id === "kiln") {
    score += 6;
  }

  if (amount < 25 && venue.kind !== "liquid") {
    score -= 10;
  }

  return Number(score.toFixed(2));
}

function explainVenue(input: RecommendationRequest, venue: YieldQuote, score: number): string[] {
  const explanations = [
    `${venue.label} offers ${venue.apy.toFixed(2)}% APY and about ${formatUnits(venue.estimatedNetReturn)} ${input.token} net over ${input.timeHorizonDays} days after roughly ${formatUnits(venue.estimatedOneTimeFee)} in one-time costs.`,
    venue.summary,
    `${venue.sourceLabel} is currently ${venue.freshnessStatus}.`
  ];

  if (input.goal === "keep-flexible") {
    explanations.push(
      venue.liquidityProfile === "instant"
        ? "It fits a flexibility-first goal because access remains immediate."
        : "It improves yield, but the exit path is slower than a pure wallet balance."
    );
  }

  if (input.goal === "earn-more") {
    explanations.push(
      venue.estimatedNetReturn > 0
        ? "The expected net uplift is meaningful enough to compete with staying liquid."
        : "The headline APY is not turning into enough net gain for this balance and time horizon."
    );
  }

  if (input.goal === "save-safely") {
    explanations.push(
      venue.kind === "third-party"
        ? "The extra protocol exposure weakens the safety-first fit despite the higher APY."
        : "The venue remains easier to explain and monitor than long-tail DeFi alternatives."
    );
  }

  if (venue.estimatedNetReturn <= 0 && venue.kind !== "liquid") {
    explanations.push("Projected fees absorb most of the expected yield, so moving funds is hard to justify right now.");
  }

  explanations.push(`Deterministic fit score: ${score.toFixed(2)}.`);
  return explanations;
}

function buildTradeoffSummary(input: RecommendationRequest, venue: YieldQuote): string {
  if (!venue.available) {
    return venue.availabilityReasons[0] ?? "This venue is not currently available for the given input.";
  }

  if (venue.freshnessStatus === "stale") {
    return "This venue may still be attractive, but the current quote snapshot is stale and should be rechecked before acting.";
  }

  if (venue.id === "wallet-liquid") {
    return "Safest and most flexible path, but it gives up yield while the balance stays idle.";
  }

  if (venue.estimatedNetReturn <= 0) {
    return "The projected uplift is too small after fees for this balance and time horizon.";
  }

  if (venue.kind === "third-party" && input.riskComfort === "low") {
    return "The yield premium comes with third-party protocol risk that does not line up well with a lower-risk brief.";
  }

  if (venue.liquidityProfile === "locked" && input.timeHorizonDays <= venue.lockupDays + 7) {
    return "The exit delay is too close to the stated horizon, so the yield tradeoff is less convincing.";
  }

  if (venue.liquidityProfile !== "instant" && input.goal === "keep-flexible") {
    return "It earns more than staying liquid, but the slower exit path weakens the fit for a flexibility-first goal.";
  }

  if (venue.kind === "native") {
    return "Good balance of yield and trust, but it does not beat the winner on both liquidity and expected net return.";
  }

  return "Usable option, but the winner creates a cleaner risk, liquidity, and net-return tradeoff for this brief.";
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
        warnings: [
          ...risk.warnings,
          ...venue.guardrails,
          ...(venue.freshnessStatus === "stale"
            ? ["Quote freshness is stale. Recheck venue conditions before moving funds."]
            : []),
          ...(venue.quoteSource === "mock-fallback"
            ? ["This venue still relies on fallback modeling rather than a wired live integration."]
            : [])
        ],
        rationale: explainVenue(input, venue, score),
        actionLabel: venue.id === "wallet-liquid" ? "Keep liquid" : `Move into ${venue.label}`,
        tradeoffSummary: buildTradeoffSummary(input, venue)
      };
    })
    .sort((left, right) => right.score - left.score);
}

export function buildRecommendationSummary(
  input: RecommendationRequest,
  rankedVenues: RankedVenue[]
): Pick<
  RecommendationResponse,
  "confidence" | "recommendedAction" | "decisionSummary" | "rationale" | "warnings"
> {
  const [top, backup] = rankedVenues;

  if (!top) {
    return {
      confidence: "Hold for now",
      recommendedAction: "stay-liquid",
      decisionSummary: "Hold for now. No supported venue qualified for the current input.",
      rationale: ["No supported venue qualified for the current input."],
      warnings: ["Expand venue coverage or relax the request constraints."]
    };
  }

  const scoreGap = Number((top.score - (backup?.score ?? 0)).toFixed(2));
  const recommendedAction =
    top.id === "wallet-liquid" || top.estimatedNetReturn <= 0 ? "stay-liquid" : "move-funds";
  const confidence =
    recommendedAction === "stay-liquid"
      ? "Hold for now"
      : scoreGap >= 12 && top.riskLabel !== "Higher protocol risk"
        ? "Strong fit"
        : "Good fit";
  const decisionSummary =
    recommendedAction === "stay-liquid"
      ? top.id === "wallet-liquid"
        ? "Stay liquid for now. The current brief does not justify taking extra complexity away from MiniPay."
        : "Hold for now. The available earning paths are not creating enough net benefit for this balance and time horizon."
      : confidence === "Strong fit"
        ? `${top.label} is a strong fit for the current goal, time horizon, and risk comfort.`
        : `${top.label} is a reasonable upgrade from staying liquid, but the tradeoff is still worth reviewing before you act.`;

  return {
    confidence,
    recommendedAction,
    decisionSummary,
    rationale: [
      decisionSummary,
      `${top.label} projects about ${formatUnits(top.estimatedNetReturn)} ${input.token} net over ${input.timeHorizonDays} days after estimated one-time costs.`,
      backup
        ? `${backup.label} remains the fallback if you want a different mix of yield, liquidity, or protocol exposure.`
        : "No backup venue qualified for the current brief."
    ],
    warnings: Array.from(
      new Set([
        ...(top.warnings ?? []),
        ...(backup?.warnings ?? []),
        ...(recommendedAction === "stay-liquid"
          ? ["Re-run the recommendation when your balance or time horizon changes."]
          : [])
      ])
    ).slice(0, 6)
  };
}
