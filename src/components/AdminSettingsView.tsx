import React, { useState } from 'react';
import { CheckCircle2, Database, ShieldCheck, UserCheck } from 'lucide-react';
import type { Employee } from '../types/kepegawaian';
import { formatFullName } from '../utils/dukValidator';

interface AdminSettingsViewProps {
  employees: Employee[];
  onSeedInitialData: () => Promise<number>;
  onToggleVerifyEmployee: (emp: Employee) => Promise<void>;
  onGrantAdminToEmployee: (emp: Employee) => Promise<void>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  employees,
  onSeedInitialData,
  onToggleVerifyEmployee,
  onGrantAdminToEmployee,
}) => {
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const unverified = employees.filter((e) => !e.isVerifiedByAdmin);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage(null);
    setActionError(null);
    try {
      const added = await onSeedInitialData();
      setSeedMessage(
        added > 0
          ? `Berhasil menyinkronkan ${added} data pegawai SMP Negeri 1 Pacet ke Firestore.`
          : 'Seluruh 18 data pegawai awal SMP Negeri 1 Pacet sudah tersedia di Firestore.'
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Gagal memuat data awal.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Panel Administrator Kepegawaian
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Sinkronisasi master data SMP Negeri 1 Pacet, verifikasi berkas DUK pegawai, dan hak akses administrator
        </p>
      </div>

      {seedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          {seedMessage}
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {actionError}
        </div>
      )}

      {/* Sinkronisasi Data Awal */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Data Referensi Pegawai SMP Negeri 1 Pacet
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600 max-w-2xl leading-relaxed">
            Memuat 18 profil pegawai lintas 8 departemen (Kepala Sekolah, Wakil Kepala Sekolah, Guru Mata Pelajaran, BK, Tata Usaha, dan Sarpras) lengkap dengan NIP 18 digit valid dan kontak terisolasi.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Database className="w-4 h-4" />
          {seeding ? 'Menyinkronkan...' : 'Sinkronkan 18 Data Awal'}
        </button>
      </div>

      {/* Verifikasi Pengajuan Pegawai */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Verifikasi Berkas &amp; Hak Akses Pegawai
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {unverified.length} pegawai menunggu verifikasi Administrator · {employees.filter((e) => e.ownerUid).length} akun pegawai telah terhubung
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Nama Pegawai</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4">Verifikasi DUK</th>
                <th className="py-3 px-4 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{formatFullName(emp)}</td>
                  <td className="py-3 px-4 font-mono-tabular text-slate-700">{emp.nip}</td>
                  <td className="py-3 px-4 text-slate-600">{emp.departemen}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {emp.ownerUid ? 'Terhubung Google' : 'Belum Klaim'}
                  </td>
                  <td className="py-3 px-4">
                    {emp.isVerifiedByAdmin ? (
                      <span className="text-emerald-700 font-medium">Terverifikasi</span>
                    ) : (
                      <span className="text-amber-700 font-medium">Menunggu Verifikasi</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onToggleVerifyEmployee(emp)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-100"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {emp.isVerifiedByAdmin ? 'Batalkan Verifikasi' : 'Verifikasi'}
                    </button>
                    {emp.ownerUid && (
                      <button
                        type="button"
                        onClick={() => onGrantAdminToEmployee(emp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 border border-sky-300 rounded-md text-sky-800 hover:bg-sky-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Jadikan Admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
