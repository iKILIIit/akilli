import { generatePositionView } from "@yield-copilot/agents";
import { recommendationRequestSchema } from "@yield-copilot/shared";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ address: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { address } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const input = recommendationRequestSchema.parse({
      walletAddress: address,
      token: searchParams.get("token") ?? "USDC",
      amount: searchParams.get("amount") ?? "100",
      goal: searchParams.get("goal") ?? "save-safely",
      timeHorizonDays: Number(searchParams.get("timeHorizonDays") ?? "30"),
      riskComfort: searchParams.get("riskComfort") ?? "low"
    });
    const position = generatePositionView(input);
    return NextResponse.json(position);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
