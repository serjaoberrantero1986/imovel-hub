export interface GeocodeCoordinates {
  latitude: number;
  longitude: number;
  displayName?: string;
  source: 'street_exact' | 'street' | 'neighborhood' | 'city' | 'preset';
}

const geocodeCache = new Map<string, GeocodeCoordinates>();

// Tabela de coordenadas de bairros emblemáticos indexados por CIDADE:BAIRRO
// Garante isolamento estrito para evitar que o "Centro" de uma cidade seja atribuído a outra
const NEIGHBORHOOD_COORDINATES: Record<string, [number, number]> = {
  // Rio de Janeiro / RJ
  'rio de janeiro:copacabana': [-22.9719, -43.1843],
  'rio de janeiro:ipanema': [-22.9868, -43.2003],
  'rio de janeiro:leblon': [-22.9839, -43.2237],
  'rio de janeiro:barra da tijuca': [-23.0004, -43.3659],
  'rio de janeiro:barra': [-23.0004, -43.3659],
  'rio de janeiro:recreio dos bandeirantes': [-23.0278, -43.4687],
  'rio de janeiro:recreio': [-23.0278, -43.4687],
  'rio de janeiro:botafogo': [-22.9519, -43.1848],
  'rio de janeiro:flamengo': [-22.9304, -43.1783],
  'rio de janeiro:tijuca': [-22.9341, -43.2458],
  'rio de janeiro:laranjeiras': [-22.9344, -43.1878],
  'rio de janeiro:gávea': [-22.9786, -43.2347],
  'rio de janeiro:gavea': [-22.9786, -43.2347],
  'rio de janeiro:jardim botânico': [-22.9667, -43.2272],
  'rio de janeiro:jardim botanico': [-22.9667, -43.2272],
  'rio de janeiro:lagoa': [-22.9680, -43.2050],
  'rio de janeiro:humaitá': [-22.9575, -43.1972],
  'rio de janeiro:humaita': [-22.9575, -43.1972],
  'rio de janeiro:urca': [-22.9490, -43.1630],
  'rio de janeiro:santo cristo': [-22.8988, -43.1998],
  'rio de janeiro:porto maravilha': [-22.8988, -43.1998],
  'rio de janeiro:centro': [-22.9035, -43.1812],
  'rio de janeiro:santa teresa': [-22.9234, -43.1914],
  'rio de janeiro:leme': [-22.9634, -43.1672],
  'rio de janeiro:maracanã': [-22.9121, -43.2302],
  'rio de janeiro:maracana': [-22.9121, -43.2302],
  'rio de janeiro:grajaú': [-22.9248, -43.2625],
  'rio de janeiro:grajau': [-22.9248, -43.2625],

  // Niterói / RJ
  'niterói:icarai': [-22.9056, -43.1114],
  'niteroi:icarai': [-22.9056, -43.1114],
  'niterói:icaraí': [-22.9056, -43.1114],
  'niterói:centro': [-22.8859, -43.1153],
  'niteroi:centro': [-22.8859, -43.1153],

  // São Paulo / SP
  'são paulo:moema': [-23.6025, -46.6625],
  'sao paulo:moema': [-23.6025, -46.6625],
  'são paulo:vila mariana': [-23.5892, -46.6344],
  'sao paulo:vila mariana': [-23.5892, -46.6344],
  'são paulo:pinheiros': [-23.5670, -46.6934],
  'sao paulo:pinheiros': [-23.5670, -46.6934],
  'são paulo:itaim bibi': [-23.5843, -46.6775],
  'sao paulo:itaim bibi': [-23.5843, -46.6775],
  'são paulo:jardins': [-23.5645, -46.6667],
  'sao paulo:jardins': [-23.5645, -46.6667],
  'são paulo:morumbi': [-23.5985, -46.7118],
  'sao paulo:morumbi': [-23.5985, -46.7118],
  'são paulo:bela vista': [-23.5630, -46.6543],
  'sao paulo:bela vista': [-23.5630, -46.6543],
  'são paulo:perdizes': [-23.5369, -46.6734],
  'sao paulo:perdizes': [-23.5369, -46.6734],
  'são paulo:santana': [-23.5042, -46.6264],
  'sao paulo:santana': [-23.5042, -46.6264],
  'são paulo:tatuapé': [-23.5407, -46.5768],
  'sao paulo:tatuapé': [-23.5407, -46.5768],
  'sao paulo:tatuape': [-23.5407, -46.5768],
  'são paulo:mooca': [-23.5552, -46.5988],
  'sao paulo:mooca': [-23.5552, -46.5988],
  'são paulo:brooklin': [-23.6190, -46.6908],
  'sao paulo:brooklin': [-23.6190, -46.6908],
  'são paulo:vila madalena': [-23.5539, -46.6917],
  'sao paulo:vila madalena': [-23.5539, -46.6917],
  'são paulo:centro': [-23.5489, -46.6388],
  'sao paulo:centro': [-23.5489, -46.6388],

  // Sorocaba / SP
  'sorocaba:campolim': [-23.5283, -47.4667],
  'sorocaba:parque campolim': [-23.5283, -47.4667],
  'sorocaba:centro': [-23.5015, -47.4580],
  'sorocaba:além ponte': [-23.5039, -47.4414],
  'sorocaba:alem ponte': [-23.5039, -47.4414],
  'sorocaba:wanel ville': [-23.4912, -47.4988],
  'sorocaba:jardim dos estados': [-23.5222, -47.4678],
  'sorocaba:vila hortência': [-23.5117, -47.4398],
  'sorocaba:vila hortencia': [-23.5117, -47.4398],
  'sorocaba:alto da boa vista': [-23.4831, -47.4339],
  'sorocaba:vila leão': [-23.5152, -47.4628],
  'sorocaba:vila leao': [-23.5152, -47.4628],
  'sorocaba:trujillo': [-23.4942, -47.4675],
  'sorocaba:santa rosália': [-23.4942, -47.4498],
  'sorocaba:santa rosalia': [-23.4942, -47.4498],
};

// Cidades e Capitais Brasileiras com coordenadas centrais oficiais
const CITY_COORDINATES: Record<string, [number, number]> = {
  // Capitais
  'rio de janeiro': [-22.9068, -43.1729],
  'são paulo': [-23.5505, -46.6333],
  'sao paulo': [-23.5505, -46.6333],
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
  'vitória': [-20.3155, -40.3128],
  'vitoria': [-20.3155, -40.3128],
  'manaus': [-3.1190, -60.0217],
  'belém': [-1.4558, -48.4902],
  'belem': [-1.4558, -48.4902],
  'são luís': [-2.5307, -44.3068],
  'sao luis': [-2.5307, -44.3068],
  'maceió': [-9.6498, -35.7089],
  'maceio': [-9.6498, -35.7089],
  'natal': [-5.7945, -35.2110],
  'joão pessoa': [-7.1195, -34.8450],
  'joao pessoa': [-7.1195, -34.8450],
  'teresina': [-5.0920, -42.8038],
  'aracaju': [-10.9472, -37.0731],
  'cuiabá': [-15.6010, -56.0974],
  'cuiaba': [-15.6010, -56.0974],
  'campo grande': [-20.4697, -54.6201],
  'porto velho': [-8.7619, -63.9039],
  'macapá': [0.0356, -51.0705],
  'macapa': [0.0356, -51.0705],
  'boa vista': [2.8235, -60.6758],
  'rio branco': [-9.9754, -67.8249],
  'palmas': [-10.2491, -48.3243],

  // Cidades do Interior e Litoral
  'sorocaba': [-23.5015, -47.4580],
  'campinas': [-22.9099, -47.0626],
  'santos': [-23.9608, -46.3336],
  'são josé dos campos': [-23.2237, -45.9009],
  'sao jose dos campos': [-23.2237, -45.9009],
  'ribeirão preto': [-21.1767, -47.8108],
  'ribeirao preto': [-21.1767, -47.8108],
  'barueri': [-23.5105, -46.8761],
  'niterói': [-22.8859, -43.1153],
  'niteroi': [-22.8859, -43.1153],
  'petrópolis': [-22.5050, -43.1789],
  'petropolis': [-22.5050, -43.1789],
  'cabo frio': [-22.8794, -42.0189],
  'armação dos búzios': [-22.7561, -41.8888],
  'búzios': [-22.7561, -41.8888],
  'buzios': [-22.7561, -41.8888],
  'angra dos reis': [-23.0067, -44.3181],
  'volta redonda': [-22.5231, -44.1042],
  'balneário camboriú': [-26.9926, -48.6353],
  'balneario camboriu': [-26.9926, -48.6353],
  'itapema': [-27.0911, -48.6111],
  'joinville': [-26.3045, -48.8487],
  'londrina': [-23.3045, -51.1696],
  'maringá': [-23.4205, -51.9331],
  'maringa': [-23.4205, -51.9331],
  'caxias do sul': [-29.1678, -51.1794],
  'gramado': [-29.3787, -50.8764],
  'canela': [-29.3653, -50.8119],
  'uberlândia': [-18.9186, -48.2772],
  'uberlandia': [-18.9186, -48.2772],
  'juiz de fora': [-21.7642, -43.3496],
  'indaiatuba': [-23.0903, -47.2181],
  'itu': [-23.2642, -47.2992],
  'votorantim': [-23.5414, -47.4475],
  'salto': [-23.2014, -47.2881],
  'jundiaí': [-23.1857, -46.8978],
  'jundiai': [-23.1857, -46.8978],
  'piracicaba': [-22.7338, -47.6476]
};

const STATE_CAPITALS: Record<string, [number, number]> = {
  'AC': [-9.9754, -67.8249],
  'AL': [-9.6498, -35.7089],
  'AP': [0.0356, -51.0705],
  'AM': [-3.1190, -60.0217],
  'BA': [-12.9777, -38.5016],
  'CE': [-3.7319, -38.5267],
  'DF': [-15.7801, -47.9292],
  'ES': [-20.3155, -40.3128],
  'GO': [-16.6869, -49.2648],
  'MA': [-2.5307, -44.3068],
  'MT': [-15.6010, -56.0974],
  'MS': [-20.4697, -54.6201],
  'MG': [-19.9167, -43.9345],
  'PA': [-1.4558, -48.4902],
  'PB': [-7.1195, -34.8450],
  'PR': [-25.4284, -49.2733],
  'PE': [-8.0476, -34.8770],
  'PI': [-5.0920, -42.8038],
  'RJ': [-22.9068, -43.1729],
  'RN': [-5.7945, -35.2110],
  'RS': [-30.0346, -51.2177],
  'RO': [-8.7619, -63.9039],
  'RR': [2.8235, -60.6758],
  'SC': [-27.5954, -48.5480],
  'SP': [-23.5505, -46.6333],
  'SE': [-10.9472, -37.0731],
  'TO': [-10.2491, -48.3243]
};

// Limites geográficos dos estados (bounding boxes) para validação estrita de integridade
const STATE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  'RJ': { minLat: -23.40, maxLat: -20.70, minLng: -44.95, maxLng: -40.90 },
  'SP': { minLat: -25.35, maxLat: -19.70, minLng: -53.20, maxLng: -44.10 },
  'MG': { minLat: -22.95, maxLat: -14.20, minLng: -51.10, maxLng: -39.80 },
  'PR': { minLat: -26.75, maxLat: -22.50, minLng: -54.70, maxLng: -48.00 },
  'SC': { minLat: -29.40, maxLat: -25.90, minLng: -53.90, maxLng: -48.30 },
  'RS': { minLat: -33.80, maxLat: -27.00, minLng: -57.70, maxLng: -49.60 },
  'DF': { minLat: -16.05, maxLat: -15.45, minLng: -48.30, maxLng: -47.30 },
  'BA': { minLat: -18.35, maxLat: -8.50, minLng: -46.65, maxLng: -37.30 }
};

export function getCityFallbackCoordinates(city?: string, state?: string, neighborhood?: string): [number, number] {
  const cleanCity = (city || '').trim().toLowerCase();
  const cleanNeigh = (neighborhood || '').trim().toLowerCase();
  const cleanState = (state || '').trim().toUpperCase();

  // 1. Verifica par cidade:bairro (ex: 'rio de janeiro:copacabana' ou 'sorocaba:campolim')
  if (cleanCity && cleanNeigh) {
    const compositeKey = `${cleanCity}:${cleanNeigh}`;
    if (NEIGHBORHOOD_COORDINATES[compositeKey]) {
      return NEIGHBORHOOD_COORDINATES[compositeKey];
    }
  }

  // 2. Coordenadas da cidade
  if (cleanCity && CITY_COORDINATES[cleanCity]) {
    return CITY_COORDINATES[cleanCity];
  }

  // 3. Capital do estado
  if (cleanState && STATE_CAPITALS[cleanState]) {
    return STATE_CAPITALS[cleanState];
  }

  // 4. Centro do Brasil (Brasília)
  return [-15.7801, -47.9292];
}

/**
 * Validador e normalizador inteligente de coordenadas.
 * Se o imóvel possui coordenadas que conflitam com sua cidade/estado real
 * (ex: cadastro no Rio de Janeiro / RJ mas coordenadas salvas em Sorocaba -23.5015, -47.4580),
 * corrige automaticamente para as coordenadas verdadeiras da cidade e bairro do anúncio.
 */
export function resolvePropertyCoordinates(prop: {
  city?: string;
  state?: string;
  neighborhood?: string;
  addressStreet?: string;
  latitude?: number | null;
  longitude?: number | null;
}): [number, number] {
  const city = (prop.city || '').trim().toLowerCase();
  const state = (prop.state || '').trim().toUpperCase();
  const neighborhood = (prop.neighborhood || '').trim().toLowerCase();
  const lat = prop.latitude != null && !isNaN(Number(prop.latitude)) ? Number(prop.latitude) : null;
  const lng = prop.longitude != null && !isNaN(Number(prop.longitude)) ? Number(prop.longitude) : null;

  // 1. Detecta se a coordenada gravada é o default de Sorocaba (-23.5015, -47.4580)
  const isOldSorocabaDefault = lat !== null && lng !== null &&
    Math.abs(lat - (-23.5015)) < 0.05 &&
    Math.abs(lng - (-47.4580)) < 0.05;

  if (isOldSorocabaDefault && city && city !== 'sorocaba') {
    return getCityFallbackCoordinates(city, state, neighborhood);
  }

  // 2. Validação de fronteira geográfica por estado (bounding box)
  if (lat !== null && lng !== null && state && STATE_BOUNDS[state]) {
    const bounds = STATE_BOUNDS[state];
    const isOutsideState =
      lat < bounds.minLat || lat > bounds.maxLat ||
      lng < bounds.minLng || lng > bounds.maxLng;

    if (isOutsideState) {
      return getCityFallbackCoordinates(city, state, neighborhood);
    }
  }

  // 3. Caso especial: Rio de Janeiro com longitude de São Paulo / Sorocaba (lng < -45.0)
  if ((state === 'RJ' || city.includes('rio de janeiro')) && lng !== null && lng < -45.0) {
    return getCityFallbackCoordinates(city, state, neighborhood);
  }

  // 4. Se já tem coordenadas válidas e coerentes com a localidade, mantém
  if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
    return [lat, lng];
  }

  // 5. Fallback estruturado por cidade e bairro
  return getCityFallbackCoordinates(city, state, neighborhood);
}

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

  if (!city && !state && !street && !neighborhood) {
    return null;
  }

  // Chave de cache para evitar requisições repetidas
  const cacheKey = `${street}|${number}|${neighborhood}|${city}|${state}`.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Checagem em presets composite (cidade:bairro) para resposta instantânea e precisa
  const cleanCity = city.toLowerCase();
  const cleanNeigh = neighborhood.toLowerCase();
  if (cleanCity && cleanNeigh) {
    const compositeKey = `${cleanCity}:${cleanNeigh}`;
    if (NEIGHBORHOOD_COORDINATES[compositeKey]) {
      const [pLat, pLon] = NEIGHBORHOOD_COORDINATES[compositeKey];
      const presetResult: GeocodeCoordinates = {
        latitude: pLat,
        longitude: pLon,
        displayName: `${neighborhood}, ${city} - ${state}`,
        source: 'preset'
      };
      geocodeCache.set(cacheKey, presetResult);
      return presetResult;
    }
  }

  // 2. Consultas no OpenStreetMap Nominatim do mais específico ao mais geral
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
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          if (!isNaN(lat) && !isNaN(lon)) {
            // Valida se a coordenada retornada pelo Nominatim condiz com o estado solicitado
            if (state && STATE_BOUNDS[state.toUpperCase()]) {
              const bounds = STATE_BOUNDS[state.toUpperCase()];
              if (lat < bounds.minLat || lat > bounds.maxLat || lon < bounds.minLng || lon > bounds.maxLng) {
                continue; // Ignora resultado fora do estado esperado
              }
            }

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
      // Continua para a próxima query menos restritiva
    }
  }

  // 3. Fallback inteligente e garantido baseado em tabelas oficiais
  const [fLat, fLon] = getCityFallbackCoordinates(city, state, neighborhood);
  const fallbackResult: GeocodeCoordinates = {
    latitude: fLat,
    longitude: fLon,
    displayName: `${neighborhood ? neighborhood + ', ' : ''}${city || state}`,
    source: 'city'
  };
  geocodeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}
