import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  DEPARTEMEN_LIST,
  type Departemen,
  type Employee,
  type SchoolProfile,
} from '../types/kepegawaian';
import { formatFullName, sortEmployeesByDUK } from '../utils/dukValidator';
import { exportDUKCSV, exportDUKPDF } from '../utils/exporters';

interface DUKViewProps {
  employees: Employee[];
  schoolProfile: SchoolProfile;
  isAdmin: boolean;
  onEditEmployee: (emp: Employee) => void;
}

interface GeminiAuditResult {
  ringkasanEksekutif?: string;
  kandidatKenaikanPangkat?: Array<{ nama: string; nip: string; alasan: string }>;
  perhatianPensiunDanValidasi?: Array<{ nama: string; kategori: string; tindakLanjut: string }>;
  rekomendasiTataUsaha?: string[];
}

export const DUKView: React.FC<DUKViewProps> = ({
  employees,
  schoolProfile,
  isAdmin,
  onEditEmployee,
}) => {
  const [filterDept, setFilterDept] = useState<Departemen | 'ALL'>('ALL');
  const [filterValidation, setFilterValidation] = useState<'ALL' | 'VALID' | 'ISSUES'>('ALL');
  const [aiAuditLoading, setAiAuditLoading] = useState(false);
  const [aiAuditError, setAiAuditError] = useState<string | null>(null);
  const [aiAuditResult, setAiAuditResult] = useState<GeminiAuditResult | null>(null);

  const allDukRows = useMemo(() => sortEmployeesByDUK(employees), [employees]);

  const filteredDukRows = useMemo(() => {
    return allDukRows.filter((row) => {
      if (filterDept !== 'ALL' && row.departemen !== filterDept) return false;
      if (filterValidation === 'VALID' && !row.validation.isValid) return false;
      if (filterValidation === 'ISSUES' && row.validation.isValid && row.validation.warnings.length === 0)
        return false;
      return true;
    });
  }, [allDukRows, filterDept, filterValidation]);

  const stats = useMemo(() => {
    const valid = allDukRows.filter((r) => r.validation.statusLabel === 'Valid DUK').length;
    const warning = allDukRows.filter((r) => r.validation.statusLabel === 'Peringatan').length;
    const error = allDukRows.filter((r) => r.validation.statusLabel === 'Perlu Perbaikan').length;
    return { valid, warning, error };
  }, [allDukRows]);

  const handleRunGeminiAudit = async () => {
    setAiAuditLoading(true);
    setAiAuditError(null);
    try {
      const payload = allDukRows.map((r) => ({
        dukRank: r.dukRank,
        nama: formatFullName(r),
        nip: r.nip,
        jabatan: r.jabatan,
        departemen: r.departemen,
        statusKepegawaian: r.statusKepegawaian,
        pangkatGolongan: r.pangkatGolongan,
        tmtPangkat: r.tmtPangkat,
        masaKerjaTahun: r.masaKerjaTahun,
        masaKerjaBulan: r.masaKerjaBulan,
        pendidikanJenjang: r.pendidikanJenjang,
        tanggalLahir: r.tanggalLahir,
        validationErrors: r.validation.errors,
        validationWarnings: r.validation.warnings,
      }));

      const res = await fetch('/api/gemini/audit-duk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menjalankan audit Gemini AI.');
      }
      setAiAuditResult(data.audit);
    } catch (err) {
      setAiAuditError(err instanceof Error ? err.message : 'Gagal menghubungi layanan Gemini AI.');
    } finally {
      setAiAuditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Daftar Urut Kepegawaian (DUK)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pengurutan otomatis sesuai PP No. 15 Tahun 1979 &amp; UU ASN No. 20 Tahun 2023 dengan validasi NIP &amp; TMT
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunGeminiAudit}
            disabled={aiAuditLoading || allDukRows.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-700 text-white text-sm font-medium rounded-lg hover:bg-sky-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {aiAuditLoading ? 'Menganalisis DUK...' : 'Audit Kepatuhan AI'}
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => exportDUKCSV(filteredDukRows)}
                disabled={filteredDukRows.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Unduh DUK (CSV)
              </button>
              <button
                type="button"
                onClick={() =>
                  exportDUKPDF(filteredDukRows, 'duk-resmi-smpn1-pacet.pdf', schoolProfile)
                }
                disabled={filteredDukRows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4" />
                Unduh DUK Resmi (PDF)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Ringkasan Validasi Otomatis DUK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Validasi Lengkap &amp; Sinkron</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">{stats.valid}</p>
          <p className="mt-1 text-xs text-slate-500">NIP 18 digit, TMT, &amp; usia valid</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Peringatan Administrasi</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">{stats.warning}</p>
          <p className="mt-1 text-xs text-slate-500">Layak naik pangkat, MPP, atau catatan diklat</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Perlu Perbaikan Data</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="mt-1.5 text-2xl font-semibold text-slate-900 tabular-nums">{stats.error}</p>
          <p className="mt-1 text-xs text-slate-500">Ketidaksesuaian NIP / tanggal lahir / TMT</p>
        </div>
      </div>

      {/* Gemini AI Audit Output */}
      {aiAuditError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          {aiAuditError}
        </div>
      )}

      {aiAuditResult && (
        <div className="bg-white border border-sky-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Hasil Audit Regulasi DUK (Gemini AI)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setAiAuditResult(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Tutup
            </button>
          </div>

          {aiAuditResult.ringkasanEksekutif && (
            <p className="text-sm text-slate-700 leading-relaxed">
              {aiAuditResult.ringkasanEksekutif}
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-900 mb-2.5">
                Kandidat Kenaikan Pangkat / Evaluasi Karier
              </h3>
              {aiAuditResult.kandidatKenaikanPangkat &&
              aiAuditResult.kandidatKenaikanPangkat.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-700">
                  {aiAuditResult.kandidatKenaikanPangkat.map((item, idx) => (
                    <li key={idx} className="pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="font-semibold text-slate-900">{item.nama}</span> ·{' '}
                      <span className="font-mono-tabular text-slate-500">{item.nip}</span>
                      <p className="mt-0.5 text-slate-600">{item.alasan}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">Tidak ada usulan mendesak saat ini.</p>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-900 mb-2.5">
                Perhatian Pensiun &amp; Tindak Lanjut Tata Usaha
              </h3>
              <ul className="space-y-2 text-xs text-slate-700">
                {aiAuditResult.perhatianPensiunDanValidasi?.map((item, idx) => (
                  <li key={idx} className="pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                    <span className="font-semibold text-slate-900">{item.nama}</span> ·{' '}
                    <span className="text-amber-700 font-medium">{item.kategori}</span>
                    <p className="mt-0.5 text-slate-600">{item.tindakLanjut}</p>
                  </li>
                ))}
                {aiAuditResult.rekomendasiTataUsaha?.map((rec, idx) => (
                  <li key={`rec-${idx}`} className="text-slate-600">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value as Departemen | 'ALL')}
            aria-label="Filter departemen DUK"
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-sky-600"
          >
            <option value="ALL">Semua Departemen</option>
            {DEPARTEMEN_LIST.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterValidation('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterValidation === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semua ({allDukRows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterValidation('ISSUES')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterValidation === 'ISSUES'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Ada Catatan ({stats.warning + stats.error})
            </button>
            <button
              type="button"
              onClick={() => setFilterValidation('VALID')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterValidation === 'VALID' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Valid ({stats.valid})
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Kriteria urut: Golongan → TMT Pangkat → Jabatan → Masa Kerja → Diklat → Pendidikan → Usia
        </p>
      </div>

      {/* Tabel Resmi DUK */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-3 text-center w-14">Urut</th>
                <th className="py-3 px-4">Nama &amp; NIP</th>
                <th className="py-3 px-4">Pangkat / Gol &amp; TMT</th>
                <th className="py-3 px-4">Jabatan &amp; TMT</th>
                <th className="py-3 px-3 text-center">Masa Kerja</th>
                <th className="py-3 px-4">Pendidikan &amp; Diklat</th>
                <th className="py-3 px-3">Usia</th>
                <th className="py-3 px-4">Validasi Otomatis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredDukRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors align-top">
                  <td className="py-3 px-3 text-center font-mono-tabular font-semibold text-slate-900 text-sm">
                    {row.dukRank}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 text-sm">
                      {formatFullName(row)}
                    </div>
                    <div className="font-mono-tabular text-slate-600 mt-0.5">{row.nip}</div>
                    <div className="text-slate-500 mt-0.5">{row.statusKepegawaian}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{row.pangkatGolongan}</div>
                    <div className="font-mono-tabular text-slate-500 mt-0.5">
                      TMT {row.tmtPangkat}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">{row.jabatan}</div>
                    <div className="text-slate-500 mt-0.5">{row.departemen}</div>
                    <div className="font-mono-tabular text-slate-500 mt-0.5">
                      TMT {row.tmtJabatan}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono-tabular text-slate-800 whitespace-nowrap">
                    <div>{row.masaKerjaTahun} Thn</div>
                    <div className="text-slate-500">{row.masaKerjaBulan} Bln</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">
                      {row.pendidikanJenjang} {row.pendidikanJurusan} ({row.pendidikanTahunLulus})
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      {row.diklatNama
                        ? `${row.diklatNama} (${row.diklatTahun || '-'})`
                        : 'Belum tercatat diklat'}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono-tabular text-slate-700 whitespace-nowrap">
                    <div>{row.usiaTahun} Thn</div>
                    <div className="text-slate-500">{row.tanggalLahir}</div>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    {row.validation.statusLabel === 'Valid DUK' ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Valid DUK
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <div
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            row.validation.isValid ? 'text-amber-700' : 'text-red-700'
                          }`}
                        >
                          {row.validation.isValid ? (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {row.validation.statusLabel}
                        </div>
                        {row.validation.errors.map((err, i) => (
                          <p key={i} className="text-red-700 leading-snug">
                            • {err}
                          </p>
                        ))}
                        {row.validation.warnings.map((w, i) => (
                          <p key={i} className="text-amber-700 leading-snug">
                            • {w}
                          </p>
                        ))}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => onEditEmployee(row)}
                            className="text-sky-700 hover:underline font-medium pt-0.5"
                          >
                            Perbaiki Data
                          </button>
                        )}
                      </div>
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
