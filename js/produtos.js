/* ════════════════════════════════════════════════════════════════
   InBarber — PRODUTOS · Módulo unificado

   Reúne em um único arquivo o que antes estava dividido em três:
     • produtos-data.js   → camada de dados (ProdutosData)
     • produtos-landing.js → vitrine na landing (index.html)
     • produtos.js        → UI do catálogo (produtos.html)

   Carregado em dois contextos:
     index.html   → executa apenas o bloco da vitrine
     produtos.html → executa apenas o bloco do catálogo

   Dependências externas mantidas:
     window.I18N         (i18n.js)
     window.InBarberAPI  (api.js — modo 'api')
     window.CampoTelefone (telefone.js — apenas produtos.html)

   MODO = 'mock' → tudo em localStorage (sem back-end)
   MODO = 'api'  → delega em window.InBarberAPI (Flask/MySQL)
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     BLOCO 1 — CAMADA DE DADOS (window.ProdutosData)
     Antes: js/produtos-data.js
  ══════════════════════════════════════════════════════════════ */

  /* ─── 1. CHAVES DE SESSÃO ──────────────────────────────────── */
  var K_CART = 'inbarber.carrinho_produtos';
  var K_LAST = 'inbarber.ultima_reserva';

    var CATEGORIAS = [
    { id: 'todos',      i18n: 'prod.cat_all' },
    { id: 'pomadas',    i18n: 'prod.cat_pomadas' },
    { id: 'cabelo',     i18n: 'prod.cat_cabelo' },
    { id: 'barba',      i18n: 'prod.cat_barba' },
    { id: 'acessorios', i18n: 'prod.cat_acessorios' }
  ];

  /* ─── 2. HELPERS DE SESSÃO ──────────────────────────────────── */
  function readJSON(store, key, fallback) {
    try {
      var raw = store.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function writeJSON(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  /* ─── 3. CAMADA API ─────────────────────────────────────────── */
  var lang = function () {
    return (window.I18N && window.I18N.lang) || 'pt';
  };

  function traduzir(p) {
    var l    = lang();
    var trad = (l !== 'pt' && p && p.i18n && p.i18n[l]) || null;
    if (!trad) return p;
    var copia = {};
    for (var k in p) { if (Object.prototype.hasOwnProperty.call(p, k)) copia[k] = p[k]; }
    copia.nome      = trad[0];
    copia.descricao = trad[1];
    return copia;
  }

  function traduzirLista(ps) {
    return (ps || []).map(traduzir);
  }

  function API() {
    if (!window.InBarberAPI) throw new Error('js/api.js não foi carregado nesta página.');
    return window.InBarberAPI;
  }

  var impl = {
    listar:           function ()      { return API().listProducts({ disponivel: true }).then(traduzirLista); },
    listarTodos:      function ()      { return API().listProducts().then(traduzirLista); },
    obter:            function (id)    { return API().getProduct(id).then(traduzir); },
    atualizar:        function (id, d) { return API().updateProduct(id, d).then(traduzir); },
    criar:            function (d)     { return API().createProduct(d).then(traduzir); },
    criarReserva:     function (dados) { return API().createProductReservation(dados); },
    listarReservas:   function (e)     { return API().listProductReservations(e ? { estado: e } : {}); },
    obterReserva:     function (id)    { return API().getProductReservation(id); },
    confirmarReserva: function (id)    { return API().confirmProductReservation(id); },
    libertarReserva:  function (id)    { return API().releaseProductReservation(id); }
  };

  /* ─── 8. CARRINHO (sempre local — é estado de sessão) ──────── */
  var carrinho = {
    ler: function () {
      var itens = readJSON(sessionStorage, K_CART, []);
      return Array.isArray(itens) ? itens : [];
    },
    guardar: function (itens) {
      writeJSON(sessionStorage, K_CART, itens);
      document.dispatchEvent(new CustomEvent('carrinho:change', { detail: { itens: itens } }));
      return itens;
    },
    quantidadeDe: function (produtoId) {
      var it = carrinho.ler().filter(function (x) { return x.produtoId === produtoId; })[0];
      return it ? it.quantidade : 0;
    },
    definir: function (produtoId, quantidade) {
      var itens = carrinho.ler().filter(function (x) { return x.produtoId !== produtoId; });
      if (quantidade > 0) itens.push({ produtoId: produtoId, quantidade: quantidade });
      return carrinho.guardar(itens);
    },
    adicionar: function (produtoId, quantidade) {
      return carrinho.definir(produtoId, carrinho.quantidadeDe(produtoId) + (quantidade || 1));
    },
    remover: function (produtoId) { return carrinho.definir(produtoId, 0); },
    limpar:  function ()          { return carrinho.guardar([]); },
    contar:  function () {
      return carrinho.ler().reduce(function (s, i) { return s + i.quantidade; }, 0);
    },
    detalhar: function () {
      return impl.listarTodos().then(function (produtos) {
        var mapa = {};
        produtos.forEach(function (p) { mapa[p.id] = p; });
        var linhas = [];
        carrinho.ler().forEach(function (i) {
          var p = mapa[i.produtoId];
          if (!p || !p.ativo) return;
          var qtd = Math.min(i.quantidade, p.disponivel);
          if (qtd <= 0) return;
          linhas.push({
            produtoId: p.id, nome: p.nome, img: p.img,
            preco: p.precoFinal,
            precoTabela: p.emPromocao ? p.preco : null,
            emPromocao: p.emPromocao,
            descontoPct: p.descontoPct,
            categoria: p.categoria, disponivel: p.disponivel,
            quantidade: qtd, subtotal: +(p.precoFinal * qtd).toFixed(2)
          });
        });
        return linhas;
      });
    },
    total: function () {
      return carrinho.detalhar().then(function (linhas) {
        return +linhas.reduce(function (s, l) { return s + l.subtotal; }, 0).toFixed(2);
      });
    }
  };

  /* ─── 9. ÚLTIMA RESERVA (ponte para confirmacao.html) ──────── */
  var ultimaReserva = {
    guardar: function (reserva) { writeJSON(sessionStorage, K_LAST, reserva); },
    ler:     function ()        { return readJSON(sessionStorage, K_LAST, null); },
    limpar:  function ()        { try { sessionStorage.removeItem(K_LAST); } catch (_) {} }
  };

  /* ─── 10. UTILITÁRIOS ───────────────────────────────────────── */
  function fmtPreco(n) {
    return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',');
  }

  var GLIFOS = {
    pomadas:    '<path d="M9 3h6v3H9zM7.5 6h9l1 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6.5 19.5v-9z"/><path d="M9.5 13h5"/>',
    cabelo:     '<path d="M10 2.5h4l.8 3H9.2zM8.5 5.5h7l1 5v10a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7.5 20.5v-10z"/><path d="M9.5 11.5h5"/>',
    barba:      '<path d="M12 2.5c-3 3-4.5 5.5-4.5 9 0 4 2 8 4.5 10 2.5-2 4.5-6 4.5-10 0-3.5-1.5-6-4.5-9z"/><path d="M12 8v9"/>',
    acessorios: '<path d="M4 8h16v3H4z"/><path d="M6 11v9M9 11v9M12 11v9M15 11v9M18 11v9"/>',
    _:          '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M4 11h16M9 7V4h6v3"/>'
  };

  function placeholderHTML(categoria) {
    return '<div class="prod-thumb-ph" aria-hidden="true"><svg viewBox="0 0 24 24">' +
           (GLIFOS[categoria] || GLIFOS._) + '</svg></div>';
  }

  function nivelStock(produto) {
    if (!produto.stock) return 'baixo';
    var pct = produto.disponivel / produto.stock;
    if (pct > 0.5)  return 'alto';
    if (pct >= 0.1) return 'medio';
    return 'baixo';
  }

  /* ─── 11. EXPORT window.ProdutosData ───────────────────────── */
  var D = window.ProdutosData = {
    categorias: function () { return CATEGORIAS.slice(); },

    listar:           impl.listar,
    listarTodos:      impl.listarTodos,
    obter:            impl.obter,
    atualizar:        impl.atualizar,
    criar:            impl.criar,
    listarDestaques:  function () {
      return impl.listar().then(function (ps) {
        return ps.filter(function (p) { return p.destaque; });
      });
    },

    vitrine: function (n) {
      n = n || 4;
      return Promise.all([impl.listar(), impl.listarTodos()]).then(function (res) {
        var disponiveis = res[0];
        var todos       = res[1];

        var destaques = disponiveis.filter(function (p) { return p.destaque; });
        var resto     = disponiveis.filter(function (p) { return !p.destaque; });
        var fila      = destaques.concat(resto);

        fila.sort(function (a, b) {
          if (a.emPromocao !== b.emPromocao) return a.emPromocao ? -1 : 1;
          if (a.destaque   !== b.destaque)   return a.destaque   ? -1 : 1;
          return b.descontoPct - a.descontoPct;
        });

        var escolhidos = fila.slice(0, n);
        return {
          hero: escolhidos[0] || null,
          lado: escolhidos.slice(1),
          total: todos.length
        };
      });
    },

    criarReserva:     impl.criarReserva,
    listarReservas:   impl.listarReservas,
    obterReserva:     impl.obterReserva,
    confirmarReserva: impl.confirmarReserva,
    libertarReserva:  impl.libertarReserva,

    carrinho:      carrinho,
    ultimaReserva: ultimaReserva,
    fmtPreco:        fmtPreco,
    nivelStock:     nivelStock,
    placeholderHTML: placeholderHTML,

    reset: function () {
      try {
        sessionStorage.removeItem(K_CART);
        sessionStorage.removeItem(K_LAST);
      } catch (_) {}
    }
  };

  /* ══════════════════════════════════════════════════════════════
     BLOCO 2 — VITRINE DA LANDING (index.html)
     Antes: js/produtos-landing.js

     Só executa quando os elementos #produtos e #shop-showcase
     existem na página — exclusivo do index.html.
  ══════════════════════════════════════════════════════════════ */
  var secao  = document.getElementById('produtos');
  var caixa  = document.getElementById('shop-showcase');

  if (secao && caixa) {
    var t = function (key, vars) { return window.I18N ? window.I18N.t(key, vars) : key; };

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function thumbLanding(p, classe) {
      return p.img
        ? '<img class="' + classe + '" src="' + esc(p.img) + '" alt="" loading="lazy" ' +
          'decoding="async" data-ph="' + esc(p.categoria) + '">'
        : D.placeholderHTML(p.categoria);
    }

    function precoLanding(p, classe) {
      if (!p.emPromocao) {
        return '<span class="shop-price ' + classe + '">' + esc(D.fmtPreco(p.preco)) + '</span>';
      }
      return '' +
        '<span class="shop-price-was">' + esc(D.fmtPreco(p.preco)) + '</span>' +
        '<span class="shop-price ' + classe + ' is-promo">' + esc(D.fmtPreco(p.precoFinal)) + '</span>';
    }

    function seloLanding(p) {
      if (p.novo)                          return '<span class="shop-badge new">' + esc(t('prod.new')) + '</span>';
      if (p.emPromocao)                    return '<span class="shop-badge promo">−' + p.descontoPct + '%</span>';
      if (D.nivelStock(p) === 'baixo')     return '<span class="shop-badge low">' + esc(t('prod.low_stock')) + '</span>';
      if (p.destaque)                      return '<span class="shop-badge">' + esc(t('prod.featured')) + '</span>';
      return '';
    }

    function stockTxtLanding(p) {
      return p.disponivel + ' ' + t(p.disponivel === 1 ? 'prod.available' : 'prod.available_pl');
    }

    function heroHTML(p) {
      var poupa = p.emPromocao
        ? '<span class="shop-save">' + esc(t('prod.save', { valor: D.fmtPreco(p.preco - p.precoFinal) })) + '</span>'
        : '';

      return '' +
        '<article class="shop-hero">' +
          '<a class="shop-hero-media" href="produtos.html?cat=' + esc(p.categoria) + '" tabindex="-1" aria-hidden="true">' +
            thumbLanding(p, 'prod-thumb-img') + seloLanding(p) +
          '</a>' +
          '<div class="shop-hero-body">' +
            '<p class="shop-cat">' + esc(t('prod.cat_' + p.categoria)) + '</p>' +
            '<h3 class="shop-hero-name">' +
              '<a href="produtos.html?cat=' + esc(p.categoria) + '">' + esc(p.nome) + '</a>' +
            '</h3>' +
            '<p class="shop-hero-desc">' + esc(p.descricao) + '</p>' +
            '<div class="shop-price-row">' + precoLanding(p, 'lg') + poupa + '</div>' +
            '<div class="shop-hero-actions">' +
              '<button type="button" class="shop-add" data-add="' + p.id + '">' +
                esc(t('prod.add')) +
                '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                  '<path d="M2.5 7h9M8 3.5L11.5 7 8 10.5"/></svg>' +
              '</button>' +
              '<p class="shop-stock">' + esc(stockTxtLanding(p)) + '</p>' +
            '</div>' +
          '</div>' +
        '</article>';
    }

    function miniHTML(p) {
      return '' +
        '<li class="shop-mini">' +
          '<a class="shop-mini-link" href="produtos.html?cat=' + esc(p.categoria) + '">' +
            '<span class="shop-mini-thumb">' + thumbLanding(p, 'prod-thumb-img') + seloLanding(p) + '</span>' +
            '<span class="shop-mini-info">' +
              '<span class="shop-cat">' + esc(t('prod.cat_' + p.categoria)) + '</span>' +
              '<span class="shop-mini-name">' + esc(p.nome) + '</span>' +
              '<span class="shop-price-row">' + precoLanding(p, 'sm') + '</span>' +
            '</span>' +
          '</a>' +
          '<button type="button" class="shop-mini-add" data-add="' + p.id + '" ' +
            'aria-label="' + esc(t('prod.add')) + ' — ' + esc(p.nome) + '">' +
            '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
              '<path d="M7 2.5v9M2.5 7h9"/></svg>' +
          '</button>' +
        '</li>';
    }

    function observarLanding() {
      var alvos = Array.prototype.slice.call(caixa.querySelectorAll('.shop-hero, .shop-mini'));
      if (!('IntersectionObserver' in window)) {
        alvos.forEach(function (c) { c.classList.add('in'); });
        return;
      }
      var io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = alvos.indexOf(e.target);
          e.target.style.transitionDelay = (i > 0 ? i * 0.07 : 0) + 's';
          e.target.classList.add('in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      alvos.forEach(function (c) { io.observe(c); });
    }

    function renderLanding() {
      return D.vitrine(4).then(function (v) {
        if (!v.hero) { secao.hidden = true; return; }

        caixa.innerHTML =
          heroHTML(v.hero) +
          (v.lado.length
            ? '<ul class="shop-side" role="list">' + v.lado.map(miniHTML).join('') + '</ul>'
            : '');
        secao.hidden = false;

        Array.prototype.forEach.call(caixa.querySelectorAll('.prod-thumb-img'), function (img) {
          img.addEventListener('error', function () {
            var box  = img.parentNode;
            var flag = box.querySelector('.shop-badge');
            box.innerHTML = D.placeholderHTML(img.dataset.ph) + (flag ? flag.outerHTML : '');
          });
        });

        observarLanding();
      }).catch(function (err) {
        console.error('[produtos-landing]', err);
        secao.hidden = true;
      });
    }

    caixa.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add]');
      if (!btn) return;
      e.preventDefault();
      var prodId = btn.dataset.add;

      function adicionarEIr() {
        D.carrinho.adicionar(prodId, 1);
        window.location.href = 'produtos.html?cat=todos';
      }

      if (window.AuthModal) {
        window.AuthModal.guard(adicionarEIr, 'produto');
      } else {
        adicionarEIr();
      }
    });

    document.addEventListener('i18n:change', renderLanding);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderLanding);
    } else {
      renderLanding();
    }
  }

  /* ══════════════════════════════════════════════════════════════
     BLOCO 3 — UI DO CATÁLOGO (produtos.html)
     Antes: js/produtos.js

     Só executa quando o elemento #prod-grid existe na página —
     exclusivo do produtos.html.
  ══════════════════════════════════════════════════════════════ */
  if (!document.getElementById('prod-grid')) return;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var tCat = function (key, vars) {
    return window.I18N ? window.I18N.t(key, vars) : key;
  };

  function escCat(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Alias local para não poluir o escopo do bloco anterior */
  var esc = escCat;
  var t   = tCat;

  function categoriaInicial() {
    try {
      var q = new URLSearchParams(location.search).get('cat');
      var existe = D.categorias().some(function (c) { return c.id === q; });
      return existe ? q : 'todos';
    } catch (_) { return 'todos'; }
  }

  var state = {
    categoria: categoriaInicial(),
    produtos: [],
    qtd: {},
    sheetAberto: false,
    passo: 1,
    ultimoFoco: null
  };

  var K_CLIENTE  = 'inbarber.cliente';
  var placeholder = D.placeholderHTML;

  /* ── Filtros ── */
  function renderFiltros() {
    var wrap = $('#prod-filters');
    if (!wrap) return;
    wrap.innerHTML = D.categorias().map(function (c) {
      return '<button type="button" role="tab" class="filter-chip' +
             (c.id === state.categoria ? ' active' : '') +
             '" data-cat="' + c.id + '" aria-selected="' + (c.id === state.categoria) + '">' +
             esc(t(c.i18n)) + '</button>';
    }).join('');

    $$('.filter-chip', wrap).forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.categoria = chip.dataset.cat;
        renderFiltros();
        renderGrelha();
      });
    });
  }

  /* ── Grelha de produtos ── */
  function cardHTML(p) {
    var noCarrinho = D.carrinho.quantidadeDe(p.id);
    var qtd  = state.qtd[p.id] || 1;
    var max  = p.disponivel;
    var nivel = D.nivelStock(p);
    var catLabel = t('prod.cat_' + p.categoria);

    var flag = '';
    if (p.novo)              flag = '<span class="prod-flag new">' + esc(t('prod.new')) + '</span>';
    else if (p.emPromocao)   flag = '<span class="prod-flag promo">−' + p.descontoPct + '%</span>';
    else if (nivel === 'baixo') flag = '<span class="prod-flag low">' + esc(t('prod.low_stock')) + '</span>';
    else if (p.destaque)     flag = '<span class="prod-flag">' + esc(t('prod.featured')) + '</span>';

    var precoHTML = p.emPromocao
      ? '<p class="prod-price is-promo">' +
          '<s class="prod-price-was">' + esc(D.fmtPreco(p.preco)) + '</s> ' +
          esc(D.fmtPreco(p.precoFinal)) +
        '</p>'
      : '<p class="prod-price">' + esc(D.fmtPreco(p.preco)) + '</p>';

    var thumb = p.img
      ? '<img class="prod-thumb-img" src="' + esc(p.img) + '" alt="' + esc(p.nome) +
        '" loading="lazy" decoding="async" data-ph="' + esc(p.categoria) + '">'
      : placeholder(p.categoria);

    return '' +
      '<li class="prod-card' + (noCarrinho ? ' in-cart' : '') + '" data-id="' + p.id + '">' +
        '<div class="prod-thumb">' + thumb + flag + '</div>' +
        '<div class="prod-body">' +
          '<p class="prod-cat">' + esc(catLabel) + '</p>' +
          '<h2 class="prod-name">' + esc(p.nome) + '</h2>' +
          '<p class="prod-desc">' + esc(p.descricao) + '</p>' +
          precoHTML +
          '<p class="prod-stock-txt" data-nivel="' + nivel + '">' + p.disponivel + ' ' +
            esc(t(p.disponivel === 1 ? 'prod.available' : 'prod.available_pl')) + '</p>' +
        '</div>' +
        '<div class="prod-foot">' +
          '<div class="qty">' +
            '<button type="button" class="qty-btn" data-step="-1" aria-label="' + esc(t('prod.less')) + '"' +
              (qtd <= 1 ? ' disabled' : '') + '>' +
              '<svg viewBox="0 0 12 12"><path d="M2 6h8"/></svg></button>' +
            '<span class="qty-val" aria-live="polite">' + qtd + '</span>' +
            '<button type="button" class="qty-btn" data-step="1" aria-label="' + esc(t('prod.more')) + '"' +
              (qtd >= max ? ' disabled' : '') + '>' +
              '<svg viewBox="0 0 12 12"><path d="M6 2v8M2 6h8"/></svg></button>' +
          '</div>' +
          '<button type="button" class="prod-add" data-add="' + p.id + '">' +
            esc(t('prod.add')) +
          '</button>' +
        '</div>' +
      '</li>';
  }

  function renderGrelha() {
    var grid  = $('#prod-grid');
    var vazio = $('#prod-empty');
    if (!grid) return;

    var lista = state.categoria === 'todos'
      ? state.produtos
      : state.produtos.filter(function (p) { return p.categoria === state.categoria; });

    grid.innerHTML = lista.map(cardHTML).join('');
    grid.hidden = lista.length === 0;
    if (vazio) vazio.hidden = lista.length > 0;

    $$('.prod-thumb-img', grid).forEach(function (img) {
      img.addEventListener('error', function () {
        var box  = img.parentNode;
        var flag = $('.prod-flag', box);
        box.innerHTML = placeholder(img.dataset.ph) + (flag ? flag.outerHTML : '');
      });
    });
  }

  function ligarGrelha() {
    var grid = $('#prod-grid');
    if (!grid) return;

    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.prod-card');
      if (!card) return;
      var id = card.dataset.id;
      var p  = state.produtos.filter(function (x) { return x.id === id; })[0];
      if (!p) return;

      var stepBtn = e.target.closest('.qty-btn');
      if (stepBtn) {
        var passo = parseInt(stepBtn.dataset.step, 10);
        var atual = state.qtd[id] || 1;
        state.qtd[id] = Math.min(p.disponivel, Math.max(1, atual + passo));
        atualizarStepper(card, p);
        return;
      }

      var addBtn = e.target.closest('[data-add]');
      if (addBtn) {
        var q = Math.min(state.qtd[id] || 1, p.disponivel);
        var jaTem = D.carrinho.quantidadeDe(id);
        if (jaTem + q > p.disponivel) {
          toast(t('prod.err_stock', { nome: p.nome }), true);
          return;
        }
        D.carrinho.adicionar(id, q);
        card.classList.add('in-cart');
        feedbackAdd(addBtn);
      }
    });
  }

  function atualizarStepper(card, p) {
    var q   = state.qtd[p.id] || 1;
    var val = $('.qty-val', card);
    if (val) val.textContent = q;
    var btns = $$('.qty-btn', card);
    if (btns[0]) btns[0].disabled = q <= 1;
    if (btns[1]) btns[1].disabled = q >= p.disponivel;
  }

  function feedbackAdd(btn) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    var original = btn.innerHTML;
    btn.classList.add('is-added');
    btn.innerHTML = '<svg viewBox="0 0 14 14"><polyline points="3,7.5 6,10.5 11,4"/></svg>' + esc(t('prod.added'));
    setTimeout(function () {
      btn.classList.remove('is-added');
      btn.innerHTML = original;
      delete btn.dataset.busy;
    }, 1400);
  }

  /* ── Carrinho ── */
  function renderCarrinho() {
    return D.carrinho.detalhar().then(function (linhas) {
      var lista  = $('#cart-list');
      var vazio  = $('#cart-empty');
      var count  = D.carrinho.contar();
      var total  = linhas.reduce(function (s, l) { return s + l.subtotal; }, 0);

      if (lista) {
        lista.innerHTML = linhas.map(function (l) {
          return '' +
            '<li class="cart-item" data-id="' + l.produtoId + '">' +
              '<div>' +
                '<p class="cart-item-name">' + esc(l.nome) + '</p>' +
                '<p class="cart-item-unit">' +
                  (l.precoTabela ? '<s>' + esc(D.fmtPreco(l.precoTabela)) + '</s> ' : '') +
                  esc(D.fmtPreco(l.preco)) + ' · ' + esc(t('prod.unit')) + '</p>' +
              '</div>' +
              '<span class="cart-item-price">' + esc(D.fmtPreco(l.subtotal)) + '</span>' +
              '<div class="cart-item-ctl">' +
                '<div class="qty">' +
                  '<button type="button" class="qty-btn" data-cart-step="-1" aria-label="' + esc(t('prod.less')) + '">' +
                    '<svg viewBox="0 0 12 12"><path d="M2 6h8"/></svg></button>' +
                  '<span class="qty-val">' + l.quantidade + '</span>' +
                  '<button type="button" class="qty-btn" data-cart-step="1" aria-label="' + esc(t('prod.more')) + '"' +
                    (l.quantidade >= l.disponivel ? ' disabled' : '') + '>' +
                    '<svg viewBox="0 0 12 12"><path d="M6 2v8M2 6h8"/></svg></button>' +
                '</div>' +
                '<button type="button" class="cart-remove" data-cart-remove>' + esc(t('prod.remove')) + '</button>' +
              '</div>' +
            '</li>';
        }).join('');
      }

      if (vazio) vazio.hidden = linhas.length > 0;

      var elCount = $('#cart-count');
      if (elCount) elCount.textContent = count;

      var elTotal = $('#cart-total');
      if (elTotal) elTotal.textContent = D.fmtPreco(total);

      var cta = $('#cart-cta');
      if (cta) cta.disabled = linhas.length === 0;

      var bar = $('#cart-bar');
      if (bar) bar.classList.toggle('visible', count > 0 && !state.sheetAberto);
      var bc = $('#cart-bar-count'); if (bc) bc.textContent = count;
      var bt = $('#cart-bar-total'); if (bt) bt.textContent = D.fmtPreco(total);
      var bl = $('#cart-bar-label');
      if (bl) bl.textContent = t(count === 1 ? 'prod.cart_item' : 'prod.cart_items');

      $$('.prod-card').forEach(function (card) {
        card.classList.toggle('in-cart', D.carrinho.quantidadeDe(card.dataset.id) > 0);
      });

      return linhas;
    });
  }

  function ligarCarrinho() {
    var lista = $('#cart-list');
    if (lista) {
      lista.addEventListener('click', function (e) {
        var item = e.target.closest('.cart-item');
        if (!item) return;
        var id = item.dataset.id;

        if (e.target.closest('[data-cart-remove]')) {
          D.carrinho.remover(id);
          return;
        }
        var step = e.target.closest('[data-cart-step]');
        if (step) {
          var delta = parseInt(step.dataset.cartStep, 10);
          var nova  = D.carrinho.quantidadeDe(id) + delta;
          var p     = state.produtos.filter(function (x) { return x.id === id; })[0];
          if (p && nova > p.disponivel) return;
          D.carrinho.definir(id, Math.max(0, nova));
        }
      });
    }

    var barBtn = $('#cart-bar-btn');
    if (barBtn) barBtn.addEventListener('click', abrirSheet);

    var close = $('#cart-close');
    if (close) close.addEventListener('click', fecharSheet);

    var backdrop = $('#cart-backdrop');
    if (backdrop) backdrop.addEventListener('click', fecharSheet);

    var cta = $('#cart-cta');
    if (cta) {
      cta.addEventListener('click', function () {
        if (window.AuthModal) {
          window.AuthModal.guard(abrirModal);
        } else {
          abrirModal();
        }
      });
    }

    document.addEventListener('carrinho:change', function () { renderCarrinho(); });
  }

  function abrirSheet() {
    var panel    = $('#cart-panel');
    var backdrop = $('#cart-backdrop');
    if (!panel) return;
    state.sheetAberto = true;
    panel.classList.add('open');
    if (backdrop) {
      backdrop.hidden = false;
      requestAnimationFrame(function () { backdrop.classList.add('visible'); });
    }
    var bar = $('#cart-bar');
    if (bar) bar.classList.remove('visible');
    var close = $('#cart-close');
    if (close) close.focus();
  }

  function fecharSheet() {
    var panel    = $('#cart-panel');
    var backdrop = $('#cart-backdrop');
    state.sheetAberto = false;
    if (panel)    panel.classList.remove('open');
    if (backdrop) {
      backdrop.classList.remove('visible');
      setTimeout(function () { backdrop.hidden = true; }, 240);
    }
    renderCarrinho();
  }

  /* ── Telefone ── */
  var telefone = null;

  function ligarTelefone() {
    var box   = $('#tel-box');
    var input = $('#f-tel');
    if (!box || !input || !window.CampoTelefone) return;

    telefone = window.CampoTelefone.ligar({
      box: box,
      input: input,
      iso: paisGuardado(),
      onChange: function () { validarTel(false); }
    });
  }

  function paisGuardado() {
    try {
      var c = JSON.parse(localStorage.getItem(K_CLIENTE) || 'null');
      return (c && c.pais) || 'BR';
    } catch (_) { return 'BR'; }
  }

  /* ── Validação do nome ── */
  var RE_DIGITO   = /[0-9]/;
  var RE_PROIBIDO = /[0-9_@#$%^&*()+=\[\]{}<>\/\\|~`]/g;

  function limparNome(v) {
    return String(v || '').replace(RE_PROIBIDO, '');
  }

  var avisoNomeAte = 0;

  function ligarFiltroNome(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      var antes  = input.value;
      var depois = limparNome(antes);
      if (depois === antes) return;

      var pos = input.selectionStart - (antes.length - depois.length);
      input.value = depois;
      try { input.setSelectionRange(pos, pos); } catch (_) {}

      marcarErro(input, RE_DIGITO.test(antes) ? t('prod.err_name_digits') : t('prod.err_name_chars'));
      avisoNomeAte = Date.now() + 2600;
      setTimeout(function () { validarNome(false); }, 2700);
    });
  }

  /* ── Validação ── */
  function campoDe(input) { return input.closest('.field'); }

  function marcarErro(input, mensagem) {
    var campo = campoDe(input);
    if (!campo) return false;
    var err = $('.field-err', campo);
    campo.classList.toggle('invalid', !!mensagem);
    input.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
    if (err) err.textContent = mensagem || '';
    return !mensagem;
  }

  function validarNome(mostrar) {
    var el     = $('#f-nome');
    var v      = el.value.trim();
    var letras = v.replace(/[^\p{L}]/gu, '').length;
    var msg = !v ? t('prod.err_name')
            : RE_DIGITO.test(v) ? t('prod.err_name_digits')
            : letras < 2 ? t('prod.err_name_short')
            : '';
    if (!mostrar && Date.now() < avisoNomeAte) return !msg;
    if (mostrar || campoDe(el).classList.contains('invalid')) marcarErro(el, msg);
    return !msg;
  }

  function validarTel(mostrar) {
    var el = $('#f-tel');
    if (!telefone) return true;
    var msg = telefone.vazio() ? t('prod.err_tel')
            : !telefone.valido() ? t('prod.err_tel_short')
            : '';
    if (mostrar || campoDe(el).classList.contains('invalid')) marcarErro(el, msg);
    return !msg;
  }

  function validarTudo() {
    var okNome = validarNome(true);
    var okTel  = validarTel(true);
    if (!okNome) { $('#f-nome').focus(); return false; }
    if (!okTel)  { $('#f-tel').focus();  return false; }
    return true;
  }

  /* ── Modal de reserva — dois passos ── */
  function irParaPasso(n) {
    state.passo = n;
    var dados   = $('#pane-dados');
    var revisao = $('#pane-revisao');
    if (dados)   dados.hidden   = n !== 1;
    if (revisao) revisao.hidden = n !== 2;

    $$('.prod-step').forEach(function (li) {
      var i = parseInt(li.dataset.step, 10);
      li.classList.toggle('is-active', i === n);
      li.classList.toggle('is-done', i < n);
    });

    var box = $('.prod-modal-box');
    if (box) box.scrollTop = 0;
  }

  function abrirModal() {
    var modal = $('#res-modal');
    if (!modal) return;
    if (D.carrinho.contar() === 0) return;

    state.ultimoFoco = document.activeElement;
    fecharSheet();

    modal.hidden = false;
    irParaPasso(1);
    preencherComPerfil();
    requestAnimationFrame(function () { modal.classList.add('visible'); });
    setTimeout(function () {
      var nome = $('#f-nome');
      if (nome) nome.focus();
    }, 260);
  }

  function fecharModal() {
    var modal = $('#res-modal');
    if (!modal) return;
    modal.classList.remove('visible');
    setTimeout(function () { modal.hidden = true; }, 300);
    if (state.ultimoFoco && state.ultimoFoco.focus) state.ultimoFoco.focus();
  }

  function preencherComPerfil() {
    var nome = $('#f-nome'), tel = $('#f-tel');
    if (!nome || !tel) return;

    /* 1. Preenche imediatamente com o que já estiver guardado localmente
          (última reserva feita — evita a pessoa digitar o nome de novo) */
    try {
      var guardado = JSON.parse(localStorage.getItem(K_CLIENTE) || 'null');
      if (guardado) {
        if (!nome.value) nome.value = limparNome(guardado.nome || '');
        if (!tel.value && telefone) {
          telefone.definir(guardado.e164 || guardado.tel || '');
        }
      }
    } catch (_) {}

    /* 2. Enriquece com os dados reais da conta, se houver token */
    var token = '';
    try { token = localStorage.getItem('inbarber_token') || ''; } catch (_) {}
    if (!token || !window.InBarberAPI) return;

    window.InBarberAPI.getMe && window.InBarberAPI.getMe()
      .then(function (data) {
        var u = (data && data.usuario) || {};
        if (!nome.value && (u.primeiroNome || u.nomeCompleto)) {
          nome.value = limparNome(u.nomeCompleto || u.primeiroNome || '');
        }
        if (!tel.value && u.telefone && telefone) {
          telefone.definir(u.telefone);
        }
      })
      .catch(function () { /* silencia — campos já estão com o guardado local */ });
  }

  function guardarCliente(nome) {
    try {
      localStorage.setItem(K_CLIENTE, JSON.stringify({
        nome: nome,
        pais: telefone ? telefone.pais().iso : 'BR',
        e164: telefone ? telefone.e164() : ''
      }));
    } catch (_) {}
  }

  function renderRevisao() {
    return D.carrinho.detalhar().then(function (linhas) {
      var lista = $('#rev-list');
      if (lista) {
        lista.innerHTML = linhas.map(function (l) {
          return '' +
            '<li class="rev-item">' +
              '<div class="rev-item-main">' +
                '<span class="rev-item-qtd">' + l.quantidade + '×</span>' +
                '<span class="rev-item-nome">' + esc(l.nome) + '</span>' +
              '</div>' +
              '<div class="rev-item-num">' +
                '<span class="rev-item-unit">' +
                  (l.precoTabela ? '<s>' + esc(D.fmtPreco(l.precoTabela)) + '</s> ' : '') +
                  esc(D.fmtPreco(l.preco)) + ' ' + esc(t('prod.each')) +
                '</span>' +
                '<span class="rev-item-sub">' + esc(D.fmtPreco(l.subtotal)) + '</span>' +
              '</div>' +
            '</li>';
        }).join('');
      }

      var total    = linhas.reduce(function (s, l) { return s + l.subtotal; }, 0);
      var cheio    = linhas.reduce(function (s, l) {
        return s + (l.precoTabela || l.preco) * l.quantidade;
      }, 0);
      var poupanca = +(cheio - total).toFixed(2);
      var pecas    = linhas.reduce(function (s, l) { return s + l.quantidade; }, 0);

      var totais = $('#rev-totais');
      if (totais) {
        totais.innerHTML =
          '<div class="rev-linha">' +
            '<span>' + esc(t('prod.subtotal')) + ' · ' + pecas + ' ' +
              esc(t(pecas === 1 ? 'prod.piece' : 'prod.pieces')) + '</span>' +
            '<span>' + esc(D.fmtPreco(cheio)) + '</span>' +
          '</div>' +
          (poupanca > 0
            ? '<div class="rev-linha is-desconto">' +
                '<span>' + esc(t('prod.discount')) + '</span>' +
                '<span>−' + esc(D.fmtPreco(poupanca)) + '</span>' +
              '</div>'
            : '') +
          '<div class="rev-linha is-total">' +
            '<span>' + esc(t('prod.total')) + '</span>' +
            '<strong>' + esc(D.fmtPreco(total)) + '</strong>' +
          '</div>';
      }

      var dados = $('#rev-cliente-dados');
      if (dados) {
        var obs = $('#f-obs').value.trim();
        dados.innerHTML =
          '<div class="rev-dado"><dt>' + esc(t('prod.field_name')) + '</dt>' +
            '<dd>' + esc($('#f-nome').value.trim()) + '</dd></div>' +
          '<div class="rev-dado"><dt>' + esc(t('prod.field_tel')) + '</dt>' +
            '<dd>' + esc(telefone ? telefone.formatado() : $('#f-tel').value.trim()) + '</dd></div>' +
          (obs
            ? '<div class="rev-dado"><dt>' + esc(t('prod.field_obs')) + '</dt>' +
              '<dd>' + esc(obs) + '</dd></div>'
            : '');
      }

      return linhas;
    });
  }

  function ligarModal() {
    var modal = $('#res-modal');
    if (!modal) return;

    var closeBtn = $('#res-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', fecharModal);

    var back = $('#res-modal-backdrop');
    if (back) back.addEventListener('click', fecharModal);

    modal.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focaveis = $$('button, input, textarea, a[href]', modal)
        .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
      if (!focaveis.length) return;
      var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    });

    ligarTelefone();
    ligarFiltroNome($('#f-nome'));

    var nome = $('#f-nome'), tel = $('#f-tel'), obs = $('#f-obs');
    if (nome) {
      nome.addEventListener('blur',  function () { validarNome(true); });
      nome.addEventListener('input', function () { validarNome(false); });
    }
    if (tel) {
      tel.addEventListener('blur',  function () { validarTel(true); });
      tel.addEventListener('input', function () { validarTel(false); });
    }
    if (obs) {
      var contador = $('#obs-count');
      var atualizaContador = function () {
        if (contador) contador.textContent = obs.value.length + '/' + (obs.maxLength || 200);
      };
      obs.addEventListener('input', atualizaContador);
      atualizaContador();
    }

    var form = $('#res-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validarTudo()) return;
        renderRevisao().then(function (linhas) {
          if (!linhas.length) { fecharModal(); return; }
          irParaPasso(2);
          var confirmar = $('#res-submit');
          if (confirmar) confirmar.focus();
        });
      });
    }

    [$('#res-back'), $('#res-edit')].forEach(function (b) {
      if (!b) return;
      b.addEventListener('click', function () {
        irParaPasso(1);
        var n = $('#f-nome');
        if (n) n.focus();
      });
    });

    var submit = $('#res-submit');
    if (submit) submit.addEventListener('click', confirmar);
  }

  /* ── Criação da reserva ── */
  function confirmar() {
    var erroBox = $('#res-error');
    if (erroBox) erroBox.hidden = true;

    var btn      = $('#res-submit');
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
      '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>' +
      '<span>' + esc(t('prod.sending')) + '</span>';

    var nome = $('#f-nome').value.trim();
    var tel  = telefone ? telefone.formatado() : $('#f-tel').value.trim();

    D.carrinho.detalhar()
      .then(function (linhas) {
        return D.criarReserva({
          clienteNome: nome,
          clienteTel:  tel,
          clienteTelE164: telefone ? telefone.e164() : '',
          clientePais: telefone ? telefone.pais().iso : '',
          observacoes: $('#f-obs').value.trim(),
          agendamentoId: null,
          itens: linhas.map(function (l) {
            return { produtoId: l.produtoId, quantidade: l.quantidade };
          })
        });
      })
      .then(function (reserva) {
        guardarCliente(nome);
        D.ultimaReserva.guardar(reserva);
        D.carrinho.limpar();
        window.location.href = 'confirmacao.html?modo=produto';
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.innerHTML = original;
        if (erroBox) {
          erroBox.textContent = err && err.message ? err.message : t('prod.err_generic');
          erroBox.hidden = false;
        }
        carregar().then(renderRevisao);
      });
  }

  /* ── Toast ── */
  var toastTimer = null;
  function toast(msg, isErro) {
    var el = $('#prod-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('err', !!isErro);
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('visible'); }, 2600);
  }

  /* ── Arranque ── */
  function carregar() {
    return D.listar().then(function (produtos) {
      state.produtos = produtos;
      var sk = $('#prod-skeleton');
      if (sk) sk.remove();
      renderFiltros();
      renderGrelha();
      return renderCarrinho();
    }).catch(function (err) {
      console.error('[produtos]', err);
      var sk = $('#prod-skeleton');
      if (sk) sk.remove();
      var vazio = $('#prod-empty');
      if (vazio) { vazio.hidden = false; vazio.textContent = t('prod.err_load'); }
    });
  }

  function boot() {
    var back = $('#back-btn');
    if (back) back.addEventListener('click', function () { window.location.href = 'index.html'; });

    ligarGrelha();
    ligarCarrinho();
    ligarModal();

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('.tel-drop:not([hidden])')) return;
      var modal = $('#res-modal');
      if (modal && !modal.hidden) { fecharModal(); return; }
      if (state.sheetAberto) fecharSheet();
    });

    document.addEventListener('i18n:change', function () {
      if (telefone) telefone.repintar();
      carregar();
    });

    carregar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();