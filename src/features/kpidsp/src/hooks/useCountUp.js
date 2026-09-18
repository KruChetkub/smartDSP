import { useState, useEffect, useRef } from 'react';

/**
 * useCountUp — animates a number from 0 to `target` over `duration` ms
 * Safe to use: does not affect any data fetching or business logic
 */
export function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const prevTargetRef = useRef(null);

  useEffect(() => {
    const numTarget = parseFloat(target);
    if (isNaN(numTarget)) {
      setCount(target); // Pass through non-numeric values (e.g., '-')
      return;
    }

    // Skip animation when target hasn't changed
    if (prevTargetRef.current === numTarget) return;
    prevTargetRef.current = numTarget;

    // Cancel any previous frame
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    startRef.current = null;

    const isDecimal = String(target).includes('.');
    const decimalPlaces = isDecimal ? String(target).split('.')[1]?.length || 2 : 0;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numTarget;

      if (isDecimal) {
        setCount(current.toFixed(decimalPlaces));
      } else {
        setCount(Math.round(current));
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}
