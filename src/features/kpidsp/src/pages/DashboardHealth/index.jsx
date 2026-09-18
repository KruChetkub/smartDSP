import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { isMeaningfulKpiValue } from "../../utils/kpiMetrics";
import {
  fetchHealthData,
  getCurrentQuarter,
  evaluateStatus,
} from "./healthUtils";
import HealthFilterHeader from "./HealthFilterHeader";
import HealthOverviewMode from "./HealthOverviewMode";
import HealthDetailMode from "./HealthDetailMode";

export default function DashboardHealth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYear = searchParams.get("year") || "All";
  const urlPeriod = searchParams.get("period") || "All";

  const setGlobalFilter = (y, p) => {
    setSearchParams({ year: y, period: p });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["healthData", fiscalYear, urlPeriod],
    queryFn: () => fetchHealthData(fiscalYear, urlPeriod),
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 0,
  });

  const currentQ = useMemo(() => getCurrentQuarter(), []);

  // 1. Map raw data
  const rawMappedData = useMemo(() => {
    if (!data) return [];

    let mapped = data.map((row) => {
      const indicatorName = row.indicator_name || "ไม่ระบุ";
      const subIndicatorName = row.kpi_group || "";
      const region = row.region || "ไม่ได้ระบุเขต";

      const targetMap = {
        targetQ1: row.target_q1 || "",
        targetQ2: row.target_q2 || "",
        targetQ3: row.target_q3 || "",
        targetQ4: row.target_q4 || "",
      };
      const currentQuarterTarget = targetMap[currentQ.targetKey];
      const valA = row.a_value;
      const valB = row.b_value;
      const valRawPerf = row.performance;

      const cleanA = parseFloat(valA) || 0;
      const cleanB = parseFloat(valB) || 0;

      let calcPerf = null;
      if (
        valRawPerf !== null &&
        valRawPerf !== undefined &&
        valRawPerf !== ""
      ) {
        calcPerf = parseFloat(valRawPerf).toFixed(2);
      } else if (cleanB > 0) {
        calcPerf = ((cleanA / cleanB) * 100).toFixed(2);
      } else if (valA !== null || valB !== null || valRawPerf !== null) {
        calcPerf = "0.00";
      }

      const status = evaluateStatus(
        calcPerf !== null ? calcPerf : "",
        currentQuarterTarget,
        row.evaluation_direction,
      );

      return {
        id: row.id,
        region: region,
        title: indicatorName,
        subtitle: subIndicatorName,
        targets: targetMap,
        target_value: currentQuarterTarget || "ไม่มีการกำหนดเป้า",
        current_value: calcPerf,
        pop_b: cleanB,
        pop_35: cleanA,
        status_info: status,
        evaluation_direction: row.evaluation_direction || null,
        reference_url: row.reference_url || null,
      };
    });

    return mapped;
  }, [data, currentQ]);

  // 2. Extract Unique Indicators
  const uniqueMainIndicators = useMemo(() => {
    const mains = new Set();
    rawMappedData.forEach((d) => {
      if (d.title !== "ไม่ระบุ") mains.add(d.title);
    });
    return Array.from(mains);
  }, [rawMappedData]);

  const indicatorParam = searchParams.get("indicator") || "";
  const subIndicatorParam = searchParams.get("subIndicator") || "ALL";
  const [selectedMain, setSelectedMain] = useState(indicatorParam);
  const [overviewStatusFilter, setOverviewStatusFilter] = useState(null);
  const [expandedHealthIndicators, setExpandedHealthIndicators] = useState(
    () => new Set(),
  );
  const healthKpiListRef = useRef(null);

  useEffect(() => {
    if (!indicatorParam) {
      setSelectedMain("");
      return;
    }

    if (uniqueMainIndicators.includes(indicatorParam)) {
      setSelectedMain(indicatorParam);
    } else if (!selectedMain && uniqueMainIndicators.length > 0) {
      if (uniqueMainIndicators.includes(indicatorParam)) {
        setSelectedMain(indicatorParam);
      }
    }
  }, [indicatorParam, uniqueMainIndicators]);

  const handleMainChange = (e) => {
    setSelectedMain(e.target.value);
    setSelectedSub("ALL");
    if (indicatorParam) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("indicator");
      newParams.delete("subIndicator");
      setSearchParams(newParams);
    }
  };

  const toggleExpandedHealthIndicator = (title) => {
    setExpandedHealthIndicators((current) => {
      const next = new Set(current);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const scrollHealthPageToElement = (targetEl) => {
    if (!targetEl) return;
    window.requestAnimationFrame(() => {
      const mainEl = document.querySelector("main");
      if (mainEl) {
        const mainRect = mainEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const stickyOffset = 190;
        const targetTop =
          mainEl.scrollTop + targetRect.top - mainRect.top - stickyOffset;
        mainEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
      } else {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const scrollHealthPageToTop = () => {
    window.requestAnimationFrame(() => {
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: "smooth" });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleOverviewStatusFilter = (statusKey) => {
    setOverviewStatusFilter((current) =>
      current === statusKey ? null : statusKey,
    );
    scrollHealthPageToElement(healthKpiListRef.current);
  };

  const handleSummaryRowClick = (kpi) => {
    if (kpi.subIndicators.length > 0) {
      toggleExpandedHealthIndicator(kpi.title);
      return;
    }

    setSelectedMain(kpi.title);
    setSelectedSub("ALL");
    const newParams = new URLSearchParams(searchParams);
    newParams.set("indicator", kpi.title);
    newParams.delete("subIndicator");
    setSearchParams(newParams);
    scrollHealthPageToTop();
  };

  const handleSubSummaryRowClick = (title, subtitle) => {
    setSelectedMain(title);
    setSelectedSub(subtitle);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("indicator", title);
    newParams.set("subIndicator", subtitle);
    setSearchParams(newParams);
    scrollHealthPageToTop();
  };

  // 3. Extract Unique Sub-Indicators
  const uniqueSubIndicators = useMemo(() => {
    if (!selectedMain) return [];
    const subs = new Set();
    rawMappedData.forEach((d) => {
      if (d.title === selectedMain && d.subtitle) {
        subs.add(d.subtitle);
      }
    });
    return Array.from(subs);
  }, [rawMappedData, selectedMain]);

  const [selectedSub, setSelectedSub] = useState("ALL");

  useEffect(() => {
    if (
      subIndicatorParam &&
      subIndicatorParam !== "ALL" &&
      uniqueSubIndicators.includes(subIndicatorParam)
    ) {
      setSelectedSub(subIndicatorParam);
      return;
    }

    if (selectedSub !== "ALL" && !uniqueSubIndicators.includes(selectedSub)) {
      setSelectedSub("ALL");
    }
  }, [subIndicatorParam, uniqueSubIndicators, selectedSub]);

  // 4. Apply Filters
  const dashboardData = useMemo(() => {
    if (!selectedMain) return [];
    return rawMappedData
      .filter((d) => {
        const matchMain = d.title === selectedMain;
        const matchSub =
          selectedSub === "ALL" ? true : d.subtitle === selectedSub;
        return matchMain && matchSub;
      })
      .sort((a, b) => {
        const numA = parseInt((a.region || "").replace(/\D/g, "")) || 0;
        const numB = parseInt((b.region || "").replace(/\D/g, "")) || 0;
        return numA - numB;
      });
  }, [rawMappedData, selectedMain, selectedSub]);

  // 4b. Get first non-null reference_url for the selected indicator
  const indicatorReferenceUrl = useMemo(() => {
    if (!dashboardData.length) return null;
    const found = dashboardData.find((d) => d.reference_url);
    return found ? found.reference_url : null;
  }, [dashboardData]);

  // 5. Calculate Stats for the Filtered Data (aggregated by region)
  const { summary, barData, aggregatedMapData, targetLine, allTargets } =
    useMemo(() => {
      let totals = {
        passed_100: 0,
        failed_75: 0,
        failed_50: 0,
        failed_0: 0,
        pending: 0,
      };
      let totalA = 0;
      let totalB = 0;
      let totalPerfGlobal = 0;
      let regionsWithPerfGlobal = 0;

      let qTargets = { q1: "-", q2: "-", q3: "-", q4: "-" };
      if (dashboardData.length > 0) {
        // คำนวณค่าเป้าหมายจากแถวเขตสุขภาพ (เขต 1-13) เท่านั้น
        // เพื่อให้ตรงกับค่าที่ตั้งในหน้า ManageHealth
        // ไม่ใช้แถว "รายงานภาพรวม" เพราะอาจมีค่าเก่าหรือต่างจากที่ตั้งไว้
        const regionRows = dashboardData.filter(
          (d) => d.region !== "รายงานภาพรวม"
        );
        const sourceRows = regionRows.length > 0 ? regionRows : dashboardData;

        // หาค่าที่พบมากที่สุด (mode) เพื่อแสดงค่าเป้าหมายที่ถูกต้อง
        const getModeTarget = (key) => {
          const freq = {};
          sourceRows.forEach((d) => {
            const val = d.targets[key];
            if (val && val !== "") freq[val] = (freq[val] || 0) + 1;
          });
          const entries = Object.entries(freq);
          if (entries.length === 0) return "-";
          return entries.sort((a, b) => b[1] - a[1])[0][0];
        };

        qTargets = {
          q1: getModeTarget("targetQ1"),
          q2: getModeTarget("targetQ2"),
          q3: getModeTarget("targetQ3"),
          q4: getModeTarget("targetQ4"),
        };
      }

      // Aggregate by Region
      const regionAgg = {};
      for (let i = 1; i <= 13; i++) {
        regionAgg[i] = {
          totalA: 0,
          totalB: 0,
          totalPerf: 0,
          count: 0,
          target: qTargets
            ? qTargets[currentQ.id.toLowerCase()] || "N/A"
            : "N/A",
          rawRegion: `เขต ${i}`,
          evaluation_direction: dashboardData[0]?.evaluation_direction || null,
        };
      }
      let overallReport = null;

      dashboardData.forEach((d) => {
        const isOverall = d.region === "รายงานภาพรวม";
        if (isOverall) {
          overallReport = d;
          return;
        }

        const rnum = parseInt((d.region || "").replace(/\D/g, "")) || 0;
        if (rnum === 0 || rnum > 13) return;

        regionAgg[rnum].target = d.target_value;
        regionAgg[rnum].rawRegion = d.region;
        regionAgg[rnum].evaluation_direction = d.evaluation_direction;

        const curA = parseFloat(d.pop_35 || 0);
        const curB = parseFloat(d.pop_b || 0);
        const perf = parseFloat(d.current_value);

        if (
          !isNaN(perf) &&
          (perf > 0 ||
            curB > 0 ||
            (d.current_value !== "" && d.current_value !== null))
        ) {
          regionAgg[rnum].totalA += curA;
          regionAgg[rnum].totalB += curB;
          regionAgg[rnum].totalPerf += perf;
          regionAgg[rnum].count += 1;

          totalA += curA;
          totalB += curB;
          totalPerfGlobal += perf;
          regionsWithPerfGlobal++;
        }
      });

      const bData = [];
      const mapDataList = [];

      const useOverallOnly =
        regionsWithPerfGlobal === 0 && overallReport !== null;
      let ovPerf = 0;
      let ovStatus = { raw: "pending" };

      if (useOverallOnly) {
        ovPerf = parseFloat(overallReport.current_value);
        if (isNaN(ovPerf)) ovPerf = 0;
        ovStatus = evaluateStatus(
          Number.isFinite(ovPerf) ? ovPerf : "",
          overallReport.target_value,
          overallReport.evaluation_direction,
        );
      }

      Object.keys(regionAgg)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((rnum) => {
          const reg = regionAgg[rnum];
          let calcPerf = 0;

          if (useOverallOnly) {
            calcPerf = ovPerf;
          } else if (reg.count > 0) {
            if (reg.totalB > 0) {
              calcPerf = parseFloat(
                ((reg.totalA / reg.totalB) * 100).toFixed(2),
              );
            } else {
              calcPerf = parseFloat((reg.totalPerf / reg.count).toFixed(2));
            }
          }

          const finalPerfStr = useOverallOnly || reg.count > 0 ? calcPerf : "";
          const status = useOverallOnly
            ? ovStatus
            : evaluateStatus(finalPerfStr, reg.target, reg.evaluation_direction);

          if (!useOverallOnly) {
            totals[status.raw] = (totals[status.raw] || 0) + 1;
          }

          if (!useOverallOnly) {
            bData.push({
              name: `เขต ${rnum}`,
              performance: calcPerf,
              color:
                status.raw === "passed_100"
                  ? "#10b981"
                  : status.raw === "failed_75"
                    ? "#eab308"
                    : status.raw === "failed_50"
                      ? "#f97316"
                      : status.raw === "failed_0"
                        ? "#f43f5e"
                        : "#cbd5e1",
            });
          }

          mapDataList.push({
            region: reg.rawRegion,
            current_value: finalPerfStr !== "" ? calcPerf.toFixed(2) : "-",
            target_value: useOverallOnly
              ? overallReport.target_value
              : reg.target,
            status_info: status,
          });
        });

      if (useOverallOnly) {
        totals[ovStatus.raw] = (totals[ovStatus.raw] || 0) + 1;
        bData.push({
          name: `ภาพรวมประเทศ`,
          performance: ovPerf,
          color:
            ovStatus.raw === "passed_100"
              ? "#10b981"
              : ovStatus.raw === "failed_75"
                ? "#eab308"
                : ovStatus.raw === "failed_50"
                  ? "#f97316"
                  : ovStatus.raw === "failed_0"
                    ? "#f43f5e"
                    : "#cbd5e1",
        });
      }

      let avgPerf = "-";
      if (regionsWithPerfGlobal > 0) {
        if (totalB > 0) {
          avgPerf = ((totalA / totalB) * 100).toFixed(2);
        } else {
          avgPerf = (totalPerfGlobal / regionsWithPerfGlobal).toFixed(2);
        }
      } else if (overallReport) {
        const ovCur = parseFloat(overallReport.current_value);
        avgPerf = !isNaN(ovCur) ? ovCur.toFixed(2) : "-";
        totals[overallReport.status_info.raw] =
          (totals[overallReport.status_info.raw] || 0) + 1;
      }

      let targetNum = 0;
      if (dashboardData.length > 0) {
        const targetStr = String(dashboardData[0].target_value);
        const match = targetStr.match(/([\d.]+)/);
        if (match) targetNum = parseFloat(match[1]);
      }

      let passedCount = totals.passed_100 || 0;
      let failedCount =
        (totals.failed_75 || 0) +
        (totals.failed_50 || 0) +
        (totals.failed_0 || 0);
      let totalAssessed = passedCount + failedCount;
      let passedPercent =
        totalAssessed > 0
          ? ((passedCount / totalAssessed) * 100).toFixed(2)
          : 0;
      let failedPercent =
        totalAssessed > 0
          ? ((failedCount / totalAssessed) * 100).toFixed(2)
          : 0;

      return {
        summary: {
          avgPerf,
          passedCount,
          failedCount,
          passedPercent,
          failedPercent,
        },
        barData: bData,
        aggregatedMapData: mapDataList,
        targetLine: targetNum,
        allTargets: qTargets,
      };
    }, [dashboardData, currentQ]);

  // 6. Calculate Summaries for ALL Indicators (for Overview Mode)
  const allSummaries = useMemo(() => {
    const summarizeRows = (rows) => {
      let totalA = 0;
      let totalB = 0;
      let regionsWithPerf = 0;
      let overallReport = null;
      let totals = {
        passed_100: 0,
        failed_75: 0,
        failed_50: 0,
        failed_0: 0,
        pending: 0,
      };

      rows.forEach((d) => {
        const isOverall = d.region === "รายงานภาพรวม";
        if (isOverall) overallReport = d;
        const cur = parseFloat(d.current_value);
        if (!isOverall) {
          totals[d.status_info.raw] = (totals[d.status_info.raw] || 0) + 1;
          if (!isNaN(cur) && isMeaningfulKpiValue(d.current_value)) {
            totalA += parseFloat(d.pop_35 || 0);
            totalB += parseFloat(d.pop_b || 0);
            regionsWithPerf++;
          }
        }
      });

      let avgPerf = "-";
      if (regionsWithPerf > 0) {
        avgPerf = totalB > 0 ? ((totalA / totalB) * 100).toFixed(2) : "-";
      } else if (overallReport) {
        const ovPerf = parseFloat(overallReport.current_value);
        avgPerf = !isNaN(ovPerf) ? ovPerf.toFixed(2) : "-";
      }

      return {
        avgPerf,
        status: evaluateStatus(
          avgPerf,
          rows[0].targets[currentQ.targetKey],
          rows[0].evaluation_direction,
        ),
        passed: totals.passed_100,
        failed: totals.failed_75 + totals.failed_50 + totals.failed_0,
        pending: totals.pending,
      };
    };

    const reports = [];
    uniqueMainIndicators.forEach((title) => {
      const kpisForTitle = rawMappedData.filter(
        (d) => d.title === title && d.subtitle === "ALL",
      );
      const relevantData =
        kpisForTitle.length > 0
          ? kpisForTitle
          : rawMappedData.filter((d) => d.title === title);

      if (relevantData.length === 0) return;

      const subIndicators = Array.from(
        new Set(
          rawMappedData
            .filter((d) => d.title === title && d.subtitle)
            .map((d) => d.subtitle),
        ),
      ).map((subtitle) => ({
        title,
        subtitle,
        ...summarizeRows(
          rawMappedData.filter(
            (d) => d.title === title && d.subtitle === subtitle,
          ),
        ),
      }));

      reports.push({
        title,
        subIndicators,
        ...summarizeRows(relevantData),
      });
    });
    return reports;
  }, [rawMappedData, uniqueMainIndicators, currentQ]);

  // 7. Calculate Regional Averages & Status Breakdown (for Category Overview)
  const categoryStats = useMemo(() => {
    const statusCounts = { passed: 0, failed: 0, pending: 0 };
    allSummaries.forEach((s) => {
      if (s.status.raw === "passed_100") statusCounts.passed++;
      else if (s.status.raw === "pending") statusCounts.pending++;
      else statusCounts.failed++;
    });

    const statusData = [
      {
        key: "passed",
        name: "ผ่านเกณฑ์",
        value: statusCounts.passed,
        color: "#10b981",
      },
      {
        key: "failed",
        name: "ไม่ผ่านเกณฑ์",
        value: statusCounts.failed,
        color: "#f43f5e",
      },
      {
        key: "pending",
        name: "รอดำเนินการ",
        value: statusCounts.pending,
        color: "#64748b",
      },
    ];

    const regionSource =
      dashboardData.length > 0 ? dashboardData : rawMappedData;
    const statusRank = {
      passed_100: 4,
      failed_75: 3,
      failed_50: 2,
      failed_0: 1,
      pending: 0,
    };
    const regions = {};
    regionSource.forEach((d) => {
      if (d.region === "รายงานภาพรวม") return;
      if (!regions[d.region]) {
        regions[d.region] = {
          totalPerf: 0,
          count: 0,
          statusCounts: {
            passed_100: 0,
            failed_75: 0,
            failed_50: 0,
            failed_0: 0,
            pending: 0,
          },
        };
      }
      const perf = parseFloat(d.current_value);
      if (!isNaN(perf)) {
        regions[d.region].totalPerf += perf;
        regions[d.region].count += 1;
      }
      const rawStatus = d.status_info?.raw || "pending";
      regions[d.region].statusCounts[rawStatus] =
        (regions[d.region].statusCounts[rawStatus] || 0) + 1;
    });

    const regData = Object.keys(regions)
      .map((r) => {
        const statusEntries = Object.entries(regions[r].statusCounts);
        const dominantStatus =
          statusEntries.sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return (statusRank[b[0]] || 0) - (statusRank[a[0]] || 0);
          })[0]?.[0] || "pending";
        return {
          name: r.replace("เขตสุขภาพที่ ", "เขต ").replace("เขตฯ ", "เขต "),
          avg:
            regions[r].count > 0
              ? parseFloat((regions[r].totalPerf / regions[r].count).toFixed(2))
              : 0,
          statusRaw: dominantStatus,
        };
      })
      .sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.name.replace(/\D/g, "")) || 0;
        return numA - numB;
      });

    return {
      statusData,
      regData,
      totalKPIs: allSummaries.length,
      statusCounts,
    };
  }, [allSummaries, rawMappedData, dashboardData]);

  const filteredAllSummaries = useMemo(() => {
    const matchesStatusFilter = (summaryItem) => {
      if (!overviewStatusFilter) return true;
      if (overviewStatusFilter === "passed") {
        return summaryItem.status.raw === "passed_100";
      }
      if (overviewStatusFilter === "pending") {
        return summaryItem.status.raw === "pending";
      }
      return (
        summaryItem.status.raw !== "passed_100" &&
        summaryItem.status.raw !== "pending"
      );
    };

    return [...allSummaries]
      .filter(matchesStatusFilter)
      .sort((a, b) => {
        const aPending = a.avgPerf === "-";
        const bPending = b.avgPerf === "-";
        if (aPending !== bPending) return aPending ? 1 : -1;
        if (aPending && bPending) {
          return a.title.localeCompare(b.title, "th");
        }
        return parseFloat(a.avgPerf) - parseFloat(b.avgPerf);
      });
  }, [allSummaries, overviewStatusFilter]);

  if (isLoading) {
    return (
      <div className="max-w-[1700px] w-full mx-auto space-y-6 pb-10 animate-pulse">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          <div className="lg:col-span-4 min-w-0 skeleton h-[350px] rounded-3xl" />
          <div className="lg:col-span-5 min-w-0 skeleton h-[350px] rounded-3xl" />
          <div className="lg:col-span-3 min-w-0 skeleton h-[350px] rounded-3xl" />
        </div>
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-rose-500 gap-4">
        <AlertTriangle size={48} />
        <p className="font-bold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <p className="text-sm opacity-80">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1700px] w-full mx-auto space-y-6 pb-10">
      {/* 1. Header Filter */}
      <HealthFilterHeader
        selectedMain={selectedMain}
        selectedSub={selectedSub}
        fiscalYear={fiscalYear}
        urlPeriod={urlPeriod}
        uniqueMainIndicators={uniqueMainIndicators}
        uniqueSubIndicators={uniqueSubIndicators}
        onFilterChange={setGlobalFilter}
        onMainChange={handleMainChange}
        onSubChange={(e) => setSelectedSub(e.target.value)}
      />

      {/* 2. Overview Mode or Detail Mode */}
      {!selectedMain ? (
        <HealthOverviewMode
          categoryStats={categoryStats}
          overviewStatusFilter={overviewStatusFilter}
          onOverviewStatusFilter={handleOverviewStatusFilter}
          indicatorReferenceUrl={indicatorReferenceUrl}
          healthKpiListRef={healthKpiListRef}
          filteredAllSummaries={filteredAllSummaries}
          allSummaries={allSummaries}
          expandedHealthIndicators={expandedHealthIndicators}
          onSummaryRowClick={handleSummaryRowClick}
          onSubSummaryRowClick={handleSubSummaryRowClick}
        />
      ) : (
        <HealthDetailMode
          dashboardData={dashboardData}
          summary={summary}
          barData={barData}
          aggregatedMapData={aggregatedMapData}
          targetLine={targetLine}
          allTargets={allTargets}
          currentQ={currentQ}
          indicatorReferenceUrl={indicatorReferenceUrl}
        />
      )}
    </div>
  );
}

