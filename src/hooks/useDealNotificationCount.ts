import { useCallback, useEffect, useState } from 'react';
import { loadDealNotificationCount } from '../lib/dealDossiers';

export function useDealNotificationCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  const refresh = useCallback(() => {
    if (!enabled) { setCount(0); return; }
    void loadDealNotificationCount().then(setCount).catch(() => undefined);
  }, [enabled]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('deal-notifications-changed', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('deal-notifications-changed', refresh);
    };
  }, [refresh]);
  return count;
}
