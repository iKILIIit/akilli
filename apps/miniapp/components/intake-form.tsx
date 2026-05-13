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
  { id: "low", label: "Low risk comfort" },
  { id: "medium", label: "Medium risk comfort" }
];

export function IntakeForm() {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>("save-safely");
  const [token, setToken] = useState<Token>("USDC");
  const [amount, setAmount] = useState("150");
  const [timeHorizonDays, setTimeHorizonDays] = useState(30);
  const [riskComfort, setRiskComfort] = useState<RiskComfort>("low");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams({
      goal,
      token,
      amount,
      timeHorizonDays: String(timeHorizonDays),
      riskComfort
    });

    router.push(`/recommendation?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="panel stack-lg">
      <div className="form-section stack-sm">
        <p className="section-label">Choose a goal</p>
        <div className="chip-grid">
          {GOAL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={goal === option.id ? "chip is-selected" : "chip"}
              onClick={() => setGoal(option.id)}
            >
              <span>{option.label}</span>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="form-section stack-sm">
        <p className="section-label">Set your amount</p>
        <label className="field">
          <span>Token</span>
          <select
            name="token"
            value={token}
            onChange={(event) => setToken(event.target.value as Token)}
          >
            {TOKEN_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field-grid split">
          <label className="field">
            <span>Amount</span>
            <input
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Days</span>
            <input
              name="timeHorizonDays"
              inputMode="numeric"
              value={timeHorizonDays}
              onChange={(event) => setTimeHorizonDays(Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="form-section stack-sm">
        <p className="section-label">Risk comfort</p>
        <div className="chip-row">
          {riskOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={riskComfort === option.id ? "chip slim is-selected" : "chip slim"}
              onClick={() => setRiskComfort(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <div className="quick-note">
          <strong>What happens next</strong>
          <p>You’ll get one recommendation, one backup option, and a plain-language risk summary.</p>
        </div>
        <button type="submit" className="primary-action">
          Get recommendation
        </button>
      </div>
    </form>
  );
}
