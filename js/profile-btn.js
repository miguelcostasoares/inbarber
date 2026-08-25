/* ═══════════════════════════════════════════════════════════
   PROFILE-BTN
   Botão de perfil (azul) no topbar / nav de todas as páginas.
   Ao clicar abre um menu com duas ações:
     • Entrar no perfil  → /perfil.html
     • Sair da conta     → limpa a sessão e volta ao início
   Não existe modal de login — o mockup entra direto no perfil.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY_USER    = 'inbarber_user';        /* sessão simulada        */
  var KEY_PROFILE = 'inbarber.profile';     /* dados da página perfil */
  var KEY_AVATAR  = 'inbarber.avatar';      /* foto em dataURL        */

  /* Cliente de demonstração — o mesmo que aparece em perfil.html */
  var DEMO_NAME  = 'Ricardo Almeida';
  var DEMO_EMAIL = 'ricardo.almeida@email.com';

  /* ─── i18n mínimo (segue a chave 'lang' do resto do site) ─── */
  var STR = {
    pt: { open: 'Entrar no perfil', out: 'Sair da conta', aria: 'Conta', guest: 'A sua conta', guestMail: 'Entre para ver as suas reservas' },
    en: { open: 'Go to profile',    out: 'Sign out',      aria: 'Account', guest: 'Your account', guestMail: 'Sign in to see your bookings' },
    es: { open: 'Ir al perfil',     out: 'Cerrar sesión', aria: 'Cuenta',  guest: 'Tu cuenta',    guestMail: 'Entra para ver tus reservas' }
  };

  function lang() {
    var l;
    try { l = localStorage.getItem('lang'); } catch (_) {}
    return STR[l] ? l : 'pt';
  }
  function t(k) { return STR[lang()][k]; }

  /* ─── LEITURA DE ESTADO ─────────────────────────────────── */
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; }
  }

  function getIdentity() {
    var profile = read(KEY_PROFILE);
    var session = read(KEY_USER);
    var name = '', email = '';

    if (profile && (profile['f-first'] || profile['f-last'])) {
      name  = ((profile['f-first'] || '') + ' ' + (profile['f-last'] || '')).trim();
      email = profile['f-email'] || '';
    }
    if (!name && session && session.name)  name  = session.name;
    if (!email && session && session.email) email = session.email;

    var photo = null;
    try { photo = localStorage.getItem(KEY_AVATAR); } catch (_) {}

    return {
      loggedIn: true,
      name: name || DEMO_NAME,
      email: email || DEMO_EMAIL,
      photo: photo
    };
  }

  function initials(name) {
    if (!name) return '';
    var parts = name.trim().split(/\s+/);
    var a = parts[0].charAt(0);
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  var PERSON_SVG =
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"' +
    ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="10" cy="7" r="3.5"/><path d="M2.5 17.5c0-4 3.36-7 7.5-7s7.5 3 7.5 7"/></svg>';

  var ARROW_SVG =
    '<svg viewBox="0 0 20 20" aria-hidden="true">' +
    '<path d="M8 3.5H5.5A1.5 1.5 0 0 0 4 5v10a1.5 1.5 0 0 0 1.5 1.5H8"/>' +
    '<path d="M12.5 10H17"/><polyline points="14.5,7.5 17,10 14.5,12.5"/></svg>';

  var EXIT_SVG =
    '<svg viewBox="0 0 20 20" aria-hidden="true">' +
    '<path d="M12.5 3.5H15A1.5 1.5 0 0 1 16.5 5v10a1.5 1.5 0 0 1-1.5 1.5h-2.5"/>' +
    '<path d="M9 10H3.5"/><polyline points="6,7.5 3.5,10 6,12.5"/></svg>';

  /* ─── CONTEÚDO DO BOTÃO ─────────────────────────────────── */
  function paintButton(btn, id) {
    btn.classList.toggle('topbar-profile-btn--logged', !!(id.loggedIn && !id.photo));
    if (id.photo) {
      btn.innerHTML = '<img src="' + id.photo + '" alt="">';
    } else if (id.loggedIn && initials(id.name)) {
      btn.innerHTML = '<span class="profile-initials">' + initials(id.name) + '</span>';
    } else {
      btn.innerHTML = PERSON_SVG;
    }
  }

  /* ─── MENU ──────────────────────────────────────────────── */
  function buildMenu(id) {
    var menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.setAttribute('role', 'menu');
    menu.id = 'profile-menu';

    var head = id.photo
      ? '<span class="profile-menu-avatar"><img src="' + id.photo + '" alt=""></span>'
      : '<span class="profile-menu-avatar">' + (initials(id.name) || '?') + '</span>';

    menu.innerHTML =
      '<div class="profile-menu-head">' +
        head +
        '<span class="profile-menu-id">' +
          '<strong>' + (id.name || t('guest')) + '</strong>' +
          '<small>' + (id.email || t('guestMail')) + '</small>' +
        '</span>' +
      '</div>' +
      '<button type="button" class="profile-menu-item profile-menu-item--primary" role="menuitem" data-action="profile">' +
        ARROW_SVG + '<span>' + t('open') + '</span>' +
      '</button>' +
      '<div class="profile-menu-sep"></div>' +
      '<button type="button" class="profile-menu-item profile-menu-item--danger" role="menuitem" data-action="logout">' +
        EXIT_SVG + '<span>' + t('out') + '</span>' +
      '</button>';

    return menu;
  }

  function logout() {
    try {
      localStorage.removeItem(KEY_USER);
      localStorage.removeItem(KEY_PROFILE);
      localStorage.removeItem(KEY_AVATAR);
      sessionStorage.removeItem('booking_datetime');
      sessionStorage.removeItem('svc_selected');
      sessionStorage.removeItem('svc_barber');
    } catch (_) {}
    window.location.href = '/index.html';
  }

  /* ─── LIGAÇÃO BOTÃO ↔ MENU ──────────────────────────────── */
  function wire(btn) {
    var id = getIdentity();
    paintButton(btn, id);

    var wrap = document.createElement('div');
    wrap.className = 'profile-menu-wrap';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);

    var menu = buildMenu(id);
    wrap.appendChild(menu);

    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'profile-menu');
    if (!btn.getAttribute('aria-label')) btn.setAttribute('aria-label', t('aria'));

    var open = false;

    function openMenu() {
      open = true;
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey);
    }

    function closeMenu(focusBack) {
      if (!open) return;
      open = false;
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey);
      if (focusBack) btn.focus();
    }

    function onDocClick(e) {
      if (!wrap.contains(e.target)) closeMenu(false);
    }

    function onKey(e) {
      if (e.key === 'Escape') { closeMenu(true); return; }
      if (e.key !== 'Tab') return;
      var items = [].slice.call(menu.querySelectorAll('.profile-menu-item'));
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (open) { closeMenu(false); return; }
      openMenu();
      setTimeout(function () {
        var first = menu.querySelector('.profile-menu-item');
        if (first) first.focus();
      }, 60);
    });

    menu.addEventListener('click', function (e) {
      var item = e.target.closest('.profile-menu-item');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      closeMenu(false);
      if (item.dataset.action === 'logout') logout();
      else window.location.href = '/perfil.html';
    });
  }

  /* ─── BOOT ──────────────────────────────────────────────── */
  function boot() {
    if (document.querySelector('.profile-menu-wrap')) return;   /* já montado */

    /* Páginas de booking / perfil: existe um spacer para substituir */
    var spacer = document.querySelector('.topbar .topbar-spacer');
    if (spacer) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topbar-profile-btn';
      btn.id = 'topbar-profile-btn';
      spacer.replaceWith(btn);
      wire(btn);
      return;
    }

    /* Landing: o botão já existe na nav */
    var navBtn = document.getElementById('nav-profile-btn');
    if (navBtn) wire(navBtn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
