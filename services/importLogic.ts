import { ImportItem, ImportStatus } from '../types';
import { differenceInCalendarDays, isValid, startOfDay } from 'date-fns';
import * as XLSX from 'xlsx';

// Local Storage Keys
const SHIPPED_STORAGE_KEY = 'importflow_shipped_items';
const EXCLUDED_STORAGE_KEY = 'importflow_excluded_items';

interface StoredRecord {
  date: string;
}

// --- Helper: Shipped Items ---
const loadShippedMap = (): Record<string, StoredRecord> => {
  try {
    const stored = localStorage.getItem(SHIPPED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to load shipped items", e);
    return {};
  }
};

export const saveShippedItem = (id: string) => {
  const current = loadShippedMap();
  current[id] = { date: new Date().toISOString() };
  localStorage.setItem(SHIPPED_STORAGE_KEY, JSON.stringify(current));
};

export const removeShippedItem = (id: string) => {
  const current = loadShippedMap();
  if (current[id]) {
    delete current[id];
    localStorage.setItem(SHIPPED_STORAGE_KEY, JSON.stringify(current));
  }
};

// --- Helper: Excluded Items ---
const loadExcludedMap = (): Record<string, StoredRecord> => {
  try {
    const stored = localStorage.getItem(EXCLUDED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to load excluded items", e);
    return {};
  }
};

export const saveExcludedItem = (id: string) => {
  const current = loadExcludedMap();
  current[id] = { date: new Date().toISOString() };
  localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(current));
};

export const removeExcludedItem = (id: string) => {
  const current = loadExcludedMap();
  if (current[id]) {
    delete current[id];
    localStorage.setItem(EXCLUDED_STORAGE_KEY, JSON.stringify(current));
  }
};

// --- Logic ---

// Calculate status based on rules (Imported items only)
export const calculateStatus = (daysDiff: number): ImportStatus => {
  if (daysDiff < 0) return ImportStatus.ATRASADO;
  if (daysDiff < 30) return ImportStatus.CRITICO; // Rule: 0 <= Days < 30 (Updated per user request)
  if (daysDiff <= 60) return ImportStatus.ALERTA; // Rule: 30 <= Days <= 60
  return ImportStatus.PRODUCAO; // Rule: Days > 60
};

// Parse raw Excel data
export const processExcelData = async (file: File): Promise<ImportItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const shippedMap = loadShippedMap();
        const excludedMap = loadExcludedMap();
        const today = startOfDay(new Date());

        const processedItems: ImportItem[] = jsonData
          .map((row: any, idx: number) => {
            const poRaw = row['NUMERO_PO'];
            // Identify National Items: PO is empty, null, or undefined
            const isNational = poRaw === undefined || poRaw === null || String(poRaw).trim() === '';
            
            // Skip totally empty rows (ghost rows)
            if (!poRaw && !row['NUMERO_PC'] && !row['DESCR_PROD']) {
               return null;
            }

            const po = isNational ? '' : poRaw;
            const pc = row['NUMERO_PC'] || 'N/A';
            const sc = row['NUMERO_SC']; // Extract SC
            const produto = row['DESCR_PROD'] || '';
            
            // Robust Unique ID generation: PO + PC + Index + Product (partial)
            // Including 'idx' guarantees uniqueness even if PO/PC duplicates exist
            const uniqueSuffix = `${idx}`;
            const id = isNational 
               ? `NAT-${pc}-${uniqueSuffix}` 
               : `${po}-${pc}-${uniqueSuffix}`;

            // Handle Date parsing for NECESS_PC
            let necessDate = new Date();
            const rawDate = row['NECESS_PC'];

            if (rawDate instanceof Date) {
              necessDate = rawDate;
            } else if (typeof rawDate === 'string') {
              necessDate = new Date(rawDate);
            } else if (typeof rawDate === 'number') {
               // Excel Date Serial conversion (offset 25569 for 1970-01-01)
               necessDate = new Date((rawDate - 25569) * 86400 * 1000);
            }

            if (!isValid(necessDate)) {
              // If date is invalid, default to today but maybe flag it? 
              // For now, using today prevents status calculation errors
              necessDate = today;
            }

            // Handle Date parsing for NECESS_SC (Optional)
            let necessSC: Date | undefined = undefined;
            const rawDateSC = row['NECESS_SC'];
            if (rawDateSC) {
               if (rawDateSC instanceof Date) {
                 necessSC = rawDateSC;
               } else if (typeof rawDateSC === 'string') {
                 necessSC = new Date(rawDateSC);
               } else if (typeof rawDateSC === 'number') {
                 necessSC = new Date((rawDateSC - 25569) * 86400 * 1000);
               }
               
               if (necessSC && !isValid(necessSC)) {
                  necessSC = undefined;
               }
            }

            const daysDiff = differenceInCalendarDays(necessDate, today);
            
            let status: ImportStatus;
            
            if (isNational) {
               status = ImportStatus.NACIONAL;
            } else {
               // Logic for Imported Items
               const isShipped = !!shippedMap[id];
               status = isShipped ? ImportStatus.EMBARCADO : calculateStatus(daysDiff);
            }

            return {
              id,
              NUMERO_PO: po,
              NUMERO_PC: pc,
              NUMERO_SC: sc, // Assign SC
              NECESS_SC: necessSC,
              NECESS_PC: necessDate,
              RAZAO_FORNEC: row['RAZAO_FORNEC'] || '-',
              DESCR_PROD: produto || '-',
              VOLUME_PC: row['VOLUME_PC'] || '-',
              DIAS_PARA_NECESS: daysDiff,
              status: status,
              DATA_CHECK_EMBARQUE: (!isNational && shippedMap[id]) ? shippedMap[id].date : undefined,
              isExcluded: !!excludedMap[id]
            };
          })
          .filter((item): item is ImportItem => item !== null); // Remove nulls

        resolve(processedItems);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};