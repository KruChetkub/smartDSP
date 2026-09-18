import React from "react";
import { Activity } from "lucide-react";

export default function HealthFilterHeader({
  selectedMain,
  selectedSub,
  fiscalYear,
  urlPeriod,
  uniqueMainIndicators,
  uniqueSubIndicators,
  onFilterChange,
  onMainChange,
  onSubChange,
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-600 relative z-20 shadow-md overflow-hidden flex flex-col lg:flex-row justify-between lg:items-center gap-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex-1 max-w-2xl">
        <h1 className="text-base lg:text-lg font-black text-slate-800 tracking-tight flex items-start gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
            <Activity className="text-emerald-600" size={18} />
          </div>
          {selectedMain || (
            <span className="flex flex-col text-slate-700 leading-snug">
              <span>Health KPI ในส่วนที่เกี่ยวข้องกับ</span>
              <span>กรมควบคุมโรค</span>
            </span>
          )}
        </h1>
        {selectedSub !== "ALL" && (
          <p className="text-cyan-600 font-bold ml-14">
            (เจาะจงเฉพาะ: {selectedSub})
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full lg:w-auto shrink-0 items-start sm:items-center">
        {/* Year and Quarter stacked vertically */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label className="text-slate-700 text-xs font-bold w-20 shrink-0 text-right">
              ปีงบประมาณ
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => onFilterChange(e.target.value, urlPeriod)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer h-[34px] w-[130px]"
            >
              <option value="All">ทุกปีงบประมาณ</option>
              {["2567", "2568", "2569", "2570"].map((y) => (
                <option key={y} value={y}>
                  ปี {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-700 text-xs font-bold w-20 shrink-0 text-right">
              ไตรมาส
            </label>
            <select
              value={urlPeriod}
              onChange={(e) => onFilterChange(fiscalYear, e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer h-[34px] w-[130px]"
            >
              <option value="All">ทุกไตรมาส</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
              <option value="Year-End">Year-End</option>
            </select>
          </div>
        </div>

        <div className="hidden xl:block w-px h-10 bg-slate-200 mx-2 self-center" />

        {/* Main and Sub Indicators stacked vertically */}
        <div className="flex flex-col gap-2 w-full xl:w-[380px]">
          <div className="flex items-center gap-2">
            <label className="text-emerald-700 text-xs font-bold w-28 shrink-0 text-right">
              เลือกตัวชี้วัดหลัก
            </label>
            <select
              value={selectedMain}
              onChange={onMainChange}
              className="flex-1 min-w-0 bg-white border border-slate-300 text-emerald-800 font-bold px-3 py-1.5 rounded-xl outline-none focus:border-emerald-500 transition-colors cursor-pointer text-xs shadow-sm truncate h-[34px]"
            >
              <option value="" disabled className="text-slate-400">
                กรุณาเลือกตัวชี้วัด
              </option>
              {uniqueMainIndicators.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {uniqueSubIndicators.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-cyan-700 text-[11px] font-bold w-28 shrink-0 text-right">
                เลือกตัวชี้วัดย่อย(ถ้ามี)
              </label>
              <select
                value={selectedSub}
                onChange={onSubChange}
                className="flex-1 min-w-0 bg-white border border-slate-300 text-cyan-800 font-bold px-3 py-1.5 rounded-xl outline-none focus:border-cyan-500 transition-colors cursor-pointer text-xs shadow-sm truncate h-[34px]"
              >
                <option value="ALL">-- รวมตัวชี้วัดย่อยทั้งหมด --</option>
                {uniqueSubIndicators.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

