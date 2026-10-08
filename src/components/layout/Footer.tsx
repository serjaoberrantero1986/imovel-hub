import React from 'react';
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, Linkedin, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCatalog } from '../../context/CatalogContext';
import { CanvasInsertedBlocks, EditableBox, EditableImage, EditableText } from '../visual-editor/PortalCanvas';
import { usePortalEditorShell } from '../visual-editor/PortalEditorProvider';

export const Footer: React.FC = () => {
  const { publicProperties, setCurrentView, setFilters, openLegalPage, currentView } = useApp();
  const editor = usePortalEditorShell();
  const { activePropertyTypes, propertyTypesError, footerSettings, portalIdentity } = useCatalog();
  const availableCities = React.useMemo(() => Array.from(new Set(publicProperties.map(item => item.city?.trim()).filter(Boolean) as string[])).sort(), [publicProperties]);
  const availableNeighborhoods = React.useMemo(() => Array.from(new Set(publicProperties.map(item => item.neighborhood?.trim()).filter(Boolean) as string[])).sort(), [publicProperties]);
  const fallbackPropertyTypes = [{id:'apartment',label:'Apartamento'},{id:'house',label:'Casa de Bairro'},{id:'condo_house',label:'Casa em Condomínio'},{id:'land',label:'Terreno'},{id:'chacara',label:'Chácara'},{id:'farm',label:'Sítio/Fazenda'},{id:'commercial',label:'Comercial'},{id:'launch',label:'Lançamento'}];
  const propertyTypes = propertyTypesError ? fallbackPropertyTypes : activePropertyTypes.map(item => ({ id:item.id,label:item.name }));
  const openSearch = (searchTerm:string, city?:string) => { setFilters(current => ({...current,city:city||current.city,searchTerm})); setCurrentView('search'); window.scrollTo({top:0,behavior:'smooth'}); };
  const socials = [{url:footerSettings.instagramUrl,label:'Instagram',Icon:Instagram},{url:footerSettings.facebookUrl,label:'Facebook',Icon:Facebook},{url:footerSettings.youtubeUrl,label:'YouTube',Icon:Youtube},{url:footerSettings.linkedinUrl,label:'LinkedIn',Icon:Linkedin}];

  return <EditableBox as="section" id="footer.root" label="Rodapé do portal" className="relative bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
    {editor.canEdit && !editor.editing && (currentView === 'portal' || currentView === 'legal') && <button type="button" data-canvas-tools disabled={editor.busy} onClick={() => void editor.openEditor('footer.root')} className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-lg hover:border-rose-400 hover:bg-slate-700 disabled:opacity-60 sm:right-6">Editar rodapé</button>}
    <footer><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
        <EditableBox id="footer.brand" label="Identidade no rodapé" className="space-y-4">
          <div className="flex items-center gap-3"><EditableImage id="footer.logo" label="Logotipo do rodapé" src={portalIdentity.logoUrl || '/icon.svg'} objectFit="contain" className="w-10 h-10 rounded-xl overflow-hidden shrink-0"/><EditableText id="footer.portalName" label="Nome do portal" className="font-extrabold text-2xl text-white font-['Outfit']">{portalIdentity.portalName}</EditableText></div>
          <EditableText as="p" id="footer.brandDescription" label="Descrição do portal" className="text-sm text-slate-400 leading-relaxed">{footerSettings.brandDescription}</EditableText>
          <div className="space-y-1 text-xs text-slate-400"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0"/><EditableText id="footer.creci" label="CRECI">{footerSettings.creci}</EditableText></div><EditableText as="div" id="footer.professionalName" label="Nome profissional" className="pl-6">{footerSettings.professionalName}</EditableText></div>
        </EditableBox>
        <EditableBox id="footer.service" label="Central de atendimento" className="space-y-3">
          <EditableText as="h3" id="footer.serviceTitle" label="Título do atendimento" className="text-sm font-bold uppercase tracking-wider text-white">{footerSettings.serviceTitle}</EditableText>
          <ul className="space-y-2.5 text-sm"><li className="flex items-center gap-2.5 text-slate-400"><Phone className="w-4 h-4 text-rose-500"/><EditableText id="footer.phone" label="Telefone">{footerSettings.phone}</EditableText></li><li className="flex items-center gap-2.5 text-slate-400"><Mail className="w-4 h-4 text-rose-500"/><EditableText id="footer.email" label="E-mail">{footerSettings.email}</EditableText></li><li className="flex items-start gap-2.5 text-slate-400"><MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-1"/><EditableText id="footer.address" label="Endereço">{footerSettings.address}</EditableText></li></ul>
          <EditableText as="p" id="footer.businessHours" label="Horário de atendimento" className="text-xs text-slate-500 pt-2">{footerSettings.businessHours}</EditableText>
        </EditableBox>
        <EditableBox id="footer.navigation" label="Navegação do rodapé" className="space-y-3">
          <EditableText as="h3" id="footer.navigationTitle" label="Título da navegação" className="text-sm font-bold uppercase tracking-wider text-white">{footerSettings.navigationTitle}</EditableText>
          <ul className="space-y-2 text-sm">{propertyTypes.map(type=><li key={type.id}><button onClick={()=>{setFilters(current=>({...current,types:[type.id as any],purpose:'all',searchTerm:''}));setCurrentView('search');window.scrollTo({top:0,behavior:'smooth'});}} className="hover:text-rose-400 transition-colors text-left">{type.label}</button></li>)}</ul>
        </EditableBox>
        <EditableBox id="footer.connection" label="Conexão e newsletter" className="space-y-3">
          <EditableText as="h3" id="footer.connectionTitle" label="Título da conexão" className="text-sm font-bold uppercase tracking-wider text-white">{footerSettings.connectionTitle}</EditableText>
          <EditableText as="p" id="footer.newsletterText" label="Texto da newsletter" className="text-xs text-slate-400">{footerSettings.newsletterText}</EditableText>
          <div className="flex gap-2"><input type="email" placeholder="Seu e-mail" className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"/><button className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"><EditableText id="footer.newsletterButton" label="Botão da newsletter">Enviar</EditableText></button></div>
          <div className="flex gap-3 pt-2">{socials.filter(item=>/^https?:\/\//i.test(item.url)).map(({url,label,Icon})=><a key={label} href={url} target="_blank" rel="noreferrer" aria-label={label} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"><Icon className="w-4 h-4"/></a>)}</div>
        </EditableBox>
      </div>
      <EditableBox id="footer.locations" label="Localidades do rodapé" className="py-8 border-b border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-400">
        <div><EditableText as="h3" id="footer.neighborhoodsTitle" label="Título dos bairros" className="font-semibold text-slate-200 mb-2.5">Bairros com imóveis disponíveis:</EditableText><div className="flex flex-wrap gap-2">{availableNeighborhoods.length?availableNeighborhoods.map(item=><button key={item} onClick={()=>openSearch(item)} className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white">{item}</button>):<EditableText id="footer.noNeighborhoods" label="Estado vazio dos bairros" className="text-slate-500 italic">Nenhum bairro cadastrado no momento</EditableText>}</div></div>
        <div><EditableText as="h3" id="footer.citiesTitle" label="Título das cidades" className="font-semibold text-slate-200 mb-2.5">Cidades com imóveis disponíveis:</EditableText><div className="flex flex-wrap gap-2">{availableCities.length?availableCities.map(item=><button key={item} onClick={()=>openSearch(item,item)} className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 hover:text-white">{item}</button>):<EditableText id="footer.noCities" label="Estado vazio das cidades" className="text-slate-500 italic">Nenhuma cidade cadastrada no momento</EditableText>}</div></div>
      </EditableBox>
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4"><EditableText as="p" id="footer.copyright" label="Direitos autorais">{footerSettings.copyrightText}</EditableText><div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2"><button onClick={()=>openLegalPage('terms')} className="hover:text-slate-300"><EditableText id="footer.link.terms" label="Link Termos">Termos de Uso</EditableText></button><button onClick={()=>openLegalPage('privacy')} className="hover:text-slate-300"><EditableText id="footer.link.privacy" label="Link Privacidade">Política de Privacidade (LGPD)</EditableText></button><button onClick={()=>openLegalPage('consumer')} className="hover:text-slate-300"><EditableText id="footer.link.consumer" label="Link Consumidor">Código de Defesa do Consumidor</EditableText></button><button onClick={()=>openLegalPage('cookies')} className="hover:text-slate-300"><EditableText id="footer.link.cookies" label="Link Cookies">Preferências de Cookies</EditableText></button></div></div>
      <CanvasInsertedBlocks scope="footer"/>
    </div></footer>
  </EditableBox>;
};
