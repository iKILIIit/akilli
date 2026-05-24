"use client";

import { encodeFunctionData, parseUnits } from "viem";

const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`;

export const FREE_LIMIT = 3;
export const AI_PRICE_USDC = parseUnits("0.002", 6);
export const AI_PRICE_DISPLAY = "$0.002";

const AUDITS_KEY = "akili_audits_used";
const CHAT_KEY = "akili_chat_used";
const TRAIL_KEY = "akili_trail_used";

export const TRAIL_FREE_LIMIT = 1;
export const TRAIL_PRICE_USDC = parseUnits("0.01", 6);
export const TRAIL_PRICE_DISPLAY = "$0.01";

const TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

// ── Audit counter ─────────────────────────────────────────────────────────────

export function getAuditsUsed(): number {
  try { return Number(localStorage.getItem(AUDITS_KEY) ?? "0"); } catch { return 0; }
}

export function getFreeAuditsRemaining(): number {
  return Math.max(0, FREE_LIMIT - getAuditsUsed());
}

export function recordAuditUsed(): void {
  try { localStorage.setItem(AUDITS_KEY, String(getAuditsUsed() + 1)); } catch {}
}

// ── Chat counter ──────────────────────────────────────────────────────────────

export function getChatUsed(): number {
  try { return Number(localStorage.getItem(CHAT_KEY) ?? "0"); } catch { return 0; }
}

export function getFreeChatRemaining(): number {
  return Math.max(0, FREE_LIMIT - getChatUsed());
}

export function recordChatUsed(): void {
  try { localStorage.setItem(CHAT_KEY, String(getChatUsed() + 1)); } catch {}
}

// ── Audit Trail counter ───────────────────────────────────────────────────────

export function getTrailUsed(): number {
  try { return Number(localStorage.getItem(TRAIL_KEY) ?? "0"); } catch { return 0; }
}

export function getFreeTrailRemaining(): number {
  return Math.max(0, TRAIL_FREE_LIMIT - getTrailUsed());
}

export function recordTrailUsed(): void {
  try { localStorage.setItem(TRAIL_KEY, String(getTrailUsed() + 1)); } catch {}
}

// ── Payment ───────────────────────────────────────────────────────────────────

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export async function payForAI(): Promise<string> {
  const recipient = process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT as `0x${string}` | undefined;
  if (!recipient) throw new Error("Payment recipient not configured.");

  const ethereum = (window as unknown as { ethereum?: EthProvider }).ethereum;
  if (!ethereum?.request) throw new Error("No wallet found — please open in MiniPay.");

  const accounts = await ethereum.request({ method: "eth_accounts" }) as string[];
  if (!accounts?.[0]) throw new Error("Wallet not connected.");

  const data = encodeFunctionData({
    abi: TRANSFER_ABI,
    functionName: "transfer",
    args: [recipient, AI_PRICE_USDC],
  });

  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: accounts[0],
      to: USDC_ADDRESS,
      data,
      value: "0x0",
    }],
  }) as string;

  return txHash;
}

export async function payForTrail(): Promise<string> {
  const recipient = process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT as `0x${string}` | undefined;
  if (!recipient) throw new Error("Payment recipient not configured.");

  const ethereum = (window as unknown as { ethereum?: EthProvider }).ethereum;
  if (!ethereum?.request) throw new Error("No wallet found — please open in MiniPay.");

  const accounts = await ethereum.request({ method: "eth_accounts" }) as string[];
  if (!accounts?.[0]) throw new Error("Wallet not connected.");

  const data = encodeFunctionData({
    abi: TRANSFER_ABI,
    functionName: "transfer",
    args: [recipient, TRAIL_PRICE_USDC],
  });

  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: accounts[0],
      to: USDC_ADDRESS,
      data,
      value: "0x0",
    }],
  }) as string;

  return txHash;
}
