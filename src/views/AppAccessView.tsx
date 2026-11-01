import React from 'react';
import { ArrowRight, Building2, Heart, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PortalBrand } from '../components/ui/PortalBrand';

export const AppAccessView: React.FC = () => {
  const { openAuthModal } = useApp();
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-5 py-12 dark:bg-slate-950">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,.12),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,.10),transparent_36%)]" />
    <section className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid lg:grid-cols-[1.1fr_.9fr]">
        <div className="p-7 sm:p-10 lg:p-14">
          <PortalBrand />
          <p className="mt-10 text-xs font-extrabold uppercase tracking-[.22em] text-rose-600">Área segura</p>
          <h1 className="mt-3 max-w-xl font-['Outfit'] text-4xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">Seu negócio imobiliário continua aqui.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">Acesse imóveis favoritos, atendimentos e todas as ferramentas profissionais em um único endereço.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => openAuthModal('login')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700">Entrar na minha conta <ArrowRight className="h-4 w-4" /></button>
            <button type="button" onClick={() => openAuthModal('signup')} className="rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">Criar conta</button>
          </div>
        </div>
        <div className="grid gap-4 bg-slate-950 p-7 text-white sm:p-10 lg:content-center">
          {[['Portal profissional', 'Administre anúncios, leads e documentos.', Building2], ['Jornada do comprador', 'Retome favoritos, mensagens e buscas salvas.', Heart], ['Acesso centralizado', 'Uma sessão protegida para todos os portais.', ShieldCheck]].map(([title, description, Icon]) => <div key={String(title)} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400"><Icon className="h-5 w-5" /></span><div><h2 className="font-extrabold">{title as string}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{description as string}</p></div></div>)}
        </div>
      </div>
    </section>
  </main>;
};
