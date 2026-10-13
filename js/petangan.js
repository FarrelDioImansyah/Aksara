/**
 * petangan.js
 * ============================================================
 * Mesin Kalkulasi Petangan Jawa
 * Implementasi dua metode:
 *   1. Poerwadarminta  — Sisa bagi 3 (Jarak: Lanang / Manten / Rampas)
 *   2. Soemodidjojo    — Sisa bagi 5 (Pancawara: Sri / Lungguh / Gedhong / Lara / Pati)
 *
 * Referensi:
 *   - Poerwadarminta, W.J.S. (1939). Baoesastra Djawa.
 *   - Soemodidjojo (1980). Kitab Primbon Betaljemur Adammakna.
 * ============================================================
 */

'use strict';

// ============================================================
// 1. DEFINISI HASIL METODE POERWADARMINTA (Dibagi 3)
// ============================================================
const HASIL_POERWADARMINTA = {
  1: {
    key: 'lanang',
    nama: 'Jarak Lanang',
    singkat: 'Jiwa Pemenang & Pemimpin Sejati',
    deskripsi: 'Kamu lahir membawa energi kemenangan yang tak tergoyahkan! Jiwa Jarak Lanang memancarkan wibawa alami, ketenangan batin yang dalam, dan kemampuan memimpin yang menginspirasi semua orang di sekitarmu. Setiap langkahmu membuka jalan baru — kamu adalah cahaya yang menerangi kegelapan dan membawa harapan bagi orang lain.',
    simbol: '⚔️',
    warna: 'lanang',
    sisa: 1,
    keywords: ['kemenangan', 'kepemimpinan', 'wibawa', 'ketenangan batin', 'menginspirasi'],
  },
  2: {
    key: 'manten',
    nama: 'Jarak Manten',
    singkat: 'Jiwa Harmonis & Penuh Cinta',
    deskripsi: 'Namamu memancarkan energi cinta dan keharmonisan yang luar biasa! Jiwa Jarak Manten dikaruniai kemampuan istimewa untuk menyatukan hati, memperindah hubungan, dan membawa kedamaian ke mana pun melangkah. Keberuntungan dalam kasih sayang dan rezeki selalu mengalir deras untukmu.',
    simbol: '🌸',
    warna: 'manten',
    sisa: 2,
    keywords: ['cinta', 'harmonis', 'keberuntungan', 'kedamaian', 'rezeki berlimpah'],
  },
  0: {
    key: 'rampas',
    nama: 'Jarak Rampas',
    singkat: 'Jiwa Bebas & Penuh Semangat',
    deskripsi: 'Kamu dikaruniai energi hidup yang luar biasa dan semangat membara yang tak pernah padam! Jiwa Jarak Rampas adalah jiwa petualang sejati — kreatif, spontan, dan mampu beradaptasi di situasi apapun. Kamu adalah magnet kegembiraan; di mana kamu hadir, suasana langsung hidup dan bersemangat!',
    simbol: '🌊',
    warna: 'rampas',
    sisa: 0,
    keywords: ['bebas', 'semangat membara', 'kreatif', 'petualang', 'penuh pesona'],
  },
};

// ============================================================
// 2. DEFINISI HASIL METODE SOEMODIDJOJO (Dibagi 5 — Pancawara)
// ============================================================
const HASIL_SOEMODIDJOJO = {
  1: {
    key: 'sri',
    nama: 'Sri',
    singkat: 'Jiwa Kemakmuran & Cahaya Rezeki',
    deskripsi: 'Sri adalah dewi kemakmuran yang bersemayam dalam namamu! Kamu dianugerahi magnet rezeki yang kuat — kemudahan, kelimpahan, dan keberuntungan senantiasa hadir dalam setiap perjalanan hidupmu. Namamu memancarkan energi emas yang menarik segala kebaikan dan keberkahan.',
    simbol: '👑',
    warna: 'sri',
    sisa: 1,
    keywords: ['kemakmuran', 'rezeki berlimpah', 'beruntung', 'cahaya emas', 'kelimpahan'],
  },
  2: {
    key: 'lungguh',
    nama: 'Lungguh',
    singkat: 'Jiwa Terhormat & Penuh Wibawa',
    deskripsi: 'Lungguh berarti "duduk di atas" — dan kamu memang ditakdirkan untuk bersinar di tempat tertinggi! Jiwa Lungguh membawa aura kehormatan alami, rasa dihargai, dan kepercayaan dari orang-orang di sekitarmu. Karir dan martabatmu terus meningkat bak bintang yang kian terang.',
    simbol: '🏛️',
    warna: 'lungguh',
    sisa: 2,
    keywords: ['kehormatan', 'wibawa', 'dipercaya', 'bersinar', 'penuh prestasi'],
  },
  3: {
    key: 'gedhong',
    nama: 'Gedhong',
    singkat: 'Jiwa Pembangun & Pemimpin Agung',
    deskripsi: 'Gedhong — gedung megah yang kokoh — adalah simbol jiwamu! Kamu memiliki kekuatan luar biasa untuk membangun dari nol hingga menjadi monumental, menginspirasi banyak orang, dan meninggalkan warisan yang abadi. Kamu adalah arsitek kehidupan yang visioner dan penuh kejayaan.',
    simbol: '🏯',
    warna: 'gedhong',
    sisa: 3,
    keywords: ['pembangun', 'visioner', 'pemimpin agung', 'warisan abadi', 'monumental'],
  },
  4: {
    key: 'lara',
    nama: 'Lara',
    singkat: 'Jiwa Tangguh & Pejuang Sejati',
    deskripsi: 'Lara adalah proses penempaan berlian sejati dalam dirimu! Jiwamu memiliki ketangguhan dan keberanian yang jarang dimiliki orang lain. Setiap tantangan yang kamu hadapi justru memperkuat cahayamu — dari setiap ujian lahir kebijaksanaan tak ternilai dan jiwa yang semakin bersinar.',
    simbol: '🔥',
    warna: 'lara',
    sisa: 4,
    keywords: ['tangguh', 'pejuang sejati', 'bijaksana', 'bangkit lebih kuat', 'berlian sejati'],
  },
  0: {
    key: 'pati',
    nama: 'Pati',
    singkat: 'Jiwa Spiritual & Penuh Kebijaksanaan',
    deskripsi: 'Pati adalah energi transformasi tertinggi — jiwa yang melampaui hal-hal biasa! Kamu memiliki kedalaman spiritual, kepekaan batin, dan kebijaksanaan yang membuatmu unik dan tak tergantikan. Kamu adalah jiwa langka yang mampu melihat keindahan tersembunyi di balik segala sesuatu.',
    simbol: '🌙',
    warna: 'pati',
    sisa: 0,
    keywords: ['spiritual', 'bijaksana', 'mendalam', 'unik & langka', 'penuh makna'],
  },
};

// ============================================================
// 3. FUNGSI KALKULASI UTAMA
// ============================================================

/**
 * Hitung Petangan Jawa menggunakan metode Poerwadarminta
 * @param {number} totalNeptu - Total nilai neptu nama
 * @returns {{ sisa: number, hasil: Object, formula: string }}
 */
function hitungPoerwadarminta(totalNeptu) {
  const pembagi = 3;
  const sisa = totalNeptu % pembagi;
  const kaliTerakhir = Math.floor(totalNeptu / pembagi) * pembagi;
  const hasil = HASIL_POERWADARMINTA[sisa];

  const formula = `${totalNeptu} ÷ ${pembagi} = ${Math.floor(totalNeptu / pembagi)} sisa ${sisa} → ${hasil.nama}`;

  return {
    metode: 'Poerwadarminta',
    pembagi,
    totalNeptu,
    kali: Math.floor(totalNeptu / pembagi),
    sisa,
    hasil,
    formula,
    metodeBadge: 'Metode Poerwadarminta · Dibagi 3',
  };
}

/**
 * Hitung Petangan Jawa menggunakan metode Soemodidjojo (Pancawara)
 * @param {number} totalNeptu - Total nilai neptu nama
 * @returns {{ sisa: number, hasil: Object, formula: string }}
 */
function hitungSoemodidjojo(totalNeptu) {
  const pembagi = 5;
  const sisa = totalNeptu % pembagi;
  const hasil = HASIL_SOEMODIDJOJO[sisa];

  const formula = `${totalNeptu} ÷ ${pembagi} = ${Math.floor(totalNeptu / pembagi)} sisa ${sisa} → ${hasil.nama}`;

  return {
    metode: 'Soemodidjojo',
    pembagi,
    totalNeptu,
    kali: Math.floor(totalNeptu / pembagi),
    sisa,
    hasil,
    formula,
    metodeBadge: 'Metode Soemodidjojo · Pancawara Dibagi 5',
  };
}

/**
 * Proses kalkulasi lengkap berdasarkan metode yang dipilih
 * @param {number} totalNeptu
 * @param {'poerwadarminta'|'soemodidjojo'} metode
 * @returns {Object}
 */
function hitungPetangan(totalNeptu, metode = 'poerwadarminta') {
  if (typeof totalNeptu !== 'number' || totalNeptu < 0) {
    throw new Error('Total neptu harus berupa angka positif.');
  }

  const kalkulasi = metode === 'soemodidjojo'
    ? hitungSoemodidjojo(totalNeptu)
    : hitungPoerwadarminta(totalNeptu);

  return kalkulasi;
}

/**
 * Validasi input nama
 * @param {string} nama
 * @returns {{ valid: boolean, error?: string }}
 */
function validasiNama(nama) {
  const trimmed = nama.trim();

  if (!trimmed) {
    return { valid: false, error: 'Nama tidak boleh kosong.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nama terlalu pendek. Masukkan minimal 2 karakter.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Nama terlalu panjang. Maksimal 100 karakter.' };
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Nama harus mengandung setidaknya satu huruf Latin.' };
  }

  return { valid: true };
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hitungPetangan,
    hitungPoerwadarminta,
    hitungSoemodidjojo,
    validasiNama,
    HASIL_POERWADARMINTA,
    HASIL_SOEMODIDJOJO,
  };
}

if (typeof window !== 'undefined') {
  window.PetanganEngine = {
    hitungPetangan,
    hitungPoerwadarminta,
    hitungSoemodidjojo,
    validasiNama,
    HASIL_POERWADARMINTA,
    HASIL_SOEMODIDJOJO,
  };
}
