import React from 'react';
import {
  Calculator,
  CheckCircle2,
  Edit3,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import type { ItemForm } from '../../types/budgetItems.types';
import type { BudgetUtilizationItemWithAmount } from '../../types/budgetUtilization.types';
import { formatBudgetAmount } from '../../utils/budgetUtilizationCalculations';
import { formFromItem } from '../../utils/budgetItems.utils';
import {
  emptyChildForm,
  emptyMajorProjectForm,
  emptySubActivityForm,
} from '../../constants/budgetItems.constants';

interface BudgetItemsHierarchyFormsProps {
  saving: boolean;
  mainBudgetItems: BudgetUtilizationItemWithAmount[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  selectedCategory: BudgetUtilizationItemWithAmount | null;
  isOperationsCategorySelected: boolean;
  mainForm: ItemForm;
  setMainForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  saveMainForm: () => Promise<void>;
  majorProjectBudgetItems: BudgetUtilizationItemWithAmount[];
  selectedMajorProjectId: string;
  setSelectedMajorProjectId: (id: string) => void;
  selectedMajorProject: BudgetUtilizationItemWithAmount | null;
  majorProjectForm: ItemForm;
  setMajorProjectForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  saveMajorProjectForm: () => Promise<void>;
  selectedMajorProjectSubActivities: BudgetUtilizationItemWithAmount[];
  selectedSubActivityId: string;
  setSelectedSubActivityId: (id: string) => void;
  selectedSubActivity: BudgetUtilizationItemWithAmount | null;
  subActivityForm: ItemForm;
  setSubActivityForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  saveSubActivityForm: () => Promise<void>;
  childForm: ItemForm;
  setChildForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  saveChildForm: () => Promise<void>;
  selectedSubActivityBudgetItems: BudgetUtilizationItemWithAmount[];
  selectedAllocationItem: BudgetUtilizationItemWithAmount | null;
  selectedDisbursementItem: BudgetUtilizationItemWithAmount | null;
  onSelectSubActivityBudgetItem: (item: BudgetUtilizationItemWithAmount) => void;
  onStartEdit: (item: BudgetUtilizationItemWithAmount) => void;
  onSetDeleteTarget: (item: BudgetUtilizationItemWithAmount) => void;
  onResetCategoryForm: () => void;
  onOpenCategoryManager: () => void;
  allBudgetItems: BudgetUtilizationItemWithAmount[];
}

export const BudgetItemsHierarchyForms: React.FC<BudgetItemsHierarchyFormsProps> = ({
  saving,
  mainBudgetItems,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedCategory,
  isOperationsCategorySelected,
  mainForm,
  setMainForm,
  saveMainForm,
  majorProjectBudgetItems,
  selectedMajorProjectId,
  setSelectedMajorProjectId,
  selectedMajorProject,
  majorProjectForm,
  setMajorProjectForm,
  saveMajorProjectForm,
  selectedMajorProjectSubActivities,
  selectedSubActivityId,
  setSelectedSubActivityId,
  selectedSubActivity,
  subActivityForm,
  setSubActivityForm,
  saveSubActivityForm,
  childForm,
  setChildForm,
  saveChildForm,
  selectedSubActivityBudgetItems,
  selectedAllocationItem,
  selectedDisbursementItem,
  onSelectSubActivityBudgetItem,
  onStartEdit,
  onSetDeleteTarget,
  onResetCategoryForm,
  onOpenCategoryManager,
  allBudgetItems,
}) => {
  const selectedParent = allBudgetItems.find((item) => item.id === childForm.parentId) ?? null;
  const selectedParentChildTotal = selectedParent
    ? allBudgetItems
        .filter((item) => item.parent_id === selectedParent.id)
        .reduce((sum, item) => sum + item.amount.planned_budget_amount, 0)
    : 0;

  return (
    <section className="rounded-md border border-sky-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            {childForm.itemId ? 'แก้ไขรายการงบประมาณ' : 'เพิ่มรายการงบประมาณ'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            เลือกว่าอยู่ใต้ประเภทหลักใด แล้วกรอกข้อมูลวงเงินและผลการใช้จ่าย
          </p>
        </div>
        {childForm.itemId ? (
          <button
            type="button"
            onClick={() =>
              setChildForm({
                ...emptyChildForm,
                parentId:
                  selectedSubActivity?.id ??
                  selectedCategory?.id ??
                  selectedCategoryId,
                rowType: selectedSubActivity ? 'activity' : 'line_item',
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            ยกเลิก
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="text-xs font-semibold text-slate-600">
            ประเภทหลักหรือโครงการใหญ่
          </span>
          <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={selectedCategory?.id ?? selectedCategoryId}
              onChange={(event) => {
                const categoryId = event.target.value;
                const category =
                  mainBudgetItems.find((item) => item.id === categoryId) ?? null;
                setSelectedCategoryId(categoryId);
                setSelectedMajorProjectId('');
                setSelectedSubActivityId('');
                setSubActivityForm(emptySubActivityForm);
                setChildForm((current) => ({
                  ...current,
                  parentId: categoryId,
                  rowType: 'line_item',
                }));
                if (category?.item_name.replace(/\s+/g, '').includes('งบดำเนินงาน')) {
                  setMajorProjectForm((current) => ({
                    ...current,
                    parentId: category.id,
                  }));
                } else {
                  setMajorProjectForm(emptyMajorProjectForm);
                }
              }}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">เลือกประเภทหลักก่อน</option>
              {mainBudgetItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sequence_label ? `${item.sequence_label} ` : ''}
                  {item.item_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              จัดการประเภทหลัก
            </button>
          </div>
        </div>

        {selectedParent ? (
          <div className="rounded-md border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 sm:col-span-2">
            <div className="font-semibold">
              {(() => {
                if (selectedParent.row_type === 'major_project') return 'โครงการใหญ่';
                if (selectedParent.row_type === 'sub_project') return 'กิจกรรมย่อย';
                return 'ประเภทหลัก';
              })()}
              : {selectedParent.item_name}
            </div>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              <span>
                {(() => {
                  if (selectedParent.row_type === 'major_project') return 'วงเงินโครงการใหญ่';
                  if (selectedParent.row_type === 'sub_project') return 'วงเงินกิจกรรมย่อย';
                  return 'รวมวงเงินรายการภายใต้หัวข้อนี้';
                })()}
                :{' '}
                {formatBudgetAmount(
                  selectedParent.row_type === 'major_project' ||
                    selectedParent.row_type === 'sub_project'
                    ? selectedParent.amount.planned_budget_amount
                    : selectedParentChildTotal,
                )}{' '}
                บาท
              </span>
              <span>
                จำนวนรายการ:{' '}
                {
                  allBudgetItems.filter(
                    (item) => item.parent_id === selectedParent.id,
                  ).length
                }
              </span>
            </div>
          </div>
        ) : null}

        {isOperationsCategorySelected ? (
          <div className="rounded-md border border-emerald-300 border-l-4 border-l-emerald-600 bg-emerald-50/60 p-4 shadow-sm sm:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white">
                    ระดับ 1
                  </span>
                  <h3 className="text-sm font-bold text-emerald-950">
                    {majorProjectForm.itemId
                      ? 'แก้ไขโครงการใหญ่'
                      : 'สร้างโครงการใหญ่ภายใต้งบดำเนินงาน'}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-emerald-800/80">
                  กำหนดชื่อ วงเงิน เลขกิจกรรม และชื่อกิจกรรม ก่อนสร้างกิจกรรมย่อย
                </p>
              </div>
              {majorProjectForm.itemId ? (
                <button
                  type="button"
                  onClick={() =>
                    setMajorProjectForm({
                      ...emptyMajorProjectForm,
                      parentId: selectedCategory?.id ?? '',
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  ยกเลิก
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.6fr)_minmax(0,1.2fr)_minmax(0,0.8fr)_auto] sm:items-end">
              <label className="block">
                <span className="text-xs font-semibold text-emerald-950">
                  ชื่อโครงการใหญ่
                </span>
                <input
                  value={majorProjectForm.itemName}
                  onChange={(event) =>
                    setMajorProjectForm((current) => ({
                      ...current,
                      parentId: selectedCategory?.id ?? current.parentId,
                      itemName: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="ชื่อโครงการใหญ่"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-emerald-950">
                  กิจกรรมที่
                </span>
                <input
                  value={majorProjectForm.activitySequenceLabel}
                  onChange={(event) =>
                    setMajorProjectForm((current) => ({
                      ...current,
                      parentId: selectedCategory?.id ?? current.parentId,
                      activitySequenceLabel: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="เช่น 1.1"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-emerald-950">
                  ชื่อกิจกรรม
                </span>
                <input
                  value={majorProjectForm.activityLabel}
                  onChange={(event) =>
                    setMajorProjectForm((current) => ({
                      ...current,
                      parentId: selectedCategory?.id ?? current.parentId,
                      activityLabel: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="ชื่อกิจกรรมของโครงการใหญ่"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-emerald-950">
                  วงเงินโครงการใหญ่
                </span>
                <input
                  value={majorProjectForm.plannedBudgetAmount}
                  onChange={(event) =>
                    setMajorProjectForm((current) => ({
                      ...current,
                      parentId: selectedCategory?.id ?? current.parentId,
                      plannedBudgetAmount: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-emerald-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="จำนวนเงิน"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveMajorProjectForm()}
                disabled={
                  saving ||
                  !majorProjectForm.itemName.trim() ||
                  !majorProjectForm.activitySequenceLabel.trim() ||
                  !majorProjectForm.activityLabel.trim() ||
                  !majorProjectForm.plannedBudgetAmount.trim()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {majorProjectForm.itemId ? (
                  <Save className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                {majorProjectForm.itemId ? 'บันทึก' : 'เพิ่มโครงการใหญ่'}
              </button>
            </div>
          </div>
        ) : null}

        {isOperationsCategorySelected && majorProjectBudgetItems.length > 0 ? (
          <div className="rounded-md border border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50/40 p-3 sm:col-span-2">
            <span className="text-xs font-bold text-emerald-950">
              เลือกโครงการใหญ่ (ระดับ 1) เพื่อสร้างกิจกรรมย่อย
            </span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedMajorProjectId}
                onChange={(event) => {
                  const majorProjectId = event.target.value;
                  setSelectedMajorProjectId(majorProjectId);
                  setSelectedSubActivityId('');
                  setSubActivityForm({
                    ...emptySubActivityForm,
                    parentId: majorProjectId,
                  });
                  setChildForm(emptyChildForm);
                }}
                className="h-10 w-full rounded-md border border-emerald-300 bg-white px-3 text-sm font-medium outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">เลือกโครงการใหญ่</option>
                {majorProjectBudgetItems.map((project, index) => (
                  <option key={project.id} value={project.id}>
                    โครงการใหญ่ลำดับที่ {index + 1}: {project.item_name}
                    {project.activity_sequence_label
                      ? ` · กิจกรรมที่ ${project.activity_sequence_label}`
                      : ''}
                  </option>
                ))}
              </select>
              {selectedMajorProject ? (
                <button
                  type="button"
                  onClick={() => {
                    setMajorProjectForm(formFromItem(selectedMajorProject));
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-100 px-3 text-sm font-bold text-emerald-900 transition hover:bg-emerald-200"
                  title="แก้ไขโครงการใหญ่ที่เลือก"
                >
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  แก้ไขโครงการใหญ่
                </button>
              ) : null}
            </div>
            <span className="mt-1 block text-xs text-emerald-700">
              กิจกรรมย่อยจะถูกจัดเก็บและแสดงตามลำดับภายใต้โครงการใหญ่ที่เลือก
            </span>
          </div>
        ) : null}

        {isOperationsCategorySelected && selectedMajorProject ? (
          <div className="rounded-md border border-blue-300 border-l-4 border-l-blue-600 bg-blue-50/60 p-4 shadow-sm sm:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-blue-700 px-2 py-0.5 text-[11px] font-bold text-white">
                    ระดับ 2
                  </span>
                  <h3 className="text-sm font-bold text-blue-950">
                    {subActivityForm.itemId
                      ? 'แก้ไขโครงการย่อย / กิจกรรมย่อย'
                      : 'สร้างโครงการย่อย / กิจกรรมย่อย'}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-blue-800/80">
                  กิจกรรมย่อยจะอยู่ภายใต้โครงการใหญ่:{' '}
                  <strong className="font-semibold text-blue-950">
                    {selectedMajorProject.item_name}
                  </strong>
                </p>
              </div>
              {subActivityForm.itemId ? (
                <button
                  type="button"
                  onClick={() =>
                    setSubActivityForm({
                      ...emptySubActivityForm,
                      parentId: selectedMajorProject.id,
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-300 bg-white px-2.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-50"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  ยกเลิก
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_auto] sm:items-end">
              <label className="block">
                <span className="text-xs font-semibold text-blue-950">
                  กิจกรรมย่อยที่
                </span>
                <input
                  value={subActivityForm.activitySequenceLabel}
                  onChange={(event) =>
                    setSubActivityForm((current) => ({
                      ...current,
                      parentId: selectedMajorProject.id,
                      activitySequenceLabel: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-blue-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="เช่น 1.1.1"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-blue-950">
                  ชื่อกิจกรรมย่อย
                </span>
                <input
                  value={subActivityForm.itemName}
                  onChange={(event) =>
                    setSubActivityForm((current) => ({
                      ...current,
                      parentId: selectedMajorProject.id,
                      itemName: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-blue-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="ชื่อกิจกรรมย่อย"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-blue-950">
                  วงเงินกิจกรรมย่อย
                </span>
                <input
                  value={subActivityForm.plannedBudgetAmount}
                  onChange={(event) =>
                    setSubActivityForm((current) => ({
                      ...current,
                      parentId: selectedMajorProject.id,
                      plannedBudgetAmount: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-md border border-blue-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="จำนวนเงิน"
                />
              </label>
              <button
                type="button"
                onClick={() => void saveSubActivityForm()}
                disabled={
                  saving ||
                  !subActivityForm.activitySequenceLabel.trim() ||
                  !subActivityForm.itemName.trim() ||
                  !subActivityForm.plannedBudgetAmount.trim()
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {subActivityForm.itemId ? (
                  <Save className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                {subActivityForm.itemId ? 'บันทึก' : 'เพิ่มกิจกรรมย่อย'}
              </button>
            </div>
          </div>
        ) : null}

        {isOperationsCategorySelected && selectedMajorProjectSubActivities.length > 0 ? (
          <div className="rounded-md border border-blue-200 border-l-4 border-l-blue-500 bg-blue-50/40 p-3 sm:col-span-2">
            <span className="text-xs font-bold text-blue-950">
              เลือกกิจกรรมย่อย (ระดับ 2) เพื่อสร้างกิจกรรม
            </span>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedSubActivityId}
                onChange={(event) => {
                  const subActivityId = event.target.value;
                  setSelectedSubActivityId(subActivityId);
                  setChildForm({
                    ...emptyChildForm,
                    parentId: subActivityId,
                    rowType: 'activity',
                  });
                }}
                className="h-10 w-full rounded-md border border-blue-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">เลือกกิจกรรมย่อย</option>
                {selectedMajorProjectSubActivities.map((subActivity, index) => (
                  <option key={subActivity.id} value={subActivity.id}>
                    กิจกรรมย่อยลำดับที่ {index + 1}: {subActivity.item_name}
                    {subActivity.activity_sequence_label
                      ? ` · ${subActivity.activity_sequence_label}`
                      : ''}
                  </option>
                ))}
              </select>
              {selectedSubActivity ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSubActivityForm(formFromItem(selectedSubActivity));
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-blue-300 bg-blue-100 px-3 text-sm font-bold text-blue-900 transition hover:bg-blue-200"
                    title="แก้ไขชื่อและวงเงินกิจกรรมย่อย"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                    แก้ไขกิจกรรมย่อย
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onStartEdit(selectedSubActivity);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-blue-700 bg-blue-700 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
                    title="แก้ไขรายละเอียดงบประมาณและการคำนวณทั้งหมด"
                  >
                    <Calculator className="h-4 w-4" aria-hidden="true" />
                    แก้ไขรายละเอียดงบประมาณ
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isOperationsCategorySelected ? (
          <>
            <input
              value={childForm.outputLabel}
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  outputLabel: event.target.value,
                }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="ผลผลิตที่"
            />
            <input
              value={childForm.activityLabel}
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  activityLabel: event.target.value,
                }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="กิจกรรมหลักที่"
            />
            <input
              value={childForm.itemName}
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  itemName: event.target.value,
                }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:col-span-2"
              placeholder="ชื่อรายการ เช่น ค่าตอบแทนพนักงานราชการ"
            />
            <input
              value={childForm.plannedBudgetAmount}
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  plannedBudgetAmount: event.target.value,
                }))
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="วงเงินงบประมาณ"
            />
          </>
        ) : null}

        {isOperationsCategorySelected && selectedSubActivity ? (
          <div className="grid gap-3 rounded-md border border-purple-300 border-l-4 border-l-purple-600 bg-purple-50/60 p-4 shadow-sm sm:col-span-2 sm:grid-cols-[minmax(9rem,0.45fr)_minmax(0,1fr)_minmax(10rem,0.55fr)]">
            <div className="sm:col-span-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-purple-700 px-2 py-0.5 text-[11px] font-bold text-white">
                  ระดับ 3
                </span>
                <span className="text-xs font-bold text-purple-950">
                  สร้างกิจกรรม / รายการงบประมาณภายใต้กิจกรรมย่อย
                </span>
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-purple-950">
                กิจกรรมที่
              </span>
              <input
                value={childForm.activitySequenceLabel}
                onChange={(event) =>
                  setChildForm((current) => ({
                    ...current,
                    activitySequenceLabel: event.target.value,
                  }))
                }
                className="mt-1 h-10 w-full rounded-md border border-purple-300 bg-white px-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                placeholder="เช่น 1.1.1.1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-purple-950">
                ชื่อกิจกรรม
              </span>
              <input
                value={childForm.itemName}
                onChange={(event) =>
                  setChildForm((current) => ({
                    ...current,
                    itemName: event.target.value,
                  }))
                }
                className="mt-1 h-10 w-full rounded-md border border-purple-300 bg-white px-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                placeholder="ชื่อกิจกรรม"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-purple-950">
                วงเงินกิจกรรม
              </span>
              <input
                value={childForm.plannedBudgetAmount}
                onChange={(event) =>
                  setChildForm((current) => ({
                    ...current,
                    plannedBudgetAmount: event.target.value,
                  }))
                }
                className="mt-1 h-10 w-full rounded-md border border-purple-300 bg-white px-3 text-sm outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"
                placeholder="จำนวนเงิน"
              />
            </label>
          </div>
        ) : null}
      </div>

      {!isOperationsCategorySelected || selectedSubActivity ? (
        <button
          type="button"
          onClick={() => void saveChildForm()}
          disabled={saving || !childForm.parentId || !childForm.itemName.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {childForm.itemId ? (
            <Save className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          {saving
            ? 'กำลังบันทึก...'
            : childForm.itemId
              ? 'บันทึกรายการงบประมาณ'
              : selectedSubActivity
                ? 'เพิ่มกิจกรรม (ระดับ 3)'
                : 'เพิ่มรายการงบประมาณ'}
        </button>
      ) : null}

      {isOperationsCategorySelected && selectedSubActivity ? (
        <div className="mt-4 overflow-hidden rounded-md border border-purple-300 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-purple-200 bg-purple-100/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-purple-800 px-2 py-0.5 text-xs font-bold text-white">
                  กิจกรรมย่อย{' '}
                  {selectedSubActivity.activity_sequence_label ??
                    selectedSubActivity.sequence_label ??
                    ''}
                </span>
                <h3 className="truncate text-sm font-bold text-purple-950">
                  {selectedSubActivity.item_name}
                </h3>
              </div>
              <p className="mt-1 text-xs text-purple-900">
                วงเงินกิจกรรมย่อย:{' '}
                <strong className="font-bold text-purple-950">
                  {formatBudgetAmount(
                    selectedSubActivity.amount.planned_budget_amount,
                  )}
                </strong>{' '}
                บาท
                {selectedSubActivityBudgetItems.length > 0
                  ? ` · รวมรายการย่อย ${selectedSubActivityBudgetItems.length} รายการ`
                  : ' · เป็นรายการงบประมาณโดยตรง (ไม่มีรายการย่อย)'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectSubActivityBudgetItem(selectedSubActivity)}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-bold transition ${
                  selectedAllocationItem?.id === selectedSubActivity.id &&
                  selectedDisbursementItem?.id === selectedSubActivity.id
                    ? 'border-purple-600 bg-purple-700 text-white'
                    : 'border-purple-300 bg-white text-purple-900 hover:bg-purple-50'
                }`}
                title="เลือกกิจกรรมย่อยนี้สำหรับกรอก/บันทึกข้อมูลงบประมาณ"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {selectedAllocationItem?.id === selectedSubActivity.id &&
                selectedDisbursementItem?.id === selectedSubActivity.id
                  ? 'เลือกกิจกรรมย่อยนี้แล้ว'
                  : 'เลือกบันทึกงบประมาณ'}
              </button>
              <button
                type="button"
                onClick={() => onStartEdit(selectedSubActivity)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-purple-300 bg-white px-3 text-xs font-bold text-purple-900 transition hover:bg-purple-50 hover:text-purple-950"
                title="แก้ไขรายละเอียดและยอดเงินของกิจกรรมย่อยนี้"
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                แก้ไขรายละเอียดงบประมาณ
              </button>
              <button
                type="button"
                onClick={() => onSetDeleteTarget(selectedSubActivity)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                title="ลบกิจกรรมย่อยนี้"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                ลบ
              </button>
            </div>
          </div>
          {selectedSubActivityBudgetItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-purple-100 text-sm">
                <thead className="bg-purple-50/60 text-left text-xs font-bold text-purple-900">
                  <tr>
                    <th className="w-40 px-4 py-3">กิจกรรมที่</th>
                    <th className="px-4 py-3">ชื่อรายการงบประมาณ</th>
                    <th className="w-48 px-4 py-3 text-right">วงเงินงบประมาณ</th>
                    <th className="w-44 px-4 py-3 text-right">เลือก / จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSubActivityBudgetItems.map((item, index) => {
                    const isSelected =
                      selectedAllocationItem?.id === item.id &&
                      selectedDisbursementItem?.id === item.id;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelectSubActivityBudgetItem(item)}
                        className={`cursor-pointer text-slate-700 transition ${
                          isSelected ? 'bg-purple-50 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-purple-900">
                          {item.activity_sequence_label ??
                            item.sequence_label ??
                            index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.item_name}
                          {isSelected ? (
                            <span className="ml-2 rounded bg-purple-200 px-1.5 py-0.5 text-xs font-bold text-purple-900">
                              เลือกแล้ว
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                          {formatBudgetAmount(item.amount.planned_budget_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelectSubActivityBudgetItem(item);
                              }}
                              className={`inline-flex h-9 items-center justify-center rounded-md border p-2 transition ${
                                isSelected
                                  ? 'border-purple-400 bg-purple-100 text-purple-800'
                                  : 'border-purple-200 bg-white text-purple-700 hover:bg-purple-50'
                              }`}
                              aria-label={`เลือก ${item.item_name} สำหรับกรอกข้อมูลงบประมาณ`}
                              aria-pressed={isSelected}
                              title="เลือกสำหรับกรอกข้อมูล"
                            >
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onStartEdit(item);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 hover:text-sky-700"
                              aria-label={`แก้ไข ${item.item_name}`}
                              title="แก้ไขรายการ"
                            >
                              <Edit3 className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onSetDeleteTarget(item);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                              aria-label={`ลบ ${item.item_name}`}
                              title="ลบรายการ"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
