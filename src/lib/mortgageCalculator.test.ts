import assert from 'node:assert/strict';
import {calculateBuyingPower,calculateRequiredIncome,monthlyRateFromAnnual,presentValue,pricePayment} from './mortgageCalculator';

const rate={institutionId:'1',institution:'Banco',institutionSlug:'banco',productId:'1',product:'SBPE',audience:'general' as const,indexer:'TR',amortizationSystems:['SAC','PRICE'],maxLtv:.8,incomeCommitment:.3,minTermMonths:120,maxTermMonths:420,annualRate:.1099,rateKind:'advertised' as const,verifiedAt:'2026-10-26',effectiveFrom:'2026-10-26'};
assert.ok(monthlyRateFromAnnual(.1099)>.008);
assert.ok(presentValue(3000,.1099,360)>300000);
assert.ok(pricePayment(320000,.1099,360)>2900);
const enoughEntry=calculateBuyingPower(rate,10000,100000,0,360);
assert.equal(enoughEntry.maxPayment,3000);
assert.ok(enoughEntry.buyingPower>390000);
const lowEntry=calculateBuyingPower(rate,10000,20000,0,360);
assert.equal(Math.round(lowEntry.buyingPower),100000);
assert.ok(lowEntry.minimumDownPayment>0);
const required=calculateRequiredIncome(rate,400000,80000,0,360);
assert.ok(required.minimumIncome>9000);
assert.equal(presentValue(1000,0,120),120000);
assert.equal(pricePayment(120000,0,120),1000);
console.log('mortgageCalculator: ok');
