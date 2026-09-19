export type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4';

export type AssessmentGroupKey = 'overall' | 'recurrent' | 'investment';

export type TargetTone = 'blue' | 'amber' | 'emerald';

export type RawBudgetRow = {
  id: string;
  name: string;
  planned: number;
  allocation1: number;
  allocation2: number;
  allocation3: number;
  netTotal: number;
  centralIn: number;
  centralOut: number;
  departmentRequestIncrease: number;
  departmentTransferOut: number;
  divisionIn: number;
  divisionOut: number;
  committedPo: number;
  committedWithoutPo: number;
  committedTotal: number;
  disbursedGeneral: number;
  disbursedAdvance: number;
  disbursedTotal: number;
  utilizationTotal: number;
  remaining: number;
  disbursementRate: number;
  utilizationWithPoRate: number;
};

export type ProjectPlanDetailRow = {
  id: string;
  sequenceLabel: string;
  name: string;
  output: string;
  activity: string;
  committedTotal: number;
  utilizationTotal: number;
  remaining: number;
  disbursedTotal: number;
  netTotal: number;
  disbursementRate: number;
  children: ProjectPlanDetailRow[];
};

export const chartColors = ['#2563eb', '#8b5cf6', '#f59e0b', '#0f766e', '#e11d48'];

export const quarterColors = {
  q1: 'bg-emerald-100 text-emerald-950',
  q2: 'bg-yellow-100 text-yellow-950',
  q3: 'bg-orange-100 text-orange-950',
  q4: 'bg-sky-100 text-sky-950',
  total: 'bg-lime-100 text-lime-950',
};

export const quarterOptions: Array<{ key: QuarterKey; label: string; period: string }> = [
  { key: 'q1', label: 'ไตรมาสที่ 1', period: '1 ต.ค. - 31 ธ.ค.' },
  { key: 'q2', label: 'ไตรมาสที่ 2', period: '1 ม.ค. - 31 มี.ค.' },
  { key: 'q3', label: 'ไตรมาสที่ 3', period: '1 เม.ย. - 30 มิ.ย.' },
  { key: 'q4', label: 'ไตรมาสที่ 4', period: '1 ก.ค. - 30 ก.ย.' },
];

export const assessmentTargets: Record<
  AssessmentGroupKey,
  {
    label: string;
    q1: { spending: number; disbursement: number };
    q2: { spending: number; disbursement: number };
    q3: { spending: number; disbursement: number };
    q4: { spending: number; disbursement: number };
    total: { spending: number; disbursement: number };
  }
> = {
  overall: {
    label: 'ภาพรวม',
    q1: { spending: 38, disbursement: 33 },
    q2: { spending: 61, disbursement: 55 },
    q3: { spending: 81, disbursement: 76 },
    q4: { spending: 100, disbursement: 93 },
    total: { spending: 100, disbursement: 93 },
  },
  recurrent: {
    label: 'รายจ่ายประจำ',
    q1: { spending: 38, disbursement: 37 },
    q2: { spending: 61, disbursement: 60 },
    q3: { spending: 84, disbursement: 83 },
    q4: { spending: 100, disbursement: 98 },
    total: { spending: 100, disbursement: 98 },
  },
  investment: {
    label: 'รายจ่ายลงทุน',
    q1: { spending: 36, disbursement: 20 },
    q2: { spending: 59, disbursement: 38 },
    q3: { spending: 69, disbursement: 55 },
    q4: { spending: 100, disbursement: 75 },
    total: { spending: 100, disbursement: 75 },
  },
};

export const assessmentGroupOrder: AssessmentGroupKey[] = ['overall', 'recurrent', 'investment'];

export const targetToneByGroup: Record<AssessmentGroupKey, TargetTone> = {
  overall: 'blue',
  recurrent: 'amber',
  investment: 'emerald',
};

export const plannedBudgetCategoryDefinitions = [
  { key: 'personnel', label: 'งบบุคลากร', matcher: /งบบุคลากร/, color: '#2563eb' },
  { key: 'investment', label: 'งบลงทุน', matcher: /งบลงทุน/, color: '#f59e0b' },
  { key: 'operations_total', label: 'งบดำเนินงาน', matcher: /งบดำเนินงาน\(รวม\)/, color: '#0f766e' },
  { key: 'operations', label: 'งบดำเนินงาน (ดำเนินงานปกติ)', matcher: /^งบดำเนินงาน$/, color: '#0d9488' },
  { key: 'project', label: 'งบโครงการ (รวม)', matcher: /งบโครงการ/, color: '#8b5cf6' },
];

