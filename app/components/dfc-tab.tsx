'use client';

import financialData from '../lib/financial-data.json';

const { dfc1tri } = financialData as any;
const ANO: number = dfc1tri?.ano ?? 2026;
const SECTIONS: any[] = dfc1tri?.sections ?? [];

function fmt(v: number): string {
  const abs = Math.round(Math.abs(v));
  const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v < 0 ? `(${s})` : s;
}

const RESULT_SECTION = 'RESULTADO';

export default function DfcTab() {
  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight">DFC — Demonstração do Fluxo de Caixa</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Em milhares de R$</p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        {/* Cabeçalho da coluna */}
        <div className="grid grid-cols-[1fr_160px] border-b border-border bg-muted/30 px-6 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descrição</span>
          <span className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{ANO}</span>
        </div>

        {SECTIONS.map((sec: any, si: number) => (
          <div key={si}>
            {/* Título da seção */}
            <div className="px-6 py-2 bg-sky-950/40 border-b border-border">
              <span className="text-[11px] font-bold tracking-wide text-sky-300 uppercase">{sec.title}</span>
            </div>

            {/* Linhas */}
            {(sec.rows ?? []).map((row: any, ri: number) => {
              const neg = row.valor < 0;
              const isZero = row.valor === 0;
              return (
                <div
                  key={ri}
                  className={`grid grid-cols-[1fr_160px] px-6 py-2 border-b border-border/30 transition-colors hover:bg-muted/10
                    ${row.bold ? 'bg-muted/20' : ''}
                  `}
                >
                  <span className={`text-sm ${row.bold ? 'font-bold text-foreground' : 'text-muted-foreground pl-4'}`}>
                    {row.label}
                  </span>
                  <span className={`text-right font-mono text-sm ${
                    isZero ? 'text-muted-foreground/40' :
                    neg ? 'text-red-400' :
                    row.bold ? 'text-emerald-400' : 'text-foreground'
                  } ${row.bold ? 'font-bold' : ''}`}>
                    {isZero ? '-' : fmt(row.valor)}
                  </span>
                </div>
              );
            })}

            {si < SECTIONS.length - 1 && <div className="h-3 bg-background/50" />}
          </div>
        ))}
      </div>
    </div>
  );
}
