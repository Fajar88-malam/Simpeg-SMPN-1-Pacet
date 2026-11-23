import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Landmark,
  MapPin,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import type { SchoolProfile } from '../types/kepegawaian';

interface SchoolProfileViewProps {
  schoolProfile: SchoolProfile;
  isAdmin: boolean;
  onSaveSchoolProfile: (profile: Omit<SchoolProfile, 'updatedAt'>) => Promise<void>;
}

async function processLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang diunggah harus berupa gambar (PNG, JPG, WebP, atau SVG).');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Ukuran file logo maksimal 8 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak dapat diproses browser.'));
      img.onload = () => {
        const maxSide = 260;
        const scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || maxSide) * scale));
        const height = Math.max(1, Math.round((img.height || maxSide) * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas browser tidak tersedia untuk memproses logo.'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/png');
        if (dataUrl.length > 180000) {
          dataUrl = canvas.toDataURL('image/webp', 0.85);
        }
        if (dataUrl.length > 180000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }
        if (dataUrl.length > 195000) {
          reject(new Error('Resolusi gambar terlalu padat. Gunakan logo dengan ukuran lebih ringkas.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const SchoolProfileView: React.FC<SchoolProfileViewProps> = ({
  schoolProfile,
  isAdmin,
  onSaveSchoolProfile,
}) => {
  const [form, setForm] = useState<Omit<SchoolProfile, 'updatedAt'>>({
    id: schoolProfile.id,
    schoolCode: 'SMPN1PACET',
    namaSekolah: schoolProfile.namaSekolah,
    npsn: schoolProfile.npsn,
    dinasNaungan: schoolProfile.dinasNaungan,
    alamat: schoolProfile.alamat,
    kodePos: schoolProfile.kodePos,
    telepon: schoolProfile.telepon,
    email: schoolProfile.email,
    website: schoolProfile.website,
    kepalaSekolahNama: schoolProfile.kepalaSekolahNama,
    kepalaSekolahNip: schoolProfile.kepalaSekolahNip,
    logoSekolah: schoolProfile.logoSekolah,
    logoPemda: schoolProfile.logoPemda,
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      id: schoolProfile.id,
      schoolCode: 'SMPN1PACET',
      namaSekolah: schoolProfile.namaSekolah,
      npsn: schoolProfile.npsn,
      dinasNaungan: schoolProfile.dinasNaungan,
      alamat: schoolProfile.alamat,
      kodePos: schoolProfile.kodePos,
      telepon: schoolProfile.telepon,
      email: schoolProfile.email,
      website: schoolProfile.website,
      kepalaSekolahNama: schoolProfile.kepalaSekolahNama,
      kepalaSekolahNip: schoolProfile.kepalaSekolahNip,
      logoSekolah: schoolProfile.logoSekolah,
      logoPemda: schoolProfile.logoPemda,
    });
  }, [schoolProfile]);

  const handleLogoUpload = async (
    target: 'logoSekolah' | 'logoPemda',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMessage(null);
    setSaveMessage(null);
    try {
      const dataUrl = await processLogoFile(file);
      const updated = { ...form, [target]: dataUrl };
      setForm(updated);
      if (isAdmin) {
        setSaving(true);
        await onSaveSchoolProfile(updated);
        setSaveMessage(
          target === 'logoSekolah'
            ? 'Logo Sekolah berhasil diunggah dan disimpan.'
            : 'Logo Pemda Kabupaten Cianjur berhasil diunggah dan disimpan.'
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengunggah logo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async (target: 'logoSekolah' | 'logoPemda') => {
    if (!isAdmin) return;
    setErrorMessage(null);
    setSaveMessage(null);
    const updated = { ...form, [target]: '' };
    setForm(updated);
    setSaving(true);
    try {
      await onSaveSchoolProfile(updated);
      setSaveMessage(
        target === 'logoSekolah' ? 'Logo Sekolah dihapus.' : 'Logo Pemda dihapus.'
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menghapus logo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setErrorMessage(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      await onSaveSchoolProfile(form);
      setSaveMessage('Profil sekolah dan logo resmi berhasil disimpan ke database.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyimpan profil sekolah.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Profil Sekolah
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Identitas resmi institusi, alamat sekolah, dan pengaturan Logo Sekolah serta Logo Pemerintah Daerah untuk kop surat DUK &amp; PDF
        </p>
      </div>

      {/* Pratinjau Kop Surat Resmi Sekolah */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-5 border-b-2 border-slate-900">
          <div className="w-20 h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {form.logoPemda ? (
              <img
                src={form.logoPemda}
                alt="Logo Pemda Kabupaten Cianjur"
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <Landmark className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="text-center space-y-1 flex-1">
            <p className="text-xs font-semibold tracking-wide text-slate-600">
              PEMERINTAH KABUPATEN CIANJUR
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {form.dinasNaungan.toUpperCase()}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              {form.namaSekolah}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 inline-flex items-center justify-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{form.alamat}</span>
            </p>
            <p className="text-xs text-slate-500 font-mono-tabular">
              NPSN {form.npsn} · Kode Pos {form.kodePos}
              {form.telepon ? ` · Telp. ${form.telepon}` : ''}
            </p>
          </div>

          <div className="w-20 h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {form.logoSekolah ? (
              <img
                src={form.logoSekolah}
                alt="Logo SMP Negeri 1 Pacet"
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <Building2 className="w-8 h-8 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Upload Logo Pemda & Logo Sekolah */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo Pemda */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Logo Pemda</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Logo resmi Pemerintah Kabupaten Cianjur (posisi kiri kop surat PDF)
              </p>
            </div>
            <Landmark className="w-5 h-5 text-slate-400 shrink-0" />
          </div>

          <div className="h-36 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
            {form.logoPemda ? (
              <img
                src={form.logoPemda}
                alt="Pratinjau Logo Pemda"
                className="max-h-28 max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-500">Belum ada Logo Pemda diunggah</span>
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{form.logoPemda ? 'Ganti Logo Pemda' : 'Upload Logo Pemda'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => handleLogoUpload('logoPemda', e)}
                  className="hidden"
                />
              </label>
              {form.logoPemda && (
                <button
                  type="button"
                  onClick={() => handleRemoveLogo('logoPemda')}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Hapus
                </button>
              )}
            </div>
          )}
        </div>

        {/* Logo Sekolah */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Logo Sekolah</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Logo resmi SMP Negeri 1 Pacet (tampil di sidebar &amp; sisi kanan kop surat PDF)
              </p>
            </div>
            <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
          </div>

          <div className="h-36 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
            {form.logoSekolah ? (
              <img
                src={form.logoSekolah}
                alt="Pratinjau Logo Sekolah"
                className="max-h-28 max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-slate-500">Belum ada Logo Sekolah diunggah</span>
            )}
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{form.logoSekolah ? 'Ganti Logo Sekolah' : 'Upload Logo Sekolah'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => handleLogoUpload('logoSekolah', e)}
                  className="hidden"
                />
              </label>
              {form.logoSekolah && (
                <button
                  type="button"
                  onClick={() => handleRemoveLogo('logoSekolah')}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Hapus
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form Informasi Sekolah */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Data Identitas &amp; Alamat Sekolah</h3>
          {!isAdmin && (
            <span className="text-xs text-slate-500">Hanya Administrator yang dapat mengubah profil sekolah</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Sekolah</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={form.namaSekolah}
              onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">NPSN</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.npsn}
              onChange={(e) => setForm({ ...form, npsn: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Dinas / Instansi Pembina
          </label>
          <input
            type="text"
            disabled={!isAdmin}
            value={form.dinasNaungan}
            onChange={(e) => setForm({ ...form, dinasNaungan: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Sekolah</label>
            <input
              type="text"
              required
              disabled={!isAdmin}
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Kode Pos</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.kodePos}
              onChange={(e) => setForm({ ...form, kodePos: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Telepon</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Sekolah</label>
            <input
              type="email"
              disabled={!isAdmin}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Website</label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Kepala Sekolah (Untuk Tanda Tangan PDF)
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.kepalaSekolahNama}
              onChange={(e) => setForm({ ...form, kepalaSekolahNama: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              NIP Kepala Sekolah
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.kepalaSekolahNip}
              onChange={(e) => setForm({ ...form, kepalaSekolahNip: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg disabled:bg-slate-50 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Profil Sekolah'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
