import React, { useRef, useState } from 'react';
import type { VisualPortalConfiguration } from '../../lib/visualPortalEditor';

type Hero = VisualPortalConfiguration['hero'];
export interface HeroControlsProps {
  hero: Hero;
  onChange: (patch: Partial<Hero>) => void;
  onPrepareImage: (file: File, kind?: 'hero'|'banner') => Promise<{url:string;path:string}|null>;
  busy?: boolean;
}
export function HeroControls({hero,onChange,onPrepareImage,busy=false}:HeroControlsProps) {
  const input=useRef<HTMLInputElement>(null);
  const replace=useRef<string | undefined>(undefined);
  const [processing,setProcessing]=useState(false);
  const [error,setError]=useState('');
  const disabled=busy||processing;
  const choose=(id?:string)=>{replace.current=id;input.current?.click();};
  const upload=async(file:File)=>{
    setProcessing(true);setError('');
    try {const asset=await onPrepareImage(file,'hero');if(!asset)return;
      const images=replace.current?hero.backgroundImages.map(image=>image.id===replace.current?{...image,...asset}:image):[...hero.backgroundImages,{...asset,id:crypto.randomUUID()}].slice(0,5);
      onChange({backgroundImages:images,backgroundMode:'image'});
    }catch{setError('Não foi possível preparar a imagem. Tente novamente.');}finally{setProcessing(false);}
  };
  const editExisting=async(image:Hero['backgroundImages'][number])=>{
    setProcessing(true);setError('');
    try{const response=await fetch(image.url);if(!response.ok)throw new Error('image');const blob=await response.blob();replace.current=image.id;await upload(new File([blob],'fundo.webp',{type:blob.type||'image/webp'}));}
    catch{setError('Não foi possível abrir esta imagem. Você pode substituí-la por um arquivo.');}
    finally{setProcessing(false);}
  };
  const number=(key:keyof Hero,label:string,min:number,max:number,fallback:number,step=1)=><label>{label}<input type="number" min={min} max={max} step={step} value={Number(hero[key]??fallback)} onChange={e=>onChange({[key]:Math.max(min,Math.min(max,Number(e.target.value)))})}/></label>;
  const check=(key:keyof Hero,label:string,fallback=true)=><label className="hero-control-check"><input type="checkbox" checked={Boolean(hero[key]??fallback)} onChange={e=>onChange({[key]:e.target.checked})}/>{label}</label>;
  return <fieldset className="hero-controls" disabled={disabled}>
    <p>As mesmas opções estão disponíveis pelo clique na hero e em Modelos e página.</p>
    <label>Tipo de fundo<select value={hero.backgroundMode} onChange={e=>onChange({backgroundMode:e.target.value as Hero['backgroundMode']})}><option value="image">Imagem / galeria</option><option value="solid">Cor sólida</option><option value="gradient">Degradê</option></select></label>
    <input ref={input} hidden type="file" accept="image/*" onChange={e=>{if(e.target.files?.[0])void upload(e.target.files[0]);e.target.value='';}}/>
    {hero.backgroundMode==='image'&&<>
      <div className="hero-image-list">{hero.backgroundImages.map((image,index)=><div key={image.id} draggable onDragStart={e=>e.dataTransfer.setData('application/x-hero-image',image.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const from=hero.backgroundImages.findIndex(img=>img.id===e.dataTransfer.getData('application/x-hero-image'));if(from<0)return;const images=[...hero.backgroundImages];images.splice(index,0,images.splice(from,1)[0]);onChange({backgroundImages:images});}}><img src={image.url} alt={`Fundo ${index+1}`}/><div><button type="button" onClick={()=>choose(image.id)}>Substituir</button><button type="button" onClick={()=>void editExisting(image)}>Editar</button><button type="button" disabled={index===0} onClick={()=>{const images=[...hero.backgroundImages];[images[index-1],images[index]]=[images[index],images[index-1]];onChange({backgroundImages:images});}} aria-label={`Mover fundo ${index+1} para antes`}>↑</button><button type="button" onClick={()=>onChange({backgroundImages:hero.backgroundImages.filter(img=>img.id!==image.id)})} aria-label={`Excluir fundo ${index+1}`}>Excluir</button></div></div>)}</div>
      <button type="button" disabled={hero.backgroundImages.length>=5} onClick={()=>choose()}>{processing?'Preparando…':hero.backgroundImages.length>=5?'Limite de novas imagens atingido':'Adicionar imagem'} · {hero.backgroundImages.length} imagens</button>
      {check('backgroundAutoplay','Trocar fundos automaticamente')}
      {number('backgroundIntervalSeconds','Intervalo dos fundos (segundos)',3,60,8)}
      <label>Transição<select value={hero.backgroundTransition||'fade'} onChange={e=>onChange({backgroundTransition:e.target.value as Hero['backgroundTransition']})}><option value="fade">Suave</option><option value="none">Sem efeito</option></select></label>
      {number('backgroundTransitionSeconds','Duração da transição (segundos)',0.1,2,0.5,0.1)}
      <label>Enquadramento<select value={hero.backgroundFit||'cover'} onChange={e=>onChange({backgroundFit:e.target.value as Hero['backgroundFit']})}><option value="cover">Preencher</option><option value="contain">Mostrar imagem inteira</option></select></label>
      {number('backgroundPositionX','Ponto focal horizontal (%)',0,100,50)}{number('backgroundPositionY','Ponto focal vertical (%)',0,100,50)}
    </>}
    {hero.backgroundMode==='solid'&&<label>Cor do fundo<input type="color" value={hero.solidColor} onChange={e=>onChange({solidColor:e.target.value})}/></label>}
    {hero.backgroundMode==='gradient'&&<><label>Cor inicial<input type="color" value={hero.gradientStart} onChange={e=>onChange({gradientStart:e.target.value})}/></label><label>Cor final<input type="color" value={hero.gradientEnd} onChange={e=>onChange({gradientEnd:e.target.value})}/></label>{number('gradientAngle','Direção do degradê (graus)',0,360,135)}</>}
    {number('overlayOpacity','Escurecimento da imagem (%)',0,100,60)}
    {number('minHeight','Altura mínima da hero no desktop (px)',350,1000,610)}
    <details><summary>Miniaturas dos anúncios</summary>
      {check('showPropertyScene','Exibir miniaturas no desktop')}
      <p>Continuam ocultas no celular. Apenas imóveis ativos são exibidos.</p>
      <label>Composição<select value={hero.propertySceneStyle} onChange={e=>onChange({propertySceneStyle:e.target.value as Hero['propertySceneStyle']})}><option value="route">Rota ilustrativa</option><option value="cards">Cards</option><option value="spotlight">Destaque</option></select></label>
      {hero.propertySceneStyle==='spotlight'?<p>O modelo Destaque exibe um imóvel por vez.</p>:number('propertyVisibleCount','Cards simultâneos',1,5,3)}{number('propertyLimit','Imóveis na sequência',1,30,12)}
      <label>Imóveis<select value={hero.propertySource||'all'} onChange={e=>onChange({propertySource:e.target.value as Hero['propertySource']})}><option value="all">Todos os ativos</option><option value="featured">Somente destaques</option></select></label>
      <label>Ordem<select value={hero.propertyOrder||'random'} onChange={e=>onChange({propertyOrder:e.target.value as Hero['propertyOrder']})}><option value="random">Aleatória</option><option value="price_asc">Menor preço</option></select></label>
      {check('propertyAutoplay','Trocar anúncios automaticamente',false)}{number('propertyIntervalSeconds','Intervalo dos anúncios (segundos)',3,60,6)}
      {check('propertyShowPrice','Mostrar preço')}{check('propertyShowLocation','Mostrar localização')}{check('propertyShowType','Mostrar tipo')}
    </details>
    {error&&<p role="alert">{error}</p>}
  </fieldset>;
}
