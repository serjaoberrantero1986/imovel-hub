import React, { useState } from 'react';
import { Check, Loader2, Palette, RotateCcw, Send, X } from 'lucide-react';
import { PORTAL_TEMPLATES, PortalTemplateId, VisualPortalConfiguration, cloneVisualConfiguration, templateConfiguration } from '../../lib/visualPortalEditor';
import { HeroControls, HeroControlsProps } from './HeroControls';
import { useDraggableSurface } from './useDraggableSurface';
import { Switch } from '../ui/Switch';

interface Props {
  configuration: VisualPortalConfiguration;
  busy?: boolean;
  onChange: (configuration: VisualPortalConfiguration) => void;
  onClose: () => void;
  onPublish: () => void;
  onPrepareImage: HeroControlsProps['onPrepareImage'];
}


export const PortalVisualEditor: React.FC<Props> = ({ configuration, busy = false, onChange, onClose, onPublish, onPrepareImage }) => {
  const [tab, setTab] = useState<'templates' | 'hero' | 'sections'>('templates');
  const movable = useDraggableSurface();
  const selectTemplate = (id: PortalTemplateId) => {
    const next = templateConfiguration(id);
    onChange({
      ...next,
      elements: configuration.elements,
      sections: configuration.sections,
      blocks: configuration.blocks,
      hero: {
        ...configuration.hero,
        propertySceneStyle: next.hero.propertySceneStyle,
        line1: configuration.hero.line1,
        line2: configuration.hero.line2,
        line3: configuration.hero.line3,
        subtitle: configuration.hero.subtitle,
        backgroundImages: configuration.hero.backgroundImages,
        backgroundIntervalSeconds: configuration.hero.backgroundIntervalSeconds
      }
    });
  };
  const updateHero = (change: Partial<VisualPortalConfiguration['hero']>) => onChange({ ...configuration, hero: { ...configuration.hero, ...change } });
  const updateSection = (id: VisualPortalConfiguration['sections'][number]['id'], isVisible: boolean) => onChange({
    ...configuration,
    sections: configuration.sections.map(section => section.id === id ? { ...section, isVisible } : section)
  });

  return (
    <aside ref={node=>{movable.surfaceRef.current=node;}} style={movable.surfaceStyle} data-canvas-tools className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-h-[calc(100vh-1.5rem)] w-auto max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 md:inset-x-auto md:right-6 md:top-20 md:bottom-4 md:w-[380px] md:max-h-none">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <button type="button" className="canvas-window-drag" {...movable.handleProps}>⠿</button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><Palette className="h-5 w-5" /></div>
          <div className="min-w-0"><h2 className="font-['Outfit'] text-base font-extrabold text-slate-900 dark:text-white">Modelos e página</h2><p className="text-[11px] text-slate-500 dark:text-slate-400">Prévia privada do seu portal</p></div>
        </div>
        <button type="button" disabled={busy} onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Fechar editor"><X className="h-5 w-5" /></button>
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-slate-100 p-2 dark:border-slate-800">
        {([['templates', 'Modelos'], ['hero', 'Apresentação'], ['sections', 'Seções']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-xl px-2 py-2 text-[11px] font-bold transition-colors ${tab === id ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{label}</button>)}
      </div>

      <fieldset disabled={busy} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {tab === 'templates' && <>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Escolha uma composição profissional como ponto de partida. Seus imóveis e dados reais não são alterados.</p>
          <div className="space-y-2.5">
            {PORTAL_TEMPLATES.map(template => <button key={template.id} type="button" onClick={() => selectTemplate(template.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${configuration.templateId === template.id ? 'border-rose-400 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}>
              <span aria-hidden="true" className={`canvas-template-preview preview-${template.id}`} style={{ background: template.preview }}><i/><b/><em/><em/><em/></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-slate-900 dark:text-white">{template.name}</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{template.description}</span></span>
              {configuration.templateId === template.id && <Check className="h-4 w-4 shrink-0 text-rose-600" />}
            </button>)}
          </div>
        </>}

        {tab === 'hero' && <HeroControls hero={configuration.hero} onChange={updateHero} onPrepareImage={onPrepareImage} busy={busy}/>}

        {tab === 'sections' && <>
          <div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Visibilidade das seções</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Clique em uma seção na página e use Espaçamento para alterar sua ordem.</p></div>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 px-3 dark:divide-slate-800 dark:border-slate-700">{configuration.sections.map(section => <div key={section.id} className="flex items-center justify-between gap-3 py-3"><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{section.label}</span><Switch checked={section.isVisible} onChange={value => updateSection(section.id, value)} label={section.isVisible ? `Ocultar ${section.label}` : `Exibir ${section.label}`} /></div>)}</div>
        </>}
      </fieldset>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <button type="button" disabled={busy} onClick={() => {if(window.confirm("Restaurar o modelo inicial? Esta ação pode ser desfeita."))onChange(cloneVisualConfiguration(templateConfiguration('essencial')));}} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" />Restaurar ponto de partida</button>
        <button type="button" disabled={busy} onClick={onPublish} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-3 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publicar</button>
      </div>
    </aside>
  );
};
