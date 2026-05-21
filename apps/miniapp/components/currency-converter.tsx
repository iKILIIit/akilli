"use client";

import { useEffect, useState } from "react";
import {
  type FxRates,
  type LocalCurrency,
  CURRENCY_META,
  convertUSD,
  fetchFxRates,
} from "../lib/currency";

const DISPLAY: LocalCurrency[] = ["NGN", "KES", "GHS", "ZAR"];

export function CurrencyConverter() {
  const [amount, setAmount] = useState("");
  const [rates, setRates] = useState<FxRates | null>(null);

  useEffect(() => {
    void fetchFxRates().then(setRates);
  }, []);

  const usd = parseFloat(amount) || 0;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "16px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-55)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>
        🔄 Currency Converter
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-soft)", borderRadius: "12px", padding: "10px 14px", border: "1px solid var(--line)", marginBottom: "12px" }}>
        <span style={{ color: "var(--ink-55)", fontWeight: 600 }}>$</span>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Enter USD amount"
          min="0"
          step="0.01"
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: "18px", fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)"
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--ink-40)", flexShrink: 0 }}>USD</span>
      </div>

      {usd > 0 && rates && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {DISPLAY.map(cur => {
            const meta = CURRENCY_META[cur];
            const converted = convertUSD(usd, cur, rates);
            const formatted = converted >= 10_000
              ? `${meta.symbol}${Math.round(converted).toLocaleString("en")}`
              : `${meta.symbol}${converted.toFixed(2)}`;
            return (
              <div key={cur} style={{ background: "var(--bg-soft)", borderRadius: "12px", padding: "10px 12px", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "10px", color: "var(--ink-40)", marginBottom: "3px" }}>
                  {meta.flag} {meta.label}
                </div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                  {formatted}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {usd > 0 && !rates && (
        <div style={{ textAlign: "center", fontSize: "12px", color: "var(--ink-40)", padding: "8px" }}>
          Loading rates…
        </div>
      )}

      {!rates && usd === 0 && (
        <div style={{ fontSize: "11px", color: "var(--ink-40)", textAlign: "center" }}>
          Type an amount to see local currency equivalents
        </div>
      )}
    </div>
  );
}
