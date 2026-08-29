# Teehauy

Next.js implementation of the Dream Lottery Number App UI referenced from Figma Make.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS v4
- Recharts
- Neon/PostgreSQL via `@neondatabase/serverless`

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

`DATABASE_URL` is optional while developing the UI. Without it, Teehauy keeps history and favorites in browser storage. When a database connection and the migration are available, the same UI also persists server-side.

## Database

1. Create a PostgreSQL/Neon database.
2. Apply `database/001_dream_persistence.sql`.
3. Put the connection string in `DATABASE_URL` inside `.env.local` or the deployment environment.
4. Never commit the real connection string.

Guest sessions are represented by a random browser token. The server hashes that token with SHA-256 before using it as the database owner key; the raw token is not written to the persistence tables.

## Current flow

- ตีเลขฝันจากข้อความหรือหมวดยอดนิยมผ่าน `/api/dream/interpret`
- หน้าผลการตีเลข + favorite/share
- คลังฝันพร้อมค้นหาและกรองหมวด
- ประวัติและรายการโปรด พร้อม local fallback และ database sync
- สถิติหวยย้อนหลังแบบตาราง/กราฟ — ตอนนี้ยังเป็นข้อมูลตัวอย่างและระบุไว้ใน UI
- โปรไฟล์และการตั้งค่าการแจ้งเตือน

## API

- `POST /api/dream/interpret` — validate + interpret a dream, optionally persist it
- `GET /api/dream/history` — load history and favorites for the current guest identity
- `POST /api/dream/favorite` — add/remove a persisted interpretation from favorites

## Quality checks

GitHub Actions runs `npm run lint` and `npm run build` for `main`, feature branches, and pull requests.
