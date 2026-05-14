# LatinFun Learning

Next.js learning platform for Caesar's English II, upgraded from the original static LatinFun HTML pages.

## What Is Included

- Multi-user login and registration.
- PostgreSQL persistence through Prisma.
- User profile, attempts, mistakes, and progress tracking.
- Seeded Caesar's English II course data extracted from the original static pages.
- Four student modules matching the original experience:
  - 完整词汇资料
  - 精简练习册
  - 单词闯关
  - 词汇练习

## Quick Start

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000/dashboard`.

If port 3000 is already occupied:

```bash
npm run dev -- --port 3017
```

## Seeded Test Accounts

```txt
student@latinfun.local
LatinFun123!
```

```txt
admin@latinfun.local
LatinFun123!
```

## Local Environment

`.env.example` is configured for the included Docker Compose PostgreSQL service:

```txt
DATABASE_URL="postgresql://latinfun:latinfun@localhost:5432/latinfun?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
```

Use a long unique `AUTH_SECRET` outside local development.

## Useful Scripts

```bash
npm run dev          # Start Next.js development server
npm run build        # Generate Prisma client and build Next.js
npm run typecheck    # TypeScript check
npm run db:migrate   # Apply Prisma migrations locally
npm run db:seed      # Seed course and test users
npm run extract:legacy
```

## Legacy Source Files

The original static pages remain in the repository:

- `index.html`
- `Learning.html`
- `ce2-battle.html`
- `vocab-practice.html`
- `vocab_practice_data.js`
- `word-challenge.html`

The structured seed data lives in `data/legacy/`.
