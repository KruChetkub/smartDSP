import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Edit2, FileSpreadsheet, Search, Trash2, Upload, X } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  listTrainingRecords,
  deleteTrainingRecord,
  getTrainingRecordDetails,
  updateTrainingRecord,
  importTrainingRecordsFromRows,
  type TrainingImportInputRow,
  type TrainingImportResult,
  type TrainingRecordRow,
} from '../../services/training.service';
import { TrainingForm } from '../../components/training/TrainingForm';
import { useAuthStore } from '../../stores/auth.store';
import { normalizeTrainingType, trainingTypeOptions, type TrainingFormValues } from '../self-service/training-form.schema';
import { formatThaiDate, getThaiFiscalYearFromISODate } from '../../utils/thaiDate';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

const pageSize = 10;

const trainingImportHeaders = [
  'รหัสรายการ',
  'รหัสบุคลากร',
  'ชื่อบุคลากร',
  'ประเภทหลักสูตร',
  'ชื่อหลักสูตร',
  'หน่วยงานผู้จัด',
  'วันที่อบรม (วว/ดด/ปปปป พ.ศ.)',
  'ปีงบประมาณ',
  'ชื่อใบประกาศ',
  'ลิงก์ใบประกาศ',
];

type TrainingImportRawRow = {
  recordId: string;
  employeeCode: string;
  personnelName: string;
  trainingType: string;
  courseName: string;
  organizer: string;
  date: string;
  year: string;
  certificateName: string;
  certificateLink: string;
};

const importHeaderMap: Record<string, keyof TrainingImportRawRow> = {
  'รหัสรายการ': 'recordId',
  record_id: 'recordId',
  id: 'recordId',
  'รหัสบุคลากร': 'employeeCode',
  employee_code: 'employeeCode',
  'ชื่อบุคลากร': 'personnelName',
  personnel_name: 'personnelName',
  'ประเภทหลักสูตร': 'trainingType',
  training_type: 'trainingType',
  category: 'trainingType',
  'ชื่อหลักสูตร': 'courseName',
  course_name: 'courseName',
  course: 'courseName',
  'หน่วยงานผู้จัด': 'organizer',
  organizer: 'organizer',
  'วันที่อบรม (วว/ดด/ปปปป พ.ศ.)': 'date',
  'วันที่อบรม': 'date',
  date: 'date',
  'ปีงบประมาณ': 'year',
  year: 'year',
  'ชื่อใบประกาศ': 'certificateName',
  certificate_name: 'certificateName',
  'ลิงก์ใบประกาศ': 'certificateLink',
  certificate_link: 'certificateLink',
};

function createEmptyImportRow(): TrainingImportRawRow {
  return {
    recordId: '',
    employeeCode: '',
    personnelName: '',
    trainingType: '',
    courseName: '',
    organizer: '',
    date: '',
    year: '',
    certificateName: '',
    certificateLink: '',
  };
}

function excelSerialDateToISO(serial: number) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatExcelCellValue(value: unknown, cell?: { w?: string; t?: string }) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = value.getUTCDate();
    const month = value.getUTCMonth() + 1;
    const year = value.getUTCFullYear() + 543;
    return `${day}/${month}/${year}`;
  }

  if (typeof value === 'number') {
    return cell?.t === 'n' && value > 20000 ? excelSerialDateToISO(value) : String(value);
  }

  return String(cell?.w ?? value ?? '').trim();
}

function parseDelimitedText(text: string) {
  const delimiter = text.includes('\t') ? '\t' : ',';
  return text
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

function rowsToImportRows(rows: string[][]) {
  const [headerRow, ...bodyRows] = rows;
  if (!headerRow) return [];

  const keys = headerRow.map((header) => importHeaderMap[header.trim()] ?? null);

  return bodyRows
    .map((bodyRow) => {
      const row = createEmptyImportRow();

      keys.forEach((key, index) => {
        if (key) row[key] = bodyRow[index]?.trim() ?? '';
      });

      return row;
    })
    .filter((row) => Object.values(row).some((value) => value.trim().length > 0));
}

async function readTrainingImportRows(file: File) {
  const lowerFileName = file.name.toLowerCase();

  if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const sheet = workbook.Sheets[firstSheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
    const rows: string[][] = [];

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      const row: string[] = [];

      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = sheet[address] as { v?: unknown; w?: string; t?: string } | undefined;
        row.push(cell ? formatExcelCellValue(cell.v, cell) : '');
      }

      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
    }

    return rowsToImportRows(rows);
  }

  const text = (await file.text()).replace(/^\uFEFF/, '');
  return rowsToImportRows(parseDelimitedText(text));
}

function normalizeDateToISO(value: string, rowNumber: number) {
  const cleaned = value.trim().replace(/\s+/g, '').replace(/\//g, '-');

  if (!cleaned) {
    throw new Error(`แถว ${rowNumber}: กรุณากรอกวันที่อบรม`);
  }

  const parts = cleaned.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`แถว ${rowNumber}: วันที่อบรมต้องเป็นรูปแบบ วว/ดด/ปปปป หรือ yyyy-mm-dd`);
  }

  const firstPartIsYear = cleaned.split('-')[0].length === 4;
  const rawYear = firstPartIsYear ? parts[0] : parts[2];
  const year = rawYear > 2400 ? rawYear - 543 : rawYear;
  const month = parts[1];
  const day = firstPartIsYear ? parts[2] : parts[0];
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new Error(`แถว ${rowNumber}: วันที่อบรมไม่ถูกต้อง`);
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeImportRows(rows: TrainingImportRawRow[]): TrainingImportInputRow[] {
  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const date = normalizeDateToISO(row.date, rowNumber);
    const year = row.year.trim() ? Number(row.year.trim()) : getThaiFiscalYearFromISODate(date);

    if (!Number.isInteger(year) || year < 2400 || year > 2700) {
      throw new Error(`แถว ${rowNumber}: ปีงบประมาณไม่ถูกต้อง`);
    }

    return {
      recordId: row.recordId.trim(),
      employeeCode: row.employeeCode.trim(),
      personnelName: row.personnelName.trim(),
      trainingType: normalizeTrainingType(row.trainingType).trim(),
      courseName: row.courseName.trim(),
      organizer: row.organizer.trim(),
      date,
      year,
      certificateName: row.certificateName.trim(),
      certificateLink: row.certificateLink.trim(),
    };
  });
}

function getStatusBadgeClass(status: TrainingImportResult['items'][number]['status']) {
  if (status === 'created') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'updated') return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (status === 'error') return 'bg-red-50 text-red-700 ring-red-200';
  return 'bg-slate-50 text-slate-600 ring-slate-200';
}

function getStatusLabel(status: TrainingImportResult['items'][number]['status']) {
  if (status === 'created') return 'เพิ่มใหม่';
  if (status === 'updated') return 'อัปเดต';
  if (status === 'error') return 'ไม่สำเร็จ';
  return 'ข้าม';
}

export function TrainingRecordsPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<TrainingRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<TrainingImportResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; course: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TrainingFormValues> | null>(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const sortedRecords = useMemo(
    () => [...records].sort((first, second) => {
      const nameCompare = first.personnel_name.localeCompare(second.personnel_name, 'th');
      if (nameCompare !== 0) return nameCompare;

      const courseCompare = first.course.localeCompare(second.course, 'th');
      if (courseCompare !== 0) return courseCompare;

      return second.date.localeCompare(first.date);
    }),
    [records],
  );
  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return sortedRecords;

    return sortedRecords.filter((record) => {
      const searchableValues = [
        record.personnel_name,
        record.course,
        formatThaiDate(record.date, ''),
        record.date,
        String(record.year),
      ];

      return searchableValues.some((value) => value.toLowerCase().includes(keyword));
    });
  }, [search, sortedRecords]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleRecords = useMemo(() => filteredRecords.slice(pageStart, pageStart + pageSize), [filteredRecords, pageStart]);

  const loadRecords = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listTrainingRecords();
      setRecords(data);
      setPage(1);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลอบรมได้'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDownloadTemplate = async () => {
    const exportRows = sortedRecords.map((record) => [
      record.id,
      record.employee_code || '',
      record.personnel_name,
      record.category,
      record.course,
      record.organizer,
      formatThaiDate(record.date, ''),
      record.year,
      record.certificate_name || '',
      record.certificate_link || '',
    ]);

    const sampleRows = exportRows.length > 0 ? exportRows : [[
      '',
      'EMP001',
      'ตัวอย่าง ผู้เข้าอบรม',
      trainingTypeOptions[0],
      'ชื่อหลักสูตรตัวอย่าง',
      'หน่วยงานผู้จัดตัวอย่าง',
      '01/01/2569',
      2569,
      '',
      '',
    ]];

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.aoa_to_sheet([trainingImportHeaders, ...sampleRows]);
    worksheet['!cols'] = [
      { wch: 38 },
      { wch: 18 },
      { wch: 28 },
      { wch: 24 },
      { wch: 42 },
      { wch: 32 },
      { wch: 28 },
      { wch: 14 },
      { wch: 28 },
      { wch: 42 },
    ];

    for (let rowIndex = 2; rowIndex <= sampleRows.length + 1; rowIndex += 1) {
      ['A', 'B', 'G', 'J'].forEach((column) => {
        const cellAddress = `${column}${rowIndex}`;
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].t = 's';
          worksheet[cellAddress].z = '@';
        }
      });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'training_records');
    XLSX.writeFile(workbook, 'training-records-import-template.xlsx');
  };

  const handleImportTrainingRecords = async () => {
    if (!user) {
      setImportError('ไม่พบข้อมูลผู้ใช้งาน กรุณา Login ใหม่อีกครั้ง');
      return;
    }

    if (!importFile) {
      setImportError('กรุณาเลือกไฟล์ Excel ก่อนนำเข้า');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const rawRows = await readTrainingImportRows(importFile);
      if (rawRows.length === 0) {
        setImportError('ไม่พบข้อมูลอบรมในไฟล์ที่นำเข้า');
        return;
      }

      const importRows = normalizeImportRows(rawRows);
      const result = await importTrainingRecordsFromRows(importRows, user.id);
      setImportResult(result);
      setImportFile(null);
      await loadRecords();
    } catch (err) {
      setImportError(getSafeUserErrorMessage(err, 'ไม่สามารถนำเข้าไฟล์ Excel ได้'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = (id: string, course: string) => {
    setDeleteTarget({ id, course });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteTrainingRecord(deleteTarget.id);
      setRecords((prev) => prev.filter((record) => record.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(getSafeUserErrorMessage(err, 'ไม่สามารถลบข้อมูลได้'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = async (id: string) => {
    setEditingId(id);
    setEditError(null);
    setIsFetchingDetails(true);
    try {
      const { record, certificate, analysis } = await getTrainingRecordDetails(id);

      setEditValues({
        trainingType: normalizeTrainingType(record.category),
        courseName: record.course,
        organizer: record.organizer,
        date: record.date,
        year: record.year,
        certificateName: certificate?.certificate_name || '',
        certificateLink: certificate?.certificate_link || '',
        developmentArea: analysis?.development_area || '',
        skillGroup: analysis?.skill_group || '',
        targetDirection: analysis?.target_direction || '',
      });
    } catch (err) {
      setEditError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลรายละเอียดได้'));
      setEditingId(null);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleUpdate = async (values: TrainingFormValues) => {
    if (!editingId) return;

    setEditError(null);
    setIsUpdating(true);
    try {
      await updateTrainingRecord(editingId, values);

      setEditingId(null);
      setEditValues(null);
      void loadRecords();
    } catch (err) {
      setEditError(getSafeUserErrorMessage(err, 'ไม่สามารถอัปเดตข้อมูลได้'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <PageHeader title="Training Records" description="ตารางข้อมูลอบรม" />

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,420px)_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-brand-700">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">ค้นหาชื่อ-สกุล/นำเข้ารายชื่อผู้เข้าอบรม</h2>
              <p className="text-xs text-slate-500">ดาวน์โหลดเทมเพลต แก้ไขรายการ แล้วนำกลับเข้าเพื่อเพิ่มหรืออัปเดตข้อมูล</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              placeholder="ค้นหา ชื่อ-สกุล / หลักสูตร / วันที่ / ปีงบประมาณ"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => void handleDownloadTemplate()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              เทมเพลต Excel
            </button>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              {importFile ? importFile.name : 'เลือกไฟล์'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="sr-only"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] || null);
                  setImportError(null);
                  event.target.value = '';
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => void handleImportTrainingRecords()}
              disabled={isImporting}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {isImporting ? 'กำลังนำเข้า...' : 'นำเข้า Excel'}
            </button>
          </div>
        </div>

        {importError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {importError}
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">ลำดับที่</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">บุคลากร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">ประเภทหลักสูตร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">หลักสูตร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">วันที่</th>
                <th className="whitespace-nowrap px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                    {records.length === 0 ? 'ยังไม่มีข้อมูลอบรม' : 'ไม่พบข้อมูลที่ค้นหา'}
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{pageStart + index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{record.personnel_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.category}</td>
                    <td className="min-w-64 px-4 py-3 text-slate-700">{record.course}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatThaiDate(record.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => void handleEditClick(record.id)}
                          className="rounded p-1 text-brand-600 transition hover:bg-brand-50"
                          title="แก้ไข"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(record.id, record.course)}
                          className="rounded p-1 text-red-600 transition hover:bg-red-50"
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredRecords.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              แสดง {pageStart + 1}-{Math.min(pageStart + visibleRecords.length, filteredRecords.length)} จาก {filteredRecords.length} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                ก่อนหน้า
              </button>
              <span className="min-w-20 text-center text-sm font-medium text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {importResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">รายการนำเข้าและอัปเดต</h2>
                <p className="mt-1 text-sm text-slate-500">
                  เพิ่มใหม่ {importResult.created} รายการ · อัปเดต {importResult.updated} รายการ · ไม่สำเร็จ {importResult.failed} รายการ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">แถว</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">สถานะ</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">บุคลากร</th>
                      <th className="min-w-64 px-4 py-3 text-left font-semibold text-slate-600">หลักสูตร</th>
                      <th className="min-w-64 px-4 py-3 text-left font-semibold text-slate-600">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importResult.items.map((item) => (
                      <tr key={`${item.rowNumber}-${item.courseName}-${item.status}`}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.rowNumber}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ring-1 ${getStatusBadgeClass(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{item.personnelName}</td>
                        <td className="px-4 py-3 text-slate-700">{item.courseName}</td>
                        <td className="px-4 py-3 text-slate-600">{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}


      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ยืนยันการลบข้อมูลการอบรม"
        message={deleteTarget ? `ต้องการลบข้อมูลการอบรมหลักสูตร "${deleteTarget.course}" ใช่หรือไม่? เมื่อลบแล้วข้อมูลจะถูกลบออกจากฐานข้อมูล` : ''}
        confirmLabel={isDeleting ? 'กำลังลบ...' : 'ลบข้อมูล'}
        cancelLabel="ยกเลิก"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        isLoading={isDeleting}
      />
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">แก้ไขข้อมูลการอบรม</h2>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditValues(null);
                  setEditError(null);
                }}
                disabled={isUpdating}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isFetchingDetails ? (
              <div className="py-12 text-center text-slate-500">กำลังโหลดรายละเอียด...</div>
            ) : (
              editValues && (
                <>
                  {editError ? (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {editError}
                    </div>
                  ) : null}
                  <TrainingForm
                    key={`edit-${editingId}`}
                    initialValues={editValues}
                    onSubmit={handleUpdate}
                    onCancel={() => {
                      setEditingId(null);
                      setEditValues(null);
                      setEditError(null);
                    }}
                    isLoading={isUpdating}
                    submitLabel="บันทึกการแก้ไข"
                    showDevelopmentAnalysis={false}
                  />
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}