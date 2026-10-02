import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {PortalCanvas,EditableText,CanvasSection} from '../src/components/visual-editor/PortalCanvas';
import {DEFAULT_VISUAL_PORTAL_CONFIGURATION} from '../src/lib/visualPortalEditor';
import {applyMarks,markState,insertMarkedText,toggleList} from '../src/lib/portalRichText';
import {cleanRichText} from '../src/lib/portalCanvas';
import {HeroControls} from '../src/components/visual-editor/HeroControls';
import {PortalVisualEditor} from '../src/components/visual-editor/PortalVisualEditor';
import {normaliseVisualConfiguration} from '../src/lib/visualPortalEditor';
import {sessionReducer} from '../src/components/visual-editor/usePortalSession';

const results:{name:string;passed:boolean;error?:string}[]=[];
const assert=(value:unknown,message:string)=>{if(!value)throw new Error(message);};
async function test(name:string,fn:()=>void|Promise<void>){try{await fn();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:String(error)});}}
const wait=()=>new Promise(resolve=>setTimeout(resolve,30));
function select(root:HTMLElement,start:number,end:number){const range=document.createRange();range.setStart(root.firstChild!,start);range.setEnd(root.firstChild!,end);root.focus();window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(range);return range;}
let websiteActions=0,updates=0;
function Harness(){
  const [value,setValue]=useState(DEFAULT_VISUAL_PORTAL_CONFIGURATION);
  const [editing,setEditing]=useState(true);
  (window as any).__setEditor=setEditing;
  return <><header><a id="outside-link" href="#unexpected" onClick={()=>websiteActions++}>Navegar</a></header>
    <PortalCanvas value={value} editing={editing} busy={false} ownerId="" onChange={next=>{updates++;setValue(next);}} onPublish={()=>{}} onClose={()=>setEditing(false)} onSettings={()=>{}} unpublished={true} onDiscard={()=>{}} onUndo={()=>{}} onRedo={()=>{}} canUndo={false} canRedo={false} onPrepareImage={async()=>null}>
      <section data-canvas-id="hero.background" data-canvas-kind="hero" data-canvas-label="Hero">Hero</section>
      <EditableText id="text" label="Texto" as="div">Texto para formatar</EditableText>
      <CanvasSection sectionId="map"><button id="action" onClick={()=>websiteActions++}>Ação</button><form onSubmit={e=>{e.preventDefault();websiteActions++;}}><input id="portal-input"/><button>Enviar</button></form></CanvasSection>
    </PortalCanvas></>;
}
async function run(){
  await test('formatar e remover negrito/itálico/sublinhado repetidamente',()=>{
    const root=document.createElement('div');root.contentEditable='true';root.textContent='abcdef';document.body.append(root);
    let range=select(root,1,5);
    for(const mark of ['bold','italic','underline','strike'] as const){range=applyMarks(root,range,{[mark]:true});assert(markState(root,range,mark)===true,mark+' on');range=applyMarks(root,range,{[mark]:false});assert(markState(root,range,mark)===false,mark+' off');}
    assert(root.textContent==='abcdef','texto preservado');root.remove();
  });
  await test('seleção mista, quebra de linha e digitação formatada',()=>{
    const root=document.createElement('div');root.contentEditable='true';root.innerHTML='<b>ab</b>cd<br>ef';document.body.append(root);
    const range=document.createRange();range.selectNodeContents(root);assert(markState(root,range,'bold')==='mixed','estado misto');
    const next=applyMarks(root,range,{bold:false});assert(markState(root,next,'bold')===false,'remover de todos');assert(root.innerHTML.includes('<br>'),'quebra preservada');
    next.collapse(false);insertMarkedText(root,next,'Z',{italic:true});assert(root.textContent?.endsWith('Z'),'inserção');assert(root.innerHTML.includes('font-style:italic'),'marca inserida');root.remove();
  });
  await test('sanitização preserva links seguros e bloqueia scripts',()=>{const html=cleanRichText('<a href="javascript:alert(1)" onclick="alert(1)">A</a><script>alert(1)</script><a href="https://example.com">B</a>');assert(!html.includes('javascript')&&!html.includes('onclick')&&!html.includes('<script'),'sem código');assert(html.includes('https://example.com'),'link válido');});
  await test('listas preservam marcação ao formatar',()=>{
    const root=document.createElement('div');root.contentEditable='true';root.innerHTML='um<br>dois';document.body.append(root);
    let range=toggleList(root,'ul');assert(root.querySelectorAll('li').length===2,'duas linhas');
    range=applyMarks(root,range,{bold:true});assert(root.querySelectorAll('li').length>=2,'lista preservada');
    toggleList(root,'ul');assert(!root.querySelector('ul'),'lista removida');root.remove();
  });
  await test('migração unifica imagem antiga com galeria',()=>{
    const config=normaliseVisualConfiguration({...DEFAULT_VISUAL_PORTAL_CONFIGURATION,elements:{'hero.background':{imageUrl:'https://example.com/image.webp',imagePath:'image.webp'}}});
    assert(config.hero.backgroundImages.length===1,'imagem migrada');assert(!config.elements?.['hero.background']?.imageUrl,'override removido');
    assert(normaliseVisualConfiguration(config).hero.backgroundImages.length===1,'migração idempotente');
  });
  await test('histórico central desfaz alterações de qualquer painel',()=>{const initial={value:DEFAULT_VISUAL_PORTAL_CONFIGURATION,past:[],future:[]};const next=sessionReducer(initial,{type:'change',value:{...initial.value,hero:{...initial.value.hero,backgroundIntervalSeconds:12}}});assert(sessionReducer(next,{type:'undo'}).value.hero.backgroundIntervalSeconds===8,'undo');assert(sessionReducer(sessionReducer(next,{type:'undo'}),{type:'redo'}).value.hero.backgroundIntervalSeconds===12,'redo');});
  flushSync(()=>createRoot(document.getElementById('root')!).render(<Harness/>));await wait();
  await test('modo edição bloqueia links externos ao canvas, ações e formulários',()=>{
    document.getElementById('outside-link')!.click();document.getElementById('action')!.click();document.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const event=new MouseEvent('auxclick',{button:1,bubbles:true,cancelable:true});document.getElementById('outside-link')!.dispatchEvent(event);
    assert(websiteActions===0,'nenhuma ação do portal');assert(!location.hash,'sem navegação');assert(event.defaultPrevented,'clique intermediário bloqueado');
  });
  await test('clique seleciona texto e abre controles, sem navegar',async()=>{
    (document.querySelector('[data-canvas-id=text]') as HTMLElement).click();await wait();assert(document.querySelector('.canvas-context-menu'),'menu contextual');
    const root=document.querySelector('[data-canvas-id=text]') as HTMLElement;select(root,0,5);await wait();
    (document.querySelector('[title=Negrito]') as HTMLElement).click();await wait();assert(root.innerHTML.includes('font-weight:700'),'negrito aplicado');
    (document.querySelector('[title=Negrito]') as HTMLElement).click();await wait();assert(root.innerHTML.includes('font-weight:400'),'negrito removido');assert(updates>=2,'alterações no estado');
  });
  await test('hero usa o mesmo painel compartilhado pelo atalho direto',async()=>{
    (document.querySelector('[data-canvas-kind=hero]') as HTMLElement).click();await wait();
    assert(document.querySelector('.canvas-context-menu .hero-controls'),'controles compartilhados');
    assert(document.querySelector('.hero-controls')?.textContent?.includes('Intervalo dos anúncios'),'temporizador dos anúncios');
    const direct=Array.from(document.querySelectorAll('.canvas-context-menu .hero-controls label')).map(label=>label.textContent).join('|');
    const host=document.createElement('div');document.body.append(host);const other=createRoot(host);
    flushSync(()=>other.render(<PortalVisualEditor configuration={DEFAULT_VISUAL_PORTAL_CONFIGURATION} onChange={()=>{}} onClose={()=>{}} onPublish={()=>{}} onPrepareImage={async()=>null}/>));
    (Array.from(host.querySelectorAll('button')).find(button=>button.textContent==='Apresentação') as HTMLElement).click();await wait();
    assert(Array.from(host.querySelectorAll('.hero-controls label')).map(label=>label.textContent).join('|')===direct,'opções idênticas nos dois atalhos');
    other.unmount();host.remove();
  });
  await test('digitação no cursor utiliza a marca selecionada',async()=>{
    const root=document.querySelector('[data-canvas-id=text]') as HTMLElement;
    root.innerHTML='abc';root.dispatchEvent(new InputEvent('input',{bubbles:true}));select(root,3,3);root.click();await wait();
    const r=document.createRange();r.selectNodeContents(root);r.collapse(false);window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(r);await wait();
    (document.querySelector('[title=Itálico]') as HTMLElement).click();await wait();
    const input=new InputEvent('beforeinput',{inputType:'insertText',data:'Z',bubbles:true,cancelable:true});
    root.dispatchEvent(input);await wait();assert(input.defaultPrevented,'inserção tratada');assert(root.textContent==='abcZ','texto inserido');assert(root.innerHTML.includes('font-style:italic'),'estilo da próxima digitação');
  });
  await test('barra é arrastável e não sai da tela',async()=>{
    const handle=document.querySelector('.canvas-drag-handle') as HTMLElement;
    // Pointer capture is meaningful only for native active pointers; test keyboard alternative and clamping here.
    for(let i=0;i<100;i++)handle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    await wait();const box=document.querySelector('.canvas-command-bar')!.getBoundingClientRect();assert(box.right<=window.innerWidth+1&&box.left>=0,'barra contida');
  });
  await test('sair do editor restaura links e preserva a prévia',async()=>{
    const html=document.querySelector('[data-canvas-id=text]')!.innerHTML;
    (document.querySelector('[title="Sair da edição"]') as HTMLElement).click();await wait();
    assert(document.querySelector('[data-canvas-id=text]')!.innerHTML===html,'prévia preservada');
    document.getElementById('action')!.click();assert(websiteActions===1,'ação restaurada');
  });
  (window as any).__editorTests={failed:results.some(result=>!result.passed),results};
}
run().catch(error=>{(window as any).__editorTests={failed:true,error:String(error)};});
