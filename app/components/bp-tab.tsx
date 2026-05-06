'use client';

import { useState, useMemo } from 'react';
import financialData from '../lib/financial-data.json';

const { bp } = financialData as any;
const ANOS: string[] = bp?.anos ?? [];

const EMPTY = { label: '', valor: 0, anterior: 0, pct: 0, header: false, total: false, _empty: true };

function fmt(v: number): string {
  if (v === 0) return '-';
  const abs = Math.round(Math.abs(v));
  const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v < 0 ? `(${s})` : s;
}

function fmtPct(v: number): string {
  if (v === 0) return '-';
  const pct = Math.round(v * 100);
  return pct.toLocaleString('pt-BR') + '%';
}

function pctColor(v: number): string {
  if (v > 0) return 'text-emerald-400';
  if (v < 0) return 'text-red-400';
  return 'text-muted-foreground';
}

/** Insere linhas vazias no lado mais curto (antes do último total) para igualar comprimentos. */
function equalize(ativo: any[], passivo: any[]): [any[], any[]] {
  const diff = passivo.length - ativo.length;
  if (diff === 0) return [ativo, passivo];

  const insertPad = (arr: any[], count: number): any[] => {
    let lastTotal = -1;
    arr.forEach((r, i) => { if (r.total) lastTotal = i; });
    const at = lastTotal >= 0 ? lastTotal : arr.length;
    const pad = Array(count).fill(EMPTY);
    return [...arr.slice(0, at), ...pad, ...arr.slice(at)];
  };

  if (diff > 0) return [insertPad(ativo, diff), passivo];
  return [ativo, insertPad(passivo, -diff)];
}

function RowCells({ row }: { row: any }) {
  if (!row || (row as any)._empty || !row.label) {
    return (
      <>
        <td className="py-1.5 px-3">&nbsp;</td>
        <td /><td /><td />
      </>
    );
  }
  const isHeader = row.header;
  const isTotal  = row.total;
  return (
    <>
      <td className={`py-1.5 px-3 text-xs whitespace-nowrap
        ${isHeader ? 'font-bold uppercase text-foreground'
          : isTotal  ? 'font-bold text-foreground'
          : 'text-muted-foreground pl-5'}`}>
        {row.label}
      </td>
      {isHeader ? (
        <><td /><td /><td /></>
      ) : (
        <>
          <td className={`py-1.5 px-2 text-right font-mono text-xs tabular-nums
            ${isTotal ? 'font-bold text-sky-300' : 'text-foreground'}`}>
            {fmt(row.valor)}
          </td>
          <td className="py-1.5 px-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {fmt(row.anterior)}
          </td>
          <td className={`py-1.5 px-2 text-right font-mono text-xs tabular-nums font-semibold ${pctColor(row.pct)}`}>
            {fmtPct(row.pct)}
          </td>
        </>
      )}
    </>
  );
}

export default function BpTab() {
  const [anoSel, setAnoSel] = useState<string>(ANOS[0] ?? '');
  const periodo = bp?.periodos?.[anoSel];

  const [leftRows, rightRows] = useMemo(() => {
    if (!periodo) return [[], []];
    return equalize(periodo.ativo, periodo.passivo);
  }, [periodo]);

  const anoAtual    = periodo?.anoAtual    ?? '';
  const anoAnterior = periodo?.anoAnterior ?? '';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">BP — Balanço Patrimonial</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Em milhões de R$ · Grupo Líder</p>
        </div>
        <div className="flex rounded overflow-hidden border border-border text-xs">
          {ANOS.map((ano) => (
            <button
              key={ano}
              onClick={() => setAnoSel(ano)}
              className={`px-4 py-1.5 transition-colors font-semibold
                ${anoSel === ano ? 'bg-sky-700 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {ano}
            </button>
          ))}
        </div>
      </div>

      {periodo ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th colSpan={4} className="pb-1 pr-1">
                  <div className="bg-sky-800/60 px-4 py-2 text-center">
                    <span className="text-[11px] font-bold tracking-wider text-sky-200 uppercase">
                      ATIVO (em milhões R$)
                    </span>
                  </div>
                </th>
                <th className="w-px" />
                <th colSpan={4} className="pb-1 pl-1">
                  <div className="bg-sky-800/60 px-4 py-2 text-center">
                    <span className="text-[11px] font-bold tracking-wider text-sky-200 uppercase">
                      PASSIVO (em milhões R$)
                    </span>
                  </div>
                </th>
              </tr>
              <tr className="bg-muted/40 border-b border-border text-[10px]">
                <th className="text-left px-3 py-1.5 text-muted-foreground font-semibold uppercase">Descrição</th>
                <th className="text-right px-2 py-1.5 font-bold text-sky-300 w-16">{anoAtual}</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground w-16">{anoAnterior}</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground w-12">%</th>
                <th className="w-px bg-border/60" />
                <th className="text-left px-3 py-1.5 text-muted-foreground font-semibold uppercase">Descrição</th>
                <th className="text-right px-2 py-1.5 font-bold text-sky-300 w-16">{anoAtual}</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground w-16">{anoAnterior}</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground w-12">%</th>
              </tr>
            </thead>
            <tbody>
              {leftRows.map((lRow: any, i: number) => {
                const rRow = rightRows[i];
                const isTotal = (!lRow?._empty && lRow?.total) || (!rRow?._empty && rRow?.total);
                return (
                  <tr
                    key={i}
                    className={`border-b border-border/30 transition-colors
                      ${isTotal ? 'bg-muted/20' : 'hover:bg-muted/10'}`}
                  >
                    <RowCells row={lRow} />
                    <td className="w-px bg-border/40" />
                    <RowCells row={rRow} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum dado disponível para {anoSel}.</p>
      )}
    </div>
  );
}
