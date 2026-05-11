'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, FileSpreadsheet, TrendingUp, DollarSign, Target, LineChart } from 'lucide-react';
import OrcamentoTab from './realizadovsorcado';
import PremissasTab from './premissas-tab';
import DreTab from './dre-tab';
import FcTab from './fc-tab';
import KpisTab from './kpis-tab';
import GraficosTab from './graficos-tab';
import ResumoDreTab from './resumodre-tab';
import DfcTab from './dfc-tab';
import BpTab from './bp-tab';
import ExportPPTButton from './export-ppt';

const TABS = [
  { id: 'orcamento', label: 'Realizado vs Orçado', icon: FileSpreadsheet },
  { id: 'premissas', label: 'Premissas', icon: Target },
  { id: 'resumodre', label: 'Resumo DRE', icon: TrendingUp },
  { id: 'dre', label: 'DRE', icon: TrendingUp },
  { id: 'fc', label: 'Fluxo de Caixa', icon: DollarSign },
  { id: 'dfc', label: 'DFC', icon: DollarSign },
  { id: 'bp', label: 'BP', icon: BarChart3 },
  { id: 'kpis', label: 'KPIs', icon: BarChart3 },
  { id: 'graficos', label: 'Gráficos', icon: LineChart },
] as const;

type TabId = typeof TABS[number]['id'];

export default function DashboardClient() {
  const [activeTab, setActiveTab] = useState<TabId>('orcamento');
  const [scenario, setScenario] = useState<'realista' | 'otimista' | 'pessimista'>('realista');
  const logoSrc = "https://natanjs01.github.io/projecoes_grupo_lider/grupolider.png";

  const renderTab = () => {
    switch (activeTab) {
      case 'orcamento': return <OrcamentoTab />;
      case 'premissas': return <PremissasTab scenario={scenario} setScenario={setScenario} />;
      case 'dre': return <DreTab scenario={scenario} />;
      case 'fc': return <FcTab scenario={scenario} />;
      case 'dfc': return <DfcTab />;
      case 'bp': return <BpTab />;
      case 'kpis': return <KpisTab scenario={scenario} />;
      case 'graficos': return <GraficosTab scenario={scenario} />;
      case 'resumodre': return <ResumoDreTab />;
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="Logo Grupo Lider"
                width={96}
                height={96}
                className="w-24 h-24 rounded object-contain"
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
              <ExportPPTButton />
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
