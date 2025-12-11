import React, { useState, useMemo } from 'react';
import { ImportItem, ImportStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Search, Check, Undo2, Trash2, RefreshCw, Filter, X, Calendar, Box, Truck, Clock, AlertTriangle, Flame } from 'lucide-react';

interface Props {
  items: ImportItem[];
  onMarkShipped: (id: string) => void;
  onUnmarkShipped: (id: string) => void;
  onExclude: (id: string) => void;
  onRestore: (id: string) => void;
  title: string;
  isNationalView?: boolean;
  isExcludedView?: boolean;
}

// Priority Map for Sorting
const STATUS_PRIORITY: Record<string, number> = {
  [ImportStatus.ATRASADO]: 1,
  [ImportStatus.CRITICO]: 2,
  [ImportStatus.ALERTA]: 3,
  [ImportStatus.PRODUCAO]: 4,
  [ImportStatus.EMBARCADO]: 5,
  [ImportStatus.NACIONAL]: 6,
};

const DataTable: React.FC<Props> = ({ items, onMarkShipped, onUnmarkShipped, onExclude, onRestore, title, isNationalView, isExcludedView }) => {
  // Global Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quick Filters State
  const [supplierFilter, setSupplierFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // Extract Unique Suppliers for Dropdown
  const uniqueSuppliers = useMemo(() => {
    const suppliers = items
      .map(i => i.RAZAO_FORNEC)
      .filter((val): val is string => !!val && val !== '-');
    return Array.from(new Set(suppliers)).sort();
  }, [items]);

  // Extract Unique Statuses present in current view
  const uniqueStatuses = useMemo(() => {
    const statuses = items.map(i => i.status);
    return Array.from(new Set(statuses));
  }, [items]);

  // Combined Filter Logic + Sorting
  const processedItems = useMemo(() => {
    // 1. Filtering
    const filtered = items.filter(item => {
      const matchesSearch = 
        searchTerm === '' ||
        String(item.NUMERO_SC || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.NUMERO_PO).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.NUMERO_PC).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.RAZAO_FORNEC).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.DESCR_PROD).toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (supplierFilter && item.RAZAO_FORNEC !== supplierFilter) return false;
      if (productFilter && !String(item.DESCR_PROD).toLowerCase().includes(productFilter.toLowerCase())) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (startDate) {
        const start = startOfDay(parseISO(startDate));
        if (isBefore(item.NECESS_PC, start)) return false;
      }
      if (endDate) {
        const end = endOfDay(parseISO(endDate));
        if (isAfter(item.NECESS_PC, end)) return false;
      }
      return true;
    });

    // 2. Sorting (By Urgency Priority, then by Days)
    return filtered.sort((a, b) => {
      // Primary: Status Priority
      const prioA = STATUS_PRIORITY[a.status] || 99;
      const prioB = STATUS_PRIORITY[b.status] || 99;
      if (prioA !== prioB) return prioA - prioB;

      // Secondary: Days for Necessity (Ascending - closer dates first)
      return a.DIAS_PARA_NECESS - b.DIAS_PARA_NECESS;
    });
  }, [items, searchTerm, supplierFilter, productFilter, startDate, endDate, statusFilter]);

  // Calculate Mini Stats for the visible table
  const tableStats = useMemo(() => {
    return processedItems.reduce((acc, item) => {
      acc.total++;
      if (item.status === ImportStatus.ATRASADO) acc.atrasado++;
      if (item.status === ImportStatus.CRITICO) acc.critico++;
      if (item.status === ImportStatus.ALERTA) acc.alerta++;
      if (item.status === ImportStatus.PRODUCAO) acc.producao++;
      if (item.status === ImportStatus.EMBARCADO) acc.embarcado++;
      return acc;
    }, { total: 0, atrasado: 0, critico: 0, alerta: 0, producao: 0, embarcado: 0 });
  }, [processedItems]);

  const clearFilters = () => {
    setSupplierFilter('');
    setProductFilter('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setSearchTerm('');
  };

  const hasActiveFilters = supplierFilter || productFilter || startDate || endDate || statusFilter || searchTerm;

  // Helper for Row Colors - CLEAN DESIGN / NEUTRAL BACKGROUNDS
  const getRowClass = (status: ImportStatus) => {
    if (isExcludedView) return 'bg-white opacity-60 hover:opacity-100';
    
    // Using border-left to indicate status instead of full background
    switch (status) {
      case ImportStatus.ATRASADO: return 'bg-white hover:bg-red-50/20 border-l-4 border-l-red-500';
      case ImportStatus.CRITICO: return 'bg-white hover:bg-orange-50/20 border-l-4 border-l-orange-500';
      case ImportStatus.ALERTA: return 'bg-white hover:bg-yellow-50/20 border-l-4 border-l-yellow-400';
      case ImportStatus.PRODUCAO: return 'bg-white hover:bg-blue-50/20 border-l-4 border-l-blue-400';
      case ImportStatus.EMBARCADO: return 'bg-white hover:bg-emerald-50/20 border-l-4 border-l-emerald-500';
      case ImportStatus.NACIONAL: return 'bg-white hover:bg-green-50/20 border-l-4 border-l-green-600';
      default: return 'bg-white hover:bg-gray-50';
    }
  };

  // Helper to calculate bar width and color for Gantt
  const getTimelineProps = (days: number) => {
    // Assumption: 90 days is the "safe" window start. 
    // If days > 90, bar is empty. If days <= 0, bar is full.
    let percentage = 0;
    
    if (days < 0) percentage = 100; // Late
    else if (days > 90) percentage = 5; // Very far out
    else percentage = 100 - ((days / 90) * 100);

    let colorClass = 'bg-blue-400';
    if (days < 0) colorClass = 'bg-red-500';
    else if (days < 30) colorClass = 'bg-orange-500';
    else if (days < 60) colorClass = 'bg-yellow-400';

    return { width: `${Math.max(5, percentage)}%`, colorClass };
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Header Area */}
      <div className="p-6 border-b border-gray-100 flex flex-col gap-5">
        
        {/* Title & Global Search Row */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {title} 
            </h2>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-all ${showFilters ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              <Filter size={16} />
              <span>Filtros</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Busca global..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        {!isExcludedView && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-medium text-gray-600 bg-gray-50/80 p-3 rounded-xl border border-gray-100/50 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded">
              <Clock size={14} /> Atrasados: <b>{tableStats.atrasado}</b>
            </div>
            <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <Flame size={14} /> Críticos: <b>{tableStats.critico}</b>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              <AlertTriangle size={14} /> Alerta: <b>{tableStats.alerta}</b>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <Box size={14} /> Produção: <b>{tableStats.producao}</b>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              <Truck size={14} /> Embarcados: <b>{tableStats.embarcado}</b>
            </div>
             <div className="flex items-center gap-1.5 text-gray-700 ml-auto pl-4 border-l border-gray-200">
              Total: <b>{tableStats.total}</b>
            </div>
          </div>
        )}

        {/* Quick Filters Bar */}
        {showFilters && (
          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 animate-fade-in-down">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              
              {/* Fornecedor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Fornecedor</label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <select 
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Todos</option>
                    {uniqueSuppliers.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Produto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Produto</label>
                <div className="relative">
                  <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text"
                    placeholder="Contém..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Todos</option>
                  {uniqueStatuses.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Data Inicio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Necessidade (De)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-9 pr-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-600"
                  />
                </div>
              </div>

              {/* Data Fim */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Necessidade (Até)</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-600"
                />
              </div>

            </div>
            
            {/* Clear Button */}
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={clearFilters}
                  className="text-xs flex items-center gap-1.5 text-red-500 hover:text-red-700 font-bold bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <X size={14} />
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">SC</th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">PC / PO</th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Fornecedor</th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Produto</th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Vol</th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Necessidade SC</th>
              <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Necessidade PC</th>
              
              {(!isNationalView || isExcludedView) && (
                <>
                  <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider w-40">Timeline / Prazo</th>
                  <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="py-5 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {processedItems.length === 0 ? (
              <tr>
                <td colSpan={isNationalView ? 7 : 10} className="py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-gray-50 p-4 rounded-full">
                       <Filter size={24} className="text-gray-300" />
                    </div>
                    <p className="text-sm">Nenhum item encontrado.</p>
                  </div>
                </td>
              </tr>
            ) : (
              processedItems.map((item) => {
                const timelineProps = getTimelineProps(item.DIAS_PARA_NECESS);
                
                return (
                  <tr 
                    key={item.id} 
                    className={`transition-all duration-200 text-sm border-b border-gray-50 last:border-0 ${getRowClass(item.status)}`}
                  >
                    <td className="py-5 px-6 text-gray-600 font-mono text-xs">{item.NUMERO_SC || '-'}</td>
                    <td className="py-5 px-6 text-gray-900 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-800 text-base">{item.NUMERO_PC}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono tracking-wide">
                              {item.status === ImportStatus.NACIONAL ? '-' : item.NUMERO_PO}
                            </span>
                            {item.status === ImportStatus.NACIONAL ? (
                              <span className="w-2 h-2 rounded-full bg-green-500" title="Nacional"></span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-indigo-500" title="Importado"></span>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-gray-600 truncate max-w-[180px]" title={item.RAZAO_FORNEC}>
                      <span className="font-semibold text-gray-700">{item.RAZAO_FORNEC}</span>
                    </td>
                    <td className="py-5 px-6 text-gray-500 truncate max-w-[240px]" title={item.DESCR_PROD}>
                      {item.DESCR_PROD}
                    </td>
                    <td className="py-5 px-6 text-gray-600 font-mono text-xs">{item.VOLUME_PC}</td>
                    
                    {/* NECESS_SC Column */}
                    <td className="py-5 px-6 text-gray-600 whitespace-nowrap bg-gray-50/30">
                      {item.NECESS_SC ? (
                        <div className="flex items-center gap-2 text-gray-600 font-medium">
                          <Calendar size={14} className="text-blue-400" />
                          {format(item.NECESS_SC, 'dd/MM/yyyy')}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    
                    {/* NECESS_PC Column */}
                    <td className="py-5 px-6 text-gray-600 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {format(item.NECESS_PC, 'dd/MM/yyyy')}
                      </div>
                    </td>
                    
                    {(!isNationalView || isExcludedView) && (
                      <>
                        {/* Timeline / Prazo Visual Column (Gantt-like) */}
                        <td className="py-5 px-6">
                          {!isNationalView && (
                            <div className="flex flex-col w-36 gap-1.5">
                              {/* Header: Days Large & Bold */}
                              <div className="flex justify-between items-baseline">
                                <span className={`text-lg font-black tracking-tight ${
                                  item.DIAS_PARA_NECESS < 0 ? 'text-red-600' : 
                                  item.DIAS_PARA_NECESS < 30 ? 'text-orange-500' : 'text-gray-700'
                                }`}>
                                  {item.DIAS_PARA_NECESS}d
                                </span>
                                <span className="text-[10px] uppercase font-bold text-gray-400">Restante</span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${timelineProps.colorClass}`}
                                  style={{ width: timelineProps.width }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>
                        
                        <td className="py-5 px-6">
                          <StatusBadge status={item.status} />
                        </td>
                        
                        <td className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-60 hover:opacity-100 transition-opacity">
                            {isExcludedView ? (
                              <button
                                onClick={() => onRestore(item.id)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Restaurar item"
                              >
                                <RefreshCw size={16} />
                              </button>
                            ) : (
                              <>
                                {/* Action Buttons */}
                                {item.status === ImportStatus.EMBARCADO ? (
                                  <button 
                                    onClick={() => onUnmarkShipped(item.id)}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                    title="Remover do embarcado"
                                  >
                                    <Undo2 size={16} />
                                  </button>
                                ) : (
                                  item.status !== ImportStatus.NACIONAL && (
                                    <button 
                                      onClick={() => onMarkShipped(item.id)}
                                      className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                      title="Marcar como Embarcado"
                                    >
                                      <Check size={16} />
                                    </button>
                                  )
                                )}

                                <button 
                                  onClick={() => onExclude(item.id)}
                                  className="p-2 bg-white border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                                  title="Excluir item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;