/* ════════════════════════════════════════════════════════════════
   InBarber — PRODUTOS · Camada de dados

   Único ponto do front que sabe DE ONDE vêm os produtos e as
   reservas. A UI (produtos.js, confirmacao.js, agenda-crm.js,
   dashboard.js) nunca toca em localStorage nem em fetch — chama
   sempre window.ProdutosData e recebe uma Promise.

   MODO = 'mock' → tudo em localStorage (mockup, sem back-end)
   MODO = 'api'  → delega em window.InBarberAPI (Flask/MySQL)

   Para ligar ao back-end basta trocar a constante abaixo: as
   assinaturas e os formatos de retorno são idênticos nos dois modos.

   Estados de stock:
     disponível → reservado → confirmado (vendido)
                       ↓
                   libertado (no-show) → volta a disponível
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── 1. MODO ─────────────────────────────────────────────── */
  var MODO = 'api';            // 'mock' | 'api'

  /* ─── 2. CHAVES DE ARMAZENAMENTO ──────────────────────────── */
  var K_STOCK = 'inbarber.produtos_stock';        // ajustes de stock/reservado
  var K_RES   = 'inbarber.reservas_produtos';     // reservas (localStorage)
  var K_SEQ   = 'inbarber.reservas_seq';          // contador de nº de reserva
  var K_CART  = 'inbarber.carrinho_produtos';     // carrinho (sessionStorage)
  var K_LAST  = 'inbarber.ultima_reserva';        // p/ ecrã de confirmação

  /* ─── 3. CATÁLOGO (mock — futuramente GET /api/products) ────
     Campos que o CRM vai gerir por produto:
       ativo       → visível na loja
       destaque    → entra na vitrine da landing
       precoPromo  → preço promocional; null = sem promoção.
                     O desconto em % é calculado, não guardado.

     img: null → usa a convenção 'assets/produtos/<id>.jpg' (4:3).
     Trocar a fotografia de um produto é substituir esse ficheiro;
     pôr um caminho explícito em img também funciona. Se a imagem
     falhar, o card cai no ícone desenhado da categoria.
  ──────────────────────────────────────────────────────────── */
  var CATALOGO = [
    {
      id: 'prod_001',
      nome: 'Pomada Matte Black',
      descricao: 'Fixação forte, acabamento fosco. 100g.',
      i18n: {
        en: ['Matte Black Pomade', 'Strong hold, matte finish. 100g.'],
        es: ['Pomada Matte Black', 'Fijación fuerte, acabado mate. 100g.']
      },
      preco: 45.00, precoPromo: 36.00, stock: 12, reservado: 2,
      categoria: 'pomadas', img: null,
      destaque: true, ativo: true
    },
    {
      id: 'prod_002',
      nome: 'Shampoo Anticaspa Pro',
      descricao: 'Fórmula profissional de uso diário. 250ml.',
      i18n: {
        en: ['Anti-Dandruff Shampoo Pro', 'Professional daily formula. 250ml.'],
        es: ['Champú Anticaspa Pro', 'Fórmula profesional de uso diario. 250ml.']
      },
      preco: 38.00, precoPromo: null, stock: 8, reservado: 0,
      categoria: 'cabelo', img: null,
      destaque: true, ativo: true
    },
    {
      id: 'prod_003',
      nome: 'Óleo de Barba Premium',
      descricao: 'Hidrata e amacia. Aroma amadeirado. 30ml.',
      i18n: {
        en: ['Premium Beard Oil', 'Softens and hydrates. Woody scent. 30ml.'],
        es: ['Aceite de Barba Premium', 'Hidrata y suaviza. Aroma amaderado. 30ml.']
      },
      preco: 52.00, precoPromo: null, stock: 5, reservado: 1,
      categoria: 'barba', img: null,
      destaque: true, ativo: true
    },
    {
      id: 'prod_004',
      nome: 'Cera Modeladora',
      descricao: 'Fixação média com brilho natural. 80g.',
      i18n: {
        en: ['Styling Wax', 'Medium hold, natural shine. 80g.'],
        es: ['Cera Modeladora', 'Fijación media, brillo natural. 80g.']
      },
      preco: 35.00, precoPromo: null, stock: 15, reservado: 0,
      categoria: 'pomadas', img: null,
      destaque: false, ativo: true
    },
    {
      id: 'prod_005',
      nome: 'Bálsamo Pós-Barba',
      descricao: 'Acalma a pele depois da navalha. 100ml.',
      i18n: {
        en: ['After-Shave Balm', 'Calms the skin after the blade. 100ml.'],
        es: ['Bálsamo Post-Afeitado', 'Calma la piel tras la navaja. 100ml.']
      },
      preco: 42.00, precoPromo: 33.00, stock: 6, reservado: 4,
      categoria: 'barba', img: null,
      destaque: false, ativo: true
    },
    {
      id: 'prod_006',
      nome: 'Condicionador Fortalecedor',
      descricao: 'Reduz a quebra e dá corpo ao fio. 250ml.',
      i18n: {
        en: ['Strengthening Conditioner', 'Less breakage, more body. 250ml.'],
        es: ['Acondicionador Fortalecedor', 'Menos rotura, más cuerpo. 250ml.']
      },
      preco: 34.00, precoPromo: null, stock: 10, reservado: 3,
      categoria: 'cabelo', img: null,
      destaque: false, ativo: true
    },
    {
      id: 'prod_007',
      nome: 'Pente de Madeira',
      descricao: 'Pereira maciça, dentes polidos à mão.',
      i18n: {
        en: ['Wooden Comb', 'Solid pear wood, hand-polished teeth.'],
        es: ['Peine de Madera', 'Peral macizo, dientes pulidos a mano.']
      },
      preco: 28.00, precoPromo: null, stock: 20, reservado: 0,
      categoria: 'acessorios', img: null,
      destaque: false, ativo: true
    },
    {
      id: 'prod_008',
      nome: 'Kit Barba Completo',
      descricao: 'Óleo, bálsamo, escova e pente numa caixa.',
      i18n: {
        en: ['Complete Beard Kit', 'Oil, balm, brush and comb in one box.'],
        es: ['Kit de Barba Completo', 'Aceite, bálsamo, cepillo y peine en una caja.']
      },
      preco: 129.00, precoPromo: 99.00, stock: 4, reservado: 0,
      categoria: 'barba', img: null,
      destaque: true, ativo: true
    },
    {
      id: 'prod_009',
      nome: 'Talco Pós-Corte',
      descricao: 'Refresca e sela o acabamento. 120g.',
      i18n: {
        en: ['After-Cut Talc', 'Refreshes and seals the finish. 120g.'],
        es: ['Talco Post-Corte', 'Refresca y sella el acabado. 120g.']
      },
      preco: 22.00, precoPromo: null, stock: 3, reservado: 3,   /* esgotado — sai da grelha */
      categoria: 'acessorios', img: null,
      destaque: false, ativo: true
    }
  ];

  var CATEGORIAS = [
    { id: 'todos',      i18n: 'prod.cat_all' },
    { id: 'pomadas',    i18n: 'prod.cat_pomadas' },
    { id: 'cabelo',     i18n: 'prod.cat_cabelo' },
    { id: 'barba',      i18n: 'prod.cat_barba' },
    { id: 'acessorios', i18n: 'prod.cat_acessorios' }
  ];

  /* ─── 4. HELPERS DE ARMAZENAMENTO ─────────────────────────── */
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

  /* Ajustes de stock por cima do catálogo base: { prod_001: {stock, reservado} } */
  function readAjustes()      { return readJSON(localStorage, K_STOCK, {}); }
  function writeAjustes(a)    { writeJSON(localStorage, K_STOCK, a); }

  function readReservas()     { return readJSON(localStorage, K_RES, []); }
  function writeReservas(r)   { writeJSON(localStorage, K_RES, r); }

  /* ─── 5. NORMALIZAÇÃO ─────────────────────────────────────── */
  var lang = function () {
    return (window.I18N && window.I18N.lang) || 'pt';
  };

  /* Devolve uma cópia do produto com stock efetivo e textos no idioma ativo.

     'ajustes' guarda o que o CRM/dashboard mudou por cima do catálogo
     base: stock e reservado, mas também preço, promoção, destaque e
     ativo (ver mock.atualizar). Só as chaves presentes no ajuste
     sobrepõem o catálogo — o resto continua a vir de CATALOGO. */
  function hidratar(base, ajustes) {
    var aj    = ajustes[base.id] || {};
    var stock = typeof aj.stock === 'number' ? aj.stock : base.stock;
    var res   = typeof aj.reservado === 'number' ? aj.reservado : base.reservado;
    var l     = lang();
    var trad  = (l !== 'pt' && base.i18n && base.i18n[l]) || null;

    /* Campos editáveis: o ajuste ganha ao catálogo quando existe.
       'precoPromo' aceita null (tirar de promoção), por isso o teste
       é pela presença da chave e não pelo valor. */
    base = {
      id: base.id,
      nome:       'nome'       in aj ? aj.nome       : base.nome,
      descricao:  'descricao'  in aj ? aj.descricao  : base.descricao,
      preco:      'preco'      in aj ? aj.preco      : base.preco,
      precoPromo: 'precoPromo' in aj ? aj.precoPromo : base.precoPromo,
      categoria:  'categoria'  in aj ? aj.categoria  : base.categoria,
      destaque:   'destaque'   in aj ? aj.destaque   : base.destaque,
      ativo:      'ativo'      in aj ? aj.ativo      : base.ativo,
      img: base.img,
      i18n: base.i18n
    };

    /* Promoção: 'preco' é sempre o de tabela e 'precoFinal' é o que se
       cobra. Toda a UI mostra precoFinal e só risca 'preco' quando há
       desconto — assim nenhum ecrã pode somar o preço errado. */
    var promo = typeof base.precoPromo === 'number' && base.precoPromo > 0
             && base.precoPromo < base.preco;

    return {
      id: base.id,
      nome: trad ? trad[0] : base.nome,
      descricao: trad ? trad[1] : base.descricao,
      preco: base.preco,
      precoPromo: promo ? base.precoPromo : null,
      precoFinal: promo ? base.precoPromo : base.preco,
      emPromocao: promo,
      descontoPct: promo ? Math.round((1 - base.precoPromo / base.preco) * 100) : 0,
      stock: stock,
      reservado: res,
      disponivel: Math.max(0, stock - res),
      categoria: base.categoria,
      img: base.img || ('assets/produtos/' + base.id + '.jpg'),
      destaque: base.destaque,
      ativo: base.ativo
    };
  }

  function catalogoHidratado() {
    var ajustes = readAjustes();
    return CATALOGO.map(function (p) { return hidratar(p, ajustes); });
  }

  function proximoNumero() {
    var n = parseInt(localStorage.getItem(K_SEQ) || '0', 10) + 1;
    try { localStorage.setItem(K_SEQ, String(n)); } catch (_) {}
    return 'RES-' + String(n).padStart(3, '0');
  }

  function genId(prefixo) {
    return prefixo + Math.random().toString(36).slice(2, 10);
  }

  /* Erro com o mesmo formato dos de js/api.js (.status + .data), para
     que a UI trate mock e API exatamente da mesma maneira. */
  function erro(mensagem, status) {
    var e = new Error(mensagem);
    e.status = status || 400;
    e.data = { error: mensagem };
    return e;
  }

  /* Aplica um delta a stock/reservado de um produto */
  function mexerStock(produtoId, deltaStock, deltaReservado) {
    var ajustes = readAjustes();
    var base    = CATALOGO.filter(function (p) { return p.id === produtoId; })[0];
    if (!base) return;
    var atual = ajustes[produtoId] || { stock: base.stock, reservado: base.reservado };
    atual.stock     = Math.max(0, atual.stock + deltaStock);
    atual.reservado = Math.max(0, atual.reservado + deltaReservado);
    ajustes[produtoId] = atual;
    writeAjustes(ajustes);
  }

  /* ─── 6. IMPLEMENTAÇÃO MOCK ───────────────────────────────── */
  var mock = {
    listar: function () {
      return Promise.resolve(
        catalogoHidratado().filter(function (p) { return p.ativo && p.disponivel > 0; })
      );
    },

    listarTodos: function () {           // inclui esgotados — uso do CRM/dashboard
      return Promise.resolve(catalogoHidratado());
    },

    obter: function (id) {
      var p = catalogoHidratado().filter(function (x) { return x.id === id; })[0];
      return p ? Promise.resolve(p) : Promise.reject(new Error('Produto não encontrado'));
    },

    /* CRM/dashboard: preço, promoção, stock, destaque e ativo.
       Espelha o PATCH /api/products/:id do back-end, incluindo as
       duas recusas — promoção >= preço de tabela e stock abaixo do
       que já está reservado. */
    atualizar: function (id, dados) {
      dados = dados || {};
      var base = CATALOGO.filter(function (p) { return p.id === id; })[0];
      if (!base) return Promise.reject(erro('Produto não encontrado.', 404));

      var ajustes = readAjustes();
      var aj = ajustes[id] || {};
      var atual = hidratar(base, ajustes);

      var precoFinal  = 'preco'      in dados ? Number(dados.preco)      : atual.preco;
      var promoFinal  = 'precoPromo' in dados
        ? (dados.precoPromo === null || dados.precoPromo === '' ? null : Number(dados.precoPromo))
        : atual.precoPromo;
      var stockFinal  = 'stock'      in dados ? parseInt(dados.stock, 10) : atual.stock;

      if (isNaN(precoFinal) || precoFinal < 0)   return Promise.reject(erro('Preço inválido.', 400));
      if (promoFinal !== null && (isNaN(promoFinal) || promoFinal <= 0)) {
        return Promise.reject(erro('Preço promocional inválido.', 400));
      }
      if (promoFinal !== null && promoFinal >= precoFinal) {
        return Promise.reject(erro('O preço promocional tem de ser menor que o preço de tabela.', 400));
      }
      if (isNaN(stockFinal) || stockFinal < 0)   return Promise.reject(erro('Stock inválido.', 400));
      if (stockFinal < atual.reservado) {
        return Promise.reject(erro(
          'Já há ' + atual.reservado + ' unidade(s) reservada(s): o stock não pode ficar abaixo disso.', 409
        ));
      }

      aj.preco      = precoFinal;
      aj.precoPromo = promoFinal;
      aj.stock      = stockFinal;
      aj.reservado  = atual.reservado;
      if ('destaque'  in dados) aj.destaque  = !!dados.destaque;
      if ('ativo'     in dados) aj.ativo     = !!dados.ativo;
      if ('nome'      in dados) aj.nome      = String(dados.nome || '').trim() || atual.nome;
      if ('descricao' in dados) aj.descricao = String(dados.descricao || '').trim();
      if ('categoria' in dados) aj.categoria = String(dados.categoria || '').trim() || atual.categoria;

      ajustes[id] = aj;
      writeAjustes(ajustes);

      return Promise.resolve(hidratar(base, ajustes));
    },

    criarReserva: function (dados) {
      var itens = dados.itens || [];
      if (!itens.length) return Promise.reject(new Error('Carrinho vazio'));

      var catalogo = catalogoHidratado();
      var linhas   = [];

      /* Valida disponibilidade antes de mexer em seja o que for */
      for (var i = 0; i < itens.length; i++) {
        var it = itens[i];
        var p  = catalogo.filter(function (x) { return x.id === it.produtoId; })[0];
        if (!p)                        return Promise.reject(new Error('Produto indisponível'));
        if (it.quantidade > p.disponivel) {
          var err = new Error('Stock insuficiente para ' + p.nome);
          err.produtoId = p.id;
          return Promise.reject(err);
        }
        linhas.push({
          produtoId: p.id,
          nome: p.nome,
          quantidade: it.quantidade,
          preco: p.precoFinal,                    /* o que se cobra */
          precoTabela: p.emPromocao ? p.preco : null,
          subtotal: +(p.precoFinal * it.quantidade).toFixed(2)
        });
      }

      var reserva = {
        id: genId('res_'),
        numero: proximoNumero(),
        clienteNome: dados.clienteNome || '',
        clienteTel: dados.clienteTel || '',          /* legível: +55 (11) 98888-7777 */
        clienteTelE164: dados.clienteTelE164 || '',  /* para o CRM ligar/mandar WhatsApp */
        clientePais: dados.clientePais || '',
        produtos: linhas,
        agendamentoId: dados.agendamentoId || null,
        estado: 'reservado',
        dataReserva: new Date().toISOString(),
        observacoes: dados.observacoes || '',
        total: +linhas.reduce(function (s, l) { return s + l.subtotal; }, 0).toFixed(2),
        poupanca: +linhas.reduce(function (s, l) {
          return s + (l.precoTabela ? (l.precoTabela - l.preco) * l.quantidade : 0);
        }, 0).toFixed(2)
      };

      linhas.forEach(function (l) { mexerStock(l.produtoId, 0, +l.quantidade); });

      var todas = readReservas();
      todas.unshift(reserva);
      writeReservas(todas);

      return Promise.resolve(reserva);
    },

    listarReservas: function (estado) {
      var todas = readReservas();
      return Promise.resolve(
        estado ? todas.filter(function (r) { return r.estado === estado; }) : todas
      );
    },

    obterReserva: function (id) {
      var r = readReservas().filter(function (x) { return x.id === id || x.numero === id; })[0];
      return r ? Promise.resolve(r) : Promise.reject(new Error('Reserva não encontrada'));
    },

    /* Barbeiro entregou: reservado → confirmado (venda efetivada) */
    confirmarReserva: function (id) {
      return mutarReserva(id, 'reservado', 'confirmado', function (l) {
        mexerStock(l.produtoId, -l.quantidade, -l.quantidade);
      });
    },

    /* No-show / cancelamento: reservado → libertado (volta ao stock) */
    libertarReserva: function (id) {
      return mutarReserva(id, 'reservado', 'libertado', function (l) {
        mexerStock(l.produtoId, 0, -l.quantidade);
      });
    }
  };

  function mutarReserva(id, de, para, efeito) {
    var todas = readReservas();
    var alvo  = null;
    for (var i = 0; i < todas.length; i++) {
      if (todas[i].id === id || todas[i].numero === id) { alvo = todas[i]; break; }
    }
    if (!alvo)              return Promise.reject(new Error('Reserva não encontrada'));
    if (alvo.estado !== de) return Promise.reject(new Error('Reserva já está ' + alvo.estado));

    alvo.produtos.forEach(efeito);
    alvo.estado = para;
    alvo['data' + para.charAt(0).toUpperCase() + para.slice(1)] = new Date().toISOString();
    writeReservas(todas);
    return Promise.resolve(alvo);
  }

  /* ─── 7. IMPLEMENTAÇÃO API (back-end Flask) ───────────────────
     Endpoints ainda por criar em app.py. Assinaturas e formatos
     de retorno são iguais aos do mock, por isso trocar MODO para
     'api' não obriga a mexer em nenhum ficheiro de UI.
  ──────────────────────────────────────────────────────────────── */
  /* O back-end devolve o produto já com precoFinal/emPromocao/disponivel
     calculados, mais o objeto i18n cru. Quem escolhe o idioma continua a
     ser o front — a API não guarda estado de língua nenhum, e trocar de
     idioma não obriga a ir buscar o catálogo outra vez. */
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

  var api = {
    listar:           function ()      { return API().listProducts({ disponivel: true }).then(traduzirLista); },
    listarTodos:      function ()      { return API().listProducts().then(traduzirLista); },
    obter:            function (id)    { return API().getProduct(id).then(traduzir); },
    atualizar:        function (id, d) { return API().updateProduct(id, d).then(traduzir); },
    criarReserva:     function (dados) { return API().createProductReservation(dados); },
    listarReservas:   function (e)     { return API().listProductReservations(e ? { estado: e } : {}); },
    obterReserva:     function (id)    { return API().getProductReservation(id); },
    confirmarReserva: function (id)    { return API().confirmProductReservation(id); },
    libertarReserva:  function (id)    { return API().releaseProductReservation(id); }
  };

  function API() {
    if (!window.InBarberAPI) throw new Error('js/api.js não foi carregado nesta página.');
    return window.InBarberAPI;
  }

  var impl = MODO === 'api' ? api : mock;

  /* ─── 8. CARRINHO (sempre local — é estado de sessão) ─────── */
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
    /* Junta o carrinho ao catálogo: devolve linhas prontas para render */
    detalhar: function () {
      return impl.listarTodos().then(function (produtos) {
        var mapa = {};
        produtos.forEach(function (p) { mapa[p.id] = p; });
        var linhas = [];
        carrinho.ler().forEach(function (i) {
          var p = mapa[i.produtoId];
          if (!p) return;
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

  /* ─── 9. ÚLTIMA RESERVA (ponte para confirmacao.html) ─────── */
  var ultimaReserva = {
    guardar: function (reserva) { writeJSON(sessionStorage, K_LAST, reserva); },
    ler:     function ()        { return readJSON(sessionStorage, K_LAST, null); },
    limpar:  function ()        { try { sessionStorage.removeItem(K_LAST); } catch (_) {} }
  };

  /* ─── 10. UTILITÁRIOS ─────────────────────────────────────── */
  function fmtPreco(n) {
    return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',');
  }

  /* Ícone desenhado que faz de fotografia enquanto não houver assets.
     Vive aqui para o catálogo, a vitrine da landing e o CRM mostrarem
     exatamente o mesmo desenho. */
  var GLIFOS = {
    pomadas: '<path d="M9 3h6v3H9zM7.5 6h9l1 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6.5 19.5v-9z"/><path d="M9.5 13h5"/>',
    cabelo:  '<path d="M10 2.5h4l.8 3H9.2zM8.5 5.5h7l1 5v10a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7.5 20.5v-10z"/><path d="M9.5 11.5h5"/>',
    barba:   '<path d="M12 2.5c-3 3-4.5 5.5-4.5 9 0 4 2 8 4.5 10 2.5-2 4.5-6 4.5-10 0-3.5-1.5-6-4.5-9z"/><path d="M12 8v9"/>',
    acessorios: '<path d="M4 8h16v3H4z"/><path d="M6 11v9M9 11v9M12 11v9M15 11v9M18 11v9"/>',
    _: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M4 11h16M9 7V4h6v3"/>'
  };

  function placeholderHTML(categoria) {
    return '<div class="prod-thumb-ph" aria-hidden="true"><svg viewBox="0 0 24 24">' +
           (GLIFOS[categoria] || GLIFOS._) + '</svg></div>';
  }

  /* Semáforo de stock relativo ao total: alto / medio / baixo */
  function nivelStock(produto) {
    if (!produto.stock) return 'baixo';
    var pct = produto.disponivel / produto.stock;
    if (pct > 0.5)  return 'alto';
    if (pct >= 0.1) return 'medio';
    return 'baixo';
  }

  /* ─── 11. EXPORT ──────────────────────────────────────────── */
  window.ProdutosData = {
    MODO: MODO,
    categorias: function () { return CATEGORIAS.slice(); },

    listar:           impl.listar,
    listarTodos:      impl.listarTodos,
    obter:            impl.obter,
    atualizar:        impl.atualizar,
    listarDestaques:  function () {
      return impl.listar().then(function (ps) {
        return ps.filter(function (p) { return p.destaque; });
      });
    },

    /* Vitrine da landing: um produto em evidência e os restantes ao lado.
       Manda para a frente quem está em promoção — é isso que a secção
       existe para mostrar. Se não houver destaques com stock, completa
       com o resto do catálogo em vez de deixar a secção vazia. */
    vitrine: function (n) {
      n = n || 4;
      return impl.listar().then(function (ps) {
        var destaques = ps.filter(function (p) { return p.destaque; });
        var resto     = ps.filter(function (p) { return !p.destaque; });
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
          total: ps.length
        };
      });
    },

    criarReserva:     impl.criarReserva,
    listarReservas:   impl.listarReservas,
    obterReserva:     impl.obterReserva,
    confirmarReserva: impl.confirmarReserva,
    libertarReserva:  impl.libertarReserva,

    carrinho: carrinho,
    ultimaReserva: ultimaReserva,

    /* Implementação mock exposta de propósito: com MODO='api', é o
       plano B do dashboard quando o Flask está em baixo — mostra
       dados de demonstração em vez de uma secção vazia, sem que
       nenhum ecrã precise de saber onde os dados moram. */
    _mock: mock,

    fmtPreco: fmtPreco,
    nivelStock: nivelStock,
    placeholderHTML: placeholderHTML,

    /* Só para o mockup: repõe stock e apaga reservas */
    reset: function () {
      try {
        localStorage.removeItem(K_STOCK);
        localStorage.removeItem(K_RES);
        localStorage.removeItem(K_SEQ);
        sessionStorage.removeItem(K_CART);
        sessionStorage.removeItem(K_LAST);
      } catch (_) {}
    }
  };
})();