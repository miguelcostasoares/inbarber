/* ═══════════════════════════════════════════════════════════
   InBarber — Agenda JS
   Ordem: Config → Mock Data → State → Utils
        → Kanban → Calendar → List → Modals → UI → Boot
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── 1. CONFIG ─────────────────────────────────────────── */
// Nenhum valor de negócio fica fixo aqui: nome da barbearia, horário de
// funcionamento e intervalo de almoço vêm de /api/barbershop e
// /api/preferences (ver loadBusinessConfig(), chamado no boot()).
// slotMinutes é a única constante de UI legítima (granularidade do
// <select> de horário), sem relação com dados da barbearia.
const CFG = {
  barbershopName: '',
  ownerName: '',
  openHour: 8,
  closeHour: 20,
  slotMinutes: 30,
  currency: 'BRL',
};

// Intervalo de almoço ativo, carregado de /api/preferences.almoco.
// null = almoço desativado (nenhum horário bloqueado por almoço).
// Formato: { startMin, endMin, startLabel, endLabel } (minutos desde 00:00).
let LUNCH = null;


/* ─── 2. DADOS DINÂMICOS (populados via API no boot) ────── */
// Estrutura de cada item idêntica ao que os endpoints retornam.
// Iniciam vazios; boot() aguarda o carregamento antes de renderizar.

// GET /api/services
let SERVICES = [];

// GET /api/barbers
let BARBERS = [];

// GET /api/saidas/pgto — mesma tabela formas_pagamento usada em Saídas,
// reaproveitada aqui para o seletor de forma de pagamento do agendamento.
let FORMAS_PAGAMENTO = [];

// GET /api/clients?search=<q>  — buscado sob demanda no autocomplete

// Populado via API (InBarberAPI.listAppointments) — ver reloadAppointments().
// Formato de cada item segue o mesmo shape do mock anterior
// (client, phone, date, time, serviceId, barberId, status, notes),
// pois é o que api.js devolve já mapeado a partir do back-end.
let APPOINTMENTS = [];

// GET /api/blocks (bloqueios de horário) — ver reloadBlocks().
let BLOCKS = [];


/* ─── 3. STATE ──────────────────────────────────────────── */
const STATE = {
  activeView: 'kanban',
  filterBarber: '',
  filterService: '',
  filterSearch: '',
  calMode: 'week',
  calOffset: 0,      // semanas ou meses desde hoje
  listSort: { field: 'time', dir: 'asc' },
  listDate: getTodayStr(),
  listStatus: '',
  kanbanDate: getTodayStr(),
  dragging: null,   // { id, fromStatus }
  editingId: null,   // null = criando, string = editando
};


/* ─── 4. UTILS ──────────────────────────────────────────── */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

function formatPhone(phone) {
  if (!phone) return '';
  const n = phone.replace(/\D/g, '');
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return phone;
}

function getService(id) { return SERVICES.find(s => s.id === id) || null; }
function getBarber(id) { return BARBERS.find(b => b.id === id) || null; }

// Paleta fixa de cores para avatares/indicadores de barbeiro. Como os IDs
// reais vêm do banco (uuids), não dá pra ter uma classe CSS por barbeiro
// (como era com os mocks "marcos"/"joao"/"andre") — em vez disso, cada
// barbeiro recebe uma cor determinística da paleta via hash do próprio id,
// aplicada inline (style), e sempre a mesma para o mesmo barbeiro.
const BARBER_COLOR_PALETTE = [
  { bg: 'rgba(191,160,106,0.2)', fg: 'var(--gold-lt)' },
  { bg: 'var(--blue-bg)', fg: 'var(--blue)' },
  { bg: 'var(--green-bg)', fg: 'var(--green)' },
  { bg: 'rgba(224,84,84,0.16)', fg: 'var(--red, #E05454)' },
  { bg: 'rgba(155,114,207,0.18)', fg: '#9B72CF' },
  { bg: 'rgba(224,146,74,0.18)', fg: '#E0924A' },
];

function getBarberColor(id) {
  if (!id) return BARBER_COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return BARBER_COLOR_PALETTE[hash % BARBER_COLOR_PALETTE.length];
}

// Retorna o atributo style="" pronto para os elementos de avatar/indicador
// de um barbeiro, substituindo as antigas classes fixas kanban-card__avatar--marcos etc.
function barberAvatarStyle(id) {
  const c = getBarberColor(id);
  return `background:${c.bg};color:${c.fg}`;
}

function getStatusLabel(status) {
  const map = {
    'pendente': 'Pendente',
    'confirmado': 'Confirmado',
    'em-andamento': 'Em Andamento',
    'concluido': 'Finalizado',
    'no-show': 'No-show',
  };
  return map[status] || status;
}

function getBlockReasonLabel(reason) {
  const map = { almoco: 'Almoço', folga: 'Folga', ferias: 'Férias', manutencao: 'Manutenção', outro: 'Outro' };
  return map[reason] || reason;
}

// Detecta conflito: mesmo barbeiro, mesmo dia, horário sobreponente
function hasConflict(appt, excludeId = null) {
  const svc = getService(appt.serviceId);
  if (!svc) return false;
  const [h, m] = appt.time.split(':').map(Number);
  const startMin = h * 60 + m;
  const endMin = startMin + svc.duration;

  return APPOINTMENTS.some(a => {
    if (a.id === excludeId) return false;
    if (a.barberId !== appt.barberId) return false;
    if (a.date !== appt.date) return false;
    if (['concluido', 'no-show'].includes(a.status)) return false;
    const svcA = getService(a.serviceId);
    if (!svcA) return false;
    const [ah, am] = a.time.split(':').map(Number);
    const aStart = ah * 60 + am;
    const aEnd = aStart + svcA.duration;
    return startMin < aEnd && endMin > aStart;
  });
}

// Gera slots de horário para o select.
// O intervalo de almoço (se ativo) vem de LUNCH, carregado das Preferências
// da barbearia — nada de horário fixo aqui.
function generateTimeSlots() {
  const slots = [];
  let current = CFG.openHour * 60;
  const close = CFG.closeHour * 60;
  while (current < close) {
    // Pula qualquer slot que inicie dentro do bloqueio de almoço (se ativo)
    if (!LUNCH || current < LUNCH.startMin || current >= LUNCH.endMin) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
    current += CFG.slotMinutes;
  }
  return slots;
}

// Verifica se [startMin, endMin) cai dentro do intervalo de almoço ativo
function isWithinLunch(startMin, endMin) {
  if (!LUNCH) return false;
  return startMin < LUNCH.endMin && endMin > LUNCH.startMin;
}

// Detecta se um horário (barbeiro + data + faixa de minutos) esbarra em
// algum bloqueio manual carregado de /api/blocks (folga, férias,
// manutenção, almoço manual etc.), considerando também bloqueios gerais
// (sem barbeiro específico, valem para todos).
function findManualBlock(barberId, date, startMin, endMin) {
  return BLOCKS.find(b => {
    if (b.date !== date) return false;
    if (b.barberId && b.barberId !== barberId) return false;
    const [bsh, bsm] = b.startTime.split(':').map(Number);
    const [beh, bem] = b.endTime.split(':').map(Number);
    const bStart = bsh * 60 + bsm;
    const bEnd = beh * 60 + bem;
    return startMin < bEnd && endMin > bStart;
  }) || null;
}

// Retorna semana (dom-sab) de uma data
function getWeekDates(refDate, offsetWeeks) {
  const d = new Date(refDate + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay() + offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  });
}

// Filtra agendamentos conforme STATE
function getFilteredAppointments(dateOverride) {
  return APPOINTMENTS.filter(a => {
    if (dateOverride && a.date !== dateOverride) return false;
    if (STATE.filterBarber && a.barberId !== STATE.filterBarber) return false;
    if (STATE.filterService && a.serviceId !== STATE.filterService) return false;
    if (STATE.filterSearch) {
      const q = STATE.filterSearch.toLowerCase();
      if (!a.client.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

/* ─── CONFIG DE NEGÓCIO (API) ───────────────────────────────
   Carrega nome da barbearia (/api/barbershop) e horário de
   funcionamento + almoço (/api/preferences), substituindo os
   antigos valores fixos de CFG/LUNCH. Chamado uma vez no boot(),
   antes de qualquer render que dependa desses valores.
──────────────────────────────────────────────────────────── */
async function loadBusinessConfig() {
  try {
    const barbershop = await InBarberAPI.getBarbershop();
    CFG.barbershopName = barbershop?.nome || '';
    CFG.ownerName = barbershop?.ownerName || barbershop?.nome || '';

    document.title = CFG.barbershopName || document.title;
    const nameEl = document.getElementById('sidebarUserName');
    const avatarEl = document.getElementById('sidebarUserAvatar');
    if (nameEl) nameEl.textContent = CFG.ownerName || CFG.barbershopName || '—';
    if (avatarEl) {
      const initials = (CFG.ownerName || CFG.barbershopName || '')
        .trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
      avatarEl.textContent = initials || '—';
    }
  } catch (err) {
    showToast('Erro ao carregar dados da barbearia.', 'error');
  }

  try {
    const prefs = await InBarberAPI.getPreferences();
    const today = getTodayStr();
    const weekday = new Date(today + 'T00:00:00').getDay(); // 0=dom...6=sab
    const diaKeys = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const horarioHoje = prefs?.horarios?.[diaKeys[weekday]];

    if (horarioHoje && horarioHoje.aberto) {
      const [oh] = (horarioHoje.abertura || '08:00').split(':').map(Number);
      const [ch] = (horarioHoje.fechamento || '18:00').split(':').map(Number);
      CFG.openHour = oh;
      CFG.closeHour = ch;
    }

    if (prefs?.almoco?.ativo) {
      const [sh, sm] = prefs.almoco.inicio.split(':').map(Number);
      const [eh, em] = prefs.almoco.fim.split(':').map(Number);
      LUNCH = {
        startMin: sh * 60 + sm,
        endMin: eh * 60 + em,
        startLabel: prefs.almoco.inicio,
        endLabel: prefs.almoco.fim,
      };
    } else {
      LUNCH = null;
    }
  } catch (err) {
    showToast('Erro ao carregar preferências da barbearia.', 'error');
  }
}

/* ─── RELOAD CENTRAL (API) ──────────────────────────────────
   Busca os agendamentos no back-end e repõe APPOINTMENTS.
   "Silencioso": não mostra loading/spinner, só troca os dados
   por trás e chama refreshAll() pra re-renderizar a view ativa.
   Todo ponto que hoje mutava APPOINTMENTS localmente (criar,
   editar, mudar status, deletar) e os filtros de barbeiro/serviço
   (que o back-end já suporta nativamente) chamam esta função em
   vez de refreshAll() direto.

   Passa STATE.filterBarber/filterService pra API (são os únicos
   filtros que disparam reload — busca por nome continua sendo
   filtro em memória, ver initFilters()). Isso NÃO substitui
   getFilteredAppointments(): mesmo vindo pré-filtrado do back-end,
   as views ainda passam pelo filtro local por segurança (ex. troca
   de STATE.filterBarber por outra via antes do fetch resolver).
──────────────────────────────────────────────────────────── */
let _firstAppointmentsLoad = true;

async function reloadAppointments() {
  try {
    const data = await InBarberAPI.listAppointments({
      barberId: STATE.filterBarber || undefined,
      serviceId: STATE.filterService || undefined,
    });
    APPOINTMENTS = data;
  } catch (err) {
    showToast(err.message || 'Erro ao carregar agendamentos.', 'error');
    // Mantém o que já estava carregado em APPOINTMENTS em caso de falha,
    // em vez de zerar a tela — falha de rede não deve apagar o que já
    // estava visível.
  }
  refreshAll();

  // A animação de contagem dos stats (0 -> valor real) só faz sentido
  // na primeira carga da página. Precisa rodar aqui (depois que os
  // dados reais chegaram e refreshAll() já desenhou os números certos
  // no DOM), não no boot() — lá os stats ainda estariam zerados porque
  // este fetch é assíncrono e o boot() não espera por ele.
  if (_firstAppointmentsLoad) {
    _firstAppointmentsLoad = false;
    animateAgendaStats();
  }
}

/* ─── RELOAD DE BLOQUEIOS (API) ─────────────────────────────
   Busca os bloqueios de horário no back-end (GET /api/blocks)
   e repõe BLOCKS. Chamado no boot() e sempre que um bloqueio é
   criado/removido, seguindo o mesmo padrão de reloadAppointments().
──────────────────────────────────────────────────────────── */
async function reloadBlocks() {
  try {
    BLOCKS = await InBarberAPI.listBlocks();
  } catch (err) {
    showToast(err.message || 'Erro ao carregar bloqueios de horário.', 'error');
    // Mantém o que já estava carregado, mesma lógica de reloadAppointments().
  }
  refreshAll();
}

/* ─── TOAST ─────────────────────────────────────────────── */
function showToast(msg, type = 'success') {
  const icons = {
    success: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6l3 3 7-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    info: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M6 5v4M6 3.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    warning: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L11 10H1L6 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 5v2M6 8.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  };
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span class="toast__icon">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('toast--exit');
    setTimeout(() => el.remove(), 240);
  }, 3400);
}


/* ═══════════════════════════════════════════════════════════
   5. HEADER / ESTATÍSTICAS
═══════════════════════════════════════════════════════════ */
function renderHeader() {
  const today = getTodayStr();
  const el = document.getElementById('agendaHeaderDate');
  if (el) el.textContent = formatDate(today);
}

function renderStats() {
  const today = getTodayStr();
  const todays = APPOINTMENTS.filter(a => a.date === today);

  const total = todays.length;
  const confirmed = todays.filter(a => a.status === 'confirmado').length;
  const ongoing = todays.filter(a => a.status === 'em-andamento').length;
  const done = todays.filter(a => a.status === 'concluido').length;
  const noshow = todays.filter(a => ['no-show'].includes(a.status)).length;
  const pendentes = todays.filter(a => a.status === 'pendente').length;

  const revenue = todays
    .filter(a => a.status === 'concluido')
    .reduce((sum, a) => sum + (getService(a.serviceId)?.price || 0), 0);

  const occupancy = total > 0 ? Math.round((done + ongoing) / total * 100) : 0;

  const stats = [
    {
      label: 'Total do dia',
      value: total,
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M1 6h14" stroke="currentColor" stroke-width="1.4"/></svg>`,
      mod: 'gold',
    },
    {
      label: 'Confirmados',
      value: confirmed,
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      mod: 'blue',
    },
    {
      label: 'Em andamento',
      value: ongoing,
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      mod: 'orange',
    },
    {
      label: 'Cancelado ou Falta',
      value: noshow,
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M5 5l6 6M11 5L5 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
      mod: 'red',
    },
  ];

  const container = document.getElementById('agendaStats');
  if (!container) return;
  container.innerHTML = stats.map(s => `
    <div class="stat-pill stat-pill--${s.mod}" role="listitem">
      <div class="stat-pill__icon">${s.icon}</div>
      <div class="stat-pill__value">${s.value}</div>
      <div class="stat-pill__label">${s.label}</div>
    </div>
  `).join('');
}


/* ═══════════════════════════════════════════════════════════
   6. KANBAN
═══════════════════════════════════════════════════════════ */
const KANBAN_COLUMNS = [
  { id: 'pendente', label: 'Pendentes', mod: 'pendente' },
  { id: 'confirmado', label: 'Confirmados', mod: 'confirmado' },
  { id: 'em-andamento', label: 'Em Andamento', mod: 'andamento' },
  { id: 'concluido', label: 'Finalizados', mod: 'concluido' },
  { id: 'no-show', label: 'No-show', mod: 'noshow' },
];

function renderKanban() {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;

  const today = STATE.kanbanDate || getTodayStr();
  const filtered = getFilteredAppointments(today);

  board.innerHTML = KANBAN_COLUMNS.map(col => {
    const cards = filtered.filter(a => a.status === col.id);
    // Blocos de horário (apenas na coluna "pendente" visualmente)
    const blocks = col.id === 'pendente'
      ? BLOCKS.filter(b => b.date === today &&
        (!STATE.filterBarber || b.barberId === STATE.filterBarber))
      : [];

    return `
      <div class="kanban-col kanban-col--${col.mod}" id="kanban-col-${col.id}"
           data-status="${col.id}"
           aria-label="Coluna ${col.label}"
           ondragover="handleDragOver(event)"
           ondrop="handleDrop(event)"
           ondragleave="handleDragLeave(event)">
        <div class="kanban-col__header">
          <span class="kanban-col__dot" aria-hidden="true"></span>
          <span class="kanban-col__title">${col.label}</span>
          <span class="kanban-col__count">${cards.length}</span>
        </div>
        <div class="kanban-col__body" id="kanban-body-${col.id}">
          ${blocks.map(renderBlockCard).join('')}
          ${cards.length === 0 && blocks.length === 0 ? renderKanbanEmpty(col) : ''}
          ${cards.map(a => renderKanbanCard(a)).join('')}
          <div class="kanban-drop-hint" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v8.5M3 6.5l3.5 3.5 3.5-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M2 12h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Soltar aqui
          </div>
        </div>
        <button class="kanban-col__add-btn"
                onclick="openNewAppt('${col.id}')"
                aria-label="Adicionar agendamento em ${col.label}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Adicionar
        </button>
      </div>`;
  }).join('');
}

function renderKanbanEmpty(col) {
  return `
    <div class="kanban-empty" aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/>
        <path d="M4 12h24" stroke="currentColor" stroke-width="1.5"/>
        <path d="M11 3v6M21 3v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <span>Nenhum agendamento</span>
    </div>`;
}

function renderKanbanCard(appt) {
  const svc = getService(appt.serviceId);
  const barber = getBarber(appt.barberId);
  const conflict = hasConflict(appt, appt.id);

  const statusColors = {
    'pendente': '#E0924A',
    'confirmado': '#5B8DEF',
    'em-andamento': '#9B72CF',
    'concluido': '#4CAF79',
    'no-show': '#E05454',
  };

  return `
    <div class="kanban-card ${conflict ? 'conflict' : ''}"
         id="kcard-${appt.id}"
         data-id="${appt.id}"
         data-status="${appt.status}"
         data-barber="${appt.barberId}"
         style="--barber-accent:${getBarberColor(appt.barberId).fg}"
         draggable="true"
         role="listitem"
         tabindex="0"
         aria-label="Agendamento de ${appt.client} às ${appt.time}"
         ondragstart="handleDragStart(event, '${appt.id}')"
         ondragend="handleDragEnd(event)"
         onclick="openDetail('${appt.id}')">

      ${conflict ? `<div class="kanban-card__conflict-tag">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M5 1L9 8H1L5 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
          <path d="M5 4v2M5 6.5v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        Conflito
      </div>` : ''}

      <div class="kanban-card__top">
        <span class="kanban-card__time">${appt.time}</span>
        <span class="kanban-card__status-dot" style="background:${statusColors[appt.status] || '#6B6762'}" aria-hidden="true"></span>
      </div>

      <div class="kanban-card__client">${appt.client}</div>
      <div class="kanban-card__service">${svc ? svc.name : '—'}</div>

      <div class="kanban-card__footer">
        <div class="kanban-card__barber">
          <div class="kanban-card__avatar" style="${barberAvatarStyle(appt.barberId)}" aria-hidden="true">
            ${barber ? barber.avatar : '?'}
          </div>
          <span class="kanban-card__barber-name">${barber ? barber.name.split(' ')[0] : '—'}</span>
        </div>
        <span class="kanban-card__price">${svc ? formatCurrency(svc.price) : '—'}</span>
      </div>

      <div class="kanban-card__actions" onclick="event.stopPropagation()">
        ${renderCardActions(appt)}
      </div>
    </div>`;
}

function renderBlockCard(block) {
  const barber = getBarber(block.barberId);
  return `
    <div class="kanban-card kanban-card--block"
         role="listitem"
         aria-label="Horário bloqueado: ${block.startTime} — ${block.endTime}">
      <div class="kanban-card__block-label">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <rect x="1" y="5.5" width="10" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/>
          <path d="M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        Bloqueio — ${getBlockReasonLabel(block.reason)}
      </div>
      <div class="kanban-card__service" style="margin-top:4px">
        ${block.startTime} – ${block.endTime} · ${barber ? barber.name.split(' ')[0] : 'Todos'}
      </div>
    </div>`;
}

function renderCardActions(appt) {
  // WhatsApp vira ícone compacto para não sobrecarregar a linha
  const whatsappIcon = `
    <button class="action-btn action-btn--icon action-btn--green"
            onclick="sendWhatsApp('${appt.id}')"
            aria-label="WhatsApp ${appt.client}" title="WhatsApp">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.01 3.9L0 16l4.24-1.01A7.95 7.95 0 0 0 8 16c4.42 0 8-3.58 8-8S12.42 0 8 0zm3.92 11.34c-.17.47-1 .92-1.38.96-.35.04-.68.17-2.29-.47-1.93-.76-3.18-2.72-3.28-2.85-.1-.13-.82-1.08-.82-2.07 0-.99.52-1.47.7-1.67.18-.2.4-.25.53-.25h.38c.12 0 .29.05.44.34.16.3.54 1.31.59 1.4.05.1.08.21.02.33-.06.13-.09.2-.19.31-.1.11-.2.24-.28.32-.1.09-.19.19-.08.38.11.19.5.82 1.07 1.32.74.65 1.36.86 1.56.95.19.09.3.08.41-.04.12-.13.5-.58.64-.78.13-.2.27-.17.45-.1.19.07 1.19.56 1.39.66.2.1.34.15.39.24.05.09.05.53-.12 1z"/>
      </svg>
    </button>`;

  // Linha primária: ação principal de status
  // Linha secundária: ações secundárias (editar + whatsapp)
  let primary = '';
  let secondary = '';

  if (appt.status === 'pendente') {
    primary = `
      <button class="action-btn action-btn--blue" onclick="changeStatus('${appt.id}','confirmado')" aria-label="Confirmar">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6l3 3 7-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Confirmar
      </button>
      <button class="action-btn action-btn--red" onclick="changeStatus('${appt.id}','no-show')" aria-label="Cancelar">Cancelar</button>`;
    secondary = `
      <button class="action-btn action-btn--gold action-btn--sm" onclick="openEditAppt('${appt.id}')" aria-label="Editar">Editar</button>
      ${whatsappIcon}`;
  }

  if (appt.status === 'confirmado') {
    primary = `
      <button class="action-btn action-btn--orange" onclick="changeStatus('${appt.id}','em-andamento')" aria-label="Iniciar corte">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 6l9-4-4 9-2-3-3-2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        Iniciar
      </button>
      <button class="action-btn action-btn--red" onclick="changeStatus('${appt.id}','no-show')" aria-label="No-show">No-show</button>`;
    secondary = `
      <button class="action-btn action-btn--gold action-btn--sm" onclick="openEditAppt('${appt.id}')" aria-label="Reagendar">Reagendar</button>
      ${whatsappIcon}`;
  }

  if (appt.status === 'em-andamento') {
    primary = `
      <button class="action-btn action-btn--green" onclick="changeStatus('${appt.id}','concluido')" aria-label="Finalizar">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6l3 3 7-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Finalizar
      </button>`;
    secondary = whatsappIcon;
  }

  if (appt.status === 'concluido') {
    primary = `<button class="action-btn action-btn--muted" onclick="openEditAppt('${appt.id}')" aria-label="Ver detalhes">Ver detalhes</button>`;
    secondary = whatsappIcon;
  }

  if (appt.status === 'no-show') {
    primary = `<button class="action-btn action-btn--blue" onclick="openEditAppt('${appt.id}')" aria-label="Reagendar">Reagendar</button>`;
    secondary = whatsappIcon;
  }

  return `
    <div class="card-actions__primary">${primary}</div>
    ${secondary ? `<div class="card-actions__secondary">${secondary}</div>` : ''}`;
}


/* ── DRAG & DROP ── */
function handleDragStart(event, id) {
  STATE.dragging = id;
  event.target.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', id);
}

function handleDragEnd(event) {
  event.target.classList.remove('is-dragging');
  document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  const col = event.currentTarget;
  if (!col.classList.contains('drag-over')) {
    document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
    col.classList.add('drag-over');
  }
}

function handleDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('drag-over');
  }
}

function handleDrop(event) {
  event.preventDefault();
  const col = event.currentTarget;
  col.classList.remove('drag-over');

  const id = event.dataTransfer.getData('text/plain') || STATE.dragging;
  if (!id) return;

  const newStatus = col.dataset.status;
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;

  // Se soltou na mesma coluna, não faz nada (evita toast/refresh desnecessário)
  if (appt.status === newStatus) {
    STATE.dragging = null;
    return;
  }

  changeStatus(id, newStatus, { silent: true, dropAnimate: true });
}

async function changeStatus(id, newStatus, opts = {}) {
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;

  const labels = {
    'confirmado': 'confirmado',
    'em-andamento': 'iniciado',
    'concluido': 'finalizado',
    'no-show': 'marcado como no-show',
    'pendente': 'movido para pendente',
  };

  try {
    // PATCH /api/appointments/:id { status: newStatus }
    await InBarberAPI.updateAppointment(id, { status: newStatus });
  } catch (err) {
    showToast(err.message || 'Erro ao atualizar status.', 'error');
    return;
  }

  if (!opts.silent) {
    showToast(`${appt.client} ${labels[newStatus] || newStatus}.`, 'success');
  } else {
    showToast(`${appt.client} movido para ${getStatusLabel(newStatus)}.`, 'info');
  }

  await reloadAppointments();

  // Aplica animação de "soltar com sucesso" no novo card, após o re-render
  // (só depois que reloadAppointments() já resolveu e o DOM foi atualizado,
  // senão o card kcard-${id} ainda não existe na nova renderização)
  if (opts.dropAnimate) {
    requestAnimationFrame(() => {
      const newCard = document.getElementById(`kcard-${id}`);
      if (newCard) {
        newCard.classList.add('drop-success');
        newCard.addEventListener('animationend', () => {
          newCard.classList.remove('drop-success');
        }, { once: true });
      }
    });
  }
}

function sendWhatsApp(id) {
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;
  const svc = getService(appt.serviceId);
  const barber = getBarber(appt.barberId);
  const phone = appt.phone.replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Olá ${appt.client}! Confirma seu agendamento na *${CFG.barbershopName}*?\n` +
    `📅 ${formatDateShort(appt.date)} às *${appt.time}*\n` +
    `✂️ ${svc?.name || ''} com *${barber?.name || ''}*\n` +
    `💰 ${svc ? formatCurrency(svc.price) : ''}\n\nAguardamos você! 💈`
  );
  window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
  showToast('Abrindo WhatsApp...', 'info');
}


/* ═══════════════════════════════════════════════════════════
   7. CALENDÁRIO
═══════════════════════════════════════════════════════════ */
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function renderCalendar() {
  if (STATE.calMode === 'week') {
    renderWeekCal();
  } else {
    renderMonthCal();
  }
}

// Altura de 1 hora no grid semanal, em px — deve bater com --cal-hour-h no CSS
const CAL_HOUR_HEIGHT = 88; // bate com --cal-hour-h no CSS

function renderWeekCal() {
  const today = getTodayStr();
  const weekDates = getWeekDates(today, STATE.calOffset);

  // Atualiza label
  const first = new Date(weekDates[0] + 'T00:00:00');
  const last = new Date(weekDates[6] + 'T00:00:00');
  const sameMonth = first.getMonth() === last.getMonth();
  const label = sameMonth
    ? `${first.getDate()} – ${last.getDate()} de ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`
    : `${first.getDate()} ${MONTH_NAMES[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  document.getElementById('calPeriodLabel').textContent = label;

  const grid = document.getElementById('calWeekGrid');
  if (!grid) return;

  const hours = [];
  for (let h = CFG.openHour; h < CFG.closeHour; h++) hours.push(h);

  // Monta cabeçalho
  let html = `<div class="cal-day-header" style="background:var(--bg-3);border-bottom:1px solid var(--divider)"></div>`;
  weekDates.forEach((date, i) => {
    const d = new Date(date + 'T00:00:00');
    const isToday = date === today;
    html += `<div class="cal-day-header${isToday ? ' cal-day-header--today' : ''}" aria-label="${isToday ? 'Hoje, ' : ''}${DAY_NAMES[i]} ${d.getDate()}">
      <div class="cal-day-name">${DAY_NAMES[i]}</div>
      <div class="cal-day-num">${d.getDate()}</div>
    </div>`;
  });

  // Monta linhas de hora (sem mais calcular a linha "agora" aqui — feito à parte)
  hours.forEach(h => {
    const timeStr = `${String(h).padStart(2, '0')}:00`;
    html += `<div class="cal-hour-label" aria-hidden="true">${timeStr}</div>`;

    weekDates.forEach((date, di) => {
      const isToday = date === today;

      // Eventos desta célula (agrupados por hora de início)
      const cellAppts = APPOINTMENTS.filter(a => {
        if (a.date !== date) return false;
        const [ah] = a.time.split(':').map(Number);
        if (ah !== h) return false;
        if (STATE.filterBarber && a.barberId !== STATE.filterBarber) return false;
        if (STATE.filterService && a.serviceId !== STATE.filterService) return false;
        if (STATE.filterSearch && !a.client.toLowerCase().includes(STATE.filterSearch.toLowerCase())) return false;
        return true;
      });

      const cellBlocks = BLOCKS.filter(b => {
        if (b.date !== date) return false;
        const [bh] = b.startTime.split(':').map(Number);
        if (bh !== h) return false;
        if (STATE.filterBarber && b.barberId !== STATE.filterBarber) return false;
        return true;
      });

      const isLunch = isWithinLunch(h * 60, (h + 1) * 60);
      html += `<div class="cal-hour-cell cal-hour-cell--half-line${isToday ? ' cal-hour-cell--today' : ''}${isLunch ? ' cal-hour-cell--lunch' : ''}"
              data-date="${date}" data-hour="${h}"
              onclick="calCellClick('${date}', ${h})"
              aria-label="${isLunch ? 'Almoço bloqueado' : `${DAY_NAMES[di]} ${date} ${timeStr}`}">`;

      // Agendamentos — largura dividida se houver mais de um no mesmo slot
      cellAppts.forEach((a, idx) => {
        html += renderCalEvent(a, h, cellAppts.length, idx);
      });

      // Bloqueios
      cellBlocks.forEach(b => {
        html += `<div class="cal-event cal-event--block"
                       style="top:2px; height:${CAL_HOUR_HEIGHT - 6}px;"
                       title="${getBlockReasonLabel(b.reason)}: ${b.startTime}–${b.endTime}"
                       aria-label="Bloqueio: ${b.startTime}–${b.endTime}">
                   <span class="cal-event__time">${b.startTime}</span>
                   <span class="cal-event__client">🔒 ${getBlockReasonLabel(b.reason)}</span>
                 </div>`;
      });

      html += `</div>`;
    });
  });

  grid.innerHTML = html;

}

// Renderiza um único evento (agendamento) dentro da célula de hora,
// com altura proporcional à duração real e largura dividida se houver conflito visual
function renderCalEvent(appt, hourOfCell, totalInCell, indexInCell) {
  const svc = getService(appt.serviceId);
  const barber = getBarber(appt.barberId);
  const durationMin = svc ? svc.duration : 30;
  const [, minutesStr] = appt.time.split(':');
  const minutes = Number(minutesStr) || 0;

  const topPx = Math.round((minutes / 60) * CAL_HOUR_HEIGHT);
  const heightPx = Math.max(Math.round((durationMin / 60) * CAL_HOUR_HEIGHT) - 4, 26);

  // Layout compacto para eventos curtos (<=30min): sem espaço pra 3 linhas
  const isCompact = durationMin <= 30;

  // Se houver mais de 1 evento na mesma célula, divide a largura lado a lado
  let leftStyle = 'left:3px; right:3px;';
  if (totalInCell > 1) {
    const widthPct = 100 / totalInCell;
    leftStyle = `left: calc(${widthPct * indexInCell}% + 2px); width: calc(${widthPct}% - 4px);`;
  }

  return `<div class="cal-event cal-event--${appt.status}${isCompact ? ' cal-event--compact' : ''}"
                 style="top:${topPx}px; height:${heightPx}px; ${leftStyle}"
                 onclick="event.stopPropagation(); openDetail('${appt.id}')"
                 role="button"
                 tabindex="0"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openDetail('${appt.id}');}"
                 aria-label="${appt.client}, ${svc ? svc.name : ''}, às ${appt.time}, com ${barber ? barber.name : 'barbeiro não definido'}, status ${getStatusLabel(appt.status)}">
             <span class="cal-event__time">${appt.time}</span>
             <span class="cal-event__client">${appt.client}</span>
             <span class="cal-event__service">${svc ? svc.name : ''}</span>
           </div>`;
}

function renderMonthCal() {
  const today = getTodayStr();
  const refDate = new Date(today + 'T00:00:00');
  refDate.setMonth(refDate.getMonth() + STATE.calOffset);

  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  document.getElementById('calPeriodLabel').textContent = `${MONTH_NAMES[month]} ${year}`;

  // Dias da semana header
  const header = document.getElementById('calMonthHeader');
  if (header) {
    header.innerHTML = DAY_NAMES.map(d => `<div class="cal-month-dow">${d}</div>`).join('');
  }

  const grid = document.getElementById('calMonthGrid');
  if (!grid) return;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  let cells = [];

  // Dias do mês anterior
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrev - i);
    cells.push({ date: dateToStr(d), otherMonth: true });
  }

  // Dias do mês atual
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: dateToStr(new Date(year, month, d)), otherMonth: false });
  }

  // Completar até múltiplo de 7
  let fill = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: dateToStr(new Date(year, month + 1, fill++)), otherMonth: true });
  }

  grid.innerHTML = cells.map(cell => {
    const isToday = cell.date === today;
    const dayAppts = APPOINTMENTS.filter(a => {
  if (a.date !== cell.date) return false;
  if (STATE.filterBarber && a.barberId !== STATE.filterBarber) return false;
  if (STATE.filterService && a.serviceId !== STATE.filterService) return false;
  if (STATE.filterSearch && !a.client.toLowerCase().includes(STATE.filterSearch.toLowerCase())) return false;
  return true;
});
    const maxShow = 3;
    const shown = dayAppts.slice(0, maxShow);
    const more = dayAppts.length - shown.length;

    return `
      <div class="cal-month-cell${cell.otherMonth ? ' cal-month-cell--other-month' : ''}${isToday ? ' cal-month-cell--today' : ''}"
           onclick="calMonthDayClick('${cell.date}')"
           aria-label="${cell.date}${isToday ? ' (hoje)' : ''}"
           ${cell.otherMonth ? 'aria-hidden="true"' : ''}>
        <div class="cal-month-cell__num">${new Date(cell.date + 'T00:00:00').getDate()}</div>
        ${shown.map(a => `
          <div class="cal-month-event cal-month-event--${a.status}"
               onclick="event.stopPropagation(); openDetail('${a.id}')"
               title="${a.time} – ${a.client}"
               role="button" tabindex="0">
            ${a.time} ${a.client.split(' ')[0]}
          </div>`).join('')}
        ${more > 0 ? `<div class="cal-month-more">+${more} mais</div>` : ''}
      </div>`;
  }).join('');
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calCellClick(date, hour) {
  if (isWithinLunch(hour * 60, (hour + 1) * 60)) {
    showToast(`Horário de almoço bloqueado (${LUNCH.startLabel}–${LUNCH.endLabel}).`, 'warning');
    return;
  }
  // Abre modal de resumo do slot em vez de ir direto ao novo agendamento
  openSlotModal(date, hour);
}

/* ─── MODAL DE RESUMO DO SLOT ───────────────────────────── */
function openSlotModal(date, hour) {
  const timeStr = `${String(hour).padStart(2, '0')}:00`;

  // Label do título: "Seg 18 — 08:00"
  const d = new Date(date + 'T00:00:00');
  const dayLabel = `${DAY_NAMES[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;

  document.getElementById('slotModalTitle').textContent = `Agendamentos das ${timeStr}`;
  document.getElementById('slotModalSubtitle').textContent = dayLabel;

  // Filtra agendamentos da hora (respeitando filtros ativos)
  const slotAppts = APPOINTMENTS.filter(a => {
    if (a.date !== date) return false;
    const [ah] = a.time.split(':').map(Number);
    if (ah !== hour) return false;
    if (STATE.filterBarber && a.barberId !== STATE.filterBarber) return false;
    if (STATE.filterService && a.serviceId !== STATE.filterService) return false;
    if (STATE.filterSearch) {
      if (!a.client.toLowerCase().includes(STATE.filterSearch.toLowerCase())) return false;
    }
    return true;
  });

  const body = document.getElementById('slotModalBody');

  if (slotAppts.length === 0) {
    body.innerHTML = `
      <div class="slot-empty">
        <svg class="slot-empty__icon" width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="16" stroke="currentColor" stroke-width="1.5"/>
          <path d="M20 13v7.5l5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="slot-empty__text">Nenhum agendamento às ${timeStr}</span>
      </div>`;
  } else {
    body.innerHTML = `<div class="slot-list">${slotAppts.map(a => {
      const svc = getService(a.serviceId);
      const barber = getBarber(a.barberId);
      const durationMin = svc ? svc.duration : 30;
      const [hh, mm] = a.time.split(':').map(Number);
      const endMin = hh * 60 + mm + durationMin;
      const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

      return `
        <button class="slot-pill slot-pill--${a.status}"
                onclick="slotPillClick('${a.id}')"
                aria-label="Ver detalhes de ${a.client}">
          <span class="slot-pill__time">${a.time}<br><span style="font-size:10px;font-weight:500;color:var(--muted)">${endTime}</span></span>
          <span class="slot-pill__info">
            <span class="slot-pill__client">${a.client}</span>
            <span class="slot-pill__meta">
              <span>${svc ? svc.name : '—'}</span>
              <span class="slot-pill__sep"></span>
              <span>${barber ? barber.name.split(' ')[0] : '—'}</span>
              ${svc ? `<span class="slot-pill__sep"></span><span style="color:var(--gold-lt);font-weight:600">${formatCurrency(svc.price)}</span>` : ''}
            </span>
          </span>
          <span class="slot-pill__badge slot-pill__badge--${a.status}">
            ${getStatusLabel(a.status)}
          </span>
        </button>`;
    }).join('')}</div>`;
  }

  // Guarda contexto no botão "Novo Agendamento" do footer
  const newBtn = document.getElementById('slotModalNewBtn');
  newBtn.onclick = () => {
    closeModal('slotModalOverlay');
    openNewAppt(null, { date, time: timeStr });
  };

  openModal('slotModalOverlay');
}

function slotPillClick(id) {
  closeModal('slotModalOverlay');
  // Pequeno delay para a transição do modal fechar antes de abrir o de detalhes
  setTimeout(() => openDetail(id), 180);
}

function calMonthDayClick(date) {
  openNewAppt(null, { date });
}

function initCalNav() {
  document.getElementById('calPrev')?.addEventListener('click', () => {
    STATE.calOffset--;
    renderCalendar();
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    STATE.calOffset++;
    renderCalendar();
  });
  document.getElementById('calTodayBtn')?.addEventListener('click', () => {
    STATE.calOffset = 0;
    renderCalendar();
  });
  document.querySelectorAll('.cal-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.calMode = btn.dataset.calMode;
      STATE.calOffset = 0;
      document.querySelectorAll('.cal-mode-btn').forEach(b => {
        b.classList.toggle('cal-mode-btn--active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const weekWrap = document.getElementById('calWeekWrap');
      const monthWrap = document.getElementById('calMonthWrap');
      if (STATE.calMode === 'week') {
        weekWrap.style.display = '';
        monthWrap.classList.add('cal-month-wrap--hidden');
      } else {
        weekWrap.style.display = 'none';
        monthWrap.classList.remove('cal-month-wrap--hidden');
      }
      renderCalendar();
    });
  });
}


/* ═══════════════════════════════════════════════════════════
   8. LISTA
═══════════════════════════════════════════════════════════ */
function renderList() {
  const dateFilter = STATE.listDate;
  const statusFilter = STATE.listStatus;

  let rows = APPOINTMENTS.filter(a => {
    if (dateFilter && a.date !== dateFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (STATE.filterBarber && a.barberId !== STATE.filterBarber) return false;
    if (STATE.filterService && a.serviceId !== STATE.filterService) return false;
    if (STATE.filterSearch) {
      const q = STATE.filterSearch.toLowerCase();
      if (!a.client.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Ordenação
  const { field, dir } = STATE.listSort;
  rows.sort((a, b) => {
    let va, vb;
    if (field === 'time') { va = a.time; vb = b.time; }
    if (field === 'client') { va = a.client; vb = b.client; }
    if (field === 'value') {
      va = getService(a.serviceId)?.price || 0;
      vb = getService(b.serviceId)?.price || 0;
    }
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  // Contagem
  const countEl = document.getElementById('listCount');
  if (countEl) countEl.textContent = `${rows.length} agendamento${rows.length !== 1 ? 's' : ''}`;

  // Cabeçalho de sort
  document.querySelectorAll('.list-table th.sortable').forEach(th => {
    const f = th.dataset.sort;
    th.classList.toggle('sort-asc', f === field && dir === 'asc');
    th.classList.toggle('sort-desc', f === field && dir === 'desc');
    th.setAttribute('aria-sort', f === field ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
  });

  const tbody = document.getElementById('listTableBody');
  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="list-empty">
          <svg class="list-empty__icon" width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="6" width="32" height="28" rx="4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M4 14h32" stroke="currentColor" stroke-width="1.5"/>
            <path d="M13 4v6M27 4v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M14 24h12M14 28h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          Nenhum agendamento encontrado
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(a => {
    const svc = getService(a.serviceId);
    const barber = getBarber(a.barberId);
    return `
      <tr>
        <td><span class="list-time">${a.time}</span></td>
        <td>
          <div class="list-client">
            <span class="list-client__name">${a.client}</span>
            ${a.phone ? `<span class="list-client__phone">${formatPhone(a.phone)}</span>` : ''}
          </div>
        </td>
        <td>
          <span class="list-service-badge">
            <span class="list-service-dot" style="background:${svc?.color || '#6B6762'}" aria-hidden="true"></span>
            ${svc?.name || '—'}
          </span>
        </td>
        <td>
          <div class="list-barber">
            <div class="list-barber-avatar" style="${barberAvatarStyle(a.barberId)}" aria-hidden="true">
              ${barber?.avatar || '?'}
            </div>
            ${barber?.name.split(' ')[0] || '—'}
          </div>
        </td>
        <td><span class="list-value">${svc ? formatCurrency(svc.price) : '—'}</span></td>
        <td><span class="status-badge status-badge--${a.status === 'em-andamento' ? 'andamento' : a.status === 'no-show' ? 'noshow' : a.status}">${getStatusLabel(a.status)}</span></td>
        <td>
          <div class="list-actions">
            <button class="list-icon-btn list-icon-btn--whatsapp"
                    onclick="sendWhatsApp('${a.id}')"
                    title="WhatsApp" aria-label="WhatsApp ${a.client}">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.01 3.9L0 16l4.24-1.01A7.95 7.95 0 0 0 8 16c4.42 0 8-3.58 8-8S12.42 0 8 0zm3.92 11.34c-.17.47-1 .92-1.38.96-.35.04-.68.17-2.29-.47-1.93-.76-3.18-2.72-3.28-2.85-.1-.13-.82-1.08-.82-2.07 0-.99.52-1.47.7-1.67.18-.2.4-.25.53-.25h.38c.12 0 .29.05.44.34.16.3.54 1.31.59 1.4.05.1.08.21.02.33-.06.13-.09.2-.19.31-.1.11-.2.24-.28.32-.1.09-.19.19-.08.38.11.19.5.82 1.07 1.32.74.65 1.36.86 1.56.95.19.09.3.08.41-.04.12-.13.5-.58.64-.78.13-.2.27-.17.45-.1.19.07 1.19.56 1.39.66.2.1.34.15.39.24.05.09.05.53-.12 1z"/>
              </svg>
            </button>
            <button class="list-icon-btn list-icon-btn--edit"
                    onclick="openDetail('${a.id}')"
                    title="Ver / Editar" aria-label="Ver detalhes de ${a.client}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M7 5v4M7 4v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="list-icon-btn list-icon-btn--delete"
                    onclick="deleteAppt('${a.id}')"
                    title="Excluir" aria-label="Excluir agendamento de ${a.client}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 6v4M8.5 6v4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                <path d="M3 3.5l.7 7.3a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L11 3.5" stroke="currentColor" stroke-width="1.3"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function deleteAppt(id) {
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;
  if (!confirm(`Excluir agendamento de ${appt.client}?`)) return;

  try {
    await InBarberAPI.deleteAppointment(id);
  } catch (err) {
    showToast(err.message || 'Erro ao excluir agendamento.', 'error');
    return;
  }

  showToast('Agendamento excluído.', 'warning');
  await reloadAppointments();
}

function initListFilters() {
  const dateInput = document.getElementById('listDateFilter');
  const statusInput = document.getElementById('listStatusFilter');
  const kanbanDateInput = document.getElementById('kanbanDateFilter');

  if (dateInput) {
    dateInput.value = STATE.listDate;
    dateInput.addEventListener('change', () => {
      STATE.listDate = dateInput.value;
      renderList();
    });
  }

  if (statusInput) {
    statusInput.addEventListener('change', () => {
      STATE.listStatus = statusInput.value;
      renderList();
    });
  }

  if (kanbanDateInput) {
    kanbanDateInput.value = STATE.kanbanDate;
    kanbanDateInput.addEventListener('change', () => {
      STATE.kanbanDate = kanbanDateInput.value;
      renderKanban();
    });
  }

  // Ordenação de colunas
  document.querySelectorAll('.list-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const f = th.dataset.sort;
      if (STATE.listSort.field === f) {
        STATE.listSort.dir = STATE.listSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        STATE.listSort.field = f;
        STATE.listSort.dir = 'asc';
      }
      renderList();
    });
  });
}


/* ═══════════════════════════════════════════════════════════
   9. MODAL DE AGENDAMENTO
═══════════════════════════════════════════════════════════ */
function openNewAppt(status = null, prefill = {}) {
  STATE.editingId = null;

  // Reset form
  document.getElementById('apptId').value = '';
  document.getElementById('apptClient').value = '';
  document.getElementById('apptPhone').value = '';
  document.getElementById('apptNotes').value = '';
  document.getElementById('apptFormaPagamento').value = '';
  document.getElementById('apptDate').value = prefill.date || getTodayStr();
  document.getElementById('apptModalTitle').textContent = 'Novo Agendamento';
  document.getElementById('apptModalSubtitle').textContent = 'Preencha os dados abaixo para agendar';
  document.getElementById('apptModalSave').innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Agendar`;

  hideConflict();
  document.getElementById('modalSummary').hidden = true;
  document.getElementById('footerSummaryHint').textContent = '';

  // Preencher service picker
  populateServicePicker(null);
  populateBarberPicker(null);
  populateTimeSelect(prefill.time || null);

  if (prefill.time) {
    document.getElementById('apptTime').value = prefill.time;
  }

  openModal('apptModalOverlay');
}

function openEditAppt(id) {
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;

  STATE.editingId = id;

  document.getElementById('apptId').value = id;
  document.getElementById('apptClient').value = appt.client;
  document.getElementById('apptPhone').value = appt.phone || '';
  document.getElementById('apptNotes').value = appt.notes || '';
  document.getElementById('apptFormaPagamento').value = appt.formaPagamentoId || '';
  document.getElementById('apptDate').value = appt.date;
  document.getElementById('apptModalTitle').textContent = 'Editar Agendamento';
  document.getElementById('apptModalSubtitle').textContent = appt.client;
  document.getElementById('apptModalSave').innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Salvar`;

  hideConflict();

  populateServicePicker(appt.serviceId);
  populateBarberPicker(appt.barberId);
  populateTimeSelect(appt.time);

  updateModalSummary(appt.serviceId);

  openModal('apptModalOverlay');
  closeModal('detailModalOverlay');
}

function populateServicePicker(selectedId) {
  const picker = document.getElementById('servicePicker');
  if (!picker) return;
  if (!SERVICES.length) {
    picker.innerHTML = `<span style="color:var(--muted);font-size:13px">Carregando serviços…</span>`;
    return;
  }
  picker.innerHTML = SERVICES.map(svc => `
    <button type="button"
            class="service-option ${svc.id === selectedId ? 'is-selected' : ''}"
            data-service-id="${svc.id}"
            role="radio"
            aria-checked="${String(svc.id === selectedId)}"
            onclick="selectService('${svc.id}')">
      <span class="service-option__dot" style="background:${svc.color}" aria-hidden="true"></span>
      <span class="service-option__name">${svc.name}</span>
      <span class="service-option__price">${formatCurrency(svc.price)} · ${svc.duration}min</span>
    </button>`).join('');
}

function selectService(id) {
  document.querySelectorAll('.service-option').forEach(el => {
    const sel = el.dataset.serviceId === id;
    el.classList.toggle('is-selected', sel);
    el.setAttribute('aria-checked', String(sel));
  });
  updateModalSummary(id);
  checkConflict();
}

function populateBarberPicker(selectedId) {
  const picker = document.getElementById('barberPicker');
  if (!picker) return;
  if (!BARBERS.length) {
    picker.innerHTML = `<span style="color:var(--muted);font-size:13px">Carregando barbeiros…</span>`;
    return;
  }
  picker.innerHTML = BARBERS.map(b => `
    <button type="button"
            class="barber-option ${b.id === selectedId ? 'is-selected' : ''}"
            data-barber-id="${b.id}"
            role="radio"
            aria-checked="${String(b.id === selectedId)}"
            onclick="selectBarber('${b.id}')">
      <div class="barber-option__avatar" style="${barberAvatarStyle(b.id)}" aria-hidden="true">${b.avatar}</div>
      <div>
        <div class="barber-option__name">${b.name}</div>
        <div class="barber-option__rating">★ ${b.rating}</div>
      </div>
    </button>`).join('');
}

function selectBarber(id) {
  document.querySelectorAll('.barber-option').forEach(el => {
    const sel = el.dataset.barberId === id;
    el.classList.toggle('is-selected', sel);
    el.setAttribute('aria-checked', String(sel));
  });
  // Atualiza o select de horário para refletir slots ocupados pelo novo barbeiro
  const currentTime = document.getElementById('apptTime')?.value || null;
  populateTimeSelect(currentTime);
  checkConflict();
}

function populateTimeSelect(selectedTime) {
  const sel = document.getElementById('apptTime');
  if (!sel) return;
  const slots = generateTimeSlots();

  // Lê barbeiro e data do modal para filtrar slots ocupados
  const selectedBarberEl = document.querySelector('.barber-option.is-selected');
  const barberId = selectedBarberEl?.dataset.barberId || null;
  const date = document.getElementById('apptDate')?.value || null;
  const editingId = STATE.editingId;

  sel.innerHTML = `<option value="">Selecionar</option>` +
    slots.map(t => {
      // Verifica conflito para este slot: usa serviceId genérico de 1min
      // apenas para checar sobreposição; o check real é por barbeiro+data+hora.
      let occupied = false;
      if (barberId && date) {
        const [h, m] = t.split(':').map(Number);
        const slotStart = h * 60 + m;
        // Considera slot ocupado se qualquer agendamento do barbeiro naquele
        // dia começa dentro da janela do slot (±slotMinutes) — checa se
        // algum agendamento existente sobrepõe o intervalo [slotStart, slotStart+slotMinutes)
        occupied = APPOINTMENTS.some(a => {
          if (a.id === editingId) return false;
          if (a.barberId !== barberId) return false;
          if (a.date !== date) return false;
          if (['concluido', 'no-show'].includes(a.status)) return false;
          const svcA = getService(a.serviceId);
          if (!svcA) return false;
          const [ah, am] = a.time.split(':').map(Number);
          const aStart = ah * 60 + am;
          const aEnd = aStart + svcA.duration;
          return slotStart < aEnd && (slotStart + CFG.slotMinutes) > aStart;
        });
      }
      if (occupied) {
        return `<option value="${t}" disabled style="color:var(--muted,#888)">${t} — ocupado</option>`;
      }
      return `<option value="${t}" ${t === selectedTime ? 'selected' : ''}>${t}</option>`;
    }).join('');
}

function updateModalSummary(serviceId) {
  const svc = getService(serviceId);
  const summaryEl = document.getElementById('modalSummary');
  const hint = document.getElementById('footerSummaryHint');
  if (!svc) {
    summaryEl.hidden = true;
    if (hint) hint.textContent = '';
    return;
  }
  summaryEl.hidden = false;
  document.getElementById('summaryService').textContent = svc.name;
  document.getElementById('summaryDuration').textContent = `${svc.duration} min`;
  document.getElementById('summaryPrice').textContent = formatCurrency(svc.price);
  if (hint) hint.textContent = `${svc.name} · ${svc.duration} min · ${formatCurrency(svc.price)}`;
}

function getFormData() {
  const selectedService = document.querySelector('.service-option.is-selected');
  const selectedBarber = document.querySelector('.barber-option.is-selected');
  const formaPagamentoRaw = document.getElementById('apptFormaPagamento').value;
  return {
    id: document.getElementById('apptId').value || null,
    client: document.getElementById('apptClient').value.trim(),
    phone: document.getElementById('apptPhone').value.trim(),
    date: document.getElementById('apptDate').value,
    time: document.getElementById('apptTime').value,
    serviceId: selectedService?.dataset.serviceId || '',
    barberId: selectedBarber?.dataset.barberId || '',
    notes: document.getElementById('apptNotes').value.trim(),
    formaPagamentoId: formaPagamentoRaw ? Number(formaPagamentoRaw) : null,
  };
}

function checkConflict() {
  const data = getFormData();
  if (!data.serviceId || !data.barberId || !data.time || !data.date) {
    hideConflict();
    return;
  }
  const svc = getService(data.serviceId);
  const [h, m] = data.time.split(':').map(Number);
  const startMin = h * 60 + m;
  const endMin = startMin + (svc ? svc.duration : 0);

  const appt = { ...data, status: 'confirmado' };
  if (hasConflict(appt, STATE.editingId)) {
    showConflict(`Conflito: ${getBarber(data.barberId)?.name} já tem agendamento próximo às ${data.time}.`);
    return;
  }

  const manualBlock = findManualBlock(data.barberId, data.date, startMin, endMin);
  if (manualBlock) {
    showConflict(`Horário indisponível: ${getBlockReasonLabel(manualBlock.reason)} bloqueado(a) nesse intervalo.`);
    return;
  }

  hideConflict();
}

function showConflict(msg) {
  const el = document.getElementById('modalConflict');
  document.getElementById('conflictMsg').textContent = msg;
  el.hidden = false;
}

function hideConflict() {
  document.getElementById('modalConflict').hidden = true;
}

async function saveAppt() {
  const data = getFormData();

  // Validação básica
  if (!data.client) { showToast('Informe o nome do cliente.', 'error'); return; }
  if (!data.date) { showToast('Selecione a data.', 'error'); return; }
  if (!data.time) { showToast('Selecione o horário.', 'error'); return; }
  const [slotH, slotM] = data.time.split(':').map(Number);
  const slotMin = slotH * 60 + slotM;
  if (LUNCH && slotMin >= LUNCH.startMin && slotMin < LUNCH.endMin) {
    showToast(`Horário de almoço bloqueado (${LUNCH.startLabel}–${LUNCH.endLabel}). Escolha outro horário.`, 'warning');
    return;
  }
  if (!data.serviceId) { showToast('Selecione um serviço.', 'error'); return; }
  if (!data.barberId) { showToast('Selecione um barbeiro.', 'error'); return; }

  // Trava o botão de salvar durante a chamada, pra evitar duplo clique
  // criando dois agendamentos com a mesma requisição em voo.
  const saveBtn = document.getElementById('apptModalSave');
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (STATE.editingId) {
      // PATCH /api/appointments/:id
      await InBarberAPI.updateAppointment(STATE.editingId, {
        client: data.client,
        phone: data.phone,
        date: data.date,
        time: data.time,
        serviceId: data.serviceId,
        barberId: data.barberId,
        notes: data.notes,
        formaPagamentoId: data.formaPagamentoId,
      });
      showToast('Agendamento atualizado.', 'success');
    } else {
      // POST /api/appointments
      await InBarberAPI.createAppointment({
        client: data.client,
        phone: data.phone,
        date: data.date,
        time: data.time,
        serviceId: data.serviceId,
        barberId: data.barberId,
        notes: data.notes,
        formaPagamentoId: data.formaPagamentoId,
      });
      showToast(`Agendamento de ${data.client} criado com sucesso.`, 'success');
    }
  } catch (err) {
    // Conflito de horário (409) o back-end já valida de verdade — mostra
    // no bloco de conflito do modal (mesmo local usado por checkConflict())
    // em vez de só um toast, e mantém o modal aberto pra trocar o horário.
    if (err.status === 409) {
      showConflict(err.message);
    } else {
      showToast(err.message || 'Erro ao salvar agendamento.', 'error');
    }
    return;
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }

  closeModal('apptModalOverlay');
  await reloadAppointments();
}

/* Autocomplete de clientes */
function initClientAutocomplete() {
  const input = document.getElementById('apptClient');
  const list = document.getElementById('autocompleteList');
  if (!input || !list) return;

  let _acTimer = null;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 2) { list.hidden = true; return; }

    clearTimeout(_acTimer);
    _acTimer = setTimeout(async () => {
      let matches = [];
      try {
        matches = await InBarberAPI.searchClients(q);
      } catch (_) {
        // Falha silenciosa: esconde o autocomplete sem travar o formulário
        list.hidden = true;
        return;
      }
      if (!matches.length) { list.hidden = true; return; }
      list.innerHTML = matches.slice(0, 6).map((c, i) => `
        <li class="autocomplete-item"
            role="option"
            id="ac-${i}"
            onclick="selectClient('${c.name}','${c.phone || ''}')">
          ${c.name} <span style="color:var(--muted);margin-left:6px;font-size:11px">${formatPhone(c.phone)}</span>
        </li>`).join('');
      list.hidden = false;
    }, 250);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !list.contains(e.target)) {
      list.hidden = true;
    }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') list.hidden = true;
  });
}

function selectClient(name, phone) {
  document.getElementById('apptClient').value = name;
  document.getElementById('apptPhone').value = phone ? formatPhone(phone) : '';
  document.getElementById('autocompleteList').hidden = true;
}


/* ═══════════════════════════════════════════════════════════
   10. MODAL DE DETALHES
═══════════════════════════════════════════════════════════ */
function openDetail(id) {
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;
  const svc = getService(appt.serviceId);
  const barber = getBarber(appt.barberId);
  const conflict = hasConflict(appt, appt.id);

  const statusKey = appt.status === 'em-andamento' ? 'andamento' : appt.status === 'no-show' ? 'noshow' : appt.status;

  // Calcula horário de término
  const durationMin = svc ? svc.duration : 30;
  const [hh, mm] = appt.time.split(':').map(Number);
  const endMin = hh * 60 + mm + durationMin;
  const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

  document.getElementById('detailModalTitle').textContent = appt.client;

  const body = document.getElementById('detailModalBody');
  body.innerHTML = `
    <!-- Hero: horário + status numa linha -->
    <div class="detail-hero">
      <div class="detail-hero__time">
        <span class="detail-hero__time-main">${appt.time}</span>
        <span class="detail-hero__time-sep">–</span>
        <span class="detail-hero__time-end">${endTime}</span>
      </div>
      <span class="status-badge status-badge--${statusKey}">${getStatusLabel(appt.status)}</span>
    </div>

    <!-- Data -->
    <div class="detail-meta-date">${formatDate(appt.date)}</div>

    ${conflict ? `
    <div class="detail-conflict">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M6 1L11 10H1L6 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
        <path d="M6 5v2M6 8.5v.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>
      Conflito de horário detectado
    </div>` : ''}

    <div class="detail-divider"></div>

    <!-- Linha: Serviço + Valor -->
    <div class="detail-inline-row">
      <div class="detail-field">
        <span class="detail-field__label">Serviço</span>
        <span class="detail-field__value">
          <span class="detail-svc-dot" style="background:${svc?.color || '#6B6762'}" aria-hidden="true"></span>
          ${svc?.name || '—'}
          ${svc ? `<span class="detail-field__sub">${svc.duration} min</span>` : ''}
        </span>
      </div>
      <div class="detail-field detail-field--end">
        <span class="detail-field__label">Valor</span>
        <span class="detail-field__value detail-field__value--gold">${svc ? formatCurrency(svc.price) : '—'}</span>
      </div>
    </div>

    <!-- Barbeiro -->
    <div class="detail-field">
      <span class="detail-field__label">Barbeiro</span>
      <div class="detail-barber-chip">
        <div class="detail-barber-avatar" style="${barberAvatarStyle(appt.barberId)}" aria-hidden="true">${barber?.avatar || '?'}</div>
        <div class="detail-barber-info">
          <span class="detail-barber-name">${barber?.name || '—'}</span>
          <span class="detail-barber-rating">★ ${barber?.rating || '—'}</span>
        </div>
      </div>
    </div>

    ${appt.phone ? `
    <div class="detail-field">
      <span class="detail-field__label">Telefone</span>
      <span class="detail-field__value">${formatPhone(appt.phone)}</span>
    </div>` : ''}

    ${appt.notes ? `
    <div class="detail-field">
      <span class="detail-field__label">Observações</span>
      <div class="detail-notes">${appt.notes}</div>
    </div>` : ''}
  `;

  // Monta footer: ação primária de status + botão Editar sempre visível
  const actions = document.getElementById('detailModalActions');
  const secondary = document.getElementById('detailModalActionsSecondary');

  // Ação principal de status
  const primaryBtns = [];
  if (appt.status === 'pendente') {
    primaryBtns.push(`<button class="action-btn action-btn--blue" onclick="changeStatus('${appt.id}','confirmado');closeModal('detailModalOverlay')">Confirmar</button>`);
    primaryBtns.push(`<button class="action-btn action-btn--red" onclick="changeStatus('${appt.id}','no-show');closeModal('detailModalOverlay')">Cancelar</button>`);
  }
  if (appt.status === 'confirmado') {
    primaryBtns.push(`<button class="action-btn action-btn--orange" onclick="changeStatus('${appt.id}','em-andamento');closeModal('detailModalOverlay')">Iniciar</button>`);
    primaryBtns.push(`<button class="action-btn action-btn--red" onclick="changeStatus('${appt.id}','no-show');closeModal('detailModalOverlay')">No-show</button>`);
  }
  if (appt.status === 'em-andamento') {
    primaryBtns.push(`<button class="action-btn action-btn--green" onclick="changeStatus('${appt.id}','concluido');closeModal('detailModalOverlay')">Finalizar</button>`);
  }
  if (appt.status === 'no-show') {
    primaryBtns.push(`<button class="action-btn action-btn--blue" onclick="openEditAppt('${appt.id}')">Reagendar</button>`);
  }

  actions.innerHTML = primaryBtns.join('');

  // Ações secundárias fixas: Editar + WhatsApp
  const editLabel = appt.status === 'confirmado' ? 'Reagendar' : 'Editar';
  secondary.innerHTML = `
    <button class="detail-edit-btn" onclick="openEditAppt('${appt.id}')">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${editLabel}
    </button>
    <button class="detail-whatsapp-btn" onclick="sendWhatsApp('${appt.id}')">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.01 3.9L0 16l4.24-1.01A7.95 7.95 0 0 0 8 16c4.42 0 8-3.58 8-8S12.42 0 8 0zm3.92 11.34c-.17.47-1 .92-1.38.96-.35.04-.68.17-2.29-.47-1.93-.76-3.18-2.72-3.28-2.85-.1-.13-.82-1.08-.82-2.07 0-.99.52-1.47.7-1.67.18-.2.4-.25.53-.25h.38c.12 0 .29.05.44.34.16.3.54 1.31.59 1.4.05.1.08.21.02.33-.06.13-.09.2-.19.31-.1.11-.2.24-.28.32-.1.09-.19.19-.08.38.11.19.5.82 1.07 1.32.74.65 1.36.86 1.56.95.19.09.3.08.41-.04.12-.13.5-.58.64-.78.13-.2.27-.17.45-.1.19.07 1.19.56 1.39.66.2.1.34.15.39.24.05.09.05.53-.12 1z"/>
      </svg>
      WhatsApp
    </button>
  `;

  openModal('detailModalOverlay');
}


/* ═══════════════════════════════════════════════════════════
   11. MODAL DE BLOQUEIO
═══════════════════════════════════════════════════════════ */
function initBlockModal() {
  document.getElementById('openBlockBtn')?.addEventListener('click', () => {
    document.getElementById('blockDate').value = getTodayStr();
    // Pré-preenche com o intervalo de almoço configurado nas Preferências,
    // já que "Almoço" é o motivo default do select — sem hora fixa aqui.
    if (LUNCH) {
      document.getElementById('blockStart').value = LUNCH.startLabel;
      document.getElementById('blockEnd').value = LUNCH.endLabel;
    }
    openModal('blockModalOverlay');
  });

  document.getElementById('blockReason')?.addEventListener('change', function () {
    document.getElementById('blockOtherGroup').style.display =
      this.value === 'outro' ? 'flex' : 'none';
    // Ao voltar para "Almoço", reoferece o horário configurado nas Preferências.
    if (this.value === 'almoco' && LUNCH) {
      document.getElementById('blockStart').value = LUNCH.startLabel;
      document.getElementById('blockEnd').value = LUNCH.endLabel;
    }
  });

  document.getElementById('blockModalSave')?.addEventListener('click', async () => {
    const date = document.getElementById('blockDate').value;
    const barber = document.getElementById('blockBarber').value;
    const start = document.getElementById('blockStart').value;
    const end = document.getElementById('blockEnd').value;
    const reason = document.getElementById('blockReason').value;
    const otherReason = document.getElementById('blockOtherReason')?.value.trim() || '';

    if (!date || !start || !end) {
      showToast('Preencha data, início e fim.', 'error');
      return;
    }
    if (start >= end) {
      showToast('O horário de início deve ser antes do fim.', 'error');
      return;
    }
    if (reason === 'outro' && !otherReason) {
      showToast('Descreva o motivo do bloqueio.', 'error');
      return;
    }

    const saveBtn = document.getElementById('blockModalSave');
    if (saveBtn) saveBtn.disabled = true;

    try {
      // POST /api/blocks
      await InBarberAPI.createBlock({
        date,
        startTime: start,
        endTime: end,
        barberId: barber || undefined,
        reason,
        obs: reason === 'outro' ? otherReason : undefined,
      });
    } catch (err) {
      showToast(err.message || 'Erro ao bloquear horário.', 'error');
      return;
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }

    showToast('Horário bloqueado.', 'warning');
    closeModal('blockModalOverlay');
    await reloadBlocks();
  });

  document.getElementById('blockModalClose')?.addEventListener('click', () => closeModal('blockModalOverlay'));
  document.getElementById('blockModalCancel')?.addEventListener('click', () => closeModal('blockModalOverlay'));
}


/* ═══════════════════════════════════════════════════════════
   12. MODAL HELPERS
═══════════════════════════════════════════════════════════ */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    // Foco no primeiro input
    setTimeout(() => {
      const first = el.querySelector('input:not([type=hidden]), select, textarea, button');
      if (first) first.focus();
    }, 50);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.hidden = true;
    document.body.style.overflow = '';
  }
}

function initModalClose() {
  // Overlay click fecha
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Botões de fechar
  document.getElementById('apptModalClose')?.addEventListener('click', () => closeModal('apptModalOverlay'));
  document.getElementById('apptModalCancel')?.addEventListener('click', () => closeModal('apptModalOverlay'));
  document.getElementById('apptModalSave')?.addEventListener('click', saveAppt);
  document.getElementById('detailModalClose')?.addEventListener('click', () => closeModal('detailModalOverlay'));
  document.getElementById('slotModalClose')?.addEventListener('click', () => closeModal('slotModalOverlay'));
  document.getElementById('slotModalClose2')?.addEventListener('click', () => closeModal('slotModalOverlay'));

  // Escape fecha qualquer modal aberto
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not([hidden])').forEach(m => closeModal(m.id));
    }
  });

  // Mudanças no formulário disparam verificação de conflito
  document.getElementById('apptTime')?.addEventListener('change', () => { checkConflict(); });
  document.getElementById('apptDate')?.addEventListener('change', () => {
    const currentTime = document.getElementById('apptTime')?.value || null;
    populateTimeSelect(currentTime);
    checkConflict();
  });
}


/* ═══════════════════════════════════════════════════════════
   13. VIEW TABS & FILTROS
═══════════════════════════════════════════════════════════ */
function initViewTabs() {
  document.querySelectorAll('.view-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      STATE.activeView = view;

      document.querySelectorAll('.view-tab').forEach(b => {
        b.classList.toggle('view-tab--active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });

      document.querySelectorAll('.view-panel').forEach(p => {
        p.classList.toggle('view-panel--hidden', p.id !== `view-${view}`);
      });

      if (view === 'calendar') renderCalendar();
      if (view === 'list') renderList();
    });
  });
}

function initFilters() {
  // Busca por nome: filtro em memória sobre o que já foi carregado,
  // igual ao padrão do autocomplete de cliente (sem fetch por tecla).
  document.getElementById('searchInput')?.addEventListener('input', function () {
    STATE.filterSearch = this.value.trim();
    refreshAll();
  });

  // Barbeiro/serviço: o back-end já filtra nativamente por barberId/serviceId
  // (listAppointments), e o evento 'change' só dispara uma vez por seleção
  // (não por tecla), então aqui vale buscar de novo em vez de só filtrar
  // o que já está em memória.
  document.getElementById('filterBarber')?.addEventListener('change', function () {
    STATE.filterBarber = this.value;
    reloadAppointments();
  });

  document.getElementById('filterService')?.addEventListener('change', function () {
    STATE.filterService = this.value;
    reloadAppointments();
  });
}


/* ─── MOBILE SIDEBAR ────────────────────────────────────── */
function initSidebar() {
  const burger = document.getElementById('burgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const newBtn = document.getElementById('topbarNewBtn');

  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-visible');
    overlay.removeAttribute('aria-hidden');
    burger?.classList.add('is-open');
    burger?.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    burger?.classList.remove('is-open');
    burger?.setAttribute('aria-expanded', 'false');
  }

  burger?.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });

  overlay?.addEventListener('click', closeSidebar);
  newBtn?.addEventListener('click', () => openNewAppt());

  const toggleBtn = document.getElementById('sidebarToggleBtn')
  function collapseSidebar() {
    sidebar.classList.add('is-collapsed')
    sidebar.classList.remove("is-expanded")
    toggleBtn?.setAttribute('aria-expanded', 'false')
    toggleBtn?.setAttribute('aria-label', 'Expandir menu')
    try { localStorage.setItem('sidebarCollapsed', '1'); } catch (e) { }
  }

  function expandSidebar() {
    sidebar.classList.remove('is-collapsed')
    sidebar.classList.add('is-expanded')
    toggleBtn?.setAttribute('aria-expanded', 'true')
    toggleBtn?.setAttribute('aria-label', 'Recolher menu')
    try { localStorage.setItem('sidebarCollapsed', '0'); } catch (e) { }
  }
  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.contains('is-collapsed') ? expandSidebar() : collapseSidebar()
  })
  try {
    if (localStorage.getItem('sidebarCollapsed') === '0') expandSidebar()
  } catch (e) { }
  document.getElementById('openNewApptBtn')?.addEventListener('click', () => openNewAppt());
}


/* ═══════════════════════════════════════════════════════════
   14. REFRESH GLOBAL & BOOT
═══════════════════════════════════════════════════════════ */
function refreshAll() {
  renderStats();
  if (STATE.activeView === 'kanban') renderKanban();
  if (STATE.activeView === 'calendar') renderCalendar();
  if (STATE.activeView === 'list') renderList();
}

/* ─── TOOLTIP DO CALENDÁRIO ─────────────────────────────── */
function initCalTooltip() {
  const tip = document.getElementById('calTooltip');
  if (!tip) return;

  let hideTimer = null;

  // Delegação: escuta mouseenter/mouseleave em .cal-week-grid
  document.addEventListener('mouseover', e => {
    const card = e.target.closest('#calWeekGrid .cal-event:not(.cal-event--block)');
    if (!card) return;

    clearTimeout(hideTimer);

    // Pega o id do agendamento do onclick do card
    const onclickStr = card.getAttribute('onclick') || '';
    const match = onclickStr.match(/openDetail\('([^']+)'\)/);
    if (!match) return;
    const apptId = match[1];

    const appt = APPOINTMENTS.find(a => a.id === apptId);
    if (!appt) return;

    const svc = getService(appt.serviceId);
    const barber = getBarber(appt.barberId);

    // Calcula horário de fim
    const durationMin = svc ? svc.duration : 30;
    const [hh, mm] = appt.time.split(':').map(Number);
    const endMin = hh * 60 + mm + durationMin;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    tip.innerHTML = `
      <div class="cal-tooltip__inner">
        <div class="cal-tooltip__name">${appt.client}</div>

        <div class="cal-tooltip__row">
          <svg class="cal-tooltip__icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1 6h12" stroke="currentColor" stroke-width="1.3"/>
            <path d="M4.5 1v2M9.5 1v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>${appt.time} – ${endTime}</span>
        </div>

        <div class="cal-tooltip__row">
          <svg class="cal-tooltip__icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="5" r="3" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>${barber ? barber.name : '—'}</span>
        </div>

        <div class="cal-tooltip__row">
          <svg class="cal-tooltip__icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 4h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.3"/>
            <path d="M1 7h12" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          <span>${svc ? svc.name : '—'}</span>
        </div>

        <div class="cal-tooltip__row">
          <svg class="cal-tooltip__icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M7 4.5v3l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <span>${svc ? svc.duration + ' min' : '—'}</span>
        </div>

        <div class="cal-tooltip__row" style="justify-content:space-between; margin-top:2px; padding-top:8px; border-top:1px solid var(--divider)">
          <span class="cal-tooltip__status cal-tooltip__status--${appt.status}">
            ${getStatusLabel(appt.status)}
          </span>
          ${svc ? `<span class="cal-tooltip__price">${formatCurrency(svc.price)}</span>` : ''}
        </div>
      </div>`;

    tip.setAttribute('aria-hidden', 'false');
    positionTooltip(tip, e);
    tip.classList.add('is-visible');
  });

  // Reposiciona o tooltip enquanto o mouse se move dentro do card
  document.addEventListener('mousemove', e => {
    const card = e.target.closest('#calWeekGrid .cal-event:not(.cal-event--block)');
    if (!card || !tip.classList.contains('is-visible')) return;
    positionTooltip(tip, e);
  });

  document.addEventListener('mouseout', e => {
    const card = e.target.closest('#calWeekGrid .cal-event:not(.cal-event--block)');
    if (!card) return;
    hideTimer = setTimeout(() => {
      tip.classList.remove('is-visible');
      tip.setAttribute('aria-hidden', 'true');
    }, 80);
  });

  // Esconde ao clicar (abre o modal)
  document.addEventListener('click', e => {
    if (e.target.closest('#calWeekGrid .cal-event')) {
      tip.classList.remove('is-visible');
      tip.setAttribute('aria-hidden', 'true');
    }
  });
}

function positionTooltip(tip, e) {
  const margin = 14;
  const tipW = tip.offsetWidth || 240;
  const tipH = tip.offsetHeight || 180;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = e.clientX + margin;
  let y = e.clientY + margin;

  // Não sair pela direita
  if (x + tipW > vw - 8) x = e.clientX - tipW - margin;
  // Não sair pela base
  if (y + tipH > vh - 8) y = e.clientY - tipH - margin;

  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

/* ═══════════════════════════════════════════════════════════
   ANIMAÇÕES DE ENTRADA — Agenda
   Replicando o padrão do Dashboard:
     • animateCounter  → contagem de 0 até o valor (ease-out cubic)
     • initScrollReveal → fade-in + translateY nos cards/pills
═══════════════════════════════════════════════════════════ */

/**
 * Anima um contador de `from` até `to` em `duration`ms
 * Idêntico ao dashboard.js — ease-out cubic
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 * @param {number} duration
 * @param {Function} [formatter]
 */
function animateCounter(el, from, to, duration, formatter) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = formatter ? formatter(to) : to;
    return;
  }
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * ease);
    el.textContent = formatter ? formatter(current) : current;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/**
 * Scroll-reveal para cards, pills e colunas kanban —
 * fade-in + translateY, com stagger de 40ms (máx 300ms),
 * idêntico ao initScrollReveal do dashboard.js
 */
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll(
    '.stat-pill, .kanban-col, .agenda-list-card, .cal-legend-item'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.revealDelay || 0);
        setTimeout(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.08 });

  targets.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity 480ms var(--ease-out), transform 480ms var(--ease-out)';
    el.dataset.revealDelay = Math.min(i * 40, 300);
    observer.observe(el);
  });
}

/**
 * Anima os valores numéricos dos stat-pills da Agenda
 * após o renderStats() popular o DOM.
 */
function animateAgendaStats() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pills = document.querySelectorAll('#agendaStats .stat-pill__value');
  pills.forEach((el) => {
    const raw = parseInt(el.textContent, 10);
    if (!isNaN(raw)) {
      el.textContent = '0';
      // Pequeno delay para a animação de fade-in do pill já ter iniciado
      setTimeout(() => animateCounter(el, 0, raw, 900), 150);
    }
  });
}

async function boot() {
  renderHeader();
  initViewTabs();
  initListFilters();
  initCalNav();
  initModalClose();
  initClientAutocomplete();
  initBlockModal();
  initSidebar();
  initCalTooltip();

  // Carrega serviços, barbeiros e config de negócio (nome da barbearia,
  // horário de funcionamento e almoço) em paralelo antes de qualquer
  // render, para que getService()/getBarber(), CFG, LUNCH, os pickers
  // do modal e os selects de filtro já tenham dados reais quando a
  // tela aparecer.
  try {
    [SERVICES, BARBERS, FORMAS_PAGAMENTO] = await Promise.all([
      InBarberAPI.listServices(),
      InBarberAPI.listBarbers(),
      InBarberAPI.listSaidasPgto(),
      loadBusinessConfig(),
    ]);
  } catch (err) {
    showToast('Erro ao carregar dados da barbearia. Recarregue a página.', 'error');
  }

  // Popula os <select> de filtro com os dados vindos da API.
  // Feito aqui (após o await) para garantir que SERVICES/BARBERS já têm dados.
  populateFilterSelects();
  populateFormaPagamentoSelect();

  // initFilters() registra os listeners DEPOIS que os <select> foram populados,
  // evitando que o 'change' dispare com um option vazio na montagem.
  initFilters();

  // Carrega os agendamentos da API (substitui as antigas
  // renderStats()/renderKanban() diretas sobre o mock: agora
  // a tela nasce vazia e reloadAppointments() -> refreshAll()
  // preenche assim que a resposta chega, disparando também a
  // animação dos stats na primeira carga — ver reloadAppointments()).
  reloadAppointments();

  // Carrega os bloqueios de horário reais (GET /api/blocks),
  // substituindo o antigo mock BLOCKS.
  reloadBlocks();

  // ── Animações de entrada ──────────────────────────────────
  initScrollReveal();
  // ─────────────────────────────────────────────────────────

  console.log('[InBarber Agenda] Inicializado com sucesso.');
}

function populateFilterSelects() {
  const filterBarber = document.getElementById('filterBarber');
  if (filterBarber) {
    filterBarber.innerHTML =
      `<option value="">Todos os barbeiros</option>` +
      BARBERS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  }

  const filterService = document.getElementById('filterService');
  if (filterService) {
    filterService.innerHTML =
      `<option value="">Todos os serviços</option>` +
      SERVICES.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  const blockBarber = document.getElementById('blockBarber');
  if (blockBarber) {
    blockBarber.innerHTML =
      `<option value="">Todos</option>` +
      BARBERS.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  }
}

// Popula o <select> de forma de pagamento do modal de agendamento
// com os dados reais de formas_pagamento (mesma fonte usada em Saídas).
function populateFormaPagamentoSelect() {
  const sel = document.getElementById('apptFormaPagamento');
  if (!sel) return;
  sel.innerHTML =
    `<option value="">Selecionar...</option>` +
    FORMAS_PAGAMENTO.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
}

document.addEventListener('DOMContentLoaded', boot);