import { useEffect, useState } from 'react';
import { 
  FileDown, 
  Search, 
  Calendar, 
  Filter,
  ExternalLink
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { listTrainingReportRecords, type TrainingRecordRow } from '../../services/training.service';
import { formatThaiDate, getCurrentThaiFiscalYear } from '../../utils/thaiDate';
import { getSafeUserErrorMessage } from '../../utils/errorHandling';

const REPORT_PAGE_SIZE = 5;

export function ReportsPage() {
  const [records, setRecords] = useState<TrainingRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<number>(getCurrentThaiFiscalYear());
  const [reportPage, setReportPage] = useState(1);
  
  const years = Array.from({ length: 5 }, (_, i) => getCurrentThaiFiscalYear() - i);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await listTrainingReportRecords(year);
        setRecords(data);
      } catch (err) {
        setError(getSafeUserErrorMessage(err, 'ไม่สามารถโหลดข้อมูลรายงานได้'));
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [year]);

  const matchesSearch = (record: TrainingRecordRow) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return (
      record.course.toLowerCase().includes(query) ||
      record.personnel_name.toLowerCase().includes(query) ||
      record.position.toLowerCase().includes(query) ||
      record.department.toLowerCase().includes(query) ||
      record.work_group.toLowerCase().includes(query) ||
      record.category.toLowerCase().includes(query)
    );
  };

  const filteredRecords = records.filter(matchesSearch);
  const totalReportPages = Math.max(1, Math.ceil(filteredRecords.length / REPORT_PAGE_SIZE));
  const visibleReportPage = Math.min(reportPage, totalReportPages);
  const reportStartIndex = (visibleReportPage - 1) * REPORT_PAGE_SIZE;
  const paginatedRecords = filteredRecords.slice(reportStartIndex, reportStartIndex + REPORT_PAGE_SIZE);

  useEffect(() => {
    setReportPage(1);
  }, [search, year]);

  useEffect(() => {
    setReportPage((currentPage) => Math.min(currentPage, totalReportPages));
  }, [totalReportPages]);

  const buildExcelRows = (targetRecords: TrainingRecordRow[]) => targetRecords.map((record, index) => ({
    'ลำดับที่': index + 1,
    'ชื่อ-นามสกุล': record.personnel_name,
    'ตำแหน่ง': record.position,
    'กลุ่มงาน': record.work_group,
    'ประเภทหลักสูตร': record.category,
    'หลักสูตร': record.course,
    'วันที่': formatThaiDate(record.date),
    'ปีงบประมาณ': record.year,
    'ใบประกาศ': record.certificate_name || '',
    'ลิงก์ใบประกาศ': record.certificate_link || '',
  }));

  const exportExcel = async (scope: 'all' | 'year') => {
    const targetRecords = scope === 'year'
      ? filteredRecords
      : (await listTrainingReportRecords()).filter(matchesSearch);

    if (targetRecords.length === 0) return;

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(buildExcelRows(targetRecords));
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 28 },
      { wch: 30 },
      { wch: 24 },
      { wch: 46 },
      { wch: 16 },
      { wch: 14 },
      { wch: 28 },
      { wch: 48 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Training Report');
    const fileName = scope === 'year' ? `training_report_${year}.xlsx` : 'training_report_all.xlsx';
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Reports"
        description="สร้างรายงานสรุปการอบรมรายบุคคลและรายหน่วยงาน พร้อมส่งออกข้อมูลเป็น Excel"
      />

      {/* Filters Section */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหลักสูตร หรือชื่อบุคลากร..."
            className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 bg-slate-50">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select 
              className="bg-transparent text-sm font-medium outline-none"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>ปีงบประมาณ {y}</option>)}
            </select>
          </div>
          <button 
            onClick={() => void exportExcel('all')}
            className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            <FileDown className="h-4 w-4" /> Export Excel ทั้งหมด
          </button>
          <button 
            onClick={() => void exportExcel('year')}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="h-4 w-4" /> Export Excel ตามปีงบประมาณ
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{error}</div>}

      {/* Report Table Summary */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Filter className="h-4 w-4 text-brand-600" />
            ตารางสรุปผลการอบรม ({filteredRecords.length} รายการ)
          </h3>
          <div className="text-xs text-slate-500">
            แสดงข้อมูลปีงบประมาณ {year}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="whitespace-nowrap px-4 py-3 text-left">ลำดับที่</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">ชื่อ-นามสกุล</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">ตำแหน่ง</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">กลุ่มงาน</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">ประเภทหลักสูตร</th>
                <th className="min-w-72 px-4 py-3 text-left">หลักสูตร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">วันที่</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">ปีงบประมาณ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">ใบประกาศ</th>
                <th className="min-w-72 px-4 py-3 text-left">ลิงก์ใบประกาศ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="px-4 py-4"><div className="h-10 bg-slate-100 rounded"></div></td>
                  </tr>
                ))
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">ไม่พบข้อมูลการอบรมตามเงื่อนไขที่ระบุ</td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{reportStartIndex + index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{record.personnel_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.position}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.work_group}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.category}</td>
                    <td className="min-w-72 px-4 py-3 font-medium text-slate-900">{record.course}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatThaiDate(record.date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.year}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.certificate_name || ''}</td>
                    <td className="min-w-72 px-4 py-3 text-slate-600">
                      {record.certificate_link ? (
                        <a
                          href={record.certificate_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                        >
                          {record.certificate_link}
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > REPORT_PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span>
              หน้า {visibleReportPage.toLocaleString('th-TH')} / {totalReportPages.toLocaleString('th-TH')} · แสดง {paginatedRecords.length.toLocaleString('th-TH')} จาก {filteredRecords.length.toLocaleString('th-TH')} รายการ
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReportPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={visibleReportPage <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <button
                type="button"
                onClick={() => setReportPage((currentPage) => Math.min(totalReportPages, currentPage + 1))}
                disabled={visibleReportPage >= totalReportPages}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
