# ระบบขอซื้อและคลังสินค้า (PR/PO & Inventory Control System)
### บริษัท พีดีคิวซี จำกัด (PDQC Co., Ltd.)

ระบบบริหารจัดการใบขอซื้อ (PR), ใบสั่งซื้อ (PO), การตรวจรับสินค้า, การเบิกจ่าย, บัตรคุมสต็อก (Stock Card) และงบประมาณประจำเดือน ออกแบบมาให้ทำงานแบบ Serverless เต็มรูปแบบ:
- **Frontend**: React 19 + Tailwind CSS + Lucide Icons + Recharts (Deploy บน **GitHub Pages**)
- **Backend & Database**: **Google Apps Script (GAS)** REST API + **Google Sheets Database**

---

## 🚀 การ Deploy ใช้งานจริง (Deployment)
สามารถดูคู่มือการ Deploy ทีละขั้นตอนอย่างละเอียดได้ที่:
👉 **[คู่มือการ Deploy ฉบับสมบูรณ์ (DEPLOYMENT_GUIDE.md)](./DEPLOYMENT_GUIDE.md)**

### สรุปย่อ 3 ขั้นตอน:
1. **Google Sheets + Apps Script**:
   - สร้าง Google Sheet ใหม่ที่ [sheets.new](https://sheets.new)
   - นำโค้ด [`gas/Code.gs`](./gas/Code.gs) ไปวางใน Apps Script
   - สั่งรันฟังก์ชัน `setupInitialDatabase()` 1 ครั้ง
   - Deploy เป็น Web App (Who has access: **Anyone**) และคัดลอก URL
2. **GitHub Pages**:
   - Push โค้ดทั้งหมดขึ้น GitHub Repository
   - ไปที่ **Settings > Pages** เลือก Source เป็น **GitHub Actions**
3. **เชื่อมต่อ**:
   - เปิดหน้าเว็บ GitHub Pages แล้วกดปุ่ม **"☁️ เชื่อมต่อชีต"** บน Navbar เพื่อวาง URL และเริ่มซิงค์ข้อมูลสด

---

## 💻 การรันสำหรับนักพัฒนา (Development)

```bash
# ติดตั้ง dependencies
npm install

# รัน Dev Server
npm run dev

# รัน Unit Tests (Vitest)
npm run test

# Build Production Bundle
npm run build
```
