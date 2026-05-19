import { describe, it, expect, vi } from "vitest";

// Prevent OpenAI client from throwing without API key in test env
vi.mock("openai", () => ({ default: vi.fn(() => ({})) }));

import { computeSpendingBreakdown } from "../wallet-analyst";
import type { WalletSummary } from "../wallet-analyst";

function makeWallet(overrides: Partial<WalletSummary> = {}): WalletSummary {
  return {
    address: "0xabc",
    transactions: [],
    totalReceived: {},
    totalSent: {},
    totalGasFeesUSD: 0,
    uniqueContracts: [],
    unknownContracts: [],
    periodDays: 30,
    fetchedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("computeSpendingBreakdown", () => {
  it("returns empty categories for wallet with no transactions", () => {
    const result = computeSpendingBreakdown(makeWallet());
    expect(result.categories).toHaveLength(0);
    expect(result.topCounterparties).toHaveLength(0);
    expect(result.byToken).toHaveLength(0);
    expect(result.dailyAvgSpend).toBe(0);
  });

  it("calculates received amounts correctly", () => {
    const wallet = makeWallet({
      transactions: [
        {
          hash: "0x1", timestamp: Date.now(), date: "2026-05-01",
          type: "received", category: "transfer", amount: "100",
          token: "USDC", counterparty: "0xsender", counterpartyLabel: "Alice",
          gasFeeUSD: "0.001"
        }
      ],
      totalReceived: { USDC: 100 },
      totalSent: {}
    });

    const result = computeSpendingBreakdown(wallet);
    const received = result.categories.find(c => c.label === "Money Received");
    expect(received).toBeDefined();
    expect(received!.amount).toBe(100);

    const usdcToken = result.byToken.find(t => t.token === "USDC");
    expect(usdcToken?.received).toBe(100);
    expect(usdcToken?.sent).toBe(0);
  });

  it("uses Network Fees label (not Gas Fees)", () => {
    const wallet = makeWallet({ totalGasFeesUSD: 1.5 });
    const result = computeSpendingBreakdown(wallet);
    const feeCategory = result.categories.find(c => c.label === "Network Fees");
    expect(feeCategory).toBeDefined();
    expect(result.categories.find(c => c.label === "Gas Fees")).toBeUndefined();
  });

  it("limits topCounterparties to 5", () => {
    const txs = Array.from({ length: 10 }, (_, i) => ({
      hash: `0x${i}`, timestamp: Date.now(), date: "2026-05-01",
      type: "sent" as const, category: "transfer" as const, amount: "10",
      token: "USDC", counterparty: `0xaddr${i}`, counterpartyLabel: `Contact ${i}`,
      gasFeeUSD: "0"
    }));

    const result = computeSpendingBreakdown(makeWallet({ transactions: txs }));
    expect(result.topCounterparties.length).toBeLessThanOrEqual(5);
  });

  it("percentage values sum to approximately 100", () => {
    const wallet = makeWallet({
      transactions: [
        { hash: "0x1", timestamp: Date.now(), date: "2026-05-01", type: "received", category: "transfer", amount: "50", token: "USDC", counterparty: "0xa", counterpartyLabel: "A", gasFeeUSD: "0" },
        { hash: "0x2", timestamp: Date.now(), date: "2026-05-01", type: "sent", category: "transfer", amount: "30", token: "USDC", counterparty: "0xb", counterpartyLabel: "B", gasFeeUSD: "0" }
      ],
      totalGasFeesUSD: 0.5
    });
    const result = computeSpendingBreakdown(wallet);
    const total = result.categories.reduce((sum, c) => sum + c.percentage, 0);
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThanOrEqual(100);
  });
});
