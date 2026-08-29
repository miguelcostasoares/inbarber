'use strict';

/* ─── 1. ESTADO REAL (populado via API) ─────────────────── */

// Estado real da Visão Geral — preenchido via API em loadVisaoGeralData().
// FIN_BARBERS: [{ id, name, initials, cssClass, faturamento, cortes }]
let FIN_BARBERS = [];
// PAYMENT_METHODS: [{ id, label, cssClass, total, count, entries: [] }]
let PAYMENT_METHODS = [];
// Totais consolidados vindos direto do back (evita recomputar no front)
let VISAO_GERAL_KPIS = { faturamentoTotal: 0, faturamentoLiquido: 0, totalCortes: 0 };

// Estado real de Metas & Comissões — preenchido via API em loadMetasData()
let METAS_DATA = [];         // [{ id, meta, comissaoPct }]
let META_BARBEARIA_TOTAL = 0;

// Estado real de Saídas — preenchido via API (a conectar)
let SAIDAS_DATA = [];

// Dados do gráfico de linha por período — preenchido via API em loadLineChartData()
let LINE_DATA = {
    dia:    { labels: [], values: [] },
    semana: { labels: [], values: [] },
    mes:    { labels: [], values: [] },
};

/* ─── 2. UTILS ──────────────────────────────────────────── */
const fmt = (n) =>
    'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (n) => {
    if (n >= 1000) return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + 'k';
    return fmt(n);
};

function getTodayLabel() {
    return new Date().toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

/* ─── 3. TOOLTIP UTILS ──────────────────────────────────── */
/*
 * Padrão idêntico ao dashboard.js:
 * Posiciona o tooltip respeitando as bordas da viewport.
 */
function positionTooltip(el, x, y) {
    const PAD = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const tw = rect.width || 200;
    const th = rect.height || 120;

    let left = x + PAD;
    if (left + tw > vw - PAD) left = x - tw - PAD;

    let top = y + PAD;
    if (top + th > vh - PAD) top = y - th - PAD;

    el.style.left = `${Math.max(PAD, left)}px`;
    el.style.top = `${Math.max(PAD, top)}px`;
}

function hideTooltip() {
    const el = document.getElementById('chartTooltip');
    if (el) el.classList.remove('is-visible');
}

/* ─── 5. KPIs ───────────────────────────────────────────── */
function renderKPIs() {
    // Vem pronto do back-end (GET /api/financeiro/visao-geral), já com
    // Faturamento Líquido = Faturamento − Saídas do MESMO período dos KPIs
    // (evita misturar com o período independente da aba Saídas).
    const { faturamentoTotal, faturamentoLiquido, totalCortes } = VISAO_GERAL_KPIS;

    // Valores estáticos imediatos (trends e datas não são animados)
    document.getElementById('kpiFaturamentoTrend').textContent = '↑ 12,4%';
    document.getElementById('kpiLiquidoTrend').textContent = '↑ 9,8%';
    document.getElementById('kpiCortesTrend').textContent = '↑ 8,2%';
    document.getElementById('caixaTotalRecebido').textContent = fmt(faturamentoTotal);
    document.getElementById('donutCenterValue').textContent = fmtK(faturamentoTotal);
    document.getElementById('finHeaderDate').textContent = getTodayLabel();

    // Count-up nos KPIs numéricos — idêntico ao padrão do dashboard.js
    const elTotal   = document.getElementById('kpiFaturamentoTotal');
    const elLiquido = document.getElementById('kpiFaturamentoLiquido');
    const elCortes  = document.getElementById('kpiCortes');

    if (elTotal)   animateCounter(elTotal,   0, faturamentoTotal,   1200, fmt);
    if (elLiquido) animateCounter(elLiquido, 0, faturamentoLiquido, 1000, fmt);
    if (elCortes)  animateCounter(elCortes,  0, totalCortes,         800);
}

/* ─── 4. DONUT CHART ────────────────────────────────────── */
// Paleta por forma de pagamento. As chaves batem com os nomes usados em
// formas_pagamento (mesma tabela usada em Saídas — ver SAIDAS_PGTO_COLORS
// mais abaixo). Formas de pagamento novas/desconhecidas caem no fallback
// 'outros', então nenhum nome cadastrado no banco quebra o render.
const DONUT_COLORS = {
    pix:           { fill: '#00d68f', glow: 'rgba(0,214,143,0.4)' },
    cartao:        { fill: '#0047ff', glow: 'rgba(0,71,255,0.4)' },
    dinheiro:      { fill: '#ff9c40', glow: 'rgba(255,156,64,0.4)' },
    boleto:        { fill: '#4da6ff', glow: 'rgba(77,166,255,0.4)' },
    transferencia: { fill: '#00f0ff', glow: 'rgba(0,240,255,0.4)' },
    outros:        { fill: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
};

// Normaliza o nome vindo do banco ('PIX', 'Cartão', 'Não informado', ...)
// para uma das chaves de DONUT_COLORS acima.
function normalizarFormaPagamentoKey(nome) {
    const slug = (nome || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase().trim();
    if (slug.includes('pix')) return 'pix';
    if (slug.includes('cart')) return 'cartao';
    if (slug.includes('dinheiro')) return 'dinheiro';
    if (slug.includes('boleto')) return 'boleto';
    if (slug.includes('transf')) return 'transferencia';
    return 'outros';
}

let donutInstance = null;

function renderDonut() {
    const total = PAYMENT_METHODS.reduce((a, m) => a + m.total, 0);
    const ctx = document.getElementById('donutChart').getContext('2d');

    const tooltip = document.getElementById('chartTooltip');
    const tooltipInner = document.getElementById('chartTooltipInner');

    const externalTooltip = (context) => {
        const { chart, tooltip: tip } = context;
        if (tip.opacity === 0) { tooltip.classList.remove('is-visible'); return; }

        const idx = tip.dataPoints[0].dataIndex;
        const m = PAYMENT_METHODS[idx];
        const pct = total > 0 ? ((m.total / total) * 100).toFixed(1) : '0.0';
        const col = DONUT_COLORS[m.cssClass].fill;

        tooltipInner.innerHTML = `
          <div class="chart-tooltip__title">${m.label}</div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__dot" style="background:${col}"></span>
            <span class="chart-tooltip__label">Total recebido</span>
            <span class="chart-tooltip__val">${fmt(m.total)}</span>
          </div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__dot" style="background:transparent;border:1px solid var(--divider)"></span>
            <span class="chart-tooltip__label">Transações</span>
            <span class="chart-tooltip__val">${m.count}</span>
          </div>
          <div class="chart-tooltip__divider"></div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__total-label">Participação</span>
            <span class="chart-tooltip__total-val">${pct}%</span>
          </div>
        `;

        // Posicionamento idêntico ao dashboard: respeita bordas da viewport
        const canvasRect = chart.canvas.getBoundingClientRect();
        const x = canvasRect.left + tip.caretX;
        const y = canvasRect.top + tip.caretY;

        positionTooltip(tooltip, x, y);
        tooltip.classList.add('is-visible');
    };

    if (donutInstance) donutInstance.destroy();

    donutInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: PAYMENT_METHODS.map(m => m.label),
            datasets: [{
                data: PAYMENT_METHODS.map(m => m.total),
                backgroundColor: PAYMENT_METHODS.map(m => DONUT_COLORS[m.cssClass].fill),
                borderColor: '#0a0a0a00',
                borderWidth: 3,
                hoverOffset: 6,
            }],
        },
        options: {
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, external: externalTooltip },
            },
            animation: { duration: 700, easing: 'easeInOutQuart' },
        },
    });

    // Oculta tooltip ao sair do canvas (padrão dashboard)
    document.getElementById('donutChart').addEventListener('mouseleave', hideTooltip);

    // Legend
    const legend = document.getElementById('caixaLegend');
    legend.innerHTML = PAYMENT_METHODS.map(m => {
        const pct = total > 0 ? ((m.total / total) * 100).toFixed(1) : '0.0';
        return `
          <div class="caixa-legend-item">
            <span class="caixa-legend-dot" style="background:${DONUT_COLORS[m.cssClass].fill}"></span>
            <span class="caixa-legend-name">${m.label}</span>
            <span class="caixa-legend-pct">${pct}%</span>
            <span class="caixa-legend-val">${fmtK(m.total)}</span>
          </div>
        `;
    }).join('');
}

/* ─── 5. PAYMENT CARDS ──────────────────────────────────── */
function renderPaymentCards() {
    const total = PAYMENT_METHODS.reduce((a, m) => a + m.total, 0);
    const grid = document.getElementById('caixaPaymentGrid');

    if (!PAYMENT_METHODS.length) {
        grid.innerHTML = `<div class="fin-empty-state">Nenhum recebimento no período selecionado.</div>`;
        return;
    }

    grid.innerHTML = PAYMENT_METHODS.map(m => {
        const pct = total > 0 ? ((m.total / total) * 100).toFixed(1) : '0.0';
        const rows = m.entries.slice(0, 6).map(e => `
          <div class="payment-mini-row">
            <span class="payment-mini-date">${e.date}</span>
            <div class="payment-mini-info">
              <div class="payment-mini-client">${e.client}</div>
              <div class="payment-mini-service">${e.service}</div>
            </div>
            <span class="payment-mini-val">${fmt(e.val)}</span>
          </div>
        `).join('');

        return `
          <div class="payment-card payment-card--${m.cssClass}">
            <div class="payment-card__head">
              <span class="payment-card__badge">${m.label}</span>
              <span class="payment-card__pct">${pct}%</span>
            </div>
            <div class="payment-card__total">${fmt(m.total)}</div>
            <div class="payment-card__count">${m.count} pagamentos</div>
            <div class="payment-card__bar-track">
              <div class="payment-card__bar-fill" style="width:${pct}%"></div>
            </div>
            <div class="payment-mini-list">${rows}</div>
          </div>
        `;
    }).join('');
}

/* ─── 6. LINE CHART ─────────────────────────────────────── */
let lineInstance = null;
let activePeriod = 'semana';

function renderLineChart(period) {
    const d = LINE_DATA[period];
    const ctx = document.getElementById('lineChart').getContext('2d');
    const tooltip = document.getElementById('chartTooltip');
    const tooltipInner = document.getElementById('chartTooltipInner');

    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(0,71,255,0.22)');
    gradient.addColorStop(1, 'rgba(0,71,255,0)');

    const externalTooltip = (context) => {
        const { chart, tooltip: tip } = context;
        if (tip.opacity === 0) { tooltip.classList.remove('is-visible'); return; }
        if (!tip.dataPoints?.length) return;

        const dp = tip.dataPoints[0];
        const label = dp.label;
        const val = dp.raw;
        const idx = dp.dataIndex;

        // Variation vs previous
        const prev = idx > 0 ? d.values[idx - 1] : null;
        const varPct = prev ? (((val - prev) / prev) * 100).toFixed(1) : null;
        const varSign = varPct > 0 ? '↑' : '↓';
        const varCol = varPct > 0 ? 'var(--green)' : 'var(--red)';

        tooltipInner.innerHTML = `
          <div class="chart-tooltip__title">${label}</div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__dot" style="background:var(--gold)"></span>
            <span class="chart-tooltip__label">Faturamento</span>
            <span class="chart-tooltip__val">${fmt(val)}</span>
          </div>
          ${varPct !== null ? `
          <div class="chart-tooltip__divider"></div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__total-label">vs. anterior</span>
            <span class="chart-tooltip__total-val" style="color:${varCol}">${varSign} ${Math.abs(varPct)}%</span>
          </div>` : ''}
        `;

        // Posicionamento idêntico ao dashboard: respeita bordas da viewport
        const canvasRect = chart.canvas.getBoundingClientRect();
        const x = canvasRect.left + tip.caretX;
        const y = canvasRect.top + tip.caretY;

        positionTooltip(tooltip, x, y);
        tooltip.classList.add('is-visible');
    };

    if (lineInstance) lineInstance.destroy();

    lineInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: d.labels,
            datasets: [{
                label: 'Faturamento',
                data: d.values,
                borderColor: '#0047ff',
                borderWidth: 2.5,
                pointBackgroundColor: '#0047ff',
                pointBorderColor: '#0A0A0A',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, external: externalTooltip },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#6B6762', font: { family: 'DM Sans', size: 11 } },
                    border: { color: 'rgba(255,255,255,0.06)' },
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#6B6762',
                        font: { family: 'DM Sans', size: 11 },
                        callback: (v) => fmtK(v),
                    },
                    border: { color: 'rgba(255,255,255,0.06)' },
                },
            },
            animation: { duration: 420, easing: 'easeInOutQuart' },
        },
    });

    // Oculta tooltip ao sair do canvas (padrão dashboard)
    document.getElementById('lineChart').addEventListener('mouseleave', hideTooltip);
}

/* ─── 7. BAR CHART (barbeiros) ──────────────────────────── */
let barInstance = null;

function renderBarChart() {
    const ctx = document.getElementById('barChart').getContext('2d');
    const tooltip = document.getElementById('chartTooltip');
    const tooltipInner = document.getElementById('chartTooltipInner');

    const BAR_COLORS_PALETTE = [
        'rgba(0,71,255,0.8)',
        'rgba(77,166,255,0.8)',
        'rgba(0,214,143,0.8)',
        'rgba(139,92,246,0.8)',
        'rgba(255,156,64,0.8)',
        'rgba(0,240,255,0.8)',
    ];
    // Repete a paleta por posição em vez de travar em 4 cores fixas,
    // já que o número de barbeiros ativos agora vem do banco.
    const BAR_COLORS = FIN_BARBERS.map((_, i) => BAR_COLORS_PALETTE[i % BAR_COLORS_PALETTE.length]);

    const externalTooltip = (context) => {
        const { chart, tooltip: tip } = context;
        if (tip.opacity === 0) { tooltip.classList.remove('is-visible'); return; }
        if (!tip.dataPoints?.length) return;

        const idx = tip.dataPoints[0].dataIndex;
        const barber = FIN_BARBERS[idx];
        const total = FIN_BARBERS.reduce((a, b) => a + b.faturamento, 0);
        const pct = total > 0 ? ((barber.faturamento / total) * 100).toFixed(1) : '0.0';
        const ticketMedio = barber.cortes > 0 ? barber.faturamento / barber.cortes : 0;
        const col = BAR_COLORS[idx];

        tooltipInner.innerHTML = `
          <div class="chart-tooltip__title">${barber.name}</div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__dot" style="background:${col}"></span>
            <span class="chart-tooltip__label">Faturamento</span>
            <span class="chart-tooltip__val">${fmt(barber.faturamento)}</span>
          </div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__dot" style="background:var(--muted)"></span>
            <span class="chart-tooltip__label">Cortes realizados</span>
            <span class="chart-tooltip__val">${barber.cortes}</span>
          </div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__dot" style="background:var(--muted)"></span>
            <span class="chart-tooltip__label">Ticket médio</span>
            <span class="chart-tooltip__val">${fmt(ticketMedio)}</span>
          </div>
          <div class="chart-tooltip__divider"></div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__total-label">Participação</span>
            <span class="chart-tooltip__total-val">${pct}%</span>
          </div>
        `;

        // Posicionamento idêntico ao dashboard: respeita bordas da viewport
        const canvasRect = chart.canvas.getBoundingClientRect();
        const x = canvasRect.left + tip.caretX;
        const y = canvasRect.top + tip.caretY;

        positionTooltip(tooltip, x, y);
        tooltip.classList.add('is-visible');
    };

    if (barInstance) barInstance.destroy();

    barInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: FIN_BARBERS.map(b => b.name.split(' ')[0]),
            datasets: [{
                label: 'Faturamento',
                data: FIN_BARBERS.map(b => b.faturamento),
                backgroundColor: BAR_COLORS,
                borderColor: BAR_COLORS.map(c => c.replace('0.8', '1')),
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, external: externalTooltip },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#6B6762', font: { family: 'DM Sans', size: 11 } },
                    border: { color: 'rgba(255,255,255,0.06)' },
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#6B6762',
                        font: { family: 'DM Sans', size: 11 },
                        callback: (v) => fmtK(v),
                    },
                    border: { color: 'rgba(255,255,255,0.06)' },
                },
            },
            animation: { duration: 600, easing: 'easeInOutQuart' },
        },
    });

    // Oculta tooltip ao sair do canvas (padrão dashboard)
    document.getElementById('barChart').addEventListener('mouseleave', hideTooltip);

}

/* ─── 8. METAS & COMISSÕES ──────────────────────────────── */

// Cores reutilizadas dos avatares
// Paleta de cores para avatares e barras de progresso — atribuída dinamicamente
// por posição ao carregar os barbeiros do back, sem depender de IDs fixos.
const _AVATAR_PALETTE = [
    'linear-gradient(135deg, #0047ff, #00f0ff)',
    'linear-gradient(135deg, #4da6ff, #0047ff)',
    'linear-gradient(135deg, #00d68f, #0047ff)',
    'linear-gradient(135deg, #8b5cf6, #ff4d6a)',
    'linear-gradient(135deg, #ff9c40, #ff4d6a)',
    'linear-gradient(135deg, #00f0ff, #00d68f)',
];

const _PROGRESS_PALETTE = [
    '#00f0ff', '#4da6ff', '#00d68f', '#8b5cf6', '#ff9c40', '#ff4d6a',
];

// Mapas populados em loadMetasData()
let BARBER_AVATAR_STYLES   = {};
let BARBER_PROGRESS_COLORS = {};

function calcMetasState() {
    return METAS_DATA.map(m => {
        const pct = m.meta > 0 ? Math.round((m.faturamento / m.meta) * 100) : 0;
        const comissaoVal = Math.round(m.faturamento * (m.comissaoPct / 100));
        return { ...m, pct, comissaoVal };
    });
}

const BARBER_SOLID_COLORS_LIST = [
    'var(--gold)', 'var(--blue)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--red)',
];

function renderMetasKPIs(state) {
    const totalFat = state.reduce((a, b) => a + b.faturamento, 0);
    const pctMeta = META_BARBEARIA_TOTAL > 0
        ? ((totalFat / META_BARBEARIA_TOTAL) * 100).toFixed(1)
        : '0.0';

    document.getElementById('metaTotalValor').textContent = fmt(META_BARBEARIA_TOTAL);
    document.getElementById('metaTotalRealizado').textContent = fmt(totalFat) + ' realizados';
    document.getElementById('metaTotalBarFill').style.width = Math.min(parseFloat(pctMeta), 100) + '%';
    document.getElementById('metaTotalPct').textContent = pctMeta.replace('.', ',') + '%';

    const list = document.getElementById('barberProgressList');
    list.innerHTML = state.map((b, i) => {
        const color = BARBER_SOLID_COLORS_LIST[i % BARBER_SOLID_COLORS_LIST.length];
        const pct = Math.min(b.pct, 100);
        return `
            <div class="barber-progress-item">
                <div class="barber-progress-avatar" style="background: ${BARBER_AVATAR_STYLES[b.id]}">${b.initials}</div>
                <span class="barber-progress-name">${b.name.split(' ')[0]}</span>
                <div class="barber-progress-bar-wrap">
                    <div class="barber-progress-bar-fill" style="width: ${pct}%; background: ${color};"></div>
                </div>
                <span class="barber-progress-pct" style="color: ${color};">${b.pct}%</span>
            </div>
        `;
    }).join('');

    const totalComissao = state.reduce((a, b) => a + b.comissaoVal, 0);
    document.getElementById('comissaoTotalValor').textContent = fmt(totalComissao);
}

function renderMetasTable(state) {
    const tbody = document.getElementById('metasTableBody');
    tbody.innerHTML = state.map(b => {
        let statusHtml;
        if (b.pct >= 100) {
            statusHtml = `<span class="metas-status-badge metas-status-badge--hit">✓ Bateu</span>`;
        } else if (b.pct >= 80) {
            statusHtml = `<span class="metas-status-badge metas-status-badge--close">~ Quase</span>`;
        } else {
            statusHtml = `<span class="metas-status-badge metas-status-badge--miss">✗ Não bateu</span>`;
        }

        const pctColor = b.pct >= 100 ? 'var(--green)' : b.pct >= 80 ? 'var(--orange)' : 'var(--red)';
        // Formata o valor da meta para exibição no input
        const metaFormatted = b.meta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return `
            <tr data-barber-id="${b.id}">
                <td>
                    <div class="metas-barber-cell">
                        <div class="metas-barber-avatar" style="background: ${BARBER_AVATAR_STYLES[b.id]}">${b.initials}</div>
                        <span class="metas-barber-name">${b.name}</span>
                    </div>
                </td>
                <td><span class="metas-fat-val">${fmt(b.faturamento)}</span></td>
                <td>
                    <label class="metas-editable" title="Clique para editar a meta em R$">
                        <span class="metas-editable__prefix">R$</span>
                        <input
                            type="text"
                            inputmode="decimal"
                            value="${metaFormatted}"
                            data-field="meta"
                            data-id="${b.id}"
                            aria-label="Meta individual de ${b.name.split(' ')[0]} em reais"
                        />
                    </label>
                </td>
                <td style="font-weight: 700; color: ${pctColor};">${b.pct}%</td>
                <td>${statusHtml}</td>
            </tr>
        `;
    }).join('');

    // Listener de edição de meta (com máscara R$)
    tbody.querySelectorAll('input[data-field="meta"]').forEach(input => {
        // Máscara de moeda ao digitar
        input.addEventListener('input', () => {
            let raw = input.value.replace(/\D/g, '');
            if (!raw) { input.value = ''; return; }
            const num = parseInt(raw, 10) / 100;
            input.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            metasSaveBarShow();
        });

        input.addEventListener('change', () => {
            const id = input.dataset.id;
            const raw = input.value.replace(/\./g, '').replace(',', '.');
            const val = parseFloat(raw);
            if (!val || val <= 0) return;
            const m = METAS_DATA.find(x => x.id === id);
            if (m) m.meta = val;
            refreshMetas();
            metasSaveBarShow();
        });
    });
}

function renderComissoesTable(state) {
    const tbody = document.getElementById('comissoesTableBody');
    tbody.innerHTML = state.map(b => `
        <tr data-barber-id="${b.id}">
            <td>
                <div class="metas-barber-cell">
                    <div class="metas-barber-avatar" style="background: ${BARBER_AVATAR_STYLES[b.id]}">${b.initials}</div>
                    <span class="metas-barber-name">${b.name}</span>
                </div>
            </td>
            <td><span class="metas-fat-val">${fmt(b.faturamento)}</span></td>
            <td>
                <label class="metas-editable" title="Clique para editar a comissão">
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value="${b.comissaoPct}"
                        data-field="comissao"
                        data-id="${b.id}"
                        aria-label="Porcentagem de comissão de ${b.name.split(' ')[0]}"
                    />
                    <span class="metas-editable__suffix">%</span>
                </label>
            </td>
            <td><span class="metas-comissao-val">${fmt(b.comissaoVal)}</span></td>
        </tr>
    `).join('');

    // Listener de edição de comissão
    tbody.querySelectorAll('input[data-field="comissao"]').forEach(input => {
        input.addEventListener('input', () => {
            metasSaveBarShow();
        });

        input.addEventListener('change', () => {
            const id = input.dataset.id;
            const val = parseFloat(input.value);
            if (isNaN(val) || val < 0 || val > 100) return;
            const m = METAS_DATA.find(x => x.id === id);
            if (m) m.comissaoPct = val;
            refreshMetas();
            metasSaveBarShow();
        });
    });
}

/* ─── METAS SAVE BAR ────────────────────────────────────── */

// Snapshot dos valores originais antes de qualquer edição
let _metasSnapshot = null;
let _metasSaveBarActive = false;

function metasSaveBarGetSnapshot() {
    return METAS_DATA.map(m => ({ id: m.id, meta: m.meta, comissaoPct: m.comissaoPct }));
}

function metasSaveBarShow() {
    if (_metasSaveBarActive) return;
    _metasSaveBarActive = true;

    // Captura o snapshot na primeira mudança detectada
    if (!_metasSnapshot) {
        _metasSnapshot = metasSaveBarGetSnapshot();
    }

    const bar = document.getElementById('metasSaveBar');
    if (!bar) return;
    bar.setAttribute('aria-hidden', 'false');
    // Força reflow antes de adicionar a classe para garantir a animação
    void bar.offsetHeight;
    bar.classList.add('is-visible');
}

function metasSaveBarHide() {
    _metasSaveBarActive = false;
    _metasSnapshot = null;

    const bar = document.getElementById('metasSaveBar');
    if (!bar) return;
    bar.classList.remove('is-visible');
    bar.setAttribute('aria-hidden', 'true');
}

function metasSaveBarCancel() {
    if (!_metasSnapshot) {
        metasSaveBarHide();
        return;
    }

    // Restaura os valores do snapshot
    _metasSnapshot.forEach(snap => {
        const m = METAS_DATA.find(x => x.id === snap.id);
        if (m) {
            m.meta = snap.meta;
            m.comissaoPct = snap.comissaoPct;
        }
    });

    metasSaveBarHide();
    refreshMetas();
}

async function metasSaveBarSave() {
    const btn = document.getElementById('metasBtnSave');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Salvando…';
    }

    try {
        await salvarMetasEComissoes(METAS_DATA);
        metasSaveBarHide();
        showToast('Metas e comissões salvas com sucesso.', 'success');
    } catch (err) {
        showToast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Salvar alterações';
        }
    }
}

async function salvarMetasEComissoes(metasData) {
    const promises = metasData.map(m =>
        InBarberAPI.saveBarberMetaComissao(m.id, {
            meta_valor:   m.meta,
            comissao_pct: m.comissaoPct,
        })
    );
    return Promise.all(promises);
}   

function initMetasSaveBar() {
    const btnCancel = document.getElementById('metasBtnCancel');
    const btnSave   = document.getElementById('metasBtnSave');

    if (btnCancel) btnCancel.addEventListener('click', metasSaveBarCancel);
    if (btnSave)   btnSave.addEventListener('click', metasSaveBarSave);
}

async function loadMetasData() {
    const metasTbody      = document.getElementById('metasTableBody');
    const comissoesTbody  = document.getElementById('comissoesTableBody');
    const loadingRow      = `
        <tr>
            <td colspan="5" style="text-align:center; padding:32px; color:var(--muted); font-size:13px;">
                Carregando…
            </td>
        </tr>`;

    if (metasTbody)     metasTbody.innerHTML     = loadingRow;
    if (comissoesTbody) comissoesTbody.innerHTML  = loadingRow.replace('colspan="5"', 'colspan="4"');

    try {
        const [barbers, metas] = await Promise.all([
            InBarberAPI.listBarbers(),
            InBarberAPI.getBarbersMetas(),
        ]);

        // Mapas de cor dinâmicos
        BARBER_AVATAR_STYLES   = {};
        BARBER_PROGRESS_COLORS = {};
        barbers.forEach((b, i) => {
            BARBER_AVATAR_STYLES[b.id]   = _AVATAR_PALETTE[i % _AVATAR_PALETTE.length];
            BARBER_PROGRESS_COLORS[b.id] = _PROGRESS_PALETTE[i % _PROGRESS_PALETTE.length];
        });

        // Monta METAS_DATA combinando barbeiros + metas do período
        const metaMap = {};
        metas.forEach(m => { metaMap[m.barbeiro_id] = m.meta_valor; });

        METAS_DATA = barbers.map(b => ({
            id:          b.id,
            name:        b.nome || b.name,
            initials:    (b.nome || b.name)
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(p => p[0].toUpperCase())
                            .join(''),
            faturamento: 0,   // será alimentado pela integração de agendamentos (próxima etapa)
            comissaoPct: b.comissao_pct ?? 0,
            meta:        metaMap[b.id] ?? 0,
        }));

        META_BARBEARIA_TOTAL = METAS_DATA.reduce((a, m) => a + m.meta, 0);

        refreshMetas();
    } catch (err) {
        console.error('[Metas] Erro ao carregar dados:', err);
        const errRow = (cols) => `
            <tr>
                <td colspan="${cols}" style="text-align:center; padding:32px; color:var(--red); font-size:13px;">
                    Erro ao carregar dados. Verifique a conexão com o servidor.
                </td>
            </tr>`;
        if (metasTbody)     metasTbody.innerHTML     = errRow(5);
        if (comissoesTbody) comissoesTbody.innerHTML  = errRow(4);
    }
}

function refreshMetas() {
    const state = calcMetasState();
    renderMetasKPIs(state);
    renderMetasTable(state);
    renderComissoesTable(state);
}

/* ─── 8. SAÍDAS ─────────────────────────────────────────── */

const SAIDAS_PGTO_COLORS = {
    'PIX':          '#00d68f',
    'Cartão':       '#0047ff',
    'Dinheiro':     '#ff9c40',
    'Boleto':       '#4da6ff',
    'Transferência':'#00f0ff',
};

const SAIDAS_CAT_COLORS = {
    'Aluguel':      'var(--gold)',
    'Produtos':     'var(--green)',
    'Manutenção':   'var(--orange)',
    'Marketing':    'var(--blue)',
    'Utilidades':   'var(--red)',
    'Pessoal':      'var(--gold-lt)',
    'Equipamentos': 'var(--purple)',
    'Outros':       'var(--muted)',
};

let saidasPgtoChart = null;

function getSaidasFiltradas() {
    const cat  = document.getElementById('saidasFiltroCategoria')?.value || '';
    const pgto = document.getElementById('saidasFiltroPgto')?.value     || '';
    return SAIDAS_DATA.filter(s =>
        (!cat  || s.categoria === cat) &&
        (!pgto || s.pgto === pgto)
    );
}

async function loadSaidasData() {
    const periodoEl = document.getElementById('saidasFiltroPeriodo');
    const catEl     = document.getElementById('saidasFiltroCategoria');
    const pgtoEl    = document.getElementById('saidasFiltroPgto');

    const filters = {
        periodo:   periodoEl?.value  || 'mes',
        categoria: catEl?.value      || '',
        pgto:      pgtoEl?.value     || '',
    };

    try {
        const rows = await InBarberAPI.listSaidas(filters);
        SAIDAS_DATA = rows;
    } catch (err) {
        console.error('[Saídas] Erro ao carregar:', err);
        SAIDAS_DATA = [];
        showToast('Erro ao carregar saídas. Verifique a conexão.', 'error');
    }

    refreshSaidas();
}

function renderSaidasKPIs(data) {
    const total = data.reduce((a, s) => a + s.valor, 0);
    document.getElementById('kpiSaidasTotal').textContent = fmt(total);
    document.getElementById('kpiSaidasTrend').textContent = '↑ 7,3%';

    // Maior categoria
    const catMap = {};
    data.forEach(s => { catMap[s.categoria] = (catMap[s.categoria] || 0) + s.valor; });
    let maiorCat = '—'; let maiorVal = 0;
    Object.entries(catMap).forEach(([cat, val]) => {
        if (val > maiorVal) { maiorVal = val; maiorCat = cat; }
    });
    document.getElementById('kpiMaiorCategoria').textContent = maiorCat;
    document.getElementById('kpiMaiorCategoriaVal').textContent = fmt(maiorVal);

    // Donut por forma de pagamento
    const pgtoMap = {};
    data.forEach(s => { pgtoMap[s.pgto] = (pgtoMap[s.pgto] || 0) + s.valor; });
    const pgtoEntries = Object.entries(pgtoMap).sort((a, b) => b[1] - a[1]);

    document.getElementById('saidasPgtoTotal').textContent = fmtK(total);

    const listEl = document.getElementById('saidasPgtoList');
    listEl.innerHTML = pgtoEntries.map(([pgto, val]) => {
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
        const col = SAIDAS_PGTO_COLORS[pgto] || 'var(--muted)';
        return `
            <div class="saidas-pgto-item">
                <span class="saidas-pgto-dot" style="background: ${col}"></span>
                <span class="saidas-pgto-name">${pgto}</span>
                <div class="saidas-pgto-bar-wrap">
                    <div class="saidas-pgto-bar-fill" style="width: ${pct}%; background: ${col};"></div>
                </div>
                <span class="saidas-pgto-pct">${pct}%</span>
            </div>
        `;
    }).join('');

    // Gráfico de pizza
    const ctx = document.getElementById('saidasPgtoChart').getContext('2d');
    if (saidasPgtoChart) saidasPgtoChart.destroy();

    if (pgtoEntries.length === 0) return;

    const tooltip      = document.getElementById('chartTooltip');
    const tooltipInner = document.getElementById('chartTooltipInner');

    const saidasPgtoTooltip = (context) => {
        const { chart, tooltip: tip } = context;
        if (tip.opacity === 0) { tooltip.classList.remove('is-visible'); return; }

        const idx = tip.dataPoints[0].dataIndex;
        const [pgto, val] = pgtoEntries[idx];
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
        const col = SAIDAS_PGTO_COLORS[pgto] || '#6B6762';

        tooltipInner.innerHTML = `
          <div class="chart-tooltip__title">${pgto}</div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__dot" style="background:${col}"></span>
            <span class="chart-tooltip__label">Total pago</span>
            <span class="chart-tooltip__val">${fmt(val)}</span>
          </div>
          <div class="chart-tooltip__divider"></div>
          <div class="chart-tooltip__row">
            <span class="chart-tooltip__total-label">Participação</span>
            <span class="chart-tooltip__total-val">${pct}%</span>
          </div>
        `;

        const canvasRect = chart.canvas.getBoundingClientRect();
        const x = canvasRect.left + tip.caretX;
        const y = canvasRect.top  + tip.caretY;

        positionTooltip(tooltip, x, y);
        tooltip.classList.add('is-visible');
    };

    saidasPgtoChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: pgtoEntries.map(([p]) => p),
            datasets: [{
                data: pgtoEntries.map(([, v]) => v),
                backgroundColor: pgtoEntries.map(([p]) => SAIDAS_PGTO_COLORS[p] || '#6B6762'),
                borderColor: '#0A0A0A00',
                borderWidth: 3,
                hoverOffset: 5,
            }],
        },
        options: {
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false, external: saidasPgtoTooltip },
            },
            animation: { duration: 600, easing: 'easeInOutQuart' },
        },
    });

    document.getElementById('saidasPgtoChart').addEventListener('mouseleave', hideTooltip);
}

function renderSaidasTable(data) {
    const tbody = document.getElementById('saidasTableBody');
    const sub   = document.getElementById('saidasTableSub');

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--muted); font-size: 13px;">
                    Nenhuma saída encontrada para os filtros selecionados.
                </td>
            </tr>`;
        sub.textContent = '0 registros encontrados';
        return;
    }

    sub.textContent = `${data.length} ${data.length === 1 ? 'registro encontrado' : 'registros encontrados'}`;

    const sorted = [...data].sort((a, b) => b.data.localeCompare(a.data));

    tbody.innerHTML = sorted.map(s => {
        const [y, m, d] = s.data.split('-');
        const dataFmt = `${d}/${m}/${y}`;
        const catColor = SAIDAS_CAT_COLORS[s.categoria] || 'var(--muted)';
        return `
            <tr>
                <td style="color: var(--muted); font-size: 12px; font-weight: 600;">${dataFmt}</td>
                <td style="font-weight: 600; color: var(--cream);">${s.desc}</td>
                <td>
                    <span class="saidas-cat-badge" style="--cat-color: ${catColor};">${s.categoria}</span>
                </td>
                <td style="font-weight: 700; color: rgba(0, 214, 143, 0.59);">${fmt(s.valor)}</td>
                <td>
                    <span class="saidas-pgto-badge">${s.pgto}</span>
                </td>
                <td>
                    <div class="saidas-actions">
                        <button class="saidas-action-btn saidas-action-btn--edit" data-id="${s.id}" aria-label="Editar saída">
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                                <path d="M9 2l2 2-7 7H2V9l7-7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                        <button class="saidas-action-btn saidas-action-btn--del" data-id="${s.id}" data-desc="${s.desc}" aria-label="Excluir saída">
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                                <path d="M2 3h9M5 3V2h3v1M4 3v7h5V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Ação editar
    tbody.querySelectorAll('.saidas-action-btn--edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = btn.dataset.id;
            const saida = SAIDAS_DATA.find(s => String(s.id) === id);
            if (!saida) return;
            openSaidasModal(saida);
        });
    });

    // Ação excluir
    tbody.querySelectorAll('.saidas-action-btn--del').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = btn.dataset.id;
            const desc = btn.dataset.desc;
            openDeleteModal(id, desc);
        });
    });
}

function refreshSaidas() {
    const data = getSaidasFiltradas();
    renderSaidasKPIs(data);
    renderSaidasTable(data);
}

/* Modal Saídas */
function openSaidasModal(saida = null) {
    const overlay = document.getElementById('saidasModalOverlay');
    const title   = document.getElementById('saidasModalTitle');
    const idInput = document.getElementById('saidasModalId');
    const desc    = document.getElementById('saidasModalDesc');
    const data    = document.getElementById('saidasModalData');
    const cat     = document.getElementById('saidasModalCategoria');
    const valor   = document.getElementById('saidasModalValor');
    const pgto    = document.getElementById('saidasModalPgto');

    if (saida) {
        title.textContent     = 'Editar Saída';
        idInput.value         = saida.id;
        desc.value            = saida.desc;
        data.value            = saida.data;
        cat.value             = saida.categoriaId;
        valor.value           = saida.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        pgto.value            = saida.pgtoId;
    } else {
        title.textContent = 'Nova Saída';
        idInput.value     = '';
        desc.value        = '';
        data.value        = new Date().toISOString().split('T')[0];
        cat.value         = '';
        valor.value       = '';
        pgto.value        = '';
    }

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    desc.focus();
}

function closeSaidasModal() {
    const overlay = document.getElementById('saidasModalOverlay');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
}

function openDeleteModal(id, desc) {
    document.getElementById('saidasDeleteDesc').textContent = desc;
    document.getElementById('saidasDeleteConfirm').dataset.id = id;
    const overlay = document.getElementById('saidasDeleteOverlay');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
}

function closeDeleteModal() {
    const overlay = document.getElementById('saidasDeleteOverlay');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-open');
}

async function loadSaidasLookups() {
    try {
        const [categorias, formas] = await Promise.all([
            InBarberAPI.listSaidasCategorias(),
            InBarberAPI.listSaidasPgto(),
        ]);

        // Popula selects do modal
        const catModal  = document.getElementById('saidasModalCategoria');
        const pgtoModal = document.getElementById('saidasModalPgto');

        if (catModal) {
            catModal.innerHTML = '<option value="">Selecionar...</option>' +
                categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        }
        if (pgtoModal) {
            pgtoModal.innerHTML = '<option value="">Selecionar...</option>' +
                formas.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
        }

        // Popula filtros da toolbar
        const catFiltro  = document.getElementById('saidasFiltroCategoria');
        const pgtoFiltro = document.getElementById('saidasFiltroPgto');

        if (catFiltro) {
            catFiltro.innerHTML = '<option value="">Todas as categorias</option>' +
                categorias.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
        }
        if (pgtoFiltro) {
            pgtoFiltro.innerHTML = '<option value="">Todas as formas</option>' +
                formas.map(f => `<option value="${f.nome}">${f.nome}</option>`).join('');
        }

    } catch (err) {
        console.error('[Saídas] Erro ao carregar lookups:', err);
    }
}

function initSaidasModals() {
    // Popula selects de categoria e forma de pagamento via API
    loadSaidasLookups();

    // Máscara de moeda no valor
    const valorInput = document.getElementById('saidasModalValor');
    valorInput?.addEventListener('input', () => {
        let raw = valorInput.value.replace(/\D/g, '');
        if (!raw) { valorInput.value = ''; return; }
        const num = parseInt(raw, 10) / 100;
        valorInput.value = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    // Botão Nova Saída
    document.getElementById('btnNovaSaida')?.addEventListener('click', () => openSaidasModal());

    // Fechar modal edição
    document.getElementById('saidasModalClose')?.addEventListener('click', closeSaidasModal);
    document.getElementById('saidasModalCancel')?.addEventListener('click', closeSaidasModal);
    document.getElementById('saidasModalOverlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeSaidasModal();
    });

    // Salvar — criar ou editar via API
    document.getElementById('saidasModalSave')?.addEventListener('click', async () => {
        const saveBtn = document.getElementById('saidasModalSave');
        const idVal   = document.getElementById('saidasModalId').value;
        const desc    = document.getElementById('saidasModalDesc').value.trim();
        const data    = document.getElementById('saidasModalData').value;
        const catSel  = document.getElementById('saidasModalCategoria');
        const cat     = catSel.value;
        const raw     = document.getElementById('saidasModalValor').value.replace(/\./g, '').replace(',', '.');
        const valor   = parseFloat(raw);
        const pgtoSel = document.getElementById('saidasModalPgto');
        const pgto    = pgtoSel.value;

        if (!desc || !data || !cat || !valor || !pgto) {
            showToast('Preencha todos os campos.', 'warn');
            return;
        }

        const categoriaId = parseInt(cat, 10);
        const pgtoId      = parseInt(pgto, 10);

        if (isNaN(categoriaId) || isNaN(pgtoId)) {
            showToast('Selecione categoria e forma de pagamento válidas.', 'warn');
            return;
        }

        saveBtn.disabled   = true;
        saveBtn.textContent = 'Salvando...';

        const payload = {
            descricao:   desc,
            data:        data,
            categoriaId: categoriaId,
            valor:       valor,
            pgtoId:      pgtoId,
        };

        try {
            if (idVal) {
                await InBarberAPI.updateSaida(Number(idVal), payload);
                showToast('Saída atualizada com sucesso!', 'success');
            } else {
                await InBarberAPI.createSaida(payload);
                showToast('Saída registrada com sucesso!', 'success');
            }
            closeSaidasModal();
            await loadSaidasData();
        } catch (err) {
            console.error('[Saídas] Erro ao salvar:', err);
            showToast(err.message || 'Erro ao salvar saída.', 'error');
        } finally {
            saveBtn.disabled   = false;
            saveBtn.textContent = 'Salvar';
        }
    });

    // Fechar modal exclusão
    document.getElementById('saidasDeleteClose')?.addEventListener('click', closeDeleteModal);
    document.getElementById('saidasDeleteCancel')?.addEventListener('click', closeDeleteModal);
    document.getElementById('saidasDeleteOverlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });

    // Confirmar exclusão — remove via API e recarrega a listagem
    document.getElementById('saidasDeleteConfirm')?.addEventListener('click', async () => {
        const confirmBtn = document.getElementById('saidasDeleteConfirm');
        const id = confirmBtn.dataset.id;
        if (!id) return;

        confirmBtn.disabled    = true;
        confirmBtn.textContent = 'Excluindo...';

        try {
            await InBarberAPI.deleteSaida(Number(id));
            showToast('Saída excluída com sucesso!', 'success');
            closeDeleteModal();
            await loadSaidasData();
        } catch (err) {
            console.error('[Saídas] Erro ao excluir:', err);
            showToast(err.message || 'Erro ao excluir saída.', 'error');
        } finally {
            confirmBtn.disabled    = false;
            confirmBtn.textContent = 'Excluir';
        }
    });

    // Filtros — ao mudar qualquer filtro, busca novamente na API
    ['saidasFiltroCategoria', 'saidasFiltroPgto', 'saidasFiltroPeriodo'].forEach(filtroId => {
        document.getElementById(filtroId)?.addEventListener('change', async () => {
            const periodoEl = document.getElementById('saidasFiltroPeriodo');
            const periodoMap = {
                dia: 'Hoje', semana: 'Esta semana', mes: 'Este mês',
                trimestre: 'Trimestre', semestre: 'Semestre', ano: 'Este ano',
            };
            const badge = document.getElementById('saidasPeriodoBadge');
            if (badge && periodoEl) badge.textContent = periodoMap[periodoEl.value] || 'Este mês';
            await loadSaidasData();
        });
    });
}

/* Toast (caso não exista) */
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `saidas-toast saidas-toast--${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 320);
    }, 2800);
}

/* ─── 8. PERIOD FILTER ──────────────────────────────────── */
// Períodos já buscados da API nesta sessão da tela, pra não refazer a
// mesma chamada toda vez que o usuário clica de novo no mesmo pill.
const LINE_DATA_LOADED = { dia: false, semana: false, mes: false };

async function loadLineChartData(period) {
    try {
        const resp = await InBarberAPI.getVisaoGeralFinanceiro({ evolucao: period });
        LINE_DATA[period] = resp.evolucao || { labels: [], values: [] };
        LINE_DATA_LOADED[period] = true;
    } catch (err) {
        console.error('[Visão Geral] Erro ao carregar evolução do faturamento:', err);
        showToast('Erro ao carregar a evolução do faturamento.', 'error');
        LINE_DATA[period] = { labels: [], values: [] };
    }
}

function initPeriodFilter() {
    document.querySelectorAll('.chart-pill').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.chart-pill').forEach(b => b.classList.remove('chart-pill--active'));
            btn.classList.add('chart-pill--active');
            activePeriod = btn.dataset.period;

            if (!LINE_DATA_LOADED[activePeriod]) {
                await loadLineChartData(activePeriod);
            }
            renderLineChart(activePeriod);
        });
    });
}

/* ─── 9. FIN TABS ───────────────────────────────────────── */
function initFinTabs() {
    const tabs = document.querySelectorAll('.fin-tab');
    const panels = document.querySelectorAll('.fin-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('fin-tab--active');
                t.setAttribute('aria-selected', 'false');
            });
            panels.forEach(p => p.classList.add('fin-panel--hidden'));

            tab.classList.add('fin-tab--active');
            tab.setAttribute('aria-selected', 'true');

            const target = document.getElementById('fin-' + tab.dataset.fin);
            if (target) target.classList.remove('fin-panel--hidden');
        });
    });
}

/* ─── 10. SIDEBAR ───────────────────────────────────────── */
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const burger = document.getElementById('burgerBtn');
    const toggleBtn = document.getElementById('sidebarToggleBtn');

    // Mobile
    const openSidebar = () => {
        sidebar.classList.add('is-open');
        overlay.classList.add('is-visible');
        overlay.removeAttribute('aria-hidden');
        burger?.classList.add('is-open');
        burger?.setAttribute('aria-expanded', 'true');
    };
    const closeSidebar = () => {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
        burger?.classList.remove('is-open');
        burger?.setAttribute('aria-expanded', 'false');
    };

    burger?.addEventListener('click', () =>
        sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar()
    );
    overlay?.addEventListener('click', closeSidebar);

    // Desktop collapse
    const collapseSidebar = () => {
        sidebar.classList.add('is-collapsed');
        sidebar.classList.remove('is-expanded');
        toggleBtn?.setAttribute('aria-expanded', 'false');
        toggleBtn?.setAttribute('aria-label', 'Expandir menu');
        try { localStorage.setItem('sidebarCollapsed', '1'); } catch (e) { }
    };
    const expandSidebar = () => {
        sidebar.classList.remove('is-collapsed');
        sidebar.classList.add('is-expanded');
        toggleBtn?.setAttribute('aria-expanded', 'true');
        toggleBtn?.setAttribute('aria-label', 'Recolher menu');
        try { localStorage.setItem('sidebarCollapsed', '0'); } catch (e) { }
    };

    toggleBtn?.addEventListener('click', () =>
        sidebar.classList.contains('is-collapsed') ? expandSidebar() : collapseSidebar()
    );

    // Restore state
    try {
        if (localStorage.getItem('sidebarCollapsed') === '0') expandSidebar();
    } catch (e) { }
}

/* ─── 11. TOOLTIP HIDE ON SCROLL ───────────────────────── */
function initTooltipHide() {
    document.addEventListener('scroll', hideTooltip, { passive: true });
}

/* ═══════════════════════════════════════════════════════════
   ANIMAÇÕES DE ENTRADA — Financeiro
   Replicando o padrão do Dashboard:
     • animateCounter    → contagem de 0 até o valor (ease-out cubic)
     • initScrollReveal  → fade-in + translateY nos cards e seções
═══════════════════════════════════════════════════════════ */

/**
 * Anima um contador de `from` até `to` em `duration`ms
 * Idêntico ao dashboard.js — ease-out cubic
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 * @param {number} duration
 * @param {Function} [formatter]
 */
function animateCounter(el, from, to, duration, formatter) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = formatter ? formatter(to) : to;
        return;
    }
    // Só arredonda pra inteiro quando NÃO há formatter (contadores simples,
    // ex: total de cortes). Valores monetários (com formatter) interpolam em
    // ponto flutuante e, no frame final, usam `to` exato — Math.round no
    // frame final truncava centavos reais (R$ 358,97 virava R$ 359,00).
    const start = performance.now();
    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const raw = from + (to - from) * ease;
        const current = progress >= 1
            ? to
            : (formatter ? raw : Math.round(raw));
        el.textContent = formatter ? formatter(current) : current;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

/**
 * Scroll-reveal para KPI cards, payment cards, chart cards e seções —
 * fade-in + translateY, com stagger de 40ms (máx 300ms),
 * idêntico ao initScrollReveal do dashboard.js
 */
function initScrollReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll(
        '.fin-kpi-card, .payment-card, .caixa-card, .chart-card, .metas-card, .saidas-card, .fin-section'
    );

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = parseInt(el.dataset.revealDelay || 0);
                setTimeout(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, delay);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.08 });

    targets.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
        el.style.transition = 'opacity 480ms var(--ease-out), transform 480ms var(--ease-out)';
        el.dataset.revealDelay = Math.min(i * 40, 300);
        observer.observe(el);
    });
}

/**
 * Anima as barras de progresso dos payment cards após renderização.
 * As barras começam em 0% e expandem até o valor real.
 */
function animatePaymentBars() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.payment-card__bar-fill').forEach((bar) => {
        const targetWidth = bar.style.width;
        bar.style.width = '0%';
        bar.style.transition = 'width 900ms var(--ease-out)';
        // Delay alinhado com o stagger do scroll-reveal dos payment cards
        setTimeout(() => { bar.style.width = targetWidth; }, 300);
    });
}


/* ─── 11.5 VISÃO GERAL ──────────────────────────────────── */

/**
 * Carrega todos os dados reais da sub-aba Visão Geral
 * (GET /api/financeiro/visao-geral) e popula os estados globais
 * consumidos pelos renders: PAYMENT_METHODS, FIN_BARBERS, VISAO_GERAL_KPIS.
 * O gráfico de linha é carregado à parte por loadLineChartData(),
 * pois tem filtro de período independente (Dia | Semana | Mês).
 */
async function loadVisaoGeralData() {
    try {
        const resp = await InBarberAPI.getVisaoGeralFinanceiro({ periodo: 'mes' });

        VISAO_GERAL_KPIS = {
            faturamentoTotal:   resp.kpis?.faturamentoTotal   ?? 0,
            faturamentoLiquido: resp.kpis?.faturamentoLiquido ?? 0,
            totalCortes:        resp.kpis?.totalCortes        ?? 0,
        };

        PAYMENT_METHODS = (resp.formasPagamento || []).map(f => ({
            id:      f.id,
            label:   f.nome,
            cssClass: normalizarFormaPagamentoKey(f.nome),
            total:   f.total,
            count:   f.count,
            entries: f.entries || [],
        }));

        FIN_BARBERS = (resp.barbeiros || []).map((b, i) => ({
            id:          b.id,
            name:        b.nome,
            initials:    (b.nome || '')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(p => p[0].toUpperCase())
                            .join(''),
            cssClass:    `barber-${i}`,
            faturamento: b.faturamento,
            cortes:      b.cortes,
        }));

        renderKPIs();
        renderDonut();
        renderPaymentCards();
        renderBarChart();
    } catch (err) {
        console.error('[Visão Geral] Erro ao carregar dados:', err);
        showToast('Erro ao carregar a Visão Geral. Verifique a conexão com o servidor.', 'error');
    }
}

/* ─── 12. BOOT ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    initPeriodFilter();
    initFinTabs();
    initSidebar();
    initTooltipHide();

    // Visão Geral — dados reais (substitui os antigos mocks PAYMENT_METHODS,
    // FIN_BARBERS e LINE_DATA). KPIs/donut/cards/barras vêm de uma única
    // chamada; o gráfico de linha é carregado à parte pelo período ativo.
    await Promise.all([
        loadVisaoGeralData(),
        loadLineChartData(activePeriod),
    ]);
    renderLineChart(activePeriod);

    loadMetasData();
    initMetasSaveBar();
    loadSaidasData();
    initSaidasModals();

    // ── Animações de entrada ──────────────────────────────────
    initScrollReveal();
    animatePaymentBars();
    // ─────────────────────────────────────────────────────────
});