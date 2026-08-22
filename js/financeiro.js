'use strict';

/* ─── 1. MOCK DATA ──────────────────────────────────────── */

const FIN_BARBERS = [
    { id: 'marcos', name: 'Marcos Silva', initials: 'MS', cssClass: 'marcos', faturamento: 8_240, cortes: 112 },
    { id: 'joao', name: 'João Pereira', initials: 'JP', cssClass: 'joao', faturamento: 6_480, cortes: 95 },
    { id: 'andre', name: 'André Santos', initials: 'AS', cssClass: 'andre', faturamento: 5_830, cortes: 84 },
    { id: 'carlos', name: 'Carlos Lima', initials: 'CL', cssClass: 'carlos', faturamento: 3_450, cortes: 52 },
];

const PAYMENT_METHODS = [
    {
        id: 'pix', label: 'PIX', cssClass: 'pix', total: 10_240, count: 148,
        entries: [
            { date: '21/08', client: 'Lucas Andrade', service: 'Corte + Barba', val: 70 },
            { date: '21/08', client: 'Felipe Rocha', service: 'Corte Masculino', val: 45 },
            { date: '21/08', client: 'Gabriel Souza', service: 'Pigmentação', val: 90 },
            { date: '20/08', client: 'Matheus Lima', service: 'Barba', val: 35 },
            { date: '20/08', client: 'Ricardo F.', service: 'Corte Masculino', val: 45 },
            { date: '19/08', client: 'Thiago Oliveira', service: 'Combo', val: 70 },
            { date: '19/08', client: 'Diego Martins', service: 'Relaxamento', val: 80 },
        ],
    },
    {
        id: 'cartao', label: 'Cartão', cssClass: 'cartao', total: 7_320, count: 98,
        entries: [
            { date: '21/08', client: 'Bruno Carvalho', service: 'Corte + Barba', val: 70 },
            { date: '21/08', client: 'Vinicius Alves', service: 'Sobrancelha', val: 20 },
            { date: '20/08', client: 'Leonardo Costa', service: 'Pigmentação', val: 90 },
            { date: '20/08', client: 'Samuel Pereira', service: 'Corte Masculino', val: 45 },
            { date: '19/08', client: 'Rafael N.', service: 'Relaxamento', val: 80 },
            { date: '18/08', client: 'Igor Campos', service: 'Combo', val: 70 },
        ],
    },
    {
        id: 'dinheiro', label: 'Dinheiro', cssClass: 'dinheiro', total: 4_940, count: 72,
        entries: [
            { date: '21/08', client: 'Henrique Duarte', service: 'Corte Masculino', val: 45 },
            { date: '21/08', client: 'Gustavo Mendes', service: 'Barba', val: 35 },
            { date: '20/08', client: 'Pedro Linhares', service: 'Combo', val: 70 },
            { date: '19/08', client: 'Rodrigo Fonseca', service: 'Pigmentação', val: 90 },
            { date: '18/08', client: 'Cauã Ribeiro', service: 'Relaxamento', val: 80 },
        ],
    },
    {
        id: 'outros', label: 'Outros', cssClass: 'outros', total: 1_500, count: 25,
        entries: [
            { date: '21/08', client: 'Cliente Avulso', service: 'Sobrancelha', val: 20 },
            { date: '19/08', client: 'Cliente Avulso', service: 'Corte Masculino', val: 45 },
            { date: '18/08', client: 'Cliente Avulso', service: 'Barba', val: 35 },
        ],
    },
    {
        id: 'credito', label: 'Crédito', cssClass: 'credito', total: 3_180, count: 41,
        entries: [
            { date: '21/08', client: 'Anderson Silva', service: 'Pigmentação', val: 90 },
            { date: '20/08', client: 'Rodrigo Teixeira', service: 'Combo', val: 70 },
            { date: '19/08', client: 'Paulo Mendes', service: 'Corte Masculino', val: 45 },
            { date: '18/08', client: 'Fábio Correia', service: 'Relaxamento', val: 80 },
        ],
    },
    {
        id: 'voucher', label: 'Voucher', cssClass: 'voucher', total: 920, count: 14,
        entries: [
            { date: '21/08', client: 'Carlos Eduardo', service: 'Corte Masculino', val: 45 },
            { date: '20/08', client: 'Thiago Lopes', service: 'Barba', val: 35 },
            { date: '18/08', client: 'Marcus Vitor', service: 'Sobrancelha', val: 20 },
        ],
    },
];

const SAIDAS_TOTAL = 2_340;

// Dados para o gráfico de linha por período
const LINE_DATA = {
    dia: {
        labels: ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h'],
        values: [120, 190, 215, 160, 75, 230, 185, 210, 140, 295, 180, 90],
    },
    semana: {
        labels: ['Seg 18', 'Ter 19', 'Qua 20', 'Qui 21', 'Sex 22', 'Sáb 23', 'Dom 24'],
        values: [1_840, 2_310, 1_980, 2_760, 3_120, 4_420, 870],
    },
    mes: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'],
        values: [14_200, 12_800, 15_400, 13_900, 16_200, 17_800, 15_600, 24_000],
    },
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
    const totalFaturamento = PAYMENT_METHODS.reduce((a, m) => a + m.total, 0);
    const faturamentoLiquido = totalFaturamento - SAIDAS_TOTAL;
    const totalCortes = FIN_BARBERS.reduce((a, b) => a + b.cortes, 0);

    document.getElementById('kpiFaturamentoTotal').textContent = fmt(totalFaturamento);
    document.getElementById('kpiFaturamentoLiquido').textContent = fmt(faturamentoLiquido);
    document.getElementById('kpiCortes').textContent = totalCortes;

    document.getElementById('kpiFaturamentoTrend').textContent = '↑ 12,4%';
    document.getElementById('kpiLiquidoTrend').textContent = '↑ 9,8%';
    document.getElementById('kpiCortesTrend').textContent = '↑ 8,2%';

    document.getElementById('caixaTotalRecebido').textContent = fmt(totalFaturamento);
    document.getElementById('donutCenterValue').textContent = fmtK(totalFaturamento);
    document.getElementById('finHeaderDate').textContent = getTodayLabel();
}

/* ─── 4. DONUT CHART ────────────────────────────────────── */
const DONUT_COLORS = {
    pix:      { fill: '#00d68f', glow: 'rgba(0,214,143,0.4)' },
    cartao:   { fill: '#0047ff', glow: 'rgba(0,71,255,0.4)' },
    dinheiro: { fill: '#ff9c40', glow: 'rgba(255,156,64,0.4)' },
    outros:   { fill: '#8b5cf6', glow: 'rgba(139,92,246,0.4)' },
    credito:  { fill: '#ff4d6a', glow: 'rgba(255,77,106,0.4)' },
    voucher:  { fill: '#00f0ff', glow: 'rgba(0,240,255,0.4)' },
};

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
        const pct = ((m.total / total) * 100).toFixed(1);
        const col = DONUT_COLORS[m.id].fill;

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
                backgroundColor: PAYMENT_METHODS.map(m => DONUT_COLORS[m.id].fill),
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
        const pct = ((m.total / total) * 100).toFixed(1);
        return `
          <div class="caixa-legend-item">
            <span class="caixa-legend-dot" style="background:${DONUT_COLORS[m.id].fill}"></span>
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

    grid.innerHTML = PAYMENT_METHODS.map(m => {
        const pct = ((m.total / total) * 100).toFixed(1);
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

    const BAR_COLORS = [
        'rgba(0,71,255,0.8)',
        'rgba(77,166,255,0.8)',
        'rgba(0,214,143,0.8)',
        'rgba(139,92,246,0.8)',
    ];

    const externalTooltip = (context) => {
        const { chart, tooltip: tip } = context;
        if (tip.opacity === 0) { tooltip.classList.remove('is-visible'); return; }
        if (!tip.dataPoints?.length) return;

        const idx = tip.dataPoints[0].dataIndex;
        const barber = FIN_BARBERS[idx];
        const total = FIN_BARBERS.reduce((a, b) => a + b.faturamento, 0);
        const pct = ((barber.faturamento / total) * 100).toFixed(1);
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
            <span class="chart-tooltip__val">${fmt(barber.faturamento / barber.cortes)}</span>
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

    // Barber photo labels
    const wrap = document.getElementById('barberPhotoLabels');
    wrap.innerHTML = FIN_BARBERS.map(b => `
        <div class="barber-photo-item">
          <div class="barber-photo-avatar barber-photo-avatar--${b.cssClass}">${b.initials}</div>
          <span class="barber-photo-name">${b.name.split(' ')[0]}</span>
        </div>
      `).join('');
}

/* ─── 8. PERIOD FILTER ──────────────────────────────────── */
function initPeriodFilter() {
    document.querySelectorAll('.chart-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-pill').forEach(b => b.classList.remove('chart-pill--active'));
            btn.classList.add('chart-pill--active');
            activePeriod = btn.dataset.period;
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

/* ─── 12. BOOT ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    renderKPIs();
    renderDonut();
    renderPaymentCards();
    renderLineChart(activePeriod);
    renderBarChart();
    initPeriodFilter();
    initFinTabs();
    initSidebar();
    initTooltipHide();
});