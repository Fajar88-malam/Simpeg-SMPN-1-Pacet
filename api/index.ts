import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(res: express.Response, err: unknown) {
  const message =
    err instanceof Error ? err.message : 'Terjadi kesalahan pada layanan Gemini AI.';
  console.error('Gemini API Error:', message);

  if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
    return res.status(403).json({
      error:
        'Kunci Gemini API belum valid atau ditolak. Periksa pengaturan Secrets / Environment Variables.',
      code: 'API_KEY_INVALID',
    });
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    return res.status(429).json({
      error: 'Kuota permintaan Gemini API sedang penuh. Silakan coba beberapa saat lagi.',
      code: 'RESOURCE_EXHAUSTED',
    });
  }
  return res.status(500).json({
    error: `Gagal memproses permintaan AI: ${message}`,
    code: 'GEMINI_ERROR',
  });
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  res.json({ ok: true, geminiConfigured: hasKey });
});

app.post('/api/gemini/audit-duk', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error:
        'GEMINI_API_KEY belum dikonfigurasi pada environment server. Silakan atur melalui panel Settings > Secrets / Environment Variables.',
      code: 'MISSING_API_KEY',
    });
  }

  try {
    const { employees } = req.body as {
      employees?: Array<{
        dukRank: number;
        nama: string;
        nip: string;
        jabatan: string;
        departemen: string;
        statusKepegawaian: string;
        pangkatGolongan: string;
        tmtPangkat: string;
        masaKerjaTahun: number;
        masaKerjaBulan: number;
        pendidikanJenjang: string;
        tanggalLahir: string;
        validationErrors: string[];
        validationWarnings: string[];
      }>;
    };

    if (!Array.isArray(employees) || employees.length === 0) {
      return res
        .status(400)
        .json({ error: 'Data pegawai untuk audit DUK tidak ditemukan.' });
    }

    const compactRecords = employees.slice(0, 60).map((e) => ({
      urut: e.dukRank,
      nama: e.nama,
      nip: e.nip,
      jabatan: e.jabatan,
      departemen: e.departemen,
      status: e.statusKepegawaian,
      golongan: e.pangkatGolongan,
      tmtPangkat: e.tmtPangkat,
      masaKerja: `${e.masaKerjaTahun} thn ${e.masaKerjaBulan} bln`,
      pendidikan: e.pendidikanJenjang,
      tglLahir: e.tanggalLahir,
      errorValidasi: e.validationErrors,
      peringatanValidasi: e.validationWarnings,
    }));

    const today = new Date().toISOString().slice(0, 10);

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Tanggal acuan: ${today}. Analisis Daftar Urut Kepegawaian (DUK) SMP Negeri 1 Pacet, Dinas Pendidikan Pemuda dan Olahraga Kabupaten Cianjur berikut:\n${JSON.stringify(compactRecords, null, 2)}`,
      config: {
        systemInstruction:
          'Anda adalah analis kepegawaian senior ASN di Dinas Pendidikan Pemuda dan Olahraga Kabupaten Cianjur. Tugas Anda mengaudit DUK SMP Negeri 1 Pacet berdasarkan PP No. 15 Tahun 1979 tentang DUK PNS, UU No. 20 Tahun 2023 tentang ASN, dan ketentuan BKN (format NIP 18 digit, kelayakan Kenaikan Pangkat reguler 4 tahunan, dan Masa Persiapan Pensiun / BUP usia 60 guru / 58 tenaga kependidikan). Berikan hasil audit formal, ringkas, dan akurat dalam Bahasa Indonesia.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ringkasanEksekutif: {
              type: Type.STRING,
              description:
                'Ringkasan kondisi kepatuhan DUK SMP Negeri 1 Pacet secara keseluruhan (2-4 kalimat).',
            },
            kandidatKenaikanPangkat: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nama: { type: Type.STRING },
                  nip: { type: Type.STRING },
                  alasan: { type: Type.STRING },
                },
              },
            },
            perhatianPensiunDanValidasi: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nama: { type: Type.STRING },
                  kategori: { type: Type.STRING },
                  tindakLanjut: { type: Type.STRING },
                },
              },
            },
            rekomendasiTataUsaha: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json({ audit: parsed, generatedAt: new Date().toISOString() });
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

app.post('/api/gemini/attendance-insights', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error:
        'GEMINI_API_KEY belum dikonfigurasi pada environment server. Silakan atur melalui panel Settings > Secrets / Environment Variables.',
      code: 'MISSING_API_KEY',
    });
  }

  try {
    const { date, summary, departmentBreakdown, recentLogs } = req.body as {
      date?: string;
      summary?: Record<string, number>;
      departmentBreakdown?: Array<Record<string, unknown>>;
      recentLogs?: Array<Record<string, unknown>>;
    };

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Tanggal: ${date || new Date().toISOString().slice(0, 10)}\nRingkasan Absensi: ${JSON.stringify(summary)}\nPer Departemen: ${JSON.stringify(departmentBreakdown)}\nLog Terbaru: ${JSON.stringify((recentLogs || []).slice(0, 20))}`,
      config: {
        systemInstruction:
          'Anda adalah asisten pelaporan kedisiplinan kepegawaian SMP Negeri 1 Pacet Kabupaten Cianjur. Buat evaluasi ringkas kehadiran hari ini dan saran operasional untuk Kepala Sekolah dan Kepala Tata Usaha dalam Bahasa Indonesia formal.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ringkasanKehadiran: { type: Type.STRING },
            sorotanDepartemen: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tindakLanjutPimpinan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json({ insight: parsed, generatedAt: new Date().toISOString() });
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

app.post('/api/gemini/verify-profile', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error:
        'GEMINI_API_KEY belum dikonfigurasi pada environment server. Silakan atur melalui panel Settings > Secrets / Environment Variables.',
      code: 'MISSING_API_KEY',
    });
  }

  try {
    const { profile } = req.body as { profile?: Record<string, unknown> };
    if (!profile) {
      return res.status(400).json({ error: 'Data profil pegawai tidak dikirimkan.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Periksa kelengkapan dan tata penulisan data profil pegawai berikut untuk standar DUK Dinas Pendidikan Pemuda dan Olahraga Kabupaten Cianjur:\n${JSON.stringify(profile)}`,
      config: {
        systemInstruction:
          'Berikan evaluasi singkat dan saran perbaikan penulisan gelar akademik (EYD/BKN), kesesuaian pendidikan dengan jabatan, serta kelengkapan data DUK pribadi pegawai SMP Negeri 1 Pacet dalam Bahasa Indonesia.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            statusKesiapan: { type: Type.STRING },
            catatanPenulisan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            saranPengembangan: { type: Type.STRING },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.json({ result: parsed });
  } catch (err) {
    return handleGeminiError(res, err);
  }
});

export default app;
