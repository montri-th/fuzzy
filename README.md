# Landometer fuzzy search lab

เว็บทดลอง CityMETER ที่แยกการค้นพื้นที่ การค้นศาสนสถาน และการตีความประเภทข้อมูล พร้อมแผนที่ การเปรียบเทียบผลเดิม และวงจรรับคำร้อง → คนตรวจ → กรณีทดสอบ → AI แก้ → ตรวจการถดถอยก่อนเผยแพร่

โค้ดนี้เป็นเว็บแยก ไม่ได้เปลี่ยน production ของ `landometer.com`.

เปิด [เว็บทดลอง](https://landometer-fuzzy.netlify.app/) · [ผล review](https://landometer-fuzzy.netlify.app/review) · [โค้ดบน GitHub](https://github.com/montri-th/fuzzy)

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

โปรเจกต์ที่เจ้าของอนุญาตและเผยแพร่แล้ว: `landometer-fuzzy` ในทีม Montri เชื่อมกับ `montri-th/fuzzy`. URL คือ `https://landometer-fuzzy.netlify.app/`. เก็บ `.netlify/` นอก Git.

การตั้ง environment variables สำหรับการติดตั้งนี้:

- `FUZZY_ADMIN_TOKEN`: รหัสสุ่มอย่างน้อย 32 ตัว บันทึกเป็น secret แล้วโดยเลือก deploy context **Production เท่านั้น**. บัญชี Free ที่ใช้จริงกำหนดให้ secret ใช้ scopes **Builds + Functions + Runtime** ร่วมกัน; เจ้าของอนุมัติสาม scopes นี้แล้วโดยไม่อัปเกรดแผน. ไม่เปิด Post processing; UI ยืนยัน context อื่นทั้งหมดเป็น Empty. โค้ดอ่านรหัสฝั่ง Functions เท่านั้น; ห้ามใส่ค่าใน Git, client bundle, URL หรือ browser storage
- `FUZZY_ALLOWED_ORIGINS`: **optional และยังไม่ได้ตั้งค่าในการติดตั้งนี้** เพราะ handler ยอมรับ origin ของ request URL เดียวกันอยู่แล้ว. ตั้ง exact HTTPS origin เพิ่มเฉพาะเมื่อมีเหตุให้อนุญาตเว็บ origin อื่นอย่างชัดเจน ไม่ใช้ wildcard

การให้สาม scopes ตามข้อจำกัดของบัญชีนี้ไม่ได้อนุญาตให้ build เผยแพร่ค่ารหัส. หลังเปลี่ยน secret ต้อง redeploy แล้วตรวจการยืนยันสิทธิ์ใหม่ โดยไม่พิมพ์ค่ารหัสลง log หรือหลักฐานสาธารณะ

Backend ใช้เฉพาะ `/api/search-service`; default function alias ตอบ 404. Deployment สุดท้าย `6ad8200835d0d1a4cb0aa9d8` อยู่สถานะ ready เผยแพร่ `2026-10-21T02:14:57.212Z` โดยใช้ deployed functional source `444899dedd7fee3f49d92f2a74f93b9bd53ddc81` และ database branch `production`. Migration `20261021010000_search_feedback` ถูก apply ใน deployment แรก `6ad81a26fc18a88d87c0b51f`; รอบสุดท้ายไม่มี migration ใหม่. Provider ยืนยันกฎ rate limit 120 requests ต่อ 60 วินาที โดยใช้ domain + IP ในขั้น post-processing แล้ว; ไม่ใช่ผลทดสอบต้าน abuse หรือ load test

ตรวจ static delivery ผ่าน 48 รายการ: 45 assets ตรง MIME/bytes/SHA-256 และ 3 หน้า HTML ผ่าน MIME/ข้อความที่กำหนด เนื่องจาก Netlify แปลงลิงก์เป็น pretty URL และเพิ่ม toolbar. อ่าน deployment identity และเวลาตรวจล่าสุดใน [ผล static verification](evidence/live-static-verification.json), [หลักฐาน deployment สุดท้าย](evidence/final-production-deploy.json) และ [ผล hosted backend](evidence/production-backend-verification.json). [หลักฐาน deployment แรก](evidence/first-production-deploy.json) เป็นประวัติของรอบแรก รวมสถานะที่ยังไม่ได้ตั้ง admin secret ในขณะนั้น

Hosted QA หลังตั้ง secret ผ่าน 13/13 checks บน deployment `6ad81f1a8da7427955117741`: ปฏิเสธการอ่านที่ไม่ยืนยันสิทธิ์ (401), ปิด default alias (404), อ่านสถิติฐานข้อมูลด้วยสิทธิ์แอดมิน (200), บันทึก QA statistics/feedback (201), อ่านกลับ ตรวจเส้นทางยืนยันกรณี QA และ export case (200). คำร้อง QA ที่ส่งผ่านหน้าเว็บก่อนหน้านี้อ่านกลับด้วยสิทธิ์แอดมินได้ตรงทั้ง 8 IDs และจำนวนผล

หลัง redeploy เป็น `6ad8200835d0d1a4cb0aa9d8` ตรวจแบบ GET-only ผ่าน 9/9: คำร้อง UUID เดิมยังอยู่พร้อม version สถานะ confirmed และประวัติเดิม, case export ตรงเดิม และยอดสถิติ aggregate คงอยู่. การตรวจ anonymous search events เป็นระดับ aggregate เท่านั้น. ทดสอบเข้าหลังบ้านผ่าน browser จริง อ่านคำร้อง QA สองรายการและสถิติสองครั้งได้ และช่องรหัสถูกล้างหลังเข้าสำเร็จ

คำร้อง QA สังเคราะห์สองรายการยังคงอยู่โดยติดป้ายชัดเจน จึงอาจเห็นในหน้าหลังบ้าน. ผลนี้ตรวจวงจรระบบและ persistence ข้าม deployment ไม่ใช่คำร้องผู้ใช้จริง, human-labelled search accuracy, การสืบสวนโดยคนจริง หรือ load test. Health response `storageStatus: not_probed` เพียงอย่างเดียวไม่ใช่ผลตรวจฐานข้อมูล

เอกสารปิดงาน commit แยกด้วย `[skip netlify]` เพื่อคง runtime ที่ตรวจไว้จาก functional source ข้างต้น; source นี้จึงไม่จำเป็นต้องเท่ากับ Git HEAD หลังเพิ่มเอกสารและหลักฐาน. ไม่มีการเปลี่ยนโค้ดหรือชุดทดสอบใน commit เอกสารนี้

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
