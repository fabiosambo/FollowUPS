import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import DashboardHome from './components/DashboardHome';
import DataTable from './components/DataTable';
import { processExcelData, saveShippedItem, removeShippedItem, calculateStatus, saveExcludedItem, removeExcludedItem } from './services/importLogic';
import { ImportItem, ImportStatus, ViewState, DashboardStats } from './types';
import { UploadCloud, FileSpreadsheet, Loader2, Bell } from 'lucide-react';

const App: React.FC = () => {
  const [items, setItems] = useState<ImportItem[]>([]);
  const [view, setView] = useState<ViewState>('HOME');
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Filter out excluded items for general stats and dashboard view
  const activeItems = useMemo(() => items.filter(i => !i.isExcluded), [items]);
  const excludedItems = useMemo(() => items.filter(i => i.isExcluded), [items]);

  // Calculate Stats derived from ACTIVE items only
  const stats: DashboardStats = useMemo(() => {
    const initial = {
      totalImported: 0,
      totalNational: 0,
      atrasado: 0,
      critico: 0,
      alerta: 0,
      producao: 0,
      embarcado: 0,
      followUpNeeded: 0
    };

    return activeItems.reduce((acc, item) => {
      if (item.status === ImportStatus.NACIONAL) {
        acc.totalNational++;
      } else {
        acc.totalImported++;
        // Count by Status for Imported
        if (item.status === ImportStatus.ATRASADO) acc.atrasado++;
        if (item.status === ImportStatus.CRITICO) acc.critico++;
        if (item.status === ImportStatus.ALERTA) acc.alerta++;
        if (item.status === ImportStatus.PRODUCAO) acc.producao++;
        if (item.status === ImportStatus.EMBARCADO) acc.embarcado++;

        // Follow up Logic: Critico or Alerta (and not shipped)
        if (item.status === ImportStatus.CRITICO || item.status === ImportStatus.ALERTA) {
          acc.followUpNeeded++;
        }
      }
      return acc;
    }, initial);
  }, [activeItems]);

  // Counts for Sidebar
  const sidebarCounts = useMemo(() => ({
    [ImportStatus.ATRASADO]: stats.atrasado,
    [ImportStatus.CRITICO]: stats.critico,
    [ImportStatus.ALERTA]: stats.alerta,
    [ImportStatus.PRODUCAO]: stats.producao,
    [ImportStatus.EMBARCADO]: stats.embarcado,
    [ImportStatus.NACIONAL]: stats.totalNational,
    totalImported: stats.totalImported,
    totalNational: stats.totalNational,
    totalExcluded: excludedItems.length
  }), [stats, excludedItems]);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    
    try {
      const data = await processExcelData(file);
      setItems(data);
      setView('HOME'); // Reset to home on new upload
    } catch (error) {
      console.error("Error processing file", error);
      alert("Erro ao processar planilha. Verifique o formato.");
    } finally {
      setIsLoading(false);
    }
  };

  // Mark as Shipped Handler (Imported only)
  const handleMarkShipped = (id: string) => {
    saveShippedItem(id);
    setItems(prev => prev.map(item => {
      if (item.id === id && item.status !== ImportStatus.NACIONAL) {
        return {
          ...item,
          status: ImportStatus.EMBARCADO,
          DATA_CHECK_EMBARQUE: new Date().toISOString()
        };
      }
      return item;
    }));
  };

  // Unmark Shipped Handler
  const handleUnmarkShipped = (id: string) => {
    removeShippedItem(id);
    setItems(prev => prev.map(item => {
      if (item.id === id && item.status === ImportStatus.EMBARCADO) {
        return {
          ...item,
          status: calculateStatus(item.DIAS_PARA_NECESS),
          DATA_CHECK_EMBARQUE: undefined
        };
      }
      return item;
    }));
  };

  // Exclude Item Handler
  const handleExclude = (id: string) => {
    saveExcludedItem(id);
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isExcluded: true };
      }
      return item;
    }));
  };

  // Restore Item Handler
  const handleRestore = (id: string) => {
    removeExcludedItem(id);
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isExcluded: false };
      }
      return item;
    }));
  };

  // Get items for current view
  const displayedItems = useMemo(() => {
    if (view === 'HOME') return [];
    
    // Special Case: Excluded view shows ONLY excluded items
    if (view === 'EXCLUIDOS') return excludedItems;

    // General Views show ONLY active items
    if (view === 'ALL') return activeItems;
    
    return activeItems.filter(item => item.status === view);
  }, [view, activeItems, excludedItems]);

  // Get Title for Table
  const getTableTitle = () => {
    switch (view) {
      case 'ALL': return 'Todos os Itens';
      case ImportStatus.ATRASADO: return 'Itens Importados - Atrasados';
      case ImportStatus.CRITICO: return 'Itens Importados - Críticos (<35 dias)';
      case ImportStatus.ALERTA: return 'Itens Importados - Alerta Follow-up (35-60 dias)';
      case ImportStatus.PRODUCAO: return 'Itens Importados - Em Produção';
      case ImportStatus.EMBARCADO: return 'Histórico de Embarcados';
      case ImportStatus.NACIONAL: return 'Itens Nacionais (Sem Follow-up)';
      case 'EXCLUIDOS': return 'Gerenciar Itens Excluídos';
      default: return 'Itens';
    }
  };

  const isNationalView = view === ImportStatus.NACIONAL;
  const isExcludedView = view === 'EXCLUIDOS';

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={view} onChangeView={setView} counts={sidebarCounts} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative">
        
        {/* Top Navigation Bar */}
        <header className="h-20 flex items-center justify-between px-8 bg-[#F3F4F6] shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              {fileName ? fileName : 'Visão Geral'}
            </h2>
            {fileName && <span className="text-[10px] uppercase font-bold text-green-600 tracking-wider">● Arquivo Conectado</span>}
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
               <Bell size={20} />
               {stats.followUpNeeded > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
            </button>
            
            <div className="h-8 w-px bg-gray-300 mx-2"></div>

            <label className="cursor-pointer bg-[#1E1E2D] hover:bg-black text-white px-5 py-2.5 rounded-xl flex items-center gap-3 transition-all shadow-lg shadow-gray-300/50 active:scale-95 group">
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} className="group-hover:-translate-y-0.5 transition-transform" />}
              <span className="text-sm font-semibold">Importar Excel</span>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 pt-2">
          {items.length === 0 ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
              <div className="bg-white p-16 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center max-w-lg">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                  <FileSpreadsheet size={48} className="text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Bem-vindo ao Dashboard</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Para começar, importe sua planilha de controle de importação (.xlsx).
                  <br/>O sistema irá calcular os prazos automaticamente.
                </p>
                <div className="text-xs font-mono bg-gray-50 p-3 rounded-lg text-gray-400 border border-gray-100">
                  Colunas necessárias: NUMERO_PO, NECESS_PC
                </div>
              </div>
            </div>
          ) : (
            // View Logic
            <div className="max-w-[1600px] mx-auto">
              {view === 'HOME' ? (
                <DashboardHome stats={stats} allItems={activeItems} onNavigate={setView} />
              ) : (
                <DataTable 
                  items={displayedItems} 
                  onMarkShipped={handleMarkShipped}
                  onUnmarkShipped={handleUnmarkShipped}
                  onExclude={handleExclude}
                  onRestore={handleRestore}
                  title={getTableTitle()}
                  isNationalView={isNationalView}
                  isExcludedView={isExcludedView}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;