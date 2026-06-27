(function () {
  "use strict";

  /* ─── helpers ─── */
  const fmtPrice = n => 'R$\u00a0' + n.toLocaleString('pt-BR');

  /* ─── estado ─── */
  const selected = new Map();

  /* ─── parse duração ─── */
  function parseMins(str) { return parseInt(str, 10) || 0; }

  function fmtDuration(mins) {
    if (mins === 0) return '0 min';
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  }

  /* ─── anima total ─── */
  function animTotal(el, to) {
    if (!el) return;
    const from = parseFloat(el.dataset.current || 0);
    el.dataset.current = to;
    const dur = 220, t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      el.textContent = fmtPrice(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 2))));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  /* ─── inicializa após DOM pronto ─── */
  document.addEventListener('DOMContentLoaded', function () {

    /* Elementos — buscados só depois do DOM existir */
    const summaryBar      = document.getElementById('summary-bar');
    const summaryEmpty    = document.getElementById('summary-empty');
    const summaryFilled   = document.getElementById('summary-filled');
    const summaryTotal    = document.getElementById('summary-total');
    const summaryServices = document.getElementById('summary-services-text');
    const summaryDur      = document.getElementById('summary-dur-text');
    const summaryCta      = document.getElementById('summary-cta');
    const backBtn         = document.getElementById('back-btn');

    /* ─── atualiza UI da barra ─── */
    function updateBar() {
      const items = [...selected.values()];
      const total = items.reduce((a, s) => a + s.price, 0);
      const mins  = items.reduce((a, s) => a + parseMins(s.dur), 0);

      animTotal(summaryTotal, total);
      if (summaryDur) summaryDur.textContent = fmtDuration(mins);

      if (items.length === 0) {
        if (summaryEmpty)  summaryEmpty.style.display  = '';
        if (summaryFilled) summaryFilled.style.display = 'none';
      } else {
        if (summaryEmpty)  summaryEmpty.style.display  = 'none';
        if (summaryFilled) summaryFilled.style.display = '';
        if (summaryServices) {
          summaryServices.textContent =
            items.length === 1
              ? items[0].name
              : items.length === 2
                ? `${items[0].name} · ${items[1].name}`
                : `${items[0].name} · ${items[1].name} +${items.length - 2}`;
        }
      }

      if (summaryBar) summaryBar.classList.add('visible');
    }

    /* ─── salva estado no sessionStorage ─── */
    function persist() {
      try {
        sessionStorage.setItem('svc_selected', JSON.stringify([...selected.entries()]));
      } catch (_) {}
    }

    /* ─── restaura estado do sessionStorage ─── */
    function restore() {
      try {
        const raw = sessionStorage.getItem('svc_selected');
        if (!raw) return;
        const entries = JSON.parse(raw);
        entries.forEach(([id, data]) => {
          selected.set(id, data);
          const card = document.querySelector(`[data-id="${id}"]`);
          if (card) {
            card.classList.add('selected');
            card.setAttribute('aria-pressed', 'true');
          }
        });
      } catch (_) {}
    }

    /* ─── toggle card ─── */
    function toggleCard(card) {
      const { id, name, price, dur } = card.dataset;
      if (selected.has(id)) {
        selected.delete(id);
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
      } else {
        selected.set(id, { name, price: parseInt(price, 10), dur });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
      }
      persist();
      updateBar();
    }

    /* ─── eventos dos cards ─── */
    document.querySelectorAll('.svc-card').forEach(card => {
      card.addEventListener('click', () => toggleCard(card));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(card); }
      });
    });

    /* ─── botão voltar ─── */
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        persist();
        window.location.href = 'index.html';
      });
    }

    /* ─── CTA agendar → página de barbeiros ─── */
    if (summaryCta) {
      summaryCta.addEventListener('click', () => {
        if (selected.size === 0) return;
        persist();
        window.location.href = 'barbeiro.html';
      });
    }

    /* ─── inicializa ─── */
    restore();
    updateBar();

  });

})();