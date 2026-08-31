# Google Apps Script (GAS) Deployment Files
**ระบบ PR/PO & Stock Management - บริษัท พีดีคิวซี จำกัด (PDQC Co., Ltd.)**

โฟลเดอร์นี้รวบรวมไฟล์สำหรับ Deploy ขึ้น **Google Apps Script** แบบ Minimalist พร้อมใช้งานทันที

---

## 📁 ไฟล์ทั้งหมดในโฟลเดอร์นี้
1. **`Code.gs`**: โค้ดฝั่ง Backend สำหรับ Google Apps Script
   - ฟังก์ชัน `setupInitialDatabase()`: สร้างแท็บชีต, หัวคอลัมน์, จัดกึ่งกลาง, สี Header และเติม Master Data ตั้งต้นอัตโนมัติ 100%
   - ฟังก์ชัน `doGet(e)` / `doPost(e)`: ควบคุมการ Render หน้าเว็บ `index.html` และเป็น REST API
   - ฟังก์ชัน RPC API (`google.script.run`): บันทึก PR, อนุมัติ PR & ออก PO, ตรวจรับของเข้าสต็อก (Receive Goods), เบิกจ่ายด่วน (Quick Issue) พร้อม Concurrency Locking
2. **`index.html`**: โค้ดฝั่ง Frontend (Single-Page Application)
   - รวม UI หน้า Dashboard, การเปิด PR, รายการ PO, การเบิกจ่าย, บัตรคุมสต็อก (Stock Card)
   - ใช้ Tailwind CSS CDN + Vue 3 CDN (ไม่ต้องติดตั้ง Node Modules เพิ่มเติมบน GAS)
3. **`appsscript.json`**: Manifest Configuration (ตั้งค่า TimeZone: `Asia/Bangkok` และ Runtime Version: `V8`)

---

## 🚀 ขั้นตอนการติดตั้งและรันระบบ

1. **สร้าง Google Spreadsheet ใหม่:**
   - ไปที่ [sheets.new](https://sheets.new)
   - ตั้งชื่อชีตตามต้องการ เช่น `PDQC PR/PO & Stock Management Database`
2. **เปิด Google Apps Script:**
   - ไปที่เมนู **ส่วนขยาย (Extensions)** > **Apps Script**
3. **เพิ่มไฟล์ในโปรเจกต์:**
   - คัดลอกเนื้อหาจาก [`Code.gs`](file:///d:/PRPO_PDQC/gas/Code.gs) ไปใส่ใน `Code.gs`
   - กดปุ่ม `+` ข้าง Files > เลือก **HTML** > ตั้งชื่อ `index` > คัดลอกเนื้อหาจาก [`index.html`](file:///d:/PRPO_PDQC/gas/index.html) ไปใส่
   - (ตัวเลือก) เปิดการแสดง `appsscript.json` ใน Project Settings แล้วนำค่าจาก [`appsscript.json`](file:///d:/PRPO_PDQC/gas/appsscript.json) ไปวาง
4. **สร้าง Database ครั้งแรก:**
   - เลือกฟังก์ชัน **`setupInitialDatabase`** ในแถบเครื่องมือด้านบน
   - กดปุ่ม **เรียกใช้ (Run)** และอนุญาตสิทธิ์ (Authorization)
   - ระบบจะสร้างชีต `Products`, `Vendors`, `StorageLocations`, `PRs`, `POs`, `StockLogs`, `Budgets`, `AuditLogs` พร้อมลงข้อมูลเริ่มต้นให้ครบถ้วน
5. **Deploy เป็น Web App:**
   - กด **การทำให้ใช้งานได้ (Deploy)** > **การทำให้ใช้งานได้ใหม่ (New deployment)**
   - เลือกประเภท: **เว็บแอป (Web app)**
   - Execute as: **ฉัน (Me)**
   - Who has access: **ทุกคน (Anyone)**
   - กด **Deploy** แล้วนำ Web App URL ไปใช้งานได้ทันที
