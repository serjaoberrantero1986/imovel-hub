import React from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CreciReviewNotice: React.FC = () => {
  const { creciNotifications, markCreciNotificationRead } = useApp();
  if (!creciNotifications.length) return null;
  return <section aria-label="Avisos sobre seu registro profissional" className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Bell className="w-4 h-4 text-indigo-500" />Avisos da análise profissional</h3>
    {creciNotifications.map(item => <article key={item.id} className="border-t border-indigo-100 dark:border-indigo-900 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-slate-900 dark:text-white">{item.title}</strong><time className="text-[10px] text-slate-500">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.created_at))}</time></div>
      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap break-words">{item.message}</p>
      {!item.read && <button type="button" onClick={() => void markCreciNotificationRead(item.id)} className="mt-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">Marcar como lido</button>}
    </article>)}
  </section>;
};
