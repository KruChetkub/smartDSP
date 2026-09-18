import React, { useState, useMemo } from 'react';
import {
  UploadCloud, Loader2, Database, CheckCircle2, XCircle,
  AlertTriangle, FileSpreadsheet, Eye, Trash2, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseOptionalNumber, trimToNull } from '../utils/kpiForm';
import KpiDataPolicyNotice from '../components/KpiDataPolicyNotice';

/* ─────────────────────────────────────────────────────────────────────────────
   PARSE EXCEL PASTE → Array of Objects
   รองรับทั้ง Tab-separated (Excel) และสามารถขยายได้ในอนาคต
───────────────────────────────────────────────────────────────────────────── */
function parsePastedData(raw) {
  const rows = raw.trim().split('\n');
  return rows
    .map(row => {
      const cols = row.split('\t');
      return {
        subTarget: (cols[0] || '').trim(),        // คอล A: เป้าหมายย่อย เช่น 3.3
        indicatorName: (cols[1] || '').trim(),    // คอล B: ชื่อตัวชี้วัด (required)
        target2030: (cols[2] || '').trim(),        // คอล C: เป้าหมายปี 2573
        unit: (cols[3] || '').trim(),              // คอล D: หน่วยวัด
        currentPerformance: (cols[4] || '').trim(), // คอล E: ผลงานปัจจุบัน
        note: (cols[5] || '').trim(),              // คอล F: หมายเหตุ
      };
    })
    .filter(item => item.indicatorName !== ''); // กรองแถวขยะออก
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAP TO SUPABASE SCHEMA (sdg_indicators table)
───────────────────────────────────────────────────────────────────────────── */
function mapToSupabase(item, fiscalYear, period) {
  return {
    category: trimToNull(item.subTarget),
    indicator_name: item.indicatorName,
    target_2030: trimToNull(item.target2030),
    current_performance: parseOptionalNumber(item.currentPerformance),
    description: trimToNull(item.note),
    fiscal_year: fiscalYear,
    period: period
  };
}

/* ═════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════════════════ */
export default function ManageKPIs() {
  const [pastedData, setPastedData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success: n, error: msg | null }
  const [showPreview, setShowPreview] = useState(false);
  const [fiscalYear, setFiscalYear] = useState('2569');
  const [period, setPeriod] = useState('Q4');

  /* ── Parse preview from pasted text ── */
  const previewRows = useMemo(() => {
    if (!pastedData.trim()) return [];
    return parsePastedData(pastedData);
  }, [pastedData]);

  /* ── IMPORT HANDLER ── */
  const handleImport = async () => {
    if (previewRows.length === 0) return;

    setLoading(true);
    setResult(null);

    try {
      const payload = previewRows.map(row => mapToSupabase(row, fiscalYear, period));

      const { error } = await supabase
        .from('sdg_indicators')
        .insert(payload);

      if (error) throw error;

      setResult({ success: payload.length, error: null });
      setPastedData('');
      setShowPreview(false);

    } catch (err) {
      console.error('Supabase insert error:', err);
      setResult({ success: 0, error: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase' });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPastedData('');
    setResult(null);
    setShowPreview(false);
  };

  /* ── Styles ── */
  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono text-xs';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 fade-in-up">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200 flex items-center justify-center shadow-sm">
          <Database className="text-violet-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            นำเข้าข้อมูล SDGs (Bulk Import)
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Copy &amp; Paste ตารางจาก Excel แล้วบันทึกเข้า Supabase ได้เลย
          </p>
        </div>
      </div>

      <KpiDataPolicyNotice compact />

      {/* ── Result Banner ── */}
      {result && result.error === null && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-6 py-4 shadow-sm">
          <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
          <div>
            <p className="font-black">บันทึกสำเร็จ!</p>
            <p className="text-sm font-medium">นำเข้าข้อมูลเข้าฐานข้อมูล Supabase สำเร็จ <span className="font-black">{result.success} แถว</span></p>
          </div>
        </div>
      )}
      {result && result.error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl px-6 py-4 shadow-sm">
          <XCircle size={20} className="text-rose-500 flex-shrink-0" />
          <div>
            <p className="font-black">เกิดข้อผิดพลาด</p>
            <p className="text-sm font-medium">{result.error}</p>
          </div>
        </div>
      )}

      {/* ── Instruction Card ── */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 space-y-3">
        <p className="font-black text-violet-800 flex items-center gap-2">
          <Info size={16} /> ขั้นตอนการนำเข้าข้อมูล
        </p>
        <p className="text-sm text-violet-700 font-medium leading-relaxed">
          ช่องว่างจะถูกบันทึกเป็น <span className="font-black">null</span> และค่า <span className="font-black">0</span> จะถูกเก็บเป็นค่าจริง
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { step: '1', text: 'เปิด Excel / Google Sheets และเลือกข้อมูลที่ต้องการ', icon: FileSpreadsheet },
            { step: '2', text: 'Copy (Ctrl+C) แล้ว Paste (Ctrl+V) ลงในกล่องด้านล่าง', icon: UploadCloud },
            { step: '3', text: 'ตรวจสอบ Preview แล้วกดปุ่ม "บันทึกลง Supabase"', icon: Database },
          ].map(({ step, text, icon: Icon }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-violet-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{step}</span>
              <div className="flex gap-2 items-start">
                <Icon size={14} className="text-violet-500 mt-0.5 flex-shrink-0" />
                <p className="text-violet-700 font-medium leading-snug">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-violet-100 pt-3">
          <p className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-1">รูปแบบคอลัมน์ที่รองรับ (6 คอลัมน์)</p>
          <div className="flex flex-wrap gap-2">
            {['A: เป้าหมายย่อย (เช่น 3.3)', 'B: ชื่อตัวชี้วัด *', 'C: เป้าหมายปี 2573', 'D: หน่วยวัด', 'E: ผลงานปัจจุบัน', 'F: หมายเหตุ'].map((col, i) => (
              <span key={i} className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${i === 1 ? 'bg-violet-100 border-violet-300 text-violet-700' : 'bg-white border-violet-200 text-violet-600'}`}>
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Paste Area ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-100/30 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-black text-slate-700">ปีงบประมาณ</label>
              <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className={inputClass}>
                {['2567', '2568', '2569', '2570'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-black text-slate-700">ไตรมาส / รอบประเมิน</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} className={inputClass}>
                <option value="Q1">ไตรมาส 1 (ต.ค. - ธ.ค.)</option>
                <option value="Q2">ไตรมาส 2 (ม.ค. - มี.ค.)</option>
                <option value="Q3">ไตรมาส 3 (เม.ย. - มิ.ย.)</option>
                <option value="Q4">ไตรมาส 4 (ก.ค. - ก.ย.)</option>
                <option value="Year-End">ภาพรวมทั้งปี (Year-End)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-black text-slate-700">
              Ctrl+V วางข้อมูลจาก Excel ตรงนี้ 👇
            </label>
            {pastedData.trim() && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  ตรวจพบ <span className="text-violet-600 font-black">{previewRows.length}</span> แถว
                </span>
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100"
                >
                  <Eye size={12} />
                  {showPreview ? 'ซ่อน Preview' : 'ดู Preview'}
                </button>
              </div>
            )}
          </div>
          <textarea
            className={inputClass}
            rows={10}
            value={pastedData}
            onChange={e => { setPastedData(e.target.value); setResult(null); }}
            placeholder={`วางข้อมูลจาก Excel ที่นี่ (Tab-separated)\nตัวอย่าง:\n3.3\tจำนวนผู้ติดเชื้อ HIV ใหม่\t≤ 0.2\tคน ต่อ 1,000\t0.13\tข้อมูล ณ 67\n3.3\tอุบัติการณ์ของวัณโรค\t≤ 20\tอัตราต่อแสนคน\t146\tข้อมูล ณ 67`}
          />
        </div>

        {/* ── Preview Table ── */}
        {showPreview && previewRows.length > 0 && (
          <div className="relative z-10 border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                <Eye size={12} /> Preview — ข้อมูลที่จะบันทึก ({previewRows.length} แถว)
              </p>
              <div className="flex items-center gap-2">
                {previewRows.some(r => !r.indicatorName) && (
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={12} /> มีแถวที่ไม่มีชื่อตัวชี้วัด (จะถูกข้าม)
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    {['#', 'เป้าหมายย่อย', 'ชื่อตัวชี้วัด', 'เป้าหมาย 2573', 'หน่วย', 'ผลงาน', 'หมายเหตุ'].map(h => (
                      <th key={h} className="px-4 py-2.5 font-black text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 font-bold">{i + 1}</td>
                      <td className="px-4 py-2.5 text-violet-600 font-bold whitespace-nowrap">{row.subTarget || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-slate-800 font-medium max-w-xs truncate" title={row.indicatorName}>{row.indicatorName}</td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{row.target2030 || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{row.unit || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-2.5 font-bold text-sky-600 whitespace-nowrap">{row.currentPerformance || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-slate-400 italic max-w-[150px] truncate">{row.note || <span className="text-slate-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-end gap-3 pt-2">
          {pastedData.trim() && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-800 border border-slate-200 transition-all"
            >
              <Trash2 size={16} />
              ล้างข้อมูล
            </button>
          )}
          <button
            onClick={handleImport}
            disabled={loading || previewRows.length === 0}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={18} /> กำลังบันทึก...</>
            ) : (
              <><Database size={18} /> บันทึก {previewRows.length > 0 ? `${previewRows.length} แถว` : ''} ลง Supabase</>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
