export interface MortgageRate {
  institutionId: string;
  institution: string;
  institutionSlug: string;
  productId: string;
  product: string;
  audience: 'general'|'relationship'|'segment'|'program';
  indexer: string;
  amortizationSystems: string[];
  maxLtv: number;
  incomeCommitment: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualRate: number;
  rateKind: 'advertised'|'market_average'|'manual';
  verifiedAt: string;
  effectiveFrom: string;
  sourceName?: string;
  sourceUrl?: string;
}

export interface BuyingPowerResult {
  rate: MortgageRate;
  monthlyRate: number;
  maxPayment: number;
  financeCapacity: number;
  buyingPowerByIncome: number;
  buyingPower: number;
  financedAmount: number;
  minimumDownPayment: number;
  firstSacPayment: number;
  pricePayment: number;
  minimumIncome: number;
  comfortableIncome: number;
}

export const monthlyRateFromAnnual=(annual:number)=>Math.pow(1+annual,1/12)-1;
export function presentValue(payment:number,annualRate:number,months:number){
  if(payment<=0||months<=0)return 0;
  const rate=monthlyRateFromAnnual(annualRate);
  return rate===0?payment*months:payment*(1-Math.pow(1+rate,-months))/rate;
}
export function pricePayment(principal:number,annualRate:number,months:number){
  if(principal<=0||months<=0)return 0;
  const rate=monthlyRateFromAnnual(annualRate);
  return rate===0?principal/months:principal*rate/(1-Math.pow(1+rate,-months));
}
export function calculateBuyingPower(rate:MortgageRate,income:number,cash:number,fgts:number,months:number):BuyingPowerResult{
  const term=Math.max(rate.minTermMonths,Math.min(months,rate.maxTermMonths));
  const ownFunds=Math.max(0,cash)+Math.max(0,fgts),maxPayment=Math.max(0,income)*rate.incomeCommitment;
  const capacity=presentValue(maxPayment,rate.annualRate,term),byIncome=capacity+ownFunds;
  const byEntry=rate.maxLtv>=1?byIncome:ownFunds/(1-rate.maxLtv);
  const buyingPower=Math.max(0,Math.min(byIncome,byEntry));
  const financedAmount=Math.max(0,buyingPower-ownFunds),minimumDownPayment=Math.max(0,byIncome*(1-rate.maxLtv)-ownFunds);
  const payment=pricePayment(financedAmount,rate.annualRate,term),monthly=monthlyRateFromAnnual(rate.annualRate);
  return {rate,monthlyRate:monthly,maxPayment,financeCapacity:capacity,buyingPowerByIncome:byIncome,buyingPower,financedAmount,minimumDownPayment,
    firstSacPayment:financedAmount>0?financedAmount/term+financedAmount*monthly:0,pricePayment:payment,
    minimumIncome:rate.incomeCommitment>0?payment/rate.incomeCommitment:0,comfortableIncome:payment/.25};
}
export function calculateRequiredIncome(rate:MortgageRate,propertyValue:number,cash:number,fgts:number,months:number):BuyingPowerResult{
  const ownFunds=Math.max(0,cash)+Math.max(0,fgts),principal=Math.max(0,propertyValue-ownFunds),term=Math.max(rate.minTermMonths,Math.min(months,rate.maxTermMonths));
  const payment=pricePayment(principal,rate.annualRate,term),income=rate.incomeCommitment>0?payment/rate.incomeCommitment:0;
  return calculateBuyingPower(rate,income,cash,fgts,term);
}

