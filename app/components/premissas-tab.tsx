'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Settings2 } from 'lucide-react';
import financialData from '../lib/financial-data.json';
import { formatBRL, formatPct, MONTHS } from '../lib/format';

const { premissas } = financialData ?? {};
const rates = premissas?.scenarioRates ?? {};

interface Props {
  scenario: 'realista' | 'otimista' | 'pessimista';
  setScenario: (s: 'realista' | 'otimista' | 'pessimista') => void;
}

function getScenarioMultiplier(scenario: string): number {
  const base = rates?.realista ?? 0.06;
  const selected = (rates as any)?.[scenario] ?? base;
  if (base === 0) return 1;
  return (1 + selected) / (1 + base);
}

export default function PremissasTab({ scenario, setScenario }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showYear1Detail, setShowYear1Detail] = useState(false);

  const sections = premissas?.sections ?? [];
  const multiplier = getScenarioMultiplier(scenario);

  const toggleSection = (title: string) => {
    setExpandedSections((prev: any) => ({ ...(prev ?? {}), [title]: !(prev ?? {})[title] }));
  };

  const applyScenario = (val: number, isRate: boolean = false): number => {
    if (isRate) {
      // Retornar a taxa do cenário selecionado
      return (rates as any)?.[scenario] ?? val;
    }
    return val * multiplier;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Premissas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Premissas e projeções - análise de cenários</p>
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
          <div className="flex items-center gap-1 bg-muted rounded p-0.5">
            {(['pessimista', 'realista', 'otimista'] as const).map((s: any) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 text-xs rounded transition-all font-medium ${
                  scenario === s
                    ? s === 'otimista' ? 'bg-emerald-600 text-white'
                    : s === 'pessimista' ? 'bg-amber-600 text-white'
                    : 'bg-red-600 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'realista' ? 'Realista' : s === 'otimista' ? 'Otimista' : 'Pessimista'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scenario Info */}
      <div className="bg-card rounded-lg border border-border p-4 mb-4" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Taxa de Crescimento (Pessimista)</p>
            <p className={`font-mono text-lg font-bold ${scenario === 'pessimista' ? 'text-amber-400' : 'text-muted-foreground'}`}>{formatPct(rates?.pessimista)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxa de Crescimento (Realista)</p>
            <p className={`font-mono text-lg font-bold ${scenario === 'realista' ? 'text-red-400' : 'text-muted-foreground'}`}>{formatPct(rates?.realista)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Taxa de Crescimento (Otimista)</p>
            <p className={`font-mono text-lg font-bold ${scenario === 'otimista' ? 'text-emerald-400' : 'text-muted-foreground'}`}>{formatPct(rates?.otimista)}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      {(sections ?? []).map((section: any, sIdx: number) => {
        const isExpanded = (expandedSections ?? {})[section?.title ?? ''] !== false;
        return (
          <div key={sIdx} className="bg-card rounded-lg border border-border mb-4 overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
            <button
              onClick={() => toggleSection(section?.title ?? '')}
              className="w-full flex items-center px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-red-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span className="font-display font-semibold text-sm">{section?.title ?? ''}</span>
              </span>
            </button>
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th className="min-w-[200px]">Item</th>
                      <th className="min-w-[100px]">Detalhe</th>
                      {showYear1Detail && MONTHS.map((m: string) => (
                        <th key={m} className="text-right min-w-[90px]">{m}</th>
                      ))}
                      <th className="text-right min-w-[110px]">Ano 1</th>
                      <th className="text-right min-w-[110px]">Ano 2</th>
                      <th className="text-right min-w-[110px]">Ano 3</th>
                      <th className="text-right min-w-[110px]">Ano 4</th>
                      <th className="text-right min-w-[110px]">Ano 5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(section?.rows ?? [])
                      .filter((row: any) => {
                        const label = (row?.label ?? '').trim().toLowerCase();
                        // Na seção "Taxa de Crescimento", mostrar apenas a linha principal
                        if ((section?.title ?? '') === 'Taxa de Crescimento') {
                          return label.includes('taxa de cr') && label.includes('inflação');
                        }
                        // Remover linhas de "Recebimento de receita" em todas as seções
                        if (label.startsWith('recebimento de')) return false;
                        return true;
                      })
                      .map((row: any, rIdx: number) => {
                      const isRateRow = (row?.label ?? '').includes('Taxa') || (row?.label ?? '').includes('crscimento');
                      return (
                        <tr key={rIdx}>
                          <td className="text-xs">{row?.label ?? ''}</td>
                          <td className="text-[10px] text-muted-foreground">{row?.col3 ?? ''}</td>
                          {showYear1Detail && (row?.months ?? []).map((m: number, mIdx: number) => (
                            <td key={mIdx} className="text-right">
                              {isRateRow ? formatPct(applyScenario(m, true)) : formatBRL(applyScenario(m))}
                            </td>
                          ))}
                          <td className="text-right font-semibold">{isRateRow ? formatPct(applyScenario(row?.ano1 ?? 0, true)) : formatBRL(applyScenario(row?.ano1 ?? 0))}</td>
                          <td className="text-right">{isRateRow ? formatPct(applyScenario(row?.ano2 ?? 0, true)) : formatBRL(applyScenario(row?.ano2 ?? 0))}</td>
                          <td className="text-right">{isRateRow ? formatPct(applyScenario(row?.ano3 ?? 0, true)) : formatBRL(applyScenario(row?.ano3 ?? 0))}</td>
                          <td className="text-right">{isRateRow ? formatPct(applyScenario(row?.ano4 ?? 0, true)) : formatBRL(applyScenario(row?.ano4 ?? 0))}</td>
                          <td className="text-right">{isRateRow ? formatPct(applyScenario(row?.ano5 ?? 0, true)) : formatBRL(applyScenario(row?.ano5 ?? 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
