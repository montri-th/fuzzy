# Independent demonstration evaluation

21 ต.ค. 2026 · ชุดตรวจ [evaluation-cases.json](../tests/evaluation-cases.json) และผลรายคำค้น [independent-evaluation.json](independent-evaluation.json)

ชุดนี้มี 40 คำค้นที่ผู้ตรวจอิสระร่างจาก corpus จริง: พื้นที่ 16 และ scope ใหม่คือศาสนสถาน/ประเภทข้อมูล 24. Labels ใช้ source ID และ parent จริง; หมวดข้อมูลเทียบรายชื่อ ID ทั้งชุดจาก field ต้นทาง ไม่ใช้แค่ชื่อที่ดูคล้ายกัน. ผู้ตรวจเป็น AI agent แยกจากผู้เขียน engine ยังไม่มี human label review. ชุดนี้เปิดให้ผู้เขียน engine เห็นและแก้ไขแล้ว จึงเป็น demonstration/exposed validation ไม่ใช่ holdout และไม่วัดพฤติกรรมผู้ใช้จริง

## ผลล่าสุด

ใช้ labels เดิมหลังแก้ engine: พื้นที่ผ่าน **16/16** contract และ scope ศาสนสถานผ่าน **24/24**. รันครบ 40 cases ไม่มี execution error. ตรวจชื่อจริงของ POI ใน snapshot เพิ่มครบ **1,491/1,491** รายการ ทุกชื่อเข้าถึง source ID ของตัวเองได้ในผลไม่เกิน 500 รายการ; นี่เป็น source-name conformance ไม่ใช่คะแนนการค้นจากผู้ใช้หรือหลักฐานว่าข้อมูลครอบคลุมประเทศไทย

Engine SHA-256: `ac832ede36fb77ce99caf02ecb3bad7a4ebfc6554059af1d29473407f73e3ef4` ตรวจว่าไฟล์ไม่เปลี่ยนระหว่างรัน. Manifest และ corpus hashes อยู่ใน JSON. หาก engine/corpus เปลี่ยนต้องรันใหม่ก่อนใช้ผลนี้อ้างอิง

## ประวัติการตรวจ

รันครบ 40 คำค้น ไม่มี execution error. พื้นที่ผ่าน 16/16 contract; scope ศาสนสถานผ่าน 22/24. พบและส่งกลับให้แก้ 2 จุด:

- P19 `วัด อิสลาม` เดาไป `วัดอิสาน` ซึ่ง source ระบุ Buddhist แทนที่จะรับรู้คำประเภท/ศาสนาที่ปะปนกัน
- P20 `วัดราษฎร์ จ.สุโขทัย` ไม่พบ ทั้งที่ source `templeType` มี 5 ID ที่ตรงใน snapshot

สองจุดนี้แก้แล้ว. รอบถัดมาพบ regression `วัดอรุน` ไม่พบ เพราะการตัดคำสามัญ `วัด` ทำให้ส่วนชื่อเหลือ 4 codepoints แล้วไม่ผ่าน minimum fuzzy-prefix. Engine แก้ด้วย conservative phonetic-prefix สำหรับ category-specific name sidecar โดยคง literal branch และ parent scope. รอบล่าสุดผ่านกรณีเดิมทั้งหมด; JSON เก็บ hash และประวัติผลที่เคย fail ไว้ใน `history`

## เทียบกับของเดิมอย่างจำกัด

มี snapshot จาก public area API ปัจจุบันที่คำค้นตรงกัน 10 กรณี. ใน 9 กรณีที่มี acceptable area ID: captured live เข้าถึง ID ตาม cutoff ที่กำหนด 2/9; engine ใหม่ 9/9. อีก 1 กรณีคือ `hotel` ซึ่งควรไม่คืนพื้นที่. ไม่ใช่การเปรียบเทียบกับ build วันที่ 9 ต.ค. ของ Claude และไม่มี baseline POI เพราะช่องเดิมค้นพื้นที่เท่านั้น. ผลจำลอง legacy แสดงแยกเป็น `local-approximation`, `liveMeasurement: false`

## ความหมายและข้อจำกัด

- Retrieval วัด acceptable ID ใน top-k ของ case; ambiguity วัดทุก intended ID เข้าถึงได้และไม่เลือกอัตโนมัติ; category เทียบ source-derived entity set; abstention ต้องรันสำเร็จแล้วได้ผลว่างจริง
- คำ `วัดอรุน` แสดงได้หลายแห่งที่ชื่อคล้าย; ไม่บังคับให้วัดอรุณราชวรารามเป็นคำตอบเดียวโดยไม่มีพื้นที่
- `วัดพระแก้ว กรุงเทพ` ต้องไม่ข้ามไปวัดพระแก้วชัยนาท. ไม่พบใน snapshot ไม่ได้พิสูจน์ว่าไม่มีสถานที่จริง
- `โบสถ์` กำกวม จึงต้องแสดง warning และบอกความหมายที่ branch นี้รองรับ; ไม่อนุมานอุโบสถจากวัดทุกแห่ง
- Parent ที่ระบุแต่สะกดไม่ตรง (`จ.เชียงใหม`) ใช้ conservative abstention พร้อม warning ไม่ทิ้ง parent เพื่อคืนผลจังหวัดอื่น
- ไม่ได้วัด candidate pool recall, PostgreSQL, load/concurrency, browser latency หรือ production readiness. `timingMs` เป็นหนึ่ง execution ในเครื่องต่อ query ไม่ใช่ SLO
- ห้ามรวม 40 cases เป็นคะแนนคุณภาพทั่วไปของ ecosystem หรือเทียบกับ 98.7% ในเอกสาร Claude. ต้องมีชุดผู้ใช้จริงและ labels ที่ตรวจแล้วก่อนสรุปคุณภาพจริง
