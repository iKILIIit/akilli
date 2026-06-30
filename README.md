# Akili — AI Financial Intelligence for GoodDollar & MiniPay

> *Akili* is the Swahili word for intelligence and wisdom. Live at **[akilii.xyz](https://akilii.xyz)**.

Akili is an AI-powered financial copilot built for GoodDollar UBI members and MiniPay users. It reads any Celo wallet's on-chain transaction history, tracks your daily G$ UBI, and gives you clear, actionable insights about your money in plain language — no jargon, no spreadsheets required.

---

## Use Cases

### G$ / GoodDollar (core)

| Feature | What it does |
|---|---|
| **My G$ UBI** | Shows your full GoodDollar UBI claim history, how much you've earned, and claim streaks |
| **G$ Optimizer** | Personalized advice on getting more value from your daily UBI (timing, compounding, swapping) |
| **G$ Claim Banner** | Alerts you when you have unclaimed G$ sitting idle — shown on the home screen daily |
| **Sidebar Balance** | Live G$ balance and "Verified" badge if you're a registered GoodDollar member |

### Onchain Wallet Analysis

| Feature | What it does |
|---|---|
| **Spending Advice** | AI reads your last 90 days of transactions and gives you personalized tips |
| **Account Summary** | Full breakdown of inflows, outflows, and spending patterns |
| **Wallet Audit** | Financial health score (0–100) with actionable improvements |
| **Monthly Plan** | Budget plan built from your actual spending history |

### Infrastructure

| Contract | What it does |
|---|---|
| **AkiliCredits.sol** | Deposit your daily G$ UBI as credits; AI operations cost micro-amounts (0.02–0.10 G$), G$ analysis is always free |
| **AkiliLog.sol** | Every AI decision is written onchain as an immutable audit trail |
| **Free tier** | 3 free analyses + 3 free chats before credits kick in |

> **Target user:** A GoodDollar member in Africa (Nigeria, Kenya, Ghana) who receives daily G$ UBI and wants intelligence around it — not just "what is my balance" but "am I claiming consistently, what am I missing, how do I use it better."

---

## The Problem

Millions of people use MiniPay to hold and move stablecoins daily. But most of them have no visibility into their own financial behaviour. They can see individual transactions, but they cannot answer basic questions like:

- *Where did my money actually go this month?*
- *Am I spending more than I earn?*
- *Are there any suspicious interactions on my wallet?*
- *What would a realistic savings plan look like for me?*

Traditional banking apps offer dashboards and analytics — MiniPay users have had nothing equivalent. Akili closes that gap.

---

## What Akili Does

Akili reads any Celo wallet's transaction history via Celoscan and uses Claude via OpenRouter to generate six types of financial intelligence, plus a live FX rates panel:

| Feature | What it does |
|---|---|
| **Spending Advice** | 3–5 specific, data-backed tips to cut waste and save more |
| **Account Summary** | A friendly bank-statement-style summary of money in vs. out |
| **Wallet Audit** | A 0–100 health score across spending discipline, fee efficiency, and risk |
| **Wallet Statement** | A formal, downloadable record of all transactions — useful as proof of financial activity |
| **Monthly Plan** | A personalised budget built from your actual income and spending patterns |
| **Remittance Cost Audit** | Compares your cross-border sends against Western Union and bank wire costs |
| **Live FX Rates** | Real-time NGN/KES/GHS/ZAR rates with trend arrows, quick converter, and send route advisory |
| **FX Rate Alerts** | Set a target rate and get notified when it's reached |

Beyond reports, Akili has a **live chat interface** — you can ask it anything about any wallet in natural language and it answers using real on-chain data.

---

## Use Case: Amara in Lagos

Amara receives her freelance payments in USDC on Celo via MiniPay. She sends money home to Abuja weekly and at the end of the month has no idea where most of it went.

She opens Akili, connects her wallet, and within seconds gets:

1. A **Spending Advice** report showing she's paid $4.80 in gas fees on micro-transactions that could have been batched — saving her ~$3/month
2. An **Account Summary** revealing she received $340 USDC but sent $310 — a thin $30 buffer with no savings
3. A **Wallet Audit** scoring her 54/100 — flagging two unknown contract interactions she didn't recognise
4. A **Monthly Plan** suggesting she set aside $40/month automatically before spending, based on her average monthly income
5. A downloadable **Wallet Statement** she can show as proof of income to a micro-lender
6. A **Live FX panel** showing NGN rates in real time, with an alert set for when NGN hits her target rate

None of this required a bank account, a credit bureau, or a financial advisor. Just a wallet address.

---

## Why Akili Is a Great Agent

### 1. Real On-Chain Context, Not Generic Advice

Most AI financial tools give generic advice based on categories you manually enter. Akili reads actual blockchain transactions — real amounts, real counterparties, real dates. The advice is specific to the wallet, not a template.

### 2. Audit Any Wallet

You're not limited to your own wallet. Paste any Celo address and Akili will analyse it — useful for due diligence, research, or helping someone else understand their finances.

### 3. Registered On-Chain Agent Identity (ERC-8004)

Akili is registered as a verifiable on-chain agent via the **ERC-8004** identity registry on Celo mainnet:

- **Registry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **Agent URI:** `https://akilii.xyz/agent.json`
- **Registration tx:** [`0xda007d57...`](https://celoscan.io/tx/0xda007d57e9c8f7ac65cc49e86175ea363ac42f2a8df30fb5c57cabe599c96d7a)

This gives Akili a cryptographically verifiable identity on-chain — other protocols, wallets, and agent frameworks can discover and verify Akili's capabilities without trusting a centralised registry.

### 4. Deep Research via Linkup

Akili augments wallet analysis with live external research using the **Linkup API** — pulling in DeFi protocol context, token risk signals, or broader market information to enrich its reports beyond raw transaction data.

### 5. Works Inside MiniPay

The entire frontend is a Next.js 15 Progressive Web App designed for MiniPay's in-app browser. It auto-detects and connects the MiniPay wallet provider, handles safe-area insets for mobile, and renders cleanly on a 390px screen. No separate wallet connection flow required.

---

## Architecture

```
apps/
  miniapp/          Next.js 15 App Router — MiniPay PWA frontend
    app/
      copilot/           AI chat + insights UI (charts, download, tab switching)
      fx/                Live FX rates, converter, and alerts UI
      api/
        chat/            Streaming chat endpoint
        insights/        Wallet analysis endpoint
        wallet/          Celoscan transaction fetcher
        fx/              Server-side FX rate proxy (1-hour revalidation)
    lib/
      celo-transactions  On-chain tx parsing and labelling
      linkup.ts          Linkup deep research client
      fx-alerts.ts       FX alert CRUD (localStorage)

packages/
  agents/           Claude wallet analyst — reports + chat (via OpenRouter)
  celo/             Token config and Celo helpers
  shared/           Zod schemas, types, constants
  contracts/        Solidity — deployed on Celo mainnet
    scripts/
      register-erc8004.ts  Viem-based ERC-8004 agent registration
```

---

## Deployed Contracts

| Contract | Address | Network |
|---|---|---|
| ERC-8004 Registry | [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://celoscan.io/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) | Celo Mainnet |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A MiniPay wallet or any EIP-1193 wallet on Celo

### Install

```bash
git clone https://github.com/gidson5/minipay-yield-decision-Agent.git
cd minipay-yield-decision-Agent
pnpm install
```

### Environment

Copy `.env.example` to `.env.local` in the repo root and fill in:

```bash
# Required
OPENROUTER_API_KEY=sk-or-...
LINKUP_API_KEY=...
```

### Run locally

```bash
pnpm dev
```

The MiniPay frontend runs at `http://localhost:3000`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, App Router, TypeScript |
| AI | Claude (claude-sonnet-4-6) via OpenRouter |
| Research | Linkup Deep Research API |
| Blockchain | Celo Mainnet, Viem, Celoscan API |
| FX Data | open.er-api.com (server-cached, 1-hour revalidation) |
| Agent Identity | ERC-8004 on-chain registry |
| Package Manager | pnpm workspaces |

---

## License

MIT
