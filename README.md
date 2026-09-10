# Teehauy

Teehauy คือเว็บแอป mobile-first สำหรับตีเลขจากความฝัน เก็บเลขและสลากตามงวด ติดตามผลรางวัล และแลกเปลี่ยนชุดเลขในชุมชน

## Stack

- Next.js 16 App Router, React 19 และ TypeScript
- Tailwind CSS 4 และ shadcn/ui
- Supabase Database, Auth และ Storage
- Recharts สำหรับกราฟสถิติ
- Vercel สำหรับ production และ preview deployments

## ฟีเจอร์ปัจจุบัน

- Google Login และ Guest Login ผ่าน Supabase Anonymous Auth
- เชื่อมบัญชี Guest เดิมกับ Google โดยเก็บข้อมูลเดิมไว้
- ตีเลขจากข้อความความฝัน บันทึกผล และเลือกเผยแพร่สู่ชุมชน
- บันทึกสลากจริง 6 หลัก กำหนดการมองเห็น และตรวจเลขกับผลทางการ
- ผลสลากย้อนหลัง สถิติ และการวิเคราะห์งวดถัดไป
- โพสต์ คอมเมนต์ Like บันทึกโพสต์ และ Follow/Unfollow
- โปรไฟล์สมาชิกสาธารณะพร้อม privacy สำหรับความฝัน ชุดเลข และสลาก
- ธีมสว่าง มืด และตามการตั้งค่าระบบ

## เริ่มต้นในเครื่อง

ต้องใช้ Node.js รุ่นที่รองรับ Next.js 16 และ Supabase project ที่ตั้งค่า Anonymous Auth กับ Google OAuth แล้ว

```bash
npm install
cp .env.example .env.local
npm run dev
```

กำหนดค่าต่อไปนี้ใน `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

เปิด <http://localhost:3000> ห้าม commit secret หรือ service-role key ลง repository

## Supabase

Schema, functions, indexes และ RLS อยู่ใน `supabase/migrations/` ให้นำ migration ใหม่ขึ้นตามลำดับเวลาและตรวจ Security/Performance Advisors ทุกครั้งที่แก้ฐานข้อมูล

หลักสำคัญของข้อมูล:

- Guest เป็น Supabase user จริง ข้อมูลจึงผูกกับ user ID เช่นเดียวกับบัญชี Google
- Anonymous session อยู่กับ browser storage เดิม การ sign out หรือล้างข้อมูลเว็บไซต์ก่อนเชื่อม Google อาจทำให้กู้บัญชี Guest เดิมไม่ได้
- ความฝันและ prediction เป็น private โดยค่าเริ่มต้น
- สลากเป็น private โดยค่าเริ่มต้น และเจ้าของเลือก `followers` หรือ `public` แยกต่อใบ
- ข้อมูลผลรางวัลจะใช้คำนวณหลังผ่านขั้นตอนตรวจสอบแล้วเท่านั้น

รายละเอียด migration และการนำเข้าผลสลากอยู่ที่ [`supabase/README.md`](supabase/README.md)

## Quality checks

```bash
npm run lint
npm test
npm run build
```

GitHub Actions และ Vercel ตรวจ branch/PR ก่อนนำ `main` ขึ้น production
