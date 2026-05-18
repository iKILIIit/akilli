import { generateRecommendationWithLLM } from "@yield-copilot/agents";
import { recommendationRequestSchema } from "@yield-copilot/shared";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = recommendationRequestSchema.parse(body);
    const result = await generateRecommendationWithLLM(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
