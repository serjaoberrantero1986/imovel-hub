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
  land: 'TR',
  chacara: 'CH',
  farm: 'FA',
  commercial: 'CM',
  launch: 'LC',
  rural: 'RU',
};

export function generatePropertyCode(type: string = 'apartment', existingCodes: string[] = []): string {
  const prefix = TYPE_PREFIXES[type?.toLowerCase()] || (type && type.length >= 2 ? type.slice(0, 2).toUpperCase() : 'IM');
  
  const existingSet = new Set(existingCodes.map(c => c?.toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const candidate = `${prefix}-${num}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }
  const timestampNum = Date.now().toString().slice(-4);
  return `${prefix}-${timestampNum}`;
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
