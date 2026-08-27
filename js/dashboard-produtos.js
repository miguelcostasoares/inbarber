/* ═══════════════════════════════════════════════════════════
   InBarber — Dashboard · Alerta de stock de produtos

   A gestão de produtos vive em produtos-crm.html. No dashboard
   fica só o card "Estoque Baixo" da coluna lateral, que o
   dashboard.js pinta com mock de forma síncrona; este ficheiro
   reescreve-o assim que chegam os dados verdadeiros e manda
   quem clica para a página de produtos.

   Se o servidor estiver em baixo, cai para o mock de
   produtos-data.js e marca o card como demonstração, para
   ninguém confundir aqueles números com os do servidor.
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Disponível <= isto conta como "a repor" (igual ao produtos-crm.js).
  const LIMITE_STOCK_BAIXO = 5;
  const MAX_ITENS = 5;
  const PAGINA = 'produtos-crm.html';

  function $(id) { return document.getElementById(id); }

  function esc(valor) {
    return String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Erro de rede / API ausente — o sinal para cair no plano B. */
  function ehFalhaDeServidor(err) {
    if (!err) return false;
    if (err.status === 0 || err.status >= 500) return true;
    return /api\.js|ProdutosData|Failed to fetch/i.test(err.message || '');
  }

  function carregar() {
    const Dados = window.ProdutosData;
    if (!Dados) return;

    Dados.listarTodos()
      .then(produtos => render(produtos, false))
      .catch(err => {
        if (ehFalhaDeServidor(err) && Dados._mock) {
          return Dados._mock.listarTodos().then(produtos => render(produtos, true));
        }
        console.warn('InBarber: não foi possível carregar o stock de produtos.', err);
      });
  }

  function render(produtos, demo) {
    const lista = $('stockList');
    const badge = $('stockBadge');
    const card  = $('alertStock');
    if (!lista || !produtos) return;

    const criticos = produtos
      .filter(p => p.ativo && p.disponivel <= LIMITE_STOCK_BAIXO)
      .sort((a, b) => a.disponivel - b.disponivel)
      .slice(0, MAX_ITENS);

    if (badge) badge.textContent = criticos.length;

    // Marca a origem dos dados sem meter uma faixa no dashboard.
    const titulo = card && card.querySelector('.alert-card__title');
    if (titulo) {
      titulo.textContent = 'Estoque Baixo';
      if (demo) {
        titulo.textContent += ' (demo)';
        titulo.title = 'Servidor de produtos indisponível — dados de demonstração.';
      }
    }

    if (!criticos.length) {
      lista.innerHTML =
        '<li class="alert-item"><span class="alert-item__name">Stock em dia</span>' +
        '<span class="alert-item__sub">nada abaixo do limite</span></li>';
      return;
    }

    lista.innerHTML = criticos.map(p => `
      <li class="alert-item" role="listitem" data-produto="${esc(p.id)}"
          title="Gerir ${esc(p.nome)} em Produtos">
        <span class="alert-item__name">${esc(p.nome)}</span>
        <span class="alert-item__sub">${p.disponivel} un</span>
        <span class="alert-item__tag alert-item__tag--${p.disponivel === 0 ? 'red' : 'orange'}">
          ${p.disponivel === 0 ? 'Esgotado' : 'Crítico'}
        </span>
      </li>`).join('');
  }

  /* Clicar num produto crítico abre a página de produtos. O
     delegado fica no card, por isso sobrevive a cada repintura. */
  function initNavegacao() {
    const card = $('alertStock');
    if (!card) return;

    card.addEventListener('click', (e) => {
      const item = e.target.closest('[data-produto]');
      if (!item) return;
      window.location.href = PAGINA;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('stockList')) return;
    initNavegacao();
    carregar();
  });

})();
