/* ════════════════════════════════════════════════════════════════
   InBarber — PRODUTOS · Vitrine da landing

   Desenha a secção "#produtos" do index.html: um produto em evidência
   (o que estiver em promoção, senão o primeiro destaque) e três cards
   compactos ao lado. Quem chega à landing vê a oferta antes de ver a
   lista — a lista inteira está a um clique, em produtos.html.

   Se não houver stock nenhum, a secção fica escondida.

   Depende de js/produtos-data.js e, opcionalmente, de js/i18n.js.
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.ProdutosData;
  if (!D) return;

  var secao = document.getElementById('produtos');
  var caixa = document.getElementById('shop-showcase');
  if (!secao || !caixa) return;

  var t = function (key, vars) { return window.I18N ? window.I18N.t(key, vars) : key; };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function thumb(p, classe) {
    return p.img
      ? '<img class="' + classe + '" src="' + esc(p.img) + '" alt="" loading="lazy" ' +
        'decoding="async" data-ph="' + esc(p.categoria) + '">'
      : D.placeholderHTML(p.categoria);
  }

  /* Preço: quando há promoção mostra os dois, com o de tabela riscado */
  function preco(p, classe) {
    if (!p.emPromocao) {
      return '<span class="shop-price ' + classe + '">' + esc(D.fmtPreco(p.preco)) + '</span>';
    }
    return '' +
      '<span class="shop-price-was">' + esc(D.fmtPreco(p.preco)) + '</span>' +
      '<span class="shop-price ' + classe + ' is-promo">' + esc(D.fmtPreco(p.precoFinal)) + '</span>';
  }

  function selo(p) {
    if (p.novo) {
      return '<span class="shop-badge new">' + esc(t('prod.new')) + '</span>';
    }
    if (p.emPromocao) {
      return '<span class="shop-badge promo">−' + p.descontoPct + '%</span>';
    }
    if (D.nivelStock(p) === 'baixo') {
      return '<span class="shop-badge low">' + esc(t('prod.low_stock')) + '</span>';
    }
    if (p.destaque) {
      return '<span class="shop-badge">' + esc(t('prod.featured')) + '</span>';
    }
    return '';
  }

  function stockTxt(p) {
    return p.disponivel + ' ' + t(p.disponivel === 1 ? 'prod.available' : 'prod.available_pl');
  }

  /* ─── Produto em evidência ─── */
  function heroHTML(p) {
    var poupa = p.emPromocao
      ? '<span class="shop-save">' + esc(t('prod.save', { valor: D.fmtPreco(p.preco - p.precoFinal) })) + '</span>'
      : '';

    return '' +
      '<article class="shop-hero">' +
        '<a class="shop-hero-media" href="produtos.html?cat=' + esc(p.categoria) + '" tabindex="-1" aria-hidden="true">' +
          thumb(p, 'prod-thumb-img') + selo(p) +
        '</a>' +
        '<div class="shop-hero-body">' +
          '<p class="shop-cat">' + esc(t('prod.cat_' + p.categoria)) + '</p>' +
          '<h3 class="shop-hero-name">' +
            '<a href="produtos.html?cat=' + esc(p.categoria) + '">' + esc(p.nome) + '</a>' +
          '</h3>' +
          '<p class="shop-hero-desc">' + esc(p.descricao) + '</p>' +
          '<div class="shop-price-row">' + preco(p, 'lg') + poupa + '</div>' +
          '<div class="shop-hero-actions">' +
            '<button type="button" class="shop-add" data-add="' + p.id + '">' +
              esc(t('prod.add')) +
              '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M2.5 7h9M8 3.5L11.5 7 8 10.5"/></svg>' +
            '</button>' +
            '<p class="shop-stock">' + esc(stockTxt(p)) + '</p>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ─── Cards compactos ─── */
  function miniHTML(p) {
    return '' +
      '<li class="shop-mini">' +
        '<a class="shop-mini-link" href="produtos.html?cat=' + esc(p.categoria) + '">' +
          '<span class="shop-mini-thumb">' + thumb(p, 'prod-thumb-img') + selo(p) + '</span>' +
          '<span class="shop-mini-info">' +
            '<span class="shop-cat">' + esc(t('prod.cat_' + p.categoria)) + '</span>' +
            '<span class="shop-mini-name">' + esc(p.nome) + '</span>' +
            '<span class="shop-price-row">' + preco(p, 'sm') + '</span>' +
          '</span>' +
        '</a>' +
        '<button type="button" class="shop-mini-add" data-add="' + p.id + '" ' +
          'aria-label="' + esc(t('prod.add')) + ' — ' + esc(p.nome) + '">' +
          '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
            '<path d="M7 2.5v9M2.5 7h9"/></svg>' +
        '</button>' +
      '</li>';
  }

  /* Entrada suave — o observer do app.js já correu antes destes
     elementos existirem, por isso a vitrine traz o seu. */
  function observar() {
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

  /* ─── Render ─── */
  function render() {
    return D.vitrine(4).then(function (v) {
      if (!v.hero) { secao.hidden = true; return; }

      caixa.innerHTML =
        heroHTML(v.hero) +
        (v.lado.length
          ? '<ul class="shop-side" role="list">' + v.lado.map(miniHTML).join('') + '</ul>'
          : '');
      secao.hidden = false;

      /* Imagem em falta → o ícone da categoria */
      Array.prototype.forEach.call(caixa.querySelectorAll('.prod-thumb-img'), function (img) {
        img.addEventListener('error', function () {
          var box  = img.parentNode;
          var flag = box.querySelector('.shop-badge');
          box.innerHTML = D.placeholderHTML(img.dataset.ph) + (flag ? flag.outerHTML : '');
        });
      });

      observar();
    }).catch(function (err) {
      console.error('[produtos-landing]', err);
      secao.hidden = true;
    });
  }

  /* ─── Reservar: mete no carrinho e continua no catálogo ─── */
  caixa.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    D.carrinho.adicionar(btn.dataset.add, 1);
    window.location.href = 'produtos.html?cat=todos';
  });

  document.addEventListener('i18n:change', render);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
