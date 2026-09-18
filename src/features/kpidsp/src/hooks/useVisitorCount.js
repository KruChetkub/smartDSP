import { useState, useEffect } from 'react';
import { getPublicVisitStats, recordPublicPageVisit } from '../../../../services/public-analytics.service';

/**
 * useVisitorCount
 * - เชื่อมต่อกับระบบสถิติผู้เข้าชมหลักของ SmartDSP (get_public_visit_stats)
 * - ดึงจำนวน session รวม และจำนวน session วันนี้
 * - ป้องกัน error 404 จากตารางเก่า visitor_sessions
 */
export function useVisitorCount() {
  const [totalVisitors, setTotalVisitors] = useState(null);
  const [todayVisitors, setTodayVisitors] = useState(null);
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    todaySessions: 0,
    visitorId: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        // บันทึกการเข้าชมตามระบบของ SmartDSP (ถ้าได้รับความยินยอม)
        recordPublicPageVisit(window.location.pathname).catch(() => {});

        // ดึงสถิติจาก SmartDSP Analytics RPC
        const stats = await getPublicVisitStats();

        if (isMounted) {
          const total = stats.totalVisitors ?? 0;
          const today = stats.todayVisitors ?? 0;

          setTotalVisitors(total);
          setTodayVisitors(today);
          setMetrics({
            totalSessions: total,
            todaySessions: today,
            visitorId: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setTotalVisitors(0);
          setTodayVisitors(0);
          setMetrics({
            totalSessions: 0,
            todaySessions: 0,
            visitorId: null,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    totalVisitors,
    todayVisitors,
    isLoading,
    metrics,
  };
}
