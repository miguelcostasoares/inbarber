/* ═══════════════════════════════════════════════════════════
   InBarber — Clientes JS
   Ordem: Config → Mock Data → State → Utils
        → KPIs → Tabela → Paginação → Modais → UI → Boot
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── 1. CONFIG ─────────────────────────────────────────── */
const CFG = {
  perPage: 8,
  activeWindowDays: 60, // cliente "ativo" = visitou nos últimos 60 dias
};


/* ─── 2. MOCK DATA ──────────────────────────────────────── */
// Em produção: GET /api/clients
let CLIENTS = [
  { id: 'c001', name: 'Lucas Andrade',     phone: '84999990001', lastVisit: '2025-07-28', since: '2023-03-12', obs: 'Preferência por navalha.' },
  { id: 'c002', name: 'Felipe Rocha',      phone: '84999990002', lastVisit: '2025-07-15', since: '2023-06-01', obs: '' },
  { id: 'c003', name: 'Gabriel Souza',     phone: '84999990003', lastVisit: '2025-06-30', since: '2022-11-20', obs: 'Alergia a produtos com álcool.' },
  { id: 'c004', name: 'Matheus Lima',      phone: '84999990004', lastVisit: '2025-07-20', since: '2024-01-05', obs: '' },
  { id: 'c005', name: 'Ricardo Ferreira',  phone: '84999990005', lastVisit: '2025-05-10', since: '2023-08-14', obs: 'No-show frequente — confirmar por WhatsApp.' },
  { id: 'c006', name: 'Bruno Carvalho',    phone: '84999990006', lastVisit: '2025-07-25', since: '2023-02-28', obs: '' },
  { id: 'c007', name: 'Diego Martins',     phone: '84999990007', lastVisit: '2025-04-18', since: '2022-09-09', obs: 'Cabelo comprido, prefere corte degradê.' },
  { id: 'c008', name: 'Thiago Oliveira',   phone: '84999990008', lastVisit: '2025-07-18', since: '2024-03-22', obs: '' },
  { id: 'c009', name: 'Cauã Ribeiro',      phone: '84999990009', lastVisit: '2025-07-22', since: '2024-05-10', obs: '' },
  { id: 'c010', name: 'Vinicius Alves',    phone: '84999990010', lastVisit: '2025-07-01', since: '2023-12-01', obs: '' },
  { id: 'c011', name: 'Leonardo Costa',    phone: '84999990011', lastVisit: '2025-03-05', since: '2022-07-30', obs: 'Ligar antes de confirmar.' },
  { id: 'c012', name: 'Samuel Pereira',    phone: '84999990012', lastVisit: '2025-07-10', since: '2024-02-14', obs: '' },
  { id: 'c013', name: 'Rafael Nascimento', phone: '84999990013', lastVisit: '2025-07-12', since: '2023-10-08', obs: '' },
  { id: 'c014', name: 'Igor Campos',       phone: '84999990014', lastVisit: '2025-06-20', since: '2024-06-01', obs: '' },
  { id: 'c015', name: 'Henrique Duarte',   phone: '84999990015', lastVisit: '2025-07-08', since: '2023-04-17', obs: '' },
  { id: 'c016', name: 'Gustavo Mendes',    phone: '84999990016', lastVisit: '2025-02-14', since: '2022-12-25', obs: 'Cliente antigo, desconto fidelidade.' },
  { id: 'c017', name: 'Pedro Linhares',    phone: '84999990017', lastVisit: '2025-07-05', since: '2024-07-03', obs: '' },
  { id: 'c018', name: 'Rodrigo Fonseca',   phone: '84999990018', lastVisit: '2025-07-27', since: '2023-09-19', obs: '' },
  { id: 'c019', name: 'André Santos',      phone: '84999990019', lastVisit: '2025-01-20', since: '2022-05-05', obs: '' },
  { id: 'c020', name: 'Carlos Eduardo',    phone: '84999990020', lastVisit: '2025-07-26', since: '2025-07-01', obs: 'Novo cliente, indicação do Rodrigo.' },
  { id: 'c021', name: 'Felipe Gomes',      phone: '84999990021', lastVisit: '2025-07-24', since: '2025-07-15', obs: '' },
  { id: 'c022', name: 'João Victor',       phone: '84999990022', lastVisit: '2025-07-23', since: '2025-06-20', obs: '' },
];


/* ─── 3. STATE ──────────────────────────────────────────── */
const STATE = {
  search:    '',
  page:      1,
  editingId: null,   // null = criando, string = editando
  deleteId:  null,
  viewId:    null,
};


/* ─── 4. UTILS ──────────────────────────────────────────── */
function getTodayDate() {
  return new Date();
}

function parseDateStr(str) {
  // 'YYYY-MM-DD' → Date (sem shift de fuso)
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(str) {
  if (!str) return '—';
  const d = parseDateStr(str);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateFull(str) {
  if (!str) return '—';
  const d = parseDateStr(str);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function isActive(lastVisit) {
  if (!lastVisit) return false;
  const d = parseDateStr(lastVisit);
  const diff = (getTodayDate() - d) / (1000 * 60 * 60 * 24);
  return diff <= CFG.activeWindowDays;
}

function isNewThisMonth(since) {
  if (!since) return false;
  const d = parseDateStr(since);
  const now = getTodayDate();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function getInitials(name) {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 6;
}

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return phone;
}

function generateId() {
  return 'c' + Date.now().toString(36);
}


/* ─── 5. FILTRO ─────────────────────────────────────────── */
function getFiltered() {
  const q = STATE.search.trim().toLowerCase();
  if (!q) return CLIENTS;
  return CLIENTS.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.replace(/\D/g,'').includes(q.replace(/\D/g,''))
  );
}


/* ─── 6. KPIs ───────────────────────────────────────────── */
function renderStats() {
  const total    = CLIENTS.length;
  const ativos   = CLIENTS.filter(c => isActive(c.lastVisit)).length;
  const novos    = CLIENTS.filter(c => isNewThisMonth(c.since)).length;
  const inativos = total - ativos;

  const el = document.getElementById('clientesStats');
  el.innerHTML = `
    <div class="stat-pill stat-pill--gold">
      <div class="stat-pill__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="6" r="3.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-pill__value">${total}</div>
      <div class="stat-pill__label">Total de clientes</div>
    </div>

    <div class="stat-pill stat-pill--green">
      <div class="stat-pill__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="6" r="3.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M11 3.5l1.5 1.5-2.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="stat-pill__value">${ativos}</div>
      <div class="stat-pill__label">Ativos (últimos 60 dias)</div>
    </div>

    <div class="stat-pill stat-pill--blue">
      <div class="stat-pill__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="6" r="3.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 2v1.5M11 3.5l-1 1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-pill__value">${novos}</div>
      <div class="stat-pill__label">Novos este mês</div>
    </div>

    <div class="stat-pill stat-pill--orange">
      <div class="stat-pill__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="6" r="3.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M11 5h2M12 4v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-pill__value">${inativos}</div>
      <div class="stat-pill__label">Inativos</div>
    </div>
  `;
}


/* ─── 7. TABELA ─────────────────────────────────────────── */
function renderTable() {
  const filtered  = getFiltered();
  const total     = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / CFG.perPage));

  // Garante que a página não ultrapasse o total
  if (STATE.page > totalPages) STATE.page = totalPages;

  const start  = (STATE.page - 1) * CFG.perPage;
  const paged  = filtered.slice(start, start + CFG.perPage);

  const tbody  = document.getElementById('clientesTableBody');
  const empty  = document.getElementById('tableEmpty');
  const count  = document.getElementById('clientesCount');

  count.textContent = total === 1
    ? '1 cliente'
    : `${total} clientes`;

  if (paged.length === 0) {
    tbody.innerHTML = '';
    empty.hidden = false;
  } else {
    empty.hidden = true;
    tbody.innerHTML = paged.map(c => {
      const active   = isActive(c.lastVisit);
      const colorIdx = avatarColor(c.name);
      return `
        <tr>
          <td>
            <div class="client-cell">
              <div class="client-avatar client-avatar--${colorIdx}">${getInitials(c.name)}</div>
              <span class="client-name">${c.name}</span>
            </div>
          </td>
          <td>${formatPhone(c.phone)}</td>
          <td>${formatDate(c.lastVisit)}</td>
          <td>
            <span class="status-badge status-badge--${active ? 'ativo' : 'inativo'}">
              ${active ? 'Ativo' : 'Inativo'}
            </span>
          </td>
          <td class="td-actions">
            <div class="row-actions">
              <button class="row-btn row-btn--view" data-action="view" data-id="${c.id}" title="Ver detalhes">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M6.5 4.5v4M4.5 6.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                Ver
              </button>
              <button class="row-btn row-btn--edit" data-action="edit" data-id="${c.id}" title="Editar cliente">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M8.5 2l2.5 2.5-6 6H2.5v-2.5l6-6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                </svg>
                Editar
              </button>
              <button class="row-btn row-btn--del" data-action="delete" data-id="${c.id}" title="Excluir cliente">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M2 3.5h9M4 3.5V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v1M5 5.5v4M8 5.5v4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPagination(total, totalPages);
}


/* ─── 8. PAGINAÇÃO ──────────────────────────────────────── */
function renderPagination(total, totalPages) {
  const el = document.getElementById('pagination');
  const start = (STATE.page - 1) * CFG.perPage + 1;
  const end   = Math.min(STATE.page * CFG.perPage, total);

  if (total === 0) { el.innerHTML = ''; return; }

  // Gera os números de página (janela de 5)
  const pages = [];
  const windowSize = 5;
  let pStart = Math.max(1, STATE.page - Math.floor(windowSize / 2));
  let pEnd   = Math.min(totalPages, pStart + windowSize - 1);
  if (pEnd - pStart < windowSize - 1) pStart = Math.max(1, pEnd - windowSize + 1);

  for (let i = pStart; i <= pEnd; i++) pages.push(i);

  el.innerHTML = `
    <span class="pagination__info">
      ${start}–${end} de ${total} clientes
    </span>
    <div class="pagination__pages">
      <button class="page-btn page-btn--arrow" data-page="${STATE.page - 1}"
        ${STATE.page === 1 ? 'disabled' : ''} aria-label="Página anterior">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      ${pages.map(p => `
        <button class="page-btn ${p === STATE.page ? 'page-btn--active' : ''}" data-page="${p}">${p}</button>
      `).join('')}
      <button class="page-btn page-btn--arrow" data-page="${STATE.page + 1}"
        ${STATE.page === totalPages ? 'disabled' : ''} aria-label="Próxima página">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;
}

function initPaginationClicks() {
  document.getElementById('pagination').addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    const page = Number(btn.dataset.page);
    const filtered  = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / CFG.perPage));
    if (page < 1 || page > totalPages) return;
    STATE.page = page;
    renderTable();
    document.getElementById('clientesTable')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}


/* ─── 9. BUSCA ──────────────────────────────────────────── */
function initSearch() {
  const input = document.getElementById('clienteSearch');
  input.addEventListener('input', () => {
    STATE.search = input.value;
    STATE.page   = 1;
    renderTable();
  });
}


/* ─── 10. TABELA CLIQUES ────────────────────────────────── */
function initTableClicks() {
  document.getElementById('clientesTableBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'view')   openDetailModal(id);
    if (action === 'edit')   openEditModal(id);
    if (action === 'delete') openDeleteModal(id);
  });
}


/* ─── 11. MODAL NOVO / EDITAR ───────────────────────────── */
function openNewModal() {
  STATE.editingId = null;
  document.getElementById('clienteModalTitle').textContent    = 'Novo Cliente';
  document.getElementById('clienteModalSubtitle').textContent = 'Preencha os dados do cliente';
  document.getElementById('cliNome').value         = '';
  document.getElementById('cliTel').value          = '';
  document.getElementById('cliAniversario').value  = '';
  document.getElementById('cliObs').value          = '';
  openModal('clienteModalOverlay');
  setTimeout(() => document.getElementById('cliNome').focus(), 80);
}

function openEditModal(id) {
  const client = CLIENTS.find(c => c.id === id);
  if (!client) return;
  STATE.editingId = id;
  document.getElementById('clienteModalTitle').textContent    = 'Editar Cliente';
  document.getElementById('clienteModalSubtitle').textContent = client.name;
  document.getElementById('cliNome').value         = client.name;
  document.getElementById('cliTel').value          = client.phone;
  document.getElementById('cliAniversario').value  = client.birthdate || '';
  document.getElementById('cliObs').value          = client.obs || '';
  openModal('clienteModalOverlay');
  setTimeout(() => document.getElementById('cliNome').focus(), 80);
}

function saveClient() {
  const name  = document.getElementById('cliNome').value.trim();
  const phone = document.getElementById('cliTel').value.trim();
  const obs   = document.getElementById('cliObs').value.trim();
  const birth = document.getElementById('cliAniversario').value;

  if (!name) { flashInput('cliNome'); return; }
  if (!phone) { flashInput('cliTel'); return; }

  if (STATE.editingId) {
    const idx = CLIENTS.findIndex(c => c.id === STATE.editingId);
    if (idx !== -1) {
      CLIENTS[idx] = { ...CLIENTS[idx], name, phone, obs, birthdate: birth };
      showToast('success', 'Cliente atualizado com sucesso!');
    }
  } else {
    CLIENTS.unshift({
      id:        generateId(),
      name,
      phone,
      obs,
      birthdate: birth,
      lastVisit: null,
      since:     new Date().toISOString().slice(0, 10),
    });
    showToast('success', 'Cliente cadastrado com sucesso!');
  }

  closeModal('clienteModalOverlay');
  renderStats();
  renderTable();
}

function flashInput(id) {
  const el = document.getElementById(id);
  el.focus();
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow   = '0 0 0 3px rgba(255,77,106,0.12)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1400);
}

function initClienteModal() {
  document.getElementById('openNewClientBtn')?.addEventListener('click', openNewModal);
  document.getElementById('topbarNewClientBtn')?.addEventListener('click', openNewModal);
  document.getElementById('clienteModalSave')?.addEventListener('click', saveClient);
  document.getElementById('clienteModalClose')?.addEventListener('click', () => closeModal('clienteModalOverlay'));
  document.getElementById('clienteModalCancel')?.addEventListener('click', () => closeModal('clienteModalOverlay'));
}


/* ─── 12. MODAL DETALHES ────────────────────────────────── */
function openDetailModal(id) {
  const c = CLIENTS.find(x => x.id === id);
  if (!c) return;
  STATE.viewId = id;

  const active    = isActive(c.lastVisit);
  const colorIdx  = avatarColor(c.name);
  const initials  = getInitials(c.name);

  document.getElementById('detailModalTitle').textContent    = c.name;
  document.getElementById('detailModalSubtitle').innerHTML   = `
    <span class="status-badge status-badge--${active ? 'ativo' : 'inativo'}" style="font-size:11px;">
      ${active ? 'Ativo' : 'Inativo'}
    </span>
  `;

  document.getElementById('detailModalBody').innerHTML = `
    <div class="detail-avatar-row">
      <div class="detail-avatar client-avatar--${colorIdx}">${initials}</div>
      <div>
        <div class="detail-name">${c.name}</div>
        <div class="detail-since">Cliente desde ${formatDateFull(c.since)}</div>
      </div>
    </div>

    <div class="detail-divider"></div>

    <div class="detail-grid">
      <div class="detail-field">
        <div class="detail-field__label">Telefone</div>
        <div class="detail-field__value">${formatPhone(c.phone)}</div>
      </div>
      <div class="detail-field">
        <div class="detail-field__label">Última visita</div>
        <div class="detail-field__value">${formatDate(c.lastVisit)}</div>
      </div>
      ${c.birthdate ? `
      <div class="detail-field">
        <div class="detail-field__label">Data de nascimento</div>
        <div class="detail-field__value">${formatDate(c.birthdate)}</div>
      </div>` : ''}
    </div>

    ${c.obs ? `
    <div class="detail-divider"></div>
    <div class="detail-field">
      <div class="detail-field__label">Observações</div>
      <div class="detail-obs">${c.obs}</div>
    </div>` : ''}
  `;

  // Configura botões do footer
  document.getElementById('detailWhatsApp').onclick = () => {
    const num = c.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${num}`, '_blank');
  };
  document.getElementById('detailEditBtn').onclick = () => {
    closeModal('detailModalOverlay');
    openEditModal(id);
  };

  openModal('detailModalOverlay');
}

function initDetailModal() {
  document.getElementById('detailModalClose')?.addEventListener('click',  () => closeModal('detailModalOverlay'));
  document.getElementById('detailModalClose2')?.addEventListener('click', () => closeModal('detailModalOverlay'));
}


/* ─── 13. MODAL EXCLUIR ─────────────────────────────────── */
function openDeleteModal(id) {
  const c = CLIENTS.find(x => x.id === id);
  if (!c) return;
  STATE.deleteId = id;
  document.getElementById('deleteClientName').textContent = c.name;
  openModal('deleteModalOverlay');
}

function confirmDelete() {
  if (!STATE.deleteId) return;
  CLIENTS = CLIENTS.filter(c => c.id !== STATE.deleteId);
  STATE.deleteId = null;
  closeModal('deleteModalOverlay');
  renderStats();
  renderTable();
  showToast('info', 'Cliente removido.');
}

function initDeleteModal() {
  document.getElementById('deleteModalClose')?.addEventListener('click',   () => closeModal('deleteModalOverlay'));
  document.getElementById('deleteModalCancel')?.addEventListener('click',  () => closeModal('deleteModalOverlay'));
  document.getElementById('deleteModalConfirm')?.addEventListener('click', confirmDelete);
}


/* ─── 14. HELPERS MODAIS ────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function initModalOverlayClose() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not([hidden])').forEach(m => closeModal(m.id));
    }
  });
}


/* ─── 15. TOAST ─────────────────────────────────────────── */
function showToast(type, message) {
  const container = document.getElementById('toastContainer');
  const icons = {
    success: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    error:   `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    info:    `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M6 5.5v3M6 4h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<div class="toast__icon">${icons[type] || icons.info}</div><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast--exit');
    setTimeout(() => toast.remove(), 240);
  }, 3200);
}


/* ─── 16. SIDEBAR ───────────────────────────────────────── */
function initSidebar() {
  const burger    = document.getElementById('burgerBtn');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const toggleBtn = document.getElementById('sidebarToggleBtn');

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

  // Desktop collapse/expand
  function collapseSidebar() {
    sidebar.classList.add('is-collapsed');
    sidebar.classList.remove('is-expanded');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    toggleBtn?.setAttribute('aria-label', 'Expandir menu');
    try { localStorage.setItem('sidebarCollapsed', '1'); } catch(e) {}
  }

  function expandSidebar() {
    sidebar.classList.remove('is-collapsed');
    sidebar.classList.add('is-expanded');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    toggleBtn?.setAttribute('aria-label', 'Recolher menu');
    try { localStorage.setItem('sidebarCollapsed', '0'); } catch(e) {}
  }

  toggleBtn?.addEventListener('click', () => {
    sidebar.classList.contains('is-collapsed') ? expandSidebar() : collapseSidebar();
  });

  // Restaura preferência salva
  try {
    if (localStorage.getItem('sidebarCollapsed') === '0') expandSidebar();
  } catch(e) {}
}


/* ─── 17. DATA DO HEADER ────────────────────────────────── */
function renderDate() {
  const el = document.getElementById('clientesDate');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}


/* ─── 18. BOOT ──────────────────────────────────────────── */
function boot() {
  renderDate();
  renderStats();
  renderTable();
  initSearch();
  initPaginationClicks();
  initTableClicks();
  initClienteModal();
  initDetailModal();
  initDeleteModal();
  initModalOverlayClose();
  initSidebar();

  console.log('[InBarber Clientes] Inicializado com sucesso.');
}

document.addEventListener('DOMContentLoaded', boot);