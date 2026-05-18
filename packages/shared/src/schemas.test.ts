import { describe, it, expect } from "vitest";
import {
  recommendationRequestSchema,
  llmRecommendationDraftSchema,
  positionSchema,
  tokenSchema
} from "./schemas";

describe("recommendationRequestSchema", () => {
  it("accepts a valid request", () => {
    const result = recommendationRequestSchema.parse({
      walletAddress: "0xabc",
      token: "USDC",
      amount: "100",
      goal: "earn-more",
      timeHorizonDays: 30,
      riskComfort: "medium"
    });
    expect(result.token).toBe("USDC");
    expect(result.amount).toBe("100");
  });

  it("applies default walletAddress when omitted", () => {
    const result = recommendationRequestSchema.parse({
      token: "USDT",
      amount: "50",
      goal: "keep-flexible",
      timeHorizonDays: 7,
      riskComfort: "low"
    });
    expect(result.walletAddress).toBe("0x0000000000000000000000000000000000000000");
  });

  it("rejects an unknown goal", () => {
    expect(() =>
      recommendationRequestSchema.parse({
        token: "USDC",
        amount: "100",
        goal: "speculate",
        timeHorizonDays: 30,
        riskComfort: "low"
      })
    ).toThrow();
  });

  it("rejects a non-positive timeHorizonDays", () => {
    expect(() =>
      recommendationRequestSchema.parse({
        token: "USDC",
        amount: "100",
        goal: "earn-more",
        timeHorizonDays: 0,
        riskComfort: "medium"
      })
    ).toThrow();
  });

  it("rejects an empty amount", () => {
    expect(() =>
      recommendationRequestSchema.parse({
        token: "USDC",
        amount: "",
        goal: "save-safely",
        timeHorizonDays: 14,
        riskComfort: "low"
      })
    ).toThrow();
  });
});

describe("llmRecommendationDraftSchema", () => {
  it("accepts a valid draft", () => {
    const draft = llmRecommendationDraftSchema.parse({
      recommendedVenueId: "minipay-boost",
      backupVenueId: "kiln",
      confidence: "Strong fit",
      decisionSummary: "MiniPay Boost fits the goal well.",
      rationale: ["Good APY for native venue.", "Instant-ish exit path."],
      warnings: []
    });
    expect(draft.recommendedVenueId).toBe("minipay-boost");
    expect(draft.confidence).toBe("Strong fit");
  });

  it("accepts null backupVenueId", () => {
    const draft = llmRecommendationDraftSchema.parse({
      recommendedVenueId: "wallet-liquid",
      backupVenueId: null,
      confidence: "Hold for now",
      decisionSummary: "Stay liquid.",
      rationale: ["No yield path beats the baseline.", "Time horizon is too short."],
      warnings: ["Re-run when balance grows."]
    });
    expect(draft.backupVenueId).toBeNull();
  });

  it("rejects too few rationale items", () => {
    expect(() =>
      llmRecommendationDraftSchema.parse({
        recommendedVenueId: "kiln",
        backupVenueId: null,
        confidence: "Good fit",
        decisionSummary: "Kiln looks good.",
        rationale: ["Only one reason."],
        warnings: []
      })
    ).toThrow();
  });

  it("rejects an invalid confidence value", () => {
    expect(() =>
      llmRecommendationDraftSchema.parse({
        recommendedVenueId: "kiln",
        backupVenueId: null,
        confidence: "Maybe",
        decisionSummary: "Kiln looks ok.",
        rationale: ["Reason one.", "Reason two."],
        warnings: []
      })
    ).toThrow();
  });
});

describe("positionSchema", () => {
  it("accepts a valid active position", () => {
    const pos = positionSchema.parse({
      venueId: "minipay-boost",
      venueLabel: "MiniPay Boost",
      token: "USDC",
      amount: "200",
      currentApy: 4.8,
      startedAt: new Date().toISOString(),
      status: "active",
      alerts: []
    });
    expect(pos.status).toBe("active");
  });

  it("accepts status: watch", () => {
    const pos = positionSchema.parse({
      venueId: "direct-celo-lending",
      venueLabel: "Direct Celo Lending",
      token: "USDC",
      amount: "100",
      currentApy: 7.4,
      startedAt: new Date().toISOString(),
      status: "watch",
      alerts: []
    });
    expect(pos.status).toBe("watch");
  });

  it("accepts status: ready-to-exit", () => {
    const pos = positionSchema.parse({
      venueId: "kiln",
      venueLabel: "Kiln in MiniPay",
      token: "USDT",
      amount: "300",
      currentApy: 6.1,
      startedAt: new Date().toISOString(),
      status: "ready-to-exit",
      alerts: []
    });
    expect(pos.status).toBe("ready-to-exit");
  });

  it("rejects an invalid status", () => {
    expect(() =>
      positionSchema.parse({
        venueId: "kiln",
        venueLabel: "Kiln in MiniPay",
        token: "USDC",
        amount: "300",
        currentApy: 6.1,
        startedAt: new Date().toISOString(),
        status: "unknown",
        alerts: []
      })
    ).toThrow();
  });
});

describe("tokenSchema", () => {
  it("accepts USDT, USDC, USDm", () => {
    expect(tokenSchema.parse("USDT")).toBe("USDT");
    expect(tokenSchema.parse("USDC")).toBe("USDC");
    expect(tokenSchema.parse("USDm")).toBe("USDm");
  });

  it("rejects unknown tokens", () => {
    expect(() => tokenSchema.parse("DAI")).toThrow();
    expect(() => tokenSchema.parse("ETH")).toThrow();
    expect(() => tokenSchema.parse("CELO")).toThrow();
    expect(() => tokenSchema.parse("")).toThrow();
  });
});
