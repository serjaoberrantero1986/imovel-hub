import { Property, FilterState } from '../types';

export function hasActiveFilters(filters: FilterState): boolean {
  return Boolean(
    (filters.searchTerm && filters.searchTerm.trim() !== '') ||
    (filters.propertyCode && filters.propertyCode.trim() !== '') ||
    (filters.purpose && filters.purpose !== 'all') ||
    (filters.types && filters.types.length > 0) ||
    (filters.bedrooms && filters.bedrooms !== 'any') ||
    Boolean(filters.minPrice) ||
    Boolean(filters.maxPrice) ||
    Boolean(filters.minArea) ||
    Boolean(filters.maxArea) ||
    (filters.parkingSpots && filters.parkingSpots !== 'any') ||
    (filters.amenities && filters.amenities.length > 0) ||
    (filters.city && filters.city !== 'all')
  );
}

export function filterProperties(properties: Property[], filters: FilterState): Property[] {
  return properties.filter((prop) => {
    // Search by specific Property Code
    if (filters.propertyCode && filters.propertyCode.trim() !== '') {
      const codeFilter = filters.propertyCode.trim().toLowerCase();
      if (!prop.code.toLowerCase().includes(codeFilter)) {
        return false;
      }
    }

    // Purpose filter
    if (filters.purpose && filters.purpose !== 'all' && prop.purpose !== filters.purpose) {
      return false;
    }

    // Types filter
    if (filters.types && filters.types.length > 0 && !filters.types.includes(prop.type)) {
      return false;
    }

    // City filter
    if (filters.city && filters.city !== 'all' && prop.city.toLowerCase() !== filters.city.toLowerCase()) {
      return false;
    }

    // Bedrooms filter
    if (filters.bedrooms && filters.bedrooms !== 'any') {
      const minBeds = Number(filters.bedrooms);
      if (prop.bedrooms < minBeds) return false;
    }

    // Min Price
    if (filters.minPrice && prop.price < filters.minPrice) return false;

    // Max Price
    if (filters.maxPrice && prop.price > filters.maxPrice) return false;

    // Min Area
    if (filters.minArea && (prop.usefulArea || prop.totalArea) < filters.minArea) return false;

    // Max Area
    if (filters.maxArea && (prop.usefulArea || prop.totalArea) > filters.maxArea) return false;

    // Parking spots
    if (filters.parkingSpots && filters.parkingSpots !== 'any') {
      const minSpots = Number(filters.parkingSpots);
      if (prop.parkingSpots < minSpots) return false;
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      const hasAllAmenities = filters.amenities.every(a => prop.amenities.includes(a));
      if (!hasAllAmenities) return false;
    }

    // Search term
    if (filters.searchTerm && filters.searchTerm.trim() !== '') {
      const term = filters.searchTerm.toLowerCase();
      const matchesNeighborhood = prop.neighborhood.toLowerCase().includes(term);
      const matchesCity = prop.city.toLowerCase().includes(term);
      const matchesTitle = prop.title.toLowerCase().includes(term);
      const matchesCode = prop.code.toLowerCase().includes(term);
      const matchesStreet = prop.addressStreet.toLowerCase().includes(term);
      const matchesDescription = prop.description ? prop.description.toLowerCase().includes(term) : false;

      if (!matchesNeighborhood && !matchesCity && !matchesTitle && !matchesCode && !matchesStreet && !matchesDescription) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Sorting
    if (filters.sortBy === 'price_asc') return a.price - b.price;
    if (filters.sortBy === 'price_desc') return b.price - a.price;
    if (filters.sortBy === 'area_desc') return (b.usefulArea || b.totalArea) - (a.usefulArea || a.totalArea);
    if (filters.sortBy === 'recent') {
      const dateA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
      const dateB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
      return dateB - dateA;
    }
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });
}
