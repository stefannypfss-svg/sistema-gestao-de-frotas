import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Equipment, EquipmentStatus } from '../../types';
import { cn } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';

interface StatusUpdateModalProps {
  equipment: Equipment;
  onSave: (status: EquipmentStatus) => void;
  onClose: () => void;
}

const STATUSES: EquipmentStatus[] = ['Disponível', 'Locado', 'Em Manutenção', 'Vendido'];

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  equipment,
  onSave,
  onClose,
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] p-6 w-full max-w-sm shadow-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold">Alterar Status</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Atualizar status para <span className="font-bold">{equipment.prefixo}</span>
      </p>
      <div className="grid grid-cols-1 gap-3">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => onSave(status)}
            className={cn(
              'py-3 px-4 rounded-xl text-left font-medium transition-all border-2',
              equipment.status === status
                ? 'bg-brand-light border-brand text-brand'
                : 'bg-gray-50 border-transparent hover:border-gray-200',
            )}
          >
            <StatusBadge status={status} />
          </button>
        ))}
      </div>
    </motion.div>
  </div>
);
