'use client';

import { Presentation } from 'lucide-react';
import financialData from '../lib/financial-data.json';
import logoSrc from '../../public/grupolider.png';

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  darkBlue:   '1E3A5F',  // fundo header / slide capa
  midBlue:    '2563EB',  // destaque azul
  lightBlue:  'DBEAFE',  // fundo linha par
  gray:       '374151',  // texto escuro
  lightGray:  'F3F4F6',  // fundo linha ímpar
  white:      'FFFFFF',
  accent:     '3B82F6',  // azul médio
  positive:   '1D4ED8',
  negative:   'DC2626',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMi(v: number): string {
  if (v === 0) return '–';
  const abs = Math.round(Math.abs(v));
  const s = abs.toLocaleString('pt-BR');
  return v < 0 ? `(${s})` : s;
}
function fmtPct(v: number): string {
  const s = (Math.abs(v) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  return v < 0 ? `(${s})` : s;
}
function fmtBig(v: number): string {
  const abs = Math.abs(v);
  const s = abs >= 1e9
    ? (abs / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'B'
    : abs >= 1e6
      ? (abs / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'M'
      : abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return v < 0 ? `(${s})` : s;
}
function fmtM(v: number): string {
  if (v === 0) return '–';
  const abs = Math.abs(v);
  const s = (abs / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return v < 0 ? `(${s})` : s;
}

// ── Tipos locais ─────────────────────────────────────────────────────────────
interface PptxSlide {
  addText(text: string | { text: string; options?: object }[], options?: object): void;
  addTable(rows: object[][], options?: object): void;
  addShape(shapeName: string, options?: object): void;
  addImage(options: object): void;
  background: { fill: string };
}
interface Pptx {
  addSlide(): PptxSlide;
  writeFile(options: { fileName: string }): Promise<void>;
  defineSlideMaster(options: object): void;
  layout: string;
}

// ── Geração do arquivo ───────────────────────────────────────────────────────
export async function generatePPT(scenario: 'realista' | 'otimista' | 'pessimista' = 'realista'): Promise<void> {
  const mod = await import('pptxgenjs');
  const PptxGenJS = (mod as any).default ?? mod;
  const prs = new (PptxGenJS as any)() as unknown as Pptx;
  prs.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in

  // Carrega logo em base64 para uso nos slides
  let logoBase64 = '';
  try {
    // logoSrc.src é a URL resolvida pelo Next.js (funciona em dev e produção)
    const logoUrl = typeof logoSrc === 'string' ? logoSrc : (logoSrc as any).src;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const url = logoUrl.startsWith('http') ? logoUrl : base + logoUrl;
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    logoBase64 = btoa(bin);
  } catch { /* sem logo */ }
  const addLogo = (sl: PptxSlide, x: number, y: number, w: number, h: number) => {
    if (!logoBase64) return;
    sl.addImage({ data: 'image/png;base64,' + logoBase64, x, y, w, h });
  };

  const { resumoDRE, fc, kpiData, dre: dreData, bp: bpData } = financialData as any;
  const anos: string[] = resumoDRE?.anos ?? [];
  const rows: any[] = resumoDRE?.rows ?? [];

  // Helpers compartilhados entre slides
  const YRS = [1, 2, 3, 4, 5];
  const YR_LABELS = ['2026', '2027', '2028', '2029', '2030'];
  const fcRows: any[] = fc?.rows ?? [];
  const getFC = (label: string, yr: number) =>
    fcRows.find((r: any) => r.label?.trim() === label.trim())?.[`ano${yr}`] ?? 0;
  const getDRE = (key: string, yr: number) => {
    const map: Record<string, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
    const anoKey = ['2026O', '2027P', '2028P', '2029P', '2030P'][map[yr]];
    return rows.find((r: any) => r.key === key)?.values?.[anoKey] ?? 0;
  };

  // Cenário selecionado
  const { premissas } = financialData as any;
  const scenRates = premissas?.scenarioRates ?? {};
  const scenLabel = scenario === 'otimista' ? 'Cenário Otimista' : scenario === 'pessimista' ? 'Cenário Pessimista' : 'Cenário Realista';
  const scenRate  = scenRates?.[scenario] ?? (scenario === 'otimista' ? 0.09 : scenario === 'pessimista' ? 0.04 : 0.06);

  // ── SLIDE 1 – Capa ─────────────────────────────────────────────────────────
  const s1 = prs.addSlide();
  s1.background = { fill: C.darkBlue };

  s1.addShape('rect', { x: 0, y: 5.8, w: 13.33, h: 1.7, fill: { color: C.midBlue }, line: { color: C.midBlue } });

  s1.addText('Projeções Financeiras', {
    x: 0.6, y: 1.4, w: 12, h: 1.2,
    fontSize: 42, bold: true, color: C.white,
    fontFace: 'Arial',
  });
  s1.addText('Grupo Líder — 2026–2030', {
    x: 0.6, y: 2.7, w: 10, h: 0.7,
    fontSize: 22, color: 'BFDBFE', fontFace: 'Arial',
  });
  s1.addText(`${scenLabel}  |  Em milhões de R$`, {
    x: 0.6, y: 6.1, w: 10, h: 0.5,
    fontSize: 13, color: C.white, fontFace: 'Arial', italic: true,
  });
  addLogo(s1, 10.3, 6.05, 2.8, 1.25);

  // ── Premissas: dados base ─────────────────────────────────────────────────
  const premSecs: any[] = premissas?.sections ?? [];
  // helper: cabeçalho padrão de slide
  const addHdr = (sl: PptxSlide, t: string, badge?: string, subtitle?: string) => {
    sl.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
    sl.addText(t, { x: 0.3, y: 0.05, w: 9.2, h: subtitle ? 0.5 : 0.8, fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle' });
    if (subtitle) sl.addText(subtitle, { x: 0.3, y: 0.57, w: 6, h: 0.25, fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', italic: true });
    if (badge) sl.addText(badge, { x: 9.5, y: 0.2, w: 2.0, h: 0.5, fontSize: 9.5, color: 'BFDBFE', align: 'right', valign: 'middle', fontFace: 'Arial', italic: true });
    addLogo(sl, 11.6, 0.1, 1.55, 0.7);
  };

  // ── SLIDE 2 – Confidencialidade ────────────────────────────────────────────
  const sConf = prs.addSlide();
  sConf.background = { fill: '0B1F3A' };

  // Linha decorativa topo
  sConf.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: C.midBlue }, line: { color: C.midBlue } });
  // Linha decorativa base
  sConf.addShape('rect', { x: 0, y: 7.44, w: 13.33, h: 0.06, fill: { color: C.midBlue }, line: { color: C.midBlue } });

  // Ícone cadeado
  sConf.addText('🔒', {
    x: 5.67, y: 0.7, w: 2.0, h: 1.4,
    fontSize: 48, align: 'center', valign: 'middle',
  });

  // Título
  sConf.addText('DOCUMENTO CONFIDENCIAL', {
    x: 1.0, y: 2.1, w: 11.33, h: 0.65,
    fontSize: 22, bold: true, color: 'BFDBFE', fontFace: 'Arial', align: 'center', valign: 'middle',
    charSpacing: 3,
  });

  // Subtítulo
  sConf.addText('USO EXCLUSIVO DA DIRETORIA', {
    x: 1.0, y: 2.75, w: 11.33, h: 0.45,
    fontSize: 13, bold: false, color: '93C5FD', fontFace: 'Arial', align: 'center', italic: true,
  });

  // Linha separadora
  sConf.addShape('rect', { x: 3.5, y: 3.35, w: 6.33, h: 0.03, fill: { color: '1D4ED8' }, line: { color: '1D4ED8' } });

  // Corpo do aviso legal
  sConf.addText(
    'Este documento foi elaborado exclusivamente para uso interno da Diretoria do Grupo Líder e contém ' +
    'informações financeiras estratégicas de natureza estritamente confidencial.\n\n' +
    'É vedada a reprodução, distribuição ou divulgação total ou parcial do seu conteúdo a terceiros ' +
    'sem autorização prévia e expressa da Administração.\n\n' +
    'As projeções e estimativas aqui apresentadas baseiam-se em premissas e cenários definidos pela gestão ' +
    'e não constituem garantia de resultados futuros.',
    {
      x: 1.5, y: 3.55, w: 10.33, h: 2.8,
      fontSize: 10, color: '94A3B8', fontFace: 'Arial', align: 'center', valign: 'top',
      lineSpacingMultiple: 1.4, wrap: true,
    }
  );

  // Rodapé
  sConf.addText(`Grupo Líder  |  Projeções Financeiras 2026–2030  |  Maio de 2026`, {
    x: 1.0, y: 6.85, w: 11.33, h: 0.35,
    fontSize: 8.5, color: '475569', fontFace: 'Arial', align: 'center', italic: true,
  });

  // ── SLIDE 3 – Índice ──────────────────────────────────────────────────────
  const sIdx = prs.addSlide();
  sIdx.background = { fill: C.white };
  addHdr(sIdx, 'ÍNDICE');

  const idxItems = [
    { num: '04', title: 'Balanço Patrimonial',               sub: 'BP 2025 vs 2024' },
    { num: '05', title: 'BP – Avaliação',                    sub: 'KPIs e análise do balanço' },
    { num: '06', title: 'DRE',                               sub: 'Resultado 2025' },
    { num: '07', title: 'DFC',                               sub: 'Fluxo de Caixa 2025' },
    { num: '08', title: 'Quadro de Funcionários',            sub: 'Posição em 31/12/2025 por setor' },
    { num: '09–13', title: 'Premissas',                      sub: 'Taxas, estoques, imobilizado, empréstimos, capital de giro' },
    { num: '14', title: 'Resumo DRE',                        sub: 'Projeção do resultado 2026–2030' },
    { num: '15', title: 'KPIs Financeiros',                  sub: 'Projeção 5 anos' },
    { num: '16–17', title: 'Gráficos',                       sub: 'Resultados financeiros' },
    { num: '18', title: 'Fluxo de Caixa',                    sub: 'Projeção 5 anos' },
    { num: '19', title: 'Resumo DRE – Orçado vs Realizado',  sub: 'Jan–Mar/2026' },
    { num: '20', title: 'DFC – 1º Trimestre 2026',           sub: 'Demonstração do fluxo de caixa' },
    { num: '21', title: 'Contexto Macroeconômico',           sub: 'Leitura executiva para o varejo' },
    { num: '22', title: 'Projeções Macro Focus',             sub: '2026–2030' },
    { num: '23', title: 'Auditoria',                         sub: 'Status e cronograma 2026' },
  ];

  // Duas colunas de até 7 itens cada
  const idxCol1 = idxItems.slice(0, 8);
  const idxCol2 = idxItems.slice(8);
  const idxColX = [0.35, 6.9];
  const idxW    = 6.25;
  const idxRowH = 0.72;
  const idxStartY = 1.05;

  [idxCol1, idxCol2].forEach((col, ci) => {
    const x = idxColX[ci];
    col.forEach((item, i) => {
      const y = idxStartY + i * idxRowH;
      const bgColor = i % 2 === 0 ? 'F8FAFC' : C.white;
      sIdx.addShape('rect', { x, y, w: idxW, h: idxRowH - 0.05, fill: { color: bgColor }, line: { color: 'E2E8F0', pt: 0.5 } });
      // Número
      sIdx.addShape('rect', { x, y, w: 0.825, h: idxRowH - 0.05, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
      sIdx.addText(item.num, {
        x, y: y + 0.02, w: 0.825, h: idxRowH - 0.09,
        fontSize: 11, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle',
      });
      // Título
      sIdx.addText(item.title, {
        x: x + 0.9, y: y + 0.06, w: idxW - 1.0, h: 0.3,
        fontSize: 10.5, bold: true, color: C.darkBlue, fontFace: 'Arial', valign: 'middle',
      });
      // Subtítulo
      sIdx.addText(item.sub, {
        x: x + 0.9, y: y + 0.36, w: idxW - 1.0, h: 0.26,
        fontSize: 8.5, color: '6B7280', fontFace: 'Arial', italic: true, valign: 'middle',
      });
    });
  });

  // ── SLIDE 3 – Balanço Patrimonial ─────────────────────────────────────────
  const sbp = prs.addSlide();
  sbp.background = { fill: C.white };
  addHdr(sbp, 'BALANÇO PATRIMONIAL  –  2025 vs 2024', 'BP');

  const bpPeriodo = bpData?.periodos?.['2025'];
  const bpAtivo: any[]   = bpPeriodo?.ativo   ?? [];
  const bpPassivo: any[] = bpPeriodo?.passivo ?? [];

  const fmtBpV = (v: number): string => {
    if (v === 0) return '–';
    const s = Math.round(Math.abs(v)).toLocaleString('pt-BR');
    return v < 0 ? `(${s})` : s;
  };
  const fmtBpP = (v: number): string => {
    if (v === 0) return '–';
    const s = (Math.abs(v) * 100).toFixed(1) + '%';
    return v < 0 ? `(${s})` : s;
  };

  const buildBpSide = (arr: any[]): any[][] =>
    arr.map((row: any, i: number) => {
      if (row.header) return [
        { text: row.label || '', options: { bold: true, color: 'BFDBFE', fill: { color: C.darkBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
        { text: '', options: { fill: { color: C.darkBlue }, valign: 'middle' } },
        { text: '', options: { fill: { color: C.darkBlue }, valign: 'middle' } },
        { text: '', options: { fill: { color: C.darkBlue }, valign: 'middle' } },
      ];
      if (row.total) return [
        { text: row.label, options: { bold: true, color: C.darkBlue, fill: { color: C.lightBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
        { text: fmtBpV(row.valor),    options: { bold: true, align: 'right', fontSize: 9, color: '000000',  fill: { color: C.lightBlue }, fontFace: 'Arial', valign: 'middle' } },
        { text: fmtBpV(row.anterior), options: { bold: true, align: 'right', fontSize: 9, color: C.gray,    fill: { color: C.lightBlue }, fontFace: 'Arial', valign: 'middle' } },
        { text: fmtBpP(row.pct),      options: { bold: true, align: 'right', fontSize: 9, color: '000000', fill: { color: C.lightBlue }, fontFace: 'Arial', valign: 'middle' } },
      ];
      const bg = i % 2 === 0 ? C.white : C.lightGray;
      return [
        { text: row.label, options: { fontSize: 8, color: C.gray, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
        { text: fmtBpV(row.valor),    options: { bold: true, align: 'right', fontSize: 8, color: '000000', fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
        { text: fmtBpV(row.anterior), options: { bold: true, align: 'right', fontSize: 8, color: '000000', fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
        { text: fmtBpP(row.pct),      options: { bold: true, align: 'right', fontSize: 8, color: '000000', fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
      ];
    });

  const bpColHdr = (title: string) => [
    { text: title, options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    { text: '2025 (R$Mi)', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    { text: '2024 (R$Mi)', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    { text: 'Var%', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
  ];

  const bpAtivoRows = buildBpSide(bpAtivo);
  const bpPassivoRows = buildBpSide(bpPassivo);
  const bpBlankRow = () => [
    { text: '', options: { fill: { color: C.white }, valign: 'middle' } },
    { text: '', options: { fill: { color: C.white }, valign: 'middle' } },
    { text: '', options: { fill: { color: C.white }, valign: 'middle' } },
    { text: '', options: { fill: { color: C.white }, valign: 'middle' } },
  ];
  const rowDiff = bpPassivoRows.length - bpAtivoRows.length;
  if (rowDiff > 0) {
    const last = bpAtivoRows.pop()!;
    for (let k = 0; k < rowDiff; k++) bpAtivoRows.push(bpBlankRow());
    bpAtivoRows.push(last);
  } else if (rowDiff < 0) {
    const last = bpPassivoRows.pop()!;
    for (let k = 0; k < -rowDiff; k++) bpPassivoRows.push(bpBlankRow());
    bpPassivoRows.push(last);
  }

  sbp.addTable([bpColHdr('ATIVO'), ...bpAtivoRows], {
    x: 0.15, y: 1.0, w: 6.3,
    rowH: 0.30,
    border: { pt: 0.3, color: 'E5E7EB' },
    colW: [2.8, 1.2, 1.2, 1.1],
  });
  sbp.addTable([bpColHdr('PASSIVO + PATRIMÔNIO LÍQUIDO'), ...bpPassivoRows], {
    x: 6.65, y: 1.0, w: 6.5,
    rowH: 0.30,
    border: { pt: 0.3, color: 'E5E7EB' },
    colW: [2.8, 1.2, 1.2, 1.3],
  });
  sbp.addText('Valores em milhões de R$  |  Fonte: Balanço Patrimonial 2025 (Realizado)', {
    x: 0.15, y: 7.2, w: 13.0, h: 0.25,
    fontSize: 7.5, color: '9CA3AF', italic: true, fontFace: 'Arial',
  });

  // ── SLIDE BP Avaliação – Mapa de Árvore ─────────────────────────────────────
  const sbpa = prs.addSlide();
  sbpa.background = { fill: 'F8FAFC' };
  addHdr(sbpa, 'AVALIAÇÃO BP  –  Mapa de Árvore', 'BP Avaliação');

  // Extrai linhas de totais do BP
  const bpGetTotal = (arr: any[], keyword: string, exclude?: string) =>
    arr.find((r: any) => r.total && r.label.includes(keyword) && (!exclude || !r.label.includes(exclude)));

  const bpAcRow  = bpGetTotal(bpAtivo,   'CIRCULANTE', 'NÃO');
  const bpAncRow = bpGetTotal(bpAtivo,   'NÃO');
  const bpPcRow  = bpGetTotal(bpPassivo, 'CIRCULANTE', 'NÃO');
  const bpPncRow = bpGetTotal(bpPassivo, 'NÃO CIRCULANTE');
  const bpPlRow  = bpGetTotal(bpPassivo, 'PATRIMÔNIO');

  const bpV = {
    ac25:  bpAcRow?.valor    ?? 0, ac24:  bpAcRow?.anterior  ?? 0,
    anc25: bpAncRow?.valor   ?? 0, anc24: bpAncRow?.anterior ?? 0,
    pc25:  bpPcRow?.valor    ?? 0, pc24:  bpPcRow?.anterior  ?? 0,
    pnc25: bpPncRow?.valor   ?? 0, pnc24: bpPncRow?.anterior ?? 0,
    pl25:  bpPlRow?.valor    ?? 0, pl24:  bpPlRow?.anterior  ?? 0,
  };

  const totA24 = bpV.ac24 + bpV.anc24;
  const totA25 = bpV.ac25 + bpV.anc25;
  const totP24 = bpV.pc24 + bpV.pnc24 + bpV.pl24;
  const totP25 = bpV.pc25 + bpV.pnc25 + bpV.pl25;

  // ── Treemap manual com shapes ─────────────────────────────────────────────
  // Canvas: inicia logo abaixo do header, ocupa a maior parte do slide
  const TM_X = 0.1, TM_Y = 1.05, TM_W = 13.13, TM_H = 4.50;
  const YR_GAP = 0.07;   // gap entre BP2024 e BP2025
  const COL_GAP = 0.04;  // gap entre coluna Ativo e Passivo dentro de cada ano
  const ITEM_GAP = 0.04; // gap entre retângulos na mesma coluna
  const HDR_H = 0.33;    // altura da barra de título do ano

  // Larguras proporcionais ao total do ativo (BP é equilibrado: ativo = passivo)
  const totAll = totA24 + totA25;
  const w24 = (totA24 / totAll) * (TM_W - YR_GAP);
  const w25 = (totA25 / totAll) * (TM_W - YR_GAP);
  const x24 = TM_X;
  const x25 = TM_X + w24 + YR_GAP;

  // Paleta BP 2024 (teal pastel) e BP 2025 (azul)
  const OR1 = '2DD4BF', OR2 = '0D9488', OR3 = '0F766E'; // ativo-claro, passivo-médio, PNC-escuro
  const OR4 = '14B8A6'; // PL 2024
  const BL1 = '60A5FA', BL2 = '2563EB', BL3 = '1D4ED8'; // ativo-claro, passivo-médio, PNC-escuro
  const BL4 = '0EA5E9'; // PL 2025

  // ── Banners de ano ───────────────────────────────────────────────────────
  sbpa.addShape('rect', { x: x24, y: TM_Y, w: w24, h: HDR_H, fill: { color: OR2 }, line: { color: OR2 } });
  sbpa.addText(`BP 2024  ·  Total R$ ${fmtMi(totA24)} Mi`, {
    x: x24 + 0.15, y: TM_Y, w: w24, h: HDR_H,
    fontSize: 10, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sbpa.addShape('rect', { x: x25, y: TM_Y, w: w25, h: HDR_H, fill: { color: BL2 }, line: { color: BL2 } });
  sbpa.addText(`BP 2025  ·  Total R$ ${fmtMi(totA25)} Mi`, {
    x: x25 + 0.15, y: TM_Y, w: w25, h: HDR_H,
    fontSize: 10, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });

  // Área de conteúdo começa abaixo do banner
  const cY = TM_Y + HDR_H + ITEM_GAP;
  const cH = TM_H - HDR_H - ITEM_GAP;

  // Colunas: metade ativo | metade passivo (iguais pois BP é equilibrado)
  const wCol24 = (w24 - COL_GAP) / 2;
  const wCol25 = (w25 - COL_GAP) / 2;
  const xA24 = x24;             const xP24 = x24 + wCol24 + COL_GAP;
  const xA25 = x25;             const xP25 = x25 + wCol25 + COL_GAP;

  // Helper: desenha coluna de retângulos empilhados proporcionais
  type TmItem = { abbr: string; val: number; total: number; color: string };
  const tmCol = (sl: any, x: number, w: number, items: TmItem[]) => {
    const usableH = cH - (items.length - 1) * ITEM_GAP;
    let iy = cY;
    items.forEach((item, i) => {
      const h = (item.val / item.total) * usableH;
      const pct = ((item.val / item.total) * 100).toFixed(1) + '%';
      const valStr = Math.round(item.val).toLocaleString('pt-BR');
      sl.addShape('rect', { x, y: iy, w, h, fill: { color: item.color }, line: { color: 'FFFFFF', pt: 1.5 } });
      if (h > 0.85) {
        // Célula grande: abbr no topo + valor (h>0.9) + pct no rodapé — sem sobreposição
        sl.addText(item.abbr, { x: x + 0.1, y: iy + 0.07, w: w - 0.15, h: 0.26,
          fontSize: 9, bold: true, color: C.white, fontFace: 'Arial', valign: 'top' });
        if (h > 0.9) {
          sl.addText(`R$ ${valStr} Mi`, { x: x + 0.1, y: iy + 0.34, w: w - 0.15, h: 0.26,
            fontSize: 7.5, color: C.white, fontFace: 'Arial', valign: 'top' });
        }
        sl.addText(pct, { x, y: iy + h - 0.30, w: w - 0.1, h: 0.28,
          fontSize: 9.5, bold: true, color: C.white, fontFace: 'Arial', align: 'right', valign: 'bottom' });
      } else if (h > 0.28) {
        // Célula pequena (ex: PNC): abbr + R$ no topo, % no rodapé direito (mesmo padrão das grandes)
        sl.addText(
          [
            { text: item.abbr,         options: { fontSize: 7,   bold: true,  breakLine: true } },
            { text: `R$ ${valStr} Mi`, options: { fontSize: 6.5, bold: false } },
          ],
          { x: x + 0.08, y: iy + 0.03, w: w - 0.16, h: 0.28,
            color: C.white, fontFace: 'Arial', valign: 'top', wrap: true },
        );
        sl.addText(pct, { x, y: iy + h - 0.26, w: w - 0.1, h: 0.24,
          fontSize: 9.5, bold: true, color: C.white, fontFace: 'Arial', align: 'right', valign: 'bottom' });
      }
      iy += h + (i < items.length - 1 ? ITEM_GAP : 0);
    });
  };

  // BP 2024
  tmCol(sbpa, xA24, wCol24, [
    { abbr: 'AC – Ativo Circulante',      val: bpV.ac24,  total: totA24, color: OR1 },
    { abbr: 'ANC – Ativo Não Circulante', val: bpV.anc24, total: totA24, color: OR2 },
  ]);
  tmCol(sbpa, xP24, wCol24, [
    { abbr: 'PC – Passivo Circulante',      val: bpV.pc24,  total: totP24, color: OR2 },
    { abbr: 'PNC – Passivo Não Circulante', val: bpV.pnc24, total: totP24, color: OR3 },
    { abbr: 'PL – Patrimônio Líquido',      val: bpV.pl24,  total: totP24, color: OR4 },
  ]);

  // BP 2025
  tmCol(sbpa, xA25, wCol25, [
    { abbr: 'AC – Ativo Circulante',      val: bpV.ac25,  total: totA25, color: BL1 },
    { abbr: 'ANC – Ativo Não Circulante', val: bpV.anc25, total: totA25, color: BL2 },
  ]);
  tmCol(sbpa, xP25, wCol25, [
    { abbr: 'PC – Passivo Circulante',      val: bpV.pc25,  total: totP25, color: BL2 },
    { abbr: 'PNC – Passivo Não Circulante', val: bpV.pnc25, total: totP25, color: BL3 },
    { abbr: 'PL – Patrimônio Líquido',      val: bpV.pl25,  total: totP25, color: BL4 },
  ]);

  // Mini-etiquetas ATIVO / PASSIVO+PL centralizadas no topo de cada coluna
  [[xA24, wCol24, 'ATIVO'], [xP24, wCol24, 'PASSIVO + PL'],
   [xA25, wCol25, 'ATIVO'], [xP25, wCol25, 'PASSIVO + PL']].forEach(([x, w, t]) => {
    sbpa.addText(t as string, { x: x as number, y: cY - 0.01, w: w as number, h: 0.22,
      fontSize: 7, color: '94A3B8', italic: true, fontFace: 'Arial', align: 'center' });
  });

  // ── Análise comparativa 2025 vs 2024 ─────────────────────────────────────
  const anY  = TM_Y + TM_H + 0.12;
  const anH  = 1.50;
  const anCw = (TM_W - 0.2) / 3; // 3 cards iguais
  const pSign = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
  const varAt  = (totA25 / totA24 - 1) * 100;
  const varAC  = (bpV.ac25 / bpV.ac24 - 1) * 100;
  const varAnc = (bpV.anc25 / bpV.anc24 - 1) * 100;
  const varPc  = (bpV.pc25 / bpV.pc24 - 1) * 100;
  const varPnc = (bpV.pnc25 / bpV.pnc24 - 1) * 100;
  const varPl  = (bpV.pl25 / bpV.pl24 - 1) * 100;

  const anCards = [
    {
      title: `Crescimento do Ativo  ${pSign(varAt)}`,
      color: '0D9488', bg: 'F0FDFA',
      body: `O ativo total cresceu ${pSign(varAt)} (R$${fmtMi(totA24)} → R$${fmtMi(totA25)} Mi). O ANC avançou ${pSign(varAnc)}, sinalizando investimentos em capacidade produtiva ou imobilizado. O AC cresceu ${pSign(varAC)}, mantendo a liquidez operacional.`,
    },
    {
      title: `Alavancagem  PC ${pSign(varPc)}  ·  PNC ${pSign(varPnc)}`,
      color: 'D97706', bg: 'FFFBEB',
      body: `PC e PNC cresceram acima do ativo, elevando a dependência de capital de terceiros. O PL avançou apenas ${pSign(varPl)}, indicando que a expansão foi financiada majoritariamente por dívida de curto e longo prazo.`,
    },
    {
      title: `Composição do Passivo  PL ${pSign(varPl)}`,
      color: '2563EB', bg: 'EFF6FF',
      body: `A participação do PL recuou de ${(bpV.pl24 / totP24 * 100).toFixed(1)}% para ${(bpV.pl25 / totP25 * 100).toFixed(1)}%. O PC subiu de ${(bpV.pc24 / totP24 * 100).toFixed(1)}% para ${(bpV.pc25 / totP25 * 100).toFixed(1)}%. Recomenda-se monitorar a liquidez corrente e o custo médio da dívida.`,
    },
  ];

  anCards.forEach((card, i) => {
    const cx = TM_X + i * (anCw + 0.1);
    sbpa.addShape('rect', { x: cx, y: anY, w: anCw, h: anH,
      fill: { color: card.bg }, line: { color: card.color, pt: 1.5 } });
    sbpa.addText(card.title, { x: cx + 0.12, y: anY + 0.10, w: anCw - 0.22, h: 0.34,
      fontSize: 8, bold: true, color: card.color, fontFace: 'Arial', wrap: true });
    sbpa.addText(card.body,  { x: cx + 0.12, y: anY + 0.46, w: anCw - 0.22, h: anH - 0.56,
      fontSize: 7.5, color: '374151', fontFace: 'Arial', wrap: true, valign: 'top' });
  });

  // ── SLIDE 3 – DRE BP 2025 ────────────────────────────────────────────────────
  const dre25Raw = (financialData as any).dre2025 ?? {};
  const dre25Rows: any[] = dre25Raw.rows ?? [];
  const dre25Periodo = dre25Raw.periodo ?? 'Dezembro/2025';

  const sDre25 = prs.addSlide();
  sDre25.background = { fill: C.white };

  sDre25.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.88, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sDre25.addText(`DRE – DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO  |  ${dre25Periodo}`, {
    x: 0.4, y: 0.05, w: 10.5, h: 0.5,
    fontSize: 14, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sDre25.addText('Em milhões de R$', {
    x: 0.4, y: 0.57, w: 6, h: 0.25,
    fontSize: 9.5, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(sDre25, 11.5, 0.07, 1.55, 0.7);

  const fmtDre25 = (v: number): string => {
    if (v === 0) return '–';
    const abs = Math.abs(v);
    const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return v < 0 ? `(${s})` : s;
  };
  const fmtPct25 = (v: number): string => {
    if (v === 0) return '–';
    const s = Math.abs(v) + '%';
    return v < 0 ? `(${s})` : s;
  };

  const dre25Header: object[] = [
    { text: 'Descrição', options: { bold: true, color: C.white, fill: { color: C.darkBlue }, fontSize: 9, fontFace: 'Arial', align: 'left',   valign: 'middle' } },
    { text: '2025',      options: { bold: true, color: C.white, fill: { color: C.darkBlue }, fontSize: 9, fontFace: 'Arial', align: 'center', valign: 'middle' } },
    { text: '2024',      options: { bold: true, color: C.white, fill: { color: C.darkBlue }, fontSize: 9, fontFace: 'Arial', align: 'center', valign: 'middle' } },
    { text: '%',         options: { bold: true, color: C.white, fill: { color: C.darkBlue }, fontSize: 9, fontFace: 'Arial', align: 'center', valign: 'middle' } },
  ];

  const dre25TableRows: object[][] = [dre25Header, ...dre25Rows.map((row: any, i: number) => {
    const isEven = i % 2 === 0;
    const bg = row.bold ? C.lightBlue : isEven ? C.white : C.lightGray;
    return [
      { text: row.bold ? row.label : `   ${row.label}`, options: { bold: row.bold, fontSize: row.bold ? 9 : 8, color: C.gray, fill: { color: bg }, fontFace: 'Arial', align: 'left',  valign: 'middle' } },
      { text: fmtDre25(row.v2025), options: { bold: row.bold, fontSize: row.bold ? 9 : 8, color: C.gray, fill: { color: bg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
      { text: fmtDre25(row.v2024), options: { bold: row.bold, fontSize: row.bold ? 9 : 8, color: C.gray, fill: { color: bg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
      { text: fmtPct25(row.pct),   options: { bold: row.bold, fontSize: row.bold ? 9 : 8, color: C.gray, fill: { color: bg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
    ];
  })];

  sDre25.addTable(dre25TableRows, {
    x: 0.3, y: 0.95, w: 12.7,
    rowH: 0.30,
    border: { pt: 0.3, color: 'E2E8F0' },
    colW: [7.5, 1.8, 1.8, 1.6],
  });

  const dre25AX = 0.3, dre25AY = 5.52, dre25AW = 12.7;
  sDre25.addShape('rect', { x: dre25AX, y: dre25AY,       w: dre25AW, h: 0.3,  fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sDre25.addText('ANÁLISE', {
    x: dre25AX + 0.12, y: dre25AY + 0.02, w: dre25AW - 0.2, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sDre25.addShape('rect', { x: dre25AX, y: dre25AY + 0.3, w: dre25AW, h: 1.62, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  sDre25.addText('▸  Receita operacional líquida de R$ 4.805M em 2025, crescimento de 6% sobre os R$ 4.516M de 2024. Lucro Operacional Bruto de R$ 1.372M (margem de 28,6%), com expansão de 9% frente ao exercício anterior. Despesas operacionais totalizaram R$ 1.292M (+7%), concentradas em despesas gerais e administrativas de R$ 1.289M.', {
    x: dre25AX + 0.18, y: dre25AY + 0.36, w: dre25AW - 0.35, h: 0.72,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });
  sDre25.addText('▸  Resultado financeiro de R$ 5M (vs. R$ 46M em 2024, -89%), reflexo da queda nas receitas financeiras de R$ 61M para R$ 28M. Resultado antes dos impostos de R$ 85M (-8%). Lucro líquido encerrou em R$ 53M, com retração de 14% frente aos R$ 61M de 2024.', {
    x: dre25AX + 0.18, y: dre25AY + 1.14, w: dre25AW - 0.35, h: 0.72,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });

  // ── SLIDE 4 – DFC BP 2025 ────────────────────────────────────────────────────
  const dfc25Data     = (financialData as any).dfc2025 ?? {};
  const dfc25Periodo  = dfc25Data.periodo ?? 'Dezembro/2025';
  const dfc25Secs: any[] = dfc25Data.sections ?? [];
  const getSecRow25 = (si: number, lbl: string): number =>
    dfc25Secs[si]?.rows?.find((r: any) => r.label === lbl)?.valor ?? 0;

  const sBp25 = prs.addSlide();
  sBp25.background = { fill: C.white };

  sBp25.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.88, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sBp25.addText(`DFC – DEMONSTRAÇÃO DO FLUXO DE CAIXA  |  ${dfc25Periodo}`, {
    x: 0.4, y: 0.05, w: 10.5, h: 0.5,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sBp25.addText('Em milhões de R$', {
    x: 0.4, y: 0.57, w: 6, h: 0.25,
    fontSize: 9.5, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(sBp25, 11.5, 0.07, 1.55, 0.7);

  const bp25Sec0Show = new Set([
    'Lucro (Prejuízo) do período',
    'Depreciação e amortização',
    'Resultado na venda/baixa de ativo imobilizado',
    'Redução ao valor recuperável do contas a receber',
    'Lucro (Prejuízo) Ajustado',
    'Geração (Consumo) Caixa Operacional',
    'Fluxo de Caixa das Atividades Operacionais',
  ]);
  const bp25Sec3Show = new Set(['Caixa gerado das atividades operacionais']);
  const bp25SecTitles = ['ATIVIDADES OPERACIONAIS', 'INVESTIMENTOS', 'FINANCIAMENTOS', 'RESULTADO'];
  const dfcSecCfg = [
    { hBg: '1E3A5F', boldBg: 'BFDBFE', rowBg: 'EFF6FF' },
    { hBg: '1E4976', boldBg: 'BAE6FD', rowBg: 'F0F9FF' },
    { hBg: '1E5C8A', boldBg: 'A5F3FC', rowBg: 'F0FDFF' },
    { hBg: '155E75', boldBg: '1E3A5F', rowBg: 'ECFEFF' },
  ];
  const dfcColW: [number, number] = [4.3, 1.5];
  const dfcRowH = 0.295;
  const fmtDfc = (v: number): string => {
    if (v === 0) return '–';
    const abs = Math.abs(v) / 1000;
    const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `(${s})` : s;
  };

  const bp25TRows: object[][] = [];
  dfc25Secs.forEach((sec: any, si: number) => {
    const cfg    = dfcSecCfg[si] ?? dfcSecCfg[0];
    const isRes  = si === 3;
    bp25TRows.push([
      { text: bp25SecTitles[si] ?? sec.title, options: { bold: true, fontSize: 9, color: C.white, fill: { color: cfg.hBg }, fontFace: 'Arial', align: 'left', valign: 'middle' } },
      { text: 'Valor', options: { bold: true, fontSize: 9, color: C.white, fill: { color: cfg.hBg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
    ]);
    (sec.rows ?? []).forEach((row: any) => {
      const isBold = !!row.bold;
      const val: number = row.valor ?? 0;
      if (si === 0 && !bp25Sec0Show.has(row.label)) return;
      if (si === 3 && !bp25Sec3Show.has(row.label)) return;
      if ((si === 1 || si === 2) && !isBold && val === 0) return;
      const bg      = isBold ? cfg.boldBg : cfg.rowBg;
      const isWhite = isRes && isBold;
      const tColor  = isWhite ? C.white : C.gray;
      const vColor  = isWhite ? C.white : '000000';
      bp25TRows.push([
        { text: isBold ? row.label : `   ${row.label}`, options: { bold: isBold, fontSize: isBold ? 9 : 8, color: tColor, fill: { color: bg }, fontFace: 'Arial', align: 'left',  valign: 'middle' } },
        { text: fmtDfc(val),                             options: { bold: isBold, fontSize: isBold ? 9 : 8, color: vColor, fill: { color: bg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
      ]);
    });
  });

  sBp25.addTable(bp25TRows, {
    x: 0.3, y: 0.95, w: 5.8, h: bp25TRows.length * dfcRowH,
    colW: dfcColW, rowH: dfcRowH,
    border: { pt: 0.3, color: 'E2E8F0' },
  });

  const bp25Vals = [
    getSecRow25(0, 'Lucro (Prejuízo) Ajustado')                / 1000,
    getSecRow25(0, 'Geração (Consumo) Caixa Operacional')      / 1000,
    getSecRow25(1, 'Fluxo de Caixa de Investimentos')          / 1000,
    getSecRow25(2, 'Fluxo de Caixa de Financiamentos')         / 1000,
    getSecRow25(3, 'Caixa gerado das atividades operacionais') / 1000,
  ];
  const bp25Min = Math.floor(Math.min(...bp25Vals) * 1.35 / 5) * 5;
  const bp25Max = Math.ceil(Math.max(...bp25Vals)  * 1.25 / 5) * 5;

  (sBp25 as any).addChart('line', [{
    name: 'R$ Milhões',
    labels: ['Lucro\nAjustado', 'Caixa\nOperacional', 'Investimentos', 'Financiamentos', 'Caixa\nGerado'],
    values: bp25Vals,
  }], {
    x: 6.4, y: 0.95, w: 6.65, h: 3.15,
    showTitle: true,
    title: `Consumo de Caixa  |  ${dfc25Periodo}`,
    titleFontSize: 11, titleBold: true, titleColor: C.darkBlue,
    lineDataSymbol: 'circle', lineDataSymbolSize: 9,
    lineSize: 2.5, chartColors: ['2563EB'],
    showValue: true, dataLabelFontSize: 9, dataLabelFontBold: true, dataLabelColor: C.darkBlue,
    showLegend: false,
    valAxisMinVal: bp25Min, valAxisMaxVal: bp25Max,
    valGridLine: { style: 'solid', color: 'E5E7EB', size: 0.5 },
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
  });

  const bp25AX = 6.4, bp25AY = 4.2, bp25AW = 6.65;
  sBp25.addShape('rect', { x: bp25AX, y: bp25AY, w: bp25AW, h: 0.3, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sBp25.addText('ANÁLISE', {
    x: bp25AX + 0.12, y: bp25AY + 0.02, w: bp25AW - 0.2, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sBp25.addShape('rect', { x: bp25AX, y: bp25AY + 0.3, w: bp25AW, h: 2.7, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  sBp25.addText('▸  Lucro ajustado de R$ 78M em dezembro de 2025, composto por resultado líquido de R$ 53M, depreciação R$ 21M e ajustes de créditos e ativos de R$ 4M. O capital de giro contribuiu positivamente com R$ 83M em geração de caixa, elevando o fluxo operacional total a R$ 161M.', {
    x: bp25AX + 0.18, y: bp25AY + 0.36, w: bp25AW - 0.35, h: 1.2,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });
  sBp25.addText('▸  Investimentos em ativo fixo de R$ 6M. Fluxo de financiamentos negativo de R$ 88M, resultante de amortização de empréstimos (R$ 62M) e distribuição de capital e lucros (R$ 43M), parcialmente compensados por aportes de partes relacionadas (R$ 17M). Caixa gerado no período: R$ 67M.', {
    x: bp25AX + 0.18, y: bp25AY + 1.62, w: bp25AW - 0.35, h: 1.2,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });

  // ── SLIDE – Quadro de Funcionários (31/12/2025) ───────────────────────────
  const sFuncs = prs.addSlide();
  sFuncs.background = { fill: C.white };

  sFuncs.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sFuncs.addText('QUADRO DE FUNCIONÁRIOS  –  31/12/2025', {
    x: 0.3, y: 0.05, w: 11.2, h: 0.8,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  addLogo(sFuncs, 11.6, 0.1, 1.55, 0.7);

  const funcData = [
    { setor: 'Supermercado',   qtd: 10714 },
    { setor: 'Magazan',        qtd: 3841  },
    { setor: 'Home Center',    qtd: 647   },
    { setor: 'Farmácia',       qtd: 614   },
    { setor: 'Pet Shop',       qtd: 266   },
    { setor: 'Obra',           qtd: 254   },
    { setor: 'Café',           qtd: 56    },
    { setor: 'Ótica',          qtd: 51    },
    { setor: 'Nutri Líder',    qtd: 10    },
    { setor: 'Administrativo', qtd: 890   },
  ];

  const totalFuncs = funcData.reduce((s, r) => s + r.qtd, 0);

  // Card total no topo
  sFuncs.addShape('rect', { x: 0.3, y: 1.05, w: 12.73, h: 0.62, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sFuncs.addText('TOTAL DE FUNCIONÁRIOS', {
    x: 0.3, y: 1.05, w: 7.5, h: 0.62,
    fontSize: 13, bold: true, color: 'BFDBFE', fontFace: 'Arial', valign: 'middle', align: 'left', margin: [0, 0, 0, 16],
  });
  sFuncs.addText(totalFuncs.toLocaleString('pt-BR'), {
    x: 7.8, y: 1.05, w: 5.23, h: 0.62,
    fontSize: 20, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle', align: 'right', margin: [0, 16, 0, 0],
  });

  // Ordenado do maior para o menor
  const funcSorted = [...funcData].sort((a, b) => b.qtd - a.qtd);

  (sFuncs as any).addChart('bar', [
    {
      name: 'Funcionários',
      labels: funcSorted.map(r => {
        const pct = ((r.qtd / totalFuncs) * 100).toFixed(1).replace('.', ',');
        return `${r.setor}  (${pct}%)`;
      }),
      values: funcSorted.map(r => r.qtd),
    },
  ], {
    x: 0.3, y: 1.75, w: 12.73, h: 5.5,
    barDir: 'bar',
    barGrouping: 'clustered',
    barGapWidthPct: 40,
    chartColors: ['93C5FD'],
    plotAreaBkgndColor: 'F8FAFC',
    chartAreaBkgndColor: 'FFFFFF',
    valGridLine: { style: 'solid', color: 'E2E8F0', pt: 0.5 },
    catGridLine: { style: 'none' },
    showLegend: false,
    showValue: true,
    dataLabelFontSize: 9,
    dataLabelColor: '1E3A5F',
    valAxisLabelFontSize: 8,
    catAxisLabelFontSize: 9,
    showTitle: false,
  });

  sFuncs.addText('* Fonte: Informações fornecidas pelo Setor Pessoal em 14/05/2026.', {
    x: 0.3, y: 7.18, w: 12.73, h: 0.3,
    fontSize: 8, color: '9CA3AF', italic: true, fontFace: 'Arial',
  });

  // ── SLIDE 3 – Premissas: Taxas e Cenários ─────────────────────────────────
  const sp1 = prs.addSlide();
  sp1.background = { fill: C.white };
  addHdr(sp1, 'PREMISSAS  –  Taxas de Crescimento e Cenários');

  const scens = [
    { name: 'Pessimista', rate: scenRates?.pessimista ?? 0.04, color: 'D97706', bg: 'FFFBEB',
      desc: 'Crescimento conservador, abaixo da inflação projetada. Utilizado para análise de risco e stress test do modelo financeiro.' },
    { name: 'Realista',   rate: scenRates?.realista   ?? 0.06, color: '2563EB', bg: 'EFF6FF',
      desc: 'Cenário-base. Taxa alinhada à expectativa de crescimento nominal com inflação projetada para 2026–2030.' },
    { name: 'Otimista',   rate: scenRates?.otimista   ?? 0.09, color: '16A34A', bg: 'F0FDF4',
      desc: 'Crescimento acelerado. Reflete expansão de market share, ganhos de eficiência e melhora do mix de produtos.' },
  ];

  scens.forEach((sc, i) => {
    const x = 0.3 + i * 4.3;
    const isActive = sc.name.toLowerCase() === scenario;
    sp1.addShape('rect', { x, y: 1.05, w: 4.1, h: 2.5, fill: { color: sc.bg }, line: { color: sc.color, pt: isActive ? 4 : 2 } });
    sp1.addText(sc.name.toUpperCase(), { x: x + 0.18, y: 1.15, w: isActive ? 2.6 : 3.7, h: 0.42, fontSize: 12, bold: true, color: sc.color, fontFace: 'Arial' });
    if (isActive) {
      sp1.addShape('rect', { x: x + 2.85, y: 1.12, w: 1.1, h: 0.28, fill: { color: sc.color }, line: { color: sc.color } });
      sp1.addText('● EM USO', { x: x + 2.85, y: 1.12, w: 1.1, h: 0.28, fontSize: 7.5, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle' });
    }
    sp1.addText(fmtPct(sc.rate) + ' a.a.', { x: x + 0.18, y: 1.57, w: 3.7, h: 0.72, fontSize: 30, bold: true, color: sc.color, fontFace: 'Arial' });
    sp1.addText(sc.desc, { x: x + 0.18, y: 2.35, w: 3.7, h: 1.0, fontSize: 9, color: '4B5563', fontFace: 'Arial', wrap: true });
  });

  const impHdr = [
    { text: 'Cenário', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...YRS.map((n, i) => ({ text: YR_LABELS[i], options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'center', fontSize: 9, fontFace: 'Arial', valign: 'middle' } })),
    { text: 'Acumulado 5 anos', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'center', fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
  ];
  const impRows = scens.map((sc, i) => {
    const isActive = sc.name.toLowerCase() === scenario;
    const bg = isActive ? sc.bg : (i % 2 === 0 ? C.white : C.lightGray);
    return [
      { text: isActive ? `● ${sc.name}` : sc.name, options: { bold: true, fontSize: isActive ? 9 : 8, color: sc.color, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
      ...YRS.map(yr => ({ text: fmtPct(Math.pow(1 + sc.rate, yr) - 1), options: { align: 'center', fontSize: isActive ? 9 : 8, bold: isActive, color: sc.color, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } })),
      { text: fmtPct(Math.pow(1 + sc.rate, 5) - 1), options: { align: 'center', fontSize: isActive ? 9 : 8, bold: true, color: sc.color, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
    ];
  });
  sp1.addTable([impHdr, ...impRows], {
    x: 0.3, y: 3.75, w: 12.7, h: 1.9,
    rowH: 0.38, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [2.2, 1.7, 1.7, 1.7, 1.7, 1.7, 2.2],
  });
  sp1.addText(`¹O Cenário utilizado para as projeções a seguir é o ${scenLabel.toLowerCase()} que usa a taxa de ${fmtPct(scenRate)} de crescimento sobre as receitas do exercício anterior.`, {
    x: 0.3, y: 6.75, w: 12.7, h: 0.4, fontSize: 8, color: '9CA3AF', italic: true, fontFace: 'Arial',
  });

  // ── SLIDE 4 – Projeção de Estoques ────────────────────────────────────────
  const sp2 = prs.addSlide();
  sp2.background = { fill: C.white };
  addHdr(sp2, 'PREMISSAS  –  Projeção de Estoques', scenLabel, 'Em milhões de R$');

  const estoqSec: any[] = premSecs.find((s: any) => s.title === 'Projeção estoques')?.rows ?? [];
  const estoqHdr = [
    { text: 'Componente', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...YRS.map((n, i) => ({ text: YR_LABELS[i], options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } })),
  ];
  const estoqTRows: any[] = [];
  ['A', 'B', 'C', 'D'].forEach((t, ti) => {
    const b = ti * 6;
    const bgH = ti % 2 === 0 ? 'D1E9FF' : C.lightBlue;
    const bgR = ti % 2 === 0 ? C.white : C.lightGray;
    const get = (off: number, yr: number): number => estoqSec[b + off]?.[`ano${yr}`] ?? 0;
    estoqTRows.push([
      { text: `Tipo ${t}  –  Saldo Inicial`, options: { bold: true, fontSize: 9, color: C.darkBlue, fill: { color: bgH }, fontFace: 'Arial', valign: 'middle' } },
      ...YRS.map(yr => ({ text: fmtM(get(0, yr)), options: { align: 'right', fontSize: 9, bold: true, color: '000000', fill: { color: bgH }, fontFace: 'Arial', valign: 'middle' } })),
    ]);
    estoqTRows.push([
      { text: '   Compras', options: { bold: false, fontSize: 8, color: C.gray, fill: { color: bgR }, fontFace: 'Arial', valign: 'middle' } },
      ...YRS.map(yr => ({ text: fmtM(get(1, yr)), options: { align: 'right', fontSize: 8, color: C.gray, fill: { color: bgR }, fontFace: 'Arial', valign: 'middle' } })),
    ]);
    estoqTRows.push([
      { text: '   Baixa CMV', options: { bold: false, fontSize: 8, color: C.gray, fill: { color: bgR }, fontFace: 'Arial', valign: 'middle' } },
      ...YRS.map(yr => ({ text: fmtM(get(2, yr)), options: { align: 'right', fontSize: 8, bold: true, color: '000000', fill: { color: bgR }, fontFace: 'Arial', valign: 'middle' } })),
    ]);
    estoqTRows.push([
      { text: `Tipo ${t}  –  Saldo Final`, options: { bold: true, fontSize: 9, color: C.darkBlue, fill: { color: bgH }, fontFace: 'Arial', valign: 'middle' } },
      ...YRS.map(yr => ({ text: fmtM(get(5, yr)), options: { align: 'right', fontSize: 9, bold: true, color: '000000', fill: { color: bgH }, fontFace: 'Arial', valign: 'middle' } })),
    ]);
  });
  sp2.addTable([estoqHdr, ...estoqTRows], {
    x: 0.3, y: 1.0, w: 12.7, h: 4.5,
    rowH: 0.25, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [3.2, 1.9, 1.9, 1.9, 1.9, 1.9],
  });

  // Mini-tabela Orçamento 2026 vs 2025 (canto inferior direito)
  const compras2026 = [1, 7, 13, 19].reduce((s, i) => s + (estoqSec[i]?.[`ano1`] ?? 0), 0);
  const compras2025 = 3505575917; // valor realizado 2025 (base planilha)
  const varCompras  = compras2026 - compras2025;
  const fmtOrc = (v: number) => Math.abs(Math.round(v)).toLocaleString('pt-BR');
  const varStr = (varCompras < 0 ? '(' : '') + fmtOrc(varCompras) + (varCompras < 0 ? ')' : '');
  // Mini-tabela Orçamento 2026 vs 2025 — cabeçalho como shape, tabela 2 colunas
  sp2.addShape('rect', { x: 10.1, y: 5.55, w: 3.05, h: 0.32, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sp2.addText('Orçamento 2026', { x: 10.1, y: 5.55, w: 3.05, h: 0.32, fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Arial' });
  sp2.addTable([
    [
      { text: 'Compra', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, align: 'center', fontFace: 'Arial', valign: 'middle' } },
      { text: 'Ano', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, align: 'center', underline: true, fontFace: 'Arial', valign: 'middle' } },
    ],
    [
      { text: fmtOrc(compras2026), options: { bold: true, align: 'center', fontSize: 9, color: '000000', fill: { color: C.white }, valign: 'middle', fontFace: 'Arial' } },
      { text: '2026', options: { align: 'center', fontSize: 9, color: C.gray, fill: { color: C.white }, valign: 'middle', fontFace: 'Arial' } },
    ],
    [
      { text: fmtOrc(compras2025), options: { align: 'center', fontSize: 8, color: C.gray, fill: { color: C.lightGray }, valign: 'middle', fontFace: 'Arial' } },
      { text: '2025', options: { align: 'center', fontSize: 8, color: C.gray, fill: { color: C.lightGray }, valign: 'middle', fontFace: 'Arial' } },
    ],
    [
      { text: varStr, options: { bold: true, align: 'center', fontSize: 9, color: '000000', fill: { color: C.white }, valign: 'middle', fontFace: 'Arial' } },
      { text: '', options: { fill: { color: C.white }, valign: 'middle' } },
    ],
  ], {
    x: 10.1, y: 5.87, w: 3.05,
    rowH: 0.32,
    border: { pt: 0.5, color: 'D1D5DB' },
    colW: [1.9, 1.15],
  });

  sp2.addShape('rect', { x: 0.3, y: 5.6, w: 9.4, h: 0.3, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sp2.addText('ANÁLISE', {
    x: 0.42, y: 5.62, w: 9.2, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sp2.addShape('rect', { x: 0.3, y: 5.9, w: 9.4, h: 1.5, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  sp2.addText('▸  Premissa adotada para o orçamento do estoque foi de manutenção de giro em 45 dias para todas as categorias; usamos o CMV projetado do mês anterior e multiplicamos por 1,3 no mês seguinte.', {
    x: 0.48, y: 5.96, w: 9.1, h: 0.66,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });
  sp2.addText('▸  As premissas de estoque para a projeção dos demais exercícios é uma variável baseada na taxa de crescimento da receita, que possui 03 cenários (Otimista; Realista; Pessimista).', {
    x: 0.48, y: 6.68, w: 9.1, h: 0.66,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });

  // ── SLIDE 5 – Projeção de Imobilizado ─────────────────────────────────────
  const sp3 = prs.addSlide();
  sp3.background = { fill: C.white };
  addHdr(sp3, 'PREMISSAS  –  Projeção de Imobilizado', scenLabel, 'Em milhões de R$');

  const imoSec: any[] = premSecs.find((s: any) => s.title === 'Projeção Imobilizado')?.rows ?? [];
  const getImo = (label: string, yr: number): number => imoSec.find((r: any) => r.label === label)?.[`ano${yr}`] ?? 0;

  const imoHdr2 = [
    { text: 'Imobilizado', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...YRS.map((n, i) => ({ text: YR_LABELS[i], options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } })),
  ];
  // Saldo Final calculado (ano2 está zerado no JSON — dado incompleto na fonte)
  const imoSaldoFinal = (yr: number) => {
    const raw = getImo('Imobilizado líquido - Saldo final', yr);
    if (raw !== 0) return raw;
    return getImo('Imobilizado líquido - Saldo inicial', yr)
      + getImo('Adições -Custos (1 lj 50MM + dep.)', yr)
      + getImo('Adições -Depreciação', yr);
  };

  const imoDef = [
    { label: 'Saldo Inicial (Imobilizado Líquido)',      vals: YRS.map(yr => getImo('Imobilizado líquido - Saldo inicial', yr)),      bold: true  },
    { label: 'Adições de Custos (expansão + infraest.)', vals: YRS.map(yr => getImo('Adições -Custos (1 lj 50MM + dep.)', yr)),        bold: false },
    { label: 'Depreciação do Período',                   vals: YRS.map(yr => getImo('Adições -Depreciação', yr)),                      bold: false },
    { label: 'Saldo Final (Imobilizado Líquido)',         vals: YRS.map(yr => imoSaldoFinal(yr)),                                       bold: true  },
  ];
  const imoTRows = imoDef.map((r, i) => {
    const bg = r.bold ? C.lightBlue : i % 2 === 0 ? C.white : C.lightGray;
    return [
      { text: r.label, options: { bold: r.bold, fontSize: r.bold ? 9 : 8, color: r.bold ? C.darkBlue : C.gray, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
      ...r.vals.map((v: number) => ({ text: fmtM(v), options: { align: 'right', fontSize: r.bold ? 9 : 8, bold: true, color: '000000', fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } })),
    ];
  });
  sp3.addTable([imoHdr2, ...imoTRows], {
    x: 0.4, y: 1.05, w: 12.5, h: 3.0,
    rowH: 0.5, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [3.5, 1.8, 1.8, 1.8, 1.8, 1.8],
  });

  const custoAcum = YRS.reduce((a, yr) => a + getImo('Adições -Custos (1 lj 50MM + dep.)', yr), 0);
  const depAcum   = YRS.reduce((a, yr) => a + Math.abs(getImo('Adições -Depreciação', yr)), 0);
  const imoInit   = getImo('Imobilizado líquido - Saldo inicial', 1);
  const imoFinal  = imoSaldoFinal(5);
  sp3.addShape('rect', { x: 0.4, y: 4.15, w: 12.5, h: 0.3, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sp3.addText('ANÁLISE', {
    x: 0.52, y: 4.17, w: 12.3, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sp3.addShape('rect', { x: 0.4, y: 4.45, w: 12.5, h: 2.6, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  sp3.addText(
    `▸  O plano prevê investimentos totais de aproximadamente ${fmtM(custoAcum)} em 5 anos, incluindo a abertura de novas unidades (~R$ 50MM/Un). ` +
    `A depreciação acumulada no período é de ${fmtM(depAcum)}. ` +
    `O imobilizado líquido evolui de ${fmtM(imoInit)} (Ano 1) para ${fmtM(imoFinal)} (Ano 5), ` +
    `refletindo os novos ativos já deduzidos da depreciação acumulada.`,
    { x: 0.58, y: 4.51, w: 12.2, h: 1.2, fontSize: 9, color: C.gray, fontFace: 'Arial', wrap: true, valign: 'top', lineSpacingMultiple: 1.2 }
  );

  // ── SLIDE 6 – Projeção de Empréstimos ─────────────────────────────────────
  const sp4 = prs.addSlide();
  sp4.background = { fill: C.white };
  addHdr(sp4, 'PREMISSAS  –  Projeção de Empréstimos', scenLabel, 'Em milhões de R$');

  const empSec: any[] = premSecs.find((s: any) => s.title === 'Projeção Empréstimos')?.rows ?? [];
  const getEmp = (label: string, yr: number): number => empSec.find((r: any) => r.label === label)?.[`ano${yr}`] ?? 0;

  const empHdr2 = [
    { text: 'Empréstimos', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...YRS.map((n, i) => ({ text: YR_LABELS[i], options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } })),
  ];
  const empDef = [
    { label: 'Saldo Inicial',                key: 'Empréstimo líquido - Saldo inicial',    bold: true },
    { label: 'Novas Captações',              key: 'Adições de Dívida Total',                bold: false },
    { label: 'Juros a Transcorrer (deságio)',key: 'Adições de Juros a Transcorrer',         bold: false },
    { label: 'Juros Apropriados no Período', key: 'Juros do período',                       bold: false },
    { label: 'Amortização – Principal',      key: 'Amortização Principal',                  bold: false },
    { label: 'Amortização – Juros',          key: 'Amortização Juros',                      bold: false },
    { label: 'Saldo Final – CP',             key: 'Empréstimo líquido - Saldo final CP',    bold: false },
    { label: 'Saldo Final – LP',             key: 'Empréstimo líquido - Saldo final LP',    bold: false },
    { label: 'Saldo Final Total',            key: 'Empréstimo líquido - Saldo final',       bold: true },
  ];
  const empTRows = empDef.map((r, i) => {
    const bg = r.bold ? C.lightBlue : i % 2 === 0 ? C.white : C.lightGray;
    return [
      { text: r.label, options: { bold: r.bold, fontSize: r.bold ? 9 : 8, color: r.bold ? C.darkBlue : C.gray, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
      ...YRS.map(yr => { const v = getEmp(r.key, yr); return { text: fmtM(v), options: { align: 'right', fontSize: r.bold ? 9 : 8, bold: true, color: '000000', fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } }; }),
    ];
  });
  sp4.addTable([empHdr2, ...empTRows], {
    x: 0.3, y: 1.05, w: 12.7, h: 5.8,
    rowH: 0.4, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [3.2, 1.9, 1.9, 1.9, 1.9, 1.9],
  });
  sp4.addText('* Taxa de juros: 1,37% a.m.  |  Captações de R$ 50MM/ano para suporte ao plano de expansão. Amortização crescente de principal e juros ao longo do período.', {
    x: 0.3, y: 7.05, w: 12.7, h: 0.35, fontSize: 8, color: '9CA3AF', italic: true, fontFace: 'Arial',
  });

  // ── SLIDE 7 – Fluxo Financeiro e Capital de Giro ──────────────────────────
  const sp5 = prs.addSlide();
  sp5.background = { fill: C.white };
  addHdr(sp5, 'PREMISSAS  –  Fluxo Financeiro e Capital de Giro', scenLabel, 'Em milhões de R$');

  const cr  = kpiData?.contasReceber ?? {};
  const cpd = kpiData?.contasPagar   ?? {};
  const est = kpiData?.estoqueTotal   ?? {};

  // Saldos base (VLR 25) — usado como ponto de partida para o Ano 1
  const cr25  = parseFloat(String(cr.vlr25  ?? 0)) || 0;
  // cpd25 = soma(R99:R108) - soma(C115:C118) — fórmula da planilha, VLR25 de contas a pagar
  const ffSec: any[] = premSecs.find((s: any) => s.title === 'Fluxo Financeiro')?.rows ?? [];
  const sumR99R108  = [28,29,30,31,32,33,34,35,36,37].reduce((s, i) => s + (ffSec[i]?.ano1 ?? 0), 0);
  const sumC115C118 = [43,44,45,46].reduce((s, i) => s + (parseFloat(String(ffSec[i]?.col3 ?? 0)) || 0), 0);
  const cpd25Var1   = sumR99R108 - sumC115C118; // variação direta do Ano 1 (~9.996.141)
  const cpd25 = 0;
  // est25: soma dos col3 das 4 linhas "Saldo final" de estoques
  const est25 = [5, 11, 17, 23].reduce((s, i) => s + (parseFloat(String(estoqSec[i]?.col3 ?? 0)) || 0), 0);

  // Variação: Ano N − Ano N-1 (Ano 1 − VLR25)
  const crVar  = (yr: number) => (cr[`ano${yr}`]  ?? 0) - (yr === 1 ? cr25  : (cr[`ano${yr - 1}`]  ?? 0));
  const cpdVar = (yr: number) => yr === 1 ? cpd25Var1 * -1 : ((cpd[`ano${yr}`] ?? 0) - (cpd[`ano${yr - 1}`] ?? 0)) * -1;
  const estVar = (yr: number) => (est[`ano${yr}`] ?? 0) - (yr === 1 ? est25 : (est[`ano${yr - 1}`] ?? 0));
  const ncgVar = (yr: number) => crVar(yr) + estVar(yr) + cpdVar(yr);

  const wrkHdr = [
    { text: 'Variação Capital de Giro (R$)', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...YRS.map((n, i) => ({ text: YR_LABELS[i], options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } })),
  ];
  const wrkDef = [
    { label: '( + ) Contas a Receber',              vals: YRS.map(yr => crVar(yr)),           bold: false },
    { label: '( + ) Estoques',                       vals: YRS.map(yr => estVar(yr)),          bold: false },
    { label: '( - ) Contas a Pagar',                 vals: YRS.map(yr => cpdVar(yr)),          bold: false },
    { label: 'Variação da NCG (Capital de Giro)',    vals: YRS.map(yr => getFC('NCG', yr)),   bold: true  },
  ];
  const wrkTRows = wrkDef.map((r, i) => {
    const bg = r.bold ? C.lightBlue : i % 2 === 0 ? C.white : C.lightGray;
    return [
      { text: r.label, options: { bold: r.bold, fontSize: r.bold ? 9 : 8, color: r.bold ? C.darkBlue : C.gray, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
      ...r.vals.map((v: number) => ({
        text: v === 0 ? '–' : fmtM(v),
        options: { align: 'right', fontSize: r.bold ? 9 : 8, bold: true, color: '000000', fill: { color: bg }, fontFace: 'Arial', valign: 'middle' },
      })),
    ];
  });
  sp5.addTable([wrkHdr, ...wrkTRows], {
    x: 0.4, y: 1.1, w: 12.5, h: 3.0,
    rowH: 0.52, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [4.0, 1.7, 1.7, 1.7, 1.7, 1.7],
  });

  const varNcgTotal = YRS.reduce((acc, yr) => acc + getFC('NCG', yr), 0);
  const ncgAno1 = getFC('NCG', 1);
  const ncgLiberado = YRS.filter(yr => yr > 1).reduce((s, yr) => s + getFC('NCG', yr), 0);
  sp5.addShape('rect', { x: 0.4, y: 4.2, w: 12.5, h: 0.3, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sp5.addText('ANÁLISE', {
    x: 0.52, y: 4.22, w: 12.3, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sp5.addShape('rect', { x: 0.4, y: 4.5, w: 12.5, h: 2.7, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  sp5.addText(
    `▸  A tabela apresenta a variação anual da NCG (Necessidade de Capital de Giro) de cada ano em relação ao exercício anterior (base: VLR 2025). ` +
    `Valores positivos indicam consumo de caixa (pressão sobre o fluxo); valores negativos indicam liberação de caixa (folga operacional).`,
    { x: 0.58, y: 4.56, w: 12.2, h: 1.2, fontSize: 9, color: C.gray, fontFace: 'Arial', wrap: true, valign: 'top', lineSpacingMultiple: 1.2 }
  );

  // ── SLIDE 8 – Resumo DRE ───────────────────────────────────────────────────
  const s2 = prs.addSlide();
  s2.background = { fill: C.white };

  s2.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  s2.addText('RESUMO DRE', {
    x: 0.3, y: 0.05, w: 11.2, h: 0.5,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  s2.addText('Em milhões de R$', {
    x: 0.3, y: 0.57, w: 6, h: 0.25,
    fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(s2, 11.6, 0.1, 1.55, 0.7);

  const headerRow = [
    { text: 'Descrição', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...anos.map((a: string) => ({
      text: a,
      options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'center', fontSize: 9, fontFace: 'Arial', valign: 'middle' },
    })),
  ];

  const dataRows = rows.map((row: any, i: number) => {
    const isEven = i % 2 === 0;
    const bg = row.bold ? C.lightBlue : isEven ? C.white : C.lightGray;
    return [
      {
        text: row.label,
        options: { bold: row.bold, fontSize: row.bold ? 9 : 8, color: C.gray, fill: { color: bg }, indent: row.bold ? 0 : 8, fontFace: 'Arial', valign: 'middle' },
      },
      ...anos.map((a: string) => {
        const v = row.values?.[a] ?? 0;
        const display = row.pct ? fmtPct(v) : fmtMi(v);
        return {
          text: display,
          options: {
            align: 'right', fontSize: row.bold ? 9 : 8, bold: true,
            color: '000000',
            fill: { color: bg },
            fontFace: 'Arial',
            valign: 'middle',
          },
        };
      }),
    ];
  });

  s2.addTable([headerRow, ...dataRows], {
    x: 0.2, y: 1.0, w: 12.9, h: 4.6,
    rowH: 0.28,
    border: { pt: 0.5, color: 'D1D5DB' },
    autoPage: false,
    colW: [3.5, ...anos.map(() => (12.9 - 3.5) / anos.length)],
  });

  s2.addShape('rect', { x: 0.4, y: 5.88, w: 12.5, h: 0.3, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  s2.addText('ANÁLISE', {
    x: 0.52, y: 5.90, w: 12.3, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  s2.addShape('rect', { x: 0.4, y: 6.18, w: 12.5, h: 1.0, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  s2.addText(
    '▸  Resumo DRE, orçado para o Exercício de 2026, é a projeção do resultado a partir das premissas alinhadas com a ' +
    'Administração do Grupo Líder, somado às projeções de redução de despesas elaboradas pela empresa TMSI, que estima uma ' +
    'redução de 73MM na folha, 53MM em materiais de uso e consumo, 72MM em contas de consumo (água, luz e telefone) e 6MM ' +
    'em despesas diversas; para os demais exercícios as projeções são variáveis que levam em consideração o percentual de ' +
    'cada despesa sobre a receita líquida de 2026, replicando esse percentual sobre as receitas líquidas projetadas.',
    { x: 0.58, y: 6.24, w: 12.2, h: 0.84, fontSize: 9, color: C.gray, fontFace: 'Arial', wrap: true, valign: 'top', lineSpacingMultiple: 1.2 }
  );

  // ── SLIDE 9 – KPIs (completo) ─────────────────────────────────────────────
  const s3 = prs.addSlide();
  s3.background = { fill: C.white };

  s3.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  s3.addText(`KPIs FINANCEIROS  –  Projeção 5 Anos (${scenLabel})`, {
    x: 0.3, y: 0.05, w: 11.2, h: 0.5,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  s3.addText('Valores Absolutos em milhões de R$', {
    x: 0.3, y: 0.57, w: 8, h: 0.25,
    fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(s3, 11.6, 0.1, 1.55, 0.7);

  // Cálculo dos KPIs (multiplicador = 1 para cenário realista base)
  const dreAllRows: any[] = dreData?.rows ?? [];
  const findDreByName = (n: string) => dreAllRows.find((r: any) => (r?.name ?? '').includes(n)) ?? {};
  const getDreVal = (row: any, yr: number): number => row?.[`ano${yr}`] ?? 0;

  const rLiq   = findDreByName('Receita L\u00edquida');
  const rBrut  = findDreByName('Receita Bruta');
  const lBrut  = findDreByName('Lucro Bruto');
  const ebtd   = findDreByName('EBITIDA');
  const ebtdA  = findDreByName('EBITIDA Ajustado');
  const lLiq   = findDreByName('Lucro (Preju\u00edzo) L\u00edquido');
  const custoRow = findDreByName('Custos dos sprodutos');

  const kpiCalc = YRS.map(yr => {
    const rl  = getDreVal(rLiq,    yr);
    const rb  = getDreVal(rBrut,   yr);
    const lb  = getDreVal(lBrut,   yr);
    const eb  = getDreVal(ebtd,    yr);
    const eba = getDreVal(ebtdA,   yr);
    const ll  = getDreVal(lLiq,    yr);
    const co  = getFC('Caixa Operacional', yr);
    const cl  = getFC('Caixa livre', yr);
    const cp  = getFC('Fluxo de caixa de investimentos', yr);
    const cmv = Math.abs(getDreVal(custoRow, yr));
    const cr  = kpiData?.contasReceber?.[`ano${yr}`] ?? 0;
    const cpay = Math.abs(kpiData?.contasPagar?.[`ano${yr}`] ?? 0);
    const est = kpiData?.estoqueTotal?.[`ano${yr}`] ?? 0;
    const dso = rb  !== 0 ? (cr   / rb)  * 365 : 0;
    const dpo = cmv !== 0 ? (cpay / cmv) * 365 : 0;
    const dio = cmv !== 0 ? (est  / cmv) * 365 : 0;
    return {
      margemBruta:    rl !== 0 ? lb  / rl : 0,
      margemEbitda:   rl !== 0 ? eb  / rl : 0,
      margemEbitdaAj: rl !== 0 ? eba / rl : 0,
      margemLiq:      rl !== 0 ? ll  / rl : 0,
      rl, lb, eba, ll, co, cl, cp, dso, dpo, dio,
      ccc: dso + dio - dpo,
      crescReceita: yr === 1
        ? (rLiq?.vlr25 ? getDreVal(rLiq, 1) / rLiq.vlr25 - 1 : 0)
        : (getDreVal(rLiq, yr) / getDreVal(rLiq, yr - 1) - 1),
    };
  });

  const kSecHdr = (title: string) => [
    { text: title, options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...YRS.map(() => ({ text: '', options: { fill: { color: C.midBlue }, valign: 'middle' } })),
  ];
  const kRow = (label: string, vals: string[], bg: string, colorFn?: (v: string) => string) => [
    { text: label, options: { fontSize: 8, color: C.gray, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
    ...vals.map(v => ({
      text: v,
      options: { align: 'right', fontSize: 8, color: colorFn ? colorFn(v) : C.gray, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' },
    })),
  ];

  const kpiTableRows: any[][] = [
    // cabeçalho da tabela
    [
      { text: 'INDICADOR', options: { bold: true, color: 'BFDBFE', fill: { color: '0F2040' }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
      ...YRS.map((n, i) => ({ text: YR_LABELS[i], options: { bold: true, color: 'BFDBFE', fill: { color: '0F2040' }, align: 'right', fontSize: 9, fontFace: 'Arial', valign: 'middle' } })),
    ],
    // ── Margens
    kSecHdr('Margens'),
    kRow('Margem Bruta',           kpiCalc.map(k => fmtPct(k.margemBruta)),    C.white),
    kRow('Margem EBITDA',          kpiCalc.map(k => fmtPct(k.margemEbitda)),   C.lightGray),
    kRow('Margem EBITDA Ajustada', kpiCalc.map(k => fmtPct(k.margemEbitdaAj)), C.white),
    kRow('Margem L\u00edquida',   kpiCalc.map(k => fmtPct(k.margemLiq)),      C.lightGray),
    // ── Valores Absolutos
    kSecHdr('Valores Absolutos (R$)'),
    kRow('Receita L\u00edquida',  kpiCalc.map(k => fmtM(k.rl)),  C.white),
    kRow('Lucro Bruto',            kpiCalc.map(k => fmtM(k.lb)),  C.lightGray),
    kRow('EBITDA Ajustado',        kpiCalc.map(k => fmtM(k.eba)), C.white),
    kRow('Lucro L\u00edquido',    kpiCalc.map(k => fmtM(k.ll)),  C.lightGray),
    kRow('Caixa Operacional',      kpiCalc.map(k => fmtM(k.co)),  C.white),
    kRow('Caixa Livre',            kpiCalc.map(k => fmtM(k.cl)),  C.lightGray),
    kRow('CAPEX',                  kpiCalc.map(k => fmtM(k.cp)),  C.white),
    // ── Ciclos Financeiros
    kSecHdr('Ciclos Financeiros'),
    kRow('DSO (Prazo M\u00e9dio de Recebimento)', kpiCalc.map(k => `${Math.round(k.dso)} dias`), C.white),
    kRow('DPO (Prazo M\u00e9dio de Pagamento)',   kpiCalc.map(k => `${Math.round(k.dpo)} dias`), C.lightGray),
    kRow('DIO (Prazo M\u00e9dio de Estoque)',     kpiCalc.map(k => `${Math.round(k.dio)} dias`), C.white),
    kRow('Ciclo de Convers\u00e3o de Caixa',      kpiCalc.map(k => `${Math.round(k.ccc)} dias`), C.lightGray),
    // ── Crescimento
    kSecHdr('Crescimento'),
    kRow('Crescimento Receita', kpiCalc.map(k => { const v = k.crescReceita; const s = Math.round(Math.abs(v) * 100) + '%'; return v < 0 ? `(${s})` : s; }), C.white),
  ];

  s3.addTable(kpiTableRows, {
    x: 0.2, y: 1.0, w: 12.9, h: 6.3,
    rowH: 0.30,
    border: { pt: 0.3, color: 'E5E7EB' },
    autoPage: false,
    colW: [4.0, 1.78, 1.78, 1.78, 1.78, 1.78],
  });

  // ── SLIDES GRÁFICOS ───────────────────────────────────────────────────────
  const anoLabels = ['2026', '2027', '2028', '2029', '2030'];

  // Dados DRE — valores já em R$ MM (resumoDRE)
  const cFatBruto  = YRS.map(yr => Math.round(getDRE('faturamentoBruto', yr)));
  const cFatLiq    = YRS.map(yr => Math.round(getDRE('faturamentoLiquido', yr)));
  const cEbtida    = YRS.map(yr => Math.round(getDRE('ebtida', yr)));
  const cLucroLiq  = YRS.map(yr => Math.round(getDRE('lucroLiquido', yr)));

  // Dados FC — raw R$, dividir por 1e6
  const cCaixaOp  = YRS.map(yr => Math.round(getFC('Caixa Operacional', yr) / 1e6));
  const cCaixaLiv = YRS.map(yr => Math.round(getFC('Caixa livre', yr) / 1e6));

  // Margens %
  const cMCPct    = YRS.map(yr => +((getDRE('margemContribuicao', yr) / getDRE('faturamentoLiquido', yr)) * 100).toFixed(1));
  const cEbPct    = YRS.map(yr => +((getDRE('ebtida', yr) / getDRE('faturamentoLiquido', yr)) * 100).toFixed(1));
  const cLucPct   = YRS.map(yr => +((getDRE('lucroLiquido', yr) / getDRE('faturamentoLiquido', yr)) * 100).toFixed(1));

  // ── Opções modernas compartilhadas ──────────────────────────────────────
  // IMPORTANTE: pptxgenjs muta o objeto shadow in-place na conversão para EMU.
  // Usar sempre uma cópia nova por chamada para evitar multiplicação de valores.
  const mkShadow = () => ({ type: 'outer' as const, blur: 8, offset: 3, angle: 45, color: 'AAAAAA', opacity: 0.25 });

  const barOpts = (title: string, colors: string[]) => ({
    barDir: 'col' as const,
    barGrouping: 'clustered' as const,
    barGapWidthPct: 60,
    chartColors: colors,
    plotAreaBkgndColor: 'F8FAFC',
    chartAreaBkgndColor: 'FFFFFF',
    valGridLine: { style: 'solid' as const, color: 'E2E8F0', pt: 0.5 },
    catGridLine: { style: 'none' as const },
    showLegend: true, legendPos: 'b' as const, legendFontSize: 9,
    showValue: true, dataLabelFontSize: 9, dataLabelColor: '1E3A5F',
    valAxisLabelFontSize: 8, catAxisLabelFontSize: 9,
    title, showTitle: true, titleFontSize: 12, titleBold: true, titleColor: C.darkBlue,
  });

  const lineOpts = (title: string, colors: string[]) => ({
    lineDataSymbol: 'circle' as const,
    lineDataSymbolSize: 7,
    lineSmooth: true,
    lineSize: 2.5,
    chartColors: colors,
    plotAreaBkgndColor: 'F8FAFC',
    chartAreaBkgndColor: 'FFFFFF',
    valGridLine: { style: 'solid' as const, color: 'E2E8F0', pt: 0.5 },
    catGridLine: { style: 'none' as const },
    showLegend: true, legendPos: 'b' as const, legendFontSize: 9,
    showValue: false,
    valAxisLabelFontSize: 8, catAxisLabelFontSize: 9,
    title, showTitle: true, titleFontSize: 12, titleBold: true, titleColor: C.darkBlue,
  });

  // ── SLIDE GRÁFICOS – 4 gráficos em 2×2 ──────────────────────────────────
  const sg1 = prs.addSlide();
  sg1.background = { fill: 'F1F5F9' };
  addHdr(sg1, 'GRÁFICOS  –  Resultados Financeiros', 'Gráficos');

  // Layout: 2 colunas × 2 linhas
  const gcw     = 6.35;   // largura do card
  const gx1     = 0.2;    // coluna esquerda
  const gx2     = 6.78;   // coluna direita
  const gy1     = 0.98;   // linha 1 y
  const gy2     = 4.02;   // linha 2 y
  const gth     = 0.32;   // altura do título-card
  const gch     = 2.62;   // altura do gráfico
  const gcardH  = gth + gch;

  // Helper: card-título azul escuro acima de cada gráfico
  const addChartTitle = (sl: any, x: number, y: number, w: number, title: string) => {
    sl.addShape('rect', { x, y, w, h: gth, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
    sl.addText(title, { x: x + 0.1, y, w: w - 0.2, h: gth, fontSize: 10, bold: true, color: C.white, fontFace: 'Arial', align: 'center', valign: 'middle' });
  };

  // White cards com sombra (cobre título + gráfico)
  sg1.addShape('rect', { x: gx1, y: gy1, w: gcw, h: gcardH, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });
  sg1.addShape('rect', { x: gx2, y: gy1, w: gcw, h: gcardH, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });
  sg1.addShape('rect', { x: gx1, y: gy2, w: gcw, h: gcardH, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });
  sg1.addShape('rect', { x: gx2, y: gy2, w: gcw, h: gcardH, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });

  // Títulos como cards (sobre os rects brancos)
  addChartTitle(sg1, gx1, gy1, gcw, 'Receitas (R$ MM)');
  addChartTitle(sg1, gx2, gy1, gcw, 'EBTIDA e Lucro Líquido (R$ MM)');
  addChartTitle(sg1, gx1, gy2, gcw, 'Fluxo de Caixa (R$ MM)');
  addChartTitle(sg1, gx2, gy2, gcw, 'Evolução das Margens (%)');

  // Gráficos sem título interno (showTitle: false sobrescreve o barOpts/lineOpts)
  (sg1 as any).addChart('bar', [
    { name: 'Fat. Bruto',   labels: anoLabels, values: cFatBruto },
    { name: 'Fat. Líquido', labels: anoLabels, values: cFatLiq   },
  ], { x: gx1, y: gy1 + gth, w: gcw, h: gch, ...barOpts('', ['1E3A5F', '38BDF8']), showTitle: false });

  (sg1 as any).addChart('bar', [
    { name: 'EBTIDA',        labels: anoLabels, values: cEbtida   },
    { name: 'Lucro Líquido', labels: anoLabels, values: cLucroLiq },
  ], { x: gx2, y: gy1 + gth, w: gcw, h: gch, ...barOpts('', ['6366F1', '34D399']), showTitle: false });

  (sg1 as any).addChart('line', [
    { name: 'Caixa Operacional', labels: anoLabels, values: cCaixaOp  },
    { name: 'Caixa Livre',       labels: anoLabels, values: cCaixaLiv },
  ], { x: gx1, y: gy2 + gth, w: gcw, h: gch, ...lineOpts('', ['2563EB', '34D399']), showTitle: false });

  (sg1 as any).addChart('line', [
    { name: 'M. Contribuição', labels: anoLabels, values: cMCPct  },
    { name: 'M. EBTIDA',       labels: anoLabels, values: cEbPct  },
    { name: 'M. Líquida',      labels: anoLabels, values: cLucPct },
  ], { x: gx2, y: gy2 + gth, w: gcw, h: gch, ...lineOpts('', ['6366F1', '38BDF8', 'F59E0B']), showTitle: false });

  // ── SLIDE 10 – Fluxo de Caixa ─────────────────────────────────────────────
  const s4 = prs.addSlide();
  s4.background = { fill: C.white };

  s4.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  s4.addText('FLUXO DE CAIXA  –  Projeção 5 Anos', {
    x: 0.3, y: 0.05, w: 11.2, h: 0.5,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  s4.addText('Em milhões de R$', {
    x: 0.3, y: 0.57, w: 6, h: 0.25,
    fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(s4, 11.6, 0.1, 1.55, 0.7);

  // ── Bloco de Info: TAXA e VPL ─────────────────────────────────────────────
  const taxaVal  = getFC('TAXA', 1);
  const vplVal   = getFC('VPL 10 anos', 1);
  const taxaStr  = taxaVal ? `${(taxaVal * 100).toFixed(0)}%` : '–';
  const vplStr   = vplVal  ? fmtM(vplVal) : '–';

  // Box TAXA
  s4.addShape('rect', { x: 0.4, y: 1.0, w: 2.8, h: 0.45, fill: { color: C.lightBlue }, line: { color: 'BFDBFE' } });
  s4.addText('TAXA  ', { x: 0.4, y: 1.0, w: 1.2, h: 0.45, fontSize: 10, bold: true, color: C.darkBlue, align: 'right', valign: 'middle' });
  s4.addText(taxaStr,   { x: 1.6, y: 1.0, w: 1.6, h: 0.45, fontSize: 13, bold: true, color: '000000',  align: 'center', valign: 'middle' });

  // Box VPL 10 anos
  s4.addShape('rect', { x: 3.4, y: 1.0, w: 5.0, h: 0.45, fill: { color: C.lightBlue }, line: { color: 'BFDBFE' } });
  s4.addText('VPL 10 anos  ', { x: 3.4, y: 1.0, w: 2.2, h: 0.45, fontSize: 10, bold: true, color: C.darkBlue, align: 'right', valign: 'middle' });
  s4.addText(vplStr,           { x: 5.6, y: 1.0, w: 2.8, h: 0.45, fontSize: 13, bold: true, color: '000000',  align: 'center', valign: 'middle' });

  // ── Tabela Fluxo de Caixa ─────────────────────────────────────────────────
  type FcRowDef = { label: string; indent?: boolean; bold?: boolean; style?: 'total' | 'highlight' | 'final'; getValue?: (yr: number) => number };
  const fcDef: FcRowDef[] = [
    { label: 'EBITIDA Ajustado' },
    { label: 'NCG',                                 indent: true },
    { label: 'Caixa Operacional',                   bold: true, style: 'total' },
    { label: 'Aquisição de Imobilizado',            indent: true },
    { label: 'Fluxo de caixa de investimentos',     bold: true, style: 'highlight' },
    { label: 'Aquisição de financiamentos',         indent: true },
    { label: 'Amortização principal',               indent: true },
    { label: 'Amortização juros',                   indent: true },
    { label: 'Impostos sobre o lucro',              indent: true },
    { label: 'Fluxo de caixa de financiamento',     bold: true, style: 'highlight' },
    { label: 'Caixa livre',                         bold: true, style: 'final' },
  ];

  const fcBg: Record<string, string> = {
    total: C.lightBlue, highlight: 'E0E7FF', final: C.darkBlue,
  };
  const fcTextColor = (style: string | undefined, v: number) => {
    if (style === 'final') return C.white;
    return '000000';
  };

  const fcHeaderRow = [
    { text: 'Fluxo Financeiro', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9, fontFace: 'Arial', valign: 'middle' } },
    ...['2026','2027','2028','2029','2030'].map(a => ({
      text: a,
      options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right' as const, fontSize: 9, fontFace: 'Arial', valign: 'middle' },
    })),
  ];

  const fcDataRows = fcDef.map((row, i) => {
    const bg = row.style ? fcBg[row.style] : i % 2 === 0 ? C.white : C.lightGray;
    const labelText = row.indent ? `    ${row.label}` : row.label;
    return [
      { text: labelText, options: { bold: !!row.bold, fontSize: !!row.bold ? 9 : 8, color: row.style === 'final' ? C.white : C.gray, fill: { color: bg }, fontFace: 'Arial', valign: 'middle' } },
      ...[1,2,3,4,5].map(yr => {
        const v = row.getValue ? row.getValue(yr) : getFC(row.label, yr);
        return {
          text: v === 0 ? '–' : fmtM(v),
          options: {
            align: 'right' as const, fontSize: !!row.bold ? 9 : 8, bold: true,
            color: fcTextColor(row.style, v),
            fill: { color: bg },
            fontFace: 'Arial',
            valign: 'middle',
          },
        };
      }),
    ];
  });

  s4.addTable([fcHeaderRow, ...fcDataRows], {
    x: 0.4, y: 1.55, w: 12.5, h: 5.3,
    rowH: (5.3 / 12),
    border: { pt: 0.5, color: 'D1D5DB' },
    colW: [3.5, 1.8, 1.8, 1.8, 1.8, 1.8],
  });

  // ── SLIDE 11 – RESUMO DRE – Orçado vs Realizado ─────────────────────────
  const drvData = (financialData as any).dreOrcVsReal ?? {};
  const drvMeses: any[] = drvData.meses ?? [];
  const drvLinhas: any[] = drvData.linhas ?? [];

  const sOrc = prs.addSlide();
  sOrc.background = { fill: C.white };

  // Header
  sOrc.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.88, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sOrc.addText('RESUMO DRE  –  ORÇADO VS REALIZADO  |  Jan–Mar/2026', {
    x: 0.4, y: 0.05, w: 10.5, h: 0.5,
    fontSize: 15, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sOrc.addText('Em milhões de R$', {
    x: 0.4, y: 0.57, w: 6, h: 0.25,
    fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(sOrc, 11.5, 0.07, 1.55, 0.7);

  // Helpers de formatação
  const fmtDrv = (v: number): string => {
    if (v === 0) return '–';
    const abs = Math.abs(v);
    const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return v < 0 ? `(${s})` : s;
  };
  const fmtDrvPct = (v: number): string =>
    (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const fmtDif = (o: number, r: number, isPct: boolean): string => {
    if (o === 0) return '–';
    const dif = (r - o) / Math.abs(o) * 100;
    const abs = Math.abs(dif);
    const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '%';
    return dif < 0 ? `(${s})` : s;
  };
  const difColor = (o: number, r: number, isExpense: boolean): string => {
    const dif = o === 0 ? 0 : (r - o) / Math.abs(o);
    if (dif === 0) return C.gray;
    // Para despesas (negativas): aumento é ruim; para receitas/resultados: aumento é bom
    const isBad = isExpense ? dif > 0 : dif < 0;
    return '000000';
  };

  // Definição de cores por tipo de linha
  const drvBg = (linha: any, i: number): string => {
    if (linha.bold && !linha.pct) return C.lightBlue;
    if (linha.pct) return 'EFF6FF';
    return i % 2 === 0 ? C.white : C.lightGray;
  };

  // Header row 1 — grupos de meses
  const drvHdrOpts = { bold: true, color: C.white, fill: { color: C.darkBlue }, fontFace: 'Arial', fontSize: 9, align: 'center' as const, valign: 'middle' as const, border: { pt: 0.3, color: 'E2E8F0' } };
  const drvHdr1: object[] = [
    { text: 'Descrição', options: { ...drvHdrOpts, align: 'left' as const } },
    ...drvMeses.flatMap((m: any) => [
      { text: m.label, options: { ...drvHdrOpts, colspan: 3 } },
    ]),
  ];
  // Header row 2 — O / R / Dif%
  const drvHdr2: object[] = [
    { text: '', options: { ...drvHdrOpts, fill: { color: '0F2040' } } },
    ...drvMeses.flatMap(() => [
      { text: 'Orçado', options: { ...drvHdrOpts, fill: { color: '0F2040' } } },
      { text: 'Realizado', options: { ...drvHdrOpts, fill: { color: '0F2040' } } },
      { text: 'Dif.%', options: { ...drvHdrOpts, fill: { color: '0F2040' } } },
    ]),
  ];

  // Linhas de dados
  const drvDataRows: object[][] = drvLinhas.map((linha: any, i: number) => {
    const bg = drvBg(linha, i);
    const isExpense = ['despesas','pessoal','outrasDespesas','depreciacao','resultadoFinanceiro','impostos'].includes(linha.key);
    const lblOpts = { bold: linha.bold, fontSize: linha.pct ? 7.5 : (linha.bold ? 9 : 8), color: C.gray, fill: { color: bg }, fontFace: 'Arial', align: 'left' as const, valign: 'middle' as const, italic: linha.pct, border: { pt: 0.3, color: 'E2E8F0' } };
    const valOpts = (bold: boolean) => ({ bold, fontSize: linha.pct ? 7.5 : (linha.bold ? 9 : 8), color: '000000', fill: { color: bg }, fontFace: 'Arial', align: 'right' as const, valign: 'middle' as const, italic: linha.pct, border: { pt: 0.3, color: 'E2E8F0' } });
    const difOpts = (o: number, r: number) => ({ bold: linha.bold, fontSize: linha.pct ? 7.5 : (linha.bold ? 9 : 8), color: '000000', fill: { color: bg }, fontFace: 'Arial', align: 'right' as const, valign: 'middle' as const, border: { pt: 0.3, color: 'E2E8F0' } });

    return [
      { text: linha.pct ? `   ${linha.label}` : linha.label, options: lblOpts },
      ...drvMeses.flatMap((m: any) => {
        const o: number = linha[m.key]?.o ?? 0;
        const r: number = linha[m.key]?.r ?? 0;
        const oFmt = linha.pct ? fmtDrvPct(o) : fmtDrv(o);
        const rFmt = linha.pct ? fmtDrvPct(r) : fmtDrv(r);
        const dFmt = fmtDif(o, r, linha.pct);
        return [
          { text: oFmt, options: valOpts(linha.bold) },
          { text: rFmt, options: valOpts(linha.bold) },
          { text: dFmt, options: difOpts(o, r) },
        ];
      }),
    ];
  });

  // Altura por linha
  const drvRowHNormal = 0.35;
  const drvRowHPct    = 0.27;
  const rowHeights = [0.36, 0.32, ...drvLinhas.map((l: any) => l.pct ? drvRowHPct : drvRowHNormal)];

  sOrc.addTable([drvHdr1, drvHdr2, ...drvDataRows], {
    x: 0.3, y: 0.95, w: 12.73,
    h: rowHeights.reduce((a, b) => a + b, 0),
    colW: [3.7, 1.1, 1.1, 0.81, 1.1, 1.1, 0.81, 1.1, 1.1, 0.81],
    rowH: rowHeights,
    border: { pt: 0.3, color: 'E2E8F0' },
  });

  // ── SLIDE 12 – DFC 1TRI 2026 ─────────────────────────────────────────────
  const dfc1tri = (financialData as any).dfc1tri ?? {};
  const dfcAno: number = dfc1tri.ano ?? 2026;
  const dfcSections: any[] = dfc1tri.sections ?? [];

  const sDfc = prs.addSlide();
  sDfc.background = { fill: C.white };

  sDfc.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.88, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sDfc.addText(`DFC – DEMONSTRAÇÃO DO FLUXO DE CAIXA  |  1º Trimestre ${dfcAno}`, {
    x: 0.4, y: 0.05, w: 10.5, h: 0.5,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sDfc.addText('Em milhões de R$', {
    x: 0.4, y: 0.57, w: 6, h: 0.25,
    fontSize: 9.5, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(sDfc, 11.5, 0.07, 1.55, 0.7);

  const getSecRow = (si: number, lbl: string): number =>
    dfcSections[si]?.rows?.find((r: any) => r.label === lbl)?.valor ?? 0;

  const sec0Show = new Set([
    'Lucro (Prejuízo) do período',
    'Depreciação e amortização',
    'Resultado na venda/baixa de ativo imobilizado',
    'Redução ao valor recuperável do contas a receber',
    'Lucro (Prejuízo) Ajustado',
    'Geração (Consumo) Caixa Operacional',
    'Fluxo de Caixa das Atividades Operacionais',
  ]);
  const sec3Show = new Set([
    'Caixa gerado das atividades operacionais',
    'Caixa no início do período',
    'Caixa no final do período',
  ]);
  const secShortTitle = [
    'ATIVIDADES OPERACIONAIS',
    'INVESTIMENTOS',
    'FINANCIAMENTOS',
    'RESULTADO',
  ];

  const dfcTRows: object[][] = [];
  dfcSections.forEach((sec: any, si: number) => {
    const cfg = dfcSecCfg[si] ?? dfcSecCfg[0];
    const isRes = si === 3;
    dfcTRows.push([
      { text: secShortTitle[si] ?? sec.title, options: { bold: true, fontSize: 9, color: C.white, fill: { color: cfg.hBg }, fontFace: 'Arial', align: 'left', valign: 'middle' } },
      { text: 'Valor',                          options: { bold: true, fontSize: 9, color: C.white, fill: { color: cfg.hBg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
    ]);
    (sec.rows ?? []).forEach((row: any) => {
      const isBold = !!row.bold;
      const val: number = row.valor ?? 0;
      if (si === 0 && !sec0Show.has(row.label)) return;
      if (si === 3 && !sec3Show.has(row.label)) return;
      if ((si === 1 || si === 2) && !isBold && val === 0) return;
      const bg      = isBold ? cfg.boldBg : cfg.rowBg;
      const isWhite = isRes && isBold;
      const tColor  = isWhite ? C.white : C.gray;
      const vColor  = isWhite ? C.white : '000000';
      dfcTRows.push([
        { text: isBold ? row.label : `   ${row.label}`, options: { bold: isBold, fontSize: isBold ? 9 : 8, color: tColor, fill: { color: bg }, fontFace: 'Arial', align: 'left',  valign: 'middle' } },
        { text: fmtDfc(val),                             options: { bold: isBold, fontSize: isBold ? 9 : 8, color: vColor, fill: { color: bg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
      ]);
    });
  });

  sDfc.addTable(dfcTRows, {
    x: 0.3, y: 0.95, w: 5.8, h: dfcTRows.length * dfcRowH,
    colW: dfcColW, rowH: dfcRowH,
    border: { pt: 0.3, color: 'E2E8F0' },
  });

  const dfcChartVals = [
    getSecRow(0, 'Lucro (Prejuízo) Ajustado')                / 1000,
    getSecRow(0, 'Geração (Consumo) Caixa Operacional')      / 1000,
    getSecRow(1, 'Fluxo de Caixa de Investimentos')          / 1000,
    getSecRow(2, 'Fluxo de Caixa de Financiamentos')         / 1000,
    getSecRow(3, 'Caixa gerado das atividades operacionais') / 1000,
  ];
  const dfcChartMin = Math.floor(Math.min(...dfcChartVals) * 1.35 / 5) * 5;
  const dfcChartMax = Math.ceil(Math.max(...dfcChartVals)  * 1.25 / 5) * 5;

  (sDfc as any).addChart('line', [{
    name: 'R$ Milhões',
    labels: ['Lucro\nAjustado', 'Caixa\nCíclico', 'Investimentos', 'Financiamentos', 'Caixa\nGerado'],
    values: dfcChartVals,
  }], {
    x: 6.4, y: 0.95, w: 6.65, h: 3.15,
    showTitle: true,
    title: `Fluxo de Caixa  |  1º TRI ${dfcAno}`,
    titleFontSize: 11, titleBold: true, titleColor: C.darkBlue,
    lineDataSymbol: 'circle', lineDataSymbolSize: 9, lineSize: 2.5,
    chartColors: ['2563EB'],
    showValue: true, dataLabelFontSize: 9, dataLabelFontBold: true, dataLabelColor: C.darkBlue,
    showLegend: false,
    valAxisMinVal: dfcChartMin, valAxisMaxVal: dfcChartMax,
    valGridLine: { style: 'solid', color: 'E5E7EB', size: 0.5 },
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
  });

  const dfcAnaliseX = 6.4;
  const dfcAnaliseY = 4.2;
  const dfcAnaliseW = 6.65;

  sDfc.addShape('rect', { x: dfcAnaliseX, y: dfcAnaliseY, w: dfcAnaliseW, h: 0.3, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sDfc.addText('ANÁLISE', {
    x: dfcAnaliseX + 0.12, y: dfcAnaliseY + 0.02, w: dfcAnaliseW - 0.2, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  sDfc.addShape('rect', { x: dfcAnaliseX, y: dfcAnaliseY + 0.3, w: dfcAnaliseW, h: 2.7, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  sDfc.addText('▸  Lucro ajustado de R$ 23,8M no 1T26, composto por resultado líquido de R$ 18,2M e depreciação de R$ 5,2M. A variação de capital de giro consumiu R$ 8,7M, pressionada por crescimento de contas a receber (R$ 88,6M), parcialmente compensado por fornecedores (+R$ 28,1M) e obrigações salariais (+R$ 29,9M). Fluxo operacional total positivo de R$ 15,1M.', {
    x: dfcAnaliseX + 0.18, y: dfcAnaliseY + 0.36, w: dfcAnaliseW - 0.35, h: 1.2,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });
  sDfc.addText('▸  Investimentos em imobilizado de R$ 14,3M financiados parcialmente por captações líquidas de R$ 17,9M (empréstimos R$ 12,7M + partes relacionadas R$ 5,2M). O caixa encerrou o trimestre em R$ 82,4M, crescimento de +29,4% em relação ao saldo inicial de R$ 63,7M.', {
    x: dfcAnaliseX + 0.18, y: dfcAnaliseY + 1.62, w: dfcAnaliseW - 0.35, h: 1.2,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top', wrap: true, lineSpacingMultiple: 1.2,
  });

  // ── SLIDE 13 – Contexto Macroeconômico ───────────────────────────────────
  const sMacro = prs.addSlide();
  sMacro.background = { fill: C.white };
  addHdr(sMacro, 'CONTEXTO MACROECONÔMICO  –  Leitura Executiva para o Varejo', 'Mai/2026');

  // KPI cards
  const macroKpis = [
    { label: 'IPCA Geral', value: '4,83%', period: 'Acum. 2025', note: '↑ Meta: 3,0% ±1,5pp', accent: 'DC2626', bg: 'FEF2F2' },
    { label: 'IPCA Alimentos', value: '7,1%', period: 'Acum. 2025', note: '↑ Pressão sobre CPV', accent: 'EA580C', bg: 'FFF7ED' },
    { label: 'PIB Brasil', value: '+3,4%', period: '2025 (est.)', note: '↓ Proj. 2026: +2,2%', accent: '059669', bg: 'F0FDF4' },
    { label: 'Desemprego', value: '6,2%', period: 'PNAD T4/2025', note: '↓ Mínima histórica', accent: '0891B2', bg: 'ECFEFF' },
    { label: 'SELIC', value: '14,75%', period: 'Mai/2026', note: '↑ Ciclo de alta ativo', accent: '7C3AED', bg: 'F5F3FF' },
  ];
  const mcW = 2.4; const mcH = 2.3; const mcY = 1.05; const mcGap = 0.16;
  macroKpis.forEach((k, i) => {
    const cx = 0.2 + i * (mcW + mcGap);
    sMacro.addShape('rect', { x: cx, y: mcY, w: mcW, h: mcH, fill: { color: k.bg }, line: { color: 'E5E7EB', pt: 0.5 } });
    sMacro.addShape('rect', { x: cx, y: mcY, w: mcW, h: 0.22, fill: { color: k.accent }, line: { color: k.accent } });
    sMacro.addText(k.label, { x: cx + 0.12, y: mcY + 0.28, w: mcW - 0.24, h: 0.35, fontSize: 9.5, bold: true, color: C.darkBlue, fontFace: 'Arial', valign: 'middle' });
    sMacro.addText(k.value, { x: cx + 0.12, y: mcY + 0.62, w: mcW - 0.24, h: 0.72, fontSize: 26, bold: true, color: k.accent, fontFace: 'Arial', valign: 'middle' });
    sMacro.addText(k.period, { x: cx + 0.12, y: mcY + 1.34, w: mcW - 0.24, h: 0.28, fontSize: 8.5, color: '6B7280', fontFace: 'Arial', valign: 'middle', italic: true });
    sMacro.addText(k.note, { x: cx + 0.12, y: mcY + 1.65, w: mcW - 0.24, h: 0.48, fontSize: 8.5, bold: true, color: k.accent, fontFace: 'Arial', valign: 'middle', wrap: true });
  });

  // Header leitura executiva
  sMacro.addShape('rect', { x: 0.2, y: 3.5, w: 12.9, h: 0.3, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sMacro.addText('O QUE O CENÁRIO MACRO MUDA NA ESTRATÉGIA 2026–2030', {
    x: 0.38, y: 3.52, w: 12.5, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });

  // Painel esquerdo – Pressões e Riscos
  sMacro.addShape('rect', { x: 0.2, y: 3.85, w: 6.25, h: 3.15, fill: { color: 'FFF5F5' }, line: { color: 'FCA5A5', pt: 0.5 } });
  sMacro.addShape('rect', { x: 0.2, y: 3.85, w: 6.25, h: 0.3, fill: { color: 'DC2626' }, line: { color: 'DC2626' } });
  sMacro.addText('⚠   PRESSÕES E RISCOS', {
    x: 0.35, y: 3.87, w: 5.9, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  const macroRiscos = [
    '▸  IPCA Alimentos acima de 7% comprime margem bruta — repricing anual deixa de ser opção e passa a ser imperativo operacional.',
    '▸  SELIC em 14,75% eleva o custo do capital de giro: cada dia extra de estoque especulativo tem preço explícito no resultado.',
    '▸  Desaceleração do PIB para +2,2% em 2026 reduz o "vento de trás" do consumo — crescimento terá de ser conquistado, não herdado.',
  ];
  macroRiscos.forEach((txt, i) => {
    sMacro.addText(txt, {
      x: 0.32, y: 4.24 + i * 0.88, w: 6.0, h: 0.78,
      fontSize: 8.5, color: C.gray, fontFace: 'Arial', wrap: true, valign: 'top', lineSpacingMultiple: 1.25,
    });
  });

  // Painel direito – Resposta Estratégica
  sMacro.addShape('rect', { x: 6.88, y: 3.85, w: 6.25, h: 3.15, fill: { color: 'F0FDF4' }, line: { color: '86EFAC', pt: 0.5 } });
  sMacro.addShape('rect', { x: 6.88, y: 3.85, w: 6.25, h: 0.3, fill: { color: '059669' }, line: { color: '059669' } });
  sMacro.addText('✔   RESPOSTA ESTRATÉGICA', {
    x: 7.03, y: 3.87, w: 5.9, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  const macroEstrat = [
    '▸  Fechar contratos de longo prazo com fornecedores já com reajuste atrelado ao IPCA — garantindo previsibilidade de custos e protegendo a margem bruta mesmo em ciclos de alta da inflação.',
    '▸  Com o desemprego no menor nível histórico e o consumidor aquecido, priorizar o aumento do ticket médio e a venda de produtos de maior valor agregado antes de comprometer capital com abertura de novas unidades.',
    '▸  Automação e tecnologia para ganhar produtividade sem adicionar peso linear de folha e overhead fixo.',
  ];
  macroEstrat.forEach((txt, i) => {
    sMacro.addText(txt, {
      x: 7.0, y: 4.24 + i * 0.88, w: 6.0, h: 0.78,
      fontSize: 8.5, color: C.gray, fontFace: 'Arial', wrap: true, valign: 'top', lineSpacingMultiple: 1.25,
    });
  });

  // Rodapé de fontes
  sMacro.addText('Fontes: IBGE – IPCA, PNAD Contínua, PIB  |  Banco Central do Brasil – SELIC, Relatório Focus  |  Análise Grupo Líder — Mai/2026', {
    x: 0.2, y: 7.2, w: 12.9, h: 0.22,
    fontSize: 7, color: '9CA3AF', fontFace: 'Arial', italic: true, align: 'center',
  });

  // ── SLIDE 12 – Projeções Macro Focus 2026–2030 ────────────────────────────
  const sMacroProj = prs.addSlide();
  sMacroProj.background = { fill: C.white };
  addHdr(sMacroProj, 'PROJEÇÕES MACROECONÔMICAS  –  Relatório Focus / BCB  |  2026–2030', 'Mai/2026');

  // Grupos de indicadores com cores
  type MacroRow = { grupo: string; indicador: string; unidade: string; fonte: string; v26: string; v27: string; v28: string; v29: string; v30: string; dir: 'up'|'down'|'neutral'; cor: string };
  const macroRows: MacroRow[] = [
    // Inflação
    { grupo: 'INFLAÇÃO', indicador: 'IPCA Geral',               unidade: '% a.a.', fonte: 'Focus',       v26: '5,65', v27: '4,33', v28: '3,95', v29: '3,60', v30: '3,50', dir: 'down', cor: 'DC2626' },
    { grupo: 'INFLAÇÃO', indicador: 'IPCA Alimentos',            unidade: '% a.a.', fonte: 'Focus',  v26: '6,80', v27: '5,20', v28: '4,20', v29: '3,80', v30: '3,60', dir: 'down', cor: 'EA580C' },
    // Atividade
    { grupo: 'ATIVIDADE', indicador: 'PIB Real',                 unidade: '% a.a.', fonte: 'Focus',       v26: '2,01', v27: '1,84', v28: '2,00', v29: '2,00', v30: '2,10', dir: 'neutral', cor: '059669' },
    { grupo: 'ATIVIDADE', indicador: 'Consumo das Famílias',     unidade: '% a.a.', fonte: 'Focus',       v26: '3,16', v27: '2,80', v28: '3,00', v29: '3,10', v30: '3,20', dir: 'neutral', cor: '059669' },
    // Emprego
    { grupo: 'EMPREGO',   indicador: 'Desemprego (PNAD)',         unidade: '%',      fonte: 'Focus',       v26: '6,50', v27: '6,80', v28: '7,00', v29: '6,90', v30: '6,80', dir: 'up',   cor: '0891B2' },
    // Juros & Câmbio
    { grupo: 'JUROS',     indicador: 'SELIC (fim de período)',   unidade: '% a.a.', fonte: 'Focus',       v26: '14,75', v27: '12,00', v28: '10,50', v29: '10,00', v30: '9,75', dir: 'down', cor: '7C3AED' },
    { grupo: 'CÂMBIO',    indicador: 'Câmbio R$/US$ (médio)',    unidade: 'R$/US$', fonte: 'Focus',       v26: '5,87', v27: '5,75', v28: '5,69', v29: '5,65', v30: '5,62', dir: 'down', cor: 'B45309' },
  ];

  // Configuração de cores por grupo
  const grupoColors: Record<string, { bg: string; hdr: string }> = {
    'INFLAÇÃO':  { bg: 'FEF2F2', hdr: 'FEE2E2' },
    'ATIVIDADE': { bg: 'F0FDF4', hdr: 'DCFCE7' },
    'EMPREGO':   { bg: 'ECFEFF', hdr: 'CFFAFE' },
    'JUROS':     { bg: 'F5F3FF', hdr: 'EDE9FE' },
    'CÂMBIO':    { bg: 'FFFBEB', hdr: 'FEF3C7' },
  };

  const dirArrow: Record<string, string> = { up: '↑', down: '↓', neutral: '→' };

  // Colw: [Indicador, Unidade, Fonte, 2026, 2027, 2028, 2029, 2030, Tend.]
  const mpColW = [2.9, 1.0, 1.1, 1.05, 1.05, 1.05, 1.05, 1.05, 0.9];

  // Linha de cabeçalho da tabela
  const mpHdr = [
    { text: 'Indicador',    options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9,   color: C.white,  fontFace: 'Arial', valign: 'middle', align: 'left'   } },
    { text: 'Unidade',      options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', valign: 'middle', align: 'center' } },
    { text: 'Fonte',        options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', valign: 'middle', align: 'center' } },
    { text: '2026',         options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9,   color: C.white,  fontFace: 'Arial', valign: 'middle', align: 'center' } },
    { text: '2027',         options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9,   color: C.white,  fontFace: 'Arial', valign: 'middle', align: 'center' } },
    { text: '2028',         options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9,   color: C.white,  fontFace: 'Arial', valign: 'middle', align: 'center' } },
    { text: '2029',         options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9,   color: C.white,  fontFace: 'Arial', valign: 'middle', align: 'center' } },
    { text: '2030',         options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9,   color: C.white,  fontFace: 'Arial', valign: 'middle', align: 'center' } },
    { text: 'Tend.',        options: { fill: { color: C.darkBlue }, bold: true, fontSize: 9, color: 'BFDBFE', fontFace: 'Arial', valign: 'middle', align: 'center' } },
  ];

  let lastGrupo = '';
  const mpDataRows = macroRows.flatMap((r) => {
    const gc = grupoColors[r.grupo] ?? { bg: C.lightGray, hdr: C.lightBlue };
    const rows: any[][] = [];
    // linha separadora de grupo
    if (r.grupo !== lastGrupo) {
      lastGrupo = r.grupo;
      rows.push(mpColW.map((_, ci) => ({
        text: ci === 0 ? r.grupo : '',
        options: { fill: { color: gc.hdr }, bold: true, fontSize: 7.5, color: '374151', fontFace: 'Arial', valign: 'middle', align: 'left' },
      })));
    }
    // linha de dado
    const arrowColor = r.dir === 'down' ? '059669' : r.dir === 'up' ? 'DC2626' : '6B7280';
    rows.push([
      { text: r.indicador, options: { fill: { color: gc.bg }, bold: false, fontSize: 8,   color: C.darkBlue, fontFace: 'Arial', valign: 'middle', align: 'left'   } },
      { text: r.unidade,   options: { fill: { color: gc.bg }, bold: false, fontSize: 8,   color: '6B7280',   fontFace: 'Arial', valign: 'middle', align: 'center', italic: true } },
      { text: r.fonte,     options: { fill: { color: gc.bg }, bold: false, fontSize: 8,   color: '6B7280',   fontFace: 'Arial', valign: 'middle', align: 'center', italic: true } },
      { text: r.v26,       options: { fill: { color: gc.bg }, bold: true,  fontSize: 9,   color: r.cor,      fontFace: 'Arial', valign: 'middle', align: 'center' } },
      { text: r.v27,       options: { fill: { color: gc.bg }, bold: false, fontSize: 8,   color: C.gray,     fontFace: 'Arial', valign: 'middle', align: 'center' } },
      { text: r.v28,       options: { fill: { color: gc.bg }, bold: false, fontSize: 8,   color: C.gray,     fontFace: 'Arial', valign: 'middle', align: 'center' } },
      { text: r.v29,       options: { fill: { color: gc.bg }, bold: false, fontSize: 8,   color: C.gray,     fontFace: 'Arial', valign: 'middle', align: 'center' } },
      { text: r.v30,       options: { fill: { color: gc.bg }, bold: true,  fontSize: 9,   color: C.gray,     fontFace: 'Arial', valign: 'middle', align: 'center' } },
      { text: dirArrow[r.dir], options: { fill: { color: gc.bg }, bold: true, fontSize: 14, color: arrowColor, fontFace: 'Arial', valign: 'middle', align: 'center' } },
    ]);
    return rows;
  });

  const mpRowH = macroRows.flatMap((r, ri) => {
    const isNewGrupo = ri === 0 || macroRows[ri - 1].grupo !== r.grupo;
    return isNewGrupo ? [0.22, 0.5] : [0.5];
  });

  sMacroProj.addTable([mpHdr, ...mpDataRows], {
    x: 0.2, y: 1.05, w: 12.9,
    h: mpRowH.reduce((a, b) => a + b, 0.5),
    colW: mpColW,
    rowH: [0.38, ...mpRowH],
    border: { pt: 0.3, color: 'E2E8F0' },
  });

  // Nota de leitura
  sMacroProj.addShape('rect', { x: 0.2, y: 6.55, w: 12.9, h: 0.72, fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 } });
  sMacroProj.addText(
    '▸  IPCA convergindo à meta somente a partir de 2028 — pressão sobre CPV persiste nos dois primeiros anos do horizonte de projeção.  ' +
    '▸  SELIC em trajetória descendente libera custo financeiro gradualmente — impacto positivo no capital de giro a partir de 2027.  ' +
    '▸  PIB moderado (+2%) reforça necessidade de ganho de market share ativo em vez de depender do crescimento orgânico do mercado.',
    { x: 0.35, y: 6.61, w: 12.55, h: 0.60, fontSize: 8, color: C.gray, fontFace: 'Arial', wrap: true, valign: 'top', lineSpacingMultiple: 1.3 }
  );

  // Rodapé
  sMacroProj.addText('Fontes: Relatório Focus (BCB) – Mediana do mercado  |  Data-base: 09/mai/2026', {
    x: 0.2, y: 7.25, w: 12.9, h: 0.2,
    fontSize: 7, color: '9CA3AF', fontFace: 'Arial', italic: true, align: 'center',
  });

  // ── SLIDE 13 – Auditoria ──────────────────────────────────────────────────
  const sAud = prs.addSlide();
  sAud.background = { fill: C.white };
  addHdr(sAud, 'AUDITORIA  –  Status / Cronograma');

  // Caixa de texto introdutório
  sAud.addShape('rect', { x: 0.3, y: 1.05, w: 12.7, h: 1.5, fill: { color: 'EFF6FF' }, line: { color: '93C5FD', pt: 1 } });
  sAud.addText(
    'Para o exercício de 2026 o Grupo Líder contratou a empresa de auditoria independente RSM, que é uma das maiores redes globais de auditoria, consultoria e assessoria tributária do mundo, com presença em mais de 120 países e cerca de 65 mil profissionais. Reconhecida pela elevada qualidade técnica, governança e padronização internacional, ocupando globalmente o 9º lugar em seu segmento.',
    { x: 0.45, y: 1.1, w: 12.4, h: 1.4, fontSize: 10.5, color: C.gray, fontFace: 'Arial', wrap: true, valign: 'middle' }
  );

  // Quadros dos trimestres
  const triData = [
    {
      label: '1º TRI 2026', date: '07/2026', color: 'D97706', bg: 'FFFBEB', border: 'D97706',
      items: ['Para o 1º TRI de 2026 estão sendo realizadas as seguintes analises:', 'Avaliação de controles interno com base em 31/12/2025', 'Análise das DFs na data-base 31/03/2026'],
    },
    {
      label: '2º TRI 2026', date: '10/2026', color: '2563EB', bg: 'EFF6FF', border: '2563EB',
      items: ['Para o 2º TRI de 2026 estão sendo realizadas as seguintes analises:', 'Análise das DFs na data-base 30/06/2026'],
    },
    {
      label: '3º TRI 2026', date: '12/2026', color: '16A34A', bg: 'F0FDF4', border: '16A34A',
      items: ['Para o 3º TRI de 2026 estão sendo realizadas as seguintes analises:', 'Análise das DFs na data-base 30/09/2026'],
    },
    {
      label: '4º TRI 2026', date: '04/2027', color: '6B7280', bg: 'F9FAFB', border: '9CA3AF',
      items: ['Para o 1º TRI de 2026 estão sendo realizadas as seguintes analises:', 'Avaliação de Laudos (Imob. / Estoq / Atv. Biol.)', 'Análise das DFs na data-base 31/12/2026'],
    },
  ];

  triData.forEach((tri, i) => {
    const x = 0.3 + i * 3.2;
    const w = 3.0;
    sAud.addShape('rect', { x, y: 2.75, w, h: 4.35, fill: { color: tri.bg }, line: { color: tri.border, pt: 1.5 } });
    sAud.addText(tri.label, { x: x + 0.12, y: 2.87, w: w - 0.24, h: 0.35, fontSize: 11, bold: true, color: tri.color, fontFace: 'Arial' });
    sAud.addText(tri.date,  { x: x + 0.12, y: 3.22, w: w - 0.24, h: 0.72, fontSize: 32, bold: true, color: tri.color, fontFace: 'Arial' });
    const bodyText = tri.items.join('\n\n');
    sAud.addText(bodyText,  { x: x + 0.12, y: 4.0,  w: w - 0.24, h: 3.0,  fontSize: 8.5, color: '374151', fontFace: 'Arial', wrap: true, valign: 'top' });
  });

  // ── SLIDE 14 – Encerramento ────────────────────────────────────────────────
  const s5 = prs.addSlide();
  s5.background = { fill: C.darkBlue };

  s5.addShape('rect', { x: 0, y: 3.2, w: 13.33, h: 0.06, fill: { color: C.midBlue }, line: { color: C.midBlue } });

  s5.addText('Obrigado', {
    x: 0.6, y: 1.5, w: 12, h: 1.5,
    fontSize: 52, bold: true, color: C.white, fontFace: 'Arial',
  });
  s5.addText('Grupo Líder  |  Projeções Financeiras 2026–2030', {
    x: 0.6, y: 3.6, w: 10, h: 0.6,
    fontSize: 16, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });

  // ── Salvar ────────────────────────────────────────────────────────────────
  await prs.writeFile({ fileName: 'Projecoes_Financeiras_GrupoLider.pptx' });
}

// ── Botão de exportação ──────────────────────────────────────────────────────
export default function ExportPPTButton({ scenario = 'realista' }: { scenario?: 'realista' | 'otimista' | 'pessimista' }) {
  const handleExport = async () => {
    try {
      await generatePPT(scenario);
    } catch (err) {
      console.error('Erro ao gerar PPT:', err);
      alert('Ocorreu um erro ao gerar o arquivo PowerPoint.');
    }
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-700 hover:bg-blue-600 text-white transition-colors shadow"
      title="Exportar apresentação em PowerPoint"
    >
      <Presentation className="w-4 h-4" />
      Exportar PPT
    </button>
  );
}
