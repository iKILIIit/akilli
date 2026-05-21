"use client";

export type RecurringPattern = {
  counterparty: string;
  avgAmount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  occurrences: number;
  nextExpected: number; // unix timestamp
};

type MinTx = {
  timestamp: number;
  type: string;
  amount: string;
  counterpartyLabel: string;
};

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function detectRecurring(transactions: MinTx[]): RecurringPattern[] {
  const outgoing = transactions.filter(t => t.type === "sent" || t.type === "contract");

  const byCounterparty = new Map<string, MinTx[]>();
  for (const tx of outgoing) {
    const key = tx.counterpartyLabel;
    const bucket = byCounterparty.get(key) ?? [];
    bucket.push(tx);
    byCounterparty.set(key, bucket);
  }

  const patterns: RecurringPattern[] = [];

  for (const [counterparty, txs] of byCounterparty) {
    if (txs.length < 3) continue;

    const sorted = [...txs].sort((a, b) => a.timestamp - b.timestamp);
    const timestamps = sorted.map(t => t.timestamp);
    const amounts = sorted.map(t => parseFloat(t.amount));

    const gaps: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      const prev = timestamps[i - 1];
      const curr = timestamps[i];
      if (prev !== undefined && curr !== undefined) {
        gaps.push((curr - prev) / 86400);
      }
    }

    if (gaps.length === 0) continue;

    const medGap = median(gaps);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;

    let frequency: RecurringPattern["frequency"] | null = null;
    if (medGap >= 5 && medGap <= 9) frequency = "weekly";
    else if (medGap >= 11 && medGap <= 18) frequency = "biweekly";
    else if (medGap >= 25 && medGap <= 35) frequency = "monthly";

    if (!frequency) continue;

    // Require consistency: stddev < 50% of median gap
    const variance = gaps.reduce((s, g) => s + Math.pow(g - medGap, 2), 0) / gaps.length;
    if (Math.sqrt(variance) > medGap * 0.5) continue;

    const lastTs = timestamps[timestamps.length - 1] ?? 0;
    patterns.push({
      counterparty,
      avgAmount,
      frequency,
      occurrences: txs.length,
      nextExpected: lastTs + medGap * 86400,
    });
  }

  return patterns.sort((a, b) => a.nextExpected - b.nextExpected);
}
