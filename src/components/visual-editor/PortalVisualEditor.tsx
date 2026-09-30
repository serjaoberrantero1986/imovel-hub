import React, { useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Palette, RotateCcw, Save, Send, Trash2, X } from 'lucide-react';
import { PORTAL_TEMPLATES, PortalTemplateId, VisualPortalConfiguration, cloneVisualConfiguration, templateConfiguration } from '../../lib/visualPortalEditor';
import { Switch } from '../ui/Switch';

interface Props {
  configuration: VisualPortalConfiguration;
  busy?: boolean;
  onChange: (configuration: VisualPortalConfiguration) => void;
  onClose: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUploadHeroImage: (file: File) => Promise<void>;
}

const colorInputClass = 'mt-1.5 block h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800';

export const PortalVisualEditor: React.FC<Props> = ({ configuration, busy = false, onChange, onClose, onSaveDraft, onPublish, onUploadHeroImage }) => {
  const [tab, setTab] = useState<'templates' | 'hero' | 'sections'>('templates');
  const heroImageInput = useRef<HTMLInputElement>(null);
  const selectTemplate = (id: PortalTemplateId) => {
    const next = templateConfiguration(id);
    onChange({
      ...next,
      elements: configuration.elements,
      blocks: configuration.blocks,
      hero: {
        ...next.hero,
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
    <aside data-canvas-tools className="fixed inset-x-3 bottom-3 z-[90] mx-auto flex max-h-[calc(100vh-1.5rem)] w-auto max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-700 dark:bg-slate-900 md:inset-x-auto md:right-6 md:top-20 md:bottom-4 md:w-[380px] md:max-h-none">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"><Palette className="h-5 w-5" /></div>
          <div className="min-w-0"><h2 className="font-['Outfit'] text-base font-extrabold text-slate-900 dark:text-white">Modelos e página</h2><p className="text-[11px] text-slate-500 dark:text-slate-400">Prévia privada do seu portal</p></div>
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
              <span aria-hidden="true" className={`canvas-template-preview preview-${template.id}`} style={{ background: template.preview }}><i/><b/><em/><em/><em/></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-extrabold text-slate-900 dark:text-white">{template.name}</span><span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">{template.description}</span></span>
              {configuration.templateId === template.id && <Check className="h-4 w-4 shrink-0 text-rose-600" />}
            </button>)}
          </div>
        </>}

        {tab === 'hero' && <>
          <p className="text-xs text-slate-500">Feche este painel e clique diretamente no texto da página para escrevê-lo e formatá-lo.</p>
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Fundo da apresentação</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Utilize até cinco imagens otimizadas pelo estúdio de edição.</p></div>
          <div className="grid grid-cols-3 gap-2">{([['image', 'Imagem'], ['solid', 'Cor'], ['gradient', 'Degradê']] as const).map(([mode, label]) => <button key={mode} type="button" onClick={() => updateHero({ backgroundMode: mode })} className={`rounded-xl border px-2 py-2.5 text-xs font-bold ${configuration.hero.backgroundMode === mode ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{label}</button>)}</div>
          {configuration.hero.backgroundMode === 'image' && <div className="space-y-3">
            <input ref={heroImageInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void onUploadHeroImage(file); event.target.value = ''; }} />
            {configuration.hero.backgroundImages.length > 0 && <div className="grid grid-cols-2 gap-2">{configuration.hero.backgroundImages.map((image, index) => <div key={image.id} className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"><img src={image.url} alt={`Fundo ${index + 1}`} className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-[9px] font-bold text-white">{index + 1}</span><button type="button" onClick={() => updateHero({ backgroundImages: configuration.hero.backgroundImages.filter(item => item.id !== image.id) })} className="absolute right-2 top-2 rounded-lg bg-white/95 p-1.5 text-rose-600 shadow" aria-label={`Excluir fundo ${index + 1}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>}
            <button type="button" disabled={busy || configuration.hero.backgroundImages.length >= 5} onClick={() => heroImageInput.current?.click()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-indigo-300 dark:hover:bg-indigo-950/30">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{configuration.hero.backgroundImages.length >= 5 ? 'Limite de cinco imagens' : 'Adicionar imagem de fundo'}</button>
            {configuration.hero.backgroundImages.length > 1 && <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Trocar imagem a cada {configuration.hero.backgroundIntervalSeconds} segundos<input type="range" min="3" max="20" step="1" value={configuration.hero.backgroundIntervalSeconds} onChange={event => updateHero({ backgroundIntervalSeconds: Number(event.target.value) })} className="mt-2 w-full accent-rose-600" /></label>}
          </div>}
          {configuration.hero.backgroundMode === 'solid' && <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">Cor de fundo<input type="color" value={configuration.hero.solidColor} onChange={event => updateHero({ solidColor: event.target.value })} className={colorInputClass} /></label>}
          {configuration.hero.backgroundMode === 'gradient' && <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-700 dark:text-slate-200">Cor inicial<input type="color" value={configuration.hero.gradientStart} onChange={event => updateHero({ gradientStart: event.target.value })} className={colorInputClass} /></label><label className="text-xs font-bold text-slate-700 dark:text-slate-200">Cor final<input type="color" value={configuration.hero.gradientEnd} onChange={event => updateHero({ gradientEnd: event.target.value })} className={colorInputClass} /></label></div>}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Modelo das miniaturas</h3><div className="mt-3 grid grid-cols-3 gap-2">{([['route', 'Rota'], ['cards', 'Cards'], ['spotlight', 'Destaque']] as const).map(([style, label]) => <button key={style} type="button" onClick={() => updateHero({ propertySceneStyle: style })} className={`rounded-xl border px-2 py-2.5 text-[11px] font-bold ${configuration.hero.propertySceneStyle === style ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>{label}</button>)}</div></div>
          <Switch checked={configuration.hero.showPropertyScene} onChange={value => updateHero({ showPropertyScene: value })} label="Exibir miniaturas de imóveis" description="No celular, a apresentação continua simplificada para preservar desempenho." />
        </>}

        {tab === 'sections' && <>
          <div><h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Visibilidade das seções</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Clique em uma seção na página e use Espaçamento para alterar sua ordem.</p></div>
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
