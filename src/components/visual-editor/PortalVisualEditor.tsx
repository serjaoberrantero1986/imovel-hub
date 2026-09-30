import React, { useState } from 'react';
import { Check, Loader2, Palette, RotateCcw, Save, Send, X } from 'lucide-react';
import { PORTAL_TEMPLATES, PortalTemplateId, VisualPortalConfiguration, cloneVisualConfiguration, templateConfiguration } from '../../lib/visualPortalEditor';
import { Switch } from '../ui/Switch';

interface Props {
  configuration: VisualPortalConfiguration;
  busy?: boolean;
  onChange: (configuration: VisualPortalConfiguration) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}

const colorInputClass = 'mt-1.5 block h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800';

export const PortalVisualEditor: React.FC<Props> = ({ configuration, busy = false, onChange, onClose, onSaveDraft, onPublish }) => {
  const [tab, setTab] = useState<'templates' | 'hero' | 'sections'>('templates');
  const selectTemplate = (id: PortalTemplateId) => onChange(templateConfiguration(id));
  const updateHero = (change: Partial<VisualPortalConfiguration['hero']>) => onChange({ ...configuration, hero: { ...configuration.hero, ...change } });
  const updateSection = (id: VisualPortalConfiguration['sections'][number]['id'], isVisible: boolean) => onChange({
    ...configuration,
    sections: configuration.sections.map(section => section.id === id ? { ...section, isVisible } : section)
  });

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-h-[calc(100vh-1.5rem)] w-auto max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 md:inset-x-auto md:right-6 md:top-20 md:bottom-4 md:w-[380px] md:max-h-none">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><Palette className="h-5 w-5" /></div>
          <div className="min-w-0"><h2 className="font-['Outfit'] text-base font-extrabold text-slate-900 dark:text-white">Editor visual</h2><p className="text-[11px] text-slate-500 dark:text-slate-400">Prévia privada do seu portal</p></div>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Fechar editor"><X className="h-5 w-5" /></button>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-slate-100 p-2 dark:border-slate-800">
        {([['templates', 'Modelos'], ['hero', 'Apresentação'], ['sections', 'Seções']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-xl px-2 py-2 text-[11px] font-bold transition-colors ${tab === id ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{label}</button>)}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === 'templates' && <>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Escolha uma composição profissional como ponto de partida. Seus imóveis e dados reais não são alterados.</p>
          <div className="space-y-2.5">
            {PORTAL_TEMPLATES.map(template => <button key={template.id} type="button" onClick={() => selectTemplate(template.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${configuration.templateId === template.id ? 'border-rose-400 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}>
              <span className="h-12 w-16 shrink-0 rounded-xl border border-white/30 shadow-inner" style={{ background: template.preview }} />
              <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-slate-900 dark:text-white">{template.name}</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{template.description}</span></span>
              {configuration.templateId === template.id && <Check className="h-4 w-4 shrink-0 text-rose-600" />}
            </button>)}
          </div>
        </>}

        {tab === 'hero' && <>
          <div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Fundo da apresentação</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A imagem poderá ser trocada pelo editor de imagens em uma próxima etapa deste mesmo painel.</p></div>
          <div className="grid grid-cols-3 gap-2">{([['image', 'Imagem'], ['solid', 'Cor'], ['gradient', 'Degradê']] as const).map(([mode, label]) => <button key={mode} type="button" onClick={() => updateHero({ backgroundMode: mode })} className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${configuration.hero.backgroundMode === mode ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{label}</button>)}</div>
          {configuration.hero.backgroundMode === 'solid' && <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Cor de fundo<input type="color" value={configuration.hero.solidColor} onChange={event => updateHero({ solidColor: event.target.value })} className={colorInputClass} /></label>}
          {configuration.hero.backgroundMode === 'gradient' && <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-700 dark:text-slate-200">Cor inicial<input type="color" value={configuration.hero.gradientStart} onChange={event => updateHero({ gradientStart: event.target.value })} className={colorInputClass} /></label><label className="text-xs font-bold text-slate-700 dark:text-slate-200">Cor final<input type="color" value={configuration.hero.gradientEnd} onChange={event => updateHero({ gradientEnd: event.target.value })} className={colorInputClass} /></label></div>}
          <Switch checked={configuration.hero.showPropertyScene} onChange={value => updateHero({ showPropertyScene: value })} label="Exibir miniaturas de imóveis" description="No celular, a apresentação continua simplificada para preservar desempenho." />
        </>}

        {tab === 'sections' && <>
          <div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Visibilidade das seções</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Você poderá ordenar e duplicar blocos nesta lista nas próximas etapas.</p></div>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-700">{configuration.sections.map(section => <div key={section.id} className="flex items-center justify-between gap-3 py-3"><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{section.label}</span><Switch checked={section.isVisible} onChange={value => updateSection(section.id, value)} label={section.isVisible ? `Ocultar ${section.label}` : `Exibir ${section.label}`} /></div>)}</div>
        </>}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <button type="button" disabled={busy} onClick={() => onChange(cloneVisualConfiguration(templateConfiguration('essencial')))} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" />Restaurar ponto de partida</button>
        <button type="button" disabled={busy} onClick={onSaveDraft} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar rascunho</button>
        <button type="button" disabled={busy} onClick={onPublish} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publicar</button>
      </div>
    </aside>
  );
};
