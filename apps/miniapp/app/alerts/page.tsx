"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "../../components/bottom-nav";
import {
  type AlertPeriod,
  type AlertRule,
  type RuleType,
  PERIOD_LABELS,
  addRule,
  getRules,
  removeRule,
  toggleRule,
} from "../../lib/budget-store";

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11 4L6 9l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const RULE_TYPE_OPTIONS: { value: RuleType; label: string; emoji: string; desc: string }[] = [
  { value: "spending_cap",  label: "Spending Cap",  emoji: "🚨", desc: "Alert me when I spend over a limit" },
  { value: "savings_goal",  label: "Savings Goal",  emoji: "🎯", desc: "Alert me when my balance reaches a target" },
  { value: "yield_goal",    label: "Yield Goal",    emoji: "🌱", desc: "Alert me when my earned interest hits a goal" },
];

const PERIODS: AlertPeriod[] = ["daily", "weekly", "monthly", "quarterly"];

function ruleDescription(rule: AlertRule): string {
  if (rule.type === "spending_cap" && rule.period) {
    return `${PERIOD_LABELS[rule.period]} spending exceeds $${rule.amount}`;
  }
  if (rule.type === "savings_goal") return `Balance reaches $${rule.amount}`;
  if (rule.type === "yield_goal") return `Interest earned reaches $${rule.amount}`;
  return rule.label;
}

function ruleEmoji(type: RuleType): string {
  return RULE_TYPE_OPTIONS.find(o => o.value === type)?.emoji ?? "🔔";
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<RuleType>("spending_cap");
  const [formPeriod, setFormPeriod] = useState<AlertPeriod>("monthly");
  const [formAmount, setFormAmount] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRules(getRules());
  }, []);

  function refresh() {
    setRules(getRules());
  }

  function handleToggle(id: string) {
    toggleRule(id);
    refresh();
  }

  function handleRemove(id: string) {
    removeRule(id);
    refresh();
  }

  function handleAdd() {
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) return;

    const label =
      formType === "spending_cap" ? "Spending" :
      formType === "savings_goal" ? "Savings balance" : "Yield earned";

    addRule({
      type: formType,
      period: formType === "spending_cap" ? formPeriod : undefined,
      amount,
      label,
      enabled: true,
    });
    refresh();
    setFormAmount("");
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="page-shell">
      <div className="dashboard">
        {/* Header */}
        <div style={{
          padding: "calc(14px + env(safe-area-inset-top)) 16px 12px",
          background: "rgba(244, 241, 234, 0.92)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 20,
          borderBottom: "1px solid var(--line)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link href="/" className="dashboard-topbar__icon" aria-label="Back">
              <BackIcon />
            </Link>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--ink)", fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>Spending Alerts</div>
              <div style={{ color: "var(--ink-55)", fontSize: "11px" }}>You'll see a pop-up when rules trigger</div>
            </div>
            {saved && <span style={{ fontSize: "11px", color: "var(--green-ink)", fontWeight: 600 }}>Saved ✓</span>}
          </div>
        </div>

        <div style={{ padding: "16px", paddingBottom: "100px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* How it works */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "18px", padding: "14px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "22px", flexShrink: 0 }}>💡</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "2px" }}>How alerts work</div>
              <div style={{ fontSize: "12px", color: "var(--ink-55)", lineHeight: "1.5" }}>
                When you open Akili and a rule is triggered, you'll see a pop-up with a funny message. Dismissed once per day.
              </div>
            </div>
          </div>

          {/* Existing rules */}
          {rules.length > 0 && (
            <div>
              <div className="dashboard-section-head" style={{ marginBottom: "10px" }}>
                <p className="section-label">Your rules</p>
                <span style={{ fontSize: "11px", color: "var(--ink-55)" }}>{rules.filter(r => r.enabled).length} active</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {rules.map(rule => (
                  <div key={rule.id} style={{
                    background: "var(--surface)",
                    border: `1px solid ${rule.enabled ? "var(--line)" : "var(--line)"}`,
                    borderRadius: "16px",
                    padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: "10px",
                    opacity: rule.enabled ? 1 : 0.55
                  }}>
                    <span style={{ fontSize: "20px", flexShrink: 0 }}>{ruleEmoji(rule.type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>{ruleDescription(rule)}</div>
                      <div style={{ fontSize: "11px", color: "var(--ink-40)" }}>
                        {rule.enabled ? "Active — checking on open" : "Disabled"}
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(rule.id)}
                      style={{
                        width: "36px", height: "20px", borderRadius: "10px", border: "none", cursor: "pointer",
                        background: rule.enabled ? "var(--green)" : "var(--line-strong)",
                        position: "relative", flexShrink: 0, transition: "background 0.2s"
                      }}
                      aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                    >
                      <span style={{
                        position: "absolute", top: "3px",
                        left: rule.enabled ? "19px" : "3px",
                        width: "14px", height: "14px", borderRadius: "50%",
                        background: "white", transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                      }} />
                    </button>
                    {confirmDelete === rule.id ? (
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button type="button" onClick={() => { handleRemove(rule.id); setConfirmDelete(null); }} style={{ padding: "4px 8px", borderRadius: "8px", background: "var(--coral)", color: "#fff", border: "none", fontSize: "10px", fontWeight: 600, cursor: "pointer" }}>Delete</button>
                        <button type="button" onClick={() => setConfirmDelete(null)} style={{ padding: "4px 8px", borderRadius: "8px", background: "transparent", border: "1px solid var(--line)", fontSize: "10px", cursor: "pointer", color: "var(--ink-55)" }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(rule.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-40)", padding: "4px", flexShrink: 0 }}
                        aria-label="Delete rule"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick presets */}
          {!showForm && (
            <div>
              <div style={{ fontSize: "11px", color: "var(--ink-55)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick presets</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {[
                  { label: "$50/week cap", type: "spending_cap" as const, period: "weekly" as const, amount: 50 },
                  { label: "$200/month cap", type: "spending_cap" as const, period: "monthly" as const, amount: 200 },
                  { label: "$500 savings goal", type: "savings_goal" as const, period: undefined, amount: 500 },
                  { label: "$10 yield goal", type: "yield_goal" as const, period: undefined, amount: 10 },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      addRule({ type: preset.type, period: preset.period, amount: preset.amount, label: preset.label, enabled: true });
                      refresh();
                      setSaved(true);
                      setTimeout(() => setSaved(false), 2000);
                    }}
                    style={{
                      padding: "6px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 500, cursor: "pointer",
                      background: "var(--bg-soft)", border: "1px solid var(--line)", color: "var(--ink-70)"
                    }}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add rule */}
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              style={{
                padding: "14px", borderRadius: "16px",
                border: "1.5px dashed var(--line-strong)",
                background: "transparent", color: "var(--ink-70)",
                fontSize: "14px", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}
            >
              <span>+</span> Add a rule
            </button>
          ) : (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "20px", padding: "18px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginBottom: "14px" }}>New alert rule</div>

              {/* Rule type */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", color: "var(--ink-55)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Alert type</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {RULE_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormType(opt.value)}
                      style={{
                        padding: "10px 12px", borderRadius: "12px", cursor: "pointer",
                        border: `1.5px solid ${formType === opt.value ? "var(--ink)" : "var(--line)"}`,
                        background: formType === opt.value ? "var(--ink)" : "transparent",
                        color: formType === opt.value ? "#fffdf7" : "var(--ink-70)",
                        textAlign: "left", display: "flex", gap: "8px", alignItems: "center"
                      }}
                    >
                      <span>{opt.emoji}</span>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{opt.label}</div>
                        <div style={{ fontSize: "11px", opacity: 0.7 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Period (only for spending_cap) */}
              {formType === "spending_cap" && (
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", color: "var(--ink-55)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Period</div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {PERIODS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormPeriod(p)}
                        style={{
                          padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                          border: `1.5px solid ${formPeriod === p ? "var(--ink)" : "var(--line)"}`,
                          background: formPeriod === p ? "var(--ink)" : "transparent",
                          color: formPeriod === p ? "#fffdf7" : "var(--ink-70)"
                        }}
                      >
                        {PERIOD_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: "var(--ink-55)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {formType === "spending_cap" ? "Spending limit (USD)" : "Target amount (USD)"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--bg-soft)", borderRadius: "12px", padding: "10px 14px", border: "1px solid var(--line)" }}>
                  <span style={{ color: "var(--ink-55)", fontWeight: 600 }}>$</span>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "16px", fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono)" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormAmount(""); }}
                  style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid var(--line)", background: "transparent", color: "var(--ink-70)", fontSize: "13px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!formAmount || parseFloat(formAmount) <= 0}
                  style={{
                    flex: 2, padding: "12px", borderRadius: "12px", border: "none",
                    background: "var(--ink)", color: "#fffdf7",
                    fontSize: "13px", fontWeight: 600, cursor: "pointer",
                    opacity: !formAmount || parseFloat(formAmount) <= 0 ? 0.4 : 1
                  }}
                >
                  Add Rule
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {rules.length === 0 && !showForm && (
            <div style={{ textAlign: "center", padding: "20px 20px 0", color: "var(--ink-55)", fontSize: "13px" }}>
              No rules yet. Add one above to get spending alerts.
            </div>
          )}

          <Link href="/budget" style={{ textAlign: "center", fontSize: "12px", color: "var(--ink-55)", textDecoration: "none", padding: "4px" }}>
            ← Back to Spend Sheet
          </Link>
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
