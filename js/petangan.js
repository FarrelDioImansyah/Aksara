'use strict';

const DATA_KARTU = {
  1: {
    idKartu: 1,
    nama: 'Jarak Giri',
    bgCard: 'assets/JARAK_GIRI.jpg' // Pastikan nama file gambarmu benar
  },
  2: {
    idKartu: 2,
    nama: 'Jarak Lengkara',
    bgCard: 'assets/JARAK_LENGKARA.jpg'
  },
  3: {
    idKartu: 3,
    nama: 'Jarak Srigati',
    bgCard: 'assets/JARAK_SRIGATI.jpg'
  }
};

/**
 * Mengambil 1 kartu secara acak dari 3 kartu yang tersedia
 */
function getRandomCard() {
  const keys = Object.keys(DATA_KARTU);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return DATA_KARTU[randomKey];
}

/**
 * Validasi input nama
 */
function validasiNama(nama) {
  const trimmed = nama.trim();
  if (!trimmed) return { valid: false, error: 'Nama tidak boleh kosong' };

  //if (trimmed.length < 2) return { valid: false, error: 'Nama minimal 2 karakter.' };
  if (trimmed.length > 15) return { valid: false, error: 'Nama maksimal 15 karakter.' };
  return { valid: true };
}

if (typeof window !== 'undefined') {
  window.PetanganEngine = { getRandomCard, validasiNama, DATA_KARTU };
}