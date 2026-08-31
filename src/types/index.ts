export type PropertyPurpose = 'sale' | 'rent' | 'seasonal' | 'launch';

export type PropertyType = 
  | 'apartment' 
  | 'house' 
  | 'condo_house' 
  | 'penthouse' 
  | 'commercial' 
  | 'land' 
  | 'rural';

export type PropertyStatus = 
  | 'draft' 
  | 'pending_moderation' 
  | 'active' 
  | 'paused' 
  | 'sold' 
  | 'rented' 
  | 'archived';

export type UserRole = 'buyer' | 'owner' | 'broker' | 'agency' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  avatarUrl?: string;
  role: UserRole;
  creci?: string;
  agencyName?: string;
  agencyLogo?: string;
  verified?: boolean;
  activeListingsCount?: number;
  rating?: number;
  totalDeals?: number;
}

export interface PropertyMedia {
  id: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: 'image' | 'floorplan' | 'video' | 'tour_360';
  caption?: string;
  category?: 'fachada' | 'sala' | 'quarto' | 'cozinha' | 'banheiro' | 'lazer' | 'planta' | 'outros';
  isCover: boolean;
  order: number;
}

export interface PropertyAmenity {
  id: string;
  name: string;
  category: 'lazer' | 'seguranca' | 'conforto' | 'estrutura';
  icon: string;
}

export interface Property {
  id: string;
  code: string;
  userId: string;
  advertiser: UserProfile;
  title: string;
  slug: string;
  description: string;
  purpose: PropertyPurpose;
  type: PropertyType;
  status: PropertyStatus;
  featured: boolean;
  isExclusive?: boolean;
  price: number;
  pricePerMeter?: number;
  condoFee?: number;
  iptuFee?: number;
  totalArea: number;
  usefulArea: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpots: number;
  floor?: number;
  totalFloors?: number;
  solarOrientation?: 'Manhã' | 'Tarde' | 'Norte' | 'Sul';
  constructionYear?: number;
  deliveryDate?: string;
  
  // Location
  addressStreet: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  
  // Amenities & Media
  amenities: string[]; // ids of amenities
  media: PropertyMedia[];
  
  // Virtual Tour & Video
  videoUrl?: string;
  tour360Url?: string;
  
  // Metrics & Stats
  viewsCount: number;
  leadsCount: number;
  favoritesCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = 'new' | 'contacted' | 'visit_scheduled' | 'proposal_sent' | 'proposal_made' | 'closed_won' | 'won' | 'lost';

export interface Lead {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyCode: string;
  propertyPrice: number;
  propertyImage?: string;
  advertiserId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  message: string;
  origin: 'portal_form' | 'whatsapp_click' | 'phone_call' | 'schedule_visit';
  status: LeadStatus;
  notes?: string;
  budget?: number;
  scheduledVisitDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string;
  propertyPrice: number;
  otherUser: UserProfile;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface FilterState {
  purpose: PropertyPurpose | 'all';
  types: PropertyType[];
  city: string;
  neighborhoods: string[];
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms: number | 'any';
  suites: number | 'any';
  bathrooms: number | 'any';
  parkingSpots: number | 'any';
  amenities: string[];
  status?: PropertyStatus | 'all';
  featuredOnly?: boolean;
  searchTerm?: string;
  propertyCode?: string;
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'area_desc' | 'recent';
}

export interface SavedSearch {
  id: string;
  userId: string;
  title: string;
  filters: Partial<FilterState>;
  alertFrequency: 'instant' | 'daily' | 'weekly' | 'none';
  matchCount: number;
  createdAt: string;
}

export interface AnalyticsMetric {
  date: string;
  views: number;
  leads: number;
  favorites: number;
  contacts: number;
}
