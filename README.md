# Akili — AI Financial Intelligence for GoodDollar

> *Akili* is the Swahili word for intelligence and wisdom. Live at **[akilii.xyz](https://akilii.xyz)**.

Akili is an AI-powered financial copilot built for GoodDollar UBI members. It reads any Celo wallet's on-chain transaction history, tracks your daily G$ UBI, and gives you clear, actionable insights about your money in plain language — no jargon, no spreadsheets required.

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

Millions of people in Africa receive GoodDollar UBI daily on Celo but have no visibility into their own financial behaviour. They can see individual transactions, but they cannot answer basic questions like:

- *How much G$ have I claimed this month?*
- *Am I missing out by not claiming daily?*
- *Where did my money actually go this month?*
- *What would a realistic savings plan look like for me?*

Traditional banking apps offer dashboards and analytics — GoodDollar members have had nothing equivalent. Akili closes that gap.

---

## What Akili Does

Akili reads any Celo wallet's transaction history via Celoscan and uses Claude via OpenRouter to generate financial intelligence reports plus a live FX rates panel:

| Feature | What it does |
|---|---|
| **My G$ UBI** | Full UBI claim history, earnings, and streak analysis |
| **G$ Optimizer** | Personalized advice to maximise your daily UBI value |
| **Spending Advice** | 3–5 specific, data-backed tips to cut waste and save more |
| **Account Summary** | A friendly bank-statement-style summary of money in vs. out |
| **Wallet Audit** | A 0–100 health score across spending discipline, fee efficiency, and risk |
| **Monthly Plan** | A personalised budget built from your actual income and spending patterns |
| **Live FX Rates** | Real-time NGN/KES/GHS/ZAR rates with trend arrows and send route advisory |
| **FX Rate Alerts** | Set a target rate and get notified when it's reached |

Beyond reports, Akili has a **live chat interface** — you can ask it anything about any wallet in natural language and it answers using real on-chain data.

---

## Use Case: Amara in Lagos

Amara is a GoodDollar member who receives G$ daily. She sends stablecoin payments and at the end of the month has no idea where most of it went.

She opens Akili, connects her wallet, and within seconds gets:

1. A **My G$ UBI** report showing she's claimed 18 out of 30 days — missing 12 days of free income
2. A **G$ Optimizer** tip suggesting she claim every morning before 9am when the daily pool resets
3. A **Spending Advice** report showing she's paid $4.80 in gas fees on micro-transactions that could have been batched
4. An **Account Summary** revealing she received $340 USDC but sent $310 — a thin $30 buffer with no savings
5. A **Wallet Audit** scoring her 54/100 — flagging two unknown contract interactions she didn't recognise
6. A **Monthly Plan** suggesting she set aside $40/month automatically before spending

None of this required a bank account, a credit bureau, or a financial advisor. Just a wallet address.

---

## Why Akili Is a Great Agent

### 1. G$ Native Intelligence

Akili treats G$ transactions correctly — income from the UBI contract is never classified as spending, idle G$ is flagged like uncollected interest, and every report is aware of the user's GoodDollar verification status.

### 2. Real On-Chain Context, Not Generic Advice

Most AI financial tools give generic advice based on categories you manually enter. Akili reads actual blockchain transactions — real amounts, real counterparties, real dates. The advice is specific to the wallet, not a template.

### 3. Audit Any Wallet

You're not limited to your own wallet. Paste any Celo address and Akili will analyse it — useful for due diligence, research, or helping someone else understand their finances.

### 4. Registered On-Chain Agent Identity (ERC-8004)

Akili is registered as a verifiable on-chain agent via the **ERC-8004** identity registry on Celo mainnet:

- **Registry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **Agent URI:** `https://akilii.xyz/agent.json`
- **Registration tx:** [`0xda007d57...`](https://celoscan.io/tx/0xda007d57e9c8f7ac65cc49e86175ea363ac42f2a8df30fb5c57cabe599c96d7a)

This gives Akili a cryptographically verifiable identity on-chain — other protocols, wallets, and agent frameworks can discover and verify Akili's capabilities without trusting a centralised registry.

### 5. Deep Research via Linkup

Akili augments wallet analysis with live external research using the **Linkup API** — pulling in DeFi protocol context, token risk signals, or broader market information to enrich its reports beyond raw transaction data.

### 6. Mobile-First PWA on Celo

The entire frontend is a Next.js 15 Progressive Web App optimised for mobile. It auto-detects and connects any EIP-1193 wallet on Celo, handles safe-area insets, and renders cleanly on a 390px screen.

---

## Architecture

```
apps/
  miniapp/          Next.js 15 App Router — Akili PWA frontend
    app/
      api/
        report/          Wallet analysis + G$ report endpoint
        chat/            Streaming chat endpoint
        fx/              Server-side FX rate proxy (1-hour revalidation)
    lib/
      celo-transactions  On-chain tx parsing and labelling
      linkup.ts          Linkup deep research client
      fx-alerts.ts       FX alert CRUD (localStorage)
    hooks/
      use-gd-status.ts   viem multicall hook for live G$ balance + entitlement

packages/
  agents/           Claude wallet analyst — reports + chat (via OpenRouter)
  celo/             GoodDollar contract helpers, token config
    src/
      gooddollar.ts  getGDStatus, fetchUBIClaimHistory, getGDProtocolStats
  shared/           Zod schemas, types, constants
  contracts/        Solidity — deployed on Celo mainnet
    src/
      AkiliCredits.sol   G$ credit system for AI operations
      AkiliLog.sol       Onchain immutable decision audit trail
```

---

## Deployed Contracts

| Contract | Address | Network |
|---|---|---|
| AkiliEscrow | [`0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6`](https://celoscan.io/address/0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6) | Celo Mainnet |
| AkiliLog | [`0xbc84e6000869E08837ecAd0a26D43f7731982E8F`](https://celoscan.io/address/0xbc84e6000869E08837ecAd0a26D43f7731982E8F) | Celo Mainnet |
| AkiliCredits | [`0xE298A7EBd294Ba20474d0f259B2a00F776DCE4E2`](https://celoscan.io/address/0xE298A7EBd294Ba20474d0f259B2a00F776DCE4E2) | Celo Mainnet |
| ERC-8004 Agent Registration | [`0xda007d57...`](https://celoscan.io/tx/0xda007d57e9c8f7ac65cc49e86175ea363ac42f2a8df30fb5c57cabe599c96d7a) | Celo Mainnet |

**GoodDollar contracts integrated (not deployed by us):**

| Contract | Address |
|---|---|
| G$ Token | [`0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A`](https://celoscan.io/address/0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A) |
| UBI Scheme | [`0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1`](https://celoscan.io/address/0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1) |
| Identity | [`0xC361A6E67822a0EDc17D899227dd9FC50BD62F42`](https://celoscan.io/address/0xC361A6E67822a0EDc17D899227dd9FC50BD62F42) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Any EIP-1193 wallet on Celo

### Install

```bash
git clone https://github.com/gidson5/AKILII.git
cd AKILII
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

The Akili frontend runs at `http://localhost:3000`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, App Router, TypeScript |
| AI | Claude (claude-sonnet-4-6) via OpenRouter |
| Research | Linkup Deep Research API |
| Blockchain | Celo Mainnet, Viem, Celoscan API |
| GoodDollar | UBIScheme, Identity, G$ token contracts |
| FX Data | open.er-api.com (server-cached, 1-hour revalidation) |
| Agent Identity | ERC-8004 on-chain registry |
| Package Manager | pnpm workspaces |

---

## License

MIT
