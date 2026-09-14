import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface PropertyMortgageCalculatorProps {
  propertyPrice: number;
}

export const PropertyMortgageCalculator: React.FC<PropertyMortgageCalculatorProps> = ({ propertyPrice }) => {
  const [downPayment, setDownPayment] = useState(propertyPrice * 0.2);
  const [loanYears, setLoanYears] = useState(30);

  // Mortgage calculation (Price Table approximation with 9.9% a.a.)
  const financedAmount = Math.max(0, propertyPrice - downPayment);
  const monthlyInterestRate = 0.099 / 12;
  const totalMonths = loanYears * 12;
  const estimatedMonthlyInstallment =
    financedAmount > 0
      ? (financedAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalMonths))) /
        (Math.pow(1 + monthlyInterestRate, totalMonths) - 1)
      : 0;

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-['Outfit']">Simulador de Financiamento Caixa / Bancos</h3>
            <p className="text-xs text-slate-300">Faça uma estimativa com taxa média de 9,9% a.a.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Valor de Entrada:</span>
              <span className="font-bold text-amber-400">
                {formatCurrency(downPayment)} ({Math.round((downPayment / propertyPrice) * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min={propertyPrice * 0.1}
              max={propertyPrice * 0.8}
              step={5000}
              value={downPayment}
              onChange={(e) => setDownPayment(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-300">Prazo do Financiamento:</span>
              <span className="font-bold text-amber-400">
                {loanYears} anos ({loanYears * 12} meses)
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={35}
              step={5}
              value={loanYears}
              onChange={(e) => setLoanYears(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-300 font-bold">
            Parcela Mensal Estimada (Primeira)
          </span>
          <div className="text-3xl font-extrabold text-white font-['Outfit']">
            {formatCurrency(estimatedMonthlyInstallment)}
          </div>
          <div className="text-[11px] text-slate-300">
            Valor a financiar: {formatCurrency(financedAmount)}
          </div>
          <div className="text-[10px] text-slate-400">
            *Valores aproximados para simulação. Sujeito à análise de crédito individual.
          </div>
        </div>
      </div>
    </div>
  );
};
