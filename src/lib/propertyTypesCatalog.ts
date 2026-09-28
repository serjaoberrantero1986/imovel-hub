import { supabase } from './supabaseClient';

export interface PropertyTypeCatalogItem {
  id: string; name: string; description: string; icon: string;
  isActive: boolean; displayOrder: number;
}
export interface PropertyTypeInput { id?: string; name: string; description: string; icon: string; displayOrder: number; }
export const DEFAULT_PROPERTY_TYPES: PropertyTypeCatalogItem[] = [
  ['apartment','Apartamento','Padrão, studio ou cobertura','Building'],['house','Casa de Bairro','Casa independente em bairro aberto','Home'],
  ['condo_house','Casa em Condomínio','Residencial fechado','Home'],['land','Terreno','Lote em condomínio ou bairro aberto','Maximize2'],
  ['chacara','Chácara','Área de lazer e descanso','Trees'],['farm','Sítio/Fazenda','Área rural e produção','Tractor'],
  ['commercial','Comercial','Sala, galpão ou loja','Store'],['launch','Lançamento','Em obras ou na planta','Sparkles']
].map((item,index)=>({id:item[0] as string,name:item[1] as string,description:item[2] as string,icon:item[3] as string,isActive:true,displayOrder:(index+1)*10}));

const mapItem = (row: any): PropertyTypeCatalogItem => ({
  id: row.id, name: row.name, description: row.description || '', icon: row.icon || 'Building2',
  isActive: row.is_active ?? true, displayOrder: row.display_order ?? 0
});
export const createPropertyTypeId = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,50);

export async function fetchPropertyTypesCatalog() {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { data, error } = await supabase.from('property_types_catalog').select('id,name,description,icon,is_active,display_order').order('display_order').order('name');
  if (error) throw error; return (data || []).map(mapItem);
}
export async function createPropertyType(input: PropertyTypeInput) {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const id = input.id || createPropertyTypeId(input.name); if (!id) throw new Error('Informe um nome válido.');
  const { error } = await supabase.from('property_types_catalog').insert({ id, name: input.name.trim(), description: input.description.trim(), icon: input.icon, display_order: input.displayOrder });
  if (error?.code === '23505') throw new Error('Já existe um tipo com esse identificador.'); if (error) throw error;
}
export async function updatePropertyType(id: string, input: PropertyTypeInput) {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await supabase.from('property_types_catalog').update({ name: input.name.trim(), description: input.description.trim(), icon: input.icon, display_order: input.displayOrder, updated_at: new Date().toISOString() }).eq('id',id); if (error) throw error;
}
export async function setPropertyTypeActive(id: string, isActive: boolean) {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await supabase.from('property_types_catalog').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id',id); if (error) throw error;
}
export async function deletePropertyType(id: string) {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { count, error: countError } = await supabase.from('properties').select('id',{count:'exact',head:true}).eq('type',id); if (countError) throw countError;
  if ((count || 0)>0) throw new Error('Este tipo está vinculado a imóveis. Desative-o para preservar os anúncios existentes.');
  const { error } = await supabase.from('property_types_catalog').delete().eq('id',id); if (error) throw error;
}
