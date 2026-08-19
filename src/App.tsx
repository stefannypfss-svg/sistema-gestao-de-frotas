import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './hooks/useStore';
import { useAuth } from './hooks/useAuth';
import { TabId } from './config/navigation';
import { Topbar } from './components/layout/Topbar';
import { WorksView } from './features/works/WorksView';
import { PlanningView } from './features/planning/PlanningView';
import { ForecastView } from './features/forecast/ForecastView';
import { TechnicalDataView } from './features/technicalData/TechnicalDataView';
import { EquipamentoObraView } from './features/equipamentoObra/EquipamentoObraView';
import { DashboardView } from './features/dashboard/DashboardView';
import { TabelaLocacaoView } from './features/tabelaLocacao/TabelaLocacaoView';
import { DisponibilidadeView } from './features/disponibilidade/DisponibilidadeView';
import { LoginView } from './features/auth/LoginView';

function AppShell() {
  const [activeTab, setActiveTab] = React.useState<TabId>('dashboard');
  const { equipments, works, allocations, equipamentoObra, tabelaLocacao, disponibilidade, isLoading } = useStore();
  const { logout } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-brand animate-pulse">
            Carregando Cortez Rental...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 font-sans selection:bg-brand selection:text-white pt-[52px]">
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} />

      <main className="w-full relative overflow-x-hidden px-4 md:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                registros={equipamentoObra}
                equipments={equipments}
              />
            )}
            {activeTab === 'dados-tecnicos' && (
              <TechnicalDataView equipments={equipments} />
            )}
            {activeTab === 'equip-por-obra' && (
              <EquipamentoObraView
                registros={equipamentoObra}
                equipments={equipments}
                works={works.items}
              />
            )}
            {activeTab === 'disponibilidade' && (
              <DisponibilidadeView
                equipments={equipments}
                equipamentoObra={equipamentoObra}
                disponibilidade={disponibilidade}
              />
            )}
            {activeTab === 'obras' && <WorksView works={works} />}
            {activeTab === 'planejamento' && (
              <PlanningView
                equipments={equipments.items}
                works={works.items}
                allocations={allocations}
              />
            )}
            {activeTab === 'previsao' && (
              <ForecastView
                equipments={equipments.items}
                equipamentoObra={equipamentoObra.items}
                tabelaLocacao={tabelaLocacao.items}
                works={works.items}
              />
            )}
            {activeTab === 'tabela-locacao' && (
              <TabelaLocacaoView
                equipments={equipments}
                works={works}
                tabelaLocacao={tabelaLocacao}
                equipamentoObra={equipamentoObra}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <AppShell />;
}
