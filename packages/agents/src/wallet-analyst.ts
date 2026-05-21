import Anthropic from "@anthropic-ai/sdk";

// Local type mirror of packages/miniapp/lib/celo-transactions to avoid cross-package FS imports
export type ParsedTransaction = {
  hash: string;
  timestamp: number;
  date: string;
  type: "received" | "sent" | "contract" | "failed";
  category: "transfer" | "defi" | "fee" | "unknown";
  amount: string;
  token: string;
  counterparty: string;
  counterpartyLabel: string;
  gasFeeUSD: string;
};

export type WalletSummary = {
  address: string;
  transactions: ParsedTransaction[];
  totalReceived: Record<string, number>;
  totalSent: Record<string, number>;
  totalGasFeesUSD: number;
  uniqueContracts: string[];
  unknownContracts: string[];
  periodDays: number;
  fetchedAt: string;
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-opus-4-7";

export type ReportType =
  | "spending-advice"
  | "account-summary"
  | "wallet-audit"
  | "wallet-statement"
  | "monthly-plan"
  | "financial-health";

export type WalletAnalysis = {
  reportType: ReportType;
  narrative: string;
  keyFindings: string[];
  healthScore?: number | undefined;
  healthLabel?: string | undefined;
  generatedAt: string;
};

export type SpendingCategory = {
  label: string;
  token: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
};

export type SpendingBreakdown = {
  categories: SpendingCategory[];
  topCounterparties: { label: string; amount: number; token: string; count: number }[];
  byToken: { token: string; received: number; sent: number }[];
  dailyAvgSpend: number;
  mostActiveDay: string;
  periodDays: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function computeSpendingBreakdown(wallet: WalletSummary): SpendingBreakdown {
  let received = 0;
  let sentToPersons = 0;
  let defi = 0;
  let fees = wallet.totalGasFeesUSD;
  let unknown = 0;

  const counterpartyMap = new Map<string, { amount: number; token: string; count: number }>();
  const dayMap = new Map<string, number>();
  const tokenReceived = new Map<string, number>();
  const tokenSent = new Map<string, number>();

  for (const tx of wallet.transactions) {
    const amt = parseFloat(tx.amount);
    if (isNaN(amt)) continue;

    if (tx.type === "received") {
      received += amt;
      tokenReceived.set(tx.token, (tokenReceived.get(tx.token) ?? 0) + amt);
    } else if (tx.type === "sent") {
      sentToPersons += amt;
      tokenSent.set(tx.token, (tokenSent.get(tx.token) ?? 0) + amt);
      const day = tx.date;
      dayMap.set(day, (dayMap.get(day) ?? 0) + amt);
    } else if (tx.category === "defi") {
      defi += amt;
      tokenSent.set(tx.token, (tokenSent.get(tx.token) ?? 0) + amt);
    } else if (tx.type !== "failed") {
      unknown += amt;
    }

    if (tx.type !== "received" && tx.counterparty) {
      const key = tx.counterpartyLabel;
      const existing = counterpartyMap.get(key);
      if (existing) {
        existing.amount += amt;
        existing.count += 1;
      } else {
        counterpartyMap.set(key, { amount: amt, token: tx.token, count: 1 });
      }
    }
  }

  const total = received + sentToPersons + defi + fees + unknown || 1;

  const rawCategories = [
    { label: "Money Received", amount: received, color: "#3DD68C" },
    { label: "Sent to Contacts", amount: sentToPersons, color: "#FCFF52" },
    { label: "DeFi Activity", amount: defi, color: "#60A5FA" },
    { label: "Network Fees", amount: fees, color: "#F97316" },
    { label: "Other", amount: unknown, color: "#888" }
  ].filter(c => c.amount > 0);

  const categories: SpendingCategory[] = rawCategories.map(c => ({
    ...c,
    token: "USD",
    count: wallet.transactions.filter((tx: ParsedTransaction) =>
      c.label === "Money Received" ? tx.type === "received" :
      c.label === "Sent to Contacts" ? tx.type === "sent" :
      c.label === "DeFi Activity" ? tx.category === "defi" : false
    ).length,
    percentage: Math.round((c.amount / total) * 100)
  }));

  const topCounterparties = [...counterpartyMap.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const allTokens = new Set([...tokenReceived.keys(), ...tokenSent.keys()]);
  const byToken = [...allTokens].map(token => ({
    token,
    received: tokenReceived.get(token) ?? 0,
    sent: tokenSent.get(token) ?? 0
  }));

  const spendDays: [string, number][] = [...dayMap.entries()];
  const dailyAvgSpend = spendDays.length > 0
    ? spendDays.reduce((s, [, v]) => s + v, 0) / wallet.periodDays
    : 0;

  const mostActiveDay = spendDays.sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  return {
    categories,
    topCounterparties,
    byToken,
    dailyAvgSpend,
    mostActiveDay,
    periodDays: wallet.periodDays
  };
}

function buildWalletContext(wallet: WalletSummary, linkupContext?: string): string {
  const recentTxs = wallet.transactions.slice(0, 40);

  const txLines = recentTxs.map(tx =>
    `[${tx.date}] ${tx.type.toUpperCase()} ${tx.amount} ${tx.token} ${tx.type === "received" ? "from" : "to"} ${tx.counterpartyLabel} (${tx.category})`
  ).join("\n");

  const receivedLines = Object.entries(wallet.totalReceived)
    .map(([token, amt]) => `  ${token}: ${amt.toFixed(2)}`).join("\n");

  const sentLines = Object.entries(wallet.totalSent)
    .map(([token, amt]) => `  ${token}: ${amt.toFixed(2)}`).join("\n");

  return `
WALLET: ${wallet.address}
PERIOD: Last ${wallet.periodDays} days (as of ${wallet.fetchedAt})

TOTALS RECEIVED:
${receivedLines || "  None"}

TOTALS SENT:
${sentLines || "  None"}

TOTAL NETWORK FEES PAID: $${wallet.totalGasFeesUSD.toFixed(4)} USD equivalent
UNIQUE CONTRACTS INTERACTED: ${wallet.uniqueContracts.length}
UNKNOWN CONTRACTS: ${wallet.unknownContracts.length > 0 ? wallet.unknownContracts.join(", ") : "None"}

RECENT TRANSACTIONS (last 40):
${txLines || "No transactions found"}

${linkupContext ? `\nEXTERNAL RESEARCH (via Linkup):\n${linkupContext}` : ""}
`.trim();
}

const SYSTEM_BASE = `You are Akili, an AI financial intelligence assistant for MiniPay users in Africa (Nigeria, Kenya, Ghana).
You analyze Celo blockchain wallet data and give clear, honest, actionable financial insights.
Write in plain English. Be direct, warm, and specific. Never use jargon.
Users hold USDC and USDT on Celo. Amounts are stablecoins pegged to USD.
Always be encouraging but honest about spending patterns.`;

const PROMPTS: Record<ReportType, (wallet: WalletSummary) => string> = {
  "spending-advice": (w) =>
    `Analyze this wallet's spending over the last ${w.periodDays} days and give 3-5 specific, actionable spending tips. Mention actual amounts. Focus on waste and savings opportunities.`,

  "account-summary": (w) =>
    `Write a clear account summary for the last ${w.periodDays} days. Cover: total in vs out, key spending categories, net position, 2-3 notable observations. Format like a friendly bank statement summary.`,

  "wallet-audit": (_w) =>
    `Audit this wallet's financial health. Assess: (1) spending discipline, (2) fee efficiency, (3) risky or unknown contract interactions, (4) overall health. Give a health score 0-100 (higher = healthier) labeled clearly as "Health Score: X/100". Explain each dimension. Flag anything suspicious.`,

  "wallet-statement": (w) =>
    `Generate a formal wallet statement for the last ${w.periodDays} days. List transactions with dates, amounts, types, counterparties. End with totals summary. Format cleanly — may be used as proof of financial activity.`,

  "monthly-plan": (w) =>
    `Based on this wallet's ${w.periodDays}-day history, create a realistic personalized monthly financial plan. Include:
1. Estimated monthly income (extrapolate from received amounts)
2. Recommended monthly budget with specific allocations (savings, transfers, DeFi, buffer)
3. A savings target with a reason
4. 3 concrete actions to take this month
Make it specific to their actual numbers, not generic advice.`,

  "financial-health": (_w) =>
    `Give a comprehensive financial health assessment for this wallet. Score each dimension out of 100:
- Savings Rate (how much of income is kept vs spent)
- Spending Discipline (consistency and control)
- Fee Efficiency (network fees relative to activity)
- Activity Health (regularity and diversity)
- Overall Health Score

Format each as "Dimension: X/100 — one line explanation".
Then give an overall narrative of 2-3 sentences with the top 2 improvements they can make.
Label the overall score clearly as "Overall Health Score: X/100".`
};

export async function generateWalletReport(
  wallet: WalletSummary,
  reportType: ReportType,
  linkupContext?: string
): Promise<WalletAnalysis> {
  const walletContext = buildWalletContext(wallet, linkupContext);
  const prompt = PROMPTS[reportType](wallet);
  const userPrompt = `${prompt}\n\nWALLET DATA:\n${walletContext}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_BASE,
    messages: [{ role: "user", content: userPrompt }]
  });

  const narrative =
    response.content[0]?.type === "text"
      ? response.content[0].text
      : "Unable to generate report.";

  const keyFindings = narrative
    .split("\n")
    .filter((l: string) => l.trim().length > 30 && !l.startsWith("#"))
    .slice(0, 5)
    .map((l: string) => l.replace(/^\d+\.\s*/, "").trim());

  let healthScore: number | undefined;
  let healthLabel: string | undefined;

  const scoreMatch = narrative.match(/(?:overall health score|health score)[:\s]+(\d+)\s*\/\s*100/i);
  if (scoreMatch) {
    healthScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1]!)));
    healthLabel =
      healthScore >= 80 ? "Excellent" :
      healthScore >= 65 ? "Good" :
      healthScore >= 50 ? "Fair" : "Needs work";
  }

  return {
    reportType,
    narrative,
    keyFindings,
    healthScore,
    healthLabel,
    generatedAt: new Date().toISOString()
  };
}

export async function chatWithWallet(
  wallet: WalletSummary,
  messages: ChatMessage[],
  linkupContext?: string
): Promise<string> {
  const walletContext = buildWalletContext(wallet, linkupContext);

  const systemPrompt = `${SYSTEM_BASE}

You have access to this user's Celo wallet data:

${walletContext}

Answer questions directly using this data. If you don't recognise a specific transaction or address, say so honestly. Keep answers concise and conversational.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content }))
  });

  return response.content[0]?.type === "text"
    ? response.content[0].text
    : "I couldn't generate a response. Please try again.";
}

export function buildTransactionContext(txs: ParsedTransaction[]): string {
  return txs
    .slice(0, 50)
    .map(tx =>
      `${tx.date}: ${tx.type} ${tx.amount} ${tx.token} ${tx.type === "received" ? "from" : "to"} ${tx.counterpartyLabel}`
    )
    .join("\n");
}
