import { useCallback, useEffect, useRef, useState } from 'react';
import { listPendingCreciReviews } from '../lib/creciDocuments';

const POLL_INTERVAL_MS = 30_000;

const playAdministrativeAlert = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(740, context.currentTime);
    oscillator.frequency.setValueAtTime(920, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.1, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
  } catch {
    // Browsers may block audio until the first user interaction.
  }
};

export const useAdminCreciNotifications = (enabled: boolean) => {
  const [pendingCount, setPendingCount] = useState(0);
  const previousCount = useRef<number | null>(null);

  const refreshPendingCount = useCallback(async () => {
    if (!enabled) return 0;
    const reviews = await listPendingCreciReviews();
    const nextCount = reviews.length;
    if (previousCount.current !== null && nextCount > previousCount.current) {
      playAdministrativeAlert();
    }
    previousCount.current = nextCount;
    setPendingCount(nextCount);
    return nextCount;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      previousCount.current = null;
      setPendingCount(0);
      return;
    }

    void refreshPendingCount().catch(() => undefined);
    const timer = window.setInterval(() => {
      void refreshPendingCount().catch(() => undefined);
    }, POLL_INTERVAL_MS);
    const handleQueueChange = () => void refreshPendingCount().catch(() => undefined);
    window.addEventListener('creci-review-updated', handleQueueChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('creci-review-updated', handleQueueChange);
    };
  }, [enabled, refreshPendingCount]);

  return { pendingCount, refreshPendingCount };
};
