export interface GeocodeCoordinates {
  latitude: number;
  longitude: number;
  displayName?: string;
  source: 'street_exact' | 'street' | 'neighborhood' | 'city' | 'preset';
}

const geocodeCache = new Map<string, GeocodeCoordinates>();

// Tabela de coordenadas de bairros emblemáticos
const NEIGHBORHOOD_COORDINATES: Record<string, [number, number]> = {
  // Rio de Janeiro
  'copacabana': [-22.9719, -43.1843],
  'ipanema': [-22.9868, -43.2003],
  'leblon': [-22.9839, -43.2237],
  'barra da tijuca': [-23.0004, -43.3659],
  'recreio dos bandeirantes': [-23.0278, -43.4687],
  'recreio': [-23.0278, -43.4687],
  'botafogo': [-22.9519, -43.1848],
  'flamengo': [-22.9304, -43.1783],
  'tijuca': [-22.9341, -43.2458],
  'laranjeiras': [-22.9344, -43.1878],
  'gávea': [-22.9786, -43.2347],
  'gavea': [-22.9786, -43.2347],
  'jardim botânico': [-22.9667, -43.2272],
  'jardim botanico': [-22.9667, -43.2272],
  'lagoa': [-22.9680, -43.2050],
  'humaitá': [-22.9575, -43.1972],
  'humaita': [-22.9575, -43.1972],
  'urca': [-22.9490, -43.1630],
  'santo cristo': [-22.8988, -43.1998],
  'porto maravilha': [-22.8988, -43.1998],
  // São Paulo
  'moema': [-23.6025, -46.6625],
  'vila mariana': [-23.5892, -46.6344],
  'pinheiros': [-23.5670, -46.6934],
  'itaim bibi': [-23.5843, -46.6775],
  'jardins': [-23.5645, -46.6667],
  'morumbi': [-23.5985, -46.7118],
  'bela vista': [-23.5630, -46.6543],
  'perdizes': [-23.5369, -46.6734],
  'santana': [-23.5042, -46.6264],
  'tatuapé': [-23.5407, -46.5768],
  'tatuape': [-23.5407, -46.5768],
  'mooca': [-23.5552, -46.5988],
  'brooklin': [-23.6190, -46.6908],
  'vila madalena': [-23.5539, -46.6917],
  'alphaville': [-23.5005, -46.8530],
  // Sorocaba
  'campolim': [-23.5283, -47.4667],
  'parque campolim': [-23.5283, -47.4667],
  'centro': [-23.5015, -47.4580],
  'além ponte': [-23.5039, -47.4414],
  'alem ponte': [-23.5039, -47.4414],
  'wanel ville': [-23.4912, -47.4988],
  'jardim dos estados': [-23.5222, -47.4678],
  'vila hortência': [-23.5117, -47.4398],
  'vila hortencia': [-23.5117, -47.4398],
  'alto da boa vista': [-23.4831, -47.4339]
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

export function getCityFallbackCoordinates(city?: string, state?: string, neighborhood?: string): [number, number] {
  // Verifica primeiro se o bairro tem coordenada exata (ex: Copacabana, Campolim, etc.)
  if (neighborhood) {
    const cleanNeigh = neighborhood.trim().toLowerCase();
    if (NEIGHBORHOOD_COORDINATES[cleanNeigh]) {
      return NEIGHBORHOOD_COORDINATES[cleanNeigh];
    }
  }

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

/**
 * Validador e normalizador inteligente de coordenadas.
 * Se o imóvel possui coordenadas que conflitam grosseiramente com a sua cidade
 * (ex: diz que é Rio de Janeiro / RJ mas a latitude/longitude é de Sorocaba -23.5015, -47.4580),
 * corrige automaticamente para a localização correta da cidade e bairro do anúncio.
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

  // Verifica se as coordenadas batem com o default antigo de Sorocaba
  const isOldSorocabaDefault = lat !== null && lng !== null &&
    Math.abs(lat - (-23.5015)) < 0.05 &&
    Math.abs(lng - (-47.4580)) < 0.05;

  // Se a coordenada atual é o default de Sorocaba, mas a cidade NÃO é Sorocaba, descarta e resolve pela cidade
  if (isOldSorocabaDefault && city && city !== 'sorocaba') {
    return getCityFallbackCoordinates(city, state, neighborhood);
  }

  // Se já tem coordenadas válidas que não são o default errôneo, mantém
  if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
    return [lat, lng];
  }

  // Caso contrário, usa a melhor aproximação pela cidade/bairro
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

  // 1. Checagem prévia em presets locais instantâneos
  if (neighborhood) {
    const nKey = neighborhood.toLowerCase();
    if (NEIGHBORHOOD_COORDINATES[nKey]) {
      const [pLat, pLon] = NEIGHBORHOOD_COORDINATES[nKey];
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

  // 2. Tentativas de busca no OpenStreetMap Nominatim do mais específico ao mais genérico
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
      // Não passar header 'User-Agent' proibido pelo browser
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

  // 3. Fallback inteligente baseado em tabelas de coordenadas conhecidas
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


