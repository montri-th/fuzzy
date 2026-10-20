# Landometer fuzzy search lab

เว็บทดลอง CityMETER ที่แยกการค้นพื้นที่ การค้นศาสนสถาน และการตีความประเภทข้อมูล พร้อมแผนที่ การเปรียบเทียบผลเดิม และวงจรรับคำร้อง → คนตรวจ → กรณีทดสอบ → AI แก้ → ตรวจการถดถอยก่อนเผยแพร่

โค้ดนี้เป็นเว็บแยก ไม่ได้เปลี่ยน production ของ `landometer.com`.

## ข้อมูลและขอบเขต

- ชื่อพื้นที่จริงจาก CityMETER 17,062 รายการ
- ศาสนสถานตัวอย่างจริง 1,491 แห่ง จาก 126 ตำบล/แขวงใน 77 จังหวัด เป็น purposive sample ไม่ใช่ข้อมูลครบทั้ง 51,901 ระเบียน
- ผล area search เดิมจริง 15 คำ ณ 21 ตุลาคม 2569 คำอื่นเปรียบเทียบกับวิธีเดิมที่จำลองบน corpus เดียวกัน
- ชื่อ ID พิกัด ศาสนา และบริบทพื้นที่มาจาก source ไม่สร้างชื่อหรือพิกัดเติม

ดู [source audit](data/source-audit.md), [algorithm contract](algorithm-contract.md), [review](site/review.html) และ [investigation playbook](docs/investigation-playbook.md).

## ใช้งานและตรวจ

ใช้ Node.js 24:

```sh
npm ci
npm run check
npx netlify dev
```

`npm run check` ตรวจ unit/API adapter tests และกรณีค้นหา 40 กรณีที่ตรึงคำตอบไว้ การผ่านชุดนี้ไม่ได้หมายถึงความแม่นยำ production ของผู้ใช้ทุกคำ การตรวจ SQL เพิ่มใช้ PostgreSQL/PGlite; ผลอยู่ใน `evidence/backend-postgres-validation.json` และไม่แทนการตรวจ managed database ที่ deploy จริง

## Hosting

ตั้งค่า Netlify ผ่าน `netlify.toml`: publish `site/`, Functions `netlify/functions/`, migrations `netlify/database/migrations/`. ใช้ `@netlify/database` และ migration ที่ commit แล้ว ห้ามแก้ migration หลัง apply และห้ามเปลี่ยน hosted schema โดยตรง

โปรเจกต์ที่เจ้าของอนุญาต: `landometer-fuzzy` ในทีม Montri. ต้องเชื่อม GitHub repository นี้ผ่านบัญชีที่มีสิทธิ์ในโปรเจกต์ก่อน deployment. เก็บ `.netlify/` นอก Git.

ตั้ง server-side environment variables ก่อนเผยแพร่:

- `FUZZY_ADMIN_TOKEN`: รหัสสุ่มอย่างน้อย 32 ตัว เก็บเป็น secret เฉพาะ Functions ห้ามใส่ใน Git หรือ client bundle
- `FUZZY_ALLOWED_ORIGINS`: exact HTTPS origin ของเว็บที่อนุญาต เช่น `https://landometer-fuzzy.netlify.app`

Backend ใช้เฉพาะ `/api/search-service`; default function alias ตอบ 404. ต้องตรวจ managed DB provisioning/migration, บันทึก–อ่านกลับ, persistence หลัง redeploy และ Netlify rate-limit postprocessing บน deployment จริงก่อนอ้างว่า backend พร้อมใช้งาน

## สถิติและคำร้อง

สถิติเก็บผลลัพธ์ จำนวนผล เวลา และรุ่นของระบบ โดยไม่เก็บคำค้นดิบ IP หรือบัญชีใน application records. ผู้ให้บริการ hosting อาจมี transport/access logs ตามบริการของตน

คำค้นดิบ ตัวกรอง และข้อความบ่นจะถูกเก็บเมื่อผู้ใช้กดส่งคำร้องเท่านั้น หน้าหลังบ้าน `admin.html` ต้องใช้รหัสแอดมินที่เจ้าของเป็นผู้จัดการ ไม่เก็บรหัสใน URL หรือ browser storage

คนตรวจต้องระบุสาเหตุ ยืนยัน ID จริงหรือยืนยันว่าควรไม่พบ และตรวจข้อมูลส่วนตัวก่อน export เป็นกรณีทดสอบ การคลิกผลหรือข้อความร้องเรียนไม่เป็น gold label อัตโนมัติ กรณีที่ export ยังเป็นไฟล์ส่วนตัว ต้องตรวจ/ตัดข้อมูลส่วนตัวอีกครั้งก่อนใช้ใน repository สาธารณะ

```sh
node scripts/import-reviewed-cases.mjs path/to/private-export.json
REVIEWED_CASES_FILE=.private/reviewed-cases.json npm run test:regression
```

ตัวนำเข้าเขียนเฉพาะ `.private/` ที่ Git ignore และไม่ commit ให้อัตโนมัติ ชุดทดสอบเดิมห้ามหายหรือเปลี่ยนคำตอบเพื่อทำให้ผ่าน CI ตรวจเทียบกับ base commit ใน pull request. การแก้ gold label ที่คนยืนยันว่าผิดต้องมีหลักฐานการแก้และ maintainer approval แยกจากการปรับ search

ผู้ดูแลลบคำร้องและประวัติจาก active database ได้ โดยยืนยันรายการและ version. การลบไม่ลบไฟล์ export หรือ provider backups. รุ่นนี้ไม่มีการลบอัตโนมัติ; ต้องกำหนดนโยบาย retention ก่อนขยายการใช้งาน

## Design และ dependencies

ใช้ Landometer Design System 0.9.7 (`v0.9.7-owner.1`), fonts และ portfolio icon set ที่ส่งพร้อม package. ใช้ governed live-text identity `Landometer`; ไม่ใช้ artwork ที่ role ยังเป็น candidate. แผนที่ Leaflet 1.9.4 + OpenStreetMap พร้อม attribution; CSS ของ controls ปรับเป็น semantic UI tokens และไม่เปลี่ยนพิกเซลของแผนที่

Package integrity กับ artifact/runtime QA เป็นคนละขอบเขต งานนี้ไม่อ้าง formal signed LDS certification หรือการเปิดใช้ทั้ง ecosystem
