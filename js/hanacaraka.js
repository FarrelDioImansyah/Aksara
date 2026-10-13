/**
 * hanacaraka.js — v2 (Fixed)
 * ============================================================
 * Mesin Transliterasi Aksara Jawa (Hanacaraka)
 * Mengkonversi teks Latin ke Unicode Aksara Jawa
 *
 * BUG FIX: FONEM_MAP kini menggunakan properti `pat` (pattern)
 * yang terpisah dari `latin` (nama aksara). Sebelumnya,
 * object spread { latin: 'ng', ...AKSARA_NEPTU.find(...) }
 * menyebabkan latin 'nga' dari spread menimpa 'ng',
 * sehingga tokenizer selalu gagal mencocokkan konsonan.
 * ============================================================
 */

'use strict';

// ============================================================
// 1. TABEL NEPTU AKSARA JAWA — 20 Carakan Pokok
//    Ha Na Ca Ra Ka | Da Ta Sa Wa La |
//    Dha Pa Ja Ya Nya | Ma Ga Ba Tha Nga
// ============================================================
const AKSARA_NEPTU = [
  { no:  1, latin: 'ha',  unicode: 'ꦲ', neptu:  1 },
  { no:  2, latin: 'na',  unicode: 'ꦤ', neptu:  2 },
  { no:  3, latin: 'ca',  unicode: 'ꦕ', neptu:  3 },
  { no:  4, latin: 'ra',  unicode: 'ꦫ', neptu:  4 },
  { no:  5, latin: 'ka',  unicode: 'ꦏ', neptu:  5 },
  { no:  6, latin: 'da',  unicode: 'ꦢ', neptu:  6 },
  { no:  7, latin: 'ta',  unicode: 'ꦠ', neptu:  7 },
  { no:  8, latin: 'sa',  unicode: 'ꦱ', neptu:  8 },
  { no:  9, latin: 'wa',  unicode: 'ꦮ', neptu:  9 },
  { no: 10, latin: 'la',  unicode: 'ꦭ', neptu: 10 },
  { no: 11, latin: 'dha', unicode: 'ꦝ', neptu: 11 },
  { no: 12, latin: 'pa',  unicode: 'ꦥ', neptu: 12 },
  { no: 13, latin: 'ja',  unicode: 'ꦗ', neptu: 13 },
  { no: 14, latin: 'ya',  unicode: 'ꦪ', neptu: 14 },
  { no: 15, latin: 'nya', unicode: 'ꦚ', neptu: 15 },
  { no: 16, latin: 'ma',  unicode: 'ꦩ', neptu: 16 },
  { no: 17, latin: 'ga',  unicode: 'ꦒ', neptu: 17 },
  { no: 18, latin: 'ba',  unicode: 'ꦧ', neptu: 18 },
  { no: 19, latin: 'tha', unicode: 'ꦛ', neptu: 19 },
  { no: 20, latin: 'nga', unicode: 'ꦔ', neptu: 20 },
];

// ============================================================
// 2. SANDHANGAN (Diakritik vokal)
// ============================================================
const SANDHANGAN = {
  wulu:    'ꦶ',   // i
  suku:    'ꦸ',   // u
  taling:  'ꦺ',   // e/é
  talingO: 'ꦺꦴ',  // o
  pepet:   'ꦼ',   // ê/e schwa
  layar:   'ꦂ',   // r (final)
  cecak:   'ꦁ',   // ng (nasal final)
  wignyan: 'ꦃ',   // h (aspirasi final)
  pangkon: '꧀',   // mematikan vokal inherent
};

// ============================================================
// 3. FONEM MAP — FIXED
//    Setiap entri punya `pat` (pola yang dicari di teks Latin)
//    dan data aksara terpisah.
//    Urutan: digraph/trigraph dulu (greedy), baru single.
// ============================================================
const FONEM_MAP = [
  // — Digraph (2 huruf Latin) — harus dicek lebih dulu!
  { pat: 'ng',  unicode: 'ꦔ', neptu: 20, latin: 'nga' },
  { pat: 'ny',  unicode: 'ꦚ', neptu: 15, latin: 'nya' },
  { pat: 'dh',  unicode: 'ꦝ', neptu: 11, latin: 'dha' },
  { pat: 'th',  unicode: 'ꦛ', neptu: 19, latin: 'tha' },

  // — Single konsonan —
  { pat: 'h',   unicode: 'ꦲ', neptu:  1, latin: 'ha'  },
  { pat: 'n',   unicode: 'ꦤ', neptu:  2, latin: 'na'  },
  { pat: 'c',   unicode: 'ꦕ', neptu:  3, latin: 'ca'  },
  { pat: 'r',   unicode: 'ꦫ', neptu:  4, latin: 'ra'  },
  { pat: 'k',   unicode: 'ꦏ', neptu:  5, latin: 'ka'  },
  { pat: 'd',   unicode: 'ꦢ', neptu:  6, latin: 'da'  },
  { pat: 't',   unicode: 'ꦠ', neptu:  7, latin: 'ta'  },
  { pat: 's',   unicode: 'ꦱ', neptu:  8, latin: 'sa'  },
  { pat: 'w',   unicode: 'ꦮ', neptu:  9, latin: 'wa'  },
  { pat: 'l',   unicode: 'ꦭ', neptu: 10, latin: 'la'  },
  { pat: 'p',   unicode: 'ꦥ', neptu: 12, latin: 'pa'  },
  { pat: 'j',   unicode: 'ꦗ', neptu: 13, latin: 'ja'  },
  { pat: 'y',   unicode: 'ꦪ', neptu: 14, latin: 'ya'  },
  { pat: 'm',   unicode: 'ꦩ', neptu: 16, latin: 'ma'  },
  { pat: 'g',   unicode: 'ꦒ', neptu: 17, latin: 'ga'  },
  { pat: 'b',   unicode: 'ꦧ', neptu: 18, latin: 'ba'  },

  // — Fonem asing → padanan terdekat Jawa —
  { pat: 'f',   unicode: 'ꦥ', neptu: 12, latin: 'pa'  }, // f → Pa
  { pat: 'v',   unicode: 'ꦮ', neptu:  9, latin: 'wa'  }, // v → Wa
  { pat: 'z',   unicode: 'ꦗ', neptu: 13, latin: 'ja'  }, // z → Ja
  { pat: 'x',   unicode: 'ꦏ', neptu:  5, latin: 'ka'  }, // x → Ka
  { pat: 'q',   unicode: 'ꦏ', neptu:  5, latin: 'ka'  }, // q → Ka
];

// Sandhangan per vokal
const VOKAL_SANDHANGAN = {
  'a': '',                    // vokal inherent, tanpa sandhangan
  'i': SANDHANGAN.wulu,       // ꦶ
  'u': SANDHANGAN.suku,       // ꦸ
  'e': SANDHANGAN.pepet,      // ꦼ  (e schwa)
  'é': SANDHANGAN.taling,     // ꦺ
  'o': SANDHANGAN.talingO,    // ꦺꦴ
  'ê': SANDHANGAN.pepet,      // ꦼ
};

const VOKAL_SET = new Set(Object.keys(VOKAL_SANDHANGAN));

// ============================================================
// 4. NORMALISASI
// ============================================================
function normalisasiNama(nama) {
  return nama
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[àáäãâ]/g, 'a')
    .replace(/[èëêé]/g, 'e')
    .replace(/[ìíïî]/g, 'i')
    .replace(/[òóöôõ]/g, 'o')
    .replace(/[ùúüû]/g, 'u')
    .replace(/[^a-zéêàáäãèëìíïòóöùúü\s\-]/gi, '');
}

// ============================================================
// 5. TOKENISASI SATU KATA — FIXED
//    Menggunakan `fonem.pat` bukan `fonem.latin` untuk matching
// ============================================================
function tokenisasiKata(kata) {
  const tokens = [];
  let i = 0;

  while (i < kata.length) {
    const remaining = kata.slice(i);

    // — Cari pola konsonan terpanjang yang cocok (greedy) —
    let matched = null;

    for (const fonem of FONEM_MAP) {
      if (remaining.startsWith(fonem.pat)) {   // ← FIX: gunakan fonem.pat
        matched = fonem;
        break;
      }
    }

    if (matched) {
      // Maju sejauh panjang pola (bukan latin aksara!)
      i += matched.pat.length;                  // ← FIX: pakai matched.pat.length
      const afterCons = kata.slice(i);

      // Cari vokal berikutnya
      let vokal    = '';
      let sandhangan = '';

      if (afterCons.length > 0 && VOKAL_SET.has(afterCons[0])) {
        vokal      = afterCons[0];
        sandhangan = VOKAL_SANDHANGAN[vokal];
        i += 1;
      }

      if (vokal !== '') {
        // Suku kata lengkap: konsonan + vokal
        tokens.push({
          type:           'syllable',
          latin:          matched.pat + vokal,
          consonantLatin: matched.pat,
          vowel:          vokal,
          unicode:        matched.unicode + sandhangan,
          neptu:          matched.neptu,
          aksaraData:     matched,
        });
      } else {
        // Konsonan tanpa vokal
        const nextIsConsonant = afterCons.length > 0 && !VOKAL_SET.has(afterCons[0]);
        tokens.push({
          type:           nextIsConsonant ? 'cluster-consonant' : 'final-consonant',
          latin:          matched.pat,
          consonantLatin: matched.pat,
          vowel:          '',
          unicode:        matched.unicode + (nextIsConsonant ? SANDHANGAN.pangkon : SANDHANGAN.wignyan),
          neptu:          matched.neptu,
          aksaraData:     matched,
        });
      }

    } else if (VOKAL_SET.has(remaining[0])) {
      // Vokal mandiri di awal posisi → carrier Ha (ꦲ)
      const ha       = FONEM_MAP.find(f => f.pat === 'h'); // Ha, neptu 1
      const v        = remaining[0];
      const sandh    = VOKAL_SANDHANGAN[v];
      tokens.push({
        type:           'vowel-initial',
        latin:          v,
        consonantLatin: 'ha',
        vowel:          v,
        unicode:        ha.unicode + sandh,
        neptu:          ha.neptu,
        aksaraData:     ha,
      });
      i += 1;

    } else {
      // Karakter tidak dikenal — lewati
      i += 1;
    }
  }

  return tokens;
}

// ============================================================
// 6. ENTRY POINT UTAMA
// ============================================================
function transliterasiHanacaraka(namaAsli) {
  const namaClean = normalisasiNama(namaAsli);
  const kataKata  = namaClean.split(' ').filter(k => k.length > 0);

  const allTokens  = [];
  const aksaraParts = [];

  kataKata.forEach((kata, idx) => {
    const tokens = tokenisasiKata(kata);
    tokens.forEach(t => {
      allTokens.push(t);
      aksaraParts.push(t.unicode);
    });
    // Spasi antar kata
    if (idx < kataKata.length - 1) {
      aksaraParts.push(' ');
    }
  });

  const totalNeptu  = allTokens.reduce((sum, t) => sum + (t.neptu || 0), 0);
  const aksaraString = aksaraParts.join('');

  return {
    tokens:      allTokens,
    aksaraString,
    aksaraJawa:  aksaraString,
    totalNeptu,
    namaClean:   kataKata.join(' '),
    aksaraData:  AKSARA_NEPTU,
  };
}

// ============================================================
// 7. HELPERS
// ============================================================
function getAksaraTable() { return AKSARA_NEPTU; }
function findAksaraByLatin(latin) {
  return AKSARA_NEPTU.find(a => a.latin === latin.toLowerCase()) || null;
}

// ============================================================
// 8. EXPOSE
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { transliterasiHanacaraka, getAksaraTable, findAksaraByLatin, AKSARA_NEPTU, SANDHANGAN };
}

if (typeof window !== 'undefined') {
  window.HanacarakaEngine = {
    transliterasiHanacaraka,
    getAksaraTable,
    findAksaraByLatin,
    AKSARA_NEPTU,
    SANDHANGAN,
  };
}
