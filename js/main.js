const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

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
   GALERIA touch (grade)
════════════════════════════════════════ */
if (window.matchMedia('(hover: none)').matches) {
  $$('.g-overlay').forEach(el => {
    el.style.opacity = '0.4';
  });
}

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