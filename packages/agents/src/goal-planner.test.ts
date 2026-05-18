import { describe, it, expect } from "vitest";
import { rankVenues, buildRecommendationSummary } from "./goal-planner";
import { discoverVenueQuotes } from "./yield-scout";
import { recommendationRequestSchema } from "@yield-copilot/shared";

const baseRequest = recommendationRequestSchema.parse({
  walletAddress: "0x0000000000000000000000000000000000000000",
  token: "USDC",
  amount: "150",
  goal: "save-safely",
  timeHorizonDays: 30,
  riskComfort: "low"
});

describe("rankVenues", () => {
  it("goal=keep-flexible, riskComfort=low never puts a third-party or locked venue at top", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      goal: "keep-flexible",
      riskComfort: "low"
    });
    const quotes = discoverVenueQuotes(input);
    const ranked = rankVenues(input, quotes);
    expect(ranked.length).toBeGreaterThan(0);
    const top = ranked[0]!;
    expect(top.thirdParty).toBe(false);
    expect(top.liquidityProfile).not.toBe("locked");
  });

  it("goal=earn-more, riskComfort=medium, amount=500, timeHorizonDays=60 favors kiln or direct-celo-lending", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      goal: "earn-more",
      riskComfort: "medium",
      amount: "500",
      timeHorizonDays: 60
    });
    const quotes = discoverVenueQuotes(input);
    const ranked = rankVenues(input, quotes);
    expect(ranked.length).toBeGreaterThan(0);
    expect(["kiln", "direct-celo-lending"]).toContain(ranked[0]!.id);
  });

  it("unavailable venue (amount=10 for direct-celo-lending) gets a large negative score offset", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      goal: "earn-more",
      riskComfort: "medium",
      amount: "10",
      timeHorizonDays: 60
    });
    const quotes = discoverVenueQuotes(input);
    const ranked = rankVenues(input, quotes);
    const directLending = ranked.find((v) => v.id === "direct-celo-lending");
    expect(directLending).toBeDefined();
    expect(directLending!.available).toBe(false);
    expect(directLending!.score).toBeLessThan(-50);
  });

  it("assigns scores to all returned venues", () => {
    const quotes = discoverVenueQuotes(baseRequest);
    const ranked = rankVenues(baseRequest, quotes);
    for (const venue of ranked) {
      expect(typeof venue.score).toBe("number");
      expect(isNaN(venue.score)).toBe(false);
    }
  });
});

describe("buildRecommendationSummary", () => {
  it("returns recommendedAction: stay-liquid when wallet-liquid is top", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      goal: "keep-flexible",
      riskComfort: "low"
    });
    const quotes = discoverVenueQuotes(input);
    const ranked = rankVenues(input, quotes);
    const walletLiquidFirst = [
      ranked.find((v) => v.id === "wallet-liquid")!,
      ...ranked.filter((v) => v.id !== "wallet-liquid")
    ];
    const summary = buildRecommendationSummary(input, walletLiquidFirst);
    expect(summary.recommendedAction).toBe("stay-liquid");
  });

  it("returns confidence: Strong fit when score gap is >= 12 and top is not higher-risk", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      goal: "earn-more",
      riskComfort: "medium",
      amount: "500",
      timeHorizonDays: 90
    });
    const quotes = discoverVenueQuotes(input);
    const ranked = rankVenues(input, quotes);
    const summary = buildRecommendationSummary(input, ranked);
    const [top, backup] = ranked as [typeof ranked[0], typeof ranked[0] | undefined];
    const scoreGap = (top?.score ?? 0) - (backup?.score ?? 0);
    if (
      top &&
      scoreGap >= 12 &&
      top.riskLabel !== "Higher protocol risk" &&
      top.id !== "wallet-liquid" &&
      top.estimatedNetReturn > 0
    ) {
      expect(summary.confidence).toBe("Strong fit");
    } else {
      expect(["Strong fit", "Good fit", "Hold for now"]).toContain(summary.confidence);
    }
  });

  it("returns a non-empty rationale array", () => {
    const quotes = discoverVenueQuotes(baseRequest);
    const ranked = rankVenues(baseRequest, quotes);
    const summary = buildRecommendationSummary(baseRequest, ranked);
    expect(Array.isArray(summary.rationale)).toBe(true);
    expect(summary.rationale.length).toBeGreaterThan(0);
  });

  it("returns Hold for now with empty venues", () => {
    const summary = buildRecommendationSummary(baseRequest, []);
    expect(summary.confidence).toBe("Hold for now");
    expect(summary.recommendedAction).toBe("stay-liquid");
  });
});
