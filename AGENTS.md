# AGENTS.md — UVON Noord-Brabant Platform Guide

Welcome to the **UVON Noord-Brabant** codebase. This guide is tailored for AI agents and human developers to understand the architecture, data models, business workflows, coding conventions, and operational recipes quickly and accurately.

---

## 1. Project Overview & Domain

**UVON (Unie van Vrouwelijke Ondernemers) Noord-Brabant** is a networking association for female entrepreneurs and executive professionals in the Noord-Brabant region (Netherlands).

This application is a modern full-stack web platform replacing a legacy WordPress setup. It serves two main audiences:
1. **Public Visitors & Prospective Members:**
   - Explore information about the network, board, and committee.
   - View upcoming and archived monthly events/dinners.
   - Register for events (free or paid) as a member or guest.
   - Apply for membership (`/leden/lid-worden`).
   - Submit contact inquiries (`/contact`).
2. **Logged-in Members & Board Admins:**
   - Member directory with company and profile details (`/leden`).
   - Profile management with avatar and password updates (`/leden/profiel`).
   - Member documents (meeting minutes ALV, financial statements) categorized in the portal.
   - Dedicated Admin Portal (`/admin`) for board members to manage events, registrations, members/applications, and association documents.

---

## 2. Tech Stack & Key Versions

| Layer / Concern | Technology | Version / Notes |
| :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org) (App Router, Turbopack) | `16.2.9` |
| **UI Library** | [React](https://react.dev) | `19.2.4` |
| **Language** | [TypeScript](https://www.typescriptlang.org) | `^5` (strict mode enabled) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) | `^4.0` (using `@tailwindcss/postcss` and CSS theme variables) |
| **Icons** | [Lucide React](https://lucide.dev) | `^0.577.0` |
| **ORM & Database** | [Prisma](https://www.prisma.io) with PostgreSQL adapter | `^7.8.0` (`@prisma/client`, `@prisma/adapter-pg`, `pg` `^8.23.0`) |
| **Authentication** | [NextAuth.js](https://next-auth.js.org) | `^4.24.14` (Credentials Provider + JWT sessions) |
| **Payments** | [Mollie API](https://docs.mollie.com) | `@mollie/api-client` `^4.5.0` (with built-in local sandbox fallback) |
| **Email Delivery** | [Nodemailer](https://nodemailer.com) | `^7.0.13` (mijn.host SMTP with mock fallback) |
| **Script Runner** | `tsx` | `^4.22.4` (used for Prisma seed scripts) |

---

## 3. Directory Structure

```text
uvon/
├── docs/
│   └── deployment.md          # Production deployment guide (Vercel + PostgreSQL + mijn.host)
├── prisma/
│   ├── schema.prisma          # PostgreSQL schema (User, Event, Registration, Document)
│   ├── seed.ts                # Database seeder with mock members, events & documents
│   └── migrations/            # Prisma migration history
├── prisma.config.ts           # Prisma 7 configuration file (migration connection URL)
├── public/                    # Static assets, logos, favicon
├── src/
│   ├── app/                   # Next.js App Router routes & API endpoints
│   │   ├── admin/             # Board management dashboard (/admin)
│   │   ├── api/
│   │   │   ├── admin/         # Protected admin CRUD: /events, /members, /documents
│   │   │   ├── auth/          # NextAuth catch-all handler: [...nextauth]
│   │   │   ├── contact/       # Contact form email dispatcher
│   │   │   ├── events/        # Event registration, Mollie webhook & mock-checkout
│   │   │   └── members/       # Membership application (/apply) & profile update (/update)
│   │   ├── contact/           # Contact page
│   │   ├── evenementen/       # Agenda list, event detail [id], and archive (/archief)
│   │   ├── leden/             # Members directory, /lid-worden, /login, /profiel
│   │   ├── organisatie/       # /bestuur-en-commissies and /privacyverklaring
│   │   ├── globals.css        # Tailwind v4 import & custom CSS color tokens
│   │   ├── layout.tsx         # Root layout with Google Fonts (Inter + Outfit) & Navbar/Footer
│   │   └── page.tsx           # Homepage with hero, upcoming events, pillars, CTA
│   ├── components/            # Reusable UI & client components
│   │   ├── AdminDashboard.tsx # Comprehensive admin panel tabs & modals
│   │   ├── EventRegistrationForm.tsx # Dual-tab event registration (member vs guest)
│   │   ├── Footer.tsx         # Site footer
│   │   ├── MembersList.tsx    # Filterable member cards & modal
│   │   ├── Navbar.tsx         # Responsive header with session indicator & navigation
│   │   ├── ProfileEditForm.tsx# Self-service profile editor
│   │   └── SessionProvider.tsx# Client-side NextAuth SessionProvider wrapper
│   └── lib/
│       └── db.ts              # Singleton PrismaClient initialization with PrismaPg adapter
├── .env                       # Local environment variables template
├── .env.production            # Production environment variables checklist
├── eslint.config.mjs          # ESLint 9 configuration with next/core-web-vitals
├── next.config.ts             # Next.js configuration (remote image patterns for Unsplash)
├── package.json               # Dependencies and npm scripts
├── server.js                  # Custom server for Node/Plesk/Passenger deployments
└── tsconfig.json              # TypeScript compiler configuration
```

---

## 4. Database Schema & Data Models

The Prisma schema is defined in [prisma/schema.prisma](file:///c:/Users/maart/projecten/uvon/prisma/schema.prisma) targeting PostgreSQL.

### Key Models & Enums

1. **`User`**:
   - `id`: UUID (Primary Key).
   - `email`: String (Unique).
   - `passwordHash`: Bcrypt hash OR special status strings (see conventions below).
   - `name`, `companyName`, `businessSector`, `description`, `photoUrl`, `website`, `linkedin`.
   - `role`: Enum `Role` (`MEMBER` or `ADMIN`).
   - `registrations`: Relation `Registration[]`.

2. **`Event`**:
   - `id`: UUID (Primary Key).
   - `title`: String.
   - `description`: Text.
   - `date`: DateTime (Day of event).
   - `startTime`, `endTime`: String (e.g., `"18:00"`, `"21:30"`).
   - `location`: String.
   - `price`: Float (default `0.0`). Free events bypass Mollie.
   - `maxParticipants`: Int? (Optional cap).
   - `imageUrl`: String? (Unsplash or hosted media).
   - `published`: Boolean (default `false`).

3. **`Registration`**:
   - `id`: UUID (Primary Key).
   - `userId`, `eventId`: Foreign keys with compound unique constraint `@@unique([userId, eventId])`.
   - `status`: Enum `RegistrationStatus` (`PENDING`, `PAID`, `FAILED`).
   - `molliePaymentId`: String? (Unique Mollie payment ID or simulated `mock_tr_*`).

4. **`Document`**:
   - `id`: UUID (Primary Key).
   - `title`: String.
   - `fileUrl`: String.
   - `category`: Enum `DocumentCategory` (`MINUTES`, `FINANCIAL`, `OTHER`).
   - `uploadedAt`: DateTime.

### Special Account Conventions

- **Pending Membership Applicants:**
  When a candidate signs up via `/leden/lid-worden` (`/api/members/apply`), their `passwordHash` is set to `"DEACTIVATED_PENDING_APPROVAL"`.
  - Because this is not a valid bcrypt hash, they **cannot** log in until a board admin approves the application in `/admin` and sets their initial credentials.
  - NextAuth explicitly checks for this string and returns a user-friendly Dutch error: *"Uw lidmaatschapsaccount is nog in afwachting van goedkeuring door het bestuur."*
- **Guest Event Registrants:**
  Guests who register for events without existing accounts are created with `passwordHash = "GUEST_USER_NO_PASSWORD"` and `businessSector = "Gast"`. This satisfies relational integrity for the `Registration` model without granting login access.

---

## 5. Core Business Workflows

### A. Event Registration & Mollie Payments
1. **Initiation (`POST /api/events/register`):**
   - User registers as an existing member (email lookup) or guest (creates/reuses guest user).
   - Existing paid registration prevents duplicate sign-ups. Pending/failed registrations are replaced.
   - **Free Events (`price === 0`):**
     - Registration is marked `PAID` immediately.
     - Confirmation email is sent.
     - Responds with `{ success: true, message: "Aanmelding succesvol voltooid." }`.
   - **Paid Events (`price > 0`):**
     - If `MOLLIE_API_KEY` is present and valid: Mollie payment is created with redirect URL to `/evenementen/[id]?payment=success` and webhook URL `/api/events/webhook`.
     - **Mock Fallback (Zero Config):** If `MOLLIE_API_KEY` is missing or in test mode without internet, the app automatically falls back to the built-in simulated sandbox: `/api/events/register/mock-checkout?id=[regId]`.
2. **Payment Webhook / Confirmation:**
   - Webhook (`POST /api/events/webhook`) receives Mollie ID -> checks status (`paid` -> `PAID`, `failed` -> `FAILED`) -> triggers Nodemailer confirmation on success.
   - Mock checkout GET displays a test payment UI; POST processes the outcome and redirects back with confirmation.

### B. Membership Applications & Admin Approval
1. Public applicant fills `/leden/lid-worden`.
2. Request hits `POST /api/members/apply`.
3. Account created with `passwordHash = "DEACTIVATED_PENDING_APPROVAL"`.
4. Admin receives notification email via Nodemailer.
5. Board logs into `/admin` -> Members tab -> Reviews pending applications -> Sets an initial password via `PUT /api/admin/members` -> Applicant can now log in.

### C. Authentication & Access Control
- Handled in [src/app/api/auth/[...nextauth]/route.ts](file:///c:/Users/maart/projecten/uvon/src/app/api/auth/[...nextauth]/route.ts).
- `authorize()` verifies email, rejects pending/deactivated accounts, and validates password with `bcrypt.compare`.
- Session callbacks attach `id` and `role` to JWT token and session object.
- Admin routes (`/admin`, `/api/admin/*`) enforce session verification:
  ```ts
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "ADMIN") { ... }
  ```

### D. Email Notifications (Nodemailer)
- Centralized helper pattern using SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`).
- **Resilient Fallback:** If SMTP environment variables are unset, functions log `[MOCK EMAIL SENT]` without failing or interrupting transactions.

---

## 6. Design System & Styling Guidelines

- **Palette (defined in `globals.css` and CSS theme):**
  - `--uvon-purple`: `#270d36` (Primary brand color, dark violet)
  - `--uvon-lavender`: `#ead5ff` (Soft accent lavender)
  - `--uvon-light`: `#f7f3fb` (Light background tint)
  - `--uvon-dark`: `#12051a` (Deep dark background)
  - `--uvon-accent`: `#9d4edd` (Vibrant purple for interactive accents, hover states)
- **Typography:**
  - Body: `Inter` (`--font-inter`, class `font-sans`)
  - Headings/Titles: `Outfit` (`--font-outfit`, class `font-display`)
- **Tailwind v4 Convention:**
  - Configured via `@import "tailwindcss";` and `@theme` block in `src/app/globals.css`.
  - Utility classes: `.glass`, `.glass-dark`, `.text-gradient`.

---

## 7. Developer & Agent Rules / Best Practices

### Specification-Driven Development (SDD) Protocol
> **CRITICAL RULE FOR ALL AGENTS & DEVELOPERS:**
> 1. **Single Source of Truth:** [FEATURES.md](file:///c:/Users/maart/projecten/uvon/FEATURES.md) is the formal specification for all domain models, core workflows, UI views, and business rules.
> 2. **Spec-First Changes:** Do NOT write or modify application code directly when a new feature or domain change is requested.
> 3. **Propose Spec First:** Always update or propose changes to [FEATURES.md](file:///c:/Users/maart/projecten/uvon/FEATURES.md) first.
> 4. **User Approval Gate:** Wait for the user's explicit approval on the specification before implementing Next.js, React, or Prisma changes.

### Next.js 16 & React 19 Considerations
1. **Page & Route Handler Parameters are Promises:**
   In Next.js 16, dynamic params and searchParams are asynchronous. Always await them:
   ```ts
   // Correct in Next.js 16:
   export default async function Page({ params, searchParams }: {
     params: Promise<{ id: string }>;
     searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
   }) {
     const { id } = await params;
     const search = await searchParams;
   }
   ```
2. **Avoid Synchronous `setState` inside `useEffect`:**
   React 19 flags direct cascading state updates in effects. Compute state during rendering or derive state where possible.
3. **Database Client Singleton:**
   Always import `prisma` from `@/lib/db`. Never create a new `new PrismaClient()` in route handlers.
4. **Prisma 7 Client Generation:**
   Prisma 7 uses the `@prisma/adapter-pg` driver adapter. If you modify `prisma/schema.prisma`, **always** run:
   ```bash
   npx prisma generate
   ```
   before building or running tests.
5. **Linting & Type Safety:**
   - Run `npm run lint` or `npm run build` to validate changes.
   - Avoid `any` in application code wherever practical; define specific interfaces for User, Event, and Registration objects.

---

## 8. Common CLI Commands

```bash
# Start local development server (http://localhost:3000)
npm run dev

# Run production build (validates TypeScript + Turbopack page generation)
npm run build

# Run linting
npm run lint

# Regenerate Prisma Client
npx prisma generate

# Push Prisma schema directly to development PostgreSQL database
npx prisma db push

# Seed the database with initial users, events, and documents
npx tsx prisma/seed.ts

# Run test suite
npm test
```

---

## 9. Environment Variables Checklist

| Variable | Required In | Purpose |
| :--- | :--- | :--- |
| `POSTGRES_PRISMA_URL` | Dev / Prod | Pooled PostgreSQL connection string for Prisma Pg adapter |
| `POSTGRES_URL_NON_POOLING` | Dev / Prod | Direct connection string for Prisma CLI / migrations |
| `NEXTAUTH_SECRET` | Dev / Prod | Secret key for encrypting NextAuth session JWTs |
| `NEXTAUTH_URL` | Dev / Prod | Canonical app URL (e.g. `http://localhost:3000` or production domain) |
| `MOLLIE_API_KEY` | Optional | Mollie payment API key (`test_...` or `live_...`). Falls back to mock if absent |
| `SMTP_HOST` | Optional | SMTP host (e.g. `mail.mijn.host`). Falls back to mock log if absent |
| `SMTP_PORT` | Optional | SMTP port (typically `465` or `587`) |
| `SMTP_USER` | Optional | SMTP username / email address |
| `SMTP_PASSWORD` | Optional | SMTP authentication password |
| `CONTACT_EMAIL_TO` | Optional | Target email for contact submissions (defaults to `info@uvonnoordbrabant.nl`) |

---

*This guide is automatically consulted by coding agents. When adding new modules, schema changes, or third-party integrations, keep this document up to date.*

