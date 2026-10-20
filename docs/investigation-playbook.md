# วงจรดูแลคุณภาพการค้นหา

ใช้สถิติและคำแจ้งเป็นหลักฐานสำหรับการตรวจและเสนอแก้ คนเป็นผู้ยืนยัน labels และอนุมัติการเผยแพร่ การกดผลหรือส่งคำบ่นไม่ใช่คำสั่งให้ AI เรียนรู้หรือ deploy อัตโนมัติ

## 1. อ่านสัญญาณโดยรู้ขอบเขต

หน้าผู้ดูแล `admin.html` ใช้ backend ที่ติดตั้งและตั้งสิทธิ์แล้ว อ่านช่วงวันตาม Asia/Bangkok. สถิติแอปมีโหมด สถานะ จำนวนผล และเวลา ไม่มี raw query หรือ account/IP field ใน app payload. จำนวนแจ้งปัญหาไม่ใช่จำนวนผู้ใช้หรืออัตราค้นผิดของประชากรทั้งหมด; การค้นซ้ำและการส่งโดย bot ยังเป็นข้อจำกัด

Raw query, ข้อความผู้ใช้ และ ID ผลที่เห็นส่งเก็บเฉพาะเมื่อกดแจ้งปัญหา การตั้งค่า transport/access log ของ hosting provider เป็นอีกชั้นหนึ่ง ไม่ควรอ้างว่าไม่มี IP หรือ query อยู่ในระบบอื่นเพียงเพราะ app schema ไม่มี field เหล่านั้น. ตรวจ provider จริงและกำหนด retention/access ให้สอดคล้องกับวัตถุประสงค์งาน อย่าเผยแพร่ token หรือ export คำบ่นลง repository

## 2. คนตรวจแต่ละคำแจ้ง

1. เปลี่ยนสถานะจาก `new` เป็น `investigating`; อ่านคำค้นและผลที่ผู้ใช้เห็น ตรวจ corpus/engine revision ตอนเกิดปัญหา
2. แยกสาเหตุ: ข้อมูลไม่มีใน snapshot, ชื่อหรือ alias ขาด, normalization, qualifier/parent, retrieval, ranking, UI, ระบบผิดพลาด หรือเจตนาอยู่นอก scope
3. ค้นชื่อจริงใน corpus และตรวจ parent/metadata ต้นทาง เลือก **namespaced identity** ของผลที่ยอมรับได้ เช่น `province:<uuid>` หรือ `place:poi:<sourceHash>`; ชื่อเท่ากันไม่ใช่หลักฐานว่า ID เดียวกัน
4. ถ้าควรไม่คืนคำตอบ เลือก outcome `abstain` และไม่ใส่ intended IDs. ถ้าระบุได้หลายแห่ง ยอมรับหลาย ID หรือแยกความกำกวมให้ชัด ไม่แต่ง singleton label
5. ตรวจข้อมูลส่วนบุคคลใน query/ข้อความก่อนยืนยัน `privacyReviewed`; boolean นี้เป็นบันทึกการรับผิดชอบของคน ไม่ใช่เครื่องพิสูจน์ว่าข้อความปลอดข้อมูลส่วนบุคคล
6. ระบุสาเหตุและเหตุผล แล้วใช้ `confirmed`, `rejected` หรือ `resolved` ตามหลักฐาน การบันทึกใช้ version ป้องกันคนแก้ชนกันและมี audit history. “ยืนยัน case” ไม่ได้แปลว่าแก้ engine แล้ว

ถ้าข้อมูลที่ต้องการไม่มีใน corpus ให้ส่งเป็นงานข้อมูลแยก ไม่เพิ่ม alias ปลอมหรือพิกัดจากการเดาของ AI. ข้อมูลศาสนาของสถานที่ไม่ยืนยันความเชื่อของบุคคล และ Locale Insight ไม่สร้าง parent/boundary หรือหลักฐานความเสี่ยง

## 3. นำเฉพาะ confirmed cases ไปทดสอบแบบส่วนตัว

ดาวน์โหลด confirmed export ผ่านหน้าผู้ดูแลที่ยืนยันสิทธิ์ ใช้ export ของ server ที่ `privacyReviewed: true`, `labelStatus: human_confirmed`, `automaticTraining: false`. หากมี `hasMore: true` ต้องเก็บทุกหน้าก่อน import; ห้ามใช้ export หน้าเดียวแทนว่าตรวจครบ

เก็บ input และ output ใต้ `.private/` ซึ่งต้องอยู่ใน `.gitignore` แล้วรันจาก project root:

```sh
node scripts/import-reviewed-cases.mjs .private/server-export.json
REVIEWED_CASES_FILE=.private/reviewed-cases.json npm run test:regression
```

หรือส่ง JSON ทาง stdin ด้วย `node scripts/import-reviewed-cases.mjs -`. ค่าเริ่มต้นของ output คือ `.private/reviewed-cases.json` สิทธิ์ไฟล์ `0600`; `--out` ยอมรับเฉพาะภายใน `.private/`. Script ตรวจ exact namespaced identity กับ corpus, รองรับ abstention และไม่คัดลอก `note`, `notes` หรือ `cause`. ไม่พิมพ์ query, ไม่แก้ public manifest, ไม่ commit และไม่เรียกโมเดลหรือเผยแพร่งาน

Importer เก็บ mode และ selected religion filter เป็น options ของ case เพื่อให้รันทดสอบบริบทเดียวกับที่ผู้ใช้เห็น เก็บ case เดิมและปฏิเสธการเขียนทับ label ที่มีอยู่ด้วย case ID เดิม ถ้าคนตรวจแก้คำตอบภายหลัง ให้ใช้ audit history และกระบวนการอนุมัติการแก้ label แยก อย่าลบไฟล์เดิมเพื่อทำให้ test ผ่าน

## 4. ให้ AI เสนอการแก้ที่ตรวจได้

ผู้ดูแลอนุญาตการใช้ private cases กับ AI ที่เลือกและให้เฉพาะข้อมูลที่จำเป็น. ให้ AI แยกปัญหาข้อมูลออกจาก matcher, รักษาชื่อและ ID ต้นทาง, ไม่ข้าม explicit parent, แสดงเหตุผลของ suggestion และเสนอ diff พร้อมผลก่อน/หลัง. ตรวจ alias ใหม่กับเจ้าของข้อมูล; ไม่เพิ่ม alias ทีละคำเพียงเพื่อผ่าน case ที่เห็น

รัน `npm test` และ `npm run test:regression` พร้อม private cases เมื่อได้รับอนุญาต. ผลทดสอบแสดง case ID/ข้อผิดพลาด ไม่แสดง raw query. Missing dependency/exception เป็น fail ไม่ใช่ completed no-match. การไม่มี private file ใน public CI ไม่ได้แปลว่า private cases ผ่าน

Public demonstration suite ปัจจุบันคือ `tests/evaluation-cases.json` จำนวน 40 cases. เป็น exposed validation หลัง tuning และไม่ใช่ holdout. ถ้าจะเผยแพร่ case จริง ให้คนอนุมัติการทำให้ไม่ระบุตัวบุคคลและขอบเขตเผยแพร่ก่อน เขียน public fixture ใหม่โดยตั้งใจ; ห้าม commit private export โดยตรง

## 5. รักษา labels เดิมและ review ก่อน release

GitHub workflow ติดตั้งจาก lockfile ด้วย `npm ci`, รัน unit/contract tests และ regression. ใน pull request ใช้ **base commit SHA จาก GitHub** อ่าน manifest เดิมด้วย `git show` แล้วตรวจว่าทุก case ID ยังอยู่ และ query, options, scope, expectation ไม่ถูกเปลี่ยน. การแก้ hash file อีกไฟล์พร้อมกันไม่ทำให้หลบ gate นี้ได้. การเพิ่ม case ใหม่ทำได้ แต่การลบ case เดิมถูกปฏิเสธเสมอ

ทดสอบ gate ในเครื่องกับ base ที่เชื่อถือได้:

```sh
REGRESSION_BASE_REF=<base-commit-sha> npm run test:regression
```

หาก label เดิมผิดจริง ต้องมี **human approval แยกจากงานแก้ matcher**. เจ้าของ repo ตรวจหลักฐานและเพิ่ม PR label `approved-label-correction`; ใส่ receipt `.ci/label-corrections.json` ที่อ้างคำอนุมัติจริง:

```json
{
  "schemaVersion": 1,
  "approvedBy": "human owner",
  "approvalReference": "URL or reference to the explicit human approval",
  "changes": [
    {
      "caseId": "case requiring correction",
      "fromSha256": "digest printed by the failing preservation gate",
      "toSha256": "digest printed by the failing preservation gate",
      "reason": "Evidence explaining why the old label was wrong"
    }
  ]
}
```

CI อนุญาตเฉพาะ before/after digest ของ case ที่อนุมัติไว้ ไม่มี implicit override. ป้องกันการแก้ workflow/approval receipt ด้วย repository review และ branch protection; script ตรวจรูปแบบและการเปลี่ยน label แต่ไม่ได้พิสูจน์ตัวตนของผู้อนุมัติจาก free text. ผู้เขียน AI ไม่ควรเพิ่ม approval label หรือสร้างคำอนุมัติเอง

ให้คน review code/ข้อมูล/labels และอนุมัติ release ตามสิทธิ์จริง หลังเผยแพร่ทดสอบ query ที่แก้บน version ที่ปล่อยแล้ว ตรวจ error/rollback และเปลี่ยนสถานะคำแจ้งเป็น `resolved` เมื่อมีหลักฐาน. เก็บ case เดิมเป็น regression ต่อไป

## หลักฐานที่ควรรายงาน

- corpus, engine/normalizer revision, public manifest hash และ base SHA ที่ใช้ตรวจ
- จำนวน cases ที่รันครบ แยกพื้นที่/POI/category/abstention/ambiguity และ private cases ที่ไม่ได้รัน
- acceptable IDs และ parent ที่ตรวจแล้ว โดยเก็บ raw complaint ในที่ส่วนตัว
- ผลของ CI/browser/DB ที่รันจริง แยก `pass`, `fail`, `not_run`; ไม่เปรียบเทียบเวลาค้นในเครื่องกับ network production
- เรื่องที่แก้ ข้อจำกัด ผู้อนุมัติ และ release revision; การ deploy ผ่านไม่ใช่หลักฐานว่า search คุณภาพดีทุกกรณี
