/**
 * supabase-client.js
 * ============================================================
 * Integrasi Supabase untuk penyimpanan hasil Petangan Jawa
 * dan trigger realtime ke Unity Projection Mapping
 *
 * Setup:
 *   1. Buat proyek di https://supabase.com
 *   2. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di bawah
 *   3. Jalankan SQL schema di Supabase SQL Editor
 *
 * Schema SQL (jalankan di Supabase SQL Editor):
 * -----------------------------------------------
 * CREATE TABLE petangan_submissions (
 *   id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   created_at   TIMESTAMPTZ DEFAULT NOW(),
 *   nama_latin   TEXT NOT NULL,
 *   aksara_jawa  TEXT NOT NULL,
 *   total_neptu  INTEGER NOT NULL,
 *   sisa_bagi    INTEGER NOT NULL,
 *   hasil_key    TEXT NOT NULL,
 *   hasil_nama   TEXT NOT NULL,
 *   hasil_arti   TEXT NOT NULL,
 *   metode       TEXT NOT NULL DEFAULT 'poerwadarminta',
 *   session_id   TEXT
 * );
 *
 * -- Enable Realtime
 * ALTER TABLE petangan_submissions REPLICA IDENTITY FULL;
 *
 * -- Row Level Security (opsional untuk publik)
 * ALTER TABLE petangan_submissions ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Allow insert" ON petangan_submissions FOR INSERT WITH CHECK (true);
 * CREATE POLICY "Allow select" ON petangan_submissions FOR SELECT USING (true);
 * -----------------------------------------------
 * ============================================================
 */

'use strict';

// ============================================================
// KONFIGURASI — GANTI DENGAN NILAI DARI DASHBOARD SUPABASE
// ============================================================
// Fallback konfigurasi langsung dari .env (aktif jika fetch('.env') diblokir browser/server)
const SUPABASE_CONFIG = {
  url: 'https://celoqgzctubsxqvozrdz.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlbG9xZ3pjdHVic3hxdm96cmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4ODQyNDgsImV4cCI6MjEwNzQ2MDI0OH0.FapbSZizpdXGbqKC7l85GnsOpK39vUuCaddB3_mBl3w',
};

/**
 * Membaca variabel lingkungan dari file .env secara dinamis
 */
async function loadEnvConfig() {
  try {
    const res = await fetch('.env');
    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        const k = key ? key.trim() : '';
        const v = vals.join('=').trim().replace(/^["']|["']$/g, '');

        if (k === 'SUPABASE_URL_KEY' || k === 'SUPABASE_URL') {
          SUPABASE_CONFIG.url = v;
        } else if (k === 'SUPABASE_API_KEY' || k === 'SUPABASE_ANON_KEY') {
          SUPABASE_CONFIG.anonKey = v;
        }
      }
    }
  } catch (err) {
    // Di browser statis / file:/// fetch .env bisa diblokir CORS atau MIME type
    // Fallback otomatis menggunakan SUPABASE_CONFIG di atas
    console.info('[Supabase] Catatan: .env via fetch tidak dapat diakses langsung, memakai konfigurasi terintegrasi.');
  }

  // Jika tetap kosong
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    console.warn('[Supabase] SUPABASE_URL_KEY / SUPABASE_API_KEY tidak ditemukan.');
  }
}

// ============================================================
// STATE
// ============================================================
let _supabaseClient = null;
let _isConfigured = false;
let _connectionStatus = 'disconnected'; // 'connected' | 'disconnected' | 'error' | 'demo'

// ============================================================
// INISIALISASI SUPABASE CLIENT
// Menggunakan Supabase JS SDK v2 dari CDN
// ============================================================

/**
 * Cek apakah konfigurasi sudah diisi
 */
function isSupabaseConfigured() {
  return (
    Boolean(SUPABASE_CONFIG.url) &&
    Boolean(SUPABASE_CONFIG.anonKey) &&
    !SUPABASE_CONFIG.url.includes('GANTI_') &&
    !SUPABASE_CONFIG.anonKey.includes('GANTI_') &&
    SUPABASE_CONFIG.url.startsWith('https://')
  );
}

/**
 * Inisialisasi koneksi Supabase
 * @returns {Promise<{status: string, message: string}>}
 */
async function initSupabase() {
  // Muat config dari .env terlebih dahulu
  await loadEnvConfig();

  // Cek apakah Supabase SDK tersedia (dimuat via CDN atau bundler)
  if (typeof window.supabase === 'undefined') {
    console.warn('[Supabase] SDK tidak ditemukan. Memuat dari CDN...');
    await loadSupabaseSDK();
  }

  if (!isSupabaseConfigured()) {
    _connectionStatus = 'demo';
    _isConfigured = false;
    console.info('[Supabase] Mode DEMO aktif — konfigurasi belum diisi.');
    return { status: 'demo', message: 'Mode Demo (Supabase belum dikonfigurasi)' };
  }

  try {
    const { createClient } = window.supabase;
    _supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

    // Test koneksi dengan query sederhana ke tabel cards atau users
    const { error } = await _supabaseClient
      .from('cards')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.warn('[Supabase] Catatan ping koneksi:', error.message);
    }

    _connectionStatus = 'connected';
    _isConfigured = true;
    console.info('[Supabase] Terkoneksi via .env.');
    return { status: 'connected', message: 'Terhubung ke database' };

  } catch (err) {
    _connectionStatus = 'error';
    _isConfigured = false;
    console.error('[Supabase] Gagal koneksi:', err.message);
    return { status: 'error', message: `Gagal: ${err.message}` };
  }
}

/**
 * Muat Supabase JS SDK dari CDN secara dinamis
 */
function loadSupabaseSDK() {
  return new Promise((resolve, reject) => {
    if (typeof window.supabase !== 'undefined') { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Gagal memuat Supabase SDK dari CDN.'));
    document.head.appendChild(script);
  });
}

// ============================================================
// OPERASI DATABASE
// ============================================================

/**
 * Simpan hasil kalkulasi Petangan ke Supabase:
 * Tabel `users` (created_at, nama_latin, nama_panggilan, id_kartu, url_kartu)
 *
 * @param {Object} data - Data hasil kalkulasi
 * @returns {Promise<{success: boolean, id?: string, error?: string, demo?: boolean}>}
 */
async function simpanHasilPetangan(data) {
  const {
    idKartu,
    namaLatin,
    namaPanggilan,
  } = data;

  // Mode Demo: simulasi tanpa DB nyata
  if (!_isConfigured || _connectionStatus === 'demo') {
    console.info('[Supabase] Mode Demo — Data tidak disimpan ke DB:', data);
    await simulasiDelay(800);
    return {
      success: true,
      demo: true,
      id: 'demo-' + Date.now(),
      message: 'Mode Demo: Data tidak disimpan ke database nyata.',
    };
  }

  if (!_supabaseClient) {
    return { success: false, error: 'Supabase client tidak terinisialisasi.' };
  }

  try {
    const userPayload = {
      nama_latin:     (namaLatin || '').trim(),
      nama_panggilan: (namaPanggilan || '').trim(),
      id_kartu:       idKartu, // Relasi ke cards(id) (1: Sri, 2: Lungguh, 3: Gedhong, 4: Lara, 5: Pati)
    };

    // Insert ke tabel 'users'
    const { data: userInsert, error: userError } = await _supabaseClient
      .from('users')
      .insert([userPayload])
      .select('id')
      .single();

    if (userError) throw userError;

    console.info('[Supabase] Berhasil simpan ke tabel users, ID:', userInsert.id);
    return { success: true, id: userInsert.id, demo: false };

  } catch (err) {
    console.error('[Supabase] Gagal menyimpan:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Upload gambar kartu ke Supabase Storage bucket 'CardPetangen'
 * dan perbarui URL gambar kartu di tabel 'cards' atau 'users'
 * @param {Blob|string} cardData - Blob atau dataURL gambar kartu
 * @param {string} fileName - Nama file tujuan
 * @param {number} idKartu - ID kartu (1: Sri, 2: Lungguh, 3: Gedhong, 4: Lara, 5: Pati)
 * @param {string} userId - ID record user dari tabel users
 * @returns {Promise<{success: boolean, publicUrl?: string, error?: string}>}
 */
async function uploadCardImageToStorage(cardData, fileName, idKartu = null, userId = null) {
  const BUCKET_NAME = 'CardPetangen';

  if (!_isConfigured || _connectionStatus === 'demo') {
    console.info(`[Supabase Storage] Mode Demo — Simulasi upload kartu ke bucket ${BUCKET_NAME}:`, fileName);
    return {
      success: true,
      demo: true,
      publicUrl: `demo://${BUCKET_NAME}/${fileName}`,
    };
  }

  if (!_supabaseClient) {
    return { success: false, error: 'Supabase client tidak terinisialisasi.' };
  }

  try {
    let fileBody = cardData;
    if (typeof cardData === 'string' && cardData.startsWith('data:')) {
      const res = await fetch(cardData);
      fileBody = await res.blob();
    }

    const filePath = `${Date.now()}_${fileName}`;
    const { data, error } = await _supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBody, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.warn(`[Supabase Storage] Notice upload ke bucket ${BUCKET_NAME}:`, error.message);
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = _supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    const publicUrl = publicUrlData?.publicUrl;

    // Update url_kartu di tabel users jika userId tersedia
    if (userId && _supabaseClient) {
      try {
        await _supabaseClient
          .from('users')
          .update({ url_kartu: publicUrl })
          .eq('id', userId);
      } catch (uErr) {
        console.info('[Supabase] Catatan update url_kartu users:', uErr.message);
      }
    }

    return { success: true, publicUrl };
  } catch (err) {
    console.error(`[Supabase Storage] Gagal upload ke ${BUCKET_NAME}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribe ke perubahan realtime di tabel petangan_submissions
 * Berguna untuk testing integrasi Unity
 * @param {Function} onInsert - Callback saat ada data baru
 * @returns {Object} subscription
 */
function subscribeRealtimePetangan(onInsert) {
  if (!_supabaseClient || !_isConfigured) {
    console.warn('[Supabase] Tidak dapat subscribe — tidak terkonfigurasi.');
    return null;
  }

  const subscription = _supabaseClient
    .channel('petangan_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'petangan_submissions' },
      (payload) => {
        console.info('[Supabase Realtime] Data baru:', payload.new);
        if (typeof onInsert === 'function') {
          onInsert(payload.new);
        }
      }
    )
    .subscribe((status) => {
      console.info('[Supabase Realtime] Status channel:', status);
    });

  return subscription;
}

/**
 * Ambil riwayat submission terbaru
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRiwayatPetangan(limit = 10) {
  if (!_supabaseClient || !_isConfigured) return [];

  try {
    const { data, error } = await _supabaseClient
      .from('petangan_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Supabase] Gagal ambil riwayat:', err.message);
    return [];
  }
}

// ============================================================
// HELPERS
// ============================================================

function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function simulasiDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getConnectionStatus() {
  return _connectionStatus;
}

function getSupabaseClient() {
  return _supabaseClient;
}

// ============================================================
// SCHEMA HELPER — Tampilkan SQL schema di console untuk setup
// ============================================================
function tampilkanSchema() {
  const sql = `
-- ============================================================
-- SASMITA AKSARA — 2 Tabel Supabase + Bucket Storage
-- Jalankan di Supabase > SQL Editor
-- ============================================================

-- Hapus tabel lama jika ingin reset (OPSIONAL):
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS cards CASCADE;

-- 1. TABEL CARDS (Hanya: id, nama_kartu, deskripsi)
CREATE TABLE IF NOT EXISTS cards (
  id           INTEGER PRIMARY KEY, -- 1: Sri, 2: Lungguh, 3: Gedhong, 4: Lara, 5: Pati
  nama_kartu   TEXT NOT NULL,
  deskripsi    TEXT NOT NULL
);

-- Isi Data 5 Kartu Beserta Deskripsinya
INSERT INTO cards (id, nama_kartu, deskripsi)
VALUES 
  (
    1, 
    'Sang Sri', 
    'Sang Sri adalah pancaran Dewi Kesuburan dan Kemakmuran. Kamu dianugerahi tarikan energi emas yang membuka pintu-pintu kemudahan, rezeki berlimpah, dan keharmonisan hidup. Hadirmu menumbuhkan dan menyuburkan apa pun yang kamu sentuh.'
  ),
  (
    2, 
    'Sang Lungguh', 
    'Lungguh merepresentasikan kedudukan takhta tertinggi. Kamu dilahirkan membawa aura wibawa alami, integritas yang disegani, serta kepercayaan mendalam dari sekelilingmu. Langkahmu ditakdirkan untuk memimpin dan membimbing dengan kehormatan.'
  ),
  (
    3, 
    'Sang Gedhong', 
    'Gedhong melambangkan sang arsitek peradaban agung. Kamu memiliki ketajaman visi untuk membangun sesuatu yang monumental dari ketiadaan hingga menjadi mahakarya abadi. Energi ciptaan dan daya stabilitasmu menjadi pilar bagi banyak orang.'
  ),
  (
    4, 
    'Sang Lara', 
    'Lara adalah sang burung Phoenix yang ditempa api penempaan jiwa. Ketangguhan batinmu luar biasa; setiap badai dan rintangan tidak pernah memadamkanmu, melainkan justru mengasahmu menjadi berlian tak ternilai yang bangkit berkali-kali lebih kuat dan bercahaya.'
  ),
  (
    5, 
    'Sang Pati', 
    'Pati dalam filosofi esoteris adalah gerbang transendensi dan kelahiran kembali. Kamu dianugerahi mata batin yang tajam, kedalaman spiritual, dan intuisi langka yang mampu menyingkap tabir rahasia kehidupan serta mengubah kegelapan menjadi pencerahan murni.'
  )
ON CONFLICT (id) DO UPDATE SET
  nama_kartu  = EXCLUDED.nama_kartu,
  deskripsi   = EXCLUDED.deskripsi;

-- 2. TABEL USERS (Simpel & Bersih: Khusus Data Pengunjung)
CREATE TABLE IF NOT EXISTS users (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  nama_latin      TEXT NOT NULL,
  nama_panggilan  TEXT,
  id_kartu        INTEGER REFERENCES cards(id), -- ID Kartu (1 - 5)
  url_kartu       TEXT                          -- Link gambar kartu di bucket CardPetangen
);

-- Aktifkan Realtime untuk Unity
ALTER TABLE users REPLICA IDENTITY FULL;

-- Aktifkan RLS & Kebijakan Akses Publik
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select cards" ON cards FOR SELECT USING (true);
CREATE POLICY "Allow public update cards" ON cards FOR UPDATE USING (true);

CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public update users" ON users FOR UPDATE USING (true);

-- Index Pencarian Cepat
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_id_kartu ON users(id_kartu);
`;
  console.groupCollapsed('%c[Sasmita Aksara] Supabase Schema SQL (users & cards)', 'color: #d4a017; font-weight: bold;');
  console.log(sql);
  console.groupEnd();
  return sql;
}

// Auto-log schema jika belum dikonfigurasi
if (!isSupabaseConfigured()) {
  tampilkanSchema();
}

// Export
window.SupabaseClient = {
  initSupabase,
  simpanHasilPetangan,
  uploadCardImageToStorage,
  subscribeRealtimePetangan,
  getRiwayatPetangan,
  getConnectionStatus,
  getSupabaseClient,
  isSupabaseConfigured,
  tampilkanSchema,
  SUPABASE_CONFIG,
};
