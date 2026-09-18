import React from "react";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  XCircle,
} from "lucide-react";

export default function OverviewHeroSection({
  redesignEnabled,
  scrollToOverviewMetrics,
  heroGradient,
  fiscalYear,
  period,
  setGlobalFilter,
  setViewMode,
  passedPct,
  stats,
  pipelineStats,
}) {
  return (
    <>
      {redesignEnabled && (
        <section className="relative min-h-[calc(100vh-4rem)] w-screen ml-[calc(50%-50vw)] overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(1000px 420px at 70% 55%, rgba(34,197,94,0.28), transparent 60%), linear-gradient(120deg, #041737 0%, #0b2b59 55%, #143f7b 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.45) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10 h-full min-h-[78vh] flex items-center justify-center px-6">
            <div className="text-center max-w-3xl">
              <p className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-8 py-2.5 text-xxs font-black text-white/90">
                DASH BOARD
              </p>
              <h1 className="mt-6 text-4xl md:text-6xl font-black text-white leading-[1.2]">
                <span className="block">ผลการดำเนินงาน</span>
                <span className="block h-6 md:h-8" aria-hidden="true" />
                <span className="block">ตามตัวชี้วัดสำคัญ</span>
              </h1>
              <p className="mt-4 text-sm md:text-base text-slate-200">
                กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
              </p>
              <button
                type="button"
                onClick={scrollToOverviewMetrics}
                className="inline-block mt-8 px-7 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm transition-colors"
              >
                ดูข้อมูล
              </button>
            </div>
          </div>
        </section>
      )}

      {/* HERO SECTION — Big number, status summary */}
      <div
        id="overview-metrics"
        className={`relative overflow-hidden bg-gradient-to-r ${heroGradient} rounded-3xl p-8 md:p-10 text-slate-900 shadow-2xl border border-white/60`}
      >
        {/* Background texture */}
        <div
          className={`absolute inset-0 ${redesignEnabled ? "opacity-35" : "opacity-20"}`}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
              backgroundSize: "26px 26px",
            }}
          />
        </div>
        <div
          className={`absolute inset-0 ${redesignEnabled ? "bg-gradient-to-tr from-slate-950/45 via-transparent to-cyan-950/20" : "bg-gradient-to-tr from-white/40 via-transparent to-white/20"}`}
        />
        <div
          className={`absolute -right-16 -top-16 w-72 h-72 rounded-full blur-3xl ${redesignEnabled ? "bg-cyan-400/20" : "bg-blue-300/25"}`}
        />
        <div
          className={`absolute -left-8 -bottom-8 w-48 h-48 rounded-full blur-3xl ${redesignEnabled ? "bg-emerald-300/20" : "bg-emerald-200/30"}`}
        />

        <div className="relative z-10 flex flex-col gap-6 w-full">
          {/* Top Row: Title & Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <p
              className={`font-black uppercase tracking-widest text-2xl md:text-3xl flex items-center gap-3 drop-shadow-sm ${redesignEnabled ? "text-white" : "text-slate-900"}`}
            >
              <Target size={32} /> กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
            </p>
            <div className="hidden md:block h-5 w-px bg-slate-900/10"></div>
            <div className="flex items-center gap-2">
              <select
                value={fiscalYear}
                onChange={(e) => setGlobalFilter(e.target.value, period)}
                className={`transition-colors rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 appearance-none cursor-pointer shadow-sm ${redesignEnabled ? "bg-white/95 hover:bg-white border border-white/30 text-slate-900 focus:ring-sky-300/50" : "bg-white/80 hover:bg-white border border-slate-900/10 text-slate-900 focus:ring-slate-400/40"}`}
              >
                <option value="All" className="text-slate-800">
                  ทุกปีงบประมาณ
                </option>
                {["2567", "2568", "2569", "2570"].map((y) => (
                  <option key={y} value={y} className="text-slate-800">
                    ปี {y}
                  </option>
                ))}
              </select>
              <select
                value={period}
                onChange={(e) => setGlobalFilter(fiscalYear, e.target.value)}
                className={`transition-colors rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 appearance-none cursor-pointer shadow-sm ${redesignEnabled ? "bg-white/95 hover:bg-white border border-white/30 text-slate-900 focus:ring-sky-300/50" : "bg-white/80 hover:bg-white border border-slate-900/10 text-slate-900 focus:ring-slate-400/40"}`}
              >
                <option value="All" className="text-slate-800">
                  ทุกไตรมาส
                </option>
                <option value="Q1" className="text-slate-800">
                  Q1
                </option>
                <option value="Q2" className="text-slate-800">
                  Q2
                </option>
                <option value="Q3" className="text-slate-800">
                  Q3
                </option>
                <option value="Q4" className="text-slate-800">
                  Q4
                </option>
                <option value="Year-End" className="text-slate-800">
                  Year-End
                </option>
              </select>
            </div>
            {/* Current Date Badge */}
            <div
              className={`hidden md:flex items-center gap-1.5 ml-auto backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm ${redesignEnabled ? "bg-white/20 border border-white/20" : "bg-white/55 border border-white/70"}`}
            >
              <span
                className={`text-[11px] font-semibold whitespace-nowrap ${redesignEnabled ? "text-slate-100" : "text-slate-600"}`}
              >
                ข้อมูล ณ วันที่
              </span>
              <span
                className={`text-[11px] font-black whitespace-nowrap ${redesignEnabled ? "text-white" : "text-slate-900"}`}
              >
                {new Date().toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Middle Row: Big Number & Status Summary */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 w-full">
            {/* Left: Big Number */}
            <div className="flex items-end gap-4 min-w-max">
              <span className="text-[5.25rem] md:text-[6rem] font-black tracking-wider tabular-nums leading-none text-white drop-shadow-sm">
                {passedPct}
              </span>
              <div className="pb-2">
                <span
                  className={`text-[2.1rem] font-black drop-shadow-sm ${redesignEnabled ? "text-white" : "text-slate-900"}`}
                >
                  %
                </span>
                <p
                  className={`text-base font-bold uppercase tracking-wider drop-shadow-sm ${redesignEnabled ? "text-slate-100" : "text-slate-900"}`}
                >
                  ภาพรวมการดำเนินงาน
                </p>
              </div>
            </div>

            {/* Middle: Target Text */}
            <div className="flex-1 flex justify-center text-center">
              <div
                className={`px-4 py-4 rounded-2xl shadow-sm backdrop-blur-md ${redesignEnabled ? "bg-white/20 border border-white/20" : "bg-white/60 border border-white/80"}`}
              >
                <p
                  className={`text-base md:text-lg font-medium tracking-wide drop-shadow-sm ${redesignEnabled ? "text-white" : "text-slate-900"}`}
                >
                  บรรลุเป้าหมาย{" "}
                  <span
                    className={`font-black text-xl ${redesignEnabled ? "text-white" : "text-slate-950"}`}
                  >
                    {stats.totalPassed}
                  </span>{" "}
                  จาก{" "}
                  <span
                    className={`font-black text-xl ${redesignEnabled ? "text-white" : "text-slate-950"}`}
                  >
                    {stats.totalAssessed}
                  </span>{" "}
                </p>
                <p
                  className={`text-base md:text-lg font-medium tracking-wide drop-shadow-sm ${redesignEnabled ? "text-slate-100" : "text-slate-900"}`}
                >
                  ตัวชี้วัดที่ประเมินได้
                </p>
              </div>
            </div>

            {/* Right: Status Pill Summary */}
            <div className="flex flex-wrap justify-end gap-3 min-w-max">
              <div className="flex items-center gap-3 bg-green-600 border border-green-500 px-5 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105">
                <CheckCircle2 size={20} className="text-white" />
                <div>
                  <p className="text-[1.8rem] font-black text-white tabular-nums leading-none mb-1">
                    {stats.totalPassed}
                  </p>
                  <p className="text-white text-[11px] font-bold uppercase tracking-wider">
                    บรรลุเป้าหมาย
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-yellow-400 border border-yellow-300 px-5 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105">
                <AlertTriangle size={20} className="text-slate-900" />
                <div>
                  <p className="text-[1.8rem] font-black text-slate-900 tabular-nums leading-none mb-1">
                    {stats.totalWarning}
                  </p>
                  <p className="text-slate-900 text-[11px] font-bold uppercase tracking-wider">
                    เฝ้าระวัง
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-orange-500 border border-orange-400 px-5 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105">
                <AlertOctagon size={20} className="text-white" />
                <div>
                  <p className="text-[1.8rem] font-black text-white tabular-nums leading-none mb-1">
                    {stats.totalAtRisk}
                  </p>
                  <p className="text-white text-[11px] font-bold uppercase tracking-wider">
                    ระดับเสี่ยง
                  </p>
                </div>
              </div>
              <div
                className={`flex items-center gap-3 border px-5 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105 ${stats.totalCritical > 0 ? "bg-red-600 border-red-500 pulse-ring-rose" : "bg-red-800/60 border-red-500/30"}`}
              >
                <XCircle size={20} className="text-white" />
                <div>
                  <p className="text-[1.8rem] font-black text-white tabular-nums leading-none mb-1">
                    {stats.totalCritical}
                  </p>
                  <p className="text-white text-[11px] font-bold uppercase tracking-wider">
                    ขั้นวิกฤติ
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data coverage summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 w-full">
            <div className="bg-white/80 border border-white/70 rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm">
              <p className="text-[14px] font-black uppercase tracking-wider text-slate-500">
                ตัวชี้วัดทั้งหมด
              </p>
              <p className="text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {stats.totalKPIs}
              </p>
            </div>
            <div className="bg-white/80 border border-white/70 rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm">
              <p className="text-[14px] font-black uppercase tracking-wider text-sky-700">
                มีข้อมูลแล้ว
              </p>
              <p className="text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {pipelineStats.reported}
              </p>
            </div>
            <div className="bg-white/80 border border-white/70 rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm">
              <p className="text-[14px] font-black uppercase tracking-wider text-emerald-700">
                ประเมินผลได้
              </p>
              <p className="text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {pipelineStats.assessed}
              </p>
            </div>
            <div className="bg-white/80 border border-white/70 rounded-2xl px-4 py-3 shadow-sm backdrop-blur-sm">
              <p className="text-[14px] font-black uppercase tracking-wider text-slate-500">
                รอข้อมูล
              </p>
              <p className="text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {pipelineStats.pending}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

