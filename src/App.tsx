import React from 'react';
import { LayoutDashboard, Truck, CalendarDays, BarChart3, Search, Plus, Filter, MoreVertical, Edit, Trash2, X, ArrowRightLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, DollarSign, Clock, Building2, Check, Slash, Percent, Eraser } from 'lucide-react';
import { useStore } from './hooks/useStore';
import { Equipment, EquipmentStatus, Allocation, Work, WorkStatus } from './types';
import { cn, formatCurrency } from './lib/utils';
import { StatusBadge } from './components/StatusBadge';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, addMonths, isWithinInterval, eachMonthOfInterval, isPast, isFuture, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Components ---

const LOGO_URL = "/logo.svg";

const Topbar = ({ activeTab, setActiveTab, lastModified }: { activeTab: string, setActiveTab: (t: string) => void, lastModified: string | null }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuItems = [
    { id: 'equipamentos', label: 'Equipamentos' },
    { id: 'obras', label: 'Obras' },
    { id: 'planejamento', label: 'Planejamento' },
    { id: 'previsao', label: 'Previsão de Receitas' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-gray-200 z-50 px-8">
      <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center">
          <img
            src={LOGO_URL}
            alt="Cortez Rental"
            style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const next = target.nextSibling as HTMLElement;
              if (next) next.style.display = 'flex';
            }}
          />
          <div style={{ display: 'none', width: 32, height: 32, background: '#076600', borderRadius: 8, alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>
            CR
          </div>
        </div>

        {/* Center: Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 h-full">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "h-full px-1 flex items-center text-[13px] font-medium transition-all relative",
                activeTab === item.id 
                  ? "text-[#076600]" 
                  : "text-[#6b7280] hover:text-[#076600]"
              )}
            >
              {item.label}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#076600]" 
                />
              )}
            </button>
          ))}
        </div>

        {/* Right: Last modified */}
        <div className="hidden md:flex items-center gap-3 bg-[#f0faf0] border border-[#b6e0b6] rounded-full px-4 py-2 text-[12px] text-[#076600]">
            <div className="relative w-1.5 h-1.5 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#076600]" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-[#076600] animate-ping" />
            </div>
            <span className="font-medium">
              Atualizado em: {lastModified ? format(parseISO(lastModified), "dd'/'MM'/'yyyy 'às' HH:mm") : 'carregando...'}
            </span>
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-gray-500 hover:bg-gray-50 rounded-lg"
        >
          {isMenuOpen ? <X size={24} /> : <Filter size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[52px] left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-4 flex flex-col gap-2 md:hidden"
          >
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMenuOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-left text-sm font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-green-50 text-[#076600]" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Modals ---

const EquipmentModal = ({ equipment, onSave, onClose }: { equipment?: Equipment, onSave: (e: Equipment) => void, onClose: () => void }) => {
  const [formData, setFormData] = React.useState<Equipment>(equipment || {
    prefixo: '', grupo: 'A', grupoEquipamento: '', familia: '', descricao: '',
    modelo: '', franquia: 0, valorLocacao: 0, ano: '', placa: '', chassi: '',
    localizacaoAtual: 'Central de Equipamentos Rental', status: 'Disponível'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{equipment ? 'Editar Equipamento' : 'Novo Equipamento'}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Preencha os dados técnicos</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 custom-scrollbar">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prefixo</label>
            <input required value={formData.prefixo} onChange={e => setFormData({...formData, prefixo: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Família</label>
            <input required value={formData.familia} onChange={e => setFormData({...formData, familia: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modelo</label>
            <input required value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descrição</label>
            <input required value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ano</label>
            <input required value={formData.ano} onChange={e => setFormData({...formData, ano: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Placa</label>
            <input value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chassi</label>
            <input value={formData.chassi} onChange={e => setFormData({...formData, chassi: e.target.value.toUpperCase()})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Locação (R$)</label>
            <input type="number" required value={formData.valorLocacao} onChange={e => setFormData({...formData, valorLocacao: Number(e.target.value)})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-black text-[#076600]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Localização Atual</label>
            <input required value={formData.localizacaoAtual} onChange={e => setFormData({...formData, localizacaoAtual: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold text-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as EquipmentStatus})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none shadow-inner focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold appearance-none">
              <option value="Disponível">Disponível</option>
              <option value="Locado">Locado</option>
              <option value="Em Manutenção">Em Manutenção</option>
              <option value="Vendido">Vendido</option>
            </select>
          </div>
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grupo Equipamento</label>
             <input required value={formData.grupoEquipamento} onChange={e => setFormData({...formData, grupoEquipamento: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
          </div>
          
          <div className="md:col-span-3 pt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-gray-50 mt-6">
            <button type="button" onClick={onClose} className="order-2 sm:order-1 px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 rounded-full transition-colors">Cancelar</button>
            <button type="submit" className="order-1 sm:order-2 px-12 py-4 text-xs font-black uppercase tracking-widest text-white bg-[#076600] hover:bg-[#054f00] rounded-full shadow-xl shadow-green-900/20 transition-all active:scale-95">Salvar Equipamento</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const StatusUpdateModal = ({ equipment, onSave, onClose }: { equipment: Equipment, onSave: (status: EquipmentStatus) => void, onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[20px] p-6 w-full max-w-sm shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold">Alterar Status</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">Atualizar status para <span className="font-bold">{equipment.prefixo}</span></p>
                <div className="grid grid-cols-1 gap-3">
                    {(['Disponível', 'Locado', 'Em Manutenção', 'Vendido'] as EquipmentStatus[]).map(status => (
                        <button
                            key={status}
                            onClick={() => onSave(status)}
                            className={cn(
                                "py-3 px-4 rounded-xl text-left font-medium transition-all",
                                equipment.status === status ? "bg-green-50 border-2 border-[#076600] text-[#076600]" : "bg-gray-50 border-2 border-transparent hover:border-gray-200"
                            )}
                        >
                            <StatusBadge status={status} />
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

const WorkModal = ({ work, onSave, onClose }: { work?: Work, onSave: (w: Work) => void, onClose: () => void }) => {
    const [formData, setFormData] = React.useState<Work>(work || {
        id: '', nome: '', cliente: '', status: 'Ativa', observacoes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: formData.id || Math.random().toString(36).substr(2, 9),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
            >
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{work ? 'Editar Obra' : 'Nova Obra'}</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Dados básicos do contrato</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Obra</label>
                        <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold placeholder:text-gray-300" placeholder="Ex: Rodoanel Pista Norte" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Cliente</label>
                        <input value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as WorkStatus})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-full border-none shadow-inner focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold appearance-none">
                            <option value="Ativa">Ativa</option>
                            <option value="Encerrada">Encerrada</option>
                            <option value="Suspensa">Suspensa</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações</label>
                        <textarea rows={3} value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} className="w-full px-4 py-3 bg-[#f8fafc] rounded-[16px] border-none focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold resize-none" />
                    </div>
                    
                    <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-gray-50 mt-6">
                        <button type="button" onClick={onClose} className="order-2 sm:order-1 px-8 py-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 rounded-full transition-colors">Cancelar</button>
                        <button type="submit" className="order-1 sm:order-2 px-12 py-4 text-xs font-black uppercase tracking-widest text-white bg-[#076600] hover:bg-[#054f00] rounded-full shadow-xl shadow-green-900/20 transition-all active:scale-95">Salvar Obra</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const ObrasView = ({ works, saveWorks }: { works: Work[], saveWorks: (w: Work[]) => void }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingWork, setEditingWork] = React.useState<Work | undefined>();

    const handleSave = (work: Work) => {
        if (editingWork) {
            saveWorks(works.map(w => w.id === editingWork.id ? work : w));
        } else {
            saveWorks([...works, work]);
        }
        setIsModalOpen(false);
        setEditingWork(undefined);
    };

    const handleDelete = (id: string) => {
        if (confirm('Deseja remover esta obra?')) {
            saveWorks(works.filter(w => w.id !== id));
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-[22px] font-medium text-gray-900 tracking-tight">Obras</h2>
                    <p className="text-[13px] text-[#6b7280] mt-1">Gerencie obras e clientes</p>
                </div>
                <button 
                  onClick={() => { setEditingWork(undefined); setIsModalOpen(true); }}
                  className="bg-[#076600] text-white px-4 py-2 rounded-lg font-medium text-[13px] flex items-center gap-2 hover:bg-[#054f00] border-none outline-none transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={16} /> Nova Obra
                </button>
            </header>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden mt-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="px-8 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em]">Nome da Obra</th>
                                <th className="px-8 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em]">Cliente</th>
                                <th className="px-8 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em]">Status</th>
                                <th className="px-8 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em]">Observações</th>
                                <th className="px-8 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em] text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb]">
                            {works.map(w => (
                                <tr key={w.id} className="hover:bg-[#f0faf0] transition-colors group">
                                    <td className="px-8 py-[16px] text-[14px] font-medium text-[#076600]">{w.nome}</td>
                                    <td className="px-8 py-[16px] text-[13px] text-[#6b7280]">{w.cliente || '—'}</td>
                                    <td className="px-8 py-[16px]">
                                        <span className={cn(
                                            "inline-flex items-center px-[10px] py-[3px] rounded-full text-[12px] font-medium border-none leading-none",
                                            w.status === 'Ativa' ? "bg-[#f0faf0] text-[#076600]" :
                                            w.status === 'Suspensa' ? "bg-[#fffbeb] text-[#d97706]" :
                                            "bg-[#f3f4f6] text-[#6b7280]"
                                        )}>
                                            {w.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-[16px] text-[13px] text-[#6b7280] italic max-w-xs truncate">{w.observacoes || '—'}</td>
                                    <td className="px-8 py-[16px]">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => { setEditingWork(w); setIsModalOpen(true); }} 
                                                className="w-7 h-7 border border-[#e5e7eb] rounded-md flex items-center justify-center bg-white cursor-pointer text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#076600] transition-all"
                                                title="Editar"
                                            >
                                                <Edit size={14}/>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(w.id)} 
                                                className="w-7 h-7 border border-[#e5e7eb] rounded-md flex items-center justify-center bg-white cursor-pointer text-[#6b7280] hover:bg-[#f9fafb] hover:text-red-500 transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && <WorkModal work={editingWork} onSave={handleSave} onClose={() => { setIsModalOpen(false); setEditingWork(undefined); }} />}
            </AnimatePresence>
        </div>
    );
};



// --- Utils ---
const getEquipmentLocation = (prefixo: string, allocations: Allocation[]) => {
    const confirmedAllocations = allocations
        .filter(a => a.prefixo === prefixo && a.statusAlocacao === 'Confirmado')
        .sort((a, b) => {
            const dateA = a.dataMobilizacaoReal || a.dataMobilizacao || '';
            const dateB = b.dataMobilizacaoReal || b.dataMobilizacao || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

    if (confirmedAllocations.length > 0) {
        return confirmedAllocations[0].obra;
    }
    return 'Central de Equipamentos Rental';
};

const formatDate = (date: string | null) => date ? format(parseISO(date), 'dd/MM/yyyy') : 'em aberto';

// --- Main Views ---

const EquipamentosView = ({ equipments, saveEquipments, allocations }: { equipments: Equipment[], saveEquipments: (e: Equipment[]) => void, allocations: Allocation[] }) => {
  const [search, setSearch] = React.useState('');
  const [filterFamily, setFilterFamily] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterLocation, setFilterLocation] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingEquipment, setEditingEquipment] = React.useState<Equipment | undefined>();
  const [statusModalEq, setStatusModalEq] = React.useState<Equipment | undefined>();

  const families = Array.from(new Set(equipments.map(e => e.familia))).sort();
  const locations = Array.from(new Set(equipments.map(e => getEquipmentLocation(e.prefixo, allocations)))).sort();

  const filtered = equipments.filter(e => {
    const currentLocation = getEquipmentLocation(e.prefixo, allocations);
    const matchesSearch = e.prefixo.toLowerCase().includes(search.toLowerCase()) || 
                         e.familia.toLowerCase().includes(search.toLowerCase()) || 
                         e.descricao.toLowerCase().includes(search.toLowerCase());
    const matchesFamily = !filterFamily || e.familia === filterFamily;
    const matchesStatus = !filterStatus || e.status === filterStatus;
    const matchesLocation = !filterLocation || currentLocation === filterLocation;
    return matchesSearch && matchesFamily && matchesStatus && matchesLocation;
  });

  const stats = {
    total: equipments.length,
    locados: equipments.filter(e => e.status === 'Locado').length,
    disponiveis: equipments.filter(e => e.status === 'Disponível').length,
    manutencao: equipments.filter(e => e.status === 'Em Manutenção').length,
  };

  const handleDelete = (prefixo: string) => {
    if(confirm(`Deseja remover o equipamento ${prefixo}?`)) {
      saveEquipments(equipments.filter(e => e.prefixo !== prefixo));
    }
  };

  const handleSave = (eq: Equipment) => {
    if (editingEquipment) {
      saveEquipments(equipments.map(e => e.prefixo === editingEquipment.prefixo ? eq : e));
    } else {
      if (equipments.some(e => e.prefixo === eq.prefixo)) {
          alert('Prefixo já cadastrado!');
          return;
      }
      saveEquipments([...equipments, eq]);
    }
    setIsModalOpen(false);
    setEditingEquipment(undefined);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-[28px] font-bold text-gray-900 tracking-tight">Equipamentos</h2>
          <p className="text-[14px] text-slate-500 mt-1">Gerencie a frota de máquinas e veículos pesados</p>
        </div>
        <button 
          onClick={() => { setEditingEquipment(undefined); setIsModalOpen(true); }}
          className="bg-[#076600] text-white px-5 py-2.5 rounded-full font-medium text-[14px] flex items-center gap-2 hover:bg-[#054f00] transition-all shadow-[0_2px_8px_rgba(7,102,0,0.3)] active:scale-95"
        >
          <Plus size={20} /> Novo Equipamento
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Geral */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#8e9aaf] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">TOTAL GERAL</p>
            <p className="text-[28px] font-medium leading-none text-[#8e9aaf] font-bold">{stats.total}</p>
          </div>
          <div className="text-[12px] text-gray-500 font-medium">Mapeamento completo</div>
        </div>

        {/* Card 2: Locados */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#076600] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">LOCADOS</p>
            <p className="text-[28px] font-medium leading-none text-[#076600] font-bold">{stats.locados}</p>
          </div>
          <div className="flex">
            <span className="bg-[#f0faf0] text-[#076600] rounded-full px-2 py-0.5 text-[12px] font-medium leading-none">
              {((stats.locados / (stats.total || 1)) * 100).toFixed(1).replace('.', ',')}% da frota
            </span>
          </div>
        </div>

        {/* Card 3: Disponíveis */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#1565c0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">DISPONÍVEIS</p>
            <p className="text-[28px] font-medium leading-none text-[#1565c0] font-bold">{stats.disponiveis}</p>
          </div>
          <div className="flex">
            <span className="bg-[#eff6ff] text-[#1565c0] rounded-full px-2 py-0.5 text-[12px] font-medium leading-none">
              {((stats.disponiveis / (stats.total || 1)) * 100).toFixed(1).replace('.', ',')}% da frota
            </span>
          </div>
        </div>

        {/* Card 4: Em Manutenção */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#d97706] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">EM MANUTENÇÃO</p>
            <p className="text-[28px] font-medium leading-none text-[#d97706] font-bold">{stats.manutencao}</p>
          </div>
          <div className="flex">
            <span className="bg-[#fffbeb] text-[#d97706] rounded-full px-2 py-0.5 text-[12px] font-medium leading-none">
              {((stats.manutencao / (stats.total || 1)) * 100).toFixed(1).replace('.', ',')}% da frota
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-100">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por prefixo, família ou descrição..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-[34px] pr-3 h-[36px] bg-white rounded-lg border border-[#e5e7eb] outline-none text-[13px] font-medium transition-all focus:border-[#076600] placeholder:text-gray-400 text-gray-900"
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] bg-white rounded-full border border-[#e5e7eb] text-[13px] text-[#374151] cursor-pointer hover:border-gray-300 transition-colors shadow-sm w-full md:w-[160px]">
              <select 
                value={filterFamily} 
                onChange={e => setFilterFamily(e.target.value)} 
                className={cn(
                  "h-[40px] w-full bg-transparent rounded-full border-none outline-none text-[13px] font-medium transition-all focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10",
                  filterFamily === "" ? "text-gray-400" : "text-gray-900"
                )}
              >
                <option value="" className="text-gray-400">Todas as Famílias</option>
                {families.map(f => <option key={f} value={f} className="text-gray-900">{f}</option>)}
              </select>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] bg-white rounded-full border border-[#e5e7eb] text-[13px] text-[#374151] cursor-pointer hover:border-gray-300 transition-colors shadow-sm w-full md:w-[180px]">
              <select 
                value={filterLocation} 
                onChange={e => setFilterLocation(e.target.value)} 
                className={cn(
                  "h-[40px] w-full bg-transparent rounded-full border-none outline-none text-[13px] font-medium transition-all focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10",
                  filterLocation === "" ? "text-gray-400" : "text-gray-900"
                )}
              >
                <option value="" className="text-gray-400">Todas as Localizações</option>
                {locations.map(l => <option key={l} value={l} className="text-gray-900">{l}</option>)}
              </select>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] bg-white rounded-full border border-[#e5e7eb] text-[13px] text-[#374151] cursor-pointer hover:border-gray-300 transition-colors shadow-sm w-full md:w-[140px]">
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)} 
                className={cn(
                  "h-[40px] w-full bg-transparent rounded-full border-none outline-none text-[13px] font-medium transition-all focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10",
                  filterStatus === "" ? "text-gray-400" : "text-gray-900"
                )}
              >
                <option value="" className="text-gray-400">Todos os Status</option>
                <option value="Disponível" className="text-gray-900">Disponível</option>
                <option value="Locado" className="text-gray-900">Locado</option>
                <option value="Em Manutenção" className="text-gray-900">Em Manutenção</option>
                <option value="Vendido" className="text-gray-900">Vendido</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterFamily('');
                setFilterLocation('');
                setFilterStatus('');
              }}
              className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb] transition-colors shadow-sm"
              title="Limpar filtros"
            >
              <Eraser size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] border-b border-gray-50">Status</th>
                <th className="px-8 py-4 text-[11px] font-medium text-gray-500 uppercase tracking-[0.05em] border-b border-gray-50 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((e) => (
                <tr key={e.prefixo} className="hover:bg-[#f0faf0] transition-colors group">
                  <td className="px-8 py-5 text-[13px] font-medium text-[#076600]">
                    {e.prefixo}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-gray-900">{e.familia}</span>
                      <span className="text-[12px] text-gray-500 line-clamp-1 mt-[1px]">{e.descricao}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[12px] text-gray-500 font-medium">
                    {e.ano}
                  </td>
                  <td className="px-8 py-5 text-[13px] text-gray-700 font-medium">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full inline-block shrink-0", 
                        getEquipmentLocation(e.prefixo, allocations) === "Central de Equipamentos Rental" ? "bg-amber-500" : "bg-blue-500"
                      )}></span>
                      {getEquipmentLocation(e.prefixo, allocations)}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[13px] font-medium text-gray-900">
                    {formatCurrency(e.valorLocacao)}
                  </td>
                  <td className="px-8 py-5"><StatusBadge status={e.status} /></td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                        <button 
                            onClick={() => { setEditingEquipment(e); setIsModalOpen(true); }}
                            className="w-7 h-7 border border-[#e5e7eb] rounded-md flex items-center justify-center bg-white cursor-pointer text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#076600] transition-all" 
                            title="Editar"
                        >
                            <Edit size={14} />
                        </button>
                        <button 
                            onClick={() => setStatusModalEq(e)}
                            className="w-7 h-7 border border-[#e5e7eb] rounded-md flex items-center justify-center bg-white cursor-pointer text-[#6b7280] hover:bg-[#f9fafb] hover:text-[#076600] transition-all" 
                            title="Alterar Status"
                        >
                            <ArrowRightLeft size={14} />
                        </button>
                        <button 
                            onClick={() => handleDelete(e.prefixo)}
                            className="w-7 h-7 border border-[#e5e7eb] rounded-md flex items-center justify-center bg-white cursor-pointer text-[#6b7280] hover:bg-[#f9fafb] hover:text-red-500 transition-all" 
                            title="Excluir"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <EquipmentModal 
            equipment={editingEquipment} 
            onSave={handleSave} 
            onClose={() => { setIsModalOpen(false); setEditingEquipment(undefined); }} 
          />
        )}
        {statusModalEq && (
            <StatusUpdateModal 
                equipment={statusModalEq}
                onSave={(newStatus) => {
                    saveEquipments(equipments.map(e => e.prefixo === statusModalEq.prefixo ? {...e, status: newStatus} : e));
                    setStatusModalEq(undefined);
                }}
                onClose={() => setStatusModalEq(undefined)}
            />
        )}
      </AnimatePresence>
    </div>
  );
};

const PlanejamentoView = ({ equipments, allocations, works, saveAllocations }: { equipments: Equipment[], allocations: Allocation[], works: Work[], saveAllocations: (a: Allocation[]) => void }) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingAlloc, setEditingAlloc] = React.useState<Allocation | undefined>();
    const [filterObra, setFilterObra] = React.useState('');
    const [filterFamily, setFilterFamily] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState('Todos (Ativos)');
    const [expandedFamilies, setExpandedFamilies] = React.useState<string[]>([]);
    const [dateRange] = React.useState({
        start: startOfMonth(new Date()),
        end: addMonths(startOfMonth(new Date()), 11)
    });

    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    const worksList = works.map(w => w.nome).sort();
    const families = Array.from(new Set(equipments.map(e => e.familia))).sort();

    const filteredEquips = equipments.filter(eq => {
        const matchesObra = !filterObra || allocations.some(a => a.prefixo === eq.prefixo && a.obra === filterObra && (filterStatus === 'Todos' || a.statusAlocacao === filterStatus || (filterStatus === 'Todos (Ativos)' && a.statusAlocacao !== 'Cancelado')));
        const matchesFamily = !filterFamily || eq.familia === filterFamily;
        return matchesObra && matchesFamily;
    });

    const activeAllocations = allocations.filter(a => {
        if (filterStatus === 'Todos') return true;
        if (filterStatus === 'Todos (Ativos)') return a.statusAlocacao !== 'Cancelado';
        return a.statusAlocacao === filterStatus;
    });

    const groupedData = families.map(f => ({
        family: f,
        items: filteredEquips.filter(e => e.familia === f)
    })).filter(g => g.items.length > 0);

    // Initial expansion
    React.useEffect(() => {
        setExpandedFamilies(families);
    }, [equipments]);

    const stats = {
        locados: equipments.filter(e => e.status === 'Locado').length,
        disponiveis: equipments.filter(e => e.status === 'Disponível').length,
        planejados: allocations.filter(a => a.statusAlocacao === 'Planejado').length,
        manutencao: equipments.filter(e => e.status === 'Em Manutenção').length,
    };

    const toggleFamily = (f: string) => {
        setExpandedFamilies(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
    };

    const handleSave = (alloc: Allocation) => {
        if (editingAlloc) {
            saveAllocations(allocations.map(a => a.id === editingAlloc.id ? alloc : a));
        } else {
            saveAllocations([...allocations, alloc]);
        }
        setIsModalOpen(false);
        setEditingAlloc(undefined);
    };

    const handleDelete = (id: string) => {
        if (confirm('Deseja remover permanentemente esta alocação?')) {
            saveAllocations(allocations.filter(a => a.id !== id));
            setIsModalOpen(false);
            setEditingAlloc(undefined);
        }
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-[22px] font-medium text-gray-900 tracking-tight">Planejamento</h2>
                    <p className="text-[13px] text-[#6b7280] mt-1">Histograma de alocação de frota por obra</p>
                </div>
                <button 
                  onClick={() => { setEditingAlloc(undefined); setIsModalOpen(true); }}
                  className="bg-[#076600] text-white px-4 py-2 rounded-lg font-medium text-[13px] flex items-center gap-2 hover:bg-[#054f00] border-none outline-none transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={16} /> Planejar Alocação
                </button>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Locados */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#076600] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">LOCADOS</p>
                        <p className="text-[28px] font-medium leading-none text-[#076600] font-bold">{stats.locados}</p>
                    </div>
                    <div className="text-[12px] text-gray-500 font-medium">Equipamentos em operação</div>
                </div>

                {/* Disponíveis */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#1565c0] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">DISPONÍVEIS</p>
                        <p className="text-[28px] font-medium leading-none text-[#1565c0] font-bold">{stats.disponiveis}</p>
                    </div>
                    <div className="text-[12px] text-gray-500 font-medium">Prontos para alocação</div>
                </div>

                {/* Planejados */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#7c3aed] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">PLANEJADOS</p>
                        <p className="text-[28px] font-medium leading-none text-[#7c3aed] font-bold">{stats.planejados}</p>
                    </div>
                    <div className="text-[12px] text-gray-500 font-medium">Alocações programadas</div>
                </div>

                {/* Em Manutenção */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 border-l-[3px] border-l-[#d97706] shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between gap-3 transition-all hover:scale-[1.02]">
                    <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">EM MANUTENÇÃO</p>
                        <p className="text-[28px] font-medium leading-none text-[#d97706] font-bold">{stats.manutencao}</p>
                    </div>
                    <div className="text-[12px] text-gray-500 font-medium">Fora de serviço temporariamente</div>
                </div>
            </div>

            {/* Filters and Legend */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-[14px_16px] flex flex-col md:flex-row justify-between gap-4 items-center shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setExpandedFamilies(families)}
                            className="h-[36px] px-3 border border-[#e5e7eb] rounded-lg bg-white text-gray-700 hover:bg-[#f9fafb] hover:text-[#076600] text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <ChevronDown size={14} /> Expandir
                        </button>
                        <button 
                            onClick={() => setExpandedFamilies([])}
                            className="h-[36px] px-3 border border-[#e5e7eb] rounded-lg bg-white text-gray-700 hover:bg-[#f9fafb] hover:text-red-500 text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <ChevronUp size={14} /> Recolher
                        </button>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] bg-white rounded-full border border-[#e5e7eb] text-[13px] text-[#374151] cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                        <Filter size={13} className="text-gray-400 shrink-0" />
                        <select value={filterObra} onChange={e => setFilterObra(e.target.value)} className="h-[40px] bg-transparent rounded-full border-none outline-none text-[13px] font-medium text-[#374151] cursor-pointer appearance-none pr-4 focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10">
                            <option value="">Todas as Obras</option>
                            {worksList.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] bg-white rounded-full border border-[#e5e7eb] text-[13px] text-[#374151] cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                        <Filter size={13} className="text-gray-400 shrink-0" />
                        <select value={filterFamily} onChange={e => setFilterFamily(e.target.value)} className="h-[40px] bg-transparent rounded-full border-none outline-none text-[13px] font-medium text-[#374151] cursor-pointer appearance-none pr-4 focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10">
                            <option value="">Todas as Famílias</option>
                            {families.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 min-h-[42px] bg-white rounded-full border border-[#e5e7eb] text-[13px] text-[#374151] cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
                        <Filter size={13} className="text-gray-400 shrink-0" />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-[40px] bg-transparent rounded-full border-none outline-none text-[13px] font-medium text-[#374151] cursor-pointer appearance-none pr-4 focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10">
                            <option value="Todos (Ativos)">Todos (Ativos)</option>
                            <option value="Todos">Todos</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Planejado">Planejado</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setFilterObra('');
                            setFilterFamily('');
                            setFilterStatus('Todos (Ativos)');
                        }}
                        className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb] transition-colors shadow-sm"
                        title="Limpar filtros"
                    >
                        <Eraser size={16} />
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-4 text-[12px] text-[#6b7280] font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-[#076600] rounded-full"></span> Atual</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-[#2563eb] rounded-full"></span> Previsto</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-gray-200 rounded-full"></span> Disponível</div>
                </div>
            </div>

            {/* Gantt Table */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="sticky left-0 z-20 bg-white px-8 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em] border-r border-gray-100 min-w-[320px]">Equipamento</th>
                                {months.map(m => (
                                    <th key={m.toISOString()} className="px-4 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em] text-center min-w-[140px] border-l border-gray-100 bg-white">
                                        {format(m, 'MMM/yy', { locale: ptBR })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {groupedData.map(group => (
                                <React.Fragment key={group.family}>
                                    <tr 
                                        onClick={() => toggleFamily(group.family)}
                                        className="bg-[#f9fafb] cursor-pointer hover:bg-[#f3f4f6]/50 transition-colors border-b border-gray-100"
                                    >
                                        <td className="sticky left-0 z-20 bg-inherit px-8 py-3.5 border-r border-gray-100 font-semibold text-[#374151] text-[12px] uppercase tracking-[0.05em] flex items-center gap-2.5">
                                            {expandedFamilies.includes(group.family) ? <ChevronDown size={14} className="text-[#076600]" /> : <ChevronRight size={14} className="text-[#6b7280]" />}
                                            <span>{group.family}</span>
                                            <span className="ml-auto bg-[#e5e7eb] text-[#374151] px-2 py-0.5 rounded-full text-[11px] font-medium">{group.items.length}</span>
                                        </td>
                                        {months.map(m => <td key={m.toISOString()} className="bg-inherit border-l border-gray-50/50"></td>)}
                                    </tr>
                                    
                                    <AnimatePresence>
                                        {expandedFamilies.includes(group.family) && group.items.map(eq => {
                                            const eqAllocations = activeAllocations.filter(a => a.prefixo === eq.prefixo).sort((a, b) => new Date(a.dataMobilizacao).getTime() - new Date(b.dataMobilizacao).getTime());
                                            
                                            return (
                                                <motion.tr 
                                                    key={eq.prefixo}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="group hover:bg-[#f0faf0]/45 transition-colors"
                                                >
                                                    <td className="sticky left-0 z-10 bg-white group-hover:bg-[#f0faf0]/40 px-8 py-4 border-b border-r border-gray-100">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[12px] font-semibold text-[#076600]">{eq.prefixo}</span>
                                                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-normal">
                                                                    {getEquipmentLocation(eq.prefixo, allocations)}
                                                                </span>
                                                            </div>
                                                            <span className="text-[11px] text-[#9ca3af] leading-tight font-normal">{eq.descricao}</span>
                                                            <div className="flex mt-1">
                                                                <StatusBadge status={eq.status} className="scale-90 origin-left" />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {months.map(month => {
                                                        const startMonth = startOfMonth(month);
                                                        const endMonth = endOfMonth(month);
                                                        
                                                        const activeAllocs = eqAllocations.filter(a => {
                                                            const mob = parseISO(a.dataMobilizacao);
                                                            const desmob = a.dataDesmobilizacao ? parseISO(a.dataDesmobilizacao) : null;
                                                            return (mob <= endMonth) && (!desmob || desmob >= startMonth);
                                                        });

                                                        return (
                                                            <td key={month.toISOString()} className="p-0 border-b border-r border-gray-100 relative group/cell">
                                                                {activeAllocs.length > 0 ? (
                                                                    <div className="flex flex-col gap-1.5 p-2 h-full min-h-[70px] justify-center">
                                                                        {activeAllocs.map(alloc => (
                                                                            <motion.div 
                                                                                key={alloc.id}
                                                                                onClick={() => { setEditingAlloc(alloc); setIsModalOpen(true); }}
                                                                                className={cn(
                                                                                    "h-7 px-2.5 rounded-[6px] shadow-sm flex items-center justify-center cursor-pointer transition-all relative overflow-hidden",
                                                                                    alloc.statusAlocacao === 'Confirmado' ? "bg-[#076600]" : 
                                                                                    alloc.statusAlocacao === 'Planejado' ? "bg-[#2563eb]" : "bg-gray-400"
                                                                                )}
                                                                            >
                                                                                <span className="text-[11px] font-medium text-white uppercase tracking-[0.03em] truncate max-w-full">
                                                                                    {alloc.obra}
                                                                                </span>
                                                                            </motion.div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-full min-h-[70px] w-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                                        <Plus size={14} className="text-gray-200" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Allocation Drawer/Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col pt-4"
                        >
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 leading-tight">{editingAlloc ? 'Editar Alocação' : 'Nova Alocação'}</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Defina os detalhes de mobilização</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-gray-50 rounded-full transition-colors"><X size={20}/></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#fcfcfc]">
                                <AllocationForm 
                                    allocation={editingAlloc} 
                                    equipments={equipments} 
                                    works={works}
                                    onSave={handleSave} 
                                    onCancel={() => setIsModalOpen(false)} 
                                    onDelete={editingAlloc ? () => handleDelete(editingAlloc.id) : undefined}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AllocationForm = ({ allocation, equipments, works, onSave, onCancel, onDelete }: { allocation?: Partial<Allocation>, equipments: Equipment[], works: Work[], onSave: (a: Allocation) => void, onCancel: () => void, onDelete?: () => void }) => {
    const [formData, setFormData] = React.useState<Partial<Allocation>>({
        tipo: 'Atual',
        obra: '',
        statusAlocacao: 'Confirmado',
        prefixo: '',
        dataMobilizacao: new Date().toISOString(),
        dataDesmobilizacao: null,
        dataMobilizacaoReal: null,
        dataDesmobilizacaoReal: null,
        valorLocacao: 0,
        observacoes: '',
        ...allocation
    });

    const [errors, setErrors] = React.useState<{prefixo?: string, obra?: string, dataMobilizacao?: string}>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newErrors: any = {};
        if (!formData.prefixo) newErrors.prefixo = 'Equipamento é obrigatório';
        if (!formData.obra) newErrors.obra = 'Obra destino é obrigatória';
        if (formData.tipo === 'Previsto' && !formData.dataMobilizacao) newErrors.dataMobilizacao = 'Data prevista é obrigatória';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave({
            ...formData,
            id: formData.id || Math.random().toString(36).substr(2, 9),
            statusAlocacao: formData.statusAlocacao || (formData.tipo === 'Previsto' ? 'Planejado' : 'Confirmado'),
        } as Allocation);
    };

    const handleConfirmRealization = () => {
        const newData = {
            ...formData,
            statusAlocacao: 'Confirmado' as const,
            dataMobilizacaoReal: formData.dataMobilizacaoReal || new Date().toISOString()
        } as Allocation;
        
        if (formData.id) {
            onSave(newData);
        } else {
            setFormData(newData);
        }
    };

    const handleCancelPlanning = () => {
        if (confirm('Deseja cancelar este planejamento?')) {
            onSave({
                ...(formData as Allocation),
                statusAlocacao: 'Cancelado'
            });
            onCancel(); 
        }
    };

    const isConfirmed = formData.statusAlocacao === 'Confirmado';
    const isCancelled = formData.statusAlocacao === 'Cancelado';

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
            {/* Status Info */}
            <div className="flex items-center justify-between p-5 bg-white rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-50">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status da Alocação</span>
                <div className={cn(
                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border",
                    formData.statusAlocacao === 'Confirmado' ? "bg-green-100/50 text-green-700 border-green-200/50" :
                    formData.statusAlocacao === 'Planejado' ? "bg-blue-100/50 text-blue-700 border-blue-200/50" :
                    "bg-gray-100/50 text-gray-500 border-gray-200/50"
                )}>
                    {formData.statusAlocacao}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Equipamento</label>
                <select 
                    required 
                    disabled={!!allocation?.id}
                    value={formData.prefixo} 
                    onChange={e => {
                        const eq = equipments.find(eq => eq.prefixo === e.target.value);
                        setFormData({...formData, prefixo: e.target.value, valorLocacao: eq?.valorLocacao || 0});
                        if (errors.prefixo) setErrors({...errors, prefixo: undefined});
                    }}
                    className={cn(
                        "w-full px-4 py-4 bg-white rounded-full border shadow-sm focus:ring-4 focus:ring-[#076600]/5 outline-none font-bold text-gray-900 appearance-none",
                        errors.prefixo ? "border-red-500" : "border-gray-100"
                    )}
                >
                    <option value="">Selecione o prefixo...</option>
                    {equipments.map(eq => (
                        <option key={eq.prefixo} value={eq.prefixo}>{eq.prefixo} — {eq.familia}</option>
                    ))}
                </select>
                {errors.prefixo && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.prefixo}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Obra Destino</label>
                <select 
                    required 
                    value={formData.obra} 
                    onChange={e => {
                        setFormData({...formData, obra: e.target.value});
                        if (errors.obra) setErrors({...errors, obra: undefined});
                    }} 
                    className={cn(
                        "w-full px-4 py-4 bg-white rounded-full border shadow-sm focus:ring-4 focus:ring-blue-100/50 outline-none font-bold text-gray-900 appearance-none",
                        errors.obra ? "border-red-500" : "border-gray-100"
                    )}
                >
                    <option value="">Selecione a obra...</option>
                    {works.map(w => (
                        <option key={w.id} value={w.nome}>{w.nome}</option>
                    ))}
                </select>
                {errors.obra && <p className="text-[10px] font-bold text-red-500 ml-1">{errors.obra}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
                    <select 
                        value={formData.tipo} 
                        onChange={e => {
                            const newTipo = e.target.value as any;
                            setFormData({
                                ...formData, 
                                tipo: newTipo,
                                statusAlocacao: newTipo === 'Previsto' ? 'Planejado' : 'Confirmado'
                            });
                        }} 
                        className="w-full px-4 py-4 bg-white rounded-full border border-gray-100 shadow-sm outline-none font-bold appearance-none"
                    >
                        <option value="Atual">Atual</option>
                        <option value="Previsto">Previsto</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Locação (R$)</label>
                    <input type="number" required value={formData.valorLocacao} onChange={e => setFormData({...formData, valorLocacao: Number(e.target.value)})} className="w-full px-4 py-4 bg-white rounded-full border border-gray-100 shadow-sm focus:ring-4 focus:ring-[#076600]/10 outline-none font-black text-[#076600]" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-6 bg-white rounded-2xl border border-gray-50 shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-[#2563eb] uppercase tracking-widest block mb-2">Previsto</span>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mobilização</label>
                                <input 
                                    type="date" 
                                    required={formData.tipo === 'Previsto'} 
                                    value={formData.dataMobilizacao ? format(parseISO(formData.dataMobilizacao), 'yyyy-MM-dd') : ''} 
                                    onChange={e => {
                                        setFormData({...formData, dataMobilizacao: e.target.value ? new Date(e.target.value).toISOString() : ''});
                                        if (errors.dataMobilizacao) setErrors({...errors, dataMobilizacao: undefined});
                                    }} 
                                    className={cn(
                                        "w-full px-3 py-2 bg-[#f8fafc] border rounded-full outline-none text-sm font-bold",
                                        errors.dataMobilizacao ? "border-red-500" : "border-none"
                                    )} 
                                />
                                {errors.dataMobilizacao && <p className="text-[9px] font-bold text-red-500">{errors.dataMobilizacao}</p>}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-[#2563eb] uppercase tracking-widest invisible block mb-2">Previsto</span>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Desmobilização</label>
                                <input type="date" value={formData.dataDesmobilizacao ? format(parseISO(formData.dataDesmobilizacao), 'yyyy-MM-dd') : ''} onChange={e => setFormData({...formData, dataDesmobilizacao: e.target.value ? new Date(e.target.value).toISOString() : null})} className="w-full px-3 py-2 bg-[#f8fafc] border-none rounded-full outline-none text-sm font-bold" />
                            </div>
                        </div>
                    </div>

                    {isConfirmed && (
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-dashed border-gray-100">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-[#076600] uppercase tracking-widest block mb-2">Realizado</span>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mobilização</label>
                                    <input type="date" required value={formData.dataMobilizacaoReal ? format(parseISO(formData.dataMobilizacaoReal), 'yyyy-MM-dd') : ''} onChange={e => setFormData({...formData, dataMobilizacaoReal: new Date(e.target.value).toISOString()})} className="w-full px-3 py-2 bg-green-50/50 border-none rounded-lg outline-none text-sm font-black text-[#076600]" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-[#076600] uppercase tracking-widest invisible block mb-2">Realizado</span>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Desmobilização</label>
                                    <input type="date" value={formData.dataDesmobilizacaoReal ? format(parseISO(formData.dataDesmobilizacaoReal), 'yyyy-MM-dd') : ''} onChange={e => setFormData({...formData, dataDesmobilizacaoReal: e.target.value ? new Date(e.target.value).toISOString() : null})} className="w-full px-3 py-2 bg-green-50/50 border-none rounded-lg outline-none text-sm font-black text-[#076600]" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações</label>
                <textarea rows={3} value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} className="w-full px-4 py-4 bg-white rounded-[12px] border border-gray-100 shadow-sm focus:ring-4 focus:ring-gray-100 outline-none font-bold resize-none" />
            </div>

            <div className="pt-8 space-y-4">
                {!isConfirmed && !isCancelled && (
                    <button 
                        type="button" 
                        onClick={handleConfirmRealization}
                        className="w-full py-5 text-xs font-black uppercase tracking-widest text-[#076600] bg-green-50 hover:bg-green-100 rounded-full border border-green-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={16}/> Confirmar Realização
                    </button>
                )}
                
                <button type="submit" className="w-full py-5 text-xs font-black uppercase tracking-widest text-white bg-[#076600] rounded-full shadow-xl shadow-green-900/10 hover:scale-[1.01] transition-all">
                    {allocation?.id ? 'Salvar Alterações' : 'Confirmar Alocação'}
                </button>

                {!isCancelled && formData.id && (
                    <button 
                        type="button" 
                        onClick={handleCancelPlanning}
                        className="w-full py-4 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-full transition-all border border-transparent flex items-center justify-center gap-2"
                    >
                        <Slash size={14}/> Cancelar Planejamento
                    </button>
                )}

                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-50">
                    <button type="button" onClick={onCancel} className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 rounded-full transition-all">Fechar</button>
                    {onDelete && <button type="button" onClick={onDelete} className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-red-500 rounded-full transition-all">Excluir Permanente</button>}
                </div>
            </div>
        </form>
    );
};

const PrevisaoView = ({ equipments, allocations, works }: { equipments: Equipment[], allocations: Allocation[], works: Work[] }) => {
    const [period, setPeriod] = React.useState(12);
    const [filterType, setFilterType] = React.useState('Todos');
    const [filterObra, setFilterObra] = React.useState('');
    const [filterFamily, setFilterFamily] = React.useState('');
    const [efficiency, setEfficiency] = React.useState(100);

    const start = startOfMonth(new Date());
    const months = Array.from({ length: period }, (_, i) => addMonths(start, i));

    const obras = works.map(w => w.nome).sort();
    const families = Array.from(new Set(equipments.map(e => e.familia))).sort();

    const data = equipments.map(eq => {
        const eqAllocs = allocations.filter(a => a.prefixo === eq.prefixo);
        const monthlyValues = months.map(m => {
            const startM = startOfMonth(m);
            const endM = endOfMonth(m);
            const activeAlloc = eqAllocs.find(a => {
                const mob = parseISO(a.dataMobilizacao);
                const desmob = a.dataDesmobilizacao ? parseISO(a.dataDesmobilizacao) : null;
                const overlaps = (mob <= endM) && (!desmob || desmob >= startM);
                const isNotCancelled = a.statusAlocacao !== 'Cancelado';
                
                const matchesType = filterType === 'Todos' || a.tipo === filterType;
                const matchesObra = !filterObra || a.obra === filterObra;
                
                return overlaps && isNotCancelled && matchesType && matchesObra;
            });

            return {
                value: activeAlloc ? activeAlloc.valorLocacao : 0,
                obra: activeAlloc?.obra || '',
                tipo: activeAlloc?.tipo || ''
            };
        });

        return {
            ...eq,
            monthlyValues
        };
    }).filter(row => {
        const matchesFamily = !filterFamily || row.familia === filterFamily;
        const hasRevenue = row.monthlyValues.some(v => v.value > 0);
        return matchesFamily && hasRevenue;
    });

    const totals = months.map((_, i) => data.reduce((sum, row) => sum + row.monthlyValues[i].value, 0));
    const effectiveTotals = totals.map(t => t * efficiency / 100);
    const effectiveTotal = effectiveTotals.reduce((sum, value) => sum + value, 0);

    const exportToCSV = () => {
        const headers = ['Prefixo', 'Equipamento', ...months.map(m => format(m, 'MMM/yy', { locale: ptBR }))];
        const rows = data.map(row => [
            row.prefixo,
            row.familia,
            ...row.monthlyValues.map(v => v.value.toString())
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "previsao_receitas_cortez.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-[22px] font-medium text-gray-900 leading-tight">Previsão de Receitas</h2>
                    <p className="text-[13px] text-[#6b7280] mt-1">
                        Estimativa baseada no planejamento vigente
                    </p>
                </div>
                <button 
                  onClick={exportToCSV}
                  className="bg-[#076600] text-white px-4 py-2 rounded-lg font-medium text-[13px] flex items-center gap-2 hover:bg-[#054f00] border-none outline-none transition-all active:scale-95 cursor-pointer"
                >
                  <Plus size={16}/> Exportar CSV
                </button>
            </header>

            <div className="bg-white border border-[#e5e7eb] rounded-xl p-[16px_20px] flex flex-wrap gap-6 items-center shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                <div className="flex flex-col">
                    <label className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-[6px] ml-1">PERÍODO</label>
                    <div className="bg-white rounded-full border border-[#e5e7eb] px-[16px] py-[8px] text-[13px] text-[#374151] cursor-pointer inline-flex items-center gap-2 min-h-[44px] hover:border-gray-300 transition-colors shadow-sm">
                        <Clock size={14} className="text-gray-400 shrink-0" />
                        <select value={period} onChange={e => setPeriod(Number(e.target.value))} className="h-[40px] bg-transparent rounded-full border-none outline-none text-[13px] font-medium text-[#374151] cursor-pointer appearance-none pr-4 focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10">
                            <option value={6}>Próximos 6 meses</option>
                            <option value={12}>Próximos 12 meses</option>
                            <option value={24}>Próximos 24 meses</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-col">
                    <label className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-[6px] ml-1">OBRA</label>
                    <div className="bg-white rounded-full border border-[#e5e7eb] px-[16px] py-[8px] text-[13px] text-[#374151] cursor-pointer inline-flex items-center gap-2 min-h-[44px] hover:border-gray-300 transition-colors shadow-sm">
                        <Building2 size={14} className="text-gray-400 shrink-0" />
                        <select value={filterObra} onChange={e => setFilterObra(e.target.value)} className="h-[40px] bg-transparent rounded-full border-none outline-none text-[13px] font-medium text-[#374151] cursor-pointer appearance-none pr-4 focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10">
                            <option value="">Todas as Obras</option>
                            {obras.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex flex-col">
                    <label className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-[6px] ml-1">STATUS</label>
                    <div className="bg-white rounded-full border border-[#e5e7eb] px-[16px] py-[8px] text-[13px] text-[#374151] cursor-pointer inline-flex items-center gap-2 min-h-[44px] hover:border-gray-300 transition-colors shadow-sm">
                        <Filter size={14} className="text-gray-400 shrink-0" />
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-[40px] bg-transparent rounded-full border-none outline-none text-[13px] font-medium text-[#374151] cursor-pointer appearance-none pr-4 focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10">
                            <option value="Todos">Todas</option>
                            <option value="Atual">Status Atual</option>
                            <option value="Previsto">Previsto</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-col">
                    <label className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-[6px] ml-1">EFICIÊNCIA</label>
                    <div className="bg-white rounded-full border border-[#e5e7eb] px-[16px] py-[8px] text-[13px] text-[#374151] cursor-pointer inline-flex items-center gap-2 min-h-[44px] hover:border-gray-300 transition-colors shadow-sm">
                        <Percent size={14} className="text-gray-400 shrink-0" />
                        <select value={efficiency} onChange={e => setEfficiency(Number(e.target.value))} className="h-[40px] bg-transparent rounded-full border-none outline-none text-[13px] font-medium text-[#374151] cursor-pointer appearance-none pr-4 focus:border-[#076600] focus:ring-2 focus:ring-[#076600]/10">
                            {[100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50].map(value => (
                                <option key={value} value={value}>{value}%</option>
                            ))}
                        </select>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setPeriod(12);
                        setFilterType('Todos');
                        setFilterObra('');
                        setFilterFamily('');
                        setEfficiency(100);
                    }}
                    className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-white border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb] transition-colors shadow-sm"
                    title="Limpar filtros"
                >
                    <Eraser size={16} />
                </button>

                <div className="md:ml-auto bg-white border border-[#e5e7eb] rounded-2xl p-[20px_24px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-col min-w-[280px]">
                    <span className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#6b7280] mb-1">RECEITA TOTAL PREVISTA</span>
                    <span className="text-[32px] font-bold text-[#076600] leading-none mt-1">
                        {formatCurrency(effectiveTotal)}
                    </span>
                    <span className="mt-2 text-[11px] text-[#6b7280]">Valor ajustado em {efficiency}% de eficiência</span>
                </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse border-spacing-0">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="sticky left-0 z-20 bg-[#f9fafb] px-8 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em] border-r border-[#e5e7eb] min-w-[280px]">Equipamento</th>
                                {months.map(m => (
                                    <th key={m.toISOString()} className="px-6 py-4 text-[11px] font-medium text-[#6b7280] uppercase tracking-[0.05em] text-right min-w-[150px] border-l border-gray-100 bg-[#f9fafb]">
                                        {format(m, 'MMM/yy', { locale: ptBR })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb]">
                            {data.map(row => (
                                <tr key={row.prefixo} className="hover:bg-[#f0faf0] transition-colors group">
                                    <td className="sticky left-0 z-10 bg-white group-hover:bg-[#f0faf0]/45 px-8 py-4 border-r border-[#e5e7eb] shadow-[4px_0_12px_rgba(0,0,0,0.01)]">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[12px] font-semibold text-[#076600]">{row.prefixo}</span>
                                            <span className="text-[12px] text-[#6b7280] leading-tight font-normal">{row.familia}</span>
                                        </div>
                                    </td>
                                    {row.monthlyValues.map((v, i) => {
                                        const adjustedValue = v.value * efficiency / 100;
                                        return (
                                            <td key={i} className={cn(
                                                "px-6 py-4 text-right border-l border-gray-50/50",
                                                adjustedValue > 0 ? "text-[13px] font-medium text-[#111827]" : "text-[13px] text-[#d1d5db]"
                                            )}>
                                                {formatCurrency(adjustedValue)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-[#f9fafb] border-t border-[#e5e7eb]">
                                <td className="sticky left-0 z-10 bg-[#f9fafb] px-8 py-5 font-semibold text-[#111827] text-[11px] uppercase tracking-[0.05em] border-r border-[#e5e7eb]">Total Mensal</td>
                                {effectiveTotals.map((t, i) => (
                                    <td key={i} className="px-6 py-5 text-right font-semibold text-[#076600] text-[13px] whitespace-nowrap border-l border-gray-100">
                                        {formatCurrency(t)}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- App Root ---

export default function App() {
  const [activeTab, setActiveTab] = React.useState('equipamentos');
  const { equipments, allocations, works, lastModified, saveEquipments, saveAllocations, saveWorks, isLoaded } = useStore();

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#076600] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#076600] animate-pulse">Carregando Cortez Rental...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 font-sans selection:bg-[#076600] selection:text-white pt-[52px]">
      <Topbar activeTab={activeTab} setActiveTab={setActiveTab} lastModified={lastModified} />
      
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
            {activeTab === 'equipamentos' && <EquipamentosView equipments={equipments} saveEquipments={saveEquipments} allocations={allocations} />}
            {activeTab === 'obras' && <ObrasView works={works} saveWorks={saveWorks} />}
            {activeTab === 'planejamento' && <PlanejamentoView equipments={equipments} allocations={allocations} works={works} saveAllocations={saveAllocations} />}
            {activeTab === 'previsao' && <PrevisaoView equipments={equipments} allocations={allocations} works={works} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
