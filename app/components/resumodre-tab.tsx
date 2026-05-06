'use client';

import financialData from '../lib/financial-data.json';

const { resumoDRE } = financialData as any;

const ANOS: string[] = resumoDRE?.anos ?? [];
const ROWS: any[]    = resumoDRE?.rows ?? [];

// Helpers de formatação
function fmtMilhoes(v: number): string {
  const abs = Math.round(Math.abs(v));
  const fmt = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v < 0 ? `(${fmt})` : fmt;
}

function fmtPct(v: number): string {
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

// Cor da coluna por sufixo
function colColor(ano: string): string {
  if (ano.endsWith('R')) return 'text-sky-400';
  if (ano.endsWith('O')) return 'text-amber-400';
  return 'text-muted-foreground';
}

function colBadge(ano: string): string {
  if (ano.endsWith('R')) return 'bg-sky-900/40 text-sky-300';
  if (ano.endsWith('O')) return 'bg-amber-900/40 text-amber-300';
  return 'bg-muted text-muted-foreground';
}

// Linhas que são separadores visuais (após elas vem linha em branco no Excel)
const SECTION_BREAKS_AFTER = new Set([
  'faturamentoLiquido', 'pctMS', 'pctMC', 'outrasDespesas', 'pctEBTIDA', 'lucroLiquido',
]);

export default function ResumoDreTab() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight">Resumo DRE</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Em milhões de R$ — R = Realizado · O = Orçado · P = Projetado</p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 px-4 font-semibold text-xs text-muted-foreground w-[260px]">Descrição</th>
                {ANOS.map((ano) => (
                  <th key={ano} className="text-right py-2.5 px-4 w-[110px]">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${colBadge(ano)}`}>{ano}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row: any) => {
                const isBreak = SECTION_BREAKS_AFTER.has(row.key);
                return (
                  <>
                    <tr
                      key={row.key}
                      className={`border-b border-border/40 transition-colors hover:bg-muted/20 ${row.bold ? 'bg-muted/30' : ''}`}
                    >
                      <td className={`py-2 px-4 ${row.bold ? 'font-bold text-foreground' : 'text-muted-foreground text-xs pl-6'}`}>
                        {row.label}
                      </td>
                      {ANOS.map((ano) => {
                        const v = row.values?.[ano] ?? 0;
                        const neg = v < 0;
                        return (
                          <td
                            key={ano}
                            className={`py-2 px-4 text-right font-mono text-xs ${
                              row.bold
                                ? colColor(ano) + ' font-bold'
                                : neg
                                ? 'text-red-400'
                                : 'text-foreground'
                            }`}
                          >
                            {row.pct ? fmtPct(v) : fmtMilhoes(v)}
                          </td>
                        );
                      })}
                    </tr>
                    {isBreak && (
                      <tr key={`sep-${row.key}`} className="h-2 bg-transparent border-b border-border/20">
                        <td colSpan={ANOS.length + 1}></td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
