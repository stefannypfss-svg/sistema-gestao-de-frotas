import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Largura máxima do contêiner (classe Tailwind, ex: 'max-w-4xl'). */
  maxWidth?: string;
}

/** Modal centralizado (sobe a partir do fundo no mobile). */
export const Modal: React.FC<ModalProps> = ({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'max-w-lg',
}) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      className={cn(
        'bg-white rounded-t-[20px] sm:rounded-[20px] w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl',
        maxWidth,
      )}
    >
      <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />
      {children}
    </motion.div>
  </div>
);

interface DrawerProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Painel lateral deslizante (usado no formulário de alocação). */
export const Drawer: React.FC<DrawerProps> = ({
  title,
  subtitle,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-[60] flex justify-end">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
    />
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col pt-4"
    >
      <ModalHeader title={title} subtitle={subtitle} onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-8 bg-[#fcfcfc]">{children}</div>
    </motion.div>
  </div>
);

const ModalHeader: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
}> = ({ title, subtitle, onClose }) => (
  <div className="p-8 border-b border-gray-50 flex items-center justify-between">
    <div>
      <h2 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h2>
      {subtitle && (
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
          {subtitle}
        </p>
      )}
    </div>
    <button
      onClick={onClose}
      className="p-3 hover:bg-gray-50 rounded-full transition-colors"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);
