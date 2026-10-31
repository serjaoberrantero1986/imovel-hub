import React from 'react';
import { Clock3, FileText } from 'lucide-react';

const labels: Record<string, string> = {
  negotiated_value: 'Valor negociado',
  payment_terms: 'Forma de pagamento',
  deadline: 'Prazo principal',
  possession_event: 'Entrega da posse ou chaves',
  brokerage_terms: 'Corretagem e responsável pelo pagamento',
  special_conditions: 'Condições especiais'
};

export const negotiationKindLabels: Record<string, string> = {
  proposal: 'Proposta',
  counterproposal: 'Contraproposta',
  consolidated_terms: 'Condições consolidadas'
};

export const NegotiationDocumentContent: React.FC<{
  title: string;
  terms: Record<string, unknown>;
  notes?: string;
  contentHash: string;
  expiresAt?: string;
}> = ({ title, terms, notes, contentHash, expiresAt }) => (
  <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-slate-900">
    <div className="flex items-start gap-3">
      <FileText className="mt-0.5 h-6 w-6 text-rose-600" />
      <div>
        <h2 className="font-black">{title}</h2>
        <p className="text-xs text-slate-500">Esta manifestação vale somente para a versão e o hash exibidos abaixo.</p>
      </div>
    </div>
    <dl className="mt-5 space-y-3">
      {Object.entries(terms || {}).filter(([, value]) => value).map(([key, value]) => (
        <div key={key} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <dt className="text-[10px] font-black uppercase text-slate-400">{labels[key] || key}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{String(value)}</dd>
        </div>
      ))}
    </dl>
    {notes && <div className="mt-3 rounded-2xl border border-amber-200 p-4 dark:border-amber-900">
      <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">Observações</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{notes}</p>
    </div>}
    <p className="mt-4 break-all text-[9px] text-slate-400">Hash de integridade: {contentHash}</p>
    {expiresAt && <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Link válido até {new Date(expiresAt).toLocaleString('pt-BR')}.</p>}
  </section>
);
