import { useEffect, useReducer, useRef, useState } from 'react';
import { DEFAULT_VISUAL_PORTAL_CONFIGURATION, VisualPortalConfiguration } from '../../lib/visualPortalEditor';
import { editUserImage } from '../../lib/editUserImage';
import { supabase } from '../../lib/supabaseClient';

type Config = VisualPortalConfiguration;
interface State { value: Config; past: Config[]; future: Config[]; }
type Action = {type:'change'|'reset';value:Config} | {type:'undo'|'redo'};
export function sessionReducer(state:State, action:Action):State {
  if(action.type==='reset') return {value:action.value,past:[],future:[]};
  if(action.type==='change') return JSON.stringify(action.value)===JSON.stringify(state.value)?state:{value:action.value,past:[...state.past.slice(-79),state.value],future:[]};
  if(action.type==='undo' && state.past.length) return {value:state.past.at(-1)!,past:state.past.slice(0,-1),future:[state.value,...state.future]};
  if(action.type==='redo' && state.future.length) return {value:state.future[0],past:[...state.past,state.value],future:state.future.slice(1)};
  return state;
}
export function usePortalSession(ownerId:string) {
  const [state,dispatch]=useReducer(sessionReducer,{value:DEFAULT_VISUAL_PORTAL_CONFIGURATION,past:[],future:[]});
  const latest=useRef(state.value); latest.current=state.value;
  const assets=useRef(new Map<string,{blob:Blob;path:string;publicUrl?:string;published?:boolean}>());
  const generation=useRef(0);
  const [preparing,setPreparing]=useState(false);
  useEffect(()=>()=>{generation.current++;assets.current.forEach((_,url)=>URL.revokeObjectURL(url));assets.current.clear();},[ownerId]);
  const change=(value:Config|((current:Config)=>Config))=>{
    const next=typeof value==='function'?value(latest.current):value;
    latest.current=next;dispatch({type:'change',value:next});
  };
  const prepareImage=async(file:File,kind:'hero'|'banner'='banner')=>{
    const epoch=generation.current;
    setPreparing(true);
    let processed;
    try{processed=await editUserImage(file,'photo',2560);}finally{setPreparing(false);}
    if(!processed || epoch!==generation.current)return null;
    const url=URL.createObjectURL(processed.blob);
    const path=`${ownerId}/${kind}/${crypto.randomUUID()}.webp`;
    assets.current.set(url,{blob:processed.blob,path});
    return {url,path};
  };
  const materialize=async(config:Config):Promise<Config>=>{
    if(!supabase)throw new Error('Serviço indisponível. Tente novamente.');
    const result=structuredClone(config);
    const references=[...result.hero.backgroundImages,...Object.values(result.elements||{}).map(item=>({get url(){return item.imageUrl||'';},set url(url:string){item.imageUrl=url;},get path(){return item.imagePath||'';},set path(path:string){item.imagePath=path;}}))];
    for(const reference of references){
      const asset=assets.current.get(reference.url);if(!asset){if(reference.url.startsWith('blob:'))throw new Error('Uma imagem temporária não está mais disponível. Selecione-a novamente antes de publicar.');continue;}
      if(!asset.publicUrl){
        const {error}=await supabase.storage.from('portal-assets').upload(asset.path,asset.blob,{contentType:'image/webp',upsert:false});
        if(error)throw new Error('Não foi possível publicar uma imagem. Sua prévia continua disponível para tentar novamente.');
        asset.publicUrl=supabase.storage.from('portal-assets').getPublicUrl(asset.path).data.publicUrl;
      }
      reference.url=asset.publicUrl;reference.path=asset.path;
    }
    return result;
  };
  const commitAssets=(config:Config)=>{
    const urls=new Set([...config.hero.backgroundImages.map(image=>image.url),...Object.values(config.elements||{}).map(item=>item.imageUrl)]);
    assets.current.forEach(asset=>{if(asset.publicUrl && urls.has(asset.publicUrl))asset.published=true;});
  };
  const discardAssets=async()=>{
    const abandoned=[...assets.current.values()].filter(asset=>asset.publicUrl&&!asset.published).map(asset=>asset.path);
    if(abandoned.length && supabase){
      const {error}=await supabase.storage.from('portal-assets').remove(abandoned);
      if(error)throw new Error('A prévia foi descartada, mas não foi possível limpar todas as imagens temporárias enviadas durante a tentativa de publicação.');
    }
    assets.current.forEach((_,url)=>URL.revokeObjectURL(url));assets.current.clear();
  };
  return {commitAssets,discardAssets,preparing,value:state.value,change,reset:(value:Config)=>{latest.current=value;dispatch({type:'reset',value});},undo:()=>dispatch({type:'undo'}),redo:()=>dispatch({type:'redo'}),canUndo:!!state.past.length,canRedo:!!state.future.length,prepareImage,materialize};
}
