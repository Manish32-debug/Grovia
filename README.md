# Grovia

## Fresh choices. Everyday.

Grovia is a production-style, full-stack grocery commerce platform designed around the architecture of a real online grocery system.

It combines customer shopping, authentication, inventory management, delivery-slot allocation, payments, order orchestration, operational dashboards, recommendations, and purchase intelligence into a single modular monorepo.

The project focuses on **business logic, data integrity, security, explainable intelligence, and realistic commerce workflows** rather than a simple product-listing frontend.

---

## System Overview

```text
                           ┌──────────────────────┐
                           │      Grovia Web      │
                           │ React + Vite + TS    │
                           └──────────┬───────────┘
                                      │
                                      │ REST API
                                      ▼
                           ┌──────────────────────┐
                           │    Express API       │
                           │ Auth / Catalog /     │
                           │ Cart / Orders /      │
                           │ Payments / Delivery  │
                           └──────────┬───────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
             ┌────────────┐   ┌──────────────┐   ┌──────────────┐
             │ PostgreSQL │   │ Intelligence │   │   Cashfree   │
             │ + Prisma   │   │ Smart Basket │   │   Payments   │
             └────────────┘   │ Associations │   └──────────────┘
                              │ Demand Stats │
                              └──────────────┘
```

---

# Core Capabilities

### Customer Commerce

- Product discovery and category navigation
- Search with relevance handling
- Product detail pages
- Persistent shopping cart
- Quantity and stock validation
- Wishlist
- Address management
- Delivery-slot selection
- Coupon application
- Checkout orchestration
- Order history
- Order detail and status timeline
- Order cancellation
- Reorder workflow
- Product reviews
- Notifications
- Smart Basket
- Product recommendations

### Operations

- Role-based access control
- Admin dashboard
- Product and inventory visibility
- Inventory adjustments
- Stock reservation semantics
- Delivery partner workflow
- Delivery assignment acceptance
- Pickup and completion workflow
- Failed-delivery handling
- Order state transitions
- Demand statistics
- Product association analysis

### Payments

- Cashfree payment integration
- UPI QR payment flow
- Payment-session creation
- Payment status tracking
- Webhook signature verification
- Payment/order state synchronization
- Development-only mock payment flow

---

# Intelligence Layer

One of Grovia's main differentiators is that the recommendation layer is based on **actual purchase behavior rather than hard-coded product suggestions**.

## Smart Basket

Smart Basket analyzes a customer's historical purchases to identify products they are likely to need again.

The system considers signals such as:

- Purchase frequency
- Last purchase time
- Historical quantity
- Estimated purchase interval
- Product availability
- Repeat purchasing behavior

```text
Customer purchase history
          │
          ▼
┌─────────────────────────┐
│ User Product Statistics │
│ purchase count          │
│ last purchased          │
│ median quantity         │
│ purchase interval       │
└────────────┬────────────┘
             │
             ▼
      Smart Basket
             │
             ▼
     Available products
             │
             ▼
     Replenishment UI
```

## Product Recommendations

Grovia maintains product-to-product association relationships generated from delivered-order baskets.

For products purchased together, the system calculates:

- Co-occurrence
- Support
- Confidence
- Lift

These relationships power contextual recommendations such as frequently purchased together and complete-your-basket suggestions.

## Demand Intelligence

The backend maintains product demand statistics including:

- Sales over the last 7 days
- Sales over the last 30 days
- Average daily sales
- EWMA-based daily demand
- Estimated days of remaining stock

---

# Commerce Engine

Grovia treats checkout as a business transaction rather than simply submitting a form.

```text
Cart
 │
 ▼
Address validation
 │
 ▼
Delivery slot validation
 │
 ▼
Inventory availability
 │
 ▼
Coupon validation
 │
 ▼
Price calculation
 │
 ▼
Tax calculation
 │
 ▼
Order creation
 │
 ▼
Payment initialization
 │
 ▼
Payment confirmation
 │
 ▼
Inventory transition
 │
 ▼
Order lifecycle
```

The backend remains authoritative throughout this process.

The client sends intent such as product ID, quantity, coupon code, slot ID, address ID, and payment mode. The server calculates price, discount, tax, delivery fee, stock availability, reservation, order total, order status, and payment state.

---

# Order State Machine

```text
PENDING_PAYMENT
       │
       ▼
    PLACED
       │
       ▼
   CONFIRMED
       │
       ▼
    PACKING
       │
       ▼
READY_FOR_PICKUP
       │
       ▼
OUT_FOR_DELIVERY
       │
       ▼
   DELIVERED
```

Failure and cancellation paths are validated by backend transition rules.

---

# Inventory Architecture

Inventory is modeled independently from product information.

Each product can maintain:

```text
Stock
Reserved quantity
Sellable quantity
Low-stock threshold
```

Conceptually:

```text
sellable quantity = stock - reserved
```

Inventory operations are performed through backend services rather than directly by the browser.

---

# Authentication & Security

Grovia includes a dedicated authentication subsystem.

### Authentication

- Argon2id password hashing
- Short-lived access tokens
- Opaque refresh tokens
- httpOnly refresh-token cookies
- Refresh-token rotation
- Refresh-token reuse detection
- Token-family revocation
- Password-reset invalidation
- Token-version based session invalidation
- Email verification
- Role-based authorization

### Request Security

- SameSite cookies
- CORS allowlist
- `X-Requested-With` request protection
- Rate limiting
- Structured validation with Zod
- Request IDs
- Centralized error handling

### Error Contract

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {},
    "requestId": "..."
  }
}
```

---

# Data Integrity

The database is treated as part of the application's business-logic layer.

Important invariants are enforced using database constraints where appropriate:

- Non-negative inventory
- Valid monetary relationships
- Unique business identifiers
- One default address per user
- Payment constraints
- Order-total consistency
- Slot capacity constraints

---

# Money Model

All monetary values are represented internally as **integer paise**.

```text
₹499.00
   │
   ▼
49900 paise
```

Floating-point rupee calculations are avoided inside the commerce engine.

The canonical money utilities live in:

```text
packages/shared/src/money.ts
```

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- Lucide Icons

## Backend

- Node.js
- Express
- TypeScript
- Zod
- Pino
- Argon2

## Database

- PostgreSQL 16
- Prisma ORM

## Payments

- Cashfree Payments
- UPI QR
- Payment webhooks

## Testing

- Vitest
- Supertest
- Playwright

## Infrastructure

- Docker
- Docker Compose
- pnpm workspace monorepo

---

# Monorepo Architecture

```text
grovia/
│
├── apps/
│   ├── api/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── address/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── cart/
│   │   │   ├── catalog/
│   │   │   ├── coupon/
│   │   │   ├── delivery/
│   │   │   ├── intelligence/
│   │   │   ├── notification/
│   │   │   ├── order/
│   │   │   ├── payment/
│   │   │   ├── quote/
│   │   │   └── review/
│   │   ├── prisma/
│   │   └── tests/
│   │
│   └── web/
│       ├── src/
│       │   ├── api/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── layouts/
│       │   ├── pages/
│       │   ├── store/
│       │   └── styles/
│       └── public/
│
├── packages/
│   └── shared/
│       ├── schemas/
│       ├── enums.ts
│       ├── money.ts
│       └── design-tokens.ts
│
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

---

# Seeded Development Environment

The development database contains a realistic commerce dataset.

Current catalog and operational data include:

- **10 active grocery categories**
- **160+ product records**
- Product inventory
- Product images
- Customer accounts
- Admin account
- Delivery-partner accounts
- Delivery-slot templates and instances
- Coupons
- Seeded order history
- Product reviews
- Rating aggregates
- Purchase-history signals
- Product association data

The seed system uses a fixed PRNG seed so generated purchase patterns remain reproducible.

Seeded development accounts use:

```text
Password: Grovia@123
```

> Development credentials are intended only for the local seeded environment.

---

# Product Catalog

The catalog is organized into:

```text
Fruits & Vegetables
Dairy
Bakery
Beverages
Snacks
Staples
Rice & Grains
Personal Care
Household
Frozen Foods
```

Product records include:

- Name
- Brand
- Unit
- MRP
- Selling price
- Discount
- Category
- Nutrition metadata
- Tags
- Images
- Inventory
- Rating aggregates

---

# Delivery Architecture

```text
Customer
   │
   ▼
Delivery slot
   │
   ▼
Order confirmed
   │
   ▼
Packing
   │
   ▼
Ready for pickup
   │
   ▼
Delivery partner
   │
   ├── Accept
   ├── Pickup
   ├── Complete
   └── Fail with note
   │
   ▼
Delivered
```

Delivery partners operate through role-specific workflows while customers receive order-status updates.

---

# Frontend Architecture

```text
Pages
  ↓
API endpoint layer
  ↓
Axios client
  ↓
Authentication/session handling
  ↓
REST API
```

TanStack Query manages server state while Zustand handles client-side session state.

The API client also handles:

- Authorization headers
- Token refresh
- Refresh-request deduplication
- Structured API errors
- Request failures
- Session invalidation

---

# Design System

Grovia follows a dedicated visual system rather than a generic dashboard template.

Design principles:

- Mobile-first grocery experience
- Rounded cards and surfaces
- Strong whitespace hierarchy
- Soft grocery-inspired palette
- Dark typography
- Green accent system
- Responsive product grids
- Image-forward product cards
- Clear price hierarchy
- Minimal checkout friction

Shared design tokens are defined in:

```text
packages/shared/src/design-tokens.ts
```

---

# Running Locally

## Requirements

```text
Node.js 20.11+
pnpm 9+
Docker
Docker Compose
```

Install dependencies:

```bash
pnpm install
```

Create environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Start PostgreSQL:

```bash
pnpm pg:up
```

Apply the database schema:

```bash
pnpm db:migrate
```

Seed development data:

```bash
pnpm db:seed
```

Start the development environment:

```bash
pnpm dev
```

Default services:

```text
Frontend → http://localhost:5173
API      → http://localhost:4000
Postgres → localhost:5433
```

---

# Development Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start frontend and API development servers |
| `pnpm build` | Build all production applications |
| `pnpm typecheck` | Type-check the entire workspace |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run test suites |
| `pnpm pg:up` | Start PostgreSQL |
| `pnpm pg:down` | Stop PostgreSQL |
| `pnpm pg:nuke` | Remove PostgreSQL development container/data |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed deterministic development data |
| `pnpm db:reset` | Reset development database |
| `pnpm db:studio` | Open Prisma Studio |

---

# Environment & Secrets

Environment configuration is validated at application startup.

Secrets are intentionally excluded from source control.

```text
.env
.env.local
```

should remain local.

Example configuration is provided through:

```text
apps/api/.env.example
apps/web/.env.example
```

Cashfree credentials, email credentials, database credentials, and JWT secrets should be supplied through local environment variables rather than committed to Git.

---

# Engineering Principles

### Backend Authority

The browser expresses intent. The server owns business decisions.

### Strong Contracts

Shared schemas and TypeScript contracts reduce frontend/backend drift.

### Database Integrity

Important invariants are enforced close to the data.

### Explicit State Machines

Commerce workflows use controlled state transitions.

### Explainable Intelligence

Recommendations are derived from understandable purchase signals.

### Security by Design

Authentication, authorization, token rotation, validation, and request protection are first-class architecture concerns.

### Product Quality

The goal is to make the entire commerce flow coherent:

```text
Discover
   ↓
Choose
   ↓
Add
   ↓
Checkout
   ↓
Pay
   ↓
Fulfil
   ↓
Deliver
   ↓
Review
   ↓
Reorder
   ↓
Predict
```

---

# Project Status

Grovia is an actively developed portfolio project.

The current implementation includes the core commerce platform, operational workflows, payment architecture, recommendation and intelligence services, and a polished customer-facing interface.

Future work can extend the architecture with additional production infrastructure, observability, deployment automation, richer forecasting, and further operational tooling.

---

# Licence & Assets

The Grovia visual identity is original.

Product and category imagery used by the development application should be reviewed for licensing and attribution requirements before production deployment.

---

## Grovia

**Fresh choices. Everyday.**

A full-stack grocery commerce platform built with React, Node.js, Express, PostgreSQL, Prisma, TypeScript, and data-driven commerce intelligence.
