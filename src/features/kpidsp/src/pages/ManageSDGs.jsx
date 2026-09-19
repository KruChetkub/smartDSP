import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Database, Search, Pencil, Trash2, Save, X, Loader2,
  CheckCircle2, AlertOctagon, RotateCcw, ChevronRight,
  ChevronsUpDown, ChevronsDownUp, Plus, Link2, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseOptionalNumber, trimToNull } from '../utils/kpiForm';
import KpiDataPolicyNotice from '../components/KpiDataPolicyNotice';
import ConfirmationModal from '../components/ConfirmationModal';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
   - category ในฐานข้อมูลอาจเก็บได้หลายรูปแบบ เช่น:
       "3.3 ยุติการแพร่กระจาย..."
       "เป้าหมายย่อย 3.4 ลดการตาย..."
   - ดึงรหัสตัวเลข (3.3 / 3.4A) ออกมาเสมอไม่ว่าจะอยู่ตรงไหน
───────────────────────────────────────────────────────────────────────────── */
const extractCode = (cat = '') =>
  cat.match(/(\d+\.\d+[a-z]?)/i)?.[1] ?? null;

const extractLabel = (cat = '', code) => {
  if (!code) return cat;
  // ตัดรหัสตัวเลขและ prefix ภาษาไทยออก เหลือแค่คำอธิบาย
  return cat
    .replace(/เป้าหมายย่อย\s*/i, '')
    .replace(code, '')
    .trim();
};

/* ─────────────────────────────────────────────────────────────────────────────
   FETCH
───────────────────────────────────────────────────────────────────────────── */
const fetchSDGs = async (year, period) => {
  let query = supabase
    .from('sdg_indicators')
    .select('id, category, indicator_name, target_2030, current_performance, description, reference_url, fiscal_year, period')
    .eq('is_deleted', false)
    .order('category', { ascending: true });

  if (year && year !== 'All') query = query.eq('fiscal_year', year);
  if (period && period !== 'All') query = query.eq('period', period);

  const { data, error } = await query;
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
   EDITABLE ROW — ใช้ทั้ง Edit และ Add New
───────────────────────────────────────────────────────────────────────────── */
function EditableRow({ kpi, onSave, onCancel, isSaving, isNew = false }) {
  const EMPTY = { category: '', indicator_name: '', target_2030: '', current_performance: '', description: '', reference_url: '' };
  const [form, setForm] = useState(kpi ? {
    category:            kpi.category            ?? '',
    indicator_name:      kpi.indicator_name       ?? '',
    target_2030:         kpi.target_2030          ?? '',
    current_performance: kpi.current_performance  ?? '',
    description:         kpi.description          ?? '',
    reference_url:       kpi.reference_url        ?? '',
  } : EMPTY);

  const inp = 'w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400 transition-all text-slate-800 font-medium';

  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <tr className={`ring-2 ring-inset ${isNew ? 'bg-emerald-50/60 ring-emerald-200' : 'bg-sky-50/60 ring-sky-200'}`}>
      <td className="px-3 py-2 align-top">
        <input className={inp} value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          placeholder="เช่น 3.3 ยุติ..." />
      </td>
      <td className="px-3 py-2 align-top">
        <textarea className={`${inp} resize-none`} rows={2} value={form.indicator_name}
          onChange={e => setForm(f => ({ ...f, indicator_name: e.target.value }))}
          placeholder="ชื่อตัวชี้วัด *" />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inp} value={form.target_2030}
          onChange={e => setForm(f => ({ ...f, target_2030: e.target.value }))}
          placeholder="เช่น ≤ 0.2" />
      </td>
      <td className="px-3 py-2 align-top">
        <input type="number" step="0.01" className={inp}
          value={form.current_performance}
          onChange={e => setForm(f => ({ ...f, current_performance: e.target.value }))}
          placeholder="ตัวเลข" />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inp} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="หมายเหตุ" />
      </td>

      {/* ── ลิ้งอ้างอิง ── */}
      <td className="px-3 py-2 align-top min-w-[180px]">
        <div className="relative">
          <Link2 size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className={`${inp} pl-6`}
            value={form.reference_url}
            onChange={e => setForm(f => ({ ...f, reference_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
        {form.reference_url && isValidUrl(form.reference_url) && (
          <a
            href={form.reference_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 hover:underline"
          >
            <ExternalLink size={9} /> ทดสอบลิ้ง
          </a>
        )}
        {form.reference_url && !isValidUrl(form.reference_url) && (
          <p className="mt-1 text-[10px] text-rose-500 font-bold">URL ไม่ถูกต้อง</p>
        )}
      </td>

      <td className="px-3 py-2 align-top">
        <div className="flex flex-col gap-1.5">
          <button onClick={() => onSave(kpi?.id ?? null, form)} disabled={isSaving || !form.indicator_name.trim()}
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
   ACCORDION GROUP HEADER
───────────────────────────────────────────────────────────────────────────── */
function GroupHeader({ cat, count, isOpen, onToggle }) {
  const code  = extractCode(cat);
  const label = extractLabel(cat, code);
  return (
    <button onClick={onToggle}
      className="w-full flex items-center gap-3 px-5 py-3 bg-violet-50 hover:bg-violet-100/60 border-b border-violet-100 transition-colors text-left"
    >
      <span className={`flex-shrink-0 w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
        <ChevronRight size={12} className="text-violet-500" />
      </span>
      {code && (
        <span className="flex-shrink-0 text-[11px] font-black text-white bg-violet-500 px-2.5 py-0.5 rounded-lg">
          {code}
        </span>
      )}
      {/* truncate + native tooltip แสดงชื่อเต็มเมื่อ hover */}
      <span className="flex-1 min-w-0 text-xs font-bold text-violet-700 truncate" title={cat}>
        {label || cat}
      </span>
      <span className="flex-shrink-0 text-[10px] font-black text-violet-400 bg-violet-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
        {count} รายการ
      </span>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN
═════════════════════════════════════════════════════════════════════════════ */
export default function ManageSDGs() {
  const queryClient = useQueryClient();

  const [fiscalYear, setFiscalYear] = useState('All');
  const [period, setPeriod]         = useState('All');

  const { data: kpis = [], isLoading, error } = useQuery({
    queryKey: ['manage-sdgs', fiscalYear, period],
    queryFn: () => fetchSDGs(fiscalYear, period),
    staleTime: 0,
  });

  const [editingId,       setEditingId]       = useState(null);  // null = ไม่แก้ไข, number = id ที่กำลังแก้
  const [addingInGroup,   setAddingInGroup]   = useState(null);  // null = ไม่เพิ่ม, string = ชื่อ group ที่กำลังเพิ่ม
  const [showGlobalAdd,   setShowGlobalAdd]   = useState(false); // เพิ่มตัวชี้วัดใหม่ (ไม่ระบุกลุ่ม)
  const [isSaving,        setIsSaving]        = useState(false);
  const [search,          setSearch]          = useState('');
  const [toasts,          setToasts]          = useState([]);
  const [confirmation,    setConfirmation]    = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const pendingDeletes = useRef({});

  /* ── Toast ── */
  const addToast = (msg, type = 'success') => {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${performance.now()}`;
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

  /* ── Group ── */
  const filtered = useMemo(() => {
    if (!search.trim()) return kpis;
    const q = search.toLowerCase();
    return kpis.filter(k =>
      k.indicator_name?.toLowerCase().includes(q) ||
      k.category?.toLowerCase().includes(q) ||
      k.target_2030?.toLowerCase().includes(q)
    );
  }, [kpis, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(k => {
      const cat = k.category || 'ไม่ระบุ';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(k);
    });
    return map;
  }, [filtered]);

  /* ── Accordion ── */
  const toggleGroup = cat => setCollapsedGroups(prev => {
    const n = new Set(prev);
    n.has(cat) ? n.delete(cat) : n.add(cat);
    return n;
  });
  const expandAll   = () => setCollapsedGroups(new Set());
  const collapseAll = () => setCollapsedGroups(new Set(grouped.keys()));

  /* ── SAVE (Edit หรือ Add New) ── */
  const executeSave = async (id, form) => {
    setIsSaving(true);
    try {
      const payload = {
        category:            trimToNull(form.category),
        indicator_name:      form.indicator_name.trim(),
        target_2030:         trimToNull(form.target_2030),
        current_performance: parseOptionalNumber(form.current_performance),
        description:         trimToNull(form.description),
        reference_url:       trimToNull(form.reference_url),
        fiscal_year:         fiscalYear === 'All' ? '2569' : fiscalYear,
        period:              period === 'All' ? 'Year-End' : period,
      };

      if (id) {
        // ── EDIT ──
        const { error } = await supabase.from('sdg_indicators').update(payload).eq('id', id);
        if (error) throw error;
        addToast('บันทึกการแก้ไขเรียบร้อยแล้ว ✓');
        setEditingId(null);
      } else {
        // ── ADD NEW ──
        const { error } = await supabase.from('sdg_indicators').insert({ ...payload, is_deleted: false });
        if (error) throw error;
        addToast('เพิ่มตัวชี้วัดใหม่เรียบร้อยแล้ว ✓');
        setAddingInGroup(null);
        setShowGlobalAdd(false);
      }

      queryClient.invalidateQueries({ queryKey: ['manage-sdgs'] });
      queryClient.invalidateQueries({ queryKey: ['overviewData'] });
      queryClient.invalidateQueries({ queryKey: ['sdgData'] });
    } catch (err) {
      addToast(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = (id, form) => {
    if (!form.indicator_name.trim()) {
      addToast('กรุณากรอกชื่อตัวชี้วัด', 'error');
      return;
    }
    setConfirmation({
      type: 'save',
      id,
      form,
      label: form.indicator_name.trim(),
      title: id ? 'ยืนยันการบันทึกการแก้ไข' : 'ยืนยันการเพิ่มตัวชี้วัด SDGs',
      message: id
        ? 'ระบบจะอัปเดตข้อมูลรายการนี้ใน Supabase'
        : 'ระบบจะสร้างตัวชี้วัด SDGs รายการใหม่ใน Supabase',
      confirmLabel: id ? 'ยืนยันบันทึก' : 'ยืนยันเพิ่มรายการ',
    });
  };

  /* ── DELETE FROM SUPABASE + UNDO WINDOW ── */
  const executeDelete = (id, name) => {
    const toastId = addToast(`ลบ "${name.slice(0, 28)}..." แล้ว`, 'delete');
    const timerId = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('sdg_indicators')
          .delete()
          .eq('id', id)
          .select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('ไม่พบข้อมูลหรือไม่มีสิทธิ์ลบข้อมูลนี้');

        queryClient.invalidateQueries({ queryKey: ['manage-sdgs'] });
        queryClient.invalidateQueries({ queryKey: ['overviewData'] });
        queryClient.invalidateQueries({ queryKey: ['sdgData'] });
        queryClient.invalidateQueries({ queryKey: ['kpiGroup'] });
      } catch (err) {
        queryClient.invalidateQueries({ queryKey: ['manage-sdgs'] });
        addToast(`ลบไม่สำเร็จ: ${err.message}`, 'error');
      } finally {
        removeToast(toastId);
        delete pendingDeletes.current[toastId];
      }
    }, 5000);
    pendingDeletes.current[toastId] = { timerId, id };
    queryClient.setQueriesData(
      { queryKey: ['manage-sdgs'] },
      old => Array.isArray(old) ? old.filter(k => k.id !== id) : old
    );
  };

  const handleDelete = (id, name) => {
    setConfirmation({
      type: 'delete',
      id,
      label: name,
      title: 'ยืนยันการลบข้อมูล SDGs',
      message: 'รายการจะหายจากหน้าจัดการและถูกลบออกจาก Supabase หลังหมดเวลายกเลิก 5 วินาที',
      confirmLabel: 'ยืนยันลบ',
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
    }
  };

  const handleUndo = toastId => {
    const p = pendingDeletes.current[toastId];
    if (!p) return;
    clearTimeout(p.timerId);
    delete pendingDeletes.current[toastId];
    removeToast(toastId);
    queryClient.invalidateQueries({ queryKey: ['manage-sdgs'] });
    addToast('ยกเลิกการลบเรียบร้อยแล้ว ✓');
  };

  const cancelAll = () => {
    setEditingId(null);
    setAddingInGroup(null);
    setShowGlobalAdd(false);
  };

  /* ── Loading / Error ── */
  if (isLoading) return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 animate-pulse">
      <div className="skeleton h-28 rounded-3xl" />
      <div className="skeleton h-14 rounded-2xl" />
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
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
    <thead className="bg-slate-50 border-b border-slate-100">
      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
        <th className="px-4 py-2.5 w-24">รหัส</th>
        <th className="px-4 py-2.5">ชื่อตัวชี้วัด</th>
        <th className="px-4 py-2.5 w-32">เป้าหมาย 2573</th>
        <th className="px-4 py-2.5 w-24">ผลงาน</th>
        <th className="px-4 py-2.5 w-36">หมายเหตุ</th>
        <th className="px-4 py-2.5 w-44">📎 ลิ้งอ้างอิง</th>
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
        tone={confirmation?.type === 'delete' ? 'danger' : 'primary'}
        isLoading={isSaving}
        onCancel={() => setConfirmation(null)}
        onConfirm={handleConfirmAction}
        details={confirmation?.label && (
          <p><span className="font-black text-slate-700">รายการ:</span> {confirmation.label}</p>
        )}
      />

      {/* ══ HEADER ══ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/5 rounded-full blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Database size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">จัดการข้อมูล SDGs</h1>
              <p className="text-white/50 text-xs font-bold mt-0.5">
                ทั้งหมด <span className="text-white font-black">{kpis.length}</span> รายการ · {grouped.size} กลุ่มเป้าหมาย
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { cancelAll(); setShowGlobalAdd(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-black hover:bg-violet-50 transition-colors shadow-sm"
            >
              <Plus size={16} /> เพิ่มตัวชี้วัดใหม่
            </button>
            <span className="text-[11px] text-white/40 font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              🛡️ ลบถาวร — Undo ได้ 5 วิ
            </span>
          </div>
        </div>
      </div>

      <KpiDataPolicyNotice compact />

      {/* ══ ADD NEW (Global) ══ */}
      {showGlobalAdd && (
        <div className="bg-white border-2 border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border-b border-emerald-200">
            <Plus size={14} className="text-emerald-600" />
            <span className="text-xs font-black text-emerald-700">เพิ่มตัวชี้วัดใหม่ (ระบุกลุ่มในช่อง "รหัส")</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <TableHead />
              <tbody>
                <EditableRow
                  kpi={null}
                  isNew
                  onSave={(_, form) => handleSave(null, form)}
                  onCancel={() => setShowGlobalAdd(false)}
                  isSaving={isSaving}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ SEARCH + ACCORDION CONTROLS ══ */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center gap-3">
        <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-400/20">
          <option value="All">ทุกปีงบประมาณ</option>
          {['2567', '2568', '2569', '2570'].map(y => <option key={y} value={y}>ปี {y}</option>)}
        </select>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-400/20">
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
            placeholder="ค้นหาชื่อตัวชี้วัด, รหัส, เป้าหมาย..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400 transition-all placeholder:text-slate-400 text-slate-700" />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={14} />
          </button>
        )}
        <span className="text-xs font-black text-slate-400 whitespace-nowrap">
          {filtered.length} / {kpis.length} รายการ
        </span>
        <div className="w-px h-4 bg-slate-200" />
        <button onClick={expandAll} className="flex items-center gap-1 text-[11px] font-black text-violet-500 hover:text-violet-700 transition-colors whitespace-nowrap">
          <ChevronsUpDown size={13} /> เปิดทั้งหมด
        </button>
        <button onClick={collapseAll} className="flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">
          <ChevronsDownUp size={13} /> ซ่อนทั้งหมด
        </button>
      </div>

      {/* ══ KPI GROUPS ══ */}
      {filtered.length === 0 && !showGlobalAdd ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <Search size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-500">ไม่พบรายการที่ตรงกับคำค้นหา</p>
          <button onClick={() => setSearch('')} className="mt-3 text-xs font-bold text-violet-500 hover:underline">ล้างคำค้นหา</button>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([cat, items]) => {
            const isOpen = !collapsedGroups.has(cat);
            const code   = extractCode(cat);
            return (
              <div key={cat} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                <GroupHeader cat={cat} count={items.length} isOpen={isOpen} onToggle={() => toggleGroup(cat)} />

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <TableHead />
                      <tbody className="divide-y divide-slate-50">

                        {/* Inline Add Row สำหรับ group นี้ */}
                        {addingInGroup === cat && (
                          <EditableRow
                            kpi={{ category: cat }} // pre-fill category
                            isNew
                            onSave={(_, form) => handleSave(null, form)}
                            onCancel={() => setAddingInGroup(null)}
                            isSaving={isSaving}
                          />
                        )}

                        {items.map(kpi =>
                          editingId === kpi.id ? (
                            <EditableRow
                              key={kpi.id} kpi={kpi}
                              onSave={handleSave}
                              onCancel={() => setEditingId(null)}
                              isSaving={isSaving}
                            />
                          ) : (
                            <tr key={kpi.id} className="hover:bg-violet-50/30 transition-colors group">
                              {/* รหัส: แสดงแค่ "3.3" */}
                              <td className="px-4 py-3">
                                <span className="inline-block text-[11px] font-black text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                  {code ?? kpi.category ?? '—'}
                                </span>
                              </td>
                              {/* ชื่อ */}
                              <td className="px-4 py-3">
                                <p className="text-sm font-bold text-slate-700 leading-snug line-clamp-2 max-w-sm">{kpi.indicator_name}</p>
                              </td>
                              {/* เป้าหมาย */}
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-500 font-medium">{kpi.target_2030 || '—'}</span>
                              </td>
                              {/* ผลงาน */}
                              <td className="px-4 py-3">
                                <span className={`text-lg font-black tabular-nums ${kpi.current_performance != null ? 'text-slate-800' : 'text-slate-300'}`}>
                                  {kpi.current_performance ?? '—'}
                                </span>
                              </td>
                              {/* หมายเหตุ */}
                              <td className="px-4 py-3">
                                <span className="text-xs text-slate-400 italic line-clamp-2">{kpi.description || '—'}</span>
                              </td>
                              {/* ลิ้งอ้างอิง */}
                              <td className="px-4 py-3">
                                {kpi.reference_url ? (
                                  <a
                                    href={kpi.reference_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300 transition-all text-[11px] font-black whitespace-nowrap max-w-[160px] truncate"
                                    title={kpi.reference_url}
                                  >
                                    <Link2 size={11} className="shrink-0" />
                                    <span className="truncate">ดูเอกสาร</span>
                                    <ExternalLink size={9} className="shrink-0 opacity-60" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 text-sm">—</span>
                                )}
                              </td>
                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => { cancelAll(); setEditingId(kpi.id); }}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors">
                                    <Pencil size={11} /> แก้ไข
                                  </button>
                                  <button onClick={() => handleDelete(kpi.id, kpi.indicator_name)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors">
                                    <Trash2 size={11} /> ลบ
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>

                    {/* ปุ่มเพิ่มใน group นี้ */}
                    {addingInGroup !== cat && (
                      <button
                        onClick={() => { cancelAll(); setAddingInGroup(cat); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-slate-400 hover:text-violet-600 hover:bg-violet-50/40 transition-colors border-t border-slate-100"
                      >
                        <Plus size={13} /> เพิ่มตัวชี้วัดในกลุ่ม {code ?? cat}
                      </button>
                    )}
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
