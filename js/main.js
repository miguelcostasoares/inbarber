/* ── Nav scrolled ── */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });

/* ── Reveal on scroll ── */
const revealEls = document.querySelectorAll('.reveal');
const revealIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
  });
}, { threshold: 0.08 });
revealEls.forEach(el => revealIO.observe(el));

/* ── Stagger serviços ── */
const svcCards = document.querySelectorAll('.svc-card');
const svcIO = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    svcCards.forEach((card, i) => {
      setTimeout(() => card.classList.add('in'), i * 55);
    });
    svcIO.disconnect();
  }
}, { threshold: 0.05 });
svcCards.forEach(c => c.classList.add('reveal'));
if (svcCards.length) svcIO.observe(svcCards[0].closest('section'));

/* ── Contador animado ── */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animCount(el) {
  const raw    = el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const target = parseFloat(raw);
  const isFloat = raw.includes('.');
  const dur = 1500;
  const start = performance.now();

  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const val = target * easeOutCubic(p);
    const display = isFloat ? val.toFixed(1) : Math.round(val).toLocaleString('pt-BR');
    el.textContent = display + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const counters = document.querySelectorAll('[data-count]');
const countIO = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animCount(e.target); countIO.unobserve(e.target); } });
}, { threshold: 0.6 });
counters.forEach(el => countIO.observe(el));

/* ── Sticky CTA: some quando CTA final está visível ── */
const stickyCta = document.querySelector('.sticky-cta');
const ctaFinal  = document.querySelector('.cta-final');
if (stickyCta && ctaFinal) {
  new IntersectionObserver(([e]) => {
    stickyCta.style.opacity       = e.isIntersecting ? '0' : '1';
    stickyCta.style.pointerEvents = e.isIntersecting ? 'none' : 'all';
  }).observe(ctaFinal);
}

/* ── Galeria: info sempre visível no touch ── */
if (window.matchMedia('(hover: none)').matches) {
  document.querySelectorAll('.g-info').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
}