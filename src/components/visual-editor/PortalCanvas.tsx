import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, Undo2, Redo2, X, Plus, Save, Send, Palette, ArrowUp, ArrowDown, Copy, Trash2, ImagePlus, Home, MapPin, ShieldCheck, Star, Heart, Phone } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { VisualPortalConfiguration } from '../../lib/visualPortalEditor';
import { CANVAS_FONTS, CanvasElement, CanvasBlock, canvasStyle, cleanRichText, escapeText, safeLink, TEMPLATE_ORDERS } from '../../lib/portalCanvas';
import { uploadPortalAsset } from '../../lib/portalAssets';
import './portal-canvas.css';

type Selection = { id: string; label: string; kind: 'text' | 'box' | 'image' | 'icon'; node: HTMLElement };
interface CanvasContextValue {
  editing: boolean;
  value: VisualPortalConfiguration;
  select: (selection: Selection) => void;
  update: (id: string, patch: Partial<CanvasElement>) => void;
  selected: string | undefined;
  reorder: (from: string, to: string) => void;
}
const CanvasContext = createContext<CanvasContextValue | null>(null);
const icons = { Home, MapPin, ShieldCheck, Star, Heart, Phone };
const iconLabels = { Home: 'Casa', MapPin: 'Localização', ShieldCheck: 'Segurança', Star: 'Estrela', Heart: 'Coração', Phone: 'Telefone' };

export function PortalCanvas({ children, value, editing, busy, ownerId, onChange, onSave, onPublish, onClose, onSettings }:
  { children: React.ReactNode; value: VisualPortalConfiguration; editing: boolean; busy: boolean; ownerId: string;
    onChange: (v: VisualPortalConfiguration) => void; onSave: () => void; onPublish: () => void; onClose: () => void; onSettings: () => void }) {
  const [selection, setSelection] = useState<Selection>();
  const [position, setPosition] = useState({ left: 12, top: 150 });
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'content'|'style'|'layout'>('content');
  const [, setVersion] = useState(0);
  const history = useRef<VisualPortalConfiguration[]>([]);
  const future = useRef<VisualPortalConfiguration[]>([]);
  const latest = useRef(value);
  latest.current = value;
  const fileInput = useRef<HTMLInputElement>(null);
  const range = useRef<Range | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(260);
  const change = (next: VisualPortalConfiguration) => {
    history.current = [...history.current.slice(-49), latest.current];
    future.current = [];
    latest.current = next;
    onChange(next);
    setVersion(v => v + 1);
  };
  const update = (id: string, patch: Partial<CanvasElement>) => {
    const current = latest.current;
    change({ ...current, elements: { ...current.elements, [id]: { ...current.elements?.[id], ...patch } } });
  };
  useEffect(() => { if (!editing) { setSelection(undefined); history.current=[]; future.current=[]; } }, [editing]);
  useEffect(() => {
    if (!editing) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (history.current.length) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [editing]);
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
      if (s?.rangeCount && selection.node.contains(s.anchorNode)) range.current = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', captureRange);
    return () => { window.removeEventListener('scroll', locate, true); window.removeEventListener('resize', locate); document.removeEventListener('selectionchange', captureRange); };
  }, [selection, panelHeight]);
  const select = (next: Selection) => { if(busy)return; setSelection(next); if(next.id !== selection?.id) { range.current=null; setTab('content'); } };
  const item = selection ? value.elements?.[selection.id] || {} : {};
  const style = (patch: React.CSSProperties) => selection && update(selection.id, { style: { ...item.style, ...patch } });
  const format = (tag: 'b'|'i'|'u') => {
    if (!selection) return;
    const r = range.current;
    if (r && !r.collapsed && selection.node.contains(r.commonAncestorContainer)) {
      const mark = document.createElement(tag);
      mark.appendChild(r.extractContents()); r.insertNode(mark);
      update(selection.id, { html: cleanRichText(selection.node.innerHTML) });
      const s = window.getSelection(); r.selectNodeContents(mark); s?.removeAllRanges(); s?.addRange(r);
      range.current = r.cloneRange();
    } else style(tag === 'b' ? {fontWeight: item.style?.fontWeight === 700 ? 400 : 700} : tag === 'i' ? {fontStyle: item.style?.fontStyle === 'italic' ? 'normal' : 'italic'} : {textDecoration: item.style?.textDecoration === 'underline' ? 'none' : 'underline'});
  };
  const undo = (redo = false) => {
    if(document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setSelection(undefined);
    const from = redo ? future : history, to = redo ? history : future;
    const previous = from.current.pop(); if (!previous) return;
    to.current.push(latest.current); latest.current=previous; onChange(previous); setVersion(v=>v+1);
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
    try { const asset=await uploadPortalAsset('banner',file,ownerId); if(asset)update(id,{imageUrl:asset.url,imagePath:asset.path}); }
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
    <div className="canvas-command-bar" data-canvas-tools>
      <span className="canvas-command-title">Editar portal</span>
      <button onClick={()=>undo()} disabled={!history.current.length||busy} title="Desfazer"><Undo2 size={16}/></button>
      <button onClick={()=>undo(true)} disabled={!future.current.length||busy} title="Refazer"><Redo2 size={16}/></button>
      <button onClick={onSettings}><Palette size={16}/>Modelos e página</button>
      <details><summary><Plus size={16}/>Inserir</summary><div className="canvas-insert-menu">{(['text','image','button','icon'] as const).map((kind,i)=><button key={kind} onClick={()=>insert(kind)}>{['Texto','Imagem','Botão','Ícone'][i]}</button>)}</div></details>
      <button onClick={()=>{document.activeElement instanceof HTMLElement && document.activeElement.blur();onSave();}} disabled={busy||uploading}><Save size={16}/>Rascunho</button>
      <button className="canvas-primary" onClick={onPublish} disabled={busy||uploading}><Send size={16}/>Publicar</button>
      <button onClick={onClose} disabled={busy||uploading} title="Sair da edição"><X size={16}/></button>
      <small>Clique em um elemento da página para editar.</small>
    </div>
    {selection && <div ref={panel} className="canvas-context-menu" data-canvas-tools style={position} role="region" aria-label={'Editar '+selection.label}>
      <div className="canvas-context-heading"><strong>{selection.label}</strong><button onClick={()=>setSelection(undefined)} aria-label="Fechar ferramentas"><X size={16}/></button></div>
      <nav>{(['content','style','layout'] as const).map((t,i)=><button aria-pressed={tab===t} key={t} onClick={()=>setTab(t)}>{['Conteúdo','Estilo','Espaçamento'][i]}</button>)}</nav>
      <div className="canvas-context-body">
        {tab==='content'&&<>
          {selection.kind==='text'&&<><p>Escreva diretamente no texto. Selecione um trecho para formatar. Enter cria uma nova linha.</p><div className="canvas-row"><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('b')} title="Negrito"><Bold size={18}/></button><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('i')} title="Itálico"><Italic size={18}/></button><button onMouseDown={e=>e.preventDefault()} onClick={()=>format('u')} title="Sublinhado"><Underline size={18}/></button></div></>}
          {selection.kind==='image'&&<><button disabled={uploading} onClick={()=>fileInput.current?.click()}><ImagePlus size={16}/>{uploading?'Preparando imagem…':'Selecionar e editar imagem'}</button><input ref={fileInput} type="file" hidden accept="image/*" onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);e.target.value='';}}/><label>Descrição da imagem<input value={item.alt||''} onChange={e=>update(selection.id,{alt:e.target.value})}/></label></>}
          {selection.kind==='icon'&&<label>Ícone<select value={item.icon||'Star'} onChange={e=>update(selection.id,{icon:e.target.value})}>{Object.entries(iconLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
          {(value.blocks||[]).find(b=>b.id===selection.id)?.kind==='button'&&<label>Destino do botão<input placeholder="https://" value={item.href||''} onChange={e=>update(selection.id,{href:e.target.value})}/></label>}
          {selection.kind==='box'&&<p>Selecione um texto ou uma imagem dentro desta seção para editar seu conteúdo. Use Estilo e Espaçamento para ajustar a seção.</p>}
        </>}
        {tab==='style'&&<>
          <div className="canvas-row"><label>Cor<input type="color" value={String(item.style?.color||'#0f172a')} onChange={e=>style({color:e.target.value})}/></label><label>Fundo<input type="color" value={String(item.style?.backgroundColor||'#ffffff')} onChange={e=>style({backgroundColor:e.target.value})}/></label></div>
          {selection.kind==='text'&&<><label>Fonte<select value={item.style?.fontFamily||'Outfit'} onChange={e=>style({fontFamily:e.target.value})}>{CANVAS_FONTS.map(f=><option key={f}>{f}</option>)}</select></label><label>Tamanho<input type="number" min={10} max={120} value={item.style?.fontSize||''} placeholder="Automático" onChange={e=>style({fontSize:e.target.value?Math.max(10,Math.min(120,+e.target.value)):undefined})}/></label><label>Alinhamento<select value={item.style?.textAlign||'left'} onChange={e=>style({textAlign:e.target.value as React.CSSProperties['textAlign']})}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option><option value="justify">Justificado</option></select></label></>}
          <label>Cantos arredondados<input type="range" min={0} max={80} value={Number(item.style?.borderRadius)||0} onChange={e=>style({borderRadius:+e.target.value})}/></label>
        </>}
        {tab==='layout'&&<>{(['padding','marginTop','marginBottom'] as const).map((key,i)=><label key={key}>{['Espaço interno','Espaço acima','Espaço abaixo'][i]}<input type="number" min={0} max={160} value={Number(item.style?.[key])||0} onChange={e=>style({[key]:Math.max(0,Math.min(160,+e.target.value))})}/></label>)}<div className="canvas-row"><button onClick={()=>move(-1)}><ArrowUp size={16}/>Subir seção</button><button onClick={()=>move(1)}><ArrowDown size={16}/>Descer seção</button></div></>}
        <div className="canvas-row">
          <button onClick={()=>update(selection.id,{hidden:!item.hidden})}>{item.hidden?'Mostrar':'Ocultar'}</button>
          {(value.blocks||[]).some(b=>b.id===selection.id)&&<><button onClick={()=>{const id=crypto.randomUUID();const block=value.blocks!.find(b=>b.id===selection.id)!;change({...value,blocks:[...value.blocks!,{...block,id}],elements:{...value.elements,[id]:{...item}}});}} title="Duplicar"><Copy size={16}/></button><button onClick={()=>{change({...value,blocks:value.blocks!.filter(b=>b.id!==selection.id)});setSelection(undefined);}} title="Excluir"><Trash2 size={16}/></button></>}
        </div>
      </div>
    </div>}
  </>;
  return <CanvasContext.Provider value={{editing,value,select,update,reorder,selected:selection?.id}}>
    <div className="portal-canvas" data-editing={editing} data-composition={value.templateId} onClickCapture={e=>{
      if(!editing || (e.target as HTMLElement).closest('[data-canvas-tools]'))return;
      if((e.target as HTMLElement).closest('[contenteditable="true"]')){e.preventDefault();return;}
      if((e.target as HTMLElement).closest('a,button,input,select')) {
        const target=(e.target as HTMLElement).closest<HTMLElement>('[data-canvas-id]');
        if(target){e.preventDefault();e.stopPropagation();select({id:target.dataset.canvasId!,label:target.dataset.canvasLabel||'Elemento',kind:(target.dataset.canvasKind as Selection['kind'])||'box',node:target});}
      }
    }}>{children}</div>
    {editing && createPortal(controls,document.body)}
  </CanvasContext.Provider>;
}

interface EditableProps { id: string; label: string; children?: React.ReactNode; className?: string; as?: 'div'|'section'|'span'|'h1'|'h2'|'h3'|'p'; style?: React.CSSProperties; }
export function EditableText({id,label,children,className='',as='span',style:baseStyle}:EditableProps) {
  const context=useContext(CanvasContext);
  const ref=useRef<HTMLElement>(null);
  const stored=context?.value.elements?.[id];
  const html=cleanRichText(stored?.html??escapeText(String(children??'')));
  useLayoutEffect(()=>{if(ref.current && ref.current.innerHTML!==html && document.activeElement!==ref.current)ref.current.innerHTML=html;},[html,context?.editing,stored?.hidden]);
  const selected=context?.selected===id;
  if(stored?.hidden&&!context?.editing)return null;
  return React.createElement(as,{
    ref,className:className+' canvas-text',style:{...baseStyle,...canvasStyle(stored?.style),...(stored?.hidden?{opacity:.3}:{})},
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
  return React.createElement(as,{className:className+' canvas-box',style:{...baseStyle,...canvasStyle(stored?.style),...(stored?.hidden?{opacity:.3}:{})},
    'data-canvas-id':id,'data-canvas-label':label,'data-canvas-kind':'box','data-selected':context?.selected===id,tabIndex:context?.editing?0:undefined,
    onClick:(e:React.MouseEvent<HTMLElement>)=>{if(context?.editing){e.stopPropagation();context.select({id,label,kind:'box',node:e.currentTarget});}},
    onKeyDown:(e:React.KeyboardEvent<HTMLElement>)=>{if(context?.editing&&e.key==='Enter'&&e.target===e.currentTarget){e.preventDefault();context.select({id,label,kind:'box',node:e.currentTarget});}}
  },children);
}
export function EditableImage({id,label,src,alt='',className='',style:baseStyle}:{id:string;label:string;src:string;alt?:string;className?:string;style?:React.CSSProperties}) {
  const context=useContext(CanvasContext),item=context?.value.elements?.[id]||{};
  if(item.hidden&&!context?.editing)return null;
  return <span data-canvas-id={id} data-canvas-label={label} data-canvas-kind="image" data-selected={context?.selected===id} className={'canvas-image '+className}
    style={{display:'block',...baseStyle,...canvasStyle(item.style)}} tabIndex={context?.editing?0:undefined}
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
  if(block.kind==='icon'){const Icon=icons[item.icon as keyof typeof icons]||Star;return <div data-canvas-id={block.id} data-canvas-kind="icon" data-canvas-label="Ícone" className="canvas-custom-icon" style={canvasStyle(item.style)} onClick={e=>context?.editing&&context.select({id:block.id,label:'Ícone',kind:'icon',node:e.currentTarget})}><Icon size={40}/></div>;}
  if(block.kind==='button')return <a href={safeLink(item.href||'')} onClick={e=>{if(context?.editing||!safeLink(item.href||''))e.preventDefault();}} className="canvas-custom-button"><EditableText id={block.id} label="Botão">Saiba mais</EditableText></a>;
  return <EditableText as="div" id={block.id} label="Texto" className="canvas-custom-text">Clique aqui e escreva seu conteúdo.</EditableText>;
}

