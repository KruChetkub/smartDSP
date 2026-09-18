import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Target,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase, withSupabaseTimeout } from "../lib/supabase";

const fetchAllData = async (year, period) => {
  let query = supabase
    .from("sdg_indicators")
    .select("*")
    .eq("is_deleted", false)
    .order("indicator_name", { ascending: true });

  if (year && year !== "All") query = query.eq("fiscal_year", year);
  if (period && period !== "All") query = query.eq("period", period);

  const { data, error } = await withSupabaseTimeout(query, "SDG page query");

  if (error) throw error;
  return data;
};

const evaluateStatus = (current, target) => {
  // 1. ถ้าว่างจริงๆ (ไม่มีข้อมูลเลย) ให้เป็นสีเทา
  if (current === "" || current === null || current === undefined) {
    return {
      color: "text-slate-400",
      border: "border-slate-500/30",
      bg: "bg-slate-50",
      shadow: "shadow-none",
      text: "ยังไม่สามารถระบุผลการดำเนินงานได้",
      raw: "pending",
      percentage: 0,
    };
  }

  // 2. ใช้ Regex ดึงตัวเลขเผื่อมีข้อความปน (ใช้ ?? เพื่อไม่ให้เลข 0 กลายเป็นค่าว่าง)
  const curStr = String(current ?? "");
  const curMatch = curStr.match(/([\d.]+)/);
  if (!curMatch && curStr !== "0")
    return {
      color: "text-slate-400",
      border: "border-slate-500/30",
      bg: "bg-slate-50",
      shadow: "shadow-none",
      text: "ยังไม่สามารถระบุผลการดำเนินงานได้",
      raw: "pending",
      percentage: 0,
    };

  const curVal = curMatch ? parseFloat(curMatch[1]) : 0;
  let targetStr = String(target ?? "").toLowerCase();

  // แปลงคำไทยที่พบบ่อยเป็นตัวเลข (ครึ่งหนึ่ง = 50)
  if (targetStr.includes("ครึ่งหนึ่ง")) {
    targetStr = targetStr.replace("ครึ่งหนึ่ง", "50");
  }

  // ค้นหา "ตัวเลขเป้าหมาย" (ข้ามตัวเลขที่เป็น "ปี" เช่น 2563, 2030 และข้ามเลขข้อ x.x ตัวแรก)
  const matches = [...targetStr.matchAll(/([\d.]+)(%|ร้อยละ)?/g)];
  let targetVal = 0;

  // ให้ความสำคัญกับตัวเลขที่มีเครื่องหมาย % หรือคำว่า ร้อยละ ก่อน
  const percentMatch = matches.find((m) => m[2]);
  if (percentMatch) {
    targetVal = parseFloat(percentMatch[1]);
  } else {
    // ถ้าไม่มี % ให้พยายามหาตัวเลขสุดท้าย (มักเป็นเป้าหมายในประโยคยาว) หรือข้ามเลขปี/เลขข้อ
    for (const m of matches) {
      const val = parseFloat(m[1]);
      if ((val >= 2500 && val <= 2600) || (val >= 2000 && val <= 2100))
        continue;
      if (targetStr.startsWith(m[1]) && targetStr.includes(" ")) continue;
      targetVal = val;
    }
  }

  if (isNaN(curVal) || isNaN(targetVal) || targetVal === 0) {
    return {
      color: "text-slate-400",
      border: "border-slate-500/30",
      bg: "bg-slate-50",
      shadow: "shadow-none",
      text: "ยังไม่สามารถระบุผลการดำเนินงานได้",
      raw: "pending",
      percentage: 0,
    };
  }

  // เช็คว่าโลจิกคือ "ค่าน้อยยิ่งดี" หรือ "มากยิ่งดี" หรือ "เป้าหมายการลดลง"
  const hasReductionKeyword =
    targetStr.includes("ลด") || targetStr.includes("ลดลง");
  const hasPercentageKeyword =
    targetStr.includes("ร้อยละ") ||
    targetStr.includes("%") ||
    targetStr.includes("50");

  // ถ้าเป็นเป้าหมาย "ลดลงร้อยละ..." -> ค่าผลงานยิ่งมากยิ่งดี
  const isReductionTarget =
    hasReductionKeyword &&
    (hasPercentageKeyword || targetStr.includes("ลงครึ่งหนึ่ง"));
  const isLowerBetter =
    !isReductionTarget &&
    (targetStr.includes("<") ||
      targetStr.includes("≤") ||
      targetStr.includes("ไม่เกิน") ||
      targetStr.includes("น้อยกว่า"));

  let percentage = 0;
  if (isLowerBetter) {
    // ยิ่งน้อยยิ่งดี: ถ้าผลงานเป็น 0 ถือว่าสำเร็จ 100% ทันที (เช่น โรคเท้าช้าง < 1% ผลงานคือ 0)
    percentage = curVal === 0 ? 100 : (targetVal / curVal) * 100;
  } else {
    // ยิ่งมากยิ่งดี: (ผลงาน / เป้าหมาย) * 100
    percentage = (curVal / targetVal) * 100;
  }

  if (percentage >= 100) {
    return {
      color: "text-emerald-400",
      border: "border-emerald-400/50",
      bg: "bg-emerald-400",
      shadow: "shadow-[0_0_10px_rgba(52,211,153,0.5)]",
      text: "บรรลุค่าเป้าหมาย",
      raw: "passed_100",
      percentage,
    };
  } else if (percentage >= 75) {
    return {
      color: "text-yellow-400",
      border: "border-yellow-400/50",
      bg: "bg-yellow-400",
      shadow: "shadow-[0_0_10px_rgba(250,204,21,0.5)]",
      text: "ต่ำกว่าค่าเป้าหมาย",
      raw: "failed_75",
      percentage,
    };
  } else if (percentage >= 50) {
    return {
      color: "text-orange-400",
      border: "border-orange-400/50",
      bg: "bg-orange-400",
      shadow: "shadow-[0_0_10px_rgba(251,146,60,0.5)]",
      text: "ต่ำกว่าค่าเป้าหมายระดับเสี่ยง",
      raw: "failed_50",
      percentage,
    };
  } else {
    return {
      color: "text-rose-500",
      border: "border-rose-500/50",
      bg: "bg-rose-500",
      shadow: "shadow-[0_0_10px_rgba(244,63,94,0.5)]",
      text: "ต่ำกว่าค่าเป้าหมายขั้นวิกฤติ",
      raw: "failed_0",
      percentage,
    };
  }
};

// Custom Tooltip for dark theme Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 border border-slate-200 p-3 rounded-xl backdrop-blur-md shadow-lg text-xs">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard({ categoryFilter }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYear = searchParams.get("year") || "All";
  const urlPeriod = searchParams.get("period") || "All";
  const indicatorParam = searchParams.get("indicator") || "";

  const setGlobalFilter = (y, p) => {
    setSearchParams({ year: y, period: p, indicator: indicatorParam });
  };

  const clearIndicatorFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("indicator");
    setSearchParams(newParams);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["sdgData", fiscalYear, urlPeriod],
    queryFn: () => fetchAllData(fiscalYear, urlPeriod),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const dashboardData = useMemo(() => {
    if (!data) return [];

    let mapped = data.map((row) => {
      const currentPerformance = row.current_performance;
      const target2030 = row.target_2030;
      const category = "SDGs"; // Default goal
      const subTarget = row.category || "";
      const indicatorName = row.indicator_name;
      const unit = ""; // Units not in new schema yet
      const agency = ""; // Agency not in new schema yet
      const year = "2568";
      const note = row.description || "";

      const status = evaluateStatus(currentPerformance, target2030);

      return {
        id: row.id,
        category: category,
        code: subTarget ? `เป้าหมาย ${subTarget}` : "",
        title: indicatorName,
        target_value: target2030,
        unit: unit,
        current_value: currentPerformance,
        agency: agency,
        year: year,
        note: note,
        reference_url: row.reference_url || null,
        status_info: status,
        progress: Math.min(
          100,
          Math.max(0, Math.round(status.percentage || 0)),
        ),
      };
    });

    if (categoryFilter) {
      mapped = mapped.filter((kpi) =>
        String(kpi.category)
          .toLowerCase()
          .includes(String(categoryFilter).toLowerCase()),
      );
    }
    if (indicatorParam) {
      mapped = mapped.filter((kpi) => kpi.title === indicatorParam);
    }
    return mapped;
  }, [data, categoryFilter, indicatorParam]);

  const { passed, pieData, barData } = useMemo(() => {
    const catStats = {};

    dashboardData.forEach((d) => {
      if (!catStats[d.category]) {
        catStats[d.category] = {
          passed_100: 0,
          failed_75: 0,
          failed_50: 0,
          failed_0: 0,
          pending: 0,
        };
      }
      catStats[d.category][d.status_info.raw]++;
    });

    let totals = {
      passed_100: 0,
      failed_75: 0,
      failed_50: 0,
      failed_0: 0,
      pending: 0,
    };
    Object.values(catStats).forEach((s) => {
      totals.passed_100 += s.passed_100;
      totals.failed_75 += s.failed_75;
      totals.failed_50 += s.failed_50;
      totals.failed_0 += s.failed_0;
      totals.pending += s.pending;
    });

    const pieData = [
      {
        name: "บรรลุเป้าหมาย (100%)",
        value: totals.passed_100,
        color: "#34d399",
      },
      {
        name: "ต่ำกว่าเป้า (75-99%)",
        value: totals.failed_75,
        color: "#facc15",
      },
      {
        name: "ระดับเสี่ยง (50-74%)",
        value: totals.failed_50,
        color: "#fb923c",
      },
      { name: "ขั้นวิกฤติ (<50%)", value: totals.failed_0, color: "#f43f5e" },
      { name: "รอดำเนินการ", value: totals.pending, color: "#64748b" },
    ].filter((d) => d.value > 0);

    const barData = Object.keys(catStats).map((cat) => ({
      name: cat.length > 10 ? cat.substring(0, 10) + "..." : cat,
      บรรลุเป้าหมาย: catStats[cat].passed_100,
      ต่ำกว่าเป้า: catStats[cat].failed_75,
      ระดับเสี่ยง: catStats[cat].failed_50,
      วิกฤติ: catStats[cat].failed_0,
    }));

    return { passed: totals.passed_100, pieData, barData };
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-pulse">
        <div className="skeleton h-16 w-96 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="skeleton h-72 rounded-3xl" />
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <div className="skeleton h-32 rounded-3xl" />
            <div className="skeleton h-32 rounded-3xl" />
            <div className="skeleton h-32 rounded-3xl" />
            <div className="skeleton h-32 rounded-3xl" />
          </div>
        </div>
        <div className="skeleton h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-rose-500">
        <AlertTriangle size={48} />
        <p className="font-bold text-slate-700">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
        </p>
        <p className="text-sm text-slate-500 text-center max-w-xl">
          {error.message}
        </p>
      </div>
    );
  }

  // LIGHT THEME UTILITY CLASSES
  const glassCardClasses =
    "bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden";
  const glassHeaderClasses =
    "text-xl font-bold text-slate-800 mb-6 flex items-center justify-between";

  // เช็คว่าถ้าไม่มีข้อมูลเลย ให้โชว์หน้าจอว่างๆ ที่สวยงามแทนกราฟเปล่าๆ ที่ดูเด๋อ
  if (dashboardData.length === 0) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 px-2 gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">
              {categoryFilter
                ? `แดชบอร์ด ${categoryFilter}`
                : "ภาพรวมตัวชี้วัดสำคัญ (รวมทั้งหมด)"}
            </h1>
            <p className="text-sky-700 font-semibold text-base mt-2 flex items-center gap-2">
              <Activity size={14} className="animate-pulse" />{" "}
              กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="text-slate-900 text-[13px] uppercase tracking-wider font-black ml-1">
                ปีงบประมาณ
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setGlobalFilter(e.target.value, urlPeriod)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
              >
                <option value="All">ทุกปีงบประมาณ</option>
                {["2567", "2568", "2569", "2570"].map((y) => (
                  <option key={y} value={y}>
                    ปี {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-900 text-[13px] uppercase tracking-wider font-black ml-1">
                ไตรมาส
              </label>
              <select
                value={urlPeriod}
                onChange={(e) => setGlobalFilter(fiscalYear, e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
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
        </div>

        <div
          className={`${glassCardClasses} flex flex-col items-center justify-center py-24 text-center`}
        >
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
            <AlertTriangle className="text-slate-400" size={36} />
          </div>
          <h2 className="text-[1.65rem] font-bold text-slate-900 mb-2">
            ยังไม่มีข้อมูลในหมวดหมู่นี้
          </h2>
          <p className="text-[1.05rem] text-slate-900 max-w-md mx-auto leading-relaxed">
            ระบบยังไม่พบตัวเลขหรือข้อมูลตัวชี้วัดใดๆ สำหรับ{" "}
            {categoryFilter ? `หมวดหมู่ "${categoryFilter}"` : "ระบบ"}
            <br />
            คุณสามารถเพิ่มข้อมูลใหม่ได้ที่เมนู "บันทึกรายไตรมาส"
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 px-2 gap-4">
        <div>
          <h1 className="text-[2.75rem] font-black text-slate-950 tracking-tight">
            {categoryFilter
              ? `แดชบอร์ด ${categoryFilter}`
              : "ภาพรวมตัวชี้วัดสำคัญ (รวมทั้งหมด)"}
          </h1>
          <p className="text-sky-700 font-semibold text-base mt-2 flex items-center gap-2">
            <Activity size={14} className="animate-pulse" />{" "}
            กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <label className="text-slate-900 text-[13px] uppercase tracking-wider font-black ml-1">
              ปีงบประมาณ
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => setGlobalFilter(e.target.value, urlPeriod)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
            >
              <option value="All">ทุกปีงบประมาณ</option>
              {["2567", "2568", "2569", "2570"].map((y) => (
                <option key={y} value={y}>
                  ปี {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-slate-900 text-[13px] uppercase tracking-wider font-black ml-1">
              ไตรมาส
            </label>
            <select
              value={urlPeriod}
              onChange={(e) => setGlobalFilter(fiscalYear, e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
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
      </div>

      {indicatorParam && (
        <div className="bg-sky-50 border border-sky-200 px-5 py-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-sky-100 shadow-sm shrink-0">
              <Target size={20} className="text-sky-600" />
            </div>
            <div>
              <p className="text-sky-900 font-black text-base">
                กำลังแสดงผลเฉพาะตัวชี้วัด
              </p>
              <p className="text-sky-700 font-semibold text-sm mt-0.5">
                "{indicatorParam}"
              </p>
            </div>
          </div>
          <button
            onClick={clearIndicatorFilter}
            className="text-sky-700 hover:text-white bg-white hover:bg-sky-600 font-bold text-sm px-4 py-2 rounded-xl border border-sky-200 hover:border-sky-600 shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            ดูตัวชี้วัดทั้งหมด
          </button>
        </div>
      )}

      {/* TOP OVERVIEW ROW (Redesigned for Professional Clarity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* BIG GAUGE: Overall Success Rate */}
        <div
          className={`${glassCardClasses} lg:col-span-1 flex flex-col items-center justify-center py-10`}
        >
          <div className="absolute top-4 left-6 text-[1rem] font-bold text-slate-900 uppercase tracking-widest">
            Overall Success
          </div>

          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG GAUGE (Circular Progress) */}
            <svg
              className="w-full h-full -rotate-90 transform"
              viewBox="0 0 100 100"
            >
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="8"
              />
              {/* Success Progress */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="transparent"
                stroke="url(#successGradient)"
                strokeWidth="8"
                strokeDasharray={`${(passed / dashboardData.length) * 282.7} 282.7`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient
                  id="successGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#0cf7f7" />
                  <stop offset="100%" stopColor="#0df00d" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[4.1rem] font-black text-slate-950 tracking-wider">
                {Math.round((passed / dashboardData.length) * 100) || 0}%
              </span>
              <span className="text-sm font-extrabold text-sky-700 uppercase tracking-[0.2em] mt-2">
                Completed
              </span>
            </div>
          </div>

          <p className="text-slate-950 font-bold text-base mt-6 text-center max-w-[220px]">
            จากทั้งหมด {dashboardData.length} ตัวชี้วัด <br />{" "}
            บรรลุเป้าหมายไปแล้ว {passed} ข้อ
          </p>
        </div>

        {/* STATUS GRID: 4 Color Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Green Card */}
          <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-12 transition-transform duration-500">
              <CheckCircle className="text-emerald-500" size={80} />
            </div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner">
              <CheckCircle className="text-emerald-500" size={28} />
            </div>
            <div>
              <p className="text-[2.05rem] font-black text-slate-950 tracking-tight">
                {pieData.find((d) => d.name.includes("บรรลุ"))?.value || 0}
              </p>
              <p className="text-base font-bold text-emerald-700 uppercase tracking-widest mt-1">
                บรรลุเป้าหมาย
              </p>
              <p className="text-sm text-slate-900 font-medium mt-1">
                สถานะปกติ (ร้อยละ 100)
              </p>
            </div>
          </div>

          {/* Yellow Card */}
          <div className="bg-white border border-yellow-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-12 transition-transform duration-500 text-yellow-500">
              <Activity size={80} />
            </div>
            <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center border border-yellow-100 shadow-inner">
              <Activity className="text-yellow-500" size={28} />
            </div>
            <div>
              <p className="text-[2.05rem] font-black text-slate-950 tracking-tight">
                {pieData.find((d) => d.name.includes("75"))?.value || 0}
              </p>
              <p className="text-base font-bold text-yellow-700 uppercase tracking-widest mt-1">
                ต่ำกว่าเป้าหมาย
              </p>
              <p className="text-sm text-slate-900 font-medium mt-1">
                ใกล้เป้า (ร้อยละ 75-99)
              </p>
            </div>
          </div>

          {/* Orange Card */}
          <div className="bg-white border border-orange-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-12 transition-transform duration-500 text-orange-500">
              <AlertTriangle size={80} />
            </div>
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100 shadow-inner">
              <AlertTriangle className="text-orange-500" size={28} />
            </div>
            <div>
              <p className="text-[2.05rem] font-black text-slate-950 tracking-tight">
                {pieData.find((d) => d.name.includes("ระดับเสี่ยง"))?.value ||
                  0}
              </p>
              <p className="text-base font-bold text-orange-700 uppercase tracking-widest mt-1">
                ระดับเสี่ยง
              </p>
              <p className="text-sm text-slate-900 font-medium mt-1">
                เตือนภัย (ร้อยละ 50-74)
              </p>
            </div>
          </div>

          {/* Red Card */}
          <div className="bg-white border border-rose-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-5 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:rotate-12 transition-transform duration-500 text-rose-500">
              <AlertTriangle size={80} />
            </div>
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shadow-inner">
              <AlertTriangle className="text-rose-500" size={28} />
            </div>
            <div>
              <p className="text-[2.05rem] font-black text-slate-950 tracking-tight">
                {pieData.find((d) => d.name.includes("วิกฤติ"))?.value || 0}
              </p>
              <p className="text-base font-bold text-rose-700 uppercase tracking-widest mt-1">
                ขั้นวิกฤติ
              </p>
              <p className="text-sm text-slate-900 font-medium mt-1">
                ต้องแก้ไข (น้อยกว่าร้อยละ 50)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Detailed Cards */}
      <div>
        <h2 className="text-[1.4rem] font-bold text-slate-950 mb-6 flex items-center gap-3">
          <Target className="text-sky-500" />
          Detailed Tracking
        </h2>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-slate-950 font-bold text-sm uppercase tracking-wider w-1/3">
                    No. / หมวดหมู่ / ตัวชี้วัด
                  </th>
                  <th className="py-4 px-6 text-slate-950 font-bold text-sm uppercase tracking-wider text-right">
                    เป้าหมาย (2573)
                  </th>
                  <th className="py-4 px-6 text-slate-950 font-bold text-sm uppercase tracking-wider text-right">
                    ผลงาน
                  </th>
                  <th className="py-4 px-6 text-slate-950 font-bold text-sm uppercase tracking-wider w-40 text-center">
                    สถานะ
                  </th>
                  <th className="py-4 px-6 text-slate-950 font-bold text-sm uppercase tracking-wider w-48 text-center">
                    หน่วยงาน
                  </th>
                  <th className="py-4 px-6 text-slate-950 font-bold text-sm uppercase tracking-wider w-32 text-center">
                    คำอธิบายตัวชี้วัด
                  </th>
                  <th className="py-4 px-6 text-slate-950 font-bold text-sm uppercase tracking-wider">
                    หมายเหตุ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(
                  dashboardData.reduce((acc, kpi) => {
                    const code = kpi.code || "ตัวชี้วัดอื่นๆ";
                    if (!acc[code]) acc[code] = [];
                    acc[code].push(kpi);
                    return acc;
                  }, {}),
                ).map(([groupCode, kpis], groupIndex) => (
                  <React.Fragment key={groupIndex}>
                    {/* Header Row for the Group */}
                    <tr className="bg-sky-50 border-b border-sky-100">
                      <td colSpan="7" className="p-0">
                        <div className="py-3 px-6 text-base font-black text-sky-900 border-l-4 border-sky-500 shadow-sm sticky left-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="leading-relaxed">{groupCode}</span>
                          <span className="text-sm font-bold text-sky-800 bg-white px-3 py-1 rounded-full border border-sky-200 shadow-sm whitespace-nowrap">
                            {kpis.length} ตัวชี้วัด
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Data Rows for the Group */}
                    {kpis.map((kpi, index) => (
                      <tr
                        key={kpi.id}
                        className="hover:bg-sky-50/50 transition-colors group"
                      >
                        <td className="py-5 px-6 align-top">
                          <div className="flex gap-4 items-start">
                            <span className="text-slate-950 font-black text-base mt-0.5 w-8 shrink-0 border border-slate-200 rounded-md text-center py-1 bg-white group-hover:bg-slate-50 group-hover:border-slate-300 transition-colors shadow-sm">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-base font-bold text-sky-700 mb-1">
                                {kpi.category}
                              </p>
                              <p
                                className="text-[0.90rem] font-bold text-slate-950 leading-relaxed max-w-xl"
                                title={kpi.title}
                              >
                                {kpi.title}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-5 px-6 align-top text-right">
                          <span className="font-black text-slate-950 text-base">
                            {kpi.target_value || "-"}
                          </span>
                        </td>

                        <td className="py-4 px-6 align-top text-right">
                          <span
                            className={`font-black text-xl ${kpi.current_value !== null && kpi.current_value !== undefined && kpi.current_value !== "" ? "text-sky-600" : "text-slate-300"}`}
                          >
                            {kpi.current_value !== null &&
                            kpi.current_value !== undefined &&
                            kpi.current_value !== ""
                              ? kpi.current_value
                              : "-"}
                          </span>
                        </td>

                        <td className="py-4 px-6 align-top">
                          <div className="flex flex-col items-center gap-2">
                            <span
                              className={`text-[11px] font-black px-3 py-1.5 rounded-full border ${kpi.status_info.border} ${kpi.status_info.color} uppercase tracking-widest bg-white w-full text-center truncate shadow-sm`}
                            >
                              {kpi.status_info.text}
                            </span>

                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full ${kpi.status_info.bg}`}
                                style={{ width: `${kpi.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 align-top text-center text-xs font-medium text-slate-500">
                          {kpi.agency || "-"}
                        </td>

                        <td className="py-4 px-6 align-top text-center">
                          {kpi.reference_url ? (
                            <a
                              href={kpi.reference_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 hover:shadow-sm transition-all text-[11px] font-black uppercase tracking-wide whitespace-nowrap"
                              title={kpi.reference_url}
                            >
                              🔗 ดูเอกสาร
                            </a>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </td>

                        <td className="py-5 px-6 align-top">
                          <div className="text-sm text-slate-950 italic max-w-xs break-words bg-slate-50/50 p-2 rounded-lg border border-transparent group-hover:border-slate-100 transition-all">
                            {kpi.note || "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
