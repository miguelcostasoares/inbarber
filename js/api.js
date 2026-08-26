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

const API_BASE_URL = '/api';

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

/* ─── 3. EXPORT ──────────────────────────────────────────────
   Sem bundler no projeto ainda (front é HTML + <script> direto),
   então expõe tudo em um namespace único no escopo global,
   evitando colidir com funções soltas do agenda-crm.js.
──────────────────────────────────────────────────────────── */
window.InBarberAPI = {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};