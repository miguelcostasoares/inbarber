"use strict";

/* ═══════════════════════════════════════════════════════════
       InBarber — Configurações JS
       Ordem: Config → State → Utils → Sidebar → Date
            → Storage → Form → Preview → Dirty → Boot
    ═══════════════════════════════════════════════════════════ */

/* ─── 1. CONFIG ─────────────────────────────────────────── */
const STORAGE_KEY = "inbarber:barbearia:v1";

/* ─── EQUIPE: CONFIG ────────────────────────────────────── */
const EQUIPE_STATE = {
  barbeiros: [],
  loading: false,
};

/* ─── SERVIÇOS: CONFIG ──────────────────────────────────── */
const SERVICOS_STATE = {
  servicos: [],
  loading: false,
};

/* ─── PRODUTOS: CONFIG ──────────────────────────────────── */
const PRODUTOS_STATE = {
  produtos: [],
  loading: false,
  categoria: "todos",
  busca: "",
};

const PRODUTO_CATEGORIAS = [
  { id: "todos", label: "Todas as categorias" },
  { id: "pomadas", label: "Pomadas" },
  { id: "cabelo", label: "Cabelo" },
  { id: "barba", label: "Barba" },
  { id: "acessorios", label: "Acessórios" },
];

// Disponível <= isto aparece marcado como stock crítico na tabela.
const PRODUTO_STOCK_BAIXO = 5;

/* Onde os produtos moram.
   Se a página carregar js/produtos-data.js, usa a camada de dados
   (que traz o plano B do mock quando o Flask está em baixo); caso
   contrário fala direto com a API, que já está carregada aqui. */
const PRODUTOS_FONTE = {
  listar() {
    return window.ProdutosData
      ? window.ProdutosData.listarTodos()
      : window.InBarberAPI.listProducts();
  },
  atualizar(id, dados) {
    return window.ProdutosData
      ? window.ProdutosData.atualizar(id, dados)
      : window.InBarberAPI.updateProduct(id, dados);
  },
};

const DEFAULTS = {
  nome: "",
  telefone: "",
  endereco: "",
};

/* ─── 2. STATE ──────────────────────────────────────────── */
const STATE = {
  saved: { ...DEFAULTS }, // último estado salvo
  current: { ...DEFAULTS }, // estado dos inputs agora
  dirty: false, // há alterações não salvas?
};

/* ─── 3. UTILS ──────────────────────────────────────────── */
function showToast(type, message) {
  const container = document.getElementById("toastContainer");

  const icons = {
    success: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8"
                      stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>`,
    error: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8"
                      stroke-linecap="round"/>
                  </svg>`,
    info: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M6 5.5v3M6 4h.01" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round"/>
                  </svg>`,
  };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
        <div class="toast__icon">${icons[type] || icons.info}</div>
        <span>${message}</span>
      `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast--exit");
    setTimeout(() => toast.remove(), 240);
  }, 3200);
}

function flashInputError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("is-error");
  el.focus();
  setTimeout(() => el.classList.remove("is-error"), 1400);
}

function formatPhoneInput(value) {
  // Formata enquanto digita: (XX) XXXXX-XXXX
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return value;
}

/* ─── EQUIPE: UTILS ─────────────────────────────────────── */
function initialsFrom(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/* ─── EQUIPE: RENDER ─────────────────────────────────────── */
function renderEquipe() {
  const loading = document.getElementById("equipeLoading");
  const empty = document.getElementById("equipeEmpty");
  const table = document.getElementById("equipeTable");
  const tbody = document.getElementById("equipeTableBody");

  if (EQUIPE_STATE.loading) {
    loading.hidden = false;
    empty.hidden = true;
    table.hidden = true;
    return;
  }

  loading.hidden = true;

  if (!EQUIPE_STATE.barbeiros.length) {
    empty.hidden = false;
    table.hidden = true;
    return;
  }

  empty.hidden = true;
  table.hidden = false;

  tbody.innerHTML = "";

  EQUIPE_STATE.barbeiros.forEach((b) => {
    const ativo = !!b.ativo;
    const initials = initialsFrom(b.nome || b.name || "?");
    const nome = b.nome || b.name || "—";
    const telefone = b.telefone || b.phone || "—";

    const tr = document.createElement("tr");
    tr.className =
      "equipe-table__tr" + (ativo ? "" : " equipe-table__tr--inativo");
    tr.dataset.id = b.id;

    tr.innerHTML = `
      <td class="equipe-table__td">
        <div class="equipe-cell-nome">
          <div class="equipe-avatar">${initials}</div>
          <span class="equipe-nome-text">${escapeHtml(nome)}</span>
        </div>
      </td>
      <td class="equipe-table__td">${escapeHtml(telefone)}</td>
      <td class="equipe-table__td">
        <span class="badge-status ${ativo ? "badge-status--ativo" : "badge-status--inativo"}">
          ${ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td class="equipe-table__td equipe-table__td--actions">
        <div class="equipe-actions">
          <button
            class="btn-icon"
            data-action="visualizar"
            data-id="${b.id}"
            type="button"
            aria-label="Visualizar ${escapeHtml(nome)}"
            title="Visualizar"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path
                d="M1 7.5C1 7.5 3.5 2.5 7.5 2.5S14 7.5 14 7.5s-2.5 5-6.5 5S1 7.5 1 7.5z"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
              <circle
                cx="7.5"
                cy="7.5"
                r="2"
                stroke="currentColor"
                stroke-width="1.4"
              />
            </svg>
          </button>
          <button
            class="btn-icon"
            data-action="editar"
            data-id="${b.id}"
            type="button"
            aria-label="Editar ${escapeHtml(nome)}"
            title="Editar"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path
                d="M10.5 1.5l3 3L5 13H2v-3L10.5 1.5z"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="toggle-switch ${ativo ? "toggle-switch--on" : ""}"
            data-action="toggle"
            data-id="${b.id}"
            data-ativo="${ativo ? "1" : "0"}"
            type="button"
            role="switch"
            aria-checked="${ativo ? "true" : "false"}"
            aria-label="${ativo ? "Desativar" : "Ativar"} ${escapeHtml(nome)}"
          >
            <span class="toggle-switch__track" aria-hidden="true">
              <span class="toggle-switch__thumb"></span>
            </span>
            <span class="toggle-switch__label">${ativo ? "Ativo" : "Inativo"}</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ─── EQUIPE: LOAD ───────────────────────────────────────── */
async function loadEquipe() {
  EQUIPE_STATE.loading = true;
  renderEquipe();

  try {
    const lista = await window.InBarberAPI.listBarbers({
      includeInactive: true,
    });
    EQUIPE_STATE.barbeiros = lista;
  } catch (err) {
    showToast("error", "Não foi possível carregar a equipe.");
    EQUIPE_STATE.barbeiros = [];
  } finally {
    EQUIPE_STATE.loading = false;
    renderEquipe();
  }
}

/* ─── EQUIPE: MODAL ──────────────────────────────────────── */
function openBarbeiroModal(barbeiro = null) {
  const overlay = document.getElementById("barbeiroModalOverlay");
  const title = document.getElementById("barbeiroModalTitle");
  const idInput = document.getElementById("barbeiroModalId");
  const nomeInput = document.getElementById("barbeiroModalNome");
  const telInput = document.getElementById("barbeiroModalTelefone");
  const emailInput = document.getElementById("barbeiroModalEmail");
  const statusSel = document.getElementById("barbeiroModalStatus");
  const nascInput = document.getElementById("barbeiroModalNascimento");
  const endInput = document.getElementById("barbeiroModalEndereco");

  if (barbeiro) {
    title.textContent = "Editar Barbeiro";
    idInput.value = barbeiro.id;
    nomeInput.value = barbeiro.nome || barbeiro.name || "";
    telInput.value = barbeiro.telefone || barbeiro.phone || "";
    emailInput.value = barbeiro.email || "";
    statusSel.value = barbeiro.ativo ? "1" : "0";
    nascInput.value = barbeiro.data_nascimento || "";
    endInput.value = barbeiro.endereco || "";
  } else {
    title.textContent = "Novo Barbeiro";
    idInput.value = "";
    nomeInput.value = "";
    telInput.value = "";
    emailInput.value = "";
    statusSel.value = "1";
    nascInput.value = "";
    endInput.value = "";
  }

  overlay.hidden = false;
  nomeInput.focus();
}

function closeBarbeiroModal() {
  document.getElementById("barbeiroModalOverlay").hidden = true;
}

/* ─── EQUIPE: MODAL VISUALIZAR ───────────────────────────── */
function openBarbeiroView(barbeiro) {
  const overlay = document.getElementById("barbeiroViewOverlay");
  const title = document.getElementById("barbeiroViewTitle");
  const avatar = document.getElementById("barbeiroViewAvatar");
  const nome = document.getElementById("barbeiroViewNome");
  const badge = document.getElementById("barbeiroViewBadge");
  const telefone = document.getElementById("barbeiroViewTelefone");
  const email = document.getElementById("barbeiroViewEmail");
  const nascimento = document.getElementById("barbeiroViewNascimento");
  const endereco = document.getElementById("barbeiroViewEndereco");
  const btnEditar = document.getElementById("barbeiroViewEditar");

  const nomeStr = barbeiro.nome || barbeiro.name || "—";
  const ativo = !!barbeiro.ativo;

  title.textContent = nomeStr;
  avatar.textContent = initialsFrom(nomeStr);
  nome.textContent = nomeStr;

  badge.innerHTML = `<span class="badge-status ${ativo ? "badge-status--ativo" : "badge-status--inativo"}">${ativo ? "Ativo" : "Inativo"}</span>`;

  telefone.textContent = barbeiro.telefone || barbeiro.phone || "—";
  email.textContent = barbeiro.email || "—";

  if (barbeiro.data_nascimento) {
    const [ano, mes, dia] = barbeiro.data_nascimento.split("-");
    nascimento.textContent = `${dia}/${mes}/${ano}`;
  } else {
    nascimento.textContent = "—";
  }

  endereco.textContent = barbeiro.endereco || "—";

  btnEditar.dataset.id = barbeiro.id;

  overlay.hidden = false;
}

function closeBarbeiroView() {
  document.getElementById("barbeiroViewOverlay").hidden = true;
}

async function handleSalvarBarbeiro() {
  const id = document.getElementById("barbeiroModalId").value;
  const nome = document.getElementById("barbeiroModalNome").value.trim();
  const tel = document.getElementById("barbeiroModalTelefone").value.trim();
  const email = document.getElementById("barbeiroModalEmail").value.trim();
  const ativo = document.getElementById("barbeiroModalStatus").value === "1";
  const nascimento = document.getElementById("barbeiroModalNascimento").value;
  const endereco = document.getElementById("barbeiroModalEndereco").value.trim();

  if (!nome) {
    flashInputError("barbeiroModalNome");
    showToast("error", "O nome do barbeiro é obrigatório.");
    return;
  }

  if (!tel) {
    flashInputError("barbeiroModalTelefone");
    showToast("error", "O telefone do barbeiro é obrigatório.");
    return;
  }

  if (!email) {
    flashInputError("barbeiroModalEmail");
    showToast("error", "O e-mail do barbeiro é obrigatório.");
    return;
  }

  const btnSalvar = document.getElementById("barbeiroModalSalvar");
  btnSalvar.disabled = true;

  const payload = {
    nome,
    telefone: tel,
    email,
    ativo,
    data_nascimento: nascimento || null,
    endereco: endereco || null,
  };

  try {
    if (id) {
      await window.InBarberAPI.updateBarber(id, payload);
      showToast("success", "Barbeiro atualizado com sucesso!");
    } else {
      await window.InBarberAPI.createBarber(payload);
      showToast("success", "Barbeiro criado com sucesso!");
    }
    closeBarbeiroModal();
    await loadEquipe();
  } catch (err) {
    showToast("error", err.message || "Erro ao salvar barbeiro.");
  } finally {
    btnSalvar.disabled = false;
  }
}

async function handleToggleBarbeiro(id, ativoAtual) {
  const novoStatus = !ativoAtual;
  try {
    await window.InBarberAPI.toggleBarberStatus(id, novoStatus);
    showToast(
      "success",
      novoStatus ? "Barbeiro ativado." : "Barbeiro desativado.",
    );
    await loadEquipe();
  } catch (err) {
    showToast("error", err.message || "Erro ao alterar status.");
  }
}

/* ─── EQUIPE: EVENT LISTENERS ───────────────────────────── */
function initEquipeListeners() {
  // Botão novo (header)
  document
    .getElementById("btnNovoBarbeiro")
    ?.addEventListener("click", () => openBarbeiroModal(null));

  // Botão novo (estado vazio)
  document
    .getElementById("btnNovoBarbeiroEmpty")
    ?.addEventListener("click", () => openBarbeiroModal(null));

  // Fechar modal de edição
  document
    .getElementById("barbeiroModalClose")
    ?.addEventListener("click", closeBarbeiroModal);

  document
    .getElementById("barbeiroModalCancelar")
    ?.addEventListener("click", closeBarbeiroModal);

  // Fechar ao clicar fora do modal de edição
  document
    .getElementById("barbeiroModalOverlay")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeBarbeiroModal();
    });

  // Fechar modal de visualização
  document
    .getElementById("barbeiroViewClose")
    ?.addEventListener("click", closeBarbeiroView);

  document
    .getElementById("barbeiroViewFechar")
    ?.addEventListener("click", closeBarbeiroView);

  // Fechar ao clicar fora do modal de visualização
  document
    .getElementById("barbeiroViewOverlay")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeBarbeiroView();
    });

  // Botão "Editar" dentro do modal de visualização
  document
    .getElementById("barbeiroViewEditar")
    ?.addEventListener("click", () => {
      const id = document.getElementById("barbeiroViewEditar").dataset.id;
      const barbeiro = EQUIPE_STATE.barbeiros.find((b) => b.id === id);
      if (barbeiro) {
        closeBarbeiroView();
        openBarbeiroModal(barbeiro);
      }
    });

  // Fechar com Escape (ambos os modais)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!document.getElementById("barbeiroModalOverlay")?.hidden) {
        closeBarbeiroModal();
      }
      if (!document.getElementById("barbeiroViewOverlay")?.hidden) {
        closeBarbeiroView();
      }
    }
  });

  // Salvar modal de edição
  document
    .getElementById("barbeiroModalSalvar")
    ?.addEventListener("click", handleSalvarBarbeiro);

  // Máscara de telefone no modal
  document
    .getElementById("barbeiroModalTelefone")
    ?.addEventListener("input", (e) => {
      const prev = e.target.value;
      const formatted = formatPhoneInput(prev);
      if (formatted !== prev) {
        const cursor = e.target.selectionStart;
        const diff = formatted.length - prev.length;
        e.target.value = formatted;
        try {
          e.target.setSelectionRange(cursor + diff, cursor + diff);
        } catch (_) {}
      }
    });

  // Delegação de eventos na tabela (visualizar / editar / toggle)
  document.getElementById("equipeTableBody")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "visualizar") {
      const barbeiro = EQUIPE_STATE.barbeiros.find((b) => b.id === id);
      if (barbeiro) openBarbeiroView(barbeiro);
    }

    if (action === "editar") {
      const barbeiro = EQUIPE_STATE.barbeiros.find((b) => b.id === id);
      if (barbeiro) openBarbeiroModal(barbeiro);
    }

    if (action === "toggle") {
      const ativoAtual = btn.dataset.ativo === "1";
      handleToggleBarbeiro(id, ativoAtual);
    }
  });
}

/* ─── SERVIÇOS: RENDER ───────────────────────────────────── */
function formatarPreco(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarDuracao(min) {
  const m = parseInt(min, 10);
  if (!m) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}min` : `${h}h`;
}

function formatarValidadePlano(dias) {
  const d = parseInt(dias, 10);
  if (!d) return "—";
  if (d === 1) return "1 dia";
  if (d < 30) return `${d} dias`;
  if (d === 30) return "1 mês";
  if (d < 365) {
    const meses = Math.floor(d / 30);
    return meses === 1 ? "1 mês" : `${meses} meses`;
  }
  if (d === 365) return "1 ano";
  const anos = Math.floor(d / 365);
  return anos === 1 ? "1 ano" : `${anos} anos`;
}

function renderServicos() {
  const loading = document.getElementById("servicosLoading");
  const empty = document.getElementById("servicosEmpty");
  const table = document.getElementById("servicosTable");
  const tbody = document.getElementById("servicosTableBody");

  if (SERVICOS_STATE.loading) {
    loading.hidden = false;
    empty.hidden = true;
    table.hidden = true;
    return;
  }

  loading.hidden = true;

  if (!SERVICOS_STATE.servicos.length) {
    empty.hidden = false;
    table.hidden = true;
    return;
  }

  empty.hidden = true;
  table.hidden = false;

  tbody.innerHTML = "";

  SERVICOS_STATE.servicos.forEach((s) => {
    const ativo = !!s.ativo;
    const nome = s.name || s.nome || "—";
    const tipo = s.tipo || "padrao";

    const TIPO_LABELS = { padrao: "Padrão", combo: "Combo", plano: "Plano" };
    const tipoLabel = TIPO_LABELS[tipo] || "Padrão";

    const tr = document.createElement("tr");
    tr.className =
      "equipe-table__tr" + (ativo ? "" : " equipe-table__tr--inativo");
    tr.dataset.id = s.id;

    tr.innerHTML = `
      <td class="equipe-table__td">
        <span class="equipe-nome-text">${escapeHtml(nome)}</span>
      </td>
      <td class="equipe-table__td">
        <span class="badge-tipo badge-tipo--${escapeHtml(tipo)}">${escapeHtml(tipoLabel)}</span>
      </td>
      <td class="equipe-table__td">${
        tipo === "plano" 
          ? formatarValidadePlano(s.plano_validade_dias)
          : escapeHtml(formatarDuracao(s.duration ?? s.duracao_min))
      }</td>
      <td class="equipe-table__td">${escapeHtml(formatarPreco(s.price ?? s.preco ?? 0))}</td>
      <td class="equipe-table__td">
        <span class="badge-status ${ativo ? "badge-status--ativo" : "badge-status--inativo"}">
          ${ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td class="equipe-table__td equipe-table__td--actions">
        <div class="equipe-actions">
          <button
            class="btn-table"
            data-action="editar-servico"
            data-id="${s.id}"
            type="button"
            aria-label="Editar ${escapeHtml(nome)}"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5z" stroke="currentColor" stroke-width="1.4"
                stroke-linejoin="round"/>
            </svg>
            Editar
          </button>
          <button
            class="toggle-switch ${ativo ? "toggle-switch--on" : ""}"
            data-action="toggle-servico"
            data-id="${s.id}"
            data-ativo="${ativo ? "1" : "0"}"
            type="button"
            role="switch"
            aria-checked="${ativo ? "true" : "false"}"
            aria-label="${ativo ? "Desativar" : "Ativar"} ${escapeHtml(nome)}"
          >
            <span class="toggle-switch__track" aria-hidden="true">
              <span class="toggle-switch__thumb"></span>
            </span>
            <span class="toggle-switch__label">${ativo ? "Ativo" : "Inativo"}</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ─── SERVIÇOS: LOAD ─────────────────────────────────────── */
async function loadServicos() {
  SERVICOS_STATE.loading = true;
  renderServicos();

  try {
    const lista = await window.InBarberAPI.listServicesAdmin();
    SERVICOS_STATE.servicos = lista;
  } catch (err) {
    showToast("error", "Não foi possível carregar os serviços.");
    SERVICOS_STATE.servicos = [];
  } finally {
    SERVICOS_STATE.loading = false;
    renderServicos();
  }
}

/* ─── SERVIÇOS: MODAL ────────────────────────────────────── */

/* Estado interno do modal de serviço */
const SERVICO_MODAL_STATE = {
  tipo: "padrao",
  comboItens: [],   // [{ id, nome, duracao_min, preco }]
  planoItens: [],   // [{ id, nome, duracao_min, preco }]
};

function servicoModalSetTipo(tipo) {
  SERVICO_MODAL_STATE.tipo = tipo;
  document.getElementById("servicoModalTipo").value = tipo;

  // Atualiza botões do seletor
  document.querySelectorAll(".servico-tipo-btn").forEach((btn) => {
    btn.classList.toggle("servico-tipo-btn--active", btn.dataset.tipo === tipo);
  });

  // Mostra/esconde blocos de campos
  document.getElementById("servicoCamposPadrao").hidden = tipo !== "padrao";
  document.getElementById("servicoCamposCombo").hidden = tipo !== "combo";
  document.getElementById("servicoCamposPlano").hidden = tipo !== "plano";

  // Ajusta placeholder do nome
  const nomePlaceholders = {
    padrao: "Ex: Corte de Cabelo",
    combo: "Ex: Corte + Barba",
    plano: "Ex: Plano Mensal",
  };
  document.getElementById("servicoModalNome").placeholder =
    nomePlaceholders[tipo] || "Nome";

  // Ajusta label do preço
  const precoLabels = {
    padrao: "Preço (R$)",
    combo: "Preço do Combo (R$)",
    plano: "Preço do Plano (R$)",
  };
  document.getElementById("servicoModalPrecoLabel").textContent =
    precoLabels[tipo] || "Preço (R$)";
}

/* ── Pills: renderiza a lista de serviços selecionados ── */
function renderPills(containerId, addBtnId, itens, onRemove) {
  const container = document.getElementById(containerId);
  const addBtn = document.getElementById(addBtnId);
  if (!container || !addBtn) return;

  // Remove todas as pills existentes (mantém só o botão +)
  container.querySelectorAll(".servico-pill").forEach((el) => el.remove());

  // Insere pills antes do botão +
  itens.forEach((item, idx) => {
    const pill = document.createElement("div");
    pill.className = "servico-pill";
    pill.innerHTML = `
      <div class="servico-pill__info">
        <span class="servico-pill__nome">${escapeHtml(item.nome)}</span>
        <span class="servico-pill__meta">${formatarDuracao(item.duracao_min)} · ${formatarPreco(item.preco)}</span>
      </div>
      <button class="servico-pill__remove" type="button" aria-label="Remover ${escapeHtml(item.nome)}">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
    `;
    pill.querySelector(".servico-pill__remove").addEventListener("click", () => {
      onRemove(idx);
    });
    container.insertBefore(pill, addBtn);
  });
}

/* ── Recalcula duração total do combo ── */
function recalcularDuracaoCombo() {
  const total = SERVICO_MODAL_STATE.comboItens.reduce(
    (acc, item) => acc + (parseInt(item.duracao_min, 10) || 0),
    0,
  );
  const input = document.getElementById("servicoModalDuracaoCombo");
  if (input) input.value = total || "";
}

/* ── Abre o dropdown de seleção de serviços ── */
function abrirDropdownServicos(dropdownId, listId, itensAtivos, onSelect) {
  const dropdown = document.getElementById(dropdownId);
  const list = document.getElementById(listId);
  if (!dropdown || !list) return;

  const servicosPadrao = SERVICOS_STATE.servicos.filter(
    (s) => (!s.tipo || s.tipo === "padrao") && s.ativo,
  );

  list.innerHTML = "";

  if (!servicosPadrao.length) {
    list.innerHTML = `<p style="padding:12px 14px;font-size:13px;color:var(--muted)">Nenhum serviço padrão cadastrado.</p>`;
  } else {
    servicosPadrao.forEach((s) => {
      const jaAdicionado = itensAtivos.some((i) => i.id === s.id);
      const btn = document.createElement("button");
      btn.className =
        "servico-dropdown__item" +
        (jaAdicionado ? " servico-dropdown__item--disabled" : "");
      btn.type = "button";
      btn.disabled = jaAdicionado;
      btn.innerHTML = `
        <span class="servico-dropdown__nome">${escapeHtml(s.name || s.nome)}</span>
        <span class="servico-dropdown__meta">${formatarDuracao(s.duration ?? s.duracao_min)} · ${formatarPreco(s.price ?? s.preco ?? 0)}</span>
      `;
      btn.addEventListener("click", () => {
        onSelect({
          id: s.id,
          nome: s.name || s.nome,
          duracao_min: s.duration ?? s.duracao_min ?? 0,
          preco: s.price ?? s.preco ?? 0,
        });
        dropdown.hidden = true;
      });
      list.appendChild(btn);
    });
  }

  dropdown.hidden = false;
}

function openServicoModal(servico = null) {
  const overlay = document.getElementById("servicoModalOverlay");
  const title = document.getElementById("servicoModalTitle");
  const idInput = document.getElementById("servicoModalId");
  const nomeInput = document.getElementById("servicoModalNome");
  const precoInput = document.getElementById("servicoModalPreco");
  const statusSel = document.getElementById("servicoModalStatus");

  // Reseta itens
  SERVICO_MODAL_STATE.comboItens = [];
  SERVICO_MODAL_STATE.planoItens = [];

  if (servico) {
    title.textContent = "Editar Serviço";
    idInput.value = servico.id;
    nomeInput.value = servico.name || servico.nome || "";
    precoInput.value = servico.price ?? servico.preco ?? "";
    statusSel.value = servico.ativo ? "1" : "0";

    const tipo = servico.tipo || "padrao";
    servicoModalSetTipo(tipo);

    if (tipo === "padrao") {
      document.getElementById("servicoModalDuracao").value =
        servico.duration ?? servico.duracao_min ?? "";
    }

    if (tipo === "combo") {
      SERVICO_MODAL_STATE.comboItens = (servico.itens || []).map((i) => ({
        id: i.item_id || i.id,
        nome: i.nome || i.name || "",
        duracao_min: i.duracao_min || 0,
        preco: i.preco || 0,
      }));
      renderPills(
        "comboPillsContainer",
        "comboPillAdd",
        SERVICO_MODAL_STATE.comboItens,
        (idx) => {
          SERVICO_MODAL_STATE.comboItens.splice(idx, 1);
          renderPills(
            "comboPillsContainer",
            "comboPillAdd",
            SERVICO_MODAL_STATE.comboItens,
            arguments.callee,
          );
          recalcularDuracaoCombo();
        },
      );
      document.getElementById("servicoModalDuracaoCombo").value =
        servico.duration ?? servico.duracao_min ?? "";
    }

    if (tipo === "plano") {
      SERVICO_MODAL_STATE.planoItens = (servico.itens || []).map((i) => ({
        id: i.item_id || i.id,
        nome: i.nome || i.name || "",
        duracao_min: i.duracao_min || 0,
        preco: i.preco || 0,
      }));
      renderPills(
        "planoPillsContainer",
        "planoPillAdd",
        SERVICO_MODAL_STATE.planoItens,
        (idx) => {
          SERVICO_MODAL_STATE.planoItens.splice(idx, 1);
          renderPills(
            "planoPillsContainer",
            "planoPillAdd",
            SERVICO_MODAL_STATE.planoItens,
            arguments.callee,
          );
        },
      );
      document.getElementById("servicoModalPlanoCobranca").value =
        servico.plano_cobranca || "mensal";
      document.getElementById("servicoModalPlanoUsos").value =
        servico.plano_usos ?? "";
      document.getElementById("servicoModalPlanoValidade").value =
        servico.plano_validade_dias ?? "";
    }
  } else {
    title.textContent = "Novo Serviço";
    idInput.value = "";
    nomeInput.value = "";
    precoInput.value = "";
    statusSel.value = "1";
    document.getElementById("servicoModalDuracao").value = "";
    document.getElementById("servicoModalDuracaoCombo").value = "";
    document.getElementById("servicoModalPlanoCobranca").value = "mensal";
    document.getElementById("servicoModalPlanoUsos").value = "";
    document.getElementById("servicoModalPlanoValidade").value = "";

    servicoModalSetTipo("padrao");

    renderPills("comboPillsContainer", "comboPillAdd", [], () => {});
    renderPills("planoPillsContainer", "planoPillAdd", [], () => {});
  }

  // Fecha dropdown aberto (se houver)
  document.getElementById("comboDropdown").hidden = true;
  document.getElementById("planoDropdown").hidden = true;

  overlay.hidden = false;
  nomeInput.focus();
}

function closeServicoModal() {
  document.getElementById("servicoModalOverlay").hidden = true;
  document.getElementById("comboDropdown").hidden = true;
  document.getElementById("planoDropdown").hidden = true;
}

async function handleSalvarServico() {
  const id = document.getElementById("servicoModalId").value;
  const tipo = document.getElementById("servicoModalTipo").value || "padrao";
  const nome = document.getElementById("servicoModalNome").value.trim();
  const preco = parseFloat(document.getElementById("servicoModalPreco").value);
  const ativo = document.getElementById("servicoModalStatus").value === "1";

  if (!nome) {
    flashInputError("servicoModalNome");
    showToast("error", "O nome do serviço é obrigatório.");
    return;
  }

  if (isNaN(preco) || preco < 0) {
    flashInputError("servicoModalPreco");
    showToast("error", "Informe um preço válido.");
    return;
  }

  const payload = { nome, preco, ativo, tipo };

  if (tipo === "padrao") {
    const duracao = parseInt(
      document.getElementById("servicoModalDuracao").value,
      10,
    );
    if (!duracao || duracao < 1) {
      flashInputError("servicoModalDuracao");
      showToast("error", "Informe uma duração válida em minutos.");
      return;
    }
    payload.duracao_min = duracao;
  }

  if (tipo === "combo") {
    if (!SERVICO_MODAL_STATE.comboItens.length) {
      showToast("error", "Adicione pelo menos um serviço ao combo.");
      return;
    }
    const duracaoCombo = parseInt(
      document.getElementById("servicoModalDuracaoCombo").value,
      10,
    );
    if (!duracaoCombo || duracaoCombo < 1) {
      flashInputError("servicoModalDuracaoCombo");
      showToast("error", "Informe uma duração total válida.");
      return;
    }
    payload.duracao_min = duracaoCombo;
    payload.itens = SERVICO_MODAL_STATE.comboItens.map((i) => i.id);
  }

  if (tipo === "plano") {
    if (!SERVICO_MODAL_STATE.planoItens.length) {
      showToast("error", "Adicione pelo menos um serviço ao plano.");
      return;
    }
    const cobranca = document.getElementById(
      "servicoModalPlanoCobranca",
    ).value;
    const usos = parseInt(
      document.getElementById("servicoModalPlanoUsos").value,
      10,
    );
    const validade = parseInt(
      document.getElementById("servicoModalPlanoValidade").value,
      10,
    );
    if (!usos || usos < 1) {
      flashInputError("servicoModalPlanoUsos");
      showToast("error", "Informe a quantidade de usos do plano.");
      return;
    }
    if (!validade || validade < 1) {
      flashInputError("servicoModalPlanoValidade");
      showToast("error", "Informe a validade do plano em dias.");
      return;
    }
    payload.plano_cobranca = cobranca;
    payload.plano_usos = usos;
    payload.plano_validade_dias = validade;
    payload.itens = SERVICO_MODAL_STATE.planoItens.map((i) => i.id);
  }

  const btnSalvar = document.getElementById("servicoModalSalvar");
  btnSalvar.disabled = true;

  try {
    if (id) {
      await window.InBarberAPI.updateService(id, payload);
      showToast("success", "Serviço atualizado com sucesso!");
    } else {
      await window.InBarberAPI.createService(payload);
      showToast("success", "Serviço criado com sucesso!");
    }
    closeServicoModal();
    await loadServicos();
  } catch (err) {
    showToast("error", err.message || "Erro ao salvar serviço.");
  } finally {
    btnSalvar.disabled = false;
  }
}

async function handleToggleServico(id, ativoAtual) {
  const novoStatus = !ativoAtual;
  try {
    await window.InBarberAPI.toggleServiceStatus(id, novoStatus);
    showToast(
      "success",
      novoStatus ? "Serviço ativado." : "Serviço desativado.",
    );
    await loadServicos();
  } catch (err) {
    showToast("error", err.message || "Erro ao alterar status.");
  }
}

/* ─── SERVIÇOS: EVENT LISTENERS ─────────────────────────── */
function initServicosListeners() {
  document
    .getElementById("btnNovoServico")
    ?.addEventListener("click", () => openServicoModal(null));

  document
    .getElementById("btnNovoServicoEmpty")
    ?.addEventListener("click", () => openServicoModal(null));

  document
    .getElementById("servicoModalClose")
    ?.addEventListener("click", closeServicoModal);

  document
    .getElementById("servicoModalCancelar")
    ?.addEventListener("click", closeServicoModal);

  document
    .getElementById("servicoModalOverlay")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeServicoModal();
    });

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !document.getElementById("servicoModalOverlay")?.hidden
    ) {
      closeServicoModal();
    }
  });

  document
    .getElementById("servicoModalSalvar")
    ?.addEventListener("click", handleSalvarServico);

  // Seletor de tipo (Padrão / Combo / Plano)
  document
    .getElementById("servicoModalOverlay")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest(".servico-tipo-btn");
      if (btn) servicoModalSetTipo(btn.dataset.tipo);
    });

  // Botão + do combo: abre dropdown
  document.getElementById("comboPillAdd")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdownVisible = !document.getElementById("comboDropdown").hidden;
    if (dropdownVisible) {
      document.getElementById("comboDropdown").hidden = true;
      return;
    }
    abrirDropdownServicos(
      "comboDropdown",
      "comboDropdownList",
      SERVICO_MODAL_STATE.comboItens,
      (item) => {
        SERVICO_MODAL_STATE.comboItens.push(item);
        renderPills(
          "comboPillsContainer",
          "comboPillAdd",
          SERVICO_MODAL_STATE.comboItens,
          (idx) => {
            SERVICO_MODAL_STATE.comboItens.splice(idx, 1);
            renderPills(
              "comboPillsContainer",
              "comboPillAdd",
              SERVICO_MODAL_STATE.comboItens,
              () => {},
            );
            recalcularDuracaoCombo();
          },
        );
        recalcularDuracaoCombo();
      },
    );
  });

  // Botão + do plano: abre dropdown
  document.getElementById("planoPillAdd")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdownVisible = !document.getElementById("planoDropdown").hidden;
    if (dropdownVisible) {
      document.getElementById("planoDropdown").hidden = true;
      return;
    }
    abrirDropdownServicos(
      "planoDropdown",
      "planoDropdownList",
      SERVICO_MODAL_STATE.planoItens,
      (item) => {
        SERVICO_MODAL_STATE.planoItens.push(item);
        renderPills(
          "planoPillsContainer",
          "planoPillAdd",
          SERVICO_MODAL_STATE.planoItens,
          (idx) => {
            SERVICO_MODAL_STATE.planoItens.splice(idx, 1);
            renderPills(
              "planoPillsContainer",
              "planoPillAdd",
              SERVICO_MODAL_STATE.planoItens,
              () => {},
            );
          },
        );
      },
    );
  });

  // Fecha dropdowns ao clicar fora
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#comboPillsContainer") &&
        !e.target.closest("#comboDropdown")) {
      document.getElementById("comboDropdown").hidden = true;
    }
    if (!e.target.closest("#planoPillsContainer") &&
        !e.target.closest("#planoDropdown")) {
      document.getElementById("planoDropdown").hidden = true;
    }
  });

  document
    .getElementById("servicosTableBody")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "editar-servico") {
        const servico = SERVICOS_STATE.servicos.find((s) => s.id === id);
        if (servico) openServicoModal(servico);
      }

      if (action === "toggle-servico") {
        const ativoAtual = btn.dataset.ativo === "1";
        handleToggleServico(id, ativoAtual);
      }
    });
}

/* ═══════════════════════════════════════════════════════════
   PRODUTOS — tab de catálogo
   Back-end: GET /api/products e PATCH /api/products/:id.

   Não há POST de produtos: o catálogo nasce do schema_produtos.sql,
   por isso aqui só se edita o que já existe (preço, promoção,
   stock, destaque e visibilidade na loja). É de propósito que não
   há botão "Novo Produto".
═══════════════════════════════════════════════════════════ */

/* ─── PRODUTOS: UTILS ───────────────────────────────────── */

/** Nível do stock disponível: ok | baixo | rutura */
function nivelStockProduto(p) {
  if (!p.disponivel) return "rutura";
  return p.disponivel <= PRODUTO_STOCK_BAIXO ? "baixo" : "ok";
}

const CORES_STOCK = {
  ok: "inherit",
  baixo: "var(--orange, #ff9c40)",
  rutura: "var(--red, #ff4d6a)",
};

/** Aplica os filtros da barra (categoria + busca) sobre o catálogo. */
function produtosFiltrados() {
  const termo = PRODUTOS_STATE.busca.trim().toLowerCase();

  return PRODUTOS_STATE.produtos.filter((p) => {
    if (
      PRODUTOS_STATE.categoria !== "todos" &&
      p.categoria !== PRODUTOS_STATE.categoria
    ) {
      return false;
    }
    if (!termo) return true;
    return (
      (p.nome || "").toLowerCase().includes(termo) ||
      (p.id || "").toLowerCase().includes(termo)
    );
  });
}

/* ─── PRODUTOS: RENDER ──────────────────────────────────── */
function renderProdutos() {
  const loading = document.getElementById("produtosLoading");
  const empty = document.getElementById("produtosEmpty");
  const table = document.getElementById("produtosTable");
  const tbody = document.getElementById("produtosTableBody");

  if (!tbody) return;

  if (PRODUTOS_STATE.loading) {
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    if (table) table.hidden = true;
    return;
  }

  if (loading) loading.hidden = true;

  const lista = produtosFiltrados();

  if (!lista.length) {
    if (empty) {
      empty.hidden = false;
      // Distingue "catálogo vazio" de "filtro sem resultados".
      const msg = empty.querySelector("[data-empty-msg]");
      if (msg) {
        msg.textContent = PRODUTOS_STATE.produtos.length
          ? "Nenhum produto com estes filtros."
          : "Nenhum produto no catálogo.";
      }
    }
    if (table) table.hidden = true;
    return;
  }

  if (empty) empty.hidden = true;
  if (table) table.hidden = false;

  tbody.innerHTML = "";

  lista.forEach((p) => {
    const ativo = !!p.ativo;
    const nome = p.nome || "—";
    const nivel = nivelStockProduto(p);
    const img = p.img || `assets/produtos/${p.id}.jpg`;

    const tr = document.createElement("tr");
    tr.className =
      "equipe-table__tr" + (ativo ? "" : " equipe-table__tr--inativo");
    tr.dataset.id = p.id;

    tr.innerHTML = `
      <td class="equipe-table__td">
        <div class="equipe-cell-nome">
          <div class="equipe-avatar">
            <img
              src="${escapeHtml(img)}"
              alt=""
              loading="lazy"
              onerror="this.remove()"
              style="width:100%;height:100%;object-fit:cover;border-radius:inherit"
            />
          </div>
          <span>
            <span class="equipe-nome-text">${escapeHtml(nome)}</span>
            <span style="display:block;font-size:11px;opacity:.6">
              ${escapeHtml(p.categoria || "—")} · ${escapeHtml(p.id)}${p.destaque ? " · ★ destaque" : ""}
            </span>
          </span>
        </div>
      </td>

      <td class="equipe-table__td">
        <span class="equipe-nome-text">${escapeHtml(formatarPreco(p.precoFinal ?? p.preco ?? 0))}</span>
        ${
          p.emPromocao
            ? `<span style="display:block;font-size:11px;opacity:.6">
                 <s>${escapeHtml(formatarPreco(p.preco))}</s>
                 <span style="color:var(--green, #00d68f);font-weight:600">−${p.descontoPct}%</span>
               </span>`
            : ""
        }
      </td>

      <td class="equipe-table__td">
        <span style="font-weight:600;color:${CORES_STOCK[nivel]}">${p.disponivel}</span>
        <span style="opacity:.6">/${p.stock}</span>
        <span style="display:block;font-size:11px;opacity:.6">
          ${p.reservado ? `${p.reservado} reservada${p.reservado === 1 ? "" : "s"}` : "nada reservado"}
        </span>
      </td>

      <td class="equipe-table__td">
        <span class="badge-status ${ativo ? "badge-status--ativo" : "badge-status--inativo"}">
          ${ativo ? "Ativo" : "Inativo"}
        </span>
      </td>

      <td class="equipe-table__td equipe-table__td--actions">
        <div class="equipe-actions">
          <button
            class="btn-table"
            data-action="stock-produto"
            data-delta="-1"
            data-id="${p.id}"
            type="button"
            aria-label="Reduzir stock de ${escapeHtml(nome)}"
            ${p.stock <= p.reservado ? "disabled" : ""}
          >−</button>
          <button
            class="btn-table"
            data-action="stock-produto"
            data-delta="1"
            data-id="${p.id}"
            type="button"
            aria-label="Aumentar stock de ${escapeHtml(nome)}"
          >+</button>
          <button
            class="btn-table"
            data-action="editar-produto"
            data-id="${p.id}"
            type="button"
            aria-label="Editar ${escapeHtml(nome)}"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M8.5 1.5l2 2L4 10H2V8L8.5 1.5z" stroke="currentColor" stroke-width="1.4"
                stroke-linejoin="round"/>
            </svg>
            Editar
          </button>
          <button
            class="toggle-switch ${ativo ? "toggle-switch--on" : ""}"
            data-action="toggle-produto"
            data-id="${p.id}"
            data-ativo="${ativo ? "1" : "0"}"
            type="button"
            role="switch"
            aria-checked="${ativo ? "true" : "false"}"
            aria-label="${ativo ? "Ocultar" : "Mostrar"} ${escapeHtml(nome)} na loja"
          >
            <span class="toggle-switch__track" aria-hidden="true">
              <span class="toggle-switch__thumb"></span>
            </span>
            <span class="toggle-switch__label">${ativo ? "Na loja" : "Oculto"}</span>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ─── PRODUTOS: LOAD ────────────────────────────────────── */
async function loadProdutos() {
  PRODUTOS_STATE.loading = true;
  renderProdutos();

  try {
    PRODUTOS_STATE.produtos = await PRODUTOS_FONTE.listar();
  } catch (err) {
    // Plano B: se js/produtos-data.js estiver carregado, mostra o mock
    // em vez de uma tabela vazia — e diz que são dados de demonstração.
    const mock = window.ProdutosData && window.ProdutosData._mock;
    if (mock) {
      try {
        PRODUTOS_STATE.produtos = await mock.listarTodos();
        showToast(
          "info",
          "Servidor indisponível — a mostrar produtos de demonstração.",
        );
      } catch (_) {
        PRODUTOS_STATE.produtos = [];
        showToast("error", "Não foi possível carregar os produtos.");
      }
    } else {
      PRODUTOS_STATE.produtos = [];
      showToast("error", "Não foi possível carregar os produtos.");
    }
  } finally {
    PRODUTOS_STATE.loading = false;
    renderProdutos();
  }
}

/* ─── PRODUTOS: MODAL ───────────────────────────────────── */
function openProdutoModal(produto) {
  if (!produto) return;

  const overlay = document.getElementById("produtoModalOverlay");
  if (!overlay) return;

  document.getElementById("produtoModalTitle").textContent = "Editar Produto";
  document.getElementById("produtoModalId").value = produto.id;
  document.getElementById("produtoModalNome").value = produto.nome || "";
  document.getElementById("produtoModalDescricao").value =
    produto.descricao || "";
  document.getElementById("produtoModalPreco").value = Number(
    produto.preco ?? 0,
  ).toFixed(2);
  document.getElementById("produtoModalPromo").value =
    produto.precoPromo != null ? Number(produto.precoPromo).toFixed(2) : "";
  document.getElementById("produtoModalStock").value = produto.stock ?? 0;
  document.getElementById("produtoModalDestaque").value = produto.destaque
    ? "1"
    : "0";
  document.getElementById("produtoModalStatus").value = produto.ativo
    ? "1"
    : "0";

  // O stock não pode descer abaixo do que já está reservado — o
  // servidor recusa com 409, e aqui o utilizador vê isso antes.
  const hint = document.getElementById("produtoModalStockHint");
  if (hint) {
    hint.textContent = produto.reservado
      ? `${produto.reservado} unidade(s) reservada(s) — o stock não pode ficar abaixo disso.`
      : "Nada reservado neste momento.";
  }

  const categoriaSel = document.getElementById("produtoModalCategoria");
  if (categoriaSel) {
    categoriaSel.innerHTML = PRODUTO_CATEGORIAS.filter((c) => c.id !== "todos")
      .map(
        (c) =>
          `<option value="${c.id}"${c.id === produto.categoria ? " selected" : ""}>${c.label}</option>`,
      )
      .join("");
  }

  overlay.hidden = false;
  document.getElementById("produtoModalNome").focus();
}

function closeProdutoModal() {
  const overlay = document.getElementById("produtoModalOverlay");
  if (overlay) overlay.hidden = true;
}

async function handleSalvarProduto() {
  const id = document.getElementById("produtoModalId").value;
  const nome = document.getElementById("produtoModalNome").value.trim();
  const desc = document.getElementById("produtoModalDescricao").value.trim();
  const preco = parseFloat(document.getElementById("produtoModalPreco").value);
  const promoRaw = document.getElementById("produtoModalPromo").value.trim();
  const stock = parseInt(
    document.getElementById("produtoModalStock").value,
    10,
  );
  const destaque =
    document.getElementById("produtoModalDestaque").value === "1";
  const ativo = document.getElementById("produtoModalStatus").value === "1";
  const categoria = document.getElementById("produtoModalCategoria").value;

  const promo = promoRaw === "" ? null : parseFloat(promoRaw);
  const atual = PRODUTOS_STATE.produtos.find((p) => p.id === id);

  if (!nome) {
    flashInputError("produtoModalNome");
    showToast("error", "O nome do produto é obrigatório.");
    return;
  }

  if (isNaN(preco) || preco < 0) {
    flashInputError("produtoModalPreco");
    showToast("error", "Informe um preço de tabela válido.");
    return;
  }

  if (promo !== null && (isNaN(promo) || promo <= 0)) {
    flashInputError("produtoModalPromo");
    showToast(
      "error",
      "Informe um preço promocional válido ou deixe o campo vazio.",
    );
    return;
  }

  if (promo !== null && promo >= preco) {
    flashInputError("produtoModalPromo");
    showToast("error", "A promoção tem de ser menor que o preço de tabela.");
    return;
  }

  if (isNaN(stock) || stock < 0) {
    flashInputError("produtoModalStock");
    showToast("error", "Informe um stock válido.");
    return;
  }

  if (atual && stock < atual.reservado) {
    flashInputError("produtoModalStock");
    showToast(
      "error",
      `Já há ${atual.reservado} unidade(s) reservada(s): o stock não pode ficar abaixo disso.`,
    );
    return;
  }

  const btnSalvar = document.getElementById("produtoModalSalvar");
  btnSalvar.disabled = true;

  try {
    await PRODUTOS_FONTE.atualizar(id, {
      nome,
      descricao: desc,
      preco,
      precoPromo: promo,
      stock,
      categoria,
      destaque,
      ativo,
    });
    showToast("success", "Produto atualizado com sucesso!");
    closeProdutoModal();
    await loadProdutos();
  } catch (err) {
    showToast("error", err.message || "Erro ao salvar produto.");
  } finally {
    btnSalvar.disabled = false;
  }
}

async function handleToggleProduto(id, ativoAtual) {
  const novoStatus = !ativoAtual;
  try {
    await PRODUTOS_FONTE.atualizar(id, { ativo: novoStatus });
    showToast(
      "success",
      novoStatus ? "Produto visível na loja." : "Produto oculto na loja.",
    );
    await loadProdutos();
  } catch (err) {
    showToast("error", err.message || "Erro ao alterar status.");
  }
}

/** Ajuste rápido de stock a partir da tabela (+1 / −1). */
async function handleStockProduto(id, delta) {
  const produto = PRODUTOS_STATE.produtos.find((p) => p.id === id);
  if (!produto) return;

  const novo = produto.stock + delta;
  if (novo < 0) return;

  if (novo < produto.reservado) {
    showToast(
      "error",
      `Já há ${produto.reservado} unidade(s) reservada(s): o stock não pode ficar abaixo disso.`,
    );
    return;
  }

  try {
    const atualizado = await PRODUTOS_FONTE.atualizar(id, { stock: novo });
    // Troca só a linha mexida, para a tabela não piscar toda.
    PRODUTOS_STATE.produtos = PRODUTOS_STATE.produtos.map((p) =>
      p.id === id ? atualizado : p,
    );
    renderProdutos();
  } catch (err) {
    showToast("error", err.message || "Erro ao atualizar o stock.");
  }
}

/* ─── PRODUTOS: EVENT LISTENERS ─────────────────────────── */
function initProdutosListeners() {
  // Recarregar
  document
    .getElementById("btnRecarregarProdutos")
    ?.addEventListener("click", () => loadProdutos());

  // Filtro por categoria
  const filtro = document.getElementById("produtosFiltroCategoria");
  if (filtro) {
    filtro.innerHTML = PRODUTO_CATEGORIAS.map(
      (c) => `<option value="${c.id}">${c.label}</option>`,
    ).join("");

    filtro.addEventListener("change", (e) => {
      PRODUTOS_STATE.categoria = e.target.value;
      renderProdutos();
    });
  }

  // Busca por nome
  let buscaTimer;
  document.getElementById("produtosBusca")?.addEventListener("input", (e) => {
    const valor = e.target.value;
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(() => {
      PRODUTOS_STATE.busca = valor;
      renderProdutos();
    }, 180);
  });

  // Modal
  document
    .getElementById("produtoModalClose")
    ?.addEventListener("click", closeProdutoModal);

  document
    .getElementById("produtoModalCancelar")
    ?.addEventListener("click", closeProdutoModal);

  document
    .getElementById("produtoModalOverlay")
    ?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) closeProdutoModal();
    });

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !document.getElementById("produtoModalOverlay")?.hidden
    ) {
      closeProdutoModal();
    }
  });

  document
    .getElementById("produtoModalSalvar")
    ?.addEventListener("click", handleSalvarProduto);

  // Delegação de eventos na tabela
  document
    .getElementById("produtosTableBody")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "editar-produto") {
        const produto = PRODUTOS_STATE.produtos.find((p) => p.id === id);
        if (produto) openProdutoModal(produto);
      }

      if (action === "toggle-produto") {
        const ativoAtual = btn.dataset.ativo === "1";
        handleToggleProduto(id, ativoAtual);
      }

      if (action === "stock-produto") {
        handleStockProduto(id, Number(btn.dataset.delta));
      }
    });
}

/* ─── 4. SIDEBAR ────────────────────────────────────────── */
function initSidebar() {
  const burger = document.getElementById("burgerBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const toggleBtn = document.getElementById("sidebarToggleBtn");

  function openSidebar() {
    sidebar.classList.add("is-open");
    overlay.classList.add("is-visible");
    overlay.removeAttribute("aria-hidden");
    burger?.classList.add("is-open");
    burger?.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    burger?.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
  }

  burger?.addEventListener("click", () => {
    sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
  });

  overlay?.addEventListener("click", closeSidebar);

  // Desktop collapse/expand
  function collapseSidebar() {
    sidebar.classList.add("is-collapsed");
    sidebar.classList.remove("is-expanded");
    toggleBtn?.setAttribute("aria-expanded", "false");
    toggleBtn?.setAttribute("aria-label", "Expandir menu");
    try {
      localStorage.setItem("sidebarCollapsed", "1");
    } catch (e) {}
  }

  function expandSidebar() {
    sidebar.classList.remove("is-collapsed");
    sidebar.classList.add("is-expanded");
    toggleBtn?.setAttribute("aria-expanded", "true");
    toggleBtn?.setAttribute("aria-label", "Recolher menu");
    try {
      localStorage.setItem("sidebarCollapsed", "0");
    } catch (e) {}
  }

  toggleBtn?.addEventListener("click", () => {
    sidebar.classList.contains("is-collapsed")
      ? expandSidebar()
      : collapseSidebar();
  });

  // Restaura preferência salva
  try {
    if (localStorage.getItem("sidebarCollapsed") === "0") expandSidebar();
  } catch (e) {}
}

/* ─── EQUIPE: TABS ───────────────────────────────────────── */
function initTabs() {
  const tabs = document.querySelectorAll(".config-tab:not(:disabled)");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Desativa todas as tabs
      document.querySelectorAll(".config-tab").forEach((t) => {
        t.classList.remove("config-tab--active");
        t.setAttribute("aria-selected", "false");
      });

      // Esconde todos os painéis via atributo role
      document.querySelectorAll("[role='tabpanel']").forEach((p) => {
        p.hidden = true;
      });

      // Ativa a tab clicada
      tab.classList.add("config-tab--active");
      tab.setAttribute("aria-selected", "true");

      // Exibe o painel correspondente
      const target = tab.dataset.tab;
      const panel = document.getElementById("tab-" + target);
      if (panel) panel.hidden = false;

      // Carrega equipe na primeira visita
      if (
        target === "equipe" &&
        !EQUIPE_STATE.barbeiros.length &&
        !EQUIPE_STATE.loading
      ) {
        loadEquipe();
      }

      // Carrega serviços na primeira visita
      if (
        target === "servicos" &&
        !SERVICOS_STATE.servicos.length &&
        !SERVICOS_STATE.loading
      ) {
        loadServicos();
      }

      // Carrega produtos na primeira visita
      if (
        target === "produtos" &&
        !PRODUTOS_STATE.produtos.length &&
        !PRODUTOS_STATE.loading
      ) {
        loadProdutos();
      }

      // Carrega preferências na primeira visita
      if (
        target === "preferencias" &&
        !PREF_STATE.dados &&
        !PREF_STATE.loading
      ) {
        loadPreferencias();
      }
    });
  });
}

/* ─── 5. DATA NO HEADER ─────────────────────────────────── */
function renderDate() {
  const el = document.getElementById("configDate");
  if (!el) return;
  el.textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ─── 6. STORAGE ────────────────────────────────────────── */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    STATE.saved = { ...DEFAULTS, ...parsed };
    STATE.current = { ...STATE.saved };
  } catch (e) {
    // Silencia erro de parse; usa defaults
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Storage cheio ou bloqueado
  }
}

/* ─── 7. POPULATE FORM ──────────────────────────────────── */
function populateForm() {
  const { nome, telefone, endereco } = STATE.saved;
  document.getElementById("barbNome").value = nome;
  document.getElementById("barbTelefone").value = telefone;
  document.getElementById("barbEndereco").value = endereco;
}

function readForm() {
  return {
    nome: document.getElementById("barbNome").value.trim(),
    telefone: document.getElementById("barbTelefone").value.trim(),
    endereco: document.getElementById("barbEndereco").value.trim(),
  };
}

/* ─── 8. PREVIEW (painel esquerdo) ──────────────────────── */
function updatePreview() {
  const { nome, telefone, endereco } = STATE.current;

  // Nome grande no topo
  const previewEl = document.getElementById("previewNome");
  previewEl.textContent = nome || "Minha Barbearia";

  // Meta lista
  const metaNome = document.getElementById("metaNome");
  const metaTelefone = document.getElementById("metaTelefone");
  const metaEndereco = document.getElementById("metaEndereco");

  if (metaNome) {
    metaNome.textContent = nome || "Não informado";
    metaNome.className =
      "profile-meta-item__value" +
      (nome ? "" : " profile-meta-item__value--empty");
  }

  if (metaTelefone) {
    metaTelefone.textContent = telefone || "Não informado";
    metaTelefone.className =
      "profile-meta-item__value" +
      (telefone ? "" : " profile-meta-item__value--empty");
  }

  if (metaEndereco) {
    metaEndereco.textContent = endereco || "Não informado";
    metaEndereco.className =
      "profile-meta-item__value" +
      (endereco ? "" : " profile-meta-item__value--empty");
  }
}

/* ─── 9. DIRTY STATE (alterações pendentes) ─────────────── */
function checkDirty() {
  const current = readForm();
  STATE.current = current;

  const isDirty =
    current.nome !== STATE.saved.nome ||
    current.telefone !== STATE.saved.telefone ||
    current.endereco !== STATE.saved.endereco;

  STATE.dirty = isDirty;

  // Badge de alterações
  const badge = document.getElementById("changesBadge");
  const badgeTxt = document.getElementById("changesBadgeText");
  const btnSalvar = document.getElementById("btnSalvar");
  const btnDesc = document.getElementById("btnDescartar");

  if (isDirty) {
    badge.hidden = false;
    badge.className = "changes-badge changes-badge--pending";
    badgeTxt.textContent = "Alterações não salvas";
    btnSalvar.disabled = false;
    btnDesc.disabled = false;
  } else {
    badge.hidden = true;
    btnSalvar.disabled = true;
    btnDesc.disabled = true;
  }

  updatePreview();
}

/* ─── 10. SALVAR ────────────────────────────────────────── */
async function handleSave() {
  const data = readForm();

  if (!data.nome) {
    flashInputError("barbNome");
    showToast("error", "O nome da barbearia é obrigatório.");
    return;
  }

  if (!data.telefone) {
    flashInputError("barbTelefone");
    showToast("error", "O telefone é obrigatório.");
    return;
  }

  const btnSalvar = document.getElementById("btnSalvar");
  btnSalvar.disabled = true;

  try {
    await window.InBarberAPI.saveBarbershop(data);

    STATE.saved = { ...data };
    STATE.current = { ...data };
    STATE.dirty = false;

    saveToStorage(STATE.saved);

    const badge = document.getElementById("changesBadge");
    const badgeTxt = document.getElementById("changesBadgeText");

    badge.hidden = false;
    badge.className = "changes-badge changes-badge--saved";
    badgeTxt.textContent = "Salvo";

    document.getElementById("btnDescartar").disabled = true;
    updatePreview();
    showToast("success", "Configurações salvas com sucesso!");

    setTimeout(() => {
      badge.hidden = true;
    }, 3000);
  } catch (err) {
    showToast("error", err.message || "Erro ao salvar configurações.");
    btnSalvar.disabled = false;
  }
}

/* ─── 11. DESCARTAR ─────────────────────────────────────── */
function handleDiscard() {
  // Restaura os valores salvos nos inputs
  document.getElementById("barbNome").value = STATE.saved.nome;
  document.getElementById("barbTelefone").value = STATE.saved.telefone;
  document.getElementById("barbEndereco").value = STATE.saved.endereco;

  STATE.current = { ...STATE.saved };
  STATE.dirty = false;

  // Reseta UI
  document.getElementById("changesBadge").hidden = true;
  document.getElementById("btnSalvar").disabled = true;
  document.getElementById("btnDescartar").disabled = true;

  updatePreview();

  showToast("info", "Alterações descartadas.");
}

/* ─── 12. FORMATAÇÃO DE TELEFONE ────────────────────────── */
function initPhoneMask() {
  const telInput = document.getElementById("barbTelefone");

  telInput.addEventListener("input", () => {
    const cursor = telInput.selectionStart;
    const prev = telInput.value;
    const formatted = formatPhoneInput(prev);

    // Só reatribui se mudou (evita loop)
    if (formatted !== prev) {
      const diff = formatted.length - prev.length;
      telInput.value = formatted;
      try {
        telInput.setSelectionRange(cursor + diff, cursor + diff);
      } catch (e) {}
    }
  });
}

/* ─── 13. EVENT LISTENERS ───────────────────────────────── */
function initFormListeners() {
  const inputs = ["barbNome", "barbTelefone", "barbEndereco"];

  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", checkDirty);
    el.addEventListener("change", checkDirty);
  });

  document.getElementById("btnSalvar")?.addEventListener("click", handleSave);
  document
    .getElementById("btnDescartar")
    ?.addEventListener("click", handleDiscard);

  // Atalho: Ctrl+S / Cmd+S
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (STATE.dirty) handleSave();
    }
  });

  // Aviso ao sair com alterações não salvas
  window.addEventListener("beforeunload", (e) => {
    if (STATE.dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

/* ─── 14. PREFERÊNCIAS: CONFIG ──────────────────────────── */
const DIAS_SEMANA = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const PREF_DEFAULTS = {
  horarios: {
    seg: { aberto: true, abertura: "08:00", fechamento: "18:00" },
    ter: { aberto: true, abertura: "08:00", fechamento: "18:00" },
    qua: { aberto: true, abertura: "08:00", fechamento: "18:00" },
    qui: { aberto: true, abertura: "08:00", fechamento: "18:00" },
    sex: { aberto: true, abertura: "08:00", fechamento: "18:00" },
    sab: { aberto: true, abertura: "09:00", fechamento: "17:00" },
    dom: { aberto: false, abertura: "09:00", fechamento: "14:00" },
  },
  almoco: {
    ativo: false,
    inicio: "12:00",
    fim: "13:00",
  },
};

const PREF_STATE = {
  loading: false,
  dados: null,
};

/* ─── 15. PREFERÊNCIAS: RENDER DOS DIAS ─────────────────── */
function initPrefDias(horarios) {
  const container = document.getElementById("prefDias");
  if (!container) return;

  container.innerHTML = "";

  DIAS_SEMANA.forEach(({ key, label }) => {
    const diaData = (horarios && horarios[key]) || PREF_DEFAULTS.horarios[key];
    const aberto = !!diaData.aberto;

    const row = document.createElement("div");
    row.className = "pref-dia-row" + (aberto ? "" : " pref-dia-row--fechado");
    row.dataset.dia = key;

    row.innerHTML = `
      <div class="pref-dia-label">
        <button
          class="toggle-switch ${aberto ? "toggle-switch--on" : ""}"
          data-action="toggle-dia"
          data-dia="${key}"
          type="button"
          role="switch"
          aria-checked="${aberto ? "true" : "false"}"
          aria-label="${aberto ? "Fechar" : "Abrir"} ${label}"
        >
          <span class="toggle-switch__track" aria-hidden="true">
            <span class="toggle-switch__thumb"></span>
          </span>
        </button>
        <span class="pref-dia-name">${label}</span>
      </div>

      <div class="pref-dia-input-wrap">
        <div class="form-input-wrap">
          <div class="form-input-icon" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.3"/>
              <path d="M6.5 4v2.8l1.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </div>
          <input
            class="form-input form-input--icon pref-time-input"
            id="pref-${key}-abertura"
            type="time"
            value="${diaData.abertura || "08:00"}"
            aria-label="Abertura ${label}"
            ${aberto ? "" : 'tabindex="-1"'}
          />
        </div>
      </div>

      <div class="pref-dia-input-wrap">
        <div class="form-input-wrap">
          <div class="form-input-icon" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.3"/>
              <path d="M6.5 4v2.8l1.5 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </div>
          <input
            class="form-input form-input--icon pref-time-input"
            id="pref-${key}-fechamento"
            type="time"
            value="${diaData.fechamento || "18:00"}"
            aria-label="Fechamento ${label}"
            ${aberto ? "" : 'tabindex="-1"'}
          />
        </div>
      </div>
    `;

    container.appendChild(row);
  });

  updatePrefSummary();
}

/* ─── 15b. PREFERÊNCIAS: RESUMO DA SIDEBAR ──────────────── */
function updatePrefSummary() {
  const diasAbertosEl = document.getElementById("summaryDiasAbertos");
  const almocoEl = document.getElementById("summaryAlmoco");

  if (diasAbertosEl) {
    const total = document.querySelectorAll(
      ".pref-dia-row:not(.pref-dia-row--fechado)",
    ).length;
    diasAbertosEl.textContent = total > 0 ? `${total} de 7` : "Nenhum";
  }

  if (almocoEl) {
    const ativo = document
      .getElementById("toggleAlmoco")
      ?.classList.contains("toggle-switch--on");
    if (ativo) {
      const ini = document.getElementById("almocoInicio")?.value || "12:00";
      const fim = document.getElementById("almocoFim")?.value || "13:00";
      almocoEl.textContent = `${ini} – ${fim}`;
    } else {
      almocoEl.textContent = "Inativo";
    }
  }
}

/* ─── 16. PREFERÊNCIAS: TOGGLE DIA ──────────────────────── */
function toggleDia(key) {
  const row = document.querySelector(`.pref-dia-row[data-dia="${key}"]`);
  if (!row) return;

  const isOpen = !row.classList.contains("pref-dia-row--fechado");
  const novoOpen = !isOpen;

  row.classList.toggle("pref-dia-row--fechado", !novoOpen);

  const btn = row.querySelector('[data-action="toggle-dia"]');
  if (btn) {
    btn.classList.toggle("toggle-switch--on", novoOpen);
    btn.setAttribute("aria-checked", novoOpen ? "true" : "false");
    const dia = DIAS_SEMANA.find((d) => d.key === key);
    btn.setAttribute(
      "aria-label",
      `${novoOpen ? "Fechar" : "Abrir"} ${dia?.label || key}`,
    );
  }

  const inputs = row.querySelectorAll(".pref-time-input");
  inputs.forEach((inp) => {
    inp.setAttribute("tabindex", novoOpen ? "0" : "-1");
  });

  updatePrefSummary();
}

/* ─── 17. PREFERÊNCIAS: TOGGLE ALMOÇO ───────────────────── */
function syncAlmocoUI(ativo) {
  const btn = document.getElementById("toggleAlmoco");
  const horarios = document.getElementById("prefAlmocoHorarios");
  if (!btn || !horarios) return;

  btn.classList.toggle("toggle-switch--on", ativo);
  btn.setAttribute("aria-checked", ativo ? "true" : "false");
  btn.setAttribute(
    "aria-label",
    ativo ? "Desativar bloqueio de almoço" : "Ativar bloqueio de almoço",
  );

  const labelEl = btn.querySelector(".toggle-switch__label");
  if (labelEl) labelEl.textContent = ativo ? "Ativo" : "Inativo";

  horarios.hidden = !ativo;

  updatePrefSummary();
}

/* ─── 18. PREFERÊNCIAS: LER FORMULÁRIO ──────────────────── */
function readPrefForm() {
  const horarios = {};

  DIAS_SEMANA.forEach(({ key }) => {
    const row = document.querySelector(`.pref-dia-row[data-dia="${key}"]`);
    const aberto = row && !row.classList.contains("pref-dia-row--fechado");
    const abertura =
      document.getElementById(`pref-${key}-abertura`)?.value || "08:00";
    const fechamento =
      document.getElementById(`pref-${key}-fechamento`)?.value || "18:00";
    horarios[key] = { aberto, abertura, fechamento };
  });

  const almocoAtivo =
    document
      .getElementById("toggleAlmoco")
      ?.classList.contains("toggle-switch--on") || false;
  const almocoInicio =
    document.getElementById("almocoInicio")?.value || "12:00";
  const almocoFim = document.getElementById("almocoFim")?.value || "13:00";

  return {
    horarios,
    almoco: {
      ativo: almocoAtivo,
      inicio: almocoInicio,
      fim: almocoFim,
    },
  };
}

/* ─── 19. PREFERÊNCIAS: LOAD ─────────────────────────────── */
async function loadPreferencias() {
  const loading = document.getElementById("prefLoading");
  const body = document.getElementById("prefBody");
  if (!loading || !body) return;

  PREF_STATE.loading = true;
  loading.hidden = false;
  body.hidden = true;

  try {
    const dados = await window.InBarberAPI.getPreferences();
    PREF_STATE.dados = dados;
    initPrefDias(dados.horarios);

    const almocoAtivo = !!(dados.almoco && dados.almoco.ativo);
    syncAlmocoUI(almocoAtivo);

    if (dados.almoco) {
      const ini = document.getElementById("almocoInicio");
      const fim = document.getElementById("almocoFim");
      if (ini && dados.almoco.inicio) ini.value = dados.almoco.inicio;
      if (fim && dados.almoco.fim) fim.value = dados.almoco.fim;
    }
  } catch (_err) {
    // Backend ainda não existe ou houve erro: usa defaults sem toast
    PREF_STATE.dados = JSON.parse(JSON.stringify(PREF_DEFAULTS));
    initPrefDias(PREF_DEFAULTS.horarios);
    syncAlmocoUI(false);
  } finally {
    PREF_STATE.loading = false;
    loading.hidden = true;
    body.hidden = false;
  }
}

/* ─── 20. PREFERÊNCIAS: SALVAR ──────────────────────────── */
async function handleSalvarPreferencias() {
  const dados = readPrefForm();

  // Validação: almoço ativo → início < fim
  if (dados.almoco.ativo) {
    if (dados.almoco.inicio >= dados.almoco.fim) {
      flashInputError("almocoInicio");
      flashInputError("almocoFim");
      showToast(
        "error",
        "O horário de início do almoço deve ser anterior ao fim.",
      );
      return;
    }
  }

  // Validação: para cada dia aberto, abertura < fechamento
  for (const { key, label } of DIAS_SEMANA) {
    const d = dados.horarios[key];
    if (d.aberto && d.abertura >= d.fechamento) {
      flashInputError(`pref-${key}-abertura`);
      flashInputError(`pref-${key}-fechamento`);
      showToast(
        "error",
        `${label}: o horário de abertura deve ser anterior ao fechamento.`,
      );
      return;
    }
  }

  const btn = document.getElementById("btnSalvarPreferencias");
  if (btn) btn.disabled = true;

  try {
    await window.InBarberAPI.savePreferences(dados);
    PREF_STATE.dados = dados;
    showToast("success", "Preferências salvas com sucesso!");
  } catch (err) {
    showToast("error", err.message || "Erro ao salvar preferências.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ─── 21. PREFERÊNCIAS: EVENT LISTENERS ─────────────────── */
function initPreferenciasListeners() {
  // Salvar
  document
    .getElementById("btnSalvarPreferencias")
    ?.addEventListener("click", handleSalvarPreferencias);

  // Toggle almoço
  document.getElementById("toggleAlmoco")?.addEventListener("click", () => {
    const ativo = !document
      .getElementById("toggleAlmoco")
      .classList.contains("toggle-switch--on");
    syncAlmocoUI(ativo);
  });

  // Atualiza resumo ao mudar horários de almoço
  document
    .getElementById("almocoInicio")
    ?.addEventListener("change", updatePrefSummary);

  document
    .getElementById("almocoFim")
    ?.addEventListener("change", updatePrefSummary);

  // Delegação: toggles de dia dentro de #prefDias
  document.getElementById("prefDias")?.addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="toggle-dia"]');
    if (!btn) return;
    toggleDia(btn.dataset.dia);
  });
}

async function loadBarbershopFromAPI() {
  try {
    const dados = await window.InBarberAPI.getBarbershop();

    // Sobrepõe o localStorage com o que veio do banco
    STATE.saved = {
      nome: dados.nome || "",
      telefone: dados.telefone || "",
      endereco: dados.endereco || "",
    };
    STATE.current = { ...STATE.saved };

    saveToStorage(STATE.saved);
    populateForm();
    updatePreview();
    checkDirty();

    // Exibe logo salvo no círculo, se houver
    if (dados.logoUrl) {
      applyLogoPreview(
        `${window.InBarberAPI._baseUrl || "http://127.0.0.1:8000"}${dados.logoUrl}`,
      );
    }
  } catch (_err) {
    // Backend indisponível — mantém o que estava no localStorage
  }
}

/* ─── BARBEARIA: AVATAR / UPLOAD DE LOGO ───────────────── */
function applyLogoPreview(src) {
  const ring = document.getElementById("avatarRing");
  const iconEl = ring.querySelector(".avatar-ring__icon");
  let preview = ring.querySelector(".avatar-ring__preview");

  if (!preview) {
    preview = document.createElement("img");
    preview.className = "avatar-ring__preview";
    preview.alt = "Logo da barbearia";
    ring.insertBefore(preview, ring.firstChild);
  }

  preview.src = src;
  preview.hidden = false;
  if (iconEl) iconEl.hidden = true;
}

function initAvatarUpload() {
  const ring = document.getElementById("avatarRing");
  const fileInput = document.getElementById("avatarFileInput");

  if (!ring || !fileInput) return;

  // Clique no anel abre o seletor de arquivos
  ring.addEventListener("click", () => fileInput.click());

  // Teclas acessíveis
  ring.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    // Preview imediato antes do upload
    const localUrl = URL.createObjectURL(file);
    applyLogoPreview(localUrl);

    try {
      const result = await window.InBarberAPI.uploadBarbershopLogo(file);
      showToast("success", "Logo atualizado com sucesso!");

      // Troca URL temporária pela definitiva do servidor
      const ring = document.getElementById("avatarRing");
      const preview = ring.querySelector(".avatar-ring__preview");
      if (preview && result.logoUrl) {
        preview.src = `http://127.0.0.1:8000${result.logoUrl}`;
      }
    } catch (err) {
      showToast("error", err.message || "Erro ao enviar logo.");
    } finally {
      URL.revokeObjectURL(localUrl);
      fileInput.value = "";
    }
  });
}

/* ─── 22. BOOT ──────────────────────────────────────────── */
function boot() {
  renderDate();
  loadFromStorage();
  populateForm();
  updatePreview();
  initSidebar();
  initPhoneMask();
  initFormListeners();
  initTabs();
  initEquipeListeners();
  initServicosListeners();
  initProdutosListeners();
  initPreferenciasListeners();
  initAvatarUpload();

  // Dispara checkDirty uma vez para sincronizar estado inicial dos botões
  checkDirty();

  // Carrega dados reais do backend e sobrepõe o localStorage
  loadBarbershopFromAPI();

  console.log("[InBarber Configurações] Inicializado com sucesso.");
}

document.addEventListener("DOMContentLoaded", boot);
