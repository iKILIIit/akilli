"use client";

export type LocalCurrency = "NGN" | "KES" | "GHS" | "ZAR" | "USD";

export const CURRENCY_META: Record<LocalCurrency, { label: string; symbol: string; flag: string }> = {
  NGN: { label: "Nigerian Naira",     symbol: "₦",   flag: "🇳🇬" },
  KES: { label: "Kenyan Shilling",    symbol: "KSh", flag: "🇰🇪" },
  GHS: { label: "Ghanaian Cedi",      symbol: "₵",   flag: "🇬🇭" },
  ZAR: { label: "South African Rand", symbol: "R",   flag: "🇿🇦" },
  USD: { label: "US Dollar",          symbol: "$",   flag: "🇺🇸" },
};

const PREF_KEY = "akili_local_currency";
const RATES_KEY = "akili_fx_rates";
const RATES_TTL = 60 * 60 * 1000; // 1 hour

export type FxRates = {
  rates: Record<string, number>;
  fetchedAt: string;
};

const FALLBACK_RATES: Record<string, number> = {
  NGN: 1620, KES: 129, GHS: 15.4, ZAR: 18.2, USD: 1,
};

/** Returns the user's preferred local currency, defaulting to USD. */
export function getPreferredCurrency(): LocalCurrency {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v && v in CURRENCY_META) return v as LocalCurrency;
  } catch { /* ignore */ }
  return "USD";
}

/** Persists the user's local currency preference to localStorage. */
export function setPreferredCurrency(currency: LocalCurrency): void {
  try { localStorage.setItem(PREF_KEY, currency); } catch { /* ignore */ }
}

function getCachedRates(): FxRates | null {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as FxRates;
    if (Date.now() - new Date(data.fetchedAt).getTime() > RATES_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedRates(data: FxRates): void {
  try { localStorage.setItem(RATES_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export async function fetchFxRates(): Promise<FxRates> {
  const cached = getCachedRates();
  if (cached) return cached;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) throw new Error("fetch failed");
    const json = await res.json() as { rates: Record<string, number> };
    const data: FxRates = { rates: json.rates, fetchedAt: new Date().toISOString() };
    setCachedRates(data);
    return data;
  } catch {
    return { rates: FALLBACK_RATES, fetchedAt: new Date().toISOString() };
  }
}

export function convertUSD(usdAmount: number, currency: LocalCurrency, rates: FxRates): number {
  if (currency === "USD") return usdAmount;
  const rate = rates.rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  return usdAmount * rate;
}

export function formatLocal(amount: number, currency: LocalCurrency): string {
  const meta = CURRENCY_META[currency];
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  if (amount >= 1_000_000) return `${meta.symbol}${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 10_000) return `${meta.symbol}${Math.round(amount).toLocaleString("en")}`;
  return `${meta.symbol}${amount.toFixed(2)}`;
}
