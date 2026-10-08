import React from 'react';
import { Building2 } from 'lucide-react';
import { useCatalog } from '../../context/AppContext';

/** One identity for navigation and every authentication step. */
export const PortalBrand: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { portalIdentity: identity } = useCatalog();
  return <span className="flex items-center gap-3 min-w-0">
    {identity.logoUrl ? <img src={identity.logoUrl} alt={`Logotipo ${identity.portalName}`} className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl object-contain shrink-0`} /> :
      <span className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl flex items-center justify-center text-white shadow-md shrink-0`} style={{ background: `linear-gradient(135deg,${identity.accentColor},${identity.primaryColor},${identity.secondaryColor})` }}><Building2 className={compact ? 'w-4 h-4' : 'w-6 h-6'} /></span>}
    <span className={compact ? 'min-w-0 pr-7' : 'hidden sm:block min-w-0'}>
      <span className={`block font-extrabold tracking-tight text-slate-900 dark:text-white font-['Outfit'] ${compact ? 'text-base' : 'text-xl'}`}>{identity.portalName}</span>
      {!compact && <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:block">{identity.slogan}</span>}
    </span>
  </span>;
};
