export function isMeaningfulKpiValue(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return text !== "" && text !== "-";
}

export function buildPipelineStats(items) {
  const total = items.length;
  const reported = items.filter((item) => item.reported).length;
  const assessed = items.filter((item) => item.assessed).length;

  return {
    total,
    reported,
    assessed,
    pending: Math.max(0, total - reported),
  };
}
