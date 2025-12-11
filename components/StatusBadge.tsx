import React from 'react';
import { ImportStatus } from '../types';

interface Props {
  status: ImportStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const baseClass = "inline-flex items-center px-3 py-1 rounded border text-xs font-medium tracking-wide";
  
  switch (status) {
    case ImportStatus.ATRASADO:
      return <span className={`${baseClass} bg-white border-gray-300 text-gray-900`}>Atrasado <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-black"></span></span>;
    case ImportStatus.CRITICO:
      return <span className={`${baseClass} bg-white border-gray-300 text-gray-900`}>Crítico <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-gray-600"></span></span>;
    case ImportStatus.ALERTA:
      return <span className={`${baseClass} bg-white border-gray-300 text-gray-900`}>Alerta <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-gray-400"></span></span>;
    case ImportStatus.PRODUCAO:
      return <span className={`${baseClass} bg-white border-gray-200 text-gray-500`}>Produção</span>;
    case ImportStatus.EMBARCADO:
      return <span className={`${baseClass} bg-gray-50 border-gray-200 text-gray-600`}>Embarcado</span>;
    case ImportStatus.NACIONAL:
      return <span className={`${baseClass} bg-white border-gray-200 text-gray-400`}>Nacional</span>;
    default:
      return null;
  }
};