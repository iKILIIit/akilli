# Akili — AI Financial Intelligence for MiniPay

> *Akili* is the Swahili word for intelligence and wisdom.

Akili is an AI-powered financial copilot built for MiniPay users across Africa. It connects directly to your Celo wallet, reads your on-chain transaction history, and gives you clear, honest, actionable insights about your money — in plain language, no jargon, no spreadsheets required.

---

## The Problem

Over 3 million people in Nigeria, Kenya, and Ghana use MiniPay to hold and move stablecoins daily. But most of them have no visibility into their own financial behaviour. They can see individual transactions, but they cannot answer basic questions like:

- *Where did my money actually go this month?*
- *Am I spending more than I earn?*
- *Are there any suspicious interactions on my wallet?*
- *What would a realistic savings plan look like for me?*

Traditional banking apps offer dashboards and analytics — MiniPay users have had nothing equivalent. Akili closes that gap.

---

## What Akili Does

Akili reads your Celo wallet's transaction history via Celoscan and uses Claude via OpenRouter to generate six types of financial intelligence, plus a live FX rates panel and autonomous escrow-based remittance execution:

| Feature | What it does |
|---|---|
| **Spending Advice** | 3–5 specific, data-backed tips to cut waste and save more |
| **Account Summary** | A friendly bank-statement-style summary of money in vs. out |
| **Wallet Audit** | A 0–100 health score across spending discipline, fee efficiency, and risk |
| **Wallet Statement** | A formal, downloadable record of all transactions — useful as proof of financial activity |
| **Monthly Plan** | A personalised budget built from your actual income and spending patterns |
| **Remittance Cost Audit** | Compares your cross-border sends against Western Union and bank wire costs |
| **Live FX Rates** | Real-time NGN/KES/GHS/ZAR rates with trend arrows, quick converter, and send route advisory |
| **FX Rate Alerts** | Notify when a target rate is reached — or trigger an automatic send |
| **Auto-Send Escrow** | Lock USDC/USDT on-chain; Akili autonomously executes the transfer when your target FX rate is hit |

Beyond reports, Akili has a **live chat interface** — you can ask it anything about your wallet in natural language and it answers using your real on-chain data.

---

## Use Case: Amara in Lagos

Amara receives her freelance payments in USDC on Celo via MiniPay. She sends money home to Abuja weekly, watches exchange rates obsessively, and at the end of the month has no idea where most of it went.

She opens Akili, connects her wallet, and within seconds gets:

1. A **Spending Advice** report showing she's paid $4.80 in gas fees on micro-transactions that could have been batched — saving her ~$3/month
2. An **Account Summary** revealing she received $340 USDC but sent $310 — a thin $30 buffer with no savings
3. A **Wallet Audit** scoring her 54/100 — flagging two unknown contract interactions she didn't recognise
4. A **Monthly Plan** suggesting she set aside $40/month automatically before spending, based on her average monthly income
5. A downloadable **Wallet Statement** she can show as proof of income to a micro-lender
6. A **Live FX panel** showing NGN is at 1,605 today — below her usual target. She taps **Schedule Auto-Send**, locks $50 USDC in Akili's escrow contract, and sets a target of 1,625. Two days later, when NGN hits 1,627, Akili's backend executes the transfer automatically — she gets ₦81,350 instead of ₦80,250. No rate-watching. No missed windows.

None of this required a bank account, a credit bureau, or a financial advisor. Just her wallet.

---

## Why Akili Is a Great Agent

### 1. Real On-Chain Context, Not Generic Advice

Most AI financial tools give generic advice based on categories you manually enter. Akili reads your actual blockchain transactions — real amounts, real counterparties, real dates. The advice is specific to *you*, not a template.

### 2. Designed for the Right Users

Akili is built specifically for MiniPay users in sub-Saharan Africa. The system prompt, tone, and report formats are calibrated for people holding USDC and USDT on Celo, sending remittances, and operating in dollar-equivalent economies without traditional banking infrastructure.

### 3. On-Chain Guardrails (PolicyRouter)

Akili's recommendation engine is backed by a deployed **PolicyRouter** smart contract on Celo mainnet (`0x0c0345b3DFBFFD4300255F9DB933A4751cCD2124`). The contract enforces:

- **Venue policies** — each action type has a configured executor, max amount, and accepted tokens
- **Cooldown periods** — prevents repeated execution within a time window
- **Quote expiry** — recommendations expire after a configurable window to prevent stale data from driving actions
- **Slippage protection** — a `maxSlippageBps` guard on all non-liquid actions
- **User risk scores** — certain high-risk venues are only unlocked for users with an appropriate risk profile
- **Recipient matching** — funds can only be routed to the verified user address

This means Akili is not just a chatbot — it has a trust layer that enforces policy before any financial action is executed.

### 4. Autonomous FX-Triggered Execution (AkiliEscrow)

Akili can autonomously execute cross-border transfers when a target FX rate is reached — without holding the user's private key and without requiring biometric re-approval on every send.

**How it works:**

1. User locks USDC or USDT into the **AkiliEscrow** contract (`0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6`) — signing two transactions with MiniPay Face ID once
2. The contract records: recipient address, amount, target rate, currency, and execution conditions
3. A Vercel cron job (every 5 minutes) fetches live FX rates from open.er-api.com
4. When the live rate meets or exceeds the target, the Akili backend wallet calls `AkiliEscrow.execute()` — funds flow directly to the recipient
5. If the user changes their mind, they can call `cancel()` and receive a full refund

This is the correct architecture for autonomous financial agents: the agent acts within a pre-authorised, on-chain permission boundary — no custodial risk, no unlimited signing power, trustless execution.

### 5. Registered On-Chain Agent Identity (ERC-8004)

Akili is registered as a verifiable on-chain agent via the **ERC-8004** identity registry on Celo mainnet:

- **Registry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **Agent URI:** `https://akili.app/agent.json`
- **Registration tx:** [`0xda007d57...`](https://celoscan.io/tx/0xda007d57e9c8f7ac65cc49e86175ea363ac42f2a8df30fb5c57cabe599c96d7a)

This gives Akili a cryptographically verifiable identity on-chain — other protocols, wallets, and agent frameworks can discover and verify Akili's capabilities without trusting a centralised registry.

### 6. x402 Micropayment Support (thirdweb)

Akili implements the **x402 payment protocol** using the thirdweb SDK. When configured, the `/api/recommend` endpoint requires a **0.01 USDC payment on Celo** before returning a report. This enables:

- Permissionless API monetisation with no subscription or API keys needed on the client
- Machine-to-machine payment flows where other agents can pay Akili for analysis
- A sustainable micropayment model suited to low-value, high-frequency use in emerging markets

### 7. Deep Research via Linkup

Akili augments wallet analysis with live external research using the **Linkup API** — pulling in DeFi protocol context, token risk signals, or broader market information to enrich its reports beyond raw transaction data.

### 8. Works Inside MiniPay

The entire frontend is a Next.js 15 Progressive Web App designed for MiniPay's in-app browser. It auto-detects and connects the MiniPay wallet provider, handles safe-area insets for mobile, and renders cleanly on a 390px screen. No separate wallet connection flow required.

---

## Architecture

```
apps/
  miniapp/          Next.js 15 App Router — MiniPay PWA frontend
    app/
      copilot/           AI chat + insights UI (charts, download, tab switching)
      fx/                Live FX rates, converter, alerts, and auto-send escrow UI
      api/
        chat/            Streaming chat endpoint
        insights/        Wallet analysis endpoint
        recommend/       x402-gated recommendation endpoint
        wallet/          Celoscan transaction fetcher
        fx/              Server-side FX rate proxy (1-hour revalidation)
        escrow-execute/  Vercel cron — scans pending orders, fires when rate met
    lib/
      x402.ts            thirdweb x402 payment integration
      celo-transactions  On-chain tx parsing and labelling
      linkup.ts          Linkup deep research client
      fx-alerts.ts       FX alert CRUD (localStorage)
      escrow.ts          AkiliEscrow contract bindings + lockInEscrow()

packages/
  agents/           Claude wallet analyst — reports + chat (via OpenRouter)
  celo/             Venue adapters, policy router bindings, token config
  shared/           Zod schemas, types, constants
  contracts/        Solidity — PolicyRouter.sol, AkiliEscrow.sol
    scripts/
      deploy.ts            Hardhat deploy PolicyRouter to Celo mainnet
      deploy-escrow.ts     Hardhat deploy AkiliEscrow to Celo mainnet
      register-erc8004.ts  Viem-based ERC-8004 agent registration
```

---

## Deployed Contracts

| Contract | Address | Network |
|---|---|---|
| PolicyRouter | [`0x0c0345b3DFBFFD4300255F9DB933A4751cCD2124`](https://celoscan.io/address/0x0c0345b3DFBFFD4300255F9DB933A4751cCD2124) | Celo Mainnet |
| AkiliEscrow | [`0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6`](https://celoscan.io/address/0xcCa0A1CF96f41f467E0E5D52d89003C1F77503B6) | Celo Mainnet |
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

# Escrow execution — backend hot wallet that calls AkiliEscrow.execute()
EXECUTOR_PRIVATE_KEY=0x...
CRON_SECRET=...                 # must match the secret in vercel.json cron path

# Optional — enable x402 micropayment gating
THIRDWEB_SECRET_KEY=...
AGENT_PAYMENT_RECIPIENT=0x...   # wallet to receive 0.01 USDC per analysis

# For contract deployment / ERC-8004 re-registration
DEPLOYER_PRIVATE_KEY=...        # without 0x prefix
AGENT_URI=https://your-domain/agent.json
```

### Run locally

```bash
pnpm dev
```

The MiniPay frontend runs at `http://localhost:3000`.

### Deploy contracts

```bash
# Deploy PolicyRouter to Celo mainnet
DEPLOYER_PRIVATE_KEY=... pnpm --filter @yield-copilot/contracts run deploy

# Deploy AkiliEscrow to Celo mainnet
DEPLOYER_PRIVATE_KEY=... npx hardhat run scripts/deploy-escrow.ts --network celo

# Register agent with ERC-8004
DEPLOYER_PRIVATE_KEY=... pnpm --filter @yield-copilot/contracts run register:agent
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, App Router, TypeScript |
| AI | Claude (claude-sonnet-4-6) via OpenRouter |
| Research | Linkup Deep Research API |
| Blockchain | Celo Mainnet, Viem, Celoscan API |
| FX Data | open.er-api.com (server-cached, 1-hour revalidation) |
| Escrow Execution | Vercel Cron + backend EOA → AkiliEscrow.execute() |
| Payments | thirdweb x402 (0.01 USDC / request) |
| Smart Contracts | Solidity 0.8.24, Hardhat, OpenZeppelin |
| Agent Identity | ERC-8004 on-chain registry |
| Package Manager | pnpm workspaces |

---

## License

MIT
