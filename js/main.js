const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ── NAV ── */
const nav = $('#nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

/* ── REVEAL ── */
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  });
}, { threshold: 0.08 });
$$('.reveal').forEach(el => revealIO.observe(el));

/* ── CONTADOR HERO ── */
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
  entries.forEach(e => { if (e.isIntersecting) { animCount(e.target); countIO.unobserve(e.target); }});
}, { threshold: 0.6 });
$$('[data-count]').forEach(el => countIO.observe(el));

/* ── GALERIA touch ── */
if (window.matchMedia('(hover: none)').matches) {
  $$('.g-info').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
}

/* ══════════════════════════════════════
   BOOKING
══════════════════════════════════════ */
const bookingBar       = $('#booking-bar');
const bookingTotal     = $('#booking-total');
const bookingDropTotal = $('#booking-dropdown-total');
const bookingDropList  = $('#booking-dropdown-list');
const bookingSummary   = $('#booking-summary-text');
const cartBadge        = $('#cart-badge');
const cartBtn          = $('#booking-cart-btn');
const dropdown         = $('#booking-dropdown');
const stickyCta        = $('#sticky-cta');

const selected = new Map();
let dropdownOpen = false;

/* ── Formata preço ── */
const fmtPrice = n => 'R$\u00a0' + n.toLocaleString('pt-BR');

/* ── Anima total ── */
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

/* ── Resumo ── */
function updateSummary() {
  const items = [...selected.values()];
  bookingSummary.textContent = !items.length ? ''
    : items.length === 1 ? items[0].name
    : `${items[0].name} e mais ${items.length - 1}...`;
}

/* ── Totais ── */
function updateTotals() {
  const total = [...selected.values()].reduce((a, s) => a + s.price, 0);
  animTotal(bookingTotal, total);
  animTotal(bookingDropTotal, total);
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

/* ── Remove serviço ── */
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

/* ── Barra ── */
function showBar() {
  bookingBar.classList.add('visible');
  if (stickyCta) { stickyCta.style.opacity = '0'; stickyCta.style.pointerEvents = 'none'; }
}
function hideBar() {
  bookingBar.classList.remove('visible');
  if (stickyCta) {
    setTimeout(() => { stickyCta.style.opacity = '1'; stickyCta.style.pointerEvents = 'all'; }, 200);
  }
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

/* ── Botão carrinho:
   Sem stopPropagation — usamos flag para ignorar o document.click do mesmo tick ── */
let skipClose = false;
cartBtn.addEventListener('click', () => {
  if (selected.size === 0) return;
  skipClose = true;
  dropdownOpen ? closeDropdown() : openDropdown();
});

document.addEventListener('click', e => {
  if (skipClose) { skipClose = false; return; }
  if (!dropdownOpen) return;
  if (!bookingBar.contains(e.target)) closeDropdown();
});

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

/* ── Sticky CTA ── */
const ctaFinal = $('.cta-final');
if (stickyCta && ctaFinal) {
  new IntersectionObserver(([e]) => {
    if (selected.size === 0) {
      stickyCta.style.opacity = e.isIntersecting ? '0' : '1';
      stickyCta.style.pointerEvents = e.isIntersecting ? 'none' : 'all';
    }
  }).observe(ctaFinal);
}