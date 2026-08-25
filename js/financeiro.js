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

// Mock data para Metas & Comissões
// meta agora é em R$ (valor gerado), não em cortes
const METAS_DATA = [
    { id: 'marcos', meta: 9_000, comissaoPct: 30 },
    { id: 'joao',   meta: 7_500, comissaoPct: 28 },
    { id: 'andre',  meta: 6_500, comissaoPct: 25 },
    { id: 'carlos', meta: 4_000, comissaoPct: 22 },
];

const META_BARBEARIA_TOTAL = 28_000;

// Mock data para Saídas
let SAIDAS_DATA = [
    { id: 1,  data: '2025-08-01', desc: 'Aluguel do espaço',           categoria: 'Aluguel',      valor: 2200, pgto: 'Transferência' },
    { id: 2,  data: '2025-08-03', desc: 'Shampoo e condicionadores',   categoria: 'Produtos',     valor: 340,  pgto: 'PIX'           },
    { id: 3,  data: '2025-08-05', desc: 'Manutenção das cadeiras',     categoria: 'Manutenção',   valor: 480,  pgto: 'PIX'           },
    { id: 4,  data: '2025-08-07', desc: 'Energia elétrica',            categoria: 'Utilidades',   valor: 310,  pgto: 'Boleto'        },
    { id: 5,  data: '2025-08-08', desc: 'Cera e pomadas',              categoria: 'Produtos',     valor: 210,  pgto: 'Dinheiro'      },
    { id: 6,  data: '2025-08-10', desc: 'Anúncios Instagram/Meta',     categoria: 'Marketing',    valor: 400,  pgto: 'Cartão'        },
    { id: 7,  data: '2025-08-12', desc: 'Lâminas e descartáveis',      categoria: 'Produtos',     valor: 155,  pgto: 'PIX'           },
    { id: 8,  data: '2025-08-14', desc: 'Conta de água',               categoria: 'Utilidades',   valor: 90,   pgto: 'Boleto'        },
    { id: 9,  data: '2025-08-15', desc: 'Conserto da máquina de corte',categoria: 'Manutenção',   valor: 220,  pgto: 'Dinheiro'      },
    { id: 10, data: '2025-08-17', desc: 'Internet e telefone',         categoria: 'Utilidades',   valor: 130,  pgto: 'Boleto'        },
    { id: 11, data: '2025-08-18', desc: 'Toalhas e capas',             categoria: 'Equipamentos', valor: 190,  pgto: 'PIX'           },
    { id: 12, data: '2025-08-20', desc: 'Material de limpeza',         categoria: 'Outros',       valor: 85,   pgto: 'Dinheiro'      },
    { id: 13, data: '2025-08-21', desc: 'Adiantamento de pessoal',     categoria: 'Pessoal',      valor: 800,  pgto: 'PIX'           },
    { id: 14, data: '2025-08-22', desc: 'Tinta e coloração',           categoria: 'Produtos',     valor: 280,  pgto: 'Cartão'        },
    { id: 15, data: '2025-08-23', desc: 'Cadeira de espera nova',      categoria: 'Equipamentos', valor: 650,  pgto: 'Cartão'        },
];
let _saidasNextId = 16;

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

    // Valores estáticos imediatos (trends e datas não são animados)
    document.getElementById('kpiFaturamentoTrend').textContent = '↑ 12,4%';
    document.getElementById('kpiLiquidoTrend').textContent = '↑ 9,8%';
    document.getElementById('kpiCortesTrend').textContent = '↑ 8,2%';
    document.getElementById('caixaTotalRecebido').textContent = fmt(totalFaturamento);
    document.getElementById('donutCenterValue').textContent = fmtK(totalFaturamento);
    document.getElementById('finHeaderDate').textContent = getTodayLabel();

    // Count-up nos KPIs numéricos — idêntico ao padrão do dashboard.js
    const elTotal   = document.getElementById('kpiFaturamentoTotal');
    const elLiquido = document.getElementById('kpiFaturamentoLiquido');
    const elCortes  = document.getElementById('kpiCortes');

    if (elTotal)   animateCounter(elTotal,   0, totalFaturamento,   1200, fmt);
    if (elLiquido) animateCounter(elLiquido, 0, faturamentoLiquido, 1000, fmt);
    if (elCortes)  animateCounter(elCortes,  0, totalCortes,         800);
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

}

/* ─── 8. METAS & COMISSÕES ──────────────────────────────── */

// Cores reutilizadas dos avatares
const BARBER_AVATAR_STYLES = {
    marcos: 'linear-gradient(135deg, #0047ff, #00f0ff)',
    joao:   'linear-gradient(135deg, #4da6ff, #0047ff)',
    andre:  'linear-gradient(135deg, #00d68f, #0047ff)',
    carlos: 'linear-gradient(135deg, #8b5cf6, #ff4d6a)',
};

const BARBER_PROGRESS_COLORS = {
    marcos: '#00f0ff',
    joao:   '#4da6ff',
    andre:  '#00d68f',
    carlos: '#8b5cf6',
};

function calcMetasState() {
    return FIN_BARBERS.map(b => {
        const m = METAS_DATA.find(x => x.id === b.id);
        // % atingido agora é baseado no faturamento (valor gerado)
        const pct = Math.round((b.faturamento / m.meta) * 100);
        const comissaoVal = Math.round(b.faturamento * (m.comissaoPct / 100));
        return { ...b, meta: m.meta, comissaoPct: m.comissaoPct, pct, comissaoVal };
    });
}

function renderMetasKPIs(state) {
    // KPI meta total barbearia
    const totalFat = FIN_BARBERS.reduce((a, b) => a + b.faturamento, 0);
    const pctMeta = ((totalFat / META_BARBEARIA_TOTAL) * 100).toFixed(1);
    document.getElementById('metaTotalValor').textContent = fmt(META_BARBEARIA_TOTAL);
    document.getElementById('metaTotalRealizado').textContent = fmt(totalFat) + ' realizados';
    document.getElementById('metaTotalBarFill').style.width = Math.min(parseFloat(pctMeta), 100) + '%';
    document.getElementById('metaTotalPct').textContent = pctMeta.replace('.', ',') + '%';

    // KPI barras por barbeiro — cores sólidas do sistema, sem degradê
    const BARBER_SOLID_COLORS = {
        marcos: 'var(--gold)',
        joao:   'var(--blue)',
        andre:  'var(--green)',
        carlos: 'var(--orange)',
    };

    const list = document.getElementById('barberProgressList');
    list.innerHTML = state.map(b => {
        const color = BARBER_SOLID_COLORS[b.id];
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

    // KPI comissão total
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
        });

        input.addEventListener('change', () => {
            const id = input.dataset.id;
            const raw = input.value.replace(/\./g, '').replace(',', '.');
            const val = parseFloat(raw);
            if (!val || val <= 0) return;
            const m = METAS_DATA.find(x => x.id === id);
            if (m) m.meta = val;
            refreshMetas();
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
        input.addEventListener('change', () => {
            const id = input.dataset.id;
            const val = parseFloat(input.value);
            if (isNaN(val) || val < 0 || val > 100) return;
            const m = METAS_DATA.find(x => x.id === id);
            if (m) m.comissaoPct = val;
            refreshMetas();
        });
    });
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
    const cat   = document.getElementById('saidasFiltroCategoria')?.value || '';
    const pgto  = document.getElementById('saidasFiltroPgto')?.value     || '';
    return SAIDAS_DATA.filter(s =>
        (!cat  || s.categoria === cat) &&
        (!pgto || s.pgto === pgto)
    );
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
                <td style="font-weight: 700; color: var(--red);">${fmt(s.valor)}</td>
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
            const id = parseInt(btn.dataset.id, 10);
            const saida = SAIDAS_DATA.find(s => s.id === id);
            if (!saida) return;
            openSaidasModal(saida);
        });
    });

    // Ação excluir
    tbody.querySelectorAll('.saidas-action-btn--del').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = parseInt(btn.dataset.id, 10);
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
        cat.value             = saida.categoria;
        valor.value           = saida.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        pgto.value            = saida.pgto;
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

function initSaidasModals() {
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

    // Salvar
    document.getElementById('saidasModalSave')?.addEventListener('click', () => {
        const idVal  = document.getElementById('saidasModalId').value;
        const desc   = document.getElementById('saidasModalDesc').value.trim();
        const data   = document.getElementById('saidasModalData').value;
        const cat    = document.getElementById('saidasModalCategoria').value;
        const raw    = document.getElementById('saidasModalValor').value.replace(/\./g, '').replace(',', '.');
        const valor  = parseFloat(raw);
        const pgto   = document.getElementById('saidasModalPgto').value;

        if (!desc || !data || !cat || !valor || !pgto) {
            showToast('Preencha todos os campos.', 'warn');
            return;
        }

        if (idVal) {
            // Editar
            const idx = SAIDAS_DATA.findIndex(s => s.id === parseInt(idVal, 10));
            if (idx !== -1) {
                SAIDAS_DATA[idx] = { id: parseInt(idVal, 10), data, desc, categoria: cat, valor, pgto };
            }
            showToast('Saída atualizada com sucesso.', 'success');
        } else {
            // Novo
            SAIDAS_DATA.push({ id: _saidasNextId++, data, desc, categoria: cat, valor, pgto });
            showToast('Saída cadastrada com sucesso.', 'success');
        }

        closeSaidasModal();
        refreshSaidas();
    });

    // Fechar modal exclusão
    document.getElementById('saidasDeleteClose')?.addEventListener('click', closeDeleteModal);
    document.getElementById('saidasDeleteCancel')?.addEventListener('click', closeDeleteModal);
    document.getElementById('saidasDeleteOverlay')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDeleteModal();
    });

    // Confirmar exclusão
    document.getElementById('saidasDeleteConfirm')?.addEventListener('click', e => {
        const id = parseInt(e.currentTarget.dataset.id, 10);
        SAIDAS_DATA = SAIDAS_DATA.filter(s => s.id !== id);
        closeDeleteModal();
        refreshSaidas();
        showToast('Saída excluída.', 'success');
    });

    // Filtros
    ['saidasFiltroCategoria', 'saidasFiltroPgto', 'saidasFiltroPeriodo'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            const periodoEl = document.getElementById('saidasFiltroPeriodo');
            const periodoMap = {
                dia: 'Hoje', semana: 'Esta semana', mes: 'Este mês',
                trimestre: 'Trimestre', semestre: 'Semestre', ano: 'Este ano',
            };
            const badge = document.getElementById('saidasPeriodoBadge');
            if (badge && periodoEl) badge.textContent = periodoMap[periodoEl.value] || 'Este mês';
            refreshSaidas();
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
    const start = performance.now();
    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(from + (to - from) * ease);
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
    refreshMetas();
    refreshSaidas();
    initSaidasModals();

    // ── Animações de entrada ──────────────────────────────────
    initScrollReveal();
    animatePaymentBars();
    // ─────────────────────────────────────────────────────────
});