import React from "react";
import {
  Activity,
  Target,
  CheckCircle2,
  MapPin,
  PieChart,
  Link2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart as RePieChart,
  Pie,
} from "recharts";
import ThailandMap from "../../components/charts/ThailandMap";

export default function HealthOverviewMode({
  categoryStats,
  overviewStatusFilter,
  onOverviewStatusFilter,
  indicatorReferenceUrl,
  healthKpiListRef,
  filteredAllSummaries,
  allSummaries,
  expandedHealthIndicators,
  onSummaryRowClick,
  onSubSummaryRowClick,
}) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
      {/* 1. Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-emerald-50 group-hover:bg-emerald-100/50 transition-colors" />
          <div className="z-10">
            <p className="text-sm text-slate-500 font-bold mb-1">
              จำนวนตัวชี้วัดทั้งหมด
            </p>
            <p className="text-4xl font-black text-slate-800">
              {categoryStats.totalKPIs}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shrink-0 z-10 shadow-md shadow-emerald-500/20">
            <Target size={28} />
          </div>
        </div>

        <div className="bg-white border border-cyan-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-cyan-50 group-hover:bg-cyan-100/50 transition-colors" />
          <div className="z-10">
            <p className="text-sm text-slate-500 font-bold mb-1">
              ตัวชี้วัดที่สำเร็จ 100%
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black text-slate-800">
                {categoryStats.statusCounts.passed}
              </p>
              <p className="text-sm font-bold text-cyan-700 tracking-wide bg-cyan-100 px-2 py-0.5 rounded-md">
                {categoryStats.totalKPIs > 0
                  ? (
                      (categoryStats.statusCounts.passed /
                        categoryStats.totalKPIs) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-white flex items-center justify-center shrink-0 z-10 shadow-md shadow-cyan-500/20">
            <CheckCircle2 size={28} />
          </div>
        </div>

        <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-purple-50 group-hover:bg-purple-100/50 transition-colors" />
          <div className="z-10">
            <p className="text-sm text-slate-500 font-bold mb-1">
              เขตฯ คะแนนเฉลี่ยสูงสุด
            </p>
            <p className="text-2xl font-black text-slate-800 truncate max-w-[200px]">
              {categoryStats.regData.length > 0
                ? [...categoryStats.regData].sort((a, b) => b.avg - a.avg)[0]
                    .name
                : "-"}
            </p>
            <p className="text-sm font-bold text-purple-600 mt-1">
              {categoryStats.regData.length > 0
                ? [...categoryStats.regData]
                    .sort((a, b) => b.avg - a.avg)[0]
                    .avg.toFixed(2)
                : "-"}
              %
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center shrink-0 z-10 shadow-md shadow-purple-500/20">
            <MapPin size={28} />
          </div>
        </div>
      </div>

      {/* 2. Overview Master Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Map Overview */}
        <div className="lg:col-span-4 min-w-0 bg-white border border-slate-200 rounded-3xl p-1.5 shadow-sm relative overflow-hidden group">
          <h3 className="absolute top-4 left-5 z-20 text-xs font-bold text-slate-800 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <MapPin size={14} className="text-emerald-600" />{" "}
            แผนที่ภาพรวมระดับประเทศ
          </h3>
          <div className="h-[460px] xl:h-[500px] bg-slate-50 rounded-2xl overflow-hidden">
            <ThailandMap
              dashboardData={categoryStats.regData.map((r) => {
                const rnum = parseInt(r.name.replace(/\D/g, "")) || 0;
                const colorStr = r.statusRaw || "pending";
                return {
                  region: `เขตที่ ${rnum}`,
                  current_value: r.avg.toFixed(2),
                  target_value: "ภาพรวม",
                  status_info: {
                    raw: colorStr,
                    text: "คะแนนเฉลี่ย",
                    percentage: colorStr === "passed_100" ? 100 : 0,
                    color:
                      colorStr === "passed_100"
                        ? "text-emerald-600"
                        : colorStr === "failed_75"
                          ? "text-yellow-600"
                          : colorStr === "failed_50"
                            ? "text-orange-500"
                            : "text-rose-500",
                  },
                };
              })}
            />
          </div>
        </div>

        {/* Bar Chart */}
        <div className="lg:col-span-5 min-w-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity size={16} className="text-cyan-600" />{" "}
              เปรียบเทียบคะแนนเฉลี่ย 13 เขตฯ
            </h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryStats.regData}
                  margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    domain={[
                      (dataMin) => Math.min(0, Math.floor(dataMin / 20) * 20),
                      (dataMax) => Math.max(100, Math.ceil(dataMax / 20) * 20),
                    ]}
                  />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "0.5rem",
                      color: "#1e293b",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ fontWeight: "bold" }}
                  />
                  <Bar
                    dataKey="avg"
                    name="คะแนนเฉลี่ย (%)"
                    radius={[4, 4, 0, 0]}
                    barSize={25}
                  >
                    {categoryStats.regData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.statusRaw === "passed_100"
                            ? "#10b981"
                            : entry.statusRaw === "failed_75"
                              ? "#eab308"
                              : entry.statusRaw === "failed_50"
                                ? "#f97316"
                                : entry.statusRaw === "failed_0"
                                  ? "#f43f5e"
                                  : "#cbd5e1"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {indicatorReferenceUrl && (
              <div className="pt-4 mt-2 border-t border-slate-100">
                <p className="text-[15px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  เอกสารอ้างอิง
                </p>
                <a
                  href={indicatorReferenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 hover:shadow-md transition-all text-sm font-black group"
                >
                  <Link2 size={16} className="shrink-0" />
                  <span>ดูเอกสาร / ลิ้งอ้างอิง</span>
                  <ExternalLink
                    size={13}
                    className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-3 min-w-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col items-center justify-center h-full">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2 self-start w-full">
            <PieChart size={16} className="text-orange-400" />{" "}
            สัดส่วนสถานะการดำเนินงาน
          </h3>
          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={categoryStats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onClick={(entry) => onOverviewStatusFilter(entry.key)}
                  className="cursor-pointer"
                >
                  {categoryStats.statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={
                        !overviewStatusFilter ||
                        overviewStatusFilter === entry.key
                          ? 1
                          : 0.35
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "0.5rem",
                    color: "#1e293b",
                  }}
                  itemStyle={{ fontWeight: "bold" }}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-4xl font-black text-slate-800">
                {categoryStats.totalKPIs}
              </p>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                Total KPIs
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-4 flex-wrap justify-center w-full">
            {categoryStats.statusData.map((s, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => onOverviewStatusFilter(s.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  overviewStatusFilter === s.key
                    ? "bg-slate-100 border-slate-400 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs font-bold text-slate-600">
                  {s.name} ({s.value})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Table: All Health KPI indicators */}
      <div
        ref={healthKpiListRef}
        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md overflow-hidden flex flex-col scroll-mt-44"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-500" />
              รายการตัวชี้วัด Health KPI ({filteredAllSummaries.length} /{" "}
              {allSummaries.length} รายการ)
            </h3>
            {overviewStatusFilter && (
              <p className="text-sm text-slate-500 font-semibold mt-1">
                กำลังแสดงเฉพาะสถานะ:{" "}
                {
                  categoryStats.statusData.find(
                    (s) => s.key === overviewStatusFilter,
                  )?.name
                }
              </p>
            )}
          </div>
          {overviewStatusFilter && (
            <button
              type="button"
              onClick={() => onOverviewStatusFilter(null)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-slate-300 text-xs font-black transition-colors"
            >
              แสดงทั้งหมด
            </button>
          )}
        </div>
        <div className="overflow-x-auto custom-scrollbar pb-4 flex-1">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                <th className="p-4 font-bold rounded-tl-xl w-16 text-center">
                  ลำดับ
                </th>
                <th className="p-4 font-bold max-w-md">ชื่อตัวชี้วัด</th>
                <th className="p-4 font-bold text-center w-36">
                  ผ่าน / ไม่ผ่าน / รอข้อมูล
                </th>
                <th className="p-4 font-bold text-center w-36 bg-slate-100">
                  คะแนนเฉลี่ย (%)
                </th>
                <th className="p-4 font-bold text-center rounded-tr-xl w-36">
                  สถานะภาพรวม
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAllSummaries.map((kpi, idx) => {
                const hasSubIndicators = kpi.subIndicators.length > 0;
                const isExpanded = expandedHealthIndicators.has(kpi.title);

                return (
                  <React.Fragment key={kpi.title}>
                    <tr
                      onClick={() => onSummaryRowClick(kpi)}
                      className="hover:bg-emerald-50/60 transition-colors group cursor-pointer"
                      title={
                        hasSubIndicators
                          ? `${isExpanded ? "ซ่อน" : "แสดง"}ตัวชี้วัดย่อย: ${kpi.title}`
                          : `คลิกเพื่อดูรายละเอียด: ${kpi.title}`
                      }
                    >
                      <td className="p-4 text-center">
                        <span className="inline-flex w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 text-rose-500 text-sm font-black shadow-inner items-center justify-center">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 font-medium truncate max-w-md group-hover:text-emerald-700 group-hover:underline underline-offset-4">
                        <span className="inline-flex items-center gap-2 max-w-full">
                          {hasSubIndicators && (
                            <span className="text-slate-400 text-xs w-4 shrink-0">
                              {isExpanded ? "▼" : "▶"}
                            </span>
                          )}
                          <span className="truncate">{kpi.title}</span>
                          {hasSubIndicators && (
                            <span className="shrink-0 text-[10px] font-black text-cyan-700 bg-cyan-50 border border-cyan-100 rounded-full px-2 py-0.5">
                              {kpi.subIndicators.length} ตัวย่อย
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 w-max mx-auto">
                          <span className="text-emerald-600 font-bold">
                            {kpi.passed}
                          </span>
                          <span className="text-slate-400 text-xs mt-0.5">
                            /
                          </span>
                          <span className="text-rose-500 font-bold">
                            {kpi.failed}
                          </span>
                          <span className="text-slate-400 text-xs mt-0.5">
                            /
                          </span>
                          <span className="text-slate-400 font-bold">
                            {kpi.pending}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`p-4 text-center bg-slate-50 font-black text-lg rounded-md ${
                          kpi.avgPerf === "-"
                            ? "text-slate-400"
                            : kpi.status.raw === "passed_100"
                              ? "text-emerald-600"
                              : kpi.status.raw === "failed_75"
                                ? "text-yellow-500"
                                : kpi.status.raw === "failed_50"
                                  ? "text-orange-500"
                                  : "text-rose-500"
                        }`}
                      >
                        {kpi.avgPerf}
                      </td>
                      <td className="p-4 text-center">
                        <div
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border ${kpi.status.border} bg-white whitespace-nowrap shadow-sm`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${kpi.status.bg} ${kpi.status.shadow}`}
                          ></span>
                          <span
                            className={`text-[11px] font-bold ${kpi.status.color} uppercase tracking-wide`}
                          >
                            {kpi.status.text}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {hasSubIndicators &&
                      isExpanded &&
                      kpi.subIndicators.map((sub, subIdx) => (
                        <tr
                          key={`${kpi.title}-${sub.subtitle}`}
                          onClick={() =>
                            onSubSummaryRowClick(kpi.title, sub.subtitle)
                          }
                          className="hover:bg-cyan-50/50 transition-colors group cursor-pointer"
                          title={`คลิกเพื่อดูรายละเอียด: ${sub.subtitle}`}
                        >
                          <td className="p-0" />
                          <td colSpan={4} className="py-0 pr-4 pl-16">
                            <div className="grid grid-cols-[minmax(0,1fr)_9rem_9rem_9rem] items-center bg-cyan-50/40 border-b border-cyan-100 last:border-b-0 group-hover:bg-cyan-50 transition-colors">
                              <div className="flex items-center gap-8 min-w-0 p-4">
                                <span className="inline-flex w-8 h-7 rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600 text-xs font-black shadow-inner items-center justify-center shrink-0">
                                  {idx + 1}.{subIdx + 1}
                                </span>
                                <span className="text-cyan-500">↳</span>
                                <span className="text-slate-600 font-medium truncate group-hover:text-cyan-700 group-hover:underline underline-offset-4">
                                  {sub.subtitle}
                                </span>
                              </div>
                              <div className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-cyan-100 w-max mx-auto">
                                  <span className="text-emerald-600 font-bold">
                                    {sub.passed}
                                  </span>
                                  <span className="text-slate-400 text-xs mt-0.5">
                                    /
                                  </span>
                                  <span className="text-rose-500 font-bold">
                                    {sub.failed}
                                  </span>
                                  <span className="text-slate-400 text-xs mt-0.5">
                                    /
                                  </span>
                                  <span className="text-slate-400 font-bold">
                                    {sub.pending}
                                  </span>
                                </div>
                              </div>
                              <div
                                className={`p-4 text-center bg-cyan-50/40 font-black text-lg rounded-md ${
                                  sub.avgPerf === "-"
                                    ? "text-slate-400"
                                    : sub.status.raw === "passed_100"
                                      ? "text-emerald-600"
                                      : sub.status.raw === "failed_75"
                                        ? "text-yellow-500"
                                        : sub.status.raw === "failed_50"
                                          ? "text-orange-500"
                                          : "text-rose-500"
                                }`}
                              >
                                {sub.avgPerf}
                              </div>
                              <div className="p-4 text-center">
                                <div
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border ${sub.status.border} bg-white whitespace-nowrap shadow-sm`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full ${sub.status.bg} ${sub.status.shadow}`}
                                  ></span>
                                  <span
                                    className={`text-[11px] font-bold ${sub.status.color} uppercase tracking-wide`}
                                  >
                                    {sub.status.text}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

