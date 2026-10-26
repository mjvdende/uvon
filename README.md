# UVON Noord-Brabant Platform

A modern full-stack web platform for **UVON (Unie van Vrouwelijke Ondernemers) Noord-Brabant**, built with Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Prisma, PostgreSQL, and NextAuth.js.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ or v22+)
- [Docker Desktop](https://www.docker.com/) (for running local PostgreSQL container)

### 2. Clone & Install Dependencies
```bash
git clone git@github.com:mjvdende/uvon.git
cd uvon
npm install
```

### 3. Start Local PostgreSQL Database
The repository includes a ready-to-use `docker-compose.yml` for PostgreSQL:
```bash
docker compose up -d
```
*(Note: If you have an old `dev.db` file in the root directory, it was from a legacy SQLite prototype. The current application uses PostgreSQL via `@prisma/adapter-pg` matching the configuration in `.env`)*.

### 4. Push Database Schema & Seed Data
Initialize the database tables and populate sample members, events, registrations, and documents:
```bash
# Push schema to local database
npx prisma db push

# Populate with mock members, events, and documents
npx tsx prisma/seed.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Suite

### Unit & Integration Tests (Fast, ~1.3s)
Tests authentication sentinels, password hashing, and API route validation without external browser overhead:
```bash
npm test
```

### End-to-End (E2E) Browser Tests (Playwright)
Spins up headless Chromium to verify real browser rendering, member search filtering, event navigation, archive listing, and contact forms:
```bash
npm run test:e2e
```

---

## 📂 Key Architecture & Documentation

- **[FEATURES.md](FEATURES.md)**: The single source of truth for all domain models, business workflows, view matrices, and business rules (Specification-Driven Development).
- **[AGENTS.md](AGENTS.md)**: Onboarding and technical guidelines for AI agents and human developers (Next.js 16 conventions, Prisma 7 Pg adapter rules, NextAuth credentials, etc.).
- **[docs/deployment.md](docs/deployment.md)**: Production deployment instructions for hosting on **Vercel** ($0/month) paired with DNS & email at **mijn.host**.

---

## 🛠️ Common Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts local Next.js Turbopack dev server on `http://localhost:3000` |
| `npm run build` | Compiles production build and validates TypeScript across all routes |
| `npm run lint` | Runs ESLint 9 checks |
| `npm test` | Runs unit & route validation tests (`tests/**/*.test.ts`) |
| `npm run test:e2e` | Runs Playwright browser E2E tests (`e2e/**/*.spec.ts`) |
| `npx prisma generate` | Regenerates Prisma Client adapter after schema updates |
| `npx prisma db push` | Pushes schema directly to the database without manual migration files |
| `npx tsx prisma/seed.ts` | Populates database with initial mock users, events, and documents |
