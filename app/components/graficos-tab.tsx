'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import financialData from '../lib/financial-data.json';
import { formatCompact, formatPct } from '../lib/format';

const RechartsWrapper = dynamic(() => import('./recharts-wrapper'), { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Carregando gr\u00e1fico...</div> });

const { dre, fc, premissas } = financialData ?? {};
const rates = premissas?.scenarioRates ?? {};

interface Props {
  scenario: 'realista' | 'otimista' | 'pessimista';
}

function getMultiplier(scenario: string, year: number): number {
  const base = rates?.realista ?? 0.06;
  const selected = (rates as any)?.[scenario] ?? base;
  return Math.pow((1 + selected) / (1 + base), year);
}

function findDreRow(name: string): any {
  return (dre?.rows ?? []).find((r: any) => (r?.name ?? '').includes(name)) ?? {};
}

function findFcRow(name: string): any {
  return (fc?.rows ?? []).find((r: any) => (r?.label ?? '').includes(name)) ?? {};
}

export default function GraficosTab({ scenario }: Props) {
  const chartData = useMemo(() => {
    const m = (yr: number) => getMultiplier(scenario, yr);
    const recLiq = findDreRow('Receita L\u00edquida');
    const lucroBruto = findDreRow('Lucro Bruto');
    const ebitdaAjus = findDreRow('EBITIDA Ajustado');
    const lucroLiq = findDreRow('Lucro (Preju\u00edzo) L\u00edquido');
    const caixaLivre = findFcRow('Caixa livre');
    const caixaOp = findFcRow('Caixa Operacional');

    const years = [1,2,3,4,5];
    const getV = (row: any, yr: number) => ((row as any)?.[`ano${yr}`] ?? 0) * m(yr);

    const revenueData = years.map((yr: number) => ({
      name: `Ano ${yr}`,
      receitaLiquida: Math.round(getV(recLiq, yr) / 1e6),
      lucroBruto: Math.round(getV(lucroBruto, yr) / 1e6),
    }));

    const profitData = years.map((yr: number) => ({
      name: `Ano ${yr}`,
      ebitdaAjustado: Math.round(getV(ebitdaAjus, yr) / 1e6),
      lucroLiquido: Math.round(getV(lucroLiq, yr) / 1e6),
    }));

    const cashFlowData = years.map((yr: number) => ({
      name: `Ano ${yr}`,
      caixaOperacional: Math.round(getV(caixaOp, yr) / 1e6),
      caixaLivre: Math.round(getV(caixaLivre, yr) / 1e6),
    }));

    const rl = (yr: number) => getV(recLiq, yr);
    const marginData = years.map((yr: number) => {
      const r = rl(yr);
      return {
        name: `Ano ${yr}`,
        margemBruta: r ? +(getV(lucroBruto, yr) / r * 100).toFixed(2) : 0,
        margemEbitda: r ? +(getV(ebitdaAjus, yr) / r * 100).toFixed(2) : 0,
        margemLiquida: r ? +(getV(lucroLiq, yr) / r * 100).toFixed(2) : 0,
      };
    });

    return { revenueData, profitData, cashFlowData, marginData };
  }, [scenario]);

  return (
    <div>
      <h2 className="font-display text-xl font-bold tracking-tight mb-1">Gr\u00e1ficos</h2>
      <p className="text-xs text-muted-foreground mb-4">Visualiza\u00e7\u00e3o das proje\u00e7\u00f5es financeiras</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h3 className="font-display font-semibold text-sm mb-3">Receita e Lucro Bruto (R$ MM)</h3>
          <div className="h-[300px]">
            <RechartsWrapper
              type="bar"
              data={chartData?.revenueData ?? []}
              dataKeys={['receitaLiquida', 'lucroBruto']}
              colors={['#DC2626', '#60B5FF']}
              labels={['Receita L\u00edquida', 'Lucro Bruto']}
            />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h3 className="font-display font-semibold text-sm mb-3">EBITDA e Lucro L\u00edquido (R$ MM)</h3>
          <div className="h-[300px]">
            <RechartsWrapper
              type="bar"
              data={chartData?.profitData ?? []}
              dataKeys={['ebitdaAjustado', 'lucroLiquido']}
              colors={['#FF9149', '#80D8C3']}
              labels={['EBITDA Ajustado', 'Lucro L\u00edquido']}
            />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h3 className="font-display font-semibold text-sm mb-3">Fluxo de Caixa (R$ MM)</h3>
          <div className="h-[300px]">
            <RechartsWrapper
              type="line"
              data={chartData?.cashFlowData ?? []}
              dataKeys={['caixaOperacional', 'caixaLivre']}
              colors={['#DC2626', '#A19AD3']}
              labels={['Caixa Operacional', 'Caixa Livre']}
            />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4" style={{ boxShadow: 'var(--shadow-md)' }}>
          <h3 className="font-display font-semibold text-sm mb-3">Evolu\u00e7\u00e3o das Margens (%)</h3>
          <div className="h-[300px]">
            <RechartsWrapper
              type="line"
              data={chartData?.marginData ?? []}
              dataKeys={['margemBruta', 'margemEbitda', 'margemLiquida']}
              colors={['#DC2626', '#FF90BB', '#60B5FF']}
              labels={['M. Bruta', 'M. EBITDA', 'M. L\u00edquida']}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
