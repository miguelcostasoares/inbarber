(function () {
  "use strict";

  /* ─────────────────────────────────────
     HELPERS
  ───────────────────────────────────── */
  const fmtPrice = n => 'R$\u00a0' + n.toLocaleString('pt-BR');
  const fmtMins  = m => {
    const h = Math.floor(m / 60), r = m % 60;
    return h > 0 && r > 0 ? `${h}h ${r}min` : h > 0 ? `${h}h` : `${r} min`;
  };
  const initials  = name => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const pad       = n => String(n).padStart(2, '0');

  const MONTHS_PT    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const DAYS_SHORT   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const DAYS_FULL    = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

  /* ─────────────────────────────────────
     SESSION STATE
  ───────────────────────────────────── */
  function getServices() {
    try { return JSON.parse(sessionStorage.getItem('svc_selected') || '[]').map(([,d]) => d); }
    catch(_) { return []; }
  }
  function getBarber() {
    try { return JSON.parse(sessionStorage.getItem('selected_barber') || 'null'); }
    catch(_) { return null; }
  }

  /* ─────────────────────────────────────
     SIMULAÇÃO DE DISPONIBILIDADE
     (substitua generateSlots por chamada de API real)
  ───────────────────────────────────── */
  function generateSlots(dateStr, barber) {
    const seed = dateStr.replace(/-/g, '') + (barber ? barber.id : 'any');
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    const rng = () => { h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16; return ((h >>> 0) / 4294967296); };

    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 0) return []; // Domingo fechado

    const start = dow === 6 ? 8 : 9;
    const end   = dow === 6 ? 17 : 20;
    const slots = [];
    for (let hour = start; hour < end; hour++) {
      for (const min of [0, 30]) {
        if (hour * 60 + min >= end * 60) break;
        if (rng() < 0.75) slots.push(`${pad(hour)}:${pad(min)}`);
      }
    }
    return slots;
  }

  function getAvailableDays(year, month, barber) {
    const available = new Set();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d); date.setHours(0,0,0,0);
      if (date < today) continue;
      if (generateSlots(`${year}-${pad(month)}-${pad(d)}`, barber).length > 0) available.add(d);
    }
    return available;
  }

  /* ─────────────────────────────────────
     ÍCONES DOS PERÍODOS
  ───────────────────────────────────── */
  const PERIOD_ICONS = {
    Manhã: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
      <circle cx="8" cy="8" r="3.2"/>
      <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.6 3.6l.85.85M11.55 11.55l.85.85M11.55 4.45l-.85.85M4.45 11.55l-.85.85"/>
    </svg>`,
    Tarde: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
      <path d="M2 9a6 6 0 0 0 12 0"/>
      <path d="M8 3v1.5M13.2 5.8l-1 1M2.8 5.8l1 1"/>
    </svg>`,
    Noite: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 10.5A6 6 0 0 1 5.5 4a6 6 0 1 0 6.5 6.5z"/>
    </svg>`,
  };

  const PERIOD_RANGES = {
    Manhã: '8h – 12h',
    Tarde: '12h – 18h',
    Noite: '18h – 22h',
  };

  /* ─────────────────────────────────────
     ESTADO GLOBAL
  ───────────────────────────────────── */
  const services   = getServices();
  const barber     = getBarber();
  const totalPrice = services.reduce((a, s) => a + s.price, 0);
  const totalMins  = services.reduce((a, s) => a + parseInt(s.dur, 10), 0);

  const today = new Date(); today.setHours(0,0,0,0);

  let viewYear  = today.getFullYear();
  let viewMonth = today.getMonth() + 1;
  let selectedDateStr = null;
  let selectedTime    = null;

  /* ─────────────────────────────────────
     DOM READY
  ───────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {

    /* Elementos */
    const calGrid      = document.getElementById('cal-grid');
    const calMonth     = document.getElementById('cal-month');
    const calPrev      = document.getElementById('cal-prev');
    const calNext      = document.getElementById('cal-next');
    const calNextAvail = document.getElementById('cal-next-avail');
    const slotsGrid    = document.getElementById('slots-grid');
    const slotsLoading = document.getElementById('slots-loading');
    const slotsEmpty   = document.getElementById('slots-empty');
    const slotsTitle   = document.getElementById('slots-title');
    const slotsCount   = document.getElementById('slots-count');
    const slotsDateLbl = document.getElementById('slots-date-label');
    const nextDayBtn   = document.getElementById('slots-next-day-btn');
    const summaryBar   = document.getElementById('summary-bar');
    const summaryEmpty = document.getElementById('summary-empty');
    const summaryChosen= document.getElementById('summary-chosen');
    const summaryDate  = document.getElementById('summary-date');
    const summaryTime  = document.getElementById('summary-time');
    const summarySub   = document.getElementById('summary-sub');
    const summaryCta   = document.getElementById('summary-cta');
    const sumCtaPrice  = document.getElementById('summary-cta-price');
    const backBtn      = document.getElementById('back-btn');

    /* ── Preenche recap ── */
    (function fillRecap() {
      const barberName = barber
        ? (barber.id === 'qualquer' ? 'Primeiro disponível' : barber.name)
        : 'Profissional';
      const barberIni  = barber
        ? (barber.id === 'qualquer' ? '✦' : initials(barberName))
        : '?';

      const av      = document.getElementById('recap-barber-av');
      const nm      = document.getElementById('recap-barber-name');
      const rl      = document.getElementById('recap-barber-role');
      const durEl   = document.getElementById('recap-dur-text');
      const priceEl = document.getElementById('recap-price');
      const svcList = document.getElementById('recap-svcs-list');

      if (av)      av.textContent    = barberIni;
      if (nm)      nm.textContent    = barberName;
      if (rl)      rl.textContent    = barber && barber.role ? barber.role : '';
      if (durEl)   durEl.textContent = fmtMins(totalMins);
      if (priceEl) priceEl.textContent = fmtPrice(totalPrice);

      if (svcList) {
        services.forEach(s => {
          const row = document.createElement('div');
          row.className = 'recap-svc-line';
          row.innerHTML = `<span class="recap-svc-dot"></span>
            <span class="recap-svc-name">${s.name}</span>
            <span class="recap-svc-price">${fmtPrice(s.price)}</span>`;
          svcList.appendChild(row);
        });
      }

      if (sumCtaPrice) sumCtaPrice.textContent = fmtPrice(totalPrice);
      if (summarySub) {
        summarySub.textContent = `${barberName} · ${fmtMins(totalMins)}`;
      }
    })();

    /* Barra sempre visível */
    if (summaryBar) summaryBar.classList.add('visible');

    /* ──────────────────────────────────
       CALENDÁRIO
    ────────────────────────────────── */
    let availableDays = getAvailableDays(viewYear, viewMonth, barber);

    function renderCalendar() {
      if (!calGrid) return;
      if (calMonth) calMonth.textContent = `${MONTHS_PT[viewMonth - 1]} ${viewYear}`;

      const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;
      if (calPrev) calPrev.disabled = isCurrentMonth;

      const daysInMonth    = new Date(viewYear, viewMonth, 0).getDate();
      const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();

      calGrid.innerHTML = '';

      for (let i = 0; i < firstDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        calGrid.appendChild(empty);
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(viewYear, viewMonth - 1, d); date.setHours(0,0,0,0);
        const dateStr = `${viewYear}-${pad(viewMonth)}-${pad(d)}`;
        const isPast   = date < today;
        const isToday  = date.getTime() === today.getTime();
        const isAvail  = availableDays.has(d);
        const isSel    = dateStr === selectedDateStr;
        const isClosed = date.getDay() === 0;

        const btn = document.createElement('button');
        btn.className = 'cal-day';
        btn.textContent = d;
        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('aria-label', `${d} de ${MONTHS_PT[viewMonth-1]} de ${viewYear}${isSel ? ', selecionado' : ''}`);

        if (isPast || isClosed) { btn.classList.add('past'); btn.disabled = true; }
        else if (!isAvail)      { btn.classList.add('unavailable'); btn.disabled = true; }
        else                    { btn.classList.add('has-slots'); }

        if (isToday) btn.classList.add('today');
        if (isSel)   btn.classList.add('selected');

        if (!isPast && !isClosed && isAvail && !isSel) {
          const dot = document.createElement('span');
          dot.className = 'day-dot'; dot.setAttribute('aria-hidden', 'true');
          btn.appendChild(dot);
        }

        btn.addEventListener('click', () => selectDate(dateStr, d, date));
        calGrid.appendChild(btn);
      }
    }

    /* ── Seleciona data ── */
    function selectDate(dateStr, day, dateObj) {
      calGrid.querySelectorAll('.cal-day').forEach(b => b.classList.remove('selected'));
      calGrid.querySelectorAll('.cal-day:not(.empty)').forEach(b => {
        if (parseInt(b.textContent, 10) === day) b.classList.add('selected');
      });

      selectedDateStr = dateStr;
      selectedTime    = null;

      const dowIdx  = dateObj.getDay();
      const dayLabel = dateObj.getTime() === today.getTime()
        ? 'Hoje'
        : dateObj.getTime() === today.getTime() + 86400000
          ? 'Amanhã'
          : `${DAYS_SHORT[dowIdx]}, ${day} ${MONTHS_SHORT[viewMonth - 1]}`;

      if (slotsDateLbl) slotsDateLbl.textContent = dayLabel;

      renderSlots(dateStr);
      updateBar();

      setTimeout(() => {
        const slotsSection = document.getElementById('slots-section');
        if (slotsSection) slotsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }

    /* ── Próxima data disponível ── */
    function jumpToNextAvailable(fromDate) {
      let searchDate = fromDate ? new Date(fromDate) : new Date(today);
      // Se tem data selecionada, busca a PRÓXIMA depois dela
      if (selectedDateStr && fromDate === undefined) {
        const [sy, sm, sd] = selectedDateStr.split('-').map(Number);
        searchDate = new Date(sy, sm - 1, sd);
        searchDate.setDate(searchDate.getDate() + 1);
      }

      for (let i = 0; i < 90; i++) {
        searchDate.setDate(searchDate.getDate() + (i === 0 ? 0 : 1));
        const y = searchDate.getFullYear();
        const m = searchDate.getMonth() + 1;
        const d = searchDate.getDate();
        const str = `${y}-${pad(m)}-${pad(d)}`;
        if (generateSlots(str, barber).length > 0) {
          if (y !== viewYear || m !== viewMonth) {
            viewYear  = y; viewMonth = m;
            availableDays = getAvailableDays(viewYear, viewMonth, barber);
            renderCalendar();
          }
          selectDate(str, d, new Date(y, m - 1, d));
          return;
        }
      }
    }

    /* ──────────────────────────────────
       SLOTS — com grupos de período
    ────────────────────────────────── */
    function renderSlots(dateStr) {
      if (!slotsGrid) return;
      slotsGrid.style.display   = 'none';
      if (slotsEmpty)   slotsEmpty.style.display   = 'none';
      if (slotsLoading) slotsLoading.style.display = '';
      if (slotsCount)   slotsCount.textContent = '';

      setTimeout(() => {
        const rawSlots = generateSlots(dateStr, barber);
        if (slotsLoading) slotsLoading.style.display = 'none';

        if (rawSlots.length === 0) {
          if (slotsEmpty) slotsEmpty.style.display = '';
          slotsGrid.style.display = 'none';
          return;
        }

        if (slotsCount) slotsCount.textContent = `${rawSlots.length} disponíveis`;

        slotsGrid.style.display = '';
        slotsGrid.innerHTML = '';

        const groups = [
          { name: 'Manhã',  slots: rawSlots.filter(t => parseInt(t) < 12) },
          { name: 'Tarde',  slots: rawSlots.filter(t => { const h = parseInt(t); return h >= 12 && h < 18; }) },
          { name: 'Noite',  slots: rawSlots.filter(t => parseInt(t) >= 18) },
        ].filter(g => g.slots.length > 0);

        groups.forEach((group, gi) => {
          const groupEl = document.createElement('div');
          groupEl.className = 'slot-period-group';
          groupEl.style.animationDelay = `${gi * 0.07}s`;

          // Cabeçalho do grupo
          const header = document.createElement('div');
          header.className = 'slot-period-header';
          header.setAttribute('aria-hidden', 'true');
          header.innerHTML = `
            <div class="slot-period-icon" style="color:var(--gold)">${PERIOD_ICONS[group.name] || ''}</div>
            <span class="slot-period-name">${group.name}</span>
            <span class="slot-period-range">${PERIOD_RANGES[group.name] || ''}</span>`;
          groupEl.appendChild(header);

          // Grid de botões
          const grid = document.createElement('div');
          grid.className = 'slot-btns-grid';

          group.slots.forEach((time, i) => {
            const btn = document.createElement('button');
            btn.className = 'slot-btn';
            btn.setAttribute('aria-label', `${time} — disponível`);
            btn.style.animationDelay = `${(gi * 0.07) + (i * 0.02)}s`;
            if (time === selectedTime) btn.classList.add('selected');

            // Horário em serif
            btn.innerHTML = `<span>${time}</span><span class="slot-avail-dot" aria-hidden="true"></span>`;
            btn.addEventListener('click', () => selectTime(time, btn, grid));
            grid.appendChild(btn);
          });

          groupEl.appendChild(grid);
          slotsGrid.appendChild(groupEl);
        });

      }, 300);
    }

    /* ── Seleciona horário ── */
    function selectTime(time, clickedBtn, parentGrid) {
      // Deselect em todos os grids
      slotsGrid.querySelectorAll('.slot-btn').forEach(b => {
        b.classList.remove('selected');
        const label = b.getAttribute('aria-label') || '';
        b.setAttribute('aria-label', label.replace('— selecionado', '— disponível'));
      });
      clickedBtn.classList.add('selected');
      clickedBtn.setAttribute('aria-label', `${time} — selecionado`);
      selectedTime = time;
      updateBar();
    }

    /* ──────────────────────────────────
       BARRA FLUTUANTE
    ────────────────────────────────── */
    function updateBar() {
      if (!summaryBar) return;

      if (!selectedDateStr || !selectedTime) {
        if (summaryEmpty)  summaryEmpty.style.display  = '';
        if (summaryChosen) summaryChosen.style.display = 'none';
        if (summaryCta)    { summaryCta.disabled = true; summaryCta.setAttribute('aria-disabled','true'); }
        return;
      }

      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const dateObj   = new Date(y, m - 1, d);
      const dowIdx    = dateObj.getDay();
      const isToday   = dateObj.getTime() === today.getTime();
      const isTomorrow= dateObj.getTime() === today.getTime() + 86400000;

      const dateLabel = isToday
        ? `Hoje, ${d} ${MONTHS_SHORT[m-1]}`
        : isTomorrow
          ? `Amanhã, ${d} ${MONTHS_SHORT[m-1]}`
          : `${DAYS_SHORT[dowIdx]}, ${d} ${MONTHS_SHORT[m-1]}`;

      if (summaryDate)   summaryDate.textContent   = dateLabel;
      if (summaryTime)   summaryTime.textContent   = selectedTime;

      const barberName = barber
        ? (barber.id === 'qualquer' ? 'Primeiro disponível' : barber.name)
        : 'Profissional';
      if (summarySub) summarySub.textContent = `${barberName} · ${fmtMins(totalMins)}`;

      if (summaryEmpty)  summaryEmpty.style.display  = 'none';
      if (summaryChosen) summaryChosen.style.display = '';
      if (summaryCta)    { summaryCta.disabled = false; summaryCta.setAttribute('aria-disabled','false'); }
    }

    /* ── CTA confirmar ── */
    if (summaryCta) {
      summaryCta.addEventListener('click', () => {
        if (!selectedDateStr || !selectedTime || summaryCta.disabled) return;
        try {
          sessionStorage.setItem('booking_datetime', JSON.stringify({ date: selectedDateStr, time: selectedTime }));
        } catch(_) {}
        showConfirmationToast();
      });
    }

    /* ── Toast ── */
    function showConfirmationToast() {
      const existing = document.querySelector('.confirm-toast');
      if (existing) existing.remove();

      const barberName = barber
        ? (barber.id === 'qualquer' ? 'Primeiro disponível' : barber.name)
        : 'Profissional';
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dowFull = DAYS_FULL[dateObj.getDay()];

      const toast = document.createElement('div');
      toast.className = 'confirm-toast';
      toast.innerHTML = `
        <div class="toast-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="toast-body">
          <strong>Agendamento confirmado!</strong>
          <span>${dowFull}, ${d} de ${MONTHS_PT[m-1]} às ${selectedTime} · ${barberName}</span>
        </div>`;

      Object.assign(toast.style, {
        position: 'fixed', bottom: '6rem', left: '50%',
        transform: 'translateX(-50%) translateY(20px)',
        maxWidth: '420px', width: 'calc(100% - 2rem)',
        background: '#1a1a1a', border: '1px solid rgba(191,160,106,0.4)',
        borderRadius: '16px', padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '1rem', zIndex: '1000',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)', opacity: '0',
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
        fontFamily: "'DM Sans', system-ui, sans-serif", color: '#F0EBE1',
      });
      const icon = toast.querySelector('.toast-icon');
      Object.assign(icon.style, {
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'rgba(191,160,106,0.15)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: '0', color: '#BFA06A',
      });
      icon.querySelector('svg').style.cssText = 'width:18px;height:18px;';
      Object.assign(toast.querySelector('.toast-body').style, {
        display: 'flex', flexDirection: 'column', gap: '2px',
      });
      toast.querySelector('strong').style.cssText = 'font-size:14px;font-weight:600;color:#FFFFFF;';
      toast.querySelector('span').style.cssText = 'font-size:12px;color:#6B6762;line-height:1.4;';

      document.body.appendChild(toast);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity = '1'; toast.style.transform = 'translateX(-50%) translateY(0)';
      }));
      setTimeout(() => {
        toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(16px)';
        setTimeout(() => toast.remove(), 320);
      }, 3500);
    }

    /* ── Eventos navegação ── */
    if (calPrev) calPrev.addEventListener('click', () => {
      viewMonth--; if (viewMonth < 1) { viewMonth = 12; viewYear--; }
      availableDays = getAvailableDays(viewYear, viewMonth, barber);
      renderCalendar();
    });
    if (calNext) calNext.addEventListener('click', () => {
      viewMonth++; if (viewMonth > 12) { viewMonth = 1; viewYear++; }
      availableDays = getAvailableDays(viewYear, viewMonth, barber);
      renderCalendar();
    });

    /* ── Botão "próximo disponível" no calendário ── */
    if (calNextAvail) calNextAvail.addEventListener('click', () => jumpToNextAvailable());

    /* ── Botão "próximo dia" no estado vazio ── */
    if (nextDayBtn) nextDayBtn.addEventListener('click', () => {
      const fromDate = selectedDateStr
        ? (() => { const [y,m,d] = selectedDateStr.split('-').map(Number); return new Date(y,m-1,d); })()
        : new Date(today);
      jumpToNextAvailable(fromDate);
    });

    /* ── Voltar ── */
    if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'barbeiro.html');

    /* ── Init ── */
    renderCalendar();

    // Auto-seleciona hoje ou amanhã
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
    if (generateSlots(todayStr, barber).length > 0) {
      selectDate(todayStr, today.getDate(), today);
    } else {
      jumpToNextAvailable(new Date(today));
    }

  });

})();