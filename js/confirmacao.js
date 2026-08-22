(function () {
  /* ══ helpers ══ */
  const $ = id => document.getElementById(id);

  const WEEKDAYS    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const MONTHS      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  function formatDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const wd   = WEEKDAYS[date.getDay()];
    const dayStr = String(d).padStart(2, '0');
    const monStr = MONTHS[m - 1];
    return { full: `${dayStr} ${monStr} ${y}`, weekday: `${wd}feira` };
  }

  function addMinutes(time, mins) {
    const [h, mi] = time.split(':').map(Number);
    const total = h * 60 + mi + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function fmtPrice(val) {
    return 'R$ ' + val.toFixed(2).replace('.', ',');
  }

  /* ══ Lê dados do sessionStorage ══ */
  let services = [];
  let barber   = null;
  let datetime = null;

  try { services  = JSON.parse(sessionStorage.getItem('svc_selected')   || '[]').map(([, d]) => d); } catch (_) {}
  try { barber    = JSON.parse(sessionStorage.getItem('selected_barber') || 'null'); } catch (_) {}
  try { datetime  = JSON.parse(sessionStorage.getItem('booking_datetime') || 'null'); } catch (_) {}

  const totalPrice = services.reduce((s, sv) => s + (sv.price    || 0), 0);
  const totalDur   = services.reduce((s, sv) => s + (sv.duration || 0), 0);

  /* ══ Renderiza conteúdo ══ */
  function render() {
    /* — Barbeiro — */
    const barberName = barber
      ? (barber.id === 'qualquer' ? 'Primeiro disponível' : barber.name)
      : 'Não definido';

    $('barber-av').textContent   = barberName.charAt(0).toUpperCase();
    $('barber-name').textContent = barberName;
    $('barber-role').textContent = barber && barber.id !== 'qualquer'
      ? (barber.specialty || 'Barbeiro') + (barber.experience ? ' · ' + barber.experience : '')
      : 'Qualquer profissional disponível';

    /* — Data & Hora — */
    if (datetime) {
      const { full, weekday } = formatDate(datetime.date);
      $('dt-date').textContent     = full;
      $('dt-weekday').textContent  = weekday;
      $('dt-time').textContent     = datetime.time;
      $('dt-duration').textContent = totalDur > 0
        ? 'Término aprox. ' + addMinutes(datetime.time, totalDur)
        : '';
    }

    /* — Serviços — */
    const svcList = $('svc-list');
    svcList.innerHTML = '';

    if (services.length === 0) {
      const row = document.createElement('div');
      row.className = 'svc-row';
      row.innerHTML = '<span class="svc-name" style="color:var(--muted)">Nenhum serviço selecionado</span>';
      svcList.appendChild(row);
    } else {
      services.forEach(sv => {
        const row = document.createElement('div');
        row.className = 'svc-row';
        row.innerHTML = `
          <div class="svc-row-left">
            <span class="svc-name">${sv.name || sv.title || 'Serviço'}</span>
            ${sv.duration ? `
            <span class="svc-dur">
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                <circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.5"/>
              </svg>
              ${sv.duration} min
            </span>` : ''}
          </div>
          <span class="svc-price">${sv.price ? fmtPrice(sv.price) : '—'}</span>
        `;
        svcList.appendChild(row);
      });
    }

    $('svc-total').textContent    = fmtPrice(totalPrice);
    $('confirm-price').textContent = fmtPrice(totalPrice);

    /* — Mostra conteúdo, oculta shimmer — */
    $('shimmer-wrap').style.display = 'none';
    const ready = $('content-ready');
    ready.style.display        = 'flex';
    ready.style.flexDirection  = 'column';
    ready.style.gap            = '1.25rem';
  }

  setTimeout(render, 480);

  /* ══ Botão voltar ══ */
  $('back-btn').addEventListener('click', () => {
    window.location.href = 'agendar.html';
  });

  /* ══ Confirmar ══ */
  $('confirm-btn').addEventListener('click', () => {
    const btn = $('confirm-btn');
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" style="animation:spin 0.7s linear infinite">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
                 M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span>Confirmando…</span>
    `;

    /* Simula chamada à API */
    setTimeout(showSuccess, 1200);
  });

  /* ══ Ecrã de sucesso ══ */
  function showSuccess() {
    const chips = $('success-chips');
    chips.innerHTML = '';

    if (datetime) {
      const { full } = formatDate(datetime.date);

      chips.appendChild(makeChip(`
        <svg viewBox="0 0 14 14" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2.5" width="10" height="9" rx="1.5"/>
          <path d="M5 1.5v2M9 1.5v2M2 5.5h10"/>
        </svg>
        ${full}
      `));

      chips.appendChild(makeChip(`
        <svg viewBox="0 0 14 14" fill="none" stroke-width="1.4" stroke-linecap="round">
          <circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.5"/>
        </svg>
        ${datetime.time}
      `));
    }

    if (barber && barber.id !== 'qualquer') {
      chips.appendChild(makeChip(`
        <svg viewBox="0 0 14 14" fill="none" stroke-width="1.4" stroke-linecap="round">
          <circle cx="7" cy="4.5" r="2.5"/><path d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5"/>
        </svg>
        ${barber.name}
      `));
    }

    $('success-sub').textContent = services.length > 0
      ? services.map(s => s.name || s.title).join(', ') + ' · confirmado com sucesso.'
      : 'Seu horário foi confirmado com sucesso.';

    const overlay = $('success-overlay');
    overlay.removeAttribute('aria-hidden');
    overlay.classList.add('visible');
    $('confirm-bar').style.display = 'none';
  }

  function makeChip(html) {
    const el = document.createElement('div');
    el.className = 'success-chip';
    el.innerHTML = html;
    return el;
  }

  /* ══ Ações pós-sucesso ══ */
  $('success-new-btn').addEventListener('click', () => {
    try { sessionStorage.clear(); } catch (_) {}
    window.location.href = 'servicos.html';
  });

  $('success-home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });
})();