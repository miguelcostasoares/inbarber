/* ═══════════════════════════════════════════════════════════
   InBarber — Agenda JS
   Ordem: Config → Mock Data → State → Utils
        → Kanban → Calendar → List → Modals → UI → Boot
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── 1. CONFIG ─────────────────────────────────────────── */
const CFG = {
  barbershopName: 'Barbearia do Rafael',
  ownerName: 'Rafael',
  openHour: 8,
  closeHour: 20,
  slotMinutes: 30,
  currency: 'BRL',
};


/* ─── 2. MOCK DATA ──────────────────────────────────────── */
/*
 * Em produção, substitua cada bloco por fetch() ao endpoint indicado.
 * A estrutura de retorno deve permanecer idêntica.
 */

// GET /api/services
const SERVICES = [
  { id: 'corte', name: 'Corte Masculino', price: 45, duration: 30, color: '#BFA06A' },
  { id: 'barba', name: 'Barba', price: 35, duration: 30, color: '#5B8DEF' },
  { id: 'combo', name: 'Corte + Barba', price: 70, duration: 60, color: '#9B72CF' },
  { id: 'pigmentacao', name: 'Pigmentação', price: 90, duration: 60, color: '#4CAF79' },
  { id: 'relaxamento', name: 'Relaxamento', price: 80, duration: 60, color: '#E0924A' },
  { id: 'sobrancelha', name: 'Sobrancelha', price: 20, duration: 20, color: '#E05454' },
];

// GET /api/barbers
const BARBERS = [
  { id: 'marcos', name: 'Marcos Silva', avatar: 'MS', rating: 4.9 },
  { id: 'joao', name: 'João Pereira', avatar: 'JP', rating: 4.7 },
  { id: 'andre', name: 'André Santos', avatar: 'AS', rating: 4.8 },
];

// GET /api/clients (lista para autocomplete)
const CLIENTS_DB = [
  { name: 'Lucas Andrade', phone: '84999990001' },
  { name: 'Felipe Rocha', phone: '84999990002' },
  { name: 'Gabriel Souza', phone: '84999990003' },
  { name: 'Matheus Lima', phone: '84999990004' },
  { name: 'Ricardo Ferreira', phone: '84999990005' },
  { name: 'Bruno Carvalho', phone: '84999990006' },
  { name: 'Diego Martins', phone: '84999990007' },
  { name: 'Thiago Oliveira', phone: '84999990008' },
  { name: 'Cauã Ribeiro', phone: '84999990009' },
  { name: 'Vinicius Alves', phone: '84999990010' },
  { name: 'Leonardo Costa', phone: '84999990011' },
  { name: 'Samuel Pereira', phone: '84999990012' },
  { name: 'Rafael Nascimento', phone: '84999990013' },
  { name: 'Igor Campos', phone: '84999990014' },
  { name: 'Henrique Duarte', phone: '84999990015' },
  { name: 'Gustavo Mendes', phone: '84999990016' },
  { name: 'Pedro Linhares', phone: '84999990017' },
  { name: 'Rodrigo Fonseca', phone: '84999990018' },
];

// GET /api/appointments?date=today
// status: 'pendente' | 'confirmado' | 'em-andamento' | 'concluido' | 'no-show'
let APPOINTMENTS = [
  { id: 'a001', date: getTodayStr(), time: '08:00', client: 'Lucas Andrade', phone: '84999990001', serviceId: 'combo', barberId: 'marcos', status: 'concluido', notes: '' },
  { id: 'a002', date: getTodayStr(), time: '08:30', client: 'Felipe Rocha', phone: '84999990002', serviceId: 'corte', barberId: 'joao', status: 'concluido', notes: '' },
  { id: 'a003', date: getTodayStr(), time: '09:00', client: 'Gabriel Souza', phone: '84999990003', serviceId: 'barba', barberId: 'andre', status: 'concluido', notes: 'Preferência por navalha' },
  { id: 'a004', date: getTodayStr(), time: '09:30', client: 'Matheus Lima', phone: '84999990004', serviceId: 'pigmentacao', barberId: 'marcos', status: 'concluido', notes: '' },
  { id: 'a005', date: getTodayStr(), time: '10:00', client: 'Ricardo Ferreira', phone: '84999990005', serviceId: 'corte', barberId: 'joao', status: 'no-show', notes: '' },
  { id: 'a006', date: getTodayStr(), time: '10:30', client: 'Bruno Carvalho', phone: '84999990006', serviceId: 'combo', barberId: 'andre', status: 'concluido', notes: '' },
  { id: 'a007', date: getTodayStr(), time: '11:00', client: 'Diego Martins', phone: '84999990007', serviceId: 'relaxamento', barberId: 'marcos', status: 'em-andamento', notes: 'Cabelo comprido' },
  { id: 'a008', date: getTodayStr(), time: '11:30', client: 'Thiago Oliveira', phone: '84999990008', serviceId: 'sobrancelha', barberId: 'joao', status: 'confirmado', notes: '' },
  { id: 'a009', date: getTodayStr(), time: '12:00', client: 'Cauã Ribeiro', phone: '84999990009', serviceId: 'corte', barberId: 'andre', status: 'confirmado', notes: '' },
  { id: 'a010', date: getTodayStr(), time: '13:00', client: 'Vinicius Alves', phone: '84999990010', serviceId: 'combo', barberId: 'marcos', status: 'confirmado', notes: '' },
  { id: 'a011', date: getTodayStr(), time: '13:30', client: 'Leonardo Costa', phone: '84999990011', serviceId: 'barba', barberId: 'joao', status: 'pendente', notes: 'Ligar antes' },
  { id: 'a012', date: getTodayStr(), time: '14:00', client: 'Samuel Pereira', phone: '84999990012', serviceId: 'pigmentacao', barberId: 'andre', status: 'pendente', notes: '' },
  { id: 'a013', date: getTodayStr(), time: '14:30', client: 'Rafael Nascimento', phone: '84999990013', serviceId: 'corte', barberId: 'marcos', status: 'pendente', notes: '' },
  { id: 'a014', date: getTodayStr(), time: '15:00', client: 'Igor Campos', phone: '84999990014', serviceId: 'combo', barberId: 'joao', status: 'pendente', notes: '' },
  { id: 'a015', date: getTodayStr(), time: '16:00', client: 'Henrique Duarte', phone: '84999990015', serviceId: 'relaxamento', barberId: 'andre', status: 'pendente', notes: '' },
];

// GET /api/blocks (bloqueios de horário)
let BLOCKS = [
  { id: 'b001', date: getTodayStr(), startTime: '12:00', endTime: '13:00', barberId: 'marcos', reason: 'almoco' },
  { id: 'b002', date: getTodayStr(), startTime: '12:00', endTime: '13:00', barberId: 'joao', reason: 'almoco' },
  { id: 'b003', date: getTodayStr(), startTime: '12:00', endTime: '13:00', barberId: 'andre', reason: 'almoco' },
];


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

function genId() {
  return 'x' + Math.random().toString(36).slice(2, 9);
}

function getService(id) { return SERVICES.find(s => s.id === id) || null; }
function getBarber(id) { return BARBERS.find(b => b.id === id) || null; }

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

// Gera slots de horário para o select
// Horário de almoço bloqueado: das 12:00 até as 13:00
const LUNCH_START = 12 * 60; // 720 min
const LUNCH_END = 13 * 60; // 780 min

function generateTimeSlots() {
  const slots = [];
  let current = CFG.openHour * 60;
  const close = CFG.closeHour * 60;
  while (current < close) {
    // Pula qualquer slot que inicie dentro do bloqueio de almoço
    if (current < LUNCH_START || current >= LUNCH_END) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
    current += CFG.slotMinutes;
  }
  return slots;
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

  const today = getTodayStr();
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
          <div class="kanban-card__avatar kanban-card__avatar--${appt.barberId}" aria-hidden="true">
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
  const whatsapp = `
    <button class="action-btn action-btn--green"
            onclick="sendWhatsApp('${appt.id}')"
            aria-label="Enviar WhatsApp para ${appt.client}" title="WhatsApp">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.01 3.9L0 16l4.24-1.01A7.95 7.95 0 0 0 8 16c4.42 0 8-3.58 8-8S12.42 0 8 0zm3.92 11.34c-.17.47-1 .92-1.38.96-.35.04-.68.17-2.29-.47-1.93-.76-3.18-2.72-3.28-2.85-.1-.13-.82-1.08-.82-2.07 0-.99.52-1.47.7-1.67.18-.2.4-.25.53-.25h.38c.12 0 .29.05.44.34.16.3.54 1.31.59 1.4.05.1.08.21.02.33-.06.13-.09.2-.19.31-.1.11-.2.24-.28.32-.1.09-.19.19-.08.38.11.19.5.82 1.07 1.32.74.65 1.36.86 1.56.95.19.09.3.08.41-.04.12-.13.5-.58.64-.78.13-.2.27-.17.45-.1.19.07 1.19.56 1.39.66.2.1.34.15.39.24.05.09.05.53-.12 1z"/>
      </svg>
      WhatsApp
    </button>`;

  const actions = [];

  if (appt.status === 'pendente') {
    actions.push(`
      <button class="action-btn action-btn--blue" onclick="changeStatus('${appt.id}','confirmado')" aria-label="Confirmar agendamento">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6l3 3 7-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Confirmar
      </button>`);
    actions.push(whatsapp);
    actions.push(`<button class="action-btn action-btn--gold" onclick="openEditAppt('${appt.id}')" aria-label="Editar agendamento">Editar</button>`);
    actions.push(`<button class="action-btn action-btn--red" onclick="changeStatus('${appt.id}','no-show')" aria-label="Cancelar">Cancelar</button>`);
  }

  if (appt.status === 'confirmado') {
    actions.push(`
      <button class="action-btn action-btn--orange" onclick="changeStatus('${appt.id}','em-andamento')" aria-label="Iniciar corte">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 6l9-4-4 9-2-3-3-2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        Iniciar
      </button>`);
    actions.push(whatsapp);
    actions.push(`<button class="action-btn action-btn--gold" onclick="openEditAppt('${appt.id}')" aria-label="Reagendar">Reagendar</button>`);
    actions.push(`<button class="action-btn action-btn--red" onclick="changeStatus('${appt.id}','no-show')" aria-label="No-show">No-show</button>`);
  }

  if (appt.status === 'em-andamento') {
    actions.push(`
      <button class="action-btn action-btn--green" onclick="changeStatus('${appt.id}','concluido')" aria-label="Finalizar atendimento">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6l3 3 7-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Finalizar
      </button>`);
    actions.push(whatsapp);
  }

  if (appt.status === 'concluido') {
    actions.push(whatsapp);
    actions.push(`<button class="action-btn action-btn--muted" onclick="openEditAppt('${appt.id}')" aria-label="Ver detalhes">Ver detalhes</button>`);
  }

  if (appt.status === 'no-show') {
    actions.push(`<button class="action-btn action-btn--blue" onclick="openEditAppt('${appt.id}')" aria-label="Reagendar">Reagendar</button>`);
    actions.push(whatsapp);
  }

  return actions.join('');
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

function changeStatus(id, newStatus, opts = {}) {
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;

  const oldStatus = appt.status;
  appt.status = newStatus;

  // POST /api/appointments/:id/status { status: newStatus }

  const labels = {
    'confirmado': 'confirmado',
    'em-andamento': 'iniciado',
    'concluido': 'finalizado',
    'no-show': 'marcado como no-show',
    'pendente': 'movido para pendente',
  };

  if (!opts.silent) {
    showToast(`${appt.client} ${labels[newStatus] || newStatus}.`, 'success');
  } else {
    showToast(`${appt.client} movido para ${getStatusLabel(newStatus)}.`, 'info');
  }

  refreshAll();

  // Aplica animação de "soltar com sucesso" no novo card, após o re-render
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
        return ah === h;
      });

      const cellBlocks = BLOCKS.filter(b => {
        if (b.date !== date) return false;
        const [bh] = b.startTime.split(':').map(Number);
        return bh === h;
      });

      const isLunch = (h >= 12 && h < 13);
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
    const dayAppts = APPOINTMENTS.filter(a => a.date === cell.date);
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
  if (hour >= 12 && hour < 13) {
    showToast('Horário de almoço bloqueado (12:00–13:00).', 'warning');
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
            <div class="list-barber-avatar list-barber-avatar--${a.barberId}" aria-hidden="true">
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

function deleteAppt(id) {
  const appt = APPOINTMENTS.find(a => a.id === id);
  if (!appt) return;
  if (!confirm(`Excluir agendamento de ${appt.client}?`)) return;
  // DELETE /api/appointments/:id
  APPOINTMENTS = APPOINTMENTS.filter(a => a.id !== id);
  showToast('Agendamento excluído.', 'warning');
  refreshAll();
}

function initListFilters() {
  const dateInput = document.getElementById('listDateFilter');
  const statusInput = document.getElementById('listStatusFilter');

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
  document.getElementById('apptDate').value = prefill.date || getTodayStr();
  document.getElementById('apptModalTitle').textContent = 'Novo Agendamento';
  document.getElementById('apptModalSave').innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Agendar`;

  hideConflict();
  document.getElementById('modalSummary').hidden = true;

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
  document.getElementById('apptDate').value = appt.date;
  document.getElementById('apptModalTitle').textContent = 'Editar Agendamento';
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
  picker.innerHTML = BARBERS.map(b => `
    <button type="button"
            class="barber-option ${b.id === selectedId ? 'is-selected' : ''}"
            data-barber-id="${b.id}"
            role="radio"
            aria-checked="${String(b.id === selectedId)}"
            onclick="selectBarber('${b.id}')">
      <div class="barber-option__avatar kanban-card__avatar--${b.id}" aria-hidden="true">${b.avatar}</div>
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
  checkConflict();
}

function populateTimeSelect(selectedTime) {
  const sel = document.getElementById('apptTime');
  if (!sel) return;
  const slots = generateTimeSlots();
  sel.innerHTML = `<option value="">Selecionar</option>` +
    slots.map(t => `<option value="${t}" ${t === selectedTime ? 'selected' : ''}>${t}</option>`).join('');
}

function updateModalSummary(serviceId) {
  const svc = getService(serviceId);
  const summaryEl = document.getElementById('modalSummary');
  if (!svc) { summaryEl.hidden = true; return; }
  summaryEl.hidden = false;
  document.getElementById('summaryService').textContent = svc.name;
  document.getElementById('summaryDuration').textContent = `${svc.duration} min`;
  document.getElementById('summaryPrice').textContent = formatCurrency(svc.price);
}

function getFormData() {
  const selectedService = document.querySelector('.service-option.is-selected');
  const selectedBarber = document.querySelector('.barber-option.is-selected');
  return {
    id: document.getElementById('apptId').value || null,
    client: document.getElementById('apptClient').value.trim(),
    phone: document.getElementById('apptPhone').value.trim(),
    date: document.getElementById('apptDate').value,
    time: document.getElementById('apptTime').value,
    serviceId: selectedService?.dataset.serviceId || '',
    barberId: selectedBarber?.dataset.barberId || '',
    notes: document.getElementById('apptNotes').value.trim(),
  };
}

function checkConflict() {
  const data = getFormData();
  if (!data.serviceId || !data.barberId || !data.time || !data.date) {
    hideConflict();
    return;
  }
  const appt = { ...data, status: 'confirmado' };
  if (hasConflict(appt, STATE.editingId)) {
    showConflict(`Conflito: ${getBarber(data.barberId)?.name} já tem agendamento próximo às ${data.time}.`);
  } else {
    hideConflict();
  }
}

function showConflict(msg) {
  const el = document.getElementById('modalConflict');
  document.getElementById('conflictMsg').textContent = msg;
  el.hidden = false;
}

function hideConflict() {
  document.getElementById('modalConflict').hidden = true;
}

function saveAppt() {
  const data = getFormData();

  // Validação básica
  if (!data.client) { showToast('Informe o nome do cliente.', 'error'); return; }
  if (!data.date) { showToast('Selecione a data.', 'error'); return; }
  if (!data.time) { showToast('Selecione o horário.', 'error'); return; }
  const [slotH, slotM] = data.time.split(':').map(Number);
  const slotMin = slotH * 60 + slotM;
  if (slotMin >= LUNCH_START && slotMin < LUNCH_END) {
    showToast('Horário de almoço bloqueado (12:00–13:00). Escolha outro horário.', 'warning');
    return;
  }
  if (!data.serviceId) { showToast('Selecione um serviço.', 'error'); return; }
  if (!data.barberId) { showToast('Selecione um barbeiro.', 'error'); return; }

  if (STATE.editingId) {
    // PUT /api/appointments/:id
    const appt = APPOINTMENTS.find(a => a.id === STATE.editingId);
    if (appt) {
      Object.assign(appt, {
        client: data.client,
        phone: data.phone,
        date: data.date,
        time: data.time,
        serviceId: data.serviceId,
        barberId: data.barberId,
        notes: data.notes,
      });
      showToast('Agendamento atualizado.', 'success');
    }
  } else {
    // POST /api/appointments
    const newAppt = {
      id: genId(),
      client: data.client,
      phone: data.phone,
      date: data.date,
      time: data.time,
      serviceId: data.serviceId,
      barberId: data.barberId,
      notes: data.notes,
      status: 'pendente',
    };
    APPOINTMENTS.push(newAppt);
    showToast(`Agendamento de ${data.client} criado com sucesso.`, 'success');
  }

  closeModal('apptModalOverlay');
  refreshAll();
}

/* Autocomplete de clientes */
function initClientAutocomplete() {
  const input = document.getElementById('apptClient');
  const list = document.getElementById('autocompleteList');
  if (!input || !list) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { list.hidden = true; return; }
    const matches = CLIENTS_DB.filter(c => c.name.toLowerCase().includes(q)).slice(0, 6);
    if (!matches.length) { list.hidden = true; return; }
    list.innerHTML = matches.map((c, i) => `
      <li class="autocomplete-item"
          role="option"
          id="ac-${i}"
          onclick="selectClient('${c.name}','${c.phone}')">
        ${c.name} <span style="color:var(--muted);margin-left:6px;font-size:11px">${formatPhone(c.phone)}</span>
      </li>`).join('');
    list.hidden = false;
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

  document.getElementById('detailModalTitle').textContent = appt.client;

  const body = document.getElementById('detailModalBody');
  body.innerHTML = `
    <div class="detail-row">
      <div class="detail-section">
        <div class="detail-label">Horário</div>
        <div class="detail-value detail-value--large">${appt.time}</div>
        <div style="color:var(--muted);font-size:12px;margin-top:2px">${formatDate(appt.date)}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Status</div>
        <span class="status-badge status-badge--${appt.status === 'em-andamento' ? 'andamento' : appt.status === 'no-show' ? 'noshow' : appt.status}">${getStatusLabel(appt.status)}</span>
        ${conflict ? `<div style="color:var(--red);font-size:11px;margin-top:6px;display:flex;align-items:center;gap:4px">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1L9 8H1L5 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 4v2M5 7v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          Conflito detectado
        </div>` : ''}
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-section">
        <div class="detail-label">Serviço</div>
        <div class="detail-value" style="display:flex;align-items:center;gap:7px">
          <span style="width:8px;height:8px;border-radius:50%;background:${svc?.color || '#6B6762'};display:inline-block;flex-shrink:0" aria-hidden="true"></span>
          ${svc?.name || '—'}
        </div>
        <div style="color:var(--muted);font-size:12px;margin-top:2px">${svc ? `${svc.duration} min` : ''}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Valor</div>
        <div class="detail-value detail-value--gold">${svc ? formatCurrency(svc.price) : '—'}</div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Barbeiro</div>
      <div class="detail-barber-row">
        <div class="detail-barber-avatar detail-barber-avatar--${appt.barberId}" aria-hidden="true">
          ${barber?.avatar || '?'}
        </div>
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--cream)">${barber?.name || '—'}</div>
          <div style="font-size:12px;color:var(--muted)">★ ${barber?.rating || '—'}</div>
        </div>
      </div>
    </div>
    ${appt.phone ? `
    <div class="detail-section">
      <div class="detail-label">Telefone</div>
      <div class="detail-value">${formatPhone(appt.phone)}</div>
    </div>` : ''}
    ${appt.notes ? `
    <div class="detail-section">
      <div class="detail-label">Observações</div>
      <div class="detail-notes">${appt.notes}</div>
    </div>` : ''}
  `;

  // Ações no rodapé
  const actions = document.getElementById('detailModalActions');
  const actBtns = [];

  if (appt.status === 'pendente') {
    actBtns.push(`<button class="action-btn action-btn--blue"  onclick="changeStatus('${appt.id}','confirmado');closeModal('detailModalOverlay')">Confirmar</button>`);
    actBtns.push(`<button class="action-btn action-btn--gold"  onclick="openEditAppt('${appt.id}')">Editar</button>`);
    actBtns.push(`<button class="action-btn action-btn--red"   onclick="changeStatus('${appt.id}','no-show');closeModal('detailModalOverlay')">Cancelar</button>`);
  }
  if (appt.status === 'confirmado') {
    actBtns.push(`<button class="action-btn action-btn--orange" onclick="changeStatus('${appt.id}','em-andamento');closeModal('detailModalOverlay')">Iniciar</button>`);
    actBtns.push(`<button class="action-btn action-btn--gold"   onclick="openEditAppt('${appt.id}')">Reagendar</button>`);
    actBtns.push(`<button class="action-btn action-btn--red"    onclick="changeStatus('${appt.id}','no-show');closeModal('detailModalOverlay')">No-show</button>`);
  }
  if (appt.status === 'em-andamento') {
    actBtns.push(`<button class="action-btn action-btn--green" onclick="changeStatus('${appt.id}','concluido');closeModal('detailModalOverlay')">Finalizar</button>`);
  }
  if (appt.status === 'concluido') {
    actBtns.push(`<button class="action-btn action-btn--muted" onclick="openEditAppt('${appt.id}')">Editar</button>`);
  }
  if (appt.status === 'no-show') {
    actBtns.push(`<button class="action-btn action-btn--blue"  onclick="openEditAppt('${appt.id}')">Reagendar</button>`);
  }
  actBtns.push(`<button class="action-btn action-btn--green" onclick="sendWhatsApp('${appt.id}')">
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.01 3.9L0 16l4.24-1.01A7.95 7.95 0 0 0 8 16c4.42 0 8-3.58 8-8S12.42 0 8 0zm3.92 11.34c-.17.47-1 .92-1.38.96-.35.04-.68.17-2.29-.47-1.93-.76-3.18-2.72-3.28-2.85-.1-.13-.82-1.08-.82-2.07 0-.99.52-1.47.7-1.67.18-.2.4-.25.53-.25h.38c.12 0 .29.05.44.34.16.3.54 1.31.59 1.4.05.1.08.21.02.33-.06.13-.09.2-.19.31-.1.11-.2.24-.28.32-.1.09-.19.19-.08.38.11.19.5.82 1.07 1.32.74.65 1.36.86 1.56.95.19.09.3.08.41-.04.12-.13.5-.58.64-.78.13-.2.27-.17.45-.1.19.07 1.19.56 1.39.66.2.1.34.15.39.24.05.09.05.53-.12 1z"/>
    </svg>
    WhatsApp
  </button>`);

  actions.innerHTML = actBtns.join('');

  openModal('detailModalOverlay');
}


/* ═══════════════════════════════════════════════════════════
   11. MODAL DE BLOQUEIO
═══════════════════════════════════════════════════════════ */
function initBlockModal() {
  document.getElementById('openBlockBtn')?.addEventListener('click', () => {
    document.getElementById('blockDate').value = getTodayStr();
    openModal('blockModalOverlay');
  });

  document.getElementById('blockReason')?.addEventListener('change', function () {
    document.getElementById('blockOtherGroup').style.display =
      this.value === 'outro' ? 'flex' : 'none';
  });

  document.getElementById('blockModalSave')?.addEventListener('click', () => {
    const date = document.getElementById('blockDate').value;
    const barber = document.getElementById('blockBarber').value;
    const start = document.getElementById('blockStart').value;
    const end = document.getElementById('blockEnd').value;
    const reason = document.getElementById('blockReason').value;

    if (!date || !start || !end) {
      showToast('Preencha data, início e fim.', 'error');
      return;
    }
    if (start >= end) {
      showToast('O horário de início deve ser antes do fim.', 'error');
      return;
    }

    // POST /api/blocks
    const block = { id: genId(), date, startTime: start, endTime: end, reason };
    if (barber) block.barberId = barber;
    BLOCKS.push(block);

    showToast('Horário bloqueado.', 'warning');
    closeModal('blockModalOverlay');
    refreshAll();
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
  document.getElementById('apptDate')?.addEventListener('change', () => { checkConflict(); });
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
  document.getElementById('searchInput')?.addEventListener('input', function () {
    STATE.filterSearch = this.value.trim();
    refreshAll();
  });

  document.getElementById('filterBarber')?.addEventListener('change', function () {
    STATE.filterBarber = this.value;
    refreshAll();
  });

  document.getElementById('filterService')?.addEventListener('change', function () {
    STATE.filterService = this.value;
    refreshAll();
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

/* Simula atualização em tempo real (polling de 30s em produção = WebSocket) */
function startRealtimeSimulation() {
  // Em produção: substituir por WebSocket ou SSE
  // ws.onmessage = (e) => { const data = JSON.parse(e.data); applyUpdate(data); refreshAll(); }
  setInterval(() => {
    // Simula que um agendamento pendente foi confirmado pelo cliente via link
    const pendentes = APPOINTMENTS.filter(a => a.status === 'pendente');
    if (pendentes.length > 0) {
      const lucky = pendentes[Math.floor(Math.random() * pendentes.length)];
      // Só ocorre 20% das vezes para não encher de toasts
      if (Math.random() < 0.20) {
        lucky.status = 'confirmado';
        showToast(`${lucky.client} confirmou via link! ✔`, 'success');
        refreshAll();
      }
    }
  }, 30000);
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

function boot() {
  renderHeader();
  renderStats();
  renderKanban();
  initViewTabs();
  initFilters();
  initListFilters();
  initCalNav();
  initModalClose();
  initClientAutocomplete();
  initBlockModal();
  initSidebar();
  initCalTooltip();
  startRealtimeSimulation();

  console.log('[InBarber Agenda] Inicializado com sucesso.');
}

document.addEventListener('DOMContentLoaded', boot);