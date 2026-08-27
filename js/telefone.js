/* ════════════════════════════════════════════════════════════════
   InBarber — CAMPO DE TELEFONE COM PAÍS

   Componente independente: dá-se-lhe uma caixa e um <input> e ele
   monta o seletor de país (bandeira + indicativo), formata o número
   à medida que se escreve e sabe dizer se está completo.

   Não conhece produtos, carrinhos nem reservas — pode ser usado tal
   e qual no CRM, no agendamento ou no perfil.

     var tel = CampoTelefone.ligar({ box: elemento, input: input });
     tel.valido();      // true / false
     tel.e164();        // '+5511988887777'
     tel.pais();        // { iso:'BR', cc:'55', ... }
     tel.definir('+351912345678');

   As bandeiras são SVG desenhado à mão. Emoji (🇧🇷) não serve: no
   Windows o Chrome mostra as letras "BR" em vez da bandeira.
════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─── Bandeiras (viewBox 21×15, cantos tratados no CSS) ─── */
  var B = {
    BR: '<rect width="21" height="15" fill="#009B3A"/><path d="M10.5 1.9 19.4 7.5 10.5 13.1 1.6 7.5z" fill="#FEDF00"/><circle cx="10.5" cy="7.5" r="3.2" fill="#002776"/><path d="M7.6 6.4a9 9 0 0 1 5.9 1.5" stroke="#fff" stroke-width=".9" fill="none"/>',
    PT: '<rect width="21" height="15" fill="#DA291C"/><rect width="8.4" height="15" fill="#046A38"/><circle cx="8.4" cy="7.5" r="3.1" fill="#FFE900"/><circle cx="8.4" cy="7.5" r="2.1" fill="#DA291C"/><circle cx="8.4" cy="7.5" r="1" fill="#fff"/>',
    AR: '<rect width="21" height="15" fill="#fff"/><rect width="21" height="5" fill="#74ACDF"/><rect y="10" width="21" height="5" fill="#74ACDF"/><circle cx="10.5" cy="7.5" r="1.9" fill="#F6B40E"/>',
    CL: '<rect width="21" height="15" fill="#D52B1E"/><rect width="21" height="7.5" fill="#fff"/><rect width="8" height="7.5" fill="#0039A6"/><path d="m4 2.6 .8 2.4h2.5l-2 1.5.8 2.4-2.1-1.5-2.1 1.5.8-2.4-2-1.5h2.5z" fill="#fff"/>',
    CO: '<rect width="21" height="15" fill="#CE1126"/><rect width="21" height="11.25" fill="#003893"/><rect width="21" height="7.5" fill="#FCD116"/>',
    MX: '<rect width="21" height="15" fill="#fff"/><rect width="7" height="15" fill="#006847"/><rect x="14" width="7" height="15" fill="#CE1126"/><circle cx="10.5" cy="7.5" r="2" fill="#8C6239"/>',
    US: '<rect width="21" height="15" fill="#fff"/><g fill="#B22234"><rect width="21" height="1.7"/><rect y="3.4" width="21" height="1.7"/><rect y="6.8" width="21" height="1.7"/><rect y="10.2" width="21" height="1.7"/><rect y="13.6" width="21" height="1.4"/></g><rect width="9" height="8.5" fill="#3C3B6E"/>',
    ES: '<rect width="21" height="15" fill="#AA151B"/><rect y="3.75" width="21" height="7.5" fill="#F1BF00"/>',
    IT: '<rect width="21" height="15" fill="#fff"/><rect width="7" height="15" fill="#008C45"/><rect x="14" width="7" height="15" fill="#CD212A"/>',
    FR: '<rect width="21" height="15" fill="#fff"/><rect width="7" height="15" fill="#0055A4"/><rect x="14" width="7" height="15" fill="#EF4135"/>',
    DE: '<rect width="21" height="15" fill="#FFCE00"/><rect width="21" height="10" fill="#DD0000"/><rect width="21" height="5" fill="#000"/>',
    GB: '<rect width="21" height="15" fill="#012169"/><path d="M0 0 21 15M21 0 0 15" stroke="#fff" stroke-width="3"/><path d="M0 0 21 15M21 0 0 15" stroke="#C8102E" stroke-width="1.8"/><path d="M10.5 0v15M0 7.5h21" stroke="#fff" stroke-width="5"/><path d="M10.5 0v15M0 7.5h21" stroke="#C8102E" stroke-width="3"/>',
    AO: '<rect width="21" height="15" fill="#000"/><rect width="21" height="7.5" fill="#CE1126"/><circle cx="10.5" cy="7.5" r="2.6" fill="none" stroke="#FFCB00" stroke-width="1"/><path d="m10.5 5.4 .6 1.8h1.9l-1.5 1.2.6 1.8-1.6-1.1-1.6 1.1.6-1.8-1.5-1.2h1.9z" fill="#FFCB00"/>',
    _:  '<rect width="21" height="15" fill="#2A2A2A"/><path d="M0 7.5h21" stroke="#555" stroke-width="1"/>'
  };

  /* ─── Países ───────────────────────────────────────────────
     padroes: comprimento de dígitos → máscara. O maior padrão
     define o limite do campo.
  ──────────────────────────────────────────────────────────── */
  var PAISES = [
    { iso: 'BR', cc: '55',  nome: { pt: 'Brasil',        en: 'Brazil',         es: 'Brasil' },
      padroes: { 10: '(##) ####-####', 11: '(##) #####-####' } },
    { iso: 'PT', cc: '351', nome: { pt: 'Portugal',      en: 'Portugal',       es: 'Portugal' },
      padroes: { 9: '### ### ###' } },
    { iso: 'AO', cc: '244', nome: { pt: 'Angola',        en: 'Angola',         es: 'Angola' },
      padroes: { 9: '### ### ###' } },
    { iso: 'AR', cc: '54',  nome: { pt: 'Argentina',     en: 'Argentina',      es: 'Argentina' },
      padroes: { 10: '## ####-####', 11: '## #####-####' } },
    { iso: 'CL', cc: '56',  nome: { pt: 'Chile',         en: 'Chile',          es: 'Chile' },
      padroes: { 9: '# #### ####' } },
    { iso: 'CO', cc: '57',  nome: { pt: 'Colômbia',      en: 'Colombia',       es: 'Colombia' },
      padroes: { 10: '### ### ####' } },
    { iso: 'MX', cc: '52',  nome: { pt: 'México',        en: 'Mexico',         es: 'México' },
      padroes: { 10: '## #### ####' } },
    { iso: 'US', cc: '1',   nome: { pt: 'Estados Unidos', en: 'United States', es: 'Estados Unidos' },
      padroes: { 10: '(###) ###-####' } },
    { iso: 'ES', cc: '34',  nome: { pt: 'Espanha',       en: 'Spain',          es: 'España' },
      padroes: { 9: '### ### ###' } },
    { iso: 'IT', cc: '39',  nome: { pt: 'Itália',        en: 'Italy',          es: 'Italia' },
      padroes: { 9: '### ### ###', 10: '### ### ####' } },
    { iso: 'FR', cc: '33',  nome: { pt: 'França',        en: 'France',         es: 'Francia' },
      padroes: { 9: '# ## ## ## ##' } },
    { iso: 'DE', cc: '49',  nome: { pt: 'Alemanha',      en: 'Germany',        es: 'Alemania' },
      padroes: { 10: '#### ######', 11: '#### #######' } },
    { iso: 'GB', cc: '44',  nome: { pt: 'Reino Unido',   en: 'United Kingdom', es: 'Reino Unido' },
      padroes: { 10: '#### ######' } }
  ];

  var PADRAO = 'BR';

  /* ─── Utilitários ─── */
  function lang() { return (window.I18N && window.I18N.lang) || 'pt'; }
  function t(k)   { return window.I18N ? window.I18N.t(k) : k; }

  function nomePais(p) { return p.nome[lang()] || p.nome.pt; }

  function porIso(iso) {
    for (var i = 0; i < PAISES.length; i++) if (PAISES[i].iso === iso) return PAISES[i];
    return null;
  }

  function comprimentos(p) {
    return Object.keys(p.padroes).map(Number).sort(function (a, b) { return a - b; });
  }
  function minLen(p) { return comprimentos(p)[0]; }
  function maxLen(p) { return comprimentos(p).slice(-1)[0]; }

  function digitos(v, max) {
    var d = String(v || '').replace(/\D/g, '');
    return typeof max === 'number' ? d.slice(0, max) : d;
  }

  /* Aplica a máscara do comprimento mais próximo por cima */
  function formatar(valor, p) {
    var d = digitos(valor, maxLen(p));
    if (!d) return '';
    var alvos = comprimentos(p);
    var escolhido = alvos[alvos.length - 1];
    for (var i = 0; i < alvos.length; i++) {
      if (d.length <= alvos[i]) { escolhido = alvos[i]; break; }
    }
    var molde = p.padroes[escolhido];
    var out = '', j = 0;
    for (var k = 0; k < molde.length && j < d.length; k++) {
      out += molde[k] === '#' ? d[j++] : molde[k];
    }
    return out;
  }

  /* Placeholder é a máscara, não um número plausível: "(99) 99999-9999"
     lê-se como formato, "(12) 34567-8912" lê-se como telefone de alguém. */
  function exemplo(p) {
    return p.padroes[maxLen(p)].replace(/#/g, '9');
  }

  function svgBandeira(iso) {
    return '<svg class="flag" viewBox="0 0 21 15" aria-hidden="true">' + (B[iso] || B._) + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Sem acentos e em minúsculas, para a pesquisa encontrar
     "colombia" quando o país se chama "Colômbia". */
  function chave(s) {
    var v = String(s).toLowerCase();
    /* tira acentos para "colombia" encontrar "Colômbia" */
    return v.normalize ? v.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : v;
  }

  /* ─── Componente ─────────────────────────────────────────── */
  function ligar(opcoes) {
    var box   = opcoes.box;
    var input = opcoes.input;
    if (!box || !input) return null;

    var atual = porIso(opcoes.iso || PADRAO) || porIso(PADRAO);
    var aberto = false;
    var marcado = -1;      /* item destacado com as setas */

    box.classList.add('has-tel');

    /* Botão + lista */
    var botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'tel-pais';
    botao.setAttribute('aria-haspopup', 'listbox');
    botao.setAttribute('aria-expanded', 'false');

    var drop = document.createElement('div');
    drop.className = 'tel-drop';
    drop.hidden = true;
    drop.innerHTML =
      '<div class="tel-busca-box">' +
        '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">' +
          '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg>' +
        '<input type="text" class="tel-busca" autocomplete="off" spellcheck="false">' +
      '</div>' +
      '<ul class="tel-lista" role="listbox"></ul>' +
      '<p class="tel-vazio" hidden></p>';

    box.insertBefore(botao, box.firstChild);
    box.appendChild(drop);

    var busca = drop.querySelector('.tel-busca');
    var lista = drop.querySelector('.tel-lista');
    var vazio = drop.querySelector('.tel-vazio');

    function pintarBotao() {
      botao.innerHTML =
        svgBandeira(atual.iso) +
        '<span class="tel-cc">+' + atual.cc + '</span>' +
        '<svg class="tel-chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" ' +
          'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<polyline points="3,4.5 6,7.5 9,4.5"/></svg>';
      botao.setAttribute('aria-label', t('prod.tel_country') + ': ' + nomePais(atual));
      input.placeholder = exemplo(atual);
      input.setAttribute('maxlength', String(p_maxFormatado()));
    }

    function p_maxFormatado() { return atual.padroes[maxLen(atual)].length; }

    /* A pesquisa aceita o nome em qualquer um dos três idiomas: quem
       tem a página em português pode escrever "Brazil" e encontrar. */
    function itens(filtro) {
      var f = chave(filtro || '');
      if (!f) return PAISES.slice();
      return PAISES.filter(function (p) {
        var nomes = [p.nome.pt, p.nome.en, p.nome.es];
        for (var i = 0; i < nomes.length; i++) {
          if (chave(nomes[i]).indexOf(f) > -1) return true;
        }
        return p.iso.toLowerCase().indexOf(f) > -1 ||
               ('+' + p.cc).indexOf(f) > -1 ||
               p.cc.indexOf(f) > -1;
      });
    }

    function pintarLista(filtro) {
      var ps = itens(filtro);
      marcado = ps.length ? 0 : -1;
      lista.innerHTML = ps.map(function (p, i) {
        return '<li class="tel-opcao' +
                 (p.iso === atual.iso ? ' is-sel' : '') +
                 (i === 0 ? ' is-marked' : '') +
               '" role="option" data-iso="' + p.iso + '" ' +
               'aria-selected="' + (p.iso === atual.iso) + '">' +
                 svgBandeira(p.iso) +
                 '<span class="tel-opcao-nome">' + esc(nomePais(p)) + '</span>' +
                 '<span class="tel-opcao-cc">+' + p.cc + '</span>' +
               '</li>';
      }).join('');
      vazio.hidden = ps.length > 0;
      if (!ps.length) vazio.textContent = t('prod.tel_nofind');
    }

    /* A lista tem de caber sempre. Por ordem: tenta empurrar o scroll
       do modal; se ele não rolar, abre para cima quando há mais espaço
       lá; e no fim limita a altura ao espaço que sobrar, para nunca
       ficar cortada pelo fundo da caixa. */
    function acomodar() {
      drop.classList.remove('is-up');
      lista.style.maxHeight = '';

      var scroller = box.closest('.prod-modal-box');
      var rs = scroller ? scroller.getBoundingClientRect() : null;
      var baixo = Math.min(window.innerHeight - 20, rs ? rs.bottom - 12 : Infinity);
      var cima  = Math.max(12, rs ? rs.top + 8 : 12);

      var r = box.getBoundingClientRect();
      var abaixo = baixo - r.bottom - 6;
      var acima  = r.top - cima - 6;

      if (scroller && abaixo < 260) {
        var antes = scroller.scrollTop;
        scroller.scrollTop = antes + (260 - abaixo);
        if (scroller.scrollTop !== antes) {
          r = box.getBoundingClientRect();
          abaixo = baixo - r.bottom - 6;
          acima  = r.top - cima - 6;
        }
      }

      var paraCima = abaixo < 180 && acima > abaixo;
      drop.classList.toggle('is-up', paraCima);

      var espaco = (paraCima ? acima : abaixo) - 52;   /* 52 = barra de pesquisa */
      lista.style.maxHeight = Math.max(120, Math.min(232, espaco)) + 'px';
    }

    function abrir() {
      if (aberto) return;
      aberto = true;
      drop.hidden = false;
      acomodar();
      botao.setAttribute('aria-expanded', 'true');
      busca.value = '';
      busca.placeholder = t('prod.tel_search');
      pintarLista('');
      requestAnimationFrame(function () { busca.focus(); });
      document.addEventListener('click', foraDoCampo, true);
    }

    function fechar(devolverFoco) {
      if (!aberto) return;
      aberto = false;
      drop.hidden = true;
      botao.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', foraDoCampo, true);
      if (devolverFoco !== false) botao.focus();
    }

    function foraDoCampo(e) {
      if (!box.contains(e.target)) fechar(false);
    }

    function escolher(iso) {
      var p = porIso(iso);
      if (!p) return;
      var d = digitos(input.value);          /* mantém o que já foi escrito */
      atual = p;
      pintarBotao();
      input.value = formatar(d, atual);
      fechar();
      input.focus();
      if (opcoes.onChange) opcoes.onChange(atual);
    }

    function marcar(delta) {
      var ops = lista.querySelectorAll('.tel-opcao');
      if (!ops.length) return;
      marcado = (marcado + delta + ops.length) % ops.length;
      Array.prototype.forEach.call(ops, function (li, i) {
        li.classList.toggle('is-marked', i === marcado);
      });
      ops[marcado].scrollIntoView({ block: 'nearest' });
    }

    /* ── Eventos ── */
    botao.addEventListener('click', function () { aberto ? fechar() : abrir(); });

    lista.addEventListener('click', function (e) {
      var li = e.target.closest('.tel-opcao');
      if (li) escolher(li.dataset.iso);
    });

    busca.addEventListener('input', function () { pintarLista(busca.value); });

    /* O Escape é tratado na caixa toda — botão incluído. Se só
       estivesse na lista, carregar em Escape logo a seguir a abrir
       (com o foco ainda no botão) fechava o modal por trás. */
    box.addEventListener('keydown', function (e) {
      if (!aberto) return;
      if (e.key === 'Escape')      { e.preventDefault(); e.stopPropagation(); fechar(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); marcar(1); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); marcar(-1); }
      else if (e.key === 'Enter')  {
        e.preventDefault();
        var m = lista.querySelector('.tel-opcao.is-marked');
        if (m) escolher(m.dataset.iso);
      }
    });

    /* Máscara ao escrever */
    input.addEventListener('input', function () {
      var antes = input.value;
      var noFim = input.selectionStart === antes.length;
      input.value = formatar(antes, atual);
      if (noFim) {
        try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {}
      }
    });

    /* Colar "+351 912 345 678" deve trocar o país sozinho */
    input.addEventListener('paste', function (e) {
      var texto = (e.clipboardData || window.clipboardData).getData('text');
      if (!texto) return;
      e.preventDefault();
      definir(texto);
      input.dispatchEvent(new Event('input'));
    });

    /* Aceita '+5511988887777', '5511988887777' ou só o número local */
    function definir(valor) {
      var d = digitos(valor);
      if (/^\s*\+/.test(String(valor)) || d.length > maxLen(atual)) {
        var candidatos = PAISES.slice().sort(function (a, b) { return b.cc.length - a.cc.length; });
        for (var i = 0; i < candidatos.length; i++) {
          var c = candidatos[i];
          if (d.indexOf(c.cc) === 0 && d.length - c.cc.length >= minLen(c)) {
            atual = c;
            d = d.slice(c.cc.length);
            break;
          }
        }
      }
      pintarBotao();
      input.value = formatar(d, atual);
    }

    pintarBotao();

    var api = {
      pais:      function () { return atual; },
      definirPais: escolher,
      definir:   definir,
      digitos:   function () { return digitos(input.value); },
      valido:    function () {
        var n = digitos(input.value).length;
        return n >= minLen(atual) && n <= maxLen(atual);
      },
      vazio:     function () { return digitos(input.value).length === 0; },
      e164:      function () { return '+' + atual.cc + digitos(input.value); },
      formatado: function () { return '+' + atual.cc + ' ' + input.value; },
      exemplo:   function () { return exemplo(atual); },
      repintar:  function () { pintarBotao(); if (aberto) pintarLista(busca.value); }
    };
    return api;
  }

  window.CampoTelefone = {
    PAISES: PAISES,
    ligar: ligar,
    formatar: formatar,
    digitos: digitos,
    porIso: porIso,
    bandeira: svgBandeira
  };
})();
