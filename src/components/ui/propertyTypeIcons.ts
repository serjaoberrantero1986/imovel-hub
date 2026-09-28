import { Building, Building2, Home, Maximize2, Sparkles, Store, Tractor, Trees, Warehouse } from 'lucide-react';
export const PROPERTY_TYPE_ICONS: Record<string, typeof Building> = { Building, Building2, Home, Maximize2, Sparkles, Store, Tractor, Trees, Warehouse };
export const getPropertyTypeIcon = (name: string) => PROPERTY_TYPE_ICONS[name] || Building2;
