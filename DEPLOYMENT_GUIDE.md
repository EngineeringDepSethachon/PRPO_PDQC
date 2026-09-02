# 🚀 คู่มือการ Deploy ระบบ PR/PO & Inventory Management
### Frontend บน **GitHub Pages** + Backend บน **Google Apps Script & Google Sheets**

เอกสารนี้รวบรวมขั้นตอนการนำระบบ **PR/PO & Inventory Management** ขึ้นใช้งานจริง (Production Deployment) โดยแบ่งออกเป็น 3 ส่วนหลัก:
1. **ส่วนที่ 1: ติดตั้ง Backend (Google Sheets + Google Apps Script)**
2. **ส่วนที่ 2: Deploy Frontend บน GitHub Pages**
3. **ส่วนที่ 3: เชื่อมต่อ Frontend เข้ากับ Backend และเริ่มใช้งาน**

---

## 📋 สรุปสถาปัตยกรรมระบบ (System Architecture)
```
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND (GitHub Pages)                     │
│  - React 19 + Tailwind CSS Single-Page Application (SPA)    │
│  - GitHub Actions CI/CD (Build & Deploy อัตโนมัติเมื่อ Push)  │
│  - รองรับ Offline-first & Live Cloud Sync                   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS REST API (JSON / CORS)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             BACKEND (Google Apps Script Web App)            │
│  - Endpoint: doGet() / doPost() (พร้อม Concurrency Lock)    │
│  - ควบคุมการสร้าง PR, อนุมัติออก PO, รับของเข้าคลัง, เบิกจ่าย │
└──────────────────────────────┬──────────────────────────────┘
                               │ Google Sheets API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                DATABASE (Google Spreadsheet)                │
│  - แท็บ Products, Vendors, StorageLocations, PRs, POs       │
│  - แท็บ StockLogs, Budgets, AuditLogs, Notifications        │
│  - แท็บ Users (Master List สำหรับ Username/Password & สิทธิ์) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ ส่วนที่ 1: ขั้นตอนการติดตั้ง Backend (Google Sheets + Apps Script)

### ขั้นตอนที่ 1.1: สร้าง Google Spreadsheet
1. ไปที่เว็บไซต์ [sheets.new](https://sheets.new) เพื่อสร้าง Spreadsheet ใหม่
2. ตั้งชื่อไฟล์ตามต้องการ เช่น `PDQC PR/PO & Inventory Database`

### ขั้นตอนที่ 1.2: เปิด Apps Script Editor
1. ที่เมนูด้านบนของ Google Sheet ไปที่ **ส่วนขยาย (Extensions)** > **Apps Script**
2. ตั้งชื่อโปรเจกต์ เช่น `PDQC-PRPO-Backend`

### ขั้นตอนที่ 1.3: วางโค้ด Backend
1. ในหน้าต่าง Apps Script คลิกไฟล์ `Code.gs`
2. คัดลอกโค้ดทั้งหมดจากไฟล์ [`gas/Code.gs`](file:///gas/Code.gs) ในโปรเจกต์นี้ ไปวางทับใน `Code.gs`
3. (ทางเลือก) ไปที่ **การตั้งค่าโปรเจกต์ (Project Settings ⚙️)** ด้านซ้าย ติ๊กเปิด **"แสดงไฟล์ Manifest appsscript.json ในตัวแก้ไข"**
4. กลับมาที่เมนู **ไฟล์ (Editor 📄)** คลิกไฟล์ `appsscript.json` แล้วนำโค้ดจาก [`gas/appsscript.json`](file:///gas/appsscript.json) ไปวาง
5. กดปุ่ม **บันทึก (Save 💾)** หรือ `Ctrl + S`

### ขั้นตอนที่ 1.4: สร้างฐานข้อมูลและ Master Data ครั้งแรก
1. ที่แถบเครื่องมือด้านบน ในช่องดรอปดาวน์เลือกฟังก์ชัน ให้เลือก **`setupInitialDatabase`**
2. กดปุ่ม **เรียกใช้ (Run ▶)**
3. Google จะขึ้นหน้าต่างขอสิทธิ์การเข้าถึง (Authorization Required):
   - คลิก **ตรวจสอบสิทธิ์ (Review permissions)**
   - เลือกบัญชี Google ของคุณ
   - หากเจอข้อความ *"Google hasn't verified this app"*:
     - คลิกที่ **ขั้นสูง (Advanced)** ด้านล่าง
     - คลิก **ไปที่ PDQC-PRPO-Backend (ไม่ปลอดภัย) / Go to ... (unsafe)**
     - คลิก **อนุญาต (Allow)**
4. รอจนกระทั่งแถบ Execution Log ขึ้นคำว่า `Execution completed`
5. กลับไปดูที่ Google Sheet จะเห็นว่าระบบสร้างแท็บชีตทั้ง 10 แท็บ (`Products`, `Vendors`, `StorageLocations`, `PRs`, `POs`, `StockLogs`, `Budgets`, `AuditLogs`, `Notifications`, และ `Users`) พร้อมหัวตารางและ Master Data ตั้งต้นให้อัตโนมัติ 100%!

### ขั้นตอนที่ 1.5: Deploy เป็น Web App
1. ที่มุมขวาบนของ Apps Script กดปุ่ม **การทำให้ใช้งานได้ (Deploy)** > **การทำให้ใช้งานได้ใหม่ (New deployment)**
2. คลิกไอคอนรูปเฟือง ⚙️ ข้าง "เลือกประเภท" แล้วเลือก **เว็บแอป (Web app)**
3. ตั้งค่าดังนี้:
   - **คำอธิบาย (Description):** `Production v2 (with Login & Users Master)`
   - **เรียกใช้ในฐานะ (Execute as):** **ฉัน (Me / your-email@gmail.com)**
   - **ผู้มีสิทธิ์เข้าถึง (Who has access):** **ทุกคน (Anyone)** *(สำคัญมาก! ต้องเลือก Anyone เพื่อให้ Frontend จาก GitHub Pages สามารถเรียก API ได้)*
4. กดปุ่ม **ทำให้ใช้งานได้ (Deploy)**
5. **คัดลอก Web App URL** ที่ได้ (URL จะมีรูปแบบ `https://script.google.com/macros/s/AKfycb.../exec`) เพื่อนำไปใช้ในส่วนถัดไป


---

## 🌐 ส่วนที่ 2: ขั้นตอนการ Deploy Frontend บน GitHub Pages

โปรเจกต์นี้มีไฟล์ GitHub Actions [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml) เตรียมพร้อมไว้แล้ว ทำให้ทุกครั้งที่คุณ Push โค้ดขึ้น GitHub ระบบจะ Build และ Deploy ขึ้น GitHub Pages อัตโนมัติทันที

### ขั้นตอนที่ 2.1: เตรียม Git Repository ในเครื่อง
เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ แล้วรันคำสั่ง:

```bash
# 1. เริ่มต้น Git Repository (หากยังไม่เคยทำ)
git init

# 2. เพิ่มไฟล์ทั้งหมดเข้า Git
git add .

# 3. บันทึก Commit แรก
git commit -m "feat: complete PR/PO system with GitHub Pages & GAS backend deployment"

# 4. ตั้งชื่อ Branch หลักเป็น main
git branch -M main
```

### ขั้นตอนที่ 2.2: สร้าง Repository บน GitHub และ Push โค้ด
1. ไปที่ [github.com/new](https://github.com/new) เพื่อสร้าง Repository ใหม่ (เช่น `prpo-system`)
2. เลือกว่าเป็น **Public** หรือ **Private** ตามต้องการ
3. เชื่อมต่อ Local Git กับ GitHub Repository และ Push โค้ด:

```bash
# ใส่ URL ของ GitHub Repository ของคุณ (ใช้ GitHub Token หรือ SSH)
git remote add origin https://<YOUR_GITHUB_USERNAME>:<YOUR_GITHUB_TOKEN>@github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git

# Push โค้ดขึ้น GitHub
git push -u origin main
```

### ขั้นตอนที่ 2.3: เปิดใช้งาน GitHub Pages ใน Repository Settings
1. ในหน้า GitHub Repository ของคุณ ไปที่แท็บ **Settings**
2. เมนูด้านซ้าย เลือก **Pages** (ใต้หัวข้อ Code and automation)
3. ใต้หัวข้อ **Build and deployment > Source** ให้เลือกเป็น:
   👉 **GitHub Actions**
4. ไปที่แท็บ **Actions** บน GitHub คุณจะเห็น Workflow `Deploy to GitHub Pages` กำลังทำงานอยู่ (ใช้เวลาประมาณ 1-2 นาที)
5. เมื่อเสร็จสิ้น (เครื่องหมายถูกสีเขียว ✅) จะมี URL ของเว็บไซต์แสดงขึ้นมา เช่น:
   `https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPO_NAME>/`

---

## 🔗 ส่วนที่ 3: การเชื่อมต่อ Frontend เข้ากับ Backend

เมื่อเปิดหน้าเว็บที่ GitHub Pages:

1. คลิกที่ปุ่ม **"☁️ เชื่อมต่อชีต"** หรือ **"Google Sheets Live"** ที่มุมขวาบนของแถบ Navbar
2. นำ **Google Apps Script Web App URL** ที่ได้จากขั้นตอนที่ 1.5 มาวางในช่อง URL
3. กดปุ่ม **"ทดสอบการเชื่อมต่อ"** (ระบบจะส่ง Ping ไปยัง GAS เพื่อทดสอบ)
4. เมื่อขึ้นข้อความสำเร็จ ให้กดปุ่ม **"ดึงข้อมูล (Pull Data)"** หรือ **"สำรองขึ้นชีต (Push All)"**
5. สถานะจะเปลี่ยนเป็น **🟢 Google Sheets Live** และระบบจะทำการซิงค์ข้อมูล PR, PO, ข้อมูลสินค้า, ผู้ขาย, และสต็อกเข้ากับ Google Sheets แบบ Real-time ทันที!

---

## 💡 คำแนะนำเพิ่มเติม (Tips & FAQ)

### หากมีการแก้ไขโค้ดใน `gas/Code.gs`:
- เมื่อแก้โค้ดใน Google Apps Script อย่าลืมกด **Deploy > Manage deployments > คลิกไอคอนดินสอแก้ไข > เปลี่ยน Version เป็น New version > กด Deploy** เพื่อให้ Web App ใช้งานโค้ดเวอร์ชันล่าสุดเสมอ

### สิทธิ์การใช้งานระบบ (Roles):
ระบบมาพร้อม 5 สิทธิ์การทำงาน สามารถสลับสิทธิ์ได้ทันทีที่มุมขวาบน:
- **Requester (PD / QC):** เปิดใบขอซื้อ (PR), เบิกจ่ายสต็อกด่วน
- **Asst. Manager:** ตรวจสอบ PR (Level 1 Review)
- **Plant Manager:** อนุมัติ PR & ออก PO อัตโนมัติ (Level 2 Final Approve)
- **Online Purchaser:** จัดการสั่งซื้อและติดตามสินค้าออนไลน์
- **Admin / Warehouse Manager:** จัดการ Master Data สินค้า, ผู้ขาย, จุดจัดเก็บ และงบประมาณ

### 👥 การจัดการบัญชีผู้ใช้งานผ่าน Google Sheets (Users Sheet):
ระบบจัดเก็บข้อมูลผู้ใช้และรหัสผ่านไว้ในแท็บชีต **`Users`**:
- **การเพิ่มพนักงานใหม่:** เปิดชีต `Users` พิมพ์ข้อมูลพนักงานในแถวใหม่ (ระบุ `username`, `password`, `department`, `roleId` เช่น `REQUESTER_PD`, `PLANT_MANAGER`, `ADMIN`)
- **การเปลี่ยนรหัสผ่าน:** แก้ไขรหัสผ่านในคอลัมน์ `password` ได้โดยตรง
- **การระงับการใช้งาน:** เปลี่ยนคอลัมน์ `status` จาก `ACTIVE` เป็น `INACTIVE`
- เมื่อผู้ใช้เข้าสู่ระบบผ่านหน้าเว็บ ระบบจะตรวจสอบกับข้อมูลล่าสุดในชีต `Users` แบบ Real-time ทันที

