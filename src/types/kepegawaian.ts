export type Departemen =
  | 'Pimpinan & Manajemen'
  | 'Kurikulum & IPA-Matematika'
  | 'Bahasa & Sastra'
  | 'IPS, PPKn & Keagamaan'
  | 'PJOK & Seni Budaya'
  | 'Bimbingan & Konseling'
  | 'Tata Usaha & Administrasi'
  | 'Sarpras & Perpustakaan';

export const DEPARTEMEN_LIST: Departemen[] = [
  'Pimpinan & Manajemen',
  'Kurikulum & IPA-Matematika',
  'Bahasa & Sastra',
  'IPS, PPKn & Keagamaan',
  'PJOK & Seni Budaya',
  'Bimbingan & Konseling',
  'Tata Usaha & Administrasi',
  'Sarpras & Perpustakaan',
];

export type StatusKepegawaian = 'PNS' | 'PPPK' | 'Honorer Daerah';

export type PendidikanJenjang = 'S3' | 'S2' | 'S1/D4' | 'D3' | 'D2/D1' | 'SMA/SMK';

export const PENDIDIKAN_LIST: PendidikanJenjang[] = ['S3', 'S2', 'S1/D4', 'D3', 'D2/D1', 'SMA/SMK'];

export type AttendanceStatus = 'Hadir' | 'Terlambat' | 'Izin' | 'Sakit' | 'Dinas Luar';

export const PANGKAT_GOLONGAN_OPTIONS = [
  'Pembina Utama Muda / IV.c',
  'Pembina Tk. I / IV.b',
  'Pembina / IV.a',
  'Penata Tk. I / III.d',
  'Penata / III.c',
  'Penata Muda Tk. I / III.b',
  'Penata Muda / III.a',
  'Pengatur Tk. I / II.d',
  'Pengatur / II.c',
  'Pengatur Muda Tk. I / II.b',
  'Pengatur Muda / II.a',
  'PPPK Ahli Muda / X',
  'PPPK Ahli Pertama / IX',
  'PPPK Terampil / VII',
  'Tenaga Kontrak Daerah / Non-ASN',
];

export interface Employee {
  id: string;
  ownerUid: string;
  schoolCode: 'SMPN1PACET';
  nip: string;
  nama: string;
  gelarDepan: string;
  gelarBelakang: string;
  jabatan: string;
  tmtJabatan: string;
  departemen: Departemen;
  statusKepegawaian: StatusKepegawaian;
  pangkatGolongan: string;
  tmtPangkat: string;
  tmtCpns: string;
  masaKerjaTahun: number;
  masaKerjaBulan: number;
  diklatNama: string;
  diklatTahun: string;
  pendidikanJenjang: PendidikanJenjang;
  pendidikanJurusan: string;
  pendidikanTahunLulus: string;
  tanggalLahir: string;
  jenisKelamin: 'L' | 'P';
  catatanMutasi: string;
  isVerifiedByAdmin: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EmployeePrivateContact {
  ownerUid: string;
  nik: string;
  noHp: string;
  emailPribadi: string;
  alamat: string;
  kontakDarurat: string;
  updatedAt?: unknown;
}

export interface AttendanceRecord {
  id: string;
  schoolCode: 'SMPN1PACET';
  employeeId: string;
  ownerUid: string;
  employeeName: string;
  nip: string;
  departemen: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string;
  checkOutTime: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  employeeId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin';
  createdAt?: unknown;
}

export interface DUKValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statusLabel: 'Valid DUK' | 'Perlu Perbaikan' | 'Peringatan';
}

export interface DUKEmployeeRow extends Employee {
  dukRank: number;
  usiaTahun: number;
  usiaBulan: number;
  validation: DUKValidationResult;
}

export interface SchoolProfile {
  id: string;
  schoolCode: 'SMPN1PACET';
  namaSekolah: string;
  npsn: string;
  dinasNaungan: string;
  alamat: string;
  kodePos: string;
  telepon: string;
  email: string;
  website: string;
  kepalaSekolahNama: string;
  kepalaSekolahNip: string;
  logoSekolah: string;
  logoPemda: string;
  updatedAt?: unknown;
}

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  id: 'smpn1pacet',
  schoolCode: 'SMPN1PACET',
  namaSekolah: 'SMP Negeri 1 Pacet',
  npsn: '20203824',
  dinasNaungan: 'Dinas Pendidikan Pemuda dan Olahraga Kabupaten Cianjur',
  alamat: 'Jln. Cibodas Parigi No.99 Desa Cibodas Kec. Pacet Kabupaten Cianjur',
  kodePos: '43253',
  telepon: '(0263) 512099',
  email: 'smpn1pacet.cianjur@gmail.com',
  website: 'https://smpn1pacet.sch.id',
  kepalaSekolahNama: 'Dr. H. Ahmad Fauzi, M.Pd.',
  kepalaSekolahNip: '196904121994031006',
  logoSekolah: '',
  logoPemda: '',
};

export const BOOTSTRAPPED_ADMIN_EMAIL = 'sangpujangga.malam88@gmail.com';
