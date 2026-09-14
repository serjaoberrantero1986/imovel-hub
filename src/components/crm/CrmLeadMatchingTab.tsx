import React from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { Lead, Property } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { MatchScoreResult } from '../../lib/crmMatching';

interface CrmLeadMatchingTabProps {
  lead: Lead;
  topMatches: { property: Property; match: MatchScoreResult }[];
  onToggleInterestProperty: (leadId: string, propertyId: string) => Promise<void>;
  onShareWhatsApp: (property: Property) => void;
}

export const CrmLeadMatchingTab: React.FC<CrmLeadMatchingTabProps> = ({
  lead,
  topMatches,
  onToggleInterestProperty,
  onShareWhatsApp,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
            Sistema de Match de Imóveis Inteligente
          </h4>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            Calcula a compatibilidade do perfil do cliente (orçamento, finalidade, tipologia, bairros desejados, número de quartos e comodidades) contra o catálogo ativo de imóveis.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {topMatches.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhum imóvel compatível encontrado no momento.
          </div>
        ) : (
          topMatches.map(({ property, match }) => {
            const isInterest = lead.interestedPropertyIds?.includes(property.id);

            return (
              <div
                key={property.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Property Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={property.media?.[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
                    alt={property.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {property.title}
                      </h5>
                      <span className="text-[10px] font-mono text-slate-400">
                        {property.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      📍 {property.neighborhood}, {property.city} • {property.bedrooms} qtos • {property.totalArea} m²
                    </p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                      {formatCurrency(property.price)}
                    </p>
                  </div>
                </div>

                {/* Match Score & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Score Badge */}
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-black font-mono px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                      match.score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                      match.score >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      <Sparkles className="w-3 h-3" />
                      {match.score}% Match
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {match.criteria.filter(c => c.passed).length}/{match.criteria.length} critérios compatíveis
                    </span>
                  </div>

                  {/* Toggle Interest */}
                  <button
                    type="button"
                    onClick={() => onToggleInterestProperty(lead.id, property.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      isInterest
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isInterest ? '★ Na Carteira' : '+ Interessado'}
                  </button>

                  {/* WhatsApp Share */}
                  <button
                    type="button"
                    onClick={() => onShareWhatsApp(property)}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 transition-colors"
                    title="Enviar ficha do imóvel no WhatsApp do cliente"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
