/* ════════════════════════════════════════════════════════════════
   InBarber — PRODUTOS · UI do catálogo

   Só trata de DOM. Todo o acesso a dados passa por
   window.ProdutosData (js/produtos-data.js).
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var D = window.ProdutosData;
  if (!D) { console.error('[produtos] js/produtos-data.js não carregou.'); return; }

  var t = function (key, vars) {
    return window.I18N ? window.I18N.t(key, vars) : key;
  };

  /* Categoria inicial: aceita produtos.html?cat=barba vindo da vitrine
     da landing, e ignora um valor que não exista. */
  function categoriaInicial() {
    try {
      var q = new URLSearchParams(location.search).get('cat');
      var existe = D.categorias().some(function (c) { return c.id === q; });
      return existe ? q : 'todos';
    } catch (_) { return 'todos'; }
  }

  /* ─── Estado da vista ─── */
  var state = {
    categoria: categoriaInicial(),
    produtos: [],          /* catálogo disponível, já hidratado */
    qtd: {},               /* quantidade escolhida em cada card, antes de ir ao carrinho */
    sheetAberto: false,
    passo: 1,              /* 1 = dados do cliente · 2 = revisão */
    ultimoFoco: null
  };

  /* Dados do último cliente, para não repetir a digitação na próxima */
  var K_CLIENTE = 'inbarber.cliente';

  /* Placeholder vem da camada de dados — o mesmo desenho na landing e aqui */
  var placeholder = D.placeholderHTML;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ══════════════════════════════════════════
     FILTROS
  ══════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════
     GRELHA DE PRODUTOS
  ══════════════════════════════════════════ */
  function cardHTML(p) {
    var noCarrinho = D.carrinho.quantidadeDe(p.id);
    var qtd  = state.qtd[p.id] || 1;
    var max  = p.disponivel;
    var nivel = D.nivelStock(p);
    var catLabel = t('prod.cat_' + p.categoria);

    /* Um selo de cada vez, por ordem de interesse para quem compra */
    var flag = '';
    if (p.emPromocao)        flag = '<span class="prod-flag promo">−' + p.descontoPct + '%</span>';
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
    var grid = $('#prod-grid');
    var vazio = $('#prod-empty');
    if (!grid) return;

    var lista = state.categoria === 'todos'
      ? state.produtos
      : state.produtos.filter(function (p) { return p.categoria === state.categoria; });

    grid.innerHTML = lista.map(cardHTML).join('');
    grid.hidden = lista.length === 0;
    if (vazio) vazio.hidden = lista.length > 0;

    /* Imagem em falta → placeholder desenhado */
    $$('.prod-thumb-img', grid).forEach(function (img) {
      img.addEventListener('error', function () {
        var box = img.parentNode;
        var flag = $('.prod-flag', box);
        box.innerHTML = placeholder(img.dataset.ph) + (flag ? flag.outerHTML : '');
      });
    });
  }

  /* Delegação de eventos da grelha */
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
    var q = state.qtd[p.id] || 1;
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

  /* ══════════════════════════════════════════
     CARRINHO
  ══════════════════════════════════════════ */
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

      /* Barra flutuante do telemóvel */
      var bar = $('#cart-bar');
      if (bar) bar.classList.toggle('visible', count > 0 && !state.sheetAberto);
      var bc = $('#cart-bar-count'); if (bc) bc.textContent = count;
      var bt = $('#cart-bar-total'); if (bt) bt.textContent = D.fmtPreco(total);
      var bl = $('#cart-bar-label');
      if (bl) bl.textContent = t(count === 1 ? 'prod.cart_item' : 'prod.cart_items');

      /* Realce nos cards que já estão no carrinho */
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

    /* Bottom sheet (telemóvel) */
    var barBtn = $('#cart-bar-btn');
    if (barBtn) barBtn.addEventListener('click', abrirSheet);

    var close = $('#cart-close');
    if (close) close.addEventListener('click', fecharSheet);

    var backdrop = $('#cart-backdrop');
    if (backdrop) backdrop.addEventListener('click', fecharSheet);

    var cta = $('#cart-cta');
    if (cta) cta.addEventListener('click', abrirModal);

    document.addEventListener('carrinho:change', function () { renderCarrinho(); });
  }

  function abrirSheet() {
    var panel = $('#cart-panel');
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
    var panel = $('#cart-panel');
    var backdrop = $('#cart-backdrop');
    state.sheetAberto = false;
    if (panel) panel.classList.remove('open');
    if (backdrop) {
      backdrop.classList.remove('visible');
      setTimeout(function () { backdrop.hidden = true; }, 240);
    }
    renderCarrinho();
  }

  /* ══════════════════════════════════════════
     TELEFONE — seletor de país + máscara

     O componente vive em js/telefone.js e não sabe nada de produtos:
     escolhe-se o país pela bandeira e ele trata do indicativo, da
     máscara e de dizer se o número está completo.
  ══════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════
     NOME — letras, não números

     Nome de pessoa não leva dígitos. Em vez de deixar escrever e só
     reclamar no fim, o campo recusa o dígito na hora e explica porquê.
  ══════════════════════════════════════════ */
  var RE_DIGITO   = /[0-9]/;
  var RE_PROIBIDO = /[0-9_@#$%^&*()+=\[\]{}<>\/\\|~`]/g;

  function limparNome(v) {
    return String(v || '').replace(RE_PROIBIDO, '');
  }

  var avisoNomeAte = 0;

  function ligarFiltroNome(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      var antes = input.value;
      var depois = limparNome(antes);
      if (depois === antes) return;

      var pos = input.selectionStart - (antes.length - depois.length);
      input.value = depois;
      try { input.setSelectionRange(pos, pos); } catch (_) {}

      /* O carácter desaparece do campo; sem esta mensagem a pessoa não
         percebe porquê. Fica de pé alguns segundos para ser lida — a
         revalidação normal não a apaga durante esse tempo. */
      marcarErro(input, RE_DIGITO.test(antes) ? t('prod.err_name_digits') : t('prod.err_name_chars'));
      avisoNomeAte = Date.now() + 2600;
      setTimeout(function () { validarNome(false); }, 2700);
    });
  }

  /* ══════════════════════════════════════════
     VALIDAÇÃO

     Cada campo diz o que está errado, e diz na hora em que a pessoa
     sai do campo — não só quando carrega no botão.
  ══════════════════════════════════════════ */
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
    var el = $('#f-nome');
    var v  = el.value.trim();
    var letras = v.replace(/[^\p{L}]/gu, '').length;
    var msg = !v ? t('prod.err_name')
            : RE_DIGITO.test(v) ? t('prod.err_name_digits')
            : letras < 2 ? t('prod.err_name_short')
            : '';
    /* Enquanto o aviso de carácter inválido está de pé, não o apagamos */
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

  /* ══════════════════════════════════════════
     MODAL DE RESERVA — dois passos
  ══════════════════════════════════════════ */
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

  /* Se o cliente já reservou antes ou tem perfil, poupa-lhe a digitação */
  function preencherComPerfil() {
    var nome = $('#f-nome'), tel = $('#f-tel');
    if (!nome || !tel) return;
    try {
      var guardado = JSON.parse(localStorage.getItem(K_CLIENTE) || 'null');
      var perfil   = JSON.parse(localStorage.getItem('inbarber.profile') || 'null')
                  || JSON.parse(localStorage.getItem('inbarber_user') || 'null');
      var fonte = guardado || perfil;
      if (!fonte) return;
      if (!nome.value) nome.value = limparNome(fonte.nome || fonte.name || '');
      if (!tel.value && telefone) {
        telefone.definir(fonte.e164 || fonte.tel || fonte.telefone || fonte.phone || '');
      }
    } catch (_) {}
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

  /* ─── Passo 2: o que a pessoa está mesmo a confirmar ─── */
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

      var total   = linhas.reduce(function (s, l) { return s + l.subtotal; }, 0);
      var cheio   = linhas.reduce(function (s, l) {
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

    /* Ciclo de foco dentro do diálogo — só entre o que está visível */
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

    /* Valida ao sair do campo, limpa o erro assim que a pessoa corrige */
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

    /* Passo 1 → 2 */
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

    /* Passo 2 → 1 */
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

  /* ─── Criação da reserva — só acontece no passo 2 ─── */
  function confirmar() {
    var erroBox = $('#res-error');
    if (erroBox) erroBox.hidden = true;

    var btn = $('#res-submit');
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
        /* O stock mudou por baixo dos pés: recarrega e volta à revisão */
        carregar().then(renderRevisao);
      });
  }

  /* ══════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════ */
  var toastTimer = null;
  function toast(msg, erro) {
    var el = $('#prod-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('err', !!erro);
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('visible'); }, 2600);
  }

  /* ══════════════════════════════════════════
     ARRANQUE
  ══════════════════════════════════════════ */
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
      /* Uma lista de países aberta apanha o Escape primeiro */
      if ($('.tel-drop:not([hidden])')) return;
      var modal = $('#res-modal');
      if (modal && !modal.hidden) { fecharModal(); return; }
      if (state.sheetAberto) fecharSheet();
    });

    /* Mudança de idioma: nomes e etiquetas voltam a ser desenhados */
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
