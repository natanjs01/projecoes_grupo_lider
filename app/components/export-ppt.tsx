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
export async function generatePPT(): Promise<void> {
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
  const fcRows: any[] = fc?.rows ?? [];
  const getFC = (label: string, yr: number) =>
    fcRows.find((r: any) => r.label === label)?.[`ano${yr}`] ?? 0;
  const getDRE = (key: string, yr: number) => {
    const map: Record<string, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };
    const anoKey = ['2026O', '2027P', '2028P', '2029P', '2030P'][map[yr]];
    return rows.find((r: any) => r.key === key)?.values?.[anoKey] ?? 0;
  };

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
  s1.addText('Cenário Realista  |  Em milhões de R$', {
    x: 0.6, y: 6.1, w: 10, h: 0.5,
    fontSize: 13, color: C.white, fontFace: 'Arial', italic: true,
  });
  addLogo(s1, 10.3, 6.05, 2.8, 1.25);

  // ── Premissas: dados base ─────────────────────────────────────────────────
  const { premissas } = financialData as any;
  const scenRates = premissas?.scenarioRates ?? {};
  const premSecs: any[] = premissas?.sections ?? [];
  // helper: cabeçalho padrão de slide
  const addHdr = (sl: PptxSlide, t: string, badge?: string) => {
    sl.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
    sl.addText(t, { x: 0.3, y: 0.05, w: 9.2, h: 0.8, fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle' });
    if (badge) sl.addText(badge, { x: 9.5, y: 0.2, w: 2.0, h: 0.5, fontSize: 9.5, color: 'BFDBFE', align: 'right', valign: 'middle', fontFace: 'Arial', italic: true });
    addLogo(sl, 11.6, 0.1, 1.55, 0.7);
  };

  // ── SLIDE 2 – Balanço Patrimonial ─────────────────────────────────────────
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
        { text: row.label || '', options: { bold: true, color: 'BFDBFE', fill: { color: C.darkBlue }, fontSize: 8.5 } },
        { text: '', options: { fill: { color: C.darkBlue } } },
        { text: '', options: { fill: { color: C.darkBlue } } },
        { text: '', options: { fill: { color: C.darkBlue } } },
      ];
      if (row.total) return [
        { text: row.label, options: { bold: true, color: C.darkBlue, fill: { color: C.lightBlue }, fontSize: 8.5 } },
        { text: fmtBpV(row.valor),    options: { bold: true, align: 'right', fontSize: 8.5, color: '000000',  fill: { color: C.lightBlue } } },
        { text: fmtBpV(row.anterior), options: { bold: true, align: 'right', fontSize: 8.5, color: C.gray,    fill: { color: C.lightBlue } } },
        { text: fmtBpP(row.pct),      options: { bold: true, align: 'right', fontSize: 8.5, color: '000000', fill: { color: C.lightBlue } } },
      ];
      const bg = i % 2 === 0 ? C.white : C.lightGray;
      return [
        { text: row.label, options: { fontSize: 8, color: C.gray, fill: { color: bg } } },
        { text: fmtBpV(row.valor),    options: { bold: true, align: 'right', fontSize: 8, color: '000000', fill: { color: bg } } },
        { text: fmtBpV(row.anterior), options: { align: 'right', fontSize: 8, color: '9CA3AF', fill: { color: bg } } },
        { text: fmtBpP(row.pct),      options: { bold: true, align: 'right', fontSize: 8, color: '000000', fill: { color: bg } } },
      ];
    });

  const bpColHdr = (title: string) => [
    { text: title, options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9 } },
    { text: '2025 (R$Mi)', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9 } },
    { text: '2024 (R$Mi)', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9 } },
    { text: 'Var%', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9 } },
  ];

  const bpAtivoRows = buildBpSide(bpAtivo);
  const bpPassivoRows = buildBpSide(bpPassivo);
  const bpBlankRow = () => [
    { text: '', options: { fill: { color: C.white } } },
    { text: '', options: { fill: { color: C.white } } },
    { text: '', options: { fill: { color: C.white } } },
    { text: '', options: { fill: { color: C.white } } },
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

  // ── SLIDE 3 – Premissas: Taxas e Cenários ─────────────────────────────────
  const sp1 = prs.addSlide();
  sp1.background = { fill: C.white };
  addHdr(sp1, 'PREMISSAS  –  Taxas de Crescimento e Cenários', 'Premissas 1/5');

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
    sp1.addShape('rect', { x, y: 1.05, w: 4.1, h: 2.5, fill: { color: sc.bg }, line: { color: sc.color, pt: 2 } });
    sp1.addText(sc.name.toUpperCase(), { x: x + 0.18, y: 1.15, w: 3.7, h: 0.42, fontSize: 12, bold: true, color: sc.color, fontFace: 'Arial' });
    sp1.addText(fmtPct(sc.rate) + ' a.a.', { x: x + 0.18, y: 1.57, w: 3.7, h: 0.72, fontSize: 30, bold: true, color: sc.color, fontFace: 'Arial' });
    sp1.addText(sc.desc, { x: x + 0.18, y: 2.35, w: 3.7, h: 1.0, fontSize: 9, color: '4B5563', fontFace: 'Arial', wrap: true });
  });

  const impHdr = [
    { text: 'Cenário', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 10 } },
    ...YRS.map(n => ({ text: `Ano ${n}`, options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'center', fontSize: 10 } })),
    { text: 'Acumulado 5 anos', options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'center', fontSize: 10 } },
  ];
  const impRows = scens.map((sc, i) => {
    const bg = i % 2 === 0 ? C.white : C.lightGray;
    return [
      { text: sc.name, options: { bold: true, fontSize: 10, color: sc.color, fill: { color: bg } } },
      ...YRS.map(yr => ({ text: fmtPct(Math.pow(1 + sc.rate, yr) - 1), options: { align: 'center', fontSize: 10, color: sc.color, fill: { color: bg } } })),
      { text: fmtPct(Math.pow(1 + sc.rate, 5) - 1), options: { align: 'center', fontSize: 10, bold: true, color: sc.color, fill: { color: bg } } },
    ];
  });
  sp1.addTable([impHdr, ...impRows], {
    x: 0.3, y: 3.75, w: 12.7, h: 1.9,
    rowH: 0.38, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [2.2, 1.7, 1.7, 1.7, 1.7, 1.7, 2.2],
  });
  sp1.addText('Crescimento acumulado em relação a 2025 (Realizado). Aplicado sobre faturamento bruto e demais linhas de resultado.', {
    x: 0.3, y: 6.75, w: 12.7, h: 0.4, fontSize: 8, color: '9CA3AF', italic: true, fontFace: 'Arial',
  });

  // ── SLIDE 4 – Projeção de Estoques ────────────────────────────────────────
  const sp2 = prs.addSlide();
  sp2.background = { fill: C.white };
  addHdr(sp2, 'PREMISSAS  –  Projeção de Estoques', 'Premissas 2/5');

  const estoqSec: any[] = premSecs.find((s: any) => s.title === 'Projeção estoques')?.rows ?? [];
  const estoqHdr = [
    { text: 'Componente', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9.5 } },
    ...YRS.map(n => ({ text: `Ano ${n}`, options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 9.5 } })),
  ];
  const estoqTRows: any[] = [];
  ['A', 'B', 'C', 'D'].forEach((t, ti) => {
    const b = ti * 6;
    const bgH = ti % 2 === 0 ? 'D1E9FF' : C.lightBlue;
    const bgR = ti % 2 === 0 ? C.white : C.lightGray;
    const get = (off: number, yr: number): number => estoqSec[b + off]?.[`ano${yr}`] ?? 0;
    estoqTRows.push([
      { text: `Tipo ${t}  –  Saldo Inicial`, options: { bold: true, fontSize: 9, color: C.darkBlue, fill: { color: bgH } } },
      ...YRS.map(yr => ({ text: fmtBig(get(0, yr)), options: { align: 'right', fontSize: 9, bold: true, color: '000000', fill: { color: bgH } } })),
    ]);
    estoqTRows.push([
      { text: '   Compras', options: { bold: false, fontSize: 8.5, color: C.gray, fill: { color: bgR } } },
      ...YRS.map(yr => ({ text: fmtBig(get(1, yr)), options: { align: 'right', fontSize: 8.5, color: C.gray, fill: { color: bgR } } })),
    ]);
    estoqTRows.push([
      { text: '   Baixa CMV', options: { bold: false, fontSize: 8.5, color: C.gray, fill: { color: bgR } } },
      ...YRS.map(yr => ({ text: fmtBig(get(2, yr)), options: { align: 'right', fontSize: 8.5, bold: true, color: '000000', fill: { color: bgR } } })),
    ]);
    estoqTRows.push([
      { text: `Tipo ${t}  –  Saldo Final`, options: { bold: true, fontSize: 9, color: C.darkBlue, fill: { color: bgH } } },
      ...YRS.map(yr => ({ text: fmtBig(get(5, yr)), options: { align: 'right', fontSize: 9, bold: true, color: '000000', fill: { color: bgH } } })),
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
      { text: 'Compra', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 8.5, align: 'center' } },
      { text: 'Ano', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 8.5, align: 'center', underline: true } },
    ],
    [
      { text: fmtOrc(compras2026), options: { bold: true, align: 'center', fontSize: 9, color: '000000', fill: { color: C.white } } },
      { text: '2026', options: { align: 'center', fontSize: 9, color: C.gray, fill: { color: C.white } } },
    ],
    [
      { text: fmtOrc(compras2025), options: { align: 'center', fontSize: 9, color: C.gray, fill: { color: C.lightGray } } },
      { text: '2025', options: { align: 'center', fontSize: 9, color: C.gray, fill: { color: C.lightGray } } },
    ],
    [
      { text: varStr, options: { bold: true, align: 'center', fontSize: 9, color: '000000', fill: { color: C.white } } },
      { text: '', options: { fill: { color: C.white } } },
    ],
  ], {
    x: 10.1, y: 5.87, w: 3.05,
    rowH: 0.32,
    border: { pt: 0.5, color: 'D1D5DB' },
    colW: [1.9, 1.15],
  });

  sp2.addShape('rect', { x: 0.3, y: 5.6, w: 9.0, h: 0.04, fill: { color: 'E5E7EB' }, line: { color: 'E5E7EB' } });
  sp2.addText('Análise das Premissas de Estoque', {
    x: 0.3, y: 5.7, w: 9.0, h: 0.35, fontSize: 11, bold: true, color: C.darkBlue, fontFace: 'Arial',
  });
  sp2.addText(
    'Premissa adotada para o orçamento do estoque foi de manutenção de giro em 45 dias para todas as categorias, ' +
    'usamos o CMV projetado do mês anterior e multiplicamos por 1,3 no mês seguinte.\n\n' +
    'As premissas de estoque para a projeção dos demais exercícios é uma variável e está baseada na taxa de crescimento ' +
    'da receita que possui 03 cenários (Otimista; Realista; Pessimista).',
    {
      x: 0.3, y: 6.1, w: 9.0, h: 1.25,
      fontSize: 10, color: C.gray, fontFace: 'Arial', wrap: true,
    }
  );

  // ── SLIDE 5 – Projeção de Imobilizado ─────────────────────────────────────
  const sp3 = prs.addSlide();
  sp3.background = { fill: C.white };
  addHdr(sp3, 'PREMISSAS  –  Projeção de Imobilizado', 'Premissas 3/5');

  const imoSec: any[] = premSecs.find((s: any) => s.title === 'Projeção Imobilizado')?.rows ?? [];
  const getImo = (label: string, yr: number): number => imoSec.find((r: any) => r.label === label)?.[`ano${yr}`] ?? 0;

  const imoHdr2 = [
    { text: 'Imobilizado', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 11 } },
    ...YRS.map(n => ({ text: `Ano ${n}`, options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 11 } })),
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
      { text: r.label, options: { bold: r.bold, fontSize: 10, color: r.bold ? C.darkBlue : C.gray, fill: { color: bg } } },
      ...r.vals.map((v: number) => ({ text: fmtBig(v), options: { align: 'right', fontSize: 10, bold: true, color: '000000', fill: { color: bg } } })),
    ];
  });
  sp3.addTable([imoHdr2, ...imoTRows], {
    x: 0.4, y: 1.05, w: 12.5, h: 3.0,
    rowH: 0.5, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [3.5, 1.8, 1.8, 1.8, 1.8, 1.8],
  });

  sp3.addShape('rect', { x: 0.4, y: 4.15, w: 12.5, h: 0.04, fill: { color: 'E5E7EB' }, line: { color: 'E5E7EB' } });
  sp3.addText('Análise', { x: 0.4, y: 4.3, w: 4.0, h: 0.38, fontSize: 12, bold: true, color: C.darkBlue, fontFace: 'Arial' });
  const custoAcum = YRS.reduce((a, yr) => a + getImo('Adições -Custos (1 lj 50MM + dep.)', yr), 0);
  const depAcum   = YRS.reduce((a, yr) => a + Math.abs(getImo('Adições -Depreciação', yr)), 0);
  const imoInit   = getImo('Imobilizado líquido - Saldo inicial', 1);
  const imoFinal  = imoSaldoFinal(5);
  sp3.addText(
    `O plano prevê investimentos totais de aproximadamente ${fmtBig(custoAcum)} em 5 anos, incluindo a abertura de nova unidade (~R$ 50MM). ` +
    `A depreciação acumulada no período é de ${fmtBig(depAcum)}. ` +
    `O imobilizado líquido evolui de ${fmtBig(imoInit)} (Ano 1) para ${fmtBig(imoFinal)} (Ano 5), ` +
    `refletindo os novos ativos já deduzidos da depreciação acumulada.`,
    { x: 0.4, y: 4.72, w: 12.5, h: 1.8, fontSize: 10.5, color: C.gray, fontFace: 'Arial', wrap: true }
  );

  // ── SLIDE 6 – Projeção de Empréstimos ─────────────────────────────────────
  const sp4 = prs.addSlide();
  sp4.background = { fill: C.white };
  addHdr(sp4, 'PREMISSAS  –  Projeção de Empréstimos', 'Premissas 4/5');

  const empSec: any[] = premSecs.find((s: any) => s.title === 'Projeção Empréstimos')?.rows ?? [];
  const getEmp = (label: string, yr: number): number => empSec.find((r: any) => r.label === label)?.[`ano${yr}`] ?? 0;

  const empHdr2 = [
    { text: 'Empréstimos', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 10 } },
    ...YRS.map(n => ({ text: `Ano ${n}`, options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 10 } })),
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
      { text: r.label, options: { bold: r.bold, fontSize: 9.5, color: r.bold ? C.darkBlue : C.gray, fill: { color: bg } } },
      ...YRS.map(yr => { const v = getEmp(r.key, yr); return { text: fmtBig(v), options: { align: 'right', fontSize: 9.5, bold: true, color: '000000', fill: { color: bg } } }; }),
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
  addHdr(sp5, 'PREMISSAS  –  Fluxo Financeiro e Capital de Giro', 'Premissas 5/5');

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
    { text: 'Variação Capital de Giro (R$)', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 11 } },
    ...YRS.map(n => ({ text: `Ano ${n}`, options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right', fontSize: 11 } })),
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
      { text: r.label, options: { bold: r.bold, fontSize: 10.5, color: r.bold ? C.darkBlue : C.gray, fill: { color: bg } } },
      ...r.vals.map((v: number) => ({
        text: v === 0 ? '–' : fmtBig(v),
        options: { align: 'right', fontSize: 10.5, bold: true, color: '000000', fill: { color: bg } },
      })),
    ];
  });
  sp5.addTable([wrkHdr, ...wrkTRows], {
    x: 0.4, y: 1.1, w: 12.5, h: 3.0,
    rowH: 0.52, border: { pt: 0.5, color: 'D1D5DB' },
    colW: [4.0, 1.7, 1.7, 1.7, 1.7, 1.7],
  });

  sp5.addShape('rect', { x: 0.4, y: 4.2, w: 12.5, h: 0.04, fill: { color: 'E5E7EB' }, line: { color: 'E5E7EB' } });
  sp5.addText('Análise do Ciclo de Capital de Giro', {
    x: 0.4, y: 4.35, w: 12.5, h: 0.38, fontSize: 12, bold: true, color: C.darkBlue, fontFace: 'Arial',
  });
  const varNcgTotal = YRS.reduce((acc, yr) => acc + getFC('NCG', yr), 0);
  const ncgAno1 = getFC('NCG', 1);
  const ncgLiberado = YRS.filter(yr => yr > 1).reduce((s, yr) => s + getFC('NCG', yr), 0);
  sp5.addText(
    `A tabela apresenta a variação anual da NCG (Necessidade de Capital de Giro) de cada ano em relação ao exercício anterior (base: VLR 2025). ` +
    `Valores positivos indicam consumo de caixa (pressão sobre o fluxo); valores negativos indicam liberação de caixa (folga operacional). `,
    { x: 0.4, y: 4.78, w: 12.5, h: 2.1, fontSize: 10.5, color: C.gray, fontFace: 'Arial', wrap: true }
  );

  // ── SLIDE 8 – Resumo DRE ───────────────────────────────────────────────────
  const s2 = prs.addSlide();
  s2.background = { fill: C.white };

  s2.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  s2.addText('RESUMO DRE  –  Em milhões de R$', {
    x: 0.3, y: 0.05, w: 11.2, h: 0.8,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  addLogo(s2, 11.6, 0.1, 1.55, 0.7);

  const headerRow = [
    { text: 'Descrição', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 10 } },
    ...anos.map((a: string) => ({
      text: a,
      options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'center', fontSize: 10 },
    })),
  ];

  const dataRows = rows.map((row: any, i: number) => {
    const isEven = i % 2 === 0;
    const bg = row.bold ? C.lightBlue : isEven ? C.white : C.lightGray;
    return [
      {
        text: row.label,
        options: { bold: row.bold, fontSize: 9, color: C.gray, fill: { color: bg }, indent: row.bold ? 0 : 8 },
      },
      ...anos.map((a: string) => {
        const v = row.values?.[a] ?? 0;
        const display = row.pct ? fmtPct(v) : fmtMi(v);
        return {
          text: display,
          options: {
            align: 'right', fontSize: 9, bold: true,
            color: '000000',
            fill: { color: bg },
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

  s2.addShape('rect', { x: 0.4, y: 5.72, w: 12.5, h: 0.04, fill: { color: 'E5E7EB' }, line: { color: 'E5E7EB' } });
  s2.addText('Análise', { x: 0.4, y: 5.87, w: 4.0, h: 0.38, fontSize: 12, bold: true, color: C.darkBlue, fontFace: 'Arial' });
  s2.addText(
    'O Resumo DRE, Orçado para o Exercício de 2026, é a projeção do resultado a partir das premissas alinhadas com a ' +
    'Administração do Grupo Líder, somado às projeções de redução de despesas elaboradas pela empresa TMSI, que estima uma ' +
    'redução de 73MM na folha, 53MM em materiais de uso e consumo, 72MM em contas de consumo (água, luz e telefone) e 6MM ' +
    'em despesas diversas; para os demais exercícios as projeções são variáveis que leva em consideração o percentual de ' +
    'cada despesa sobre a receita líquida de 2026, replicando esse percentual sobre as receitas líquidas projetadas.',
    { x: 0.4, y: 6.28, w: 12.5, h: 1.1, fontSize: 10.5, color: C.gray, fontFace: 'Arial', wrap: true }
  );

  // ── SLIDE 9 – KPIs (completo) ─────────────────────────────────────────────
  const s3 = prs.addSlide();
  s3.background = { fill: C.white };

  s3.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  s3.addText('KPIs FINANCEIROS  –  Projeção 5 Anos (Cenário Realista)', {
    x: 0.3, y: 0.05, w: 11.2, h: 0.8,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
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
    { text: title, options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 9.5 } },
    ...YRS.map(() => ({ text: '', options: { fill: { color: C.midBlue } } })),
  ];
  const kRow = (label: string, vals: string[], bg: string, colorFn?: (v: string) => string) => [
    { text: label, options: { fontSize: 8.5, color: C.gray, fill: { color: bg } } },
    ...vals.map(v => ({
      text: v,
      options: { align: 'right', fontSize: 8.5, color: colorFn ? colorFn(v) : C.gray, fill: { color: bg } },
    })),
  ];

  const kpiTableRows: any[][] = [
    // cabeçalho da tabela
    [
      { text: 'INDICADOR', options: { bold: true, color: 'BFDBFE', fill: { color: '0F2040' }, fontSize: 9 } },
      ...YRS.map(n => ({ text: `ANO ${n}`, options: { bold: true, color: 'BFDBFE', fill: { color: '0F2040' }, align: 'right', fontSize: 9 } })),
    ],
    // ── Margens
    kSecHdr('Margens'),
    kRow('Margem Bruta',           kpiCalc.map(k => fmtPct(k.margemBruta)),    C.white),
    kRow('Margem EBITDA',          kpiCalc.map(k => fmtPct(k.margemEbitda)),   C.lightGray),
    kRow('Margem EBITDA Ajustada', kpiCalc.map(k => fmtPct(k.margemEbitdaAj)), C.white),
    kRow('Margem L\u00edquida',   kpiCalc.map(k => fmtPct(k.margemLiq)),      C.lightGray),
    // ── Valores Absolutos
    kSecHdr('Valores Absolutos (R$)'),
    kRow('Receita L\u00edquida',  kpiCalc.map(k => fmtBig(k.rl)),  C.white),
    kRow('Lucro Bruto',            kpiCalc.map(k => fmtBig(k.lb)),  C.lightGray),
    kRow('EBITDA Ajustado',        kpiCalc.map(k => fmtBig(k.eba)), C.white),
    kRow('Lucro L\u00edquido',    kpiCalc.map(k => fmtBig(k.ll)),  C.lightGray),
    kRow('Caixa Operacional',      kpiCalc.map(k => fmtBig(k.co)),  C.white),
    kRow('Caixa Livre',            kpiCalc.map(k => fmtBig(k.cl)),  C.lightGray),
    kRow('CAPEX',                  kpiCalc.map(k => fmtBig(k.cp)),  C.white,
      v => v.startsWith('(') ? C.negative : C.gray),
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
  const anoLabels = ['Ano 1', 'Ano 2', 'Ano 3', 'Ano 4', 'Ano 5'];

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

  // ── SLIDE Gráficos 1/2 ───────────────────────────────────────────────────
  const sg1 = prs.addSlide();
  sg1.background = { fill: 'F1F5F9' };
  addHdr(sg1, 'GRÁFICOS  –  Resultado Financeiro', 'Gráficos 1/2');

  // Cards de fundo para cada gráfico
  sg1.addShape('rect', { x: 0.25, y: 1.0, w: 6.15, h: 6.35, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });
  sg1.addShape('rect', { x: 6.93, y: 1.0, w: 6.15, h: 6.35, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });

  (sg1 as any).addChart('bar', [
    { name: 'Fat. Bruto',   labels: anoLabels, values: cFatBruto },
    { name: 'Fat. Líquido', labels: anoLabels, values: cFatLiq   },
  ], { x: 0.3, y: 1.05, w: 6.1, h: 6.2, ...barOpts('Receitas (R$ MM)', ['1E3A5F', '38BDF8']) });

  (sg1 as any).addChart('bar', [
    { name: 'EBTIDA',        labels: anoLabels, values: cEbtida   },
    { name: 'Lucro Líquido', labels: anoLabels, values: cLucroLiq },
  ], { x: 6.93, y: 1.05, w: 6.1, h: 6.2, ...barOpts('EBTIDA e Lucro Líquido (R$ MM)', ['6366F1', '34D399']) });

  // ── SLIDE Gráficos 2/2 ───────────────────────────────────────────────────
  const sg2 = prs.addSlide();
  sg2.background = { fill: 'F1F5F9' };
  addHdr(sg2, 'GRÁFICOS  –  Caixa e Margens', 'Gráficos 2/2');

  sg2.addShape('rect', { x: 0.25, y: 1.0, w: 6.15, h: 6.35, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });
  sg2.addShape('rect', { x: 6.93, y: 1.0, w: 6.15, h: 6.35, fill: { color: C.white }, line: { color: 'E2E8F0', pt: 1 }, shadow: mkShadow() });

  (sg2 as any).addChart('line', [
    { name: 'Caixa Operacional', labels: anoLabels, values: cCaixaOp  },
    { name: 'Caixa Livre',       labels: anoLabels, values: cCaixaLiv },
  ], { x: 0.3, y: 1.05, w: 6.1, h: 6.2, ...lineOpts('Fluxo de Caixa (R$ MM)', ['2563EB', '34D399']) });

  (sg2 as any).addChart('line', [
    { name: 'M. Contribuição', labels: anoLabels, values: cMCPct  },
    { name: 'M. EBTIDA',       labels: anoLabels, values: cEbPct  },
    { name: 'M. Líquida',      labels: anoLabels, values: cLucPct },
  ], { x: 6.93, y: 1.05, w: 6.1, h: 6.2, ...lineOpts('Evolução das Margens (%)', ['6366F1', '38BDF8', 'F59E0B']) });

  // ── SLIDE 10 – Fluxo de Caixa ─────────────────────────────────────────────
  const s4 = prs.addSlide();
  s4.background = { fill: C.white };

  s4.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.9, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  s4.addText('FLUXO DE CAIXA  –  Projeção 5 Anos', {
    x: 0.3, y: 0.05, w: 11.2, h: 0.8,
    fontSize: 16, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });
  addLogo(s4, 11.6, 0.1, 1.55, 0.7);

  // ── Bloco de Info: TAXA e VPL ─────────────────────────────────────────────
  const taxaVal  = getFC('TAXA', 1);
  const vplVal   = getFC('VPL 10 anos', 1);
  const taxaStr  = taxaVal ? `${(taxaVal * 100).toFixed(0)}%` : '–';
  const vplStr   = vplVal  ? fmtBig(vplVal) : '–';

  // Box TAXA
  s4.addShape('rect', { x: 0.4, y: 1.0, w: 2.8, h: 0.45, fill: { color: C.lightBlue }, line: { color: 'BFDBFE' } });
  s4.addText('TAXA  ', { x: 0.4, y: 1.0, w: 1.2, h: 0.45, fontSize: 10, bold: true, color: C.darkBlue, align: 'right', valign: 'middle' });
  s4.addText(taxaStr,   { x: 1.6, y: 1.0, w: 1.6, h: 0.45, fontSize: 13, bold: true, color: C.midBlue,  align: 'center', valign: 'middle' });

  // Box VPL 10 anos
  s4.addShape('rect', { x: 3.4, y: 1.0, w: 5.0, h: 0.45, fill: { color: C.lightBlue }, line: { color: 'BFDBFE' } });
  s4.addText('VPL 10 anos  ', { x: 3.4, y: 1.0, w: 2.2, h: 0.45, fontSize: 10, bold: true, color: C.darkBlue, align: 'right', valign: 'middle' });
  s4.addText(vplStr,           { x: 5.6, y: 1.0, w: 2.8, h: 0.45, fontSize: 13, bold: true, color: C.midBlue,  align: 'center', valign: 'middle' });

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
    { text: 'Fluxo Financeiro', options: { bold: true, color: C.white, fill: { color: C.midBlue }, fontSize: 11 } },
    ...['Ano 1','Ano 2','Ano 3','Ano 4','Ano 5'].map(a => ({
      text: a,
      options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: 'right' as const, fontSize: 11 },
    })),
  ];

  const fcDataRows = fcDef.map((row, i) => {
    const bg = row.style ? fcBg[row.style] : i % 2 === 0 ? C.white : C.lightGray;
    const labelText = row.indent ? `    ${row.label}` : row.label;
    return [
      { text: labelText, options: { bold: !!row.bold, fontSize: 10, color: row.style === 'final' ? C.white : C.gray, fill: { color: bg } } },
      ...[1,2,3,4,5].map(yr => {
        const v = row.getValue ? row.getValue(yr) : getFC(row.label, yr);
        return {
          text: v === 0 ? '–' : fmtBig(v),
          options: {
            align: 'right' as const, fontSize: 10, bold: true,
            color: fcTextColor(row.style, v),
            fill: { color: bg },
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

  // ── SLIDE 11 – DFC 1TRI 2026 ─────────────────────────────────────────────
  const dfc1tri = (financialData as any).dfc1tri ?? {};
  const dfcAno: number = dfc1tri.ano ?? 2026;
  const dfcSections: any[] = dfc1tri.sections ?? [];

  const sDfc = prs.addSlide();
  sDfc.background = { fill: C.white };

  // Header
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

  // Helpers
  const fmtDfc = (v: number): string => {
    if (v === 0) return '–';
    const abs = Math.abs(v) / 1000;
    const s = abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `(${s})` : s;
  };
  const getSecRow = (si: number, lbl: string): number =>
    dfcSections[si]?.rows?.find((r: any) => r.label === lbl)?.valor ?? 0;

  // ── Tabela filtrada (lado esquerdo) ───────────────────────────────────────
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
  const dfcSecCfg = [
    { hBg: '1E3A5F', boldBg: 'BFDBFE', rowBg: 'EFF6FF' },
    { hBg: '1E4976', boldBg: 'BAE6FD', rowBg: 'F0F9FF' },
    { hBg: '1E5C8A', boldBg: 'A5F3FC', rowBg: 'F0FDFF' },
    { hBg: '155E75', boldBg: '1E3A5F', rowBg: 'ECFEFF' },
  ];

  const dfcTRows: object[][] = [];
  dfcSections.forEach((sec: any, si: number) => {
    const cfg = dfcSecCfg[si] ?? dfcSecCfg[0];
    const isRes = si === 3;
    dfcTRows.push([
      { text: secShortTitle[si] ?? sec.title, options: { bold: true, fontSize: 8, color: C.white, fill: { color: cfg.hBg }, fontFace: 'Arial', align: 'left', valign: 'middle' } },
      { text: '',                              options: { fill: { color: cfg.hBg } } },
    ]);
    (sec.rows ?? []).forEach((row: any) => {
      const isBold = !!row.bold;
      const val: number = row.valor ?? 0;
      if (si === 0 && !sec0Show.has(row.label)) return;
      if (si === 3 && !sec3Show.has(row.label)) return;
      if ((si === 1 || si === 2) && !isBold && val === 0) return;
      const bg       = isBold ? cfg.boldBg : cfg.rowBg;
      const isWhite  = isRes && isBold;
      const tColor   = isWhite ? C.white : C.gray;
      const vColor   = isWhite ? C.white : '000000';
      dfcTRows.push([
        { text: isBold ? row.label : `   ${row.label}`, options: { bold: isBold, fontSize: 8.5, color: tColor, fill: { color: bg }, fontFace: 'Arial', align: 'left',  valign: 'middle' } },
        { text: fmtDfc(val),                             options: { bold: isBold, fontSize: 8.5, color: vColor, fill: { color: bg }, fontFace: 'Arial', align: 'right', valign: 'middle' } },
      ]);
    });
  });

  const dfcColW: [number, number] = [4.3, 1.5];
  const dfcRowH = 0.295;
  sDfc.addTable(dfcTRows, {
    x: 0.3, y: 0.95, w: 5.8, h: dfcTRows.length * dfcRowH,
    colW: dfcColW, rowH: dfcRowH,
    border: { pt: 0.3, color: 'E2E8F0' },
  });

  // ── Gráfico de linha (lado direito) ────────────────────────────────────────
  const dfcChartVals = [
    getSecRow(0, 'Lucro (Prejuízo) Ajustado')                  / 1000,
    getSecRow(0, 'Geração (Consumo) Caixa Operacional')        / 1000,
    getSecRow(1, 'Fluxo de Caixa de Investimentos')            / 1000,
    getSecRow(2, 'Fluxo de Caixa de Financiamentos')           / 1000,
    getSecRow(3, 'Caixa gerado das atividades operacionais')   / 1000,
  ];
  const dfcChartMin = Math.floor(Math.min(...dfcChartVals) * 1.35 / 5) * 5;
  const dfcChartMax = Math.ceil(Math.max(...dfcChartVals)  * 1.25 / 5) * 5;

  (sDfc as any).addChart('line', [
    {
      name: 'R$ Milhões',
      labels: ['Lucro\nAjustado', 'Caixa\nCíclico', 'Investimentos', 'Financiamentos', 'Caixa\nGerado'],
      values: dfcChartVals,
    },
  ], {
    x: 6.4, y: 0.95, w: 6.65, h: 3.15,
    showTitle: true,
    title: `Fluxo de Caixa  |  1º TRI ${dfcAno}`,
    titleFontSize: 11,
    titleBold: true,
    titleColor: C.darkBlue,
    lineDataSymbol: 'circle',
    lineDataSymbolSize: 9,
    lineSize: 2.5,
    chartColors: ['2563EB'],
    showValue: true,
    dataLabelFontSize: 9,
    dataLabelFontBold: true,
    dataLabelColor: C.darkBlue,
    showLegend: false,
    valAxisMinVal: dfcChartMin,
    valAxisMaxVal: dfcChartMax,
    valGridLine: { style: 'solid', color: 'E5E7EB', size: 0.5 },
    catAxisLabelFontSize: 9,
    valAxisLabelFontSize: 9,
  });

  // ── Análise textual (abaixo do gráfico) ───────────────────────────────────
  const dfcAnaliseX = 6.4;
  const dfcAnaliseY = 4.2;
  const dfcAnaliseW = 6.65;

  // Cabeçalho "ANÁLISE"
  sDfc.addShape('rect', {
    x: dfcAnaliseX, y: dfcAnaliseY, w: dfcAnaliseW, h: 0.3,
    fill: { color: C.darkBlue }, line: { color: C.darkBlue },
  });
  sDfc.addText('ANÁLISE', {
    x: dfcAnaliseX + 0.12, y: dfcAnaliseY + 0.02, w: dfcAnaliseW - 0.2, h: 0.26,
    fontSize: 8.5, bold: true, color: C.white, fontFace: 'Arial', valign: 'middle',
  });

  // Fundo da caixa de análise
  sDfc.addShape('rect', {
    x: dfcAnaliseX, y: dfcAnaliseY + 0.3, w: dfcAnaliseW, h: 2.7,
    fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', pt: 0.5 },
  });

  // Bullet 1 – Resultado & Capital de Giro
  sDfc.addText('▸  Lucro ajustado de R$ 23,8M no 1T26, composto por resultado líquido de R$ 18,2M e depreciação de R$ 5,2M. A variação de capital de giro consumiu R$ 8,7M, pressionada por crescimento de contas a receber (R$ 88,6M), parcialmente compensado por fornecedores (+R$ 28,1M) e obrigações salariais (+R$ 29,9M). Fluxo operacional total positivo de R$ 15,1M.', {
    x: dfcAnaliseX + 0.18, y: dfcAnaliseY + 0.36, w: dfcAnaliseW - 0.35, h: 1.2,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top',
    wrap: true, lineSpacingMultiple: 1.2,
  });

  // Bullet 2 – Investimentos, Financiamentos & Caixa Final
  sDfc.addText('▸  Investimentos em imobilizado de R$ 14,3M financiados parcialmente por captações líquidas de R$ 17,9M (empréstimos R$ 12,7M + partes relacionadas R$ 5,2M). O caixa encerrou o trimestre em R$ 82,4M, crescimento de +29,4% em relação ao saldo inicial de R$ 63,7M.', {
    x: dfcAnaliseX + 0.18, y: dfcAnaliseY + 1.62, w: dfcAnaliseW - 0.35, h: 1.2,
    fontSize: 9, color: C.gray, fontFace: 'Arial', valign: 'top',
    wrap: true, lineSpacingMultiple: 1.2,
  });

  // ── SLIDE 12 – Realizado vs Orçado ───────────────────────────────────────
  const orcData = (financialData as any).orcamento?.summary ?? {};
  const orcMeses = [
    { key: 'janeiro',   label: 'Janeiro/2026' },
    { key: 'fevereiro', label: 'Fevereiro/2026' },
    { key: 'marco',     label: 'Março/2026' },
  ];
  const orcLinhas = ['RECEITAS', 'DESPESAS E CUSTOS', 'LUCRO LÍQUIDO'];
  const orcLinhaColor: Record<string, string> = {
    'RECEITAS': C.lightGray,
    'DESPESAS E CUSTOS': C.lightBlue,
    'LUCRO LÍQUIDO': 'EFF6FF',
  };

  const sOrc = prs.addSlide();
  sOrc.background = { fill: C.white };

  // Header azul escuro
  sOrc.addShape('rect', { x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: C.darkBlue }, line: { color: C.darkBlue } });
  sOrc.addText('REALIZADO VS ORÇADO  –  Jan–Mar/2026', {
    x: 0.4, y: 0.08, w: 10.5, h: 0.55,
    fontSize: 20, bold: true, color: C.white, fontFace: 'Arial',
  });
  sOrc.addText('Comparativo mensal de Receitas, Despesas e Lucro Líquido  |  R$', {
    x: 0.4, y: 0.62, w: 10, h: 0.35,
    fontSize: 11, color: 'BFDBFE', fontFace: 'Arial', italic: true,
  });
  addLogo(sOrc, 11.5, 0.12, 1.5, 0.75);

  // Cabeçalho da tabela
  const orcHeaderFill = { type: 'solid', color: C.darkBlue };
  const orcHeaderOpts = { fill: orcHeaderFill, color: C.white, bold: true, fontSize: 9, fontFace: 'Arial', align: 'center', valign: 'middle', border: { pt: 0.5, color: 'D1D5DB' } };
  const orcCellOpts   = { fontSize: 9, fontFace: 'Arial', align: 'center', valign: 'middle', border: { pt: 0.5, color: 'D1D5DB' } };

  const orcTableRows: object[][] = [
    [
      { text: '',                options: { ...orcHeaderOpts, align: 'left' } },
      { text: 'Janeiro/2026',    options: { ...orcHeaderOpts, colspan: 3 } },
      { text: 'Fevereiro/2026',  options: { ...orcHeaderOpts, colspan: 3 } },
      { text: 'Março/2026',      options: { ...orcHeaderOpts, colspan: 3 } },
    ],
    [
      { text: 'Indicador',  options: { ...orcHeaderOpts, align: 'left' } },
      { text: 'Realizado',  options: orcHeaderOpts },
      { text: 'Orçado',     options: orcHeaderOpts },
      { text: 'Var%',       options: orcHeaderOpts },
      { text: 'Realizado',  options: orcHeaderOpts },
      { text: 'Orçado',     options: orcHeaderOpts },
      { text: 'Var%',       options: orcHeaderOpts },
      { text: 'Realizado',  options: orcHeaderOpts },
      { text: 'Orçado',     options: orcHeaderOpts },
      { text: 'Var%',       options: orcHeaderOpts },
    ],
  ];

  for (const linhaNome of orcLinhas) {
    const bgColor = orcLinhaColor[linhaNome];
    const rowFill = { type: 'solid', color: bgColor };
    const isLucro = linhaNome === 'LUCRO LÍQUIDO';
    const cells: object[] = [
      { text: linhaNome, options: { ...orcCellOpts, fill: rowFill, align: 'left', bold: isLucro, color: C.gray } },
    ];
    for (const mes of orcMeses) {
      const item = (orcData[mes.key] as any[])?.find((r: any) => r.label === linhaNome) ?? {};
      const real = item.realizado ?? 0;
      const orc  = item.orcado    ?? 0;
      const pct  = item.pct       ?? 0;
      const pctStr = (((Math.abs(pct) * 100)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%');
      const pctFmt = pct < 0 ? `(${pctStr})` : pctStr;
      const pctColor = '000000';
      cells.push(
        { text: fmtBig(real), options: { ...orcCellOpts, fill: rowFill, bold: isLucro, color: C.gray } },
        { text: fmtBig(orc),  options: { ...orcCellOpts, fill: rowFill, bold: isLucro, color: C.gray } },
        { text: pctFmt,       options: { ...orcCellOpts, fill: rowFill, bold: true, color: pctColor } },
      );
    }
    orcTableRows.push(cells);
  }

  sOrc.addTable(orcTableRows, {
    x: 0.3, y: 1.2, w: 12.73, h: 2.4,
    colW: [2.4, 1.15, 1.15, 0.83, 1.15, 1.15, 0.83, 1.15, 1.15, 0.83],
    rowH: [0.45, 0.35, 0.52, 0.52, 0.56],
    border: { pt: 0.5, color: 'D1D5DB' },
  });

  // Nota de rodapé
  sOrc.addText('* Valores mensais em R$ (não consolidados). Variação = Realizado – Orçado. Negativo indica resultado abaixo do orçado.', {
    x: 0.3, y: 3.85, w: 12.7, h: 0.4,
    fontSize: 8, color: '6B7280', fontFace: 'Arial', italic: true,
  });

  // ── SLIDE 11 – Encerramento ────────────────────────────────────────────────
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
export default function ExportPPTButton() {
  const handleExport = async () => {
    try {
      await generatePPT();
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
