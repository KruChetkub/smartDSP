import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Search, Pencil, Trash2, Save, X, Loader2,
  CheckCircle2, AlertOctagon, RotateCcw, ChevronRight,
  ChevronsUpDown, ChevronsDownUp, Plus, MapPin, Link2, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseOptionalNumber, trimToNull } from '../utils/kpiForm';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  EVALUATION_DIRECTIONS,
  DEFAULT_EVALUATION_DIRECTION,
  resolveEvaluationDirection,
  calculateAchievementPercentage,
} from '../utils/kpiEvaluation';
import KpiDataPolicyNotice from '../components/KpiDataPolicyNotice';

/* ─────────────────────────────────────────────────────────────────────────────
   REGIONS LIST
───────────────────────────────────────────────────────────────────────────── */
const REGIONS = [
  'เขตฯ 1', 'เขตฯ 2', 'เขตฯ 3', 'เขตฯ 4', 'เขตฯ 5',
  'เขตฯ 6', 'เขตฯ 7', 'เขตฯ 8', 'เขตฯ 9', 'เขตฯ 10',
  'เขตฯ 11', 'เขตฯ 12', 'เขตฯ 13', 'รายงานภาพรวม'
];

// เรียงเขตแบบตัวเลข: เขตฯ 1 → 2 → ... → 13 → รายงานภาพรวม
const regionSortIndex = (region = '') => {
  const num = region.match(/(\d+)/);
  if (num) return parseInt(num[1]);
  return 999; // รายงานภาพรวม หรือ ไม่ระบุ → ไปท้ายสุด
};

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS HELPER
───────────────────────────────────────────────────────────────────────────── */
const getCurrentQuarterKey = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 10) return 'target_q1';
  if (m <= 3)  return 'target_q2';
  if (m <= 6)  return 'target_q3';
  return 'target_q4';
};

const evalStatus = (perf, targetStr, direction) => {
  const pct = calculateAchievementPercentage(perf, targetStr, direction);
  if (pct === null) return 'pending';
  if (pct >= 100) return 'passed';
  if (pct >= 75)  return 'warning';
  if (pct >= 50)  return 'risk';
  return 'critical';
};

const STATUS_STYLE = {
  passed:   { dot: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'บรรลุ' },
  warning:  { dot: 'bg-amber-400',   text: 'text-amber-600',   badge: 'bg-amber-50 border-amber-200 text-amber-700',     label: 'เฝ้าระวัง' },
  risk:     { dot: 'bg-orange-500',  text: 'text-orange-600',  badge: 'bg-orange-50 border-orange-200 text-orange-700',  label: 'เสี่ยง' },
  critical: { dot: 'bg-rose-500',    text: 'text-rose-600',    badge: 'bg-rose-50 border-rose-200 text-rose-700',        label: 'วิกฤติ' },
  pending:  { dot: 'bg-slate-300',   text: 'text-slate-400',   badge: 'bg-slate-50 border-slate-200 text-slate-400',     label: 'รอข้อมูล' },
};

/* ─────────────────────────────────────────────────────────────────────────────
   FETCH
───────────────────────────────────────────────────────────────────────────── */
const fetchHealth = async (year, period) => {
  let query = supabase
    .from('health_indicators')
    .select('id, indicator_name, kpi_group, region, a_value, b_value, performance, target_q1, target_q2, target_q3, target_q4, evaluation_direction, fiscal_year, period, reference_url')
    .eq('is_deleted', false)
    .order('indicator_name', { ascending: true })
    .order('kpi_group',      { ascending: true });

  if (year && year !== 'All') query = query.eq('fiscal_year', year);
  if (period && period !== 'All') query = query.eq('period', period);

  const { data, error } = await query;
  // หมายเหตุ: ไม่ใช้ .order('region') เพราะ PostgreSQL เรียง string ไม่ถูก
  // จะเรียง region ฝั่ง client ด้วย regionSortIndex แทน
  if (error) throw error;
  return data;
};

/* ─────────────────────────────────────────────────────────────────────────────
   TOAST
───────────────────────────────────────────────────────────────────────────── */
function Toast({ toasts, onUndo }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold
            ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : t.type === 'delete'  ? 'bg-slate-800 border-slate-700 text-white'
            :                        'bg-rose-50 border-rose-200 text-rose-800'}`}
        >
          {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
          {t.type === 'delete'  && <Trash2       size={16} className="text-slate-400 flex-shrink-0" />}
          {t.type === 'error'   && <AlertOctagon size={16} className="text-rose-500 flex-shrink-0" />}
          <span>{t.message}</span>
          {t.type === 'delete' && (
            <button onClick={() => onUndo(t.id)}
              className="flex items-center gap-1.5 ml-2 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-black transition-colors">
              <RotateCcw size={12} /> Undo ({t.countdown}s)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   INLINE EDIT ROW
───────────────────────────────────────────────────────────────────────────── */
function EditableRow({ row, onSave, onCancel, isSaving, isNew = false, prefillIndicator = '', prefillGroup = '' }) {
  const EMPTY = {
    indicator_name: prefillIndicator,
    kpi_group:      prefillGroup,
    region:         '',
    a_value:        '',
    b_value:        '',
    performance:    '',
    target_q1:      '>= 50.00',
    target_q2:      '>= 50.00',
    target_q3:      '>= 60.00',
    target_q4:      '>= 70.00',
    evaluation_direction: DEFAULT_EVALUATION_DIRECTION,
  };
  const [form, setForm] = useState(row ? {
    indicator_name: row.indicator_name ?? '',
    kpi_group:      row.kpi_group      ?? '',
    region:         row.region         ?? '',
    a_value:        row.a_value        ?? '',
    b_value:        row.b_value        ?? '',
    performance:    row.performance    ?? '',
    target_q1:      row.target_q1      ?? '>= 50.00',
    target_q2:      row.target_q2      ?? '>= 50.00',
    target_q3:      row.target_q3      ?? '>= 60.00',
    target_q4:      row.target_q4      ?? '>= 70.00',
    evaluation_direction: resolveEvaluationDirection(row.evaluation_direction, row.target_q4),
  } : EMPTY);

  const inp = 'w-full bg-white border border-sky-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 transition-all text-slate-800 font-medium';

  return (
    <tr className={`ring-2 ring-inset ${isNew ? 'bg-emerald-50/60 ring-emerald-200' : 'bg-sky-50/60 ring-sky-200'}`}>
      {/* Region */}
      <td className="px-3 py-2 align-top">
        {isNew ? (
          <select className={inp} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
            <option value="">เลือกเขต...</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <span className="text-xs font-bold text-slate-500">{form.region}</span>
        )}
      </td>
      {/* A, B */}
      <td className="px-3 py-2 align-top">
        <input type="number" step="1" className={inp} placeholder="A (ตัวตั้ง)"
          value={form.a_value} onChange={e => setForm(f => ({ ...f, a_value: e.target.value }))} />
      </td>
      <td className="px-3 py-2 align-top">
        <input type="number" step="1" className={inp} placeholder="B (ตัวหาร)"
          value={form.b_value} onChange={e => setForm(f => ({ ...f, b_value: e.target.value }))} />
      </td>
      {/* Performance */}
      <td className="px-3 py-2 align-top">
        <input type="number" step="0.01" className={inp} placeholder="ผลงาน"
          value={form.performance} onChange={e => setForm(f => ({ ...f, performance: e.target.value }))} />
      </td>
      {/* Targets */}
      <td className="px-3 py-2 align-top">
        <div className="grid grid-cols-2 gap-1">
          {['target_q1','target_q2','target_q3','target_q4'].map((k, i) => (
            <input key={k} className={inp} placeholder={`Q${i+1}`}
              value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
          ))}
        </div>
      </td>
      {/* Evaluation Direction */}
      <td className="px-3 py-2 align-top">
        <select className={inp}
          value={form.evaluation_direction}
          onChange={e => setForm(f => ({ ...f, evaluation_direction: e.target.value }))}>
          {Object.values(EVALUATION_DIRECTIONS).map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </td>
      {/* Actions */}
      <td className="px-3 py-2 align-top">
        <div className="flex flex-col gap-1.5">
          <button onClick={() => onSave(row?.id ?? null, form)}
            disabled={isSaving || (!form.region && isNew)}
            className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-white transition-colors disabled:opacity-40
              ${isNew ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-sky-500 hover:bg-sky-600'}`}>
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {isNew ? 'เพิ่ม' : 'บันทึก'}
          </button>
          <button onClick={onCancel}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
            <X size={12} /> ยกเลิก
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MASTER GROUP HEADER (ตัวชี้วัดหลัก)
───────────────────────────────────────────────────────────────────────────── */
function MasterHeader({ name, totalRows, passedCount, isOpen, onToggle }) {
  const pct = totalRows > 0 ? Math.round((passedCount / totalRows) * 100) : 0;
  return (
    <button onClick={onToggle}
      className="w-full flex items-center gap-3 px-5 py-3.5 bg-emerald-700 hover:bg-emerald-800/90 transition-colors text-left text-white"
    >
      <span className={`flex-shrink-0 w-5 h-5 rounded-md bg-white/15 flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
        <ChevronRight size={12} className="text-white" />
      </span>
      <span className="flex-1 min-w-0 text-sm font-black truncate" title={name}>{name}</span>
      <span className="flex-shrink-0 text-[10px] font-black text-emerald-200 bg-emerald-600/50 px-2 py-0.5 rounded-lg whitespace-nowrap">
        {pct}% บรรลุ · {totalRows} เขต
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-GROUP HEADER (kpi_group)
───────────────────────────────────────────────────────────────────────────── */
function SubGroupHeader({ name, isOpen, onToggle }) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center gap-3 px-6 py-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-100 transition-colors text-left"
    >
      <span className={`flex-shrink-0 w-4 h-4 rounded bg-slate-200 flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
        <ChevronRight size={10} className="text-slate-500" />
      </span>
      <span className="text-xs font-bold text-slate-600 truncate" title={name}>{name}</span>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN
═════════════════════════════════════════════════════════════════════════════ */
export default function ManageHealth() {
  const queryClient = useQueryClient();
  const qKey = getCurrentQuarterKey();

  const [fiscalYear, setFiscalYear] = useState('All');
  const [period, setPeriod]         = useState('All');

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ['manage-health', fiscalYear, period],
    queryFn: () => fetchHealth(fiscalYear, period),
    staleTime: 0,
  });

  const [editingId,        setEditingId]        = useState(null);
  const [addingInGroup,    setAddingInGroup]    = useState(null);
  const [isSaving,         setIsSaving]         = useState(false);
  const [search,           setSearch]           = useState('');
  const [toasts,           setToasts]           = useState([]);
  const [confirmation,     setConfirmation]     = useState(null);
  const [collapsedMaster,  setCollapsedMaster]  = useState(new Set());
  const [collapsedSub,     setCollapsedSub]     = useState(new Set());
  const [editingLinkFor,   setEditingLinkFor]   = useState(null);  // indicator_name
  const [linkInput,        setLinkInput]        = useState('');    // URL input value
  const [isSavingLink,     setIsSavingLink]     = useState(false);
  const pendingDeletes = useRef({});

  /* ── Toast ── */
  const addToast = (msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message: msg, type, countdown: 5 }]);
    if (type !== 'delete') setTimeout(() => removeToast(id), 3000);
    return id;
  };
  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const iv = setInterval(() =>
      setToasts(prev => prev.map(t =>
        t.type === 'delete' ? { ...t, countdown: Math.max(0, t.countdown - 1) } : t
      )), 1000);
    return () => clearInterval(iv);
  }, []);

  /* ── Group: Master (indicator_name) → Sub (kpi_group) → rows ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.indicator_name?.toLowerCase().includes(q) ||
      r.kpi_group?.toLowerCase().includes(q) ||
      r.region?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const masterMap = useMemo(() => {
    const map = new Map(); // indicator_name → Map(kpi_group → row[])
    filtered.forEach(r => {
      const ind = r.indicator_name || 'ไม่ระบุ';
      const grp = r.kpi_group      || '—';
      if (!map.has(ind)) map.set(ind, new Map());
      if (!map.get(ind).has(grp)) map.get(ind).set(grp, []);
      map.get(ind).get(grp).push(r);
    });
    // เรียงแถวภายในแต่ละกลุ่มตาม regionSortIndex (numeric)
    map.forEach(subMap =>
      subMap.forEach((rows, grp) =>
        subMap.set(grp, [...rows].sort((a, b) =>
          regionSortIndex(a.region) - regionSortIndex(b.region)
        ))
      )
    );
    return map;
  }, [filtered]);

  /* ── Accordion helpers ── */
  const toggleMaster = ind => setCollapsedMaster(prev => { const n = new Set(prev); n.has(ind) ? n.delete(ind) : n.add(ind); return n; });
  const toggleSub    = key => setCollapsedSub   (prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const expandAll    = () => { setCollapsedMaster(new Set()); setCollapsedSub(new Set()); };
  const collapseAll  = () => { setCollapsedMaster(new Set(masterMap.keys())); };

  const cancelAll    = () => { setEditingId(null); setAddingInGroup(null); };

  /* ── SAVE ── */
  const executeSave = async (id, form) => {
    setIsSaving(true);
    try {
      const payload = {
        indicator_name: trimToNull(form.indicator_name),
        kpi_group:      trimToNull(form.kpi_group),
        region:         trimToNull(form.region),
        a_value:        parseOptionalNumber(form.a_value),
        b_value:        parseOptionalNumber(form.b_value),
        performance:    parseOptionalNumber(form.performance),
        target_q1:      trimToNull(form.target_q1),
        target_q2:      trimToNull(form.target_q2),
        target_q3:      trimToNull(form.target_q3),
        target_q4:      trimToNull(form.target_q4),
        evaluation_direction: form.evaluation_direction,
        fiscal_year:    fiscalYear === 'All' ? '2569' : fiscalYear,
        period:         period === 'All' ? 'Q4' : period,
      };
      if (id) {
        const { error } = await supabase.from('health_indicators').update(payload).eq('id', id);
        if (error) throw error;
        addToast('บันทึกการแก้ไขเรียบร้อยแล้ว ✓');
        setEditingId(null);
      } else {
        const { error } = await supabase.from('health_indicators').insert({ ...payload, is_deleted: false });
        if (error) throw error;
        addToast('เพิ่มข้อมูลเขตใหม่เรียบร้อยแล้ว ✓');
        setAddingInGroup(null);
      }
      queryClient.invalidateQueries({ queryKey: ['manage-health'] });
      queryClient.invalidateQueries({ queryKey: ['healthData'] });
      queryClient.invalidateQueries({ queryKey: ['overviewData'] });
    } catch (err) {
      addToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = (id, form) => {
    const label = form.indicator_name || form.kpi_group || form.region || 'รายการ Health KPI';
    setConfirmation({
      type: 'save',
      id,
      form,
      label,
      title: id ? 'ยืนยันการบันทึกการแก้ไข' : 'ยืนยันการเพิ่มข้อมูล Health KPI',
      message: id
        ? 'ระบบจะอัปเดตข้อมูลรายการนี้ใน Supabase'
        : 'ระบบจะสร้างข้อมูลเขตสุขภาพรายการใหม่ใน Supabase',
      confirmLabel: id ? 'ยืนยันบันทึก' : 'ยืนยันเพิ่มรายการ',
    });
  };

  /* ── DELETE FROM SUPABASE + UNDO WINDOW ── */
  const executeDelete = (id, label) => {
    const toastId = addToast(`ลบ "${label.slice(0, 25)}..." แล้ว`, 'delete');
    const timerId = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('health_indicators')
          .delete()
          .eq('id', id)
          .select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('ไม่พบข้อมูลหรือไม่มีสิทธิ์ลบข้อมูลนี้');

        queryClient.invalidateQueries({ queryKey: ['manage-health'] });
        queryClient.invalidateQueries({ queryKey: ['healthData'] });
        queryClient.invalidateQueries({ queryKey: ['overviewData'] });
        queryClient.invalidateQueries({ queryKey: ['kpiGroup'] });
      } catch (err) {
        queryClient.invalidateQueries({ queryKey: ['manage-health'] });
        addToast(`ลบไม่สำเร็จ: ${err.message}`, 'error');
      } finally {
        removeToast(toastId);
        delete pendingDeletes.current[toastId];
      }
    }, 5000);
    pendingDeletes.current[toastId] = { timerId, id };
    queryClient.setQueriesData(
      { queryKey: ['manage-health'] },
      old => Array.isArray(old) ? old.filter(r => r.id !== id) : old
    );
  };

  const handleDelete = (id, label) => {
    setConfirmation({
      type: 'delete',
      id,
      label,
      title: 'ยืนยันการลบข้อมูล Health KPI',
      message: 'รายการจะหายจากหน้าจัดการและถูกลบออกจาก Supabase หลังหมดเวลายกเลิก 5 วินาที',
      confirmLabel: 'ยืนยันลบ',
    });
  };

  const handleUndo = toastId => {
    const p = pendingDeletes.current[toastId];
    if (!p) return;
    clearTimeout(p.timerId);
    delete pendingDeletes.current[toastId];
    removeToast(toastId);
    queryClient.invalidateQueries({ queryKey: ['manage-health'] });
    addToast('ยกเลิกการลบเรียบร้อยแล้ว ✓');
  };

  /* ── SAVE REFERENCE LINK (per indicator_name ─ update all matching rows) ── */
  const executeSaveLink = async (indName, rawUrl) => {
    setIsSavingLink(true);
    try {
      const url = trimToNull(rawUrl);
      const { error } = await supabase
        .from('health_indicators')
        .update({ reference_url: url })
        .eq('indicator_name', indName)
        .eq('is_deleted', false);
      if (error) throw error;
      addToast(url ? 'บันทึกลิ้งอ้างอิงเรียบร้อยแล้ว ✓' : 'ลบลิ้งอ้างอิงเรียบร้อยแล้ว ✓');
      setEditingLinkFor(null);
      queryClient.invalidateQueries({ queryKey: ['manage-health'] });
      queryClient.invalidateQueries({ queryKey: ['healthData'] });
    } catch (err) {
      addToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleSaveLink = indName => {
    const url = trimToNull(linkInput);
    if (url) {
      try { new URL(url); } catch {
        addToast('รูปแบบ URL ไม่ถูกต้อง — กรุณาเริ่มด้วย https://', 'error');
        return;
      }
    }

    setConfirmation({
      type: 'link',
      label: indName,
      indName,
      url: linkInput,
      title: url ? 'ยืนยันการบันทึกลิ้งอ้างอิง' : 'ยืนยันการลบลิ้งอ้างอิง',
      message: url
        ? 'ระบบจะอัปเดตลิ้งอ้างอิงให้ทุกเขตของตัวชี้วัดนี้'
        : 'ระบบจะลบลิ้งอ้างอิงออกจากทุกเขตของตัวชี้วัดนี้',
      confirmLabel: url ? 'ยืนยันบันทึกลิ้ง' : 'ยืนยันลบลิ้ง',
    });
  };

  const handleConfirmAction = () => {
    const action = confirmation;
    if (!action) return;
    setConfirmation(null);

    if (action.type === 'save') {
      executeSave(action.id, action.form);
    } else if (action.type === 'delete') {
      executeDelete(action.id, action.label);
    } else if (action.type === 'link') {
      executeSaveLink(action.indName, action.url);
    }
  };

  /* ── Loading / Error ── */
  if (isLoading) return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 animate-pulse">
      <div className="skeleton h-28 rounded-3xl" />
      <div className="skeleton h-14 rounded-2xl" />
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <AlertOctagon size={48} className="text-rose-400" />
      <p className="font-bold text-slate-700">โหลดข้อมูลไม่สำเร็จ</p>
      <p className="text-sm text-slate-400">{error.message}</p>
    </div>
  );

  const TableHead = () => (
    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
      <tr>
        <th className="px-4 py-2.5 w-28">เขตสุขภาพ</th>
        <th className="px-4 py-2.5 w-28">A (ตัวตั้ง)</th>
        <th className="px-4 py-2.5 w-28">B (ตัวหาร)</th>
        <th className="px-4 py-2.5 w-24">ผลงาน</th>
        <th className="px-4 py-2.5 w-52">เป้าหมาย Q1 / Q2 / Q3 / Q4</th>
        <th className="px-4 py-2.5 w-32 text-center">วิธีประเมินผล</th>
        <th className="px-4 py-2.5 w-24 text-center">สถานะ</th>
        <th className="px-4 py-2.5 w-28 text-center">จัดการ</th>
      </tr>
    </thead>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-16 fade-in-up">
      <Toast toasts={toasts} onUndo={handleUndo} />
      <ConfirmationModal
        open={!!confirmation}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.type === 'delete' || (confirmation?.type === 'link' && !trimToNull(confirmation?.url)) ? 'danger' : 'primary'}
        isLoading={isSaving || isSavingLink}
        onCancel={() => setConfirmation(null)}
        onConfirm={handleConfirmAction}
        details={confirmation?.label && (
          <p><span className="font-black text-slate-700">รายการ:</span> {confirmation.label}</p>
        )}
      />

      {/* ══ HEADER ══ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Activity size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">จัดการข้อมูล Health KPI</h1>
              <p className="text-white/50 text-xs font-bold mt-0.5">
                ทั้งหมด <span className="text-white font-black">{rows.length}</span> แถว · {masterMap.size} ตัวชี้วัด
              </p>
            </div>
          </div>
          <span className="text-[11px] text-white/40 font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            🛡️ ลบถาวร — Undo ได้ 5 วิ
          </span>
        </div>
      </div>

      <KpiDataPolicyNotice compact />

      {/* ══ SEARCH + CONTROLS ══ */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400/20">
          <option value="All">ทุกปีงบประมาณ</option>
          {['2567', '2568', '2569', '2570'].map(y => <option key={y} value={y}>ปี {y}</option>)}
        </select>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400/20">
          <option value="All">ทุกไตรมาส</option>
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
          <option value="Q3">Q3</option>
          <option value="Q4">Q4</option>
          <option value="Year-End">Year-End</option>
        </select>
        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อตัวชี้วัด, เขตสุขภาพ..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all placeholder:text-slate-400 text-slate-700" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={14} />
          </button>
        )}
        <span className="text-xs font-black text-slate-400 whitespace-nowrap">
          {filtered.length} / {rows.length} แถว
        </span>
        <div className="w-px h-4 bg-slate-200" />
        <button onClick={expandAll} className="flex items-center gap-1 text-[11px] font-black text-emerald-600 hover:text-emerald-800 transition-colors whitespace-nowrap">
          <ChevronsUpDown size={13} /> เปิดทั้งหมด
        </button>
        <button onClick={collapseAll} className="flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">
          <ChevronsDownUp size={13} /> ซ่อนทั้งหมด
        </button>
      </div>

      {/* ══ MASTER-DETAIL LIST ══ */}
      {masterMap.size === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <Search size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-500">ไม่พบรายการที่ตรงกับคำค้นหา</p>
          <button onClick={() => setSearch('')} className="mt-3 text-xs font-bold text-emerald-500 hover:underline">ล้างคำค้นหา</button>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(masterMap.entries()).map(([indName, subMap]) => {
            const isMasterOpen = !collapsedMaster.has(indName);
            const allRows      = Array.from(subMap.values()).flat();
            const passedCount  = allRows.filter(r => evalStatus(r.performance, r[qKey], r.evaluation_direction) === 'passed').length;

            return (
              <div key={indName} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                {/* MASTER HEADER */}
                <MasterHeader
                  name={indName}
                  totalRows={allRows.length}
                  passedCount={passedCount}
                  isOpen={isMasterOpen}
                  onToggle={() => toggleMaster(indName)}
                />

                {/* ── LINK BAR ── */}
                {(() => {
                  const existingLink = allRows.find(r => r.reference_url)?.reference_url || null;
                  const isEditingThis = editingLinkFor === indName;
                  return (
                    <div className={`flex items-center gap-3 px-5 py-2 border-b border-slate-100 text-xs
                      ${isEditingThis ? 'bg-sky-50' : 'bg-slate-50/70 hover:bg-slate-100/60'} transition-colors`}>
                      <Link2 size={13} className={existingLink ? 'text-sky-500' : 'text-slate-300'} />

                      {isEditingThis ? (
                        /* ─ Edit mode ─ */
                        <>
                          <input
                            type="url"
                            autoFocus
                            value={linkInput}
                            onChange={e => setLinkInput(e.target.value)}
                            placeholder="https://drive.google.com/... หรือ URL เอกสารอ้างอิง"
                            className="flex-1 bg-white border border-sky-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-sky-400/30 text-slate-800 placeholder:text-slate-400"
                          />
                          <button
                            onClick={() => handleSaveLink(indName)}
                            disabled={isSavingLink}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-sky-500 hover:bg-sky-600 transition-colors disabled:opacity-50"
                          >
                            {isSavingLink ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                            บันทึกลิ้ง
                          </button>
                          <button
                            onClick={() => setEditingLinkFor(null)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <X size={11} /> ยกเลิก
                          </button>
                        </>
                      ) : existingLink ? (
                        /* ─ Has link ─ */
                        <>
                          <a href={existingLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sky-600 font-bold hover:underline truncate max-w-xs">
                            <ExternalLink size={11} className="shrink-0" />
                            <span className="truncate">{existingLink}</span>
                          </a>
                          <button
                            onClick={() => { setEditingLinkFor(indName); setLinkInput(existingLink); }}
                            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors whitespace-nowrap"
                          >
                            <Pencil size={10} /> แก้ไขลิ้ง
                          </button>
                        </>
                      ) : (
                        /* ─ No link ─ */
                        <button
                          onClick={() => { setEditingLinkFor(indName); setLinkInput(''); }}
                          className="flex items-center gap-1 text-[11px] font-bold text-slate-800 hover:text-sky-600 transition-colors"
                        >
                          <Plus size={11} /> เพิ่มลิ้งอ้างอิง / เอกสารประกอบตัวชี้วัด
                        </button>
                      )}
                    </div>
                  );
                })()}

                {isMasterOpen && (
                  <div>
                    {Array.from(subMap.entries()).map(([grpName, grpRows]) => {
                      const subKey     = `${indName}::${grpName}`;
                      const isSubOpen  = !collapsedSub.has(subKey);
                      const isAddingHere = addingInGroup?.indicator === indName && addingInGroup?.kpiGroup === grpName;

                      return (
                        <div key={grpName} className="border-b border-slate-100 last:border-none">

                          {/* SUB-GROUP HEADER */}
                          {grpName !== '—' && (
                            <SubGroupHeader
                              name={grpName}
                              isOpen={isSubOpen}
                              onToggle={() => toggleSub(subKey)}
                            />
                          )}

                          {isSubOpen && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <TableHead />
                                <tbody className="divide-y divide-slate-50">

                                  {/* Add Row */}
                                  {isAddingHere && (
                                    <EditableRow
                                      row={null} isNew
                                      prefillIndicator={indName}
                                      prefillGroup={grpName !== '—' ? grpName : ''}
                                      onSave={(_, form) => handleSave(null, form)}
                                      onCancel={() => setAddingInGroup(null)}
                                      isSaving={isSaving}
                                    />
                                  )}

                                  {grpRows.map(r => {
                                    const status = evalStatus(r.performance, r[qKey], r.evaluation_direction);
                                    const direction = EVALUATION_DIRECTIONS[resolveEvaluationDirection(r.evaluation_direction, r[qKey])];
                                    const ss = STATUS_STYLE[status];
                                    return editingId === r.id ? (
                                      <EditableRow
                                        key={r.id} row={r}
                                        onSave={handleSave}
                                        onCancel={() => setEditingId(null)}
                                        isSaving={isSaving}
                                      />
                                    ) : (
                                      <tr key={r.id} className="hover:bg-emerald-50/20 transition-colors group">
                                        {/* เขต */}
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-1.5">
                                            <MapPin size={11} className="text-slate-300 flex-shrink-0" />
                                            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{r.region || '—'}</span>
                                          </div>
                                        </td>
                                        {/* A */}
                                        <td className="px-4 py-3">
                                          <span className="text-sm font-bold text-slate-700 tabular-nums">{r.a_value?.toLocaleString() ?? '—'}</span>
                                        </td>
                                        {/* B */}
                                        <td className="px-4 py-3">
                                          <span className="text-sm text-slate-500 tabular-nums">{r.b_value?.toLocaleString() ?? '—'}</span>
                                        </td>
                                        {/* ผลงาน */}
                                        <td className="px-4 py-3">
                                          <span className={`text-xl font-black tabular-nums ${ss.text}`}>
                                            {r.performance ?? '—'}
                                          </span>
                                        </td>
                                        {/* เป้าหมาย */}
                                        <td className="px-4 py-3">
                                          <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 font-bold">
                                            {['target_q1','target_q2','target_q3','target_q4'].map((k, i) => (
                                              <span key={k} className={`px-1.5 py-0.5 rounded ${k === qKey ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                                                Q{i+1}: {r[k] ?? '—'}
                                              </span>
                                            ))}
                                          </div>
                                        </td>
                                        {/* Evaluation Direction */}
                                        <td className="px-4 py-3 text-center">
                                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-500 whitespace-nowrap">
                                            {direction.shortLabel}
                                          </span>
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border ${ss.badge}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                                            {ss.label}
                                          </span>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                          <div className="flex gap-1.5 justify-center opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => { cancelAll(); setEditingId(r.id); }}
                                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors">
                                              <Pencil size={11} /> แก้ไข
                                            </button>
                                            <button onClick={() => handleDelete(r.id, `${r.indicator_name} - ${r.region}`)}
                                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors">
                                              <Trash2 size={11} /> ลบ
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {/* Add region button */}
                              {!isAddingHere && (
                                <button
                                  onClick={() => { cancelAll(); setAddingInGroup({ indicator: indName, kpiGroup: grpName }); }}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/40 transition-colors border-t border-slate-100"
                                >
                                  <Plus size={13} /> เพิ่มเขตสุขภาพใน {grpName !== '—' ? grpName : indName}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pt-2">
        © 2026 KPI Monitoring System — กองยุทธศาสตร์และแผนงาน กรมควบคุมโรค
      </p>
    </div>
  );
}
