# KPI Monitoring System - PROJECT STATUS

อัปเดตล่าสุด: **2026-05-26**

> โครงสร้างแบบ production สำหรับใช้เป็นเอกสารกลางในการพัฒนาต่อ และสำหรับเริ่มแชทใหม่โดยไม่เสีย context

---

## 1) CORE_CONTEXT

### 1.1 Project Scope
- ระบบ Dashboard สำหรับติดตามผลตัวชี้วัด KPI ของกองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
- แสดงผลข้อมูลจาก Supabase PostgreSQL ผ่าน React + Vite + Tailwind CSS
- เป้าหมายหลักคือทำให้ผู้บริหารใช้ดูภาพรวม, ติดตามสถานะ, และตัดสินใจได้เร็วขึ้น

### 1.2 Stable Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Data fetching: TanStack React Query
- Database: Supabase PostgreSQL
- Charting: Recharts + SVG inline
- Routing: React Router v6
- Deployment: GitHub + Vercel

### 1.3 Canonical Data Rules
- `null` = ไม่มีข้อมูลในระบบจริง
- `0` = มีข้อมูลจริง
- `""` = ยังไม่ได้กรอก / ระหว่างกรอก
- KPI ต้องนับจากทะเบียนกลาง ไม่ใช่นับเฉพาะรายการที่มีผล
- KPI ที่ยังไม่มีผลต้องยังแสดงในระบบเสมอ

### 1.4 KPI Counting Standard
- `Total KPIs` = ตัวชี้วัดทั้งหมดของกอง
- `Reported KPIs` = ตัวชี้วัดที่มีข้อมูลเข้ามาแล้ว
- `Assessed KPIs` = ตัวชี้วัดที่มีข้อมูลพอประเมินได้
- `Pending KPIs` = ตัวชี้วัดที่ยังไม่มีข้อมูล / ยังประเมินไม่ได้
- รายงานผู้บริหารต้องแยก 4 ค่านี้ให้ชัด

### 1.5 Status Logic
- สีสถานะหลักคงเดิมทั้งระบบ
  - เขียว = บรรลุเป้าหมาย
  - เหลือง = เฝ้าระวัง
  - ส้ม = ระดับเสี่ยง
  - แดง = ขั้นวิกฤติ
- การคำนวณ % ผ่านเป้าหมายควรยึดเฉพาะ KPI ที่ `Assessed` ได้แล้ว
- KPI ที่ `Pending` ต้องไม่ทำให้คะแนนรวมเพี้ยน

### 1.6 Core Files
- `src/api/kpiApi.js`
  - helper กลางสำหรับประเมินสถานะ KPI
- `src/utils/kpiForm.js`
  - `trimToNull()`
  - `parseOptionalNumber()`
- `src/utils/kpiMetrics.js`
  - helper สำหรับสรุป pipeline status
- `src/components/KpiDataPolicyNotice.jsx`
  - กล่องอธิบาย policy การกรอกข้อมูล

### 1.7 Main Routes
- `/` → `DashboardOverview`
- `/sdgs` → `Dashboard`
- `/healthkpi` → `DashboardHealth`
- `/entry` → `DataEntry`
- `/entry-health` → `DataEntryHealth`
- `/group/sdg` → `KPIGroup`
- `/group/health` → `KPIGroup`
- `/manage/sdgs` → `ManageSDGs`
- `/manage/health` → `ManageHealth`
- `/manage/kpis` → `ManageKPIs`
- `/admin/login` → `AdminLogin`

---

## 2) CURRENT_STATE

### 2.1 Last Delivered Changes
- รีดีไซน์หน้า `DashboardOverview` เป็นโหมดใหม่แบบเลื่อนลงหลาย section (B-H) ตามแผน `plansdgv1.md`
- เพิ่มโหมดสลับหน้า `view=redesign|classic` เพื่อ fallback หน้าเดิมทันทีโดยไม่กระทบ logic ข้อมูล
- แยกส่วนหน้าใหม่เป็น component ย่อยเพื่อลดความเสี่ยงโค้ดพังและรองรับการพัฒนาต่อ
- เพิ่ม Outcome cards (SDGs/Health), coverage summary, ranking, timeline, และ placeholder จังหวัด (Phase 2)
- ยืนยัน code-level parity ว่าสูตรเมตริกหลักและ routing/query เดิมยังอยู่ครบ

### 2.2 Current UI State
- หน้า `DashboardOverview` มี 2 โหมด:
  - `classic` = หน้าเดิม
  - `redesign` = หน้าใหม่ตามโครง SDGs landing
- โหมด `redesign` มี section นำทางแบบ sticky และลำดับเนื้อหา B-H ครบ
- Hero โหมดใหม่ปรับโทนเข้ม (immersive) พร้อมคงตัวเลข KPI เดิม
- บล็อกจังหวัดยังเป็น placeholder (Phase 2) และบล็อก insight/timeline เป็น static content รอบแรก
- ตารางสรุป KPI และ visitor badge ยังคงอยู่เพื่อคุม continuity

### 2.3 Current Logic State
- ฟอร์มบันทึกข้อมูลหลักใช้กติกาเดียวกันแล้ว
- Bulk import เริ่มใช้ helper เดียวกับฟอร์มปกติ
- `DashboardOverview` ยังคง query เดิม (`fetchAllDashboards`) และ status evaluators เดิม
- สูตรเมตริกหลักคงเดิม:
  - `totalKPIs`, `totalPassed`, `totalWarning`, `totalAtRisk`, `totalCritical`
  - `totalAssessed`, `totalPending`
  - `% SDGs/% Health` = `passed / total`
- click routing เดิมยังคงใช้ `indicator=${encodeURIComponent(originalTitle)}`
- filter `year/period` ยังทำงานผ่าน URL search params เช่นเดิม
- Visitor counter ปัจจุบันยังเป็น `session-based` (TTL 30 นาที) ไม่ใช่ unique person
- มีจุดที่ต้องติดตามต่อ: บาง logic ฝั่ง Health ยังตีค่า `0` เป็นไม่มีข้อมูล ซึ่งขัดกับ policy `0 = มีข้อมูลจริง`

### 2.4 Known Risks / Notes
- Build validation ใน environment นี้เคยติด `spawn EPERM` ตอนรัน Vite/esbuild
- UAT บน browser จริงยังต้องปิด checklist ให้ครบก่อน merge
- ต้องระวังให้ `pending` กับ `assessed` ใช้ความหมายเดียวกันทั้งระบบ
- ถ้าจะเพิ่ม KPI ชนิดพิเศษ ควรเพิ่ม metadata เช่น `calc_type`
- ข้อมูล visitor ในฐานปัจจุบันเริ่มตั้งแต่ประมาณ `2026-04-29` (ข้อมูลเก่ากว่านั้นไม่อยู่ใน project/table ที่แอปกำลังอ่าน)
- เมตริก `ดูสถิติเว็บไซต์ (Session)` = จำนวน session events ใน `visitor_sessions` ไม่ใช่จำนวนผู้ใช้จริงแบบ unique

### 2.5 Recent Files Touched
- `src/pages/DashboardOverview.jsx`
- `plansdgv1.md`
- `PROJECT_STATUS.md`

---

## 3) TASK

### 3.1 In Progress
- Final UAT Sign-off ของ `DashboardOverview` (รอกรอกผลจริงใน `plansdgv1.md` หัวข้อ 23)
- ยืนยัน metric parity และ routing parity บน browser จริงครบ 3 รอบทดสอบ

### 3.2 Next Priority
1. กรอก UAT Execution Sheet ให้ครบและสรุปผล `PASS/FAIL`
2. ถ้า PASS: เปลี่ยนสถานะเป็น `Ready to Merge` และดำเนินการ release ตาม flow
3. ถ้า FAIL: แก้เฉพาะจุดที่ตก checklist แล้ว rerun UAT ทันที
4. หลังปิดรอบ Overview ค่อยเดินงานถัดไปเรื่อง Health `0` policy alignment

### 3.3 Validation Checklist
- KPI ทั้งหมดถูกนับจากทะเบียนกลาง
- รายการที่ไม่มีข้อมูลยังแสดงอยู่
- `0` ยังเป็นค่าจริงและไม่หาย
- ช่องว่างถูกบันทึกเป็น `null`
- ภาพรวมผู้บริหารแสดง Total / Reported / Assessed / Pending ชัดเจน
- สีสถานะเดิมไม่ถูกเปลี่ยนโดยไม่ตั้งใจ
- การ์ด SDGs/Health ในหน้า Overview ต้องแสดง % ตรงกับหน้ารายระบบเมื่อใช้ filter เดียวกัน
- สถิติ `วันนี้` ของ visitor ต้องอิงวันไทย (UTC+7) อย่างสม่ำเสมอ

### 3.4 Start-New-Chat Prompt
ใช้ข้อความนี้เมื่อเริ่มคุยใหม่:

```text
ช่วยอ่านไฟล์ PROJECT_STATUS.md ในโฟลเดอร์นี้ แล้วสรุป CORE_CONTEXT, CURRENT_STATE และ TASK ให้หน่อย เพื่อใช้พัฒนาต่อโดยไม่เสีย context
```

---

## Update Rule

- `CORE_CONTEXT` = คงที่เป็นหลักฐานกลางของโปรเจกต์
- `CURRENT_STATE` = เปลี่ยนทุกครั้งที่มีงานใหม่
- `TASK` = ใช้เป็นรายการงานถัดไป
- ถ้าทำงานใหม่ ให้แก้เฉพาะ `CURRENT_STATE` และ `TASK` ก่อน
- ถ้ากติกาหลักเปลี่ยนจริง ค่อยแก้ `CORE_CONTEXT`

---

## 4) GitHub + Vercel Deploy Commands

### 4.1 Push ขึ้น GitHub (ทุกครั้งที่อัปเดตงาน)

```powershell
git status
git add .
git commit -m "update: <สรุปงานสั้นๆ>"
git push origin main
```

### 4.2 ผูกโปรเจกต์กับ Vercel (ครั้งแรกเท่านั้น)

```powershell
npm install
npm run build
npm i -g vercel
vercel login
vercel link
```

### 4.3 Deploy ขึ้น Vercel

```powershell
# Preview deploy
vercel

# Production deploy
vercel --prod
```

### 4.4 Flow ที่แนะนำสำหรับโปรเจกต์นี้

1. แก้โค้ด + ทดสอบในเครื่อง (`npm run dev`)
2. เช็ก build (`npm run build`)
3. push ขึ้น GitHub (`git add/commit/push`)
4. ให้ Vercel auto-deploy จาก branch `main` (หรือสั่ง `vercel --prod`)
