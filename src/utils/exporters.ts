import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DUKEmployeeRow, Employee, SchoolProfile } from '../types/kepegawaian';
import { DEFAULT_SCHOOL_PROFILE } from '../types/kepegawaian';
import { formatFullName, validateEmployeeDUK } from './dukValidator';

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEmployeesCSV(employees: Employee[], filename = 'data-pegawai-smpn1-pacet.csv') {
  const headers = [
    'No',
    'Nama Lengkap',
    'NIP',
    'Status Kepegawaian',
    'Pangkat / Golongan',
    'TMT Pangkat',
    'Jabatan',
    'Departemen',
    'Masa Kerja',
    'Pendidikan Terakhir',
    'Tanggal Lahir',
    'Status Validasi DUK',
  ];

  const rows = employees.map((emp, idx) => {
    const val = validateEmployeeDUK(emp);
    return [
      idx + 1,
      formatFullName(emp),
      `'${emp.nip}`,
      emp.statusKepegawaian,
      emp.pangkatGolongan,
      emp.tmtPangkat,
      emp.jabatan,
      emp.departemen,
      `${emp.masaKerjaTahun} Thn ${emp.masaKerjaBulan} Bln`,
      `${emp.pendidikanJenjang} ${emp.pendidikanJurusan} (${emp.pendidikanTahunLulus})`,
      emp.tanggalLahir,
      val.statusLabel,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const csvContent = `\uFEFF${headers.map(escapeCsvCell).join(',')}\n${rows.join('\n')}`;
  triggerDownload(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportDUKCSV(dukRows: DUKEmployeeRow[], filename = 'duk-resmi-smpn1-pacet.csv') {
  const headers = [
    'No Urut DUK',
    'Nama Lengkap',
    'NIP',
    'Status',
    'Pangkat / Golongan Ruang',
    'TMT Pangkat',
    'Jabatan',
    'TMT Jabatan',
    'Departemen / Unit',
    'Masa Kerja (Thn)',
    'Masa Kerja (Bln)',
    'Latihan Jabatan / Diklat',
    'Tahun Diklat',
    'Pendidikan Terakhir',
    'Jurusan',
    'Tahun Lulus',
    'Tanggal Lahir',
    'Usia (Thn)',
    'Catatan Mutasi',
    'Hasil Validasi Otomatis',
    'Temuan Validasi',
  ];

  const rows = dukRows.map((row) =>
    [
      row.dukRank,
      formatFullName(row),
      `'${row.nip}`,
      row.statusKepegawaian,
      row.pangkatGolongan,
      row.tmtPangkat,
      row.jabatan,
      row.tmtJabatan,
      row.departemen,
      row.masaKerjaTahun,
      row.masaKerjaBulan,
      row.diklatNama || '-',
      row.diklatTahun || '-',
      row.pendidikanJenjang,
      row.pendidikanJurusan || '-',
      row.pendidikanTahunLulus || '-',
      row.tanggalLahir,
      `${row.usiaTahun} Thn ${row.usiaBulan} Bln`,
      row.catatanMutasi || '-',
      row.validation.statusLabel,
      [...row.validation.errors, ...row.validation.warnings].join('; ') || 'Memenuhi ketentuan DUK',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const csvContent = `\uFEFF${headers.map(escapeCsvCell).join(',')}\n${rows.join('\n')}`;
  triggerDownload(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
}


function tryAddLogoToPdf(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return;
  try {
    const format = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')
      ? 'JPEG'
      : 'PNG';
    doc.addImage(dataUrl, format, x, y, w, h);
  } catch {
    // skip invalid or unsupported image format in PDF
  }
}

function drawKopSurat(
  doc: jsPDF,
  reportTitle: string,
  subtitle: string,
  schoolProfile: SchoolProfile
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  tryAddLogoToPdf(doc, schoolProfile.logoPemda, 16, 10, 19, 19);
  tryAddLogoToPdf(doc, schoolProfile.logoSekolah, pageWidth - 35, 10, 19, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMERINTAH KABUPATEN CIANJUR', pageWidth / 2, 13, { align: 'center' });
  doc.setFontSize(12);
  doc.text('DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA', pageWidth / 2, 18.5, { align: 'center' });
  doc.setFontSize(13.5);
  doc.text(schoolProfile.namaSekolah.toUpperCase(), pageWidth / 2, 24.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${schoolProfile.alamat}${schoolProfile.kodePos ? ` ${schoolProfile.kodePos}` : ''}`,
    pageWidth / 2,
    29.5,
    { align: 'center' }
  );

  doc.setLineWidth(0.7);
  doc.line(14, 32.5, pageWidth - 14, 32.5);
  doc.setLineWidth(0.25);
  doc.line(14, 33.4, pageWidth - 14, 33.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(reportTitle, pageWidth / 2, 40, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(subtitle, pageWidth / 2, 45, { align: 'center' });
}

function drawSignatureFooter(doc: jsPDF, startY: number, schoolProfile: SchoolProfile) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = startY + 10;

  if (y + 32 > pageHeight - 10) {
    doc.addPage();
    y = 20;
  }

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const sigX = pageWidth - 78;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Pacet, ${todayLabel}`, sigX, y);
  doc.text(`Kepala ${schoolProfile.namaSekolah},`, sigX, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolProfile.kepalaSekolahNama || 'Dr. H. Ahmad Fauzi, M.Pd.', sigX, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${schoolProfile.kepalaSekolahNip || '19690412 199403 1 006'}`, sigX, y + 29);
}

export function exportEmployeesPDF(
  employees: Employee[],
  departmentFilterLabel: string,
  filename = 'data-pegawai-smpn1-pacet.pdf',
  schoolProfile: SchoolProfile = DEFAULT_SCHOOL_PROFILE
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  drawKopSurat(
    doc,
    'DATA PEGAWAI & TENAGA KEPENDIDIKAN',
    `Filter Departemen: ${departmentFilterLabel} · Tanggal Cetak: ${dateStr} · Total: ${employees.length} Pegawai`,
    schoolProfile
  );

  autoTable(doc, {
    startY: 50,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.3,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 48 },
      2: { cellWidth: 37, font: 'courier' },
      3: { cellWidth: 46 },
      4: { cellWidth: 42 },
      5: { cellWidth: 36 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 26 },
    },
    head: [
      [
        'No',
        'Nama Lengkap',
        'NIP / NI PPPK',
        'Jabatan',
        'Departemen',
        'Pangkat / Gol.',
        'Status',
        'Validasi DUK',
      ],
    ],
    body: employees.map((emp, idx) => {
      const val = validateEmployeeDUK(emp);
      return [
        idx + 1,
        formatFullName(emp),
        emp.nip,
        emp.jabatan,
        emp.departemen,
        emp.pangkatGolongan,
        emp.statusKepegawaian,
        val.statusLabel,
      ];
    }),
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  drawSignatureFooter(doc, finalY, schoolProfile);
  doc.save(filename);
}

export function exportDUKPDF(
  dukRows: DUKEmployeeRow[],
  filename = 'duk-resmi-smpn1-pacet.pdf',
  schoolProfile: SchoolProfile = DEFAULT_SCHOOL_PROFILE
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const invalidCount = dukRows.filter((r) => !r.validation.isValid).length;

  drawKopSurat(
    doc,
    'DAFTAR URUT KEPEGAWAIAN (DUK)',
    `Sesuai PP No. 15 Tahun 1979 & UU ASN No. 20 Tahun 2023 · Tanggal Cetak: ${dateStr} · Data Tidak Valid: ${invalidCount}`,
    schoolProfile
  );

  autoTable(doc, {
    startY: 50,
    theme: 'grid',
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.2,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 },
      1: { cellWidth: 44 },
      2: { cellWidth: 33 },
      3: { cellWidth: 38 },
      4: { halign: 'center', cellWidth: 16 },
      5: { cellWidth: 32 },
      6: { cellWidth: 34 },
      7: { halign: 'center', cellWidth: 22 },
      8: { cellWidth: 39 },
    },
    head: [
      [
        'Urut',
        'Nama Lengkap & NIP',
        'Pangkat / Gol. & TMT',
        'Jabatan & TMT',
        'Masa Kerja',
        'Latihan Jabatan',
        'Pendidikan Terakhir',
        'Tgl Lahir / Usia',
        'Catatan & Status Validasi',
      ],
    ],
    body: dukRows.map((row) => [
      row.dukRank,
      `${formatFullName(row)}\nNIP: ${row.nip}`,
      `${row.pangkatGolongan}\nTMT: ${row.tmtPangkat}`,
      `${row.jabatan}\n(${row.departemen})\nTMT: ${row.tmtJabatan}`,
      `${row.masaKerjaTahun} Thn\n${row.masaKerjaBulan} Bln`,
      row.diklatNama ? `${row.diklatNama}\n(${row.diklatTahun || '-'})` : '-',
      `${row.pendidikanJenjang} ${row.pendidikanJurusan}\nLulus ${row.pendidikanTahunLulus || '-'}`,
      `${row.tanggalLahir}\n(${row.usiaTahun} Thn)`,
      `${row.validation.statusLabel}${row.catatanMutasi ? `\n${row.catatanMutasi}` : ''}`,
    ]),
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;
  drawSignatureFooter(doc, finalY, schoolProfile);
  doc.save(filename);
}
