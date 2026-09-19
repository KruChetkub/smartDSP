import { useState } from 'react';
import type {
  AllocationTrancheKey,
  TrancheDefinition,
  TrancheForm,
} from '../types/budgetItems.types';
import {
  emptyTrancheForm,
  initialTrancheDefinitions,
} from '../constants/budgetItems.constants';
import { saveBudgetAllocationTrancheDefinitions } from '../services/budgetUtilization.service';
import { getSafeUserErrorMessage } from '../../../utils/errorHandling';
import type { BudgetUtilizationItemWithAmount } from '../types/budgetUtilization.types';

export function useBudgetTranches(
  budgetLineItems: BudgetUtilizationItemWithAmount[],
  reportPeriodId: string,
  onReload: (periodId: string) => Promise<unknown>,
  setError: (msg: string | null) => void,
) {
  const [trancheDefinitions, setTrancheDefinitions] = useState<TrancheDefinition[]>(initialTrancheDefinitions);
  const [trancheDrafts, setTrancheDrafts] = useState<TrancheDefinition[]>(initialTrancheDefinitions);
  const [trancheForm, setTrancheForm] = useState<TrancheForm>(emptyTrancheForm);
  const [isTrancheManagerOpen, setIsTrancheManagerOpen] = useState(false);
  const [savingTranche, setSavingTranche] = useState(false);

  const getTrancheUsageCount = (trancheKey: AllocationTrancheKey) => {
    return budgetLineItems.filter((item) =>
      item.allocations?.some(
        (allocation) =>
          allocation.tranche_id === trancheKey &&
          (allocation.amount !== 0 || Boolean(allocation.allocation_date)),
      ),
    ).length;
  };

  const saveTrancheDraft = () => {
    const label = trancheForm.label.trim();
    if (!label) {
      setError('กรุณากรอกชื่องวดจัดสรร');
      return;
    }

    setError(null);
    if (trancheForm.key) {
      setTrancheDrafts((current) =>
        current.map((tranche) => (tranche.key === trancheForm.key ? { ...tranche, label } : tranche)),
      );
      setTrancheForm(emptyTrancheForm);
      return;
    }

    const nextTrancheNumber =
      Math.max(0, ...trancheDrafts.map((tranche) => tranche.trancheNumber)) + 1;
    setTrancheDrafts((current) => [
      ...current,
      {
        key: `new-${crypto.randomUUID()}`,
        trancheNumber: nextTrancheNumber,
        label,
      },
    ]);
    setTrancheForm(emptyTrancheForm);
  };

  const deleteTrancheDraft = (trancheKey: AllocationTrancheKey) => {
    if (trancheDrafts.length <= 1) {
      setError('ต้องมีงวดจัดสรรอย่างน้อย 1 งวด');
      return;
    }

    if (getTrancheUsageCount(trancheKey) > 0) {
      setError('ลบงวดจัดสรรไม่ได้ เนื่องจากมีรายการงบประมาณใช้งานงวดนี้อยู่');
      return;
    }

    setError(null);
    setTrancheDrafts((current) => current.filter((tranche) => tranche.key !== trancheKey));
    if (trancheForm.key === trancheKey) {
      setTrancheForm(emptyTrancheForm);
    }
  };

  const saveTrancheDefinitions = async (
    onTrancheUpdate?: (definitions: TrancheDefinition[]) => void,
  ) => {
    if (!reportPeriodId) return;
    const nextDefinitions = trancheDrafts.map((tranche) => ({
      ...tranche,
      label: tranche.label.trim() || `จัดสรรงวด ${tranche.trancheNumber}`,
    }));
    try {
      setSavingTranche(true);
      setError(null);
      const savedDefinitions = await saveBudgetAllocationTrancheDefinitions(
        reportPeriodId,
        nextDefinitions.map((tranche, index) => ({
          id: tranche.id,
          trancheNumber: tranche.trancheNumber,
          label: tranche.label,
          sortOrder: index + 1,
        })),
      );
      const mappedDefinitions = savedDefinitions.map((tranche) => ({
        key: tranche.id,
        id: tranche.id,
        trancheNumber: tranche.tranche_number,
        label: tranche.label,
      }));
      setTrancheDefinitions(mappedDefinitions);
      setTrancheDrafts(mappedDefinitions);
      setTrancheForm(emptyTrancheForm);
      setIsTrancheManagerOpen(false);
      onTrancheUpdate?.(mappedDefinitions);
      await onReload(reportPeriodId);
    } catch (saveError) {
      setError(getSafeUserErrorMessage(saveError, 'ไม่สามารถบันทึกการจัดการงวดได้'));
    } finally {
      setSavingTranche(false);
    }
  };

  return {
    trancheDefinitions,
    setTrancheDefinitions,
    trancheDrafts,
    setTrancheDrafts,
    trancheForm,
    setTrancheForm,
    isTrancheManagerOpen,
    setIsTrancheManagerOpen,
    savingTranche,
    getTrancheUsageCount,
    saveTrancheDraft,
    deleteTrancheDraft,
    saveTrancheDefinitions,
  };
}

