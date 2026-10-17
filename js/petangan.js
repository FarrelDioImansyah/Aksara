/**
 * petangan.js
 * ============================================================
 * Mesin Kalkulasi Petangan Jawa — Arkana Tarot Pancawara
 * Sisa bagi 5:
 *   1. Sri      -> I. SANG SRI (The Empress of Abundance)
 *   2. Lungguh  -> II. SANG LUNGGUH (The Sovereign Hierarch)
 *   3. Gedhong  -> III. SANG GEDHONG (The Grand Architect)
 *   4. Lara     -> IV. SANG LARA (The Phoenix Warrior)
 *   0. Pati     -> V. SANG PATI (The Mystic Alchemist)
 *
 * Referensi:
 *   - Soemodidjojo (1980). Kitab Primbon Betaljemur Adammakna.
 * ============================================================
 */

'use strict';

// ============================================================
// 1. DEFINISI KARTU TAROT JAWA (Pancawara)
// ============================================================
const HASIL_SOEMODIDJOJO = {
  1: {
    idKartu: 1,
    key: 'sri',
    nomorTarot: 'I',
    gelarTarot: 'THE EMPRESS OF ABUNDANCE',
    aksaraJawa: 'ꦱꦿꦶ',
    nama: 'Sang Sri',
    bgCard: 'assets/SangSriBG.png',
    singkat: 'Arkana Kemakmuran, Berkah Alam & Cahaya Emas',
    deskripsi: 'Sang Sri adalah pancaran Dewi Kesuburan dan Kemakmuran. Kamu dianugerahi tarikan energi emas yang membuka pintu-pintu kemudahan, rezeki berlimpah, dan keharmonisan hidup. Hadirmu menumbuhkan dan menyuburkan apa pun yang kamu sentuh.',
    pituah: 'Jadikan kelimpahanmu sebagai sumber pengayom bagi mereka yang membutuhkan.',
    simbol: '👑',
    warna: 'sri',
    sisa: 1,
    keywords: ['Kemakmuran', 'Cahaya Emas', 'Kelimpahan', 'Berkah Alam'],
  },
  2: {
    idKartu: 2,
    key: 'lungguh',
    nomorTarot: 'II',
    gelarTarot: 'THE SOVEREIGN HIERARCH',
    aksaraJawa: 'ꦭꦸꦁꦒꦸꦃ',
    nama: 'Sang Lungguh',
    bgCard: 'assets/SangLungguh.png',
    singkat: 'Arkana Takhta, Martabat & Wibawa Luhur',
    deskripsi: 'Lungguh merepresentasikan kedudukan takhta tertinggi. Kamu dilahirkan membawa aura wibawa alami, integritas yang disegani, serta kepercayaan mendalam dari sekelilingmu. Langkahmu ditakdirkan untuk memimpin dan membimbing dengan kehormatan.',
    pituah: 'Ketinggian derajat adalah amanah; pimpinlah dengan welas asih dan kebijaksanaan.',
    simbol: '🏛️',
    warna: 'lungguh',
    sisa: 2,
    keywords: ['Kehormatan', 'Wibawa Luhur', 'Takhta', 'Integritas'],
  },
  3: {
    idKartu: 3,
    key: 'gedhong',
    nomorTarot: 'III',
    gelarTarot: 'THE GRAND ARCHITECT',
    aksaraJawa: 'ꦒꦼꦝꦺꦴꦁ',
    nama: 'Sang Gedhong',
    bgCard: 'assets/SangGedhong.png',
    singkat: 'Arkana Kejayaan, Karya Agung & Fondasi Abadi',
    deskripsi: 'Gedhong melambangkan sang arsitek peradaban agung. Kamu memiliki ketajaman visi untuk membangun sesuatu yang monumental dari ketiadaan hingga menjadi mahakarya abadi. Energi ciptaan dan daya stabilitasmu menjadi pilar bagi banyak orang.',
    pituah: 'Bangunlah fondasi yang berakar pada ketulusan agar mahakaryamu kekal melintasi zaman.',
    simbol: '🏯',
    warna: 'gedhong',
    sisa: 3,
    keywords: ['Pembangun', 'Visioner', 'Mahakarya', 'Fondasi Abadi'],
  },
  4: {
    idKartu: 4,
    key: 'lara',
    nomorTarot: 'IV',
    gelarTarot: 'THE PHOENIX WARRIOR',
    aksaraJawa: 'ꦭꦫ',
    nama: 'Sang Lara',
    bgCard: 'assets/SangSriBG.png', /* Fallback jika file kartu belum ada */
    singkat: 'Arkana Api Kawah Candradimuka & Pejuang Sejati',
    deskripsi: 'Lara adalah sang burung Phoenix yang ditempa api penempaan jiwa. Ketangguhan batinmu luar biasa; setiap badai dan rintangan tidak pernah memadamkanmu, melainkan justru mengasahmu menjadi berlian tak ternilai yang bangkit berkali-kali lebih kuat dan bercahaya.',
    pituah: 'Ujian adalah pupuk keagungan jiwamu; teruslah melangkah tanpa gentar.',
    simbol: '🔥',
    warna: 'lara',
    sisa: 4,
    keywords: ['Penempaan Jiwa', 'Pejuang Sejati', 'Daya Tahan', 'Kebangkitan'],
  },
  0: {
    idKartu: 5,
    key: 'pati',
    nomorTarot: 'V',
    gelarTarot: 'THE MYSTIC ALCHEMIST',
    aksaraJawa: 'ꦥꦠꦶ',
    nama: 'Sang Pati',
    bgCard: 'assets/SangSriBG.png', /* Fallback jika file kartu belum ada */
    singkat: 'Arkana Pintu Transformasi & Kebijaksanaan Spiritual',
    deskripsi: 'Pati dalam filosofi esoteris adalah gerbang transendensi dan kelahiran kembali. Kamu dianugerahi mata batin yang tajam, kedalaman spiritual, dan intuisi langka yang mampu menyingkap tabir rahasia kehidupan serta mengubah kegelapan menjadi pencerahan murni.',
    pituah: 'Lepaskan apa yang telah usang untuk menyambut takdir baru yang lebih bercahaya.',
    simbol: '🌙',
    warna: 'pati',
    sisa: 0,
    keywords: ['Transformasi', 'Mata Batin', 'Spiritualitas', 'Transendensi'],
  },
};

// ============================================================
// 2. FUNGSI KALKULASI UTAMA (Dibagi 5 — Pancawara)
// ============================================================

/**
 * Hitung Petangan Jawa menggunakan metode Soemodidjojo (Pancawara)
 * @param {number} totalNeptu - Total nilai neptu nama
 * @returns {{ sisa: number, hasil: Object, formula: string }}
 */
function hitungSoemodidjojo(totalNeptu) {
  const pembagi = 5;
  const sisa = totalNeptu % pembagi;
  const hasil = HASIL_SOEMODIDJOJO[sisa];

  const formula = `${totalNeptu} ÷ ${pembagi} = ${Math.floor(totalNeptu / pembagi)} sisa ${sisa} → Kartu ${hasil.nomorTarot} (${hasil.nama})`;

  return {
    metode: 'Soemodidjojo',
    pembagi,
    totalNeptu,
    kali: Math.floor(totalNeptu / pembagi),
    sisa,
    hasil,
    formula,
    metodeBadge: `Arkana Tarot Jawa · Kartu ${hasil.nomorTarot}`,
  };
}

/**
 * Proses kalkulasi Petangan
 * @param {number} totalNeptu
 * @returns {Object}
 */
function hitungPetangan(totalNeptu) {
  if (typeof totalNeptu !== 'number' || totalNeptu < 0) {
    throw new Error('Total neptu harus berupa angka positif.');
  }

  return hitungSoemodidjojo(totalNeptu);
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
    hitungSoemodidjojo,
    validasiNama,
    HASIL_SOEMODIDJOJO,
  };
}

if (typeof window !== 'undefined') {
  window.PetanganEngine = {
    hitungPetangan,
    hitungSoemodidjojo,
    validasiNama,
    HASIL_SOEMODIDJOJO,
  };
}
