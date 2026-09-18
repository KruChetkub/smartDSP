# Plan SDG V1 - DashboardOverview Redesign (No Code)

## 1) ทวนคำสั่งที่ต้องทำ (จากผู้ใช้)
1. อ่านไฟล์ `src/pages/DashboardOverview.jsx` เพื่อวิเคราะห์โครงสร้างปัจจุบัน
2. วางแผนปรับหน้า `DashboardOverview` ให้ออกมาเป็นหน้าตาใหม่ (อ้างอิงภาพแนบสไตล์ SDGs)
3. ต้องคงการใช้งานฐานข้อมูลและ logic เดิมให้ทำงานได้เหมือนเดิม
4. ต้องไม่ทำให้โค้ดพัง (safe refactor mindset)
5. ยังไม่เขียนโค้ดตอนนี้ ให้ส่งมอบเป็นแผนงานเท่านั้น
6. บันทึกแผนลงไฟล์ชื่อ `plansdgv1.md`

## 2) ขอบเขตและข้อจำกัด
- ขอบเขต: เปลี่ยนเฉพาะ "Presentation Layer" ของหน้า `DashboardOverview`
- ไม่เปลี่ยน: ตาราง Supabase, query, business rules, สูตร KPI, route เดิม
- ไม่ย้ายความหมายข้อมูล: `null`, `0`, `""`, `Pending/Assessed/Reported` ต้องคงเดิม
- ไม่เปลี่ยนเส้นทางหลักจาก Overview ไป SDGs/Health (`/sdgs`, `/healthkpi`)

## 3) ภาพรวมโครงสร้างปัจจุบัน (จาก DashboardOverview.jsx)
- ไฟล์นี้รวมทั้ง data-fetching + data-processing + UI rendering ไว้ที่เดียว
- ดึงข้อมูลจาก `sdg_indicators` และ `health_indicators` ผ่าน Supabase
- ประมวลผลสถานะด้วย `evaluateSDGStatus()` และ `evaluateHealthStatus()`
- สรุปเมตริกสำคัญ: `totalKPIs`, `reported`, `assessed`, `pending`, `passed/warning/atRisk/critical`
- แสดง UI หลักเป็น:
  - Hero + KPI summary cards
  - SDGs/Health progress cards
  - Data completeness bars
  - Table รายการ KPI พร้อมสถานะ
  - Visitor badge

## 4) เป้าหมายหน้าตาใหม่ (อิงภาพตัวอย่างที่แนบ)
- โทนภาพรวม: "SDGs Landing" แบบ immersive
- Key visual: พื้นหลังเต็มจอ + dark overlay + content center-focused
- Navigation style: top nav โปร่งบาง, emphasis ที่เมนูหลัก
- Hero copy: หัวข้อใหญ่ไทยชัดเจน + subtitle สั้น + CTA ชัด
- Motion style: reveal แบบนุ่มนวล (fade/slide) เฉพาะจุดสำคัญ
- การ์ดข้อมูล: ลดความแน่นของข้อมูลชั้นบน แยก Outcome vs Coverage ชัด

## 5) สถาปัตยกรรมการรีดีไซน์ (เพื่อไม่กระทบฐานข้อมูล)
1. Data Contract Freeze
- ล็อก shape ของ `stats`, `pipelineStats`, `tableItems` ให้เหมือนเดิม
- ห้ามเปลี่ยนชื่อ field ที่ส่วนอื่นพึ่งพา

2. UI-Only Refactor
- แยกส่วนแสดงผลออกเป็น section components (แนวคิด) โดยไม่แก้ logic คำนวณ
- อนุญาตให้เปลี่ยน className/Tailwind layout/visual tokens เท่านั้น

3. Backward-Compatible Interaction
- ปุ่มนำทางและพารามิเตอร์ query (`year`, `period`) คงเดิม
- click row ในตารางยังนำไปหน้า detail เดิมด้วย query indicator เดิม

## 6) แผนพัฒนาเป็นเฟส
### Phase A: Discovery & Mapping
- ทำแผนที่ผูกข้อมูล: UI ชิ้นไหนอ่านค่าจาก `stats` ช่องไหน
- จัดกลุ่มองค์ประกอบเป็น 4 โซน: Hero, Outcome, Coverage, Detail Table
- ระบุจุดเสี่ยงเชิงตรรกะ (เช่น Health ที่ตีค่า `0` เป็นว่าง)

### Phase B: Visual Blueprint
- กำหนด design tokens ใหม่สำหรับหน้านี้เท่านั้น:
  - สีพื้นหลัง/overlay/แสง
  - scale typography
  - spacing rhythm
- วาง wireframe ใหม่:
  - Above the fold = Hero + KPI highlights
  - Mid section = SDGs vs Health outcome cards
  - Coverage strip = reported/assessed/pending
  - Bottom = action table + visitor insight

### Phase C: Safe Refactor Strategy
- ตรึง logic functions เดิมไว้ (no-touch)
- เปลี่ยนเฉพาะโครง JSX และคลาสสไตล์
- แยก reusable display blocks เพื่อลดความเสี่ยงแก้หลายจุดแล้วเพี้ยน

### Phase D: Validation
- เทียบค่าก่อน-หลังรีดีไซน์ทุกการ์ด (ตัวเลขต้องเท่ากัน)
- เทียบ route behavior ทุกปุ่ม/ลิงก์
- ตรวจ responsive desktop/tablet/mobile
- ตรวจ loading/error/empty states ยังแสดงครบ

## 7) รายการตรวจรับ (Acceptance Criteria)
1. ตัวเลข `Total/Reported/Assessed/Pending` ก่อนและหลังรีดีไซน์ตรงกัน 100%
2. การ์ด `% SDGs` และ `% Health` คิดสูตรเดิม (`passed/total`) และค่าตรงเดิม
3. ตาราง KPI คลิกแล้วไปหน้าเดิมพร้อม `indicator` เดิม
4. ค่า `pending` ไม่ถูกนับผิดจากการเปลี่ยนหน้าตา
5. Visitor badge ยังแสดง `totalVisitors` และ `todayVisitors` ตาม hook เดิม
6. ไม่มีการแตะ schema/database query logic

## 8) ความเสี่ยงและแนวทางกันพัง
- ความเสี่ยง: ไฟล์เดียวมี logic+UI เยอะ ทำให้รีดีไซน์อาจกระทบ behavior
- วิธีลดเสี่ยง:
  - แก้ทีละ section และเทียบค่าทุกครั้ง
  - ใช้ snapshot checklist ก่อน merge
  - lock ฟังก์ชันคำนวณสถานะไม่แก้

## 9) สิ่งที่จะส่งมอบในรอบถัดไป (เมื่ออนุมัติแผน)
1. โครงสร้าง component map ของหน้าใหม่ (โดยยังไม่เปลี่ยน data logic)
2. ลำดับ commit plan แบบ safe incremental
3. QA checklist สำหรับผู้ใช้งานจริง

## 10) หมายเหตุการอ้างอิง
- ใช้ภาพแนบเป็น visual direction หลัก
- ลิงก์อ้างอิง `http://34.143.247.241:3010` ตั้งใจใช้เป็นแนวทาง แต่ใน session นี้ไม่สามารถเข้าถึงเพื่อตรวจรายละเอียดเชิงลึกได้

## 11) วิเคราะห์ภาพแนบเพิ่มเติม (ช่วงเลื่อนลงหน้าเว็บ)
จากภาพชุดเพิ่มเติม หน้าใหม่ควรไม่ได้จบแค่ Hero แต่มีโครงเล่าเรื่องแบบ scrollytelling ต่อเนื่อง โดยแบ่งเป็น 5 บล็อกหลักดังนี้

1. SDG Goals Grid (17 cards)
- แสดงการ์ด SDG 1-17 แบบ grid
- แต่ละการ์ดมี:
  - ชื่อเป้าหมาย
  - เปอร์เซ็นต์ความคืบหน้า
  - progress bar
  - จำนวน Targets / Indicators
- แนวทางเชื่อมข้อมูลเดิม:
  - ใช้ `stats` ที่มีอยู่เพื่อคำนวณค่าแบบ read-only
  - หากข้อมูลระดับ Goals 1-17 ยังไม่ครบใน schema ปัจจุบัน ให้ทำ "UI placeholder ที่แสดงจาก aggregate" ก่อน

2. Performance Summary Block (ทำได้ดี/ต้องเร่ง)
- ฝั่งซ้าย: วงแหวนสรุปภาพรวม (เช่น % บรรลุ)
- ฝั่งขวา: ลิสต์ Top 3 ทำได้ดี และ Top 3 ต้องเร่ง
- แนวทางเชื่อมข้อมูลเดิม:
  - ใช้ `stats.allIndicators` จัดอันดับตาม status/pct ที่คำนวณได้แล้ว
  - ห้ามเพิ่มเงื่อนไขใหม่ที่เปลี่ยนความหมาย `pending`

3. Data Coverage Insight (Treemap + Bar chart)
- Treemap: เปรียบเทียบว่าหัวข้อไหนมีข้อมูลมาก/น้อย
- Bar chart: ปริมาณข้อมูลตามปีงบประมาณ
- แนวทางเชื่อมข้อมูลเดิม:
  - Treemap ใช้ count จาก indicator groups ที่มีในข้อมูลปัจจุบัน
  - Bar chart ใช้ `fiscal_year` จาก records เดิม (query เดิม)
  - หากปีใดข้อมูลไม่ครบ ให้แสดงสถานะ "ข้อมูลยังไม่ครบ" ใน subtitle

4. Per-SDG Status Distribution (stacked horizontal bars)
- กราฟแท่งแนวนอน แยกแต่ละ SDG ว่า ผ่าน/เฝ้าระวัง/ต้องเร่ง เท่าไร
- แนวทางเชื่อมข้อมูลเดิม:
  - ยึด status mapping เดิมในไฟล์ (`passed_100`, `failed_75`, `failed_50`, `failed_0`, `pending`)
  - สีต้องสอดคล้อง policy กลาง (เขียว/เหลือง/ส้ม/แดง)

5. Province/Geo + Insights + Timeline
- บล็อกแผนที่ประเทศไทย + ข่าว/บทวิเคราะห์ + timeline เส้นทางสู่ปี 2573
- แนวทางเชื่อมข้อมูลเดิม:
  - หากยังไม่มีข้อมูลจังหวัดในฐานปัจจุบัน ให้แยกเป็น Phase 2 feature flag
  - ส่วน insight cards และ timeline เริ่มจาก static content config (ไม่แตะฐานก่อน)

## 12) แผนโครงหน้าใหม่แบบเลื่อนต่อเนื่อง (Section-by-Section)
1. Section A: Fullscreen Hero (existing overview summary)
2. Section B: SDG Goals Grid 17 ใบ
3. Section C: ไทยทำได้ดีแค่ไหน? (gauge + top/bottom)
4. Section D: ข้อมูลที่เรามีครอบคลุมแค่ไหน? (treemap + yearly bars)
5. Section E: แต่ละ SDG น่าเชื่อถือแค่ระดับใด? (stacked bars)
6. Section F: จังหวัดไหนนำหน้า? (map placeholder/phase 2)
7. Section G: บทประชาสัมพันธ์ (insight cards)
8. Section H: เส้นทางสู่ปี 2573 (timeline)

หมายเหตุสำคัญ:
- ภาพรวมนี้คือ "UX narrative expansion" ไม่ใช่เปลี่ยน business logic
- Section B-H ต้องกินข้อมูลเดิมให้มากที่สุดก่อน แล้วค่อยเสริม data model ในเฟสถัดไป

## 13) Data Mapping แบบไม่กระทบฐานข้อมูลเดิม
- ใช้ query เดิมจาก `fetchAllDashboards(year, period)` เป็นแหล่งข้อมูลเดียว
- ห้ามเปลี่ยนชื่อตาราง/field ใน Supabase
- เพิ่มได้เฉพาะ "derived view model" ฝั่งหน้าเว็บจากข้อมูลที่ดึงมาแล้ว
- คง helper เดิม:
  - `buildPipelineStats`
  - `isMeaningfulKpiValue`
  - status evaluators เดิม

Derived view models ที่อนุญาต:
1. `goalCardsVM` สำหรับ 17 การ์ด
2. `topBottomVM` สำหรับ top/bottom 3
3. `coverageTreemapVM` สำหรับ block ข้อมูลครอบคลุม
4. `yearlyVolumeVM` สำหรับแท่งรายปี
5. `sdgStackedVM` สำหรับกราฟกระจายสถานะ

## 14) แผนการเปิดใช้งานแบบปลอดภัย (Progressive Rollout)
1. `v1`: Hero + Goals Grid + Summary Block
2. `v1.1`: Coverage block + Stacked bars
3. `v1.2`: Insight cards + Timeline
4. `v2`: Province map (เมื่อ data จังหวัดพร้อม)

Rollout Controls:
- ใช้ feature flag ระดับหน้า เช่น `overviewRedesign=true`
- fallback กลับเลย์เอาต์เดิมได้ทันทีถ้ามี regression

## 15) Acceptance Criteria เพิ่มเติมจากภาพแนบ
1. เมื่อเลื่อนลง ต้องเห็น section ต่อเนื่องตามลำดับ B→H ชัดเจน
2. ทุก section ใช้ภาษาไทยแบบอ่านง่าย และแยก Outcome/Coverage ชัด
3. ตัวเลขที่ใช้ซ้ำกับหน้าเดิมต้องตรงกัน
4. สีสถานะต้องคงมาตรฐานเดิมทั้งระบบ
5. หากข้อมูลบาง section ยังไม่มี ต้องมี empty-state ชัด ไม่แสดงค่าหลอก
6. หน้า mobile ยังอ่านได้: cards stack, charts scroll-safe, touch targets ชัด

## 16) งานเตรียมก่อนเริ่มลงมือเขียนโค้ดจริง
1. สรุป content copy ไทยของแต่ละ section ให้คงที่ก่อน
2. ทำ wireframe low-fi ของ Section B-H พร้อม breakpoint desktop/mobile
3. ระบุชัดเจนว่า block ไหนใช้ real data ได้ทันที และ block ไหนเป็น phase 2
4. ทำ test checklist เทียบค่าหน้าเดิม/หน้าใหม่ต่อ metric

## 17) ผลลัพธ์ขั้นตอนที่ 1: Content Copy ไทย (Version 1)
วัตถุประสงค์: ใช้ข้อความกลางเดียวกันทั้งทีม เพื่อให้ตอนทำ UI ใหม่ไม่แก้ copy ไปมาและไม่สับสนความหมายตัวเลข

### Section A: Hero
- Eyebrow: `เป้าหมายการพัฒนาที่ยั่งยืน`
- Headline บรรทัด 1: `เป้าหมายการพัฒนา`
- Headline บรรทัด 2: `ที่ยั่งยืน`
- Subheadline: `ระบบติดตามผลและประเมินสถานการณ์ภาพรวม SDGs และ Health KPI ของกรมควบคุมโรค`
- CTA หลัก: `สำรวจข้อมูลภาพรวม`
- CTA รอง: `ดูรายการที่ต้องติดตาม`

### Section B: SDG Goals Grid
- Section label: `เป้าหมาย SDGs`
- Section title: `17 เป้าหมายเพื่อโลกที่ดีกว่า`
- Section subtitle: `ภาพรวมความก้าวหน้ารายเป้าหมาย เพื่อเห็นทั้งผลลัพธ์และความครบถ้วนของข้อมูล`
- Card metric 1: `ความคืบหน้า`
- Card metric 2: `Targets`
- Card metric 3: `Indicators`
- Card action: `ดูรายละเอียด`

### Section C: Performance Summary
- Section label: `ผลการดำเนินงาน`
- Section title: `ไทยทำได้ดีแค่ไหน?`
- Section subtitle: `สรุปภาพรวมผลลัพธ์เทียบเป้าหมาย และรายการที่ควรเร่งดำเนินการ`
- Gauge title: `บรรลุเป้าหมายแล้ว`
- Gauge subtext: `คำนวณจาก KPI ที่ประเมินผลได้`
- Top list title: `3 อันดับที่มีผลการดำเนินงานดีที่สุด`
- Bottom list title: `3 อันดับที่ต้องเร่งดำเนินการที่สุด`

### Section D: Data Coverage Insight
- Section label: `สัดส่วนข้อมูล`
- Section title: `ข้อมูลที่เรามีครอบคลุมแค่ไหน?`
- Section subtitle: `ดูทั้งมุมปริมาณข้อมูลรายหัวข้อ และแนวโน้มการรายงานตามปีงบประมาณ`
- Treemap title: `แต่ละเป้าหมายมีข้อมูลมากเท่าไร`
- Treemap helper: `ยิ่งพื้นที่ใหญ่ ยิ่งมีข้อมูลมาก`
- Bar chart title: `ข้อมูลเพิ่มขึ้นมากน้อยแค่ไหน`
- Bar chart helper: `จำนวนข้อมูลที่บันทึกเข้าสู่ระบบในแต่ละปี`

### Section E: Per-SDG Status Distribution
- Section title: `แต่ละ SDG น่าเชื่อถือได้ระดับใด?`
- Section subtitle: `สถานะเชิงประเมินของทั้ง 17 เป้าหมาย`
- Legend pass: `ผ่านเป้า`
- Legend watch: `เฝ้าระวัง`
- Legend risk: `เสี่ยง/ต้องเร่ง`
- Legend pending: `รอข้อมูล`

### Section F: Province / Geo (Phase 2)
- Section label: `ความก้าวหน้ารายจังหวัด`
- Section title: `จังหวัดไหนนำหน้า?`
- Section subtitle: `แผนที่แสดงสถานะการดำเนินงานตามพื้นที่ (เปิดใช้เมื่อข้อมูลจังหวัดพร้อม)`
- Empty state title: `กำลังเตรียมข้อมูลระดับจังหวัด`
- Empty state desc: `ส่วนนี้จะเปิดใช้งานเมื่อโครงสร้างข้อมูลจังหวัดผ่านการตรวจสอบครบถ้วน`

### Section G: Insights / PR
- Section title: `บทประชาสัมพันธ์`
- Section subtitle: `เกาะติดความเคลื่อนไหวล่าสุดของ SDGs ในประเทศไทย`
- Card date label: `เผยแพร่เมื่อ`
- Card action: `อ่านเพิ่มเติม`

### Section H: Timeline to 2573
- Section title: `เส้นทางสู่ปี 2573`
- Section subtitle: `ไทม์ไลน์เหตุการณ์สำคัญของการขับเคลื่อน SDGs ในประเทศไทย`
- Milestone label: `หมุดหมายสำคัญ`

### คำอธิบายมาตรฐาน (ใช้ซ้ำทุก section ที่มีตัวเลข)
- `Outcome`: `ผลลัพธ์เทียบเป้าหมายจาก KPI ที่ประเมินผลได้`
- `Coverage`: `ความครบถ้วนของข้อมูลที่ถูกรายงานเข้าสู่ระบบ`
- `Pending`: `ยังไม่มีข้อมูลเพียงพอสำหรับการประเมิน`

## 18) ผลลัพธ์ขั้นตอนที่ 2: Wireframe Low-Fi (Section B-H)
วัตถุประสงค์: กำหนดโครงหน้าจอแบบไม่ลงรายละเอียด visual polish เพื่อให้ทีมพัฒนาและตรวจสอบข้อมูลได้เร็ว

### 18.1 Desktop Wireframe (>=1280px)

#### Section B: SDG Goals Grid
```text
+-----------------------------------------------------------------------+
| [Label] เป้าหมาย SDGs                                                 |
| 17 เป้าหมายเพื่อโลกที่ดีกว่า                                          |
| subtitle                                                              |
|                                                                       |
| [Card1][Card2][Card3][Card4]                                          |
| [Card5][Card6][Card7][Card8]                                          |
| [Card9][Card10][Card11][Card12]                                       |
| [Card13][Card14][Card15][Card16]                                      |
| [Card17][empty][empty][empty]                                         |
+-----------------------------------------------------------------------+
```

#### Section C: Performance Summary
```text
+-----------------------------------------------------------------------+
| [Label] ผลการดำเนินงาน                                                |
| ไทยทำได้ดีแค่ไหน?                                                     |
| subtitle                                                              |
|                                                                       |
| +---------------------+  +-----------------------------------------+  |
| | Gauge 42%           |  | Top 3 ดีที่สุด                         |  |
| | บรรลุเป้าหมายแล้ว   |  | [1] ...                                |  |
| | assessed x/y        |  | [2] ...                                |  |
| +---------------------+  | [3] ...                                |  |
|                          +-----------------------------------------+  |
|                          +-----------------------------------------+  |
|                          | Top 3 ต้องเร่ง                          |  |
|                          | [1] ...                                |  |
|                          | [2] ...                                |  |
|                          | [3] ...                                |  |
|                          +-----------------------------------------+  |
+-----------------------------------------------------------------------+
```

#### Section D: Data Coverage Insight
```text
+-----------------------------------------------------------------------+
| [Label] สัดส่วนข้อมูล                                                  |
| ข้อมูลที่เรามีครอบคลุมแค่ไหน?                                        |
| subtitle                                                              |
|                                                                       |
| +----------------------------------+ +------------------------------+ |
| | Treemap                          | | Yearly Bar Chart            | |
| | แต่ละเป้าหมายมีข้อมูลเท่าไร     | | ข้อมูลเพิ่มขึ้นมากน้อยแค่ไหน  | |
| +----------------------------------+ +------------------------------+ |
+-----------------------------------------------------------------------+
```

#### Section E: Per-SDG Status Distribution
```text
+-----------------------------------------------------------------------+
| แต่ละ SDG น่าเชื่อถือได้ระดับใด?                                     |
| subtitle                                                              |
| [Legend: ผ่านเป้า | เฝ้าระวัง | เสี่ยง/ต้องเร่ง | รอข้อมูล]           |
|                                                                       |
| SDG1  [=====green===|==yellow==|=red=|..pending..]                   |
| SDG2  [===green==|====yellow====|==red==|.pending.]                  |
| ...                                                                   |
| SDG17 [======green======|=yellow=|==red==|.pending.]                 |
+-----------------------------------------------------------------------+
```

#### Section F + G + H
```text
+-----------------------------------------------------------------------+
| จังหวัดไหนนำหน้า?                                                     |
| +-------------------------------------------------------------------+ |
| | Thailand Map / Empty State (Phase 2)                             | |
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| บทประชาสัมพันธ์                                                       |
| [Insight Card 1] [Insight Card 2] [Insight Card 3]                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| เส้นทางสู่ปี 2573                                                     |
| [Milestone 2558]----[2560]----[2563]----[2566]----[2567]            |
+-----------------------------------------------------------------------+
```

### 18.2 Tablet Wireframe (768px - 1279px)
- Section B: grid 3 คอลัมน์ (Card 17 อยู่แถวสุดท้าย)
- Section C: gauge อยู่บน, top/bottom list ซ้อนลงมา
- Section D: treemap และ bar chart เรียงแนวตั้ง
- Section E: กราฟ stacked คงแนวนอน แต่เพิ่ม horizontal scroll zone เมื่อ label ยาว
- Section F/G/H: map เต็มความกว้าง, insight cards 2 คอลัมน์, timeline single-column zigzag เบาลง

### 18.3 Mobile Wireframe (<768px)
- Section B: grid 1 คอลัมน์ (card stack)
- Section C: gauge card 1 ใบ + top list + bottom list (เรียงลง)
- Section D: treemap ก่อน, bar chart ตาม
- Section E: stacked bars ย่อความสูงแต่ละแถว + legend บนสุด + scroll x เฉพาะกราฟ
- Section F: แสดง empty state ก่อนถ้ายังไม่มี map data
- Section G: cards แบบ carousel snap หรือ stack
- Section H: timeline vertical เส้นเดียว (อ่านง่าย)

### 18.4 Spacing / Rhythm (Low-Fi Rules)
- Section padding desktop: 80px บน/ล่าง
- Section padding mobile: 48px บน/ล่าง
- Gap ระหว่าง section: 32px desktop, 20px mobile
- Max content width: 1200px (centered)
- Card radius: large (20-24px) ให้ mood ใกล้ภาพอ้างอิง

### 18.5 Component Boundary (สำหรับลงมือขั้นต่อไป)
- `OverviewHeroSection`
- `SdgGoalsGridSection`
- `PerformanceSummarySection`
- `CoverageInsightSection`
- `SdgStatusDistributionSection`
- `ProvinceMapSection` (phase 2 ready)
- `InsightNewsSection`
- `RoadTo2030TimelineSection`

หมายเหตุ:
- ทั้งหมดนี้เป็นโครง low-fi เพื่อคุม layout และ data slots เท่านั้น
- ยังไม่ลงรายละเอียดสี/ภาพ/animation ระดับ production ในขั้นตอนนี้

## 19) ผลลัพธ์ขั้นตอนที่ 3: Data Readiness Matrix (Real Data vs Phase 2)
วัตถุประสงค์: ล็อกขอบเขตการใช้ข้อมูลให้ชัดก่อนพัฒนา ลดความเสี่ยง scope บานและลดโอกาสแก้ logic เดิม

| Section | ชื่อบล็อก | สถานะข้อมูล | แหล่งข้อมูลหลัก | แนวทางใช้ข้อมูล |
|---|---|---|---|---|
| A | Hero | Ready Now | `stats`, `pipelineStats` | ใช้ข้อมูลจริงจาก overview ปัจจุบันได้ทันที |
| B | SDG Goals Grid 17 ใบ | Partial | `sdgsRaw` + derived VM | ใช้จริงได้บางส่วน; ถ้าข้อมูลไม่ครบ 17 เป้าหมายให้ fallback ด้วย aggregate placeholder |
| C | Performance Summary | Ready Now | `stats.allIndicators`, `stats.totalAssessed`, `stats.totalPassed` | จัดอันดับ Top/Bottom จาก status เดิม (ไม่เพิ่มนิยามใหม่) |
| D1 | Coverage Treemap | Ready Now | `stats.allIndicators` (group/category) | สร้าง treemap จากจำนวนตัวชี้วัดต่อหมวด |
| D2 | Yearly Bar Chart | Ready Now | `sdgsRaw`, `healthRaw` (`fiscal_year`) | นับจำนวน records ตามปีงบประมาณจาก query เดิม |
| E | Per-SDG Stacked Bars | Partial | `sdgsRaw` + status evaluator เดิม | ทำได้ทันทีถ้า mapping SDG ครบ; ถ้าไม่ครบใช้ grouped fallback และโชว์หมายเหตุ |
| F | Province Map | Phase 2 | (ยังไม่มีชุดจังหวัดยืนยันใน scope นี้) | ใส่ empty state / coming soon พร้อม feature flag |
| G | Insight/PR Cards | Phase 1.2 Ready | static config (frontend content) | เริ่มจากเนื้อหา static ก่อน แล้วค่อยต่อ CMS/API ภายหลัง |
| H | Timeline 2573 | Phase 1.2 Ready | static config (milestones) | ใช้ milestone คงที่ก่อน ไม่ผูกฐานข้อมูล |

### 19.1 กติกา Fallback เมื่อข้อมูลไม่ครบ
1. ห้าม fabricate ตัวเลขที่ไม่มีจริงในฐาน
2. แสดงข้อความกำกับ: `ข้อมูลส่วนนี้ยังไม่ครบถ้วนในช่วงปี/ตัวกรองที่เลือก`
3. คง section ไว้ แต่แสดง skeleton/empty state ที่อ่านเข้าใจง่าย
4. รักษา interaction หลักให้ใช้งานต่อได้ (เช่นปุ่มไป `/sdgs`, `/healthkpi`)

### 19.2 Data Contract Lock (ก่อนเริ่มโค้ด)
- คง output เดิมจาก overview:
  - `stats.totalKPIs`
  - `stats.totalReported`
  - `stats.totalAssessed`
  - `stats.totalPending`
  - `stats.sdgsStats.*`
  - `stats.healthStats.*`
  - `stats.allIndicators[]`
- เพิ่มได้เฉพาะ view model ใหม่ที่ derive จากค่าข้างต้น
- ห้ามเปลี่ยน semantics:
  - `0` = ข้อมูลจริง
  - `null`/`""` = ไม่พร้อมประเมินตาม policy กลาง

### 19.3 Definition of Done สำหรับขั้นตอนที่ 3
1. ทุก section ถูกติดป้าย `Ready Now / Partial / Phase 2` ชัดเจน
2. มี fallback rule สำหรับทุก section ที่ `Partial`
3. ไม่มี requirement ใดบังคับแก้ schema/query logic
4. ทีมสามารถเริ่มลงมือพัฒนาได้โดยไม่ต้องตีความขอบเขตใหม่

## 20) ผลลัพธ์ขั้นตอนที่ 4: Test Checklist (Baseline vs Redesign)
วัตถุประสงค์: ยืนยันว่าเปลี่ยนหน้าตาแล้ว \"ตัวเลขเท่าเดิม พฤติกรรมเท่าเดิม\" ก่อนปล่อยใช้งาน

### 20.1 วิธีเทียบผล (Test Method)
1. เปิดหน้าเดิม (Baseline) และหน้าใหม่ (Redesign) ด้วย filter เดียวกัน (`year`, `period`)
2. จดค่าจาก metric สำคัญทุกตัวในตารางเทียบผล
3. ทดสอบ interaction หลักซ้ำกันทั้งสองหน้า
4. บันทึกผลเป็น `PASS/FAIL` พร้อมหมายเหตุความต่าง

### 20.2 Metric Parity Checklist (ต้องตรง 100%)
| หมวด | ตัวชี้วัด | Baseline | Redesign | ผล |
|---|---|---|---|---|
| Pipeline | Total KPIs |  |  |  |
| Pipeline | Reported KPIs |  |  |  |
| Pipeline | Assessed KPIs |  |  |  |
| Pipeline | Pending KPIs |  |  |  |
| Outcome | Total Passed |  |  |  |
| Outcome | Total Warning |  |  |  |
| Outcome | Total At Risk |  |  |  |
| Outcome | Total Critical |  |  |  |
| SDGs Card | SDGs % (`passed/total`) |  |  |  |
| SDGs Card | SDGs total/passed/warning/critical |  |  |  |
| Health Card | Health % (`passed/total`) |  |  |  |
| Health Card | Health total/passed/warning/critical |  |  |  |
| Coverage | SDGs reported / absoluteTotal |  |  |  |
| Coverage | Health reported / absoluteTotal |  |  |  |
| Visitor | totalVisitors |  |  |  |
| Visitor | todayVisitors (UTC+7) |  |  |  |

เกณฑ์ผ่าน:
- ทุกค่าต้องตรงกัน 100% (ยกเว้นค่าที่เปลี่ยนตามเวลาจริงเช่น visitor ให้ยอมรับต่างเล็กน้อยตาม timestamp)

### 20.3 Interaction & Routing Checklist
| กรณีทดสอบ | คาดหวัง | ผล |
|---|---|---|
| คลิกปุ่มไปหน้า SDGs | ไป `/sdgs` ได้ |  |
| คลิกปุ่มไปหน้า Health | ไป `/healthkpi` ได้ |  |
| คลิกแถว KPI ในตาราง | ไปหน้าปลายทางเดิมพร้อม `indicator` query เดิม |  |
| เปลี่ยน filter year/period | URL query เปลี่ยน และข้อมูล refresh ถูกต้อง |  |
| Toggle แสดงทั้งหมด/สำคัญ | จำนวนรายการเปลี่ยนถูกต้อง |  |
| Loading state | skeleton/placeholder แสดงตามที่ออกแบบ |  |
| Error state | แสดงข้อความ error ชัดเจน |  |
| Empty state | ไม่พังและสื่อสารว่าไม่มีข้อมูล |  |

### 20.4 Policy Compliance Checklist
| นโยบาย | วิธีตรวจ | ผล |
|---|---|---|
| `0` = ข้อมูลจริง | ตรวจเคสที่เป็น 0 ว่ายังถูกนับตาม policy |  |
| `null`/`""` = ไม่มีข้อมูลพร้อมประเมิน | ตรวจว่าถูกจัดเป็น pending |  |
| Pending ไม่บิดคะแนน Outcome | ตรวจสูตร % ใช้ assessed ตามที่กำหนด |  |
| KPI ทั้งหมดยังนับจากทะเบียนกลาง | ตรวจ total ตรงกับ baseline |  |
| สีสถานะมาตรฐานไม่เปลี่ยน | เขียว/เหลือง/ส้ม/แดงตรงความหมายเดิม |  |

### 20.5 Responsive & UX Checklist
| ขนาดจอ | จุดตรวจ | ผล |
|---|---|---|
| Desktop | Layout B-H ตรง wireframe และอ่านง่าย |  |
| Tablet | ไม่ล้นจอ, chart ยังอ่านได้ |  |
| Mobile | cards stack ถูกต้อง, touch target ใช้งานง่าย |  |
| Mobile | section ที่ข้อมูลไม่พร้อมมี empty state ชัดเจน |  |

### 20.6 Performance/Regression Smoke
1. หน้าโหลดได้โดยไม่ error runtime
2. ไม่มี console error จาก component ใหม่
3. ไม่มี loop re-render ผิดปกติ
4. เวลาแสดงผลแรกไม่ถดถอยรุนแรงจาก baseline

### 20.7 Exit Criteria ก่อน Merge
1. Metric parity ผ่านครบทุกข้อใน 20.2
2. Routing/interaction ผ่านครบทุกข้อใน 20.3
3. Policy compliance ผ่านครบใน 20.4
4. Responsive smoke ผ่านใน 20.5
5. มีบันทึก known limitation เฉพาะส่วน `Phase 2` (เช่น Province Map)

## 21) สถานะการตรวจล่าสุด (อัปเดต 2026-05-26)
วัตถุประสงค์: บันทึกผลตรวจจริงที่ทำได้ใน environment ปัจจุบัน เพื่อรู้ว่าใกล้ปิดงานแค่ไหน

### 21.1 ผลตรวจแบบ Code-Level Parity (PASS)
1. สูตรเมตริกหลักยังคงเดิม:
- `totalKPIs`, `totalPassed`, `totalWarning`, `totalAtRisk`, `totalCritical`
- `totalAssessed`, `totalPending`
- `% SDGs` และ `% Health` ยังคำนวณจาก `passed / total`
2. Routing หลักยังคงเดิม:
- ปุ่มไป `/sdgs`, `/healthkpi` ยังอยู่ครบ
- การคลิกแถว KPI และรายการ ranking ยังส่ง `indicator=${encodeURIComponent(...originalTitle)}`
3. Query/filter behavior ยังยึด URL search params:
- `year`, `period` เดิม
- เพิ่ม `view=redesign|classic` เพื่อ fallback โดยไม่กระทบ logic ข้อมูล
4. Toggle ตารางเดิมยังทำงาน:
- `showAll` / `setShowAll` ยังอยู่และใช้กับ compact table เดิม
5. Data policy path ยังอยู่:
- `pipelineStats` ยัง derive จาก `stats.allIndicators` เช่นเดิม

### 21.2 ผลตรวจที่ยังรอ Browser/Runtime Validation (PENDING)
1. Runtime build และ smoke test เต็มรูปแบบยังรอ:
- ติดข้อจำกัด environment: `spawn EPERM` ตอน `vite build`
2. Responsive + visual parity (desktop/tablet/mobile) ยังต้องยืนยันบนหน้าเว็บจริง
3. Loading/Error/Empty states เชิงพฤติกรรมจริงยังต้องคลิกทดสอบครบ
4. Visitor metric parity (`totalVisitors`, `todayVisitors`) ยังต้องเทียบค่าหน้าเดิม/ใหม่ช่วงเวลาเดียวกัน

### 21.3 สรุปความพร้อมก่อนปิดงาน
- สถานะรวม: `พร้อมเข้า UAT รอบสุดท้าย`
- เหลือขั้นสุดท้าย: รันทดสอบบน browser จริงตามหัวข้อ 20 แล้วติ๊ก PASS/FAIL ให้ครบทุกแถว

## 22) UAT Runbook (Final Step)
วัตถุประสงค์: ปิดงานขั้นสุดท้ายด้วยขั้นตอนทดสอบที่ทำซ้ำได้ และตัดสินใจ merge/release ได้ทันที

### 22.1 เตรียมทดสอบ
1. เปิดแอปด้วย environment เดียวกัน
2. เตรียม 2 URL สำหรับเทียบ:
- Baseline: `/?year=All&period=All&view=classic`
- Redesign: `/?year=All&period=All&view=redesign`
3. ใช้ช่วงเวลาเดียวกันในการเทียบค่า visitor

### 22.2 รอบทดสอบที่ต้องรัน (แนะนำลำดับ)
1. Metric parity รอบ `All/All`
2. Metric parity รอบ `year=2568&period=Q2`
3. Metric parity รอบ `year=2569&period=Year-End`
4. Interaction & routing ครบทุกปุ่ม
5. Responsive smoke: desktop, tablet, mobile
6. Policy checks: `0`, `null`, `pending`, status colors

### 22.3 ตารางบันทึกผลสั้น (ใช้จริง)
| รอบทดสอบ | URL Classic | URL Redesign | ผลรวม |
|---|---|---|---|
| All/All | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| 2568/Q2 | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| 2569/Year-End | PASS/FAIL | PASS/FAIL | PASS/FAIL |

### 22.4 กติกาปิดงาน
1. ถ้า checklist หัวข้อ 20 ผ่านครบ: `Ready to Merge`
2. ถ้ามี FAIL ใน metric parity: หยุด merge และแก้ก่อนทันที
3. ถ้ามี FAIL เฉพาะ visual/responsive แต่ตัวเลขไม่ผิด: ทำ hotfix UI แล้วเทสซ้ำ
4. ถ้ามี FAIL ใน routing/filter: จัดเป็น blocker ระดับสูง

### 22.5 Known Limitation ที่ยอมรับได้ในรอบนี้
1. Section แผนที่จังหวัด (Phase 2) เป็น placeholder ได้
2. Insight/Timeline ใช้ static content ได้ในรอบแรก

## 23) UAT Execution Sheet (พร้อมกรอกผลจริง)
คำแนะนำ: เปิดหน้า `classic` และ `redesign` พร้อมกัน แล้วกรอกผลทันทีในตารางนี้

### 23.1 รอบ A: `year=All&period=All`
- Classic URL: `/?year=All&period=All&view=classic`
- Redesign URL: `/?year=All&period=All&view=redesign`

| รายการ | Classic | Redesign | ผล | หมายเหตุ |
|---|---|---|---|---|
| Total KPIs |  |  |  |  |
| Reported KPIs |  |  |  |  |
| Assessed KPIs |  |  |  |  |
| Pending KPIs |  |  |  |  |
| SDGs % |  |  |  |  |
| Health % |  |  |  |  |
| Routing `/sdgs` |  |  |  |  |
| Routing `/healthkpi` |  |  |  |  |
| Table row → `indicator` |  |  |  |  |

### 23.2 รอบ B: `year=2568&period=Q2`
- Classic URL: `/?year=2568&period=Q2&view=classic`
- Redesign URL: `/?year=2568&period=Q2&view=redesign`

| รายการ | Classic | Redesign | ผล | หมายเหตุ |
|---|---|---|---|---|
| Total KPIs |  |  |  |  |
| Reported KPIs |  |  |  |  |
| Assessed KPIs |  |  |  |  |
| Pending KPIs |  |  |  |  |
| SDGs % |  |  |  |  |
| Health % |  |  |  |  |
| Routing `/sdgs` |  |  |  |  |
| Routing `/healthkpi` |  |  |  |  |
| Table row → `indicator` |  |  |  |  |

### 23.3 รอบ C: `year=2569&period=Year-End`
- Classic URL: `/?year=2569&period=Year-End&view=classic`
- Redesign URL: `/?year=2569&period=Year-End&view=redesign`

| รายการ | Classic | Redesign | ผล | หมายเหตุ |
|---|---|---|---|---|
| Total KPIs |  |  |  |  |
| Reported KPIs |  |  |  |  |
| Assessed KPIs |  |  |  |  |
| Pending KPIs |  |  |  |  |
| SDGs % |  |  |  |  |
| Health % |  |  |  |  |
| Routing `/sdgs` |  |  |  |  |
| Routing `/healthkpi` |  |  |  |  |
| Table row → `indicator` |  |  |  |  |

### 23.4 สรุปผลสุดท้าย
- UAT Result: `PASS / FAIL`
- Merge Decision: `READY / HOLD`
- ผู้ทดสอบ:
- วันที่ทดสอบ:

## 24) Final Milestone Confirmation (2026-05-26)
สถานะ: `ถึงขั้นตอนสุดท้ายตามแผนแล้ว`

สิ่งที่ยืนยันแล้ว:
1. แผน 1-4 เสร็จครบ
2. Implementation หน้าใหม่ + fallback (`classic/redesign`) เสร็จ
3. แก้ blocker ระดับสูง (React Hooks order mismatch) เรียบร้อย
4. เอกสาร UAT พร้อมกรอกผลจริงครบ

เงื่อนไขปิดงานอย่างเป็นทางการ:
1. กรอกผลหัวข้อ 23 ครบทั้ง 3 รอบทดสอบ
2. สรุป `UAT Result` เป็น `PASS`
3. ตั้ง `Merge Decision` เป็น `READY`
