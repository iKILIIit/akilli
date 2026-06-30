import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const dynamic = "force-dynamic";

// Stored subscriptions are keyed by wallet address in a KV hash:
//   push:sub:<walletAddress>  →  PushSubscription JSON

/** POST /api/push/subscribe — save or update a push subscription */
export async function POST(req: Request) {
  let body: { subscription: PushSubscriptionJSON; walletAddress?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subscription, walletAddress } = body;
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Missing subscription.endpoint" }, { status: 400 });
  }

  // Use wallet address as key when provided; fall back to a hash of the endpoint.
  const key = walletAddress
    ? `push:sub:${walletAddress.toLowerCase()}`
    : `push:sub:anon:${Buffer.from(subscription.endpoint).toString("base64url").slice(0, 32)}`;

  await kv.set(key, JSON.stringify(subscription), { ex: 60 * 60 * 24 * 90 }); // 90-day TTL

  // Keep an index set so the cron can iterate all subscribers
  await kv.sadd("push:subscribers", key);

  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe — remove a subscription */
export async function DELETE(req: Request) {
  let body: { walletAddress?: string; endpoint?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const key = body.walletAddress
    ? `push:sub:${body.walletAddress.toLowerCase()}`
    : null;

  if (!key) {
    return NextResponse.json({ error: "Provide walletAddress" }, { status: 400 });
  }

  await kv.del(key);
  await kv.srem("push:subscribers", key);

  return NextResponse.json({ ok: true });
}
