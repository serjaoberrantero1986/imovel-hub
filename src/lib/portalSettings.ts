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

export interface PortalIdentitySettings {
  portalName: string; slogan: string;
  primaryColor: string; secondaryColor: string; accentColor: string;
  logoUrl: string; logoPath: string; faviconUrl: string; faviconPath: string;
  heroImageUrl: string; heroImagePath: string; shareImageUrl: string; shareImagePath: string;
}
export interface HomeInfoCard { id:string; title:string; description:string; icon:string; iconColor:string; backgroundColor:string; textColor:string; linkLabel:string; action:'none'|'security'; isActive:boolean; displayOrder:number; }
export interface HomeBanner { id:string; title:string; description:string; buttonLabel:string; action:'publish'|'search'|'external'|'none'; externalUrl:string; startColor:string; endColor:string; textColor:string; imageUrl:string; imagePath:string; startsAt:string; endsAt:string; isActive:boolean; displayOrder:number; }
export interface HomePageSettings { heroLine1:string; heroLine2:string; heroLine3:string; heroSubtitle:string; infoCards:HomeInfoCard[]; banners:HomeBanner[]; }

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
export const DEFAULT_PORTAL_IDENTITY: PortalIdentitySettings = {
  portalName:'Web Imóvel', slogan:'Classificados & Gestão Imobiliária',
  primaryColor:'#e11d48', secondaryColor:'#4f46e5', accentColor:'#d97706',
  logoUrl:'',logoPath:'',faviconUrl:'',faviconPath:'',heroImageUrl:'',heroImagePath:'',shareImageUrl:'',shareImagePath:''
};
export const DEFAULT_HOME_PAGE_SETTINGS: HomePageSettings = {
  heroLine1:'Seu próximo imóvel',heroLine2:'está mais perto do que',heroLine3:'você imagina.',heroSubtitle:'Encontre imóveis para comprar, alugar ou investir em poucos cliques.',
  infoCards:[
    {id:'security',title:'Segurança & Verificação CRECI',description:'Todos os anúncios e corretores parceiros são verificados garantindo total transparência e proteção jurídica em todas as negociações.',icon:'ShieldCheck',iconColor:'#e11d48',backgroundColor:'#ffffff',textColor:'#0f172a',linkLabel:'Ver Dicas',action:'security',isActive:true,displayOrder:10},
    {id:'crm',title:'CRM & Gestão de Leads Integrado',description:'Para corretores e imobiliárias: funil kanban inteligente, disparo direto para WhatsApp e métricas de desempenho em tempo real.',icon:'TrendingUp',iconColor:'#4f46e5',backgroundColor:'#ffffff',textColor:'#0f172a',linkLabel:'',action:'none',isActive:true,displayOrder:20},
    {id:'media',title:'Fotos em Alta Resolução & Tour em Vídeo',description:'Apresentação impecável com galerias otimizadas para mobile e desktop, gerando até 3x mais contatos qualificados por anúncio.',icon:'Award',iconColor:'#d97706',backgroundColor:'#ffffff',textColor:'#0f172a',linkLabel:'',action:'none',isActive:true,displayOrder:30}
  ],
  banners:[{id:'advertise',title:'Quer Vender ou Alugar seu Imóvel Mais Rápido?',description:'Cadastre seu anúncio em menos de 3 minutos e alcance milhares de compradores e investidores em Sorocaba e região.',buttonLabel:'Anunciar Imóvel Agora',action:'publish',externalUrl:'',startColor:'#f00038',endColor:'#4338ca',textColor:'#ffffff',imageUrl:'',imagePath:'',startsAt:'',endsAt:'',isActive:true,displayOrder:10}]
};

export async function fetchFooterSettings(): Promise<FooterSettings> {
  if (!supabase) return DEFAULT_FOOTER_SETTINGS;
  const { data, error } = await supabase.from('portal_settings').select('footer').eq('id', 'default').maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_FOOTER_SETTINGS, ...((data?.footer as Partial<FooterSettings> | null) || {}) };
}

export async function fetchPortalIdentity(): Promise<PortalIdentitySettings> {
  if (!supabase) return DEFAULT_PORTAL_IDENTITY;
  const { data, error } = await supabase.from('portal_settings').select('identity').eq('id','default').maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_PORTAL_IDENTITY, ...((data?.identity as Partial<PortalIdentitySettings> | null) || {}) };
}

export async function savePortalIdentity(identity: PortalIdentitySettings): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await supabase.from('portal_settings').update({ identity, updated_at:new Date().toISOString() }).eq('id','default');
  if (error) throw error;
}
export async function fetchHomePageSettings(): Promise<HomePageSettings> {
  if(!supabase)return DEFAULT_HOME_PAGE_SETTINGS;
  const {data,error}=await supabase.from('portal_settings').select('home_page').eq('id','default').maybeSingle();
  if(error)throw error;
  const value=(data?.home_page as Partial<HomePageSettings>|null)||{};
  return {...DEFAULT_HOME_PAGE_SETTINGS,...value,infoCards:value.infoCards||DEFAULT_HOME_PAGE_SETTINGS.infoCards,banners:value.banners||DEFAULT_HOME_PAGE_SETTINGS.banners};
}
export async function saveHomePageSettings(homePage:HomePageSettings):Promise<void>{
  if(!supabase)throw new Error('Serviço temporariamente indisponível.');
  const {error}=await supabase.from('portal_settings').update({home_page:homePage,updated_at:new Date().toISOString()}).eq('id','default');
  if(error)throw error;
}

export async function saveFooterSettings(footer: FooterSettings): Promise<void> {
  if (!supabase) throw new Error('Serviço temporariamente indisponível.');
  const { error } = await supabase.from('portal_settings').update({ footer, updated_at: new Date().toISOString() }).eq('id', 'default');
  if (error) throw error;
}
