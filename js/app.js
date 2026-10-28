/**
 * app.js
 * ============================================================
 * Sasmita Aksara — Main Application Controller
 * Menghubungkan semua modul: UI, Petangan (Randomizer), Supabase
 * ============================================================
 */

'use strict';

// ============================================================
// 1. DOM REFERENCES
// ============================================================
const DOM = {
  // Form & Layout
  form:             document.getElementById('petanganForm'),
  formInputSection: document.getElementById('formInputSection'),
  homepageTitle:    document.getElementById('homepageTitleSection'), // Untuk menyembunyikan title
  namaInput:        document.getElementById('namaInput'),
  namaError:        document.getElementById('namaInputError'),
  submitBtn:        document.getElementById('submitBtn'),
  resetBtn:         document.getElementById('resetBtn'),
  downloadCardBtn:  document.getElementById('downloadCardBtn'),

  // Status badge
  statusDot:        document.getElementById('supabaseStatusDot'),
  statusText:       document.getElementById('supabaseStatusText'),

  // Results — Format Custom Graphic Card
  resultContainer:  document.getElementById('resultContainer'),
  tarotCustomCard:  document.getElementById('tarotCustomCard'),
  tarotCustomBg:    document.getElementById('tarotCustomBg'),
  tarotCustomName:  document.getElementById('tarotCustomName'),
  // tarotCustomDesc sudah dihapus dari HTML sesuai instruksi
  
  supabaseMessage:  document.getElementById('supabaseMessage'),
  supabaseIndicator:document.getElementById('supabaseIndicator'),

  // Loading
  loadingOverlay:   document.getElementById('loadingOverlay'),
  loadingProgress:  document.getElementById('loadingProgress'),
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

  // Ambil nama lengkap dan jadikan huruf kapital sesuai desain kartu
  const namaLengkap = DOM.namaInput.value.trim().toUpperCase();

  // Validasi Nama Lengkap (maks 20 karakter)
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
      { pct: 30, msg: 'Menyelaraskan energi...', delay: 300 },
      { pct: 70, msg: 'Membaca takdir...', delay: 400 },
    ]);

    // === PROSES PEMILIHAN KARTU ACAK ===
    const hasilKartu = window.PetanganEngine.getRandomCard();
    await setProgress(100, 'Selesai!');

    // === RENDER HASIL ===
    await renderResults(hasilKartu, namaLengkap);

    // Sembunyikan kolom input, tombol submit, dan judul homepage setelah disubmit
    if (DOM.formInputSection) DOM.formInputSection.style.display = 'none';
    if (DOM.homepageTitle) DOM.homepageTitle.style.display = 'none';

    // === SIMPAN KE SUPABASE (Database & Card Image Storage) ===
    updateSupabaseUI('loading');

    STATE.lastResult = { hasilKartu, namaLengkap };

    // Simpan data kalkulasi ke database
    const supaResult = await window.SupabaseClient.simpanHasilPetangan({
      idKartu:       hasilKartu.idKartu,
      namaLatin:     namaLengkap,
      namaPanggilan: namaLengkap, // Disamakan karena sudah tidak ada input nama panggilan
    });

    // Upload gambar kartu ke Supabase Storage (Bucket: CardPetangen)
    /*try {
      const cardCanvas = await generateCardCanvas();
      const cardDataUrl = cardCanvas.toDataURL('image/png');
      const fileName = `${namaLengkap.replace(/\s+/g, '_')}_card${hasilKartu.idKartu}.png`;
      await window.SupabaseClient.uploadCardImageToStorage(
        cardDataUrl,
        fileName,
        hasilKartu.idKartu,
        supaResult?.id
      );
    } catch (cardErr) {
      console.warn('[App] Upload gambar kartu ke CardPetangen diabaikan/mode demo:', cardErr.message);
    }
    */

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
async function renderResults(hasilKartu, namaLengkap) {
  // ── Tampilkan di UI ────────────────────────────────
  DOM.resultContainer.hidden = false;
  DOM.resultContainer.removeAttribute('hidden');

  renderFinalResult(hasilKartu, namaLengkap);

  // Scroll ke hasil dengan smooth
  setTimeout(() => {
    DOM.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 200);
}

/**
 * Render hasil akhir ke Custom Graphic Card dengan Font Dinamis
 */
function renderFinalResult(hasilKartu, namaLengkap) {
  if (DOM.tarotCustomCard) {
    DOM.tarotCustomCard.style.display = 'block';

    // Set gambar latar kartu
    if (DOM.tarotCustomBg) {
      DOM.tarotCustomBg.src = hasilKartu.bgCard;
    }
    
    // Set dan resize nama otomatis
    if (DOM.tarotCustomName) {
      DOM.tarotCustomName.textContent = namaLengkap;
      
      // Auto-resize Font Size agar fit di dalam div pita
      let fontSize = 1.95; // Base rem (ukuran awal maksimal)
      DOM.tarotCustomName.style.fontSize = fontSize + 'rem';
      
      // Jika teks kepanjangan dari lebar div-nya, kecilkan perlahan
      while (DOM.tarotCustomName.scrollWidth > DOM.tarotCustomName.clientWidth && fontSize > 0.8) {
        fontSize -= 0.05;
        DOM.tarotCustomName.style.fontSize = fontSize + 'rem';
      }
    }

    // Animate Card Reveal
    DOM.tarotCustomCard.style.animation = 'none';
    DOM.tarotCustomCard.offsetHeight; // trigger reflow
    DOM.tarotCustomCard.style.animation = 'tarotReveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards';
  }
}

/**
 * Render kartu ke elemen HTML5 Canvas untuk fitur unduh
 * Hanya menggambar BG Kartu dan Teks Nama yang auto-scale
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

    const { hasilKartu, namaLengkap } = STATE.lastResult;
    const canvas = document.createElement('canvas');
    
    // Resolusi default gambar kartu (sesuaikan jika resolusi asli gambar berbeda)
    canvas.width = 1080; 
    canvas.height = 1920; 
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 1. Gambar latar belakang kartu utuh
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 2. Render Nama Dinamis
      const centerX = 540; // Titik tengah X (1080 / 2)
      
      // Y = 915 mbah setengah tinggi kotak (60 / 2 = 30) agar teks jatuh persis di tengah
      const centerY = 910; 
      
      const maxWidth = 580; // Batas lebar berdasarkan bounding box (593px) dikurangi sedikit margin aman

      let fontSize = 65; // Ukuran font dasar di resolusi besar
      
      ctx.font = `900 ${fontSize}px "Helvetica", "Arial", sans-serif`;
      ctx.fillStyle = '#1a1612';
      ctx.textAlign = 'center';
      
      // textBaseline 'middle' akan memposisikan titik tengah vertikal teks persis di centerY
      ctx.textBaseline = 'middle'; 

      // Auto-scale font untuk Canvas jika teks terlalu panjang
      while (ctx.measureText(namaLengkap).width > maxWidth && fontSize > 25) {
        fontSize -= 2;
        ctx.font = `900 ${fontSize}px "Helvetica", "Arial", sans-serif`;
      }

      // Cetak teks pada koordinat presisi (540, 957)
      ctx.fillText(namaLengkap, centerX, centerY); 

      resolve(canvas);
    };
    img.onerror = (e) => reject(new Error('Gagal memuat gambar kartu untuk export.'));
    img.src = hasilKartu.bgCard;
  });
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // Kualitas JPEG 90%

    const namaFile = `Kartu-Petangan-Wilangan-${STATE.lastResult.namaLengkap.replace(/\s+/g, '_')}.jpeg`;
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

    // Munculkan kembali form input dan judul homepage
    if (DOM.formInputSection) DOM.formInputSection.style.display = '';
    if (DOM.homepageTitle) DOM.homepageTitle.style.display = '';

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