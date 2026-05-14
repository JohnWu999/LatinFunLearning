# LatinFun Platform Foundation

This document tracks the stage 1-5 foundation now added around the original static site.

## Local Database

The target database is PostgreSQL.

```bash
cp .env.example .env
```

If Docker Compose is available:

```bash
docker compose up -d postgres
```

If only the Docker CLI is available, start Docker Desktop first, then use an equivalent `docker run` command or install the compose plugin.

After PostgreSQL is reachable:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Default seeded admin:

```txt
admin@latinfun.local
LatinFun123!
```

## Seeded Legacy Data

The extraction script reads:

- `ce2-battle.html`
- `vocab-practice.html`
- `vocab_practice_data.js`
- `Learning.html`

It writes:

- `data/legacy/caesars-english-ii.course.json`
- `data/legacy/manifest.json`

Current extraction summary:

- 77 stems
- 99 vocabulary items
- 20 lessons
- 395 exercises
- 7 game levels

## Student Loop

Implemented:

1. Register or login.
2. Open `/dashboard`.
3. Pick a course.
4. Start a lesson practice page.
5. Submit answers.
6. Correct/incorrect attempts are stored.
7. Wrong answers are added to `/mistakes`.
8. Progress is visible at `/progress`.

## Legacy Experience Replica

The authenticated student dashboard now preserves the original static site's four user-facing modules:

- `完整词汇资料`: complete stems, vocabulary, exercises, and answer keys.
- `精简练习册`: quick lesson-by-lesson review workbook.
- `单词闯关`: level map, fill/find/match/true-false/build/blitz/Boss modes, combo scoring, wrong-item practice, and audio feedback.
- `词汇练习`: 20 lessons with matching, context selection, synonym, antonym, instant feedback, answer reveal, scoring, and database-backed attempts.

## API Surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET/PATCH /api/profile`
- `GET /api/courses`
- `GET /api/courses/[courseId]`
- `GET /api/courses/[courseId]/lessons/[lessonId]/exercises`
- `POST /api/attempts`
- `GET /api/mistakes`
- `GET /api/progress`
- `GET /api/health`
