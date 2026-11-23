import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import {
  DEPARTEMEN_LIST,
  PANGKAT_GOLONGAN_OPTIONS,
  PENDIDIKAN_LIST,
  type Departemen,
  type Employee,
  type PendidikanJenjang,
  type StatusKepegawaian,
} from '../types/kepegawaian';
import { validateEmployeeDUK } from '../utils/dukValidator';

interface EmployeeModalProps {
  initialEmployee: Employee | null;
  onClose: () => void;
  onSave: (employeeData: Omit<Employee, 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  initialEmployee,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Omit<Employee, 'createdAt' | 'updatedAt'>>(() => {
    if (initialEmployee) {
      return {
        id: initialEmployee.id,
        ownerUid: initialEmployee.ownerUid,
        schoolCode: 'SMPN1PACET',
        nip: initialEmployee.nip,
        nama: initialEmployee.nama,
        gelarDepan: initialEmployee.gelarDepan,
        gelarBelakang: initialEmployee.gelarBelakang,
        jabatan: initialEmployee.jabatan,
        tmtJabatan: initialEmployee.tmtJabatan,
        departemen: initialEmployee.departemen,
        statusKepegawaian: initialEmployee.statusKepegawaian,
        pangkatGolongan: initialEmployee.pangkatGolongan,
        tmtPangkat: initialEmployee.tmtPangkat,
        tmtCpns: initialEmployee.tmtCpns,
        masaKerjaTahun: initialEmployee.masaKerjaTahun,
        masaKerjaBulan: initialEmployee.masaKerjaBulan,
        diklatNama: initialEmployee.diklatNama,
        diklatTahun: initialEmployee.diklatTahun,
        pendidikanJenjang: initialEmployee.pendidikanJenjang,
        pendidikanJurusan: initialEmployee.pendidikanJurusan,
        pendidikanTahunLulus: initialEmployee.pendidikanTahunLulus,
        tanggalLahir: initialEmployee.tanggalLahir,
        jenisKelamin: initialEmployee.jenisKelamin,
        catatanMutasi: initialEmployee.catatanMutasi,
        isVerifiedByAdmin: initialEmployee.isVerifiedByAdmin,
      };
    }
    return {
      id: `emp_${Date.now()}`,
      ownerUid: '',
      schoolCode: 'SMPN1PACET',
      nip: '',
      nama: '',
      gelarDepan: '',
      gelarBelakang: 'S.Pd.',
      jabatan: 'Guru Ahli Pertama',
      tmtJabatan: '2024-01-01',
      departemen: 'Kurikulum & IPA-Matematika',
      statusKepegawaian: 'PNS',
      pangkatGolongan: 'Penata Muda / III.a',
      tmtPangkat: '2024-01-01',
      tmtCpns: '2024-01-01',
      masaKerjaTahun: 2,
      masaKerjaBulan: 0,
      diklatNama: '',
      diklatTahun: '',
      pendidikanJenjang: 'S1/D4',
      pendidikanJurusan: '',
      pendidikanTahunLulus: '2019',
      tanggalLahir: '1995-05-10',
      jenisKelamin: 'L',
      catatanMutasi: '',
      isVerifiedByAdmin: true,
    };
  });

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const liveValidation = useMemo(() => validateEmployeeDUK(form), [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!form.nama.trim() || !form.nip.trim() || !form.jabatan.trim()) {
      setSubmitError('Nama, NIP, dan Jabatan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan data pegawai.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {initialEmployee ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              SMP Negeri 1 Pacet · Validasi otomatis NIP &amp; DUK aktif secara langsung
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Live DUK Validation Summary */}
          <div
            className={`p-3.5 rounded-lg border text-xs ${
              liveValidation.isValid
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-red-50/70 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {liveValidation.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              )}
              <span>Status Validasi Otomatis DUK: {liveValidation.statusLabel}</span>
            </div>
            {liveValidation.errors.length > 0 && (
              <ul className="mt-1.5 list-disc list-inside space-y-0.5">
                {liveValidation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            {liveValidation.warnings.length > 0 && (
              <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-amber-800">
                {liveValidation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap (Tanpa Gelar)
              </label>
              <input
                type="text"
                required
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Status Kepegawaian
              </label>
              <select
                value={form.statusKepegawaian}
                onChange={(e) =>
                  setForm({ ...form, statusKepegawaian: e.target.value as StatusKepegawaian })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="Honorer Daerah">Honorer Daerah</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Gelar Depan</label>
              <input
                type="text"
                value={form.gelarDepan}
                onChange={(e) => setForm({ ...form, gelarDepan: e.target.value })}
                placeholder="Contoh: Dr. / H."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Gelar Belakang
              </label>
              <input
                type="text"
                value={form.gelarBelakang}
                onChange={(e) => setForm({ ...form, gelarBelakang: e.target.value })}
                placeholder="Contoh: S.Pd., M.Pd."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIP / NI PPPK / ID
              </label>
              <input
                type="text"
                required
                value={form.nip}
                onChange={(e) => setForm({ ...form, nip: e.target.value.trim() })}
                placeholder="18 digit tanpa spasi"
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan</label>
              <input
                type="text"
                required
                value={form.jabatan}
                onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Departemen</label>
              <select
                value={form.departemen}
                onChange={(e) => setForm({ ...form, departemen: e.target.value as Departemen })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                {DEPARTEMEN_LIST.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pangkat / Golongan Ruang
              </label>
              <select
                value={form.pangkatGolongan}
                onChange={(e) => setForm({ ...form, pangkatGolongan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                {PANGKAT_GOLONGAN_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">TMT Pangkat</label>
              <input
                type="date"
                required
                value={form.tmtPangkat}
                onChange={(e) => setForm({ ...form, tmtPangkat: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">TMT Jabatan</label>
              <input
                type="date"
                required
                value={form.tmtJabatan}
                onChange={(e) => setForm({ ...form, tmtJabatan: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                TMT CPNS / Awal
              </label>
              <input
                type="date"
                required
                value={form.tmtCpns}
                onChange={(e) => setForm({ ...form, tmtCpns: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                required
                value={form.tanggalLahir}
                onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={form.jenisKelamin}
                onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value as 'L' | 'P' })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                <option value="L">Laki-laki (1)</option>
                <option value="P">Perempuan (2)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">MK Thn</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.masaKerjaTahun}
                  onChange={(e) =>
                    setForm({ ...form, masaKerjaTahun: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-2.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">MK Bln</label>
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={form.masaKerjaBulan}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      masaKerjaBulan: Math.min(11, Math.max(0, Number(e.target.value))),
                    })
                  }
                  className="w-full px-2.5 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pendidikan Terakhir
              </label>
              <select
                value={form.pendidikanJenjang}
                onChange={(e) =>
                  setForm({ ...form, pendidikanJenjang: e.target.value as PendidikanJenjang })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                {PENDIDIKAN_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jurusan / Prodi
              </label>
              <input
                type="text"
                value={form.pendidikanJurusan}
                onChange={(e) => setForm({ ...form, pendidikanJurusan: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Lulus</label>
              <input
                type="text"
                value={form.pendidikanTahunLulus}
                onChange={(e) => setForm({ ...form, pendidikanTahunLulus: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Latihan Jabatan / Diklat Terakhir
              </label>
              <input
                type="text"
                value={form.diklatNama}
                onChange={(e) => setForm({ ...form, diklatNama: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Diklat</label>
              <input
                type="text"
                value={form.diklatTahun}
                onChange={(e) => setForm({ ...form, diklatTahun: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Catatan Mutasi / Keterangan DUK
            </label>
            <input
              type="text"
              value={form.catatanMutasi}
              onChange={(e) => setForm({ ...form, catatanMutasi: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isVerifiedByAdmin}
                onChange={(e) => setForm({ ...form, isVerifiedByAdmin: e.target.checked })}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-600"
              />
              Terverifikasi Berkas Fisik (Administrator)
            </label>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Data Pegawai'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
