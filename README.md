# Akili — AI Financial Intelligence for GoodDollar

> *Akili* is the Swahili word for intelligence and wisdom. Live at **[akilii.xyz](https://akilii.xyz)**.

Akili is an AI-powered financial copilot built for GoodDollar (G$) UBI recipients on Celo. It helps people understand, track, and get more value from their daily G$ Universal Basic Income.

---

## What it does

- Analyzes a user's G$ UBI claim history — streaks, missed days, total earned
- Gives personalized advice on how to maximize GoodDollar UBI
- Audits wallet activity and provides spending advice
- Generates financial summaries and monthly plans in plain language

---

## How it works

- User connects their Celo wallet → Akili reads their on-chain G$ data in real time (balance, entitlement, claim history, whitelist status)
- Claude AI generates a human-readable report tailored to that wallet
- Every AI decision is logged immutably on Celo via **AkiliLog** — a permanent, verifiable audit trail
- Users pay for AI credits in G$ via **AkiliCredits**, keeping the economy within the GoodDollar ecosystem

---

## Stack

- **Frontend:** Next.js miniapp (runs inside MiniPay and browsers)
- **AI:** Claude (Anthropic) via `@yield-copilot/agents`
- **Blockchain:** Celo mainnet, viem, forno.celo.org
- **Smart contracts:** AkiliLog + AkiliCredits (both deployed on Celo mainnet)
- **On-chain identity:** ERC-8004 agent registry

---

## Deployed Contracts

| Contract | Address | Network |
|---|---|---|
| **AkiliLog** | [`0xbc84e6000869E08837ecAd0a26D43f7731982E8F`](https://celoscan.io/address/0xbc84e6000869E08837ecAd0a26D43f7731982E8F) | Celo Mainnet |
| **AkiliCredits** | [`0xE298A7EBd294Ba20474d0f259B2a00F776DCE4E2`](https://celoscan.io/address/0xE298A7EBd294Ba20474d0f259B2a00F776DCE4E2) | Celo Mainnet |

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

Copy `.env.example` to `.env.local` and fill in:

```bash
OPENROUTER_API_KEY=sk-or-...
LINKUP_API_KEY=...
```

### Run locally

```bash
pnpm dev
```

The Akili frontend runs at `http://localhost:3000`.

---

## License

MIT
