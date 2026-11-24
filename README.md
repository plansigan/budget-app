# Velvet Budget

A minimalist personal budgeting, daily Safe-to-Spend, and intentional-spending tracker built with **Expo**, **React Native**, and **React Native Web**.

## Features

- **Today (Daily Safe-to-Spend)**
  - Calculates your daily allowance from `(Monthly Income - Fixed Bills - Spending Allowances - Budgeted Installments - Savings Goal) / Days in Month`.
  - Log **Spend!**, **Save to Jar**, or **End Day & Save** (50/50 split between tomorrow's rollover and your active Treat or Savings Jar).
  - Quick-spend from custom **Spending Allowances**, track **Bills Due Soon**, and handle **Payday Check-In** prompts.
  - **Privacy Mode** (`₱••••`) masks all balances and transaction amounts across the UI.
  - **Edit & Undo** transactions with automatic balance reconciliation across Cash, Banks, Credit Cards, Allowances, Savings, and Treats (including switching payment accounts).

- **Wallet**
  - Track **Physical Cash**, **Bank / E-Wallet** accounts, and **Credit Cards** (limit, used balance, and statement cut-off countdown).
  - **Transfer Money** between accounts or pay down credit cards with built-in overdraft protection.
  - Manage **Installments** (`Paid 1 Mo` progress tracking) and **Debts** (`I Owe` / `Owed to Me`).

- **Goals, Buy Later & Insights**
  - **Treat Wishlist** (up to 3 guilt-free rewards) and **Savings Buckets** (sinking funds with monthly pace targets).
  - **Things I Want to Buy (Buy Later)**: 7-day cool-off list that prompts you to re-evaluate purchases—skip them to keep your pesos, wait another 7 days, or buy them from **Daily Spending** or **Savings**.
  - **Insights & Coach**: Monthly Wrap-Up report card, Spending Breakdown by category, Budget Health split, and personalized Savings Coach tips.

- **Budget Setup & Backups**
  - Configure income, salary schedule (1x or 2x/month), monthly fixed bills, and spending allowances.
  - Light, Dark, and System themes.
  - Export/import JSON backups, export transactions to RFC-4180 CSV, and recover from automatic 10-minute snapshots.

## Tech Stack

- **Framework:** Expo 58, React Native 0.88, React Native Web 0.21, TypeScript
- **Testing & Quality:** Vitest, Playwright (Chromium E2E), ESLint, TypeScript (`tsc --noEmit`)
- **PWA / Web:** Static export via `expo export --platform web` + `scripts/patch-web-html.mjs`

## Getting Started

```bash
npm install
```

### Development

```bash
npm start          # Start Expo dev server
npm run web        # Start Expo for Web
npm run ios        # Start on iOS simulator
npm run android    # Start on Android emulator
```

### Verification & Build

```bash
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm test           # Vitest unit tests
npm run build:web  # Production web export + PWA patching into dist/
npm run test:e2e   # Playwright E2E smoke suite against dist/
```
