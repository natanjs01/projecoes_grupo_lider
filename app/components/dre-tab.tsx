'use client';

import { useState, useMemo } from 'react';
import { Search, Settings2 } from 'lucide-react';
import financialData from '../lib/financial-data.json';
import { formatBRL, formatPct, cn, MONTHS } from '../lib/format';

const { dre, premissas } = financialData ?? {};
const rates = premissas?.scenarioRates ?? {};

interface Props {
  scenario: 'realista' | 'otimista' | 'pessimista';
}

function getMultiplier(scenario: string, year: number): number {
  const base = rates?.realista ?? 0.06;
  const selected = (rates as any)?.[scenario] ?? base;
  return Math.pow((1 + selected) / (1 + base), year);
}

export default function DreTab({ scenario }: Props) {
  const [search, setSearch] = useState('');
  const [showYear1Detail, setShowYear1Detail] = useState(false);

  const rows = useMemo(() => {
    const all = dre?.rows ?? [];
    if (!search?.trim()) return all;
    const s = search?.toLowerCase?.() ?? '';
    return all?.filter?.((r: any) =>
      (r?.name?.toLowerCase?.() ?? '').includes(s) ||
      (r?.code?.toLowerCase?.() ?? '').includes(s) ||
      (r?.dfs?.toLowerCase?.() ?? '').includes(s)
    ) ?? [];
  }, [search]);

  const applyScenario = (val: number, year: number): number => {
    return val * getMultiplier(scenario, year);
  };

  const yr1Multiplier = getMultiplier(scenario, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">DRE - Demonstração do Resultado</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Projeção de 5 anos - receitas, custos e despesas detalhados</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowYear1Detail(!showYear1Detail)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-colors ${
              showYear1Detail ? 'bg-red-600 border-red-600 text-white' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings2 className="w-3 h-3" />
            {showYear1Detail ? 'Ano 1 Expandido' : 'Expandir Ano 1'}
          </button>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e: any) => setSearch(e?.target?.value ?? '')}
              placeholder="Buscar conta..."
              className="pl-9 pr-3 py-1.5 text-xs bg-muted border border-border rounded w-56 focus:outline-none focus:ring-1 focus:ring-red-600"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[1,2,3,4,5].map((yr: number) => {
          const recLiq = dre?.receitaLiq ?? {};
          const val = applyScenario((recLiq as any)?.[`ano${yr}`] ?? 0, yr);
          return (
            <div key={yr} className="bg-card rounded-lg p-3 border border-border" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-[10px] text-muted-foreground">Receita Líq. Ano {yr}</p>
              <p className="font-mono text-sm font-bold text-red-400">R$ {formatBRL(val / 1000, 0)}K</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="fin-table">
            <thead>
              <tr>
                <th className="min-w-[50px]">Tipo</th>
                <th className="min-w-[180px]">Classificação</th>
                <th className="min-w-[140px]">Código</th>
                <th className="min-w-[280px]">Conta</th>
                <th className="text-right min-w-[110px]">VLR 2025</th>
                <th className="text-right min-w-[80px]">% 2025</th>
                {showYear1Detail && MONTHS.map((m: string) => (
                  <th key={m} className="text-right min-w-[100px]">{m}</th>
                ))}
                <th className="text-right min-w-[110px]">Ano 1</th>
                <th className="text-right min-w-[110px]">Ano 2</th>
                <th className="text-right min-w-[110px]">Ano 3</th>
                <th className="text-right min-w-[110px]">Ano 4</th>
                <th className="text-right min-w-[110px]">Ano 5</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row: any, idx: number) => {
                const isHeader = row?.isHeader ?? false;
                const normalizedName = (row?.name ?? '').trim().toLowerCase();
                const isMargin = normalizedName.startsWith('margem') || normalizedName === 'taxa';
                const months: number[] = row?.months ?? [];
                return (
                  <tr key={idx} className={cn(
                    isHeader && 'header-row',
                    isMargin && 'bg-red-950/20',
                  )}>
                    <td className="text-[10px] text-muted-foreground">{row?.type ?? ''}</td>
                    <td className="text-[10px] text-muted-foreground truncate max-w-[180px]">{row?.dfs ?? ''}</td>
                    <td className="font-mono text-[10px] text-muted-foreground">{row?.code ?? ''}</td>
                    <td className={cn('text-xs', isHeader && 'font-bold text-sm')}>{row?.name ?? ''}</td>
                    <td className={`text-right ${(row?.vlr25 ?? 0) < 0 ? 'text-red-400' : ''}`}>
                      {isMargin ? formatPct(row?.vlr25) : formatBRL(row?.vlr25)}
                    </td>
                    <td className="text-right text-muted-foreground">{formatPct(row?.pct25)}</td>
                    {showYear1Detail && months.map((m: number, mIdx: number) => {
                      const adjusted = isMargin ? m : m * yr1Multiplier;
                      return (
                        <td key={mIdx} className={`text-right ${adjusted < 0 ? 'text-red-400' : ''}`}>
                          {isMargin ? formatPct(adjusted) : formatBRL(adjusted)}
                        </td>
                      );
                    })}
                    {[1,2,3,4,5].map((yr: number) => {
                      const val = (row as any)?.[`ano${yr}`] ?? 0;
                      const adjusted = isMargin ? val : applyScenario(val, yr);
                      return (
                        <td key={yr} className={`text-right ${adjusted < 0 ? 'text-red-400' : ''}`}>
                          {isMargin ? formatPct(adjusted) : formatBRL(adjusted)}
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