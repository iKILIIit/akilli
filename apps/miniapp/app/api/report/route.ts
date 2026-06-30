import { NextRequest, NextResponse } from "next/server";
import { fetchWalletData } from "../../../lib/celo-transactions";
import { researchAddress } from "../../../lib/linkup";
import { generateWalletReport } from "@yield-copilot/agents";
import { rateLimit, getClientKey } from "../../../lib/rate-limit";
import { getGDStatus } from "@yield-copilot/celo";
import { z } from "zod";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const reportRequestSchema = z.object({
  walletAddress: z.string().min(1),
  reportType: z.enum(["spending-advice", "account-summary", "wallet-audit", "wallet-statement", "monthly-plan", "financial-health", "remittance-analysis", "gd-ubi-history", "gd-ubi-optimize"]),
  days: z.number().int().positive().max(365).optional().default(90)
});

// ── AkiliLog wiring ───────────────────────────────────────────────────────────

const AKILI_LOG_ADDRESS = "0xbc84e6000869E08837ecAd0a26D43f7731982E8F" as const;

const akiliLogAbi = parseAbi([
  "function logDecision(string calldata userId, string calldata action) external",
]);

async function logToChain(userId: string, action: string): Promise<void> {
  // Prefer a dedicated agent key; fall back to deployer only in dev.
  // AKILI_AGENT_KEY should be a separate low-value wallet that only has
  // the isAgent role on AkiliLog — never the deployer/owner key.
  const pk = process.env.AKILI_AGENT_KEY ?? process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) return; // silently skip if no key configured

  try {
    const account = privateKeyToAccount(`0x${pk}`);
    const transport = http("https://forno.celo.org");

    const walletClient = createWalletClient({ account, chain: celo, transport });
    const publicClient = createPublicClient({ chain: celo, transport });

    const hash = await walletClient.writeContract({
      address: AKILI_LOG_ADDRESS,
      abi: akiliLogAbi,
      functionName: "logDecision",
      args: [userId, action],
    });

    // fire-and-forget — don't block the response waiting for confirmation
    publicClient.waitForTransactionReceipt({ hash }).catch(() => {});
  } catch {
    // never fail the user request due to logging errors
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { allowed, remaining, resetAt } = rateLimit(getClientKey(request), 10, 60_000);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetAt)
        }
      }
    );
  }

  try {
    const body = await request.json();
    const { walletAddress, reportType, days } = reportRequestSchema.parse(body);

    const wallet = await fetchWalletData(walletAddress, days);

    // For G$ report types, fetch live balance and entitlement from chain
    // so the AI has the real current balance — not just the transaction-derived total
    let linkupContext: string | undefined;
    if (reportType === "gd-ubi-history" || reportType === "gd-ubi-optimize") {
      try {
        const gd = await getGDStatus(walletAddress);
        linkupContext = [
          `LIVE G$ DATA (on-chain, as of now):`,
          `Current G$ wallet balance: ${gd.gdBalance} G$`,
          `Claimable today (entitlement): ${gd.entitlement} G$`,
          `GoodDollar verified: ${gd.isVerified ? "Yes" : "No"}`,
        ].join("\n");
      } catch { /* non-fatal — report still works without it */ }
    }

    // research any unknown contracts via Linkup to enrich non-GD reports
    if (!linkupContext && wallet.unknownContracts.length > 0) {
      const researched = await Promise.all(
        wallet.unknownContracts.slice(0, 3).map(addr => researchAddress(addr))
      );
      const merged = researched.filter(Boolean).join("\n\n");
      if (merged) linkupContext = merged;
    }

    const analysis = await generateWalletReport(wallet, reportType, linkupContext);

    // Log decision to AkiliLog onchain (fire-and-forget)
    void logToChain(walletAddress, reportType);

    return NextResponse.json(
      { ...analysis, walletAddress, transactionCount: wallet.transactions.length, periodDays: days },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
