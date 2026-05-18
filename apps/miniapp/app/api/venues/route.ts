import { getVenueDefinitions } from "@yield-copilot/celo";
import { NextResponse } from "next/server";

export function GET() {
  try {
    const venues = getVenueDefinitions();
    return NextResponse.json(venues);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load venues" },
      { status: 500 }
    );
  }
}
