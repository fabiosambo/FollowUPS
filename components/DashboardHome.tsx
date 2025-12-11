import React, { useMemo } from 'react';
import { DashboardStats, ImportStatus, ImportItem, ViewState } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { Clock, Flame, AlertTriangle, Package, MapPin, Truck, TrendingUp, ChevronRight } from 'lucide-react';

interface Props {
  stats: DashboardStats;
  allItems: ImportItem[];
  onNavigate: (view: ViewState) => void;
}

// Semantic Colors for Charts
const CHART_COLORS = {
  producao: '#3b82f6', // blue-500
  embarcado: '#10b981', // emerald-500
  alerta: '#f59e0b',    // amber-500
  critico: '#f97316',   // orange-500
  atrasado: '#ef4444',  // red-500
};

const DashboardHome: React.FC<Props> = ({ stats, allItems, onNavigate }) => {
  
  // Data for Pie Chart
  const pieData = [
    { name: 'Produção', value: stats.producao, color: CHART_COLORS.producao },
    { name: 'Embarcado', value: stats.embarcado, color: CHART_COLORS.embarcado },
    { name: 'Alerta', value: stats.alerta, color: CHART_COLORS.alerta },
    { name: 'Crítico', value: stats.critico, color: CHART_COLORS.critico }, 
    { name: 'Atrasado', value: stats.atrasado, color: CHART_COLORS.atrasado },
  ].filter(item => item.value > 0);

  const totalActive = stats.totalImported;

  // Calculate Percentages
  const getPercent = (val: number) => totalActive > 0 ? Math.round((val / totalActive) * 100) : 0;

  // Calculate Top Suppliers by Delay
  const supplierData = useMemo(() => {
    const supplierCounts: Record<string, number> = {};
    allItems.forEach(item => {
      if (!item.isExcluded && item.status === ImportStatus.ATRASADO && item.RAZAO_FORNEC) {
        const name = item.RAZAO_FORNEC.length > 15 
          ? item.RAZAO_FORNEC.substring(0, 15) + '..' 
          : item.RAZAO_FORNEC;
        supplierCounts[name] = (supplierCounts[name] || 0) + 1;
      }
    });

    return Object.entries(supplierCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allItems]);

  return (
    <div className="space-y-8 pb-10 animate-fade-in font-sans text-gray-900">
      
      {/* Header simples */}
      <div className="flex flex-col">
        <h2 className="text-3xl font-light text-gray-800 tracking-tight">Visão Geral</h2>
        <p className="text-sm text-gray-500 mt-1 font-medium">Indicadores operacionais</p>
      </div>

      {/* KPI Cards Row 1 - Import Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernCard 
          title="ATRASADOS" 
          value={stats.atrasado} 
          percent={getPercent(stats.atrasado)}
          icon={Clock} 
          onClick={() => onNavigate(ImportStatus.ATRASADO)}
          theme="red"
        />
        <ModernCard 
          title="CRÍTICOS" 
          value={stats.critico} 
          percent={getPercent(stats.critico)}
          icon={Flame} 
          onClick={() => onNavigate(ImportStatus.CRITICO)}
          theme="orange"
        />
        <ModernCard 
          title="ALERTA" 
          value={stats.alerta} 
          percent={getPercent(stats.alerta)}
          icon={AlertTriangle} 
          onClick={() => onNavigate(ImportStatus.ALERTA)}
          theme="amber"
        />
        <ModernCard 
          title="PRODUÇÃO" 
          value={stats.producao} 
          percent={getPercent(stats.producao)}
          icon={Package} 
          onClick={() => onNavigate(ImportStatus.PRODUCAO)}
          theme="blue"
        />
      </div>

      {/* KPI Cards Row 2 - Secondary Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModernWideCard 
          title="ITENS EMBARCADOS" 
          value={stats.embarcado} 
          icon={Truck} 
          onClick={() => onNavigate(ImportStatus.EMBARCADO)}
          theme="emerald"
        />
        <ModernWideCard 
          title="ITENS NACIONAIS" 
          value={stats.totalNational} 
          icon={MapPin} 
          onClick={() => onNavigate(ImportStatus.NACIONAL)}
          theme="indigo"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border-2 border-gray-500 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300 min-h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Fornecedores em Atraso</h3>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            {supplierData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={supplierData} 
                  layout="vertical" 
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={140}
                    tick={{fill: '#71717a', fontSize: 12, fontWeight: 600}} 
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: '2px solid #6b7280', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#barGradient)"
                    radius={[0, 6, 6, 0]} 
                    barSize={24}
                    background={{ fill: '#f9fafb', radius: [0, 6, 6, 0] }}
                  >
                    <LabelList 
                      dataKey="count" 
                      position="right" 
                      fill="#1f2937" 
                      fontWeight="bold" 
                      fontSize={14}
                      offset={10}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <TrendingUp size={32} className="mb-3 opacity-30" />
                  <span className="text-sm font-medium">Sem atrasos registrados</span>
               </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border-2 border-gray-500 shadow-sm flex flex-col relative hover:shadow-md transition-shadow duration-300 min-h-[400px]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Distribuição Status</h3>
          
          <div className="flex-1 w-full relative min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={6}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '2px solid #6b7280', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#000', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Label */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
               <span className="block text-5xl font-bold text-gray-800 tracking-tighter">{totalActive}</span>
               <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 block">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs text-gray-600 font-medium">
            {pieData.map((d, i) => (
               <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span>{d.name}</span>
               </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

// --- Modern Colorful Components ---

interface CardTheme {
  bg: string;
  text: string;
  iconBg: string;
  borderHover: string;
  shadowHover: string;
  barColor: string;
}

const THEMES: Record<string, CardTheme> = {
  red: { bg: 'bg-white', text: 'text-red-600', iconBg: 'bg-red-50', borderHover: 'hover:border-red-400', shadowHover: 'hover:shadow-red-100', barColor: 'bg-red-500' },
  orange: { bg: 'bg-white', text: 'text-orange-600', iconBg: 'bg-orange-50', borderHover: 'hover:border-orange-400', shadowHover: 'hover:shadow-orange-100', barColor: 'bg-orange-500' },
  amber: { bg: 'bg-white', text: 'text-amber-500', iconBg: 'bg-amber-50', borderHover: 'hover:border-amber-400', shadowHover: 'hover:shadow-amber-100', barColor: 'bg-amber-400' },
  blue: { bg: 'bg-white', text: 'text-blue-600', iconBg: 'bg-blue-50', borderHover: 'hover:border-blue-400', shadowHover: 'hover:shadow-blue-100', barColor: 'bg-blue-500' },
  emerald: { bg: 'bg-white', text: 'text-emerald-600', iconBg: 'bg-emerald-50', borderHover: 'hover:border-emerald-400', shadowHover: 'hover:shadow-emerald-100', barColor: 'bg-emerald-500' },
  indigo: { bg: 'bg-white', text: 'text-indigo-600', iconBg: 'bg-indigo-50', borderHover: 'hover:border-indigo-400', shadowHover: 'hover:shadow-indigo-100', barColor: 'bg-indigo-500' },
};

const ModernCard: React.FC<{ title: string; value: number; percent: number; icon: any; onClick: () => void; theme: string }> = ({ title, value, percent, icon: Icon, onClick, theme }) => {
  const style = THEMES[theme] || THEMES.blue;

  return (
    <div 
      onClick={onClick}
      className={`relative bg-white p-6 rounded-2xl border-2 border-gray-500 shadow-sm transition-all duration-300 cursor-pointer group flex flex-col justify-between h-auto min-h-[180px] ${style.borderHover} hover:shadow-lg ${style.shadowHover} hover:-translate-y-1`}
    >
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl ${style.iconBg} transition-colors`}>
          <Icon size={22} className={style.text} strokeWidth={2.5} />
        </div>
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 ${style.text}`}>
           <ChevronRight size={20} />
        </div>
      </div>
      
      <div className="flex flex-col gap-2 mt-4">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">{title}</span>
        <div className="flex items-end justify-between">
           <span className="text-5xl font-bold text-gray-800 tracking-tight">{value}</span>
        </div>
        
        {/* Percentage Bar */}
        <div className="mt-3">
           <div className="flex justify-between text-[10px] mb-1 font-semibold text-gray-400">
             <span className={style.text}>{percent}%</span>
             <span>do total</span>
           </div>
           <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                 className={`h-full rounded-full ${style.barColor}`} 
                 style={{ width: `${percent}%` }}
              ></div>
           </div>
        </div>
      </div>
    </div>
  );
};

const ModernWideCard: React.FC<{ title: string; value: number; icon: any; onClick: () => void; theme: string }> = ({ title, value, icon: Icon, onClick, theme }) => {
  const style = THEMES[theme] || THEMES.blue;

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl border-2 border-gray-500 shadow-sm transition-all duration-300 cursor-pointer group flex items-center justify-between h-auto min-h-[180px] ${style.borderHover} hover:shadow-lg ${style.shadowHover} hover:-translate-y-1`}
    >
      <div className="flex flex-col h-full justify-center gap-2">
         <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
         <span className="text-5xl font-bold text-gray-800 tracking-tight">{value}</span>
      </div>
      
      <div className="flex flex-col items-end gap-3">
         <div className={`h-16 w-16 rounded-2xl ${style.iconBg} flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
            <Icon size={32} className={style.text} strokeWidth={2} />
         </div>
         {theme === 'emerald' && (
            <div className="flex gap-1">
               <div className="w-1 h-4 bg-emerald-200 rounded-full animate-pulse"></div>
               <div className="w-1 h-6 bg-emerald-300 rounded-full animate-pulse delay-75"></div>
               <div className="w-1 h-3 bg-emerald-200 rounded-full animate-pulse delay-150"></div>
               <div className="w-1 h-5 bg-emerald-400 rounded-full animate-pulse delay-100"></div>
            </div>
         )}
         {theme === 'indigo' && (
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md">Brasil</span>
         )}
      </div>
    </div>
  );
};

export default DashboardHome;