import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import {
  DEFAULT_AUTO_LOGOUT_MINUTES,
  loadLoginSecuritySettings,
  SYSTEM_SETTINGS_UPDATED_EVENT,
  type LoginSecuritySettings,
} from '../../../services/system-settings.service';
import { reportClientError } from '../../../utils/errorHandling';

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;
const SETTINGS_REFRESH_INTERVAL_MS = 60_000;

export function useAutoLogoutTimer(enabled: boolean) {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutesRef = useRef(DEFAULT_AUTO_LOGOUT_MINUTES);
  const lastActivityAtRef = useRef(Date.now());
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    lastActivityAtRef.current = Date.now();
    signingOutRef.current = false;

    const clearAutoLogoutTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const runAutoLogout = async () => {
      if (signingOutRef.current) {
        return;
      }

      signingOutRef.current = true;

      try {
        await signOut();
      } finally {
        navigate('/login', { replace: true, state: { reason: 'auto-logout' } });
      }
    };

    const scheduleAutoLogout = () => {
      clearAutoLogoutTimer();
      const timeoutMs = minutesRef.current * 60 * 1000;
      const inactiveMs = Date.now() - lastActivityAtRef.current;
      const remainingMs = Math.max(0, timeoutMs - inactiveMs);
      timerRef.current = setTimeout(() => {
        void runAutoLogout();
      }, remainingMs);
    };

    const resetAutoLogoutTimer = () => {
      lastActivityAtRef.current = Date.now();
      scheduleAutoLogout();
    };

    const applySettings = (settings: LoginSecuritySettings, forceSchedule = false) => {
      const changed = minutesRef.current !== settings.autoLogoutMinutes;
      minutesRef.current = settings.autoLogoutMinutes;
      if (changed || forceSchedule) {
        scheduleAutoLogout();
      }
    };

    const loadSettings = async (forceSchedule = false) => {
      try {
        const settings = await loadLoginSecuritySettings();
        if (!isMounted) return;

        applySettings(settings, forceSchedule);
      } catch (error) {
        void reportClientError('Auto logout setting fallback:', error);
        if (forceSchedule) {
          applySettings({ autoLogoutMinutes: DEFAULT_AUTO_LOGOUT_MINUTES }, true);
        }
      }
    };

    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<LoginSecuritySettings>;
      if (customEvent.detail?.autoLogoutMinutes) {
        applySettings(customEvent.detail, true);
        return;
      }

      void loadSettings(true);
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetAutoLogoutTimer, { passive: true });
    });
    window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    void loadSettings(true);
    const settingsRefreshTimer = window.setInterval(() => void loadSettings(), SETTINGS_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearAutoLogoutTimer();
      window.clearInterval(settingsRefreshTimer);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetAutoLogoutTimer);
      });
      window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, handleSettingsUpdated);
    };
  }, [enabled, navigate, signOut]);
}
