/* ════════════════════════════════════════════════════════════════
   Corvo Barbearia — app.js  (landing)
   Agendamento por InBarber · InCode

   ⚠ Tudo dentro de um IIFE.
   As constantes deixam de viver no escopo global, por isso este
   ficheiro pode coexistir com outros scripts sem rebentar com
   "Identifier 'x' has already been declared".
════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ════════════════════════════════════════
     i18n
     As traduções vivem em js/i18n.js (carregado antes deste
     ficheiro). Aqui só se lê. Se por alguma razão o módulo não
     carregar, t() devolve o fallback passado e a página continua
     a funcionar em português.
  ════════════════════════════════════════ */
  const t = (key, vars, fallback) =>
    (window.I18N ? window.I18N.t(key, vars) : (fallback !== undefined ? fallback : key));

  const currentLang = () => (window.I18N ? window.I18N.lang : 'pt');
  const localeTag   = () => ({ pt: 'pt-BR', en: 'en-US', es: 'es-ES' }[currentLang()] || 'pt-BR');

  /* ════════════════════════════════════════
     LAZYLIB — carrega bibliotecas de terceiros a pedido

     O Leaflet (mapa) e o Chart.js (sparkline) servem conteúdo que
     está muito abaixo da dobra. Carregá-los no <head> custava
     ~250 KB a toda a gente, incluindo a quem sai antes de chegar
     lá. Agora entram sob IntersectionObserver.

     Cada URL é pedida no máximo uma vez: a promessa fica em cache.
  ════════════════════════════════════════ */
  const LazyLib = (() => {
    const cache = new Map();

    function load(url, kind) {
      if (cache.has(url)) return cache.get(url);

      const promise = new Promise((resolve, reject) => {
        const el = kind === 'css'
          ? Object.assign(document.createElement('link'), { rel: 'stylesheet', href: url })
          : Object.assign(document.createElement('script'), { src: url, async: true });

        el.onload  = () => resolve();
        el.onerror = () => reject(new Error('Falhou a carregar ' + url));
        document.head.appendChild(el);
      });

      cache.set(url, promise);
      return promise;
    }

    return {
      script: url => load(url, 'js'),
      style : url => load(url, 'css'),
      /* Dispara uma vez, quando o alvo se aproxima do viewport */
      whenNear(target, margin, fn) {
        if (!target) return;
        if (!('IntersectionObserver' in window)) { fn(); return; }
        const io = new IntersectionObserver(entries => {
          if (!entries.some(e => e.isIntersecting)) return;
          io.disconnect();
          fn();
        }, { rootMargin: margin || '400px' });
        io.observe(target);
      }
    };
  })();

  const CDN = {
    leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    leafletJs : 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    chartJs   : 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'
  };

  /* ════════════════════════════════════════
     HORÁRIO DE FUNCIONAMENTO — fonte única de verdade
     Alimenta os chips do hero e a linha "termina às" do carrinho.
     Em produção, trocar por uma chamada à agenda real.
  ════════════════════════════════════════ */
  const BUSINESS_HOURS = {
    /* 0 = domingo … 6 = sábado. null = encerrado. */
    0: null,
    1: { open: 9, close: 20 },
    2: { open: 9, close: 20 },
    3: { open: 9, close: 20 },
    4: { open: 9, close: 20 },
    5: { open: 9, close: 20 },
    6: { open: 8, close: 18 }
  };
  const SLOT_MINUTES = 30;

  /* ════════════════════════════════════════
     SCHEDULE — disponibilidade

     Calcula os próximos horários livres a partir do horário de
     funcionamento. Em produção isto passa a ser uma chamada à
     agenda real; a forma da resposta é a mesma, por isso só muda
     o corpo de nextSlots().

     A ocupação abaixo é determinística (semente = dia + hora), para
     que o mockup não mude de horários a cada refresh.
  ════════════════════════════════════════ */
  const Schedule = (() => {

    function isBooked(date) {
      const seed = date.getDate() * 137 + date.getHours() * 31 + date.getMinutes();
      return (seed * 2654435761 % 100) < 45;   /* ~45% ocupado */
    }

    function nextSlots(count) {
      const out = [];
      const cursor = new Date();

      /* Arredonda para o próximo múltiplo de SLOT_MINUTES, com 30 min
         de antecedência mínima para o cliente chegar. */
      cursor.setSeconds(0, 0);
      cursor.setMinutes(cursor.getMinutes() + 30);
      cursor.setMinutes(Math.ceil(cursor.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES);

      /* Procura até 14 dias à frente. */
      for (let guard = 0; guard < 14 * 24 * 4 && out.length < count; guard++) {
        const hours = BUSINESS_HOURS[cursor.getDay()];

        if (!hours) {                       /* encerrado: salta para o dia seguinte */
          cursor.setDate(cursor.getDate() + 1);
          cursor.setHours(0, 0, 0, 0);
          continue;
        }

        const minutesOfDay = cursor.getHours() * 60 + cursor.getMinutes();
        const opens  = hours.open  * 60;
        const closes = hours.close * 60 - 60;   /* último horário: 1h antes de fechar */

        if (minutesOfDay < opens) {
          cursor.setHours(hours.open, 0, 0, 0);
          continue;
        }
        if (minutesOfDay > closes) {
          cursor.setDate(cursor.getDate() + 1);
          cursor.setHours(0, 0, 0, 0);
          continue;
        }

        if (!isBooked(cursor)) out.push({ date: new Date(cursor) });
        cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
      }

      return out;
    }

    function isSameDay(a, b) {
      return a.getFullYear() === b.getFullYear()
          && a.getMonth() === b.getMonth()
          && a.getDate() === b.getDate();
    }

    function dayLabel(date) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (isSameDay(date, now))      return t('slots.today', null, 'Hoje');
      if (isSameDay(date, tomorrow)) return t('slots.tomorrow', null, 'Amanhã');
      return t('day.' + date.getDay(), null, '');
    }

    function timeLabel(date) {
      return date.toLocaleTimeString(localeTag(), {
        hour: '2-digit', minute: '2-digit', hour12: currentLang() === 'en'
      });
    }

    /* ISO local (sem UTC) — é o que a página de agendamento espera */
    function isoLocal(date) {
      const pad = n => String(n).padStart(2, '0');
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
           + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    return { nextSlots, dayLabel, timeLabel, isoLocal };
  })();


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

    /* As pills de idioma são ligadas em js/i18n.js — aqui só se fecha
       o drawer depois da troca, para a pessoa ver a página traduzida. */
    document.addEventListener('i18n:change', () => {
      if (drawer.classList.contains('open')) closeDrawer();
    });
  })();

  /* ════════════════════════════════════════
     NAV
  ════════════════════════════════════════ */
  const nav = $('#nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

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
    const easeOut = x => 1 - Math.pow(1 - x, 3);
    (function step(now) {
      const p = Math.min((now - start) / dur, 1), val = target * easeOut(p);
      el.textContent = (isFloat ? val.toFixed(1) : Math.round(val).toLocaleString(localeTag())) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  /* Se o elemento já ficou para trás (link de âncora, refresh a meio
     da página, voltar atrás no histórico), o IntersectionObserver
     nunca dispara e o número ficava em "0". Nesse caso escreve-se o
     valor final de uma vez — sem animação, mas com o número certo. */
  function settleCount(el) {
    const raw = el.dataset.count, suffix = el.dataset.suffix || '';
    const target = parseFloat(raw), isFloat = raw.includes('.');
    el.textContent = (isFloat ? target.toFixed(1) : target.toLocaleString(localeTag())) + suffix;
  }

  const countIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { animCount(e.target); countIO.unobserve(e.target); }
      else if (e.boundingClientRect.bottom < 0) { settleCount(e.target); countIO.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ════════════════════════════════════════
     AVALIAÇÕES — sparkline + count-up
  ════════════════════════════════════════ */
  (function initReviews() {
    const reviewsSection = document.querySelector('.reviews');
    if (!reviewsSection) return;

    let hasAnimated = false;

    function hexToRgba(hex, alpha) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function initReviewsSparkline() {
      const canvas = document.getElementById('rpSparkline');
      if (!canvas || typeof Chart === 'undefined') return;

      const ctx  = canvas.getContext('2d');
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

    function animateCount(el) {
      const target    = parseFloat(el.dataset.count);
      const suffix    = el.dataset.suffix || '';
      const isDecimal = el.dataset.count.includes('.');
      const duration  = 1400;
      const start     = performance.now();

      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const current  = target * eased;
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

    /* O count-up não depende de biblioteca nenhuma: arranca já.
       O Chart.js só é pedido quando a secção se aproxima — e se
       falhar, o <canvas> mantém o texto alternativo que já lá está. */
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (hasAnimated) return;
        /* Intersecta, ou já ficou acima do viewport (âncora / refresh
           a meio da página): em qualquer dos casos há que resolver. */
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
          hasAnimated = true;
          observer.disconnect();
          initReviewsCountUp();
          LazyLib.script(CDN.chartJs)
            .then(initReviewsSparkline)
            .catch(err => console.warn('[corvo] sparkline:', err.message));
        }
      });
    }, { threshold: 0.3, rootMargin: '300px' });

    observer.observe(reviewsSection);
  })();

  /* ════════════════════════════════════════
     AVALIAÇÕES — "Ver mais"

     As avaliações vêm do backend do próprio site: só recebe o convite
     por email quem tem conta e cujo serviço foi dado como concluído
     pelo profissional. Aqui a lista já vem toda no HTML — os cartões
     além dos quatro primeiros trazem `hidden` e a classe
     .rv-card--extra, e este bloco só os alterna.

     Se um dia a lista crescer ao ponto de não valer a pena servi-la
     inteira, é aqui que entra o fetch da página seguinte: o botão já
     tem o estado (aria-expanded) e o alvo (aria-controls) certos.

     Sem JS o botão nunca aparece — está `hidden` no HTML e é este
     código que o revela. Não fica um controlo morto na página.
  ════════════════════════════════════════ */
  (function initReviewsMore() {
    const track = $('#reviews-track');
    const btn   = $('#rv-more');
    if (!track || !btn) return;

    const extras = $$('.rv-card--extra', track);
    if (!extras.length) return;

    btn.hidden = false;

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';

      extras.forEach((card, i) => {
        card.hidden = open;
        /* Revelados a meio do ecrã, os cartões não podem depender da
           animação de scroll: ficariam parados a zero de opacidade.
           Esta classe troca a timeline de view() para tempo real. */
        card.classList.toggle('is-revealed', !open);
        card.style.animationDelay = open ? '' : (i * 70) + 'ms';
      });

      btn.setAttribute('aria-expanded', String(!open));

      /* Ao abrir, o foco vai para o primeiro cartão novo: quem navega
         por teclado não fica no fim de uma lista que acabou de crescer
         por cima... nem por baixo dele. */
      if (!open) {
        const first = extras[0];
        first.setAttribute('tabindex', '-1');
        first.focus({ preventScroll: true });
      }
    });
  })();

  /* ════════════════════════════════════════
     CAROUSEL BANNER (Galeria)
  ════════════════════════════════════════ */
  (function initCarousel() {
    const carousel = $('#carousel');
    if (!carousel) return;

    const slides     = $$('.carousel-slide', carousel);
    const dots       = $$('.carousel-dot', carousel);
    const progressEl = $('#carousel-progress', carousel);

    const DURATION  = 5000; // ms por slide
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

    const section = $('#galeria');
    if (!section) return;

    const pills = $$('.gf-pill', section);
    const cells = $$('.b-cell', section);

    /* ── Utilitário: categorias de uma célula ── */
    function getCategories(cell) {
      const cats = [cell.dataset.category];
      if (cell.dataset.category2) cats.push(cell.dataset.category2);
      return cats;
    }

    /* ════════════════════════════════════════
       FILTRO DE CATEGORIAS
    ════════════════════════════════════════ */
    function applyFilter(filter) {
      cells.forEach(cell => {
        const match = filter === 'todos' || getCategories(cell).includes(filter);

        if (match) {
          cell.classList.remove('is-hidden');
          cell.removeAttribute('aria-hidden');
        } else {
          cell.classList.add('is-hidden');
          cell.setAttribute('aria-hidden', 'true');
        }
      });
    }

    /* Estes são botões de alternância, não separadores.
       role="tab" sem tabpanel nem aria-controls deixava o leitor de
       ecrã a anunciar "separador 1 de 5" e a procurar um painel que
       não existe. aria-pressed diz a verdade sobre o que são. */
    const liveRegion = $('.gallery-live', section);

    function announce() {
      if (!liveRegion) return;
      const visible = $$('.b-cell', section).filter(c => !c.classList.contains('is-hidden')).length;
      liveRegion.textContent = visible === 1
        ? t('gal.liveOne', null, '')
        : t('gal.live', { n: visible }, '');
    }

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => {
          p.classList.remove('active');
          p.setAttribute('aria-pressed', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-pressed', 'true');

        applyFilter(pill.dataset.filter);
        announce();
      });

      /* Acessibilidade: setas percorrem o grupo de filtros */
      pill.addEventListener('keydown', e => {
        const idx = pills.indexOf(pill);
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

    const lbMedia = $('.lb-media', lb);
    const lbTag   = $('.lb-tag', lb);
    const lbName  = $('.lb-name', lb);
    const lbDesc  = $('.lb-desc', lb);
    const lbClose = $('.lb-close', lb);
    const lbPrev  = $('.lb-prev', lb);
    const lbNext  = $('.lb-next', lb);

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

      requestAnimationFrame(() => lbClose.focus());
    }

    function closeLb() {
      /* devolve o foco antes de esconder */
      if (lb.contains(document.activeElement) && lastFocused) {
        lastFocused.focus({ preventScroll: true });
      }
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lbOpen = false;
    }

    function renderLb(idx) {
      const photos = getPhotoCells();
      const cell   = photos[idx];
      if (!cell) return;

      const img  = $('img', cell);
      const tag  = $('.b-tag', cell)?.textContent  || '';
      const name = $('.b-name', cell)?.textContent || '';
      const desc = $('.b-desc', cell)?.textContent || '';

      /* Troca com fade */
      lbMedia.classList.add('swapping');

      setTimeout(() => {
        lbMedia.innerHTML = img
          ? `<img src="${img.src}" alt="${img.alt}">`
          : `<div class="lb-placeholder">${$('.b-ph', cell)?.innerHTML || ''}</div>`;

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
    lbPrev.addEventListener('click', () => lbGo(-1));
    lbNext.addEventListener('click', () => lbGo(+1));

    lb.addEventListener('click', e => {
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
      cell.setAttribute('aria-label', `Ver ${$('.b-name', cell)?.textContent || 'imagem'}`);

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

  /* ── Janela de tempo ──
     Ninguém agenda por minutos: agenda por janela. Esta linha diz
     a que horas a pessoa sai, a contar do próximo horário livre. */
  const bookingWindow = $('#booking-window');

  function updateWindow(mins) {
    if (!bookingWindow) return;
    if (!mins) { bookingWindow.hidden = true; return; }

    const slot = Schedule.nextSlots(1)[0];
    if (!slot) { bookingWindow.hidden = true; return; }

    const end = new Date(slot.date.getTime() + mins * 60000);
    bookingWindow.hidden = false;
    bookingWindow.textContent = t('book.window', {
      day  : Schedule.dayLabel(slot.date).toLowerCase(),
      start: Schedule.timeLabel(slot.date),
      end  : Schedule.timeLabel(end)
    }, '');
  }

  /* ── Extrai minutos de uma string como "60 min" ── */
  function parseMins(durStr) {
    return parseInt(durStr, 10) || 0;
  }

  /* ── Anima total (preço) ── */
  function animTotal(el, to) {
    if (!el) return;
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
    if (!cartBadge) return;
    cartBadge.textContent = n;
    cartBadge.setAttribute('aria-label', n === 1 ? t('book.item') : t('book.items', { n }));
    cartBadge.classList.remove('bump');
    void cartBadge.offsetWidth;
    cartBadge.classList.add('bump');
  }

  /* ── Resumo na barra ── */
  function updateSummary() {
    if (!bookingSummary) return;
    const items = [...selected.values()];
    bookingSummary.textContent = !items.length ? ''
      : items.length === 1 ? items[0].name
      : t('book.more', { name: items[0].name, n: items.length - 1 });
  }

  /* ── Totais: preço + duração ── */
  function updateTotals() {
    const total = [...selected.values()].reduce((a, s) => a + s.price, 0);
    const mins  = [...selected.values()].reduce((a, s) => a + parseMins(s.dur), 0);
    animTotal(bookingTotal, total);
    animTotal(bookingDropTotal, total);
    if (bookingDuration) bookingDuration.textContent = fmtDuration(mins);
    updateWindow(mins);
  }

  /* ── Linha no dropdown ── */
  function addDropItem(id, name, price, dur) {
    if (!bookingDropList) return;
    const li = document.createElement('li');
    li.className = 'booking-drop-item';
    li.dataset.dropId = id;
    li.style.animationDelay = `${(selected.size - 1) * 30}ms`;
    li.innerHTML = `
      <div class="drop-item-left">
        <button class="drop-item-remove" aria-label="${t('book.remove', { name })}">×</button>
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
    if (!bookingDropList) return;
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

  /* ── Nome visível do cartão ──
     O data-name é a chave estável (vai no sessionStorage e na URL);
     o rótulo que a pessoa lê vem do DOM, que está traduzido. Sem
     isto o carrinho mostrava "Corte + Barba" numa página em inglês. */
  function cardLabel(card) {
    const el = card.querySelector('.svc-name');
    return (el && el.textContent.trim()) || card.dataset.name;
  }

  /* ── Toggle card ── */
  function toggleCard(card) {
    const { id, price, dur } = card.dataset;
    const name = cardLabel(card);
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
    stickyCta.classList.toggle('is-hidden', !visible);
    stickyCta.setAttribute('aria-hidden', String(!visible));
    stickyCta.style.opacity = '';        // limpa estilos inline antigos
    stickyCta.style.pointerEvents = '';
  }

  /* ── Barra ── */
  function showBar() {
    if (!bookingBar) return;
    if (hideBarTimer) { clearTimeout(hideBarTimer); hideBarTimer = null; }
    bookingBar.classList.add('visible');
    setStickyCtaVisible(false);
  }
  function hideBar() {
    if (!bookingBar) return;
    bookingBar.classList.remove('visible');
    hideBarTimer = setTimeout(() => {
      hideBarTimer = null;
      if (selected.size === 0) updateStickyCta();
    }, 320);
  }

  /* ── Dropdown ── */
  function openDropdown() {
    if (!dropdown) return;
    dropdownOpen = true;
    dropdown.removeAttribute('inert');
    dropdown.setAttribute('aria-hidden', 'false');
    dropdown.classList.add('open');
    if (cartBtn) cartBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    if (!dropdown) return;
    dropdownOpen = false;

    /* Devolve o foco ao botão do carrinho ANTES de esconder,
       senão o foco fica preso dentro de um elemento aria-hidden */
    if (cartBtn && dropdown.contains(document.activeElement)) {
      cartBtn.focus({ preventScroll: true });
    }

    dropdown.classList.remove('open');
    dropdown.setAttribute('aria-hidden', 'true');
    dropdown.setAttribute('inert', '');
    if (cartBtn) cartBtn.setAttribute('aria-expanded', 'false');
  }

  /* estado inicial: fechado e fora da ordem de tabulação */
  if (dropdown && !dropdown.classList.contains('open')) {
    dropdown.setAttribute('inert', '');
  }

  /* ── Botão carrinho ── */
  let skipClose = false;
  if (cartBtn) {
    cartBtn.addEventListener('click', () => {
      if (selected.size === 0) return;
      skipClose = true;
      dropdownOpen ? closeDropdown() : openDropdown();
    });
  }

  /* ── Botão cancelar tudo ── */
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      [...selected.keys()].forEach(id => removeService(id));
    });
  }

  /* ── Fechar dropdown ao clicar fora ── */
  document.addEventListener('click', e => {
    if (skipClose) { skipClose = false; return; }
    if (!dropdownOpen) return;
    if (bookingBar && !bookingBar.contains(e.target)) closeDropdown();
  });

  /* ── Fechar dropdown com Escape ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dropdownOpen) closeDropdown();
  });

  /* ── Cards de serviço ──
     Já são <button>: Enter e Espaço vêm do próprio elemento, o
     keydown manual deixou de ser preciso. */
  $$('.svc-card').forEach(card => {
    card.addEventListener('click', () => toggleCard(card));
  });

  /* ── Trocar de idioma redesenha o que já está no carrinho ── */
  document.addEventListener('i18n:change', () => {
    if (!selected.size) return;
    selected.forEach((data, id) => {
      const card = $(`.svc-card[data-id="${id}"]`);
      if (card) data.name = cardLabel(card);
    });
    if (bookingDropList) bookingDropList.textContent = '';
    selected.forEach((data, id) => addDropItem(id, data.name, data.price, data.dur));
    updateBadge(selected.size);
    updateSummary();
    updateTotals();
  });

  /* ── Sticky CTA — zonas mortas ──

     O botão flutuante só faz sentido onde não há outro caminho para
     agendar à vista. Em quatro sítios há:

       .hero        → tem os chips de horário e o botão principal
       #localizacao → tem "Agendar horário" e o WhatsApp
       .cta-final   → é o CTA final, com dois botões
       .footer      → fim da página; o flutuante tapava os links

     Basta uma destas zonas estar no viewport para o botão sair. */
  const deadZones = ['.hero', '#localizacao', '.cta-final', '.footer']
    .map(sel => $(sel))
    .filter(Boolean);

  const visibleZones = new Set();

  function updateStickyCta() {
    if (selected.size > 0) return;           // booking-bar toma conta
    setStickyCtaVisible(visibleZones.size === 0);
  }

  if (stickyCta) {
    const zoneIO = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) visibleZones.add(e.target);
        else visibleZones.delete(e.target);
      });
      updateStickyCta();
    }, { threshold: 0 });

    deadZones.forEach(zone => zoneIO.observe(zone));
  }

  /* ════════════════════════════════════════
     MAPA DE LOCALIZAÇÃO — Leaflet + CartoDB
     (gratuito, sem API key)
  ════════════════════════════════════════ */
  (function initMap() {
    // TROQUE pelas coordenadas reais do seu endereço.
    // Como pegar: abra o local no Google Maps, clique com o botão direito
    // no pin exato e copie os números que aparecem (lat, lng).
    const LOCATION = {
      lat: -23.5530,
      lng: -46.6620,
      name: "Corvo Barbearia",
      address: "Rua Augusta, 1200 — Consolação, São Paulo / SP",
      mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=Rua+Augusta+1200+São+Paulo",
    };

    const mapEl = document.getElementById("loc-map");
    const expandBtn = document.getElementById("loc-map-expand");
    if (!mapEl) return;

    /* O Leaflet (CSS + JS) só é pedido quando o mapa se aproxima do
       viewport. Quem sai antes da secção Localização nunca o paga. */
    LazyLib.whenNear(mapEl, '400px', () => {
      Promise.all([
        LazyLib.style(CDN.leafletCss),
        LazyLib.script(CDN.leafletJs)
      ])
        .then(buildMap)
        .catch(err => {
          console.warn('[corvo] mapa:', err.message);
          mapEl.classList.add('map-failed');
        });
    });

    function buildMap() {
    if (typeof L === "undefined") return;

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
        <a class="map-popup-link" href="${LOCATION.mapsUrl}" target="_blank" rel="noopener">${t('loc.route', null, 'Traçar rota →')}</a>
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
          expandBtn.innerHTML = `
            <svg viewBox="0 0 18 18" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5l8 8M13 5l-8 8"/></svg>
            ${t('loc.close', null, 'Fechar')}
          `;
        } else {
          map.dragging.disable();
          map.scrollWheelZoom.disable();
          map.doubleClickZoom.disable();
          map.touchZoom.disable();
          map.zoomControl.remove();
          expandBtn.innerHTML = `
            <svg viewBox="0 0 18 18" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2h5v5M7 16H2v-5M16 2l-6 6M2 16l6-6"/></svg>
            ${t('loc.interact', null, 'Interagir')}
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
    } /* /buildMap */
  })();

  /* ════════════════════════════════════════
     NAVEGAÇÃO → PÁGINA DE SERVIÇOS

     - Todos os botões "Agendar" redirecionam para servicos.html
     - Os serviços selecionados vão no sessionStorage e são
       restaurados ao voltar
  ════════════════════════════════════════ */
  (function initAgendarNavigation() {
    const SVC_KEY = 'svc_selected';

    /* ── Serializa o estado atual do booking bar ── */
    function persistSelected() {
      try {
        sessionStorage.setItem(SVC_KEY, JSON.stringify([...selected.entries()]));
      } catch (_) {}
    }

    /* ── Restaura estado salvo (vindo da página de serviços) ── */
    function restoreFromSession() {
      try {
        const raw = sessionStorage.getItem(SVC_KEY);
        if (!raw) return;
        const entries = JSON.parse(raw);
        if (!entries || !entries.length) return;

        entries.forEach(([id, data]) => {
          if (selected.has(id)) return;

          const card = document.querySelector(`[data-id="${id}"]`);
          if (!card) return;

          data.name = cardLabel(card);
          selected.set(id, data);
          card.classList.add('selected');
          card.setAttribute('aria-pressed', 'true');

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

    /* ── Botões de agendamento ──
       Antes, todos os CTAs eram href="#agendar" e o JS fazia
       preventDefault() para os redirecionar. Como o id="agendar"
       estava no próprio botão do hero, sem JS o utilizador era
       atirado para o topo da página em vez de agendar.

       Agora o href leva o destino real e o JS só acrescenta a
       persistência da seleção. O link funciona sozinho; o script
       apenas melhora. Marcar um CTA novo = pôr-lhe data-book. */
    document.querySelectorAll('[data-book]').forEach(el => {
      el.addEventListener('click', persistSelected);
    });

    restoreFromSession();
  })();

  /* ════════════════════════════════════════
     PRÓXIMOS HORÁRIOS NO HERO

     A alavanca de conversão da página. Mostrar disponibilidade
     antes de pedir compromisso corta o funil de quatro passos
     (serviço → barbeiro → dia → confirmação) para um.
  ════════════════════════════════════════ */
  (function initHeroSlots() {
    const wrap = $('#hero-slots');
    const row  = $('#hero-slots-row');
    if (!wrap || !row) return;

    function render() {
      const slots = Schedule.nextSlots(3);
      row.textContent = '';

      if (!slots.length) {
        const p = document.createElement('p');
        p.className = 'hero-slots-empty';
        p.textContent = t('slots.closed', null, '');
        row.appendChild(p);
        wrap.hidden = false;
        return;
      }

      slots.forEach(slot => {
        const day  = Schedule.dayLabel(slot.date);
        const time = Schedule.timeLabel(slot.date);

        const a = document.createElement('a');
        a.className = 'hero-slot';
        a.href = 'agendar.html?slot=' + encodeURIComponent(Schedule.isoLocal(slot.date));
        a.setAttribute('data-book', '');
        a.setAttribute('aria-label', t('slots.aria', { day: day, time: time }));

        const d = document.createElement('span');
        d.className = 'hero-slot-day';
        d.textContent = day;

        const h = document.createElement('span');
        h.className = 'hero-slot-time';
        h.textContent = time;

        a.append(d, h);
        row.appendChild(a);
      });

      wrap.hidden = false;
    }

    render();
    document.addEventListener('i18n:change', render);

    /* Os horários envelhecem: recalcula de 5 em 5 minutos para o
       chip nunca mostrar uma hora que já passou. */
    setInterval(render, 5 * 60 * 1000);
  })();

  /* ════════════════════════════════════════
     ANOS DE CASA — derivados do ano de fundação

     Antes havia quatro números a contradizerem-se na página
     ("Desde 2010", "Est. 2026", "14+ anos"). Agora existe um ano
     e tudo o resto é calculado a partir dele.
  ════════════════════════════════════════ */
  (function initYears() {
    $$('[data-since]').forEach(el => {
      const since = parseInt(el.dataset.since, 10);
      if (!since) return;
      el.dataset.count = String(new Date().getFullYear() - since);
    });
  })();

  /* ════════════════════════════════════════
     PAUSA DE MOVIMENTO — WCAG 2.2.2

     O prefers-reduced-motion desliga as animações CSS, mas não o
     vídeo em loop nem o marquee do ticker. Este botão desliga os
     três, e a escolha fica guardada.
  ════════════════════════════════════════ */
  (function initMotionToggle() {
    const btn = $('#motion-toggle');
    if (!btn) return;

    const KEY = 'corvo.motion';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let stored = null;
    try { stored = localStorage.getItem(KEY); } catch (_) {}
    let paused = stored === null ? reduced : stored === 'paused';

    function apply(state) {
      paused = state;
      document.documentElement.classList.toggle('motion-paused', paused);
      btn.setAttribute('aria-pressed', String(paused));
      btn.setAttribute('aria-label', paused
        ? t('a11y.motionPlay', null, 'Retomar animações')
        : t('a11y.motionPause', null, 'Pausar animações'));

      try { localStorage.setItem(KEY, paused ? 'paused' : 'playing'); } catch (_) {}
    }

    btn.addEventListener('click', () => apply(!paused));
    document.addEventListener('i18n:change', () => apply(paused));
    apply(paused);
  })();

})();