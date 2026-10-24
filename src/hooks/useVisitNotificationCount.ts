import { useCallback, useEffect, useState } from 'react';
import { loadVisitNoticeCount } from '../lib/propertyVisits';

export function useVisitNotificationCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    if (!enabled) { setCount(0); return; }
    void loadVisitNoticeCount().then(setCount).catch(() => undefined);
  }, [enabled]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('property-visits-changed', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('property-visits-changed', refresh);
    };
  }, [refresh]);
  return count;
}
