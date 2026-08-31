import { Property, Lead, CustomerPreferences } from '../types';

export interface MatchScoreResult {
  score: number; // 0 to 100
  percentageLabel: string;
  badgeColor: 'emerald' | 'blue' | 'amber' | 'slate';
  criteria: {
    name: string;
    passed: boolean;
    weight: number;
    description: string;
  }[];
  isHighMatch: boolean;
}

/**
 * Calculates a match score (0 - 100%) between a client/lead profile and a real estate property
 */
export function calculatePropertyMatchScore(lead: Lead, property: Property): MatchScoreResult {
  const criteria: MatchScoreResult['criteria'] = [];
  let earnedScore = 0;
  let totalWeight = 0;

  const prefs = lead.preferences || {};
  const effectiveMinBudget = lead.budgetMin || (lead.budget ? lead.budget * 0.7 : undefined);
  const effectiveMaxBudget = lead.budgetMax || (lead.budget ? lead.budget * 1.15 : undefined);

  // 1. Budget / Price Match (Weight: 30)
  const priceWeight = 30;
  totalWeight += priceWeight;
  let pricePassed = false;
  let priceDesc = 'Faixa de preço não informada pelo cliente';

  if (effectiveMinBudget !== undefined || effectiveMaxBudget !== undefined) {
    const min = effectiveMinBudget ?? 0;
    const max = effectiveMaxBudget ?? Infinity;
    
    // Tolerance buffer: up to +10% max or -15% min still gives partial or full match
    if (property.price >= min && property.price <= max) {
      pricePassed = true;
      earnedScore += priceWeight;
      priceDesc = `Imóvel (R$ ${property.price.toLocaleString('pt-BR')}) perfeitamente dentro do orçamento (R$ ${min.toLocaleString('pt-BR')} - ${max === Infinity ? 'Ilimitado' : max.toLocaleString('pt-BR')})`;
    } else if (property.price <= max * 1.10 && property.price >= min * 0.85) {
      pricePassed = true;
      earnedScore += priceWeight * 0.7;
      priceDesc = `Preço (R$ ${property.price.toLocaleString('pt-BR')}) com leve margem negociável de até 10% do teto`;
    } else {
      priceDesc = `Fora do orçamento estimado (R$ ${property.price.toLocaleString('pt-BR')})`;
    }
  } else {
    // If no explicit budget, check if it matches the lead origin property price within 20%
    if (lead.propertyPrice) {
      const diff = Math.abs(property.price - lead.propertyPrice) / lead.propertyPrice;
      if (diff <= 0.2) {
        pricePassed = true;
        earnedScore += priceWeight * 0.9;
        priceDesc = 'Preço similar ao imóvel de interesse original';
      }
    } else {
      earnedScore += priceWeight * 0.5; // neutral
      priceDesc = 'Sem orçamento restritivo cadastrado';
    }
  }

  criteria.push({
    name: 'Orçamento & Preço',
    passed: pricePassed,
    weight: priceWeight,
    description: priceDesc
  });

  // 2. Purpose Match (Venda vs Locação) (Weight: 15)
  const purposeWeight = 15;
  totalWeight += purposeWeight;
  const desiredPurpose = prefs.purpose || (lead.propertyPrice < 25000 ? 'rent' : 'sale');
  const purposePassed = property.purpose === desiredPurpose;
  if (purposePassed) {
    earnedScore += purposeWeight;
  }
  criteria.push({
    name: 'Finalidade',
    passed: purposePassed,
    weight: purposeWeight,
    description: purposePassed 
      ? `Finalidade idêntica (${property.purpose === 'sale' ? 'Venda' : 'Locação'})` 
      : `Divergente (Busca ${desiredPurpose === 'sale' ? 'Compra' : 'Aluguel'})`
  });

  // 3. Property Type Match (Weight: 15)
  const typeWeight = 15;
  totalWeight += typeWeight;
  let typePassed = false;
  if (prefs.types && prefs.types.length > 0) {
    typePassed = prefs.types.includes(property.type);
  } else {
    // Default to origin property type or generic match
    typePassed = true;
  }
  if (typePassed) {
    earnedScore += typeWeight;
  }
  criteria.push({
    name: 'Tipologia do Imóvel',
    passed: typePassed,
    weight: typeWeight,
    description: typePassed 
      ? `Tipo compatível (${translatePropertyType(property.type)})` 
      : `Tipo não prioritário (${translatePropertyType(property.type)})`
  });

  // 4. Location Match (Weight: 20)
  const locWeight = 20;
  totalWeight += locWeight;
  let locPassed = false;
  let locDesc = 'Localização compatível';

  const desiredNeighborhoods = prefs.desiredNeighborhoods || [];
  const desiredCity = prefs.desiredCity || 'Sorocaba';

  if (desiredNeighborhoods.length > 0) {
    locPassed = desiredNeighborhoods.some(n => 
      property.neighborhood.toLowerCase().includes(n.toLowerCase()) ||
      n.toLowerCase().includes(property.neighborhood.toLowerCase())
    );
    if (locPassed) {
      earnedScore += locWeight;
      locDesc = `Bairro desejado: ${property.neighborhood}`;
    } else if (property.city.toLowerCase().includes(desiredCity.toLowerCase())) {
      locPassed = true;
      earnedScore += locWeight * 0.6;
      locDesc = `Mesma cidade (${property.city}), bairro próximo`;
    } else {
      locDesc = `Bairro diferente (${property.neighborhood})`;
    }
  } else if (lead.desiredLocation) {
    const term = lead.desiredLocation.toLowerCase();
    if (property.neighborhood.toLowerCase().includes(term) || property.city.toLowerCase().includes(term)) {
      locPassed = true;
      earnedScore += locWeight;
      locDesc = `Localização desejada: ${property.neighborhood}, ${property.city}`;
    } else {
      earnedScore += locWeight * 0.5;
      locDesc = `Região de ${property.neighborhood}`;
    }
  } else {
    earnedScore += locWeight * 0.8;
    locDesc = `Região metropolitana (${property.city})`;
  }

  criteria.push({
    name: 'Localização & Bairro',
    passed: locPassed,
    weight: locWeight,
    description: locDesc
  });

  // 5. Bedrooms & Spaces (Weight: 10)
  const roomWeight = 10;
  totalWeight += roomWeight;
  let roomPassed = true;
  let roomScore = roomWeight;

  if (prefs.minBedrooms !== undefined && property.bedrooms < prefs.minBedrooms) {
    roomPassed = false;
    roomScore -= 5;
  }
  if (prefs.minParkingSpots !== undefined && property.parkingSpots < prefs.minParkingSpots) {
    roomPassed = false;
    roomScore -= 5;
  }
  earnedScore += Math.max(0, roomScore);

  criteria.push({
    name: 'Quartos & Vagas',
    passed: roomPassed,
    weight: roomWeight,
    description: `${property.bedrooms} dorms, ${property.parkingSpots} vagas (${roomPassed ? 'Atende aos requisitos' : 'Abaixo do desejado'})`
  });

  // 6. Amenities Match (Weight: 10)
  const amenityWeight = 10;
  totalWeight += amenityWeight;
  let amenityPassed = true;
  if (prefs.desiredAmenities && prefs.desiredAmenities.length > 0) {
    const matched = prefs.desiredAmenities.filter(a => property.amenities.includes(a));
    const ratio = matched.length / prefs.desiredAmenities.length;
    earnedScore += amenityWeight * ratio;
    amenityPassed = ratio >= 0.5;
  } else {
    earnedScore += amenityWeight * 0.8;
  }

  criteria.push({
    name: 'Comodidades & Lazer',
    passed: amenityPassed,
    weight: amenityWeight,
    description: `${property.amenities.length} comodidades incluídas`
  });

  // Final Percentage Calculation
  const finalPercentage = Math.min(100, Math.max(10, Math.round((earnedScore / totalWeight) * 100)));

  let badgeColor: MatchScoreResult['badgeColor'] = 'slate';
  if (finalPercentage >= 80) badgeColor = 'emerald';
  else if (finalPercentage >= 65) badgeColor = 'blue';
  else if (finalPercentage >= 45) badgeColor = 'amber';

  return {
    score: finalPercentage,
    percentageLabel: `${finalPercentage}% Compatível`,
    badgeColor,
    criteria,
    isHighMatch: finalPercentage >= 75
  };
}

/**
 * Returns top matching properties for a lead, sorted by highest compatibility score
 */
export function getTopMatchingPropertiesForLead(
  lead: Lead, 
  properties: Property[],
  limit = 8
): { property: Property; match: MatchScoreResult }[] {
  return properties
    .filter(p => p.status === 'active')
    .map(property => ({
      property,
      match: calculatePropertyMatchScore(lead, property)
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

/**
 * Helper to translate property type into human readable pt-BR
 */
function translatePropertyType(type: string): string {
  const map: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    condo_house: 'Casa em Condomínio',
    penthouse: 'Cobertura',
    commercial: 'Comercial',
    land: 'Terreno / Lote',
    rural: 'Chácara / Rural'
  };
  return map[type] || type;
}
