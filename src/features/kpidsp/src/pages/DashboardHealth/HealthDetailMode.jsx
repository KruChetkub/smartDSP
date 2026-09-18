import React from "react";
import {
  Activity,
  Target,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  MapPin,
  Link2,
  ExternalLink,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import ThailandMap from "../../components/charts/ThailandMap";

export default function HealthDetailMode({
  dashboardData,
  summary,
  barData,
  aggregatedMapData,
  targetLine,
  allTargets,
  currentQ,
  indicatorReferenceUrl,
}) {
  if (dashboardData.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-md">
        <Activity size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          ไม่พบข้อมูลสำหรับตัวชี้วัดที่เลือก
        </h2>
        <p className="text-slate-500 max-w-md mx-auto">
          ยังไม่มีการเพิ่มข้อมูลของตัวชี้วัดนี้ในระบบ
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* TWO COLUMN MASTER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* LEFT COLUMN: Map & Targets */}
        <div className="lg:col-span-4 min-w-0 space-y-6">
          {/* Map Component Container */}
          <div className="bg-white border border-slate-200 rounded-3xl p-1.5 shadow-md relative overflow-hidden group">
            <h3 className="absolute top-4 left-5 z-20 text-sm font-bold text-slate-800 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
              <MapPin size={16} className="text-emerald-600" />{" "}
              แผนที่ผลการดำเนินงาน
            </h3>
            <div className="h-[500px] xl:h-[560px] bg-slate-50 rounded-2xl overflow-hidden">
              <ThailandMap dashboardData={aggregatedMapData} />
            </div>
          </div>

          {/* Huge Score & Quarterly Targets */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center justify-center text-center mb-8 relative z-10">
              <p className="text-slate-500 font-bold mb-1 uppercase tracking-widest text-xs">
                ผลงานเฉลี่ยรวมระดับประเทศ
              </p>
              <div className="flex items-end justify-center gap-1">
                <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 drop-shadow-sm">
                  {summary.avgPerf}
                </p>
                <p className="text-emerald-500 font-bold pb-2">%</p>
              </div>
            </div>

            <div>
              <p className="text-slate-500 font-bold mb-3 flex items-center gap-2 text-sm">
                <Target size={14} /> เกณฑ์เป้าหมายแยกไตรมาส
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div
                  className={`rounded-xl p-3 border transition-colors flex flex-col items-center justify-center ${currentQ.id === "Q1" ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-slate-50 border-slate-200"}`}
                >
                  <p
                    className={`text-[11px] font-bold mb-1 ${currentQ.id === "Q1" ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    ไตรมาส 1
                  </p>
                  <p
                    className={`text-sm font-bold ${currentQ.id === "Q1" ? "text-slate-800" : "text-slate-600"}`}
                  >
                    {allTargets.q1}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-3 border transition-colors flex flex-col items-center justify-center ${currentQ.id === "Q2" ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-slate-50 border-slate-200"}`}
                >
                  <p
                    className={`text-[11px] font-bold mb-1 ${currentQ.id === "Q2" ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    ไตรมาส 2
                  </p>
                  <p
                    className={`text-sm font-bold ${currentQ.id === "Q2" ? "text-slate-800" : "text-slate-600"}`}
                  >
                    {allTargets.q2}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-3 border transition-colors flex flex-col items-center justify-center ${currentQ.id === "Q3" ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-slate-50 border-slate-200"}`}
                >
                  <p
                    className={`text-[11px] font-bold mb-1 ${currentQ.id === "Q3" ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    ไตรมาส 3
                  </p>
                  <p
                    className={`text-sm font-bold ${currentQ.id === "Q3" ? "text-slate-800" : "text-slate-600"}`}
                  >
                    {allTargets.q3}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-3 border transition-colors flex flex-col items-center justify-center ${currentQ.id === "Q4" ? "bg-emerald-50 border-emerald-200 shadow-sm" : "bg-slate-50 border-slate-200"}`}
                >
                  <p
                    className={`text-[11px] font-bold mb-1 ${currentQ.id === "Q4" ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    ไตรมาส 4
                  </p>
                  <p
                    className={`text-sm font-bold ${currentQ.id === "Q4" ? "text-slate-800" : "text-slate-600"}`}
                  >
                    {allTargets.q4}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Summary Cards & Bar Chart */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {/* 3 Summary Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Passed */}
            <div className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-50 group-hover:bg-emerald-100/50 transition-colors" />
              <div className="z-10">
                <p className="text-sm text-slate-500 font-bold mb-1">
                  จำนวนที่ผ่านเกณฑ์
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-slate-800">
                    {summary.passedCount}
                  </p>
                  <p className="text-sm font-bold text-emerald-700 tracking-wide bg-emerald-100 px-2 py-0.5 rounded-md">
                    {summary.passedPercent}%
                  </p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shrink-0 z-10 shadow-md shadow-emerald-500/20">
                <CheckCircle2 size={28} />
              </div>
            </div>

            {/* Card 2: Failed */}
            <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
              <div className="absolute inset-0 bg-rose-50 group-hover:bg-rose-100/50 transition-colors" />
              <div className="z-10">
                <p className="text-sm text-slate-500 font-bold mb-1">
                  จำนวนที่ไม่ผ่าน
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-slate-800">
                    {summary.failedCount}
                  </p>
                  <p className="text-sm font-bold text-rose-600 tracking-wide bg-rose-100 px-2 py-0.5 rounded-md">
                    {summary.failedPercent}%
                  </p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-white flex items-center justify-center shrink-0 z-10 shadow-md shadow-rose-500/20">
                <XCircle size={28} />
              </div>
            </div>

            {/* Card 3: Period Info */}
            <div className="bg-white border border-orange-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden group sm:col-span-2 lg:col-span-1">
              <div className="absolute inset-0 bg-orange-50 group-hover:bg-orange-100/50 transition-colors" />
              <div className="z-10">
                <p className="text-sm text-slate-500 font-bold mb-1">
                  ระยะเวลา
                </p>
                <div className="flex flex-col">
                  <p className="text-lg font-black text-slate-800">
                    รายงาน {currentQ.name}
                  </p>
                  <p className="text-xs font-bold text-orange-500 mt-1">
                    อัปเดตล่าสุด: {new Date().toLocaleDateString("th-TH")}
                  </p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center shrink-0 z-10 shadow-md shadow-orange-500/20">
                <Calendar size={28} />
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-cyan-600" />{" "}
                เจาะลึกผลการดำเนินงาน 13 เขตสุขภาพ
              </h3>
            </div>

            <div className="h-[320px] xl:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
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
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
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
                  {targetLine > 0 && (
                    <ReferenceLine
                      y={targetLine}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      label={{
                        position: "top",
                        value: `เป้าหมาย ${targetLine}`,
                        fill: "#ef4444",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    />
                  )}
                  <Bar
                    dataKey="performance"
                    name="ผลงาน (ร้อยละ)"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                    minPointSize={3}
                  >
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Data Table & Template panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2 w-full">
        <div className="lg:col-span-8 min-w-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-md overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />{" "}
              สมุดบันทึกผลการดำเนินงานรายเขตฯ
            </h3>
          </div>

          <div className="overflow-x-auto custom-scrollbar pb-4 flex-1">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                  <th className="p-4 font-bold rounded-tl-xl w-32">
                    เขตสุขภาพ
                  </th>
                  <th className="p-4 font-bold text-center w-36 text-blue-600">
                    ประชากร A (ผลงาน)
                  </th>
                  <th className="p-4 font-bold text-center w-36 text-teal-600">
                    ประชากร B (เป้า)
                  </th>
                  <th className="p-4 font-bold text-center w-32 bg-slate-100">
                    ผลงาน (ร้อยละ)
                  </th>
                  <th className="p-4 font-bold text-center rounded-tr-xl w-36">
                    สถานะไตรมาส
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboardData.map((kpi) => (
                  <tr
                    key={kpi.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="p-4">
                      <span className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold tracking-wider whitespace-nowrap">
                        {kpi.region}
                      </span>
                    </td>
                    <td className="p-4 text-blue-700 font-bold text-center bg-blue-50">
                      {kpi.pop_35 ? Number(kpi.pop_35).toLocaleString() : "-"}
                    </td>
                    <td className="p-4 text-teal-700 font-bold text-center bg-teal-50">
                      {kpi.pop_b ? Number(kpi.pop_b).toLocaleString() : "-"}
                    </td>
                    <td className="p-4 text-center bg-slate-50 font-black text-slate-800 text-lg rounded-md">
                      {!isNaN(parseFloat(kpi.current_value))
                        ? kpi.current_value
                        : "-"}
                    </td>
                    <td className="p-4 text-center">
                      <div
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 pb-1.5 rounded-lg border ${kpi.status_info.border} bg-white whitespace-nowrap shadow-sm`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${kpi.status_info.bg} ${kpi.status_info.shadow}`}
                        ></span>
                        <span
                          className={`text-xs font-bold ${kpi.status_info.color}`}
                        >
                          {kpi.status_info.text}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KPI Template Information Box */}
        <div className="lg:col-span-4 min-w-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-md h-full max-h-[600px] overflow-y-auto custom-scrollbar">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b border-slate-200 pb-4 sticky top-0 bg-white/95 py-2 backdrop-blur-xl z-10">
            <Target size={18} className="text-blue-500" /> KPI Template
          </h3>
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
              <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                สูตรคำนวณที่ใช้
              </p>
              <p className="text-xl font-mono text-center text-blue-600 font-black bg-white py-3 rounded-lg border border-blue-100 shadow-sm">
                ( A / B ) × 100
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-blue-500">
                <div className="flex gap-3 items-center mb-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-lg shadow-sm">
                    A
                  </span>
                  <p className="font-bold text-slate-800 text-sm">
                    ประชากรกลุ่มเป้าหมาย (ผลงาน)
                  </p>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed pl-11">
                  จำนวนประชากรที่ได้รับการคัดกรอง (คอลัมน์ A)
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-teal-500">
                <div className="flex gap-3 items-center mb-2">
                  <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center font-black text-lg shadow-sm">
                    B
                  </span>
                  <p className="font-bold text-slate-800 text-sm">
                    ประชากรรวมทั้งหมด (เป้าฐาน)
                  </p>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed pl-11">
                  จำนวนประชากรทั้งหมดในกลุ่มเป้าหมาย (คอลัมน์ B)
                </p>
              </div>
            </div>
            {indicatorReferenceUrl && (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[15px] font-bold text-slate-600 uppercase tracking-wider mb-2">
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
      </div>
    </div>
  );
}

