var $ = (sel, ctx = document) => ctx.querySelector(sel);
var $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ════════════════════════════════════════
   i18n — Traduções
════════════════════════════════════════ */
const i18n = {
  pt: { 'drawer.profile': 'Perfil', 'drawer.profile_sub': 'Gerir a sua conta', 'drawer.language': 'Idioma', 'lang.label': 'Português' },
  en: { 'drawer.profile': 'Profile', 'drawer.profile_sub': 'Manage your account', 'drawer.language': 'Language', 'lang.label': 'English' },
  es: { 'drawer.profile': 'Perfil', 'drawer.profile_sub': 'Gestionar tu cuenta', 'drawer.language': 'Idioma', 'lang.label': 'Español' },
};
let currentLang = localStorage.getItem('lang') || 'pt';
function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  const t = i18n[lang] || i18n.pt;
  document.querySelectorAll('[data-i18n]').forEach(el => { if (t[el.dataset.i18n]) el.textContent = t[el.dataset.i18n]; });
  const label = document.querySelector('.lang-current-label');
  if (label) label.textContent = t['lang.label'];
  document.querySelectorAll('.lang-pill').forEach(p => {
    const active = p.dataset.lang === lang;
    p.classList.toggle('active', active);
    p.setAttribute('aria-pressed', String(active));
  });
}

/* ════════════════════════════════════════
   NAV DRAWER
════════════════════════════════════════ */
(function initNavDrawer() {
  const menuBtn    = document.getElementById('nav-menu-btn');
  const profileBtn = document.getElementById('nav-profile-btn');
  const drawer     = document.getElementById('nav-drawer');
  const overlay    = document.getElementById('nav-drawer-overlay');
  const closeBtn   = document.getElementById('nav-drawer-close');
  if (!menuBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { if (closeBtn) closeBtn.focus(); }, 60);
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuBtn.focus();
  }

  menuBtn.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
  if (overlay) overlay.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (profileBtn) profileBtn.addEventListener('click', () => { window.location.href = 'perfil.html'; });

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });

  drawer.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled])')].filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  document.querySelectorAll('.lang-pill').forEach(pill => {
    pill.addEventListener('click', () => applyLang(pill.dataset.lang));
  });

  applyLang(currentLang);
})();

/* ════════════════════════════════════════
   NAV
════════════════════════════════════════ */
const nav = $('#nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

/* ════════════════════════════════════════
   REVEAL
════════════════════════════════════════ */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  });
}, { threshold: 0.08 });
$$('.reveal').forEach(el => revealIO.observe(el));

/* ════════════════════════════════════════
   CONTADOR HERO
════════════════════════════════════════ */
function animCount(el) {
  const raw = el.dataset.count, suffix = el.dataset.suffix || '';
  const target = parseFloat(raw), isFloat = raw.includes('.');
  const dur = 1500, start = performance.now();
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  (function step(now) {
    const p = Math.min((now - start) / dur, 1), val = target * easeOut(p);
    el.textContent = (isFloat ? val.toFixed(1) : Math.round(val).toLocaleString('pt-BR')) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}
const countIO = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animCount(e.target); countIO.unobserve(e.target); } });
}, { threshold: 0.6 });
$$('[data-count]').forEach(el => countIO.observe(el));

/* ════════════════════════════════════════
   AVALIAÇÕES — sparkline + count-up
════════════════════════════════════════ */
(function () {
  const reviewsSection = document.querySelector('.reviews');
  if (!reviewsSection) return;

  let hasAnimated = false;

  function initReviewsSparkline() {
    const canvas = document.getElementById('rpSparkline');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#BFA06A';

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight);
    gradient.addColorStop(0, hexToRgba(gold, 0.22));
    gradient.addColorStop(1, hexToRgba(gold, 0));

    const dataPoints = [78, 80, 79, 83, 85, 84, 88, 91, 90, 94];

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataPoints.map((_, i) => i),
        datasets: [{
          data: dataPoints,
          borderColor: gold,
          backgroundColor: gradient,
          borderWidth: 1.6,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 900, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        elements: {
          point: { radius: 0 }
        }
      }
    });
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const isDecimal = el.dataset.count.includes('.');
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = (isDecimal ? current.toFixed(1) : Math.round(current)) + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = (isDecimal ? target.toFixed(1) : target) + suffix;
      }
    }

    requestAnimationFrame(tick);
  }

  function initReviewsCountUp() {
    document.querySelectorAll('.rp-stat-val[data-count]').forEach(animateCount);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;
        initReviewsSparkline();
        initReviewsCountUp();
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(reviewsSection);
})();

/* ════════════════════════════════════════
   CAROUSEL BANNER (Galeria)
════════════════════════════════════════ */
(function initCarousel() {
  const carousel    = $('#carousel');
  if (!carousel) return;

  const slides      = $$('.carousel-slide', carousel);
  const dots        = $$('.carousel-dot', carousel);
  const progressEl  = $('#carousel-progress', carousel);

  const DURATION = 5000; // ms por slide
  let current     = 0;
  let autoTimer   = null;
  let fillRaf     = null;
  let fillStart   = null;
  let paused      = false;
  let touchStartX = 0;

  /* ── Vai para slide ── */
  function goTo(idx, restartAuto = true) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    dots[current].setAttribute('aria-selected', 'false');

    current = ((idx % slides.length) + slides.length) % slides.length;

    slides[current].classList.add('active');
    dots[current].classList.add('active');
    dots[current].setAttribute('aria-selected', 'true');

    if (restartAuto) resetAuto();
  }

  /* ── Barra de progresso (rAF puro, sem transição CSS no início) ── */
  function startFill() {
    cancelAnimationFrame(fillRaf);
    progressEl.style.transition = 'none';
    progressEl.style.width = '0%';
    fillStart = performance.now();

    function step(now) {
      const elapsed = now - fillStart;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      progressEl.style.width = pct + '%';
      if (pct < 100 && !paused) {
        fillRaf = requestAnimationFrame(step);
      }
    }
    // Deixa o browser pintar o 0% antes de começar
    requestAnimationFrame(() => { fillRaf = requestAnimationFrame(step); });
  }

  function pauseFill() {
    cancelAnimationFrame(fillRaf);
  }

  /* ── Auto-avanço ── */
  function resetAuto() {
    clearInterval(autoTimer);
    startFill();
    if (!paused) {
      autoTimer = setInterval(() => goTo(current + 1), DURATION);
    }
  }

  function pause() {
    if (paused) return;
    paused = true;
    clearInterval(autoTimer);
    pauseFill();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    // Recalcula o tempo restante com base na largura atual da barra
    const currentPct = parseFloat(progressEl.style.width) || 0;
    const elapsed = (currentPct / 100) * DURATION;
    const remaining = DURATION - elapsed;

    // Retoma a animação do fill a partir do ponto pausado
    fillStart = performance.now() - elapsed;
    function step(now) {
      const e = now - fillStart;
      const pct = Math.min((e / DURATION) * 100, 100);
      progressEl.style.width = pct + '%';
      if (pct < 100 && !paused) {
        fillRaf = requestAnimationFrame(step);
      }
    }
    fillRaf = requestAnimationFrame(step);

    autoTimer = setTimeout(() => {
      goTo(current + 1);
    }, remaining);
  }

  /* ── Eventos: dots ── */
  dots.forEach(d => {
    d.addEventListener('click', () => goTo(parseInt(d.dataset.idx, 10)));
  });

  /* ── Eventos: teclado (dentro do carousel) ── */
  carousel.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  /* ── Eventos: pause ao hover (desktop) ── */
  carousel.addEventListener('mouseenter', pause);
  carousel.addEventListener('mouseleave', resume);

  /* ── Eventos: swipe (mobile) ── */
  carousel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    pause();
  }, { passive: true });

  carousel.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 44) {
      goTo(dx < 0 ? current + 1 : current - 1);
    } else {
      resume();
    }
  }, { passive: true });

  /* ── Visibilidade: pausa quando aba não está visível ── */
  document.addEventListener('visibilitychange', () => {
    document.hidden ? pause() : resume();
  });

  /* ── Inicia ── */
  resetAuto();
})();

/* ════════════════════════════════════════
   GALERIA — Filtro + Lightbox + Vídeo
════════════════════════════════════════ */
(function initGaleria() {

  const section   = $('#galeria');
  if (!section) return;

  const pills     = $$('.gf-pill', section);
  const cells     = $$('.b-cell', section);

  /* ── Utilitário: categorias de uma célula ── */
  function getCategories(cell) {
    const cats = [cell.dataset.category];
    if (cell.dataset.category2) cats.push(cell.dataset.category2);
    return cats;
  }

  /* ════════════════════════════════════════
     FILTRO DE CATEGORIAS
  ════════════════════════════════════════ */
  let activeFilter = 'todos';

  function applyFilter(filter) {
    activeFilter = filter;

    cells.forEach(cell => {
      const match = filter === 'todos' || getCategories(cell).includes(filter);

      if (match) {
        /* mostra */
        cell.classList.remove('is-hidden');
        cell.removeAttribute('aria-hidden');
      } else {
        /* esconde — a classe gf-hidden deve ter:
           opacity:0; pointer-events:none; transform:scale(.95);
           com transition no CSS */
        cell.classList.add('is-hidden');
        cell.setAttribute('aria-hidden', 'true');
      }
    });
  }

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      /* Atualiza pills */
      pills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');

      applyFilter(pill.dataset.filter);
    });

    /* Acessibilidade: setas entre tabs */
    pill.addEventListener('keydown', e => {
      const idx  = pills.indexOf(pill);
      if (e.key === 'ArrowRight') { e.preventDefault(); pills[(idx + 1) % pills.length].focus(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); pills[(idx - 1 + pills.length) % pills.length].focus(); }
    });
  });

  /* ════════════════════════════════════════
     VÍDEO — play/pause ao clicar no botão
  ════════════════════════════════════════ */
  $$('.b-cell-video', section).forEach(cell => {
    const playBtn = $('.b-play-btn', cell);
    const video   = $('video', cell);
    if (!playBtn) return;

    playBtn.addEventListener('click', e => {
      e.stopPropagation(); /* não abre lightbox */
      if (!video) return;  /* placeholder: sem vídeo real, não faz nada */

      if (video.paused) {
        video.play();
        playBtn.classList.add('playing');
        playBtn.setAttribute('aria-label', 'Pausar vídeo');
      } else {
        video.pause();
        playBtn.classList.remove('playing');
        playBtn.setAttribute('aria-label', 'Play vídeo');
      }
    });
  });

  /* ════════════════════════════════════════
     LIGHTBOX — apenas para fotos (não vídeo)
  ════════════════════════════════════════ */

  /* Cria o lightbox no DOM uma única vez */
  const lb = document.createElement('div');
  lb.id = 'gallery-lightbox';
  lb.className = 'lb-backdrop';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Visualizar imagem');
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML = `
    <button class="lb-close" aria-label="Fechar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
    <button class="lb-nav lb-prev" aria-label="Anterior">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <button class="lb-nav lb-next" aria-label="Próximo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 6 15 12 9 18"/>
      </svg>
    </button>
    <div class="lb-stage">
      <div class="lb-media"></div>
      <div class="lb-caption">
        <span class="lb-tag"></span>
        <p class="lb-name"></p>
        <p class="lb-desc"></p>
      </div>
    </div>`;
  document.body.appendChild(lb);

  const lbMedia   = $('.lb-media', lb);
  const lbTag     = $('.lb-tag', lb);
  const lbName    = $('.lb-name', lb);
  const lbDesc    = $('.lb-desc', lb);
  const lbClose   = $('.lb-close', lb);
  const lbPrev    = $('.lb-prev', lb);
  const lbNext    = $('.lb-next', lb);

  /* Células abertas no lightbox (só fotos, exclui vídeos) */
  function getPhotoCells() {
    return cells.filter(c =>
      !c.classList.contains('b-cell-video') &&
      !c.classList.contains('is-hidden')
    );
  }

  let lbOpen       = false;
  let lbCurrent    = 0;
  let lbTouchStart = 0;
  let lastFocused  = null;

  function openLb(cell) {
    const photos = getPhotoCells();
    lbCurrent = photos.indexOf(cell);
    if (lbCurrent === -1) return;

    lastFocused = document.activeElement;
    renderLb(lbCurrent);

    lb.setAttribute('aria-hidden', 'false');
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbOpen = true;

    /* Foco no fechar para acessibilidade */
    requestAnimationFrame(() => lbClose.focus());
  }

  function closeLb() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lbOpen = false;
    if (lastFocused) lastFocused.focus();
  }

  function renderLb(idx) {
    const photos  = getPhotoCells();
    const cell    = photos[idx];
    if (!cell) return;

    const img     = $('img', cell);
    const tag     = $('.b-tag', cell)?.textContent  || '';
    const name    = $('.b-name', cell)?.textContent || '';
    const desc    = $('.b-desc', cell)?.textContent || '';

    /* Troca com fade */
    lbMedia.classList.add('swapping');

    setTimeout(() => {
      lbMedia.innerHTML = img
        ? `<img src="${img.src}" alt="${img.alt}">`
        : `<div class="lb-placeholder">${$('.b-ph', cell).innerHTML}</div>`;

      lbTag.textContent  = tag;
      lbName.textContent = name;
      lbDesc.textContent = desc;
      lbDesc.style.display = desc ? '' : 'none';

      lbMedia.classList.remove('swapping');
    }, 150);

    /* Esconde setas se só há 1 foto */
    const alone = photos.length <= 1;
    lbPrev.style.display = alone ? 'none' : '';
    lbNext.style.display = alone ? 'none' : '';
  }

  function lbGo(dir) {
    const photos = getPhotoCells();
    lbCurrent = ((lbCurrent + dir) + photos.length) % photos.length;
    renderLb(lbCurrent);
  }

  /* Eventos do lightbox */
  lbClose.addEventListener('click', closeLb);
  lbPrev.addEventListener('click',  () => lbGo(-1));
  lbNext.addEventListener('click',  () => lbGo(+1));

  lb.addEventListener('click', e => {
    /* Fecha ao clicar no backdrop (fora do stage) */
    if (e.target === lb) closeLb();
  });

  document.addEventListener('keydown', e => {
    if (!lbOpen) return;
    if (e.key === 'Escape')     closeLb();
    if (e.key === 'ArrowLeft')  lbGo(-1);
    if (e.key === 'ArrowRight') lbGo(+1);
  });

  /* Swipe mobile no lightbox */
  lb.addEventListener('touchstart', e => {
    lbTouchStart = e.touches[0].clientX;
  }, { passive: true });

  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - lbTouchStart;
    if (Math.abs(dx) > 44) lbGo(dx < 0 ? +1 : -1);
  }, { passive: true });

  /* Abre lightbox ao clicar em células de foto */
  cells.forEach(cell => {
    if (cell.classList.contains('b-cell-video')) return;

    cell.setAttribute('tabindex', '0');
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label',
      `Ver ${$('.b-name', cell)?.textContent || 'imagem'}`
    );

    cell.addEventListener('click', () => openLb(cell));
    cell.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(cell); }
    });
  });

})();

/* ════════════════════════════════════════
   BOOKING
════════════════════════════════════════ */
const bookingBar       = $('#booking-bar');
const bookingTotal     = $('#booking-total');
const bookingDropTotal = $('#booking-dropdown-total');
const bookingDropList  = $('#booking-dropdown-list');
const bookingSummary   = $('#booking-summary-text');
const bookingDuration  = $('#booking-duration-text');
const cartBadge        = $('#cart-badge');
const cartBtn          = $('#booking-cart-btn');
const clearBtn         = $('#booking-clear-btn');
const dropdown         = $('#booking-dropdown');
const stickyCta        = $('#sticky-cta');

const selected = new Map();
let dropdownOpen = false;
let hideBarTimer = null;

/* ── Formata preço ── */
const fmtPrice = n => 'R$\u00a0' + n.toLocaleString('pt-BR');

/* ── Formata duração total (minutos → "1h 30min" ou "45 min") ── */
function fmtDuration(mins) {
  if (mins === 0) return '0 min';
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

/* ── Extrai minutos de uma string como "60 min" ── */
function parseMins(durStr) {
  return parseInt(durStr, 10) || 0;
}

/* ── Anima total (preço) ── */
function animTotal(el, to) {
  const from = parseFloat(el.dataset.current || 0);
  el.dataset.current = to;
  const dur = 200, t0 = performance.now();
  (function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = fmtPrice(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 2))));
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

/* ── Badge ── */
function updateBadge(n) {
  cartBadge.textContent = n;
  cartBadge.setAttribute('aria-label', `${n} ${n === 1 ? 'item' : 'itens'}`);
  cartBadge.classList.remove('bump');
  void cartBadge.offsetWidth;
  cartBadge.classList.add('bump');
}

/* ── Resumo na barra ── */
function updateSummary() {
  const items = [...selected.values()];
  bookingSummary.textContent = !items.length ? ''
    : items.length === 1 ? items[0].name
    : `${items[0].name} e mais ${items.length - 1}...`;
}

/* ── Totais: preço + duração ── */
function updateTotals() {
  const total = [...selected.values()].reduce((a, s) => a + s.price, 0);
  const mins  = [...selected.values()].reduce((a, s) => a + parseMins(s.dur), 0);
  animTotal(bookingTotal, total);
  animTotal(bookingDropTotal, total);
  if (bookingDuration) bookingDuration.textContent = fmtDuration(mins);
}

/* ── Linha no dropdown ── */
function addDropItem(id, name, price, dur) {
  const li = document.createElement('li');
  li.className = 'booking-drop-item';
  li.dataset.dropId = id;
  li.style.animationDelay = `${(selected.size - 1) * 30}ms`;
  li.innerHTML = `
    <div class="drop-item-left">
      <button class="drop-item-remove" aria-label="Remover ${name}">×</button>
      <span class="drop-item-name">${name}</span>
    </div>
    <div class="drop-item-right">
      <span class="drop-item-dur">${dur}</span>
      <span class="drop-item-price">${fmtPrice(price)}</span>
    </div>`;
  li.querySelector('.drop-item-remove').addEventListener('click', e => {
    e.stopPropagation();
    removeService(id);
  });
  bookingDropList.appendChild(li);
}

function removeDropItem(id) {
  const li = bookingDropList.querySelector(`[data-drop-id="${id}"]`);
  if (!li) return;
  li.classList.add('removing');
  li.addEventListener('animationend', () => li.remove(), { once: true });
}

/* ── Remove serviço individual ── */
function removeService(id) {
  if (!selected.has(id)) return;
  const card = $(`[data-id="${id}"]`);
  if (card) { card.classList.remove('selected'); card.setAttribute('aria-pressed', 'false'); }
  selected.delete(id);
  removeDropItem(id);
  updateBadge(selected.size);
  updateSummary();
  updateTotals();
  if (selected.size === 0) { closeDropdown(); hideBar(); }
}

/* ── Toggle card ── */
function toggleCard(card) {
  const { id, name, price, dur } = card.dataset;
  if (selected.has(id)) {
    removeService(id);
  } else {
    card.classList.add('selected');
    card.setAttribute('aria-pressed', 'true');
    selected.set(id, { name, price: parseInt(price, 10), dur });
    addDropItem(id, name, parseInt(price, 10), dur);
    updateBadge(selected.size);
    updateSummary();
    updateTotals();
    if (selected.size === 1) showBar();
  }
}

/* ── Sticky CTA — estado centralizado ── */
function setStickyCtaVisible(visible) {
  if (!stickyCta) return;
  stickyCta.style.opacity = visible ? '1' : '0';
  stickyCta.style.pointerEvents = visible ? 'all' : 'none';
}

/* ── Barra ── */
function showBar() {
  if (hideBarTimer) { clearTimeout(hideBarTimer); hideBarTimer = null; }
  bookingBar.classList.add('visible');
  setStickyCtaVisible(false);
}
function hideBar() {
  bookingBar.classList.remove('visible');
  hideBarTimer = setTimeout(() => {
    hideBarTimer = null;
    if (selected.size === 0) setStickyCtaVisible(true);
  }, 320);
}

/* ── Dropdown ── */
function openDropdown() {
  dropdownOpen = true;
  dropdown.classList.add('open');
  dropdown.setAttribute('aria-hidden', 'false');
  cartBtn.setAttribute('aria-expanded', 'true');
}
function closeDropdown() {
  dropdownOpen = false;
  dropdown.classList.remove('open');
  dropdown.setAttribute('aria-hidden', 'true');
  cartBtn.setAttribute('aria-expanded', 'false');
}

/* ── Botão carrinho ── */
let skipClose = false;
cartBtn.addEventListener('click', () => {
  if (selected.size === 0) return;
  skipClose = true;
  dropdownOpen ? closeDropdown() : openDropdown();
});

/* ── Botão cancelar tudo ── */
clearBtn.addEventListener('click', () => {
  [...selected.keys()].forEach(id => removeService(id));
});

/* ── Fechar dropdown ao clicar fora ── */
document.addEventListener('click', e => {
  if (skipClose) { skipClose = false; return; }
  if (!dropdownOpen) return;
  if (!bookingBar.contains(e.target)) closeDropdown();
});

/* ── Fechar dropdown com Escape ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && dropdownOpen) closeDropdown();
});

/* ── Cards de serviço ── */
$$('.svc-card').forEach(card => {
  card.addEventListener('click', () => toggleCard(card));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(card); }
  });
});

/* ── Sticky CTA — some ao chegar na seção final ── */
const ctaFinal = $('.cta-final');
if (stickyCta && ctaFinal) {
  new IntersectionObserver(([e]) => {
    if (selected.size === 0) {
      setStickyCtaVisible(!e.isIntersecting);
    }
  }).observe(ctaFinal);
}

/* ════════════════════════════════════════
   MAPA DE LOCALIZAÇÃO — Leaflet + CartoDB
   (gratuito, sem API key)
════════════════════════════════════════ */
(function () {
  "use strict";

  // TROQUE pelas coordenadas reais do seu endereço.
  // Como pegar: abra o local no Google Maps, clique com o botão direito
  // no pin exato e copie os números que aparecem (lat, lng).
  const LOCATION = {
    lat: -23.5530,
    lng: -46.6620,
    name: "InBarber Barbearia",
    address: "Rua Augusta, 1200 — Consolação, São Paulo / SP",
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=Rua+Augusta+1200+São+Paulo",
  };

  const mapEl = document.getElementById("loc-map");
  const expandBtn = document.getElementById("loc-map-expand");
  if (!mapEl || typeof L === "undefined") return;

  const map = L.map(mapEl, {
    center: [LOCATION.lat, LOCATION.lng],
    zoom: 15,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    attributionControl: false,
  });

  // Tile escuro gratuito (CartoDB Dark Matter) — combina com a paleta do site
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }
  ).addTo(map);

  // Pin customizado (sem ping, sem pulse)
  const goldIcon = L.divIcon({
    className: "loc-pin-icon",
    html: `
      <div style="
        width: 14px; height: 14px;
        border-radius: 50%;
        background: var(--gold, #bfa06a);
        border: 2px solid #0a0a0a;
        box-shadow: 0 0 0 1px rgba(191,160,106,0.4);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });

  const marker = L.marker([LOCATION.lat, LOCATION.lng], { icon: goldIcon }).addTo(map);

  marker.bindPopup(`
    <div class="map-popup">
      <div class="map-popup-title">${LOCATION.name}</div>
      <div class="map-popup-address">${LOCATION.address}</div>
      <a class="map-popup-link" href="${LOCATION.mapsUrl}" target="_blank" rel="noopener">Traçar rota →</a>
    </div>
  `);

  // Liga/desliga a interação ao clicar em "Interagir"
  if (expandBtn) {
    let interactive = false;

    expandBtn.addEventListener("click", function () {
      interactive = !interactive;
      mapEl.classList.toggle("is-static", !interactive);

      if (interactive) {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.touchZoom.enable();
        map.zoomControl.addTo(map);
        expandBtn.textContent = "";
        expandBtn.innerHTML = `
          <svg viewBox="0 0 18 18" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l8 8M13 5l-8 8"/></svg>
          Fechar
        `;
      } else {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoom.disable();
        map.zoomControl.remove();
        expandBtn.innerHTML = `
          <svg viewBox="0 0 18 18" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2h5v5M7 16H2v-5M16 2l-6 6M2 16l6-6"/></svg>
          Interagir
        `;
      }
    });
  }

  // Garante que o mapa renderize certo dentro do grid responsivo
  window.addEventListener("resize", function () {
    map.invalidateSize();
  });

  // Reabre o tamanho correto após fontes/layout assentarem
  setTimeout(function () {
    map.invalidateSize();
  }, 300);
})();
/* ════════════════════════════════════════
   NAVEGAÇÃO → PÁGINA DE SERVIÇOS
   
   Lógica:
   - Todos os botões "Agendar" da página principal 
     redirecionam para servicos.html
   - Se há serviços selecionados no booking bar,
     eles são salvos no sessionStorage e restaurados
     na página de serviços
   - Ao voltar, o sessionStorage é lido e os cards
     voltam ao estado selecionado
════════════════════════════════════════ */
(function initAgendarNavigation() {
  "use strict";

  const SVC_KEY = 'svc_selected';

  /* ── Serializa o estado atual do booking bar ── */
  function persistSelected() {
    try {
      const entries = [...selected.entries()];
      sessionStorage.setItem(SVC_KEY, JSON.stringify(entries));
    } catch (_) {}
  }

  /* ── Restaura estado salvo na sessionStorage (vindo da página de serviços) ── */
  function restoreFromSession() {
    try {
      const raw = sessionStorage.getItem(SVC_KEY);
      if (!raw) return;
      const entries = JSON.parse(raw);
      if (!entries || !entries.length) return;

      entries.forEach(([id, data]) => {
        /* Só restaura se ainda não estiver selecionado */
        if (selected.has(id)) return;

        const card = document.querySelector(`[data-id="${id}"]`);
        if (!card) return;

        selected.set(id, data);
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');

        /* Recria o item no dropdown */
        addDropItem(id, data.name, data.price, data.dur);
      });

      if (selected.size > 0) {
        updateBadge(selected.size);
        updateSummary();
        updateTotals();
        showBar();
      }
    } catch (_) {}
  }

  /* ── Navega para a página de serviços ── */
  function goToServices(e) {
    e.preventDefault();
    persistSelected();
    window.location.href = 'servicos.html';
  }

  /* ── Conecta todos os botões "Agendar" ─────────────────────────
     Seleciona: 
       • .btn-fill    (hero + CTA final)
       • .nav-cta     (nav bar)
       • .btn-fill-dark (seção CTA final)
       • .booking-bar-cta (barra flutuante)
       • .sticky-cta a (mobile)
       • .map-cta-primary (seção de mapa — se apontar para #agendar)
  ────────────────────────────────────────────────────────────── */
  const agendarSelectors = [
    'a.btn-fill[href="#agendar"]',
    'a.nav-cta[href="#agendar"]',
    'a.btn-fill-dark[href="#agendar"]',
    '#booking-bar-cta',
    '.sticky-cta a',
    '.map-cta-primary',
  ];

  agendarSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.addEventListener('click', goToServices);
    });
  });

  /* ── Restaura ao carregar (caso esteja voltando da página de serviços) ── */
  restoreFromSession();

})();