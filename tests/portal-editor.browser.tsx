import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {PortalCanvas,EditableText,CanvasSection,CanvasInsertedBlocks} from '../src/components/visual-editor/PortalCanvas';
import {DEFAULT_VISUAL_PORTAL_CONFIGURATION} from '../src/lib/visualPortalEditor';
import {applyMarks,markState,gradientState,insertMarkedText,toggleList} from '../src/lib/portalRichText';
import {cleanRichText} from '../src/lib/portalCanvas';
import {HeroControls} from '../src/components/visual-editor/HeroControls';
import {PortalVisualEditor} from '../src/components/visual-editor/PortalVisualEditor';
import {normaliseVisualConfiguration} from '../src/lib/visualPortalEditor';
import {sessionReducer} from '../src/components/visual-editor/usePortalSession';
import {HeroPropertyScene} from '../src/components/home/HeroPropertyScene';

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
      <EditableText id="legal-test" label="Cláusula obrigatória" as="div" hideable={false} defaultHtml="<strong>Cláusula:</strong> conteúdo protegido"/>
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
  await test('degradê altera somente o trecho selecionado',()=>{
    const root=document.createElement('div');root.contentEditable='true';root.textContent='texto inteiro';document.body.append(root);
    let range=select(root,0,5);range=applyMarks(root,range,{gradient:{start:'#e11d48',end:'#7c3aed',angle:90}});
    assert(gradientState(root,range)!=='mixed'&&!!gradientState(root,range),'degradê ativo');
    assert(root.querySelectorAll('[data-text-gradient]').length===1,'um trecho marcado');
    assert(root.textContent==='texto inteiro','conteúdo completo preservado');
    assert(root.querySelector('[data-text-gradient]')?.textContent==='texto','apenas seleção formatada');root.remove();
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
  await test('blocos inseridos permanecem no escopo da página',async()=>{
    const host=document.createElement('div');document.body.append(host);const scoped=createRoot(host);
    const config={...DEFAULT_VISUAL_PORTAL_CONFIGURATION,blocks:[{id:'home-block',kind:'text' as const,scope:'home'},{id:'footer-block',kind:'text' as const,scope:'footer'}],elements:{'home-block':{html:'Bloco inicial'},'footer-block':{html:'Bloco rodapé'}}};
    flushSync(()=>scoped.render(<PortalCanvas value={config} editing={false} busy={false} ownerId="" scope="home" onChange={()=>{}} onPublish={()=>{}} onClose={()=>{}} onSettings={()=>{}} unpublished={false} onDiscard={()=>{}} onUndo={()=>{}} onRedo={()=>{}} canUndo={false} canRedo={false} onPrepareImage={async()=>null}><CanvasInsertedBlocks/><CanvasInsertedBlocks scope="footer"/></PortalCanvas>));await wait();
    assert(host.textContent?.includes('Bloco inicial')&&host.textContent?.includes('Bloco rodapé'),'escopos renderizados');scoped.unmount();host.remove();
  });
  await test('galeria aceita cinco cards, respeita visibilidade e não exibe setas manuais',async()=>{
    const host=document.createElement('div');document.body.append(host);const gallery=createRoot(host);
    const properties=Array.from({length:6},(_,index)=>({id:String(index),title:'Imóvel '+index,status:'active',price:100000+index,type:'house',purpose:'sale',city:'Sorocaba',neighborhood:'Centro',media:[],images:[]})) as any;
    flushSync(()=>gallery.render(<HeroPropertyScene properties={properties} onOpenProperty={()=>{}} getTypeLabel={()=> 'Casa'} settings={{...DEFAULT_VISUAL_PORTAL_CONFIGURATION.hero,propertyVisibleCount:5,propertyAutoplay:false,propertyShowPrice:false,propertyShowLocation:false,propertyShowType:false}}/>));await wait();
    assert(host.querySelectorAll('.hero-property-node').length===5,'cinco miniaturas simultâneas');
    assert(!host.querySelector('.hero-listing-navigation'),'sem controles anterior/próximo');
    assert(!host.querySelector('.hero-property-type')&&!host.querySelector('.hero-property-location')&&!host.querySelector('.hero-property-price'),'campos ocultos');
    gallery.unmount();host.remove();
  });
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
  await test('documento obrigatório aceita HTML seguro e não pode ser ocultado',async()=>{
    const legal=document.querySelector('[data-canvas-id=legal-test]') as HTMLElement;assert(!!legal.querySelector('strong'),'HTML inicial preservado');legal.click();await wait();
    assert(!Array.from(document.querySelectorAll('.canvas-context-menu button')).some(button=>button.textContent==='Ocultar'),'sem ação de ocultar');
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
    assert(host.querySelector('.canvas-window-drag'),'painel de modelos arrastável');
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
