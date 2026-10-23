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
const parseBrazilianNumber=value=>{
  const raw=String(value??'').trim().replace(/\s+/g,'');
  if(!raw)return null;
  const cleaned=raw.replace(/[^0-9.,-]/g,'');
  if(!cleaned)return null;
  const lastComma=cleaned.lastIndexOf(','),lastDot=cleaned.lastIndexOf('.');
  let normalized=cleaned;
  if(lastComma>=0&&lastDot>=0){
    const decimal=lastComma>lastDot?',':'.';
    const thousands=decimal===','?'.':',';
    normalized=cleaned.split(thousands).join('').replace(decimal,'.');
  }else if(lastComma>=0){
    const decimals=cleaned.length-lastComma-1;
    normalized=decimals<=2?cleaned.replace(',','.'):cleaned.replace(/,/g,'');
  }else if(lastDot>=0){
    const decimals=cleaned.length-lastDot-1;
    normalized=decimals===3?cleaned.replace(/\./g,''):cleaned;
  }
  const parsed=Number(normalized);
  return Number.isFinite(parsed)&&parsed>0?parsed:null;
};
const areaInSquareMeters=(value,unit='m2')=>{
  const n=parseBrazilianNumber(value);
  if(!n)return null;
  const normalizedUnit=norm(unit);
  if(/^(ha|hectare|hectares)$/.test(normalizedUnit))return n*10000;
  return n;
};
const areaEvidenceFromText=text=>{
  const evidence=[];
  const source=String(text??'');
  const pattern=/(\d[\d.,]*)\s*(m²|m2|metros? quadrados?|ha|hectares?)/gi;
  for(const match of source.matchAll(pattern)){
    const value_m2=areaInSquareMeters(match[1],match[2]);
    if(value_m2)evidence.push({text:match[0],value_m2,unit:match[2]});
  }
  return evidence;
};
const reconcileRuralArea=(structured,evidence)=>{
  const value=pos(structured);
  if(!value)return {value:null,source:'missing'};
  const candidate=evidence.find(item=>item.value_m2>=1000&&
    Math.abs(value*1000-item.value_m2)/item.value_m2<=0.05);
  if(candidate)return {value:candidate.value_m2,source:'text_reconciled',evidence:candidate};
  return {value,source:'structured'};
};
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
  const name=norm(item.title||item.generatedTitle||item.name);
  const category=norm(item.category||item.categoryName);
  const details=norm((Array.isArray(item.properties)?item.properties:[])
    .filter(p=>/tipo|categoria|imovel/.test(norm(p?.name||p?.label)))
    .map(p=>p?.value).join(' '));
  const combined=[category,details,name].join(' ');
  if(/\b(sala comercial|salas comerciais|conjunto comercial|sala para escritorio|escritorio comercial|sala corporativa)\b/.test(combined))
    return 'commercial';
  if(/\b(galpao|galpoes|barracao industrial)\b/.test(combined))return 'warehouse';
  if(/\b(chacara|chacaras|sitio|sitios|fazenda|fazendas)\b/.test(combined))
    return 'farm';
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
  const olxProperties=Array.isArray(item.properties)?item.properties:[];
  const fromOlx=(terms)=>{
    const record=olxProperties.find(p=>terms.some(t=>
      norm([p?.name,p?.label].filter(Boolean).join(' ')).includes(t)));
    if(!record)return null;
    return areaInSquareMeters(record.value,record.unit||record.unitName||'m2');
  };
  const first=(name,fallback)=>num(attributes[name])??num(fallback);
  const prices=Array.isArray(item.prices)?
    item.prices.find(p=>norm(p?.businessType)===expectedPurpose)||item.prices[0]||{}:
    item.prices||{};
  const price=pos(prices.mainValue??prices.value??prices.rawPrice??prices.price??
    item.askingPrice??item.price?.amount??item.price);
  const link=txt(item.url||item.listingUrl||item.link,2000);
  // Link ausente/incorreto não deve apagar o candidato. Apenas impede
  // abrir anúncio e utilizá-lo até o profissional confirmar um link válido.
  let url='';
  try{
    const parsed=new URL(link);
    if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&
      (parsed.hostname===source||parsed.hostname.endsWith('.'+source)))
      url=parsed.toString();
  }catch{/* candidato permanece pendente */}
  const id=txt(String(item.id||item.listingId||item.externalId||item.listingExternalId||
    item.adId||url),120);
  const actualCity=txt(address.city||loc.city||item.city,120);
  const rawState=txt(address.stateAcronym||address.stateCode||address.state||
    loc.stateAcronym||loc.stateCode||loc.state||item.stateCode||item.state,120);
  const actualState=stateCode(rawState)||rawState.slice(0,2).toUpperCase();
  const kind=resolveType(item);
  const pricePurpose=norm(item.offerPurpose||item.businessType||item.business||
    item.transactionType||item.operation||prices.businessType);
  const nameForPurpose=norm(item.title||item.generatedTitle||item.name);
  const saleSignal=/\b(venda|vendo|vende|vender|comprar)\b/.test(nameForPurpose)||
    /(?:a|à) venda/i.test(nameForPurpose);
  const rentSignal=/\b(aluga|alugo|aluguel|alugando|locacao|locar)\b/.test(nameForPurpose);
  const purpose=/^(sale|sell|venda|buy)$/.test(pricePurpose)||/\/venda\//i.test(url)?'sale':
    /^(rent|rental|aluguel|locacao|lease)$/.test(pricePurpose)||/\/(aluguel|locacao)\//i.test(url)?'rent':
    saleSignal&&!rentSignal?'sale':rentSignal&&!saleSignal?'rent':'unknown';
  const title=txt(item.title||item.generatedTitle||item.name||'Imóvel anunciado',250);
  const areaEvidence=[...areaEvidenceFromText(title),...areaEvidenceFromText(link)].slice(0,6);
  const explicitlyBuilt=pos(first('builtAreas',item.area?.built??
    item.property?.builtArea??item.builtArea));
  const explicitlyLand=pos(first('landAreas',item.area?.land??
    item.property?.landArea??item.landArea));
  const structuredTotal=first('totalAreas',item.area?.total??item.property?.totalArea??item.totalArea??
    fromOlx(['area do terreno','area total','terreno']));
  const ruralArea=reconcileRuralArea(structuredTotal,areaEvidence);
  const totalArea=kind==='land'||kind==='farm'?ruralArea.value:
    pos(structuredTotal);
  return {
    source_name:source,
    listing_reference:id,
    listing_url:url,
    listing_title:title,
    property_type:kind,
    asking_price:price,
    usable_area:pos(first('usableAreas',item.area?.useful??item.property?.usableArea??
      item.usableArea??fromOlx(['area util','area construida','metragem']))),
    total_area:totalArea||(kind==='land'||kind==='farm'?explicitlyLand:null),
    land_area:explicitlyLand, // Só aceitar declaração explícita de terreno.
    built_area:explicitlyBuilt, // Área útil NÃO implica área construída.
    bedrooms:count(first('bedrooms',counts.bedrooms?.count??item.bedrooms??fromOlx(['quarto','dormitorio']))),
    suites:count(first('suites',counts.suites?.count??item.suites)),
    bathrooms:count(first('bathrooms',counts.bathrooms?.count??item.bathrooms)),
    parking_spots:count(first('parkingSpaces',counts.garages?.count??item.parkingSpaces)),
    listing_city:actualCity,listing_state:actualState,
    listing_neighborhood:txt(address.neighborhood||loc.neighborhood||item.neighborhood,120),
    offer_purpose:purpose,
    evidence_text:areaEvidence.map(item=>item.text).slice(0,4),
    area_evidence:areaEvidence,
    area_source:kind==='land'||kind==='farm'?ruralArea.source:
      (structuredTotal?'structured':'missing')
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
  if((a==='chacara'&&b==='farm')||(a==='farm'&&b==='chacara'))return true;
  // Casa de condomínio não é presumida equivalente a casa de rua.
  if(a==='condo_house'||b==='condo_house')return false;
  return false;
}
export function screenOffers(reference,records,{tolerance=0.25}={}){
  const entries=[],seen=new Set(),basis=basisFor(reference);
  const purpose=reference.property_snapshot?.purpose||'sale';
  const desiredCity=norm(reference.city),desiredState=norm(reference.state);
  for(const row of records){
    const reasons=[],warnings=[];
    let rejected=false,pending=false;
    const manuallyIncluded=row.manual_selection==='include';
    const reject=text=>{rejected=true;reasons.push(text);};
    const review=text=>{pending=true;reasons.push(text);};
    if(row.excluded_by_broker&&!manuallyIncluded){
      reject('Excluído por decisão manual do corretor'+
        (row.exclusion_reason?': '+row.exclusion_reason:'')+'.');
    }
    if(row.search_query_verified===false){
      if(manuallyIncluded&&row.reviewed_by_broker===true)
        warnings.push('Pesquisa original não confirmou todos os filtros; uso autorizado pelo corretor após conferência.');
      else
        reject('A busca original não confirmou os filtros de tipo/cidade/UF. Não utilizar sem uma pesquisa válida.');
    }
    if(!row.listing_url)review('Link do anúncio ausente ou não confirmado.');
    if(row.offer_purpose!==purpose){
      if(!row.offer_purpose||row.offer_purpose==='unknown')
        review('Finalidade de venda/locação não confirmada.');
      else reject('Finalidade incompatível: anúncio de '+(row.offer_purpose==='rent'?'locação':'venda')+'.');
    }
    if(!similarType(reference.property_type,row.property_type)){
      if(!row.property_type||row.property_type==='unknown')
        review('Tipologia do anúncio não identificada.');
      else reject('Tipologia incompatível: '+row.property_type+' ≠ '+reference.property_type+'.');
    }
    if(!desiredCity||!desiredState||!row.listing_city||!row.listing_state){
      review('Município ou UF não confirmados.');
    }else if(norm(row.listing_city)!==desiredCity||norm(row.listing_state)!==desiredState){
      reject('Localização incompatível: '+row.listing_city+'/'+row.listing_state+
        ', referência '+reference.city+'/'+reference.state+'.');
    }
    const asking=Number(row.asking_price);
    if(!Number.isFinite(asking)||asking<=0)review('Preço pedido não informado ou inválido.');
    const surface=Number(row[basis.field]);
    if(!basis.referenceArea||basis.referenceArea<=0)
      review('Metragem da referência ('+basis.label+') ausente.');
    if(!Number.isFinite(surface)||surface<=0)
      review('Metragem '+basis.label+' não confirmada no anúncio.');
    else if(basis.referenceArea>0){
      const deviation=Math.abs(surface-basis.referenceArea)/basis.referenceArea;
      const rural=['land','farm','chacara'].includes(reference.property_type);
      const effectiveTolerance=rural?Math.max(tolerance,0.5):tolerance;
      if(deviation>effectiveTolerance&&!manuallyIncluded)
        reject('Área fora da tolerância de '+Math.round(effectiveTolerance*100)+'% em relação à referência.');
      else if(deviation>effectiveTolerance&&manuallyIncluded)
        warnings.push('Área fora da faixa automática; uso autorizado manualmente pelo corretor.');
      else if(rural&&deviation>tolerance)
        warnings.push('Área rural dentro da faixa ampliada de conferência.');
    }
    if(manuallyIncluded&&row.reviewed_by_broker!==true)
      review('Conferência dos dados pelo corretor necessária antes do reaproveitamento.');
    if(row.usable_area>0&&row.total_area>0&&Number(row.usable_area)>Number(row.total_area))
      review('Áreas informadas contraditórias ou com definições distintas.');
    const key=norm(row.source_name)+':'+norm(row.listing_reference||row.listing_url);
    const cleanUrl=String(row.listing_url||'').replace(/[?#].*$/,'');
    if(cleanUrl&&(seen.has(key)||seen.has(cleanUrl))){
      reject('Anúncio repetido na amostra.');
    }
    if(!rejected&&!pending){
      const suspected=entries.find(entry=>{
        const prev=entry.item;
        if(entry.status!=='included'||!prev||prev.source_name===row.source_name)return false;
        if(!row.listing_neighborhood||!prev.listing_neighborhood||
          norm(row.listing_neighborhood)!==norm(prev.listing_neighborhood))return false;
        const prevArea=Number(prev[basis.field]);
        return prevArea>0&&Math.abs(prevArea-surface)/Math.max(prevArea,surface)<=0.03&&
          Math.abs(Number(prev.asking_price)-asking)/
            Math.max(Number(prev.asking_price),asking)<=0.02&&
          (prev.bedrooms==null||row.bedrooms==null||prev.bedrooms===row.bedrooms)&&
          (prev.bathrooms==null||row.bathrooms==null||prev.bathrooms===row.bathrooms);
      });
      if(suspected)review('Possível repetição de imóvel em outro portal; conferência necessária.');
    }
    // Duplicatas idênticas ficam destacadas inclusive se já estão rejeitadas.
    if(cleanUrl){seen.add(cleanUrl);seen.add(key);}
    const status=rejected?'excluded':pending?'pending':'included';
    if(status==='included'){
      if(row.reviewed_by_broker!==true)warnings.push('Atributos não conferidos pelo corretor.');
      if(manuallyIncluded)warnings.push('Incluído por decisão manual do corretor.');
      if(!row.listing_neighborhood)warnings.push('Bairro não confirmado.');
      if(row.bedrooms!==null&&reference.bedrooms!==null&&row.bedrooms!==reference.bedrooms)
        warnings.push('Número de dormitórios diferente.');
    }
    entries.push({
      item:row,status,
      reason:reasons.length?reasons.join(' • '):'Atende aos filtros objetivos preliminares.',
      reasons,
      ...(status==='included'?{area:surface,pricePerSqm:asking/surface,warnings}:{warnings})
    });
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

/** Preserva as informações fornecidas pelo portal, sem copiar campos ambíguos
 *  para as áreas técnicas. A triagem decide uso; a coleta nunca descarta.
 */
export function candidateFromGecko(item,source,index,requestId='',collectedAt=''){
  const normalized=normalizeGeckoItem(item,source)||{
    source_name:source,listing_reference:'',listing_url:'',listing_title:'Anúncio sem ficha legível',
    property_type:'unknown',asking_price:null,usable_area:null,total_area:null,
    built_area:null,land_area:null,bedrooms:null,suites:null,bathrooms:null,
    parking_spots:null,listing_city:'',listing_state:'',listing_neighborhood:'',
    offer_purpose:'unknown',evidence_text:[],area_evidence:[],area_source:'missing'
  };
  const raw=item&&typeof item==='object'?item:{};
  // Subconjunto público da listagem. Nunca salvar dados pessoais do anunciante.
  const original={
    id:raw.id??raw.listingId??null,
    title:raw.title??raw.generatedTitle??null,
    url:String(raw.url??raw.listingUrl??raw.link??'').slice(0,2000),
    description:typeof raw.description==='string'?raw.description.slice(0,3500):null,
    price:raw.price??null,
    category:typeof raw.category==='string'?raw.category.slice(0,180):null,
    prices:Array.isArray(raw.prices)?raw.prices.slice(0,5):raw.prices??null,
    unitTypes:raw.unitTypes??null,
    propertyType:raw.propertyType??null,
    business:raw.business??raw.businessType??null,
    attributes:raw.attributes??null,
    properties:Array.isArray(raw.properties)?raw.properties.slice(0,35).map(p=>({
      name:String(p?.name??'').slice(0,90),
      label:String(p?.label??'').slice(0,90),
      value:String(p?.value??'').slice(0,180)
    })):null,
    address:raw.address&&typeof raw.address==='object'?{
      city:raw.address.city,state:raw.address.state,
      stateAcronym:raw.address.stateAcronym,neighborhood:raw.address.neighborhood
    }:null,
    location:raw.location&&typeof raw.location==='object'?{
      city:raw.location.city,state:raw.location.state,
      neighborhood:raw.location.neighborhood
    }:null
  };
  const publicData=JSON.stringify(original);
  // Excedentes ficam reduzidos, mas o registro nunca é descartado.
  const capturedData=publicData.length>16000?{
    title:String(original.title??'').slice(0,250),
    description:String(original.description??'').slice(0,3000),
    properties:original.properties,
    truncated:true
  }:original;
  const reference=String(normalized.listing_reference||'').slice(0,120);
  const sourceKey=reference&&reference!==normalized.listing_url?
    'id:'+reference:normalized.listing_url?
      'url:'+normalized.listing_url.slice(0,260):
      'sem-id:'+requestId.slice(0,55)+':'+index;
  return {
    source_name:source,source_key:sourceKey.slice(0,300),
    listing_url:normalized.listing_url||null,
    listing_title:normalized.listing_title||'Imóvel anunciado',
    normalized_data:normalized,captured_data:capturedData,
    collected_at:collectedAt||new Date().toISOString()
  };
}
