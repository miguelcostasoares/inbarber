/* ═══════════════════════════════════════════════════════════
   InBarber — Perfil / Conta
   Sem dependências. Estado guardado em localStorage.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  var KEY_LANG  = 'lang';               /* partilhada com js/main.js */
  var KEY_USER  = 'inbarber.profile';
  var KEY_PREFS = 'inbarber.prefs';

  /* ════════════════════════════════════════
     1. TRADUÇÕES
  ════════════════════════════════════════ */
  var i18n = {
    pt: {
      'lang.label': 'Português',
      'common.back': 'Voltar', 'common.cancel': 'Cancelar', 'btn.save': 'Guardar',
      'top.sub': 'Perfil',
      'hd.tag': 'A sua conta', 'hd.hello': 'Olá,',
      'hd.hint': 'Os seus dados, preferências e segurança — tudo num só lugar.',
      'badge.tier': 'Cliente Ouro', 'badge.verified': 'Email verificado',
      'stat.appts': 'Agendamentos', 'stat.points': 'Pontos', 'stat.since': 'Cliente desde',
      'tab.account': 'Conta', 'tab.prefs': 'Preferências', 'tab.security': 'Segurança',

      'acc.personal': 'Dados pessoais',
      'acc.personal_sub': 'É assim que o seu nome aparece nas reservas.',
      'f.first': 'Nome', 'f.last': 'Sobrenome', 'f.email': 'Email',
      'f.email_hint': 'Enviamos as confirmações de reserva para este endereço.',
      'f.email_err': 'Escreva um email válido.',
      'f.phone': 'Telemóvel', 'f.birth': 'Data de nascimento',
      'acc.saved_note': 'Guardado no seu dispositivo.',
      'acc.booking': 'Preferências de reserva',
      'acc.booking_sub': 'Preenchemos as próximas reservas com estas escolhas.',
      'acc.fav_barber': 'Barbeiro preferido', 'acc.no_pref': 'Sem preferência',
      'acc.fav_slot': 'Horário preferido',
      'acc.slot_morning': 'Manhã (9h–12h)', 'acc.slot_afternoon': 'Tarde (12h–18h)', 'acc.slot_evening': 'Fim do dia (18h–21h)',
      'acc.pay': 'Pagamento habitual', 'acc.pay_local': 'No balcão', 'acc.pay_card': 'Cartão guardado',
      'acc.loyalty': 'Programa de fidelidade', 'acc.loyalty_sub': 'Cada 10 € gastos valem 1 ponto.',
      'acc.points': 'pontos', 'acc.to_next': '80 para o nível Platina',
      'acc.history': 'Histórico de agendamentos', 'acc.history_sub': 'Ver e repetir reservas anteriores',

      'pref.region': 'Idioma e formato', 'pref.region_sub': 'Aplica-se de imediato a todo o site.',
      'pref.language': 'Idioma',
      'pref.timefmt': 'Formato de hora', 'pref.timefmt_sub': 'Como mostramos os horários disponíveis',
      'pref.notif': 'Notificações', 'pref.notif_sub': 'Escolha quando quer ter notícias nossas.',
      'pref.reminders': 'Lembretes de reserva', 'pref.reminders_sub': 'Avisamos antes do seu horário',
      'pref.email': 'Confirmações por email', 'pref.email_sub': 'Recibo e detalhes de cada reserva',
      'pref.sms': 'SMS e WhatsApp', 'pref.sms_sub': 'Só para alterações de última hora',
      'pref.promos': 'Promoções e novidades', 'pref.promos_sub': 'No máximo uma mensagem por mês',
      'pref.lead': 'Antecedência do lembrete', 'pref.lead_sub': 'Quanto tempo antes quer ser avisado',
      'pref.lead_1': '1 hora antes', 'pref.lead_3': '3 horas antes', 'pref.lead_24': '1 dia antes',
      'pref.display': 'Aparência', 'pref.display_sub': 'Ajuste a leitura ao seu gosto.',
      'pref.textsize': 'Tamanho do texto', 'pref.textsize_sub': 'Afeta todas as páginas da barbearia',
      'pref.size_default': 'Padrão', 'pref.size_large': 'Grande',
      'pref.motion': 'Reduzir animações', 'pref.motion_sub': 'Menos movimento em transições e cartões',

      'sec.pass': 'Alterar senha', 'sec.pass_sub': 'Depois de mudar, as outras sessões terminam.',
      'sec.pw_current': 'Senha atual', 'sec.err_current': 'Preencha a senha atual.',
      'sec.pw_new': 'Nova senha', 'sec.pw_confirm': 'Confirmar nova senha',
      'sec.err_confirm': 'As senhas não coincidem.',
      'sec.req_len': '8 caracteres', 'sec.req_case': 'Maiúscula e minúscula',
      'sec.req_num': 'Um número', 'sec.req_sym': 'Um símbolo',
      'sec.str_0': 'Força da senha', 'sec.str_1': 'Fraca', 'sec.str_2': 'Razoável',
      'sec.str_3': 'Boa', 'sec.str_4': 'Excelente',
      'sec.pass_note': 'Nunca partilhamos a sua senha.', 'sec.update_pass': 'Atualizar senha',
      'sec.2fa': 'Verificação em duas etapas', 'sec.2fa_sub': 'Pedimos um código por SMS ao entrar',
      'sec.sessions': 'Sessões ativas', 'sec.sessions_sub': 'Onde a sua conta está aberta neste momento.',
      'sec.this_device': 'Porto, Portugal · este dispositivo',
      'sec.session_2': 'Porto, Portugal · há 2 dias', 'sec.session_3': 'Lisboa, Portugal · há 3 semanas',
      'sec.revoke': 'Terminar', 'sec.revoke_all': 'Terminar as outras',
      'sec.sessions_note': 'Não reconhece um dispositivo? Termine e mude a senha.',
      'sec.privacy': 'Privacidade e dados',
      'sec.export': 'Descarregar os meus dados', 'sec.export_sub': 'Reservas, faturas e preferências em JSON',
      'sec.terms': 'Termos e política de privacidade', 'sec.terms_sub': 'Atualizado em janeiro de 2026',

      'danger.title': 'Zona de risco', 'danger.sub': 'Estas ações não se desfazem.',
      'danger.logout': 'Terminar sessão', 'danger.logout_sub': 'Sai desta conta neste dispositivo',
      'danger.delete': 'Eliminar conta', 'danger.delete_sub': 'Apaga o histórico e os pontos acumulados',
      'danger.modal_text': 'Perde o histórico de reservas, os 320 pontos e o nível Cliente Ouro. Não conseguimos recuperar depois.',
      'danger.modal_label': 'Escreva ELIMINAR para confirmar',
      'danger.word': 'ELIMINAR', 'danger.confirm': 'Eliminar para sempre',

      'save.title': 'Alterações por guardar', 'save.sub': 'Nos dados pessoais', 'save.discard': 'Descartar',

      'toast.saved': 'Dados pessoais guardados.',
      'toast.discarded': 'Alterações descartadas.',
      'toast.lang': 'Idioma alterado para Português.',
      'toast.pref': 'Preferência guardada.',
      'toast.pass': 'Senha atualizada. As outras sessões foram terminadas.',
      'toast.pass_err': 'Verifique os campos assinalados.',
      'toast.avatar': 'Foto de perfil atualizada.',
      'toast.session': 'Sessão terminada.',
      'toast.sessions_all': 'As outras sessões foram terminadas.',
      'toast.export': 'Ficheiro pronto — a descarregar.',
      'toast.logout': 'Sessão terminada. Até breve.',
      'toast.deleted': 'Pedido de eliminação registado.'
    },

    en: {
      'lang.label': 'English',
      'common.back': 'Back', 'common.cancel': 'Cancel', 'btn.save': 'Save',
      'top.sub': 'Profile',
      'hd.tag': 'Your account', 'hd.hello': 'Hi,',
      'hd.hint': 'Your details, preferences and security — all in one place.',
      'badge.tier': 'Gold member', 'badge.verified': 'Email verified',
      'stat.appts': 'Bookings', 'stat.points': 'Points', 'stat.since': 'Member since',
      'tab.account': 'Account', 'tab.prefs': 'Preferences', 'tab.security': 'Security',

      'acc.personal': 'Personal details',
      'acc.personal_sub': 'This is how your name shows up on bookings.',
      'f.first': 'First name', 'f.last': 'Last name', 'f.email': 'Email',
      'f.email_hint': 'We send booking confirmations to this address.',
      'f.email_err': 'Enter a valid email.',
      'f.phone': 'Mobile', 'f.birth': 'Date of birth',
      'acc.saved_note': 'Saved on your device.',
      'acc.booking': 'Booking preferences',
      'acc.booking_sub': 'We pre-fill your next booking with these.',
      'acc.fav_barber': 'Preferred barber', 'acc.no_pref': 'No preference',
      'acc.fav_slot': 'Preferred time',
      'acc.slot_morning': 'Morning (9am–12pm)', 'acc.slot_afternoon': 'Afternoon (12pm–6pm)', 'acc.slot_evening': 'Evening (6pm–9pm)',
      'acc.pay': 'Usual payment', 'acc.pay_local': 'At the counter', 'acc.pay_card': 'Saved card',
      'acc.loyalty': 'Loyalty programme', 'acc.loyalty_sub': 'Every €10 spent earns 1 point.',
      'acc.points': 'points', 'acc.to_next': '80 to Platinum',
      'acc.history': 'Booking history', 'acc.history_sub': 'View and rebook past visits',

      'pref.region': 'Language and format', 'pref.region_sub': 'Applies across the site right away.',
      'pref.language': 'Language',
      'pref.timefmt': 'Time format', 'pref.timefmt_sub': 'How we show available slots',
      'pref.notif': 'Notifications', 'pref.notif_sub': 'Choose when you hear from us.',
      'pref.reminders': 'Booking reminders', 'pref.reminders_sub': 'A nudge before your slot',
      'pref.email': 'Email confirmations', 'pref.email_sub': 'Receipt and details for each booking',
      'pref.sms': 'SMS and WhatsApp', 'pref.sms_sub': 'Last-minute changes only',
      'pref.promos': 'Offers and news', 'pref.promos_sub': 'One message a month at most',
      'pref.lead': 'Reminder timing', 'pref.lead_sub': 'How far ahead we remind you',
      'pref.lead_1': '1 hour before', 'pref.lead_3': '3 hours before', 'pref.lead_24': '1 day before',
      'pref.display': 'Appearance', 'pref.display_sub': 'Tune the reading experience.',
      'pref.textsize': 'Text size', 'pref.textsize_sub': 'Applies to every page',
      'pref.size_default': 'Default', 'pref.size_large': 'Large',
      'pref.motion': 'Reduce motion', 'pref.motion_sub': 'Less movement in transitions and cards',

      'sec.pass': 'Change password', 'sec.pass_sub': 'Changing it signs out your other sessions.',
      'sec.pw_current': 'Current password', 'sec.err_current': 'Enter your current password.',
      'sec.pw_new': 'New password', 'sec.pw_confirm': 'Confirm new password',
      'sec.err_confirm': 'Passwords do not match.',
      'sec.req_len': '8 characters', 'sec.req_case': 'Upper and lower case',
      'sec.req_num': 'A number', 'sec.req_sym': 'A symbol',
      'sec.str_0': 'Password strength', 'sec.str_1': 'Weak', 'sec.str_2': 'Fair',
      'sec.str_3': 'Good', 'sec.str_4': 'Strong',
      'sec.pass_note': 'We never share your password.', 'sec.update_pass': 'Update password',
      'sec.2fa': 'Two-step verification', 'sec.2fa_sub': 'We text you a code when you sign in',
      'sec.sessions': 'Active sessions', 'sec.sessions_sub': 'Where your account is open right now.',
      'sec.this_device': 'Porto, Portugal · this device',
      'sec.session_2': 'Porto, Portugal · 2 days ago', 'sec.session_3': 'Lisbon, Portugal · 3 weeks ago',
      'sec.revoke': 'Sign out', 'sec.revoke_all': 'Sign out others',
      'sec.sessions_note': "Don't recognise a device? Sign it out and change your password.",
      'sec.privacy': 'Privacy and data',
      'sec.export': 'Download my data', 'sec.export_sub': 'Bookings, invoices and preferences as JSON',
      'sec.terms': 'Terms and privacy policy', 'sec.terms_sub': 'Updated January 2026',

      'danger.title': 'Danger zone', 'danger.sub': 'These actions cannot be undone.',
      'danger.logout': 'Sign out', 'danger.logout_sub': 'Leaves this account on this device',
      'danger.delete': 'Delete account', 'danger.delete_sub': 'Erases your history and points',
      'danger.modal_text': 'You lose your booking history, 320 points and Gold status. We cannot bring them back.',
      'danger.modal_label': 'Type DELETE to confirm',
      'danger.word': 'DELETE', 'danger.confirm': 'Delete permanently',

      'save.title': 'Unsaved changes', 'save.sub': 'In personal details', 'save.discard': 'Discard',

      'toast.saved': 'Personal details saved.',
      'toast.discarded': 'Changes discarded.',
      'toast.lang': 'Language set to English.',
      'toast.pref': 'Preference saved.',
      'toast.pass': 'Password updated. Other sessions were signed out.',
      'toast.pass_err': 'Check the highlighted fields.',
      'toast.avatar': 'Profile photo updated.',
      'toast.session': 'Session signed out.',
      'toast.sessions_all': 'Other sessions were signed out.',
      'toast.export': 'File ready — downloading.',
      'toast.logout': 'Signed out. See you soon.',
      'toast.deleted': 'Deletion request registered.'
    },

    es: {
      'lang.label': 'Español',
      'common.back': 'Volver', 'common.cancel': 'Cancelar', 'btn.save': 'Guardar',
      'top.sub': 'Perfil',
      'hd.tag': 'Tu cuenta', 'hd.hello': 'Hola,',
      'hd.hint': 'Tus datos, preferencias y seguridad — todo en un sitio.',
      'badge.tier': 'Cliente Oro', 'badge.verified': 'Email verificado',
      'stat.appts': 'Reservas', 'stat.points': 'Puntos', 'stat.since': 'Cliente desde',
      'tab.account': 'Cuenta', 'tab.prefs': 'Preferencias', 'tab.security': 'Seguridad',

      'acc.personal': 'Datos personales',
      'acc.personal_sub': 'Así aparece tu nombre en las reservas.',
      'f.first': 'Nombre', 'f.last': 'Apellido', 'f.email': 'Email',
      'f.email_hint': 'Enviamos las confirmaciones a esta dirección.',
      'f.email_err': 'Escribe un email válido.',
      'f.phone': 'Móvil', 'f.birth': 'Fecha de nacimiento',
      'acc.saved_note': 'Guardado en tu dispositivo.',
      'acc.booking': 'Preferencias de reserva',
      'acc.booking_sub': 'Rellenamos tus próximas reservas con esto.',
      'acc.fav_barber': 'Barbero preferido', 'acc.no_pref': 'Sin preferencia',
      'acc.fav_slot': 'Horario preferido',
      'acc.slot_morning': 'Mañana (9h–12h)', 'acc.slot_afternoon': 'Tarde (12h–18h)', 'acc.slot_evening': 'Última hora (18h–21h)',
      'acc.pay': 'Pago habitual', 'acc.pay_local': 'En el mostrador', 'acc.pay_card': 'Tarjeta guardada',
      'acc.loyalty': 'Programa de fidelidad', 'acc.loyalty_sub': 'Cada 10 € gastados dan 1 punto.',
      'acc.points': 'puntos', 'acc.to_next': '80 para el nivel Platino',
      'acc.history': 'Historial de reservas', 'acc.history_sub': 'Ver y repetir visitas anteriores',

      'pref.region': 'Idioma y formato', 'pref.region_sub': 'Se aplica al instante en todo el sitio.',
      'pref.language': 'Idioma',
      'pref.timefmt': 'Formato de hora', 'pref.timefmt_sub': 'Cómo mostramos los horarios',
      'pref.notif': 'Notificaciones', 'pref.notif_sub': 'Elige cuándo te escribimos.',
      'pref.reminders': 'Recordatorios de reserva', 'pref.reminders_sub': 'Te avisamos antes de tu cita',
      'pref.email': 'Confirmaciones por email', 'pref.email_sub': 'Recibo y detalles de cada reserva',
      'pref.sms': 'SMS y WhatsApp', 'pref.sms_sub': 'Solo para cambios de última hora',
      'pref.promos': 'Ofertas y novedades', 'pref.promos_sub': 'Un mensaje al mes como máximo',
      'pref.lead': 'Antelación del recordatorio', 'pref.lead_sub': 'Cuánto antes quieres el aviso',
      'pref.lead_1': '1 hora antes', 'pref.lead_3': '3 horas antes', 'pref.lead_24': '1 día antes',
      'pref.display': 'Apariencia', 'pref.display_sub': 'Ajusta la lectura a tu gusto.',
      'pref.textsize': 'Tamaño del texto', 'pref.textsize_sub': 'Afecta a todas las páginas',
      'pref.size_default': 'Estándar', 'pref.size_large': 'Grande',
      'pref.motion': 'Reducir animaciones', 'pref.motion_sub': 'Menos movimiento en transiciones y tarjetas',

      'sec.pass': 'Cambiar contraseña', 'sec.pass_sub': 'Al cambiarla se cierran las demás sesiones.',
      'sec.pw_current': 'Contraseña actual', 'sec.err_current': 'Escribe tu contraseña actual.',
      'sec.pw_new': 'Nueva contraseña', 'sec.pw_confirm': 'Confirmar nueva contraseña',
      'sec.err_confirm': 'Las contraseñas no coinciden.',
      'sec.req_len': '8 caracteres', 'sec.req_case': 'Mayúscula y minúscula',
      'sec.req_num': 'Un número', 'sec.req_sym': 'Un símbolo',
      'sec.str_0': 'Seguridad de la contraseña', 'sec.str_1': 'Débil', 'sec.str_2': 'Aceptable',
      'sec.str_3': 'Buena', 'sec.str_4': 'Excelente',
      'sec.pass_note': 'Nunca compartimos tu contraseña.', 'sec.update_pass': 'Actualizar contraseña',
      'sec.2fa': 'Verificación en dos pasos', 'sec.2fa_sub': 'Te enviamos un código por SMS al entrar',
      'sec.sessions': 'Sesiones activas', 'sec.sessions_sub': 'Dónde está abierta tu cuenta ahora.',
      'sec.this_device': 'Oporto, Portugal · este dispositivo',
      'sec.session_2': 'Oporto, Portugal · hace 2 días', 'sec.session_3': 'Lisboa, Portugal · hace 3 semanas',
      'sec.revoke': 'Cerrar', 'sec.revoke_all': 'Cerrar las demás',
      'sec.sessions_note': '¿No reconoces un dispositivo? Ciérralo y cambia la contraseña.',
      'sec.privacy': 'Privacidad y datos',
      'sec.export': 'Descargar mis datos', 'sec.export_sub': 'Reservas, facturas y preferencias en JSON',
      'sec.terms': 'Términos y política de privacidad', 'sec.terms_sub': 'Actualizado en enero de 2026',

      'danger.title': 'Zona de riesgo', 'danger.sub': 'Estas acciones no se deshacen.',
      'danger.logout': 'Cerrar sesión', 'danger.logout_sub': 'Sales de esta cuenta en este dispositivo',
      'danger.delete': 'Eliminar cuenta', 'danger.delete_sub': 'Borra tu historial y tus puntos',
      'danger.modal_text': 'Pierdes el historial de reservas, los 320 puntos y el nivel Cliente Oro. No podemos recuperarlo.',
      'danger.modal_label': 'Escribe ELIMINAR para confirmar',
      'danger.word': 'ELIMINAR', 'danger.confirm': 'Eliminar para siempre',

      'save.title': 'Cambios sin guardar', 'save.sub': 'En datos personales', 'save.discard': 'Descartar',

      'toast.saved': 'Datos personales guardados.',
      'toast.discarded': 'Cambios descartados.',
      'toast.lang': 'Idioma cambiado a Español.',
      'toast.pref': 'Preferencia guardada.',
      'toast.pass': 'Contraseña actualizada. Se cerraron las demás sesiones.',
      'toast.pass_err': 'Revisa los campos marcados.',
      'toast.avatar': 'Foto de perfil actualizada.',
      'toast.session': 'Sesión cerrada.',
      'toast.sessions_all': 'Se cerraron las demás sesiones.',
      'toast.export': 'Archivo listo — descargando.',
      'toast.logout': 'Sesión cerrada. Hasta pronto.',
      'toast.deleted': 'Solicitud de eliminación registrada.'
    }
  };

  var currentLang = localStorage.getItem(KEY_LANG) || 'pt';
  function t(key) { return (i18n[currentLang] && i18n[currentLang][key]) || i18n.pt[key] || key; }

  function applyLang(lang, announce) {
    currentLang = i18n[lang] ? lang : 'pt';
    localStorage.setItem(KEY_LANG, currentLang);
    document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : currentLang;

    $$('[data-i18n]').forEach(function (el) {
      var val = i18n[currentLang][el.dataset.i18n];
      if (val) el.textContent = val;
    });

    var label = $('.lang-current-label');
    if (label) label.textContent = t('lang.label');

    $$('.seg-btn[data-lang]').forEach(function (b) {
      var on = b.dataset.lang === currentLang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    var del = $('#delete-confirm');
    if (del) { del.placeholder = t('danger.word'); checkDeleteWord(); }

    updateStrength();
    if (announce) toast(t('toast.lang'), 'ok');
  }

  /* ════════════════════════════════════════
     2. TOASTS
  ════════════════════════════════════════ */
  var ICONS = {
    ok: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><polyline points="6.8,10.2 9,12.4 13.2,7.8"/></svg>',
    error: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M10 6.2v4.4M10 13.4v.1"/></svg>',
    info: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M10 9.4v4.2M10 6.6v.1"/></svg>'
  };

  function toast(msg, kind) {
    var wrap = $('#toast-wrap');
    if (!wrap) return;
    kind = kind || 'info';
    var el = document.createElement('div');
    el.className = 'toast toast--' + kind;
    el.innerHTML = (ICONS[kind] || ICONS.info) + '<span></span>';
    el.lastChild.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 260);
    }, 3200);
  }

  /* ════════════════════════════════════════
     3. TABS
  ════════════════════════════════════════ */
  var TABS = ['conta', 'prefs', 'seguranca'];
  var PANEL_ID = { conta: 'tab-conta', prefs: 'tab-prefs', seguranca: 'tab-seguranca' };

  function switchTab(tab, silent) {
    if (TABS.indexOf(tab) === -1) tab = 'conta';
    var btns = $$('.tab-btn');
    var ind = $('#tab-indicator');

    btns.forEach(function (b) {
      var on = b.dataset.tab === tab;
      b.classList.toggle('tab-btn--active', on);
      b.setAttribute('aria-selected', String(on));
      if (on && ind) {
        var pr = b.parentElement.getBoundingClientRect();
        var br = b.getBoundingClientRect();
        ind.style.left = (br.left - pr.left) + 'px';
        ind.style.width = br.width + 'px';
      }
    });

    TABS.forEach(function (key) {
      var panel = document.getElementById(PANEL_ID[key]);
      if (panel) panel.classList.toggle('tab-panel--hidden', key !== tab);
    });

    if (!silent) history.replaceState(null, '', '#' + tab);
  }

  function initTabs() {
    var btns = $$('.tab-btn');
    var ind = $('#tab-indicator');

    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { switchTab(b.dataset.tab); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var next = (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
        btns[next].focus();
        switchTab(btns[next].dataset.tab);
      });
    });

    var hash = (location.hash || '').replace('#', '');
    if (ind) ind.style.transition = 'none';
    switchTab(TABS.indexOf(hash) > -1 ? hash : 'conta', true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (ind) ind.style.transition = ''; });
    });

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var active = $('.tab-btn--active');
        if (active) switchTab(active.dataset.tab, true);
      }, 120);
    });
  }

  /* ════════════════════════════════════════
     4. DADOS PESSOAIS
  ════════════════════════════════════════ */
  var FIELDS = ['f-first', 'f-last', 'f-email', 'f-phone', 'f-birth'];
  var saved = {};

  function readForm() {
    var out = {};
    FIELDS.forEach(function (id) { var el = document.getElementById(id); if (el) out[id] = el.value; });
    return out;
  }

  function writeForm(data) {
    FIELDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && typeof data[id] === 'string') el.value = data[id];
    });
  }

  function isDirty() {
    var now = readForm();
    return FIELDS.some(function (id) { return now[id] !== saved[id]; });
  }

  function refreshSaveBar() {
    var bar = $('#save-bar');
    if (bar) bar.classList.toggle('is-open', isDirty());
  }

  function initialsOf(first, last) {
    return ((first || '').charAt(0) + (last || '').charAt(0)).toUpperCase() || 'B';
  }

  function paintHero() {
    var first = saved['f-first'] || '';
    var last = saved['f-last'] || '';
    $('#hd-name').textContent = first ? first + '.' : '';
    $('#acct-name').textContent = (first + ' ' + last).trim();
    $('#acct-mail').textContent = saved['f-email'] || '';
    var ini = $('#avatar-initials');
    if (ini) ini.textContent = initialsOf(first, last);
  }

  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  function savePersonal() {
    var email = $('#f-email');
    var err = $('#err-email');
    if (!validEmail(email.value)) {
      email.setAttribute('aria-invalid', 'true');
      if (err) err.hidden = false;
      email.focus();
      toast(t('f.email_err'), 'error');
      return;
    }
    email.removeAttribute('aria-invalid');
    if (err) err.hidden = true;

    saved = readForm();
    try { localStorage.setItem(KEY_USER, JSON.stringify(saved)); } catch (e) {}
    paintHero();
    refreshSaveBar();
    toast(t('toast.saved'), 'ok');
  }

  function initPersonal() {
    var stored = {};
    try { stored = JSON.parse(localStorage.getItem(KEY_USER) || '{}'); } catch (e) {}
    if (stored && typeof stored === 'object') writeForm(stored);

    saved = readForm();
    paintHero();

    $$('.js-dirty').forEach(function (el) {
      el.addEventListener('input', refreshSaveBar);
      el.addEventListener('change', refreshSaveBar);
    });

    var save = function (e) { if (e) e.preventDefault(); savePersonal(); };
    $('#save-personal').addEventListener('click', save);
    $('#savebar-save').addEventListener('click', save);

    $('#discard-btn').addEventListener('click', function () {
      writeForm(saved);
      var err = $('#err-email');
      if (err) err.hidden = true;
      $('#f-email').removeAttribute('aria-invalid');
      refreshSaveBar();
      toast(t('toast.discarded'), 'info');
    });

    window.addEventListener('beforeunload', function (e) {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  /* ════════════════════════════════════════
     5. AVATAR
  ════════════════════════════════════════ */
  function initAvatar() {
    var btn = $('#avatar-btn');
    var input = $('#avatar-input');
    var avatar = $('#avatar');
    if (!btn || !input || !avatar) return;

    var stored = null;
    try { stored = localStorage.getItem('inbarber.avatar'); } catch (e) {}
    if (stored) avatar.innerHTML = '<img src="' + stored + '" alt="">';

    btn.addEventListener('click', function () { input.click(); });

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        avatar.innerHTML = '<img src="' + reader.result + '" alt="">';
        try { localStorage.setItem('inbarber.avatar', reader.result); } catch (e) {}
        toast(t('toast.avatar'), 'ok');
      };
      reader.readAsDataURL(file);
    });
  }

  /* ════════════════════════════════════════
     6. PREFERÊNCIAS
  ════════════════════════════════════════ */
  var prefs = {};

  function loadPrefs() {
    try { prefs = JSON.parse(localStorage.getItem(KEY_PREFS) || '{}') || {}; } catch (e) { prefs = {}; }
  }
  function storePrefs() {
    try { localStorage.setItem(KEY_PREFS, JSON.stringify(prefs)); } catch (e) {}
  }

  function applyDisplayPrefs() {
    document.body.classList.toggle('no-motion', !!prefs.reduceMotion);
    document.body.classList.toggle('text-lg', prefs.textsize === 'large');
  }

  function initPrefs() {
    loadPrefs();

    /* Toggles */
    $$('.js-toggle').forEach(function (input) {
      var key = input.dataset.pref;
      if (typeof prefs[key] === 'boolean') input.checked = prefs[key];
      else prefs[key] = input.checked;

      input.addEventListener('change', function () {
        prefs[key] = input.checked;
        storePrefs();
        if (key === 'reduceMotion') applyDisplayPrefs();
        toast(t('toast.pref'), 'ok');
      });
    });

    /* Selects */
    $$('.js-pref').forEach(function (sel) {
      var key = sel.dataset.pref;
      if (typeof prefs[key] === 'string') sel.value = prefs[key];
      else prefs[key] = sel.value;

      sel.addEventListener('change', function () {
        prefs[key] = sel.value;
        storePrefs();
        toast(t('toast.pref'), 'ok');
      });
    });

    /* Segmentos genéricos (formato de hora, tamanho de texto) */
    [['timefmt', 'data-timefmt'], ['textsize', 'data-textsize']].forEach(function (pair) {
      var key = pair[0];
      var btns = $$('[' + pair[1] + ']');
      if (!btns.length) return;

      if (typeof prefs[key] === 'string') {
        var match = btns.filter(function (b) { return b.getAttribute(pair[1]) === prefs[key]; })[0];
        if (match) {
          btns.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
          match.classList.add('active');
          match.setAttribute('aria-pressed', 'true');
        }
      }

      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          btns.forEach(function (o) { o.classList.remove('active'); o.setAttribute('aria-pressed', 'false'); });
          b.classList.add('active');
          b.setAttribute('aria-pressed', 'true');
          prefs[key] = b.getAttribute(pair[1]);
          storePrefs();
          applyDisplayPrefs();
          toast(t('toast.pref'), 'ok');
        });
      });
    });

    applyDisplayPrefs();

    /* Idioma */
    $$('.seg-btn[data-lang]').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.dataset.lang, true); });
    });
  }

  /* ════════════════════════════════════════
     7. SENHA
  ════════════════════════════════════════ */
  function passRules(v) {
    return {
      len: v.length >= 8,
      case: /[a-z]/.test(v) && /[A-Z]/.test(v),
      num: /\d/.test(v),
      sym: /[^A-Za-z0-9]/.test(v)
    };
  }

  function updateStrength() {
    var input = $('#pw-new');
    var box = $('#strength');
    var label = $('#strength-label');
    if (!input || !box) return;

    var v = input.value;
    var rules = passRules(v);
    var score = 0;
    Object.keys(rules).forEach(function (k) { if (rules[k]) score++; });
    if (!v) score = 0;
    if (v && v.length < 8) score = Math.min(score, 1);

    box.setAttribute('data-level', String(score));
    if (label) label.textContent = t('sec.str_' + score);

    $$('#req-list .req').forEach(function (el) {
      el.classList.toggle('is-ok', !!rules[el.dataset.req]);
    });
  }

  function initPassword() {
    $$('.js-reveal').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.classList.toggle('is-visible', show);
      });
    });

    var pwNew = $('#pw-new');
    if (pwNew) pwNew.addEventListener('input', updateStrength);
    updateStrength();

    var confirm = $('#pw-confirm');
    if (confirm) {
      confirm.addEventListener('input', function () {
        var err = $('#err-confirm');
        if (err && !err.hidden && confirm.value === pwNew.value) {
          err.hidden = true;
          confirm.removeAttribute('aria-invalid');
        }
      });
    }

    $('#save-password').addEventListener('click', function () {
      var cur = $('#pw-current');
      var errCur = $('#err-current');
      var errConf = $('#err-confirm');
      var ok = true;

      if (!cur.value) {
        cur.setAttribute('aria-invalid', 'true');
        if (errCur) errCur.hidden = false;
        ok = false;
      } else {
        cur.removeAttribute('aria-invalid');
        if (errCur) errCur.hidden = true;
      }

      var rules = passRules(pwNew.value);
      var strong = rules.len && rules.case && rules.num;
      if (!strong) {
        pwNew.setAttribute('aria-invalid', 'true');
        ok = false;
      } else {
        pwNew.removeAttribute('aria-invalid');
      }

      if (!confirm.value || confirm.value !== pwNew.value) {
        confirm.setAttribute('aria-invalid', 'true');
        if (errConf) errConf.hidden = false;
        ok = false;
      } else {
        confirm.removeAttribute('aria-invalid');
        if (errConf) errConf.hidden = true;
      }

      if (!ok) {
        toast(t('toast.pass_err'), 'error');
        var firstBad = $('.form-input[aria-invalid="true"]');
        if (firstBad) firstBad.focus();
        return;
      }

      cur.value = pwNew.value = confirm.value = '';
      updateStrength();
      revokeAll(true);
      toast(t('toast.pass'), 'ok');
    });
  }

  /* ════════════════════════════════════════
     8. SESSÕES
  ════════════════════════════════════════ */
  function removeRow(row) {
    row.style.transition = 'opacity 200ms ease-out, transform 240ms ease-out, max-height 260ms ease-out, padding 260ms ease-out';
    row.style.overflow = 'hidden';
    row.style.maxHeight = row.offsetHeight + 'px';
    requestAnimationFrame(function () {
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
      row.style.maxHeight = '0px';
      row.style.paddingTop = '0px';
      row.style.paddingBottom = '0px';
    });
    setTimeout(function () { row.remove(); }, 280);
  }

  function revokeAll(silent) {
    var rows = $$('.js-revoke').map(function (b) { return b.closest('.row'); });
    if (!rows.length) { if (!silent) toast(t('toast.sessions_all'), 'info'); return; }
    rows.forEach(removeRow);
    if (!silent) toast(t('toast.sessions_all'), 'ok');
  }

  function initSessions() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.js-revoke');
      if (!btn) return;
      removeRow(btn.closest('.row'));
      toast(t('toast.session'), 'ok');
    });
    $('#revoke-all').addEventListener('click', function () { revokeAll(false); });
  }

  /* ════════════════════════════════════════
     9. DADOS, SESSÃO E ELIMINAÇÃO
  ════════════════════════════════════════ */
  function initData() {
    $('#download-data').addEventListener('click', function () {
      var payload = {
        exportedAt: new Date().toISOString(),
        profile: saved,
        preferences: prefs,
        language: currentLang
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'inbarber-dados.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast(t('toast.export'), 'ok');
    });

    $('#logout-btn').addEventListener('click', function () {
      toast(t('toast.logout'), 'info');
      setTimeout(function () { window.location.href = 'index.html'; }, 900);
    });

    $('#row-history').addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = 'agendar.html';
    });
  }

  function checkDeleteWord() {
    var input = $('#delete-confirm');
    var btn = $('#delete-confirm-btn');
    if (!input || !btn) return;
    btn.disabled = input.value.trim().toUpperCase() !== t('danger.word');
  }

  function initDelete() {
    var overlay = $('#delete-modal');
    var input = $('#delete-confirm');
    var open = $('#delete-btn');
    var cancel = $('#delete-cancel');
    var confirmBtn = $('#delete-confirm-btn');
    var lastFocus = null;

    function openModal() {
      lastFocus = document.activeElement;
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      setTimeout(function () { input.focus(); }, 80);
    }

    function closeModal() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () {
        overlay.hidden = true;
        input.value = '';
        checkDeleteWord();
        if (lastFocus) lastFocus.focus();
      }, 220);
    }

    open.addEventListener('click', openModal);
    cancel.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    input.addEventListener('input', checkDeleteWord);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });

    /* Foco preso dentro do modal */
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = $$('button:not([disabled]), input', overlay).filter(function (el) { return el.offsetParent !== null; });
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    confirmBtn.addEventListener('click', function () {
      closeModal();
      toast(t('toast.deleted'), 'error');
    });
  }

  /* ════════════════════════════════════════
     10. BOOT
  ════════════════════════════════════════ */
  function initBack() {
    $('#back-btn').addEventListener('click', function () {
      if (history.length > 1) history.back();
      else window.location.href = 'index.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initBack();
    initTabs();
    initPersonal();
    initAvatar();
    initPrefs();
    initPassword();
    initSessions();
    initData();
    initDelete();
    applyLang(currentLang, false);
    paintHero();
  });
})();