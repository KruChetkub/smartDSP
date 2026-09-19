import React, { useState } from 'react';
import { Activity, Loader2, Target, CheckCircle2, XCircle, Save, Link2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseOptionalNumber, trimToNull } from '../utils/kpiForm';
import {
  EVALUATION_DIRECTIONS,
  DEFAULT_EVALUATION_DIRECTION,
  isTargetPassed,
} from '../utils/kpiEvaluation';
import KpiDataPolicyNotice from '../components/KpiDataPolicyNotice';
import ConfirmationModal from '../components/ConfirmationModal';

export default function DataEntryHealth() {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);
  const [saveMode, setSaveMode] = useState('next'); // 'next' or 'new'
  const [pendingSaveMode, setPendingSaveMode] = useState('next');

  const [formData, setFormData] = useState({
    indicatorName: '',       // ชื่อตัวชี้วัด
    subIndicatorName: '',    // ชื่อตัวชี้วัดย่อย
    region: '',              // เขตฯ
    A: '',                   // ประชากร A (ตัวตั้ง)
    B: '',                   // ประชากร B (ตัวหาร)
    performance: '',         // ผลงาน
    targetQ1: '>= 50.00',    // เป้าหมาย Q1
    targetQ2: '>= 50.00',    // เป้าหมาย Q2
    targetQ3: '>= 60.00',    // เป้าหมาย Q3
    targetQ4: '>= 70.00',    // เป้าหมาย Q4
    evaluationDirection: DEFAULT_EVALUATION_DIRECTION,
    fiscalYear: '2569',      // ปีงบประมาณ
    period: 'Q4',            // ไตรมาส
    referenceUrl: '',        // ลิ้งอ้างอิง (ต่อ 1 ลิ้งต่อตัวชี้วัด)
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const mode = e.nativeEvent.submitter?.value || 'next';
    setPendingSaveMode(mode);
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    const mode = pendingSaveMode;
    setShowConfirmation(false);
    setSaveMode(mode);
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('health_indicators')
        .insert([{
          indicator_name: trimToNull(formData.indicatorName),
          kpi_group: trimToNull(formData.subIndicatorName),
          region: trimToNull(formData.region),
          a_value: parseOptionalNumber(formData.A),
          b_value: parseOptionalNumber(formData.B),
          performance: parseOptionalNumber(formData.performance),
          target_q1: trimToNull(formData.targetQ1),
          target_q2: trimToNull(formData.targetQ2),
          target_q3: trimToNull(formData.targetQ3),
          target_q4: trimToNull(formData.targetQ4),
          evaluation_direction: formData.evaluationDirection,
          fiscal_year: formData.fiscalYear,
          period: formData.period,
          reference_url: trimToNull(formData.referenceUrl),
        }]);

      if (insertError) throw insertError;

      setShowSuccessModal(true);

      if (mode === 'new') {
        // ล้างทุกอย่าง เริ่มตัวชี้วัดใหม่หมดเลย
        setFormData({
          indicatorName: '', subIndicatorName: '', region: '',
          A: '', B: '', performance: '', referenceUrl: '',
          evaluationDirection: DEFAULT_EVALUATION_DIRECTION,
          targetQ1: '>= 50.00', targetQ2: '>= 50.00', targetQ3: '>= 60.00', targetQ4: '>= 70.00',
          fiscalYear: formData.fiscalYear,
          period: formData.period
        });
      } else {
        // โหมด Save & Next: เก็บชื่อตัวชี้วัด, เป้าหมาย, และ referenceUrl (ลิ้งเดิมใช้ร่วมกันทุกเขตในตัวชี้วัดเดียวกัน)
        setFormData({
          ...formData,
          region: '',
          A: '',
          B: '',
          performance: ''
        });
      }

    } catch (error) {
      console.error(error);
      setError(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 outline-none text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400 shadow-sm";
  const labelClass = "block text-sm font-bold text-emerald-800 mb-1.5";

  // ฟังก์ชันคำนวณไตรมาสอิงตามปีงบประมาณไทยปัจจุบัน
  const getCurrentQuarter = () => {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 10 && month <= 12) return { id: 'Q1', targetKey: 'targetQ1', name: 'ไตรมาส 1 (ต.ค. - ธ.ค.)' };
    if (month >= 1 && month <= 3) return { id: 'Q2', targetKey: 'targetQ2', name: 'ไตรมาส 2 (ม.ค. - มี.ค.)' };
    if (month >= 4 && month <= 6) return { id: 'Q3', targetKey: 'targetQ3', name: 'ไตรมาส 3 (เม.ย. - มิ.ย.)' };
    return { id: 'Q4', targetKey: 'targetQ4', name: 'ไตรมาส 4 (ก.ค. - ก.ย.)' };
  };

  // ฟังก์ชันช่วยคำนวณและพรีวิวสถานะเทียบกับเป้าหมาย Q ปัจจุบันอัตโนมัติ
  const evaluatePreview = () => {
    if (formData.performance === '') return null;
    const perf = parseFloat(formData.performance);
    if (isNaN(perf)) return null;

    // ดึง Quarter ปัจจุบันอัตโนมัติ
    const currentQ = getCurrentQuarter();
    const targetString = String(formData[currentQ.targetKey] || '');

    // แยกเฉพาะตัวเลขจากช่อง Target
    const targetMatch = targetString.match(/([\d.]+)/);
    if (!targetMatch) return null;

    const targetVal = parseFloat(targetMatch[1]);
    if (isNaN(targetVal)) return null;

    const passed = isTargetPassed(perf, targetString, formData.evaluationDirection);
    const direction = EVALUATION_DIRECTIONS[formData.evaluationDirection];

    return (
      <div className={`mt-3 flex flex-col gap-1.5`}>
        <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">📍 ประเมินผลอัตโนมัติสำหรับ: <span className="text-slate-800 font-bold">{currentQ.name}</span></div>
        <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg w-fit border shadow-sm ${passed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
          {passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {passed ? `ยอดเยี่ยม: ผลงานผ่านเป้าหมาย ${currentQ.id} (${targetString})` : `ความเสี่ยง: ผลงานยังไม่ผ่านเป้าหมาย ${currentQ.id} (${targetString})`}
          <span className="text-[11px] font-black opacity-75">· {direction.shortLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 fade-in-up">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200 flex items-center justify-center shadow-md">
          <Activity className="text-emerald-600" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 tracking-tight">
            Health KPI Entry
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">บันทึกข้อมูลตัวชี้วัดรายเขตสุขภาพ (Health KPI) ฐานข้อมูลแยก</p>
        </div>
      </div>

      <KpiDataPolicyNotice />

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden space-y-8">

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">

          {/* ข้อมูลทั่วไป */}
          <div className="lg:col-span-3 pb-2 border-b border-slate-200">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Target size={18} className="text-emerald-600"/> General Information</h2>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>ปีงบประมาณ</label>
            <select name="fiscalYear" required value={formData.fiscalYear} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer font-bold text-emerald-800`}>
              {['2567', '2568', '2569', '2570'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className={labelClass}>ไตรมาส / รอบประเมิน</label>
            <select name="period" required value={formData.period} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer font-bold text-emerald-800`}>
              <option value="Q1">ไตรมาส 1 (ต.ค. - ธ.ค.)</option>
              <option value="Q2">ไตรมาส 2 (ม.ค. - มี.ค.)</option>
              <option value="Q3">ไตรมาส 3 (เม.ย. - มิ.ย.)</option>
              <option value="Q4">ไตรมาส 4 (ก.ค. - ก.ย.)</option>
              <option value="Year-End">ภาพรวมทั้งปี (Year-End)</option>
            </select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className={labelClass}>ชื่อตัวชี้วัดหลัก</label>
            <input type="text" name="indicatorName" required value={formData.indicatorName} onChange={handleChange} placeholder="เช่น อัตราความสำเร็จการรักษาวัณโรค..." className={inputClass}/>
          </div>

          <div className="space-y-2">
            <label className={labelClass}>เขตสุขภาพ (Region)</label>
            <select name="region" required value={formData.region} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer font-bold text-emerald-800`}>
              <option value="" className="bg-white">-- เลือกเขตฯ --</option>
              <option value="รายงานภาพรวม" className="bg-white text-emerald-600 font-black">- รายงานภาพรวม</option>
              {[...Array(13)].map((_, i) => (
                <option key={i} value={`เขตฯ ${i+1}`} className="bg-white">เขตสุขภาพที่ {i+1}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <label className={labelClass}>ชื่อตัวชี้วัดย่อย</label>
            <input type="text" name="subIndicatorName" value={formData.subIndicatorName} onChange={handleChange} placeholder="เช่น กลุ่มประชากรเสี่ยง หรือ กิจกรรมย่อย" className={inputClass}/>
          </div>

          {/* ส่วนเป้าหมายรายไตรมาส */}
          <div className="lg:col-span-3 pb-2 border-b border-slate-200 mt-4">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-amber-500"/> Quarterly Targets (ค่าเป้าหมาย)</h2>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-amber-700 mb-1.5">ไตรมาส 1 (Q1)</label>
            <input type="text" name="targetQ1" required value={formData.targetQ1} onChange={handleChange} className="w-full bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-2.5 outline-none text-amber-900 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"/>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-amber-700 mb-1.5">ไตรมาส 2 (Q2)</label>
            <input type="text" name="targetQ2" required value={formData.targetQ2} onChange={handleChange} className="w-full bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-2.5 outline-none text-amber-900 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"/>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-amber-700 mb-1.5">ไตรมาส 3 (Q3)</label>
            <input type="text" name="targetQ3" required value={formData.targetQ3} onChange={handleChange} className="w-full bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-2.5 outline-none text-amber-900 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"/>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-amber-700 mb-1.5">ไตรมาส 4 (Q4)</label>
            <input type="text" name="targetQ4" required value={formData.targetQ4} onChange={handleChange} className="w-full bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-2.5 outline-none text-amber-900 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"/>
          </div>

          <div className="lg:col-span-2"></div>

          <div className="space-y-2 lg:col-span-3">
            <label className="block text-sm font-bold text-amber-700 mb-1.5">วิธีประเมินผล</label>
            <select
              name="evaluationDirection"
              required
              value={formData.evaluationDirection}
              onChange={handleChange}
              className="w-full bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-2.5 outline-none text-amber-900 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm font-bold"
            >
              {Object.values(EVALUATION_DIRECTIONS).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.hint}
                </option>
              ))}
            </select>
          </div>

          {/* ข้อมูลประชากร & ผลงาน */}
          <div className="lg:col-span-3 pb-2 border-b border-slate-200 mt-4">
             <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 size={18} className="text-blue-500"/> Results & Demographics (ผลงานและประชากร)</h2>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-blue-700 mb-1.5">ประชากร A</label>
            <input type="number" name="A" value={formData.A} onChange={handleChange} placeholder="ระบุจำนวนคน" className="w-full bg-blue-50/50 border border-blue-200 rounded-lg px-4 py-2.5 outline-none text-blue-900 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"/>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-blue-700 mb-1.5">ประชากร B</label>
            <input type="number" name="B" value={formData.B} onChange={handleChange} placeholder="ระบุจำนวนคน" className="w-full bg-blue-50/50 border border-blue-200 rounded-lg px-4 py-2.5 outline-none text-blue-900 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"/>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-emerald-700 mb-1.5">ผลงาน (Performance)</label>
            <input type="number" step="0.01" name="performance" value={formData.performance} onChange={handleChange} placeholder="ผลงานที่ทำได้ (เว้นว่างได้ถ้ายังไม่มีข้อมูล)" className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-4 py-2.5 outline-none text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"/>
            <p className="mt-1 text-[11px] font-medium text-slate-500">
              ถ้ายังไม่มีผลในงวดนี้ ให้ปล่อยว่าง ระบบจะบันทึกเป็น <span className="font-black text-slate-700">null</span>
            </p>
            {evaluatePreview()}
          </div>

          {/* ── ลิ้งอ้างอิง ─ 1 ลิ้งต่อ 1 ตัวชี้วัด ── */}
          <div className="lg:col-span-3 space-y-2">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-2">
              <Link2 size={15} className="text-sky-500" />
              ลิ้งอ้างอิง / เอกสารประกอบตัวชี้วัด (ใช้ร่วมกันทุกเขตในตัวชี้วัดเดียวกัน)
              <span className="text-[11px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">ไม่บังคับ</span>
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Link2 size={16} />
              </div>
              <input
                type="url"
                name="referenceUrl"
                value={formData.referenceUrl}
                onChange={handleChange}
                placeholder="https://drive.google.com/... หรือ URL เอกสารกำกับตัวชี้วัดนี้"
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 pl-10 outline-none text-slate-800 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
            </div>
            {formData.referenceUrl && (() => {
              try {
                const parsedUrl = new URL(formData.referenceUrl);
                if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                  throw new Error('Invalid protocol');
                }
                return (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={13} />
                    <span>URL ถูกต้อง —</span>
                    <a href={parsedUrl.href} target="_blank" rel="noopener noreferrer"
                      className="underline underline-offset-2 flex items-center gap-1 hover:text-emerald-900 transition-colors">
                      คลิกทดสอบลิ้ง <ExternalLink size={11} />
                    </a>
                  </div>
                );
              } catch {
                return (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600">
                    <XCircle size={13} /> URL ไม่ถูกต้อง — กรุณาเริ่มด้วย https://
                  </div>
                );
              }
            })()}
          </div>

        </div>{/* end grid */}

        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-4 relative z-10 p-2">
          <button
            type="submit"
            value="new"
            disabled={loading}
            className="px-6 py-3.5 rounded-xl text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-800 border border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {loading && saveMode === 'new' ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
            บันทึก & เริ่มตัวชี้วัดใหม่หมด
          </button>

          <button
            type="submit"
            value="next"
            disabled={loading}
            className="px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 group flex-1 sm:max-w-xs"
          >
            {loading && saveMode === 'next' ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
            บันทึก & กรอกเขตถัดไปต่อเลย
          </button>
        </div>
      </form>

      <ConfirmationModal
        open={showConfirmation}
        title={pendingSaveMode === 'new' ? 'ยืนยันบันทึกและเริ่มใหม่' : 'ยืนยันบันทึกและกรอกเขตถัดไป'}
        message={pendingSaveMode === 'new'
          ? 'ระบบจะสร้างรายการ Health KPI แล้วล้างข้อมูลในฟอร์มเพื่อเริ่มตัวชี้วัดใหม่'
          : 'ระบบจะสร้างรายการ Health KPI แล้วคงข้อมูลตัวชี้วัดไว้สำหรับกรอกเขตถัดไป'}
        confirmLabel="ยืนยันบันทึก"
        isLoading={loading}
        onCancel={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSave}
        details={(
          <div className="space-y-1.5">
            <p><span className="font-black text-slate-700">ตัวชี้วัด:</span> {formData.indicatorName}</p>
            <p><span className="font-black text-slate-700">เขต:</span> {formData.region}</p>
            <p><span className="font-black text-slate-700">ปี/รอบ:</span> {formData.fiscalYear} · {formData.period}</p>
          </div>
        )}
      />

      {/* SUCCESS MODAL (Premium UI) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowSuccessModal(false)} />
          <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl max-w-sm w-full relative z-10 border border-emerald-100 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8 border border-emerald-100 shadow-inner relative">
               <div className="absolute inset-0 rounded-full animate-ping bg-emerald-100 opacity-20"></div>
               <CheckCircle2 className="text-emerald-500 relative z-10" size={56} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">บันทึกสำเร็จ!</h2>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed">
              อัปเดตข้อมูล <span className="text-emerald-600 font-bold">Health KPI</span> เรียบร้อยแล้วครับ ระบบพร้อมสำหรับการบันทึกข้อมูลลำดับถัดไป
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 tracking-wide"
            >
              ตกลง (ลุยต่อ)
            </button>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setError(null)} />
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full relative z-10 border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 shadow-inner">
               <XCircle className="text-rose-500" size={42} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">เกิดข้อผิดพลาด!</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
