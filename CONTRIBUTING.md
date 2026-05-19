# Contributing to Akili

Thanks for your interest in contributing! Akili is built for MiniPay users in Africa and every improvement matters.

## Getting Started

```bash
git clone https://github.com/gidson5/AKILII.git
cd AKILII
pnpm install
pnpm dev
```

## Development Guidelines

**MiniPay language rules** — enforced for listing approval:
- "Gas fee" → "Network fee"
- "Crypto" → "Stablecoin" or "Digital dollar"
- Never show raw `0x...` addresses as primary identifiers

**Before committing:**
- Run `pnpm --filter @yield-copilot/miniapp exec tsc --noEmit`
- Never commit `.env` files or private keys
- Test in MiniPay or a mobile browser at 390px width

## Project Structure

```
apps/miniapp/     Next.js 15 frontend (MiniPay PWA)
packages/agents/  GPT-4o-mini wallet analyst
packages/celo/    Celo chain config and token data
packages/shared/  Types and constants
packages/contracts/ PolicyRouter smart contract
```

## Submitting a PR

1. Fork and create a branch from `main`
2. Make your changes with focused commits
3. Open a PR using the provided template
4. Tag `akilihq12@gmail.com` if you need a review

## Questions?

Open an issue or email **akilihq12@gmail.com**.
