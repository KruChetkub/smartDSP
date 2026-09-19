import React from 'react';
import { AlertCircle, Calculator, CheckCircle2, X } from 'lucide-react';
import type { FormulaAuditRow, HierarchyAuditIssue } from '../../types/budgetItems.types';
import type { BudgetUtilizationItemWithAmount } from '../../types/budgetUtilization.types';
import { formatBudgetAmount } from '../../utils/budgetUtilizationCalculations';
import { formulaAuditToneClasses } from '../../constants/budgetItems.constants';
import { isFormulaValueEqual } from '../../utils/budgetItems.utils';

interface FormulaAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  formulaAuditItemId: string;
  setFormulaAuditItemId: (id: string) => void;
  formulaAuditItem: BudgetUtilizationItemWithAmount | null;
  formulaAuditItems: BudgetUtilizationItemWithAmount[];
  formulaAuditRows: FormulaAuditRow[];
  hierarchyAuditIssues: HierarchyAuditIssue[];
}

export const FormulaAuditModal: React.FC<FormulaAuditModalProps> = ({
  isOpen,
  onClose,
  setFormulaAuditItemId,
  formulaAuditItem,
  formulaAuditItems,
  formulaAuditRows,
  hierarchyAuditIssues,
}) => {
  if (!isOpen) return null;

  const isAllValid = formulaAuditRows.every((row) =>
    isFormulaValueEqual(row.expected, row.displayed),
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-formula-audit-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="ปิดหน้าต่างตรวจสอบสูตร"
      />
      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-md bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
          <div>
            <h2
              id="budget-formula-audit-title"
              className="flex items-center gap-2 text-lg font-bold text-slate-950"
            >
              <Calculator className="h-5 w-5 text-sky-700" aria-hidden="true" />
              ตรวจสอบสูตรและโครงสร้างงบประมาณ
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              ตรวจค่าที่ตารางแสดงเทียบกับสูตร และตรวจลำดับประเภทหลัก โครงการใหญ่ โครงการย่อย และกิจกรรม
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            title="ปิด"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">
                เลือกรายการที่ต้องการตรวจสอบ
              </span>
              <select
                value={formulaAuditItem?.id ?? ''}
                onChange={(event) => setFormulaAuditItemId(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                {formulaAuditItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {[item.sequence_label, item.item_name].filter(Boolean).join(' ')}
                  </option>
                ))}
              </select>
            </label>
            {formulaAuditItem ? (
              <p className="mt-2 text-xs text-slate-500">
                ระดับข้อมูล: {formulaAuditItem.row_type} ·
                รายการที่มีข้อมูลลูกจะแสดงยอดรวมจากลำดับชั้นเดียวกับตาราง
              </p>
            ) : null}
          </div>

          <div className="px-4 py-5 sm:px-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-950">ผลตรวจสูตรคำนวณ</h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  isAllValid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isAllValid ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isAllValid ? 'ตรงตามสูตรทุกช่อง' : 'พบค่าที่ควรตรวจสอบ'}
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {formulaAuditRows.map((row) => {
                const isValid = isFormulaValueEqual(row.expected, row.displayed);
                return (
                  <section
                    key={row.key}
                    className={`rounded-md border p-4 ${formulaAuditToneClasses[row.tone]}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-950">{row.title}</h4>
                        <p className="mt-1 text-xs font-medium text-slate-700">{row.formula}</p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                          isValid ? 'bg-white/80 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isValid ? (
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {isValid ? 'ถูกต้อง' : 'ไม่ตรง'}
                      </span>
                    </div>
                    <p className="mt-3 break-words rounded-md bg-white/75 px-3 py-2 font-mono text-xs text-slate-700">
                      {row.substitutedFormula}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">ค่าที่ควรได้</p>
                        <p className="mt-1 font-bold text-slate-950">
                          {formatBudgetAmount(row.expected)}
                          {row.suffix ?? ' บาท'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">ค่าที่ตารางแสดง</p>
                        <p className={`mt-1 font-bold ${isValid ? 'text-slate-950' : 'text-red-700'}`}>
                          {formatBudgetAmount(row.displayed)}
                          {row.suffix ?? ' บาท'}
                        </p>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            <section className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-950">ผลตรวจโครงสร้างโครงการ</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    ประเภทหลัก → โครงการใหญ่ → โครงการย่อย → กิจกรรม และวงเงินลูกต้องไม่เกินวงเงินแม่
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                    hierarchyAuditIssues.length === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {hierarchyAuditIssues.length === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {hierarchyAuditIssues.length === 0
                    ? 'โครงสร้างถูกต้อง'
                    : `พบ ${hierarchyAuditIssues.length} จุดที่ควรตรวจสอบ`}
                </span>
              </div>

              {hierarchyAuditIssues.length === 0 ? (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  รายการทั้งหมดเชื่อมโยงตามลำดับและไม่พบวงเงินรายการลูกเกินวงเงินรายการแม่
                </div>
              ) : (
                <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-amber-200 bg-white">
                  {hierarchyAuditIssues.map((issue, index) => (
                    <button
                      key={`${issue.itemId}-${index}`}
                      type="button"
                      onClick={() => setFormulaAuditItemId(issue.itemId)}
                      className="flex w-full items-start gap-3 border-b border-amber-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-amber-50"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">
                          {issue.sequenceLabel} {issue.itemName}
                        </span>
                        <span className="mt-1 block text-xs text-amber-800">{issue.message}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-800 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

