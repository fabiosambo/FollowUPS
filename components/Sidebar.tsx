import React from 'react';
import { ViewState, ImportStatus } from '../types';
import { LayoutDashboard, AlertTriangle, Flame, Clock, PackageCheck, List, MapPin, Trash2, Box } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  counts: Record<string, number>;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, counts }) => {
  
  // Logical Grouping
  const overviewItems = [
    { id: 'HOME', label: 'Dashboard', icon: LayoutDashboard, colorClass: 'text-gray-200' },
    { id: 'ALL', label: 'Lista Completa', icon: List, colorClass: 'text-indigo-400' },
  ];

  const priorityItems = [
    { id: ImportStatus.ATRASADO, label: 'Atrasados', icon: Clock, colorClass: 'text-red-500' },
    { id: ImportStatus.CRITICO, label: 'Críticos', icon: Flame, colorClass: 'text-orange-500' },
    { id: ImportStatus.ALERTA, label: 'Alertas', icon: AlertTriangle, colorClass: 'text-amber-400' },
  ];

  const monitoringItems = [
    { id: ImportStatus.PRODUCAO, label: 'Em Produção', icon: Box, colorClass: 'text-blue-500' },
    { id: ImportStatus.EMBARCADO, label: 'Embarcados', icon: PackageCheck, colorClass: 'text-emerald-500' },
    { id: ImportStatus.NACIONAL, label: 'Nacionais', icon: MapPin, colorClass: 'text-green-500' },
  ];

  const renderMenuItem = (item: any) => {
    const isActive = currentView === item.id;
    let count;
    if (item.id === 'HOME') count = null;
    else if (item.id === 'ALL') count = counts.totalImported + counts.totalNational;
    else count = counts[item.id];

    return (
      <button
        key={item.id}
        onClick={() => onChangeView(item.id as ViewState)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all text-sm mb-1 group ${
          isActive 
            ? 'bg-gray-800 text-white font-medium shadow-sm' 
            : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Icon with specific color */}
          <item.icon 
            size={18} 
            className={`${item.colorClass} ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'} transition-opacity`} 
            strokeWidth={2} 
          />
          <span>{item.label}</span>
        </div>
        
        {count !== null && count !== undefined && count > 0 && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
             isActive 
              ? 'bg-white text-black border-white' 
              : 'bg-transparent text-gray-500 border-gray-700 group-hover:border-gray-500 group-hover:text-gray-400'
          }`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-[#111114] h-screen flex flex-col sticky top-0 font-sans border-r border-gray-800 shrink-0">
      
      {/* Header */}
      <div 
        className="h-20 flex items-center px-6 cursor-pointer" 
        onClick={() => onChangeView('HOME')}
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-1.5 rounded text-sm shadow-lg shadow-indigo-500/20">
            <Box size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-base font-bold text-white tracking-wide">Logotype</h1>
        </div>
      </div>
      
      {/* Nav Content */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar space-y-8">
        
        <div>
           <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Visão Geral</p>
           {overviewItems.map(renderMenuItem)}
        </div>

        <div>
           <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Ação Necessária</p>
           {priorityItems.map(renderMenuItem)}
        </div>

        <div>
           <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Monitoramento</p>
           {monitoringItems.map(renderMenuItem)}
        </div>

      </nav>

      {/* Footer / Trash */}
      <div className="p-4 border-t border-gray-800">
         <button
            onClick={() => onChangeView('EXCLUIDOS')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors group ${
              currentView === 'EXCLUIDOS' 
                ? 'text-white bg-gray-800' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
          >
            <Trash2 size={18} className="text-gray-500 group-hover:text-red-400 transition-colors" />
            <span>Lixeira</span>
            {counts.totalExcluded > 0 && (
              <span className="ml-auto text-[10px] text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                 {counts.totalExcluded}
              </span>
            )}
          </button>
          
          <div className="mt-4 flex items-center gap-3 px-2 pt-2">
            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-indigo-400 text-xs font-bold border border-gray-700 shadow-sm">
               AS
            </div>
            <div className="flex flex-col">
               <span className="text-xs font-medium text-gray-300">Admin User</span>
               <span className="text-[10px] text-gray-600">Comprador Sênior</span>
            </div>
          </div>
      </div>
    </aside>
  );
};

export default Sidebar;