import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, Search, Layers, Activity, CheckCircle2, AlertTriangle,
  AlertOctagon, XCircle, ChevronLeft, SlidersHorizontal, ArrowUpDown
} from 'lucide-react';
import { fetchSDGIndicators, fetchHealthIndicators, evaluateKPIStatus } from '../api/kpiApi';
import { buildPipelineStats, isMeaningfulKpiValue } from '../utils/kpiMetrics';
import { calculateAchievementPercentage } from '../utils/kpiEvaluation';

/* ─────────────────────────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────────────────────────── */
const GROUP_CONFIG = {
  sdg: {
    label: 'เป้าหมายการพัฒนาที่ยั่งยืน (SDGs)',
    sublabel: 'Sustainable Development Goals — กองยุทธศาสตร์และแผนงาน',
    color: 'sky',
    Icon: Layers,
    headerGradient: 'from-sky-600 to-blue-700',
    accentBg: 'bg-sky-50',
    accentBorder: 'border-sky-200',
    accentText: 'text-sky-700',
    dotColor: 'bg-sky-500',
    fetchFn: fetchSDGIndicators,
    getCategory: r => r.category || 'ไม่ระบุ',
    getTarget: r => r.target_2030 || '',
    getPerformance: r => r.current_performance,
    getTitle: r => r.indicator_name,
  },
  health: {
    label: 'ตัวชี้วัดสาธารณสุข (Health KPI)',
    sublabel: 'Health KPI — ระดับกระทรวง กรมควบคุมโรค',
    color: 'emerald',
    Icon: Activity,
    headerGradient: 'from-emerald-600 to-teal-700',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    accentText: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    fetchFn: fetchHealthIndicators,
    getCategory: r => r.kpi_group || 'ไม่ระบุ',
    getTarget: r => r.target_q1 || r.target_q2 || '',
    getPerformance: r => r.performance,
    getTitle: r => r.indicator_name,
  },
};

const STATUS_CONFIG = {
  passed_100: { label: 'บรรลุเป้าหมาย', short: 'Passed',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500', Icon: CheckCircle2 },
  failed_75:  { label: 'เฝ้าระวัง',      short: 'Warning',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   bar: 'bg-amber-400',   Icon: AlertTriangle  },
  failed_50:  { label: 'ระดับเสี่ยง',    short: 'At Risk',  bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  bar: 'bg-orange-500',  Icon: AlertOctagon   },
  failed_0:   { label: 'ขั้นวิกฤติ',     short: 'Critical', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    bar: 'bg-rose-500',    Icon: XCircle        },
  pending:    { label: 'รอข้อมูล',        short: 'Pending',  bg: 'bg-slate-50',   text: 'text-slate-400',   border: 'border-slate-200',   bar: 'bg-slate-300',   Icon: Loader2        },
};

const getCurrentQuarterKey = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 10) return 'target_q1';
  if (m <= 3)  return 'target_q2';
  if (m <= 6)  return 'target_q3';
  return 'target_q4';
};

/* ─────────────────────────────────────────────────────────────────────────────
   PROGRESS BAR COMPONENT
───────────────────────────────────────────────────────────────────────────── */
function ProgressBar({ percentage, statusRaw }) {
  const s = STATUS_CONFIG[statusRaw] || STATUS_CONFIG.pending;
  const clamped = Math.min(100, Math.max(0, percentage || 0));
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${s.bar}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────────────────── */
function StatCard({ count, label, Icon, bgClass, textClass, borderClass }) {
  return (
    <div className={`bg-white border ${borderClass} rounded-2xl p-4 flex items-center gap-3 shadow-sm`}>
      <div className={`w-9 h-9 rounded-xl ${bgClass} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={textClass} />
      </div>
      <div>
        <p className={`text-2xl font-black tabular-nums ${textClass}`}>{count}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════════════════ */
export default function KPIGroup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYear = searchParams.get('year') || 'All';
  const urlPeriod = searchParams.get('period') || 'All';

  const setGlobalFilter = (y, p) => {
    setSearchParams({ year: y, period: p });
  };

  const config = GROUP_CONFIG[groupId] || GROUP_CONFIG.sdg;
  const GroupIcon = config.Icon;

  /* ── Fetch ── */
  const { data: rawData = [], isLoading, error } = useQuery({
    queryKey: ['kpiGroup', groupId, fiscalYear, urlPeriod],
    queryFn: () => config.fetchFn(fiscalYear, urlPeriod),
    enabled: !!config,
    staleTime: 0,
  });

  /* ── UI State ── */
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name' | 'perf_asc' | 'perf_desc'

  /* ── Process Raw Data → Enriched KPIs ── */
  const kpis = useMemo(() => {
    if (!rawData) return [];
    const qKey = getCurrentQuarterKey();

    return rawData.map(row => {
      const title = config.getTitle(row);
      const category = config.getCategory(row);
      const targetRaw = groupId === 'health'
        ? (row[qKey] || config.getTarget(row))
        : config.getTarget(row);
      const perf = config.getPerformance(row);
      const status = evaluateKPIStatus(perf, targetRaw, row.evaluation_direction);

      // Calculate % for progress bar
      let pct = 0;
      if (status.raw !== 'pending') {
        const percentage = calculateAchievementPercentage(perf, targetRaw, row.evaluation_direction);
        if (percentage !== null) pct = Math.min(100, percentage);
      }

      return {
        id: row.id,
        title,
        category,
        target: targetRaw,
        performance: perf !== null && perf !== undefined && perf !== '' ? perf : null,
        region: row.region || null,
        status: status.raw,
        percentage: Math.round(pct),
      };
    });
  }, [rawData, groupId, config]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const counts = { passed_100: 0, failed_75: 0, failed_50: 0, failed_0: 0, pending: 0 };
    kpis.forEach(k => { counts[k.status] = (counts[k.status] || 0) + 1; });
    return counts;
  }, [kpis]);

  const pipelineStats = useMemo(() => {
    return buildPipelineStats(
      kpis.map((kpi) => ({
        reported: isMeaningfulKpiValue(kpi.performance),
        assessed: kpi.status !== 'pending',
      })),
    );
  }, [kpis]);

  /* ── Filter + Search + Sort ── */
  const displayKPIs = useMemo(() => {
    let result = [...kpis];

    if (filterStatus !== 'ALL') {
      result = result.filter(k => k.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(k =>
        k.title.toLowerCase().includes(q) ||
        k.category.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'th'));
    } else if (sortBy === 'perf_desc') {
      result.sort((a, b) => (b.performance ?? -Infinity) - (a.performance ?? -Infinity));
    } else if (sortBy === 'perf_asc') {
      result.sort((a, b) => (a.performance ?? Infinity) - (b.performance ?? Infinity));
    }

    return result;
  }, [kpis, filterStatus, search, sortBy]);

  /* ── Group by Category ── */
  const grouped = useMemo(() => {
    const map = new Map();
    displayKPIs.forEach(kpi => {
      const cat = kpi.category || 'ไม่ระบุ';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(kpi);
    });
    return map;
  }, [displayKPIs]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-pulse">
        <div className="skeleton h-36 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        <div className="skeleton h-12 rounded-2xl" />
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-rose-500">
        <AlertOctagon size={48} />
        <p className="font-bold text-slate-700">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <p className="text-sm text-slate-400">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 fade-in-up">

      {/* ════════════════════════════════════════════════ HEADER CARD */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${config.headerGradient} rounded-3xl p-8 text-white shadow-xl`}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        </div>
        <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-white/50 hover:text-white/90 text-xs font-bold uppercase tracking-wider mb-4 transition-colors"
            >
              <ChevronLeft size={14} /> กลับไปหน้าหลัก
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <GroupIcon size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-tight">{config.label}</h1>
                <p className="text-white/50 text-xs font-bold mt-0.5">{config.sublabel}</p>
              </div>
            </div>
            <p className="text-white/40 text-sm font-medium mt-2">
              ตัวชี้วัดทั้งหมด <span className="text-white font-black">{kpis.length}</span> รายการ
            </p>
          </div>
          {/* Overall % badge */}
          <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
            <p className="text-4xl font-black tabular-nums">
              {pipelineStats.assessed > 0 ? Math.round((stats.passed_100 / pipelineStats.assessed) * 100) : 0}
            </p>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mt-1">% ผ่านเป้าหมาย</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard count={stats.passed_100} label="บรรลุเป้าหมาย" Icon={CheckCircle2}
          bgClass="bg-emerald-100" textClass="text-emerald-700" borderClass="border-emerald-100" />
        <StatCard count={stats.failed_75} label="เฝ้าระวัง" Icon={AlertTriangle}
          bgClass="bg-amber-100" textClass="text-amber-700" borderClass="border-amber-100" />
        <StatCard count={stats.failed_50 + stats.failed_0} label="เสี่ยง / วิกฤติ" Icon={AlertOctagon}
          bgClass="bg-rose-100" textClass="text-rose-700" borderClass="border-rose-100" />
        <StatCard count={stats.pending} label="รอข้อมูล" Icon={Loader2}
          bgClass="bg-slate-100" textClass="text-slate-500" borderClass="border-slate-200" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total KPIs</p>
          <p className="text-2xl font-black tabular-nums text-slate-800 mt-1">{pipelineStats.total}</p>
        </div>
        <div className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-sky-700 uppercase tracking-wider">Reported</p>
          <p className="text-2xl font-black tabular-nums text-slate-800 mt-1">{pipelineStats.reported}</p>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Assessed</p>
          <p className="text-2xl font-black tabular-nums text-slate-800 mt-1">{pipelineStats.assessed}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-black tabular-nums text-slate-800 mt-1">{pipelineStats.pending}</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาตัวชี้วัด..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <SlidersHorizontal size={14} className="text-slate-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-sky-500 transition-all cursor-pointer"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="passed_100">✅ บรรลุเป้าหมาย</option>
            <option value="failed_75">⚠️ เฝ้าระวัง</option>
            <option value="failed_50">🔶 ระดับเสี่ยง</option>
            <option value="failed_0">🔴 ขั้นวิกฤติ</option>
            <option value="pending">⬜ รอข้อมูล</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ArrowUpDown size={14} className="text-slate-400" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-sky-500 transition-all cursor-pointer"
          >
            <option value="default">เรียงตามค่าเริ่มต้น</option>
            <option value="name">เรียงตามชื่อ (ก-ฮ)</option>
            <option value="perf_desc">ผลงานสูง → ต่ำ</option>
            <option value="perf_asc">ผลงานต่ำ → สูง</option>
          </select>
        </div>

        {/* Result count */}
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap flex-shrink-0">
          {displayKPIs.length} รายการ
        </span>
      </div>

      {/* ════════════════════════════════════════════════ KPI LIST */}
      {displayKPIs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
          <Search size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="font-bold text-slate-600 text-lg">ไม่พบตัวชี้วัดที่ตรงกับเงื่อนไข</p>
          <p className="text-slate-400 text-sm mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
              {/* Category Header */}
              <div className={`px-6 py-4 border-b ${config.accentBorder} ${config.accentBg} flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dotColor}`} />
                  <h2 className={`font-black text-sm ${config.accentText}`}>
                    {groupId === 'sdg' ? `เป้าหมาย ${category}` : category}
                  </h2>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${config.accentBorder} ${config.accentBg} ${config.accentText}`}>
                  {items.length} ตัวชี้วัด
                </span>
              </div>

              {/* KPI Rows */}
              <div className="divide-y divide-slate-50">
                {items.map((kpi, idx) => {
                  const s = STATUS_CONFIG[kpi.status] || STATUS_CONFIG.pending;
                  const StatusIcon = s.Icon;
                  return (
                    <div
                      key={`${kpi.id}-${idx}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4 hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Index */}
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>

                      {/* Title + Progress */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="font-bold text-slate-700 text-sm leading-snug group-hover:text-slate-900 transition-colors line-clamp-2">
                          {kpi.title}
                        </p>
                        {kpi.region && (
                          <p className="text-[10px] text-slate-400 font-medium">{kpi.region}</p>
                        )}
                        <ProgressBar percentage={kpi.percentage} statusRaw={kpi.status} />
                      </div>

                      {/* Target */}
                      <div className="flex-shrink-0 text-right hidden sm:block min-w-[100px]">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เป้าหมาย</p>
                        <p className="text-sm font-bold text-slate-500 mt-0.5">{kpi.target || '—'}</p>
                      </div>

                      {/* Performance */}
                      <div className="flex-shrink-0 text-right min-w-[80px]">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ผลงาน</p>
                        <p className={`text-xl font-black tabular-nums mt-0.5 ${kpi.performance !== null ? 'text-slate-800' : 'text-slate-300'}`}>
                          {kpi.performance !== null ? kpi.performance : '—'}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${s.bg} ${s.text} ${s.border}`}>
                          <StatusIcon size={11} />
                          {s.short}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          © 2026 KPI Monitoring System — กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
        </p>
      </div>

    </div>
  );
}
