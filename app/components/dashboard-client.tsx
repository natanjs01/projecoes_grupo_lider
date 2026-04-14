'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, FileSpreadsheet, TrendingUp, DollarSign, Target, LineChart, Download } from 'lucide-react';
import OrcamentoTab from './orcamento-tab';
import PremissasTab from './premissas-tab';
import DreTab from './dre-tab';
import FcTab from './fc-tab';
import KpisTab from './kpis-tab';
import GraficosTab from './graficos-tab';

const TABS = [
  { id: 'orcamento', label: 'Orçamento', icon: FileSpreadsheet },
  { id: 'premissas', label: 'Premissas', icon: Target },
  { id: 'dre', label: 'DRE', icon: TrendingUp },
  { id: 'fc', label: 'Fluxo de Caixa', icon: DollarSign },
  { id: 'kpis', label: 'KPIs', icon: BarChart3 },
  { id: 'graficos', label: 'Gráficos', icon: LineChart },
] as const;

type TabId = typeof TABS[number]['id'];

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabId>('orcamento');
  const [scenario, setScenario] = useState<'realista' | 'otimista' | 'pessimista'>('realista');

  const renderTab = () => {
    switch (activeTab) {
      case 'orcamento': return <OrcamentoTab />;
      case 'premissas': return <PremissasTab scenario={scenario} setScenario={setScenario} />;
      case 'dre': return <DreTab scenario={scenario} />;
      case 'fc': return <FcTab scenario={scenario} />;
      case 'kpis': return <KpisTab scenario={scenario} />;
      case 'graficos': return <GraficosTab scenario={scenario} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-28">
            <div className="flex items-center gap-3">
              <Image
                src="/grupolider.png"
                alt="Logo Grupo Lider"
                width={96}
                height={96}
                className="w-24 h-24 rounded object-contain"
                priority
              />
              <div>
                <h1 className="font-display font-bold text-[1.3125rem] tracking-tight">Projeções Financeiras 2026</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {scenario !== 'realista' && (
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                  scenario === 'otimista' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'
                }`}>
                  {scenario === 'otimista' ? 'Cenário Otimista' : 'Cenário Pessimista'}
                </span>
              )}
              <button
                onClick={() => {
                  const data = JSON.stringify({ activeTab, scenario, timestamp: new Date().toISOString() });
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `glider-export-${activeTab}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
              >
                <Download className="w-3 h-3" />
                Exportar
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {TABS.map((tab: any) => {
              const Icon = tab?.icon;
              return (
                <button
                  key={tab?.id}
                  onClick={() => setActiveTab(tab?.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab?.id
                      ? 'border-red-600 text-red-500'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {tab?.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
