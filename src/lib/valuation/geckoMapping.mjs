import {stateCode} from '../../../lib/geckoContracts.mjs';
// Interpretação prudente de anúncios GeckoAPI e indicador preliminar de ofertas.
// Este módulo não emite PTAM, não homogeneíza imóveis e não faz requisições.
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const num=x=>{
  const v=Array.isArray(x)?x[0]:x;
  if(v&&typeof v==='object'&&!Array.isArray(v))return num(v.value??v.amount??v.mainValue??v.count);
  if(v===null||v===undefined||v==='')return null;
  const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;
};
const pos=x=>{const n=num(x);return n!==null&&n>0?n:null;};
const count=x=>{const n=num(x);return Number.isInteger(n)&&n<=50?n:null;};
const txt=(v,max=250)=>typeof v==='string'?v.trim().slice(0,max):'';
const unitTypes={
  HOME:'house',HOUSE:'house',APARTMENT:'apartment',LOT:'land',LAND:'land',
  ALLOTMENT_LAND:'land',FARM:'farm',RURAL:'farm',CONDOMINIUM:'condo_house',
  FLAT:'flat',KITNET:'kitnet',PENTHOUSE:'penthouse',WAREHOUSE:'warehouse',
  COMMERCIAL_ROOM:'commercial',COMMERCIAL_POINT:'commercial'
};
const resolveType=item=>{
  const values=[...(Array.isArray(item.unitTypes)?item.unitTypes:[]),
    item.propertyType,item.type,item.property?.type].filter(x=>typeof x==='string');
  for(const v of values){
    const code=norm(v).replace(/ /g,'_').toUpperCase();
    if(unitTypes[code])return unitTypes[code];
  }
  const name=norm(item.title||item.generatedTitle);
  if(/^(casa|sobrado)\b/.test(name))return 'house';
  if(/^(apartamento|apto|cobertura|flat|studio)\b/.test(name))return 'apartment';
  if(/^(terreno|lote)\b/.test(name))return 'land';
  if(/^(chacara|sitio|fazenda)\b/.test(name))return 'farm';
  return 'unknown';
};
export function normalizeGeckoItem(item,source,expectedPurpose='sale'){
  if(!item||typeof item!=='object')return null;
  const address=item.address&&typeof item.address==='object'?item.address:{};
  const loc=item.location&&typeof item.location==='object'?item.location:{};
  const attributes=item.attributes&&!Array.isArray(item.attributes)?item.attributes:{};
  const counts=item.counts||{};
  const first=(name,fallback)=>num(attributes[name])??num(fallback);
  const prices=Array.isArray(item.prices)?
    item.prices.find(p=>norm(p?.businessType)===expectedPurpose)||item.prices[0]||{}:
    item.prices||{};
  const price=pos(prices.mainValue??prices.value??prices.rawPrice??prices.price??
    item.askingPrice??item.price?.amount??item.price);
  const link=txt(item.url||item.listingUrl||item.link,2000);
  let url;
  try{
    const parsed=new URL(link);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||
      (parsed.hostname!==source&&!parsed.hostname.endsWith('.'+source)))return null;
    url=parsed.toString();
  }catch{return null;}
  const id=txt(String(item.id||item.listingId||item.externalId||item.listingExternalId||
    item.adId||url),120);
  const actualCity=txt(address.city||loc.city||item.city,120);
  const rawState=txt(address.stateAcronym||address.stateCode||address.state||
    loc.stateAcronym||loc.stateCode||loc.state||item.stateCode||item.state,120);
  const actualState=stateCode(rawState)||rawState.slice(0,2).toUpperCase();
  const kind=resolveType(item);
  const pricePurpose=norm(item.offerPurpose||item.businessType||
    item.transactionType||item.operation||prices.businessType);
  const purpose=/^(sale|sell|venda|buy)$/.test(pricePurpose)||/\/venda\//i.test(url)?'sale':
    /^(rent|rental|aluguel|locacao|lease)$/.test(pricePurpose)||/\/(aluguel|locacao)\//i.test(url)?'rent':'unknown';
  const textEvidence=[];
  const title=txt(item.title||item.generatedTitle||item.name||'Imóvel anunciado',250);
  const explicitlyBuilt=pos(first('builtAreas',item.area?.built??
    item.property?.builtArea??item.builtArea));
  const explicitlyLand=pos(first('landAreas',item.area?.land??
    item.property?.landArea??item.landArea));
  for(const match of title.matchAll(/(\d{1,5}(?:[,.]\d{1,2})?)\s*(?:m²|m2)(?=\s|[,.;:!?/-]|$)/gi))
    textEvidence.push(match[0]); // Indicativo textual, nunca altera a metragem estruturada.
  return {
    source_name:source,
    listing_reference:id,
    listing_url:url,
    listing_title:title,
    property_type:kind,
    asking_price:price,
    usable_area:pos(first('usableAreas',item.area?.useful??item.property?.usableArea??item.usableArea)),
    total_area:pos(first('totalAreas',item.area?.total??item.property?.totalArea??item.totalArea))||
      (kind==='land'||kind==='farm'?explicitlyLand:null),
    land_area:explicitlyLand, // Só aceitar declaração explícita de terreno.
    built_area:explicitlyBuilt, // Área útil NÃO implica área construída.
    bedrooms:count(first('bedrooms',counts.bedrooms?.count??item.bedrooms)),
    suites:count(first('suites',counts.suites?.count??item.suites)),
    bathrooms:count(first('bathrooms',counts.bathrooms?.count??item.bathrooms)),
    parking_spots:count(first('parkingSpaces',counts.garages?.count??item.parkingSpaces)),
    listing_city:actualCity,listing_state:actualState,
    listing_neighborhood:txt(address.neighborhood||loc.neighborhood||item.neighborhood,120),
    offer_purpose:purpose,
    evidence_text:textEvidence.slice(0,4)
  };
}

const median=list=>{
  const arr=[...list].sort((a,b)=>a-b);
  const m=Math.floor(arr.length/2);
  return arr.length%2?arr[m]:(arr[m-1]+arr[m])/2;
};
function basisFor(reference){
  if(['land','farm','chacara'].includes(reference.property_type))
    return {field:'total_area',referenceArea:num(reference.land_area),label:'área de terreno / total'};
  const snap=reference.property_snapshot||{};
  if(['apartment','flat','kitnet','penthouse'].includes(reference.property_type))
    return {field:'usable_area',referenceArea:num(snap.usefulArea),label:'área útil/privativa'};
  if(num(snap.usefulArea)>0)return {field:'usable_area',referenceArea:num(snap.usefulArea),label:'área útil/privativa'};
  return {field:'built_area',referenceArea:num(reference.built_area),label:'área construída'};
}
function similarType(a,b){
  if(a===b)return true;
  // Casa de condomínio não é presumida equivalente a casa de rua.
  if(a==='condo_house'||b==='condo_house')return false;
  return false;
}
export function screenOffers(reference,records,{tolerance=0.25}={}){
  const entries=[],seen=new Set(),basis=basisFor(reference);
  const purpose=reference.property_snapshot?.purpose||'sale';
  const desiredCity=norm(reference.city),desiredState=norm(reference.state);
  for(const row of records){
    const fail=(status,reason)=>entries.push({item:row,status,reason});
    if(row.excluded_by_broker){fail('excluded','Excluído por decisão manual do corretor'+
      (row.exclusion_reason?': '+row.exclusion_reason:'')+'.');continue;}
    if(row.offer_purpose!==purpose){
      fail(row.offer_purpose==='unknown'?'pending':'excluded',
        row.offer_purpose==='unknown'?'A finalidade da oferta não foi identificada.':
        'Oferta de venda/locação incompatível com o imóvel de referência.');continue;
    }
    if(!similarType(reference.property_type,row.property_type)){
      fail(row.property_type==='unknown'?'pending':'excluded','Tipologia incompatível ou não identificada.');continue;
    }
    if(!desiredCity||!desiredState||!row.listing_city||!row.listing_state){
      fail('pending','Município/UF não confirmados no anúncio.');continue;
    }
    if(norm(row.listing_city)!==desiredCity||norm(row.listing_state)!==desiredState){
      fail('excluded','O imóvel está anunciado em outro município ou estado.');continue;
    }
    if(!Number.isFinite(Number(row.asking_price))||Number(row.asking_price)<=0){
      fail('pending','Preço pedido não informado ou inválido.');continue;
    }
    const area=Number(row[basis.field]);
    if(!basis.referenceArea||basis.referenceArea<=0){
      fail('pending','O cadastro precisa informar '+basis.label+' da referência.');continue;
    }
    if(!Number.isFinite(area)||area<=0){
      fail('pending','Não há '+basis.label+' confirmada no anúncio.');continue;
    }
    if(Math.abs(area-basis.referenceArea)/basis.referenceArea>tolerance){
      fail('excluded','Área fora da tolerância de '+Math.round(tolerance*100)+'% em relação à referência.');continue;
    }
    if(row.usable_area>0&&row.total_area>0&&Number(row.usable_area)>Number(row.total_area)){
      fail('pending','Áreas informadas são contraditórias ou têm definições diferentes; conferência necessária.');continue;
    }
    const key=norm(row.source_name)+':'+norm(row.listing_reference||row.listing_url);
    const url=String(row.listing_url||'').replace(/[?#].*$/,'');
    if(seen.has(key)||seen.has(url)){
      fail('excluded','Anúncio repetido na mesma amostra.');continue;
    }
    // Anúncios distintos em portais diferentes podem ser o MESMO imóvel.
    // A coincidência é apenas suspeita; preservar os registros e pedir revisão.
    const suspected=entries.find(entry=>{
      const prev=entry.item;
      if(entry.status!=='included'||!prev||prev.source_name===row.source_name)return false;
      if(!row.listing_neighborhood||!prev.listing_neighborhood||
         norm(row.listing_neighborhood)!==norm(prev.listing_neighborhood))return false;
      const prevArea=Number(prev[basis.field]);
      return prevArea>0&&Math.abs(prevArea-area)/Math.max(prevArea,area)<=0.03&&
        Math.abs(Number(prev.asking_price)-Number(row.asking_price))/
          Math.max(Number(prev.asking_price),Number(row.asking_price))<=0.02&&
        (prev.bedrooms==null||row.bedrooms==null||prev.bedrooms===row.bedrooms)&&
        (prev.bathrooms==null||row.bathrooms==null||prev.bathrooms===row.bathrooms);
    });
    if(suspected){
      fail('pending','Possível repetição de imóvel anunciado em outro portal. Exige confirmação.');continue;
    }
    seen.add(key);seen.add(url);
    const warnings=[];
    if(row.reviewed_by_broker!==true)warnings.push('Atributos não conferidos pelo corretor.');
    if(!row.listing_neighborhood)warnings.push('Bairro não confirmado.');
    if(row.bedrooms!==null&&reference.bedrooms!==null&&row.bedrooms!==reference.bedrooms)
      warnings.push('Número de dormitórios diferente.');
    entries.push({item:row,status:'included',reason:'Atende aos filtros objetivos preliminares.',
      area,pricePerSqm:Number(row.asking_price)/area,warnings});
  }
  const included=entries.filter(e=>e.status==='included');
  const counts={included:included.length,pending:entries.filter(e=>e.status==='pending').length,
    excluded:entries.filter(e=>e.status==='excluded').length};
  const prices=included.map(e=>e.pricePerSqm);
  const ready=included.length>=2;
  const sq=ready?median(prices):null;
  const data=ready?{value:sq*basis.referenceArea,
    low:Math.min(...prices)*basis.referenceArea,
    high:Math.max(...prices)*basis.referenceArea,pricePerSqm:sq}:null;
  return {
    entries,counts,basis,ready,...(data||{value:null,low:null,high:null,pricePerSqm:null}),
    caveats:[
      'Estimativa preliminar derivada de preços pedidos, não de transações efetivas.',
      'Amostras sem homogeneização técnica ou vistoria não formam PTAM.',
      ...(included.length<5?['Quantidade reduzida de anúncios comparáveis.']:[]),
      ...(included.some(e=>e.warnings?.length)?['Existem diferenças físicas não ajustadas.']:[])
    ]
  };
}
