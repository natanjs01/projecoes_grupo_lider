'use client';

import { useState } from 'react';
import financialData from '../lib/financial-data.json';
import { formatBRL, formatPct, MONTHS, cn } from '../lib/format';

const { fc, premissas } = financialData ?? {};
const rates = premissas?.scenarioRates ?? {};

interface Props {
  scenario: 'realista' | 'otimista' | 'pessimista';
}

function getMultiplier(scenario: string, year: number): number {
  const base = rates?.realista ?? 0.06;
  const selected = (rates as any)?.[scenario] ?? base;
  return Math.pow((1 + selected) / (1 + base), year);
}

const highlightRows = ['EBITIDA Ajustado', 'Caixa Operacional', 'Caixa livre', 'Caixa Preliminar', 'VPL 10 anos', 'NCG'];
const subtotalRows = ['Fluxo de caixa de investimentos', 'Fluxo de caixa de financiamento', 'Fluxo de caixa após baixa aplicações'];

export default function FcTab({ scenario }: Props) {
  const [showMonths, setShowMonths] = useState(false);
  const rows = fc?.rows ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Fluxo de Caixa</h2>
          <p className="text-xs text-muted-foreground mt-0.5">FC_E - Projeção de 5 anos com NPV e análise de investimentos</p>
        </div>
        <button
          onClick={() => setShowMonths(!showMonths)}
          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
            showMonths ? 'bg-red-600 border-red-600 text-white' : 'border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          {showMonths ? 'Ocultar Meses' : 'Mostrar Meses (Ano 1)'}
        </button>
      </div>

      {/* VPL Card */}
      {rows?.find?.((r: any) => (r?.label ?? '').includes('VPL')) && (
        <div className="bg-gradient-to-r from-red-950/40 to-card rounded-lg border border-red-900/30 p-4 mb-4" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">VPL 10 anos (NPV)</p>
              <p className="font-mono text-2xl font-bold text-red-400">
                R$ {formatBRL((rows?.find?.((r: any) => (r?.label ?? '').includes('VPL'))?.ano1 ?? 0) / 1000, 0)}K
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Taxa de Desconto</p>
              <p className="font-mono text-lg font-bold">
                {formatPct(rows?.find?.((r: any) => (r?.label ?? '').includes('TAXA'))?.ano1)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="overflow-x-auto">
          <table className="fin-table">
            <thead>
              <tr>
                <th className="min-w-[280px]">Fluxo Financeiro</th>
                {showMonths && MONTHS.map((m: string) => (
                  <th key={m} className="text-right min-w-[90px]">{m}</th>
                ))}
                <th className="text-right min-w-[120px]">Ano 1</th>
                <th className="text-right min-w-[120px]">Ano 2</th>
                <th className="text-right min-w-[120px]">Ano 3</th>
                <th className="text-right min-w-[120px]">Ano 4</th>
                <th className="text-right min-w-[120px]">Ano 5</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row: any, idx: number) => {
                const isHighlight = highlightRows?.some?.((h: string) => (row?.label ?? '').includes(h));
                const isSubtotal = subtotalRows?.some?.((h: string) => (row?.label ?? '').includes(h));
                const isRate = (row?.label ?? '').includes('TAXA');
                const isVPL = (row?.label ?? '').includes('VPL');
                return (
                  <tr key={idx} className={cn(
                    isHighlight && 'bg-red-950/20',
                    isSubtotal && 'subtotal-row',
                    isVPL && 'bg-red-950/30',
                  )}>
                    <td className={cn('text-xs', (isHighlight || isSubtotal) && 'font-bold')}>{row?.label ?? ''}</td>
                    {showMonths && (row?.months ?? []).map((m: number, mIdx: number) => (
                      <td key={mIdx} className={`text-right ${m < 0 ? 'text-red-400' : ''}`}>
                        {isRate ? formatPct(m) : formatBRL(m * getMultiplier(scenario, 1) / 1000, 0)}
                      </td>
                    ))}
                    {[1,2,3,4,5].map((yr: number) => {
                      const val = (row as any)?.[`ano${yr}`] ?? 0;
                      const adjusted = isRate || isVPL ? val : val * getMultiplier(scenario, yr);
                      return (
                        <td key={yr} className={cn('text-right', adjusted < 0 && 'text-red-400', (isHighlight || isSubtotal) && 'font-semibold')}>
                          {isRate ? formatPct(adjusted) : formatBRL(adjusted / 1000, 0) + (Math.abs(adjusted) > 1 ? 'K' : '')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
