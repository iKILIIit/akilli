import { NextRequest, NextResponse } from "next/server";
import { fetchWalletData, type ParsedTransaction } from "../../../lib/celo-transactions";
import { rateLimit, getClientKey } from "../../../lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Celo address"),
  days: z.number().int().positive().max(180).optional().default(90),
});

export type TrailNode = {
  address: string;
  label: string;
  totalIn: number;
  totalOut: number;
  txCount: number;
  tokens: string[];
};

export type TrailEdge = {
  counterparty: string;
  direction: "in" | "out";
  amount: number;
  token: string;
  count: number;
  lastDate: string;
};

export type TrailGraph = {
  center: { address: string; totalIn: number; totalOut: number; txCount: number };
  topSenders: TrailNode[];
  topReceivers: TrailNode[];
  edges: TrailEdge[];
};

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function buildGraph(txs: ParsedTransaction[], address: string): TrailGraph {
  const wallet = address.toLowerCase();

  // Aggregate by counterparty + direction
  const senderMap = new Map<string, { total: number; count: number; tokens: Set<string>; lastDate: string; label: string }>();
  const receiverMap = new Map<string, { total: number; count: number; tokens: Set<string>; lastDate: string; label: string }>();

  let totalIn = 0;
  let totalOut = 0;

  for (const tx of txs) {
    if (tx.type === "failed") continue;
    const amount = parseFloat(tx.amount) || 0;
    const cp = tx.counterparty.toLowerCase();
    if (!cp || cp === wallet) continue;

    if (tx.type === "received") {
      totalIn += amount;
      const entry = senderMap.get(cp) ?? { total: 0, count: 0, tokens: new Set(), lastDate: tx.date, label: tx.counterpartyLabel };
      entry.total += amount;
      entry.count++;
      entry.tokens.add(tx.token);
      if (tx.date > entry.lastDate) entry.lastDate = tx.date;
      senderMap.set(cp, entry);
    } else {
      totalOut += amount;
      const entry = receiverMap.get(cp) ?? { total: 0, count: 0, tokens: new Set(), lastDate: tx.date, label: tx.counterpartyLabel };
      entry.total += amount;
      entry.count++;
      entry.tokens.add(tx.token);
      if (tx.date > entry.lastDate) entry.lastDate = tx.date;
      receiverMap.set(cp, entry);
    }
  }

  const toNodes = (map: Map<string, { total: number; count: number; tokens: Set<string>; lastDate: string; label: string }>, dir: "in" | "out"): TrailNode[] =>
    [...map.entries()]
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 8)
      .map(([addr, d]) => ({
        address: addr,
        label: d.label === shorten(addr) ? shorten(addr) : d.label,
        totalIn: dir === "in" ? d.total : 0,
        totalOut: dir === "out" ? d.total : 0,
        txCount: d.count,
        tokens: [...d.tokens],
      }));

  const topSenders = toNodes(senderMap, "in");
  const topReceivers = toNodes(receiverMap, "out");

  const edges: TrailEdge[] = [
    ...topSenders.map(n => ({ counterparty: n.address, direction: "in" as const, amount: n.totalIn, token: n.tokens[0] ?? "USDC", count: n.txCount, lastDate: senderMap.get(n.address)?.lastDate ?? "" })),
    ...topReceivers.map(n => ({ counterparty: n.address, direction: "out" as const, amount: n.totalOut, token: n.tokens[0] ?? "USDC", count: n.txCount, lastDate: receiverMap.get(n.address)?.lastDate ?? "" })),
  ];

  return {
    center: { address, totalIn, totalOut, txCount: txs.filter(t => t.type !== "failed").length },
    topSenders,
    topReceivers,
    edges,
  };
}

async function generateNarrative(wallet: Awaited<ReturnType<typeof fetchWalletData>>, graph: TrailGraph): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return "AI narrative unavailable.";

  const topSendersText = graph.topSenders.slice(0, 5).map(n => `${n.label} (sent $${n.totalIn.toFixed(2)}, ${n.txCount} tx)`).join(", ");
  const topReceiversText = graph.topReceivers.slice(0, 5).map(n => `${n.label} (received $${n.totalOut.toFixed(2)}, ${n.txCount} tx)`).join(", ");

  const prompt = `You are a blockchain forensics analyst. Audit this Celo wallet and write a clear 3-paragraph investigation summary.

Wallet: ${wallet.address}
Period: last ${wallet.periodDays} days
Total received: $${graph.center.totalIn.toFixed(2)} | Total sent: $${graph.center.totalOut.toFixed(2)}
Transaction count: ${graph.center.txCount}

Top money sources (sent TO this wallet): ${topSendersText || "none"}
Top money destinations (received FROM this wallet): ${topReceiversText || "none"}

Tokens: ${Object.keys(wallet.totalReceived).join(", ")}

Write a factual forensic summary covering: (1) overall activity pattern, (2) notable inflow sources, (3) notable outflow destinations and any risk observations. Be concise and specific. Do not invent data.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    }),
  });

  if (!res.ok) return "AI narrative unavailable.";
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "AI narrative unavailable.";
}

export async function POST(request: NextRequest) {
  const { allowed, resetAt } = rateLimit(getClientKey(request), 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429, headers: { "X-RateLimit-Reset": String(resetAt) } });
  }

  try {
    const body = await request.json();
    const { walletAddress, days } = schema.parse(body);

    const wallet = await fetchWalletData(walletAddress, days);
    const graph = buildGraph(wallet.transactions, walletAddress);
    const narrative = await generateNarrative(wallet, graph);

    return NextResponse.json({ walletAddress, graph, narrative, periodDays: days, fetchedAt: new Date().toISOString() });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to audit wallet. Try again." }, { status: 500 });
  }
}
