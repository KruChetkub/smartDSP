import React from "react";
import { supabase, withSupabaseTimeout } from "../../lib/supabase";
import { calculateAchievementPercentage } from "../../utils/kpiEvaluation";

export const fetchHealthData = async (year, period) => {
  let query = supabase
    .from("health_indicators")
    .select("*")
    .eq("is_deleted", false)
    .order("indicator_name", { ascending: true });

  if (year && year !== "All") query = query.eq("fiscal_year", year);
  if (period && period !== "All") query = query.eq("period", period);

  const { data, error } = await withSupabaseTimeout(
    query,
    "Health KPI page query",
  );

  if (error) throw error;
  return data;
};

export const getCurrentQuarter = () => {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 10 && month <= 12)
    return { id: "Q1", targetKey: "targetQ1", name: "ไตรมาส 1 (ต.ค. - ธ.ค.)" };
  if (month >= 1 && month <= 3)
    return { id: "Q2", targetKey: "targetQ2", name: "ไตรมาส 2 (ม.ค. - มี.ค.)" };
  if (month >= 4 && month <= 6)
    return {
      id: "Q3",
      targetKey: "targetQ3",
      name: "ไตรมาส 3 (เม.ย. - มิ.ย.)",
    };
  return { id: "Q4", targetKey: "targetQ4", name: "ไตรมาส 4 (ก.ค. - ก.ย.)" };
};

export const evaluateStatus = (current, target, direction) => {
  const pendingStatus = {
    color: "text-slate-400",
    border: "border-slate-500/30",
    bg: "bg-slate-500",
    shadow: "shadow-none",
    text: "รอประเมินหลักเกณฑ์",
    raw: "pending",
    percentage: 0,
  };

  const percentage = calculateAchievementPercentage(current, target, direction);
  if (percentage === null) return pendingStatus;

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
      text: "ต่ำกว่าเป้าหมาย",
      raw: "failed_75",
      percentage,
    };
  } else if (percentage >= 50) {
    return {
      color: "text-orange-400",
      border: "border-orange-400/50",
      bg: "bg-orange-500",
      shadow: "shadow-[0_0_10px_rgba(249,115,22,0.5)]",
      text: "ระดับเสี่ยง",
      raw: "failed_50",
      percentage,
    };
  }

  return {
    color: "text-rose-500",
    border: "border-rose-500/50",
    bg: "bg-rose-500",
    shadow: "shadow-[0_0_10px_rgba(244,63,94,0.5)]",
    text: "ระดับวิกฤติ",
    raw: "failed_0",
    percentage,
  };
};

export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 border border-slate-200 p-3 rounded-xl backdrop-blur-md shadow-lg text-sm">
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between gap-6">
              <span style={{ color: entry.color }} className="font-semibold">
                {entry.name}:
              </span>
              <span className="text-slate-800 font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

