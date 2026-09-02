(function () {
  "use strict";

  /* ════════════════════════════════════════
     DADOS
  ════════════════════════════════════════ */
    // Barbeiros carregados da API (listBarbers). Preenchido no init().
  // O objeto 'qualquer' é sintético — nunca vem do back-end.
  let BARBERS_MAP = {};   // id → objeto barbeiro (API + campos extras de UI)

  const BARBER_QUALQUER = {
    id: 'qualquer',
    name: 'Sem preferência', initial: '',
    rating: null, ratingCount: null,
    cortes: null, clientes: null, anos: null,
    role: 'Primeiro disponível',
    langs: [], bio: '', portfolio: [], ratingDist: {}, reviews: [],
  };

  /* ════════════════════════════════════════
     ESTADO
  ════════════════════════════════════════ */
  let selectedId = null;
  let openBarber = null;
  let activeTab  = 'perfil';
  const TABS = ['perfil', 'portfolio', 'avaliacoes'];

  /* ════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════ */
  const starsHTML = n => Array.from({ length: n }, () =>
    `<svg viewBox="0 0 12 12"><path d="M6 1l1.3 2.7L10 4.1 7.8 6.3l.5 3.1L6 8l-2.3 1.4.5-3.1L2 4.1l2.7-.4z" fill="var(--gold)"/></svg>`
  ).join('');

  const fmtRating = n => n !== null ? n.toFixed(1).replace('.', ',') : '';

  const reviewHTML = r => `
    <li class="review-item">
      <div class="review-header">
        <div class="review-avatar">${r.init}</div>
        <div class="review-meta">
          <p class="review-author">${r.name}</p>
          <p class="review-date">${r.date}</p>
        </div>
      </div>
      <div class="review-stars">${starsHTML(r.stars)}</div>
      ${r.text ? `<p class="review-text">${r.text}</p>` : ''}
    </li>`;

  const portfolioItemHTML = (item, i) => `
    <div class="portfolio-item" data-idx="${i}" role="button" tabindex="0" aria-label="Ver: ${item.label}">
      <div class="portfolio-placeholder">${item.label}</div>
      <span class="portfolio-item-label">${item.label}</span>
    </div>`;

  /* ════════════════════════════════════════
     PERSISTÊNCIA
  ════════════════════════════════════════ */
  function persist() {
    try {
      if (selectedId) {
        sessionStorage.setItem('barber_selected', selectedId);
        const b = BARBERS_MAP[selectedId] || BARBER_QUALQUER;
        sessionStorage.setItem('selected_barber', JSON.stringify({
          id: selectedId,
          name: b.name,
          role: b.role || '',
        }));
      } else {
        sessionStorage.removeItem('barber_selected');
        sessionStorage.removeItem('selected_barber');
      }
    } catch (_) {}
  }
  function restore() {
    try {
      const id = sessionStorage.getItem('barber_selected');
      if (id && (BARBERS_MAP[id] || id === 'qualquer')) selectBarber(id, false);
    } catch (_) {}
  }

  /* ════════════════════════════════════════
     SELECIONAR
  ════════════════════════════════════════ */
  function selectBarber(id, save = true) {
    document.querySelectorAll('.barber-card').forEach(c => {
      c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false');
    });
    const card = document.querySelector(`.barber-card[data-id="${id}"]`);
    if (card) { card.classList.add('selected'); card.setAttribute('aria-pressed', 'true'); }
    selectedId = id;
    const b = id === 'qualquer' ? BARBER_QUALQUER : (BARBERS_MAP[id] || {});
    document.getElementById('bar-name').textContent = b.name || id;
    document.getElementById('bar-sub').textContent  = id === 'qualquer' ? 'Primeiro horário disponível' : (b.role || '');
    document.getElementById('summary-bar').classList.add('visible');
    if (openBarber) updateProfileSelectBtn();
    if (save) persist();
  }

  /* ════════════════════════════════════════
     TABS
  ════════════════════════════════════════ */
  function switchTab(tab, skipScroll) {
    activeTab = tab;
    const idx  = TABS.indexOf(tab);
    const btns = document.querySelectorAll('.tab-btn');
    const ind  = document.getElementById('tab-indicator');

    btns.forEach((b, i) => {
      b.classList.toggle('tab-btn--active', i === idx);
      b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
    });

    /* Indicador dourado */
    const activeBtn = btns[idx];
    if (ind && activeBtn) {
      const pRect = activeBtn.closest('.profile-tabs').getBoundingClientRect();
      const bRect = activeBtn.getBoundingClientRect();
      ind.style.left  = (bRect.left - pRect.left) + 'px';
      ind.style.width = bRect.width + 'px';
    }

    /* Mostrar / esconder painéis */
    TABS.forEach(t => {
      const panel = document.getElementById('tab-' + t);
      if (panel) panel.classList.toggle('tab-panel--hidden', t !== tab);
    });

    /* Scroll ao topo da área de conteúdo ao trocar tab */
    if (!skipScroll) {
      const scroll = document.getElementById('sheet-scroll');
      const tabs   = document.querySelector('.profile-tabs');
      if (scroll && tabs) {
        scroll.scrollTo({ top: tabs.offsetTop - 60, behavior: 'smooth' });
      }
    }
  }

  function initIndicator() {
    const ind = document.getElementById('tab-indicator');
    if (ind) ind.style.transition = 'none';
    switchTab('perfil', true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (ind) ind.style.transition = '';
    }));
  }

  /* ════════════════════════════════════════
     ABRIR PERFIL
  ════════════════════════════════════════ */
  function openProfile(id) {
    const b = id === 'qualquer' ? BARBER_QUALQUER : (BARBERS_MAP[id] || {});
    openBarber = id;

    /* Hero */
    const avatarEl = document.getElementById('profile-avatar-ph');
    if (b.photo) {
      avatarEl.outerHTML = `<img src="${b.photo}" class="profile-avatar-img" id="profile-avatar-ph" alt="${b.name}">`;
    } else {
      avatarEl.textContent = b.initial;
    }
    document.getElementById('profile-name').textContent        = b.name;
    document.getElementById('profile-role-tag').textContent    = b.role;
    document.getElementById('profile-stars').innerHTML         = b.rating ? starsHTML(Math.round(b.rating)) : '';
    document.getElementById('profile-rating-num').textContent  = fmtRating(b.rating);
    document.getElementById('profile-rating-count').textContent = b.ratingCount ? `(${b.ratingCount} avaliações)` : '';

    /* Stats */
    document.getElementById('ps-cortes').textContent   = b.cortes   !== null ? b.cortes   : '—';
    document.getElementById('ps-clientes').textContent = b.clientes  !== null ? b.clientes  : '—';
    document.getElementById('ps-anos').textContent     = b.anos     !== null ? b.anos + 'a' : '—';

    /* ── Tab Perfil ── */
    document.getElementById('profile-bio').textContent   = b.bio;
    document.getElementById('profile-langs').innerHTML   = b.langs.map(l => `<span class="lang-pill">${l}</span>`).join('');

    /* Portfólio inline (3 primeiros) */
    const inlineGrid = document.getElementById('portfolio-inline');
    inlineGrid.innerHTML = b.portfolio.slice(0, 3).map(portfolioItemHTML).join('');
    bindPortfolioItems(inlineGrid, b);

    /* Reviews inline (2 primeiros com texto) */
    const inlineRevs = b.reviews.filter(r => r.text).slice(0, 2);
    document.getElementById('profile-reviews-inline').innerHTML =
      (inlineRevs.length ? inlineRevs : b.reviews.slice(0, 2)).map(reviewHTML).join('');

    /* ── Tab Portfólio ── */
    const grid = document.getElementById('portfolio-grid');
    grid.innerHTML = b.portfolio.map(portfolioItemHTML).join('');
    bindPortfolioItems(grid, b);

    /* ── Tab Avaliações ── */
    buildRatingSummary(b);
    document.getElementById('profile-reviews').innerHTML = b.reviews.map(reviewHTML).join('');

    updateProfileSelectBtn();
    initIndicator();

    document.getElementById('profile-overlay').classList.add('open');
    document.getElementById('sheet-scroll').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  function closeProfile() {
    document.getElementById('profile-overlay').classList.remove('open');
    document.body.style.overflow = '';
    openBarber = null;
    closeLightbox();
  }

  /* ════════════════════════════════════════
     PORTFÓLIO — LIGHTBOX
  ════════════════════════════════════════ */
  function bindPortfolioItems(container, b) {
    container.querySelectorAll('.portfolio-item').forEach(el => {
      const handler = () => openLightbox(b, parseInt(el.dataset.idx));
      el.addEventListener('click', handler);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
      });
    });
  }

  function openLightbox(b, idx) {
    const item = b.portfolio[idx]; if (!item) return;
    document.getElementById('lightbox-img').textContent     = item.label;
    document.getElementById('lightbox-caption').textContent = item.label + ' — ' + b.name;
    const lb = document.getElementById('portfolio-lightbox');
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    const lb = document.getElementById('portfolio-lightbox');
    if (lb) { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); }
  }

  /* ════════════════════════════════════════
     RATING SUMMARY
  ════════════════════════════════════════ */
  function buildRatingSummary(b) {
    const el = document.getElementById('rating-summary');
    if (!b.ratingCount) { el.innerHTML = ''; return; }
    const total = Object.values(b.ratingDist).reduce((a, v) => a + v, 0);
    const bars  = [5, 4, 3, 2, 1].map(star => {
      const cnt = b.ratingDist[star] || 0;
      const pct = total ? Math.round((cnt / total) * 100) : 0;
      return `<div class="rating-bar-row">
        <span class="rating-bar-label">${star}</span>
        <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
        <span class="rating-bar-pct">${pct}%</span>
      </div>`;
    }).join('');
    el.innerHTML = `
      <div class="rating-big">
        <span class="rating-big-num">${fmtRating(b.rating)}</span>
        <div class="rating-big-stars">${starsHTML(Math.round(b.rating))}</div>
        <span class="rating-big-count">${b.ratingCount} avaliações</span>
      </div>
      <div class="rating-bars">${bars}</div>`;
  }

  /* ════════════════════════════════════════
     CTA
  ════════════════════════════════════════ */
  function updateProfileSelectBtn() {
    const btn = document.getElementById('profile-select-btn');
    const ico = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,8 6.5,11.5 13,4.5"/></svg>`;
    if (selectedId === openBarber) {
      btn.classList.add('already-selected');
      btn.innerHTML = ico + ' Selecionado';
    } else {
      btn.classList.remove('already-selected');
      btn.innerHTML = ico + ' Selecionar este barbeiro';
    }
  }

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {

    /* ── helpers de render de card ── */
    function initials(name) {
      return (name || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    }

    function renderBarberCard(b) {
      const ini = initials(b.name);
      const ratingStr = b.rating != null ? b.rating.toFixed(1).replace('.', ',') : '';

      const li = document.createElement('li');
      li.className = 'barber-card';
      li.setAttribute('role', 'listitem');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-pressed', 'false');
      li.dataset.id = b.id;

      li.innerHTML = `
        <div class="barber-check" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <polyline points="3,8 6.5,11.5 13,4.5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="avatar-wrap" data-id="${b.id}" role="button"
             aria-label="Ver perfil de ${b.name}" tabindex="0">
          <div class="avatar-initials">${ini}</div>
          ${ratingStr ? `
          <div class="avatar-rating">
            <svg viewBox="0 0 12 12">
              <path d="M6 1l1.3 2.7L10 4.1 7.8 6.3l.5 3.1L6 8l-2.3 1.4.5-3.1L2 4.1l2.7-.4z"/>
            </svg>${ratingStr}
          </div>` : ''}
        </div>
        <p class="barber-name">${b.name}</p>
        <p class="barber-role">${b.role || ''}</p>
        <div class="barber-stats">
          <span class="barber-stat">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/>
            </svg>${b.cortes != null ? b.cortes + ' cortes' : ''}
          </span>
          <span class="barber-stat">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2l3 2 3-2h2a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
            </svg>${b.ratingCount != null ? b.ratingCount + ' av.' : ''}
          </span>
        </div>`;

      return li;
    }

    function renderQualquerCard() {
      const b = BARBER_QUALQUER;
      const li = document.createElement('li');
      li.className = 'barber-card barber-card--any';
      li.setAttribute('role', 'listitem');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-pressed', 'false');
      li.dataset.id = 'qualquer';

      li.innerHTML = `
        <div class="barber-check" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none">
            <polyline points="3,8 6.5,11.5 13,4.5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="avatar-wrap avatar-wrap--static" aria-hidden="true">
          <div class="avatar-initials avatar-initials--any">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="7" r="3"/>
              <path d="M3 19c0-3.3 2.7-6 6-6"/>
              <circle cx="16" cy="7" r="3" opacity=".5"/>
              <path d="M13 19c0-3.3 2.7-6 6-6" opacity=".5"/>
              <path d="M19 13l2 2-2 2" stroke-width="1.2"/>
              <path d="M5 15h4" stroke-width="1.2" opacity=".5"/>
            </svg>
          </div>
        </div>
        <p class="barber-name barber-name--sm">${b.name}</p>
        <p class="barber-role">${b.role}</p>
        <div class="barber-stats">
          <span class="barber-stat barber-stat--hint">qualquer horário</span>
        </div>`;

      return li;
    }

    function bindCard(li) {
      const id = li.dataset.id;
      li.addEventListener('click', e => {
        if (e.target.closest('.avatar-wrap[data-id]')) return;
        if (id) selectBarber(id);
      });
      li.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (id) selectBarber(id); }
      });

      const avatarWrap = li.querySelector('.avatar-wrap[data-id]');
      if (avatarWrap) {
        avatarWrap.addEventListener('click', e => { e.stopPropagation(); openProfile(id); });
        avatarWrap.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openProfile(id); }
        });
      }
    }

    function renderBarbers(barbers) {
      const grid = document.getElementById('barbers-grid');
      if (!grid) return;
      grid.innerHTML = '';

      barbers.forEach(b => {
        // Normaliza campos da API para o shape interno
        BARBERS_MAP[b.id] = {
          id: b.id,
          name: b.nome || b.name || '',
          initial: (b.nome || b.name || ' ')[0].toUpperCase(),
          rating: b.rating != null ? parseFloat(b.rating) : null,
          ratingCount: b.ratingCount || b.rating_count || null,
          cortes: b.cortes || b.agendamentos_concluidos || null,
          clientes: b.clientes || null,
          anos: b.anos || null,
          role: b.role || b.cargo || '',
          photo: b.photo || b.foto || null,
          langs: b.langs || [],
          bio: b.bio || '',
          portfolio: b.portfolio || [],
          ratingDist: b.ratingDist || b.rating_dist || {},
          reviews: b.reviews || [],
        };

        const li = renderBarberCard(BARBERS_MAP[b.id]);
        bindCard(li);
        grid.appendChild(li);
      });

      // Card "Sem preferência" — sempre por último, sintético
      const anyLi = renderQualquerCard();
      grid.appendChild(anyLi);
      // Não tem avatar clicável — só seleciona
      anyLi.addEventListener('click', () => selectBarber('qualquer'));
      anyLi.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectBarber('qualquer'); }
      });
    }

    /* Tabs */
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.addEventListener('click', () => switchTab(btn.dataset.tab))
    );

    /* Botões "Ver todos" na tab Perfil */
    document.getElementById('goto-portfolio').addEventListener('click',  () => switchTab('portfolio'));
    document.getElementById('goto-avaliacoes').addEventListener('click', () => switchTab('avaliacoes'));

    /* Fechar sheet */
    document.getElementById('sheet-close').addEventListener('click', closeProfile);
    document.getElementById('profile-overlay').addEventListener('click', e => {
      if (e.target === document.getElementById('profile-overlay')) closeProfile();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const lb = document.getElementById('portfolio-lightbox');
        if (lb && lb.classList.contains('open')) { closeLightbox(); return; }
        if (document.getElementById('profile-overlay').classList.contains('open')) closeProfile();
      }
    });

    /* Lightbox fechar */
    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);

    /* Selecionar no sheet */
    document.getElementById('profile-select-btn').addEventListener('click', () => {
      if (openBarber) selectBarber(openBarber);
      closeProfile();
    });

    /* Confirmar */
    document.getElementById('summary-cta').addEventListener('click', () => {
      if (!selectedId) return;
      persist();
      window.location.href = 'agendar.html';
    });

    /* Voltar */
    document.getElementById('back-btn').addEventListener('click', () => { persist(); window.location.href = 'servicos.html'; });

    /* ── Carrega barbeiros da API e inicializa ── */
    InBarberAPI.listBarbers()
      .then(barbers => {
        renderBarbers(barbers);
        restore();
      })
      .catch(() => {
        // Fallback: mantém os cards estáticos já no HTML
        document.querySelectorAll('.barber-card').forEach(card => {
          const id = card.dataset.id;
          if (!id) return;
          if (id !== 'qualquer') {
            BARBERS_MAP[id] = { id, name: id, role: '', rating: null, ratingCount: null,
              cortes: null, clientes: null, anos: null, photo: null,
              langs: [], bio: '', portfolio: [], ratingDist: {}, reviews: [] };
          }
          bindCard(card);
        });
        restore();
      });
  });

})();