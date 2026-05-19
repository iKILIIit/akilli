import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Akili",
    version: "1.0.0",
    network: "celo-mainnet",
    timestamp: new Date().toISOString()
  });
}
