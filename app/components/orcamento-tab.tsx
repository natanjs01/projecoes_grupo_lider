'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import financialData from '../lib/financial-data.json';
import { formatBRL, formatPct } from '../lib/format';

const { orcamento } = financialData ?? {};

export default function OrcamentoTab() {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ 'RECEITAS': true, 'DESPESAS E CUSTOS': true });

  const summary = orcamento?.summary ?? [];
  const items = orcamento?.items ?? [];

  const filteredItems = useMemo(() => {
    if (!search?.trim()) return items;
    const s = search?.toLowerCase?.() ?? '';
    return items?.filter?.((item: any) =>
      (item?.name?.toLowerCase?.() ?? '').includes(s) ||
      (item?.code?.toLowerCase?.() ?? '').includes(s) ||
      (item?.dfs?.toLowerCase?.() ?? '').includes(s)
    ) ?? [];
  }, [items, search]);

  const visibleItems = useMemo(() => {
    const hasValue = (n: any) => Math.abs(Number(n) || 0) > 0.01;
    return (filteredItems ?? []).filter((item: any) =>
      hasValue(item?.realizado) ||
      hasValue(item?.orcado) ||
      hasValue(item?.variacao) ||
      hasValue(item?.pct)
    );
  }, [filteredItems]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (visibleItems ?? []).forEach((item: any) => {
      const cat = item?.category || 'OUTROS';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [visibleItems]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev: any) => ({ ...(prev ?? {}), [cat]: !(prev ?? {})[cat] }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Orçamento vs Realizado</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Janeiro 2026 - Comparativo de receitas e despesas</p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(summary ?? []).map((s: any, i: number) => (
          <div key={i} className="bg-card rounded-lg p-4 border border-border hover:border-red-900/50 transition-colors" style={{ boxShadow: 'var(--shadow-md)' }}>
            <p className="text-xs text-muted-foreground mb-1">{s?.label ?? ''}</p>
            <p className={`font-mono text-lg font-bold ${(s?.realizado ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              R$ {formatBRL(s?.realizado)}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-muted-foreground">Orçado: R$ {formatBRL(s?.orcado)}</span>
              <span className={`font-mono ${(s?.pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatPct(s?.pct)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="fin-table">
            <thead>
              <tr>
                <th className="w-12"></th>
                <th className="min-w-[120px]">DFs</th>
                <th className="min-w-[140px]">Código</th>
                <th className="min-w-[280px]">Conta</th>
                <th className="text-right min-w-[120px]">Realizado (R$)</th>
                <th className="text-right min-w-[120px]">Orçado (R$)</th>
                <th className="text-right min-w-[110px]">Variação (R$)</th>
                <th className="text-right min-w-[80px]">%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedItems ?? {}).map(([cat, catItems]: [string, any]) => {
                const isExpanded = (expandedCategories ?? {})[cat] ?? false;
                const catRealizadoTotal = (catItems ?? []).reduce((sum: number, item: any) => sum + (item?.realizado ?? 0), 0);
                const catOrcadoTotal = (catItems ?? []).reduce((sum: number, item: any) => sum + (item?.orcado ?? 0), 0);
                const catVariacaoTotal = (catItems ?? []).reduce((sum: number, item: any) => sum + (item?.variacao ?? 0), 0);
                const catPctTotal = catOrcadoTotal !== 0 ? catVariacaoTotal / Math.abs(catOrcadoTotal) : 0;
                return (
                  <React.Fragment key={`group-${cat}`}>
                    <tr className="cursor-pointer" onClick={() => toggleCategory(cat)}>
                      <td className="!py-2.5">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-red-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td colSpan={3} className="font-bold text-sm !py-2.5 bg-muted/30">{cat}</td>
                      <td className={`text-right font-bold text-sm !py-2.5 bg-muted/30 ${catRealizadoTotal < 0 ? 'text-red-400' : ''}`}>{formatBRL(catRealizadoTotal, 2)}</td>
                      <td className="text-right font-bold text-sm !py-2.5 bg-muted/30 text-muted-foreground">{formatBRL(catOrcadoTotal, 2)}</td>
                      <td className={`text-right font-bold text-sm !py-2.5 bg-muted/30 ${catVariacaoTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatBRL(catVariacaoTotal, 2)}</td>
                      <td className={`text-right font-bold text-sm !py-2.5 bg-muted/30 ${catPctTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPct(catPctTotal)}</td>
                    </tr>
                    {isExpanded && (catItems ?? []).map((item: any, idx: number) => {
                      return (
                        <tr key={`${cat}-${idx}`}>
                          <td></td>
                          <td className="text-muted-foreground text-[10px] truncate max-w-[120px]">{item?.dfs ?? ''}</td>
                          <td className="font-mono text-[10px] text-muted-foreground">{item?.code ?? ''}</td>
                          <td className="text-xs">{item?.name ?? ''}</td>
                          <td className={`text-right ${(item?.realizado ?? 0) < 0 ? 'text-red-400' : ''}`}>{formatBRL(item?.realizado, 2)}</td>
                          <td className="text-right text-muted-foreground">{formatBRL(item?.orcado, 2)}</td>
                          <td className={`text-right ${(item?.variacao ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatBRL(item?.variacao, 2)}</td>
                          <td className={`text-right ${(item?.pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPct(item?.pct)}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
