
A modern **personal finance management dashboard** built with **Next.js, React, Drizzle ORM, and Neon Serverless Postgres**.

The application allows users to manage financial accounts, upload transactions via CSV, and visualize financial trends through dynamic charts.

Designed with **performance, scalability, and modern full-stack architecture in mind.**

---

  🚀 Live Demo

Deployed on **Vercel**

```
https://financial-dashboard2-omega.vercel.app/
```

---

  ✨ Features

  🔐 Authentication

Secure authentication powered by **Clerk**

* Sign up / Sign in
* Protected routes
* User session management
* Secure API access

---

  🏦 Account Management

Users can:

* Create financial accounts
* Manage multiple accounts
* Track balances per account
* View account transaction history

---

  💳 Transaction Management

Users can:

* Create transactions manually
* Upload transactions via **CSV**
* Filter transactions
* Track income and expenses

Transactions are validated using **Zod schema validation**.

---

  📊 Financial Overview

The dashboard calculates financial data for the **last 30 days**:

* Total **Income**
* Total **Expenses**
* **Remaining Balance**

Each metric is displayed in overview cards with trend indicators.

---

  📈 Data Visualization

Interactive charts built with **Recharts**

   Pie Chart

Shows distribution of income and expenses.

   Bar Chart

Compares income vs expenses.

   Line Chart

Displays financial growth or decline over time.

---

  🏦 Plaid Integration

The project integrates with **Plaid API** to connect financial institutions.

Users can:

* Connect bank accounts
* Import transactions automatically
* Sync financial data

Plaid provides secure bank-level integrations.

More information:
[https://plaid.com](https://plaid.com)

---

  🧭 Application Routes

Main application routes:

```
/auth
/overview
/accounts
/transactions
/categories
/settings
```

   Route Description

| Route           | Description                         |
| --------------- | ----------------------------------- |
| `/overview`     | Dashboard financial summary         |
| `/accounts`     | Manage financial accounts           |
| `/transactions` | Transaction history and CSV uploads |
| `/categories`   | Manage transaction categories       |
| `/settings`     | User settings                       |
| `/auth`         | Authentication routes               |

---

  🧠 Tech Stack

  Frontend

* **Next.js 16**
* **React 19**
* **TypeScript**
* **TailwindCSS**
* **Shadcn UI**
* **Radix UI**

---

  Backend

* **Hono** (API routes)
* **Zod validation**
* **Clerk authentication**

---

  Database

* **Neon Serverless PostgreSQL**
* **Drizzle ORM**
* **Drizzle migrations**

---

  State Management

* **TanStack React Query**
* **Zustand**

---

  Charts & Visualization

* **Recharts**

---

  CSV Processing

* **PapaParse**

---

  Deployment

* **Vercel**
* **Serverless Neon Database**

---

  🏗 Architecture

```
Client (Next.js + React)
        │
        │
        ▼
API Layer (Hono)
        │
        │
        ▼
Validation (Zod)
        │
        │
        ▼
ORM (Drizzle)
        │
        │
        ▼
Database (Neon PostgreSQL)
```

Authentication handled via **Clerk** middleware.

---
 
  ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/abdulatif90/finance-dashboard.git
```

Move into project

```bash
cd finance-dashboard
```

Install dependencies

```bash
npm install
```

---

  🔐 Environment Variables

Create a `.env` file

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=
```

---

  🗄 Database Setup

Generate migrations

```
npm run db:generate
```

Run migrations

```
npm run db:migrate
```

Seed database

```
npm run db:seed
```

Open Drizzle Studio

```
npm run db:studio
```

---

  🧪 Development

Run development server

```
npm run dev
```

Build production

```
npm run build
```

Start production

```
npm run start
```

---

  📊 Example CSV Import

Example transaction CSV format:

```
date,account,category,payee,amount,notes
2026-02-01,Coffee,-5,Food
2026-02-02,Salary,2000,Income
```

---

  🔮 Future Improvements

Potential features:

* Budget planning
* Recurring transaction detection
* AI spending insights
* Mobile PWA version
* Export reports (PDF/CSV)

---

  📜 License

MIT License

---

  👨‍💻 Author

Developed by **Abdulatif**

If you like this project please ⭐ the repository.



