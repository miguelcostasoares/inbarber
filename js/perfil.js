/* ═══════════════════════════════════════════════════════════
   InBarber — Perfil / Conta
   Dados pessoais e preferências persistidos via API (backend).
   localStorage usado apenas para lang e compatibilidade com
   outros módulos (inbarber.cliente, inbarber.avatar).
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  var KEY_LANG = 'lang';    /* partilhada com js/main.js */
  var API = window.InBarberAPI;

  /* usuarioAtual: shape vindo de serializar_usuario() no backend */
  var usuarioAtual = null;

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
      'badge.verified': 'Email verificado',
      'stat.appts': 'Agendamentos', 'stat.since': 'Cliente desde', 'stat.last': 'Última visita',
      'tab.account': 'Conta', 'tab.prefs': 'Preferências', 'tab.security': 'Segurança',

      'acc.personal': 'Dados pessoais',
      'acc.personal_sub': 'É assim que o seu nome aparece nas reservas.',
      'f.first': 'Nome', 'f.last': 'Sobrenome', 'f.email': 'Email',
      'f.email_hint': 'Enviamos as confirmações de reserva para este endereço.',
      'f.email_err': 'Escreva um email válido.',
      'f.phone': 'Telemóvel', 'f.birth': 'Data de nascimento',
      'f.name_err': 'Indique o seu nome.',
      'f.name_err_digits': 'O nome não pode ter números.',
      'f.name_err_chars': 'Esse carácter não é válido num nome.',
      'f.name_err_short': 'O nome está demasiado curto.',
      'f.last_err': 'Indique o seu sobrenome.',
      'f.phone_err': 'Indique um contacto válido.',
      'f.phone_err_short': 'Número incompleto para o país escolhido.',
      'f.birth_err': 'Verifique a data de nascimento.',
      'tel.country': 'País', 'tel.search': 'Procurar país', 'tel.nofind': 'Nenhum país encontrado.',
      'acc.saved_note': 'Guardado no seu dispositivo.',
      'acc.booking': 'Preferências de reserva',
      'acc.booking_sub': 'Preenchemos as próximas reservas com estas escolhas.',
      'acc.fav_barber': 'Barbeiro preferido', 'acc.no_pref': 'Sem preferência',
      'acc.fav_slot': 'Horário preferido',
      'acc.slot_morning': 'Manhã (9h–12h)', 'acc.slot_afternoon': 'Tarde (12h–18h)', 'acc.slot_evening': 'Fim do dia (18h–21h)',
      'acc.pay': 'Pagamento habitual', 'acc.pay_local': 'No balcão', 'acc.pay_card': 'Cartão guardado',
      'acc.activity': 'Atividade', 'acc.activity_sub': 'As suas reservas, de relance.',
      'acc.history': 'Histórico de agendamentos', 'acc.history_sub': 'Ver e repetir reservas anteriores',
      'acc.new': 'Marcar novo horário', 'acc.new_sub': 'Começa com as suas preferências preenchidas',

      'buy.title': 'Histórico de compras',
      'buy.sub': 'Produtos reservados na loja e levantados no balcão.',
      'buy.spent': 'Total gasto',
      'buy.empty': 'Ainda não comprou nenhum produto.',
      'buy.empty_cta': 'Ver a loja',
      'buy.more': 'Ver todas', 'buy.less': 'Ver menos',
      'buy.note_one': '1 compra no histórico', 'buy.note_many': '{n} compras no histórico',
      'buy.items_one': '1 produto', 'buy.items_many': '{n} produtos',
      'buy.order': 'Reserva',
      'buy.state_done': 'Levantado', 'buy.state_hold': 'Por levantar', 'buy.state_off': 'Cancelada',
      'buy.total': 'Total', 'buy.save': 'Poupou', 'buy.obs': 'Observações',
      'buy.again': 'Comprar outra vez', 'buy.shop': 'Ver a loja',
      'toast.cart': 'Produtos postos no carrinho.',

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
      'sec.terms': 'Termos e política de privacidade', 'sec.terms_sub': 'Atualizado em janeiro de 2026',

      'danger.title': 'Zona de risco', 'danger.sub': 'Estas ações não se desfazem.',
      'danger.logout': 'Terminar sessão', 'danger.logout_sub': 'Sai desta conta neste dispositivo',
      'danger.delete': 'Eliminar conta', 'danger.delete_sub': 'Apaga o histórico e os dados da conta',
      'danger.modal_text': 'Perde o histórico de reservas e todas as preferências guardadas. Não conseguimos recuperar depois.',
      'danger.modal_label': 'Escreva ELIMINAR para confirmar',
      'danger.word': 'ELIMINAR', 'danger.confirm': 'Eliminar para sempre',

      'save.title': 'Alterações por guardar', 'save.sub': 'Nos dados pessoais', 'save.discard': 'Descartar',

      'toast.saved': 'Dados pessoais guardados.',
      'toast.discarded': 'Alterações descartadas.',
      'toast.lang': 'Idioma alterado para Português.',
      'toast.pref': 'Preferência guardada.',
      'toast.pass': 'Senha atualizada. As outras sessões foram terminadas.',
      'toast.pass_err': 'Verifique os campos assinalados.',
      'toast.form_err': 'Verifique os campos assinalados.',
      'toast.avatar': 'Foto de perfil atualizada.',
      'toast.session': 'Sessão terminada.',
      'toast.sessions_all': 'As outras sessões foram terminadas.',
      'toast.logout': 'Sessão terminada. Até breve.',
      'toast.deleted': 'Pedido de eliminação registado.'
    },

    en: {
      'lang.label': 'English',
      'common.back': 'Back', 'common.cancel': 'Cancel', 'btn.save': 'Save',
      'top.sub': 'Profile',
      'hd.tag': 'Your account', 'hd.hello': 'Hi,',
      'hd.hint': 'Your details, preferences and security — all in one place.',
      'badge.verified': 'Email verified',
      'stat.appts': 'Bookings', 'stat.since': 'Member since', 'stat.last': 'Last visit',
      'tab.account': 'Account', 'tab.prefs': 'Preferences', 'tab.security': 'Security',

      'acc.personal': 'Personal details',
      'acc.personal_sub': 'This is how your name shows up on bookings.',
      'f.first': 'First name', 'f.last': 'Last name', 'f.email': 'Email',
      'f.email_hint': 'We send booking confirmations to this address.',
      'f.email_err': 'Enter a valid email.',
      'f.phone': 'Mobile', 'f.birth': 'Date of birth',
      'f.name_err': 'Please enter your first name.',
      'f.name_err_digits': 'A name cannot contain numbers.',
      'f.name_err_chars': 'That character is not valid in a name.',
      'f.name_err_short': 'That name is too short.',
      'f.last_err': 'Please enter your last name.',
      'f.phone_err': 'Please enter a valid phone number.',
      'f.phone_err_short': 'Number is incomplete for the country you picked.',
      'f.birth_err': 'Check the date of birth.',
      'tel.country': 'Country', 'tel.search': 'Search country', 'tel.nofind': 'No country found.',
      'acc.saved_note': 'Saved on your device.',
      'acc.booking': 'Booking preferences',
      'acc.booking_sub': 'We pre-fill your next booking with these.',
      'acc.fav_barber': 'Preferred barber', 'acc.no_pref': 'No preference',
      'acc.fav_slot': 'Preferred time',
      'acc.slot_morning': 'Morning (9am–12pm)', 'acc.slot_afternoon': 'Afternoon (12pm–6pm)', 'acc.slot_evening': 'Evening (6pm–9pm)',
      'acc.pay': 'Usual payment', 'acc.pay_local': 'At the counter', 'acc.pay_card': 'Saved card',
      'acc.activity': 'Activity', 'acc.activity_sub': 'Your bookings at a glance.',
      'acc.history': 'Booking history', 'acc.history_sub': 'View and rebook past visits',
      'acc.new': 'Book a new slot', 'acc.new_sub': 'Starts with your preferences filled in',

      'buy.title': 'Purchase history',
      'buy.sub': 'Products reserved in the shop and picked up at the counter.',
      'buy.spent': 'Total spent',
      'buy.empty': "You haven't bought any products yet.",
      'buy.empty_cta': 'Go to the shop',
      'buy.more': 'See all', 'buy.less': 'See less',
      'buy.note_one': '1 purchase on record', 'buy.note_many': '{n} purchases on record',
      'buy.items_one': '1 product', 'buy.items_many': '{n} products',
      'buy.order': 'Order',
      'buy.state_done': 'Picked up', 'buy.state_hold': 'Awaiting pickup', 'buy.state_off': 'Cancelled',
      'buy.total': 'Total', 'buy.save': 'You saved', 'buy.obs': 'Notes',
      'buy.again': 'Buy again', 'buy.shop': 'Go to the shop',
      'toast.cart': 'Products added to your cart.',

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
      'sec.terms': 'Terms and privacy policy', 'sec.terms_sub': 'Updated January 2026',

      'danger.title': 'Danger zone', 'danger.sub': 'These actions cannot be undone.',
      'danger.logout': 'Sign out', 'danger.logout_sub': 'Leaves this account on this device',
      'danger.delete': 'Delete account', 'danger.delete_sub': 'Erases your history and account data',
      'danger.modal_text': 'You lose your booking history and every saved preference. We cannot bring them back.',
      'danger.modal_label': 'Type DELETE to confirm',
      'danger.word': 'DELETE', 'danger.confirm': 'Delete permanently',

      'save.title': 'Unsaved changes', 'save.sub': 'In personal details', 'save.discard': 'Discard',

      'toast.saved': 'Personal details saved.',
      'toast.discarded': 'Changes discarded.',
      'toast.lang': 'Language set to English.',
      'toast.pref': 'Preference saved.',
      'toast.pass': 'Password updated. Other sessions were signed out.',
      'toast.pass_err': 'Check the highlighted fields.',
      'toast.form_err': 'Check the highlighted fields.',
      'toast.avatar': 'Profile photo updated.',
      'toast.session': 'Session signed out.',
      'toast.sessions_all': 'Other sessions were signed out.',
      'toast.logout': 'Signed out. See you soon.',
      'toast.deleted': 'Deletion request registered.'
    },

    es: {
      'lang.label': 'Español',
      'common.back': 'Volver', 'common.cancel': 'Cancelar', 'btn.save': 'Guardar',
      'top.sub': 'Perfil',
      'hd.tag': 'Tu cuenta', 'hd.hello': 'Hola,',
      'hd.hint': 'Tus datos, preferencias y seguridad — todo en un sitio.',
      'badge.verified': 'Email verificado',
      'stat.appts': 'Reservas', 'stat.since': 'Cliente desde', 'stat.last': 'Última visita',
      'tab.account': 'Cuenta', 'tab.prefs': 'Preferencias', 'tab.security': 'Seguridad',

      'acc.personal': 'Datos personales',
      'acc.personal_sub': 'Así aparece tu nombre en las reservas.',
      'f.first': 'Nombre', 'f.last': 'Apellido', 'f.email': 'Email',
      'f.email_hint': 'Enviamos las confirmaciones a esta dirección.',
      'f.email_err': 'Escribe un email válido.',
      'f.phone': 'Móvil', 'f.birth': 'Fecha de nacimiento',
      'f.name_err': 'Indica tu nombre.',
      'f.name_err_digits': 'El nombre no puede llevar números.',
      'f.name_err_chars': 'Ese carácter no es válido en un nombre.',
      'f.name_err_short': 'El nombre es demasiado corto.',
      'f.last_err': 'Indica tu apellido.',
      'f.phone_err': 'Indica un teléfono válido.',
      'f.phone_err_short': 'Número incompleto para el país elegido.',
      'f.birth_err': 'Revisa la fecha de nacimiento.',
      'tel.country': 'País', 'tel.search': 'Buscar país', 'tel.nofind': 'No se encontró ningún país.',
      'acc.saved_note': 'Guardado en tu dispositivo.',
      'acc.booking': 'Preferencias de reserva',
      'acc.booking_sub': 'Rellenamos tus próximas reservas con esto.',
      'acc.fav_barber': 'Barbero preferido', 'acc.no_pref': 'Sin preferencia',
      'acc.fav_slot': 'Horario preferido',
      'acc.slot_morning': 'Mañana (9h–12h)', 'acc.slot_afternoon': 'Tarde (12h–18h)', 'acc.slot_evening': 'Última hora (18h–21h)',
      'acc.pay': 'Pago habitual', 'acc.pay_local': 'En el mostrador', 'acc.pay_card': 'Tarjeta guardada',
      'acc.activity': 'Actividad', 'acc.activity_sub': 'Tus reservas de un vistazo.',
      'acc.history': 'Historial de reservas', 'acc.history_sub': 'Ver y repetir visitas anteriores',
      'acc.new': 'Reservar nuevo horario', 'acc.new_sub': 'Empieza con tus preferencias rellenadas',

      'buy.title': 'Historial de compras',
      'buy.sub': 'Productos reservados en la tienda y recogidos en el mostrador.',
      'buy.spent': 'Total gastado',
      'buy.empty': 'Todavía no has comprado ningún producto.',
      'buy.empty_cta': 'Ver la tienda',
      'buy.more': 'Ver todas', 'buy.less': 'Ver menos',
      'buy.note_one': '1 compra en el historial', 'buy.note_many': '{n} compras en el historial',
      'buy.items_one': '1 producto', 'buy.items_many': '{n} productos',
      'buy.order': 'Reserva',
      'buy.state_done': 'Recogido', 'buy.state_hold': 'Pendiente de recoger', 'buy.state_off': 'Cancelada',
      'buy.total': 'Total', 'buy.save': 'Ahorraste', 'buy.obs': 'Observaciones',
      'buy.again': 'Comprar otra vez', 'buy.shop': 'Ver la tienda',
      'toast.cart': 'Productos añadidos al carrito.',

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
      'sec.terms': 'Términos y política de privacidad', 'sec.terms_sub': 'Actualizado en enero de 2026',

      'danger.title': 'Zona de riesgo', 'danger.sub': 'Estas acciones no se deshacen.',
      'danger.logout': 'Cerrar sesión', 'danger.logout_sub': 'Sales de esta cuenta en este dispositivo',
      'danger.delete': 'Eliminar cuenta', 'danger.delete_sub': 'Borra tu historial y los datos de la cuenta',
      'danger.modal_text': 'Pierdes el historial de reservas y todas las preferencias guardadas. No podemos recuperarlo.',
      'danger.modal_label': 'Escribe ELIMINAR para confirmar',
      'danger.word': 'ELIMINAR', 'danger.confirm': 'Eliminar para siempre',

      'save.title': 'Cambios sin guardar', 'save.sub': 'En datos personales', 'save.discard': 'Descartar',

      'toast.saved': 'Datos personales guardados.',
      'toast.discarded': 'Cambios descartados.',
      'toast.lang': 'Idioma cambiado a Español.',
      'toast.pref': 'Preferencia guardada.',
      'toast.pass': 'Contraseña actualizada. Se cerraron las demás sesiones.',
      'toast.pass_err': 'Revisa los campos marcados.',
      'toast.form_err': 'Revisa los campos marcados.',
      'toast.avatar': 'Foto de perfil actualizada.',
      'toast.session': 'Sesión cerrada.',
      'toast.sessions_all': 'Se cerraron las demás sesiones.',
      'toast.logout': 'Sesión cerrada. Hasta pronto.',
      'toast.deleted': 'Solicitud de eliminación registrada.'
    }
  };

  var currentLang = localStorage.getItem(KEY_LANG) || 'pt';
  function t(key, vars) {
    var s = (i18n[currentLang] && i18n[currentLang][key]) || i18n.pt[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  /* js/telefone.js vai buscar as suas etiquetas ao window.I18N global.
     A landing carrega js/i18n.js; o perfil tem dicionário próprio, por
     isso damos-lhe aqui uma ponte com as chaves que ele usa. */
  if (!window.I18N) {
    var PONTE = {
      'prod.tel_country': 'tel.country',
      'prod.tel_search':  'tel.search',
      'prod.tel_nofind':  'tel.nofind'
    };
    window.I18N = {
      get lang() { return currentLang; },
      t: function (k) { return t(PONTE[k] || k); }
    };
  }

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

    /* O componente de telefone e o histórico têm texto gerado em JS:
       não têm data-i18n, por isso pedimos-lhes que se repintem. */
    if (telefone) telefone.repintar();
    revalidar();
    renderCompras();

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
        var wrap = b.parentElement;
        var pr = wrap.getBoundingClientRect();
        var br = b.getBoundingClientRect();
        var vertical = getComputedStyle(wrap).flexDirection === 'column';
        if (vertical) {
          ind.style.left = '';
          ind.style.width = '';
          ind.style.top = (br.top - pr.top + 8) + 'px';
          ind.style.height = (br.height - 16) + 'px';
        } else {
          ind.style.top = '';
          ind.style.height = '';
          ind.style.left = (br.left - pr.left) + 'px';
          ind.style.width = br.width + 'px';
        }
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

     Cada caixa só aceita o que faz sentido: o nome recusa dígitos na
     hora, o email tem de ser um email e o telemóvel usa o mesmo
     componente de bandeiras do modal de pagamento dos produtos.
  ════════════════════════════════════════ */
  var FIELDS = ['f-first', 'f-last', 'f-email', 'f-phone', 'f-birth'];
  var saved = {};
  var telefone = null;

  function readForm() {
    var out = {};
    FIELDS.forEach(function (id) { var el = document.getElementById(id); if (el) out[id] = el.value; });
    out.pais = telefone ? telefone.pais().iso : (saved.pais || 'PT');
    out.e164 = telefone ? telefone.e164() : (saved.e164 || '');
    return out;
  }

  function writeForm(data) {
    FIELDS.forEach(function (id) {
      if (id === 'f-phone') return;                 /* tratado pelo componente */
      var el = document.getElementById(id);
      if (el && typeof data[id] === 'string') el.value = data[id];
    });
    if (telefone) reporTelefone(data);
  }

  /* Repõe país + número sem roubar o foco. Aceita o formato novo
     (pais + e164) e o antigo, em que só havia a string 'f-phone'. */
  function reporTelefone(data) {
    var e164 = data && data.e164;
    /* Tem número e164 válido vindo da API (ex: '+5511988887777') */
    if (e164 && String(e164).replace(/\D/g, '').length > 4) {
      telefone.definir(e164);
      return;
    }
    /* Sem número: respeita o país salvo, se houver; senão limpa o campo */
    if (data && data.pais) {
      telefone.definirPais(data.pais, true);
    }
    var local = data && data['f-phone'];
    telefone.definir(local || '');
  }

  function isDirty() {
    var now = readForm();
    if (now.pais !== saved.pais) return true;
    return FIELDS.some(function (id) { return now[id] !== saved[id]; });
  }

  /* ── Erros de campo ──────────────────────────────────────────
     Um sítio só para acender e apagar o aviso de cada caixa. */
  function marcarErro(input, alvoErro, mensagem) {
    var err = typeof alvoErro === 'string' ? $(alvoErro) : alvoErro;
    if (input) input.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
    if (input && !mensagem) input.removeAttribute('aria-invalid');
    if (err) {
      err.textContent = mensagem || '';
      err.hidden = !mensagem;
    }
    var box = input && input.closest('.form-tel');
    if (box) box.classList.toggle('is-invalid', !!mensagem);
    return !mensagem;
  }

  /* ── Nome: letras, não números ────────────────────────────────
     Em vez de deixar escrever e só reclamar no fim, o campo recusa
     o carácter na hora e explica porquê. */
  var RE_DIGITO = /[0-9]/;
  var RE_NOME_MAU = /[^\p{L}\p{M}\s'’.-]/gu;

  function limparNome(v) {
    return String(v || '').replace(RE_NOME_MAU, '').replace(/\s{2,}/g, ' ');
  }

  function contarLetras(v) { return String(v).replace(/[^\p{L}]/gu, '').length; }

  var avisoNomeAte = {};

  function validarNome(id, mostrar) {
    var el = $('#' + id);
    if (!el) return true;
    var v = el.value.trim();
    var vazio = id === 'f-first' ? t('f.name_err') : t('f.last_err');
    var msg = !v ? vazio
            : contarLetras(v) < 2 ? t('f.name_err_short')
            : '';
    /* Enquanto o aviso de carácter inválido está de pé, não o apagamos */
    if (!mostrar && Date.now() < (avisoNomeAte[id] || 0)) return !msg;
    if (mostrar || el.getAttribute('aria-invalid') === 'true') marcarErro(el, '#err-' + id.slice(2), msg);
    return !msg;
  }

  function ligarFiltroNome(el) {
    var id = el.id;
    var errSel = '#err-' + id.slice(2);

    el.addEventListener('input', function () {
      var antes = el.value;
      var depois = limparNome(antes);
      if (depois !== antes) {
        var pos = el.selectionStart - (antes.length - depois.length);
        el.value = depois;
        try { el.setSelectionRange(pos, pos); } catch (_) {}

        /* O carácter desaparece do campo; sem esta mensagem a pessoa
           não percebe porquê. Fica de pé uns segundos para ser lida. */
        marcarErro(el, errSel, RE_DIGITO.test(antes) ? t('f.name_err_digits') : t('f.name_err_chars'));
        avisoNomeAte[id] = Date.now() + 2600;
        setTimeout(function () { validarNome(id, false); }, 2700);
      } else {
        validarNome(id, false);
      }
      refreshSaveBar();
    });

    el.addEventListener('blur', function () { validarNome(id, true); });
  }

  /* ── Email ── */
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()); }

  function validarEmail(mostrar) {
    var el = $('#f-email');
    if (!el) return true;
    var msg = validEmail(el.value) ? '' : t('f.email_err');
    if (mostrar || el.getAttribute('aria-invalid') === 'true') marcarErro(el, '#err-email', msg);
    return !msg;
  }

  /* ── Telemóvel ── */
  function validarTel(mostrar) {
    var el = $('#f-phone');
    if (!el || !telefone) return true;
    var msg = telefone.vazio() ? t('f.phone_err')
            : !telefone.valido() ? t('f.phone_err_short')
            : '';
    var box = el.closest('.form-tel');
    if (mostrar || (box && box.classList.contains('is-invalid'))) marcarErro(el, '#err-phone', msg);
    return !msg;
  }

  /* ── Data de nascimento ── */
  function validarNasc(mostrar) {
    var el = $('#f-birth');
    if (!el) return true;
    var msg = '';
    if (el.value) {
      var d = new Date(el.value + 'T00:00:00');
      var ano = d.getFullYear();
      if (isNaN(d.getTime()) || d > new Date() || ano < 1900) msg = t('f.birth_err');
    }
    if (mostrar || el.getAttribute('aria-invalid') === 'true') marcarErro(el, '#err-birth', msg);
    return !msg;
  }

  function ligarTelefone() {
    var box = $('#tel-box');
    var input = $('#f-phone');
    if (!box || !input || !window.CampoTelefone) return;

    telefone = window.CampoTelefone.ligar({
      box: box,
      input: input,
      iso: 'PT',
      onChange: function () { validarTel(false); refreshSaveBar(); },
      limiteBaixo: function () {
        var bar = $('#save-bar');
        if (!bar || !bar.classList.contains('is-open')) return null;
        return bar.getBoundingClientRect().top - 10;
      },
      limiteCima: function () {
        var top = $('.topbar');
        return top ? top.getBoundingClientRect().bottom + 10 : null;
      }
    });

    input.addEventListener('input', function () { validarTel(false); refreshSaveBar(); });
    input.addEventListener('blur', function () { validarTel(true); });
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

  /* Valida tudo e devolve o primeiro campo por corrigir */
  function primeiroInvalido() {
    var ordem = [
      ['f-first', validarNome('f-first', true)],
      ['f-last',  validarNome('f-last', true)],
      ['f-email', validarEmail(true)],
      ['f-phone', validarTel(true)],
      ['f-birth', validarNasc(true)]
    ];
    for (var i = 0; i < ordem.length; i++) if (!ordem[i][1]) return ordem[i][0];
    return null;
  }

  function limparErros() {
    [['f-first', '#err-first'], ['f-last', '#err-last'], ['f-email', '#err-email'],
     ['f-phone', '#err-phone'], ['f-birth', '#err-birth']].forEach(function (par) {
      marcarErro($('#' + par[0]), par[1], '');
    });
    avisoNomeAte = {};
  }

  function savePersonal() {
    var mau = primeiroInvalido();
    if (mau) {
      var el = $('#' + mau);
      if (el) el.focus();
      toast(t('toast.form_err'), 'error');
      return;
    }

    saved = readForm();
    saved['f-first'] = saved['f-first'].trim();
    saved['f-last']  = saved['f-last'].trim();
    saved['f-email'] = saved['f-email'].trim();
    $('#f-first').value = saved['f-first'];
    $('#f-last').value  = saved['f-last'];
    $('#f-email').value = saved['f-email'];

    var payload = {
      primeiroNome:   saved['f-first'],
      sobrenome:      saved['f-last'],
      email:          saved['f-email'],
      telefone:       saved.e164 || saved['f-phone'] || null,
      dataNascimento: saved['f-birth'] || null,
    };

    var btnSave = $('#save-personal');
    var btnBar  = $('#savebar-save');
    if (btnSave) btnSave.disabled = true;
    if (btnBar)  btnBar.disabled  = true;

    API.updateProfile(payload).then(function (res) {
      usuarioAtual = res.usuario;
      sincronizarLocalStorage(res.usuario);
      paintHero();
      refreshSaveBar();
      toast(t('toast.saved'), 'ok');
    }).catch(function (err) {
      toast(err.message || t('toast.form_err'), 'error');
    }).finally(function () {
      if (btnSave) btnSave.disabled = false;
      if (btnBar)  btnBar.disabled  = false;
    });
  }

  function initPersonal() {
    ligarTelefone();

    /* Formulário começa vazio — a API preenche a seguir */
    saved = readForm();
    paintHero();

    $$('.js-nome').forEach(ligarFiltroNome);

    var email = $('#f-email');
    if (email) {
      email.addEventListener('input', function () { validarEmail(false); });
      email.addEventListener('blur',  function () { validarEmail(true); });
    }
    var nasc = $('#f-birth');
    if (nasc) nasc.addEventListener('change', function () { validarNasc(true); });

    $$('.js-dirty').forEach(function (el) {
      el.addEventListener('input', refreshSaveBar);
      el.addEventListener('change', refreshSaveBar);
    });

    var save = function (e) { if (e) e.preventDefault(); savePersonal(); };
    $('#save-personal').addEventListener('click', save);
    $('#savebar-save').addEventListener('click', save);

    $('#discard-btn').addEventListener('click', function () {
      writeForm(saved);
      limparErros();
      refreshSaveBar();
      toast(t('toast.discarded'), 'info');
    });

    window.addEventListener('beforeunload', function (e) {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  function revalidar() {
    validarNome('f-first', false);
    validarNome('f-last', false);
    validarEmail(false);
    validarTel(false);
    validarNasc(false);
  }

  /* ════════════════════════════════════════
     4b. HISTÓRICO DE COMPRAS DE PRODUTOS

     As reservas feitas em produtos.html vivem em ProdutosData; a estas
     juntam-se compras antigas de exemplo, para o mockup nunca aparecer
     vazio a quem entra pela primeira vez.
  ════════════════════════════════════════ */
  
  var VISIVEIS = 3;
  var compras = [];
  var comprasAbertas = {};
  var verTodas = false;

  var ESTADOS = {
    confirmado: ['done', 'buy.state_done'],
    reservado:  ['hold', 'buy.state_hold'],
    libertado:  ['off',  'buy.state_off']
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function preco(n) {
    if (window.ProdutosData && window.ProdutosData.fmtPreco) return window.ProdutosData.fmtPreco(n);
    return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',');
  }

  function fmtData(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var loc = currentLang === 'en' ? 'en-GB' : currentLang === 'es' ? 'es-ES' : 'pt-PT';
    return d.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function contarItens(c) {
    return (c.produtos || []).reduce(function (s, l) { return s + (l.quantidade || 0); }, 0);
  }

  var ICO_SACO = '<svg viewBox="0 0 20 20"><path d="M3 6.5h14l-1.2 9.4a1.5 1.5 0 0 1-1.5 1.3H5.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M7 6.5a3 3 0 0 1 6 0"/></svg>';
  var ICO_CHEV = '<svg class="buy-chev" viewBox="0 0 12 12" aria-hidden="true"><polyline points="3,4.5 6,7.5 9,4.5"/></svg>';

  function compraHTML(c, escondida) {
    var est = ESTADOS[c.estado] || ESTADOS.confirmado;
    var n = contarItens(c);
    var aberta = !!comprasAbertas[c.id];

    var linhas = (c.produtos || []).map(function (l) {
      return '<li class="buy-line">' +
               '<span class="buy-q">' + l.quantidade + '×</span>' +
               '<span class="buy-n">' + esc(l.nome) + '</span>' +
               '<span class="buy-p">' + preco(l.subtotal) + '</span>' +
             '</li>';
    }).join('');

    var resumo = '<div class="buy-sum">' +
      '<p class="buy-sum-line"><span>' + t('buy.total') + '</span><strong>' + preco(c.total) + '</strong></p>' +
      (c.poupanca > 0
        ? '<p class="buy-sum-line buy-sum-line--save"><span>' + t('buy.save') + '</span><span>' + preco(c.poupanca) + '</span></p>'
        : '') +
      '</div>';

    var obs = c.observacoes
      ? '<p class="buy-meta">' + t('buy.obs') + ': ' + esc(c.observacoes) + '</p>'
      : '';

    var acoes = c.estado === 'libertado' ? '' :
      '<div class="buy-actions">' +
        '<button type="button" class="btn btn--ghost btn--sm js-buy-again" data-id="' + esc(c.id) + '">' +
          t('buy.again') + '</button>' +
      '</div>';

    return '' +
      '<div class="buy-item' + (aberta ? ' is-open' : '') + '" data-id="' + esc(c.id) + '" role="listitem"' +
        (escondida ? ' hidden' : '') + '>' +
        '<button type="button" class="row row--link buy-hd" aria-expanded="' + aberta + '" ' +
                'aria-controls="buy-body-' + esc(c.id) + '">' +
          '<span class="row-icon">' + ICO_SACO + '</span>' +
          '<span class="row-text">' +
            '<strong>' + (n === 1 ? t('buy.items_one') : t('buy.items_many', { n: n })) + '</strong>' +
            '<small class="buy-when">' + fmtData(c.dataReserva) +
              ' <span class="buy-num">· ' + t('buy.order') + ' #' + esc(c.numero) + '</span></small>' +
          '</span>' +
          '<span class="buy-total">' + preco(c.total) + '</span>' +
          '<span class="buy-state buy-state--' + est[0] + '">' + t(est[1]) + '</span>' +
          ICO_CHEV +
        '</button>' +
        '<div class="buy-body" id="buy-body-' + esc(c.id) + '"' + (aberta ? '' : ' hidden') + '>' +
          '<ul class="buy-lines" role="list">' + linhas + '</ul>' +
          resumo + obs + acoes +
        '</div>' +
      '</div>';
  }

  function renderCompras() {
    var lista = $('#buy-list');
    if (!lista) return;

    var vazio = $('#buy-empty');
    var foot  = $('#buy-foot');
    var spent = $('#buy-spent');
    var nota  = $('#buy-note');
    var more  = $('#buy-more');

    if (!compras.length) {
      lista.innerHTML = '';
      if (vazio) vazio.hidden = false;
      if (foot)  foot.hidden = true;
      if (spent) spent.hidden = true;
      return;
    }
    if (vazio) vazio.hidden = true;

    lista.innerHTML = compras.map(function (c, i) {
      return compraHTML(c, !verTodas && i >= VISIVEIS);
    }).join('');

    var gasto = compras.reduce(function (s, c) {
      return s + (c.estado === 'libertado' ? 0 : (c.total || 0));
    }, 0);
    if (spent) {
      spent.hidden = false;
      $('#buy-spent-num').textContent = preco(gasto);
      $('.buy-spent-label').textContent = t('buy.spent');
    }

    if (foot) {
      foot.hidden = compras.length <= VISIVEIS;
      if (nota) nota.textContent = compras.length === 1
        ? t('buy.note_one')
        : t('buy.note_many', { n: compras.length });
      if (more) more.textContent = verTodas ? t('buy.less') : t('buy.more');
    }
  }

  function alternarCompra(item) {
    var id = item.dataset.id;
    var body = $('.buy-body', item);
    var head = $('.buy-hd', item);
    var abrir = !comprasAbertas[id];
    comprasAbertas[id] = abrir;
    item.classList.toggle('is-open', abrir);
    if (head) head.setAttribute('aria-expanded', String(abrir));
    if (body) body.hidden = !abrir;
  }

  function comprarOutraVez(id) {
    var c = compras.filter(function (x) { return x.id === id; })[0];
    if (!c || !window.ProdutosData) return;
    (c.produtos || []).forEach(function (l) {
      if (l.produtoId) window.ProdutosData.carrinho.adicionar(l.produtoId, l.quantidade || 1);
    });
    toast(t('toast.cart'), 'ok');
    setTimeout(function () { window.location.href = '/produtos.html'; }, 700);
  }

function initCompras() {
    var lista = $('#buy-list');
    if (!lista) return;

    lista.addEventListener('click', function (e) {
      var again = e.target.closest('.js-buy-again');
      if (again) { e.preventDefault(); comprarOutraVez(again.dataset.id); return; }
      var head = e.target.closest('.buy-hd');
      if (head) alternarCompra(head.closest('.buy-item'));
    });

    var more = $('#buy-more');
    if (more) more.addEventListener('click', function () {
      verTodas = !verTodas;
      renderCompras();
    });

    /* Começa vazio — carregado após a hidratação do usuário em bootPerfil() */
    renderCompras();
  }

  function carregarCompras() {
    API.listProductReservations().then(function (reais) {
      compras = (reais || []).map(function (r) {
        return {
          id:          r.id,
          numero:      r.numero,
          dataReserva: r.dataReserva || r.data_reserva,
          estado:      r.estado,
          total:       r.total,
          poupanca:    r.poupanca || 0,
          observacoes: r.observacoes || '',
          produtos:    (r.itens || r.produtos || []).map(function (l) {
            return {
              produtoId:   l.produtoId   || l.produto_id,
              nome:        l.nome,
              quantidade:  l.quantidade,
              preco:       l.preco,
              precoTabela: l.precoTabela || l.preco_tabela || null,
              subtotal:    l.subtotal,
            };
          }),
        };
      });
      renderCompras();
    }).catch(function () {
      /* Silencioso: lista fica vazia se a API falhar */
      renderCompras();
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
    /* Preenchido pelo objeto usuario.prefs vindo da API em bootPerfil().
       Esta função agora só serve de fallback se a API ainda não respondeu. */
    prefs = {};
  }

  function storePrefs(patch) {
    /* Persiste no backend; atualiza prefs local otimisticamente */
    Object.assign(prefs, patch);
    API.updatePrefs(patch).catch(function () {
      /* silencioso: o estado local já está atualizado e toast já foi dado */
    });
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
        var patch = {};
        patch[key] = input.checked;
        storePrefs(patch);
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
        var patch = {};
        patch[key] = sel.value;
        storePrefs(patch);
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
          var patch = {};
          patch[key] = b.getAttribute(pair[1]);
          storePrefs(patch);
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

      var payload = { senhaAtual: cur.value, novaSenha: pwNew.value };
      var btnSave = $('#save-password');
      if (btnSave) btnSave.disabled = true;

      API.updatePassword(payload).then(function (res) {
        /* Rotaciona o token salvo localmente */
        try { localStorage.setItem('inbarber_token', res.token); } catch (e) {}
        cur.value = pwNew.value = confirm.value = '';
        updateStrength();
        toast(t('toast.pass'), 'ok');
      }).catch(function (err) {
        /* Senha atual incorreta ou outro erro de servidor */
        cur.setAttribute('aria-invalid', 'true');
        if (errCur) { errCur.textContent = err.message || t('sec.err_current'); errCur.hidden = false; }
        toast(t('toast.pass_err'), 'error');
      }).finally(function () {
        if (btnSave) btnSave.disabled = false;
      });
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
    $('#logout-btn').addEventListener('click', function () {
      API.logout().catch(function () {}).finally(function () {
        try {
          localStorage.removeItem('inbarber_token');
          localStorage.removeItem('inbarber_user');
          localStorage.removeItem('inbarber.profile');
          localStorage.removeItem('inbarber.avatar');
        } catch (e) {}
        toast(t('toast.logout'), 'info');
        setTimeout(function () { window.location.href = '/index.html'; }, 900);
      });
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
  function sincronizarLocalStorage(u) {
    /* Mantém compatibilidade com modal de produtos (inbarber.cliente) */
    try {
      localStorage.setItem('inbarber_user', JSON.stringify({
        id:           u.id,
        nome:         u.primeiroNome,
        sobrenome:    u.sobrenome,
        nomeCompleto: u.nomeCompleto,
        email:        u.email,
        telefone:     u.telefone,
      }));
      localStorage.setItem('inbarber.profile', JSON.stringify({
        'f-first': u.primeiroNome,
        'f-last':  u.sobrenome,
        'f-email': u.email,
        'f-phone': u.telefone || '',
        'f-birth': u.dataNascimento || '',
        e164:      u.telefone || '',
      }));
      localStorage.setItem('inbarber.cliente', JSON.stringify({
        nome: u.nomeCompleto,
        e164: u.telefone || '',
      }));
    } catch (e) {}
  }

  function preencherPrefsDaAPI(u) {
    var p = u.prefs || {};

    /* Mapeamento entre chaves da API → chaves usadas nos selects/toggles */
    var MAPA_PREF = {
      barber:         p.barbeiroId  || '',
      slot:           p.horario     || '',
      pay:            p.pagamento   || '',
      notifReminder:  p.notifLembrete,
      notifEmail:     p.notifEmail,
      notifSms:       p.notifSms,
      notifPromos:    p.notifPromos,
      lead:           String(p.leadHoras || 24),
      reduceMotion:   p.reduceMotion,
    };

    prefs = Object.assign({}, MAPA_PREF);

    /* Toggles */
    $$('.js-toggle').forEach(function (input) {
      var key = input.dataset.pref;
      if (typeof prefs[key] === 'boolean') input.checked = prefs[key];
    });

    /* Selects */
    $$('.js-pref').forEach(function (sel) {
      var key = sel.dataset.pref;
      if (typeof prefs[key] === 'string') sel.value = prefs[key];
    });

    /* Idioma */
    var idioma = p.idioma || 'pt';
    applyLang(idioma, false);

    /* Formato de hora */
    var fmt = String(p.formatoHora || 24);
    $$('[data-timefmt]').forEach(function (b) {
      var on = b.dataset.timefmt === fmt;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    prefs.timefmt = fmt;

    /* Tamanho de texto */
    var txt = p.tamanhoTexto || 'default';
    $$('[data-textsize]').forEach(function (b) {
      var on = b.dataset.textsize === txt;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    prefs.textsize = txt;

    applyDisplayPrefs();
  }

  function preencherStatsDaAPI(u) {
    /* Stats do cartão lateral (agendamentos, cliente desde, última visita) */
    /* Esses dados virão do cliente_id quando vinculado — por ora mostramos
       os campos que já temos na tabela usuarios */
    var desde = u.createdAt ? new Date(u.createdAt).getFullYear() : '—';
    var statSince = $('.acct-stat-num:nth-child(1)', $('.acct-stats'));

    var stats = $$('.acct-stat');
    /* stat[0] = agendamentos, stat[1] = cliente desde, stat[2] = última visita */
    if (stats[1]) {
      var numEl = stats[1].querySelector('.acct-stat-num');
      if (numEl) numEl.textContent = desde;
    }
    /* stat[0] e stat[2] ficam para etapa futura (requerem join com agendamentos via cliente_id) */
  }

  function bootPerfil() {
    var token = '';
    try { token = localStorage.getItem('inbarber_token') || ''; } catch (e) {}

    if (!token) {
      window.location.href = '/login.html';
      return;
    }

    API.getMe().then(function (res) {
      usuarioAtual = res.usuario;
      var u = usuarioAtual;

      /* 1. Preenche formulário de dados pessoais */
      writeForm({
        'f-first': u.primeiroNome || '',
        'f-last':  u.sobrenome    || '',
        'f-email': u.email        || '',
        'f-birth': u.dataNascimento || '',
        e164:      u.telefone     || '',
      });
      saved = readForm();

      /* 2. Pinta hero / avatar initials */
      paintHero();

      /* 3. Badge de email verificado */
      var badge = $('.acct-badges');
      if (badge) badge.hidden = !u.emailVerificado;

      /* 4. Estatísticas */
      preencherStatsDaAPI(u);

      /* 5. Preferências */
      preencherPrefsDaAPI(u);

      /* 6. Histórico de compras (filtra pelo clienteId se disponível) */
      carregarCompras();

    }).catch(function () {
      /* Token expirado ou inválido → manda para login */
      try { localStorage.removeItem('inbarber_token'); } catch (e) {}
      window.location.href = '/login.html';
    });
  }

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
    initCompras();
    initAvatar();
    initPrefs();
    initPassword();
    initSessions();
    initData();
    initDelete();
    bootPerfil();   /* hidrata tudo via API — substitui applyLang + paintHero diretos */
  });
})();