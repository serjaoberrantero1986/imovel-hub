import { PropertyAmenity } from '../../types';

export const AMENITIES_LIST: PropertyAmenity[] = [
  { id: 'piscina', name: 'Piscina Adulto e Infantil', category: 'lazer', icon: 'Waves' },
  { id: 'churrasqueira', name: 'Churrasqueira Gourmet', category: 'lazer', icon: 'Flame' },
  { id: 'academia', name: 'Academia Completa', category: 'lazer', icon: 'Dumbbell' },
  { id: 'quadra_tenis', name: 'Quadra de Tênis / Beach Tennis', category: 'lazer', icon: 'Trophy' },
  { id: 'playground', name: 'Playground', category: 'lazer', icon: 'Smile' },
  { id: 'salao_festas', name: 'Salão de Festas', category: 'lazer', icon: 'PartyPopper' },
  { id: 'espaco_gourmet', name: 'Espaço Gourmet', category: 'lazer', icon: 'Utensils' },
  { id: 'cinema', name: 'Cinema / Coworking', category: 'lazer', icon: 'Film' },
  { id: 'sauna', name: 'Sauna & Spa', category: 'conforto', icon: 'Sparkles' },
  { id: 'portaria_24h', name: 'Portaria & Segurança 24h', category: 'seguranca', icon: 'ShieldCheck' },
  { id: 'cameras_seguranca', name: 'Monitoramento por Câmeras', category: 'seguranca', icon: 'Camera' },
  { id: 'alarme', name: 'Alarme Individual', category: 'seguranca', icon: 'Bell' },
  { id: 'elevador', name: 'Elevador Privativo / Social', category: 'estrutura', icon: 'ArrowUpDown' },
  { id: 'ar_condicionado', name: 'Ar-Condicionado Instalado', category: 'conforto', icon: 'Wind' },
  { id: 'varanda_gourmet', name: 'Varanda Gourmet Integrada', category: 'conforto', icon: 'Wine' },
  { id: 'energia_solar', name: 'Energia Solar Fotovoltaica', category: 'estrutura', icon: 'Sun' },
  { id: 'carregador_eletrico', name: 'Ponto p/ Carro Elétrico', category: 'estrutura', icon: 'Zap' },
  { id: 'pet_place', name: 'Pet Place / Pet Care', category: 'conforto', icon: 'Dog' },
  { id: 'moveis_planejados', name: 'Móveis Planejados', category: 'conforto', icon: 'Armchair' },
  { id: 'aquecimento_gas', name: 'Aquecimento a Gás', category: 'conforto', icon: 'Thermometer' },
];

export const POPULAR_CITIES = [
  'Sorocaba',
  'Votorantim',
  'São Paulo',
  'Campinas',
  'Itu',
  'Salto de Pirapora',
  'Araçoiaba da Serra',
  'Porto Feliz',
  'Indaiatuba',
  'Barueri / Alphaville'
];

export const POPULAR_NEIGHBORHOODS = [
  'Parque Campolim',
  'Centro',
  'Jardim Santa Rosália',
  'Jardim Paulistano',
  'Além Ponte',
  'Alphaville Nova Esplanada',
  'Ibiti Reserva',
  'Condomínio Giverny',
  'Granja Olga',
  'Mont Blanc'
];
