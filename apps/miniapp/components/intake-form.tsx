"use client";

import {
  GOAL_OPTIONS,
  TOKEN_OPTIONS,
  type Goal,
  type RiskComfort,
  type Token
} from "@yield-copilot/shared";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const riskOptions: Array<{ id: RiskComfort; label: string }> = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" }
];

type IntakeFormProps = {
  initialGoal?: Goal;
  initialToken?: Token;
  initialAmount?: string;
  initialTimeHorizonDays?: number;
  initialRiskComfort?: RiskComfort;
  walletAddress?: string | undefined;
};

export function IntakeForm({
  initialGoal = "save-safely",
  initialToken = "USDC",
  initialAmount = "2400",
  initialTimeHorizonDays = 30,
  initialRiskComfort = "low",
  walletAddress
}: IntakeFormProps) {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>(initialGoal);
  const [token, setToken] = useState<Token>(initialToken);
  const [amount, setAmount] = useState(initialAmount);
  const [timeHorizonDays, setTimeHorizonDays] = useState(initialTimeHorizonDays);
  const [riskComfort, setRiskComfort] = useState<RiskComfort>(initialRiskComfort);
  const maxAmount = initialAmount || "2400";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({
      goal,
      token,
      amount,
      timeHorizonDays: String(timeHorizonDays),
      riskComfort
    });

    if (walletAddress) {
      params.set("walletAddress", walletAddress);
    }

    router.push(`/recommendation?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="stack-lg">
      <section className="panel form-section-card">
        <div className="field-header">
          <p className="field-title">Goal</p>
          <span>Pick one</span>
        </div>
        <div className="choice-grid choice-grid--triple">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={goal === option.id ? "choice-card is-selected" : "choice-card"}
              onClick={() => setGoal(option.id)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel form-section-card">
        <div className="field-header">
          <p className="field-title">Token</p>
        </div>
        <div className="choice-grid choice-grid--triple">
          {TOKEN_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={token === option.id ? "token-card is-selected" : "token-card"}
              onClick={() => setToken(option.id)}
            >
              <span className={`token-card__dot token-card__dot--${option.id.toLowerCase()}`} aria-hidden="true" />
              <strong>{option.label}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="panel form-section-card">
        <div className="field-header">
          <p className="field-title">Amount</p>
        </div>
        <label className="amount-field">
          <div className="amount-field__value">
            <input
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <span>{token}</span>
          </div>
          <small>Approx. ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
        </label>
        <div className="quick-chip-row">
          {["500", "1000", "2500"].map((preset) => (
            <button
              key={preset}
              type="button"
              className="quick-chip"
              onClick={() => setAmount(preset)}
            >
              ${Number(preset).toLocaleString("en-US")}
            </button>
          ))}
          <button type="button" className="quick-chip" onClick={() => setAmount(maxAmount)}>
            Max
          </button>
        </div>
      </section>

      <section className="panel form-section-card">
        <div className="field-header">
          <p className="field-title">Days</p>
        </div>
        <div className="choice-grid choice-grid--quad">
          {[7, 30, 90, 180].map((days) => (
            <button
              key={days}
              type="button"
              className={timeHorizonDays === days ? "day-chip is-selected" : "day-chip"}
              onClick={() => setTimeHorizonDays(days)}
            >
              {days}d
            </button>
          ))}
        </div>
        <div className="form-divider" />
        <div className="field-header">
          <p className="field-title">Risk</p>
        </div>
        <div className="choice-grid choice-grid--double">
          {riskOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={riskComfort === option.id ? "choice-card choice-card--risk is-selected" : "choice-card choice-card--risk"}
              onClick={() => setRiskComfort(option.id)}
            >
              <strong>{option.label}</strong>
              <span>{option.id === "low" ? "T-bills, blue-chip routes" : "Vetted protocols"}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="stack-sm">
        <button type="submit" className="primary-action">
          Get recommendation
        </button>
        <p className="form-footnote">Fresh rates. Updated 2 min ago.</p>
      </div>
    </form>
  );
}
