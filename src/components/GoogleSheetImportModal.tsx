import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, 
  X, 
  Search, 
  RefreshCw, 
  Check, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Filter, 
  Layers, 
  HelpCircle, 
  ClipboardPaste, 
  Database,
  ExternalLink
} from 'lucide-react';

const toast = {
  success: (msg: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg, type: 'success' } }));
    }
  },
  error: (msg: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg, type: 'error' } }));
    }
  }
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingCodes: Set<string>;
  onImportSuccess: (
    importedShootingRows: any[], 
    rawRowsToAppend: any[][],
    options?: { updateOnlyScript?: boolean }
  ) => Promise<void> | void;
  currentUser?: string;
}

interface FieldDefinition {
  key: string;
  label: string;
  labelEn: string;
  requiredForCode?: boolean;
  defaultValue?: string;
}

const SHOOTING_FIELDS: FieldDefinition[] = [
  { key: 'script', label: 'السكريبت / اسم ورابط الدرس', labelEn: 'Script / Title', requiredForCode: false },
  { key: 'teacher', label: 'اسم المدرس', labelEn: 'Teacher', requiredForCode: true },
  { key: 'extra_name', label: 'اسم إضافي / صانع المحتوى', labelEn: 'Extra Name / Creator', requiredForCode: true },
  { key: 'year', label: 'السنة الدراسية', labelEn: 'Year (s1, s2, s3...)', requiredForCode: true, defaultValue: 's1' },
  { key: 'branch', label: 'الفرع', labelEn: 'Branch', defaultValue: 'Alexandria' },
  { key: 'code', label: 'الكود (Code)', labelEn: 'Code (if present in sheet)' },
  { key: 'type', label: 'النوع', labelEn: 'Type (حواري, شرح...)', defaultValue: 'حواري' },
  { key: 'format', label: 'المقاس', labelEn: 'Format (9:16, 16:9...)', defaultValue: '9:16' },
  { key: 'date', label: 'التاريخ', labelEn: 'Date' },
  { key: 'drive_raw', label: 'رابط الماتريال الخام', labelEn: 'Drive Link (Raw)' },
  { key: 'notes', label: 'ملاحظات', labelEn: 'Notes' },
  { key: 'storage', label: 'كارت الذاكرة / المساحة', labelEn: 'Storage' },
  { key: 'filming_date', label: 'تاريخ التصوير', labelEn: 'Filming Date' },
  { key: 'by', label: 'المصور', labelEn: 'Filmed By' },
];

export function normalizeScriptUrl(raw: string): string {
  if (!raw) return '';
  let str = String(raw).trim();
  
  // Extract document ID if it matches any Google Doc pattern
  // Matches docs.google.com/document/d/..., h/document/d/..., cument/d/..., n/document/d/..., 'document/d/..., /document/d/...
  const docMatch = str.match(/(?:docs\.google\.com\/document\/d\/|[a-zA-Z0-9_\/'\.-]*document\/d\/|[a-zA-Z0-9_\/'\.-]*cument\/d\/)(1[a-zA-Z0-9_-]+)/i);
  if (docMatch && docMatch[1]) {
    return `https://docs.google.com/document/d/${docMatch[1]}/edit`;
  }

  // Raw Google Doc ID (starts with 1, at least 25 characters)
  if (/^1[a-zA-Z0-9_-]{25,}$/.test(str)) {
    return `https://docs.google.com/document/d/${str}/edit`;
  }

  // General URL
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  if (str.startsWith('docs.google.com') || str.startsWith('drive.google.com')) {
    return `https://${str}`;
  }

  return str;
}

function isDataRow(row: string[]): boolean {
  if (!row || row.length === 0) return false;
  return row.some(cell => {
    const c = String(cell || '').trim();
    if (/^[msj]\d+-[a-z0-9\s._-]+v\d+/i.test(c)) return true;
    if (/[a-z0-9_-]+-[a-z0-9_-]+-\d+\s+v\d+/i.test(c)) return true;
    if (/document\/d\/|cument\/d\/|docs\.google\.com|drive\.google\.com|https?:\/\//i.test(c)) return true;
    return false;
  });
}

function parseClientTableText(text: string): string[][] {
  const isTsv = text.includes('\t') && !text.includes('","');
  const rows: string[][] = [];
  if (isTsv) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      rows.push(line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, '')));
    }
    return rows;
  }
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if (char === '\n' && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else if (char === '\r' && !inQuotes) {
      // ignore
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

function extractClientSheetDetails(urlOrId: string): { spreadsheetId: string | null; gid: string | null } {
  const input = (urlOrId || '').trim();
  if (!input) return { spreadsheetId: null, gid: null };
  if (!input.includes('/') && !input.includes('http') && input.length >= 20) {
    return { spreadsheetId: input, gid: null };
  }
  const idMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch ? idMatch[1] : null;
  const gidMatch = input.match(/[#&?]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;
  return { spreadsheetId, gid };
}

function detectClientColumnMapping(headers: string[], sampleRows: string[][] = []): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headers.map(h => (h || '').toLowerCase().trim().replace(/[\r\n\t_]/g, ' '));
  const definitions: Record<string, string[]> = {
    date: ['تاريخ', 'date', 'التاريخ', 'يوم', 'column 1', 'عمود 1'],
    branch: ['فرع', 'الفرع', 'branches', 'branch', 'column 2', 'عمود 2'],
    year: ['سنة', 'السنة', 'عام', 'grade', 'year', 'stage', 'المرحلة', 'column 3', 'عمود 3'],
    teacher: ['مدرس', 'المدرس', 'أستاذ', 'الاستاذ', 'معلم', 'teacher', 'column 4', 'عمود 4'],
    extra_name: ['صانع', 'صانع المحتوى', 'اسم إضافي', 'اسم اضافي', 'creator', 'extra', 'column 5', 'عمود 5', 'المعد', 'الكريتور'],
    code: ['كود', 'الكود', 'code', 'id', 'رمز', 'column 6', 'عمود 6'],
    script: [
      'اسكربت', 'الاسكربت', 'سكربت', 'السكربت',
      'اسكريبت', 'السكريبت', 'سكريبت', 'السكريبتات', 'الاسكربتات',
      'رابط الاسكربت', 'رابط الاسكريبت', 'لينك الاسكربت', 'لينك الاسكريبت',
      'رابط', 'لينك', 'link', 'script', 'url', 'doc', 'docs', 'google doc', 'google docs',
      'مستند', 'مستندات', 'درس', 'الدرس', 'اسم الدرس', 'رابط الدرس',
      'محتوى', 'عنوان', 'document', 'drive', 'درايف', 'الدرايف',
      'عمود 3', 'column 3', 'عمود 7', 'column 7'
    ],
    type: ['نوع', 'النوع', 'type', 'column 8', 'عمود 8'],
    format: ['مقاس', 'المقاس', 'format', 'أبعاد', 'ابعاد', 'column 9', 'عمود 9'],
    filmed: ['اتصور', 'اتصور؟', 'تم التصوير', 'filmed'],
    filming_date: ['تاريخ التصوير', 'filming date'],
    by: ['المصور', 'تصوير', 'by', 'filmed by', 'shooter'],
    storage: ['كارت', 'مساحة', 'storage', 'الكارت'],
    notes: ['ملاحظات', 'ملاحظة', 'notes', 'تعليق'],
    drive_raw: ['خام', 'raw', 'drive raw', 'ماتريال', 'درايف الخام', 'لينك الخام', 'drive link (raw)']
  };

  for (const [field, keywords] of Object.entries(definitions)) {
    let foundIdx = normalizedHeaders.findIndex(header => 
      keywords.some(kw => header === kw || header.startsWith(kw + ' ') || header.includes(kw))
    );
    if (foundIdx !== -1) {
      mapping[field] = foundIdx;
    }
  }

  // Content inspection: if columns are not mapped, inspect sample rows
  if (sampleRows.length > 0) {
    const numCols = Math.max(...sampleRows.map(r => r.length), headers.length);
    for (let c = 0; c < numCols; c++) {
      const sampleCells = sampleRows.slice(0, 10).map(r => String(r[c] || '').trim()).filter(Boolean);
      if (sampleCells.length === 0) continue;

      // 1. Script detection (Google Doc / Link / URL / cument/d/)
      if (mapping.script === undefined) {
        const isScript = sampleCells.some(cell => 
          /document\/d\/|cument\/d\/|docs\.google\.com|drive\.google\.com|https?:\/\//i.test(cell)
        );
        if (isScript) mapping.script = c;
      }

      // 2. Code detection (e.g. m1-rowida-alaa zakria-00 v6)
      if (mapping.code === undefined) {
        const isCode = sampleCells.some(cell => 
          /^[msj]\d+-[a-z0-9\s._-]+v\d+/i.test(cell) ||
          /[a-z0-9_-]+-[a-z0-9_-]+-\d+\s+v\d+/i.test(cell)
        );
        if (isCode) mapping.code = c;
      }

      // 3. Type detection (حواري, شرح, etc.)
      if (mapping.type === undefined) {
        const isType = sampleCells.every(cell => /حواري|شرح|بودكاست|ريل|reels?/i.test(cell));
        if (isType) mapping.type = c;
      }

      // 4. Extra Name / Creator detection (names like alaa zakria, Hesham, etc.)
      if (mapping.extra_name === undefined && mapping.code !== c && mapping.script !== c && mapping.type !== c) {
        const isCreator = sampleCells.some(cell => /^[a-zA-Z\u0621-\u064A\s]{3,25}$/.test(cell));
        if (isCreator) mapping.extra_name = c;
      }
    }
  }

  return mapping;
}

export const GoogleSheetImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  existingCodes,
  onImportSuccess,
  currentUser = 'User'
}) => {
  // Input state
  const [sheetUrl, setSheetUrl] = useState('');
  const [usePastedData, setUsePastedData] = useState(false);
  const [pastedData, setPastedData] = useState('');

  // Loaded sheet state
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const [availableTabs, setAvailableTabs] = useState<{ title: string; sheetId: number }[]>([]);
  const [selectedTab, setSelectedTab] = useState('');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [allDataRows, setAllDataRows] = useState<string[][]>([]);

  // Mapping state: fieldKey -> sheetColumnIndex (or -1 if none)
  const [fieldMapping, setFieldMapping] = useState<Record<string, number>>({});
  // Enabled fields: fieldKey -> boolean
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SHOOTING_FIELDS.forEach(f => {
      // Default enable common fields
      initial[f.key] = ['script', 'teacher', 'extra_name', 'year', 'branch', 'type', 'format', 'date', 'notes', 'drive_raw'].includes(f.key);
    });
    return initial;
  });

  // Default fallbacks if column is missing in sheet
  const [defaultBranch, setDefaultBranch] = useState('Alexandria');
  const [defaultYear, setDefaultYear] = useState('s1');
  const [defaultType, setDefaultType] = useState('حواري');
  const [defaultFormat, setDefaultFormat] = useState('9:16');

  // Row selection & filter state
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [autoGenerateCodes, setAutoGenerateCodes] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [onlyUpdateScript, setOnlyUpdateScript] = useState(false);

  // Active step view: 'fetch' | 'mapping' | 'rows'
  const [activeStep, setActiveStep] = useState<'fetch' | 'mapping' | 'rows'>('fetch');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (allDataRows.length === 0) {
        setActiveStep('fetch');
      }
    }
  }, [isOpen]);

  // Fetch sheet preview from backend with client-side direct fallback
  const handleFetchData = async (tabToFetch?: string) => {
    if (!usePastedData && !sheetUrl.trim()) {
      toast.error('يرجى إدخال رابط Google Sheet أولاً');
      return;
    }
    if (usePastedData && !pastedData.trim()) {
      toast.error('يرجى لصق بيانات الجدول أولاً');
      return;
    }

    setIsLoading(true);
    try {
      let resData: any = null;
      let fetchSuccess = false;

      // 1. Try Backend API endpoint first (uses Google Sheets API Service Account if configured)
      try {
        const response = await fetch('/api/google-sheet-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'preview',
            url: usePastedData ? undefined : sheetUrl.trim(),
            csvText: usePastedData ? pastedData.trim() : undefined,
            tabName: tabToFetch || selectedTab || undefined,
          })
        });

        if (response.ok) {
          const rawText = await response.text();
          if (rawText && rawText.trim().startsWith('{')) {
            const parsed = JSON.parse(rawText);
            if (parsed && parsed.success) {
              resData = parsed;
              fetchSuccess = true;
            } else if (parsed && parsed.error && !parsed.needsShare) {
              throw new Error(parsed.error);
            }
          }
        }
      } catch (backendErr: any) {
        console.warn('[Sheet Import] Backend proxy not responding or failed, trying direct browser fetch fallback:', backendErr);
      }

      // 2. Direct client fallback via Google GViz endpoint or pasted text
      if (!fetchSuccess) {
        if (usePastedData && pastedData.trim()) {
          const rows = parseClientTableText(pastedData.trim());
          const nonEmpty = rows.filter(r => r.some(c => c.trim() !== ''));
          if (nonEmpty.length === 0) throw new Error('البيانات الملصوقة فارغة');

          let headers: string[];
          let dataRows: string[][];

          // Smart check: If first row looks like data (e.g. has code or doc link), keep it as data!
          if (isDataRow(nonEmpty[0])) {
            headers = nonEmpty[0].map((_, i) => `عمود ${i + 1}`);
            dataRows = nonEmpty;
          } else {
            headers = nonEmpty[0].map((h, i) => h.trim() || `عمود ${i + 1}`);
            dataRows = nonEmpty.slice(1);
          }

          const detectedMapping = detectClientColumnMapping(headers, dataRows);
          resData = {
            success: true,
            sheetTitle: 'بيانات ملصوقة يدوياً (Pasted Data)',
            tabs: [],
            selectedTab: '',
            headers,
            detectedMapping,
            allRows: dataRows
          };
          fetchSuccess = true;
        } else if (sheetUrl.trim()) {
          const { spreadsheetId, gid } = extractClientSheetDetails(sheetUrl.trim());
          if (!spreadsheetId) {
            throw new Error('رابط غير صالح: لم يتم العثور على معرّف Google Sheet الصحيح.');
          }

          // Try GViz URL (CORS friendly)
          const gvizUrl = gid
            ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`
            : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;

          let csvText = '';
          try {
            const gvizRes = await fetch(gvizUrl);
            if (gvizRes.ok) {
              csvText = await gvizRes.text();
            }
          } catch (gvizErr) {
            console.warn('GViz direct fetch error:', gvizErr);
          }

          if (!csvText) {
            // Try export CSV
            const exportUrl = gid
              ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
              : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
            const exportRes = await fetch(exportUrl);
            if (exportRes.ok) {
              csvText = await exportRes.text();
            }
          }

          if (csvText && csvText.trim()) {
            const rows = parseClientTableText(csvText);
            const nonEmpty = rows.filter(r => r.some(c => c.trim() !== ''));
            if (nonEmpty.length > 0) {
              let headers: string[];
              let dataRows: string[][];

              if (isDataRow(nonEmpty[0])) {
                headers = nonEmpty[0].map((_, i) => `عمود ${i + 1}`);
                dataRows = nonEmpty;
              } else {
                headers = nonEmpty[0].map((h, i) => h.trim() || `عمود ${i + 1}`);
                dataRows = nonEmpty.slice(1);
              }

              const detectedMapping = detectClientColumnMapping(headers, dataRows);
              resData = {
                success: true,
                sheetTitle: 'Google Sheet',
                tabs: [],
                selectedTab: '',
                headers,
                detectedMapping,
                allRows: dataRows
              };
              fetchSuccess = true;
            }
          }
        }
      }

      if (!fetchSuccess || !resData) {
        throw new Error('تعذر قراءة بيانات الشيت. يرجى التأكد من أن الرابط متاح لأي شخص (Anyone with the link can view) أو استخدام خيار "لصق بيانات الجدول مباشرة".');
      }

      setSheetTitle(resData.sheetTitle || 'Google Sheet');
      setAvailableTabs(resData.tabs || []);
      setSelectedTab(resData.selectedTab || '');
      setSheetHeaders(resData.headers || []);
      setAllDataRows(resData.allRows || []);

      // Setup initial field mapping from auto-detection
      const detected = resData.detectedMapping || {};
      const newMapping: Record<string, number> = {};
      const newEnabled: Record<string, boolean> = { ...enabledFields };

      SHOOTING_FIELDS.forEach(f => {
        if (detected[f.key] !== undefined) {
          newMapping[f.key] = detected[f.key];
          newEnabled[f.key] = true;
        } else {
          newMapping[f.key] = -1;
        }
      });

      setFieldMapping(newMapping);
      setEnabledFields(newEnabled);

      // Select all rows by default
      const allIndices = new Set<number>();
      for (let i = 0; i < (resData.allRows || []).length; i++) {
        allIndices.add(i);
      }
      setSelectedRowIndices(allIndices);

      toast.success(`تم جلب ${resData.allRows.length} صف من [${resData.sheetTitle}] بنجاح! 🎉`);
      setActiveStep('mapping');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'حدث خطأ أثناء جلب البيانات من الشيت');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract clean cell value according to mapping
  const getRowFieldValue = (row: string[], fieldKey: string): string => {
    if (!enabledFields[fieldKey]) return '';
    const colIdx = fieldMapping[fieldKey];
    if (colIdx !== undefined && colIdx >= 0 && row[colIdx]) {
      const rawVal = String(row[colIdx]).trim();
      if (fieldKey === 'script') {
        return normalizeScriptUrl(rawVal);
      }
      return rawVal;
    }
    // Fallback defaults
    if (fieldKey === 'branch') return defaultBranch;
    if (fieldKey === 'year') return defaultYear;
    if (fieldKey === 'type') return defaultType;
    if (fieldKey === 'format') return defaultFormat;
    if (fieldKey === 'date') return new Date().toLocaleDateString('en-US');
    return '';
  };

  // Compute preview rows with generated codes
  const parsedRowsWithMeta = useMemo(() => {
    const seqCounters: Record<string, number> = {};

    return allDataRows.map((row, idx) => {
      let year = (getRowFieldValue(row, 'year') || defaultYear || 's1').toLowerCase().trim();
      let teacher = (getRowFieldValue(row, 'teacher') || '').trim();
      let extraName = (getRowFieldValue(row, 'extra_name') || '').trim();
      const script = getRowFieldValue(row, 'script');
      const branch = getRowFieldValue(row, 'branch') || defaultBranch;
      const type = getRowFieldValue(row, 'type') || defaultType;
      const format = getRowFieldValue(row, 'format') || defaultFormat;
      const date = getRowFieldValue(row, 'date') || new Date().toLocaleDateString('en-US');
      const notes = getRowFieldValue(row, 'notes');
      const driveRaw = getRowFieldValue(row, 'drive_raw');
      const storage = getRowFieldValue(row, 'storage');
      const filmingDate = getRowFieldValue(row, 'filming_date');
      const filmedBy = getRowFieldValue(row, 'by');

      // Check existing or sheet code
      const sheetCode = getRowFieldValue(row, 'code');
      let finalCode = sheetCode;

      // Decompose code to infer year, teacher, or creator if missing
      if (finalCode) {
        const parts = finalCode.split('-');
        if (parts.length >= 3) {
          if (!year || year === defaultYear) year = parts[0].trim().toLowerCase();
          if (!teacher) teacher = parts[1].trim();
          if (!extraName) extraName = parts[2].split(/\s+v\d+/i)[0].trim();
        }
      }

      if (!finalCode && autoGenerateCodes && teacher) {
        const prefix = `${year}-${teacher}-${extraName || '01'}`.toLowerCase().replace(/\s+/g, ' ');
        if (!seqCounters[prefix]) {
          // Find max existing sequence in database
          let maxSeq = 0;
          existingCodes.forEach(code => {
            const clean = (code || '').toLowerCase().trim();
            if (clean.startsWith(prefix)) {
              const m = clean.slice(prefix.length).trim().match(/^[-_]?(\d+)/);
              if (m) {
                const s = parseInt(m[1], 10);
                if (!isNaN(s) && s > maxSeq) maxSeq = s;
              }
            }
          });
          seqCounters[prefix] = maxSeq;
        }
        seqCounters[prefix] += 1;
        finalCode = `${prefix}-${seqCounters[prefix].toString().padStart(2, '0')} v7`;
      } else if (!finalCode) {
        finalCode = `shoot-${Date.now().toString(36)}-${idx + 1}`;
      }

      const isDuplicate = existingCodes.has(finalCode) || existingCodes.has((finalCode || '').toLowerCase());

      return {
        rowIndex: idx,
        rawRow: row,
        code: finalCode,
        year,
        teacher,
        extraName,
        script,
        branch,
        type,
        format,
        date,
        notes,
        driveRaw,
        storage,
        filmingDate,
        filmedBy,
        isDuplicate,
      };
    });
  }, [allDataRows, fieldMapping, enabledFields, defaultBranch, defaultYear, defaultType, defaultFormat, autoGenerateCodes, existingCodes]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedRowsWithMeta;
    const q = searchQuery.toLowerCase().trim();
    return parsedRowsWithMeta.filter(r => 
      (r.code && r.code.toLowerCase().includes(q)) ||
      (r.script && r.script.toLowerCase().includes(q)) ||
      (r.teacher && r.teacher.toLowerCase().includes(q)) ||
      (r.extraName && r.extraName.toLowerCase().includes(q)) ||
      (r.branch && r.branch.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q))
    );
  }, [parsedRowsWithMeta, searchQuery]);

  // Toggle single row selection
  const toggleRowSelect = (idx: number) => {
    const next = new Set(selectedRowIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedRowIndices(next);
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedRowIndices.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedRowIndices(new Set());
    } else {
      const next = new Set<number>();
      filteredRows.forEach(r => {
        if (!skipDuplicates || !r.isDuplicate) {
          next.add(r.rowIndex);
        }
      });
      setSelectedRowIndices(next);
    }
  };

  // Perform Final Import
  const handleExecuteImport = async () => {
    const rowsToImport = parsedRowsWithMeta.filter(r => {
      if (!selectedRowIndices.has(r.rowIndex)) return false;
      if (!onlyUpdateScript && skipDuplicates && r.isDuplicate) return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      toast.error('لم يتم تحديد أي صفوف صالحة للاستيراد!');
      return;
    }

    setIsImporting(true);
    try {
      // 1. Prepare Supabase Shooting objects
      const dbShootingRecords = rowsToImport.map(r => ({
        code: r.code,
        date: r.date || new Date().toLocaleDateString('en-US'),
        branch: r.branch || defaultBranch,
        year: r.year || defaultYear,
        teacher: r.teacher || '',
        extra_name: r.extraName || '',
        script: r.script || '',
        type: r.type || defaultType,
        format: r.format || defaultFormat,
        filmed: false,
        filming_date: r.filmingDate || '',
        by: r.filmedBy || '',
        storage: r.storage || '',
        notes: r.notes || '',
        drive_raw: r.driveRaw || '',
        editor_col: '',
        done: false,
        drive_final: '',
        canceled: false,
        missing_details: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // 2. Prepare raw rows to append to Google Sheets Shooting tab
      // Google Sheet Shooting tab columns:
      // [Date, Branch, Year, Teacher, Extra Name, Code, Script, Type, Format, Filmed, Filming Date, By, Storage, Notes, Drive Raw, Drive Final, Canceled, Extra]
      const rawRowsForSheet = rowsToImport.map(r => [
        r.date || new Date().toLocaleDateString('en-US'), // Col A
        r.branch || defaultBranch,                         // Col B
        r.year || defaultYear,                             // Col C
        r.teacher || '',                                   // Col D
        r.extraName || '',                                 // Col E
        r.code,                                            // Col F
        r.script || '',                                    // Col G
        r.type || defaultType,                             // Col H
        r.format || defaultFormat,                         // Col I
        'FALSE',                                           // Col J (Filmed)
        r.filmingDate || '',                               // Col K
        r.filmedBy || '',                                  // Col L
        r.storage || '',                                   // Col M
        r.notes || '',                                     // Col N
        r.driveRaw || '',                                  // Col O
        '',                                                // Col P (Drive Final)
        'FALSE',                                           // Col Q (Canceled)
        ''                                                 // Col R
      ]);

      // 3. Callback parent to save to Supabase and trigger live UI update
      await onImportSuccess(dbShootingRecords, rawRowsForSheet, { updateOnlyScript: onlyUpdateScript });

      toast.success(
        onlyUpdateScript
          ? `🎉 تم تحديث السكريبت لـ ${rowsToImport.length} صف بنجاح!`
          : `🎉 تم استيراد ${rowsToImport.length} صف بنجاح إلى جدول التصوير (Shooting)!`
      );
      onClose();
    } catch (err: any) {
      console.error('Import execution error:', err);
      toast.error('حدث خطأ أثناء استيراد البيانات: ' + (err.message || 'Error'));
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-lg animate-fadeIn select-none" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-[#0b1019] border border-white/15 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white arabic-text flex items-center gap-2">
                استيراد سكريبتات من Google Sheet إلى جدول التصوير
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Shooting Import
                </span>
              </h2>
              <p className="text-xs text-muted">
                {sheetTitle ? `الشيت الحالي: "${sheetTitle}"` : 'حدد رابط الشيت أو التبويب ثم اختر الأعمدة والصفوف المراد استيرادها'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step navigation buttons if data is loaded */}
            {allDataRows.length > 0 && (
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setActiveStep('fetch')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeStep === 'fetch' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                >
                  1. الرابط
                </button>
                <button
                  onClick={() => setActiveStep('mapping')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeStep === 'mapping' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                >
                  2. الأعمدة
                </button>
                <button
                  onClick={() => setActiveStep('rows')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${activeStep === 'rows' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}
                >
                  3. الصفوف ({selectedRowIndices.size})
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: FETCH / URL INPUT                                           */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeStep === 'fetch' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white arabic-text flex items-center gap-2">
                    <ExternalLink size={16} className="text-emerald-400" />
                    رابط Google Sheet
                  </label>
                  <button
                    type="button"
                    onClick={() => setUsePastedData(!usePastedData)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ClipboardPaste size={14} />
                    <span>{usePastedData ? 'استخدام رابط الشيت' : 'أو لصق بيانات الجدول مباشرة (CSV / Excel)'}</span>
                  </button>
                </div>

                {!usePastedData ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl}
                      onChange={e => setSheetUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleFetchData(); }}
                      className="flex-1 bg-white/5 border border-white/15 focus:border-emerald-400 rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => handleFetchData()}
                      disabled={isLoading}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>جاري الفحص...</span>
                        </>
                      ) : (
                        <>
                          <Search size={16} />
                          <span>جلب ومعاينة البيانات 🔍</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={6}
                      dir="ltr"
                      placeholder="انسخ صفوف وأعمدة من الإكسيل أو الشيت والصقها هنا مباشرة (TSV أو CSV)..."
                      value={pastedData}
                      onChange={e => setPastedData(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 focus:border-purple-400 rounded-xl p-3 text-white text-xs font-mono focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => handleFetchData()}
                      disabled={isLoading}
                      className="btn-primary bg-purple-600 hover:bg-purple-500 px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-white shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>جاري قراءة البيانات...</span>
                        </>
                      ) : (
                        <>
                          <Database size={16} />
                          <span>قراءة البيانات الملصوقة</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Available tabs if multiple tabs */}
                {availableTabs.length > 1 && (
                  <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                    <span className="text-xs font-bold text-muted">التبويب المختار:</span>
                    <select
                      value={selectedTab}
                      onChange={e => {
                        const newTab = e.target.value;
                        setSelectedTab(newTab);
                        handleFetchData(newTab);
                      }}
                      className="bg-[#0b1019] border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white font-bold"
                    >
                      {availableTabs.map(t => (
                        <option key={t.sheetId} value={t.title}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Instructions / Guidance note */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed space-y-1 text-emerald-200">
                  <p className="font-bold">نصيحة قبل الاستيراد:</p>
                  <p>
                    تأكد من أن الرابط متاح لأي شخص لديه الرابط (Anyone with the link can view) أو مشترك مع حساب الخدمة. النظام سيقوم بقراءة الصفوف تلقائياً واقتراح ربط الأعمدة المناسبة لكل حقل في جدول الـ Shooting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: COLUMN MAPPING & INCLUSION                                  */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeStep === 'mapping' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-sm font-black text-white arabic-text flex items-center gap-2">
                    <Layers size={16} className="text-primary" />
                    تحديد الأعمدة والحقول المراد استيرادها
                  </h3>
                  <p className="text-xs text-muted">
                    حدد الحقول التي تريد استيرادها وضع علامة الصح، واختر العمود المقابل لها من الشيت الأصلي.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveStep('rows')}
                    className="btn-primary px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
                  >
                    <span>التالي: اختيار الصفوف ({allDataRows.length} صف)</span>
                    <ArrowRight size={14} className="rotate-180" />
                  </button>
                </div>
              </div>

              {/* Script Column Highlight Banner */}
              {fieldMapping.script !== undefined && fieldMapping.script >= 0 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-emerald-500/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                      <Check size={18} strokeWidth={3} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-white arabic-text">
                          تم التعرف على عمود السكريبت بنجاح: [{sheetHeaders[fieldMapping.script] || `عمود ${fieldMapping.script + 1}`}]
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          جاهز للاستيراد ✓
                        </span>
                      </div>
                      {allDataRows.length > 0 && allDataRows[0][fieldMapping.script] && (
                        <p className="text-[11px] text-emerald-300/80 font-mono truncate max-w-lg mt-0.5" dir="ltr">
                          معاينة الرابط الأول: {normalizeScriptUrl(allDataRows[0][fieldMapping.script])}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newEnabled: Record<string, boolean> = {};
                      SHOOTING_FIELDS.forEach(f => {
                        newEnabled[f.key] = f.key === 'script' || f.key === 'code';
                      });
                      setEnabledFields(newEnabled);
                      setOnlyUpdateScript(true);
                      toast.success('تم تحديد عمود السكريبت والكود فقط!');
                    }}
                    className="shrink-0 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>تحديد السكريبت فقط 📝</span>
                  </button>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-amber-300 arabic-text">
                        تنبيه: لم يتم ربط عمود السكريبت تلقائياً
                      </h4>
                      <p className="text-[11px] text-muted mt-0.5">
                        يرجى اختيار العمود المقابل للسكريبت من بطاقة "السكريبت / اسم ورابط الدرس" أدناه ليتم حفظه.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Default fallbacks for missing columns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">الفرع الافتراضي</label>
                  <select
                    value={defaultBranch}
                    onChange={e => setDefaultBranch(e.target.value)}
                    className="w-full bg-[#0b1019] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  >
                    <option value="Alexandria">Alexandria</option>
                    <option value="Cairo">Cairo</option>
                    <option value="Desouk">Desouk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">السنة الافتراضية</label>
                  <select
                    value={defaultYear}
                    onChange={e => setDefaultYear(e.target.value)}
                    className="w-full bg-[#0b1019] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  >
                    {['s1', 's2', 's3', 'm1', 'm2', 'm3', 'j4', 'j5', 'j6'].map(y => (
                      <option key={y} value={y}>{y.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">النوع الافتراضي</label>
                  <input
                    type="text"
                    value={defaultType}
                    onChange={e => setDefaultType(e.target.value)}
                    placeholder="حواري"
                    className="w-full bg-[#0b1019] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-muted mb-1">المقاس الافتراضي</label>
                  <select
                    value={defaultFormat}
                    onChange={e => setDefaultFormat(e.target.value)}
                    className="w-full bg-[#0b1019] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold"
                  >
                    <option value="9:16">9:16 (Reels/TikTok)</option>
                    <option value="16:9">16:9 (YouTube)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>
              </div>

              {/* Grid of Mapping Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {SHOOTING_FIELDS.map(field => {
                  const isEnabled = enabledFields[field.key];
                  const mappedIdx = fieldMapping[field.key] ?? -1;

                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isEnabled
                          ? 'bg-white/[0.04] border-white/20 shadow-sm'
                          : 'bg-white/[0.01] border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => setEnabledFields(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                            isEnabled ? 'bg-primary border-primary text-white' : 'border-white/20 bg-transparent text-transparent'
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate arabic-text">
                            {field.label}
                          </p>
                          <p className="text-[10px] text-muted truncate font-mono" dir="ltr">
                            {field.labelEn}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 w-44">
                        <select
                          disabled={!isEnabled}
                          value={mappedIdx}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            setFieldMapping(prev => ({ ...prev, [field.key]: val }));
                          }}
                          className={`w-full text-xs font-bold rounded-xl px-2.5 py-1.5 border transition-all cursor-pointer ${
                            mappedIdx >= 0
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-[#0b1019] border-white/15 text-muted'
                          } disabled:opacity-40`}
                        >
                          <option value={-1}>-- بدون تعيين (قيمة افتراضية) --</option>
                          {sheetHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              {`عمود ${i + 1}: ${h}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: ROW SELECTION & PREVIEW TABLE                               */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeStep === 'rows' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Row toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {selectedRowIndices.size === filteredRows.length && filteredRows.length > 0 ? (
                      <>
                        <CheckSquare size={16} className="text-primary" />
                        <span>إلغاء تحديد الكل</span>
                      </>
                    ) : (
                      <>
                        <Square size={16} className="text-muted" />
                        <span>تحديد كل المعروض ({filteredRows.length})</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs font-bold text-white bg-primary/20 px-3 py-1.5 rounded-xl border border-primary/30">
                    تم تحديد: <span className="font-mono text-primary font-black">{selectedRowIndices.size}</span> من {allDataRows.length}
                  </span>
                </div>

                {/* Search in preview */}
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute right-3 top-2.5 text-muted" />
                  <input
                    type="text"
                    placeholder="فلترة الصفوف بالاسم أو المدرس..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0b1019] border border-white/15 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                  />
                </div>
              </div>

              {/* Options toggles */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-white hover:text-blue-400 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20">
                  <input
                    type="checkbox"
                    checked={onlyUpdateScript}
                    onChange={e => setOnlyUpdateScript(e.target.checked)}
                    className="rounded text-blue-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-blue-200 font-black">
                    📝 تحديث خانة السكريبت فقط (عدم المساس بأي حقول أخرى)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-white hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={autoGenerateCodes}
                    onChange={e => setAutoGenerateCodes(e.target.checked)}
                    className="rounded text-primary focus:ring-0 cursor-pointer"
                  />
                  <span>توليد كود تسلسلي تلقائي لكل صف لا يحتوي على كود (Auto Code) 🪄</span>
                </label>

                {!onlyUpdateScript && (
                  <label className="flex items-center gap-2 cursor-pointer select-none text-white hover:text-amber-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={e => setSkipDuplicates(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span>تخطي الصفوف المكررة المسجلة بالفعل في قاعدة البيانات</span>
                  </label>
                )}
              </div>

              {/* Data Table */}
              <div className="border border-white/10 rounded-2xl overflow-hidden max-h-[45vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white/10 text-white font-black sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="p-3 w-10 text-center">تحديد</th>
                      <th className="p-3">الكود المتولد</th>
                      <th className="p-3">السكريبت / العنوان</th>
                      <th className="p-3">المدرس</th>
                      <th className="p-3">اسم إضافي</th>
                      <th className="p-3">السنة</th>
                      <th className="p-3">الفرع</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">المقاس</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted">
                          لا توجد صفوف تطابق البحث الحالي
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map(row => {
                        const isSelected = selectedRowIndices.has(row.rowIndex);
                        const isDup = row.isDuplicate;

                        return (
                          <tr
                            key={row.rowIndex}
                            onClick={() => toggleRowSelect(row.rowIndex)}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-primary/10 hover:bg-primary/15'
                                : 'hover:bg-white/[0.03]'
                            } ${isDup && !onlyUpdateScript ? 'bg-amber-500/5' : isDup && onlyUpdateScript ? 'bg-blue-500/5' : ''}`}
                          >
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRowSelect(row.rowIndex)}
                                className="rounded text-primary focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-white text-[11px]" dir="ltr">
                              {row.code}
                            </td>
                            <td className="p-3 font-bold text-white max-w-[220px]" onClick={e => e.stopPropagation()}>
                              {row.script ? (
                                row.script.startsWith('http') ? (
                                  <a 
                                    href={row.script} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 hover:text-blue-200 border border-blue-500/30 max-w-[210px] truncate text-[11px] font-mono transition-colors cursor-pointer"
                                    title={row.script}
                                  >
                                    <ExternalLink size={12} className="shrink-0 text-blue-400" />
                                    <span className="truncate">{row.script.replace('https://docs.google.com/document/d/', 'Doc: ')}</span>
                                  </a>
                                ) : (
                                  <span className="text-white font-medium truncate block max-w-[200px]" title={row.script}>{row.script}</span>
                                )
                              ) : (
                                <span className="text-muted/40 italic">---</span>
                              )}
                            </td>
                            <td className="p-3 text-muted">{row.teacher || '---'}</td>
                            <td className="p-3 text-muted">{row.extraName || '---'}</td>
                            <td className="p-3 font-mono uppercase text-muted">{row.year}</td>
                            <td className="p-3 text-muted">{row.branch}</td>
                            <td className="p-3 text-muted">{row.type}</td>
                            <td className="p-3 text-muted font-mono">{row.format}</td>
                            <td className="p-3">
                              {onlyUpdateScript && isDup ? (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-black">
                                  تحديث السكريبت 📝
                                </span>
                              ) : isDup ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                                  كود مكرر
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                  جديد
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-muted font-bold">
            {activeStep === 'rows' && (
              <span>
                سيتم استيراد <strong className="text-white font-mono">{selectedRowIndices.size}</strong> صف إلى جدول Shooting
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            {activeStep === 'fetch' && allDataRows.length > 0 && (
              <button
                onClick={() => setActiveStep('mapping')}
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
              >
                <span>متابعة لتحديد الأعمدة</span>
                <ArrowRight size={14} className="rotate-180" />
              </button>
            )}

            {activeStep === 'mapping' && (
              <button
                onClick={() => setActiveStep('rows')}
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
              >
                <span>متابعة لاختيار الصفوف</span>
                <ArrowRight size={14} className="rotate-180" />
              </button>
            )}

            {activeStep === 'rows' && (
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || selectedRowIndices.size === 0}
                className="btn-primary bg-emerald-600 hover:bg-emerald-500 px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>جاري الاستيراد والتحديث...</span>
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    <span>استيراد ({selectedRowIndices.size}) صف إلى Shooting 🚀</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
