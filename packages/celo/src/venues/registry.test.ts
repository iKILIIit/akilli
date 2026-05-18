import { describe, it, expect } from "vitest";
import { resolveVenueQuotes } from "./registry";
import { recommendationRequestSchema } from "@yield-copilot/shared";

const baseRequest = recommendationRequestSchema.parse({
  walletAddress: "0x0000000000000000000000000000000000000000",
  token: "USDC",
  amount: "150",
  goal: "earn-more",
  timeHorizonDays: 30,
  riskComfort: "medium"
});

describe("resolveVenueQuotes", () => {
  it("excludes direct-celo-lending for USDT (only supports USDC and USDm)", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      token: "USDT"
    });
    const quotes = resolveVenueQuotes(input);
    const ids = quotes.map((q) => q.id);
    expect(ids).not.toContain("direct-celo-lending");
  });

  it("returns all 4 venue quotes for USDC", () => {
    const quotes = resolveVenueQuotes(baseRequest);
    expect(quotes.length).toBe(4);
    const ids = quotes.map((q) => q.id);
    expect(ids).toContain("wallet-liquid");
    expect(ids).toContain("minipay-boost");
    expect(ids).toContain("kiln");
    expect(ids).toContain("direct-celo-lending");
  });

  it("marks direct-celo-lending as unavailable when amount=10", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      amount: "10"
    });
    const quotes = resolveVenueQuotes(input);
    const directLending = quotes.find((q) => q.id === "direct-celo-lending");
    expect(directLending).toBeDefined();
    expect(directLending!.available).toBe(false);
  });

  it("each quote has apy, available, freshnessStatus, and estimatedNetReturn", () => {
    const quotes = resolveVenueQuotes(baseRequest);
    for (const quote of quotes) {
      expect(typeof quote.apy).toBe("number");
      expect(typeof quote.available).toBe("boolean");
      expect(["fresh", "stale", "unavailable"]).toContain(quote.freshnessStatus);
      expect(typeof quote.estimatedNetReturn).toBe("number");
    }
  });

  it("USDm resolves wallet-liquid and direct-celo-lending (not minipay-boost or kiln)", () => {
    const input = recommendationRequestSchema.parse({
      ...baseRequest,
      token: "USDm"
    });
    const quotes = resolveVenueQuotes(input);
    const ids = quotes.map((q) => q.id);
    expect(ids).toContain("wallet-liquid");
    expect(ids).toContain("direct-celo-lending");
    expect(ids).not.toContain("minipay-boost");
    expect(ids).not.toContain("kiln");
  });

  it("all quotes have a valid quoteUpdatedAt datetime", () => {
    const quotes = resolveVenueQuotes(baseRequest);
    for (const quote of quotes) {
      expect(() => new Date(quote.quoteUpdatedAt).toISOString()).not.toThrow();
    }
  });
});
