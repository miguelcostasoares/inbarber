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

    /* ─── mapa serviceId → card DOM (preenchido após renderCards) ─── */
    const cardMap = new Map();

    /* ─── renderiza cards vindos da API ─── */
    function renderCards(services) {
      // Grupos definidos pelo campo `tipo` retornado pela API.
      // Fallback: tipo desconhecido cai em "Outros".
      const GROUPS = [
        { tipo: 'combo',  label: 'Combos' },
        { tipo: 'padrao', label: 'Serviços' },
      ];

      // Agrupa serviços por tipo, preservando a ordem da API
      const byTipo = {};
      services.forEach(s => {
        const t = s.tipo || 'padrao';
        (byTipo[t] = byTipo[t] || []).push(s);
      });

      const pageContent = document.querySelector('.page-content');
      // Remove listas existentes do HTML estático (se houver)
      pageContent.querySelectorAll('.svc-group-label, .svc-list').forEach(el => el.remove());

      GROUPS.forEach(g => {
        const list = byTipo[g.tipo];
        if (!list || list.length === 0) return;

        const label = document.createElement('p');
        label.className = 'svc-group-label';
        label.textContent = g.label;
        pageContent.appendChild(label);

        const ul = document.createElement('ul');
        ul.className = 'svc-list';
        ul.setAttribute('role', 'list');

        list.forEach(s => {
          const durMin = s.duracao_min || 0;
          const durLabel = durMin >= 60
            ? (durMin % 60 === 0 ? `${durMin / 60}h` : `${Math.floor(durMin / 60)}h ${durMin % 60}min`)
            : `${durMin} min`;
          const priceLabel = 'R$ ' + Number(s.preco || 0).toLocaleString('pt-BR');
          const badgeHTML = s.tipo === 'combo'
            ? `<span class="svc-badge">Combo</span>` : '';

          const li = document.createElement('li');
          li.className = 'svc-card';
          li.setAttribute('role', 'listitem');
          li.setAttribute('tabindex', '0');
          li.setAttribute('aria-pressed', 'false');
          // Guarda os dados normalizados no elemento
          li.dataset.id    = s.id;
          li.dataset.name  = s.nome || s.name || '';
          li.dataset.price = String(s.preco || 0);
          li.dataset.dur   = String(durMin);

          li.innerHTML = `
            <div class="svc-card-inner">
              <div class="svc-check" aria-hidden="true">
                <svg class="svc-check-icon" viewBox="0 0 16 16" fill="none">
                  <polyline points="3,8 6.5,11.5 13,4.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="svc-meta">
                ${badgeHTML}
                <h2 class="svc-name">${li.dataset.name}</h2>
                <p class="svc-desc">${s.descricao || ''}</p>
              </div>
              <div class="svc-foot">
                <span class="svc-price">${priceLabel}</span>
                <span class="svc-dur">${durLabel}</span>
              </div>
            </div>`;

          cardMap.set(s.id, li);
          ul.appendChild(li);
        });

        pageContent.appendChild(ul);
        bindCards(ul);
      });
    }

    /* ─── bind de eventos nos cards (aplicado após render) ─── */
    function bindCards(container) {
      container.querySelectorAll('.svc-card').forEach(card => {
        card.addEventListener('click', () => toggleCard(card));
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(card); }
        });
      });
    }

    /* ─── restaura estado do sessionStorage ─── */
    function restore() {
      try {
        const raw = sessionStorage.getItem('svc_selected');
        if (!raw) return;
        const entries = JSON.parse(raw);
        entries.forEach(([id, data]) => {
          selected.set(id, data);
          const card = cardMap.get(id) || document.querySelector(`[data-id="${id}"]`);
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
        // price e dur já vêm normalizados pelo renderCards:
        // price = número inteiro (R$), dur = minutos (número inteiro)
        selected.set(id, { id, name, price: parseInt(price, 10), dur: parseInt(dur, 10) });
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
      }
      persist();
      updateBar();
    }

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

    /* ─── carrega serviços da API e inicializa ─── */
    InBarberAPI.listServices()
      .then(services => {
        renderCards(services);
        restore();
        updateBar();
      })
      .catch(() => {
        // Fallback: ativa os cards estáticos do HTML (se existirem)
        document.querySelectorAll('.svc-card').forEach(card => {
          const { id, name, price, dur } = card.dataset;
          if (id) cardMap.set(id, card);
        });
        bindCards(document);
        restore();
        updateBar();
      });

  });

})();