export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatArea(value: number): string {
  if (!value) return '0 m²';
  return `${value} m²`;
}

export function formatCompactNumber(value: number): string {
  if (!value || isNaN(value)) return 'R$ 0';
  
  if (value >= 1000000) {
    const millions = value / 1000000;
    const formatted = millions.toLocaleString('pt-BR', {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0
    });
    return `R$ ${formatted}M`;
  }
  
  if (value >= 1000) {
    const thousands = value / 1000;
    const formatted = thousands.toLocaleString('pt-BR', {
      maximumFractionDigits: 3,
      minimumFractionDigits: 0
    });
    return `R$ ${formatted}k`;
  }
  
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
}

const TYPE_PREFIXES: Record<string, string> = {
  apartment: 'AP',
  condo_house: 'CC',
  house: 'CA',
  penthouse: 'CB',
  land: 'TE',
  chacara: 'CH',
  farm: 'FA',
  commercial: 'CO',
  launch: 'LA',
  rural: 'RU',
};

const PURPOSE_PREFIXES: Record<string, string> = {
  sale: 'V',
  rent: 'L',
  seasonal: 'T',
  launch: 'LNC',
};

export interface PropertyCodeOptions {
  type?: string;
  purpose?: string;
  state?: string;
  city?: string;
}

/**
 * Geração Inteligente de Códigos Imobiliários.
 * Estrutura estratégica de mercado: [FINALIDADE][TIPO]-[UF]-[SEQUENCIAL]
 * Exemplos:
 *  - Venda de Apartamento no RJ: VAP-RJ-1042
 *  - Locação de Casa em SP: LCA-SP-2015
 *  - Venda de Casa em Condomínio no RJ: VCC-RJ-3081
 *  - Locação Comercial em MG: LCO-MG-4105
 */
export function generatePropertyCode(
  paramsOrType: string | PropertyCodeOptions = 'apartment',
  existingCodes: string[] = []
): string {
  let type = 'apartment';
  let purpose = 'sale';
  let state = 'BR';

  if (typeof paramsOrType === 'string') {
    type = paramsOrType || 'apartment';
  } else if (paramsOrType && typeof paramsOrType === 'object') {
    type = paramsOrType.type || 'apartment';
    purpose = paramsOrType.purpose || 'sale';
    if (paramsOrType.state && paramsOrType.state.trim().length >= 2) {
      state = paramsOrType.state.trim().slice(0, 2).toUpperCase();
    } else if (paramsOrType.city && paramsOrType.city.trim().length >= 2) {
      state = paramsOrType.city.trim().slice(0, 3).toUpperCase();
    }
  }

  const pCode = PURPOSE_PREFIXES[purpose?.toLowerCase()] || 'V';
  const tCode = TYPE_PREFIXES[type?.toLowerCase()] || (type && type.length >= 2 ? type.slice(0, 2).toUpperCase() : 'IM');
  const regional = state.toUpperCase();
  const basePrefix = `${pCode}${tCode}-${regional}`;

  const existingSet = new Set(existingCodes.map(c => c?.toUpperCase()));
  
  // Tenta encontrar um número sequencial / pseudo-aleatório elegante de 4 dígitos
  for (let attempt = 0; attempt < 100; attempt++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${basePrefix}-${num}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }

  // Fallback baseado no timestamp
  const timestampNum = Date.now().toString().slice(-4);
  return `${basePrefix}-${timestampNum}`;
}

export function generateSlug(title: string, code: string): string {
  return `${title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')}-${code.toLowerCase()}`;
}

export function getPropertyTypeLabel(type: string): string {
  if (!type) return '';
  const map: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa de Bairro',
    condo_house: 'Casa em Condomínio',
    land: 'Terreno',
    chacara: 'Chácara',
    farm: 'Sítio/Fazenda',
    commercial: 'Comercial',
    launch: 'Lançamento',
    penthouse: 'Cobertura',
    rural: 'Rural'
  };
  return map[type.toLowerCase()] || type;
}

export function getPropertyPurposeLabel(purpose: string): string {
  if (!purpose) return '';
  const map: Record<string, string> = {
    sale: 'Venda',
    rent: 'Locação',
    launch: 'Lançamento',
    seasonal: 'Temporada',
    season: 'Temporada',
    temporada: 'Temporada'
  };
  return map[purpose.toLowerCase()] || purpose;
}
