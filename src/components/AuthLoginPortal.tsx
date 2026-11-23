import React, { useState } from 'react';
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface AuthLoginPortalProps {
  signingIn: boolean;
  authError: string | null;
  isOperationNotAllowed: boolean;
  isUnauthorizedDomain: boolean;
  onGoogleSignIn: () => Promise<void>;
  onPasswordSignIn: (identifier: string, password: string) => Promise<void>;
  onPasswordRegister: (params: {
    displayName: string;
    identifier: string;
    password: string;
    nip?: string;
  }) => Promise<void>;
  onSendPasswordReset: (identifier: string) => Promise<void>;
}

export function normalizeIdentifierToEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const cleanUser = trimmed.replace(/[^a-z0-9._-]/g, '');
  return `${cleanUser}@pegawai.smpn1pacet.sch.id`;
}

export const AuthLoginPortal: React.FC<AuthLoginPortalProps> = ({
  signingIn,
  authError,
  isOperationNotAllowed,
  isUnauthorizedDomain,
  onGoogleSignIn,
  onPasswordSignIn,
  onPasswordRegister,
  onSendPasswordReset,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nip, setNip] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = async () => {
    if (!currentHostname) return;
    try {
      await navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      // ignore clipboard denial
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!identifier.trim() || !password) {
      setLocalError('Masukkan Username / NIP / Email dan Password Anda.');
      return;
    }
    await onPasswordSignIn(identifier, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!displayName.trim() || !identifier.trim() || !password) {
      setLocalError('Nama lengkap, Username/Email, dan Password wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password minimal harus terdiri dari 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Konfirmasi password tidak cocok.');
      return;
    }
    await onPasswordRegister({
      displayName: displayName.trim(),
      identifier: identifier.trim(),
      password,
      nip: nip.trim() || undefined,
    });
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResetSentMsg(null);
    if (!identifier.trim() || !identifier.includes('@')) {
      setLocalError('Masukkan alamat email aktif yang terdaftar untuk mengirim tautan reset password.');
      return;
    }
    try {
      await onSendPasswordReset(identifier.trim());
      setResetSentMsg(`Tautan pengaturan ulang password telah dikirim ke ${identifier.trim()}.`);
    } catch {
      // handled by parent authError
    }
  };

  const activeError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6">
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between gap-8 py-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-base text-slate-900 whitespace-nowrap">
            SIPEG SMP Negeri 1 Pacet
          </span>
        </div>
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={signingIn}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-800 text-xs font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <LogIn className="w-3.5 h-3.5" />
          Masuk Akun Google
        </button>
      </header>

      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center my-8">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs font-medium text-sky-800">
            Dinas Pendidikan Pemuda dan Olahraga · Kabupaten Cianjur
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 text-balance leading-tight">
            Portal Kepegawaian &amp; Login Pribadi Pegawai
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-xl">
            Setiap guru dan tenaga kependidikan SMP Negeri 1 Pacet dapat masuk menggunakan akun pribadi (User &amp; Password masing-masing) untuk mengecek status DUK, mencatat presensi harian, serta memperbarui data pribadi secara mandiri.
          </p>

          <div className="pt-2 space-y-3 text-sm text-slate-700">
            <div className="pb-3 border-b border-slate-200">
              <div className="font-semibold text-slate-900">1. Pegawai (Login User &amp; Password)</div>
              <p className="text-xs text-slate-600 mt-1">
                Buat akun pribadi lalu tautkan NIP Anda untuk memeriksa golongan, TMT, validasi DUK, dan mengedit biodata pribadi.
              </p>
            </div>
            <div className="pb-3 border-b border-slate-200">
              <div className="font-semibold text-slate-900">2. Administrator Kepegawaian</div>
              <p className="text-xs text-slate-600 mt-1">
                Masuk dengan akun Google Administrator untuk mengelola master data, ekspor CSV/PDF, cetak DUK resmi, dan verifikasi berkas.
              </p>
            </div>
          </div>
        </div>

        {/* Kartu Form Login Pribadi */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Masuk User &amp; Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setLocalError(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                authMode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Aktivasi Akun Pegawai
            </button>
          </div>

          {activeError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>{activeError}</span>
              </div>
              {isUnauthorizedDomain && (
                <div className="pt-2 border-t border-red-200 text-slate-700 space-y-2">
                  <p className="font-semibold text-slate-900">
                    Domain Deploy Belum Terdaftar di Firebase Authorized Domains:
                  </p>
                  {currentHostname && (
                    <div className="flex items-center justify-between gap-2 bg-white border border-red-200 rounded-md px-2.5 py-1.5">
                      <code className="font-mono-tabular text-slate-900 truncate">
                        {currentHostname}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedDomain ? 'Tersalin' : 'Salin Domain'}
                      </button>
                    </div>
                  )}
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Buka Firebase Console proyek{' '}
                      <span className="font-mono-tabular font-semibold">plated-coast-2n2tx</span>.
                    </li>
                    <li>
                      Masuk ke <strong>Authentication</strong> → <strong>Settings</strong> →{' '}
                      <strong>Authorized domains</strong>.
                    </li>
                    <li>
                      Klik <strong>Add domain</strong>, tempel domain di atas (
                      <span className="font-mono-tabular">{currentHostname || 'domain-anda.vercel.app'}</span>
                      ), lalu simpan dan muat ulang halaman.
                    </li>
                  </ol>
                  <a
                    href="https://console.firebase.google.com/project/plated-coast-2n2tx/authentication/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-700 font-medium hover:underline"
                  >
                    Buka Authorized Domains di Firebase Console
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
              {isOperationNotAllowed && (
                <div className="pt-2 border-t border-red-200 text-slate-700 space-y-1.5">
                  <p className="font-semibold text-slate-900">
                    Panduan Mengaktifkan Login User &amp; Password di Firebase Console:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>
                      Buka Firebase Console proyek{' '}
                      <span className="font-mono-tabular font-semibold">plated-coast-2n2tx</span>.
                    </li>
                    <li>
                      Pilih menu <strong>Authentication</strong> → tab <strong>Sign-in method</strong>.
                    </li>
                    <li>
                      Klik <strong>Add new provider</strong> → pilih <strong>Email/Password</strong>,
                      aktifkan toggle <strong>Enable</strong>, lalu simpan.
                    </li>
                  </ol>
                  <a
                    href="https://console.firebase.google.com/project/plated-coast-2n2tx/authentication/providers"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-700 font-medium hover:underline"
                  >
                    Buka Sign-in Method di Firebase Console
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {resetSentMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{resetSentMsg}</span>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Username / NIP / Email Pegawai
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: 198206142009021004 atau nama@smpn1pacet.sch.id"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('reset');
                      setLocalError(null);
                    }}
                    className="text-xs text-sky-700 hover:underline"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password pribadi"
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    aria-label="Tampilkan atau sembunyikan password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                {signingIn ? 'Memverifikasi Akun...' : 'Masuk dengan User & Password'}
              </button>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap Pegawai
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Cecep Suryana, S.Pd."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Username atau Email Login
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="cecep.math atau email"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NIP / ID Pegawai (Opsional)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Untuk tautan otomatis"
                    className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Buat Password (Min. 6)
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Konfirmasi Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={signingIn}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {signingIn ? 'Mendaftarkan Akun...' : 'Buat Akun Login Pribadi'}
              </button>
            </form>
          )}

          {authMode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Terdaftar
                </label>
                <input
                  type="email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                />
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={signingIn}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  <Mail className="w-4 h-4" />
                  Kirim Tautan Reset Password
                </button>
              </div>
            </form>
          )}

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">atau masuk dengan Google</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={signingIn}
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <LogIn className="w-4 h-4 text-sky-700" />
            Masuk dengan Akun Google (Administrator / Pegawai)
          </button>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-xs text-slate-500 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-2">
        <span>SMP Negeri 1 Pacet · Jln. Cibodas Parigi No.99 Desa Cibodas Kec. Pacet Kabupaten Cianjur</span>
        <span>Dinas Pendidikan Pemuda dan Olahraga Kabupaten Cianjur</span>
      </footer>
    </div>
  );
};
