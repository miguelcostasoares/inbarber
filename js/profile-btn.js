/* ═══════════════════════════════════════════════════════════
   PROFILE-BTN
   Injeta o botão de perfil no topbar de todas as páginas
   de booking (servicos, barbeiro, agendar, confirmacao).
   Substitui .topbar-spacer pelo botão.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function isLoggedIn() {
    try { return !!localStorage.getItem('inbarber_user'); } catch (_) { return false; }
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('inbarber_user')); } catch (_) { return null; }
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function createBtn() {
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
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="10" cy="7" r="3.5"/>
          <path d="M2.5 17.5c0-4 3.36-7 7.5-7s7.5 3 7.5 7"/>
        </svg>`;
    }

    btn.addEventListener('click', () => {
      window.location.href = '/perfil.html';
    });

    return btn;
  }

  function boot() {
    const spacer = document.querySelector('.topbar .topbar-spacer');
    if (spacer) spacer.replaceWith(createBtn());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();