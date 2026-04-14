export function formatBRL(value: number | null | undefined, decimals: number = 0): string {
  const v = value ?? 0;
  if (Math.abs(v) < 0.01) return '-';
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(value: number | null | undefined, decimals: number = 1): string {
  const v = value ?? 0;
  if (Math.abs(v) < 0.0001) return '-';
  return (v * 100).toFixed(decimals) + '%';
}

export function formatCompact(value: number | null | undefined): string {
  const v = value ?? 0;
  if (Math.abs(v) < 1) return '-';
  const abs = Math.abs(v);
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
