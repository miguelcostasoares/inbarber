/* ═══════════════════════════════════════════════════════════
    Ordem: Config → Mock Data → Utils → Init functions
          → Charts → Metas → Agenda → Alerts → UI → Boot
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─── 1. CONFIG ─────────────────────────────────────────── */
const CONFIG = {
  barbershopName: 'Barbearia do Rafael',
  ownerFirstName: 'Rafael',
  currency: 'BRL',
  openTime: 8,   // hora de abertura
  closeTime: 20, // hora de fechamento
  slotMinutes: 30,
};

/* ─── 2. ESTADO GLOBAL (alimentado pela API) ─────────────── */

const DB = {
  services:      [],
  barbers:       [],
  appointments:  [],
  kpis:          {},
  header:        {},
  charts:        {},
  goals:         {},
  commissions:   {},
  alerts:        {},
  reportsPreview: {},
  loyalty:       [],
  modal:         { services: [], barbers: [] },
};


/* ─── 3. UTILS ──────────────────────────────────────────── */

/**
 * Formata número como moeda BRL
 * @param {number} value
 * @returns {string} ex: "R$ 1.450"
 */
function formatCurrency(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Calcula variação percentual entre dois valores
 * @param {number} current
 * @param {number} previous
 * @returns {{ pct: number, isUp: boolean, label: string }}
 */
function calcVariation(current, previous) {
  if (previous === 0) return { pct: 0, isUp: true, label: '—' };
  const pct = ((current - previous) / previous) * 100;
  return {
    pct: Math.abs(pct),
    isUp: pct >= 0,
    label: `${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(1)}%`,
  };
}

/**
 * Retorna saudação de acordo com a hora atual
 */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Formata a data atual por extenso
 */
function getFormattedDate() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Busca serviço pelo id
 */
function getService(id) {
  return DB.services.find(s => s.id === id) || { name: id, price: 0, color: '#6B6762', duration: 30 };
}

/**
 * Busca barbeiro pelo id
 */
function getBarber(id) {
  return DB.barbers.find(b => b.id === id) || { name: id, avatar: id.substring(0, 2).toUpperCase() };
}

/**
 * Retorna label de status em PT
 */
function getStatusLabel(status) {
  const map = {
    'confirmado': 'Confirmado',
    'pendente': 'Pendente',
    'em-andamento': 'Em andamento',
    'concluido': 'Concluído',
    'no-show': 'No-show',
  };
  return map[status] || status;
}

/**
 * Retorna os botões de ação rápida conforme status
 */
function getActionButtons(appt) {
  const { status, phone, client } = appt;
  const msgUrl = `https://wa.me/55${phone}?text=Olá ${encodeURIComponent(client)}, sua consulta está confirmada!`;

  if (status === 'pendente' || status === 'confirmado') {
    return `
      <button class="agenda-btn agenda-btn--start" data-id="${appt.id}" data-action="start">Iniciar</button>
      <a class="agenda-btn" href="${msgUrl}" target="_blank" rel="noopener">Mensagem</a>
    `;
  }
  if (status === 'em-andamento') {
    return `
      <button class="agenda-btn agenda-btn--finish" data-id="${appt.id}" data-action="finish">Finalizar</button>
    `;
  }
  return '';
}

/**
 * Retorna metadados visuais para cada status de meta
 * @param {'ahead'|'on-track'|'almost'|'behind'} status
 * @returns {{ label: string, css: string, barCss: string }}
 */
function getGoalStatusMeta(status) {
  const map = {
    'ahead': { label: 'Superou', css: 'goals-badge--ahead', barCss: 'goals-bar-fill--green' },
    'on-track': { label: 'No ritmo', css: 'goals-badge--on-track', barCss: 'goals-bar-fill--blue' },
    'almost': { label: 'Quase lá', css: 'goals-badge--almost', barCss: 'goals-bar-fill--gold' },
    'behind': { label: 'Atrasado', css: 'goals-badge--behind', barCss: 'goals-bar-fill--orange' },
  };
  return map[status] || map['on-track'];
}

/**
 * Gera um sparkline SVG inline a partir de um array de pontos numéricos.
 * @param {number[]} points   - Array com 7 valores de tendência
 * @param {string}   stroke   - Cor do traçado (CSS color)
 * @param {number}   [w=72]   - Largura do SVG
 * @param {number}   [h=28]   - Altura do SVG
 * @returns {string}           - String SVG pronta para innerHTML
 */
function buildSparklineSVG(points, stroke, w = 72, h = 28) {
  if (!points || points.length < 2) return '';

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  // Normaliza para o viewBox com padding vertical de 3px
  const pad = 3;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => pad + ((1 - (v - min) / range) * (h - pad * 2)));

  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');

  // Ponto final destacado
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];

  return `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" aria-hidden="true">
      <path d="${d}" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.5" fill="${stroke}"/>
    </svg>
  `;
}

/**
 * Gera rótulos de data para os últimos N dias
 */
function getLast30DayLabels() {
  const labels = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
  }
  return labels;
}


/* ─── 4. HEADER ─────────────────────────────────────────── */

function initHeader() {
  // Saudação dinâmica com nome da barbearia
  const ownerName = DB.header.ownerName || CONFIG.ownerFirstName;
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) {
    greetingEl.textContent = `${getGreeting()}, ${ownerName}`;
  }

  // Data
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    dateEl.textContent = getFormattedDate();
  }

  // Faturamento mensal
  const revenueEl = document.getElementById('monthlyRevenue');
  const variationEl = document.getElementById('monthlyVariation');

  if (revenueEl) {
    animateCounter(revenueEl, 0, DB.header.monthlyRevenue || 0, 1200, formatCurrency);
  }

  if (variationEl) {
    const v = calcVariation(DB.header.monthlyRevenue || 0, DB.header.prevMonthRevenue || 0);
    variationEl.className = `dash-header__revenue-badge dash-header__revenue-badge--${v.isUp ? 'up' : 'down'}`;
    variationEl.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="${v.isUp ? 'M5 1L9 5H1L5 1Z' : 'M5 9L1 5H9L5 9Z'}" fill="currentColor"/>
      </svg>
      ${v.label}
    `;
  }
}


/* ─── 5. KPIs ───────────────────────────────────────────── */

function initKPIs() {
  const kpi = DB.kpis;

  // Faturamento hoje
  const todayRevEl = document.getElementById('kpiTodayRevenue');
  if (todayRevEl) animateCounter(todayRevEl, 0, kpi.todayRevenue || 0, 1000, formatCurrency);

  const todayRevTrend = document.getElementById('kpiTodayRevenueTrend');
  if (todayRevTrend) {
    const v = calcVariation(kpi.todayRevenue || 0, kpi.todayRevenueYesterday || 0);
    todayRevTrend.textContent = v.label;
    todayRevTrend.className = `kpi-card__trend kpi-card__trend--${v.isUp ? 'up' : 'down'}`;
  }

  // Agendamentos hoje
  const apptEl = document.getElementById('kpiTodayAppts');
  if (apptEl) animateCounter(apptEl, 0, kpi.todayAppointments || 0, 800);

  const apptValueEl = document.getElementById('kpiTodayApptsValue');
  if (apptValueEl) {
    apptValueEl.textContent = `${formatCurrency(kpi.todayAppointmentsValue || 0)} em serviços`;
  }

  // Ticket médio
  const ticketEl = document.getElementById('kpiTicket');
  if (ticketEl) animateCounter(ticketEl, 0, kpi.ticketAvg || 0, 900, formatCurrency);

  const ticketTrend = document.getElementById('kpiTicketTrend');
  if (ticketTrend) {
    const v = calcVariation(kpi.ticketAvg || 0, kpi.ticketAvgLastWeek || 0);
    ticketTrend.textContent = v.label;
    ticketTrend.className = `kpi-card__trend kpi-card__trend--${v.isUp ? 'up' : 'down'}`;
  }

  // Novos clientes
  const newClientsEl = document.getElementById('kpiNewClients');
  if (newClientsEl) animateCounter(newClientsEl, 0, kpi.newClientsWeek || 0, 800);
}

/**
 * Anima um contador de `from` até `to` em `duration`ms
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
    // ease-out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (to - from) * ease);
    el.textContent = formatter ? formatter(current) : current;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}


/* ═══════════════════════════════════════════════════════════
   PATCH: Seção 6 — CHARTS (substitua o bloco completo)
   Melhorias:
     • Tooltip externo para o donut (nunca cortado)
     • Tooltips mais ricos nos 3 gráficos
     • Mesma paleta e estilo do sistema
═══════════════════════════════════════════════════════════ */

/* ─── 6. CHARTS ─────────────────────────────────────────── */

// Paleta global para Chart.js
const CHART_DEFAULTS = {
  gridColor: 'rgba(255,255,255,0.05)',
  tickColor: '#8A94A6',
  font: "'DM Sans', system-ui, sans-serif",
};

function applyChartDefaults() {
  Chart.defaults.color = CHART_DEFAULTS.tickColor;
  Chart.defaults.font.family = CHART_DEFAULTS.font;
  Chart.defaults.font.size = 11;
}


/* ── Tooltip Externo (DOM único compartilhado) ─────────── */
/*
 * Cria (ou reutiliza) o elemento #chartTooltip no <body>.
 * Usado pelo donut e pode ser reaproveitado.
 */
function getExternalTooltipEl() {
  let el = document.getElementById('chartTooltip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'chartTooltip';
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Posiciona o tooltip externo perto do cursor / ponto,
 * garantindo que nunca ultrapasse as bordas da viewport.
 * @param {HTMLElement} el   – elemento #chartTooltip
 * @param {number}      x    – posição X de referência (pageX ou canvas abs)
 * @param {number}      y    – posição Y de referência (pageY ou canvas abs)
 */
function positionTooltip(el, x, y) {
  const PAD = 12;           // espaço entre o ponto e o tooltip
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = el.getBoundingClientRect();
  const tw = rect.width || 220;
  const th = rect.height || 120;

  // Tenta posicionar à direita; se não couber, vai para a esquerda
  let left = x + PAD;
  if (left + tw > vw - PAD) left = x - tw - PAD;

  // Tenta posicionar abaixo; se não couber, sobe
  let top = y + PAD;
  if (top + th > vh - PAD) top = y - th - PAD;

  el.style.left = `${Math.max(PAD, left)}px`;
  el.style.top = `${Math.max(PAD, top)}px`;
}

/** Oculta o tooltip externo */
function hideExternalTooltip() {
  const el = getExternalTooltipEl();
  el.classList.remove('is-visible');
}


/* ── 6.1  Gráfico de linha: Faturamento 30 dias ─────────── */
function initRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

  const revenue = DB.charts.revenue || {};
  const periodData = {
    day: {
      labels:    (revenue.day   || {}).labels || [],
      data:      (revenue.day   || {}).data   || [],
      avgLabel:  'Média do período',
      bestLabel: 'Melhor dia do período',
    },
    month: {
      labels:    (revenue.month || {}).labels || [],
      data:      (revenue.month || {}).data   || [],
      avgLabel:  'Média mensal',
      bestLabel: 'Melhor mês',
    },
    year: {
      labels:    (revenue.year  || {}).labels || [],
      data:      (revenue.year  || {}).data   || [],
      avgLabel:  'Média anual',
      bestLabel: 'Melhor ano',
    },
  };

  let currentPeriod = 'day';

  function buildChartConfig(period) {
    const { labels, data, avgLabel, bestLabel } = periodData[period];
    const validData = data.filter(v => v > 0);
    const total     = data.reduce((s, v) => s + v, 0);
    const average   = validData.length ? Math.round(validData.reduce((s, v) => s + v, 0) / validData.length) : 0;
    const maxVal    = Math.max(...data);
    const maxIdx    = data.indexOf(maxVal);

    return {
      labels,
      data,
      total,
      average,
      maxIdx,
      avgLabel,
      bestLabel,
    };
  }

  function createGradient(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, 'rgba(59,130,246,0.18)');
    gradient.addColorStop(1, 'rgba(59,130,246,0.00)');
    return gradient;
  }

  let cfg = buildChartConfig(currentPeriod);

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: cfg.labels,
      datasets: [{
        label: 'Faturamento',
        data: cfg.data,
        borderColor: '#3B82F6',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#3B82F6',
        pointHoverBorderColor: '#0A0A0A',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => createGradient(ctx.chart.ctx),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#0E1420',
          borderColor: 'rgba(77,166,255,0.22)',
          borderWidth: 1,
          padding: { top: 12, right: 14, bottom: 12, left: 14 },
          titleColor: '#8A94A6',
          bodyColor: '#F0EBE1',
          titleFont: { size: 11, weight: '500' },
          bodyFont:  { size: 13, weight: '600' },
          caretSize: 5,
          caretPadding: 6,
          cornerRadius: 10,
          callbacks: {
            title(items) {
              return items[0].label;
            },
            label(ctx) {
              const val = ctx.raw;
              if (val === 0) return '  Fechado';
              return `  ${formatCurrency(val)}`;
            },
            afterBody(items) {
              const val = items[0].raw;
              if (val === 0) return [];
              const idx   = items[0].dataIndex;
              const isMax = (idx === cfg.maxIdx);
              const lines = ['', `  ${cfg.avgLabel}: ${formatCurrency(cfg.average)}`];
              if (isMax) lines.push(`  Melhor dia do período`);
              return lines;
            },
            afterBodyColor() {
              return '#555E6E';
            },
            footer(items) {
              const idx      = items[0].dataIndex;
              const soFar    = cfg.data.slice(0, idx + 1).reduce((s, v) => s + v, 0);
              const pctTotal = cfg.total > 0 ? ((soFar / cfg.total) * 100).toFixed(0) : 0;
              return [`  Acumulado: ${formatCurrency(soFar)} (${pctTotal}%)`];
            },
            footerColor: '#4da6ff',
            footerFont: { size: 11, weight: '500' },
            footerMarginTop: 8,
          },
        },
      },
      scales: {
        x: {
          grid: { color: CHART_DEFAULTS.gridColor, drawTicks: false },
          border: { dash: [4, 4], color: 'transparent' },
          ticks: { maxTicksLimit: 8, maxRotation: 0, color: CHART_DEFAULTS.tickColor },
        },
        y: {
          grid: { color: CHART_DEFAULTS.gridColor, drawTicks: false },
          border: { color: 'transparent' },
          ticks: {
            maxTicksLimit: 5,
            color: CHART_DEFAULTS.tickColor,
            callback: (v) => formatCurrency(v),
          },
        },
      },
    },
  });

  // Pills de período
  const pills = document.querySelectorAll('.chart-period-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('chart-period-pill--active'));
      pill.classList.add('chart-period-pill--active');

      currentPeriod = pill.dataset.period;
      cfg = buildChartConfig(currentPeriod);

      chart.data.labels         = cfg.labels;
      chart.data.datasets[0].data = cfg.data;
      chart.update('active');
    });
  });
}


/* ── 6.2  Donut: Distribuição de serviços ───────────────── */
/*
 * Usa tooltip EXTERNO para evitar corte pelo overflow do container.
 * O elemento #chartTooltip vive no <body> e é posicionado via JS.
 */
function initServicesChart() {
  const canvas = document.getElementById('servicesChart');
  if (!canvas) return;

  const dist = DB.charts.servicesDistribution || [];
  const total = dist.reduce((s, d) => s + d.count, 0);
  const labels = dist.map(d => d.name);
  const data   = dist.map(d => d.count);
  const colors = dist.map(d => d.color || '#3B82F6');
  const prices = dist.map(d => d.price || 0);

  // Receita estimada por serviço (contagem × preço)
  const revenues = data.map((cnt, i) => cnt * prices[i]);
  const totalRev = revenues.reduce((s, v) => s + v, 0);

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor: colors,
        borderWidth: 1.5,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          // Desativa o tooltip nativo — usamos o externo
          enabled: false,
          external(context) {
            const tooltipEl = getExternalTooltipEl();
            const model = context.tooltip;

            // Oculta quando não há item
            if (model.opacity === 0) {
              tooltipEl.classList.remove('is-visible');
              return;
            }

            // Dados do segmento hovered
            const idx = model.dataPoints[0].dataIndex;
            const label = labels[idx];
            const count = data[idx];
            const color = colors[idx];
            const pct = ((count / total) * 100).toFixed(1);
            const rev = revenues[idx];
            const revPct = ((rev / totalRev) * 100).toFixed(1);
            const price = prices[idx];

            // Rank entre os serviços (por contagem)
            const sorted = [...data].sort((a, b) => b - a);
            const rank = sorted.indexOf(count) + 1;
            const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            tooltipEl.innerHTML = `
              <div class="ct-header">
                <span class="ct-dot" style="background:${color}"></span>
                <span class="ct-label">${label}</span>
              </div>
              <div class="ct-rows">
                <div class="ct-row">
                  <span class="ct-row-label">Qtd. no mês</span>
                  <span class="ct-row-value ct-row-value--accent">${count} serviços</span>
                </div>
                <div class="ct-row">
                  <span class="ct-row-label">Participação</span>
                  <span class="ct-row-value">${pct}% do total</span>
                </div>
                <hr class="ct-divider">
                <div class="ct-row">
                  <span class="ct-row-label">Preço unitário</span>
                  <span class="ct-row-value">${formatCurrency(price)}</span>
                </div>
                <div class="ct-row">
                  <span class="ct-row-label">Receita estimada</span>
                  <span class="ct-row-value ct-row-value--green">${formatCurrency(rev)}</span>
                </div>
              </div>
              <div class="ct-footer">
                <span>${rankIcon} ${rank === 1 ? 'Serviço mais realizado' : `${rank}º serviço mais realizado`}</span>
              </div>
            `;

            // Posiciona usando a posição do mouse salva no canvas
            const canvasRect = canvas.getBoundingClientRect();
            const x = canvasRect.left + model.caretX;
            const y = canvasRect.top + model.caretY;

            // Mostra primeiro (invisível) para medir tamanho real
            tooltipEl.style.left = '-9999px';
            tooltipEl.classList.add('is-visible');

            // Depois posiciona corretamente
            requestAnimationFrame(() => positionTooltip(tooltipEl, x, y));
          },
        },
      },
    },
  });

  // Garante que o tooltip some ao tirar o mouse do canvas
  canvas.addEventListener('mouseleave', hideExternalTooltip);

  // Legenda customizada (inalterada)
  const legendEl = document.getElementById('donutLegend');
  if (legendEl) {
    legendEl.innerHTML = dist.map((d, i) => {
      const pct = total > 0 ? ((d.count / total) * 100).toFixed(0) : 0;
      return `
        <div class="donut-legend-item">
          <span class="donut-legend-dot" style="background:${colors[i]}"></span>
          <span>${d.name}</span>
          <span class="donut-legend-pct">${pct}%</span>
        </div>
      `;
    }).join('');
  }
}


/* ── 6.3  Barras: Ocupação por horário ──────────────────── */
function initOccupancyChart() {
  const canvas = document.getElementById('occupancyChart');
  if (!canvas) return;

  const occupancy = DB.charts.occupancy || [];
  const labels = occupancy.map(d => d.label);
  const data   = occupancy.map(d => d.value);

  // Melhor e pior hora (ignora zeros)
  const maxOcc = Math.max(...data);
  const minOcc = Math.min(...data);
  const maxIdx = data.indexOf(maxOcc);
  const minIdx = data.indexOf(minOcc);
  const average = Math.round(data.reduce((s, v) => s + v, 0) / data.length);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Ocupação %',
        data,
        backgroundColor: data.map(v =>
          v >= 90 ? 'rgba(59,130,246,0.90)' :
            v >= 70 ? 'rgba(59,130,246,0.60)' :
              'rgba(59,130,246,0.28)'
        ),
        borderColor: 'transparent',
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#0E1420',
          borderColor: 'rgba(77,166,255,0.22)',
          borderWidth: 1,
          padding: { top: 12, right: 14, bottom: 12, left: 14 },
          titleColor: '#8A94A6',
          bodyColor: '#F0EBE1',
          titleFont: { size: 11, weight: '500' },
          bodyFont: { size: 13, weight: '600' },
          caretSize: 5,
          cornerRadius: 10,
          callbacks: {
            title(items) {
              return `${items[0].label} — Ocupação`;
            },
            label(ctx) {
              const v = ctx.raw;
              const tier =
                v >= 90 ? 'Alta demanda' :
                  v >= 70 ? 'Boa ocupação' :
                    v >= 50 ? 'Demanda média' :
                      'Baixa demanda';
              return `  ${v}%  · ${tier}`;
            },
            afterBody(items) {
              const val = items[0].raw;
              if (val === 0) return [];

              const idx = items[0].dataIndex;
              const isMax = (idx === maxIdx);

              const lines = [
                '',
                `  Média do mês: ${formatCurrency(average)}`,
              ];
              if (isMax) lines.push('  Melhor dia do mês');
              return lines;
            },
            afterBodyColor() {
              return '#555E6E';
            },
          },
          footerColor: '#4da6ff',
          footerFont: { size: 11, weight: '500' },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: 'transparent' },
          ticks: { color: CHART_DEFAULTS.tickColor },
        },
        y: {
          grid: { color: CHART_DEFAULTS.gridColor },
          border: { color: 'transparent' },
          min: 0, max: 100,
          ticks: {
            maxTicksLimit: 5,
            callback: (v) => `${v}%`,
            color: CHART_DEFAULTS.tickColor,
          },
        },
      },
    },
  });
}


/* ─── 7. METAS DOS BARBEIROS ────────────────────────────── */

// Período ativo das metas (somente mensal)
let currentGoalsPeriod = 'month';

/**
 * Inicializa o módulo de Metas dos Barbeiros.
 * Conectar: GET /api/goals/barbers?period=week|month
 */
function initGoals() {
  renderGoals(currentGoalsPeriod);

  // Bind nos filtros de período (Semanal / Mensal)
  const filters = document.querySelectorAll('.goals-filter');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('goals-filter--active'));
      btn.classList.add('goals-filter--active');
      currentGoalsPeriod = btn.dataset.goalsPeriod;
      renderGoals(currentGoalsPeriod);
    });
  });
}

/**
 * Renderiza a visão geral da equipe e a lista individual de barbeiros.
 * @param {'week'|'month'} period
 */
function renderGoals(period) {
  const data = DB.goals[period];
  if (!data) return;

  // Mapeia shape da API para o formato esperado pelos renders
  const mapped = {
    teamTarget: data.teamTarget,
    teamSold:   data.teamSold,
    teamTrend:  data.teamTrend,
    barbers: (data.barbers || []).map(b => ({
      barberId: b.barberId,
      sold:     b.sold,
      target:   b.target,
      trend:    b.trend,
      status:   b.status,
      forecast: b.forecast || null,
    })),
  };

  renderGoalsTeamOverview(mapped);
  renderGoalsList(mapped);
}

/**
 * Renderiza o painel de visão geral da equipe (3 stats + sparkline).
 */
function renderGoalsTeamOverview(data) {
  const el = document.getElementById('goalsTeamOverview');
  if (!el) return;

  const teamPct = Math.round((data.teamSold / data.teamTarget) * 100);

  // Cor do sparkline da equipe: verde se >= 75%, azul se >= 50%, laranja se menos
  const sparkColor = teamPct >= 75 ? '#4CAF79' : teamPct >= 50 ? '#3B82F6' : '#E0924A';
  const sparkSVG = buildSparklineSVG(data.teamTrend, sparkColor, 88, 32);

  el.innerHTML = `
    <div class="goals-team-stat">
      <span class="goals-team-stat__label">Meta da equipe</span>
      <span class="goals-team-stat__value">${formatCurrency(data.teamTarget)}</span>
      <span class="goals-team-stat__sub">${data.barbers.length} barbeiros</span>
    </div>

    <div class="goals-team-stat">
      <span class="goals-team-stat__label">Faturado</span>
      <span class="goals-team-stat__value goals-team-stat__value--blue">${formatCurrency(data.teamSold)}</span>
      <span class="goals-team-stat__sub">${teamPct}% da meta</span>
    </div>

    <div class="goals-team-sparkline" aria-label="Tendência dos últimos 7 dias">
      ${sparkSVG}
    </div>
  `;
}

/**
 * Cores de sparkline por status (mapeadas para CSS vars reais)
 */
const GOAL_SPARK_COLORS = {
  'ahead': '#4CAF79',  // green
  'on-track': '#3B82F6',  // blue (primário)
  'almost': '#60A5FA',  // blue-light (quase lá)
  'behind': '#E0924A',  // orange
};

/**
 * Renderiza a lista individual de barbeiros com progresso e sparkline.
 */
function renderGoalsList(data) {
  const el = document.getElementById('goalsList');
  if (!el) return;

  // Índice de avatar (1-3) baseado na posição para aplicar o gradiente correto
  el.innerHTML = data.barbers.map((entry, i) => {
    const barber = DB.barbers.find(b => b.id === entry.barberId)
      || { name: entry.barberId, avatar: entry.barberId.substring(0, 2).toUpperCase() };
    const pct = Math.min(Math.round((entry.sold / entry.target) * 100), 100);
    const statusMeta = getGoalStatusMeta(entry.status);
    const aidx = (i % 3) + 1;
    const sparkColor = GOAL_SPARK_COLORS[entry.status] || '#3B82F6';
    const sparkSVG = buildSparklineSVG(entry.trend, sparkColor, 64, 24);

    return `
      <div class="goals-item" role="listitem" data-barber-id="${entry.barberId}">

        <!-- Avatar -->
        <div class="goals-avatar goals-avatar--${aidx}" aria-hidden="true">${barber.avatar}</div>

        <!-- Info central: nome + barra + previsão -->
        <div class="goals-info">
          <div class="goals-info__top">
            <span class="goals-name">${barber.name}</span>
            <span class="goals-badge ${statusMeta.css}" aria-label="Status: ${statusMeta.label}">${statusMeta.label}</span>
          </div>

          <div class="goals-progress-wrap">
            <div class="goals-values" aria-label="${pct}% da meta atingido">
              <span class="goals-value-current">${formatCurrency(entry.sold)}</span>
              <span class="goals-value-sep">/</span>
              <span class="goals-value-target">${formatCurrency(entry.target)}</span>
            </div>

            <div class="goals-bar"
                 role="progressbar"
                 aria-valuenow="${pct}"
                 aria-valuemin="0"
                 aria-valuemax="100"
                 aria-label="Progresso da meta de ${barber.name}">
              <div class="goals-bar-fill ${statusMeta.barCss}"
                   style="width: 0%"
                   data-target-width="${pct}%"></div>
            </div>

            ${entry.forecast
        ? `<span class="goals-forecast" aria-label="Previsão: ${entry.forecast}">${entry.forecast}</span>`
        : ''}
          </div>
        </div>

        <!-- Coluna direita: % + sparkline -->
        <div class="goals-right-col">
          <span class="goals-pct" aria-hidden="true">${pct}%</span>
          <div class="goals-sparkline" aria-label="Tendência recente de ${barber.name}">
            ${sparkSVG}
          </div>
        </div>

      </div>
    `;
  }).join('');

  // Anima as barras de progresso com duplo rAF (aguarda layout)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.querySelectorAll('.goals-bar-fill[data-target-width]').forEach(fill => {
        fill.style.width = fill.dataset.targetWidth;
      });
    });
  });
}


/* ─── 8. AGENDA DO DIA ──────────────────────────────────── */

let currentFilter = 'all';

function initAgenda() {
  const appts = DB.appointments;
  const subEl = document.getElementById('agendaSub');
  if (subEl) {
    const confirmed = appts.filter(a => a.status === 'confirmado' || a.status === 'em-andamento').length;
    subEl.textContent = `${appts.length} agendamentos — ${confirmed} confirmados`;
  }

  renderAgendaList(appts);
  initAgendaFilters();
}

function renderAgendaList(appointments) {
  const listEl = document.getElementById('agendaList');
  if (!listEl) return;

  const filtered = currentFilter === 'all'
    ? appointments
    : appointments.filter(a => a.status === currentFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="agenda-item agenda-item--nenhum">Nenhum agendamento para este filtro.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(appt => {
    const actions = getActionButtons(appt);
    return `
      <div class="agenda-item" role="listitem" data-id="${appt.id}">
        <div class="agenda-time">
          <span class="agenda-time__hour">${appt.time}</span>
          <span class="agenda-time__duration">${appt.duration}min</span>
        </div>

        <div class="agenda-info">
          <span class="agenda-client">${appt.client}</span>
          <div class="agenda-meta">
            <span class="agenda-service">${appt.serviceName}</span>
            <span class="agenda-separator">·</span>
            <span class="agenda-barber">${appt.barberName}</span>
          </div>
          <span class="status-badge status-badge--${appt.status}">${getStatusLabel(appt.status)}</span>
        </div>

        <div class="agenda-actions">
          <span class="agenda-value">${formatCurrency(appt.servicePrice)}</span>
          <div class="agenda-btn-row">
            ${actions}
          </div>
        </div>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', handleAgendaAction);
  });
}

function initAgendaFilters() {
  const filters = document.querySelectorAll('.agenda-filter');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('agenda-filter--active'));
      btn.classList.add('agenda-filter--active');
      currentFilter = btn.dataset.filter;
      renderAgendaList(DB.appointments);
    });
  });
}

function handleAgendaAction(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  const appt = DB.appointments.find(a => a.id === id);
  if (!appt) return;

  const newStatus = action === 'start' ? 'em-andamento' : 'concluido';
  const toastType = action === 'start' ? 'success' : 'blue';
  const toastMsg  = action === 'start'
    ? `${appt.client} — Atendimento iniciado`
    : `${appt.client} — Atendimento concluído`;

  // Otimista: atualiza local imediatamente
  appt.status = newStatus;
  renderAgendaList(DB.appointments);
  updatePendingAlerts();
  showToast(toastMsg, toastType);

  // Sincroniza com o backend
  window.InBarberAPI.updateAppointment(id, { status: newStatus })
    .catch(() => showToast('Erro ao atualizar status no servidor', 'error'));
}


/* ─── 9. ALERTAS & OPORTUNIDADES ───────────────────────── */

function initAlerts() {
  renderReactivate();
  renderBirthdays();
  renderLowStock();
  updatePendingAlerts();
}

function renderReactivate() {
  const listEl = document.getElementById('reactivateList');
  const badgeEl = document.getElementById('reactivateBadge');
  const items = DB.alerts.reactivate || [];

  if (badgeEl) badgeEl.textContent = items.length;
  if (!listEl) return;

  listEl.innerHTML = items.length === 0
    ? `<li class="alert-item alert-item--empty">Nenhum cliente inativo.</li>`
    : items.map(c => `
        <li class="alert-item" role="listitem" title="Última visita: ${c.lastVisit}">
          <span class="alert-item__name">${c.name}</span>
          <span class="alert-item__sub">${c.lastVisit}</span>
          <span class="alert-item__tag alert-item__tag--orange">Reativar</span>
        </li>
      `).join('');
}

function renderBirthdays() {
  const listEl = document.getElementById('birthdayList');
  const badgeEl = document.getElementById('birthdayBadge');
  const items = DB.alerts.birthdays || [];

  if (badgeEl) badgeEl.textContent = items.length;
  if (!listEl) return;

  listEl.innerHTML = items.length === 0
    ? `<li class="alert-item alert-item--empty">Sem aniversariantes este mês.</li>`
    : items.map(c => `
        <li class="alert-item" role="listitem">
          <span class="alert-item__name">${c.name}</span>
          <span class="alert-item__sub">${c.day}</span>
          <span class="alert-item__tag alert-item__tag--gold">🎂</span>
        </li>
      `).join('');
}

function renderLowStock() {
  const listEl = document.getElementById('stockList');
  const badgeEl = document.getElementById('stockBadge');
  const items = DB.alerts.lowStock || [];

  if (badgeEl) badgeEl.textContent = items.length;
  if (!listEl) return;

  listEl.innerHTML = items.length === 0
    ? `<li class="alert-item alert-item--empty">Estoque em dia.</li>`
    : items.map(p => {
        const tag = p.qty === 0
          ? `<span class="alert-item__tag alert-item__tag--red">Esgotado</span>`
          : `<span class="alert-item__tag alert-item__tag--red">Crítico</span>`;
        return `
        <li class="alert-item" role="listitem">
          <span class="alert-item__name">${p.name}</span>
          <span class="alert-item__sub">${p.qty} ${p.unit}</span>
          ${tag}
        </li>`;
      }).join('');
}

function updatePendingAlerts() {
  const pending = (DB.alerts.pending || []).concat(
    DB.appointments.filter(a => a.status === 'pendente' && !(DB.alerts.pending || []).find(p => p.id === a.id))
  );
  const listEl = document.getElementById('pendingList');
  const badgeEl = document.getElementById('pendingBadge');

  if (badgeEl) badgeEl.textContent = pending.length;
  if (!listEl) return;

  listEl.innerHTML = pending.length === 0
    ? `<li class="alert-item alert-item--empty">Nenhum pendente.</li>`
    : pending.map(a => `
        <li class="alert-item" role="listitem">
          <span class="alert-item__name">${a.client || a.name}</span>
          <span class="alert-item__sub">${a.time}</span>
          <span class="alert-item__tag alert-item__tag--blue">Confirmar</span>
        </li>
      `).join('');
}


/* ─── 10. MODAL ─────────────────────────────────────────── */

function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const openBtns = [
    document.getElementById('newAppointmentBtn'),
    document.getElementById('topbarNewBtn'),
  ];
  const closeBtn = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('modalCancel');

  function openModal() {
    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    // Focus no primeiro campo
    setTimeout(() => {
      const firstInput = overlay.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }, 50);
  }

  function closeModal() {
    overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  openBtns.forEach(btn => btn && btn.addEventListener('click', openModal));
  closeBtn && closeBtn.addEventListener('click', closeModal);
  cancelBtn && cancelBtn.addEventListener('click', closeModal);

  // Fecha clicando fora
  overlay && overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Fecha com Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hasAttribute('hidden')) closeModal();
  });

  // Define data padrão como hoje
  const dateInput = document.getElementById('apptDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

}


/* ─── 11. SIDEBAR ───────────────────────────────────────── */
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const burger    = document.getElementById('burgerBtn');
  const toggleBtn = document.getElementById('sidebarToggleBtn');

  // ── Mobile: abrir / fechar ────────────────────────────────
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

  // ── Desktop: colapsar / expandir ─────────────────────────
  const collapseSidebar = () => {
    sidebar.classList.add('is-collapsed');
    sidebar.classList.remove('is-expanded');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    toggleBtn?.setAttribute('aria-label', 'Expandir menu');
    try { localStorage.setItem('sidebarCollapsed', '1'); } catch (e) {}
  };

  const expandSidebar = () => {
    sidebar.classList.remove('is-collapsed');
    sidebar.classList.add('is-expanded');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    toggleBtn?.setAttribute('aria-label', 'Recolher menu');
    try { localStorage.setItem('sidebarCollapsed', '0'); } catch (e) {}
  };

  toggleBtn?.addEventListener('click', () =>
    sidebar.classList.contains('is-collapsed') ? expandSidebar() : collapseSidebar()
  );

  // Restaura estado da última visita
  try {
    if (localStorage.getItem('sidebarCollapsed') === '0') expandSidebar();
  } catch (e) {}
}

/* ─── 11. SIDEBAR MOBILE ────────────────────────────────── */

function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const burger    = document.getElementById('burgerBtn');
  const toggleBtn = document.getElementById('sidebarToggleBtn');

  // ── Mobile ───────────────────────────────────────────────
  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-visible');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger && burger.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });

  overlay && overlay.addEventListener('click', closeSidebar);

  // Fecha ao navegar (links da sidebar)
  sidebar && sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });

  function collapseSidebar() {
    sidebar.classList.add('is-collapsed');
    sidebar.classList.remove('is-expanded');
    toggleBtn && toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn && toggleBtn.setAttribute('aria-label', 'Expandir menu');
    try { localStorage.setItem('sidebarCollapsed', '1'); } catch (e) {}
  }

  function expandSidebar() {
    sidebar.classList.remove('is-collapsed');
    sidebar.classList.add('is-expanded');
    toggleBtn && toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn && toggleBtn.setAttribute('aria-label', 'Recolher menu');
    try { localStorage.setItem('sidebarCollapsed', '0'); } catch (e) {}
  }

  toggleBtn && toggleBtn.addEventListener('click', () => {
    sidebar.classList.contains('is-collapsed') ? expandSidebar() : collapseSidebar();
  });

  // Restaura estado da última visita
  try {
    if (localStorage.getItem('sidebarCollapsed') === '0') expandSidebar();
  } catch (e) {}
}


function showToast(message, type = 'success') {
  // Remove toast anterior se existir
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const colors = {
    success: { bg: 'var(--green-bg)', border: 'rgba(76,175,121,0.3)', text: 'var(--green)' },
    blue: { bg: 'var(--blue-bg)', border: 'rgba(59,130,246,0.3)', text: 'var(--blue-lt)' },
    gold: { bg: 'var(--blue-bg)', border: 'rgba(59,130,246,0.3)', text: 'var(--blue-lt)' }, 
    error: { bg: 'var(--red-bg)', border: 'rgba(224,84,84,0.3)', text: 'var(--red)' },
  };

  const c = colors[type] || colors.success;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
      <path d="M4.5 7l2 2L9.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    ${message}
  `;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '1000',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 18px',
    borderRadius: 'var(--r-md)',
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: 'var(--ff-b)',
    boxShadow: 'var(--shadow-md)',
    transform: 'translateY(16px)',
    opacity: '0',
    transition: 'transform 300ms var(--ease-out), opacity 300ms',
    maxWidth: 'calc(100vw - 32px)',
  });

  document.body.appendChild(toast);

  // Anima entrada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });
  });

  // Remove após 3.5s
  setTimeout(() => {
    toast.style.transform = 'translateY(8px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}


/* ─── 13. SCROLL REVEAL ─────────────────────────────────── */

function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll(
    '.kpi-card, .chart-card, .agenda-card, .alert-card, .goals-card, .loyalty-card, .commission-card, .report-card'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
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


/* ─── 14. LOYALTY PROGRAM ───────────────────────────────── */

/**
 * Renderiza o ranking de fidelidade dos barbeiros.
 * Conectar: GET /api/loyalty/barbers?period=month
 */
function initLoyalty() {
  const container = document.getElementById('loyaltyRanking');
  if (!container) return;

  const rankMeta = {
    1: { css: 'loyalty-item--1st', rankCss: 'loyalty-rank--gold', avatarCss: 'loyalty-avatar--gold', symbol: '🥇' },
    2: { css: '', rankCss: 'loyalty-rank--silver', avatarCss: 'loyalty-avatar--silver', symbol: '🥈' },
    3: { css: '', rankCss: 'loyalty-rank--bronze', avatarCss: 'loyalty-avatar--bronze', symbol: '🥉' },
  };
  const levelLabel = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

  container.innerHTML = DB.loyalty.map(entry => {
    const barber = { name: entry.name, avatar: entry.avatar };
    const meta = rankMeta[entry.rank] || { css: '', rankCss: '', avatarCss: 'loyalty-avatar--default', symbol: entry.rank };
    const pointsToNext = (entry.nextGoal - entry.points).toLocaleString('pt-BR');

    const benefitTags = entry.benefits.map(b =>
      `<span class="loyalty-benefit-tag">${b}</span>`
    ).join('');

    return `
      <div class="loyalty-item ${meta.css}" role="listitem" data-barber-id="${entry.barberId}">
        <span class="loyalty-rank ${meta.rankCss}" aria-label="Posição ${entry.rank}">${meta.symbol}</span>

        <div class="loyalty-avatar ${meta.avatarCss}" aria-hidden="true">${barber.avatar}</div>

        <div class="loyalty-info">
          <span class="loyalty-name">${barber.name}</span>
          <div class="loyalty-level-row">
            <span class="loyalty-level-badge loyalty-level-badge--${entry.level}">${levelLabel[entry.level]}</span>
          </div>
          <div class="loyalty-progress-wrap">
            <div class="loyalty-progress-bar" role="progressbar" aria-valuenow="${entry.progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso para o próximo nível">
              <div
                class="loyalty-progress-fill loyalty-progress-fill--${entry.level}"
                style="width: 0%"
                data-target-width="${entry.progress}%"
              ></div>
            </div>
            <span class="loyalty-progress-label">${pointsToNext} pts para meta</span>
          </div>
        </div>

        <div class="loyalty-score-col">
          <span class="loyalty-points">${entry.points.toLocaleString('pt-BR')}</span>
          <span class="loyalty-points-label">pontos</span>
          <div class="loyalty-benefits" aria-label="Benefícios desbloqueados">
            ${benefitTags}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Anima as barras de progresso com pequeno delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.querySelectorAll('.loyalty-progress-fill[data-target-width]').forEach(fill => {
        fill.style.width = fill.dataset.targetWidth;
      });
    });
  });
}


/* ─── 15. COMISSÕES ─────────────────────────────────────── */

let currentCommissionPeriod = 'today';

/**
 * Inicializa o módulo de comissões com filtros.
 * Conectar: GET /api/commissions?period=today|week|month
 */
function initCommissions() {
  renderCommissions(currentCommissionPeriod);

  const filters = document.querySelectorAll('.commission-filter');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('commission-filter--active'));
      btn.classList.add('commission-filter--active');
      currentCommissionPeriod = btn.dataset.period;
      renderCommissions(currentCommissionPeriod);
    });
  });
}

function renderCommissions(period) {
  const data = DB.commissions[period];
  const totalsEl = document.getElementById('commissionTotals');
  const listEl = document.getElementById('commissionList');
  if (!data || !totalsEl || !listEl) return;

  // Totais
  totalsEl.innerHTML = `
    <div class="commission-total-item">
      <span class="commission-total-label">Gerado no período</span>
      <span class="commission-total-value">${formatCurrency(data.totalGenerated)}</span>
    </div>
    <div class="commission-total-item">
      <span class="commission-total-label">Comissões a pagar</span>
      <span class="commission-total-value commission-total-value--blue">${formatCurrency(data.totalPayout)}</span>
    </div>
    <div class="commission-total-item">
      <span class="commission-total-label">Atendimentos</span>
      <span class="commission-total-value">${data.appointments}</span>
    </div>
  `;

  // Máximo gerado para normalizar barras
  const maxGenerated = Math.max(...data.barbers.map(b => b.generated));

  const perfLabel = { good: 'Ótimo', medium: 'Regular', warning: 'Atenção' };

  listEl.innerHTML = data.barbers.map(barber => {
    const info = DB.barbers.find(b => b.id === barber.barberId)
      || { name: barber.name || barber.barberId, avatar: barber.avatar || barber.barberId.substring(0, 2).toUpperCase() };
    const barPct = maxGenerated > 0 ? ((barber.generated / maxGenerated) * 100).toFixed(0) : 0;
    const perfCss = `commission-perf--${barber.performance}`;

    return `
      <div class="commission-item" role="listitem">
        <div class="commission-avatar" aria-hidden="true">${info.avatar}</div>

        <div class="commission-info">
          <span class="commission-name">${info.name}</span>
          <div class="commission-meta">
            <span class="commission-pct">${barber.commissionPct}% comissão</span>
            <span class="commission-separator" aria-hidden="true">·</span>
            <span class="commission-appts">${barber.appointments} atend.</span>
          </div>
        </div>

        <div class="commission-bar-col">
          <div class="commission-bar" role="progressbar"
               aria-valuenow="${barPct}" aria-valuemin="0" aria-valuemax="100"
               aria-label="Participação no faturamento">
            <div class="commission-bar-fill" style="width: 0%" data-target-width="${barPct}%"></div>
          </div>
          <span class="commission-bar-label">${barPct}%</span>
        </div>

        <div class="commission-values">
          <span class="commission-generated">${formatCurrency(barber.generated)}</span>
          <span class="commission-payout">${formatCurrency(barber.payout)}</span>
          <span class="commission-perf ${perfCss}">${perfLabel[barber.performance]}</span>
        </div>
      </div>
    `;
  }).join('');

  // Anima barras
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      listEl.querySelectorAll('.commission-bar-fill[data-target-width]').forEach(fill => {
        fill.style.transition = 'width 900ms var(--ease-out)';
        fill.style.width = fill.dataset.targetWidth;
      });
    });
  });
}


/* ─── 16. RELATÓRIOS RÁPIDOS ────────────────────────────── */

let currentReportPeriod = 'today';

/**
 * Inicializa o módulo de relatórios.
 * Conectar (preview): GET /api/reports/preview?period=today|week|month
 * Conectar (export):  POST /api/reports/export?period=today|week|month&format=pdf
 */
function initReports() {
  renderReports(currentReportPeriod);

  const tabs = document.querySelectorAll('.reports-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('reports-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('reports-tab--active');
      tab.setAttribute('aria-selected', 'true');
      currentReportPeriod = tab.dataset.reportPeriod;

      // Atualiza aria-labelledby no painel
      const grid = document.getElementById('reportsGrid');
      if (grid) grid.setAttribute('aria-labelledby', `tab-${currentReportPeriod}`);

      renderReports(currentReportPeriod);
    });
  });
}

/** Ícones SVG inline para cada tipo de relatório */
const REPORT_ICONS = {
  revenue: `
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
      <path d="M10 6v1.5M10 12.5V14M7.5 8.5c0-.83.67-1.5 1.5-1.5h1.5a1.5 1.5 0 0 1 0 3h-1a1.5 1.5 0 0 0 0 3H11a1.5 1.5 0 0 0 1.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
  services: `
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.5"/>
      <path d="M3 8h14" stroke="currentColor" stroke-width="1.5"/>
      <path d="M7 12l1.5 1.5L11 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  commissions: `
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10h14M3 6h8M3 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
};

/** Define os cards de relatório para cada período */
function getReportCards(period) {
  const preview = DB.reportsPreview[period];
  if (!preview) return [];

  return [
    {
      type: 'Financeiro',
      icon: 'revenue',
      title: `Relatório Financeiro`,
      period: preview.period,
      preview: preview.items.slice(0, 4),
      filename: `${preview.filename}-financeiro.pdf`,
    },
    {
      type: 'Serviços',
      icon: 'services',
      title: `Top Serviços`,
      period: preview.period,
      preview: [
        preview.items.find(i => i.label === 'Agendamentos') || { label: 'Agendamentos', value: '—' },
        preview.items.find(i => i.label === 'Top Serviço') || { label: 'Top Serviço', value: '—' },
        preview.items.find(i => i.label === 'Ticket Médio') || { label: 'Ticket Médio', value: '—' },
        preview.items.find(i => i.label === 'No-shows' || i.label === 'Taxa de Ocupação' || i.label === 'Novos Clientes') || preview.items[5],
      ].filter(Boolean),
      filename: `${preview.filename}-servicos.pdf`,
    },
    {
      type: 'Comissões',
      icon: 'commissions',
      title: `Relatório de Comissões`,
      period: preview.period,
      preview: [
        preview.items.find(i => i.label === 'Faturamento') || { label: 'Faturamento', value: '—' },
        preview.items.find(i => i.label === 'Comissões a pagar') || { label: 'Comissões a pagar', value: '—' },
        preview.items.find(i => i.label === 'Agendamentos') || { label: 'Agendamentos', value: '—' },
        { label: 'Barbeiros ativos', value: '3' },
      ],
      filename: `${preview.filename}-comissoes.pdf`,
    },
  ];
}

function renderReports(period) {
  const grid = document.getElementById('reportsGrid');
  if (!grid) return;

  const cards = getReportCards(period);

  grid.innerHTML = cards.map((card, i) => `
    <article class="report-card" data-reveal-delay="${i * 60}">
      <div class="report-card__top">
        <div class="report-card__icon" aria-hidden="true">
          ${REPORT_ICONS[card.icon] || REPORT_ICONS.revenue}
        </div>
        <span class="report-card__type-badge">${card.type}</span>
      </div>

      <div>
        <h3 class="report-card__title">${card.title}</h3>
        <p class="report-card__period">${card.period}</p>
      </div>

      <div class="report-preview" aria-label="Preview do relatório">
        ${card.preview.map(item => `
          <div class="report-preview-item">
            <span class="report-preview-label">${item.label}</span>
            <span class="report-preview-value">${item.value}</span>
          </div>
        `).join('')}
      </div>

      <button class="report-export-btn"
              data-filename="${card.filename}"
              aria-label="Exportar ${card.title} em PDF">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Exportar PDF
      </button>
    </article>
  `).join('');

  // Bind nos botões de exportar
  grid.querySelectorAll('.report-export-btn').forEach(btn => {
    btn.addEventListener('click', handleReportExport);
  });

  // Trigger scroll reveal nos novos cards
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    grid.querySelectorAll('.report-card').forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity 400ms var(--ease-out), transform 400ms var(--ease-out)';
      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, i * 60);
    });
  }
}

/**
 * Simula o download de um PDF.
 * Em produção, faça um POST para /api/reports/export e use a resposta como blob.
 */
function handleReportExport(e) {
  const btn = e.currentTarget;
  const filename = btn.dataset.filename || 'relatorio.pdf';

  // Feedback visual imediato
  const originalHTML = btn.innerHTML;
  btn.classList.add('is-loading');
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" class="spin-icon">
      <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="28" stroke-dashoffset="10"/>
    </svg>
    Gerando...
  `;
  btn.setAttribute('aria-busy', 'true');

  // Simulação do tempo de geração (substitua por fetch real)
  setTimeout(() => {
    // Mock: cria um blob mínimo para disparar o download
    const blob = new Blob(
      [`InBarber — Relatório simulado\nArquivo: ${filename}\nGerado em: ${new Date().toLocaleString('pt-BR')}`],
      { type: 'application/pdf' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    // Restaura botão
    btn.classList.remove('is-loading');
    btn.innerHTML = originalHTML;
    btn.removeAttribute('aria-busy');

    // Re-bind (innerHTML foi trocado)
    btn.addEventListener('click', handleReportExport);

    // Toast de sucesso
    showToast(`PDF "${filename}" exportado com sucesso!`, 'blue');
  }, 1400);
}


/* ─── 17. SCROLL REVEAL (atualizado) ────────────────────── */


/* ─── 17. SCROLL REVEAL (atualizado) ────────────────────── */

function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll(
    '.kpi-card, .chart-card, .agenda-card, .alert-card, .goals-card, .loyalty-card, .commission-card'
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


/* ─── 18. BOOT ──────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  function waitForChartJS(cb, retries = 20) {
    if (typeof Chart !== 'undefined') {
      cb();
    } else if (retries > 0) {
      setTimeout(() => waitForChartJS(cb, retries - 1), 100);
    } else {
      console.warn('InBarber: Chart.js não carregou.');
    }
  }

  // Inicializa partes que não dependem de dados (sidebar, modal esqueleto)
  initSidebar();
  initModal();
  initScrollReveal();

  // Carrega todos os dados do Dashboard em uma única chamada
  window.InBarberAPI.getDashboard()
    .then(payload => {
      // Preenche o estado global
      DB.services     = (payload.modal || {}).services || [];
      DB.barbers      = (payload.modal || {}).barbers  || [];
      DB.appointments = payload.agenda || [];
      DB.kpis         = payload.kpis   || {};
      DB.header       = {
        monthlyRevenue:  (payload.header || {}).monthlyRevenue   || 0,
        prevMonthRevenue: (payload.header || {}).prevMonthRevenue || 0,
        ownerName:       (payload.barbershop || {}).name
                           ? (payload.barbershop.name).split(' ')[0]
                           : CONFIG.ownerFirstName,
      };
      DB.charts         = payload.charts         || {};
      DB.goals          = payload.goals          || {};
      DB.commissions    = payload.commissions    || {};
      DB.alerts         = payload.alerts         || {};
      DB.reportsPreview = payload.reportsPreview || {};
      DB.loyalty        = payload.loyalty        || [];
      DB.modal          = payload.modal          || {};

      // Renderiza todas as seções com dados reais
      initHeader();
      initKPIs();
      initGoals();
      initAgenda();
      initAlerts();
      initLoyalty();
      initCommissions();
      initReports();

      // Popula selects do modal com dados reais
      const serviceSelect = document.getElementById('apptService');
      const barberSelect  = document.getElementById('apptBarber');
      if (serviceSelect && DB.modal.services && DB.modal.services.length > 0) {
        serviceSelect.innerHTML = '<option value="">Selecionar serviço</option>'
          + DB.modal.services.map(s =>
              `<option value="${s.id}">${s.name} — R$ ${s.price.toFixed(0)}</option>`
            ).join('');
      }
      if (barberSelect && DB.modal.barbers && DB.modal.barbers.length > 0) {
        barberSelect.innerHTML = '<option value="">Selecionar barbeiro</option>'
          + DB.modal.barbers.map(b =>
              `<option value="${b.id}">${b.name}</option>`
            ).join('');
      }

      // Gráficos após dados carregados e Chart.js disponível
      waitForChartJS(() => {
        applyChartDefaults();
        initRevenueChart();
        initServicesChart();
        initOccupancyChart();
      });
    })
    .catch(err => {
      console.error('InBarber Dashboard: falha ao carregar dados:', err);
      // Mostra toast de erro sem travar a UI
      showToast('Erro ao carregar dados do Dashboard. Verifique o servidor.', 'error');
    });

  // Atualiza saudação ao longo da sessão
  setInterval(() => {
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      const ownerName = DB.header.ownerName || CONFIG.ownerFirstName;
      greetingEl.textContent = `${getGreeting()}, ${ownerName}`;
    }
  }, 60_000);
});