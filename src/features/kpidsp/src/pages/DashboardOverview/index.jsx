import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertOctagon } from "lucide-react";
import {
  fetchAllDashboards,
  evaluateSDGStatus,
  getCurrentQuarter,
  evaluateHealthStatus,
  extractSdgNumber,
} from "./overviewUtils";
import OverviewHeroSection from "./OverviewHeroSection";
import {
  OutcomeSystemCardsSection,
  PerformanceSummarySection,
  SdgGoalsGridSection,
  CoverageInsightSection,
  SdgStatusDistributionSection,
  ProvincePlaceholderSection,
  InsightCardsSection,
  RoadTo2030TimelineSection,
} from "./OverviewRedesignSections";
import OverviewClassicTableSection, {
  OverviewCompactTableSection,
} from "./OverviewClassicTableSection";

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYear = searchParams.get("year") || "All";
  const period = searchParams.get("period") || "All";
  const viewMode = searchParams.get("view") || "redesign";
  const redesignEnabled = viewMode !== "classic";
  const showDeferredOverviewSections = false;
  const showSdgGoalsOverviewSection = false;

  const setGlobalFilter = (y, p, view = viewMode) => {
    setSearchParams({ year: y, period: p, view });
  };

  const setViewMode = (nextView) => {
    setSearchParams({ year: fiscalYear, period, view: nextView });
  };

  const scrollToOverviewMetrics = () => {
    const mainEl = document.querySelector("main");
    const target = document.getElementById("overview-metrics");
    if (!mainEl || !target) return;
    const top = Math.max(0, target.offsetTop - 20);
    mainEl.scrollTo({ top, behavior: "smooth" });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["overviewData", fiscalYear, period],
    queryFn: () => fetchAllDashboards(fiscalYear, period),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  /* ── Data Processing ── */
  const { stats } = useMemo(() => {
    if (!data) return { stats: null };
    const [sdgsRaw, healthRaw] = data;
    const allIndicators = [];
    const sdgsStats = {
      passed: 0,
      warning: 0,
      atRisk: 0,
      critical: 0,
      pending: 0,
      total: 0,
      absoluteTotal: sdgsRaw.length,
      reported: 0,
    };

    sdgsRaw.forEach((row) => {
      const hasData =
        row.current_performance !== null &&
        row.current_performance !== undefined &&
        String(row.current_performance).trim() !== "";

      if (hasData) {
        sdgsStats.reported++;
      }

      sdgsStats.total++;

      const status = evaluateSDGStatus(
        row.current_performance,
        row.target_2030,
      );

      allIndicators.push({
        id: `sdg-${row.id}`,
        system: "SDGs",
        title: row.indicator_name,
        originalTitle: row.indicator_name,
        category: row.category || "ไม่ระบุ",
        target: row.target_2030,
        performance: row.current_performance,
        status: status.raw,
      });
      if (status.raw === "passed_100") sdgsStats.passed++;
      else if (status.raw === "failed_75") sdgsStats.warning++;
      else if (status.raw === "failed_50") sdgsStats.atRisk++;
      else if (status.raw === "failed_0") sdgsStats.critical++;
      else sdgsStats.pending++;
    });

    const currentQ = getCurrentQuarter();
    const healthGrouped = new Map();
    healthRaw.forEach((row) => {
      let title = row.indicator_name;
      if (!title || title === "ไม่ระบุ") return;

      const originalTitle = title;
      const subIndicator =
        row.kpi_group && row.kpi_group !== "ALL" && row.kpi_group !== "ไม่ระบุ"
          ? row.kpi_group
          : "";

      let displayTitle = subIndicator ? `${title} — ${subIndicator}` : title;
      let mapKey = displayTitle;

      if (row.is_type_a) {
        displayTitle = `[Health] ${displayTitle}`;
        mapKey = displayTitle;
      }

      if (!healthGrouped.has(mapKey)) {
        healthGrouped.set(mapKey, {
          title: displayTitle,
          originalTitle: originalTitle,
          category: row.kpi_group || "ไม่ระบุ",
          rows: [],
        });
      }
      healthGrouped.get(mapKey).rows.push(row);
    });

    const healthStats = {
      passed: 0,
      warning: 0,
      atRisk: 0,
      critical: 0,
      pending: 0,
      total: 0,
      // A Health KPI can have more than one displayed group.  Keep the
      // coverage denominator in the same unit used by this overview.
      absoluteTotal: healthGrouped.size,
      reported: 0,
    };

    healthGrouped.forEach((group, title) => {
      let finalPerf = "",
        finalTarget = "",
        finalStatus = "pending";
      const overallRow = group.rows.find((r) => {
        const reg = r.region ?? r["เขตฯ"] ?? r["เขต"] ?? r["เขตสุขภาพ"] ?? "";
        return (
          reg.includes("รวม") || reg.includes("ประเทศ") || reg === "ภาพรวม"
        );
      });
      if (overallRow) {
        const tm = {
          targetQ1: overallRow.target_q1,
          targetQ2: overallRow.target_q2,
          targetQ3: overallRow.target_q3,
          targetQ4: overallRow.target_q4,
        };
        finalTarget = tm[currentQ.targetKey] ?? "";
        finalPerf = overallRow.performance ?? "";
        if (finalPerf !== "")
          finalStatus = evaluateHealthStatus(
            finalPerf,
            finalTarget,
            overallRow.evaluation_direction,
          ).raw;
      } else {
        const fv = group.rows.find((r) => r.target_q1);
        if (fv) {
          const tm = {
            targetQ1: fv.target_q1,
            targetQ2: fv.target_q2,
            targetQ3: fv.target_q3,
            targetQ4: fv.target_q4,
          };
          finalTarget = tm[currentQ.targetKey] ?? "";
          group.evaluation_direction = fv.evaluation_direction || null;
        }
        let tot = 0,
          cnt = 0;
        group.rows.forEach((r) => {
          const pStr = String(r.performance ?? "").trim();
          const isValidVal =
            pStr !== "" &&
            pStr !== "-" &&
            pStr !== "0" &&
            pStr !== "0.00" &&
            pStr !== "0.0";
          if (isValidVal) {
            const p = parseFloat(r.performance);
            if (!isNaN(p)) {
              tot += p;
              cnt++;
            }
          }
        });
        if (cnt > 0) {
          finalPerf = (tot / cnt).toFixed(2);
          finalStatus = evaluateHealthStatus(
            finalPerf,
            finalTarget,
            group.evaluation_direction,
          ).raw;
        }
      }

      let groupHasData = false;
      group.rows.forEach((r) => {
        const pStr = String(r.performance ?? "").trim();
        const aStr = String(r.a_value ?? "").trim();
        const bStr = String(r.b_value ?? "").trim();

        const isValid = (val) =>
          val !== "" &&
          val !== "-" &&
          val !== "0" &&
          val !== "0.00" &&
          val !== "0.0";

        if (isValid(pStr) || isValid(aStr) || isValid(bStr)) {
          groupHasData = true;
        }
      });

      if (groupHasData) {
        healthStats.reported++;
      }

      healthStats.total++;

      allIndicators.push({
        id: `health-${title}`,
        system: "Health KPI",
        title,
        originalTitle: group.originalTitle,
        category: group.category,
        target: finalTarget,
        performance: finalPerf,
        status: finalStatus,
      });
      if (finalStatus === "passed_100") healthStats.passed++;
      else if (finalStatus === "failed_75") healthStats.warning++;
      else if (finalStatus === "failed_50") healthStats.atRisk++;
      else if (finalStatus === "failed_0") healthStats.critical++;
      else healthStats.pending++;
    });

    const totalKPIs = sdgsStats.total + healthStats.total;
    const totalPassed = sdgsStats.passed + healthStats.passed;
    const totalWarning = sdgsStats.warning + healthStats.warning;
    const totalAtRisk = sdgsStats.atRisk + healthStats.atRisk;
    const totalCritical = sdgsStats.critical + healthStats.critical;

    return {
      stats: {
        totalKPIs,
        totalPassed,
        totalWarning,
        totalAtRisk,
        totalCritical,
        totalReported: sdgsStats.reported + healthStats.reported,
        totalAssessed:
          totalPassed + totalWarning + totalAtRisk + totalCritical,
        totalPending: totalKPIs - (totalPassed + totalWarning + totalAtRisk + totalCritical),
        allIndicators,
        sdgsStats,
        healthStats,
      },
    };
  }, [data]);

  // The imported KPI rows use current_performance/performance/a_value/b_value,
  // not the obsolete reported/assessed flags. Reuse the same normalized stats
  // that drive the status cards so every number on this page has one source.
  const pipelineStats = useMemo(() => {
    if (!stats) return { total: 0, reported: 0, assessed: 0, pending: 0 };

    return {
      total: stats.totalKPIs,
      reported: stats.totalReported,
      assessed: stats.totalAssessed,
      pending: stats.totalPending,
    };
  }, [stats]);

  const passedPct =
    stats && stats.totalAssessed > 0
      ? Math.round((stats.totalPassed / stats.totalAssessed) * 100)
      : 0;

  const sdgPct =
    stats && stats.sdgsStats.total > 0
      ? Math.round((stats.sdgsStats.passed / stats.sdgsStats.total) * 100)
      : 0;

  const healthPct =
    stats && stats.healthStats.total > 0
      ? Math.round((stats.healthStats.passed / stats.healthStats.total) * 100)
      : 0;

  const actionItems = useMemo(() => {
    if (!stats) return [];
    return stats.allIndicators.filter(
      (kpi) =>
        kpi.status === "failed_0" ||
        kpi.status === "failed_50" ||
        kpi.status === "failed_75",
    );
  }, [stats]);

  const sdgGoalCards = useMemo(() => {
    if (!stats) return [];
    const buckets = new Map();

    stats.allIndicators
      .filter((item) => item.system === "SDGs")
      .forEach((item) => {
        const no = extractSdgNumber(item.category, item.title, item.target);
        const key = no !== null ? `sdg-${no}` : `raw-${item.category || "unmapped"}`;
        if (!buckets.has(key)) {
          buckets.set(key, {
            key,
            no,
            title: no ? `SDG ${no}` : item.category || "ไม่ระบุเป้าหมาย",
            sourceLabel: item.category || "ไม่ระบุหมวด",
            total: 0,
            passed: 0,
            warning: 0,
            atRisk: 0,
            critical: 0,
            pending: 0,
          });
        }
        const b = buckets.get(key);
        b.total += 1;
        if (item.status === "passed_100") b.passed += 1;
        else if (item.status === "failed_75") b.warning += 1;
        else if (item.status === "failed_50") b.atRisk += 1;
        else if (item.status === "failed_0") b.critical += 1;
        else b.pending += 1;
      });

    return [...buckets.values()]
      .map((b) => {
        const assessed = b.passed + b.warning + b.atRisk + b.critical;
        const progress = b.total > 0 ? Math.round((b.passed / b.total) * 100) : 0;
        return { ...b, assessed, progress };
      })
      .sort((a, b) => {
        if (a.no === null && b.no === null) return 0;
        if (a.no === null) return 1;
        if (b.no === null) return -1;
        return a.no - b.no;
      });
  }, [stats]);

  const performanceRanking = useMemo(() => {
    if (!stats) return { best: [], worst: [] };

    const assessedItems = stats.allIndicators
      .filter((item) => item.status !== "pending")
      .map((item) => ({
        ...item,
        score:
          item.status === "passed_100"
            ? 100
            : item.status === "failed_75"
              ? 75
              : item.status === "failed_50"
                ? 50
                : 0,
      }));

    const best = [...assessedItems].sort((a, b) => b.score - a.score).slice(0, 3);
    const worst = [...assessedItems].sort((a, b) => a.score - b.score).slice(0, 3);
    return { best, worst };
  }, [stats]);

  const coverageByCategory = useMemo(() => {
    if (!stats) return [];

    const map = new Map();
    stats.allIndicators.forEach((item) => {
      const key = item.category || "ไม่ระบุ";
      const prev = map.get(key) || 0;
      map.set(key, prev + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stats]);

  const yearlyVolume = useMemo(() => {
    const years = new Map();
    const seedYears = ["2567", "2568", "2569", "2570"];
    seedYears.forEach((y) => years.set(y, 0));
    if (data) {
      const [sdgsRaw, healthRaw] = data;
      [...sdgsRaw, ...healthRaw].forEach((row) => {
        const y = String(row.fiscal_year ?? "");
        if (!y) return;
        years.set(y, (years.get(y) || 0) + 1);
      });
    }
    return [...years.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));
  }, [data]);

  const heroGradient =
    redesignEnabled
      ? "from-[#031434] via-[#0b2a5a] to-[#123b78]"
      : passedPct >= 75
        ? "from-emerald-100 via-cyan-100 to-blue-200"
        : passedPct >= 50
          ? "from-emerald-100 via-cyan-100 to-blue-200"
          : "from-emerald-100 via-cyan-100 to-blue-200";

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-pulse">
        <div className="skeleton h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-52 rounded-3xl" />
          <div className="skeleton h-52 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-40 rounded-3xl" />
          <div className="skeleton h-40 rounded-3xl" />
        </div>
        <div className="skeleton h-72 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-rose-500">
        <AlertOctagon size={48} />
        <p className="font-bold text-slate-700">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
        </p>
        {error?.message && (
          <p className="text-sm text-slate-500 text-center max-w-xl">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 fade-in-up scroll-smooth mt-0">
      <OverviewHeroSection
        redesignEnabled={redesignEnabled}
        scrollToOverviewMetrics={scrollToOverviewMetrics}
        heroGradient={heroGradient}
        fiscalYear={fiscalYear}
        period={period}
        setGlobalFilter={setGlobalFilter}
        setViewMode={setViewMode}
        passedPct={passedPct}
        stats={stats}
        pipelineStats={pipelineStats}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {redesignEnabled && (
          <>
            {showSdgGoalsOverviewSection && (
              <SdgGoalsGridSection sdgGoalCards={sdgGoalCards} />
            )}
            <OutcomeSystemCardsSection
              sdgPct={sdgPct}
              healthPct={healthPct}
              sdgsStats={stats.sdgsStats}
              healthStats={stats.healthStats}
              navigate={navigate}
            />
            <PerformanceSummarySection
              passedPct={passedPct}
              performanceRanking={performanceRanking}
              navigate={navigate}
            />
            <OverviewCompactTableSection
              stats={stats}
              actionItems={actionItems}
              navigate={navigate}
            />
            {showDeferredOverviewSections && (
              <>
                <CoverageInsightSection
                  coverageByCategory={coverageByCategory}
                  yearlyVolume={yearlyVolume}
                />
                <SdgStatusDistributionSection sdgGoalCards={sdgGoalCards} />
                <ProvincePlaceholderSection />
                <InsightCardsSection />
                <RoadTo2030TimelineSection />
              </>
            )}
          </>
        )}

        {!redesignEnabled && (
          <OverviewClassicTableSection
            actionItems={actionItems}
            stats={stats}
            sdgPct={sdgPct}
            healthPct={healthPct}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}
