import type {
  DUKEmployeeRow,
  DUKValidationResult,
  Employee,
  PendidikanJenjang,
} from '../types/kepegawaian';

export function formatFullName(emp: Pick<Employee, 'gelarDepan' | 'nama' | 'gelarBelakang'>): string {
  const depan = emp.gelarDepan?.trim() ? `${emp.gelarDepan.trim()} ` : '';
  const belakang = emp.gelarBelakang?.trim() ? `, ${emp.gelarBelakang.trim()}` : '';
  return `${depan}${emp.nama.trim()}${belakang}`;
}

export function calculateAge(birthDateStr: string, refDate = new Date()): { years: number; months: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) {
    return { years: 0, months: 0 };
  }
  const [y, m, d] = birthDateStr.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) {
    return { years: 0, months: 0 };
  }

  let years = refDate.getFullYear() - birth.getFullYear();
  let months = refDate.getMonth() - birth.getMonth();
  if (refDate.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

function getGolonganWeight(pangkatGolongan: string, status: Employee['statusKepegawaian']): number {
  const upper = pangkatGolongan.toUpperCase();
  const pnsMap: Array<[string, number]> = [
    ['IV.E', 170], ['IV/E', 170],
    ['IV.D', 160], ['IV/D', 160],
    ['IV.C', 150], ['IV/C', 150],
    ['IV.B', 140], ['IV/B', 140],
    ['IV.A', 130], ['IV/A', 130],
    ['III.D', 120], ['III/D', 120],
    ['III.C', 110], ['III/C', 110],
    ['III.B', 100], ['III/B', 100],
    ['III.A', 90],  ['III/A', 90],
    ['II.D', 80],   ['II/D', 80],
    ['II.C', 70],   ['II/C', 70],
    ['II.B', 60],   ['II/B', 60],
    ['II.A', 50],   ['II/A', 50],
    ['I.D', 40],    ['I/D', 40],
    ['I.C', 30],    ['I/C', 30],
    ['I.B', 20],    ['I/B', 20],
    ['I.A', 10],    ['I/A', 10],
  ];

  for (const [token, weight] of pnsMap) {
    if (upper.includes(token)) return weight;
  }

  if (status === 'PPPK') {
    if (upper.includes('XI')) return 48;
    if (upper.includes('X')) return 45;
    if (upper.includes('IX')) return 42;
    if (upper.includes('VII')) return 38;
    if (upper.includes('V')) return 34;
    return 30;
  }

  return 5;
}

function getJabatanWeight(jabatan: string): number {
  const j = jabatan.toLowerCase();
  if (j.includes('kepala sekolah')) return 100;
  if (j.includes('wakil kepala')) return 90;
  if (j.includes('kepala tata usaha') || j.includes('koordinator tu')) return 80;
  if (j.includes('kepala perpustakaan') || j.includes('kepala laboratorium')) return 75;
  if (j.includes('guru ahli madya')) return 70;
  if (j.includes('guru ahli muda')) return 60;
  if (j.includes('guru ahli pertama')) return 50;
  if (j.includes('guru')) return 45;
  if (j.includes('konselor') || j.includes('bk')) return 45;
  if (j.includes('bendahara') || j.includes('operator') || j.includes('pengadministrasi')) return 30;
  return 20;
}

function getPendidikanWeight(jenjang: PendidikanJenjang): number {
  switch (jenjang) {
    case 'S3':
      return 6;
    case 'S2':
      return 5;
    case 'S1/D4':
      return 4;
    case 'D3':
      return 3;
    case 'D2/D1':
      return 2;
    case 'SMA/SMK':
    default:
      return 1;
  }
}

/**
 * Validasi Data Otomatis DUK sesuai peraturan kepegawaian BKN / PP No. 15 Tahun 1979 & UU ASN.
 */
export function validateEmployeeDUK(emp: Employee): DUKValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cleanNip = emp.nip.replace(/\s+/g, '');

  if (!emp.nama.trim()) {
    errors.push('Nama lengkap wajib diisi.');
  }
  if (!emp.jabatan.trim()) {
    errors.push('Jabatan wajib diisi.');
  }

  // Validasi Format NIP 18 Digit untuk PNS & PPPK
  if (emp.statusKepegawaian === 'PNS' || emp.statusKepegawaian === 'PPPK') {
    if (!/^\d{18}$/.test(cleanNip)) {
      errors.push(
        `NIP ${emp.statusKepegawaian} harus tepat 18 digit angka (saat ini ${cleanNip.length} karakter).`
      );
    } else {
      const nipBirth = `${cleanNip.slice(0, 4)}-${cleanNip.slice(4, 6)}-${cleanNip.slice(6, 8)}`;
      const nipCpnsYm = `${cleanNip.slice(8, 12)}-${cleanNip.slice(12, 14)}`;
      const nipGenderDigit = cleanNip[14];

      if (emp.tanggalLahir !== nipBirth) {
        errors.push(
          `Tanggal lahir (${emp.tanggalLahir}) tidak sinkron dengan 8 digit awal NIP (${nipBirth}).`
        );
      }

      if (emp.tmtCpns.slice(0, 7) !== nipCpnsYm) {
        errors.push(
          `TMT Pengangkatan (${emp.tmtCpns.slice(0, 7)}) tidak sinkron dengan digit 9-14 NIP (${nipCpnsYm}).`
        );
      }

      const expectedGender = emp.jenisKelamin === 'L' ? '1' : '2';
      if (nipGenderDigit !== expectedGender) {
        errors.push(
          `Digit ke-15 NIP (${nipGenderDigit}) tidak sesuai jenis kelamin (${emp.jenisKelamin === 'L' ? '1=Laki-laki' : '2=Perempuan'}).`
        );
      }
    }
  } else {
    if (cleanNip.length < 4) {
      errors.push('Nomor induk / identitas pegawai Honorer Daerah minimal 4 karakter.');
    }
  }

  // Validasi Tanggal & Logika TMT
  const birthYear = Number(emp.tanggalLahir.slice(0, 4));
  const cpnsYear = Number(emp.tmtCpns.slice(0, 4));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(emp.tanggalLahir) || birthYear < 1955 || birthYear > 2008) {
    errors.push('Format atau tahun tanggal lahir tidak valid.');
  }

  if (emp.tmtPangkat < emp.tmtCpns) {
    errors.push('TMT Pangkat/Golongan tidak boleh lebih awal dari TMT Pengangkatan awal.');
  }

  if (emp.tmtJabatan < emp.tmtCpns) {
    errors.push('TMT Jabatan tidak boleh lebih awal dari TMT Pengangkatan awal.');
  }

  if (cpnsYear - birthYear < 18) {
    errors.push('Usia saat pengangkatan awal tidak logis (< 18 tahun).');
  }

  if (!emp.pangkatGolongan.trim()) {
    errors.push('Pangkat/Golongan ruang wajib diisi.');
  }

  if (!emp.pendidikanJurusan.trim()) {
    warnings.push('Program studi / jurusan pendidikan terakhir belum dilengkapi.');
  }

  if (!emp.diklatNama.trim() && emp.statusKepegawaian === 'PNS') {
    warnings.push('Riwayat latihan jabatan / diklat fungsional belum tercatat.');
  }

  // Cek usia BUP (Batas Usia Pensiun: 60 thn Guru, 58 thn Tendik)
  const { years: ageYears } = calculateAge(emp.tanggalLahir);
  const isTeacherOrPrincipal =
    emp.jabatan.toLowerCase().includes('guru') || emp.jabatan.toLowerCase().includes('kepala sekolah');
  const bup = isTeacherOrPrincipal ? 60 : 58;
  if (ageYears >= bup) {
    warnings.push(`Usia pegawai (${ageYears} thn) telah mencapai/melewati BUP (${bup} thn).`);
  } else if (ageYears >= bup - 1) {
    warnings.push(`Memasuki Masa Persiapan Pensiun (usia ${ageYears} thn, BUP ${bup} thn).`);
  }

  // Cek kelayakan Kenaikan Pangkat Reguler (>= 4 tahun dari TMT Pangkat)
  if (emp.statusKepegawaian === 'PNS' && /^\d{4}-\d{2}-\d{2}$/.test(emp.tmtPangkat)) {
    const pangkatAge = calculateAge(emp.tmtPangkat);
    if (pangkatAge.years >= 4) {
      warnings.push(`TMT Pangkat sudah ${pangkatAge.years} tahun; layak diusulkan Kenaikan Pangkat.`);
    }
  }

  if (!emp.isVerifiedByAdmin) {
    warnings.push('Menunggu verifikasi berkas fisik oleh Administrator Kepegawaian.');
  }

  const isValid = errors.length === 0;
  const statusLabel: DUKValidationResult['statusLabel'] = !isValid
    ? 'Perlu Perbaikan'
    : warnings.length > 0
      ? 'Peringatan'
      : 'Valid DUK';

  return { isValid, errors, warnings, statusLabel };
}

/**
 * Mengurutkan pegawai sesuai hierarki hukum DUK (PP No. 15 Tahun 1979):
 * 1. Pangkat/Golongan Ruang tertinggi
 * 2. TMT Pangkat terlama
 * 3. Tingkat Jabatan & TMT Jabatan terlama
 * 4. Masa Kerja terbanyak
 * 5. Latihan Jabatan (Diklat)
 * 6. Pendidikan Terakhir tertinggi
 * 7. Usia tertua (tanggal lahir lebih awal)
 */
export function sortEmployeesByDUK(employees: Employee[]): DUKEmployeeRow[] {
  const sorted = [...employees].sort((a, b) => {
    // 1. Pangkat/Golongan
    const golDiff =
      getGolonganWeight(b.pangkatGolongan, b.statusKepegawaian) -
      getGolonganWeight(a.pangkatGolongan, a.statusKepegawaian);
    if (golDiff !== 0) return golDiff;

    // 2. TMT Pangkat (earlier is higher)
    if (a.tmtPangkat !== b.tmtPangkat) return a.tmtPangkat.localeCompare(b.tmtPangkat);

    // 3. Jabatan & TMT Jabatan
    const jabDiff = getJabatanWeight(b.jabatan) - getJabatanWeight(a.jabatan);
    if (jabDiff !== 0) return jabDiff;
    if (a.tmtJabatan !== b.tmtJabatan) return a.tmtJabatan.localeCompare(b.tmtJabatan);

    // 4. Masa Kerja total bulan
    const mkA = a.masaKerjaTahun * 12 + a.masaKerjaBulan;
    const mkB = b.masaKerjaTahun * 12 + b.masaKerjaBulan;
    if (mkB !== mkA) return mkB - mkA;

    // 5. Latihan Jabatan (has diklat + earlier year)
    const hasDiklatA = a.diklatNama.trim() ? 1 : 0;
    const hasDiklatB = b.diklatNama.trim() ? 1 : 0;
    if (hasDiklatB !== hasDiklatA) return hasDiklatB - hasDiklatA;

    // 6. Pendidikan Terakhir
    const pendDiff = getPendidikanWeight(b.pendidikanJenjang) - getPendidikanWeight(a.pendidikanJenjang);
    if (pendDiff !== 0) return pendDiff;

    // 7. Usia tertua (tanggalLahir lebih kecil)
    return a.tanggalLahir.localeCompare(b.tanggalLahir);
  });

  return sorted.map((emp, index) => {
    const age = calculateAge(emp.tanggalLahir);
    return {
      ...emp,
      dukRank: index + 1,
      usiaTahun: age.years,
      usiaBulan: age.months,
      validation: validateEmployeeDUK(emp),
    };
  });
}
