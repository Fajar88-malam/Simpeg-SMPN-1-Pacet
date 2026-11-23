import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  DEPARTEMEN_LIST,
  type Departemen,
  type Employee,
  type SchoolProfile,
  type StatusKepegawaian,
} from '../types/kepegawaian';
import { formatFullName, validateEmployeeDUK } from '../utils/dukValidator';
import { exportEmployeesCSV, exportEmployeesPDF } from '../utils/exporters';

interface EmployeeDirectoryViewProps {
  employees: Employee[];
  schoolProfile: SchoolProfile;
  loading: boolean;
  isAdmin: boolean;
  myEmployeeId: string | null;
  onAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (emp: Employee) => void;
  onNavigatePersonal: () => void;
}

export const EmployeeDirectoryView: React.FC<EmployeeDirectoryViewProps> = ({
  employees,
  schoolProfile,
  loading,
  isAdmin,
  myEmployeeId,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onNavigatePersonal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<Departemen | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StatusKepegawaian | 'ALL'>('ALL');

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      if (selectedDept !== 'ALL' && emp.departemen !== selectedDept) return false;
      if (selectedStatus !== 'ALL' && emp.statusKepegawaian !== selectedStatus) return false;
      if (!q) return true;
      const fullName = formatFullName(emp).toLowerCase();
      return (
        fullName.includes(q) ||
        emp.nip.toLowerCase().includes(q) ||
        emp.jabatan.toLowerCase().includes(q) ||
        emp.departemen.toLowerCase().includes(q) ||
        emp.pangkatGolongan.toLowerCase().includes(q)
      );
    });
  }, [employees, searchQuery, selectedDept, selectedStatus]);

  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: employees.length };
    for (const d of DEPARTEMEN_LIST) counts[d] = 0;
    for (const e of employees) {
      counts[e.departemen] = (counts[e.departemen] || 0) + 1;
    }
    return counts;
  }, [employees]);

  const handleExportCSV = () => {
    const suffix = selectedDept === 'ALL' ? 'semua-departemen' : selectedDept.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportEmployeesCSV(filteredEmployees, `pegawai-smpn1-pacet-${suffix}.csv`);
  };

  const handleExportPDF = () => {
    const deptLabel = selectedDept === 'ALL' ? 'Semua Departemen' : selectedDept;
    const suffix = selectedDept === 'ALL' ? 'semua-departemen' : selectedDept.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportEmployeesPDF(
      filteredEmployees,
      deptLabel,
      `pegawai-smpn1-pacet-${suffix}.pdf`,
      schoolProfile
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Administrator Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Data Pegawai SMP Negeri 1 Pacet
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Dinas Pendidikan Pemuda dan Olahraga Kabupaten Cianjur · Direktori ASN, PPPK, dan Tenaga Kependidikan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredEmployees.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Ekspor CSV
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={filteredEmployees.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4 text-rose-700" />
                Ekspor PDF
              </button>
              <button
                type="button"
                onClick={onAddEmployee}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                Tambah Pegawai
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onNavigatePersonal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-700 text-white text-sm font-medium rounded-lg hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              Edit Data Pribadi Saya
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan Kuantitatif Ringkas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Pegawai Tercatat</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">
            {employees.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {filteredEmployees.length} tampil sesuai filter
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Pegawai Negeri Sipil (PNS)</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">
            {employees.filter((e) => e.statusKepegawaian === 'PNS').length}
          </p>
          <p className="mt-1 text-xs text-slate-500">ASN Disdikpora Cianjur</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">PPPK &amp; Honorer Daerah</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">
            {employees.filter((e) => e.statusKepegawaian !== 'PNS').length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {employees.filter((e) => e.statusKepegawaian === 'PPPK').length} PPPK ·{' '}
            {employees.filter((e) => e.statusKepegawaian === 'Honorer Daerah').length} Kontrak
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Kepatuhan Validasi DUK</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">
            {employees.filter((e) => validateEmployeeDUK(e).isValid).length}
            <span className="text-sm font-normal text-slate-500"> / {employees.length}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Lolos validasi NIP &amp; TMT otomatis</p>
        </div>
      </div>

      {/* Filter Pencarian & Departemen */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pegawai, NIP 18 digit, jabatan, atau golongan..."
              aria-label="Cari pegawai"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-sky-600 transition-colors"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as Departemen | 'ALL')}
              aria-label="Filter berdasarkan departemen"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 transition-colors"
            >
              <option value="ALL">Semua Departemen ({deptCounts.ALL || 0})</option>
              {DEPARTEMEN_LIST.map((dept) => (
                <option key={dept} value={dept}>
                  {dept} ({deptCounts[dept] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as StatusKepegawaian | 'ALL')}
              aria-label="Filter status kepegawaian"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:bg-white focus:border-sky-600 transition-colors"
            >
              <option value="ALL">Semua Status Kepegawaian</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="Honorer Daerah">Honorer Daerah</option>
            </select>
          </div>
        </div>

        {/* Segmented Department Quick Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              selectedDept === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            Semua ({deptCounts.ALL || 0})
          </button>
          {DEPARTEMEN_LIST.map((dept) => (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedDept === dept
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {dept} ({deptCounts[dept] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Data Pegawai */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-slate-900">
              Tidak ada data pegawai yang sesuai
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {employees.length === 0
                ? 'Basis data kepegawaian masih kosong. Administrator dapat memuat data awal SMP Negeri 1 Pacet atau menambahkan pegawai baru.'
                : 'Ubah kata kunci pencarian atau filter departemen untuk menampilkan pegawai.'}
            </p>
            {employees.length === 0 && isAdmin && (
              <button
                type="button"
                onClick={onAddEmployee}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Pegawai Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Pegawai</th>
                  <th className="py-3 px-4">NIP / NI PPPK</th>
                  <th className="py-3 px-4">Jabatan</th>
                  <th className="py-3 px-4">Departemen</th>
                  <th className="py-3 px-4">Golongan · Status</th>
                  <th className="py-3 px-4">Validasi</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredEmployees.map((emp, idx) => {
                  const validation = validateEmployeeDUK(emp);
                  const isMine = myEmployeeId === emp.id;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isMine ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-mono-tabular text-xs text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">
                          {formatFullName(emp)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {emp.pendidikanJenjang} {emp.pendidikanJurusan}
                          {isMine ? ' · Akun Anda' : ''}
                          {emp.ownerUid ? ' · Akun Terkait' : ' · Belum Klaim Akun'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-slate-800 whitespace-nowrap">
                        {emp.nip}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        <div>{emp.jabatan}</div>
                        <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          TMT {emp.tmtJabatan}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{emp.departemen}</td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 text-xs font-medium">
                          {emp.pangkatGolongan}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {emp.statusKepegawaian} · MK {emp.masaKerjaTahun} Thn {emp.masaKerjaBulan} Bln
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {validation.statusLabel === 'Valid DUK' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Valid DUK
                          </span>
                        ) : validation.statusLabel === 'Peringatan' ? (
                          <span
                            title={validation.warnings.join(' ')}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Peringatan ({validation.warnings.length})
                          </span>
                        ) : (
                          <span
                            title={validation.errors.join(' ')}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Perlu Perbaikan
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditEmployee(emp)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit Data Pegawai"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteEmployee(emp)}
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              title="Hapus Data Pegawai"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
          <span>
            Fitur ekspor resmi CSV dan PDF serta pengelolaan seluruh data master pegawai tersedia khusus untuk akun Administrator kepegawaian.
          </span>
          <Download className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      )}
    </div>
  );
};
