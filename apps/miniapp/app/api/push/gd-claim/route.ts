import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import webpush from "web-push";
import {
  createPublicClient,
  http,
  parseAbi,
  formatUnits,
} from "viem";
import { celo } from "viem/chains";

export const dynamic = "force-dynamic";

// Called by Vercel Cron every day at 09:00 UTC (see vercel.json).
// Also callable manually: GET /api/push/gd-claim?secret=<CRON_SECRET>

const UBI_ABI = parseAbi([
  "function checkEntitlement(address _member) view returns (uint256)",
]);

const client = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

// UBI scheme address on Celo mainnet
const UBI_SCHEME = "0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1" as const;

const GD_MESSAGES = [
  "Your G$ is just sitting there, unclaimed 👀",
  "Free G$, no strings attached — go grab it! 💸",
  "Your daily G$ UBI is waiting for you 🌿",
  "Unclaimed G$? That's leaving money on the table 🎁",
  "Today's G$ entitlement is ready — don't miss it! ✨",
];

function randomMessage(): string {
  return GD_MESSAGES[Math.floor(Math.random() * GD_MESSAGES.length)];
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:akilihq12@gmail.com";

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { error: "VAPID keys not configured" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

  // Fetch all subscriber keys from the index set
  const subscriberKeys = await kv.smembers("push:subscribers") as string[];
  if (!subscriberKeys.length) {
    return NextResponse.json({ sent: 0, skipped: 0, message: "No subscribers" });
  }

  let sent = 0;
  let skipped = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    subscriberKeys.map(async (key) => {
      const raw = await kv.get<string>(key);
      if (!raw) {
        stale.push(key);
        return;
      }

      const sub = JSON.parse(raw) as PushSubscriptionJSON;

      // Derive wallet address from key if available (key format: push:sub:<address>)
      const walletMatch = key.match(/^push:sub:(0x[0-9a-f]{40})$/i);
      const walletAddress = walletMatch?.[1] as `0x${string}` | undefined;

      // Only ping wallets that actually have unclaimed G$
      if (walletAddress) {
        try {
          const entitlementRaw = await client.readContract({
            address: UBI_SCHEME,
            abi: UBI_ABI,
            functionName: "checkEntitlement",
            args: [walletAddress],
          });

          if (!entitlementRaw || entitlementRaw === 0n) {
            skipped++;
            return;
          }

          const amount = Number(formatUnits(entitlementRaw, 2)).toFixed(2);
          const payload = JSON.stringify({
            title: "Claim your G$ 🌿",
            body: `You have ${amount} G$ waiting — ${randomMessage()}`,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            url: "/",
          });

          await webpush.sendNotification(sub as webpush.PushSubscription, payload);
          sent++;
        } catch (err: unknown) {
          // 410 Gone = subscription expired; remove it
          if (
            err instanceof Error &&
            "statusCode" in err &&
            (err as { statusCode: number }).statusCode === 410
          ) {
            stale.push(key);
          } else {
            skipped++;
          }
        }
      } else {
        // Anonymous subscriber — send generic reminder without chain check
        const payload = JSON.stringify({
          title: "Check your G$ 🌿",
          body: randomMessage(),
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          url: "/",
        });

        try {
          await webpush.sendNotification(sub as webpush.PushSubscription, payload);
          sent++;
        } catch {
          skipped++;
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (stale.length > 0) {
    await Promise.all([
      ...stale.map((k) => kv.del(k)),
      kv.srem("push:subscribers", ...stale),
    ]);
  }

  return NextResponse.json({ sent, skipped, staleRemoved: stale.length });
}
