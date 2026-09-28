import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string; description: string; activeCount: number; inactiveCount: number;
  open: boolean; onToggle: () => void; action: React.ReactNode; children: React.ReactNode;
}
export const AdminCatalogSection: React.FC<Props> = ({ title,description,activeCount,inactiveCount,open,onToggle,action,children }) => (
  <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
    <div className="p-4 sm:p-5 flex items-center gap-3">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex-1 min-w-0 text-left flex items-center gap-3">
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open?'rotate-180':''}`}/>
        <span className="min-w-0"><span className="block text-base font-black text-slate-900 dark:text-white font-['Outfit']">{title}</span><span className="block text-xs text-slate-500">{description}</span></span>
        <span className="hidden sm:flex ml-auto gap-2 text-[10px] font-bold"><span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">{activeCount} ativos</span><span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500">{inactiveCount} inativos</span></span>
      </button>
      {action}
    </div>
    {open&&<div className="border-t border-slate-100 dark:border-slate-800">{children}</div>}
  </section>
);
