import { processAndCompressImage, validateImageFile } from './imageProcessing';
import { supabase } from './supabaseClient';

export type PortalAssetKind = 'logo'|'favicon'|'hero'|'share'|'banner';

export async function uploadPortalAsset(kind:PortalAssetKind,file:File) {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const validation=await validateImageFile(file,0);
  if(!validation.valid) throw new Error(validation.error||'Imagem inválida.');
  const maxDimension=kind==='favicon'?512:kind==='logo'?1200:2560;
  const processed=await processAndCompressImage(file,{}, {maxDimension,quality:0.86,outputType:'image/webp'});
  const path=`default/${kind}/${processed.hash}.webp`;
  const {error}=await supabase.storage.from('portal-assets').upload(path,processed.blob,{contentType:'image/webp',upsert:true});
  if(error) throw error;
  const {data}=supabase.storage.from('portal-assets').getPublicUrl(path);
  return {url:data.publicUrl,path};
}

export async function deletePortalAsset(path:string) {
  if(!path||!supabase)return;
  const {error}=await supabase.storage.from('portal-assets').remove([path]);
  if(error) throw error;
}
