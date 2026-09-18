export const EVALUATION_DIRECTIONS = {
  higher_is_better: {
    value: 'higher_is_better',
    label: 'ยิ่งสูงยิ่งดี',
    shortLabel: 'สูง = ดี',
    hint: 'ผ่านเมื่อผลงานมากกว่าหรือเท่ากับเป้าหมาย',
  },
  lower_is_better: {
    value: 'lower_is_better',
    label: 'ยิ่งต่ำยิ่งดี',
    shortLabel: 'ต่ำ = ดี',
    hint: 'ผ่านเมื่อผลงานน้อยกว่าหรือเท่ากับเป้าหมาย',
  },
};

export const DEFAULT_EVALUATION_DIRECTION = 'higher_is_better';

export function normalizeEvaluationDirection(direction) {
  return EVALUATION_DIRECTIONS[direction]?.value || DEFAULT_EVALUATION_DIRECTION;
}

export function inferEvaluationDirection(targetString = '') {
  const target = String(targetString || '').toLowerCase();
  if (
    target.includes('<') ||
    target.includes('≤') ||
    target.includes('ลด') ||
    target.includes('ไม่เกิน') ||
    target.includes('น้อยกว่า')
  ) {
    return 'lower_is_better';
  }
  return DEFAULT_EVALUATION_DIRECTION;
}

export function resolveEvaluationDirection(direction, targetString = '') {
  if (direction && EVALUATION_DIRECTIONS[direction]) return direction;
  return inferEvaluationDirection(targetString);
}

export function calculateAchievementPercentage(current, targetString, direction) {
  if (current === '' || current === null || current === undefined) return null;

  const curVal = parseFloat(String(current).replace('−', '-'));
  const match = String(targetString || '').replace('−', '-').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const targetVal = parseFloat(match[0]);
  if (isNaN(curVal) || isNaN(targetVal) || targetVal === 0) return null;

  const resolvedDirection = resolveEvaluationDirection(direction, targetString);
  if (resolvedDirection === 'lower_is_better') {
    if (curVal <= targetVal) return 100;
    if (targetVal <= 0) return 0;
    return (targetVal / curVal) * 100;
  }
  return (curVal / targetVal) * 100;
}

export function isTargetPassed(current, targetString, direction) {
  const percentage = calculateAchievementPercentage(current, targetString, direction);
  return percentage !== null ? percentage >= 100 : null;
}
