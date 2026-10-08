import { useEffect, useState } from 'react';

/** A deadline keeps the remaining time correct when a browser throttles its timers. */
export function useResendCooldown() {
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (!next) setDeadline(0);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [deadline]);
  return {
    remaining,
    isBlocked: () => deadline > Date.now(),
    start: () => { setDeadline(Date.now() + 60_000); setRemaining(60); }
  };
}
