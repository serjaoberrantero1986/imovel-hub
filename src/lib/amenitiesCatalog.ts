import { supabase } from './supabaseClient';

export type AmenityCategory = 'lazer' | 'seguranca' | 'conforto' | 'estrutura';

export interface AmenityCatalogItem {
  id: string;
  name: string;
  category: AmenityCategory;
  icon: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AmenityInput {
  id?: string;
  name: string;
  category: AmenityCategory;
  icon: string;
  displayOrder: number;
}

const mapAmenity = (row: any): AmenityCatalogItem => ({
  id: row.id,
  name: row.name,
  category: row.category,
  icon: row.icon,
  isActive: row.is_active ?? true,
  displayOrder: row.display_order ?? 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at || row.created_at
});

export const createAmenityId = (name: string) => name.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 50);

export async function fetchAmenitiesCatalog(): Promise<AmenityCatalogItem[]> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { data, error } = await supabase.from('features')
    .select('id,name,category,icon,is_active,display_order,created_at,updated_at')
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    const legacy = await supabase.from('features').select('id,name,category,icon,created_at').order('name');
    if (legacy.error) throw legacy.error;
    return (legacy.data || []).map((row: any, index: number) => mapAmenity({
      ...row, is_active: true, display_order: (index + 1) * 10, updated_at: row.created_at
    }));
  }
  if (error) throw error;
  return (data || []).map(mapAmenity);
}

export async function createAmenity(input: AmenityInput): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const id = input.id || createAmenityId(input.name);
  if (!id) throw new Error('Informe um nome válido.');
  const { error } = await supabase.from('features').insert({
    id, name: input.name.trim(), category: input.category, icon: input.icon,
    display_order: input.displayOrder, is_active: true, updated_at: new Date().toISOString()
  });
  if (error?.code === '23505') throw new Error('Já existe uma comodidade com esse identificador.');
  if (error) throw error;
}

export async function updateAmenity(id: string, input: AmenityInput): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await supabase.from('features').update({
    name: input.name.trim(), category: input.category, icon: input.icon,
    display_order: input.displayOrder, updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) throw error;
}

export async function setAmenityActive(id: string, isActive: boolean): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await supabase.from('features')
    .update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteAmenity(id: string): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { count, error: countError } = await supabase.from('property_features')
    .select('property_id', { count: 'exact', head: true }).eq('feature_id', id);
  if (countError) throw countError;
  if ((count || 0) > 0) throw new Error('Esta comodidade já está vinculada a imóveis. Desative-a para preservar os anúncios existentes.');
  const { error } = await supabase.from('features').delete().eq('id', id);
  if (error) throw error;
}
