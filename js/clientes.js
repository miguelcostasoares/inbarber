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


/* ─── 2. CLIENTS ────────────────────────────────────────── */
// Populado via GET /api/clients no boot (loadClients)
let CLIENTS = [];


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
  // data-count guarda o valor final; count-up é aplicado em animateClientesStats()
  el.innerHTML = `
    <div class="stat-pill stat-pill--gold">
      <div class="stat-pill__icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="6" r="3.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="stat-pill__value" data-count="${total}">0</div>
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
      <div class="stat-pill__value" data-count="${ativos}">0</div>
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
      <div class="stat-pill__value" data-count="${novos}">0</div>
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
      <div class="stat-pill__value" data-count="${inativos}">0</div>
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

async function saveClient() {
  const name  = document.getElementById('cliNome').value.trim();
  const phone = document.getElementById('cliTel').value.trim();
  const obs   = document.getElementById('cliObs').value.trim();
  const birth = document.getElementById('cliAniversario').value;

  if (!name)  { flashInput('cliNome'); return; }
  if (!phone) { flashInput('cliTel');  return; }

  const btn = document.getElementById('clienteModalSave');
  btn.disabled = true;

  try {
    if (STATE.editingId === null) {
      // ── Criação ──────────────────────────────────────────────────
      const created = await InBarberAPI.createClient({
        name, phone, obs, birthdate: birth || null,
      });
      CLIENTS.unshift(created);
      showToast('success', 'Cliente cadastrado com sucesso!');
    } else {
      // ── Edição ───────────────────────────────────────────────────
      const updated = await InBarberAPI.updateClient(STATE.editingId, {
        name, phone, obs, birthdate: birth || null,
      });
      const idx = CLIENTS.findIndex(c => c.id === STATE.editingId);
      if (idx !== -1) CLIENTS[idx] = updated;
      showToast('success', 'Cliente atualizado com sucesso!');
    }

    closeModal('clienteModalOverlay');
    renderStats();
    renderTable();
  } catch (err) {
    showToast('error', err.message || 'Erro ao salvar cliente.');
  } finally {
    btn.disabled = false;
  }
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
async function openDetailModal(id) {
  STATE.viewId = id;
  let c = CLIENTS.find(x => x.id === id);
  if (!c) return;

  // Abre imediatamente com dados em memória; histórico começa em carregando
  renderDetailModal(c, null);
  openModal('detailModalOverlay');

  // Busca dados frescos e histórico em paralelo
  try {
    const [fresh, visitas] = await Promise.all([
      InBarberAPI.getClient(id),
      InBarberAPI.getClientVisitas(id).catch(() => []),
    ]);
    const idx = CLIENTS.findIndex(x => x.id === id);
    if (idx !== -1) CLIENTS[idx] = fresh;
    renderDetailModal(fresh, visitas);
  } catch (_) {
    // Falha silenciosa: dados em memória já estão visíveis
  }
}

function renderVisitasTimeline(visitas) {
  if (visitas === null) {
    return `
      <div class="detail-divider"></div>
      <div class="detail-field">
        <div class="detail-field__label">Histórico de visitas</div>
        <div class="detail-field__value" style="color:var(--text-muted);font-size:13px;">
          Carregando…
        </div>
      </div>`;
  }

  if (visitas.length === 0) {
    return `
      <div class="detail-divider"></div>
      <div class="detail-field">
        <div class="detail-field__label">Histórico de visitas</div>
        <div class="detail-field__value" style="color:var(--text-muted);font-size:13px;">
          Nenhuma visita registrada ainda.
        </div>
      </div>`;
  }

  const statusLabel = {
    'concluido':    'Concluído',
    'pendente':     'Pendente',
    'confirmado':   'Confirmado',
    'em-andamento': 'Em andamento',
    'no-show':      'No-show',
  };
  const statusClass = {
    'concluido':    'ativo',
    'pendente':     'inativo',
    'confirmado':   'ativo',
    'em-andamento': 'ativo',
    'no-show':      'inativo',
  };

  const items = visitas.map((v, i) => `
    <div class="visit-item${i === 0 ? ' visit-item--first' : ''}">
      <div class="visit-item__dot"></div>
      <div class="visit-item__content">
        <div class="visit-item__header">
          <span class="visit-item__date">${formatDate(v.data)}</span>
          <span class="status-badge status-badge--${statusClass[v.status] || 'inativo'}" style="font-size:10px;padding:2px 7px;">
            ${statusLabel[v.status] || v.status}
          </span>
        </div>
        <div class="visit-item__detail">
          ${v.servico ? `<span class="visit-item__service">${v.servico}</span>` : ''}
          ${v.barbeiro ? `<span class="visit-item__barber">com ${v.barbeiro}</span>` : ''}
          ${v.valorCobrado ? `<span class="visit-item__value">R$ ${Number(v.valorCobrado).toFixed(2).replace('.', ',')}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="detail-divider"></div>
    <div class="detail-field">
      <div class="detail-field__label">
        Histórico de visitas
        <span class="visit-count-badge">${visitas.length} ${visitas.length === 1 ? 'visita' : 'visitas'}</span>
      </div>
      <div class="visit-timeline">${items}</div>
    </div>`;
}

function renderDetailModal(c, visitas) {
  const active   = isActive(c.lastVisit);
  const colorIdx = avatarColor(c.name);
  const initials = getInitials(c.name);

  document.getElementById('detailModalTitle').textContent  = c.name;
  document.getElementById('detailModalSubtitle').innerHTML = `
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
      <div class="detail-field">
        <div class="detail-field__label">Total de visitas</div>
        <div class="detail-field__value">${c.totalVisits ?? 0}</div>
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

    ${renderVisitasTimeline(visitas)}
  `;

  document.getElementById('detailWhatsApp').onclick = () => {
    const num = c.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${num}`, '_blank');
  };
  document.getElementById('detailEditBtn').onclick = () => {
    closeModal('detailModalOverlay');
    openEditModal(c.id);
  };
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

async function confirmDelete() {
  if (!STATE.deleteId) return;

  const btn = document.getElementById('deleteModalConfirm');
  btn.disabled = true;

  try {
    await InBarberAPI.deleteClient(STATE.deleteId);
    CLIENTS = CLIENTS.filter(c => c.id !== STATE.deleteId);
    STATE.deleteId = null;
    closeModal('deleteModalOverlay');
    renderStats();
    renderTable();
    showToast('info', 'Cliente removido.');
  } catch (err) {
    showToast('error', err.message || 'Erro ao remover cliente.');
  } finally {
    btn.disabled = false;
  }
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


/* ═══════════════════════════════════════════════════════════
   ANIMAÇÕES DE ENTRADA — Clientes
   Replicando o padrão do Dashboard:
     • animateCounter       → contagem de 0 até o valor (ease-out cubic)
     • animateClientesStats → dispara count-up nos stat-pills
     • initScrollReveal     → fade-in + translateY nos cards/pills/tabela
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
 * Lê o data-count de cada stat-pill__value e dispara o count-up.
 * Delay escalonado para coincidir com o stagger do scroll-reveal.
 */
function animateClientesStats() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const pills = document.querySelectorAll('#clientesStats .stat-pill__value[data-count]');
  pills.forEach((el, i) => {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    el.textContent = '0';
    setTimeout(() => animateCounter(el, 0, target, 900), 150 + i * 60);
  });
}

/**
 * Scroll-reveal para stat-pills e bloco da tabela —
 * fade-in + translateY, com stagger de 40ms (máx 300ms).
 */
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll(
    '#clientesStats .stat-pill, .clientes-table-wrap, .clientes-pagination'
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


/* ─── 18. BOOT ──────────────────────────────────────────── */

/**
 * Carrega os clientes do back-end e popula a tela.
 * Exibe skeleton/mensagem de erro em caso de falha.
 */
async function loadClients() {
  const tbody = document.getElementById('clientesTableBody');
  const empty = document.getElementById('tableEmpty');

  // Feedback visual enquanto carrega
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">
        Carregando clientes…
      </td>
    </tr>
  `;
  empty.hidden = true;

  try {
    CLIENTS = await InBarberAPI.listClients();
  } catch (err) {
    CLIENTS = [];
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:2rem; color:var(--red);">
          ${err.message || 'Erro ao carregar clientes. Tente recarregar a página.'}
        </td>
      </tr>
    `;
    return;
  }

  renderStats();
  renderTable();
  animateClientesStats();
  initScrollReveal();
}

async function boot() {
  renderDate();
  initSearch();
  initPaginationClicks();
  initTableClicks();
  initClienteModal();
  initDetailModal();
  initDeleteModal();
  initModalOverlayClose();
  initSidebar();

  await loadClients();

  console.log('[InBarber Clientes] Inicializado com sucesso.');
}

document.addEventListener('DOMContentLoaded', boot);