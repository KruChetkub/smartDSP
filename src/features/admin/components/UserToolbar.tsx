import React from 'react';
import { Download, Search, Upload, UserPlus } from 'lucide-react';

interface UserToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  totalUsersCount: number;
  canCreateUsers: boolean;
  canUseBulkUserTools: boolean;
  bulkImporting: boolean;
  onDownloadTemplate: () => void;
  onExportUsers: () => void;
  onOpenImport: () => void;
  onOpenCreate: () => void;
}

export const UserToolbar: React.FC<UserToolbarProps> = ({
  search,
  onSearchChange,
  totalUsersCount,
  canCreateUsers,
  canUseBulkUserTools,
  bulkImporting,
  onDownloadTemplate,
  onExportUsers,
  onOpenImport,
  onOpenCreate,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
          className="w-full rounded-md border border-slate-300 pl-10 pr-4 py-2 text-sm outline-none focus:border-brand-500"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">จำนวนผู้ใช้ทั้งหมด: {totalUsersCount} ท่าน</div>
        {canCreateUsers && (
          <div className="flex flex-wrap items-center gap-2">
            {canUseBulkUserTools && (
              <>
                <button
                  type="button"
                  onClick={onDownloadTemplate}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  เทมเพลต Excel
                </button>
                <button
                  type="button"
                  onClick={onExportUsers}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export ผู้ใช้งาน
                </button>
                <button
                  type="button"
                  onClick={onOpenImport}
                  disabled={bulkImporting}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {bulkImporting ? 'กำลังนำเข้า...' : 'นำเข้า Excel'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              เพิ่มผู้ใช้
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

