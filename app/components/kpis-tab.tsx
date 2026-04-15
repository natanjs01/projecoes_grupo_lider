'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { TrendingUp, Activity, DollarSign, Percent, BarChart3, Wallet, Clock, Target, Info, ChevronDown, ChevronRight } from 'lucide-react';
import financialData from '../lib/financial-data.json';
import { formatPct, formatBRL, formatCompact } from '../lib/format';

const { dre, fc, premissas, kpiData } = financialData as any;
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

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle">
      <Info
        className="w-3 h-3 text-muted-foreground hover:text-red-400 cursor-help transition-colors inline-block"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-[10px] leading-relaxed bg-zinc-800 border border-zinc-600 text-zinc-200 rounded-md shadow-lg whitespace-pre-line min-w-[220px] max-w-[320px]">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
        </span>
      )}
    </span>
  );
}

export default function KpisTab({ scenario }: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Margens: true,
    'Valores Absolutos (R$)': true,
    'Ciclos Financeiros': true,
    Crescimento: true,
  });

  const kpis = useMemo(() => {
    const m = (yr: number) => getMultiplier(scenario, yr);

    const recBruta = findDreRow('Receita Bruta');
    const recLiq = findDreRow('Receita L\u00edquida');
    const lucroBruto = findDreRow('Lucro Bruto');
    const ebitda = findDreRow('EBITIDA');
    const ebitdaAjus = findDreRow('EBITIDA Ajustado');
    const lucroLiq = findDreRow('Lucro (Preju\u00edzo) L\u00edquido');
    const custos = findDreRow('Custos dos sprodutos');

    const caixaOp = findFcRow('Caixa Operacional');
    const caixaLivre = findFcRow('Caixa livre');
    const investimentos = findFcRow('Fluxo de caixa de investimentos');
    const vpl = findFcRow('VPL');
    const taxa = findFcRow('TAXA');

    const years = [1, 2, 3, 4, 5];

    const getVal = (row: any, yr: number) => {
      const v = (row as any)?.[`ano${yr}`] ?? 0;
      return v * m(yr);
    };

    const getKpiVal = (key: string, yr: number) => {
      const v = (kpiData as any)?.[key]?.[`ano${yr}`] ?? 0;
      return v * m(yr);
    };

    return years.map((yr: number) => {
      const rl = getVal(recLiq, yr);
      const rb = getVal(recBruta, yr);
      const lb = getVal(lucroBruto, yr);
      const eb = getVal(ebitda, yr);
      const eba = getVal(ebitdaAjus, yr);
      const ll = getVal(lucroLiq, yr);
      const cl = getVal(caixaLivre, yr);
      const co = getVal(caixaOp, yr);
      const inv = getVal(investimentos, yr);
      const cmv = Math.abs(getVal(custos, yr));

      const cr = getKpiVal('contasReceber', yr);
      const cp = Math.abs(getKpiVal('contasPagar', yr));
      const estTotal = getKpiVal('estoqueTotal', yr);

      const dso = rb !== 0 ? (cr / rb) * 365 : 0;
      const dpo = cmv !== 0 ? (cp / cmv) * 365 : 0;
      const dio = cmv !== 0 ? (estTotal / cmv) * 365 : 0;
      const ccc = dso + dio - dpo;

      return {
        year: yr,
        margemBruta: rl !== 0 ? lb / rl : 0,
        margemEbitda: rl !== 0 ? eb / rl : 0,
        margemEbitdaAjus: rl !== 0 ? eba / rl : 0,
        margemLiquida: rl !== 0 ? ll / rl : 0,
        receitaLiquida: rl,
        receitaBruta: rb,
        lucroBruto: lb,
        lucroLiquido: ll,
        ebitda: eb,
        ebitdaAjustado: eba,
        caixaOperacional: co,
        caixaLivre: cl,
        capex: inv,
        cmv,
        fcf: co + inv,
        crescReceita: yr > 1 ? (getVal(recLiq, yr) / getVal(recLiq, yr - 1) - 1) : 0,
        dso,
        dpo,
        dio,
        ccc,
        contasReceber: cr,
        contasPagar: cp,
        estoqueTotal: estTotal,
      };
    });
  }, [scenario]);

  const vpnRow = findFcRow('VPL');
  const taxaRow = findFcRow('TAXA');

  const kpiCards = [
    { label: 'VPL 10 anos', value: formatCompact(vpnRow?.ano1 ?? 0), sub: `Taxa: ${formatPct(taxaRow?.ano1)}`, icon: Target, color: 'text-red-400', tooltip: 'Valor Presente Líquido\nVPL = Σ FCL / (1 + taxa)^n\nFluxo de caixa livre descontado a 10 anos' },
    { label: 'Margem Bruta (Ano 1)', value: formatPct(kpis?.[0]?.margemBruta), sub: `Ano 5: ${formatPct(kpis?.[4]?.margemBruta)}`, icon: Percent, color: 'text-emerald-400', tooltip: 'Margem Bruta = Lucro Bruto / Receita Líquida\nMede a rentabilidade após custos diretos' },
    { label: 'Margem EBITDA Aj. (Ano 1)', value: formatPct(kpis?.[0]?.margemEbitdaAjus), sub: `Ano 5: ${formatPct(kpis?.[4]?.margemEbitdaAjus)}`, icon: Activity, color: 'text-blue-400', tooltip: 'Margem EBITDA Aj. = EBITDA Ajustado / Receita Líquida\nEficiência operacional antes de juros, impostos, depreciação e amortização' },
    { label: 'Margem Líquida (Ano 1)', value: formatPct(kpis?.[0]?.margemLiquida), sub: `Ano 5: ${formatPct(kpis?.[4]?.margemLiquida)}`, icon: TrendingUp, color: 'text-amber-400', tooltip: 'Margem Líquida = Lucro Líquido / Receita Líquida\nRentabilidade final após todas as deduções' },
    { label: 'EBITDA Ajustado (Ano 1)', value: 'R$ ' + formatCompact(kpis?.[0]?.ebitdaAjustado), sub: `Ano 5: R$ ${formatCompact(kpis?.[4]?.ebitdaAjustado)}`, icon: BarChart3, color: 'text-red-400', tooltip: 'EBITDA Ajustado\nLucro antes de Juros, Impostos, Depreciação e Amortização\najustado por itens não recorrentes' },
    { label: 'Caixa Livre (Ano 1)', value: 'R$ ' + formatCompact(kpis?.[0]?.caixaLivre), sub: `Ano 5: R$ ${formatCompact(kpis?.[4]?.caixaLivre)}`, icon: Wallet, color: 'text-emerald-400', tooltip: 'Caixa Livre\nCaixa disponível após todas as obrigações\noperacionais, investimentos e financiamentos' },
    { label: 'Lucro Líquido (Ano 1)', value: 'R$ ' + formatCompact(kpis?.[0]?.lucroLiquido), sub: `Ano 5: R$ ${formatCompact(kpis?.[4]?.lucroLiquido)}`, icon: DollarSign, color: 'text-blue-400', tooltip: 'Lucro Líquido\nResultado final após todas as receitas\nmenos custos, despesas, juros e impostos' },
    { label: 'Ciclo Financeiro (Ano 1)', value: `${Math.round(kpis?.[0]?.ccc ?? 0)} dias`, sub: `Ano 5: ${Math.round(kpis?.[4]?.ccc ?? 0)} dias`, icon: Clock, color: 'text-amber-400', tooltip: 'Ciclo de Conversão de Caixa (CCC)\nCCC = DSO + DIO - DPO\nTempo entre pagar fornecedores e receber de clientes' },
  ];

  interface KpiRowConfig {
    key: string;
    label: string;
    format: 'pct' | 'compact' | 'days';
    tooltip: string;
  }

  const tableRows: { section: string; rows: KpiRowConfig[] }[] = [
    {
      section: 'Margens',
      rows: [
        { key: 'margemBruta', label: 'Margem Bruta', format: 'pct', tooltip: 'Lucro Bruto / Receita Líquida × 100' },
        { key: 'margemEbitda', label: 'Margem EBITDA', format: 'pct', tooltip: 'EBITDA / Receita Líquida × 100' },
        { key: 'margemEbitdaAjus', label: 'Margem EBITDA Ajustada', format: 'pct', tooltip: 'EBITDA Ajustado / Receita Líquida × 100' },
        { key: 'margemLiquida', label: 'Margem Líquida', format: 'pct', tooltip: 'Lucro Líquido / Receita Líquida × 100' },
      ],
    },
    {
      section: 'Valores Absolutos (R$)',
      rows: [
        { key: 'receitaLiquida', label: 'Receita Líquida', format: 'compact', tooltip: 'Receita Bruta - Deduções (impostos, devoluções, descontos)' },
        { key: 'lucroBruto', label: 'Lucro Bruto', format: 'compact', tooltip: 'Receita Líquida - CMV (Custo das Mercadorias Vendidas)' },
        { key: 'ebitdaAjustado', label: 'EBITDA Ajustado', format: 'compact', tooltip: 'Lucro Bruto - Despesas Operacionais + Depreciação\n(antes de juros e impostos)' },
        { key: 'lucroLiquido', label: 'Lucro Líquido', format: 'compact', tooltip: 'Resultado final = Receitas - Custos - Despesas - Juros - Impostos' },
        { key: 'caixaOperacional', label: 'Caixa Operacional', format: 'compact', tooltip: 'EBITDA Ajustado + Variação NCG\n(Capital de Giro: Estoques + Contas a Receber - Fornecedores)' },
        { key: 'caixaLivre', label: 'Caixa Livre', format: 'compact', tooltip: 'Caixa após operações, investimentos e financiamentos' },
        { key: 'capex', label: 'CAPEX', format: 'compact', tooltip: 'Investimentos em ativos fixos (imobilizado)\nAquisição de Imobilizado + Venda de Imobilizado' },
      ],
    },
    {
      section: 'Ciclos Financeiros',
      rows: [
        { key: 'dso', label: 'DSO (Prazo Médio de Recebimento)', format: 'days', tooltip: 'DSO = (Contas a Receber / Receita Bruta) × 365\nDias médios para receber dos clientes' },
        { key: 'dpo', label: 'DPO (Prazo Médio de Pagamento)', format: 'days', tooltip: 'DPO = (Contas a Pagar / CMV) × 365\nDias médios para pagar fornecedores' },
        { key: 'dio', label: 'DIO (Prazo Médio de Estoque)', format: 'days', tooltip: 'DIO = (Estoque Total / CMV) × 365\nDias médios de permanência do estoque' },
        { key: 'ccc', label: 'Ciclo de Conversão de Caixa', format: 'days', tooltip: 'CCC = DSO + DIO - DPO\nTempo total entre pagamento a fornecedores\ne recebimento de clientes. Quanto menor, melhor.' },
      ],
    },
    {
      section: 'Crescimento',
      rows: [
        { key: 'crescReceita', label: 'Crescimento Receita', format: 'pct', tooltip: 'Crescimento = (Receita Ano N / Receita Ano N-1) - 1\nVariação percentual da receita ano a ano' },
      ],
    },
  ];

  const formatValue = (val: number, format: string, yearIdx: number, key: string): string => {
    if (key === 'crescReceita' && yearIdx === 0) return '-';
    if (format === 'pct') return formatPct(val);
    if (format === 'days') return `${Math.round(Math.abs(val))} dias`;
    return formatCompact(val);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div>
      <h2 className="font-display text-xl font-bold tracking-tight mb-1">KPIs Financeiros</h2>
      <p className="text-xs text-muted-foreground mb-4">Indicadores-chave de performance - visão consolidada 5 anos. Passe o mouse sobre <Info className="w-3 h-3 inline-block text-muted-foreground" /> para ver a fórmula.</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(kpiCards ?? []).map((card: any, i: number) => {
          const Icon = card?.icon ?? Activity;
          return (
            <div key={i} className="bg-card rounded-lg p-4 border border-border hover:border-red-900/30 transition-all hover:translate-y-[-1px]" style={{ boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${card?.color ?? ''}`} />
                <p className="text-[10px] text-muted-foreground">{card?.label ?? ''}</p>
                <Tooltip text={card?.tooltip ?? ''} />
              </div>
              <p className={`font-mono text-lg font-bold ${card?.color ?? ''}`}>{card?.value ?? '-'}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{card?.sub ?? ''}</p>
            </div>
          );
        })}
      </div>

      {/* Detailed Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm">Evolução Anual de KPIs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="fin-table">
            <thead>
              <tr>
                <th className="min-w-[280px]">Indicador</th>
                <th className="text-right min-w-[120px]">Ano 1</th>
                <th className="text-right min-w-[120px]">Ano 2</th>
                <th className="text-right min-w-[120px]">Ano 3</th>
                <th className="text-right min-w-[120px]">Ano 4</th>
                <th className="text-right min-w-[120px]">Ano 5</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((section) => {
                const isExpanded = expandedSections[section.section] ?? true;
                return (
                  <React.Fragment key={section.section}>
                    <tr className="cursor-pointer" onClick={() => toggleSection(section.section)}>
                      <td colSpan={6} className="font-bold bg-muted/30 !py-2.5">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-red-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          <span>{section.section}</span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && section.rows.map((row) => (
                      <tr key={row.key}>
                        <td className="text-xs">
                          {row.label}
                          <Tooltip text={row.tooltip} />
                        </td>
                        {[0, 1, 2, 3, 4].map((i: number) => {
                          const val = (kpis?.[i] as any)?.[row.key] ?? 0;
                          return (
                            <td key={i} className={`text-right font-mono ${val < 0 ? 'text-red-400' : ''}`}>
                              {formatValue(val, row.format, i, row.key)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
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
