# Sasmita Aksara — Web & Projection System

> Aplikasi web interaktif untuk instalasi *projection mapping* berbasis kearifan lokal **Aksara Jawa (Hanacaraka)** dan **Petangan Jawa**

---

## 🗺️ Arsitektur Sistem

```
[Pengunjung QR Code]
      ↓
[Website Sasmita Aksara]
  ├─ Input Nama Latin
  ├─ Hanacaraka Engine  → Transliterasi → Aksara Jawa Unicode
  ├─ Petangan Engine    → Kalkulasi Neptu → Hasil Sasmita
  └─ Supabase Client   → Simpan ke DB
                              ↓
                     [Supabase Realtime]
                              ↓
                    [Unity Projection App]
                              ↓
                    [Projection Mapping Wall]
```

---

## 📁 Struktur File

```
Website_Aksara/
├── index.html              # Halaman utama
├── style.css               # Design system & animasi
├── assets/
│   └── hero-bg.jpg         # Background hero (wayang + hanacaraka)
├── js/
│   ├── hanacaraka.js       # Mesin transliterasi Aksara Jawa
│   ├── petangan.js         # Mesin kalkulasi Petangan Jawa
│   ├── supabase-client.js  # Integrasi Supabase + Realtime
│   ├── particles.js        # Sistem partikel aksara mengambang
│   └── app.js              # Controller utama aplikasi
├── README.md               # Dokumentasi ini
└── UNITY_INTEGRATION.md    # Panduan integrasi Unity
```

---

## 🚀 Cara Menjalankan (Lokal)

### Option 1: VS Code Live Server
1. Install ekstensi **Live Server** di VS Code
2. Klik kanan `index.html` → **Open with Live Server**

### Option 2: Python HTTP Server
```bash
python -m http.server 8080
# Akses: http://localhost:8080
```

### Option 3: Node.js `serve`
```bash
npx serve .
```

---

## 🔧 Konfigurasi Supabase

### 1. Buat Proyek Supabase
1. Daftar di [supabase.com](https://supabase.com)
2. Buat proyek baru
3. Catat **Project URL** dan **anon/public key** dari `Settings > API`

### 2. Buat Tabel Database
Buka `SQL Editor` di dashboard Supabase dan jalankan:

```sql
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

-- Enable Realtime untuk Unity
ALTER TABLE petangan_submissions REPLICA IDENTITY FULL;

-- Row Level Security (akses publik)
ALTER TABLE petangan_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON petangan_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON petangan_submissions FOR SELECT USING (true);
```

### 3. Isi Konfigurasi di `js/supabase-client.js`
```javascript
const SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT.supabase.co',  // ← Ganti ini
  anonKey: 'YOUR_ANON_KEY',                  // ← Ganti ini
};
```

> **Catatan:** Tanpa konfigurasi Supabase, aplikasi tetap berjalan dalam **Mode Demo** — semua fitur kalkulasi berfungsi, namun data tidak disimpan ke database.

---

## 🧮 Modul Hanacaraka Engine

### Cara Kerja Transliterasi

```
Input: "Farrel Dio"
  ↓
Normalisasi: "farrel dio"
  ↓
Tokenisasi fonem: f-a | r-r | e | l | (spasi) | d-i | o
  ↓
Pemetaan aksara: ꦥ + ꦫ + ꦼ + ꦭ + ꦢꦶ + ꦴ
  ↓
Output Unicode Aksara Jawa
```

### Pemetaan Fonem Khusus

| Latin | Aksara | Keterangan |
|-------|--------|------------|
| `f`   | ꦥ (Pa) | Fonem tidak ada di Jawa |
| `v`   | ꦮ (Wa) | Fonem tidak ada di Jawa |
| `z`   | ꦗ (Ja) | Fonem tidak ada di Jawa |
| `x`   | ꦏ (Ka) | Fonem tidak ada di Jawa |

---

## ⚖️ Mesin Petangan Jawa

### Metode Poerwadarminta (Dibagi 3)

| Sisa | Nama | Makna |
|------|------|-------|
| 1    | Jarak Lanang | Kemenangan, kedigdayaan, damai |
| 2    | Jarak Manten | Kesuburan, keharmonisan, jodoh |
| 0    | Jarak Rampas | Boros, perlu disiplin, dinamis |

### Metode Soemodidjojo (Dibagi 5 — Pancawara)

| Sisa | Nama | Makna |
|------|------|-------|
| 1    | Sri | Kaya, beruntung, makmur |
| 2    | Lungguh | Kedudukan tinggi, dihormati |
| 3    | Gedhong | Makmur, pemimpin besar |
| 4    | Lara | Ujian, kesulitan → ketangguhan |
| 0    | Pati | Transformasi spiritual |

---

## 🎮 Integrasi Unity

Lihat panduan lengkap di [`UNITY_INTEGRATION.md`](./UNITY_INTEGRATION.md)

### Ringkasan:
- Unity berlangganan ke Supabase Realtime via WebSocket
- Saat data baru masuk ke tabel `petangan_submissions`, Unity langsung menerima payload
- Unity merender animasi projection mapping berdasarkan `hasil_key` (lanang/manten/rampas/sri/lungguh/gedhong/lara/pati)

---

## 🌐 Deploy ke Web (Opsional)

### Vercel / Netlify (Gratis)
1. Upload folder `Website_Aksara` ke GitHub
2. Connect ke Vercel/Netlify
3. Deploy otomatis (static site, tidak perlu build)

### Akses via QR Code
1. Setelah deploy, generate QR Code dari URL produksi
2. Tempel QR Code di lokasi instalasi pameran
3. Pengunjung scan → langsung buka website

---

## 🔗 Referensi

- **Poerwadarminta, W.J.S.** (1939). *Baoesastra Djawa*. Groningen: J.B. Wolters.
- **Soemodidjojo** (1980). *Kitab Primbon Betaljemur Adammakna*. Yogyakarta.
- Unicode Javanese Block: U+A980–U+A9DF
- Supabase Realtime Docs: https://supabase.com/docs/guides/realtime

---

*Sasmita Aksara Web & Projection System — 2026*

## input nama untuk testing
Ran command: `node -e "
const h = require('./js/hanacaraka.js');
const p = require('./js/petangan.js');

const candidates = [
  // Cek untuk Sisa 1 (Sri)
  'budi', 'adi', 'wawan', 'dian', 'dewi', 'ratna', 'siti', 'maya',
  // Cek untuk Sisa 2 (Lungguh)
  'farrel dio', 'dono', 'kasino', 'indro', 'bambang', 'rizki',
  // Cek untuk Sisa 3 (Gedhong)
  'joko', 'bayu', 'agus', 'surya', 'bagus', 'teguh', 'eko',
  // Cek untuk Sisa 4 (Lara)
  'iswahyudi', 'ari', 'wahyu', 'rudi', 'hendra', 'anton',
  // Cek untuk Sisa 0 (Pati)
  'yanto', 'tono', 'supri', 'tri', 'putra', 'dimas'
];

candidates.forEach(name => {
  const t = h.transliterasiHanacaraka(name);
  const res = p.hitungPetangan(t.totalNeptu);
  console.log(name.padEnd(15), '-> Neptu:', String(t.totalNeptu).padEnd(4), 'Sisa:', res.sisa, res.hasil.nama);
});
"`
Ran command: `node -e "
const h = require('./js/hanacaraka.js');
const p = require('./js/petangan.js');

const names = ['Agus', 'Farrel Dio', 'Joko', 'Iswahyudi', 'Dimas'];

names.forEach(name => {
  const t = h.transliterasiHanacaraka(name);
  const res = p.hitungPetangan(t.totalNeptu);
  console.log(JSON.stringify({
    nama: name,
    neptu: t.totalNeptu,
    kartu: res.hasil.nomorTarot,
    gelar: res.hasil.nama,
    sisa: res.sisa,
    formula: res.formula
  }, null, 2));
});
"`

Berikut adalah **5 nama** yang masing-masing tepat menghasilkan **1 kartu berbeda** dari siklus 5 Arkana Tarot Jawa:

---

### 1. Kartu I: **Sang Sri** (👑 *The Empress of Abundance*)
* **Nama**: **`Agus`**
* **Neptu**: `26`
* **Perhitungan**: $26 \div 5 = 5 \quad\text{sisa}\quad \mathbf{1}$
* **Rincian Fonem**:
  * `a` (Ha) = 1
  * `gu` (Ga) = 17
  * `s` (Sa) = 8
  * $\text{Total} = 1 + 17 + 8 = 26$

---

### 2. Kartu II: **Sang Lungguh** (🏛️ *The Sovereign Hierarch*)
* **Nama**: **`Farrel Dio`**
* **Neptu**: `37`
* **Perhitungan**: $37 \div 5 = 7 \quad\text{sisa}\quad \mathbf{2}$
* **Rincian Fonem**:
  * `fa` (Pa) = 12
  * `r` (Ra) = 4
  * `re` (Ra) = 4
  * `l` (La) = 10
  * `di` (Da) = 6
  * `o` (Ha) = 1
  * $\text{Total} = 12 + 4 + 4 + 10 + 6 + 1 = 37$

---

### 3. Kartu III: **Sang Gedhong** (🏯 *The Grand Architect*)
* **Nama**: **`Joko`**
* **Neptu**: `18`
* **Perhitungan**: $18 \div 5 = 3 \quad\text{sisa}\quad \mathbf{3}$
* **Rincian Fonem**:
  * `jo` (Ja) = 13
  * `ko` (Ka) = 5
  * $\text{Total} = 13 + 5 = 18$

---

### 4. Kartu IV: **Sang Lara** (🔥 *The Phoenix Warrior*)
* **Nama**: **`Iswahyudi`**
* **Neptu**: `39`
* **Perhitungan**: $39 \div 5 = 7 \quad\text{sisa}\quad \mathbf{4}$
* **Rincian Fonem**:
  * `i` (Ha) = 1
  * `s` (Sa) = 8
  * `wa` (Wa) = 9
  * `h` (Ha) = 1
  * `yu` (Ya) = 14
  * `di` (Da) = 6
  * $\text{Total} = 1 + 8 + 9 + 1 + 14 + 6 = 39$

---

### 5. Kartu V: **Sang Pati** (🌙 *The Mystic Alchemist*)
* **Nama**: **`Dimas`**
* **Neptu**: `30`
* **Perhitungan**: $30 \div 5 = 6 \quad\text{sisa}\quad \mathbf{0}$
* **Rincian Fonem**:
  * `di` (Da) = 6
  * `ma` (Ma) = 16
  * `s` (Sa) = 8
  * $\text{Total} = 6 + 16 + 8 = 30$

---

### Ringkasan untuk Testing di Web:

| No | Input Nama | Total Neptu | Sisa Bagi 5 | Kartu Tarot yang Keluar |
| :---: | :--- | :---: | :---: | :--- |
| 1 | **Agus** | 26 | **1** | **Kartu I · Sang Sri** (Emas) |
| 2 | **Farrel Dio** | 37 | **2** | **Kartu II · Sang Lungguh** (Biru) |
| 3 | **Joko** | 18 | **3** | **Kartu III · Sang Gedhong** (Ungu) |
| 4 | **Iswahyudi** | 39 | **4** | **Kartu IV · Sang Lara** (Oranye Api) |
| 5 | **Dimas** | 30 | **0** | **Kartu V · Sang Pati** (Perak Mistik) | 
