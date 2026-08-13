import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, LogOut, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TabId, TABS } from '../../config/navigation';

const LOGO_URL = '/logo.svg';

interface TopbarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-gray-200 z-50 px-8">
      <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img
            src={LOGO_URL}
            alt="Cortez Rental"
            className="h-8 w-auto object-contain block"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const next = target.nextSibling as HTMLElement | null;
              if (next) next.style.display = 'flex';
            }}
          />
          <div className="hidden w-8 h-8 bg-brand rounded-lg items-center justify-center text-white text-[12px] font-semibold">
            CR
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 h-full">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'h-full px-1 flex items-center text-[13px] font-medium transition-all relative',
                activeTab === tab.id ? 'text-brand' : 'text-gray-500 hover:text-brand',
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand"
                />
              )}
            </button>
          ))}
        </div>

        {/* Status pill */}
        <div className="hidden md:flex items-center gap-[6px] bg-brand-light border border-brand-border rounded-full px-3 py-1 text-[12px] text-brand">
          <div className="relative w-1.5 h-1.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-brand" />
            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
          </div>
          <span className="font-medium">Status do Pátio: Operacional</span>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Sair"
            className="hidden md:flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-brand transition-colors ml-4"
          >
            <LogOut size={16} />
            Sair
          </button>
        )}

        {/* Mobile toggle */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
        >
          {isMenuOpen ? <X size={24} /> : <Filter size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[52px] left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-4 flex flex-col gap-2 md:hidden"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMenuOpen(false);
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-xl text-left text-sm font-bold transition-all',
                  activeTab === tab.id
                    ? 'bg-brand-light text-brand'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
