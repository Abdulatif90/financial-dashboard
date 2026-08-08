
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

```mermaid
flowchart TD
    Client["Client<br/>Next.js + React<br/>(TanStack Query, lib/hono.ts hc client)"]
    Route["Next.js catch-all route<br/>app/api/(...route)/route.ts<br/>(hono/vercel handle)"]
    Clerk["Clerk middleware<br/>clerkMiddleware() + 401 guard<br/>(app.ts, applied once, app-wide)"]
    Router["Hono routers<br/>accounts / categories / transactions / summary / plaid"]
    Zod["Zod validation<br/>@hono/zod-validator (per-route schemas)"]
    Owner["Ownership checks<br/>accountId / categoryId must belong to auth.userId"]
    Drizzle["Drizzle ORM<br/>db/drizzle.ts"]
    DB[("Neon Serverless<br/>PostgreSQL")]

    Client -->|HTTP request| Route
    Route --> Clerk
    Clerk -->|"401 if no auth.userId"| Client
    Clerk --> Router
    Router --> Zod
    Zod -->|"400 on invalid payload"| Client
    Zod --> Owner
    Owner -->|"404 if row isn't the caller's"| Client
    Owner --> Drizzle
    Drizzle --> DB
    DB --> Drizzle
    Drizzle -->|JSON response| Client
```

Authentication is handled once, app-wide, in `app.ts` (`clerkMiddleware()` plus a 401 guard) —
not re-checked per route. Ownership checks (does this `accountId`/`categoryId` actually belong
to the caller?) run inside each handler, after validation and before any write — see
`app/api/[[...route]]/transactions.ts`.

---

  🗄 Database Schema

Four tables, defined in `db/schema.ts`. `accounts` and `categories` both carry a nullable
`plaid_id` (populated only once a Plaid sync creates or matches a row) and a
`UNIQUE (user_id, lower(trim(name)))` index, so a user can't end up with two accounts or
categories that only differ by case or whitespace. `transactions.account_id` cascades on
delete; `transactions.category_id` is set to `null` on delete instead, since deleting a
category shouldn't delete the transactions that used it. `connected_banks` has no foreign key
to the other tables — it's scoped to a user purely by `user_id` (a Clerk user id, not a local
table), and its `access_token` never leaves the server.

```mermaid
erDiagram
    ACCOUNTS ||--o{ TRANSACTIONS : "has (accountId, onDelete: cascade)"
    CATEGORIES |o--o{ TRANSACTIONS : "categorizes (categoryId, onDelete: set null)"

    ACCOUNTS {
        text id PK
        text plaid_id "nullable, links to Plaid account_id"
        text name "UNIQUE per (user_id, lower(trim(name)))"
        text user_id "Clerk user id, indexed"
    }

    CATEGORIES {
        text id PK
        text plaid_id "nullable, keyed on personal_finance_category.primary"
        text name "UNIQUE per (user_id, lower(trim(name)))"
        text user_id "Clerk user id, indexed"
    }

    TRANSACTIONS {
        text id PK "Plaid transaction_id when synced, else generated"
        integer amount "cents; positive = income, negative = expense"
        text payee
        text notes "nullable, user-entered, never overwritten by sync"
        timestamp date
        text account_id FK "indexed with date"
        text category_id FK "nullable, indexed"
    }

    CONNECTED_BANKS {
        text id PK
        text user_id "Clerk user id, indexed, not a local FK"
        text access_token "Plaid access_token, server-only, never returned to client"
        text item_id "UNIQUE, Plaid item_id"
        text cursor "nullable, transactionsSync cursor; NULL = never synced"
    }
```

---

  🔗 Plaid Connect & Sync Flow

The most complex flow in the app: connecting a bank via Plaid Link, then syncing transactions
with Plaid's cursor-based `transactionsSync` API. The `access_token` Plaid issues is stored
server-side in `connected_banks` and is never sent back to the client.

```mermaid
sequenceDiagram
    actor User
    participant UI as PlaidConnect (React)
    participant API as Hono API (/api/plaid)
    participant Plaid as Plaid API
    participant DB as Neon Postgres

    Note over UI: Settings mounts PlaidConnect only when GET /status reports "not connected"

    UI->>API: POST /create-link-token
    API->>Plaid: linkTokenCreate({ user, products: [transactions] })
    Plaid-->>API: link_token
    API-->>UI: { data: link_token }

    User->>UI: clicks "Connect"
    UI->>Plaid: usePlaidLink.open() (hosted Link UI)
    Plaid-->>User: institution select, credentials, consent
    Plaid-->>UI: onSuccess(publicToken)

    UI->>API: POST /exchange-public-token { publicToken }
    API->>Plaid: itemPublicTokenExchange({ public_token })
    Plaid-->>API: { access_token, item_id }
    API->>DB: insert connected_banks (access_token, item_id) onConflictDoUpdate(item_id)
    Note right of API: access_token stored server-side only, never returned to the client
    API-->>UI: { data: { connected: true } }
    UI->>UI: invalidate ["plaid-status"] query

    UI->>API: GET /status (refetch)
    API->>DB: select connected_banks where user_id = caller
    DB-->>API: row(s)
    API-->>UI: { data: { connected: true } }
    Note over UI: Settings now shows "Sync transactions" / "Disconnect"

    User->>UI: clicks "Sync transactions"
    UI->>API: POST /sync
    API->>DB: select connected_banks where user_id = caller
    DB-->>API: bank rows (access_token, cursor)

    loop each connected bank, while has_more (bounded at 100 pages)
        API->>Plaid: transactionsSync({ access_token, cursor })
        Plaid-->>API: { added, modified, removed, next_cursor, has_more }
        API->>DB: find-or-create accounts by plaid_id (adopt same-name row on 23505)
        API->>DB: find-or-create categories by personal_finance_category.primary
        API->>DB: upsert transactions, onConflictDoUpdate(id = transaction_id)
        API->>DB: delete removed transactions, scoped to caller's account ids
        API->>DB: update connected_banks.cursor = next_cursor
    end

    API-->>UI: { data: { added, modified, removed, accountsCreated, categoriesCreated } }
    UI->>UI: invalidate ["transactions"], ["summary"], ["accounts"], ["categories"]
    UI-->>User: toast "Synced: N added, N updated, N removed"
```

---

  🔒 Ownership Check Flow (transaction write)

Every write that references an `accountId` or `categoryId` re-verifies the referenced row
actually belongs to the caller before touching the database — this is the fix for BUG-001 /
BUG-002 (an IDOR that let a user attach a transaction to another user's account). Shown here
for `POST /api/transactions`; the same pattern also guards `bulk-create` and `PATCH /:id`.

```mermaid
sequenceDiagram
    actor User
    participant UI as New Transaction Sheet
    participant API as POST /api/transactions
    participant DB as Neon Postgres

    User->>UI: submit form (accountId, categoryId?, amount in cents, payee, date)
    UI->>API: POST /transactions
    API->>DB: select accounts where user_id = caller AND id = accountId

    alt account not owned by caller
        DB-->>API: no row
        API-->>UI: 404 "Account not found"
    else account owned
        DB-->>API: account row
        opt categoryId provided
            API->>DB: select categories where user_id = caller AND id = categoryId
            alt category not owned
                DB-->>API: no row
                API-->>UI: 404 "Category not found"
            else category owned
                DB-->>API: category row
            end
        end
        API->>DB: insert transactions (accountId, categoryId, amount, ...)
        DB-->>API: inserted row
        API-->>UI: 200 { data }
    end
```

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



