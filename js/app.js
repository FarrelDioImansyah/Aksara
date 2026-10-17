/**
 * app.js
 * ============================================================
 * Sasmita Aksara — Main Application Controller
 * Menghubungkan semua modul: UI, Hanacaraka, Petangan, Supabase
 * ============================================================
 */

'use strict';

// ============================================================
// 1. DOM REFERENCES
// ============================================================
const DOM = {
  // Form
  form:           document.getElementById('petanganForm'),
  namaInput:      document.getElementById('namaInput'),
  panggilanInput: document.getElementById('panggilanInput'),
  namaError:      document.getElementById('namaInputError'),
  submitBtn:       document.getElementById('submitBtn'),
  resetBtn:        document.getElementById('resetBtn'),
  downloadCardBtn: document.getElementById('downloadCardBtn'),

  // Status badge
  statusDot:   document.getElementById('supabaseStatusDot'),
  statusText:  document.getElementById('supabaseStatusText'),

  // Results — Format Custom Graphic Card
  resultContainer: document.getElementById('resultContainer'),
  tarotCustomCard: document.getElementById('tarotCustomCard'),
  tarotCustomBg:   document.getElementById('tarotCustomBg'),
  tarotCustomName: document.getElementById('tarotCustomName'),
  tarotCustomDesc: document.getElementById('tarotCustomDesc'),
  supabaseMessage:    document.getElementById('supabaseMessage'),
  supabaseIndicator:  document.getElementById('supabaseIndicator'),

  // Loading
  loadingOverlay:  document.getElementById('loadingOverlay'),
  loadingProgress: document.getElementById('loadingProgress'),

};

// ============================================================
// 2. APPLICATION STATE
// ============================================================
const STATE = {
  isProcessing:   false,
  lastResult:     null,
  sessionId:      'sess_' + Math.random().toString(36).substr(2, 9),
};

// ============================================================
// 3. INITIALIZATION
// ============================================================
async function init() {
  // Inisialisasi Supabase
  setStatusBadge('connecting');
  const supaStatus = await window.SupabaseClient.initSupabase();
  updateStatusBadge(supaStatus.status);

  // Setup form handler
  DOM.form.addEventListener('submit', handleFormSubmit);
  DOM.resetBtn.addEventListener('click', handleReset);
  DOM.downloadCardBtn?.addEventListener('click', handleDownloadCard);


  // Live validation saat mengetik
  DOM.namaInput.addEventListener('input', () => {
    if (DOM.namaError.textContent) clearError();
    animateInputGlow();
  });

  // Enter key hint
  DOM.namaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      DOM.form.dispatchEvent(new Event('submit'));
    }
  });

  // Smooth scroll dari CTA — langsung fokus ke input
  document.getElementById('heroCta')?.addEventListener('click', (e) => {
    e.preventDefault();
    const calcSection = document.getElementById('calculator');
    if (calcSection) calcSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => DOM.namaInput?.focus(), 600);
  });

  console.info('[Sasmita Aksara] App ready. Session:', STATE.sessionId);
}

// ============================================================
// 4. FORM SUBMIT HANDLER
// ============================================================
async function handleFormSubmit(e) {
  e.preventDefault();

  if (STATE.isProcessing) return;

  const namaLengkap = DOM.namaInput.value.trim();
  const inputPanggilan = DOM.panggilanInput?.value.trim();
  // Jika nama panggilan kosong, fallback ke kata pertama nama lengkap
  const namaPanggilan = inputPanggilan || namaLengkap.split(' ')[0] || namaLengkap;

  // Validasi Nama Lengkap (yang dihitung adalah Nama Lengkap)
  const validasi = window.PetanganEngine.validasiNama(namaLengkap);
  if (!validasi.valid) {
    showError(validasi.error);
    DOM.namaInput.focus();
    shakeElement(DOM.namaInput);
    return;
  }

  clearError();
  STATE.isProcessing = true;
  DOM.submitBtn.disabled = true;

  // Tampilkan loading
  showLoading();

  try {
    // Simulasi loading progress
    await animateProgress([
      { pct: 20, msg: 'Menganalisis fonem...', delay: 300 },
      { pct: 50, msg: 'Transliterasi Hanacaraka...', delay: 400 },
      { pct: 75, msg: 'Menghitung neptu...', delay: 300 },
      { pct: 90, msg: 'Kalkulasi Petangan Jawa...', delay: 300 },
    ]);

    // === PROSES TRANSLITERASI (Menggunakan Nama Lengkap) ===
    const translitResult = window.HanacarakaEngine.transliterasiHanacaraka(namaLengkap);

    // === PROSES KALKULASI (Metode Pancawara 5) ===
    const petanganResult = window.PetanganEngine.hitungPetangan(translitResult.totalNeptu);

    await setProgress(100, 'Selesai!');

    // === RENDER HASIL (Tampilkan Nama Panggilan di Display Tarot) ===
    await renderResults(translitResult, petanganResult, namaLengkap, namaPanggilan);

    // === SIMPAN KE SUPABASE (Database & Card Image Storage) ===
    updateSupabaseUI('loading');

    STATE.lastResult = { translitResult, petanganResult, namaLengkap, namaPanggilan };

    // Simpan data kalkulasi ke database (termasuk idKartu, deskripsi & pituah untuk Unity)
    const supaResult = await window.SupabaseClient.simpanHasilPetangan({
      idKartu:       petanganResult.hasil.idKartu, // 1: Sang Sri, 2: Sang Lungguh, 3: Sang Gedhong, 4: Sang Lara, 5: Sang Pati
      namaLatin:     namaLengkap,
      namaPanggilan: namaPanggilan,
      aksaraJawa:    translitResult.aksaraString,
      totalNeptu:    translitResult.totalNeptu,
      sisaBagi:      petanganResult.sisa,
      hasilKey:      petanganResult.hasil.key,
      hasilNama:     petanganResult.hasil.nama,
      hasilArti:     petanganResult.hasil.singkat,
      deskripsi:     petanganResult.hasil.deskripsi,
      pituah:        petanganResult.hasil.pituah,
      metode:        'soemodidjojo',
      sessionId:     STATE.sessionId,
    });

    // Upload gambar kartu ke Supabase Storage (Bucket: CardPetangen)
    try {
      const cardCanvas = await generateCardCanvas();
      const cardDataUrl = cardCanvas.toDataURL('image/png');
      const fileName = `${namaPanggilan.replace(/\s+/g, '_')}_card${petanganResult.hasil.idKartu}.png`;
      await window.SupabaseClient.uploadCardImageToStorage(
        cardDataUrl,
        fileName,
        petanganResult.hasil.idKartu,
        supaResult?.id
      );
    } catch (cardErr) {
      console.warn('[App] Upload gambar kartu ke CardPetangen diabaikan/mode demo:', cardErr.message);
    }

    updateSupabaseUI(
      supaResult.success ? (supaResult.demo ? 'demo' : 'success') : 'error',
      supaResult
    );

  } catch (err) {
    console.error('[App] Error:', err);
    showError('Terjadi kesalahan saat memproses. Coba lagi.');
  } finally {
    hideLoading();
    STATE.isProcessing = false;
    DOM.submitBtn.disabled = false;
  }
}

// ============================================================
// 5. RENDER HASIL
// ============================================================
async function renderResults(translit, petangan, namaLengkap, namaPanggilan) {
  // ── STEP 01 & 02 → Console only ──────────────────────────────
  console.groupCollapsed(
    `%c[Sasmita Aksara] ${namaLengkap} (${namaPanggilan}) — Detail Kalkulasi`,
    'color: #d4a017; font-weight: bold; font-size: 13px;'
  );
  console.log('%c[Step 01] Transliterasi Hanacaraka', 'color: #e8b84b; font-weight:bold;');
  console.log('  Aksara Jawa    :', translit.aksaraString);
  console.log('  Nama Lengkap   :', namaLengkap);
  console.log('  Nama Panggilan :', namaPanggilan);
  console.table(
    translit.tokens
      .filter(t => t.aksaraData && t.neptu > 0)
      .map(t => ({ Suku: t.latin, Aksara: t.unicode, Neptu: t.neptu }))
  );
  console.log('%c[Step 02] Kalkulasi Neptu', 'color: #e8b84b; font-weight:bold;');
  console.log('  Total Neptu :', translit.totalNeptu);
  console.log('  Formula     :', petangan.formula);
  console.log('%c[Step 03] Hasil Sasmita', 'color: #e8b84b; font-weight:bold;');
  console.log('  Kategori    :', petangan.hasil.nama);
  console.log('  Makna       :', petangan.hasil.singkat);
  console.groupEnd();

  // ── STEP 03 → Tampilkan di UI ────────────────────────────────
  DOM.resultContainer.hidden = false;
  DOM.resultContainer.removeAttribute('hidden');

  renderFinalResult(petangan, namaPanggilan);

  // Scroll ke hasil dengan smooth
  setTimeout(() => {
    DOM.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 200);
}



/**
 * Render hasil akhir Petangan ke Custom Graphic Card
 */
function renderFinalResult(petangan, namaPanggilan) {
  const { hasil } = petangan;

  if (DOM.tarotCustomCard) {
    DOM.tarotCustomCard.style.display = 'block';

    const bgImageSrc = hasil.bgCard || 'assets/SangSriBG.png';
    if (DOM.tarotCustomBg) DOM.tarotCustomBg.src = bgImageSrc;
    if (DOM.tarotCustomName) DOM.tarotCustomName.textContent = namaPanggilan;
    if (DOM.tarotCustomDesc) DOM.tarotCustomDesc.textContent = hasil.deskripsi;

    // Animate Card Reveal
    DOM.tarotCustomCard.style.animation = 'none';
    DOM.tarotCustomCard.offsetHeight; // trigger reflow
    DOM.tarotCustomCard.style.animation = 'tarotReveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
  }
}

/**
 * Render kartu ke elemen HTML5 Canvas resolusi tinggi (825x1425)
 * @returns {Promise<HTMLCanvasElement>}
 */
function generateCardCanvas() {
  return new Promise(async (resolve, reject) => {
    if (!STATE.lastResult) {
      return reject(new Error('Belum ada data kartu.'));
    }

    // Pastikan font Google Font 'Cinzel Decorative' sudah ter-load sebelum render canvas
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const { petanganResult, namaPanggilan } = STATE.lastResult;
    const bgSrc = petanganResult.hasil.bgCard || 'assets/SangSriBG.png';
    const canvas = document.createElement('canvas');
    canvas.width = 825;
    canvas.height = 1425;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 1. Gambar latar belakang kartu
      ctx.drawImage(img, 0, 0, 825, 1425);

      // 2. Render Nama Panggilan
      // Pada layar: top 48.0% (1425 * 0.48 = 684) + height 4.8% (68.4px) -> center Y = 718.2
      // Center X: 825 / 2 = 412.5
      ctx.font = '900 44px "Cinzel Decorative", serif';
      ctx.fillStyle = '#1a1612';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(namaPanggilan, 412.5, 718);

      // 3. Render Deskripsi Teks
      // Pada layar: top 56.842% (1425 * 0.56842 = 810px), font 28px agar pas di dalam frame dengan line-height 42px
      ctx.font = '700 28px "Cinzel Decorative", serif';
      ctx.fillStyle = '#1a1612';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const deskripsi = petanganResult.hasil.deskripsi;
      wrapText(ctx, deskripsi, 412.5, 845, 620, 42); // Jarak antar baris 42px

      resolve(canvas);
    };
    img.onerror = (e) => reject(new Error('Gagal memuat gambar kartu untuk export.'));
    img.src = bgSrc;
  });
}

/**
 * Helper untuk word-wrap text di Canvas
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
}

/**
 * Handle Download Card
 */
async function handleDownloadCard() {
  if (!STATE.lastResult) return;
  const originalText = DOM.downloadCardBtn.innerHTML;

  try {
    DOM.downloadCardBtn.disabled = true;
    DOM.downloadCardBtn.innerHTML = '<span>Membuat Gambar...</span>';

    const canvas = await generateCardCanvas();
    const dataUrl = canvas.toDataURL('image/png');

    const namaFile = `Kartu-Sasmita-${STATE.lastResult.namaPanggilan.replace(/\s+/g, '_')}.png`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = namaFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    DOM.downloadCardBtn.innerHTML = '<span>Tersimpan! ✓</span>';
    setTimeout(() => {
      DOM.downloadCardBtn.innerHTML = originalText;
      DOM.downloadCardBtn.disabled = false;
    }, 2000);
  } catch (err) {
    console.error('[Download Card] Gagal:', err);
    DOM.downloadCardBtn.innerHTML = originalText;
    DOM.downloadCardBtn.disabled = false;
    alert('Gagal mengunduh kartu: ' + err.message);
  }
}

// ============================================================
// 6. SUPABASE UI STATUS
// ============================================================
function updateSupabaseUI(status, result = null) {
  const indicator = DOM.supabaseIndicator;
  const message   = DOM.supabaseMessage;

  indicator.className = 'supa-indicator';

  switch (status) {
    case 'loading':
      indicator.classList.add('loading');
      message.textContent = 'Menyimpan ke database...';
      break;
    case 'success':
      indicator.classList.add('success');
      message.textContent = `Data tersimpan ✓ · ID: ${result?.id?.slice(0, 8)}...`;
      break;
    case 'demo':
      indicator.classList.add('success');
      message.textContent = 'Mode Demo aktif — Supabase belum dikonfigurasi';
      break;
    case 'error':
      indicator.classList.add('error');
      message.textContent = `Gagal menyimpan: ${result?.error || 'Error tidak diketahui'}`;
      break;
  }
}

// ============================================================
// 7. STATUS BADGE (NAVBAR)
// ============================================================
function setStatusBadge(status) {
  DOM.statusDot.className = 'badge-dot';
  switch (status) {
    case 'connecting':
      DOM.statusText.textContent = 'Menghubungkan...';
      break;
    case 'connected':
      DOM.statusDot.classList.add('connected');
      DOM.statusText.textContent = 'Database Terhubung';
      break;
    case 'demo':
      DOM.statusText.textContent = 'Mode Demo';
      break;
    case 'error':
      DOM.statusDot.classList.add('error');
      DOM.statusText.textContent = 'Koneksi Gagal';
      break;
  }
}

function updateStatusBadge(status) {
  setStatusBadge(status);
}

// ============================================================
// 8. RESET
// ============================================================
function handleReset() {
  // Fade out dulu
  DOM.resultContainer.style.transition = 'opacity 0.3s ease';
  DOM.resultContainer.style.opacity = '0';

  setTimeout(() => {
    DOM.resultContainer.hidden = true;
    DOM.resultContainer.style.opacity = '';
    DOM.resultContainer.style.transition = '';
    DOM.namaInput.value = '';
    clearError();
    STATE.lastResult = null;

    // Scroll input ke tampilan dan langsung fokus
    DOM.namaInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => DOM.namaInput.focus(), 400);
  }, 300);
}



// ============================================================
// 10. LOADING OVERLAY
// ============================================================
function showLoading() {
  DOM.loadingOverlay.classList.add('active');
  DOM.loadingOverlay.removeAttribute('aria-hidden');
  setProgress(0, 'Memulai...');
}

function hideLoading() {
  setTimeout(() => {
    DOM.loadingOverlay.classList.remove('active');
    DOM.loadingOverlay.setAttribute('aria-hidden', 'true');
  }, 400);
}

function setProgress(pct, text) {
  DOM.loadingProgress.style.width = `${pct}%`;
  const textEl = DOM.loadingOverlay.querySelector('.loading-text');
  if (textEl && text) textEl.textContent = text;
  return new Promise(resolve => setTimeout(resolve, 50));
}

async function animateProgress(steps) {
  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, step.delay));
    await setProgress(step.pct, step.msg);
  }
}

// ============================================================
// 11. MICRO-ANIMATIONS & HELPERS
// ============================================================

/**
 * Shake animation untuk input error
 */
function shakeElement(el) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => { el.style.animation = ''; }, 400);
}

/**
 * Glow efek input
 */
function animateInputGlow() {
  const wrapper = DOM.namaInput.parentElement;
  if (wrapper) {
    wrapper.style.filter = 'drop-shadow(0 0 8px rgba(212,160,23,0.3))';
    setTimeout(() => { wrapper.style.filter = ''; }, 500);
  }
}

// ============================================================
// 12. ERROR HANDLING
// ============================================================
function showError(msg) {
  DOM.namaError.textContent = msg;
  DOM.namaInput.setAttribute('aria-invalid', 'true');
}

function clearError() {
  DOM.namaError.textContent = '';
  DOM.namaInput.removeAttribute('aria-invalid');
}

// ============================================================
// 13. ADD SHAKE KEYFRAME DYNAMICALLY
// ============================================================
(function addShakeKeyframe() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-8px); }
      40%       { transform: translateX(8px); }
      60%       { transform: translateX(-6px); }
      80%       { transform: translateX(6px); }
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
// 14. BOOT
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging
window.SasmitaApp = { STATE, DOM, handleFormSubmit, handleReset };
