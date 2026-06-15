import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

// Called by Vercel Cron (vercel.json) every 5 minutes.
// Also callable manually: GET /api/escrow-execute?secret=<CRON_SECRET>

const ESCROW_ADDRESS = "0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6" as const;

const ESCROW_ABI = parseAbi([
  "event OrderCreated(bytes32 indexed orderId, address indexed user, address token, address recipient, uint256 amount, uint256 targetRate, string currency)",
  "event OrderExecuted(bytes32 indexed orderId, uint256 executedRate)",
  "event OrderCancelled(bytes32 indexed orderId)",
  "function execute(bytes32 orderId, uint256 currentRate) external",
  "function orders(bytes32) view returns (address user, address token, address recipient, uint256 amount, uint256 targetRate, string currency, bool executed, bool cancelled, uint256 createdAt)",
]);

const FX_API = "https://open.er-api.com/v6/latest/USD";

// Rate is stored as integer × 100 in the contract (e.g. NGN 1620.50 → 162050)
const CURRENCY_TO_FIELD: Record<string, string> = {
  NGN: "NGN", KES: "KES", GHS: "GHS", ZAR: "ZAR",
};

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const executorKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!executorKey) {
    return NextResponse.json({ error: "EXECUTOR_PRIVATE_KEY not set" }, { status: 500 });
  }

  const account = privateKeyToAccount(executorKey as `0x${string}`);
  const publicClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
  const walletClient = createWalletClient({ chain: celo, transport: http("https://forno.celo.org"), account });

  // Fetch live FX rates
  let fxRates: Record<string, number> = {};
  try {
    const res = await fetch(FX_API, { next: { revalidate: 300 } });
    const data = await res.json() as { rates: Record<string, number> };
    fxRates = data.rates;
  } catch {
    return NextResponse.json({ error: "FX fetch failed" }, { status: 502 });
  }

  // Scan OrderCreated events from last 30 days to find pending orders
  const fromBlock = BigInt(Math.max(0, Number(await publicClient.getBlockNumber()) - 172800)); // ~30 days at 15s/block

  const createdLogs = await publicClient.getLogs({
    address: ESCROW_ADDRESS,
    event: ESCROW_ABI[0],
    fromBlock,
    toBlock: "latest",
  });

  const results: { orderId: string; status: string; tx?: string }[] = [];

  for (const log of createdLogs) {
    const decoded = decodeEventLog({ abi: ESCROW_ABI, data: log.data, topics: log.topics });
    if (decoded.eventName !== "OrderCreated") continue;

    const { orderId, currency } = decoded.args as { orderId: `0x${string}`; currency: string };

    // Read current on-chain order state
    const order = await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: "orders",
      args: [orderId],
    }) as [string, string, string, bigint, bigint, string, boolean, boolean, bigint];

    const [, , , , targetRateEncoded, , executed, cancelled] = order;
    if (executed || cancelled) {
      results.push({ orderId, status: "skip" });
      continue;
    }

    const fxField = CURRENCY_TO_FIELD[currency];
    if (!fxField || !fxRates[fxField]) {
      results.push({ orderId, status: "unknown_currency" });
      continue;
    }

    // currentRate encoded same way as contract: × 100
    const currentRateEncoded = BigInt(Math.round(fxRates[fxField] * 100));

    if (currentRateEncoded >= targetRateEncoded) {
      try {
        const data = encodeFunctionData({
          abi: ESCROW_ABI,
          functionName: "execute",
          args: [orderId, currentRateEncoded],
        });
        const hash = await walletClient.sendTransaction({
          to: ESCROW_ADDRESS,
          data,
        });
        results.push({ orderId, status: "executed", tx: hash });
      } catch (e) {
        results.push({ orderId, status: "exec_failed" });
      }
    } else {
      results.push({ orderId, status: `waiting (cur=${currentRateEncoded} target=${targetRateEncoded})` });
    }
  }

  return NextResponse.json({ checked: results.length, results, fxRates });
}
