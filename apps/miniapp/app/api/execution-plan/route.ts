import { buildExecutionPlan, generateRecommendation } from "@yield-copilot/agents";
import { executionPlanRequestSchema, recommendationRequestSchema } from "@yield-copilot/shared";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = executionPlanRequestSchema.parse(body);
    const recommendationInput = recommendationRequestSchema.parse({
      walletAddress: input.walletAddress ?? "0x0000000000000000000000000000000000000000",
      token: input.token,
      amount: input.amount,
      goal: "save-safely",
      timeHorizonDays: 30,
      riskComfort: "low"
    });
    const recommendation = generateRecommendation(recommendationInput);
    const venue = [recommendation.recommended, recommendation.backup].find(
      (candidate) => candidate?.id === input.venueId
    );

    if (!venue) {
      return NextResponse.json(
        { error: "Requested venue does not match the current recommendation set." },
        { status: 404 }
      );
    }

    const plan = buildExecutionPlan(recommendationInput, venue);
    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
