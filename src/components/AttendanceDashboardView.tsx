import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Sparkles,
  Calendar,
  Briefcase,
  FileWarning,
} from 'lucide-react';
import {
  DEPARTEMEN_LIST,
  type AttendanceRecord,
  type AttendanceStatus,
  type Departemen,
  type Employee,
} from '../types/kepegawaian';
import { formatFullName } from '../utils/dukValidator';

interface AttendanceDashboardViewProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  selectedDate: string;
  onChangeDate: (date: string) => void;
  myEmployee: Employee | null;
  isAdmin: boolean;
  onSubmitAttendance: (params: {
    employee: Employee;
    status: AttendanceStatus;
    notes: string;
  }) => Promise<void>;
  onCheckOut: (record: AttendanceRecord) => Promise<void>;
  onNavigatePersonal: () => void;
}

interface AttendanceInsightResult {
  ringkasanKehadiran?: string;
  sorotanDepartemen?: string[];
  tindakLanjutPimpinan?: string[];
}

export const AttendanceDashboardView: React.FC<AttendanceDashboardViewProps> = ({
  employees,
  attendanceRecords,
  selectedDate,
  onChangeDate,
  myEmployee,
  isAdmin,
  onSubmitAttendance,
  onCheckOut,
  onNavigatePersonal,
}) => {
  const [filterDept, setFilterDept] = useState<Departemen | 'ALL'>('ALL');
  const [selectedStatusInput, setSelectedStatusInput] = useState<AttendanceStatus>('Hadir');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminTargetId, setAdminTargetId] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AttendanceInsightResult | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isToday = selectedDate === todayStr;

  const dateLogs = useMemo(
    () => attendanceRecords.filter((r) => r.date === selectedDate),
    [attendanceRecords, selectedDate]
  );

  const filteredEmployees = useMemo(() => {
    if (filterDept === 'ALL') return employees;
    return employees.filter((e) => e.departemen === filterDept);
  }, [employees, filterDept]);

  const logByEmployeeId = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of dateLogs) {
      map.set(r.employeeId, r);
    }
    return map;
  }, [dateLogs]);

  const summary = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izinSakit = 0;
    let dinasLuar = 0;
    for (const emp of filteredEmployees) {
      const log = logByEmployeeId.get(emp.id);
      if (!log) continue;
      if (log.status === 'Hadir') hadir += 1;
      else if (log.status === 'Terlambat') terlambat += 1;
      else if (log.status === 'Izin' || log.status === 'Sakit') izinSakit += 1;
      else if (log.status === 'Dinas Luar') dinasLuar += 1;
    }
    const recorded = hadir + terlambat + izinSakit + dinasLuar;
    const belumAbsen = Math.max(0, filteredEmployees.length - recorded);
    return { hadir, terlambat, izinSakit, dinasLuar, belumAbsen, total: filteredEmployees.length };
  }, [filteredEmployees, logByEmployeeId]);

  const departmentBreakdown = useMemo(() => {
    return DEPARTEMEN_LIST.map((dept) => {
      const members = employees.filter((e) => e.departemen === dept);
      let hadir = 0;
      let nonHadir = 0;
      for (const m of members) {
        const log = logByEmployeeId.get(m.id);
        if (log && (log.status === 'Hadir' || log.status === 'Terlambat' || log.status === 'Dinas Luar')) {
          hadir += 1;
        } else if (log) {
          nonHadir += 1;
        }
      }
      return {
        departemen: dept,
        totalPegawai: members.length,
        hadirAtauTugas: hadir,
        izinAtauSakit: nonHadir,
        belumAbsen: Math.max(0, members.length - hadir - nonHadir),
      };
    });
  }, [employees, logByEmployeeId]);

  const myTodayRecord = myEmployee ? logByEmployeeId.get(myEmployee.id) : undefined;

  const handlePersonalCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmployee) return;
    setSubmitting(true);
    try {
      await onSubmitAttendance({
        employee: myEmployee,
        status: selectedStatusInput,
        notes: notesInput.trim(),
      });
      setNotesInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminRecordForEmployee = async () => {
    const target = employees.find((e) => e.id === adminTargetId);
    if (!target) return;
    setSubmitting(true);
    try {
      await onSubmitAttendance({
        employee: target,
        status: selectedStatusInput,
        notes: notesInput.trim() || 'Dicatat oleh Administrator',
      });
      setAdminTargetId('');
      setNotesInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/gemini/attendance-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          summary,
          departmentBreakdown,
          recentLogs: dateLogs.map((l) => ({
            nama: l.employeeName,
            departemen: l.departemen,
            status: l.status,
            checkIn: l.checkInTime,
            checkOut: l.checkOutTime,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuat ringkasan absensi AI.');
      }
      setAiInsight(data.insight);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gagal menghubungi layanan Gemini AI.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard Absensi Real-Time
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pemantauan kehadiran langsung SMP Negeri 1 Pacet · Tersinkron otomatis dengan Firestore
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              aria-label="Tanggal absensi"
              className="text-sm font-mono-tabular text-slate-900 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateInsights}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-700 text-white text-sm font-medium rounded-lg hover:bg-sky-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Menyusun Laporan...' : 'Ringkasan Kehadiran AI'}
          </button>
        </div>
      </div>

      {/* KPI Kehadiran Real-Time */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Hadir Tepat Waktu</p>
          <p className="mt-1.5 text-2xl font-semibold text-emerald-700 tabular-nums">
            {summary.hadir}
          </p>
          <p className="mt-1 text-xs text-slate-500">dari {summary.total} pegawai</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Terlambat</p>
          <p className="mt-1.5 text-2xl font-semibold text-amber-700 tabular-nums">
            {summary.terlambat}
          </p>
          <p className="mt-1 text-xs text-slate-500">Presensi lewat jam masuk</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Dinas Luar</p>
          <p className="mt-1.5 text-2xl font-semibold text-sky-700 tabular-nums">
            {summary.dinasLuar}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tugas luar / MGMP / Disdik</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Izin / Sakit</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">
            {summary.izinSakit}
          </p>
          <p className="mt-1 text-xs text-slate-500">Dengan keterangan resmi</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 col-span-2 md:col-span-1">
          <p className="text-xs font-medium text-slate-500">Belum Absen</p>
          <p className="mt-1.5 text-2xl font-semibold text-slate-700 tabular-nums">
            {summary.belumAbsen}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tanggal {selectedDate}</p>
        </div>
      </div>

      {/* Gemini AI Attendance Insight */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {aiError}
        </div>
      )}

      {aiInsight && (
        <div className="bg-white border border-sky-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-base font-semibold text-slate-900">
              Laporan Singkat Kehadiran (Gemini AI)
            </h2>
            <button
              type="button"
              onClick={() => setAiInsight(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Tutup
            </button>
          </div>
          {aiInsight.ringkasanKehadiran && (
            <p className="text-sm text-slate-700 leading-relaxed">{aiInsight.ringkasanKehadiran}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 pt-1">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1.5">Sorotan Per Departemen</h3>
              <ul className="space-y-1">
                {aiInsight.sorotanDepartemen?.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-1.5">Tindak Lanjut Pimpinan</h3>
              <ul className="space-y-1">
                {aiInsight.tindakLanjutPimpinan?.map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Panel Presensi Pribadi / Pencatatan Admin */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Presensi Pribadi Pegawai
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Catat kehadiran masuk, pulang, atau tugas luar untuk akun Anda hari ini
            </p>
          </div>

          {!myEmployee ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Akun Google Anda belum terhubung dengan profil NIP pegawai SMPN 1 Pacet. Hubungkan profil Anda terlebih dahulu untuk mengisi presensi pribadi.
              </p>
              <button
                type="button"
                onClick={onNavigatePersonal}
                className="px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
              >
                Hubungkan Profil Pegawai
              </button>
            </div>
          ) : !isToday ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              Presensi mandiri hanya dapat dicatat untuk tanggal hari ini ({todayStr}).
              <button
                type="button"
                onClick={() => onChangeDate(todayStr)}
                className="block mt-2 text-sky-700 font-medium hover:underline"
              >
                Kembali ke tanggal hari ini
              </button>
            </div>
          ) : myTodayRecord ? (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Presensi Tercatat: {myTodayRecord.status}
                </div>
                <p className="text-xs text-slate-700">
                  {formatFullName(myEmployee)} · {myEmployee.departemen}
                </p>
                <p className="text-xs font-mono-tabular text-slate-600">
                  Masuk: {myTodayRecord.checkInTime || '-'} · Pulang:{' '}
                  {myTodayRecord.checkOutTime || 'Belum Check-Out'}
                </p>
              </div>

              {!myTodayRecord.checkOutTime &&
                (myTodayRecord.status === 'Hadir' ||
                  myTodayRecord.status === 'Terlambat' ||
                  myTodayRecord.status === 'Dinas Luar') && (
                  <button
                    type="button"
                    onClick={() => onCheckOut(myTodayRecord)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Catat Jam Pulang (Check-Out)
                  </button>
                )}
            </div>
          ) : (
            <form onSubmit={handlePersonalCheckIn} className="space-y-3">
              <div className="text-xs text-slate-600">
                Pegawai: <span className="font-semibold text-slate-900">{formatFullName(myEmployee)}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={selectedStatusInput}
                  onChange={(e) => setSelectedStatusInput(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                >
                  <option value="Hadir">Hadir di Sekolah</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Dinas Luar">Dinas Luar / Tugas Disdik</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Keterangan / Nomor Surat Tugas (Opsional)
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Contoh: Mengajar kelas VIII / Rapat Disdikpora Cianjur"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {submitting ? 'Mengirim Presensi...' : 'Catat Presensi Sekarang'}
              </button>
            </form>
          )}

          {isAdmin && isToday && (
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <p className="text-xs font-semibold text-slate-900">
                Input Presensi oleh Administrator
              </p>
              <div className="flex gap-2">
                <select
                  value={adminTargetId}
                  onChange={(e) => setAdminTargetId(e.target.value)}
                  aria-label="Pilih pegawai untuk presensi admin"
                  className="flex-1 px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Pilih pegawai...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatFullName(e)} ({e.departemen})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!adminTargetId || submitting}
                  onClick={handleAdminRecordForEmployee}
                  className="px-3 py-2 bg-sky-700 text-white text-xs font-medium rounded-lg hover:bg-sky-800 disabled:opacity-50 whitespace-nowrap"
                >
                  Catat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ringkasan Kehadiran Per Departemen */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Rekap Kehadiran Per Departemen
            </h2>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value as Departemen | 'ALL')}
              aria-label="Filter departemen absensi"
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="ALL">Semua Departemen</option>
              {DEPARTEMEN_LIST.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Departemen</th>
                  <th className="py-2.5 px-3 text-right">Pegawai</th>
                  <th className="py-2.5 px-3 text-right">Hadir / Tugas</th>
                  <th className="py-2.5 px-3 text-right">Izin / Sakit</th>
                  <th className="py-2.5 px-4 text-right">Belum Absen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {departmentBreakdown.map((row) => (
                  <tr key={row.departemen} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-medium text-slate-900">{row.departemen}</td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-700">
                      {row.totalPegawai}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular font-medium text-emerald-700">
                      {row.hadirAtauTugas}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular text-amber-700">
                      {row.izinAtauSakit}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular text-slate-500">
                      {row.belumAbsen}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabel Log Absensi Real-Time */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Status Kehadiran Pegawai ({selectedDate})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredEmployees.length} pegawai pada unit kerja terpilih
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Nama Pegawai</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Status Kehadiran</th>
                <th className="py-3 px-4">Jam Masuk</th>
                <th className="py-3 px-4">Jam Pulang</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredEmployees.map((emp) => {
                const log = logByEmployeeId.get(emp.id);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 text-sm">
                        {formatFullName(emp)}
                      </div>
                      <div className="font-mono-tabular text-slate-500 mt-0.5">{emp.nip}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{emp.departemen}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {!log ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          Belum Absen
                        </span>
                      ) : log.status === 'Hadir' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Hadir
                        </span>
                      ) : log.status === 'Terlambat' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          Terlambat
                        </span>
                      ) : log.status === 'Dinas Luar' ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
                          <Briefcase className="w-3.5 h-3.5" />
                          Dinas Luar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
                          <FileWarning className="w-3.5 h-3.5" />
                          {log.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-800">
                      {log?.checkInTime || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-800">
                      {log?.checkOutTime || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log?.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
