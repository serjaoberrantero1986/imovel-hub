import { searchSimilarNeighborhoods } from '../../lib/neighborhoodCatalog';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';

type RegionOption = { value: string; label: string; key?: string | number };

interface OfficialRegionSelectProps {
  value: string;
  options: RegionOption[];
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  loading?: boolean;
  emptyLabel?: string;
  fuzzy?: boolean;
}

/** Seletor pesquisável usado nas regiões. Nunca aceita texto que não esteja no catálogo recebido. */
export const OfficialRegionSelect: React.FC<OfficialRegionSelectProps> = ({
  value, options, onChange, placeholder, ariaLabel, disabled = false, loading = false,
  emptyLabel = 'Nenhuma opção encontrada', fuzzy = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find(option => option.value === value);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if(!normalized) return options;
    if(fuzzy) {
      const matches=searchSimilarNeighborhoods(options.map(option=>option.label),query,25);
      return matches.flatMap(label=>options.filter(option=>option.label===label));
    }
    return options.filter(option=>option.label.toLocaleLowerCase('pt-BR').includes(normalized));
  }, [options, query, fuzzy]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const choose = (option: RegionOption) => {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className={`flex items-center gap-2 rounded-2xl border bg-white dark:bg-slate-900 px-3.5 py-2.5 transition-colors ${open ? 'border-indigo-500 ring-2 ring-indigo-500/15' : 'border-slate-200 dark:border-slate-700'} ${disabled ? 'opacity-60' : ''}`}>
        <Search className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          ref={inputRef}
          value={open ? query : (selected?.label || '')}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          placeholder={placeholder}
          onFocus={() => { if (!disabled) { setQuery(''); setOpen(true); } }}
          onChange={event => { setQuery(event.target.value); setOpen(true); }}
          onKeyDown={event => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter' && filtered[0]) { event.preventDefault(); choose(filtered[0]); }
          }}
          className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
        />
        {value && !disabled && <button type="button" aria-label={`Limpar ${ariaLabel}`} onClick={() => { onChange(''); setQuery(''); setOpen(false); }} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-3.5 h-3.5" /></button>}
        {loading ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-indigo-500" /> : <ChevronDown className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </div>
      {open && !disabled && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900" role="listbox" aria-label={ariaLabel}>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filtered.length === 0 && <div className="px-3 py-4 text-center text-xs text-slate-500">{loading ? 'Carregando opções...' : emptyLabel}</div>}
            {filtered.map(option => (
              <button key={option.key ?? option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => choose(option)} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-slate-700 transition-colors hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-indigo-950/40">
                <span>{option.label}</span>
                {option.value === value && <Check className="w-4 h-4 text-indigo-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
