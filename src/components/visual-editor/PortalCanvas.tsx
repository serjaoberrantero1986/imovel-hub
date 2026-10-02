import { FloatingEditorBar } from './FloatingEditorBar';
import { HeroControls, HeroControlsProps } from './HeroControls';
import { installPortalEditorGuard } from '../../lib/portalEditorGuard';
import { applyMarks, toggleList, insertMarkedText, markState, Mark, Marks } from '../../lib/portalRichText';
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Undo2, Redo2, X, Plus, Send, Palette, ArrowUp, ArrowDown, Copy, Trash2, ImagePlus, Home, MapPin, ShieldCheck, Star, Heart, Phone } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { VisualPortalConfiguration } from '../../lib/visualPortalEditor';
import { CANVAS_FONTS, CanvasElement, CanvasBlock, cleanRichText, escapeText, safeLink, TEMPLATE_ORDERS, elementStyle, Gradient } from '../../lib/portalCanvas';

import './portal-canvas.css';

type Selection = { id: string; label: string; kind: 'text' | 'box' | 'image' | 'icon' | 'hero'; node: HTMLElement };
interface CanvasContextValue {
  editing: boolean;
  viewport: 'desktop'|'tablet'|'mobile';
  pendingMarks: React.MutableRefObject<Marks | null>;
  value: VisualPortalConfiguration;
  select: (selection: Selection) => void;
  update: (id: string, patch: Partial<CanvasElement>) => void;
  selected: string | undefined;
  reorder: (from: string, to: string) => void;
}
const CanvasContext = createContext<CanvasContextValue | null>(null);
export const usePortalEditing = () => useContext(CanvasContext)?.editing || false;
const icons = { Home, MapPin, ShieldCheck, Star, Heart, Phone };
const iconLabels = { Home: 'Casa', MapPin: 'Localização', ShieldCheck: 'Segurança', Star: 'Estrela', Heart: 'Coração', Phone: 'Telefone' };

export function PortalCanvas({ children, value, editing, busy, onChange, onPublish, onClose, onSettings, unpublished, onDiscard, onUndo, onRedo, canUndo, canRedo, onPrepareImage }:
  { children: React.ReactNode; value: VisualPortalConfiguration; editing: boolean; busy: boolean; ownerId: string;
    onChange: (v: VisualPortalConfiguration) => void; unpublished: boolean; onDiscard: () => void; onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean; onPrepareImage: HeroControlsProps['onPrepareImage']; onPublish: () => void; onClose: () => void; onSettings: () => void }) {
  const [viewport,setViewport]=useState<'desktop'|'tablet'|'mobile'>(window.innerWidth<768?'mobile':window.innerWidth<1024?'tablet':'desktop');
  const [styleTarget,setStyleTarget]=useState<'desktop'|'tablet'|'mobile'>('desktop');
  const pendingMarks=useRef<Marks|null>(null);
  const [marks,setMarks]=useState<Record<Mark,boolean|'mixed'>>({bold:false,italic:false,underline:false,strike:false});
  useEffect(()=>{const resize=()=>setViewport(window.innerWidth<768?'mobile':window.innerWidth<1024?'tablet':'desktop');window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  const [selection, setSelection] = useState<Selection>();
  const [position, setPosition] = useState({ left: 12, top: 150 });
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'content'|'style'|'layout'>('content');
  const latest = useRef(value);
  latest.current = value;
  const fileInput = useRef<HTMLInputElement>(null);
  const range = useRef<Range | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(260);
  const change = (next: VisualPortalConfiguration) => {if(busy)return;latest.current=next;onChange(next);};
  const update = (id: string, patch: Partial<CanvasElement>) => {
    const current = latest.current;
    change({ ...current, elements: { ...current.elements, [id]: { ...current.elements?.[id], ...patch } } });
  };
  useEffect(() => { if (!editing) setSelection(undefined); }, [editing]);
  useLayoutEffect(() => {
    if (!selection || !panel.current) return;
    const observer = new ResizeObserver(() => setPanelHeight(panel.current?.offsetHeight || 260));
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [selection, tab]);
  useEffect(() => {
    if (!selection) return;
    const locate = () => {
      const rect = selection.node.getBoundingClientRect();
      const below = rect.bottom + 10;
      setPosition({ left: Math.max(8, Math.min(window.innerWidth - 348, rect.left)),
        top: Math.max(100, Math.min(window.innerHeight - panelHeight - 12, below)) });
    };
    locate();
    window.addEventListener('scroll', locate, true); window.addEventListener('resize', locate);
    const captureRange = () => {
      const s = window.getSelection();
      if (s?.rangeCount && selection.node.contains(s.anchorNode) && selection.node.contains(s.focusNode)) {
        range.current = s.getRangeAt(0).cloneRange();
        setMarks(Object.fromEntries((['bold','italic','underline','strike'] as const).map(mark=>[mark,markState(selection.node,range.current,mark)])) as Record<Mark,boolean|'mixed'>);
      }
    };
    document.addEventListener('selectionchange', captureRange);
    return () => { window.removeEventListener('scroll', locate, true); window.removeEventListener('resize', locate); document.removeEventListener('selectionchange', captureRange); };
  }, [selection, panelHeight]);
  const select = (next: Selection) => { if(busy)return; setSelection(next); if(next.id !== selection?.id) { range.current=null; pendingMarks.current=null; setTab('content'); } };
  const item = selection ? value.elements?.[selection.id] || {} : {};
  const style = (patch: React.CSSProperties) => {
    if(!selection)return;
    if(styleTarget==='desktop')update(selection.id,{style:{...item.style,...patch}});
    else update(selection.id,{responsive:{...item.responsive,[styleTarget]:{...item.responsive?.[styleTarget],...patch}}});
  };
  const selectedStyle=styleTarget==='desktop'?item.style:item.responsive?.[styleTarget];
  const computedStyle=selection?getComputedStyle(selection.node):undefined;
  const format = (mark: Mark) => {
    if(!selection || !range.current || !selection.node.contains(range.current.commonAncestorContainer))return;
    const enabled=pendingMarks.current?.[mark] ?? (markState(selection.node,range.current,mark)===true);
    if(range.current.collapsed){
      pendingMarks.current={...pendingMarks.current,[mark]:!enabled};
      setMarks(current=>({...current,[mark]:!enabled}));
      selection.node.focus({preventScroll:true});
      const current=window.getSelection();current?.removeAllRanges();current?.addRange(range.current);
      return;
    }
    pendingMarks.current=null;
    range.current=applyMarks(selection.node,range.current,{[mark]:!enabled});
    update(selection.id,{html:cleanRichText(selection.node.innerHTML)});
    setMarks(current=>({...current,[mark]:!enabled}));
  };
  const formatRef=useRef(format);formatRef.current=format;
  useEffect(()=>{if(!editing)return;const listener=(event:Event)=>{const key=(event as CustomEvent).detail;formatRef.current(key==='b'?'bold':key==='i'?'italic':'underline');};document.addEventListener('portal-format',listener);return()=>document.removeEventListener('portal-format',listener);},[editing]);
  const applyText = (patch:Marks,clear=false) => {
    if(!selection || !range.current || !selection.node.contains(range.current.commonAncestorContainer))return;
    if(range.current.collapsed){pendingMarks.current=clear?{}:{...pendingMarks.current,...patch};return;}
    range.current=applyMarks(selection.node,range.current,patch,clear);
    update(selection.id,{html:cleanRichText(selection.node.innerHTML)});
  };
  const undo = (redo=false) => {if(busy)return;if(document.activeElement instanceof HTMLElement)document.activeElement.blur();setSelection(undefined);pendingMarks.current=null;redo?onRedo():onUndo();};
  const guardHandlers=useRef({select,undo});
  guardHandlers.current={select,undo};
  useEffect(()=>{
    if(!editing)return;
    return installPortalEditorGuard(element=>guardHandlers.current.select({id:element.dataset.canvasId!,label:element.dataset.canvasLabel||'Elemento',kind:(element.dataset.canvasKind as Selection['kind'])||'box',node:element}),redo=>guardHandlers.current.undo(redo));
  },[editing]);
  const gradientControl=(key:'textGradient'|'backgroundGradient',label:string)=>{
    const gradient=item[key];
    const patch=(value:Partial<Gradient>)=>selection&&update(selection.id,{[key]:{start:'#e11d48',end:'#7c3aed',angle:90,...gradient,...value}});
    return <details><summary>{label}</summary><label><input type="checkbox" checked={!!gradient} onChange={e=>selection&&update(selection.id,{[key]:e.target.checked?{start:'#e11d48',end:'#7c3aed',angle:90}:undefined})}/>Ativar</label>{gradient&&<><label>Cor inicial<input type="color" value={gradient.start} onChange={e=>patch({start:e.target.value})}/></label><label>Cor final<input type="color" value={gradient.end} onChange={e=>patch({end:e.target.value})}/></label>{(['angle','startAt','endAt'] as const).map((field,i)=><label key={field}>{['Direção (graus)','Posição inicial (%)','Posição final (%)'][i]}<input type="number" min={0} max={field==='angle'?360:100} value={gradient[field]??(field==='endAt'?100:0)} onChange={e=>patch({[field]:Math.max(0,Math.min(field==='angle'?360:100,+e.target.value))})}/></label>)}</>}</details>;
  };
  const insert = (kind: CanvasBlock['kind']) => {
    const id = crypto.randomUUID();
    const current=latest.current;
    const blocks=[...(current.blocks||[]),{ id,kind }];
    const text=kind==='button'?'Saiba mais':kind==='text'?'Clique aqui e escreva seu conteúdo.':'';
    change({...current,blocks,elements:{...current.elements,[id]:{html:escapeText(text),icon:'Star'}}});
    window.setTimeout(()=>document.querySelector<HTMLElement>('[data-canvas-id="'+id+'"]')?.scrollIntoView({block:'center',behavior:'smooth'}),0);
  };
  const move = (direction: number) => {
    if(!selection)return;
    const blockId = selection.node.closest<HTMLElement>('[data-section-id]')?.dataset.sectionId;
    if(!blockId)return;
    const order=[...new Set([...(value.sectionOrder||TEMPLATE_ORDERS[value.templateId]||[]),...(value.blocks||[]).map(b=>b.id)])];
    const i=order.indexOf(blockId),j=i+direction;
    if(i<0||j<0||j>=order.length)return;
    [order[i],order[j]]=[order[j],order[i]]; change({...value,sectionOrder:order});
  };
  const upload = async (file: File) => {
    if(!selection)return;
    const id=selection.id; setUploading(true);
    try { const asset=await onPrepareImage(file,'banner'); if(asset)update(id,{imageUrl:asset.url,imagePath:asset.path}); }
    catch { window.alert('Não foi possível enviar a imagem. Tente novamente.'); }
    finally { setUploading(false); }
  };
  const reorder = (from: string, to: string) => {
    const order=[...new Set([...(value.sectionOrder||TEMPLATE_ORDERS[value.templateId]||[]),...(value.blocks||[]).map(b=>b.id)])];
    const a=order.indexOf(from), b=order.indexOf(to);
    if(a<0||b<0||a===b)return;
    order.splice(a,1);order.splice(b,0,from);change({...value,sectionOrder:order});
  };
  const controls = editing && <>
    <FloatingEditorBar>
      <span className="canvas-command-title">Editar portal</span>
      <button onClick={()=>undo()} disabled={!canUndo||busy} title="Desfazer"><Undo2 size={16}/></button>
      <button onClick={()=>undo(true)} disabled={!canRedo||busy} title="Refazer"><Redo2 size={16}/></button>
      <button onClick={onSettings}><Palette size={16}/>Modelos e página</button>
      <details><summary><Plus size={16}/>Inserir</summary><div className="canvas-insert-menu">{(['text','image','button','icon'] as const).map((kind,i)=><button key={kind} onClick={()=>insert(kind)}>{['Texto','Imagem','Botão','Ícone'][i]}</button>)}</div></details>
      <button onClick={onDiscard} disabled={!unpublished||busy||uploading}>Descartar</button>
      <button className="canvas-primary" onClick={onPublish} disabled={busy||uploading}><Send size={16}/>Publicar</button>
      <button onClick={onClose} disabled={busy||uploading} title="Sair da edição"><X size={16}/></button>
      <small>{unpublished?"Prévia privada · alterações não publicadas":"Clique em um elemento para editar. Navegação desativada."}</small>
    </FloatingEditorBar>
    {selection && <div ref={panel} className="canvas-context-menu" data-canvas-tools style={position} role="region" aria-label={'Editar '+selection.label}>
      <div className="canvas-context-heading"><strong>{selection.label}</strong><button onClick={()=>setSelection(undefined)} aria-label="Fechar ferramentas"><X size={16}/></button></div>
      {selection.kind!=='hero'&&<nav>{(['content','style','layout'] as const).map((t,i)=><button aria-pressed={tab===t} key={t} onClick={()=>setTab(t)}>{['Conteúdo','Estilo','Espaçamento'][i]}</button>)}</nav>}
      <fieldset disabled={busy||uploading} className="canvas-context-body">
        {tab==='content'&&<>
          {selection.kind==='hero'&&<HeroControls hero={value.hero} onChange={patch=>change({...latest.current,hero:{...latest.current.hero,...patch}})} onPrepareImage={onPrepareImage} busy={busy}/>}
          {selection.kind==='text'&&<><p>Escreva diretamente no texto. Selecione um trecho para formatar. Enter cria uma nova linha.</p><div className="canvas-row"><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('bold')} aria-pressed={marks.bold} title="Negrito"><Bold size={18}/></button><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('italic')} aria-pressed={marks.italic} title="Itálico"><Italic size={18}/></button><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('underline')} aria-pressed={marks.underline} title="Sublinhado"><Underline size={18}/></button><button onMouseDown={e=>e.preventDefault()} aria-pressed={marks.strike} onClick={()=>format('strike')} title="Tachado"><s>S</s></button><button onMouseDown={e=>e.preventDefault()} onClick={()=>applyText({},true)}>Limpar formatação</button></div>
          {selection.node.tagName==='DIV'&&<div className="canvas-row">{(['ul','ol'] as const).map(kind=><button key={kind} onMouseDown={e=>e.preventDefault()} onClick={()=>{range.current=toggleList(selection.node,kind);update(selection.id,{html:cleanRichText(selection.node.innerHTML)});}}>{kind==='ul'?'Lista com marcadores':'Lista numerada'}</button>)}</div>}
          <label>Cor do trecho<input type="color" defaultValue="#0f172a" onChange={e=>applyText({color:e.target.value})}/></label>
          <label>Destaque do trecho<input type="color" defaultValue="#fef08a" onChange={e=>applyText({highlight:e.target.value})}/></label>
          <button onMouseDown={e=>e.preventDefault()} onClick={()=>{const url=window.prompt('Destino do link (https://, mailto: ou tel:). Deixe vazio para remover.');if(url!==null && (!url||safeLink(url)))applyText({link:url?safeLink(url):undefined});}}>Inserir / remover link</button></>}
          {selection.kind==='image'&&<><button disabled={uploading} onClick={()=>fileInput.current?.click()}><ImagePlus size={16}/>{uploading?'Preparando imagem…':'Selecionar e editar imagem'}</button><input ref={fileInput} type="file" hidden accept="image/*" onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);e.target.value='';}}/><label>Descrição da imagem<input value={item.alt||''} onChange={e=>update(selection.id,{alt:e.target.value})}/></label></>}
          {selection.kind==='icon'&&<label>Ícone<select value={item.icon||'Star'} onChange={e=>update(selection.id,{icon:e.target.value})}>{Object.entries(iconLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
          {(value.blocks||[]).find(b=>b.id===selection.id)?.kind==='button'&&<label>Destino do botão<input placeholder="https://" value={item.href||''} onChange={e=>update(selection.id,{href:e.target.value})}/></label>}
          {selection.kind==='box'&&<p>Selecione um texto ou uma imagem dentro desta seção para editar seu conteúdo. Use Estilo e Espaçamento para ajustar a seção.</p>}
        </>}
        {tab==='style'&&<>
          <label>Ajustar para<select value={styleTarget} onChange={e=>setStyleTarget(e.target.value as typeof styleTarget)}><option value="desktop">Desktop / base</option><option value="tablet">Tablet (768–1023 px)</option><option value="mobile">Celular (até 767 px)</option></select></label>
          <p>Estilos do bloco inteiro. Os ajustes específicos aparecem na largura correspondente.</p>
          <div className="canvas-row"><label>Cor<input type="color" value={String(selectedStyle?.color||'#0f172a')} onChange={e=>style({color:e.target.value})}/></label><label>Fundo<input type="color" value={String(selectedStyle?.backgroundColor||'#ffffff')} onChange={e=>style({backgroundColor:e.target.value})}/></label></div>
          {selection.kind==='text'&&<><label>Fonte<select value={selectedStyle?.fontFamily||'Outfit'} onChange={e=>style({fontFamily:e.target.value})}>{CANVAS_FONTS.map(f=><option key={f}>{f}</option>)}</select></label><label>Tamanho<input type="number" min={10} max={120} value={selectedStyle?.fontSize||''} placeholder="Automático" onChange={e=>style({fontSize:e.target.value?Math.max(10,Math.min(120,+e.target.value)):undefined})}/></label><label>Alinhamento<select value={selectedStyle?.textAlign||computedStyle?.textAlign||'left'} onChange={e=>style({textAlign:e.target.value as React.CSSProperties['textAlign']})}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option><option value="justify">Justificado</option></select></label></>}
          {selection.kind==='text'&&<>{gradientControl('textGradient','Degradê do texto')}<label>Peso da fonte<select value={selectedStyle?.fontWeight||computedStyle?.fontWeight||400} onChange={e=>style({fontWeight:+e.target.value})}>{[300,400,500,600,700,800,900].map(weight=><option key={weight} value={weight}>{weight}</option>)}</select></label><label>Altura de linha<input type="number" min={0.8} max={3} step={0.1} value={selectedStyle?.lineHeight||1.3} onChange={e=>style({lineHeight:Math.max(.8,Math.min(3,+e.target.value))})}/></label><label>Espaçamento entre letras (px)<input type="number" min={-5} max={20} step={.5} value={selectedStyle?.letterSpacing||0} onChange={e=>style({letterSpacing:Math.max(-5,Math.min(20,+e.target.value))})}/></label><label>Sombra<select value={selectedStyle?.textShadow||''} onChange={e=>style({textShadow:e.target.value||undefined})}><option value="">Sem sombra</option><option value="0 2px 6px #00000066">Suave</option><option value="0 4px 12px #000000aa">Forte</option></select></label></>}
          {gradientControl('backgroundGradient','Degradê do fundo')}
          <details><summary>Borda e transparência</summary><label>Espessura da borda (px)<input type="number" min={0} max={12} value={Number(selectedStyle?.borderWidth)||0} onChange={e=>style({borderWidth:Math.max(0,Math.min(12,+e.target.value)),borderStyle:'solid'})}/></label><label>Cor da borda<input type="color" value={String(selectedStyle?.borderColor||'#cbd5e1')} onChange={e=>style({borderColor:e.target.value})}/></label><label>Opacidade<input type="range" min={.1} max={1} step={.05} value={Number(selectedStyle?.opacity??1)} onChange={e=>style({opacity:+e.target.value})}/></label></details>
          <label>Cantos arredondados<input type="range" min={0} max={80} value={Number(selectedStyle?.borderRadius)||0} onChange={e=>style({borderRadius:+e.target.value})}/></label>
        </>}
        {tab==='layout'&&<>{(['padding','marginTop','marginBottom'] as const).map((key,i)=><label key={key}>{['Espaço interno','Espaço acima','Espaço abaixo'][i]}<input type="number" min={0} max={160} value={Number(selectedStyle?.[key])||0} onChange={e=>style({[key]:Math.max(0,Math.min(160,+e.target.value))})}/></label>)}<div className="canvas-row"><button onClick={()=>move(-1)}><ArrowUp size={16}/>Subir seção</button><button onClick={()=>move(1)}><ArrowDown size={16}/>Descer seção</button></div></>}
        <div className="canvas-row">
          {selection.kind!=='hero'&&<button onClick={()=>update(selection.id,{hidden:!item.hidden})}>{item.hidden?'Mostrar':'Ocultar'}</button>}
          {(value.blocks||[]).some(b=>b.id===selection.id)&&<><button onClick={()=>{const id=crypto.randomUUID();const block=value.blocks!.find(b=>b.id===selection.id)!;change({...value,blocks:[...value.blocks!,{...block,id}],elements:{...value.elements,[id]:{...item}}});}} title="Duplicar"><Copy size={16}/></button><button onClick={()=>{change({...value,blocks:value.blocks!.filter(b=>b.id!==selection.id)});setSelection(undefined);}} title="Excluir"><Trash2 size={16}/></button></>}
        </div>
      </fieldset>
    </div>}
  </>;
  return <CanvasContext.Provider value={{editing:editing&&!busy,viewport,pendingMarks,value,select,update,reorder,selected:selection?.id}}>
    <div className="portal-canvas" data-editing={editing} data-composition={value.templateId}>{children}</div>
    {editing && createPortal(controls,document.body)}
  </CanvasContext.Provider>;
}

interface EditableProps { id: string; label: string; children?: React.ReactNode; className?: string; as?: 'div'|'section'|'span'|'h1'|'h2'|'h3'|'p'; style?: React.CSSProperties; }
export function EditableText({id,label,children,className='',as='span',style:baseStyle}:EditableProps) {
  const context=useContext(CanvasContext);
  const ref=useRef<HTMLElement>(null);
  const stored=context?.value.elements?.[id];
  const html=cleanRichText(stored?.html??escapeText(String(children??'')));
  const contextRef=useRef(context); contextRef.current=context;
  useEffect(()=>{
    const node=ref.current;if(!node||!context?.editing)return;
    const before=(event:InputEvent)=>{
      const ctx=contextRef.current;
      if(!ctx?.pendingMarks.current || event.isComposing || event.inputType!=='insertText' || !event.data)return;
      const selection=window.getSelection();if(!selection?.rangeCount)return;
      const range=selection.getRangeAt(0);if(!node.contains(range.commonAncestorContainer))return;
      event.preventDefault();insertMarkedText(node,range,event.data,ctx.pendingMarks.current);ctx.update(id,{html:cleanRichText(node.innerHTML)});
    };
    node.addEventListener('beforeinput',before);return()=>node.removeEventListener('beforeinput',before);
  },[context?.editing,id,stored?.hidden]);
  useLayoutEffect(()=>{if(ref.current && ref.current.innerHTML!==html && document.activeElement!==ref.current)ref.current.innerHTML=html;},[html,context?.editing,stored?.hidden]);
  const selected=context?.selected===id;
  if(stored?.hidden&&!context?.editing)return null;
  return React.createElement(as,{
    ref,className:className+' canvas-text',style:{...baseStyle,...elementStyle(stored,context?.viewport||'desktop'),...(stored?.hidden?{opacity:.3}:{})},
    'data-canvas-id':id,'data-canvas-label':label,'data-canvas-kind':'text','data-selected':selected,
    contentEditable:context?.editing||false,suppressContentEditableWarning:true,
    role:context?.editing?'textbox':undefined,'aria-label':context?.editing?label:undefined,'aria-multiline':context?.editing?true:undefined,
    onFocus:()=>context?.editing&&ref.current&&context.select({id,label,kind:'text',node:ref.current}),
    onClick:(e:React.MouseEvent)=>{if(context?.editing){e.stopPropagation();ref.current&&context.select({id,label,kind:'text',node:ref.current});}},
    onInput:()=>{if(ref.current)context?.update(id,{html:cleanRichText(ref.current.innerHTML)});},
    onPaste:(e:React.ClipboardEvent)=>{if(!context?.editing)return;e.preventDefault();const s=window.getSelection();if(!s?.rangeCount)return;const r=s.getRangeAt(0);r.deleteContents();const node=document.createTextNode(e.clipboardData.getData('text/plain'));r.insertNode(node);r.setStartAfter(node);r.collapse(true);s.removeAllRanges();s.addRange(r);if(ref.current)context.update(id,{html:cleanRichText(ref.current.innerHTML)});}
  });
}
export function EditableBox({id,label,children,className='',as='div',style:baseStyle}:EditableProps) {
  const context=useContext(CanvasContext),stored=context?.value.elements?.[id];
  if(stored?.hidden&&!context?.editing)return null;
  return React.createElement(as,{className:className+' canvas-box',style:{...baseStyle,...elementStyle(stored,context?.viewport||'desktop'),...(stored?.hidden?{opacity:.3}:{})},
    'data-canvas-id':id,'data-canvas-label':label,'data-canvas-kind':'box','data-selected':context?.selected===id,tabIndex:context?.editing?0:undefined,
    onClick:(e:React.MouseEvent<HTMLElement>)=>{if(context?.editing){e.stopPropagation();context.select({id,label,kind:'box',node:e.currentTarget});}},
    onKeyDown:(e:React.KeyboardEvent<HTMLElement>)=>{if(context?.editing&&e.key==='Enter'&&e.target===e.currentTarget){e.preventDefault();context.select({id,label,kind:'box',node:e.currentTarget});}}
  },children);
}
export function EditableImage({id,label,src,alt='',className='',style:baseStyle}:{id:string;label:string;src:string;alt?:string;className?:string;style?:React.CSSProperties}) {
  const context=useContext(CanvasContext),item=context?.value.elements?.[id]||{};
  if(item.hidden&&!context?.editing)return null;
  return <span data-canvas-id={id} data-canvas-label={label} data-canvas-kind="image" data-selected={context?.selected===id} className={'canvas-image '+className}
    style={{display:'block',...baseStyle,...elementStyle(item,context?.viewport||'desktop')}} tabIndex={context?.editing?0:undefined}
    onClick={e=>{if(context?.editing){e.stopPropagation();context.select({id,label,kind:'image',node:e.currentTarget});}}}>
    {(item.imageUrl||src)?<img src={item.imageUrl||src} alt={item.alt||alt} className="w-full h-full object-cover"/>:<span className="canvas-image-placeholder">Clique para adicionar uma imagem</span>}
  </span>;
}
export function CanvasSections({children}:{children:React.ReactNode}) {
  const context=useContext(CanvasContext);
  const order=context?.value.sectionOrder||TEMPLATE_ORDERS[context?.value.templateId||'essencial'];
  const nodes=React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<{sectionId?:string}>[];
  const items=[...nodes,...(context?.value.blocks||[]).map(block=><CanvasSection key={block.id} sectionId={block.id}><CustomBlock block={block}/></CanvasSection>)];
  items.sort((a,b)=>{const rank=(x:typeof a)=>{const i=order.indexOf(x.props.sectionId||'');return i<0?999:i;};return rank(a)-rank(b);});
  return <div className="canvas-sections">{items}</div>;
}
export function CanvasSection({sectionId,children}:{sectionId:string;children:React.ReactNode}) {
  const context=useContext(CanvasContext);
  return <div data-section-id={sectionId} className="canvas-section"
    onDragOver={e=>{if(context?.editing&&e.dataTransfer.types.includes('application/x-portal-section'))e.preventDefault();}}
    onDrop={e=>{if(!context?.editing)return;const from=e.dataTransfer.getData('application/x-portal-section');if(from){e.preventDefault();context.reorder(from,sectionId);}}}>
    {context?.editing&&<button className="canvas-section-handle" draggable data-canvas-tools onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-portal-section',sectionId);}} title="Arraste esta seção para outra posição">⠿ Arrastar seção</button>}
    {children}</div>;
}
function CustomBlock({block}:{block:CanvasBlock}) {
  const context=useContext(CanvasContext),item=context?.value.elements?.[block.id]||{};
  if(item.hidden&&!context?.editing)return null;
  if(block.kind==='image')return <EditableImage id={block.id} label="Imagem" src="" className="canvas-custom-image"/>;
  if(block.kind==='icon'){const Icon=icons[item.icon as keyof typeof icons]||Star;return <div data-canvas-id={block.id} data-canvas-kind="icon" data-canvas-label="Ícone" className="canvas-custom-icon" style={elementStyle(item,context?.viewport||'desktop')} onClick={e=>context?.editing&&context.select({id:block.id,label:'Ícone',kind:'icon',node:e.currentTarget})}><Icon size={40}/></div>;}
  if(block.kind==='button')return <a href={safeLink(item.href||'')} onClick={e=>{if(context?.editing||!safeLink(item.href||''))e.preventDefault();}} className="canvas-custom-button"><EditableText id={block.id} label="Botão">Saiba mais</EditableText></a>;
  return <EditableText as="div" id={block.id} label="Texto" className="canvas-custom-text">Clique aqui e escreva seu conteúdo.</EditableText>;
}

