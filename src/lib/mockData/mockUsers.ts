import { UserProfile } from '../../types';

export const BROKERS: UserProfile[] = [
  {
    id: 'user_1',
    name: 'Carlos Mendes Ortega',
    email: 'carlos.mendes@webimovel.com.br',
    phone: '(15) 3232-9092',
    whatsapp: '5515998765432',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80',
    role: 'broker',
    creci: '9835-J',
    agencyName: 'Mendes Ortega Imóveis',
    agencyLogo: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=128&q=80',
    verified: true,
    activeListingsCount: 24,
    rating: 4.9,
    totalDeals: 142
  },
  {
    id: 'user_2',
    name: 'Helena Albuquerque',
    email: 'helena.albuquerque@webimovel.com.br',
    phone: '(11) 3456-7890',
    whatsapp: '5511987651234',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    role: 'broker',
    creci: '142850-F',
    agencyName: 'Albuquerque Private Homes',
    verified: true,
    activeListingsCount: 18,
    rating: 5.0,
    totalDeals: 89
  },
  {
    id: 'user_current',
    name: 'Edson Ricardo Souza',
    email: 'souzanegocio@creci.org',
    emailAliases: ['edsonricardosouza@gmail.com', 'souzanegocio@creci.org', 'souzanegocio@creci.org.br', 'edson.ricardo.souza@gmail.com'],
    phone: '(15) 99123-4567',
    whatsapp: '5515991234567',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    role: 'broker',
    creci: '185420-F',
    agencyName: 'Ricardo & Souza Consultoria Imobiliária',
    agencyLogo: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=128&q=80',
    verified: true,
    activeListingsCount: 8,
    rating: 4.8,
    totalDeals: 36
  }
];
