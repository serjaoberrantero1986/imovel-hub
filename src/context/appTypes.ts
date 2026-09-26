import { FilterState } from '../types';

export type AppView = 
  | 'portal' 
  | 'search' 
  | 'property_detail' 
  | 'dashboard' 
  | 'my_properties' 
  | 'crm_leads' 
  | 'messages' 
  | 'favorites' 
  | 'saved_searches'
  | 'comparator'
  | 'design_system'
  | 'profile'
  | 'admin_creci'
  | 'legal';

export type LegalTab = 'terms' | 'privacy' | 'consumer' | 'security' | 'cookies';

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export const DEFAULT_FILTERS: FilterState = {
  purpose: 'all',
  types: [],
  city: 'all',
  neighborhoods: [],
  bedrooms: 'any',
  suites: 'any',
  bathrooms: 'any',
  parkingSpots: 'any',
  amenities: [],
  sortBy: 'relevance',
  searchTerm: '',
  propertyCode: ''
};
