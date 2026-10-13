/**
 * particles.js
 * ============================================================
 * Sistem Partikel Aksara Jawa Mengambang
 * Canvas-based particle engine dengan efek glow & animasi
 * ============================================================
 */

'use strict';

(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Aksara yang digunakan sebagai partikel
  const AKSARA_CHARS = ['ꦲ', 'ꦤ', 'ꦕ', 'ꦫ', 'ꦏ', 'ꦢ', 'ꦠ', 'ꦱ', 'ꦮ', 'ꦭ',
                         'ꦝ', 'ꦥ', 'ꦗ', 'ꦪ', 'ꦚ', 'ꦩ', 'ꦒ', 'ꦧ', 'ꦛ', 'ꦔ',
                         '꧁', '꧂', '☽', '☆', '✦', '✧'];

  const GOLD_SHADES = [
    'rgba(212, 160, 23,',
    'rgba(232, 184, 75,',
    'rgba(245, 204, 106,',
    'rgba(196, 122, 21,',
    'rgba(255, 220, 120,',
  ];

  let particles = [];
  let animId = null;
  let W, H;

  // ---- Resize ----
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ---- Particle class ----
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(init = false) {
      this.x     = Math.random() * W;
      this.y     = init ? Math.random() * H : H + 20;
      this.char  = AKSARA_CHARS[Math.floor(Math.random() * AKSARA_CHARS.length)];
      this.size  = Math.random() * 16 + 8;        // 8–24px
      this.speed = Math.random() * 0.4 + 0.1;     // upward drift
      this.drift = (Math.random() - 0.5) * 0.3;   // horizontal drift
      this.alpha = Math.random() * 0.3 + 0.05;    // 0.05–0.35 (subtle)
      this.maxAlpha = this.alpha;
      this.fadeSpeed = Math.random() * 0.002 + 0.001;
      this.fadeDir   = Math.random() > 0.5 ? 1 : -1;
      this.rotation  = (Math.random() - 0.5) * 0.4;
      this.rotSpeed  = (Math.random() - 0.5) * 0.005;
      this.color     = GOLD_SHADES[Math.floor(Math.random() * GOLD_SHADES.length)];
      this.scale     = 1;
      this.scaleDir  = Math.random() > 0.5 ? 1 : -1;
      this.scaleSpd  = Math.random() * 0.002 + 0.001;
    }

    update() {
      this.y -= this.speed;
      this.x += this.drift;
      this.rotation += this.rotSpeed;

      // Fade in/out
      this.alpha += this.fadeSpeed * this.fadeDir;
      if (this.alpha >= this.maxAlpha || this.alpha <= 0.02) {
        this.fadeDir *= -1;
      }

      // Scale breathe
      this.scale += this.scaleSpd * this.scaleDir;
      if (this.scale > 1.15 || this.scale < 0.85) {
        this.scaleDir *= -1;
      }

      // Reset kalau keluar layar
      if (this.y < -30 || this.x < -30 || this.x > W + 30) {
        this.reset(false);
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.scale, this.scale);

      ctx.font = `${this.size}px 'Noto Serif Javanese', serif`;
      ctx.fillStyle = `${this.color} ${this.alpha})`;
      ctx.shadowColor = `${this.color} 0.6)`;
      ctx.shadowBlur  = 8;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.char, 0, 0);

      ctx.restore();
    }
  }

  // ---- Create initial particles ----
  function createParticles(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  // ---- Animation loop ----
  function animate() {
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.update();
      p.draw();
    }

    animId = requestAnimationFrame(animate);
  }

  // ---- Init ----
  function init() {
    resize();
    const count = Math.min(Math.floor((W * H) / 18000), 60); // density-based count, max 60
    createParticles(count);
    animate();
  }

  // ---- Event listeners ----
  window.addEventListener('resize', () => {
    resize();
    // Recreate particles on significant resize
    const newCount = Math.min(Math.floor((W * H) / 18000), 60);
    if (Math.abs(newCount - particles.length) > 5) {
      createParticles(newCount);
    }
  });

  // Pause animation when tab is hidden (performance)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animId) { cancelAnimationFrame(animId); animId = null; }
    } else {
      if (!animId) animate();
    }
  });

  // Start!
  init();

  // Expose for debugging
  window._particles = { particles, resize, createParticles };
})();
