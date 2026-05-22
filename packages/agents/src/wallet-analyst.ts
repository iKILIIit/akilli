import OpenAI from "openai";

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

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
const MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet";

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

FORMATTING RULES — follow exactly:
- Use **bold** for key numbers, labels, and important findings.
- Use bullet points (- item) for lists of tips, findings, or actions.
- Use short section headers (### Header) to separate sections.
- Keep paragraphs short (2-3 sentences max).
- Never write walls of text.

CONTEXT:
- Users hold USDC and USDT on Celo (stablecoins pegged to USD).
- "MiniPay Boost" is MiniPay's built-in savings feature that pays daily interest — transactions from it are interest income, not spending.
- Amounts labeled "received" include both peer transfers and interest earned.
- Be direct, warm, and specific. Mention actual dollar amounts from the data.
- Always be encouraging but honest about spending patterns.`;

const PROMPTS: Record<ReportType, (wallet: WalletSummary) => string> = {
  "spending-advice": (w) =>
    `Analyze this wallet's spending over the last ${w.periodDays} days. Give 3-5 specific, actionable tips.

Format:
### Spending Summary
One sentence on overall pattern (mention total in and total out in USD).

### Tips
- **Tip title** — explanation with actual amounts from the data.
(repeat for each tip)

### Bottom Line
One encouraging sentence with the single most important action.`,

  "account-summary": (w) =>
    `Write a clear account summary for the last ${w.periodDays} days.

Format:
### Account Summary — Last ${w.periodDays} Days
**Total Received:** $X.XX (include interest from MiniPay Boost if present)
**Total Sent:** $X.XX
**Net Position:** $X.XX (positive = saving, negative = spending more than earning)

### Key Activity
- 2-3 bullet points on notable patterns

### Notable Observations
- 2-3 bullets on anything worth knowing`,

  "wallet-audit": (_w) =>
    `Audit this wallet's financial health. Score each dimension and give an overall health score.

Format:
### Wallet Audit

- **Spending Discipline: X/100** — one line explanation
- **Fee Efficiency: X/100** — one line explanation
- **Contract Safety: X/100** — flag any unknown or risky contracts; say "No risky contracts found" if clean
- **Activity Health: X/100** — regularity and diversity

### Health Score: X/100
One sentence verdict (e.g. "Good — your wallet shows healthy habits with room to improve savings.")

### Top 2 Improvements
- improvement 1
- improvement 2`,

  "wallet-statement": (w) =>
    `Generate a formal wallet statement for the last ${w.periodDays} days, suitable as proof of financial activity.

Format:
### AKILI WALLET STATEMENT
**Period:** Last ${w.periodDays} days
**Address:** [wallet address]

### Transactions
List each transaction as:
DATE | TYPE | AMOUNT TOKEN | COUNTERPARTY

### Summary
**Total Received:** $X.XX
**Total Sent:** $X.XX
**Net:** $X.XX
**Network Fees:** $X.XX`,

  "monthly-plan": (w) =>
    `Create a realistic monthly financial plan based on this ${w.periodDays}-day history.

Format:
### Monthly Income Estimate
**~$X.XX/month** — based on received amounts (include interest if present)

### Recommended Budget
- **Savings (X%):** $X.XX — reason
- **Transfers/Payments (X%):** $X.XX
- **Buffer (X%):** $X.XX

### Savings Target
**Goal:** $X.XX by [timeframe] — specific reason tied to their data

### 3 Actions This Month
1. action with specific amount
2. action with specific amount
3. action with specific amount`,

  "financial-health": (_w) =>
    `Give a comprehensive financial health assessment.

Format:
### Financial Health Report

- **Savings Rate: X/100** — explanation
- **Spending Discipline: X/100** — explanation
- **Fee Efficiency: X/100** — explanation
- **Activity Health: X/100** — explanation

### Overall Health Score: X/100
**[Label]** — 2-3 sentence narrative.

### Top 2 Improvements
- improvement 1
- improvement 2`
};

export async function generateWalletReport(
  wallet: WalletSummary,
  reportType: ReportType,
  linkupContext?: string
): Promise<WalletAnalysis> {
  if (wallet.transactions.length === 0) {
    return {
      reportType,
      narrative: "No transaction history found for this wallet. Once you send or receive USDC or USDT on Celo, Akili can generate a full report with spending advice, health scores, and more.",
      keyFindings: ["No transactions found in the selected period."],
      generatedAt: new Date().toISOString(),
    };
  }

  const walletContext = buildWalletContext(wallet, linkupContext);
  const prompt = PROMPTS[reportType](wallet);
  const userPrompt = `${prompt}\n\nWALLET DATA:\n${walletContext}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_BASE },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.4,
    max_tokens: 2048,
  });

  const narrative = completion.choices[0]?.message?.content ?? "Unable to generate report.";

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
  if (wallet.transactions.length === 0) {
    return "I don't see any transactions on this wallet yet. Once you send or receive USDC or USDT on Celo, I'll be able to analyze your spending, generate reports, and give you personalized financial advice.";
  }

  const walletContext = buildWalletContext(wallet, linkupContext);

  const systemPrompt = `${SYSTEM_BASE}

You have access to this user's Celo wallet data:

${walletContext}

Answer questions directly using this data. If you don't recognise a specific transaction or address, say so honestly. Keep answers concise and conversational.

STRICT TOPIC BOUNDARY:
- You ONLY discuss topics directly related to this user's wallet: transactions, balances, spending patterns, savings, fees, DeFi activity, and financial health.
- If the user asks about ANYTHING unrelated to their wallet or personal finances (e.g. general knowledge, coding, news, sports, opinions, crypto prices in general, other people's wallets), respond with exactly: "I can only help with questions about your wallet and finances. What would you like to know about your transactions or spending?"
- Do not engage with off-topic messages even briefly. Redirect immediately.`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ],
    temperature: 0.5,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";
}

export function buildTransactionContext(txs: ParsedTransaction[]): string {
  return txs
    .slice(0, 50)
    .map(tx =>
      `${tx.date}: ${tx.type} ${tx.amount} ${tx.token} ${tx.type === "received" ? "from" : "to"} ${tx.counterpartyLabel}`
    )
    .join("\n");
}
