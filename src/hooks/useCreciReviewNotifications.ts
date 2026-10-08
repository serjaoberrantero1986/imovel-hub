import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Toast } from '../context/appTypes';

export interface CreciReviewNotification { id: string; title: string; message: string; read: boolean; created_at: string; }

export function useCreciReviewNotifications(userId: string | null, addToast: (toast: Omit<Toast, 'id'>) => void, refreshProfile: () => Promise<unknown>) {
  const [notifications, setNotifications] = useState<CreciReviewNotification[]>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    setNotifications([]); seen.current.clear();
    if (!userId || !supabase) return;
    const client = supabase;
    let active = true;
    let busy = false;
    let initialized = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const { data, error } = await client.from('notifications').select('id,title,message,read,created_at')
          .eq('user_id', userId).contains('data', { scope: 'creci_review' }).order('created_at', { ascending: false }).limit(20);
        if (error || !active) return;
        const items = (data || []) as CreciReviewNotification[];
        setNotifications(items);
        const fresh = items.filter(item => !seen.current.has(item.id));
        fresh.filter(item => !item.read).slice(0, 1).forEach(item => addToast({ type: 'info', title: item.title, message: item.message }));
        items.forEach(item => seen.current.add(item.id));
        if (initialized && fresh.length && active) await refreshProfile();
        initialized = true;
      } catch { /* Durable notices remain in the database for the next refresh. */ }
      finally { busy = false; }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') void load(); };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [userId, addToast, refreshProfile]);
  const markRead = useCallback(async (id: string) => {
    if (!supabase || !userId) return;
    const { error } = await supabase.rpc('mark_my_creci_notification_read', { p_id: id });
    if (error) { addToast({ type: 'error', title: 'Aviso não atualizado', message: 'Tente novamente em instantes.' }); return; }
    setNotifications(items => items.map(item => item.id === id ? { ...item, read: true } : item));
  }, [userId, addToast]);
  return { notifications, markRead };
}
