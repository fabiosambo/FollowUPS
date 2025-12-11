export enum ImportStatus {
  ATRASADO = 'ATRASADO',
  CRITICO = 'CRITICO',
  ALERTA = 'ALERTA',
  PRODUCAO = 'PRODUCAO',
  EMBARCADO = 'EMBARCADO',
  NACIONAL = 'NACIONAL'
}

export interface ImportItem {
  id: string; // Unique key (PO + PC)
  NUMERO_SC?: string | number; // Added NUMERO_SC
  NUMERO_PO: string | number;
  NUMERO_PC: string | number;
  NECESS_SC?: Date; // Added NECESS_SC
  NECESS_PC: Date; // The parsed date
  RAZAO_FORNEC?: string;
  DESCR_PROD?: string;
  VOLUME_PC?: string | number;
  DIAS_PARA_NECESS: number;
  status: ImportStatus;
  DATA_CHECK_EMBARQUE?: string; // Date string ISO
  isExcluded: boolean;
}

export interface DashboardStats {
  totalImported: number;
  totalNational: number;
  atrasado: number;
  critico: number;
  alerta: number;
  producao: number;
  embarcado: number;
  followUpNeeded: number;
}

export type ViewState = 'HOME' | 'ALL' | 'EXCLUIDOS' | ImportStatus;