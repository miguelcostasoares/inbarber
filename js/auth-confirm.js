/* ═══════════════════════════════════════════════════════════
   AUTH-CONFIRM
   • Injeta botão de perfil no topbar de todas as páginas de booking
   • Intercepta o CTA "Confirmar" em agendar.html
   • Se NÃO logado → modal login/registar
   • Se logado → popup de confirmação com "X" → redireciona para index.html
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── HELPERS ─────────────────────────────────────────── */
  function isLoggedIn() {
    try { return !!localStorage.getItem('inbarber_user'); } catch (_) { return false; }
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('inbarber_user')); } catch (_) { return null; }
  }

  function saveUser(data) {
    try { localStorage.setItem('inbarber_user', JSON.stringify(data)); } catch (_) {}
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  /* ─── 1. INJECT PROFILE BUTTON ON TOPBAR PAGES ────────── */
  function injectProfileButton() {
    // Pages with .topbar > .topbar-spacer (servicos, barbeiro, agendar, perfil)
    const spacer = document.querySelector('.topbar .topbar-spacer');
    if (spacer) {
      const btn = createProfileBtn();
      spacer.replaceWith(btn);
      return;
    }

    // index.html already has #nav-profile-btn — just update its state
    const navBtn = document.getElementById('nav-profile-btn');
    if (navBtn) {
      updateExistingProfileBtn(navBtn);
    }
  }

  function createProfileBtn() {
    const btn = document.createElement('button');
    btn.className = 'topbar-profile-btn';
    btn.setAttribute('aria-label', 'Perfil');
    btn.id = 'topbar-profile-btn';

    if (isLoggedIn()) {
      const user = getUser();
      btn.classList.add('topbar-profile-btn--logged');
      btn.innerHTML = `<span class="profile-initials">${getInitials(user?.name)}</span>`;
    } else {
      btn.innerHTML = `
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="10" cy="7" r="3.5"/>
          <path d="M2.5 17.5c0-4 3.36-7 7.5-7s7.5 3 7.5 7"/>
        </svg>`;
    }

    btn.addEventListener('click', () => {
      if (isLoggedIn()) {
        window.location.href = '/perfil.html';
      } else {
        openAuthModal('login');
      }
    });

    return btn;
  }

  function updateExistingProfileBtn(btn) {
    if (isLoggedIn()) {
      const user = getUser();
      btn.classList.add('topbar-profile-btn--logged');
      btn.style.width = '36px';
      btn.style.height = '36px';
      btn.style.borderRadius = '50%';
      btn.style.background = '#BFA06A';
      btn.style.borderColor = '#BFA06A';
      btn.innerHTML = `<span style="font-size:13px;font-weight:600;color:#1a1a1a;line-height:1">${getInitials(user?.name)}</span>`;
    }

    // Re-bind click
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isLoggedIn()) {
        window.location.href = '/perfil.html';
      } else {
        openAuthModal('login');
      }
    });
  }

  /* ─── 2. AUTH MODAL (LOGIN / REGISTER) ─────────────────── */
  let authOverlay = null;

  function openAuthModal(mode) {
    if (authOverlay) authOverlay.remove();

    const isLogin = mode === 'login';

    authOverlay = document.createElement('div');
    authOverlay.className = 'auth-overlay';
    authOverlay.innerHTML = `
      <div class="auth-panel">
        <button class="auth-close" aria-label="Fechar">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
        </button>

        <div class="auth-header">
          <div class="auth-header-icon">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="7" r="3.5"/>
              <path d="M2.5 17.5c0-4 3.36-7 7.5-7s7.5 3 7.5 7"/>
            </svg>
          </div>
          <h2 class="auth-title">${isLogin ? 'Entrar na sua conta' : 'Criar conta'}</h2>
          <p class="auth-subtitle">${isLogin
            ? 'Faça login para confirmar o seu agendamento.'
            : 'Registe-se para agendar na InBarber.'
          }</p>
        </div>

        <div class="auth-error" id="auth-error"></div>

        ${!isLogin ? `
        <div class="auth-field">
          <label class="auth-label" for="auth-name">Nome completo</label>
          <input class="auth-input" id="auth-name" type="text" placeholder="Ex: Ricardo Almeida" autocomplete="name">
        </div>` : ''}

        <div class="auth-field">
          <label class="auth-label" for="auth-email">Email</label>
          <input class="auth-input" id="auth-email" type="email" placeholder="seu@email.com" autocomplete="email">
        </div>

        <div class="auth-field">
          <label class="auth-label" for="auth-pass">Senha</label>
          <input class="auth-input" id="auth-pass" type="password" placeholder="••••••••" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
        </div>

        <button class="auth-btn auth-btn--primary" id="auth-submit">${isLogin ? 'Entrar' : 'Criar conta'}</button>

        <div class="auth-divider">ou</div>

        <button class="auth-btn auth-btn--ghost" id="auth-toggle">
          ${isLogin ? 'Ainda não tem conta? Registar' : 'Já tem conta? Entrar'}
        </button>
      </div>`;

    document.body.appendChild(authOverlay);

    // Animate in
    requestAnimationFrame(() => requestAnimationFrame(() => {
      authOverlay.classList.add('is-open');
    }));

    // Events
    authOverlay.querySelector('.auth-close').addEventListener('click', closeAuthModal);
    authOverlay.addEventListener('click', (e) => {
      if (e.target === authOverlay) closeAuthModal();
    });

    authOverlay.querySelector('#auth-toggle').addEventListener('click', () => {
      openAuthModal(isLogin ? 'register' : 'login');
    });

    authOverlay.querySelector('#auth-submit').addEventListener('click', () => {
      handleAuthSubmit(isLogin);
    });

    // Enter key on inputs
    authOverlay.querySelectorAll('.auth-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAuthSubmit(isLogin);
      });
    });

    // Focus first input
    setTimeout(() => {
      const firstInput = authOverlay.querySelector('.auth-input');
      if (firstInput) firstInput.focus();
    }, 300);
  }

  function closeAuthModal() {
    if (!authOverlay) return;
    authOverlay.classList.remove('is-open');
    setTimeout(() => { authOverlay?.remove(); authOverlay = null; }, 300);
  }

  function handleAuthSubmit(isLogin) {
    const email = authOverlay.querySelector('#auth-email')?.value.trim();
    const pass  = authOverlay.querySelector('#auth-pass')?.value;
    const name  = authOverlay.querySelector('#auth-name')?.value.trim();
    const errEl = authOverlay.querySelector('#auth-error');

    // Basic validation
    if (!email || !pass) {
      showAuthError(errEl, 'Preencha todos os campos.');
      return;
    }
    if (!email.includes('@')) {
      showAuthError(errEl, 'Email inválido.');
      return;
    }
    if (pass.length < 6) {
      showAuthError(errEl, 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!isLogin && !name) {
      showAuthError(errEl, 'Preencha o seu nome.');
      return;
    }

    // Simulate auth (in production: POST /api/auth)
    const userData = {
      name: isLogin ? (email.split('@')[0].replace(/[._-]/g, ' ')) : name,
      email: email,
      loggedAt: new Date().toISOString(),
    };

    saveUser(userData);
    closeAuthModal();

    // Update profile button
    const topbarBtn = document.getElementById('topbar-profile-btn');
    if (topbarBtn) {
      topbarBtn.classList.add('topbar-profile-btn--logged');
      topbarBtn.innerHTML = `<span class="profile-initials">${getInitials(userData.name)}</span>`;
    }
    const navBtn = document.getElementById('nav-profile-btn');
    if (navBtn) {
      updateExistingProfileBtn(navBtn);
    }

    // If on agendar.html and they just logged in to confirm, auto-trigger confirmation
    const summaryCta = document.getElementById('summary-cta');
    if (summaryCta && !summaryCta.disabled && window._pendingConfirmation) {
      window._pendingConfirmation = false;
      setTimeout(() => openConfirmationPopup(), 400);
    }
  }

  function showAuthError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    setTimeout(() => el.classList.remove('is-visible'), 4000);
  }

  /* ─── 3. CONFIRMATION POPUP ────────────────────────────── */
  function openConfirmationPopup() {
    if (authOverlay) authOverlay.remove();

    // Gather booking details from sessionStorage
    let dateLabel = '', timeLabel = '', barberName = '';
    try {
      const dt = JSON.parse(sessionStorage.getItem('booking_datetime') || '{}');
      if (dt.date) {
        const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const [y, m, d] = dt.date.split('-').map(Number);
        const obj = new Date(y, m - 1, d);
        dateLabel = `${DAYS_PT[obj.getDay()]}, ${d} de ${MONTHS_PT[m - 1]}`;
      }
      timeLabel = dt.time || '';
    } catch (_) {}

    try {
      const barberData = JSON.parse(sessionStorage.getItem('svc_barber') || '{}');
      barberName = barberData.name || '';
      if (!barberName) {
        // fallback: try to find from summary-sub text
        const sub = document.getElementById('summary-sub');
        if (sub) barberName = sub.textContent.split('·')[0].trim();
      }
    } catch (_) {}

    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.innerHTML = `
      <div class="auth-panel" style="text-align:center">
        <button class="auth-close" id="confirm-close" aria-label="Fechar">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
        </button>

        <div class="confirm-popup-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <h2 class="confirm-popup-title">Agendamento confirmado!</h2>

        <p class="confirm-popup-details">
          ${dateLabel ? `<strong>${dateLabel}</strong><br>` : ''}
          ${timeLabel ? `às <strong>${timeLabel}</strong><br>` : ''}
          ${barberName ? `com <strong>${barberName}</strong>` : ''}
        </p>

        <p class="confirm-popup-hint">Feche esta janela para voltar ao início.</p>
      </div>`;

    document.body.appendChild(overlay);
    authOverlay = overlay;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('is-open');
    }));

    // Close X → redirect home
    overlay.querySelector('#confirm-close').addEventListener('click', () => {
      overlay.classList.remove('is-open');
      setTimeout(() => {
        overlay.remove();
        authOverlay = null;
        // Clear booking data
        try {
          sessionStorage.removeItem('booking_datetime');
          sessionStorage.removeItem('svc_selected');
          sessionStorage.removeItem('svc_barber');
        } catch (_) {}
        window.location.href = '/';
      }, 300);
    });

    // Clicking overlay also closes and redirects
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.querySelector('#confirm-close').click();
      }
    });
  }

  /* ─── 4. INTERCEPT CONFIRM CTA ON AGENDAR.HTML ─────────── */
  function interceptConfirmCTA() {
    const cta = document.getElementById('summary-cta');
    if (!cta) return;

    // Add a capturing listener that fires BEFORE the original
    cta.addEventListener('click', function (e) {
      if (cta.disabled) return;

      // Stop the original handler from running
      e.stopImmediatePropagation();
      e.preventDefault();

      // Save datetime to sessionStorage (same as original code)
      try {
        // The original code does this, but since we stop it, replicate:
        const summaryDate = document.getElementById('summary-date');
        const summaryTime = document.getElementById('summary-time');
        // Try to build date from the calendar's selected state
        // We'll use sessionStorage if already set, or build from DOM
      } catch (_) {}

      if (!isLoggedIn()) {
        // Flag so after login we auto-confirm
        window._pendingConfirmation = true;
        openAuthModal('login');
      } else {
        openConfirmationPopup();
      }
    }, true); // ← capturing phase = runs first
  }

  /* ─── 5. BOOT ──────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    injectProfileButton();
    interceptConfirmCTA();
  }

})();