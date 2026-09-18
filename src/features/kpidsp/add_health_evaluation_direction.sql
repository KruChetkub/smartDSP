ALTER TABLE health_indicators
ADD COLUMN IF NOT EXISTS evaluation_direction TEXT NOT NULL DEFAULT 'higher_is_better'
CHECK (evaluation_direction IN ('higher_is_better', 'lower_is_better'));

UPDATE health_indicators
SET evaluation_direction = 'lower_is_better'
WHERE evaluation_direction = 'higher_is_better'
  AND (
    target_q1 ILIKE '%ลด%'
    OR target_q2 ILIKE '%ลด%'
    OR target_q3 ILIKE '%ลด%'
    OR target_q4 ILIKE '%ลด%'
    OR target_q1 ILIKE '%ไม่เกิน%'
    OR target_q2 ILIKE '%ไม่เกิน%'
    OR target_q3 ILIKE '%ไม่เกิน%'
    OR target_q4 ILIKE '%ไม่เกิน%'
    OR target_q1 ILIKE '%น้อยกว่า%'
    OR target_q2 ILIKE '%น้อยกว่า%'
    OR target_q3 ILIKE '%น้อยกว่า%'
    OR target_q4 ILIKE '%น้อยกว่า%'
    OR target_q1 LIKE '%<%'
    OR target_q2 LIKE '%<%'
    OR target_q3 LIKE '%<%'
    OR target_q4 LIKE '%<%'
    OR target_q1 LIKE '%≤%'
    OR target_q2 LIKE '%≤%'
    OR target_q3 LIKE '%≤%'
    OR target_q4 LIKE '%≤%'
  );
