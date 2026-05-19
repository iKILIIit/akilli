import { generateRecommendationWithLLM } from "@yield-copilot/agents";
import { recommendationRequestSchema } from "@yield-copilot/shared";
import { NextRequest, NextResponse } from "next/server";
import { X402_ENABLED, handleX402 } from "../../../lib/x402";

export async function POST(request: NextRequest) {
  if (X402_ENABLED) {
    const paymentData =
      request.headers.get("payment-signature") ??
      request.headers.get("x-payment");

    const result = await handleX402(request.url, "POST", paymentData);

    if (result.status !== 200) {
      return new NextResponse(JSON.stringify(result.responseBody), {
        status: result.status,
        headers: { "Content-Type": "application/json", ...result.responseHeaders },
      });
    }
  }

  try {
    const body = await request.json();
    const input = recommendationRequestSchema.parse(body);
    const llmResult = await generateRecommendationWithLLM(input);
    return NextResponse.json(llmResult);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
