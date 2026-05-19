import { NextRequest, NextResponse } from "next/server";
import { fetchWalletData } from "../../../lib/celo-transactions";
import { researchAddress } from "../../../lib/linkup";
import { chatWithWallet } from "@yield-copilot/agents";
import { rateLimit, getClientKey } from "../../../lib/rate-limit";
import { z } from "zod";

const chatRequestSchema = z.object({
  walletAddress: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1)
    })
  ).min(1),
  researchQuery: z.string().optional()
});

export async function POST(request: NextRequest) {
  const { allowed, remaining, resetAt } = rateLimit(getClientKey(request), 20, 60_000);

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
    const { walletAddress, messages, researchQuery } = chatRequestSchema.parse(body);

    const [wallet, linkupContext] = await Promise.all([
      fetchWalletData(walletAddress, 90),
      researchQuery ? researchAddress(researchQuery) : Promise.resolve(undefined)
    ]);

    const reply = await chatWithWallet(wallet, messages, linkupContext);

    return NextResponse.json(
      { reply, fetchedAt: wallet.fetchedAt },
      { headers: { "X-RateLimit-Remaining": String(remaining) } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 400 }
    );
  }
}
