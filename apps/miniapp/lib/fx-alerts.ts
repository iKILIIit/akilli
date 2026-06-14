"use client";

import type { LocalCurrency } from "./currency";

export type FxAlertDirection = "above" | "below";

export type FxAlert = {
  id: string;
  currency: LocalCurrency;
  targetRate: number;
  direction: FxAlertDirection;
  enabled: boolean;
  createdAt: string;
};

const KEY = "akili_fx_alerts_v1";

/** Returns all stored FX rate alerts from localStorage. */
export function getFxAlerts(): FxAlert[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as FxAlert[]; }
  catch { return []; }
}

function save(alerts: FxAlert[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(alerts)); } catch { /* ignore */ }
}

/** Creates a new FX rate alert, persists it, and returns the saved record. */
export function addFxAlert(data: Omit<FxAlert, "id" | "createdAt">): FxAlert {
  const alert: FxAlert = { ...data, id: `${Date.now()}`, createdAt: new Date().toISOString() };
  save([...getFxAlerts(), alert]);
  return alert;
}

/** Deletes an FX alert by id. */
export function removeFxAlert(id: string): void {
  save(getFxAlerts().filter(a => a.id !== id));
}

export function toggleFxAlert(id: string): void {
  save(getFxAlerts().map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
}

export function checkTriggeredFxAlerts(rates: Record<string, number>): FxAlert[] {
  return getFxAlerts().filter(a => {
    if (!a.enabled) return false;
    const rate = rates[a.currency];
    if (!rate) return false;
    return a.direction === "above" ? rate >= a.targetRate : rate <= a.targetRate;
  });
}
