import { getGDStatus, fetchUBIClaimHistory, getGDProtocolStats } from "@yield-copilot/celo";
import { generateWalletReport } from "@yield-copilot/agents";
import type { WalletSummary } from "@yield-copilot/agents";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Prevents unbounded LLM cost from unauthenticated callers.

const _rlMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = _rlMap.get(ip);
  if (!entry || now > entry.resetAt) {
    _rlMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

// ── Prompt-injection sanitizer ────────────────────────────────────────────────
// walletSummary arrives from the caller as raw JSON. Sanitize every string field
// to a safe max length and strip characters that are commonly used in injection
// payloads (\n sequences that break out of the data block into the prompt).

const MAX_LABEL_LEN   = 80;
const MAX_ADDR_LEN    = 42; // Ethereum address length
const MAX_AMOUNT_LEN  = 20;
const MAX_TOKEN_LEN   = 10;

function sanitizeStr(s: unknown, maxLen: number): string {
  if (typeof s !== "string") return "";
  return s.replace(/[\r\n\t]/g, " ").slice(0, maxLen);
}

function sanitizeWalletSummary(raw: unknown): WalletSummary {
  if (!raw || typeof raw !== "object") throw new Error("walletSummary must be an object.");
  const w = raw as Record<string, unknown>;

  const address = sanitizeStr(w.address, MAX_ADDR_LEN);
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("walletSummary.address is invalid.");

  const transactions = Array.isArray(w.transactions)
    ? (w.transactions as unknown[]).slice(0, 200).map(tx => {
        const t = (tx ?? {}) as Record<string, unknown>;
        return {
          hash:              sanitizeStr(t.hash,             66),
          timestamp:         typeof t.timestamp === "number" ? t.timestamp : 0,
          date:              sanitizeStr(t.date,             10),
          type:              (["received","sent","contract","failed"] as const)
                               .includes(t.type as never) ? t.type as "received"|"sent"|"contract"|"failed" : "failed",
          category:          (["transfer","defi","fee","unknown"] as const)
                               .includes(t.category as never) ? t.category as "transfer"|"defi"|"fee"|"unknown" : "unknown",
          amount:            sanitizeStr(t.amount,           MAX_AMOUNT_LEN),
          token:             sanitizeStr(t.token,            MAX_TOKEN_LEN),
          counterparty:      sanitizeStr(t.counterparty,     MAX_ADDR_LEN),
          counterpartyLabel: sanitizeStr(t.counterpartyLabel, MAX_LABEL_LEN),
          gasFeeUSD:         sanitizeStr(t.gasFeeUSD,        MAX_AMOUNT_LEN),
        };
      })
    : [];

  const totalReceived = typeof w.totalReceived === "object" && w.totalReceived
    ? Object.fromEntries(
        Object.entries(w.totalReceived as Record<string, unknown>)
          .filter(([k]) => k.length <= MAX_TOKEN_LEN)
          .map(([k, v]) => [sanitizeStr(k, MAX_TOKEN_LEN), typeof v === "number" ? v : 0])
      )
    : {};

  const totalSent = typeof w.totalSent === "object" && w.totalSent
    ? Object.fromEntries(
        Object.entries(w.totalSent as Record<string, unknown>)
          .filter(([k]) => k.length <= MAX_TOKEN_LEN)
          .map(([k, v]) => [sanitizeStr(k, MAX_TOKEN_LEN), typeof v === "number" ? v : 0])
      )
    : {};

  return {
    address,
    transactions: transactions as WalletSummary["transactions"],
    totalReceived,
    totalSent,
    totalGasFeesUSD: typeof w.totalGasFeesUSD === "number" ? w.totalGasFeesUSD : 0,
    uniqueContracts: Array.isArray(w.uniqueContracts)
      ? (w.uniqueContracts as unknown[]).slice(0, 50).map(a => sanitizeStr(a, MAX_ADDR_LEN))
      : [],
    unknownContracts: Array.isArray(w.unknownContracts)
      ? (w.unknownContracts as unknown[]).slice(0, 50).map(a => sanitizeStr(a, MAX_ADDR_LEN))
      : [],
    periodDays: typeof w.periodDays === "number" ? Math.min(365, Math.max(1, w.periodDays)) : 90,
    fetchedAt: sanitizeStr(w.fetchedAt, 30),
  };
}

// GET /gd/status/:address
export async function handleGDStatus(address: string) {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("Invalid wallet address.");
  }
  return getGDStatus(address);
}

// GET /gd/claims/:address?days=90
export async function handleGDClaims(address: string, query: Record<string, string>) {
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new Error("Invalid wallet address.");
  }
  const days = Math.min(365, Math.max(1, parseInt(query.days ?? "90", 10) || 90));
  const claims = await fetchUBIClaimHistory(address, days);

  const totalRaw   = claims.reduce((sum, c) => sum + c.amountRaw, 0n);
  const GD_DIVISOR = 10n ** 18n;
  const whole      = totalRaw / GD_DIVISOR;
  const remainder  = totalRaw % GD_DIVISOR;
  const totalFormatted = (Number(whole) + Number(remainder) / Number(GD_DIVISOR)).toFixed(2);

  // Streak: count consecutive days from most-recent claim backward using real dates.
  // GoodDollar distributes UBI once per day keyed by UTC date, so UTC dates are correct.
  const claimDates = new Set(claims.map(c => c.date).filter(Boolean));
  let streak = 0;
  // Use UTC midnight to avoid timezone drift
  const todayUTC = new Date().toISOString().slice(0, 10);
  const todayMs = new Date(todayUTC).getTime();
  for (let i = 0; i < 365; i++) {
    const key = new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10);
    if (claimDates.has(key)) {
      streak++;
    } else if (i > 0) {
      break; // gap found — streak ends
    }
  }

  // Missed days: unique days in the period with no claim
  const missedDays = days - claimDates.size;

  return {
    address,
    periodDays: days,
    claimCount: claims.length,
    totalGDClaimed: totalFormatted,
    currentStreak: streak,
    missedDays: Math.max(0, missedDays),
    claims,
    fetchedAt: new Date().toISOString()
  };
}

// GET /gd/protocol
export async function handleGDProtocol() {
  return getGDProtocolStats();
}

// POST /gd/report  { walletSummary, reportType: "gd-ubi-history" | "gd-ubi-optimize" }
export async function handleGDReport(body: unknown, ip: string) {
  if (!checkRateLimit(ip)) {
    throw new Error("Rate limit exceeded. Try again in a minute.");
  }

  const b = body as { walletSummary?: unknown; reportType?: string };

  if (!b.walletSummary) throw new Error("walletSummary is required.");
  if (b.reportType !== "gd-ubi-history" && b.reportType !== "gd-ubi-optimize") {
    throw new Error("reportType must be gd-ubi-history or gd-ubi-optimize.");
  }

  const safe = sanitizeWalletSummary(b.walletSummary);
  return generateWalletReport(safe, b.reportType);
}
