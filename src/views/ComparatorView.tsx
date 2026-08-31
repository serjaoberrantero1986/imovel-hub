import React from 'react';
import { 
  Scale, 
  Trash2, 
  Check, 
  X, 
  BedDouble, 
  Bath, 
  Car, 
  Maximize2, 
  PlusCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AMENITIES_LIST } from '../lib/mockData';
import { formatCurrency, formatArea } from '../lib/utils';

export const ComparatorView: React.FC = () => {
  const { 
    properties, 
    comparisonIds, 
    toggleComparison, 
    clearComparison, 
    openPropertyDetail,
    setCurrentView 
  } = useApp();

  const comparedProperties = properties.filter(p => comparisonIds.includes(p.id));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold uppercase">
                Comparador Inteligente
              </span>
              <span className="text-xs text-slate-400 font-medium">Até 4 imóveis simultâneos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] mt-1">
              Comparação Lado a Lado
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Avalie minuciosamente valores, metragens, taxas de condomínio e infraestrutura
            </p>
          </div>

          {comparedProperties.length > 0 && (
            <button
              onClick={clearComparison}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Comparador</span>
            </button>
          )}
        </div>

        {comparedProperties.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
              <Scale className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit']">
              Nenhum imóvel selecionado para comparação
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Navegue pelos anúncios e clique no ícone de balança (<Scale className="w-3.5 h-3.5 inline text-indigo-500" />) para adicionar até 4 opções.
            </p>
            <button
              onClick={() => setCurrentView('search')}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md inline-flex items-center gap-2"
            >
              <span>Explorar Imóveis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              
              {/* Cards Header */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 w-44 bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold uppercase text-[10px]">
                    Especificações
                  </th>
                  {comparedProperties.map(prop => (
                    <th key={prop.id} className="p-4 w-64 align-top">
                      <div className="relative space-y-2">
                        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100">
                          <img src={prop.media[0]?.thumbnailUrl || prop.media[0]?.url} className="w-full h-full object-cover" />
                          <button
                            onClick={() => toggleComparison(prop.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                            title="Remover da comparação"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-400">Cód: {prop.code}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{prop.title}</h4>
                        <div className="text-base font-extrabold text-rose-600">{formatCurrency(prop.price)}</div>
                        <button
                          onClick={() => openPropertyDetail(prop.id)}
                          className="w-full py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                
                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Localização</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 text-slate-800 dark:text-slate-200 font-semibold">
                      {p.neighborhood}, {p.city}/{p.state}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Área Útil / Total</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 font-bold text-slate-900 dark:text-white">
                      {p.usefulArea} m² <span className="text-slate-400 font-normal">({p.totalArea} m² tot)</span>
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Valor por m²</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 font-bold text-indigo-600">
                      {p.pricePerMeter ? formatCurrency(p.pricePerMeter) : '-'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Dormitórios / Suítes</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 text-slate-800 dark:text-slate-200">
                      {p.bedrooms} quartos ({p.suites} suíte{p.suites > 1 ? 's' : ''})
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Banheiros</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 text-slate-800 dark:text-slate-200">
                      {p.bathrooms} banheiros
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Vagas de Garagem</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 text-slate-800 dark:text-slate-200">
                      {p.parkingSpots} vagas
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Taxa Condomínio</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 text-slate-800 dark:text-slate-200">
                      {p.condoFee ? formatCurrency(p.condoFee) : 'Isento'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">IPTU Mensal</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 text-slate-800 dark:text-slate-200">
                      {p.iptuFee ? formatCurrency(p.iptuFee) : 'Consulte'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 font-bold">Lazer & Comodidades</td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-4 text-slate-800 dark:text-slate-200 space-y-1">
                      {p.amenities.slice(0, 4).map(a => {
                        const am = AMENITIES_LIST.find(x => x.id === a);
                        return (
                          <div key={a} className="flex items-center gap-1.5 text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{am?.name || a}</span>
                          </div>
                        );
                      })}
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};
