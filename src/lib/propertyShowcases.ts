import { DEFAULT_FILTERS } from '../context/appTypes';
import type { FilterState } from '../types';
import type { PropertyShowcase } from './visualPortalEditor';

export const filtersForShowcase = (showcase: PropertyShowcase): FilterState => ({
  ...DEFAULT_FILTERS,
  purpose: showcase.purpose,
  types: showcase.types,
  city: showcase.city || 'all',
  minPrice: showcase.minPrice,
  maxPrice: showcase.maxPrice,
  minArea: showcase.minArea,
  maxArea: showcase.maxArea,
  featuredOnly: showcase.source === 'featured',
  sortBy: showcase.order === 'featured' ? 'relevance' : showcase.order,
});
