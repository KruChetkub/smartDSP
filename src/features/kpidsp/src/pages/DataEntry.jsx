import React, { useState } from 'react';
import { FileSpreadsheet, Loader2, CheckCircle, AlertCircle, Link2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseOptionalNumber, trimToNull } from '../utils/kpiForm';
import KpiDataPolicyNotice from '../components/KpiDataPolicyNotice';
import ConfirmationModal from '../components/ConfirmationModal';

export default function DataEntry() {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    category: 'SDGs',
    orderNo: '',
    subTarget: '',
    indicatorName: '',
    target2030: '',
    unit: '',
    currentPerformance: '',
    agency: '',
    fiscalYear: '2569',
    period: 'Q4',
    note: '',
    referenceUrl: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmation(false);
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('sdg_indicators')
        .insert([{
          indicator_name: formData.indicatorName,
          category: trimToNull(formData.subTarget),
          target_2030: trimToNull(formData.target2030),
          current_performance: parseOptionalNumber(formData.currentPerformance),
          description: trimToNull(formData.note),
          fiscal_year: formData.fiscalYear,
          period: formData.period,
          reference_url: trimToNull(formData.referenceUrl),
          is_deleted: false,
        }]);

      if (insertError) throw insertError;

      setShowSuccessModal(true);
      setFormData({
        ...formData,
        subTarget: '',
        indicatorName: '',
        target2030: '',
        unit: '',
        currentPerformance: '',
        note: '',
        referenceUrl: '',
      });

    } catch (err) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none text-slate-800 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-slate-400 font-medium text-sm';
  const labelClass = 'block text-sm font-bold text-slate-700 mb-1.5';

  const isValidUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 fade-in-up">

      {/* PAGE HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <FileSpreadsheet className="text-cyan-500" size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            ตัวชี้วัดการขับเคลื่อนการพัฒนาที่ยั่งยืน (SDGs)
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            ฟอร์มบันทึกผลการดำเนินงานตัวชี้วัด SDGs กองยุทธศาสตร์และแผนงาน
          </p>
        </div>
      </div>

      <KpiDataPolicyNotice />

      {/* FORM */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm relative overflow-hidden">

        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-100/50 rounded-full blur-[80px] pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 relative z-10">

          {/* เป้าหมายย่อยที่ */}
          <div>
            <label className={labelClass}>เป้าหมายย่อยที่</label>
            <input
              type="text"
              name="subTarget"
              required
              value={formData.subTarget}
              onChange={handleChange}
              placeholder="เช่น 3.3"
              className={inputClass}
            />
          </div>

          {/* ชื่อตัวชี้วัด — full width */}
          <div className="md:col-span-2">
            <label className={labelClass}>ชื่อตัวชี้วัด</label>
            <textarea
              name="indicatorName"
              required
              value={formData.indicatorName}
              onChange={handleChange}
              rows={2}
              placeholder="ชื่อตัวชี้วัดฉบับเต็ม"
              className={inputClass}
            />
          </div>

          {/* เป้าหมาย SDG */}
          <div>
            <label className={labelClass}>เป้าหมาย SDG ปี 2573</label>
            <input
              type="text"
              name="target2030"
              required
              value={formData.target2030}
              onChange={handleChange}
              placeholder="เช่น ≤ 0.2, ลดลงร้อยละ 10"
              className={inputClass}
            />
          </div>

          {/* หน่วยวัด */}
          <div>
            <label className={labelClass}>หน่วยวัด</label>
            <input
              type="text"
              name="unit"
              required
              value={formData.unit}
              onChange={handleChange}
              placeholder="เช่น คน"
              className={inputClass}
            />
          </div>

          {/* ผลการดำเนินงาน */}
          <div>
            <label className={labelClass}>ผลการดำเนินงานปัจจุบัน</label>
            <input
              type="text"
              name="currentPerformance"
              value={formData.currentPerformance}
              onChange={handleChange}
              placeholder="ตัวเลขผลการดำเนินงาน"
              className={inputClass}
            />
          </div>

          {/* หน่วยงาน */}
          <div>
            <label className={labelClass}>หน่วยงานที่รับผิดชอบ</label>
            <input
              type="text"
              name="agency"
              required
              value={formData.agency}
              onChange={handleChange}
              placeholder="ชื่อกอง หรือ ศูนย์"
              className={inputClass}
            />
          </div>

          {/* ปีงบประมาณ */}
          <div>
            <label className={labelClass}>ปีงบประมาณ</label>
            <select name="fiscalYear" required value={formData.fiscalYear} onChange={handleChange} className={inputClass}>
              {['2567', '2568', '2569', '2570'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* ไตรมาส */}
          <div>
            <label className={labelClass}>ไตรมาส / รอบประเมิน</label>
            <select name="period" required value={formData.period} onChange={handleChange} className={inputClass}>
              <option value="Q1">ไตรมาส 1 (ต.ค. - ธ.ค.)</option>
              <option value="Q2">ไตรมาส 2 (ม.ค. - มี.ค.)</option>
              <option value="Q3">ไตรมาส 3 (เม.ย. - มิ.ย.)</option>
              <option value="Q4">ไตรมาส 4 (ก.ค. - ก.ย.)</option>
              <option value="Year-End">ภาพรวมทั้งปี (Year-End)</option>
            </select>
          </div>

          {/* หมายเหตุ */}
          <div>
            <label className={labelClass}>หมายเหตุ</label>
            <input
              type="text"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="คำอธิบายเพิ่มเติม"
              className={inputClass}
            />
          </div>

          {/* ══════════════════════════════════════════════
              ลิ้งอ้างอิง — FULL WIDTH
          ══════════════════════════════════════════════ */}
          <div className="md:col-span-2">
            <label className={labelClass}>
              <span className="flex items-center gap-2">
                <Link2 size={15} className="text-sky-500" />
                ลิ้งอ้างอิง / เอกสารประกอบ
                <span className="text-[11px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">ไม่บังคับ</span>
              </span>
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
                placeholder="https://drive.google.com/... หรือ URL เอกสารที่เกี่ยวข้อง"
                className={`${inputClass} pl-10`}
              />
            </div>

            {/* URL Preview — แสดงเมื่อกรอก URL ที่ valid */}
            {formData.referenceUrl && (
              <div className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                isValidUrl(formData.referenceUrl)
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-600'
              }`}>
                {isValidUrl(formData.referenceUrl) ? (
                  <>
                    <CheckCircle size={13} />
                    <span>URL ถูกต้อง —</span>
                    <a
                      href={formData.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 flex items-center gap-1 hover:text-emerald-900 transition-colors"
                    >
                      คลิกเพื่อทดสอบลิ้ง <ExternalLink size={11} />
                    </a>
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} />
                    <span>URL ไม่ถูกต้อง — กรุณาเริ่มด้วย https://</span>
                  </>
                )}
              </div>
            )}
          </div>

        </div>{/* end grid */}

        {/* BUTTONS */}
        <div className="pt-6 mt-2 border-t border-slate-100 flex justify-end gap-3 relative z-10">
          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              subTarget: '', indicatorName: '', target2030: '',
              unit: '', currentPerformance: '', note: '', referenceUrl: ''
            })}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
          >
            ล้างข้อมูล
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'บันทึกข้อมูล (Save)'}
          </button>
        </div>
      </form>

      <ConfirmationModal
        open={showConfirmation}
        title="ยืนยันการบันทึก SDGs"
        message="กรุณาตรวจสอบข้อมูลก่อนยืนยัน ระบบจะสร้างรายการใหม่ในฐานข้อมูล Supabase"
        confirmLabel="ยืนยันบันทึก"
        isLoading={loading}
        onCancel={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSave}
        details={(
          <div className="space-y-1.5">
            <p><span className="font-black text-slate-700">ตัวชี้วัด:</span> {formData.indicatorName}</p>
            <p><span className="font-black text-slate-700">ปี/รอบ:</span> {formData.fiscalYear} · {formData.period}</p>
          </div>
        )}
      />

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowSuccessModal(false)}
          />
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full relative z-10 border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-inner">
              <CheckCircle className="text-emerald-500 animate-bounce" size={42} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">บันทึกสำเร็จ!</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              บันทึกข้อมูลตัวชี้วัดเข้าสู่ฐานข้อมูลเรียบร้อยแล้ว<br />
              <span className="text-emerald-600 font-bold">พร้อมสำหรับการกรอกข้อต่อไป</span>
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              ตกลง (เข้าใจแล้ว)
            </button>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setError(null)}
          />
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full relative z-10 border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 shadow-inner">
              <AlertCircle className="text-rose-500" size={42} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">เกิดข้อผิดพลาด!</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{error}</p>
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
