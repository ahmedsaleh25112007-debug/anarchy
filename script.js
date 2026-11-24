/* =========================================================
   ANARCHY — script
   ========================================================= */
(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const reduceMotion = false; // الموقع معمول حركة بالكامل — بنحترم إعداد المتصفح في التيلت بس

  document.documentElement.classList.add('js');

  /* ---------------------------------------------------------
     1. Hero title — split into letters
     --------------------------------------------------------- */
  const titleEl = $('#heroTitle');
  if (titleEl) {
    const text = titleEl.getAttribute('data-text') || titleEl.textContent.trim();
    titleEl.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      span.style.transitionDelay = `${0.12 + i * 0.055}s`;
      titleEl.appendChild(span);
    });
    titleEl.setAttribute('aria-label', text);
  }

  /* ---------------------------------------------------------
     2. Toast
     --------------------------------------------------------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg, ms = 2600) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), ms);
  }

  /* ---------------------------------------------------------
     3. Preloader sequence
     --------------------------------------------------------- */
  const preloader = $('#preloader');
  const prePercent = $('#prePercent');
  const preFill = $('#preFill');
  const preStatus = $('#preStatus');
  const preClock = $('#preClock');

  const STATUSES = [
    [0,  'تهيئة الكيان…'],
    [28, 'تشفير القنوات…'],
    [52, 'بثّ الإشارة…'],
    [74, 'كسر الحماية…'],
    [92, 'فتح البوابات…'],
    [99, 'أهلاً بيك في العيلة…']
  ];

  function tickClock() {
    if (!preClock) return;
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    preClock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  tickClock();
  const clockId = setInterval(tickClock, 1000);

  function finishLoading() {
    clearInterval(clockId);
    if (preloader) preloader.classList.add('is-done');
    document.body.classList.add('is-ready');
    setTimeout(() => {
      document.body.classList.remove('is-loading');
    }, 300);
    setTimeout(() => {
      if (preloader) preloader.style.display = 'none';
    }, 1400);
  }

  function runPreloader() {
    if (!preloader || reduceMotion) {
      if (prePercent) prePercent.textContent = '100';
      if (preFill) preFill.style.width = '100%';
      finishLoading();
      return;
    }

    let p = 0;
    let lastStatus = -1;

    const step = () => {
      // random-ish, stuttering progress
      const stall = p > 60 && p < 88 && Math.random() < 0.35;
      p = stall ? p + 0.2 : p + Math.random() * 6 + 1.4;
      if (p > 100) p = 100;

      if (prePercent) prePercent.textContent = Math.floor(p);
      if (preFill) preFill.style.width = p + '%';

      for (const [at, label] of STATUSES) {
        if (p >= at && at > lastStatus) {
          lastStatus = at;
          if (preStatus) preStatus.textContent = label;
        }
      }

      if (p < 100) {
        setTimeout(step, 34 + Math.random() * 62);
      } else {
        if (preStatus) preStatus.textContent = 'جاهز.';
        setTimeout(finishLoading, 420);
      }
    };

    setTimeout(step, 220);
  }

  /* ---------------------------------------------------------
     4. Embers canvas
     --------------------------------------------------------- */
  function initEmbers() {
    const canvas = $('#embers');
    if (!canvas || reduceMotion) return;

    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let raf = 0;

    const COLORS = ['#ff2b2b', '#ff5a3c', '#e1121b', '#ff8a5c', '#8b060c'];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((w * h) / 30000), 22, 60);
      particles = Array.from({ length: count }, () => spawn(true));
    }

    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + Math.random() * 60,
        r: Math.random() * 2.1 + 0.5,
        vy: -(Math.random() * 0.55 + 0.18),
        vx: (Math.random() - 0.5) * 0.35,
        a: Math.random() * 0.55 + 0.15,
        flick: Math.random() * Math.PI * 2,
        fs: Math.random() * 0.05 + 0.01,
        color: COLORS[(Math.random() * COLORS.length) | 0]
      };
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(p.flick) * 0.18;
        p.y += p.vy;
        p.flick += p.fs;
        p.a *= 0.999;

        if (p.y < -30 || p.a < 0.05) {
          particles[i] = spawn(false);
          continue;
        }

        const twinkle = 0.6 + Math.sin(p.flick * 3) * 0.4;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = clamp(p.a * twinkle, 0, 1);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // soft glow halo
        ctx.beginPath();
        ctx.globalAlpha = clamp(p.a * 0.16 * twinkle, 0, 1);
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    draw();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        draw();
      }
    });

    // وقّف الرسم لما الهيرو يخرج من الشاشة (توفير للمعالج)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            if (!raf) draw();
          } else {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        });
      }, { threshold: 0 });
      io.observe(canvas);
    }
  }

  /* ---------------------------------------------------------
     5. Custom cursor
     --------------------------------------------------------- */
  function initCursor() {
    if (!window.matchMedia('(pointer: fine)').matches || reduceMotion) return;

    const cursor = $('#cursor');
    if (!cursor) return;

    document.documentElement.classList.add('has-cursor');

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let running = false;
    const ring = cursor.querySelector('.cursor__ring');

    const loop = () => {
      rx = lerp(rx, mx, 0.2);
      ry = lerp(ry, my, 0.2);
      if (ring) ring.style.transform = `translate3d(${(rx - mx).toFixed(2)}px, ${(ry - my).toFixed(2)}px, 0)`;

      if (Math.abs(rx - mx) > 0.4 || Math.abs(ry - my) > 0.4) {
        requestAnimationFrame(loop);
      } else {
        running = false;
        if (ring) ring.style.transform = 'translate3d(0,0,0)';
      }
    };

    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      cursor.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });

    const hot = 'a, button, .rank, .stat, .codex__item, .join__tag';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hot)) document.documentElement.classList.add('cursor-hot');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hot)) document.documentElement.classList.remove('cursor-hot');
    });
  }

  /* ---------------------------------------------------------
     6. Scroll: progress, nav state, spy
     --------------------------------------------------------- */
  function initScroll() {
    const nav = $('#nav');
    const bar = $('#progressBar');
    const links = $$('.nav__links a');
    const sections = links
      .map(a => $(a.getAttribute('href')))
      .filter(Boolean);

    let ticking = false;

    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      if (bar) bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      if (nav) nav.classList.toggle('is-stuck', y > 40);

      let active = null;
      for (const sec of sections) {
        const top = sec.offsetTop - window.innerHeight * 0.35;
        if (y >= top) active = sec.id;
      }
      links.forEach(a => {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + active);
      });

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    update();
  }

  /* ---------------------------------------------------------
     7. Reveal on scroll
     --------------------------------------------------------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));
  }

  /* ---------------------------------------------------------
     8. Counters
     --------------------------------------------------------- */
  function initCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;

    const run = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      const dur = 1500;
      const t0 = performance.now();

      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + (t === 1 ? suffix : '');
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window) || reduceMotion) {
      nums.forEach(el => {
        el.textContent = el.dataset.count + (el.dataset.suffix || '');
      });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });

    nums.forEach(el => io.observe(el));
  }

  /* ---------------------------------------------------------
     9. Tilt + magnetic buttons
     --------------------------------------------------------- */
  function initTilt() {
    if (reduceMotion || !window.matchMedia('(hover: fine)').matches) return;

    $$('[data-magnet]').forEach(btn => {
      let queued = false;
      let px = 0, py = 0;

      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        px = (e.clientX - r.left - r.width / 2) * 0.22;
        py = (e.clientY - r.top - r.height / 2) * 0.28;
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          btn.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
        });
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------
     10. Copy tag
     --------------------------------------------------------- */
  function initCopy() {
    const btn = $('#copyBtn');
    const value = $('#tagValue');
    if (!btn || !value) return;

    btn.addEventListener('click', async () => {
      const text = value.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        toast('اتنسخ — TAG: ' + text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        toast('اتنسخ — TAG: ' + text);
      }
      btn.textContent = 'تم ✓';
      setTimeout(() => (btn.textContent = 'نسخ'), 1800);
    });
  }

  /* ---------------------------------------------------------
     11. Sound (opt-in WebAudio drone)
     --------------------------------------------------------- */
  function initSound() {
    const btn = $('#soundBtn');
    if (!btn) return;

    let ctx = null, master = null, playing = false;

    function build() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      filter.Q.value = 1.4;
      filter.connect(master);

      const o1 = ctx.createOscillator();
      o1.type = 'sine'; o1.frequency.value = 55;
      const o2 = ctx.createOscillator();
      o2.type = 'sawtooth'; o2.frequency.value = 82.4; o2.detune.value = -9;
      const g2 = ctx.createGain(); g2.gain.value = 0.16;
      o1.connect(filter);
      o2.connect(g2); g2.connect(filter);
      o1.start(); o2.start();

      // slow pulsing pad
      const lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.13;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.045;
      lfo.connect(lfoGain); lfoGain.connect(master.gain);
      lfo.start();

      // airy noise
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
      const ng = ctx.createGain(); ng.gain.value = 0.035;
      noise.connect(bp); bp.connect(ng); ng.connect(master);
      noise.start();

      return true;
    }

    btn.addEventListener('click', () => {
      if (!ctx && !build()) {
        toast('الصوت مش مدعوم في المتصفح ده');
        return;
      }
      if (ctx.state === 'suspended') ctx.resume();

      playing = !playing;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(playing ? 0.085 : 0, now + 0.9);

      btn.classList.toggle('is-on', playing);
      btn.setAttribute('aria-pressed', String(playing));
      toast(playing ? 'الصوت اتفتح — استمتع' : 'الصوت اتقفل');
    });
  }

  /* ---------------------------------------------------------
     12. Easter egg — type "anarchy"
     --------------------------------------------------------- */
  function initEasterEgg() {
    let buffer = '';
    let locked = false;

    function glitch() {
      if (locked) return;
      locked = true;

      document.body.classList.add('is-glitching');
      toast('ANARCHY UNLOCKED // الفوضى بتبدأ', 3200);

      setTimeout(() => {
        document.body.classList.remove('is-glitching');
        locked = false;
      }, 950);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-12);
      if (buffer.includes('anarchy')) {
        buffer = '';
        glitch();
      }
    });
  }

  /* ---------------------------------------------------------
     13. Kick live status
     --------------------------------------------------------- */
  const LIVE = {
    slug: 'shenzoe',
    // Optional: your own proxy endpoint (see live-proxy.js). Leave '' to use public proxies.
    proxy: '/api/live',
    refresh: 60000
  };

  function initLive() {
    const card = $('#liveCard');
    if (!card) return;

    const statusEl   = $('#liveStatus');
    const statusText = $('#liveStatusText');
    const frame      = $('#liveFrame');
    const poster     = $('#livePoster');
    const avatar     = $('#liveAvatar');
    const nameEl     = $('#liveName');
    const followers  = $('#liveFollowers');
    const category   = $('#liveCategory');
    const viewers    = $('#liveViewers');
    const titleEl    = $('#liveTitle');
    const hint       = $('#liveHint');
    const navDot     = $('#navLive');
    const openBtn    = $('#liveOpen');


    const CHANNEL_URL = `https://kick.com/api/v2/channels/${LIVE.slug}`;
    const CACHE_KEY = 'anarchy:kick:v1';

    const endpoints = [
      CHANNEL_URL,
      LIVE.proxy,
      `https://corsproxy.io/?url=${encodeURIComponent(CHANNEL_URL)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(CHANNEL_URL)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(CHANNEL_URL)}`
    ].filter(Boolean);

    let iframeMounted = false;
    let timer = 0;

    const nf = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
    const fmt = (n) => (typeof n === 'number' ? nf.format(n) : '—');

    function setState(state, label) {
      card.dataset.state = state;
      if (statusEl) statusEl.dataset.state = state;
      if (statusText) statusText.textContent = label;
      if (navDot) navDot.classList.toggle('is-on', state === 'live');
    }

    function render(data) {
      const user = data.user || data.chatroom?.user || {};
      const live = data.livestream || null;
      const isLive = !!live && live.is_live !== false;

      // profile
      if (nameEl && (user.username || data.slug)) {
        nameEl.textContent = user.username || data.slug;
      }
      const pic = user.profile_pic || data.profile_pic;
      if (avatar) {
        if (pic && !avatar.querySelector('img')) {
          const img = document.createElement('img');
          img.src = pic;
          img.alt = 'Shenzoe';
          img.loading = 'lazy';
          img.addEventListener('error', () => {
            img.remove();
            if (!avatar.textContent.trim()) avatar.innerHTML = '<span>SH</span>';
          });
          avatar.innerHTML = '';
          avatar.appendChild(img);
        }
      }
      if (followers) followers.textContent = fmt(user.followers_count ?? data.followers_count ?? data.chatroom?.user?.followers_count);

      if (!isLive) {
        setState('offline', 'OFFLINE');
        if (viewers) viewers.textContent = '—';
        if (titleEl) titleEl.textContent = 'مفيش بث شغّال دلوقتي';
        if (category) category.textContent = '—';
        if (hint) hint.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        if (poster) {
          poster.style.display = '';
          const imgUrl = (v) => (typeof v === 'string' ? v : (v && (v.src || v.url)) || '');
          const banner = imgUrl(data.offline_banner_image) || imgUrl(data.banner_image);
          if (banner) poster.style.setProperty('--poster-img', `url("${banner}")`);
        }
        return;
      }

      // live
      setState('live', 'LIVE NOW');
      if (viewers) viewers.textContent = '● ' + fmt(live.viewer_count) + ' watching';
      if (titleEl) titleEl.textContent = live.session_title || 'لايف على Kick';
      if (category) category.textContent = live.categories?.[0]?.name || 'Just Chatting';
      if (hint) hint.textContent = 'البث شغّال دلوقتي — الصوت من مشغّل كيك.';
      if (poster) poster.style.display = 'none';
      if (openBtn) openBtn.href = `https://kick.com/${LIVE.slug}`;

      if (!iframeMounted && frame) {
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.kick.com/${LIVE.slug}?autoplay=true&muted=true`;
        iframe.title = 'Kick live — Shenzoe';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.setAttribute('allowfullscreen', '');
        iframe.loading = 'lazy';
        frame.appendChild(iframe);
        iframeMounted = true;
      }
    }

    function fail() {
      setState('error', 'SIGNAL LOST');
      if (hint) hint.textContent = 'مش قادرين نوصل لكيك من هنا — افتح البروفايل وشوف بنفسك.';
      if (titleEl) titleEl.textContent = 'افتح البث على Kick';
    }

    async function fetchJSON(url) {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 7000);
      try {
        const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } finally {
        clearTimeout(to);
      }
    }

    async function refresh() {
      for (const url of endpoints) {
        try {
          const data = await fetchJSON(url);
          if (!data || (data.message && !data.livestream && !data.user)) continue;
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
          } catch {}
          render(data);
          return;
        } catch {
          /* try next endpoint */
        }
      }
      fail();
    }

    // instant paint from cache, then refresh
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.data) render(cached.data);
    } catch {}

    refresh();
    timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, LIVE.refresh);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refresh();
    });

    // cleanup label
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  }

  /* ---------------------------------------------------------
     14. Boot
     --------------------------------------------------------- */
  function boot() {
    initEmbers();
    initCursor();
    initScroll();
    initReveal();
    initCounters();
    initTilt();
    initCopy();
    initSound();
    initEasterEgg();
    initLive();
    runPreloader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
