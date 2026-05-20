import { NextRequest, NextResponse } from "next/server";
import { fetchWalletData } from "../../../lib/celo-transactions";
import { researchAddress } from "../../../lib/linkup";
import { computeSpendingBreakdown, generateWalletReport } from "@yield-copilot/agents";
import { rateLimit, getClientKey } from "../../../lib/rate-limit";
import { z } from "zod";

const insightsRequestSchema = z.object({
  walletAddress: z.string().min(1),
  days: z.number().int().positive().max(365).optional().default(90)
});

export async function POST(request: NextRequest) {
  const { allowed, resetAt } = rateLimit(getClientKey(request), 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "X-RateLimit-Reset": String(resetAt) } }
    );
  }

  try {
    const body = await request.json();
    const { walletAddress, days } = insightsRequestSchema.parse(body);

    const wallet = await fetchWalletData(walletAddress, days);

    // spending breakdown is pure computation — no AI needed
    const spendingBreakdown = computeSpendingBreakdown(wallet);

    // research unknown contracts for richer AI context
    let linkupContext: string | undefined;
    if (wallet.unknownContracts.length > 0) {
      const researched = await Promise.all(
        wallet.unknownContracts.slice(0, 3).map(addr => researchAddress(addr))
      );
      const merged = researched.filter(Boolean).join("\n\n");
      if (merged) linkupContext = merged;
    }

    // run financial-health and monthly-plan in parallel
    const [healthReport, monthlyPlan] = await Promise.all([
      generateWalletReport(wallet, "financial-health", linkupContext),
      generateWalletReport(wallet, "monthly-plan", linkupContext)
    ]);

    return NextResponse.json({
      walletAddress,
      periodDays: days,
      transactionCount: wallet.transactions.length,
      spendingBreakdown,
      financialHealth: {
        narrative: healthReport.narrative,
        healthScore: healthReport.healthScore,
        healthLabel: healthReport.healthLabel,
        keyFindings: healthReport.keyFindings,
        generatedAt: healthReport.generatedAt
      },
      monthlyPlan: {
        narrative: monthlyPlan.narrative,
        keyFindings: monthlyPlan.keyFindings,
        generatedAt: monthlyPlan.generatedAt
      },
      totalReceived: wallet.totalReceived,
      totalSent: wallet.totalSent,
      totalGasFeesUSD: wallet.totalGasFeesUSD
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
