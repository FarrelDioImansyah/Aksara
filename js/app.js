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
  form:        document.getElementById('petanganForm'),
  namaInput:   document.getElementById('namaInput'),
  namaError:   document.getElementById('namaInputError'),
  submitBtn:   document.getElementById('submitBtn'),
  resetBtn:    document.getElementById('resetBtn'),

  // Status badge
  statusDot:   document.getElementById('supabaseStatusDot'),
  statusText:  document.getElementById('supabaseStatusText'),

  // Results — hanya Step 03 yang ditampilkan di UI
  resultContainer:    document.getElementById('resultContainer'),
  resultSymbol:       document.getElementById('resultSymbol'),
  resultCategory:     document.getElementById('resultCategory'),
  resultMeaning:      document.getElementById('resultMeaning'),
  resultDescription:  document.getElementById('resultDescription'),
  resultMethodBadge:  document.getElementById('resultMethodBadge'),
  finalResultDisplay: document.getElementById('finalResultDisplay'),
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

  const nama = DOM.namaInput.value;
  const metode = document.querySelector('input[name="method"]:checked')?.value || 'poerwadarminta';

  // Validasi
  const validasi = window.PetanganEngine.validasiNama(nama);
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

    // === PROSES TRANSLITERASI ===
    const translitResult = window.HanacarakaEngine.transliterasiHanacaraka(nama);

    // === PROSES KALKULASI ===
    const petanganResult = window.PetanganEngine.hitungPetangan(
      translitResult.totalNeptu,
      metode
    );

    await setProgress(100, 'Selesai!');

    // === RENDER HASIL ===
    await renderResults(translitResult, petanganResult, nama);

    // === SIMPAN KE SUPABASE ===
    updateSupabaseUI('loading');
    const supaResult = await window.SupabaseClient.simpanHasilPetangan({
      namaLatin:  nama,
      aksaraJawa: translitResult.aksaraString,
      totalNeptu: translitResult.totalNeptu,
      sisaBagi:   petanganResult.sisa,
      hasilKey:   petanganResult.hasil.key,
      hasilNama:  petanganResult.hasil.nama,
      hasilArti:  petanganResult.hasil.singkat,
      metode:     metode,
      sessionId:  STATE.sessionId,
    });

    updateSupabaseUI(
      supaResult.success ? (supaResult.demo ? 'demo' : 'success') : 'error',
      supaResult
    );

    STATE.lastResult = { translitResult, petanganResult, nama, metode };

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
async function renderResults(translit, petangan, namaAsli) {
  // ── STEP 01 & 02 → Console only ──────────────────────────────
  console.groupCollapsed(
    `%c[Sasmita Aksara] ${namaAsli} — Detail Kalkulasi`,
    'color: #d4a017; font-weight: bold; font-size: 13px;'
  );
  console.log('%c[Step 01] Transliterasi Hanacaraka', 'color: #e8b84b; font-weight:bold;');
  console.log('  Aksara Jawa :', translit.aksaraString);
  console.log('  Nama Latin  :', namaAsli);
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

  renderFinalResult(petangan);

  // Scroll ke hasil dengan smooth
  setTimeout(() => {
    DOM.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 200);
}



/**
 * Render hasil akhir Petangan
 */
function renderFinalResult(petangan) {
  const { hasil } = petangan;

  // Reset tema
  DOM.finalResultDisplay.className = 'final-result-display';
  DOM.finalResultDisplay.classList.add(`theme-${hasil.key}`);

  DOM.resultSymbol.textContent = hasil.simbol;
  DOM.resultCategory.textContent = hasil.nama;
  DOM.resultMeaning.textContent = hasil.singkat;
  DOM.resultDescription.textContent = hasil.deskripsi;
  DOM.resultMethodBadge.textContent = petangan.metodeBadge;

  // Animate in
  [DOM.resultSymbol, DOM.resultCategory, DOM.resultMeaning, DOM.resultDescription].forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    setTimeout(() => {
      el.style.transition = 'all 0.5s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, i * 150 + 100);
  });
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
