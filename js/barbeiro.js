(function () {
  "use strict";

  /* ════════════════════════════════════════
     DADOS
  ════════════════════════════════════════ */
  const BARBERS = {
    daniel: {
      name: 'Daniel', initial: 'D',
      /* photo: '/img/barbeiros/daniel.jpg', */
      rating: 5.0, ratingCount: 51,
      cortes: 390, clientes: 194, anos: 4,
      role: 'Sênior · 4 anos',
      langs: ['Inglês', 'Espanhol', 'Francês', 'Português'],
      bio: 'Especialista em cortes clássicos e modernos. Formado pela Academia Nacional de Barbeiros, com passagem por barbearias em Lisboa e Porto. Atenção total ao detalhe e ao que o cliente quer.',
      portfolio: [
        { label: 'Degradê fechado' }, { label: 'Corte + Barba' }, { label: 'Corte Social' },
        { label: 'Fade com risco'  }, { label: 'Hot Towel Shave'}, { label: 'Barba clássica' },
      ],
      ratingDist: { 5: 44, 4: 5, 3: 2, 2: 0, 1: 0 },
      reviews: [
        { init: 'C', name: 'Carlos F',    date: 'qui., 25 jun. 2026', stars: 5, text: '' },
        { init: 'S', name: 'Stéphane L', date: 'qua., 24 jun. 2026', stars: 5, text: 'Fui cortado pelo Daniel e fiquei muito satisfeito. Desde o primeiro momento, o acolhimento foi excelente: simpático, atento e com muito bom ouvido para o que eu queria.' },
        { init: 'R', name: 'Rui I',       date: 'sáb., 20 jun. 2026', stars: 5, text: '' },
        { init: 'P', name: 'Paulo C',     date: 'sex., 19 jun. 2026', stars: 5, text: 'Casa muito acolhedora e com profissionais a trabalhar lindamente, recomendo vivamente a experiência.' },
        { init: 'M', name: 'Miguel A',    date: 'ter., 17 jun. 2026', stars: 4, text: 'Muito bom serviço, só demorou um bocado mais que o esperado.' },
      ],
    },
    rafael: {
      name: 'Rafael', initial: 'R',
      rating: 4.9, ratingCount: 38,
      cortes: 520, clientes: 280, anos: 6,
      role: 'Sênior · 6 anos',
      langs: ['Português', 'Inglês'],
      bio: 'Mestre do fade e especialista em cortes texturizados. Seis anos de experiência em barbearias premium, com foco em atendimento personalizado e técnicas contemporâneas.',
      portfolio: [
        { label: 'Fade alto'  }, { label: 'Texturizado'    }, { label: 'Corte + Barba'  },
        { label: 'Drop fade'  }, { label: 'Risco duplo'    }, { label: 'Barba desenhada' },
      ],
      ratingDist: { 5: 32, 4: 5, 3: 1, 2: 0, 1: 0 },
      reviews: [
        { init: 'A', name: 'André M',  date: 'sex., 26 jun. 2026', stars: 5, text: 'Rafael tem mãos de artista. Fade perfeito, sem marcas, acabamento impecável. Já é o meu barbeiro fixo.' },
        { init: 'L', name: 'Luís B',   date: 'ter., 23 jun. 2026', stars: 5, text: '' },
        { init: 'J', name: 'João F',   date: 'dom., 21 jun. 2026', stars: 5, text: 'Excelente serviço, atendimento top e resultado incrível!' },
        { init: 'T', name: 'Tomás N',  date: 'qui., 18 jun. 2026', stars: 4, text: 'Muito bom, mas o espaço estava cheio nesse dia.' },
      ],
    },
    marcos: {
      name: 'Marcos', initial: 'M',
      rating: 4.8, ratingCount: 22,
      cortes: 210, clientes: 130, anos: 3,
      role: 'Pleno · 3 anos',
      langs: ['Português', 'Espanhol'],
      bio: 'Dedicado e criterioso em cada detalhe. Três anos de experiência com foco em cortes sociais e barba clássica. Sempre com boa conversa e ambiente descontraído.',
      portfolio: [
        { label: 'Corte Social'     }, { label: 'Barba clássica' }, { label: 'Sobrancelha'     },
        { label: 'Corte texturizado'}, { label: 'Navalha reta'   }, { label: 'Pigmentação'     },
      ],
      ratingDist: { 5: 17, 4: 4, 3: 1, 2: 0, 1: 0 },
      reviews: [
        { init: 'T', name: 'Tiago R',   date: 'qui., 25 jun. 2026', stars: 5, text: 'Muito profissional e cuidadoso com os detalhes. Saí muito satisfeito.' },
        { init: 'G', name: 'Gabriel S', date: 'seg., 22 jun. 2026', stars: 5, text: '' },
        { init: 'N', name: 'Nuno P',    date: 'sáb., 14 jun. 2026', stars: 4, text: 'Bom trabalho, ainda a ganhar experiência mas nota-se dedicação.' },
      ],
    },
    qualquer: {
      name: 'Sem preferência', initial: '',
      rating: null, ratingCount: null,
      cortes: null, clientes: null, anos: null,
      role: 'Primeiro disponível',
      langs: [], bio: '', portfolio: [], ratingDist: {}, reviews: [],
    },
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
        // Formato lido pelo agendar.js
        const b = BARBERS[selectedId];
        sessionStorage.setItem('selected_barber', JSON.stringify({
          id: selectedId,
          name: b ? b.name : selectedId
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
      if (id && BARBERS[id]) selectBarber(id, false);
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
    const b = BARBERS[id];
    document.getElementById('bar-name').textContent = b.name;
    document.getElementById('bar-sub').textContent  = id === 'qualquer' ? 'Primeiro horário disponível' : b.role;
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
    const b = BARBERS[id];
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

    /* Cards */
    document.querySelectorAll('.barber-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', e => {
        if (e.target.closest('.avatar-wrap[data-id]') || e.target.closest('.view-profile-btn')) return;
        if (id) selectBarber(id);
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (id) selectBarber(id); }
      });
    });

    /* Avatar — abre sheet */
    document.querySelectorAll('.avatar-wrap[data-id]').forEach(el => {
      const id = el.dataset.id; if (!id) return;
      el.addEventListener('click', e => { e.stopPropagation(); openProfile(id); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openProfile(id); }
      });
    });

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

    restore();
  });

})();