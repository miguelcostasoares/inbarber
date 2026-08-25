/* ═══════════════════════════════════════════════════════════
   CONFIRM
   • Intercepta o CTA "Confirmar" em agendar.html
   • Mostra o popup de confirmação com "X" → volta ao início
   O modal de login foi removido: o botão de perfil abre agora
   um menu de conta (ver js/profile-btn.js).
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var overlayEl = null;

  /* ─── POPUP DE CONFIRMAÇÃO ──────────────────────────────── */
  function openConfirmationPopup() {
    if (overlayEl) overlayEl.remove();

    var dateLabel = '', timeLabel = '', barberName = '';

    try {
      var dt = JSON.parse(sessionStorage.getItem('booking_datetime') || '{}');
      if (dt.date) {
        var DAYS_PT   = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        var MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                         'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        var p = dt.date.split('-').map(Number);
        var obj = new Date(p[0], p[1] - 1, p[2]);
        dateLabel = DAYS_PT[obj.getDay()] + ', ' + p[2] + ' de ' + MONTHS_PT[p[1] - 1];
      }
      timeLabel = dt.time || '';
    } catch (_) {}

    try {
      var barberData = JSON.parse(sessionStorage.getItem('svc_barber') || '{}');
      barberName = barberData.name || '';
      if (!barberName) {
        var sub = document.getElementById('summary-sub');
        if (sub) barberName = sub.textContent.split('·')[0].trim();
      }
    } catch (_) {}

    var overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.innerHTML =
      '<div class="auth-panel" style="text-align:center">' +
        '<button class="auth-close" id="confirm-close" aria-label="Fechar">' +
          '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
            '<line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>' +
          '</svg>' +
        '</button>' +
        '<div class="confirm-popup-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"/>' +
          '</svg>' +
        '</div>' +
        '<h2 class="confirm-popup-title">Agendamento confirmado!</h2>' +
        '<p class="confirm-popup-details">' +
          (dateLabel  ? '<strong>' + dateLabel + '</strong><br>' : '') +
          (timeLabel  ? 'às <strong>' + timeLabel + '</strong><br>' : '') +
          (barberName ? 'com <strong>' + barberName + '</strong>' : '') +
        '</p>' +
        '<p class="confirm-popup-hint">Feche esta janela para voltar ao início.</p>' +
      '</div>';

    document.body.appendChild(overlay);
    overlayEl = overlay;

    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    });

    overlay.querySelector('#confirm-close').addEventListener('click', function () {
      overlay.classList.remove('is-open');
      setTimeout(function () {
        overlay.remove();
        overlayEl = null;
        try {
          sessionStorage.removeItem('booking_datetime');
          sessionStorage.removeItem('svc_selected');
          sessionStorage.removeItem('svc_barber');
        } catch (_) {}
        window.location.href = '/';
      }, 300);
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.querySelector('#confirm-close').click();
    });
  }

  /* ─── CTA DE CONFIRMAÇÃO EM AGENDAR.HTML ────────────────── */
  function interceptConfirmCTA() {
    var cta = document.getElementById('summary-cta');
    if (!cta) return;

    cta.addEventListener('click', function (e) {
      if (cta.disabled) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      openConfirmationPopup();
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptConfirmCTA);
  } else {
    interceptConfirmCTA();
  }
})();
