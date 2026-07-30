# ฿ BudgetTracker 2026

BudgetTracker is a full-stack personal & household financial management web application built with **Angular (Signals & Standalone Components)**, **Tailwind CSS v4**, and **Firebase Firestore**.

🌐 **Live Web Application:** [https://budget-tracker-two-ruddy.vercel.app/](https://budget-tracker-two-ruddy.vercel.app/)

---

## 🚀 Key Features

### 📊 Dashboard & Expenditure Velocity
- **Timeframe Velocity Analytics:** Instant visibility into **Today's Spent**, **This Week's Spent**, **This Month's Spent**, and **This Year's Total**.
- **Category & Utility Budget Caps:** Configure custom monthly limits for Food, Electricity, Water, Entertainment, and Fuel.
- **Visual Budget Warnings:** Automatic red alert banners when expenditure reaches or exceeds configured budget thresholds (>80%).
- **LIFO Sorting:** Real-time expense logs ordered by creation timestamp (`YYYY-MM-DD HH:mm:ss`).

### 💳 Multi-Account & Balance Audit
- **Account Ledger:** Track Joint Bank Accounts (Bank Jago Joint, BCA, Dana Darurat / Emergency Funds) and E-Wallets (GoPay, Cash).
- **Manual Balance Adjustments:** Adjust account nominals with mandatory reason logging for full audit trails.
- **Inter-Account Transfers:** Transfer funds seamlessly between accounts (e.g. Dana Darurat to Bank Jago).

### 🤝 Nalangin Ledger (Debts & Receivables)
- **Dedicated `/nalangin` Tab:** Manage shared purchases with real-time Firestore synchronization.
- **Tagihan (Receivables) & Hutang (Payables):** Track money owed by/to others with one-click **Settled** toggles.

### 🎯 Interactive Target Savings
- **Goal Progress Tracking:** Real-time percentage progress bars for emergency funds and long-term commitments.
- **Freelance / Deposit Top-Ups:** Direct "+ Add Deposit (Freelance)" button to credit freelance earnings straight into savings targets.

### 🤖 2-Step Interactive Telegram Bot
- **Interactive Confirmations:** Bot parses text commands (`Pecel ayam 2 total 50rb`) and asks for confirmation (`yes` / `correct for ID123` / `cancel`) before committing to the database.
- **Bot Nalangin Logging:** Create debts/receivables (`tagihan ilyas 50k pecel ayam`) and execute settlement (`tagihan ilyas lunas`).
- **Live Queries:** Ask bot for `today expense`, `list tagihan`, `list hutang`, `pending list`, or `/myid`.
- **Security Whitelist Guard:** Whitelist sender Telegram Chat IDs using `TELEGRAM_AUTHORIZED_CHAT_IDS`.

### 📁 Excel & Database Backup Engine
- **Categorized Excel Exports:** Generates multi-sheet Excel workbooks (`Monthly Summary & Buffer` and `Expenses Breakdown`).
- **Template Download:** Pre-formatted `.xlsx` spreadsheet template for bulk data imports.
- **Full JSON DB Backup & Restore:** One-click full database export and restore system for seamless environment migrations.

---

## 🛠️ Environment Variables Setup

Create a `.env` file or configure Vercel Environment Variables:

```env
NG_APP_FIREBASE_API_KEY=your_firebase_api_key
NG_APP_FIREBASE_PROJECT_ID=positive-harbor-723
NG_APP_FIREBASE_AUTH_DOMAIN=positive-harbor-723.firebaseapp.com
NG_APP_TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NG_APP_TELEGRAM_AUTHORIZED_CHAT_IDS=123456789,987654321
```

---

## 💻 Development Commands

### Start Local Development Server
```bash
npm start
```
Navigates to `http://localhost:4200/`.

### Build Production Bundle
```bash
npm run build
```

### Run Unit Tests
```bash
npm test
```

---

## 📑 Tech Stack
- **Frontend:** Angular 19+ (Signals, Standalone Components, Control Flow)
- **Styling:** Tailwind CSS v4, SCSS
- **Database & Auth:** Firebase Firestore & Firebase Auth
- **Serverless Webhook:** Vercel Node.js Serverless Functions / Supabase Edge Functions (Deno)
- **Visualization:** Chart.js & ng2-charts
- **Spreadsheets:** SheetJS (@e965/xlsx)
- **Testing:** Vitest
```
