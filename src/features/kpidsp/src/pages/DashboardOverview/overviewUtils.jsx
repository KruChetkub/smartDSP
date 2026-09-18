import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  XCircle,
  Loader2,
} from "lucide-react";
import { supabase, withSupabaseTimeout } from "../../lib/supabase";
import { calculateAchievementPercentage } from "../../utils/kpiEvaluation";

export const fetchAllDashboards = async (year, period) => {
  let sdgQuery = supabase
    .from("sdg_indicators")
    .select("*")
    .eq("is_deleted", false);
  let healthQuery = supabase
    .from("health_indicators")
    .select("*")
    .eq("is_deleted", false);

  if (year && year !== "All") {
    sdgQuery = sdgQuery.eq("fiscal_year", year);
    healthQuery = healthQuery.eq("fiscal_year", year);
  }
  if (period && period !== "All") {
    sdgQuery = sdgQuery.eq("period", period);
    healthQuery = healthQuery.eq("period", period);
  }

  const [resSdgs, resHealth] = await Promise.all([
    withSupabaseTimeout(sdgQuery, "SDG dashboard query"),
    withSupabaseTimeout(healthQuery, "Health dashboard query"),
  ]);
  if (resSdgs.error) throw resSdgs.error;
  if (resHealth.error) throw resHealth.error;
  return [resSdgs.data, resHealth.data];
};

export const evaluateSDGStatus = (current, target) => {
  if (current === "" || current === null || current === undefined) {
    return { raw: "pending" };
  }

  const curStr = String(current ?? "");
  const curMatch = curStr.match(/([\d.]+)/);
  if (!curMatch && curStr !== "0") return { raw: "pending" };

  const curVal = curMatch ? parseFloat(curMatch[1]) : 0;
  let targetStr = String(target ?? "").toLowerCase();

  if (targetStr.includes("ครึ่งหนึ่ง")) {
    targetStr = targetStr.replace("ครึ่งหนึ่ง", "50");
  }

  const matches = [...targetStr.matchAll(/([\d.]+)(%|ร้อยละ)?/g)];
  let targetVal = 0;

  const percentMatch = matches.find((m) => m[2]);
  if (percentMatch) {
    targetVal = parseFloat(percentMatch[1]);
  } else {
    for (const m of matches) {
      const val = parseFloat(m[1]);
      if ((val >= 2500 && val <= 2600) || (val >= 2000 && val <= 2100))
        continue;
      if (targetStr.startsWith(m[1]) && targetStr.includes(" ")) continue;
      targetVal = val;
    }
  }

  if (isNaN(curVal) || isNaN(targetVal) || targetVal === 0) {
    return { raw: "pending" };
  }

  const hasReductionKeyword =
    targetStr.includes("ลด") || targetStr.includes("ลดลง");
  const hasPercentageKeyword =
    targetStr.includes("ร้อยละ") ||
    targetStr.includes("%") ||
    targetStr.includes("50");

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
    percentage = curVal === 0 ? 100 : (targetVal / curVal) * 100;
  } else {
    percentage = (curVal / targetVal) * 100;
  }

  if (percentage >= 100) return { raw: "passed_100" };
  if (percentage >= 75) return { raw: "failed_75" };
  if (percentage >= 50) return { raw: "failed_50" };
  return { raw: "failed_0" };
};

export const getCurrentQuarter = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 10) return { targetKey: "targetQ1" };
  if (m <= 3) return { targetKey: "targetQ2" };
  if (m <= 6) return { targetKey: "targetQ3" };
  return { targetKey: "targetQ4" };
};

export const evaluateHealthStatus = (current, targetString, direction) => {
  const pct = calculateAchievementPercentage(current, targetString, direction);
  if (pct === null) return { raw: "pending" };
  if (pct >= 100) return { raw: "passed_100" };
  if (pct >= 75) return { raw: "failed_75" };
  if (pct >= 50) return { raw: "failed_50" };
  return { raw: "failed_0" };
};

export const STATUS = {
  passed_100: {
    label: "บรรลุเป้าหมาย",
    short: "Passed",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    Icon: CheckCircle2,
  },
  failed_75: {
    label: "เฝ้าระวัง",
    short: "Warning",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    Icon: AlertTriangle,
  },
  failed_50: {
    label: "ระดับเสี่ยง",
    short: "At Risk",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
    Icon: AlertOctagon,
  },
  failed_0: {
    label: "ขั้นวิกฤติ",
    short: "Critical",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    Icon: XCircle,
  },
  pending: {
    label: "รอข้อมูล",
    short: "Pending",
    bg: "bg-slate-50",
    text: "text-slate-400",
    border: "border-slate-200",
    dot: "bg-slate-300",
    Icon: Loader2,
  },
};

export const extractSdgNumber = (...texts) => {
  for (const text of texts) {
    const value = String(text ?? "");
    const m =
      value.match(/sdg\s*([0-9]{1,2})/i) ||
      value.match(/\b([0-9]{1,2})(?:\.[0-9]+)?\b/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 17) return n;
    }
  }
  return null;
};

export function DonutRing({ percent, color = "#10b981", size = 120, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

