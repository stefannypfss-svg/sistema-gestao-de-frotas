import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Equipment, SituacaoEquipamento, StatusOperacional } from '../../types';
import { cn } from '../../lib/utils';

interface StatusUpdateModalProps {
  equipment: Equipment;
  onSave: (patch: Pick<Equipment, 'situacao' | 'statusOperacional'>) => void;
  onClose: () => void;
}

const SITUACOES: { value: SituacaoEquipamento; label: string; desc: string }[] = [
  { value: 'Mobilizado',    label: 'Mobilizado',    desc: 'Equipamento em obra' },
  { value: 'Desmobilizado', label: 'Desmobilizado', desc: 'Retornou à base' },
];

const STATUSES: { value: StatusOperacional; label: string; desc: string }[] = [
  { value: 'Operação',   label: 'Operação',   desc: 'Trabalhando normalmente' },
  { value: 'Disponível', label: 'Disponível', desc: 'Pronto para ser alocado' },
  { value: 'Manutenção', label: 'Manutenção', desc: 'Aguardando ou em manutenção' },
];

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
  equipment,
  onSave,
  onClose,
}) => {
  const [situacao, setSituacao] = React.useState<SituacaoEquipamento>(equipment.situacao);
  const [statusOp, setStatusOp] = React.useState<StatusOperacional>(equipment.statusOperacional);

  const handleConfirm = () => {
    onSave({ situacao, statusOperacional: statusOp });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[20px] p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold">Alterar Classificação</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Equipamento <span className="font-bold text-brand">{equipment.prefixo}</span>
        </p>

        {/* Situação */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Situação
        </p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {SITUACOES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSituacao(s.value)}
              className={cn(
                'py-3 px-3 rounded-xl text-left transition-all border-2',
                situacao === s.value
                  ? 'bg-brand-light border-brand text-brand'
                  : 'bg-gray-50 border-transparent hover:border-gray-200 text-gray-700',
              )}
            >
              <p className="text-[13px] font-semibold">{s.label}</p>
              <p className="text-[11px] opacity-70 mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>

        {/* Status Operacional */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
          Status Operacional
        </p>
        <div className="grid grid-cols-1 gap-2 mb-6">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusOp(s.value)}
              className={cn(
                'py-3 px-4 rounded-xl text-left transition-all border-2',
                statusOp === s.value
                  ? 'bg-brand-light border-brand text-brand'
                  : 'bg-gray-50 border-transparent hover:border-gray-200 text-gray-700',
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold">{s.label}</p>
                <p className="text-[11px] opacity-60">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full py-3 rounded-xl bg-brand text-white font-semibold text-[14px] hover:bg-brand/90 transition-colors"
        >
          Confirmar
        </button>
      </motion.div>
    </div>
  );
};
