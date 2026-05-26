import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientKey } from "../../../lib/rate-limit";
import { z } from "zod";

const pending = new Map<string, {
  hash: string;
  timestamp: number;
  type: string;
  amount: string;
  token: string;
  counterparty: string;
  contactName: string;
  note: string;
  walletAddress: string;
  localLine: string | null;
  expiresAt: number;
}>();

function cleanup() {
  const now = Date.now();
  for (const [k, v] of pending) {
    if (v.expiresAt < now) pending.delete(k);
  }
}

const bodySchema = z.object({
  hash: z.string(),
  timestamp: z.number(),
  type: z.string(),
  amount: z.string(),
  token: z.string(),
  counterparty: z.string(),
  contactName: z.string(),
  note: z.string(),
  walletAddress: z.string(),
  localLine: z.string().nullable(),
});

function shorten(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function typeLabel(type: string) {
  if (type === "received") return "RECEIVED";
  if (type === "failed") return "FAILED";
  if (type === "contract") return "CONTRACT";
  return "SENT";
}

function typeArrow(type: string) {
  return type === "received" ? "v" : "^";
}

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(getClientKey(request), 20, 60_000);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  cleanup();
  const id = crypto.randomUUID();
  pending.set(id, { ...parsed.data, expiresAt: Date.now() + 2 * 60 * 1000 });
  return NextResponse.json({ id });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const entry = pending.get(id);

  if (!entry || Date.now() > entry.expiresAt) {
    return new NextResponse("Receipt link expired — please generate again.", { status: 404 });
  }
  pending.delete(id);

  const { jsPDF } = await import("jspdf");
  const W = 80;
  const doc = new jsPDF({ unit: "mm", format: [W, 150], orientation: "portrait" });

  const dark:  [number, number, number] = [26, 21, 5];
  const green: [number, number, number] = [34, 197, 94];
  const mid:   [number, number, number] = [100, 95, 80];
  const light: [number, number, number] = [244, 241, 234];

  // Header
  doc.setFillColor(...dark);
  doc.rect(0, 0, W, 28, "F");

  doc.setFillColor(...green);
  doc.circle(W / 2, 14, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text(typeArrow(entry.type), W / 2, 16.5, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(...green);
  doc.text("AKILI", 4, 6);
  doc.setTextColor(...mid);
  doc.setFont("helvetica", "normal");
  doc.text("PAYMENT RECEIPT", W - 4, 6, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...light);
  doc.text(typeLabel(entry.type), W / 2, 26, { align: "center" });

  let y = 36;

  // Amount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...dark);
  doc.text(`${parseFloat(entry.amount).toFixed(2)}`, W / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...mid);
  doc.text(`${entry.token} · Celo Network`, W / 2, y, { align: "center" });
  y += 4;

  if (entry.localLine) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...green);
    doc.text(`≈ ${entry.localLine}`, W / 2, y, { align: "center" });
    y += 4;
  }

  y += 3;
  doc.setDrawColor(220, 215, 200);
  doc.line(6, y, W - 6, y);
  y += 6;

  // Detail rows
  const isOut = entry.type === "sent" || entry.type === "contract";
  const rows: [string, string][] = [
    [isOut ? "To"   : "From", entry.contactName !== shorten(entry.counterparty) ? entry.contactName : shorten(entry.counterparty)],
    [isOut ? "From" : "To",   "Your wallet"],
    ["Date",    new Date(entry.timestamp * 1000).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })],
    ["Network", "Celo Mainnet"],
    ...(entry.note ? [["Note", entry.note] as [string, string]] : []),
    ["Ref",     shorten(entry.hash)],
  ];

  doc.setFontSize(7.5);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mid);
    doc.text(label, 6, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    const wrapped = doc.splitTextToSize(value, 42) as string[];
    doc.text(wrapped, W - 6, y, { align: "right" });
    y += wrapped.length > 1 ? wrapped.length * 4.5 : 6;
  }

  y += 1;
  doc.setDrawColor(220, 215, 200);
  doc.line(6, y, W - 6, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...mid);
  doc.text("Verified on Celo Blockchain", W / 2, y, { align: "center" });
  y += 4;
  doc.text("Generated by Akili · Built on Celo", W / 2, y, { align: "center" });

  const bytes = doc.output("arraybuffer");
  const date = new Date(entry.timestamp * 1000).toISOString().slice(0, 10);
  const filename = `akili-receipt-${entry.hash.slice(2, 8)}-${date}.pdf`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
