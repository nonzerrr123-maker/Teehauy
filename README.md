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

`DATABASE_URL` is optional while developing the UI. Without it, Teehauy keeps history and favorites in browser storage. When a database connection and the migrations are available, the same UI also persists server-side.

## Database

1. Create a PostgreSQL/Neon database.
2. Apply `database/001_dream_persistence.sql`.
3. Apply `database/002_auth.sql` to enable accounts and sessions.
4. Put the connection string in `DATABASE_URL` inside `.env.local` or the deployment environment.
5. Never commit the real connection string.

Guest sessions are represented by a random browser token. The server hashes that token with SHA-256 before using it as the database owner key; the raw token is not written to the persistence tables.

Account sessions use a random opaque token stored in an HttpOnly, SameSite=Lax cookie. Only a SHA-256 hash of the session token is stored in PostgreSQL. Passwords are stored as salted scrypt hashes. When a guest registers or signs in, persisted guest dream history/favorites from that browser are claimed by the account so the history is not lost.

## Current flow

- ตีเลขฝันจากข้อความหรือหมวดยอดนิยมผ่าน `/api/dream/interpret`
- หน้าผลการตีเลข + favorite/share
- คลังฝันพร้อมค้นหาและกรองหมวด
- ประวัติและรายการโปรด พร้อม local fallback และ database sync
- สมัครสมาชิก / เข้าสู่ระบบ / ออกจากระบบจากหน้าโปรไฟล์
- เมื่อเข้าสู่ระบบ ประวัติใหม่จะผูกกับบัญชีแทน guest browser identity
- สถิติหวยย้อนหลังผ่าน provider API พร้อม fallback เมื่อ provider ยังไม่ได้ตั้งค่า
- โปรไฟล์และการตั้งค่าการแจ้งเตือน

## API

### Dream

- `POST /api/dream/interpret` — validate + interpret a dream, optionally persist it
- `GET /api/dream/history` — load history and favorites for the signed-in account or guest identity
- `POST /api/dream/favorite` — add/remove a persisted interpretation from favorites

### Auth

- `POST /api/auth/register` — create an account, claim guest data, and create a session
- `POST /api/auth/login` — authenticate, claim guest data, and create a session
- `GET /api/auth/session` — read current account session
- `POST /api/auth/logout` — revoke the current session and clear the cookie

## Quality checks

GitHub Actions runs `npm run lint` and `npm run build` for `main`, feature branches, and pull requests. Vercel also builds the latest `main` commit.
