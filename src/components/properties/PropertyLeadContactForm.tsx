import React from 'react';
import { Send } from 'lucide-react';
import { LegalTab } from '../../context/AppContext';

interface PropertyLeadContactFormProps {
  leadName: string;
  setLeadName: (name: string) => void;
  leadPhone: string;
  setLeadPhone: (phone: string) => void;
  leadEmail: string;
  setLeadEmail: (email: string) => void;
  leadMessage: string;
  setLeadMessage: (msg: string) => void;
  leadHoneypot: string;
  setLeadHoneypot: (val: string) => void;
  isSubmittingLead: boolean;
  onSubmit: (e: React.FormEvent) => void;
  openLegalPage: (tab?: LegalTab) => void;
}

export const PropertyLeadContactForm: React.FC<PropertyLeadContactFormProps> = ({
  leadName,
  setLeadName,
  leadPhone,
  setLeadPhone,
  leadEmail,
  setLeadEmail,
  leadMessage,
  setLeadMessage,
  leadHoneypot,
  setLeadHoneypot,
  isSubmittingLead,
  onSubmit,
  openLegalPage
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2">
      {/* Honeypot field (hidden from legitimate humans, traps bots) */}
      <input
        type="text"
        name="website_secondary_check"
        tabIndex={-1}
        autoComplete="off"
        value={leadHoneypot}
        onChange={(e) => setLeadHoneypot(e.target.value)}
        className="opacity-0 absolute -z-50 pointer-events-none w-0 h-0 p-0 m-0 border-0"
        aria-hidden="true"
      />

      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Ou envie uma mensagem direta:
      </div>

      <div>
        <input
          type="text"
          required
          placeholder="Seu nome completo"
          value={leadName}
          onChange={(e) => setLeadName(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
        />
      </div>

      <div>
        <input
          type="tel"
          required
          placeholder="Seu telefone / WhatsApp (com DDD)"
          value={leadPhone}
          onChange={(e) => setLeadPhone(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
        />
      </div>

      <div>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={leadEmail}
          onChange={(e) => setLeadEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
        />
      </div>

      <div>
        <textarea
          rows={3}
          value={leadMessage}
          onChange={(e) => setLeadMessage(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmittingLead}
        className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        <span>{isSubmittingLead ? 'Enviando...' : 'Enviar Mensagem'}</span>
      </button>

      <p className="text-[10px] text-slate-400 text-center leading-tight">
        Ao enviar, você concorda com nossos{' '}
        <button
          type="button"
          onClick={() => openLegalPage('terms')}
          className="underline text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
        >
          Termos de Uso
        </button>{' '}
        e{' '}
        <button
          type="button"
          onClick={() => openLegalPage('privacy')}
          className="underline text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
        >
          Política de Privacidade
        </button>.
      </p>
    </form>
  );
};
