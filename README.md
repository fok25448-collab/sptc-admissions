# SPTC Admissions — ย้ายจาก Google Apps Script ไป Vercel + Supabase

ชุดโค้ด v1.0.0 สำหรับนำขึ้น GitHub และ Deploy บน Vercel โดยใช้ Supabase จัดเก็บข้อมูลและไฟล์เอกสาร

## สิ่งที่คงไว้และเปลี่ยน

คงโครง HTML เนื้อหา สี ฟอนต์ การจัดวาง และขั้นตอนสมัคร 4 ขั้นตอนจากไฟล์เดิม แยกเมนูไว้ที่ `src/partials/nav.html` และส่วนท้ายแบบเต็ม/แบบย่อไว้ในโฟลเดอร์เดียวกัน ส่วนท้ายหน้า “ติดต่อเรา” ยังเป็นแบบย่อเหมือนต้นฉบับ ทุกหน้าถูกประกอบตอน build จึงไม่ต้องรอโหลดเมนูด้วย JavaScript

- เปลี่ยน `google.script.run` เป็น API บน Vercel และ Supabase
- หลักสูตรทุกหน้าอ่านจากตารางเดียวกัน ไม่มีข้อมูลตัวอย่างแทรกเมื่อเชื่อมต่อไม่ได้
- บันทึกใบสมัครและข้อความติดต่อจริง พร้อมป้องกันคำขอซ้ำ
- แนบเอกสาร PDF/JPG/PNG ไม่เกิน 5MB ไปยังพื้นที่ส่วนตัวของ Supabase Storage
- ตรวจชนิดไฟล์ ขนาด ลายเซ็นไฟล์ และ SHA-256 ก่อนบันทึกใบสมัคร
- เลขใบสมัครสร้างจากฐานข้อมูล ไม่มีการสุ่มเลขในเบราว์เซอร์
- บันทึกแบบร่างบนอุปกรณ์เมื่อกดปุ่ม เก็บไม่เกิน 7 วัน เอกสารต้องเลือกใหม่หลังเปิดหน้าอีกครั้ง
- แก้โหลดเพิ่มเติม ตัวนับหลักสูตร การกดถัดไปรัว ๆ และการแสดงข้อผิดพลาดของฟอร์ม
- จัดเก็บฟอนต์ Kanit และ Font Awesome 6.4.0 ไปกับไฟล์ build ลดการพึ่งพา CDN โดยใช้ตระกูลฟอนต์และไอคอนเดิม
- รวม Tailwind เป็น CSS ตอน build ใช้เวอร์ชัน 3.4.17 ที่ล็อกไว้ ไม่เรียกตัวประมวลผล Tailwind CDN ขณะเปิดเว็บ

**ข้อจำกัดของต้นฉบับ:** ไม่มีไฟล์ `.gs`, `js_global.html` หรือข้อมูลฐานเดิมแนบมา จึงสร้าง API และการโหลดการ์ดหน้าแรกทดแทน ส่วนการ์ดหน้าแรกที่เคยสร้างด้วย `js_global.html` ไม่สามารถเทียบหน้าตาเดิมแบบพิกเซลต่อพิกเซลได้ ข้อมูลหลักสูตรในฟอร์มเดิมมีเพียง 4 รายการ ส่วน 8 รายการในหน้าหลักสูตรระบุเป็น sample จึงไม่ได้นำตัวอย่างนั้นไปเปิดรับสมัครจริง

## 1. เตรียม Supabase

1. สร้าง Supabase Project สำหรับเว็บไซต์นี้
2. เปิด **SQL Editor** แล้วรันตามลำดับ:
   - `supabase/001_schema.sql`
   - `supabase/002_courses.sql`
3. ตรวจใน **Table Editor** ว่ามี `courses`, `site_settings`, `applications`, `contact_messages` และ `api_rate_limits`
4. ตรวจใน **Storage** ว่ามี bucket `admission-documents` และเป็น **Private**
5. เก็บ Project URL และ **service_role key (JWT จาก Legacy API Keys)** ไว้ใช้ใน Vercel เท่านั้น ห้ามนำคีย์นี้ใส่ HTML, JavaScript ฝั่งผู้ใช้ หรือ commit ลง GitHub

ตารางและฟังก์ชันเขียนข้อมูลไม่เปิดให้ `anon` หรือ `authenticated` เข้าถึง API ใช้สิทธิ์ฝั่งเซิร์ฟเวอร์ การอ่าน/แก้ไขของเจ้าหน้าที่ใช้ Supabase Dashboard ในรุ่นนี้ ยังไม่มีหน้าแอดมินใหม่

## 2. ตรวจข้อมูลจริงก่อนเปิดรับสมัคร

ใน `courses` เติมรายการที่ขาด และตรวจชื่อ ระดับ ระบบการศึกษา จำนวนรับ รูป และรายละเอียดก่อนเปิดรับ แต่ละระดับ/ระบบต้องเป็นค่าต่อไปนี้:

| คอลัมน์ | ค่า |
|---|---|
| `level` | `ปวช.` / `ปวส.` / `ปริญญาตรี` |
| `system` | `ระบบปกติ` / `ระบบทวิภาคี` |
| `published` | `true` เพื่อแสดงบนเว็บ |
| `accepting_applications` | `true` เพื่อให้สมัครหลักสูตรนั้นได้ |
| `quota` | จำนวนรับต่อปีการศึกษา |
| `image` | URL รูปภาพแบบ HTTPS |
| `duration`, `tuition`, `jobs` | ข้อความจริงที่แสดงในรายละเอียดหลักสูตร |
| `positions` | JSON array เช่น `["ช่างเทคนิค", "ช่างซ่อมบำรุง"]` |

สคริปต์เริ่มต้นตั้ง `admissions_open=false` และยังไม่เปิดรับในแต่ละหลักสูตร เพราะไม่มีข้อมูลยืนยันรายการรับสมัครปัจจุบัน เมื่อข้อมูลพร้อม ให้แก้ `site_settings.admission_year` และ `site_settings.admissions_open` รวมทั้ง `courses.accepting_applications` ตามหลักสูตรที่เปิดจริง ตัวอย่างสำหรับเปิดหลักสูตรเดียว:

```sql
update public.site_settings
set admission_year = 2569, admissions_open = true
where id = 1;

update public.courses
set accepting_applications = true
where id = 'P001';
```

เก็บข้อความประชาสัมพันธ์เดิม รวมถึงปี **2567** และสถิติต่าง ๆ ไว้ตามคำขอ จึงต้องปรับข้อความปี/สถิติ/ข้อมูลติดต่อใน `src/pages` ให้ตรงกับประกาศจริงก่อนเผยแพร่ ข้อมูลเหล่านี้ไม่ได้ยืนยันจากเอกสารปัจจุบัน ลิงก์ข้อกำหนดและนโยบายในหน้าสมัครเดิมเป็น `#` ให้ใส่ URL เอกสารจริงของวิทยาลัยก่อนเปิดรับสมัคร ไม่ได้สร้างนโยบายของวิทยาลัยขึ้นเอง

## 3. ทดสอบบนเครื่อง

ติดตั้ง Node.js 22 ขึ้นไป แล้วเปิด Terminal ในโฟลเดอร์ที่มี `package.json`:

```bash
npm ci
```

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอก:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_JWT
APP_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
APP_ORIGIN=http://localhost:3000
```

สร้าง APP_SECRET ด้วย:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

รัน:

```bash
npm run dev
```

เปิด `http://localhost:3000` การแก้ไฟล์ต้อง build ใหม่หรือเริ่ม dev server ใหม่ รุ่นนี้ตั้งใจใช้โครง HTML เดิมโดยไม่ย้ายไป React/Next.js

## 4. นำขึ้น GitHub

สร้าง repository ว่างชื่อเช่น `sptc-admissions` แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์โครงการ รวม `package.json`, `package-lock.json`, `vercel.json`, `src`, `public`, `server`, `api`, `scripts` และ `supabase`

ไม่อัปโหลด `.env.local`, `node_modules`, `dist`, `test-results` หรือไฟล์ข้อมูลผู้สมัคร `.gitignore` จัดเตรียมไว้แล้ว

หากใช้ Git ในเครื่อง:

```bash
git init
git add .
git commit -m "Migrate admissions site to Vercel and Supabase"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/sptc-admissions.git
git push -u origin main
```

## 5. Deploy บน Vercel

1. เพิ่ม Project โดย Import repository จาก GitHub
2. Framework Preset: **Other**
3. Root Directory: โฟลเดอร์ที่มี `package.json` (ถ้าอัปโค้ดไว้ในโฟลเดอร์ย่อย ให้เลือกโฟลเดอร์นั้น)
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. เพิ่ม Environment Variables ทั้ง 4 ตัวเหมือน `.env.local` แต่เปลี่ยน `APP_ORIGIN` เป็น URL จริง เช่น `https://sptc-admissions.vercel.app` โดยไม่มี `/` ต่อท้าย
7. Deploy แล้วเปิดทั้ง 4 หน้าและทดลองส่งใบสมัครทดสอบ

ถ้า URL ยังไม่ทราบ ให้ Deploy เพื่อรับ URL ก่อน จากนั้นตั้ง `APP_ORIGIN` ให้ตรงและ **Redeploy** อีกครั้ง API จะปฏิเสธการเขียนจากโดเมนที่ไม่ตรงค่าดังกล่าว หากเปลี่ยนเป็น custom domain ต้องเปลี่ยนค่านี้ตามด้วย สำหรับ Preview Deployment ให้ใช้ origin ของ Preview ที่กำลังทดสอบ ไม่ใช่ production

ใช้ Supabase Project แยกสำหรับทดสอบหากไม่ต้องการให้ข้อมูลทดสอบปะปนข้อมูลจริง

## 6. ตรวจหลังติดตั้ง

- หน้าแรกและหน้าหลักสูตรแสดงข้อมูลจาก Supabase; เมื่อ API ล่มจะแจ้งข้อผิดพลาดและให้ลองใหม่
- ปุ่มโหลดเพิ่มเติมแสดงรายการสะสม ตัวกรองและตัวนับถูกต้อง
- เลือกหลักสูตรจากป๊อปอัปแล้วไปหน้าสมัครยังคงเลือกหลักสูตรนั้น
- ทดสอบส่งใบสมัครพร้อมเอกสาร แล้วตรวจแถวใน `applications` และไฟล์ `documents/` ใน Storage
- ส่งคำขอเดิมซ้ำต้องได้เลขเดิม ไม่เพิ่มแถว; เลขบัตรเดิมในปีเดียวกันสมัครซ้ำไม่ได้
- หลักสูตรเต็ม/ปิดรับต้องไม่บันทึกสำเร็จ จำนวนรับนับ `pending` และ `accepted` ไม่รวม `rejected`/`cancelled`
- ข้อความติดต่อเข้าตาราง `contact_messages`; รุ่นนี้เป็นกล่องข้อความในฐานข้อมูล **ไม่ได้ส่งอีเมลแจ้งเตือนเจ้าหน้าที่อัตโนมัติ**
- บันทึกแบบร่าง ปิดแล้วเปิดหน้าใหม่บนอุปกรณ์เดิม และแนบไฟล์อีกครั้ง
- ตรวจภาพ ฟอนต์ ข้อมูลติดต่อ และลิงก์นโยบายจริง

## 7. การดูแลระบบ

ไฟล์อัปโหลดชั่วคราวอยู่ใน `staging/` ส่วนไฟล์ที่ยืนยันแล้วอยู่ใน `documents/` เป็นคนละไฟล์ เพื่อให้ลิงก์อัปโหลดชั่วคราวแก้ไขเอกสารที่บันทึกแล้วไม่ได้

หากการเชื่อมต่อขาดช่วงหลังบันทึก ระบบเก็บไฟล์ไว้ให้ลองคำขอเดิมใหม่ การล้างไฟล์ค้างใช้:

```bash
npm run cleanup
```

คำสั่งนี้ใช้คีย์ใน `.env.local` และลบเฉพาะไฟล์เก่ากว่า 3 วันใน `staging/` และไฟล์ `documents/` ที่ไม่มีใบสมัครอ้างอิง รวมถึงข้อมูล rate limit เก่า ไม่ลบเอกสารที่มีใบสมัครอ้างอิง ห้ามลบแถว `storage.objects` ตรง ๆ เพราะไม่ใช่การลบไฟล์จริงผ่าน Storage API

คำขอที่ร่างในหน้าเว็บเกินอายุ 24 ชั่วโมงควรโหลดหน้าใหม่แล้วส่งอีกครั้ง การจำกัดคำขอเป็นราย IP ต่อนาที จึงอาจกระทบผู้ใช้ที่ใช้เครือข่ายเดียวกันจำนวนมาก ปรับค่าจำนวนใน API ให้เหมาะกับวันรับสมัคร และตั้งกฎป้องกันทราฟฟิกผิดปกติใน Vercel ตามการใช้งานจริง

## โครงสร้างไฟล์

| ที่อยู่ | หน้าที่ |
|---|---|
| `src/pages/` | เนื้อหาหน้าเดิม 4 หน้า |
| `src/partials/` | เมนู ส่วนท้าย และส่วนหัวสไตล์กลาง |
| `src/styles/` | CSS เดิมแยกตามหน้า |
| `public/assets/` | JavaScript หน้าเว็บและตัวเรียก API กลาง |
| `api/` | Vercel Functions |
| `server/core.js` | ตรวจข้อมูล ลายเซ็นคำขอ ติดต่อ Supabase และจำกัดคำขอ |
| `supabase/` | SQL ติดตั้งตาราง สิทธิ์ ฟังก์ชัน และข้อมูลหลักสูตรตั้งต้น |
| `scripts/` | Build, local server, ตรวจไฟล์ และล้างไฟล์ค้าง |
| `tests/` | การทดสอบ API ฐานข้อมูล และเบราว์เซอร์ |
| `docs/VALIDATION.md` | ผลตรวจและขอบเขตที่ยังต้องตรวจบนระบบจริง |

## คำสั่งทดสอบ

```bash
npm run build
npm run check
npm test
npx playwright install chromium
npx playwright test
```

การทดสอบฐานข้อมูลใช้ PostgreSQL ผ่าน PGlite ในเครื่อง และการทดสอบเบราว์เซอร์จำลอง API เพื่อไม่สร้างข้อมูลส่วนบุคคลจริง ยังต้องทดสอบกับ Supabase/Vercel ของเจ้าของระบบหลังตั้งค่าบัญชีจริง

แหล่งอ้างอิงสถาปัตยกรรม: [ข้อจำกัด Vercel Functions](https://vercel.com/docs/functions/limitations) ใช้การอัปโหลดตรงไป Storage เพื่อไม่ส่งไฟล์ 5MB ผ่าน request body ของ Vercel; รูปแบบ signed upload ตรวจเทียบกับซอร์ส `@supabase/storage-js` รุ่น 2.116.0
