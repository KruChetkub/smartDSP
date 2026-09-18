import React, { useState } from "react";
import {
  Activity,
  TrendingUp,
  Sparkles,
  Layers,
  BarChart2,
} from "lucide-react";
import { DonutRing } from "./overviewUtils";

export function SdgGoalsGridSection({ sdgGoalCards }) {
  return (
    <section
      id="goals"
      className="scroll-mt-20 bg-white/90 border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm"
    >
      <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-700">
        เป้าหมาย SDGs
      </p>
      <h2 className="mt-2 text-2xl md:text-3xl font-black text-slate-950">
        {sdgGoalCards.length || 0} เป้าหมายจากข้อมูลในระบบ
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        นับจากข้อมูล SDG ที่มีจริงตามตัวกรองปีงบประมาณและไตรมาสที่เลือก
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {sdgGoalCards.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-bold text-slate-600">
              ยังไม่มีข้อมูลเป้าหมาย SDG สำหรับตัวกรองที่เลือก
            </p>
          </div>
        )}
        {sdgGoalCards.map((goal) => (
          <article
            key={goal.no ?? goal.title}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                {goal.no ? `SDG ${goal.no}` : "UNMAPPED"}
              </p>
              <p className="text-lg font-black tabular-nums text-slate-800">
                {goal.progress}%
              </p>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900 leading-tight min-h-10">
              {goal.sourceLabel}
            </p>
            <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-bold text-slate-500">
              {goal.total > 0
                ? `${goal.passed}/${goal.total} ผ่านเป้า`
                : "ยังไม่มีข้อมูลที่ map ได้"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PerformanceSummarySection({ passedPct, performanceRanking, navigate }) {
  return (
    <section id="summary" className="scroll-mt-20 grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <DonutRing percent={passedPct} color="#16a34a" size={160} stroke={12} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-4xl font-black text-emerald-700 leading-none">
              {passedPct}%
            </p>
          </div>
        </div>
        <div className="text-center mt-2">
          <p className="text-xs font-bold text-slate-500">
            บรรลุเป้าหมายจาก KPI ที่ประเมินผลได้
          </p>
        </div>
      </div>
      <div className="xl:col-span-2 grid grid-cols-1 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-sm font-black text-emerald-800 mb-2">
            3 อันดับที่มีผลการดำเนินงานดีที่สุด
          </p>
          <div className="space-y-2">
            {performanceRanking.best.length === 0 ? (
              <p className="text-xs font-bold text-slate-500">ยังไม่มี KPI ที่ประเมินผลได้</p>
            ) : (
              performanceRanking.best.map((item, i) => (
                <button
                  key={`best-${item.id}-${i}`}
                  onClick={() =>
                    navigate(
                      `/${item.system === "SDGs" ? "sdgs" : "healthkpi"}?indicator=${encodeURIComponent(item.originalTitle)}`,
                    )
                  }
                  className="w-full text-left bg-white rounded-xl px-3 py-2 border border-emerald-100 hover:border-emerald-300"
                >
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {item.title}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
          <p className="text-sm font-black text-orange-800 mb-2">
            3 อันดับที่ต้องเร่งดำเนินการที่สุด
          </p>
          <div className="space-y-2">
            {performanceRanking.worst.length === 0 ? (
              <p className="text-xs font-bold text-slate-500">ยังไม่มี KPI ที่ประเมินผลได้</p>
            ) : (
              performanceRanking.worst.map((item, i) => (
                <button
                  key={`worst-${item.id}-${i}`}
                  onClick={() =>
                    navigate(
                      `/${item.system === "SDGs" ? "sdgs" : "healthkpi"}?indicator=${encodeURIComponent(item.originalTitle)}`,
                    )
                  }
                  className="w-full text-left bg-white rounded-xl px-3 py-2 border border-orange-100 hover:border-orange-300"
                >
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {item.title}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function OutcomeSystemCardsSection({
  sdgPct,
  healthPct,
  sdgsStats,
  healthStats,
  navigate,
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Layers size={18} className="text-sky-600" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-sky-700">
                Outcome
              </p>
              <h3 className="text-base font-black text-slate-950">ภาพรวม SDGs</h3>
            </div>
          </div>
          <button
            onClick={() => navigate("/sdgs")}
            className="text-xs font-black text-sky-700 hover:text-sky-900"
          >
            ดูรายละเอียด
          </button>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <DonutRing percent={sdgPct} color="#0ea5e9" size={96} stroke={10} />
            <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900">
              {sdgPct}%
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {[
              { label: "ทั้งหมด", value: sdgsStats.total },
              { label: "บรรลุ", value: sdgsStats.passed },
              { label: "เฝ้าระวัง", value: sdgsStats.warning },
              { label: "วิกฤติ", value: sdgsStats.critical },
            ].map((i) => (
              <div key={i.label} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-lg font-black text-slate-900 tabular-nums">{i.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {i.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BarChart2 size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-emerald-700">
                Outcome
              </p>
              <h3 className="text-base font-black text-slate-950">ภาพรวม Health KPI</h3>
            </div>
          </div>
          <button
            onClick={() => navigate("/healthkpi")}
            className="text-xs font-black text-emerald-700 hover:text-emerald-900"
          >
            ดูรายละเอียด
          </button>
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <DonutRing percent={healthPct} color="#10b981" size={96} stroke={10} />
            <div className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900">
              {healthPct}%
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {[
              { label: "ทั้งหมด", value: healthStats.total },
              { label: "บรรลุ", value: healthStats.passed },
              { label: "เฝ้าระวัง", value: healthStats.warning },
              { label: "วิกฤติ", value: healthStats.critical },
            ].map((i) => (
              <div key={i.label} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-lg font-black text-slate-900 tabular-nums">{i.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {i.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CoverageInsightSection({ coverageByCategory, yearlyVolume }) {
  const maxYearly = Math.max(1, ...yearlyVolume.map((i) => i.count));

  return (
    <section id="coverage" className="scroll-mt-20 grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-sky-600" />
          <h3 className="text-lg font-black text-slate-900">
            ข้อมูลที่เรามีครอบคลุมแค่ไหน?
          </h3>
        </div>
        <div className="h-[360px] rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6 flex items-center justify-center text-center">
          <p className="text-sm font-bold text-slate-500">
            ปิดการแสดงผลส่วนนี้ชั่วคราว
          </p>
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-emerald-600" />
          <h3 className="text-lg font-black text-slate-900">
            ข้อมูลเพิ่มขึ้นมากน้อยแค่ไหน?
          </h3>
        </div>
        <div className="space-y-3">
          {yearlyVolume.map((y) => (
            <div key={y.year}>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>ปี {y.year}</span>
                <span>{y.count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${(y.count / maxYearly) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SdgStatusDistributionSection({ sdgGoalCards }) {
  return (
    <section
      id="distribution"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-sky-600" />
        <h2 className="text-xl md:text-2xl font-black text-slate-950">
          แต่ละ SDG น่าเชื่อถือได้ระดับใด?
        </h2>
      </div>
      <div className="mt-5 space-y-3">
        {sdgGoalCards.map((goal) => {
          const total = Math.max(1, goal.total);
          const parts = [
            { key: "passed", val: goal.passed, cls: "bg-emerald-500" },
            { key: "warning", val: goal.warning, cls: "bg-amber-400" },
            { key: "risk", val: goal.atRisk + goal.critical, cls: "bg-rose-500" },
            { key: "pending", val: goal.pending, cls: "bg-slate-300" },
          ];
          return (
            <div
              key={`dist-${goal.no ?? goal.sourceLabel ?? goal.title}`}
              className="grid grid-cols-12 items-center gap-3"
            >
              <p className="col-span-12 sm:col-span-3 text-xs font-bold text-slate-700">
                {goal.no ? `SDG ${goal.no}` : "UNMAPPED"} {goal.sourceLabel || goal.title}
              </p>
              <div className="col-span-12 sm:col-span-9 h-3 rounded-full bg-slate-100 overflow-hidden flex">
                {parts.map((part) => (
                  <div
                    key={part.key}
                    className={part.cls}
                    style={{ width: `${(part.val / total) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ProvincePlaceholderSection() {
  return (
    <section
      id="province"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-600" />
        <h2 className="text-xl md:text-2xl font-black text-slate-950">
          จังหวัดไหนนำหน้า?
        </h2>
      </div>
      <p className="text-sm text-slate-600 mt-2">
        กำลังเตรียมข้อมูลระดับจังหวัด ส่วนนี้จะเปิดใช้งานเมื่อโครงสร้างข้อมูลพร้อม
      </p>
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p className="text-sm font-bold text-slate-500">
          Phase 2: Province Map (Coming Soon)
        </p>
      </div>
    </section>
  );
}

export function InsightCardsSection() {
  return (
    <section
      id="insights"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm"
    >
      <h2 className="text-2xl font-black text-slate-950">บทประชาสัมพันธ์</h2>
      <p className="text-sm text-slate-600 mt-1">
        เกาะติดความเคลื่อนไหวล่าสุดของ SDGs ในประเทศไทย
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
        <p className="text-sm font-black text-slate-600">ยังไม่มีข้อมูลบทประชาสัมพันธ์</p>
        <p className="text-xs text-slate-500 mt-1">
          ส่วนนี้จะเปิดใช้งานเมื่อมีแหล่งข้อมูลข่าว/ประกาศอย่างเป็นทางการ
        </p>
      </div>
    </section>
  );
}

export function RoadTo2030TimelineSection() {
  return (
    <section
      id="timeline"
      className="scroll-mt-20 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm"
    >
      <h2 className="text-2xl font-black text-slate-950">เส้นทางสู่ปี 2573</h2>
      <p className="text-sm text-slate-600 mt-1">
        ไทม์ไลน์เหตุการณ์สำคัญของการขับเคลื่อน SDGs ในประเทศไทย
      </p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
        <p className="text-sm font-black text-slate-600">ยังไม่มีข้อมูลเส้นทางสู่ปี 2573</p>
        <p className="text-xs text-slate-500 mt-1">
          ส่วนนี้จะเปิดใช้งานเมื่อมีรายการเหตุการณ์ที่ยืนยันอย่างเป็นทางการ
        </p>
      </div>
    </section>
  );
}

