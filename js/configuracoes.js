"use strict";

      /* ═══════════════════════════════════════════════════════════
       InBarber — Configurações JS
       Ordem: Config → State → Utils → Sidebar → Date
            → Storage → Form → Preview → Dirty → Boot
    ═══════════════════════════════════════════════════════════ */

      /* ─── 1. CONFIG ─────────────────────────────────────────── */
      const STORAGE_KEY = "inbarber:barbearia:v1";

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
        if (digits.length <= 7)
          return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 11)
          return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        return value;
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
          sidebar.classList.contains("is-open")
            ? closeSidebar()
            : openSidebar();
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
      function handleSave() {
        const data = readForm();

        // Validação mínima
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

        // Persiste
        STATE.saved = { ...data };
        STATE.current = { ...data };
        STATE.dirty = false;

        saveToStorage(STATE.saved);

        // Atualiza UI
        const badge = document.getElementById("changesBadge");
        const badgeTxt = document.getElementById("changesBadgeText");

        badge.hidden = false;
        badge.className = "changes-badge changes-badge--saved";
        badgeTxt.textContent = "Salvo";

        document.getElementById("btnSalvar").disabled = true;
        document.getElementById("btnDescartar").disabled = true;

        updatePreview();

        showToast("success", "Configurações salvas com sucesso!");

        // Volta badge a hidden após 3s
        setTimeout(() => {
          badge.hidden = true;
        }, 3000);
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

        document
          .getElementById("btnSalvar")
          ?.addEventListener("click", handleSave);
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

      /* ─── 14. BOOT ──────────────────────────────────────────── */
      function boot() {
        renderDate();
        loadFromStorage();
        populateForm();
        updatePreview();
        initSidebar();
        initPhoneMask();
        initFormListeners();

        // Dispara checkDirty uma vez para sincronizar estado inicial dos botões
        checkDirty();

        console.log("[InBarber Configurações] Inicializado com sucesso.");
      }

      document.addEventListener("DOMContentLoaded", boot);