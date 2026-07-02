'use client';

import { useMemo } from 'react';
import financialData from '../lib/financial-data.json';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LabelList, ResponsiveContainer,
} from 'recharts';

const { funcionarios } = financialData as any;
const setores: { setor: string; qtd: number }[] = funcionarios?.setores ?? [];
const fonte: string = funcionarios?.fonte ?? '';
const data: string = funcionarios?.data ?? '';

export default function FuncionariosTab() {
  const sorted = useMemo(
    () => [...setores].sort((a, b) => a.qtd - b.qtd),
    [],
  );

  const total = useMemo(() => setores.reduce((s, r) => s + r.qtd, 0), []);

  const chartData = useMemo(
    () =>
      sorted.map((r) => ({
        setor: `${r.setor} (${((r.qtd / total) * 100).toFixed(1).replace('.', ',')}%)`,
        qtd: r.qtd,
      })),
    [sorted, total],
  );

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Quadro de Funcionários
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Posição em {data} · Grupo Líder
        </p>
      </div>

      {/* Card total */}
      <div className="flex items-center justify-between bg-sky-900/60 rounded px-5 py-3 mb-6">
        <span className="text-sm font-bold tracking-wider text-sky-200 uppercase">
          Total de Funcionários
        </span>
        <span className="text-2xl font-bold text-white font-mono">
          {total.toLocaleString('pt-BR')}
        </span>
      </div>

      {/* Gráfico */}
      <div className="w-full" style={{ height: chartData.length * 48 + 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 80, left: 8, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="#334155" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(v) => v.toLocaleString('pt-BR')}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="setor"
              width={210}
              tick={{ fontSize: 11, fill: '#cbd5e1' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              formatter={(v: number) => [v.toLocaleString('pt-BR'), 'Funcionários']}
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Bar dataKey="qtd" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#93c5fd" />
              ))}
              <LabelList
                dataKey="qtd"
                position="right"
                formatter={(v: number) => v.toLocaleString('pt-BR')}
                style={{ fontSize: 11, fill: '#1e3a5f', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {fonte && (
        <p className="text-[10px] text-muted-foreground mt-4 italic">
          * Fonte: {fonte}
        </p>
      )}
    </div>
  );
}
