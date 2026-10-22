/**
 * Compara a avaliação histórica com o cadastro ATUAL do mesmo imóvel.
 * A rotina é compartilhada pelo frontend e pela API serverless para impedir
 * pesquisas pagas com parâmetros de uma versão antiga do imóvel.
 * Não altera avaliações anteriores nem migra candidatos automaticamente.
 */
const clean = x => String(x ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const area = x => {
  const n=Number(x);
  return x===undefined||x===null||x===''||!Number.isFinite(n)||n<=0
    ? null : Math.round(n*100)/100;
};
const format = x => x === null || x === undefined || x === '' ? 'Não informado' : String(x);

export function compareAssessmentSubject(assessment, property, location=property) {
  if(!assessment || !property || !location) {
    return [{field:'reference',label:'Referência',before:'Ausente',after:'Não identificada'}];
  }
  const previous=assessment.property_snapshot||{};
  const current={
    propertyId:property.id,
    type:property.type,
    purpose:property.purpose,
    city:location.city,
    state:location.state,
    neighborhood:location.neighborhood,
    totalArea:property.totalArea ?? property.total_area,
    usefulArea:property.usefulArea ?? property.useful_area,
    builtArea:property.builtArea ?? property.built_area
  };
  const stored={
    propertyId:assessment.source_property_id,
    type:assessment.property_type,
    purpose:previous.purpose,
    city:assessment.city,
    state:assessment.state,
    neighborhood:assessment.neighborhood,
    totalArea:previous.totalArea ?? assessment.land_area,
    usefulArea:previous.usefulArea,
    builtArea:previous.builtArea ?? assessment.built_area
  };
  const definitions=[
    ['propertyId','Imóvel cadastrado',false],
    ['type','Tipo do imóvel',false],
    ['purpose','Finalidade',false],
    ['city','Município',false],
    ['state','UF',false],
    ['neighborhood','Bairro',false],
    ['totalArea','Área total/terreno (m²)',true],
    ['usefulArea','Área útil (m²)',true],
    ['builtArea','Área construída (m²)',true]
  ];
  return definitions.flatMap(([field,label,numeric])=>{
    const before=numeric?area(stored[field]):clean(stored[field]);
    const after=numeric?area(current[field]):clean(current[field]);
    if(before===after)return [];
    return [{field,label,before:format(stored[field]),after:format(current[field])}];
  });
}
