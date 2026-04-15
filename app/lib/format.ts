export function formatBRL(value: number | null | undefined, decimals: number = 0): string {
  const v = value ?? 0;
  if (Math.abs(v) < 0.01) return '-';
  const formatted = Math.abs(v).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return v < 0 ? `(${formatted})` : formatted;
}

export function formatPct(value: number | null | undefined, decimals: number = 1): string {
  const v = value ?? 0;
  if (Math.abs(v) < 0.0001) return '-';
  const formatted = (Math.abs(v) * 100).toFixed(decimals) + '%';
  return v < 0 ? `(${formatted})` : formatted;
}

export function formatCompact(value: number | null | undefined): string {
  const v = value ?? 0;
  if (Math.abs(v) < 1) return '-';
  const abs = Math.abs(v);
  const formatted = abs >= 1e9
    ? (abs / 1e9).toFixed(2) + 'B'
    : abs >= 1e6
      ? (abs / 1e6).toFixed(2) + 'M'
      : abs >= 1e3
        ? (abs / 1e3).toFixed(1) + 'K'
        : abs.toFixed(0);
  return v < 0 ? `(${formatted})` : formatted;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
