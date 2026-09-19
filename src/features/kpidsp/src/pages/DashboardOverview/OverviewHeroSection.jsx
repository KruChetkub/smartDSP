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
          <div className="relative z-10 h-full min-h-[78vh] flex items-center justify-center px-4 sm:px-6">
            <div className="text-center max-w-3xl">
              <p className="inline-flex items-center rounded-full border border-white/35 bg-white/10 px-6 sm:px-8 py-2 sm:py-2.5 text-xs font-black text-white/90">
                DASH BOARD
              </p>
              <h1 className="mt-4 sm:mt-6 text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight sm:leading-[1.2]">
                <span className="block">ผลการดำเนินงาน</span>
                <span className="block my-1 sm:my-2" aria-hidden="true" />
                <span className="block">ตามตัวชี้วัดสำคัญ</span>
              </h1>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base text-slate-200">
                กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
              </p>
              <button
                type="button"
                onClick={scrollToOverviewMetrics}
                className="inline-block mt-6 sm:mt-8 px-6 sm:px-7 py-2.5 sm:py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-black text-sm transition-colors shadow-lg"
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
        className={`relative overflow-hidden bg-gradient-to-r ${heroGradient} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 text-slate-900 shadow-2xl border border-white/60`}
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

        <div className="relative z-10 flex flex-col gap-5 sm:gap-6 w-full">
          {/* Top Row: Title & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <p
              className={`font-black uppercase tracking-wide text-base sm:text-2xl md:text-3xl flex items-center gap-2 sm:gap-3 drop-shadow-sm ${redesignEnabled ? "text-white" : "text-slate-900"}`}
            >
              <Target className="h-6 w-6 sm:h-8 sm:w-8 shrink-0 text-sky-400" />
              <span>กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค</span>
            </p>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={fiscalYear}
                onChange={(e) => setGlobalFilter(e.target.value, period)}
                className={`flex-1 sm:flex-none transition-colors rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 appearance-none cursor-pointer shadow-sm ${redesignEnabled ? "bg-white/95 hover:bg-white border border-white/30 text-slate-900 focus:ring-sky-300/50" : "bg-white/80 hover:bg-white border border-slate-900/10 text-slate-900 focus:ring-slate-400/40"}`}
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
                className={`flex-1 sm:flex-none transition-colors rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 appearance-none cursor-pointer shadow-sm ${redesignEnabled ? "bg-white/95 hover:bg-white border border-white/30 text-slate-900 focus:ring-sky-300/50" : "bg-white/80 hover:bg-white border border-slate-900/10 text-slate-900 focus:ring-slate-400/40"}`}
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
              
              {/* Current Date Badge */}
              <div
                className={`hidden lg:flex items-center gap-1.5 ml-auto backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm ${redesignEnabled ? "bg-white/20 border border-white/20" : "bg-white/55 border border-white/70"}`}
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
          </div>

          {/* Middle Row: Big Number & Status Summary */}
          <div className="flex flex-col xl:flex-row items-center xl:items-center justify-between gap-5 sm:gap-6 w-full">
            {/* Left: Big Number & Target Text */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-center xl:justify-start gap-3.5 sm:gap-5 w-full xl:w-auto">
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight tabular-nums leading-none text-white drop-shadow-sm">
                  {passedPct}
                </span>
                <div className="flex flex-col">
                  <span
                    className={`text-2xl sm:text-3xl font-black leading-none drop-shadow-sm ${redesignEnabled ? "text-white" : "text-slate-900"}`}
                  >
                    %
                  </span>
                  <span
                    className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider drop-shadow-sm mt-1 whitespace-nowrap ${redesignEnabled ? "text-slate-100" : "text-slate-900"}`}
                  >
                    ภาพรวมการดำเนินงาน
                  </span>
                </div>
              </div>

              {/* Target Text Card */}
              <div
                className={`px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm backdrop-blur-md text-left ${redesignEnabled ? "bg-white/20 border border-white/20" : "bg-white/60 border border-white/80"}`}
              >
                <p
                  className={`text-xs sm:text-sm font-medium tracking-wide drop-shadow-sm whitespace-nowrap ${redesignEnabled ? "text-white" : "text-slate-900"}`}
                >
                  บรรลุเป้าหมาย{" "}
                  <span
                    className={`font-black text-base sm:text-lg ${redesignEnabled ? "text-white" : "text-slate-950"}`}
                  >
                    {stats.totalPassed}
                  </span>{" "}
                  จาก{" "}
                  <span
                    className={`font-black text-base sm:text-lg ${redesignEnabled ? "text-white" : "text-slate-950"}`}
                  >
                    {stats.totalAssessed}
                  </span>
                </p>
                <p
                  className={`text-[10px] sm:text-xs font-medium tracking-wide drop-shadow-sm mt-0.5 whitespace-nowrap ${redesignEnabled ? "text-slate-100" : "text-slate-900"}`}
                >
                  ตัวชี้วัดที่ประเมินได้
                </p>
              </div>
            </div>

            {/* Right: Status Pill Summary */}
            <div className="w-full xl:w-auto xl:max-w-2xl xl:flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 xl:gap-3 w-full">
                <div className="flex items-center gap-2 sm:gap-2.5 bg-green-600 border border-green-500 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg transition-transform hover:scale-105 min-w-0">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-white" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none mb-0.5">
                      {stats.totalPassed}
                    </p>
                    <p className="text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                      บรรลุเป้าหมาย
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5 bg-yellow-400 border border-yellow-300 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg transition-transform hover:scale-105 min-w-0">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-slate-900" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none mb-0.5">
                      {stats.totalWarning}
                    </p>
                    <p className="text-slate-900 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                      เฝ้าระวัง
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-2.5 bg-orange-500 border border-orange-400 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg transition-transform hover:scale-105 min-w-0">
                  <AlertOctagon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-white" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none mb-0.5">
                      {stats.totalAtRisk}
                    </p>
                    <p className="text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                      ระดับเสี่ยง
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-2 sm:gap-2.5 border p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg transition-transform hover:scale-105 min-w-0 ${stats.totalCritical > 0 ? "bg-red-600 border-red-500 pulse-ring-rose" : "bg-red-800/60 border-red-500/30"}`}
                >
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-white" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xl sm:text-2xl font-black text-white tabular-nums leading-none mb-0.5">
                      {stats.totalCritical}
                    </p>
                    <p className="text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                      ขั้นวิกฤติ
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data coverage summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-2 sm:mt-6 w-full">
            <div className="bg-white/80 border border-white/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-sm min-w-0">
              <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500 truncate">
                ตัวชี้วัดทั้งหมด
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {stats.totalKPIs}
              </p>
            </div>
            <div className="bg-white/80 border border-white/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-sm min-w-0">
              <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-sky-700 truncate">
                มีข้อมูลแล้ว
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {pipelineStats.reported}
              </p>
            </div>
            <div className="bg-white/80 border border-white/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-sm min-w-0">
              <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-700 truncate">
                ประเมินผลได้
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {pipelineStats.assessed}
              </p>
            </div>
            <div className="bg-white/80 border border-white/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-sm min-w-0">
              <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500 truncate">
                รอข้อมูล
              </p>
              <p className="text-xl sm:text-2xl font-black text-slate-950 mt-1 tabular-nums">
                {pipelineStats.pending}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
