import React, { useState } from "react";
import {
  AlertOctagon,
  ShieldCheck,
  Layers,
  ArrowRight,
  BarChart2,
  Activity,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { DonutRing, STATUS } from "./overviewUtils";
import { useVisitorCount } from "../../hooks/useVisitorCount";

function VisitorBadge() {
  const { totalVisitors, todayVisitors, isLoading } = useVisitorCount();
  if (isLoading) return null;
  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm transition-all hover:shadow-md hover:border-violet-200 group cursor-default">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-50 transition-colors">
        <Users
          size={14}
          className="text-slate-400 group-hover:text-violet-600 transition-colors"
        />
      </div>
      <div className="leading-tight text-left">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-violet-500 transition-colors">
          ดูสถิติเว็บไซต์ (Session)
        </p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-base font-black text-slate-800 tabular-nums">
            {totalVisitors?.toLocaleString() ?? "—"}
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md whitespace-nowrap group-hover:bg-violet-50 group-hover:text-violet-600 group-hover:border-violet-100 transition-colors">
            วันนี้ {todayVisitors ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OverviewClassicTableSection({
  actionItems,
  stats,
  sdgPct,
  healthPct,
  navigate,
}) {
  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          BENTO ROW 1 — Urgent Panel
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-3xl border border-rose-500 shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-rose-50 bg-rose-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertOctagon size={18} className="text-rose-600" />
              </div>
              <div>
                <h2 className="font-black text-slate-950 text-base">
                  รายการที่ต้องเร่งดำเนินการ
                </h2>
                <p className="text-sm text-slate-950 font-medium">
                  ตัวชี้วัดที่ยังต่ำกว่าเป้าหมาย ({actionItems.length} รายการ)
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {actionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-300">
                <ShieldCheck size={36} />
                <p className="font-bold text-base text-slate-950">
                  ทุกตัวชี้วัดผ่านเป้าหมาย
                </p>
              </div>
            ) : (
              actionItems.slice(0, 5).map((kpi, i) => {
                const s = STATUS[kpi.status] || STATUS.pending;
                const rank = i + 1;
                const rankColor =
                  rank === 1
                    ? "bg-rose-500"
                    : rank === 2
                      ? "bg-orange-500"
                      : rank === 3
                        ? "bg-amber-500"
                        : "bg-slate-300";
                return (
                  <div
                    key={kpi.id}
                    onClick={() =>
                      navigate(
                        `/${kpi.system === "SDGs" ? "sdgs" : "healthkpi"}?indicator=${encodeURIComponent(kpi.originalTitle)}`,
                      )
                    }
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors group cursor-pointer"
                  >
                    <span
                      className={`w-7 h-7 rounded-lg ${rankColor} text-white text-xs font-black flex items-center justify-center flex-shrink-0`}
                    >
                      {rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-950 text-base truncate group-hover:text-slate-950 transition-colors">
                        {kpi.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                          {kpi.system}
                        </span>
                        {kpi.target && (
                          <span className="text-xs text-slate-950">
                            เป้า: {kpi.target}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {kpi.performance && (
                        <span className="text-[1.4rem] font-black text-slate-950 tabular-nums">
                          {kpi.performance}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.short}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {actionItems.length > 5 && (
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-xs font-bold text-slate-400">
                และอีก {actionItems.length - 5} รายการ — ดูในตารางสรุปด้านล่าง
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BENTO ROW 2 — SDGs vs Health KPI Side-by-Side
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SDGs Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 hover:shadow-lg transition-all hover:border-sky-600 group">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <Layers size={18} className="text-sky-600" />
              </div>
              <div>
                <h3 className="text-[1.1rem] font-black text-slate-950">
                  ตัวชี้วัดภายใต้แผนการขับเคลื่อนการพัฒนาที่ยั่งยืน
                </h3>
                <h3 className="text-[1.1rem] font-black text-slate-950">
                  SDGs เป้าหมายที่ 3 ในส่วนที่เกี่ยวข้อง
                </h3>
                <h3 className="text-[1.1rem] font-black text-slate-950">
                  กับกรมควบคุมโรค
                </h3>
                <p className="text-sm text-slate-950 font-medium">
                  Sustainable Development Goals
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/sdgs")}
              className="flex items-center gap-1 text-sm font-bold text-sky-700 hover:text-sky-900 transition-colors mt-1 flex-shrink-0"
            >
              ดูรายละเอียด <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex items-center gap-6 mt-6">
            <div className="relative flex-shrink-0">
              <DonutRing
                percent={sdgPct}
                color="#0ea5e9"
                size={100}
                stroke={10}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[1.7rem] font-black text-slate-950 tabular-nums leading-none">
                  {sdgPct}
                </span>
                <span className="text-sm font-bold text-slate-950">%</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                {
                  label: "ทั้งหมด",
                  val: stats.sdgsStats.total,
                  color: "text-slate-700",
                },
                {
                  label: "บรรลุเป้า",
                  val: stats.sdgsStats.passed,
                  color: "text-emerald-600",
                },
                {
                  label: "เฝ้าระวัง",
                  val: stats.sdgsStats.warning,
                  color: "text-amber-600",
                },
                {
                  label: "วิกฤติ",
                  val: stats.sdgsStats.critical,
                  color: "text-rose-600",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 rounded-2xl p-3 text-center"
                >
                  <p
                    className={`text-[1.7rem] font-black tabular-nums ${item.color}`}
                  >
                    {item.val}
                  </p>
                  <p className="text-xs font-bold text-slate-950 uppercase tracking-wider mt-0.5">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-1000"
              style={{ width: `${sdgPct}%` }}
            />
          </div>
        </div>

        {/* Health KPI Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 hover:shadow-lg transition-all hover:border-emerald-600 group">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <BarChart2 size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[1.1rem] font-black text-slate-950">
                  ตัวชี้วัดกระทรวงสาธารณสุข ในส่วนที่เกี่ยวข้อง
                </h3>
                <h3 className="text-[1.1rem] font-black text-slate-950">
                  กับกรมควบคุมโรค
                </h3>
                <p className="text-sm text-slate-950 font-medium">Health KPI</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/healthkpi")}
              className="flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900 transition-colors mt-1 flex-shrink-0"
            >
              ดูรายละเอียด <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex items-center gap-6 mt-6">
            <div className="relative flex-shrink-0">
              <DonutRing
                percent={healthPct}
                color="#10b981"
                size={100}
                stroke={10}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[1.7rem] font-black text-slate-950 tabular-nums leading-none">
                  {healthPct}
                </span>
                <span className="text-sm font-bold text-slate-950">%</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                {
                  label: "ทั้งหมด",
                  val: stats.healthStats.total,
                  color: "text-slate-700",
                },
                {
                  label: "บรรลุเป้า",
                  val: stats.healthStats.passed,
                  color: "text-emerald-600",
                },
                {
                  label: "เฝ้าระวัง",
                  val: stats.healthStats.warning,
                  color: "text-amber-600",
                },
                {
                  label: "วิกฤติ",
                  val: stats.healthStats.critical,
                  color: "text-rose-600",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-50 rounded-2xl p-3 text-center"
                >
                  <p
                    className={`text-[1.7rem] font-black tabular-nums ${item.color}`}
                  >
                    {item.val}
                  </p>
                  <p className="text-xs font-bold text-slate-950 uppercase tracking-wider mt-0.5">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DATA ENTRY COMPLETENESS — Progress Bars
      ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
        {/* SDGs Progress */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>

          <div className="flex justify-between items-end mb-4">
            <div className="pr-2">
              <p className="text-slate-600 text-[14px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Activity size={11} className="text-sky-500" />{" "}
                สถานะการรายงานตัวชี้วัด SDGs
              </p>
              <h3 className="text-[14px] leading-tight font-black text-slate-800 tracking-tight whitespace-nowrap">
                ความคืบหน้า (SDGs)
              </h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-3xl font-black text-sky-600">
                {stats.sdgsStats.reported}
              </span>
              <span className="text-sm font-bold text-slate-400 mx-1">/</span>
              <span className="text-lg font-bold text-slate-600">
                {stats.sdgsStats.absoluteTotal}
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3.5 mb-2 overflow-hidden border border-slate-200/60 shadow-inner">
            <div
              className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${stats.sdgsStats.absoluteTotal > 0 ? (stats.sdgsStats.reported / stats.sdgsStats.absoluteTotal) * 100 : 0}%`,
              }}
            ></div>
          </div>
          <p className="text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">
            {stats.sdgsStats.absoluteTotal > 0
              ? Math.round(
                  (stats.sdgsStats.reported / stats.sdgsStats.absoluteTotal) *
                    100,
                )
              : 0}
            % รายงานผลแล้ว
          </p>
        </div>

        {/* Health KPI Progress */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>

          <div className="flex justify-between items-end mb-4">
            <div className="pr-2">
              <p className="text-slate-500 text-[14px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Target size={11} className="text-emerald-500" />{" "}
                สถานะการรายงานตัวชี้วัด Health
              </p>
              <h3 className="text-[14px] leading-tight font-black text-slate-800 tracking-tight whitespace-nowrap">
                ความคืบหน้า (Health)
              </h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-3xl font-black text-emerald-600">
                {stats.healthStats.reported}
              </span>
              <span className="text-sm font-bold text-slate-400 mx-1">/</span>
              <span className="text-lg font-bold text-slate-600">
                {stats.healthStats.absoluteTotal}
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3.5 mb-2 overflow-hidden border border-slate-200/60 shadow-inner">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${stats.healthStats.absoluteTotal > 0 ? (stats.healthStats.reported / stats.healthStats.absoluteTotal) * 100 : 0}%`,
              }}
            ></div>
          </div>
          <p className="text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">
            {stats.healthStats.absoluteTotal > 0
              ? Math.round(
                  (stats.healthStats.reported /
                    stats.healthStats.absoluteTotal) *
                    100,
                )
              : 0}
            % รายงานผลแล้ว
          </p>
        </div>
      </div>

      <OverviewCompactTableSection
        stats={stats}
        actionItems={actionItems}
        navigate={navigate}
      />
    </>
  );
}

export function OverviewCompactTableSection({ stats, actionItems, navigate }) {
  const [showAll, setShowAll] = useState(false);
  const tableItems = showAll ? (stats?.allIndicators || []) : (actionItems || []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <TrendingUp size={16} className="text-slate-600" />
          </div>
          <div>
            <h2 className="font-black text-slate-950 text-base">
              สรุปผลตัวชี้วัดทั้งหมด
            </h2>
            <p className="text-sm text-slate-950 font-medium">
              {showAll
                ? `แสดงทั้งหมด ${stats?.allIndicators?.length || 0} รายการ`
                : `แสดงเฉพาะรายการที่ต้องติดตาม ${tableItems.length} รายการ`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-sm font-bold px-4 py-2 rounded-xl border border-slate-200 text-slate-950 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5"
        >
          {showAll ? "แสดงเฉพาะรายการสำคัญ" : "แสดงทั้งหมด"}
          <ArrowRight
            size={12}
            className={`transition-transform ${showAll ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-6 py-3 text-xs font-black text-slate-950 uppercase tracking-widest w-24">
                ระบบ
              </th>
              <th className="px-6 py-3 text-xs font-black text-slate-950 uppercase tracking-widest">
                ตัวชี้วัด
              </th>
              <th className="px-6 py-3 text-xs font-black text-slate-950 uppercase tracking-widest text-right w-28">
                ผลงาน
              </th>
              <th className="px-6 py-3 text-xs font-black text-slate-950 uppercase tracking-widest text-right w-28">
                เป้าหมาย
              </th>
              <th className="px-6 py-3 text-xs font-black text-slate-950 uppercase tracking-widest text-center w-32">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tableItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-300">
                    <ShieldCheck size={32} />
                    <p className="font-bold text-base text-slate-950">
                      ทุกตัวชี้วัดบรรลุเป้าหมาย
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              tableItems.map((kpi, idx) => {
                const s = STATUS[kpi.status] || STATUS.pending;
                const Icon = s.Icon;
                return (
                  <tr
                    key={`${kpi.id}-${idx}`}
                    onClick={() =>
                      navigate(
                        `/${kpi.system === "SDGs" ? "kpi/sdgs" : "kpi/health"}?indicator=${encodeURIComponent(kpi.originalTitle || kpi.title)}`,
                      )
                    }
                    className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${kpi.system === "SDGs" ? "bg-sky-50 text-sky-600 border border-sky-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}
                      >
                        {kpi.system === "SDGs" ? "SDGs" : "Health"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-950 text-base leading-tight group-hover:text-slate-950 transition-colors line-clamp-2">
                        {kpi.title}
                      </p>
                      <p className="text-xs text-slate-950 mt-0.5 italic">
                        {kpi.category}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-[1.2rem] font-black tabular-nums ${kpi.performance ? "text-slate-950" : "text-slate-400"}`}
                      >
                        {kpi.performance || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-base font-bold text-slate-950">
                        {kpi.target || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}
                      >
                        <Icon size={11} />
                        {s.short}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 rounded-b-3xl">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center md:text-left">
          © 2026 KPI Monitoring System — กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
        </p>
        <VisitorBadge />
      </div>
    </div>
  );
}

