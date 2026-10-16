import { supabase } from './supabaseClient';

export interface SpMunicipality {
  id: number;
  name: string;
}

let municipalitiesCache: SpMunicipality[] | null = null;

export async function getSpMunicipalities(): Promise<SpMunicipality[]> {
  if (municipalitiesCache) return municipalitiesCache;
  const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios', {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Não foi possível consultar os municípios de São Paulo.');
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('A lista de municípios está indisponível.');
  const municipalities = payload
    .filter((item): item is { id: number; nome: string } =>
      typeof item === 'object' && item !== null &&
      typeof (item as { id?: unknown }).id === 'number' &&
      typeof (item as { nome?: unknown }).nome === 'string')
    .map(item => ({ id: item.id, name: item.nome.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (municipalities.length < 600) throw new Error('A lista de municípios está incompleta.');
  municipalitiesCache = municipalities;
  return municipalities;
}

export async function getOfficialSpNeighborhoods(city: string): Promise<string[]> {
  if (!supabase) throw new Error('Serviço indisponível.');
  const { data, error } = await supabase.rpc('get_partnership_official_sp_neighborhoods', { p_city: city });
  if (error) throw error;
  return Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : [];
}

/** @deprecated Use getOfficialSpNeighborhoods after the official catalog migration. */
export const getRegisteredSpNeighborhoods = getOfficialSpNeighborhoods;
