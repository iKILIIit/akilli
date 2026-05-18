import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateRecommendation,
  generatePositionView,
  generateRecommendationWithLLM
} from "./recommendation-engine";
import { recommendationRequestSchema } from "@yield-copilot/shared";

const baseRequest = recommendationRequestSchema.parse({
  walletAddress: "0xabc123",
  token: "USDC",
  amount: "200",
  goal: "earn-more",
  timeHorizonDays: 45,
  riskComfort: "medium"
});

describe("generateRecommendation", () => {
  it("returns all required top-level fields", () => {
    const result = generateRecommendation(baseRequest);
    expect(result).toHaveProperty("recommended");
    expect(result).toHaveProperty("backup");
    expect(result).toHaveProperty("consideredVenues");
    expect(result).toHaveProperty("rationale");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("executionPlan");
  });

  it("consideredVenues contains at least one entry", () => {
    const result = generateRecommendation(baseRequest);
    expect(result.consideredVenues.length).toBeGreaterThan(0);
  });

  it("riskComfort=low never returns a third-party venue as recommended", () => {
    const lowRiskInput = recommendationRequestSchema.parse({
      ...baseRequest,
      riskComfort: "low"
    });
    const result = generateRecommendation(lowRiskInput);
    expect(result.recommended.thirdParty).toBe(false);
  });

  it("goal=keep-flexible returns wallet-liquid or a native venue as top pick", () => {
    const flexInput = recommendationRequestSchema.parse({
      ...baseRequest,
      goal: "keep-flexible",
      riskComfort: "low"
    });
    const result = generateRecommendation(flexInput);
    expect(["liquid", "native"]).toContain(result.recommended.kind);
  });

  it("executionPlan.venueId matches recommended.id", () => {
    const result = generateRecommendation(baseRequest);
    expect(result.executionPlan.venueId).toBe(result.recommended.id);
  });

  it("generatedAt is a valid ISO datetime", () => {
    const result = generateRecommendation(baseRequest);
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow();
  });

  it("policyExecution has routerMethod executePolicyAction", () => {
    const result = generateRecommendation(baseRequest);
    expect(result.policyExecution.routerMethod).toBe("executePolicyAction");
  });
});

describe("generatePositionView", () => {
  it("returns a position with venueId matching the recommendation", () => {
    const recommendation = generateRecommendation(baseRequest);
    const position = generatePositionView(baseRequest);
    expect(position.venueId).toBe(recommendation.recommended.id);
  });

  it("position has all required fields", () => {
    const position = generatePositionView(baseRequest);
    expect(position).toHaveProperty("venueId");
    expect(position).toHaveProperty("venueLabel");
    expect(position).toHaveProperty("token");
    expect(position).toHaveProperty("amount");
    expect(position).toHaveProperty("currentApy");
    expect(position).toHaveProperty("startedAt");
    expect(position).toHaveProperty("status");
    expect(position).toHaveProperty("alerts");
  });

  it("position.token matches the input token", () => {
    const position = generatePositionView(baseRequest);
    expect(position.token).toBe(baseRequest.token);
  });
});

describe("generateRecommendationWithLLM", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("falls back to deterministic result when ANTHROPIC_API_KEY is absent", async () => {
    const result = await generateRecommendationWithLLM(baseRequest);
    expect(result).toHaveProperty("recommended");
    expect(result).toHaveProperty("consideredVenues");
    expect(result.decisionEngine.source).toBe("deterministic");
    expect(result.decisionEngine.fallbackReason).toBeDefined();
  });

  it("fallback result is deterministic (same output for same input)", async () => {
    const result1 = await generateRecommendationWithLLM(baseRequest);
    const result2 = await generateRecommendationWithLLM(baseRequest);
    expect(result1.recommended.id).toBe(result2.recommended.id);
    expect(result1.confidence).toBe(result2.confidence);
  });
});
