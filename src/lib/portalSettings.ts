import { supabase } from './supabaseClient';

export interface FooterSettings {
  brandDescription: string;
  creci: string;
  professionalName: string;
  serviceTitle: string;
  phone: string;
  email: string;
  address: string;
  businessHours: string;
  navigationTitle: string;
  connectionTitle: string;
  newsletterText: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  copyrightText: string;
}

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  brandDescription: 'A plataforma imobiliária completa para você encontrar, vender e alugar imóveis com segurança e transparência.',
  creci: 'CRECI 275886-F',
  professionalName: 'Edson Ricardo Souza Delgado de Oliveira',
  serviceTitle: 'Central de Atendimento',
  phone: '(15) 99779-6315',
  email: 'contato@webimovel.com.br',
  address: 'Rua Francisco das Chagas, 10 - Jardim dos Ipês - Salto de Pirapora/SP',
  businessHours: 'Segunda a Sexta: 08h às 18h | Sábados: 09h às 13h',
  navigationTitle: 'Navegação',
  connectionTitle: 'Conecte-se',
  newsletterText: 'Receba novidades e oportunidades de investimento imobiliário em primeira mão.',
  instagramUrl: '', facebookUrl: '', youtubeUrl: '', linkedinUrl: '',
  copyrightText: '© 2026 Web Imóvel Brasil S/A. Todos os direitos reservados.'
};

export async function fetchFooterSettings(): Promise<FooterSettings> {
  if (!supabase) return DEFAULT_FOOTER_SETTINGS;
  const { data, error } = await supabase.from('portal_settings').select('footer').eq('id', 'default').maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_FOOTER_SETTINGS, ...((data?.footer as Partial<FooterSettings> | null) || {}) };
}

export async function saveFooterSettings(footer: FooterSettings): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await supabase.from('portal_settings').update({ footer, updated_at: new Date().toISOString() }).eq('id', 'default');
  if (error) throw error;
}
