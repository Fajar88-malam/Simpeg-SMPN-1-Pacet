import React, { useEffect, useMemo, useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  type User,
} from 'firebase/auth';
import {
  CheckCircle2,
  KeyRound,
  Link2,
  Save,
  Shield,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import {
  DEPARTEMEN_LIST,
  PANGKAT_GOLONGAN_OPTIONS,
  PENDIDIKAN_LIST,
  type Departemen,
  type Employee,
  type EmployeePrivateContact,
  type PendidikanJenjang,
  type StatusKepegawaian,
} from '../types/kepegawaian';
import { formatFullName, validateEmployeeDUK } from '../utils/dukValidator';

interface PersonalProfileViewProps {
  currentUser: User;
  employees: Employee[];
  myEmployee: Employee | null;
  myPrivateContact: EmployeePrivateContact | null;
  onClaimEmployee: (employeeId: string) => Promise<void>;
  onCreateOwnEmployee: (
    empData: Omit<Employee, 'createdAt' | 'updatedAt'>,
    contactData: Omit<EmployeePrivateContact, 'updatedAt'>
  ) => Promise<void>;
  onUpdateOwnProfile: (
    employeeId: string,
    personalPatch: Partial<Employee>,
    contactData: Omit<EmployeePrivateContact, 'updatedAt'>
  ) => Promise<void>;
}

interface ProfileVerifyAI {
  statusKesiapan?: string;
  catatanPenulisan?: string[];
  saranPengembangan?: string;
}

export const PersonalProfileView: React.FC<PersonalProfileViewProps> = ({
  currentUser,
  employees,
  myEmployee,
  myPrivateContact,
  onClaimEmployee,
  onCreateOwnEmployee,
  onUpdateOwnProfile,
}) => {
  const [claimNipInput, setClaimNipInput] = useState('');
  const [selectedUnclaimedId, setSelectedUnclaimedId] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const [mode, setMode] = useState<'claim' | 'register'>('claim');

  // Personal Edit Form State
  const [nama, setNama] = useState('');
  const [gelarDepan, setGelarDepan] = useState('');
  const [gelarBelakang, setGelarBelakang] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('1990-01-01');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [pendidikanJenjang, setPendidikanJenjang] = useState<PendidikanJenjang>('S1/D4');
  const [pendidikanJurusan, setPendidikanJurusan] = useState('');
  const [pendidikanTahunLulus, setPendidikanTahunLulus] = useState('');
  const [diklatNama, setDiklatNama] = useState('');
  const [diklatTahun, setDiklatTahun] = useState('');
  const [catatanMutasi, setCatatanMutasi] = useState('');

  // Extra fields when registering new employee profile
  const [newNip, setNewNip] = useState('');
  const [newJabatan, setNewJabatan] = useState('Guru Mata Pelajaran');
  const [newDepartemen, setNewDepartemen] = useState<Departemen>('Kurikulum & IPA-Matematika');
  const [newStatus, setNewStatus] = useState<StatusKepegawaian>('PNS');
  const [newPangkat, setNewPangkat] = useState(PANGKAT_GOLONGAN_OPTIONS[6]);
  const [newTmtCpns, setNewTmtCpns] = useState('2024-01-01');

  // Private PII contact fields
  const [nik, setNik] = useState('');
  const [noHp, setNoHp] = useState('');
  const [emailPribadi, setEmailPribadi] = useState(currentUser.email || '');
  const [alamat, setAlamat] = useState('');
  const [kontakDarurat, setKontakDarurat] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Password Change State (for password-authenticated accounts)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<ProfileVerifyAI | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const hasPasswordProvider = useMemo(
    () => currentUser.providerData.some((p) => p.providerId === 'password'),
    [currentUser.providerData]
  );

  useEffect(() => {
    if (myEmployee) {
      setNama(myEmployee.nama);
      setGelarDepan(myEmployee.gelarDepan);
      setGelarBelakang(myEmployee.gelarBelakang);
      setTanggalLahir(myEmployee.tanggalLahir);
      setJenisKelamin(myEmployee.jenisKelamin);
      setPendidikanJenjang(myEmployee.pendidikanJenjang);
      setPendidikanJurusan(myEmployee.pendidikanJurusan);
      setPendidikanTahunLulus(myEmployee.pendidikanTahunLulus);
      setDiklatNama(myEmployee.diklatNama);
      setDiklatTahun(myEmployee.diklatTahun);
      setCatatanMutasi(myEmployee.catatanMutasi);
    } else {
      setNama(currentUser.displayName || '');
    }
  }, [myEmployee, currentUser.displayName]);

  useEffect(() => {
    if (myPrivateContact) {
      setNik(myPrivateContact.nik);
      setNoHp(myPrivateContact.noHp);
      setEmailPribadi(myPrivateContact.emailPribadi || currentUser.email || '');
      setAlamat(myPrivateContact.alamat);
      setKontakDarurat(myPrivateContact.kontakDarurat);
    }
  }, [myPrivateContact, currentUser.email]);

  const unclaimedEmployees = useMemo(
    () => employees.filter((e) => !e.ownerUid),
    [employees]
  );

  const myValidation = useMemo(
    () => (myEmployee ? validateEmployeeDUK(myEmployee) : null),
    [myEmployee]
  );

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError(null);

    const target = selectedUnclaimedId
      ? unclaimedEmployees.find((emp) => emp.id === selectedUnclaimedId)
      : unclaimedEmployees.find((emp) => emp.nip === claimNipInput.trim());

    if (!target) {
      setClaimError('Data pegawai belum ditemukan atau NIP tidak cocok dengan daftar yang belum diklaim.');
      return;
    }

    if (claimNipInput.trim() && target.nip !== claimNipInput.trim()) {
      setClaimError('NIP yang Anda masukkan tidak sesuai dengan pegawai yang dipilih.');
      return;
    }

    if (!claimNipInput.trim()) {
      setClaimError('Masukkan NIP / ID Pegawai Anda untuk verifikasi klaim akun pribadi.');
      return;
    }

    setClaiming(true);
    try {
      await onClaimEmployee(target.id);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Gagal menghubungkan profil pegawai.');
    } finally {
      setClaiming(false);
    }
  };

  const handleRegisterNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (!nama.trim() || !newNip.trim() || !newJabatan.trim()) {
      setSaveError('Nama lengkap, NIP/ID, dan Jabatan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const empId = `emp_${currentUser.uid.slice(0, 12)}_${Date.now()}`;
      await onCreateOwnEmployee(
        {
          id: empId,
          ownerUid: currentUser.uid,
          schoolCode: 'SMPN1PACET',
          nip: newNip.trim(),
          nama: nama.trim(),
          gelarDepan: gelarDepan.trim(),
          gelarBelakang: gelarBelakang.trim(),
          jabatan: newJabatan.trim(),
          tmtJabatan: newTmtCpns,
          departemen: newDepartemen,
          statusKepegawaian: newStatus,
          pangkatGolongan: newPangkat,
          tmtPangkat: newTmtCpns,
          tmtCpns: newTmtCpns,
          masaKerjaTahun: 1,
          masaKerjaBulan: 0,
          diklatNama: diklatNama.trim(),
          diklatTahun: diklatTahun.trim(),
          pendidikanJenjang,
          pendidikanJurusan: pendidikanJurusan.trim(),
          pendidikanTahunLulus: pendidikanTahunLulus.trim(),
          tanggalLahir,
          jenisKelamin,
          catatanMutasi: catatanMutasi.trim(),
          isVerifiedByAdmin: false,
        },
        {
          ownerUid: currentUser.uid,
          nik: nik.trim(),
          noHp: noHp.trim(),
          emailPribadi: emailPribadi.trim() || currentUser.email || '',
          alamat: alamat.trim(),
          kontakDarurat: kontakDarurat.trim(),
        }
      );
      setSaveMessage('Profil pegawai pribadi berhasil didaftarkan.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal mendaftarkan profil.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonalUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmployee) return;
    setSaveError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      await onUpdateOwnProfile(
        myEmployee.id,
        {
          nama: nama.trim(),
          gelarDepan: gelarDepan.trim(),
          gelarBelakang: gelarBelakang.trim(),
          tanggalLahir,
          jenisKelamin,
          pendidikanJenjang,
          pendidikanJurusan: pendidikanJurusan.trim(),
          pendidikanTahunLulus: pendidikanTahunLulus.trim(),
          diklatNama: diklatNama.trim(),
          diklatTahun: diklatTahun.trim(),
          catatanMutasi: catatanMutasi.trim(),
        },
        {
          ownerUid: currentUser.uid,
          nik: nik.trim(),
          noHp: noHp.trim(),
          emailPribadi: emailPribadi.trim() || currentUser.email || '',
          alamat: alamat.trim(),
          kontakDarurat: kontakDarurat.trim(),
        }
      );
      setSaveMessage('Perubahan data pribadi dan kontak tersimpan aman ke Firestore.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal memperbarui data pribadi.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwMessage(null);
    if (!currentUser.email) {
      setPwError('Email login akun tidak tersedia.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Password baru minimal harus 6 karakter.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('Konfirmasi password baru tidak cocok.');
      return;
    }
    setPwSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPwMessage('Password akun pribadi Anda berhasil diperbarui.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengganti password.';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setPwError('Password saat ini tidak sesuai.');
      } else {
        setPwError(msg);
      }
    } finally {
      setPwSaving(false);
    }
  };

  const handleVerifyWithAI = async () => {
    setAiChecking(true);
    setAiError(null);
    try {
      const res = await fetch('/api/gemini/verify-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            gelarDepan,
            nama,
            gelarBelakang,
            jabatan: myEmployee?.jabatan || newJabatan,
            departemen: myEmployee?.departemen || newDepartemen,
            pendidikanJenjang,
            pendidikanJurusan,
            pendidikanTahunLulus,
            diklatNama,
            diklatTahun,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memeriksa profil.');
      setAiResult(data.result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Gagal menghubungi Gemini AI.');
    } finally {
      setAiChecking(false);
    }
  };

  if (!myEmployee) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="pb-5 border-b border-slate-200">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Portal Data Pribadi Pegawai
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Login terautentikasi sebagai <span className="font-medium text-slate-900">{currentUser.email}</span> · Hubungkan akun pribadi Anda ke data pegawai SMP Negeri 1 Pacet
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('claim')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'claim' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Klaim Profil Pegawai (NIP Terdaftar)
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Daftarkan Data Pegawai Baru
          </button>
        </div>

        {mode === 'claim' ? (
          <form
            onSubmit={handleClaim}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <Link2 className="w-5 h-5 text-sky-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Tautkan Akun Pribadi ke Data Pegawai
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pilih nama Anda pada daftar pegawai yang belum tertaut akun pribadi, lalu masukkan NIP / ID Pegawai sebagai konfirmasi kepemilikan agar hanya Anda yang dapat mengecek dan mengedit data pribadi tersebut.
            </p>

            {claimError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                {claimError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pilih Nama Pegawai (Opsional)
                </label>
                <select
                  value={selectedUnclaimedId}
                  onChange={(e) => setSelectedUnclaimedId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                >
                  <option value="">Cari otomatis berdasarkan NIP...</option>
                  {unclaimedEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {formatFullName(emp)} · {emp.departemen}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Verifikasi NIP / ID Pegawai Anda
                </label>
                <input
                  type="text"
                  required
                  value={claimNipInput}
                  onChange={(e) => setClaimNipInput(e.target.value)}
                  placeholder="Masukkan 18 digit NIP Anda"
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={claiming || unclaimedEmployees.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              {claiming ? 'Menautkan Akun...' : 'Klaim & Buka Data Pribadi'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleRegisterNew}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-sky-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Pendaftaran Mandiri Pegawai Baru
              </h2>
            </div>

            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  NIP / NI PPPK / ID Pegawai
                </label>
                <input
                  type="text"
                  required
                  value={newNip}
                  onChange={(e) => setNewNip(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan</label>
                <input
                  type="text"
                  required
                  value={newJabatan}
                  onChange={(e) => setNewJabatan(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Departemen</label>
                <select
                  value={newDepartemen}
                  onChange={(e) => setNewDepartemen(e.target.value as Departemen)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {DEPARTEMEN_LIST.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status Kepegawaian
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StatusKepegawaian)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  <option value="PNS">PNS</option>
                  <option value="PPPK">PPPK</option>
                  <option value="Honorer Daerah">Honorer Daerah</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pangkat / Golongan
                </label>
                <select
                  value={newPangkat}
                  onChange={(e) => setNewPangkat(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                >
                  {PANGKAT_GOLONGAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  required
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  TMT Pengangkatan Awal
                </label>
                <input
                  type="date"
                  required
                  value={newTmtCpns}
                  onChange={(e) => setNewTmtCpns(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan & Daftarkan Profil Saya'}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Data Pribadi Saya
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {formatFullName(myEmployee)} · NIP <span className="font-mono-tabular">{myEmployee.nip}</span> · Login sebagai {currentUser.email}
          </p>
        </div>
        <button
          type="button"
          onClick={handleVerifyWithAI}
          disabled={aiChecking}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-700 text-white text-sm font-medium rounded-lg hover:bg-sky-800 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          {aiChecking ? 'Memeriksa Profil...' : 'Cek Penulisan Gelar & DUK AI'}
        </button>
      </div>

      {/* Ringkasan Jabatan Resmi (Read-Only oleh Pegawai, dikelola Admin) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Jabatan &amp; Departemen</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{myEmployee.jabatan}</p>
          <p className="mt-0.5 text-xs text-slate-500">{myEmployee.departemen}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Pangkat / Golongan &amp; TMT</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{myEmployee.pangkatGolongan}</p>
          <p className="mt-0.5 text-xs font-mono-tabular text-slate-500">
            TMT {myEmployee.tmtPangkat} · {myEmployee.statusKepegawaian}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Status Validasi DUK</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {myValidation?.statusLabel}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {myEmployee.isVerifiedByAdmin
              ? 'Terverifikasi Administrator'
              : 'Menunggu Verifikasi Admin'}
          </p>
        </div>
      </div>

      {aiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {aiError}
        </div>
      )}

      {aiResult && (
        <div className="bg-white border border-sky-200 rounded-xl p-5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm">
              Evaluasi Profil AI: {aiResult.statusKesiapan}
            </span>
            <button
              type="button"
              onClick={() => setAiResult(null)}
              className="text-slate-500 hover:text-slate-900"
            >
              Tutup
            </button>
          </div>
          {aiResult.catatanPenulisan && aiResult.catatanPenulisan.length > 0 && (
            <ul className="space-y-1 text-slate-700">
              {aiResult.catatanPenulisan.map((c, idx) => (
                <li key={idx}>• {c}</li>
              ))}
            </ul>
          )}
          {aiResult.saranPengembangan && (
            <p className="text-slate-600 pt-1">{aiResult.saranPengembangan}</p>
          )}
        </div>
      )}

      {saveMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          {saveMessage}
        </div>
      )}
      {saveError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSavePersonalUpdate} className="space-y-6">
        {/* Bagian 1: Data Identitas & Akademik */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Identitas, Pendidikan &amp; Riwayat Pelatihan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Gelar Depan</label>
              <input
                type="text"
                value={gelarDepan}
                onChange={(e) => setGelarDepan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap (Tanpa Gelar)
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Gelar Belakang
              </label>
              <input
                type="text"
                value={gelarBelakang}
                onChange={(e) => setGelarBelakang(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                required
                value={tanggalLahir}
                onChange={(e) => setTanggalLahir(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={jenisKelamin}
                onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pendidikan Terakhir
              </label>
              <select
                value={pendidikanJenjang}
                onChange={(e) => setPendidikanJenjang(e.target.value as PendidikanJenjang)}
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
                Program Studi / Jurusan
              </label>
              <input
                type="text"
                value={pendidikanJurusan}
                onChange={(e) => setPendidikanJurusan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Lulus</label>
              <input
                type="text"
                value={pendidikanTahunLulus}
                onChange={(e) => setPendidikanTahunLulus(e.target.value)}
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
                value={diklatNama}
                onChange={(e) => setDiklatNama(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Diklat</label>
              <input
                type="text"
                value={diklatTahun}
                onChange={(e) => setDiklatTahun(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Catatan Pribadi / Keterangan Tugas
            </label>
            <input
              type="text"
              value={catatanMutasi}
              onChange={(e) => setCatatanMutasi(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        {/* Bagian 2: Data Kontak Pribadi Terisolasi (PII Protected) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Data Kontak Pribadi &amp; Domisili (Terlindungi)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Disimpan pada sub-koleksi privat — hanya dapat diakses oleh Anda dan Administrator
              </p>
            </div>
            <Shield className="w-5 h-5 text-slate-400 shrink-0" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIK (16 Digit KTP)
              </label>
              <input
                type="text"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                No. HP / WhatsApp
              </label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Pribadi</label>
              <input
                type="email"
                value={emailPribadi}
                onChange={(e) => setEmailPribadi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Alamat Domisili Lengkap
              </label>
              <input
                type="text"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Kontak Darurat Keluarga
              </label>
              <input
                type="text"
                value={kontakDarurat}
                onChange={(e) => setKontakDarurat(e.target.value)}
                placeholder="Nama & nomor telepon keluarga"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan Perubahan...' : 'Simpan Pembaruan Data Pribadi'}
            </button>
          </div>
        </div>
      </form>

      {/* Bagian 3: Pengaturan Password Akun Pribadi */}
      {hasPasswordProvider && (
        <form
          onSubmit={handleChangePassword}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-slate-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">Ubah Password Akun Pribadi</h2>
              <p className="text-xs text-slate-500">
                Perbarui kata sandi akun login Anda (<span className="font-mono-tabular">{currentUser.email}</span>)
              </p>
            </div>
          </div>

          {pwMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
              {pwMessage}
            </div>
          )}
          {pwError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              {pwError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password Saat Ini
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password Baru (Min. 6)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {pwSaving ? 'Memperbarui...' : 'Perbarui Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
