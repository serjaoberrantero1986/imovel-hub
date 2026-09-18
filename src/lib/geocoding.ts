export interface GeocodeCoordinates {
  latitude: number;
  longitude: number;
  displayName?: string;
  source: 'street_exact' | 'street' | 'neighborhood' | 'city';
}

const geocodeCache = new Map<string, GeocodeCoordinates>();

export async function geocodeAddress(params: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}): Promise<GeocodeCoordinates | null> {
  const street = (params.street || '').trim();
  const number = (params.number || '').trim();
  const neighborhood = (params.neighborhood || '').trim();
  const city = (params.city || '').trim();
  const state = (params.state || '').trim();

  if (!city && !state && !street) {
    return null;
  }

  // Chave de cache para evitar requisições repetidas
  const cacheKey = `${street}|${number}|${neighborhood}|${city}|${state}`.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Tentativas de busca do mais específico ao mais genérico
  const queries: { query: string; source: GeocodeCoordinates['source'] }[] = [];

  if (street && city) {
    if (number) {
      queries.push({
        query: `${street}, ${number}, ${neighborhood ? neighborhood + ', ' : ''}${city}, ${state}, Brasil`,
        source: 'street_exact'
      });
    }
    queries.push({
      query: `${street}, ${neighborhood ? neighborhood + ', ' : ''}${city}, ${state}, Brasil`,
      source: 'street'
    });
  }

  if (neighborhood && city) {
    queries.push({
      query: `${neighborhood}, ${city}, ${state}, Brasil`,
      source: 'neighborhood'
    });
  }

  if (city) {
    queries.push({
      query: `${city}, ${state ? state + ', ' : ''}Brasil`,
      source: 'city'
    });
  }

  for (const { query, source } of queries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'WebImovelPortal/1.0'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          if (!isNaN(lat) && !isNaN(lon)) {
            const result: GeocodeCoordinates = {
              latitude: lat,
              longitude: lon,
              displayName: data[0].display_name,
              source
            };
            geocodeCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch {
      // Continua para a próxima query menos específica
    }
  }

  return null;
}

// Fallback regional inteligente para evitar que cidades fora de Sorocaba caiam no centro de Sorocaba
const CITY_COORDINATES: Record<string, [number, number]> = {
  'rio de janeiro': [-22.9068, -43.1729],
  'são paulo': [-23.5505, -46.6333],
  'sao paulo': [-23.5505, -46.6333],
  'sorocaba': [-23.5015, -47.4580],
  'campinas': [-22.9099, -47.0626],
  'belo horizonte': [-19.9167, -43.9345],
  'curitiba': [-25.4284, -49.2733],
  'porto alegre': [-30.0346, -51.2177],
  'brasília': [-15.7801, -47.9292],
  'brasilia': [-15.7801, -47.9292],
  'salvador': [-12.9777, -38.5016],
  'florianópolis': [-27.5954, -48.5480],
  'florianopolis': [-27.5954, -48.5480],
  'recife': [-8.0476, -34.8770],
  'fortaleza': [-3.7319, -38.5267],
  'goiânia': [-16.6869, -49.2648],
  'goiania': [-16.6869, -49.2648],
  'santos': [-23.9608, -46.3336],
  'são josé dos campos': [-23.2237, -45.9009],
  'sao jose dos campos': [-23.2237, -45.9009],
  'niterói': [-22.8859, -43.1153],
  'niteroi': [-22.8859, -43.1153],
  'vitória': [-20.3155, -40.3128],
  'vitoria': [-20.3155, -40.3128]
};

const STATE_CAPITALS: Record<string, [number, number]> = {
  'RJ': [-22.9068, -43.1729],
  'SP': [-23.5505, -46.6333],
  'MG': [-19.9167, -43.9345],
  'PR': [-25.4284, -49.2733],
  'RS': [-30.0346, -51.2177],
  'SC': [-27.5954, -48.5480],
  'DF': [-15.7801, -47.9292],
  'BA': [-12.9777, -38.5016],
  'PE': [-8.0476, -34.8770],
  'CE': [-3.7319, -38.5267],
  'GO': [-16.6869, -49.2648],
  'ES': [-20.3155, -40.3128]
};

export function getCityFallbackCoordinates(city?: string, state?: string): [number, number] {
  if (city) {
    const cleanCity = city.trim().toLowerCase();
    if (CITY_COORDINATES[cleanCity]) {
      return CITY_COORDINATES[cleanCity];
    }
  }

  if (state) {
    const cleanState = state.trim().toUpperCase();
    if (STATE_CAPITALS[cleanState]) {
      return STATE_CAPITALS[cleanState];
    }
  }

  // Ponto central aproximado do Brasil
  return [-15.7801, -47.9292];
}

