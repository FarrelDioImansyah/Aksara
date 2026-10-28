/**
 * badwords.js
 * ============================================================
 * Sasmita Aksara — Comprehensive Bad Words & Profanity Filter
 * Filter kata kasar & singkatan bahasa Indonesia, Jawa, dan Inggris
 * Mendukung deteksi cerdas real-time, variasi leetspeak, dan perlindungan
 * nama asli agar tidak salah terhapus (misal Anjani, Basuki, Gilang).
 * ============================================================
 */

'use strict';

(function (window) {
  // Peta substitusi huruf (leetspeak, simbol, angka mirip)
  const CHAR_MAP = {
    a: '[a4@]',
    b: '[b8]',
    c: '[c(]',
    d: '[d]',
    e: '[e3]',
    g: '[g9]',
    h: '[h]',
    i: '[i1l!|]',
    j: '[j]',
    k: '[k]',
    l: '[l1i|]',
    m: '[m]',
    n: '[n]',
    o: '[o0]',
    p: '[p]',
    r: '[r]',
    s: '[s5$]',
    t: '[t7+]',
    u: '[u]',
    v: '[v]',
    w: '[w]',
    x: '[x]',
    y: '[y]',
    z: '[z2]'
  };

  /**
   * Membangun regex fleksibel yang mengenali leetspeak, spasi/titik antar huruf, dan pengulangan huruf
   */
  function buildRegex(word, isWordBoundary = true) {
    const parts = word.toLowerCase().split('').map(c => {
      return CHAR_MAP[c] ? CHAR_MAP[c] + '+' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '+';
    });
    // Boleh ada spasi, titik, strip, underscore antar huruf (contoh: a.n.j.i.n.g atau a n j i n g)
    const inner = parts.join('[\\s._-]*');
    return isWordBoundary
      ? new RegExp('\\b' + inner + '\\b', 'gi')
      : new RegExp(inner, 'gi');
  }

  // ============================================================
  // 1. DAFTAR KATA KASAR LENGKAP & DETAIL
  // ============================================================

  // Kategori A: Kata kasar jelas & singkatan murni (langsung dihapus seketika / 0ms)
  const UNAMBIGUOUS_WORDS = [
    // Dari kata-kasar.txt (115 kata)
    'anjing', 'babi', 'bacot', 'bajingan', 'bangke', 'bangor', 'bangsat', 'bego',
    'bejad', 'bencong', 'bodat', 'bugil', 'bundir', 'bunuh', 'cawek', 'colai',
    'colmek', 'cukimai', 'cukimay', 'dancuk', 'dildo', 'encuk', 'gigolo',
    'goblog', 'goblok', 'hencet', 'hentai', 'idiot', 'jablai', 'jablay', 'jancok', 'jancuk',
    'jangkik', 'jembut', 'jingan', 'kampang', 'keparat', 'kimak', 'kirik', 'klentit', 'klitoris',
    'konthol', 'kontol', 'koplok', 'kunyuk', 'kutang', 'kutis', 'kwontol', 'lonte', 'maho', 'masturbasi',
    'matane', 'memek', 'mesum', 'modar', 'modyar', 'mokad', 'najis', 'ndhasmu', 'nenen',
    'ngentot', 'ngolom', 'ngulum', 'nigga', 'nigger', 'onani', 'orgasme', 'pantat', 'pantek', 'pecun',
    'penis', 'pentil', 'pepek', 'perek', 'perkosa', 'porno', 'pukimak', 'qontol', 'selangkang',
    'sempak', 'senggama', 'setan', 'setubuh', 'silit', 'sinting', 'sodomi', 'telanjang', 'telaso',
    'titit', 'togel', 'toket', 'tolol', 'tusbol', 'vagina', 'fuck', 'shit',
    'motherfucker', 'motherfuckers', 'bitch', 'butthole',

    // Singkatan gaul kasar 3-4 huruf (tidak ada nama orang berawalan konsonan ini)
    'ajg', 'knt', 'ktl', 'kntl', 'mmk', 'ppk', 'bct', 'bck', 'bcot', 'bgst', 'bst',
    'jnc', 'fck', 'fuk', 'btc', 'tll', 'gbl', 'kmk', 'pkmk', 'pnt', 'tsbl', 'lnt', 'jbl', 'bjg', 'prk',

    // Tambahan Bahasa Jawa, Gaul Indonesia & Pisuhan
    'dancok', 'juancok', 'jiancuk', 'cuok', 'matamu', 'picek', 'ndasmu', 'kemplu',
    'gathel', 'gateli', 'tempik', 'bajilak', 'bajindul', 'anjir', 'anjay', 'bokep',
    'bodoh', 'brengsek', 'sialan', 'tobrut', 'ngewe', 'ewita', 'peju', 'sperma',
    'crot', 'asshole', 'cunt', 'pussy', 'slut', 'whore', 'bastard', 'pussies', 'biatch',
    'mampus', 'tetek', 'pelacur', 'lacur', 'pemerkosa', 'panteq', 'iblis', 'dajjal'
  ];

  // Kategori B: Kata yang memerlukan batas kata utuh / spasi agar tidak menghapus nama orang normal
  // Contoh: 'Anjani' / 'Anjar' aman dari 'anj', 'Basuki' / 'Astuti' aman dari 'asu',
  // 'Gilang' aman dari 'gila', 'Pelita' aman dari 'peli', 'Titus' aman dari 'tit'.
  const AMBIGUOUS_WORDS = [
    'asu', 'anj', 'tai', 'tae', 'gila', 'silet', 'urin', 'peli', 'tete', 'coli', 'itil',
    'dick', 'tit', 'ass', 'banci', 'burik', 'burit', 'jilat', 'cumbu', 'nazi'
  ];

  // Gabungan semua kata untuk kompatibilitas global (window.BAD_WORDS_LIST)
  const ALL_BAD_WORDS = Array.from(new Set([...UNAMBIGUOUS_WORDS, ...AMBIGUOUS_WORDS]));

  // Pre-kompilasi Regex untuk performa tinggi & respons instan (< 1ms)
  const unambiguousPatterns = UNAMBIGUOUS_WORDS.map(w => ({
    word: w,
    regex: buildRegex(w, w.length <= 4)
  }));

  const ambiguousPatterns = AMBIGUOUS_WORDS.map(w => ({
    word: w,
    regex: buildRegex(w, true)
  }));

  /**
   * Membersihkan teks dari kata-kata kotor dan mengembalikan teks bersih
   * @param {string} text - Teks input dari pengguna
   * @param {object} options - Opsi { isCommitted: boolean }
   * @returns {{ cleanText: string, hasBadWord: boolean, removedWords: string[] }}
   */
  function sanitize(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return { cleanText: '', hasBadWord: false, removedWords: [] };
    }

    const isCommitted = options.isCommitted || false;
    const hasTrailingSpace = /\s$/.test(text);
    const checkAmbiguous = isCommitted || hasTrailingSpace;

    let cleaned = text;
    let hasBad = false;
    const removedWords = [];

    // 1. Periksa kata kasar jelas & singkatan murni (selalu dieksekusi instan)
    for (const item of unambiguousPatterns) {
      item.regex.lastIndex = 0;
      if (item.regex.test(cleaned)) {
        hasBad = true;
        removedWords.push(item.word);
        item.regex.lastIndex = 0;
        cleaned = cleaned.replace(item.regex, '');
      }
    }

    // 2. Periksa kata ambigu (dieksekusi jika sudah dipisahkan spasi, commit, atau pause)
    if (checkAmbiguous) {
      for (const item of ambiguousPatterns) {
        item.regex.lastIndex = 0;
        if (item.regex.test(cleaned)) {
          hasBad = true;
          removedWords.push(item.word);
          item.regex.lastIndex = 0;
          cleaned = cleaned.replace(item.regex, '');
        }
      }
    }

    // 3. Normalisasi spasi setelah kata dihapus
    if (hasBad) {
      // Rapikan spasi ganda dan hilangkan spasi di ujung setelah kata kotor dihapus
      cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    }

    return {
      cleanText: cleaned,
      hasBadWord: hasBad,
      removedWords
    };
  }

  /**
   * Cek apakah teks mengandung kata kasar (digunakan untuk validasi submit)
   * @param {string} text
   * @returns {boolean}
   */
  function isBadWord(text) {
    if (!text) return false;
    const res = sanitize(text, { isCommitted: true });
    return res.hasBadWord;
  }

  // Ekspor ke window
  window.BAD_WORDS_LIST = ALL_BAD_WORDS;
  window.BadWordsFilter = {
    list: ALL_BAD_WORDS,
    unambiguousList: UNAMBIGUOUS_WORDS,
    ambiguousList: AMBIGUOUS_WORDS,
    sanitize,
    isBadWord,
    buildRegex
  };

})(typeof window !== 'undefined' ? window : global);