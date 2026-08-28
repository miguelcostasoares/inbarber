/* ═══════════════════════════════════════════════════════════
   InBarber — Produtos (CRM)

   Página dedicada à gestão de produtos. Liga-se ao back-end
   (app.py) através de js/produtos-data.js, que é quem sabe se os
   dados vêm da API ou do mock. Este ficheiro só trata de UI:

     • KPIs   — receita reservada, vendas confirmadas, unidades
                presas em reservas e produtos a repor
     • Reservas — listar, ver itens, confirmar entrega, libertar
     • Catálogo — stock, preço, promoção, destaque e visibilidade
                  (PATCH /api/products/:id)
     • Coluna lateral — o que falta repor e o que mais sai

   Plano B: se o Flask estiver em baixo, a página cai para o mock
   de produtos-data.js e avisa no topo — numa demo nunca fica
   vazia, e o utilizador percebe que aqueles números não são os
   do servidor.

   O dashboard não carrega este ficheiro: lá vive só o alerta de
   stock (js/dashboard-produtos.js), que traz para cá quem clica.
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 1. CONFIG ─────────────────────────────────────────── */

  // Disponível <= isto conta como "a repor" no KPI e no alerta lateral.
  const LIMITE_STOCK_BAIXO = 5;

  // Quantos produtos entram no alerta lateral e no "mais reservados".
  const MAX_ALERTA_STOCK = 5;
  const MAX_TOP = 5;

  const ESTADOS = {
    reservado:  { label: 'Reservada', classe: 'reservado' },
    confirmado: { label: 'Entregue',  classe: 'confirmado' },
    libertado:  { label: 'Libertada', classe: 'libertado' },
  };


  /* ─── 2. ESTADO ─────────────────────────────────────────── */

  const STATE = {
    fonte: null,          // ProdutosData (API) ou ProdutosData._mock (demo)
    demo: false,          // true = servidor em baixo, dados de demonstração
    carregando: true,
    erro: null,
    produtos: [],
    reservas: [],
    tab: 'reservas',
    estado: '',           // filtro de estado das reservas ('' = todas)
    buscaReservas: '',
    categoria: 'todos',
    buscaProdutos: '',
    abertas: {},          // reservaId -> true (linha expandida)
    ocupado: {},          // id -> true (pedido a decorrer nessa linha)
    editando: null,       // produto aberto no modal (null quando se cria)
    criando: false,       // true = modal em modo "novo produto"
    foto: null,           // data URL / caminho mostrado na pré-visualização
    fotoMexida: false,    // só mandamos img ao servidor se o barbeiro lhe tocou
  };


  /* Fotografia: o ficheiro nunca sai do browser. É reduzido num canvas
     para no máximo FOTO_MAX_PX no lado maior e guardado como data URL
     no campo img do produto — cabe no localStorage do mockup e vai
     inteiro no JSON do PATCH/POST quando há back-end. */
  const FOTO_MAX_PX = 640;
  const FOTO_MAX_MB = 8;
  const FOTO_QUALIDADE = 0.82;


  /* ─── 3. UTILS ──────────────────────────────────────────── */

  function $(id) { return document.getElementById(id); }

  function esc(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** R$ com dois decimais — os preços dos produtos têm cêntimos. */
  function money(valor) {
    return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /** Data curta: "27 ago, 14:32" (o back-end manda UTC em ISO com Z) */
  function dataCurta(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${d.getDate()} ${MESES[d.getMonth()]}, ${hora}`;
  }

  function plural(n, singular, pluralForma) {
    return n === 1 ? `1 ${singular}` : `${n} ${pluralForma}`;
  }

  /* Toast igual ao do dashboard.js — repetido aqui porque esta
     página não carrega o JS do dashboard. */
  const CORES_TOAST = {
    success: { bg: 'var(--green-bg)', borda: 'rgba(0,214,143,0.3)',  texto: 'var(--green)' },
    blue:    { bg: 'var(--blue-bg)',  borda: 'rgba(77,166,255,0.3)', texto: 'var(--blue)' },
    error:   { bg: 'var(--red-bg)',   borda: 'rgba(255,77,106,0.3)', texto: 'var(--red)' },
  };

  function toast(mensagem, tipo) {
    const antigo = document.querySelector('.toast');
    if (antigo) antigo.remove();

    const c = CORES_TOAST[tipo] || CORES_TOAST.success;
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = mensagem;

    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: '1000',
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '12px 18px', borderRadius: 'var(--r-md)',
      background: c.bg, border: `1px solid ${c.borda}`, color: c.texto,
      fontSize: '13px', fontWeight: '500', fontFamily: 'var(--ff-b)',
      boxShadow: 'var(--shadow-md)', transform: 'translateY(16px)', opacity: '0',
      transition: 'transform 300ms var(--ease-out), opacity 300ms',
      maxWidth: 'calc(100vw - 32px)',
    });

    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    }));

    setTimeout(() => {
      el.style.transform = 'translateY(8px)';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 320);
    }, 3500);
  }

  /** Erro de rede / API ausente — o sinal para cair no plano B. */
  function ehFalhaDeServidor(err) {
    if (!err) return false;
    if (err.status === 0) return true;                       // fetch falhou
    if (err.status >= 500) return true;                      // servidor rebentou
    return /api\.js|ProdutosData|Failed to fetch/i.test(err.message || '');
  }

  const SVG = {
    chevron: '<svg class="prod-res__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5L6 7.5l3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    estrela: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.8l1.8 3.9 4.2.5-3.1 2.9.8 4.1L8 11.3l-3.7 1.9.8-4.1L2 6.2l4.2-.5L8 1.8z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    olho: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/></svg>',
    olhoOff: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 5.5C1.9 6.4 1.5 8 1.5 8S4 12.5 8 12.5c1 0 1.9-.3 2.7-.7M6.2 3.8A5.8 5.8 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5s-.6 1.1-1.7 2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M2 2l12 12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
    lapis: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M11.3 2.2l2.5 2.5-8 8-3.3.8.8-3.3 8-8z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    caixa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="7" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M4 11h16M9 7V4h6v3" stroke="currentColor" stroke-width="1.4"/></svg>',
  };


  /* ─── 4. DADOS ──────────────────────────────────────────── */

  function fonte() {
    return STATE.fonte || window.ProdutosData;
  }

  /**
   * Carrega catálogo + reservas. Na primeira falha de servidor
   * troca para o mock e tenta outra vez — daí o parâmetro.
   */
  function carregar(silencioso) {
    if (!window.ProdutosData) {
      STATE.carregando = false;
      STATE.erro = 'js/produtos-data.js não foi carregado nesta página.';
      render();
      return Promise.resolve();
    }

    if (!STATE.fonte) STATE.fonte = window.ProdutosData;
    if (!silencioso) { STATE.carregando = true; STATE.erro = null; render(); }

    return Promise.all([
      fonte().listarTodos(),
      fonte().listarReservas(),
    ]).then(([produtos, reservas]) => {
      STATE.produtos = produtos || [];
      STATE.reservas = ordenarReservas(reservas || []);
      STATE.carregando = false;
      STATE.erro = null;
      render();
    }).catch(err => {
      // Primeiro tropeção com o servidor: passa a demonstração.
      if (!STATE.demo && ehFalhaDeServidor(err) && window.ProdutosData._mock) {
        return ativarDemo().then(() => carregar(true));
      }
      STATE.carregando = false;
      STATE.erro = err && err.message ? err.message : 'Não foi possível carregar os produtos.';
      render();
    });
  }

  /** Mais recentes primeiro — a API já o faz, o mock nem sempre. */
  function ordenarReservas(lista) {
    return lista.slice().sort((a, b) => String(b.dataReserva || '').localeCompare(String(a.dataReserva || '')));
  }

  /**
   * Plano B: usa o mock de produtos-data.js e, na primeira vez,
   * semeia três reservas para o painel ter o que mostrar numa demo.
   */
  function ativarDemo() {
    STATE.demo = true;
    STATE.fonte = window.ProdutosData._mock;

    const K_SEED = 'inbarber.dash_demo_seed';
    let semeado = false;
    try { semeado = localStorage.getItem(K_SEED) === '1'; } catch (_) {}
    if (semeado) return Promise.resolve();

    const demo = [
      { clienteNome: 'Lucas Andrade',  clienteTel: '(84) 99999-0001', itens: [{ produtoId: 'prod_001', quantidade: 1 }, { produtoId: 'prod_003', quantidade: 1 }] },
      { clienteNome: 'Bruno Carvalho', clienteTel: '(84) 99999-0006', itens: [{ produtoId: 'prod_008', quantidade: 1 }] },
      { clienteNome: 'Diego Martins',  clienteTel: '(84) 99999-0007', itens: [{ produtoId: 'prod_005', quantidade: 2 }] },
    ];

    return demo.reduce(
      (fila, dados) => fila.then(criadas =>
        STATE.fonte.criarReserva(dados).then(r => criadas.concat(r)).catch(() => criadas)
      ),
      Promise.resolve([])
    ).then(criadas => {
      // Uma entregue e outra libertada: os três estados ficam visíveis.
      const p = [];
      if (criadas[1]) p.push(STATE.fonte.confirmarReserva(criadas[1].id).catch(() => {}));
      if (criadas[2]) p.push(STATE.fonte.libertarReserva(criadas[2].id).catch(() => {}));
      return Promise.all(p);
    }).then(() => {
      try { localStorage.setItem(K_SEED, '1'); } catch (_) {}
    });
  }


  /* ─── 5. DERIVADOS ──────────────────────────────────────── */

  function metricas() {
    const reservadas  = STATE.reservas.filter(r => r.estado === 'reservado');
    const confirmadas = STATE.reservas.filter(r => r.estado === 'confirmado');

    const soma = lista => lista.reduce((s, r) => s + Number(r.total || 0), 0);
    const unidades = lista => lista.reduce(
      (s, r) => s + (r.produtos || []).reduce((t, i) => t + Number(i.quantidade || 0), 0), 0
    );

    const ativos  = STATE.produtos.filter(p => p.ativo);
    const baixos  = ativos.filter(p => p.disponivel <= LIMITE_STOCK_BAIXO);
    const rutura  = ativos.filter(p => p.disponivel === 0);

    return {
      pendente:        soma(reservadas),
      pendenteCount:   reservadas.length,
      vendido:         soma(confirmadas),
      vendidoCount:    confirmadas.length,
      vendidoUnidades: unidades(confirmadas),
      unidades:        STATE.produtos.reduce((s, p) => s + Number(p.reservado || 0), 0),
      poupanca:        confirmadas.reduce((s, r) => s + Number(r.poupanca || 0), 0),
      baixos, rutura,
    };
  }

  /** Unidades por produto somando reservas em curso e entregues. */
  function topProdutos() {
    const contagem = {};
    STATE.reservas
      .filter(r => r.estado !== 'libertado')
      .forEach(r => (r.produtos || []).forEach(item => {
        const atual = contagem[item.produtoId] || { nome: item.nome, unidades: 0, valor: 0 };
        atual.unidades += Number(item.quantidade || 0);
        atual.valor    += Number(item.subtotal || 0);
        contagem[item.produtoId] = atual;
      }));

    return Object.keys(contagem)
      .map(id => Object.assign({ id }, contagem[id]))
      .sort((a, b) => b.unidades - a.unidades || b.valor - a.valor)
      .slice(0, MAX_TOP);
  }

  function reservasFiltradas() {
    const termo = STATE.buscaReservas.trim().toLowerCase();
    return STATE.reservas.filter(r => {
      if (STATE.estado && r.estado !== STATE.estado) return false;
      if (!termo) return true;
      return (r.clienteNome || '').toLowerCase().includes(termo) ||
             (r.numero || '').toLowerCase().includes(termo);
    });
  }

  function produtosFiltrados() {
    const termo = STATE.buscaProdutos.trim().toLowerCase();
    return STATE.produtos.filter(p => {
      if (STATE.categoria !== 'todos' && p.categoria !== STATE.categoria) return false;
      if (!termo) return true;
      return (p.nome || '').toLowerCase().includes(termo) ||
             (p.id || '').toLowerCase().includes(termo);
    });
  }


  /* ─── 6. RENDER ─────────────────────────────────────────── */

  function render() {
    renderBanner();
    renderKpis();
    renderTop();
    renderTabs();
    renderReservas();
    renderCatalogo();
    renderStockLateral();
  }

  function renderBanner() {
    const banner = $('prodBanner');
    const modo   = $('prodMode');
    if (!banner) return;

    if (STATE.erro) {
      banner.hidden = false;
      banner.className = 'prod-banner prod-banner--erro';
      banner.innerHTML = `
        <span>${esc(STATE.erro)}</span>
        <button class="prod-banner__btn" data-acao="recarregar">Tentar de novo</button>`;
    } else if (STATE.demo) {
      banner.hidden = false;
      banner.className = 'prod-banner prod-banner--demo';
      banner.innerHTML = `
        <span>Servidor de produtos indisponível — a mostrar dados de demonstração. As alterações ficam só neste navegador.</span>
        <button class="prod-banner__btn" data-acao="reconectar">Tentar ligar</button>`;
    } else {
      banner.hidden = true;
      banner.innerHTML = '';
    }

    if (modo) {
      modo.hidden = false;
      modo.textContent = STATE.demo ? 'Demonstração' : 'Ligado à API';
      modo.className = 'prod-mode' + (STATE.demo ? ' prod-mode--demo' : ' prod-mode--api');
    }
  }

  function renderKpis() {
    const m = metricas();
    const vazio = STATE.carregando ? '···' : '—';

    const set = (id, valor) => { const el = $(id); if (el) el.textContent = valor; };

    set('prodKpiPendente', STATE.carregando ? vazio : money(m.pendente));
    set('prodKpiPendenteMeta', STATE.carregando ? 'a carregar...' :
      m.pendenteCount ? `${plural(m.pendenteCount, 'reserva à espera', 'reservas à espera')} de entrega`
                      : 'nada por entregar');

    set('prodKpiVendido', STATE.carregando ? vazio : money(m.vendido));
    set('prodKpiVendidoMeta', STATE.carregando ? 'a carregar...' :
      `${plural(m.vendidoUnidades, 'unidade entregue', 'unidades entregues')}` +
      (m.poupanca > 0 ? ` · ${money(m.poupanca)} em descontos` : ''));

    set('prodKpiUnidades', STATE.carregando ? vazio : String(m.unidades));
    set('prodKpiUnidadesMeta', STATE.carregando ? 'a carregar...' :
      m.unidades ? 'presas em reservas por entregar' : 'nenhuma unidade presa');

    set('prodKpiStock', STATE.carregando ? vazio : String(m.baixos.length));
    set('prodKpiStockMeta', STATE.carregando ? 'a carregar...' :
      m.rutura.length ? `${plural(m.rutura.length, 'produto esgotado', 'produtos esgotados')}`
                      : `com ${LIMITE_STOCK_BAIXO} unidades ou menos`);
  }

  function renderTop() {
    const alvo = $('prodTopList');
    if (!alvo) return;

    if (STATE.carregando) { alvo.innerHTML = esqueleto(3, 'prod-skel--linha'); return; }

    const top = topProdutos();
    if (!top.length) {
      alvo.innerHTML = vazioHTML('Ainda não há reservas de produtos.');
      return;
    }

    const maior = top[0].unidades || 1;
    alvo.innerHTML = top.map(p => `
      <div class="prod-top__row">
        <span class="prod-top__nome" title="${esc(p.nome)}">${esc(p.nome)}</span>
        <div class="prod-top__bar"><i style="width:${Math.max(6, (p.unidades / maior) * 100)}%"></i></div>
        <span class="prod-top__qtd">${p.unidades}<span> un</span></span>
        <span class="prod-top__valor">${money(p.valor)}</span>
      </div>`).join('');
  }

  function renderTabs() {
    const rc = $('prodTabReservasCount');
    const cc = $('prodTabCatalogoCount');
    if (rc) rc.textContent = STATE.reservas.length;
    if (cc) cc.textContent = STATE.produtos.length;

    document.querySelectorAll('.prod-tab').forEach(tab => {
      const ativo = tab.dataset.prodTab === STATE.tab;
      tab.classList.toggle('prod-tab--active', ativo);
      tab.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    const painelR = $('prodPanelReservas');
    const painelC = $('prodPanelCatalogo');
    if (painelR) painelR.hidden = STATE.tab !== 'reservas';
    if (painelC) painelC.hidden = STATE.tab !== 'catalogo';
  }

  function renderReservas() {
    const alvo = $('prodReservasList');
    if (!alvo) return;

    if (STATE.carregando) { alvo.innerHTML = esqueleto(3, 'prod-skel--bloco'); return; }

    const lista = reservasFiltradas();
    if (!lista.length) {
      alvo.innerHTML = vazioHTML(
        STATE.reservas.length ? 'Nenhuma reserva com estes filtros.'
                              : 'Ainda não há reservas de produtos.'
      );
      return;
    }

    alvo.innerHTML = lista.map(r => {
      const meta    = ESTADOS[r.estado] || { label: r.estado, classe: 'reservado' };
      const aberta  = !!STATE.abertas[r.id];
      const ocupada = !!STATE.ocupado[r.id];
      const itens   = r.produtos || [];
      const unidades = itens.reduce((s, i) => s + Number(i.quantidade || 0), 0);

      return `
      <article class="prod-res${aberta ? ' is-open' : ''}${ocupada ? ' is-busy' : ''}" data-id="${esc(r.id)}">
        <button class="prod-res__head" data-acao="expandir" data-id="${esc(r.id)}"
                aria-expanded="${aberta ? 'true' : 'false'}">
          <span class="prod-res__num">#${esc(r.numero || r.id)}</span>
          <span class="prod-res__cliente">
            <span class="prod-res__nome">${esc(r.clienteNome || 'Sem nome')}</span>
            <span class="prod-res__tel">${esc(r.clienteTel || '')}</span>
          </span>
          <span class="prod-res__data">${dataCurta(r.dataReserva)}</span>
          <span class="prod-res__itens">${plural(unidades, 'unidade', 'unidades')}</span>
          <span class="prod-res__total">${money(r.total)}</span>
          <span class="prod-badge prod-badge--${meta.classe}">${meta.label}</span>
          ${SVG.chevron}
        </button>

        <div class="prod-res__body"${aberta ? '' : ' hidden'}>
          <ul class="prod-res__itens-lista" role="list">
            ${itens.map(i => `
              <li class="prod-res__item">
                <span class="prod-res__item-qtd">${i.quantidade}×</span>
                <span class="prod-res__item-nome">${esc(i.nome)}</span>
                <span class="prod-res__item-preco">
                  ${i.precoTabela ? `<s>${money(i.precoTabela)}</s>` : ''}
                  ${money(i.preco)}
                </span>
                <span class="prod-res__item-sub">${money(i.subtotal)}</span>
              </li>`).join('')}
          </ul>

          <div class="prod-res__resumo">
            ${r.agendamentoId ? `<span class="prod-res__chip">Agendamento ${esc(r.agendamentoId)}</span>` : ''}
            ${Number(r.poupanca) > 0 ? `<span class="prod-res__chip prod-res__chip--verde">Poupança ${money(r.poupanca)}</span>` : ''}
            ${r.observacoes ? `<span class="prod-res__obs">“${esc(r.observacoes)}”</span>` : ''}
            <span class="prod-res__total-final">Total ${money(r.total)}</span>
          </div>

          <div class="prod-res__acoes">
            ${r.estado === 'reservado' ? `
              <button class="prod-btn prod-btn--ok" data-acao="confirmar" data-id="${esc(r.id)}" ${ocupada ? 'disabled' : ''}>
                Confirmar entrega
              </button>
              <button class="prod-btn prod-btn--danger" data-acao="libertar" data-id="${esc(r.id)}" ${ocupada ? 'disabled' : ''}>
                Libertar stock
              </button>` : `
              <span class="prod-res__fechada">
                ${r.estado === 'confirmado'
                  ? `Entregue em ${dataCurta(r.dataConfirmado)}`
                  : `Libertada em ${dataCurta(r.dataLibertado)}`}
              </span>`}
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function renderCatalogo() {
    renderCategorias();

    const alvo = $('prodCatalogoList');
    if (!alvo) return;

    if (STATE.carregando) { alvo.innerHTML = esqueleto(4, 'prod-skel--linha'); return; }

    const lista = produtosFiltrados();
    if (!lista.length) {
      /* Catálogo vazio de raiz é outra coisa que um filtro sem
         resultados: no primeiro caso o que falta é criar produtos. */
      const vazioDeTodo = !STATE.produtos.length;
      alvo.innerHTML = vazioHTML(
        vazioDeTodo ? 'Ainda não há produtos no catálogo.' : 'Nenhum produto com estes filtros.',
        vazioDeTodo ? 'Criar o primeiro produto' : null
      );
      return;
    }

    const cabecalho = `
      <div class="prod-row prod-row--head" aria-hidden="true">
        <span class="prod-row__thumb"></span>
        <span class="prod-row__info">Produto</span>
        <span class="prod-row__preco">Preço</span>
        <span class="prod-row__stock">Stock</span>
        <span class="prod-row__acoes">Ações</span>
      </div>`;

    alvo.innerHTML = cabecalho + lista.map(p => {
      const ocupado = !!STATE.ocupado[p.id];
      const pct = p.stock ? Math.round((p.disponivel / p.stock) * 100) : 0;
      const nivel = p.disponivel === 0 ? 'rutura' : (p.disponivel <= LIMITE_STOCK_BAIXO ? 'baixo' : 'ok');

      return `
      <div class="prod-row${ocupado ? ' is-busy' : ''}${p.ativo ? '' : ' is-off'}" data-id="${esc(p.id)}">
        <span class="prod-row__thumb">
          <img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.remove()" />
          ${SVG.caixa}
        </span>

        <span class="prod-row__info">
          <span class="prod-row__nome">
            ${esc(p.nome)}
            ${p.novo ? '<span class="prod-tag prod-tag--new">Novo</span>' : ''}
            ${p.destaque ? '<span class="prod-tag prod-tag--gold">Destaque</span>' : ''}
            ${p.ativo ? '' : '<span class="prod-tag prod-tag--off">Oculto</span>'}
          </span>
          <span class="prod-row__cat">${esc(p.categoria)} · ${esc(p.id)}</span>
        </span>

        <span class="prod-row__preco">
          <span class="prod-row__final">${money(p.precoFinal)}</span>
          ${p.emPromocao ? `<span class="prod-row__tabela"><s>${money(p.preco)}</s>
            <span class="prod-row__desc">−${p.descontoPct}%</span></span>` : ''}
        </span>

        <span class="prod-row__stock">
          <span class="prod-stock__num prod-stock__num--${nivel}">
            ${p.disponivel}<span>/${p.stock}</span>
          </span>
          <span class="prod-stock__sub">${p.reservado ? plural(p.reservado, 'reservada', 'reservadas') : 'nada reservado'}</span>
          <span class="prod-stock__bar"><i class="prod-stock__fill--${nivel}" style="width:${Math.max(3, pct)}%"></i></span>
        </span>

        <span class="prod-row__acoes">
          <span class="prod-stepper">
            <button class="prod-icon-btn" data-acao="stock" data-delta="-1" data-id="${esc(p.id)}"
                    ${ocupado || p.stock <= p.reservado ? 'disabled' : ''} aria-label="Reduzir stock de ${esc(p.nome)}">−</button>
            <button class="prod-icon-btn" data-acao="stock" data-delta="1" data-id="${esc(p.id)}"
                    ${ocupado ? 'disabled' : ''} aria-label="Aumentar stock de ${esc(p.nome)}">+</button>
          </span>
          <button class="prod-icon-btn${p.destaque ? ' is-on' : ''}" data-acao="destaque" data-id="${esc(p.id)}"
                  ${ocupado ? 'disabled' : ''} aria-pressed="${p.destaque ? 'true' : 'false'}"
                  title="Destaque na vitrine">${SVG.estrela}</button>
          <button class="prod-icon-btn${p.ativo ? ' is-on' : ''}" data-acao="ativo" data-id="${esc(p.id)}"
                  ${ocupado ? 'disabled' : ''} aria-pressed="${p.ativo ? 'true' : 'false'}"
                  title="${p.ativo ? 'Visível na loja' : 'Oculto na loja'}">${p.ativo ? SVG.olho : SVG.olhoOff}</button>
          <button class="prod-icon-btn" data-acao="editar" data-id="${esc(p.id)}"
                  ${ocupado ? 'disabled' : ''} title="Editar produto">${SVG.lapis}</button>
        </span>
      </div>`;
    }).join('');
  }

  function renderCategorias() {
    const alvo = $('prodCategorias');
    if (!alvo) return;

    const categorias = (window.ProdutosData && window.ProdutosData.categorias)
      ? window.ProdutosData.categorias()
      : [{ id: 'todos' }];

    const nomes = {
      todos: 'Todas', pomadas: 'Pomadas', cabelo: 'Cabelo',
      barba: 'Barba', acessorios: 'Acessórios',
    };

    alvo.innerHTML = categorias.map(c => `
      <button class="prod-pill${STATE.categoria === c.id ? ' prod-pill--active' : ''}"
              data-categoria="${esc(c.id)}">${esc(nomes[c.id] || c.id)}</button>`).join('');
  }

  /** Card "Repor stock" da coluna lateral; clicar leva ao catálogo. */
  function renderStockLateral() {
    const lista = $('prodStockList');
    const badge = $('prodStockBadge');
    if (!lista) return;

    if (STATE.carregando) { lista.innerHTML = esqueleto(3, 'prod-skel--item'); return; }

    const criticos = STATE.produtos
      .filter(p => p.ativo && p.disponivel <= LIMITE_STOCK_BAIXO)
      .sort((a, b) => a.disponivel - b.disponivel)
      .slice(0, MAX_ALERTA_STOCK);

    if (badge) badge.textContent = criticos.length;

    if (!criticos.length) {
      lista.innerHTML = '<li class="prod-aside-item"><span class="prod-aside-item__nome">Stock em dia</span>' +
                        '<span class="prod-aside-item__sub">nada abaixo do limite</span></li>';
      return;
    }

    lista.innerHTML = criticos.map(p => `
      <li class="prod-aside-item" role="listitem" data-acao="ir-produto" data-id="${esc(p.id)}"
          title="Ver ${esc(p.nome)} no catálogo">
        <span class="prod-aside-item__nome">${esc(p.nome)}</span>
        <span class="prod-aside-item__sub">${p.disponivel} un</span>
        <span class="prod-aside-item__tag prod-aside-item__tag--${p.disponivel === 0 ? 'red' : 'orange'}">
          ${p.disponivel === 0 ? 'Esgotado' : 'Crítico'}
        </span>
      </li>`).join('');
  }

  function esqueleto(n, classe) {
    return Array.from({ length: n }, () => `<div class="prod-skel ${classe}"></div>`).join('');
  }

  function vazioHTML(mensagem, cta) {
    return `<div class="prod-vazio">${SVG.caixa}<span>${esc(mensagem)}</span>` +
      (cta ? `<button class="btn-pipeline" data-acao="novo-produto">${esc(cta)}</button>` : '') +
      `</div>`;
  }


  /* ─── 7. AÇÕES ──────────────────────────────────────────── */

  /** Marca a linha como ocupada, corre o pedido e trata o erro. */
  function agir(chave, promessa, aoSucesso) {
    STATE.ocupado[chave] = true;
    render();

    return promessa
      .then(resultado => {
        delete STATE.ocupado[chave];
        if (aoSucesso) aoSucesso(resultado);
        else render();
      })
      .catch(err => {
        delete STATE.ocupado[chave];
        render();
        toast(err && err.message ? err.message : 'Não foi possível concluir a operação.', 'error');
        throw err;
      });
  }

  function confirmarReserva(id) {
    return agir(id, fonte().confirmarReserva(id), () => {
      toast('Entrega confirmada — stock atualizado.', 'success');
      carregar(true);   // confirmar mexe no stock: recarrega catálogo e reservas
    }).catch(() => {});
  }

  function libertarReserva(id) {
    return agir(id, fonte().libertarReserva(id), () => {
      toast('Reserva libertada — as unidades voltaram ao stock.', 'blue');
      carregar(true);
    }).catch(() => {});
  }

  /** PATCH num produto; substitui a linha pelo que o servidor devolveu. */
  function atualizarProduto(id, dados, mensagem) {
    return agir(id, fonte().atualizar(id, dados), produto => {
      STATE.produtos = STATE.produtos.map(p => (p.id === produto.id ? produto : p));
      render();
      if (mensagem) toast(mensagem, 'success');
    }).catch(() => {});
  }

  function produtoPorId(id) {
    return STATE.produtos.filter(p => p.id === id)[0] || null;
  }


  /* ─── 8. MODAL DE PRODUTO (criar e editar) ──────────────── */

  /* O mesmo modal serve os dois casos. A diferença vive em
     STATE.criando: a criar não há produto de partida, o stock não
     tem reservas para respeitar e o botão diz outra coisa. */

  function abrirModal(id) {
    const p = produtoPorId(id);
    if (!p) return;
    prepararModal(p);
  }

  function abrirModalCriar() {
    prepararModal(null);
  }

  function prepararModal(p) {
    const overlay = $('prodModalOverlay');
    if (!overlay) return;

    STATE.editando = p;
    STATE.criando = !p;

    $('prodModalTitle').textContent = p ? p.nome : 'Novo produto';
    $('prodModalSave').textContent = p ? 'Guardar' : 'Criar produto';

    $('prodFieldNome').value = p ? p.nome : '';
    $('prodFieldDescricao').value = p ? (p.descricao || '') : '';
    $('prodFieldPreco').value = p ? Number(p.preco).toFixed(2) : '';
    $('prodFieldPromo').value = p && p.precoPromo != null ? Number(p.precoPromo).toFixed(2) : '';
    $('prodFieldStock').value = p ? p.stock : '';
    $('prodFieldStockHint').textContent = !p
      ? 'quantas unidades entram já para o balcão'
      : (p.reservado
          ? `${plural(p.reservado, 'unidade reservada', 'unidades reservadas')} — o stock não pode descer abaixo disso`
          : 'nada reservado neste momento');

    $('prodFieldDestaque').checked = p ? !!p.destaque : false;
    $('prodFieldAtivo').checked = p ? !!p.ativo : true;
    /* Um produto acabado de criar é, por definição, novidade —
       mas continua a ser uma escolha, não uma regra automática. */
    $('prodFieldNovo').checked = p ? !!p.novo : true;

    mostrarFoto(p ? p.img : null);
    STATE.fotoMexida = false;

    const select = $('prodFieldCategoria');
    const categorias = (window.ProdutosData.categorias() || []).filter(c => c.id !== 'todos');
    const escolhida = p ? p.categoria : categorias[0] && categorias[0].id;
    select.innerHTML = categorias.map(c =>
      `<option value="${esc(c.id)}"${c.id === escolhida ? ' selected' : ''}>${esc(c.id)}</option>`).join('');

    erroModal(null);
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('prodFieldNome').focus(), 50);
  }

  function fecharModal() {
    const overlay = $('prodModalOverlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    STATE.editando = null;
    STATE.criando = false;
    STATE.foto = null;
    STATE.fotoMexida = false;
    const input = $('prodFotoInput');
    if (input) input.value = '';
  }

  function erroModal(mensagem) {
    const el = $('prodModalError');
    if (!el) return;
    el.hidden = !mensagem;
    el.textContent = mensagem || '';
  }


  /* ── Fotografia ── */

  /** Põe (ou tira) a imagem da pré-visualização. url null = placeholder. */
  function mostrarFoto(url) {
    STATE.foto = url || null;

    const caixa = $('prodFotoPreview');
    const img = $('prodFotoImg');
    const ph = $('prodFotoPh');
    const limpar = $('prodFotoClear');
    if (!caixa || !img) return;

    if (url) {
      img.src = url;
      img.hidden = false;
      if (ph) ph.style.display = 'none';
      caixa.classList.add('is-set');
      if (limpar) limpar.hidden = false;
    } else {
      img.removeAttribute('src');
      img.hidden = true;
      if (ph) ph.style.display = '';
      caixa.classList.remove('is-set');
      if (limpar) limpar.hidden = true;
    }
  }

  /* A convenção assets/produtos/<id>.jpg pode não ter ficheiro; nesse
     caso a pré-visualização volta ao placeholder em vez de ficar um
     ícone de imagem partida. */
  function fotoFalhou() {
    if (!STATE.fotoMexida) mostrarFoto(null);
  }

  /** Ficheiro → data URL reduzido. Rejeita com mensagem para o utilizador. */
  function lerFotoReduzida(ficheiro) {
    return new Promise((resolve, reject) => {
      if (!ficheiro) return reject(new Error('Nenhum ficheiro escolhido.'));
      if (!/^image\/(png|jpeg|webp)$/.test(ficheiro.type)) {
        return reject(new Error('Formato não suportado — use JPG, PNG ou WebP.'));
      }
      if (ficheiro.size > FOTO_MAX_MB * 1024 * 1024) {
        return reject(new Error(`Imagem demasiado grande (máximo ${FOTO_MAX_MB} MB).`));
      }

      const leitor = new FileReader();
      leitor.onerror = () => reject(new Error('Não foi possível ler o ficheiro.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('O ficheiro não é uma imagem válida.'));
        img.onload = () => {
          const escala = Math.min(1, FOTO_MAX_PX / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * escala));
          const h = Math.max(1, Math.round(img.height * escala));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          /* PNG com transparência sobre JPEG daria fundo preto. */
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          try {
            resolve(canvas.toDataURL('image/jpeg', FOTO_QUALIDADE));
          } catch (_) {
            reject(new Error('Não foi possível processar a imagem.'));
          }
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(ficheiro);
    });
  }

  function escolherFoto(ficheiro) {
    lerFotoReduzida(ficheiro)
      .then(dataUrl => {
        mostrarFoto(dataUrl);
        STATE.fotoMexida = true;
        erroModal(null);
      })
      .catch(err => erroModal(err.message));
  }


  /* ── Guardar ── */

  /** Lê o formulário e valida o óbvio; a regra a sério é a do servidor. */
  function lerFormulario() {
    const promoRaw = $('prodFieldPromo').value.trim();
    const dados = {
      nome:       $('prodFieldNome').value.trim(),
      descricao:  $('prodFieldDescricao').value.trim(),
      preco:      Number($('prodFieldPreco').value),
      precoPromo: promoRaw === '' ? null : Number(promoRaw),
      stock:      parseInt($('prodFieldStock').value, 10),
      categoria:  $('prodFieldCategoria').value,
      destaque:   $('prodFieldDestaque').checked,
      ativo:      $('prodFieldAtivo').checked,
      novo:       $('prodFieldNovo').checked,
    };

    if (!dados.nome)         return { erro: 'O nome não pode ficar vazio.' };
    if (!(dados.preco >= 0)) return { erro: 'Preço de tabela inválido.' };
    if (dados.precoPromo !== null && !(dados.precoPromo > 0)) {
      return { erro: 'Preço promocional inválido.' };
    }
    if (dados.precoPromo !== null && dados.precoPromo >= dados.preco) {
      return { erro: 'A promoção tem de ser menor que o preço de tabela.' };
    }
    if (!(dados.stock >= 0)) return { erro: 'Stock inválido.' };

    /* Só mandamos img se o barbeiro mexeu na fotografia — assim um
       produto com foto no disco não a perde por se editar o preço. */
    if (STATE.fotoMexida) dados.img = STATE.foto;

    return { dados };
  }

  function guardarModal() {
    const lido = lerFormulario();
    if (lido.erro) return erroModal(lido.erro);

    const btn = $('prodModalSave');
    btn.disabled = true;
    erroModal(null);

    const pedido = STATE.criando
      ? fonte().criar(lido.dados)
      : fonte().atualizar(STATE.editando.id, lido.dados);

    const eraNovo = STATE.criando;

    pedido
      .then(produto => {
        STATE.produtos = eraNovo
          ? STATE.produtos.concat([produto])
          : STATE.produtos.map(x => (x.id === produto.id ? produto : x));

        btn.disabled = false;
        fecharModal();

        if (eraNovo) {
          /* Leva o barbeiro ao produto que acabou de criar, em vez de
             o deixar à procura dele no meio do catálogo. */
          STATE.tab = 'catalogo';
          STATE.categoria = 'todos';
          STATE.buscaProdutos = '';
          const campo = $('prodBuscaProdutos');
          if (campo) campo.value = '';
          renderTabs();
        }

        render();
        toast(eraNovo ? 'Produto criado.' : 'Produto atualizado.', 'success');
      })
      .catch(err => {
        btn.disabled = false;
        erroModal(err && err.message ? err.message : 'Não foi possível guardar.');
      });
  }


  /* ─── 9. EVENTOS ────────────────────────────────────────── */

  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function initEventos() {
    const seccao = $('main');
    if (!seccao) return;

    seccao.addEventListener('click', (e) => {
      const alvo = e.target.closest('[data-acao], [data-prod-tab], [data-estado], [data-categoria]');
      if (!alvo) return;

      if (alvo.dataset.prodTab) {
        STATE.tab = alvo.dataset.prodTab;
        renderTabs();
        return;
      }
      if (alvo.dataset.estado !== undefined && alvo.classList.contains('prod-pill')) {
        STATE.estado = alvo.dataset.estado;
        seccao.querySelectorAll('#prodPanelReservas .prod-pill').forEach(p =>
          p.classList.toggle('prod-pill--active', p === alvo));
        renderReservas();
        return;
      }
      if (alvo.dataset.categoria) {
        STATE.categoria = alvo.dataset.categoria;
        renderCatalogo();
        return;
      }

      const id = alvo.dataset.id;
      switch (alvo.dataset.acao) {
        case 'expandir':
          STATE.abertas[id] = !STATE.abertas[id];
          renderReservas();
          break;
        case 'confirmar':
          confirmarReserva(id);
          break;
        case 'libertar':
          libertarReserva(id);
          break;
        case 'stock': {
          const p = produtoPorId(id);
          if (!p) break;
          const novo = p.stock + Number(alvo.dataset.delta);
          if (novo < 0) break;
          atualizarProduto(id, { stock: novo });
          break;
        }
        case 'destaque': {
          const p = produtoPorId(id);
          if (!p) break;
          atualizarProduto(id, { destaque: !p.destaque },
            !p.destaque ? 'Produto em destaque na vitrine.' : 'Produto retirado da vitrine.');
          break;
        }
        case 'ativo': {
          const p = produtoPorId(id);
          if (!p) break;
          atualizarProduto(id, { ativo: !p.ativo },
            !p.ativo ? 'Produto visível na loja.' : 'Produto oculto na loja.');
          break;
        }
        case 'editar':
          abrirModal(id);
          break;
        case 'novo-produto':
          abrirModalCriar();
          break;
        case 'ir-produto': {
          const p = produtoPorId(id);
          if (!p) break;
          STATE.tab = 'catalogo';
          STATE.categoria = 'todos';
          STATE.buscaProdutos = p.nome;
          const campo = $('prodBuscaProdutos');
          if (campo) campo.value = p.nome;
          renderTabs();
          renderCatalogo();
          $('prodPanelCatalogo').scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
        case 'recarregar':
        case 'reconectar':
          STATE.demo = false;
          STATE.fonte = window.ProdutosData;
          carregar();
          break;
      }
    });

    const refresh = $('prodRefresh');
    if (refresh) refresh.addEventListener('click', () => {
      refresh.classList.add('is-spinning');
      carregar().then(() => setTimeout(() => refresh.classList.remove('is-spinning'), 300));
    });

    const buscaR = $('prodBuscaReservas');
    if (buscaR) buscaR.addEventListener('input', debounce((e) => {
      STATE.buscaReservas = e.target.value;
      renderReservas();
    }, 180));

    const buscaP = $('prodBuscaProdutos');
    if (buscaP) buscaP.addEventListener('input', debounce((e) => {
      STATE.buscaProdutos = e.target.value;
      renderCatalogo();
    }, 180));

    /* Coluna lateral: clicar num produto a repor abre o catálogo
       já filtrado nesse produto. O clique cai no mesmo delegado
       acima (data-acao="ir-produto"), por isso vive no switch. */

    // Modal
    const overlay = $('prodModalOverlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });
      $('prodModalClose').addEventListener('click', fecharModal);
      $('prodModalCancel').addEventListener('click', fecharModal);
      $('prodModalSave').addEventListener('click', guardarModal);

      /* Fotografia: o clique na pré-visualização ou no botão abre o
         seletor de ficheiros; o input em si fica escondido. */
      const fotoInput = $('prodFotoInput');
      const abrirSeletor = () => fotoInput && fotoInput.click();
      $('prodFotoPick').addEventListener('click', abrirSeletor);
      $('prodFotoPreview').addEventListener('click', abrirSeletor);
      $('prodFotoClear').addEventListener('click', () => {
        mostrarFoto(null);
        STATE.fotoMexida = true;
      });
      $('prodFotoImg').addEventListener('error', fotoFalhou);
      if (fotoInput) fotoInput.addEventListener('change', (e) => {
        const ficheiro = e.target.files && e.target.files[0];
        if (ficheiro) escolherFoto(ficheiro);
        e.target.value = '';        // permite reescolher o mesmo ficheiro
      });
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); guardarModal(); }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.hidden) fecharModal();
      });
    }
  }


  /* ─── 10. SIDEBAR ───────────────────────────────────────── */
  /* Mesmo comportamento do dashboard.js (recolher no desktop,
     drawer no telemóvel, estado guardado em localStorage). Vive
     aqui porque esta página não carrega o JS do dashboard. */

  function initSidebar() {
    const sidebar   = $('sidebar');
    const overlay   = $('sidebarOverlay');
    const burger    = $('burgerBtn');
    const toggleBtn = $('sidebarToggleBtn');
    if (!sidebar) return;

    function abrir() {
      sidebar.classList.add('is-open');
      overlay && overlay.classList.add('is-visible');
      burger && burger.classList.add('is-open');
      burger && burger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function fechar() {
      sidebar.classList.remove('is-open');
      overlay && overlay.classList.remove('is-visible');
      burger && burger.classList.remove('is-open');
      burger && burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    burger && burger.addEventListener('click', () => {
      sidebar.classList.contains('is-open') ? fechar() : abrir();
    });
    overlay && overlay.addEventListener('click', fechar);

    sidebar.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => { if (window.innerWidth <= 900) fechar(); });
    });

    function recolher() {
      sidebar.classList.add('is-collapsed');
      sidebar.classList.remove('is-expanded');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Expandir menu');
      }
      try { localStorage.setItem('sidebarCollapsed', '1'); } catch (_) {}
    }

    function expandir() {
      sidebar.classList.remove('is-collapsed');
      sidebar.classList.add('is-expanded');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.setAttribute('aria-label', 'Recolher menu');
      }
      try { localStorage.setItem('sidebarCollapsed', '0'); } catch (_) {}
    }

    toggleBtn && toggleBtn.addEventListener('click', () => {
      sidebar.classList.contains('is-collapsed') ? expandir() : recolher();
    });

    try {
      if (localStorage.getItem('sidebarCollapsed') === '0') expandir();
    } catch (_) {}
  }


  /* ─── 11. BOOT ──────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('prodPanelCatalogo')) return;
    initSidebar();
    initEventos();
    carregar();
  });

})();
