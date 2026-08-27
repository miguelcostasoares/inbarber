/* ═══════════════════════════════════════════════════════════
   InBarber — API Layer
   Intermediário entre os JS de tela (agenda-crm.js, etc.)
   e o back-end Flask (app.py).

   Convenção de retorno de todas as funções:
     Sucesso -> resolve com o payload já em JSON (objeto/array)
     Erro    -> reject com um Error, sempre com .status e .data
                (quando o back-end mandou um corpo de erro em JSON)

   Nenhuma função aqui manipula o DOM nem conhece STATE/APPOINTMENTS
   do agenda-crm.js — ela só fala com o back-end e devolve dados.
═══════════════════════════════════════════════════════════ */

'use strict';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

/* ─── 1. HELPER INTERNO DE REQUEST ──────────────────────────
   Centraliza fetch + parse + tratamento de erro para todas as
   chamadas. Não é exportado — as funções de domínio abaixo que
   compõem a API pública deste arquivo.
──────────────────────────────────────────────────────────── */
async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkErr) {
    // Erro de rede: back-end fora do ar, sem conexão, CORS, etc.
    const err = new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
    err.status = 0;
    err.data = null;
    err.cause = networkErr;
    throw err;
  }

  // Tenta ler o corpo como JSON independente do status,
  // porque tanto sucesso quanto erro vêm em JSON.
  let body = null;
  const hasBody = response.status !== 204;
  if (hasBody) {
    try {
      body = await response.json();
    } catch (parseErr) {
      // Corpo vazio/não-JSON em resposta de erro (ex. erro 500 cru do Flask)
      body = null;
    }
  }

  if (!response.ok) {
    const message = body?.error || body?.message || `Erro ${response.status} ao comunicar com o servidor.`;
    const err = new Error(message);
    err.status = response.status;
    err.data = body;
    throw err;
  }

  return body;
}

function buildQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

/* ─── 2. AGENDAMENTOS ───────────────────────────────────────
   Espelham 1:1 as rotas que serão criadas no app.py.
──────────────────────────────────────────────────────────── */

/**
 * Lista agendamentos, com filtros opcionais.
 * Mapeia diretamente os filtros hoje aplicados em memória pelo
 * agenda-crm.js (STATE.filterBarber, filterService, filterSearch,
 * listDate, listStatus).
 *
 * @param {Object} [filters]
 * @param {string} [filters.date]      - Data no formato YYYY-MM-DD
 * @param {string} [filters.barberId]  - id do barbeiro
 * @param {string} [filters.serviceId] - id do serviço
 * @param {string} [filters.status]    - 'pendente'|'confirmado'|'em-andamento'|'concluido'|'no-show'
 * @param {string} [filters.search]    - busca por nome do cliente
 * @returns {Promise<Array>} lista de agendamentos
 */
function listAppointments(filters = {}) {
  const qs = buildQueryString({
    date: filters.date,
    barberId: filters.barberId,
    serviceId: filters.serviceId,
    status: filters.status,
    search: filters.search,
  });
  return apiRequest(`/appointments${qs}`, { method: 'GET' });
}

/**
 * Busca um agendamento específico por id.
 * @param {string} id
 * @returns {Promise<Object>} agendamento
 */
function getAppointment(id) {
  return apiRequest(`/appointments/${encodeURIComponent(id)}`, { method: 'GET' });
}

/**
 * Cria um novo agendamento.
 * Formato de entrada segue o mesmo shape usado hoje em getFormData()
 * no agenda-crm.js (client, phone, date, time, serviceId, barberId, notes).
 *
 * @param {Object} data
 * @param {string} data.client
 * @param {string} [data.phone]
 * @param {string} data.date
 * @param {string} data.time
 * @param {string} data.serviceId
 * @param {string} data.barberId
 * @param {string} [data.notes]
 * @returns {Promise<Object>} agendamento criado
 */
function createAppointment(data) {
  return apiRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Atualiza um agendamento existente (edição a partir do modal).
 * Aceita atualização parcial — envie apenas os campos alterados.
 *
 * @param {string} id
 * @param {Object} data - mesmos campos de createAppointment, todos opcionais
 * @returns {Promise<Object>} agendamento atualizado
 */
function updateAppointment(id, data) {
  return apiRequest(`/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Deleta um agendamento (comportamento hoje em deleteAppt():
 * remoção definitiva, não mudança de status).
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
function deleteAppointment(id) {
  return apiRequest(`/appointments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ─── 3. SERVIÇOS ───────────────────────────────────────────
   GET    /api/services         → apenas ativos (agenda)
   GET    /api/services?all=1  → todos (admin/configurações)
   POST   /api/services         → criar
   PATCH  /api/services/:id     → editar
   PATCH  /api/services/:id/status → ativar/desativar
──────────────────────────────────────────────────────────── */

/**
 * Lista serviços ativos (para selects da Agenda).
 * @returns {Promise<Array>} lista de serviços ativos
 */
function listServices() {
  return apiRequest('/services', { method: 'GET' });
}

/**
 * Lista TODOS os serviços, incluindo inativos (tela de Configurações).
 * @returns {Promise<Array>} lista completa de serviços
 */
function listServicesAdmin() {
  return apiRequest('/services?all=1', { method: 'GET' });
}

/**
 * Cria um novo serviço.
 * @param {Object} data
 * @param {string} data.nome
 * @param {number} data.duracao_min
 * @param {number} data.preco
 * @param {boolean} [data.ativo]
 * @returns {Promise<Object>} serviço criado
 */
function createService(data) {
  return apiRequest('/services', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Atualiza um serviço existente.
 * @param {string} id
 * @param {Object} data - { nome?, duracao_min?, preco?, ativo? }
 * @returns {Promise<Object>} serviço atualizado
 */
function updateService(id, data) {
  return apiRequest(`/services/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Ativa ou desativa um serviço.
 * @param {string} id
 * @param {boolean} ativo
 * @returns {Promise<Object>} serviço atualizado
 */
function toggleServiceStatus(id, ativo) {
  return apiRequest(`/services/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo }),
  });
}

/* ─── 4. BARBEIROS ──────────────────────────────────────────
   GET /api/barbers
   Retorna todos os barbeiros ativos.
──────────────────────────────────────────────────────────── */

/**
 * Lista barbeiros.
 * @param {Object} [options]
 * @param {boolean} [options.includeInactive] - se true, retorna ativos e inativos
 * @returns {Promise<Array>} lista de barbeiros
 */
function listBarbers(options = {}) {
  const qs = options.includeInactive ? '?includeInactive=1' : '';
  return apiRequest(`/barbers${qs}`, { method: 'GET' });
}

/**
 * Cria um novo barbeiro.
 * @param {Object} data
 * @param {string} data.nome
 * @param {string} [data.telefone]
 * @param {boolean} [data.ativo]
 * @returns {Promise<Object>} barbeiro criado
 */
function createBarber(data) {
  return apiRequest('/barbers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Atualiza os dados de um barbeiro.
 * @param {string} id
 * @param {Object} data
 * @param {string} [data.nome]
 * @param {string} [data.telefone]
 * @param {boolean} [data.ativo]
 * @returns {Promise<Object>} barbeiro atualizado
 */
function updateBarber(id, data) {
  return apiRequest(`/barbers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Ativa ou desativa um barbeiro.
 * @param {string} id
 * @param {boolean} ativo
 * @returns {Promise<Object>} barbeiro atualizado
 */
function toggleBarberStatus(id, ativo) {
  return apiRequest(`/barbers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo }),
  });
}

/* ─── 5. CLIENTES ───────────────────────────────────────────
   GET  /api/clients              → listagem completa (tela Clientes)
   GET  /api/clients?search=termo → autocomplete (Agenda)
   GET  /api/clients/:id          → detalhe
   PATCH /api/clients/:id         → edição
   DELETE /api/clients/:id        → exclusão (soft-delete no back)
──────────────────────────────────────────────────────────── */

/**
 * Busca clientes pelo nome (autocomplete — Agenda).
 * @param {string} search - Trecho do nome a buscar (mínimo 2 chars)
 * @returns {Promise<Array>} lista de clientes { id, name, phone }
 */
function searchClients(search) {
  const qs = buildQueryString({ search });
  return apiRequest(`/clients${qs}`, { method: 'GET' });
}

/**
 * Lista todos os clientes ativos (tela Clientes).
 * @returns {Promise<Array>} lista completa de clientes
 */
function listClients() {
  return apiRequest('/clients', { method: 'GET' });
}

/**
 * Busca um cliente específico por id.
 * @param {string} id
 * @returns {Promise<Object>} cliente
 */
function getClient(id) {
  return apiRequest(`/clients/${encodeURIComponent(id)}`, { method: 'GET' });
}

/**
 * Atualiza os dados de um cliente.
 * Aceita atualização parcial — envie apenas os campos alterados.
 *
 * @param {string} id
 * @param {Object} data
 * @param {string} [data.name]
 * @param {string} [data.phone]
 * @param {string} [data.birthdate] - formato YYYY-MM-DD
 * @param {string} [data.obs]
 * @returns {Promise<Object>} cliente atualizado
 */
function updateClient(id, data) {
  return apiRequest(`/clients/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Remove um cliente (soft-delete no back-end).
 * @param {string} id
 * @returns {Promise<void>}
 */
function deleteClient(id) {
  return apiRequest(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* ─── 6. PRODUTOS E RESERVAS ─────────────────────────────────
   Espelho exato da camada mock de js/produtos-data.js. Enquanto
   os endpoints não existirem em app.py, ProdutosData corre em
   MODO='mock'; ao ligar o back-end basta trocar essa constante.

   Endpoints esperados:
     GET    /api/products                      ?disponivel=true
     GET    /api/products/:id
     PATCH  /api/products/:id                 (CRM: promoção, destaque, stock)
     POST   /api/product-reservations
     GET    /api/product-reservations          ?estado=reservado
     GET    /api/product-reservations/:id
     POST   /api/product-reservations/:id/confirm
     POST   /api/product-reservations/:id/release
──────────────────────────────────────────────────────────── */

/**
 * Lista o catálogo de produtos da loja.
 * @param {Object} [filters] - { disponivel, categoria }
 * @returns {Promise<Array>} produtos com stock, reservado e disponivel
 */
function listProducts(filters = {}) {
  return apiRequest(`/products${buildQueryString(filters)}`);
}

/**
 * Detalhe de um produto.
 * @param {string} id
 * @returns {Promise<Object>}
 */
function getProduct(id) {
  return apiRequest(`/products/${encodeURIComponent(id)}`);
}

/**
 * Atualiza os campos de um produto que o CRM gere.
 * Enviar precoPromo: null tira o produto de promoção.
 * @param {string} id
 * @param {Object} data - { ativo, destaque, precoPromo, preco, stock }
 * @returns {Promise<Object>} produto atualizado
 */
function updateProduct(id, data) {
  return apiRequest(`/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Cria uma reserva de produtos (estado inicial: 'reservado').
 * O back-end é que trava o stock — o front nunca decide sozinho.
 * @param {Object} data - { clienteNome, clienteTel, observacoes,
 *                          agendamentoId, itens: [{ produtoId, quantidade }] }
 * @returns {Promise<Object>} reserva criada, já com numero e total
 */
function createProductReservation(data) {
  return apiRequest('/product-reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Lista reservas de produtos.
 * @param {Object} [filters] - { estado: 'reservado'|'confirmado'|'libertado' }
 * @returns {Promise<Array>}
 */
function listProductReservations(filters = {}) {
  return apiRequest(`/product-reservations${buildQueryString(filters)}`);
}

/**
 * Detalhe de uma reserva (aceita id interno ou número #RES-000).
 * @param {string} id
 * @returns {Promise<Object>}
 */
function getProductReservation(id) {
  return apiRequest(`/product-reservations/${encodeURIComponent(id)}`);
}

/**
 * Barbeiro entregou: 'reservado' → 'confirmado' (venda efetivada).
 * @param {string} id
 * @returns {Promise<Object>} reserva atualizada
 */
function confirmProductReservation(id) {
  return apiRequest(`/product-reservations/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
  });
}

/**
 * No-show ou cancelamento: 'reservado' → 'libertado' (stock volta).
 * @param {string} id
 * @returns {Promise<Object>} reserva atualizada
 */
function releaseProductReservation(id) {
  return apiRequest(`/product-reservations/${encodeURIComponent(id)}/release`, {
    method: 'POST',
  });
}

/* ─── 7. EXPORT ──────────────────────────────────────────────
   Sem bundler no projeto ainda (front é HTML + <script> direto),
   então expõe tudo em um namespace único no escopo global,
   evitando colidir com funções soltas do agenda-crm.js.
──────────────────────────────────────────────────────────── */
/* ─── 8. PREFERÊNCIAS ────────────────────────────────────
   GET   /api/preferences  → buscar configurações atuais
   PUT   /api/preferences  → salvar configurações
──────────────────────────────────────────────────────────── */

/**
 * Busca as preferências da barbearia (horários e almoço).
 * @returns {Promise<Object>} { horarios, almoco }
 */
function getPreferences() {
  return apiRequest('/preferences', { method: 'GET' });
}

/**
 * Salva as preferências da barbearia.
 * @param {Object} data
 * @param {Object} data.horarios - { seg, ter, … dom: { aberto, abertura, fechamento } }
 * @param {Object} data.almoco   - { ativo, inicio, fim }
 * @returns {Promise<Object>} preferências salvas
 */
function savePreferences(data) {
  return apiRequest('/preferences', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

window.InBarberAPI = {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listServices,
  listServicesAdmin,
  createService,
  updateService,
  toggleServiceStatus,
  listBarbers,
  createBarber,
  updateBarber,
  toggleBarberStatus,
  searchClients,
  listClients,
  getClient,
  updateClient,
  deleteClient,
  listProducts,
  getProduct,
  updateProduct,
  createProductReservation,
  listProductReservations,
  getProductReservation,
  confirmProductReservation,
  releaseProductReservation,
  getPreferences,
  savePreferences,
};