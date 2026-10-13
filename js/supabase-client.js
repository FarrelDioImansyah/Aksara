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
const SUPABASE_CONFIG = {
  url: '',
  anonKey: '',
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
    console.warn('[Supabase] Gagal membaca .env via fetch:', err.message);
  }

  // Jika .env tidak terbaca atau kosong
  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    console.warn('[Supabase] SUPABASE_URL_KEY / SUPABASE_API_KEY tidak ditemukan di .env.');
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

    // Test koneksi dengan query sederhana
    const { error } = await _supabaseClient
      .from('petangan_submissions')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
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
 * Simpan hasil kalkulasi Petangan ke Supabase
 * @param {Object} data - Data hasil kalkulasi
 * @returns {Promise<{success: boolean, id?: string, error?: string, demo?: boolean}>}
 */
async function simpanHasilPetangan(data) {
  const {
    namaLatin,
    aksaraJawa,
    totalNeptu,
    sisaBagi,
    hasilKey,
    hasilNama,
    hasilArti,
    metode,
    sessionId,
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
    const { data: inserted, error } = await _supabaseClient
      .from('petangan_submissions')
      .insert([{
        nama_latin:  namaLatin.trim(),
        aksara_jawa: aksaraJawa,
        total_neptu: totalNeptu,
        sisa_bagi:   sisaBagi,
        hasil_key:   hasilKey,
        hasil_nama:  hasilNama,
        hasil_arti:  hasilArti,
        metode:      metode,
        session_id:  sessionId || generateSessionId(),
      }])
      .select('id')
      .single();

    if (error) throw error;

    console.info('[Supabase] Data disimpan, ID:', inserted.id);
    return { success: true, id: inserted.id, demo: false };

  } catch (err) {
    console.error('[Supabase] Gagal menyimpan:', err.message);
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
-- SASMITA AKSARA — Supabase Schema Setup
-- Jalankan di: https://supabase.com > Project > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS petangan_submissions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  nama_latin   TEXT NOT NULL,
  aksara_jawa  TEXT NOT NULL,
  total_neptu  INTEGER NOT NULL,
  sisa_bagi    INTEGER NOT NULL,
  hasil_key    TEXT NOT NULL,
  hasil_nama   TEXT NOT NULL,
  hasil_arti   TEXT NOT NULL,
  metode       TEXT NOT NULL DEFAULT 'poerwadarminta',
  session_id   TEXT
);

-- Enable Realtime (untuk Unity subscription)
ALTER TABLE petangan_submissions REPLICA IDENTITY FULL;

-- Row Level Security
ALTER TABLE petangan_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON petangan_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON petangan_submissions FOR SELECT USING (true);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_petangan_created ON petangan_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petangan_nama ON petangan_submissions(nama_latin);
`;
  console.groupCollapsed('%c[Sasmita Aksara] Supabase Schema SQL', 'color: #d4a017; font-weight: bold;');
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
  subscribeRealtimePetangan,
  getRiwayatPetangan,
  getConnectionStatus,
  getSupabaseClient,
  isSupabaseConfigured,
  tampilkanSchema,
  SUPABASE_CONFIG,
};
