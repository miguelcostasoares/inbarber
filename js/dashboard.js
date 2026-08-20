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


/* ─── 2. MOCK DATA ──────────────────────────────────────── */
/*
 * Todos os conjuntos de dados são exportados como constantes nomeadas.
 * Para conectar ao backend, substitua cada bloco por uma chamada fetch/axios
 * ao endpoint correspondente e mantenha a mesma estrutura de objeto.
 */

// 2.1 Serviços disponíveis
const mockServices = [
  { id: 'corte',        name: 'Corte Masculino',   price: 45,  duration: 30, color: '#3B82F6' },
  { id: 'barba',        name: 'Barba',              price: 35,  duration: 30, color: '#5B8DEF' },
  { id: 'combo',        name: 'Corte + Barba',      price: 70,  duration: 60, color: '#9B72CF' },
  { id: 'pigmentacao',  name: 'Pigmentação',        price: 90,  duration: 60, color: '#4CAF79' },
  { id: 'relaxamento',  name: 'Relaxamento',        price: 80,  duration: 60, color: '#E0924A' },
  { id: 'sobrancelha',  name: 'Sobrancelha',        price: 20,  duration: 20, color: '#E05454' },
];

// 2.2 Barbeiros
const mockBarbers = [
  { id: 'marcos', name: 'Marcos Silva',  avatar: 'MS', rating: 4.9 },
  { id: 'joao',   name: 'João Pereira',  avatar: 'JP', rating: 4.7 },
  { id: 'andre',  name: 'André Santos',  avatar: 'AS', rating: 4.8 },
];

// 2.3 Agendamentos de hoje
// status: 'confirmado' | 'pendente' | 'em-andamento' | 'concluido' | 'no-show'
const mockAppointments = [
  { id: 'a001', time: '08:00', client: 'Lucas Andrade',     serviceId: 'combo',       barberId: 'marcos', status: 'concluido',    phone: '84999990001' },
  { id: 'a002', time: '08:30', client: 'Felipe Rocha',      serviceId: 'corte',       barberId: 'joao',   status: 'concluido',    phone: '84999990002' },
  { id: 'a003', time: '09:00', client: 'Gabriel Souza',     serviceId: 'barba',       barberId: 'andre',  status: 'concluido',    phone: '84999990003' },
  { id: 'a004', time: '09:30', client: 'Matheus Lima',      serviceId: 'pigmentacao', barberId: 'marcos', status: 'concluido',    phone: '84999990004' },
  { id: 'a005', time: '10:00', client: 'Ricardo Ferreira',  serviceId: 'corte',       barberId: 'joao',   status: 'no-show',      phone: '84999990005' },
  { id: 'a006', time: '10:30', client: 'Bruno Carvalho',    serviceId: 'combo',       barberId: 'andre',  status: 'concluido',    phone: '84999990006' },
  { id: 'a007', time: '11:00', client: 'Diego Martins',     serviceId: 'relaxamento', barberId: 'marcos', status: 'em-andamento', phone: '84999990007' },
  { id: 'a008', time: '11:30', client: 'Thiago Oliveira',   serviceId: 'sobrancelha', barberId: 'joao',   status: 'confirmado',   phone: '84999990008' },
  { id: 'a009', time: '12:00', client: 'Cauã Ribeiro',      serviceId: 'corte',       barberId: 'andre',  status: 'confirmado',   phone: '84999990009' },
  { id: 'a010', time: '13:00', client: 'Vinicius Alves',    serviceId: 'combo',       barberId: 'marcos', status: 'confirmado',   phone: '84999990010' },
  { id: 'a011', time: '13:30', client: 'Leonardo Costa',    serviceId: 'barba',       barberId: 'joao',   status: 'pendente',     phone: '84999990011' },
  { id: 'a012', time: '14:00', client: 'Samuel Pereira',    serviceId: 'pigmentacao', barberId: 'andre',  status: 'pendente',     phone: '84999990012' },
  { id: 'a013', time: '14:30', client: 'Rafael Nascimento', serviceId: 'corte',       barberId: 'marcos', status: 'pendente',     phone: '84999990013' },
  { id: 'a014', time: '15:00', client: 'Igor Campos',       serviceId: 'combo',       barberId: 'joao',   status: 'pendente',     phone: '84999990014' },
  { id: 'a015', time: '16:00', client: 'Henrique Duarte',   serviceId: 'relaxamento', barberId: 'andre',  status: 'pendente',     phone: '84999990015' },
];

// 2.4 Faturamento dos últimos 30 dias (para gráfico de linha)
// Conectar: GET /api/revenue?period=30d
const mockRevenue30d = (function () {
  const base = [
    520, 480, 690, 710, 430, 0, 0,
    650, 720, 810, 590, 670, 780, 0,
    870, 920, 760, 840, 910, 650, 0,
    1020, 890, 950, 730, 860, 980, 0,
    1100, 870,
  ];
  // Sábados (índice 6, 13, 20, 27) = pico; domingos = fechado (0)
  return base.map((v, i) => {
    if (v === 0) return 0;
    const jitter = Math.floor((Math.random() * 80) - 40);
    return Math.max(0, v + jitter);
  });
})();

// 2.5 Distribuição de serviços no mês (para donut)
// Conectar: GET /api/services/distribution?period=month
const mockServiceDistribution = [
  { serviceId: 'corte',       count: 148 },
  { serviceId: 'combo',       count: 97  },
  { serviceId: 'barba',       count: 83  },
  { serviceId: 'pigmentacao', count: 42  },
  { serviceId: 'relaxamento', count: 31  },
  { serviceId: 'sobrancelha', count: 29  },
];

// 2.6 Ocupação por faixa de horário (para barras)
// Conectar: GET /api/occupancy/hourly?period=week
const mockOccupancyByHour = [
  { label: '08h', value: 62 },
  { label: '09h', value: 88 },
  { label: '10h', value: 95 },
  { label: '11h', value: 91 },
  { label: '12h', value: 54 },
  { label: '13h', value: 71 },
  { label: '14h', value: 87 },
  { label: '15h', value: 83 },
  { label: '16h', value: 76 },
  { label: '17h', value: 69 },
  { label: '18h', value: 58 },
  { label: '19h', value: 44 },
];

// 2.7 Metas dos Barbeiros — dados por período
// Conectar: GET /api/goals/barbers?period=week|month
//
// Estrutura por barbeiro:
//   sold        → valor já faturado no período
//   target      → meta total do período
//   trend       → array de 7 pontos (últimos 7 dias) para sparkline
//   status      → 'ahead' | 'on-track' | 'almost' | 'behind'
//   forecast    → texto de previsão (null = sem previsão)
//
// Status automático calculado via pct:
//   >= 100% → ahead | 75–99% → on-track | 50–74% → almost | < 50% → behind
const mockBarberGoals = {
  week: {
    teamTarget:  18_000,         // meta semanal total da equipe
    teamSold:    13_420,         // faturado pela equipe na semana
    // Tendência da equipe — últimos 7 dias (totais diários em R$)
    teamTrend:   [1580, 1920, 2100, 1870, 2250, 2300, 1400],
    barbers: [
      {
        barberId:  'marcos',
        sold:      5820,
        target:    6000,
        trend:     [720, 900, 940, 850, 960, 1050, 400],  // últimos 7 dias
        status:    'almost',
        forecast:  'Deve bater a meta amanhã',
      },
      {
        barberId:  'andre',
        sold:      4600,
        target:    6000,
        trend:     [580, 700, 750, 680, 820, 870, 200],
        status:    'on-track',
        forecast:  'No ritmo certo — projeção: R$ 6.100',
      },
      {
        barberId:  'joao',
        sold:      3000,
        target:    6000,
        trend:     [280, 320, 410, 340, 470, 380, 800],
        status:    'behind',
        forecast:  'Precisa de R$ 500/dia para recuperar',
      },
    ],
  },
  month: {
    teamTarget:  54_000,
    teamSold:    41_830,
    // Tendência da equipe — últimos 7 dias dentro do mês
    teamTrend:   [5200, 6100, 5800, 6400, 6300, 6500, 5530],
    barbers: [
      {
        barberId:  'marcos',
        sold:      19_200,
        target:    20_000,
        trend:     [2500, 2900, 2700, 3100, 3000, 3100, 1900],
        status:    'almost',
        forecast:  'Deve bater a meta em 4 dias',
      },
      {
        barberId:  'andre',
        sold:      14_830,
        target:    18_000,
        trend:     [1800, 2200, 2100, 2300, 2200, 2400, 1830],
        status:    'on-track',
        forecast:  'No ritmo — projeção: R$ 18.400',
      },
      {
        barberId:  'joao',
        sold:       7_800,
        target:    16_000,
        trend:     [900, 1000, 1000, 1000, 1100, 1300, 1500],
        status:    'behind',
        forecast:  'Tendência positiva, mas meta distante',
      },
    ],
  },
};

// 2.8 KPIs principais
// Conectar: GET /api/kpis/today e GET /api/kpis/month
const mockKPIs = {
  monthly: {
    revenue:          18_450,
    revenuePrevMonth: 15_920,  // usado para calcular variação
  },
  today: {
    revenue:          870,
    revenueYesterday: 720,
    appointments:     15,
    appointmentsValue: 870,
    occupancy:        78,       // porcentagem
    ticketAvg:        58,
    ticketAvgLastWeek:52,
    noShows:          1,
    noShowValue:      45,
  },
  week: {
    newClients: 7,
  },
};

// 2.9 Clientes para reativar (sem visita há >30 dias)
// Conectar: GET /api/clients/reactivate?days=30&limit=5
const mockReactivateClients = [
  { id: 'c001', name: 'Anderson Silva',   lastVisit: '42 dias', spend: 'R$ 210' },
  { id: 'c002', name: 'Rodrigo Teixeira', lastVisit: '38 dias', spend: 'R$ 175' },
  { id: 'c003', name: 'Paulo Mendes',     lastVisit: '35 dias', spend: 'R$ 280' },
  { id: 'c004', name: 'Fábio Correia',    lastVisit: '33 dias', spend: 'R$ 130' },
];

// 2.10 Aniversariantes do mês
// Conectar: GET /api/clients/birthdays?month=current
const mockBirthdays = [
  { id: 'c010', name: 'Carlos Eduardo', day: 'Hoje',      phone: '84999990020' },
  { id: 'c011', name: 'Thiago Lopes',   day: 'Amanhã',   phone: '84999990021' },
  { id: 'c012', name: 'Marcus Vitor',   day: '30/06',     phone: '84999990022' },
];

// 2.11 Estoque baixo
// Conectar: GET /api/stock/low?threshold=10
const mockLowStock = [
  { id: 'p001', name: 'Pomada Modeladora 150g', qty: 2,  unit: 'un' },
  { id: 'p002', name: 'Lâminas Gillette (cx)',  qty: 1,  unit: 'cx' },
  { id: 'p003', name: 'Óleo para barba 30ml',   qty: 4,  unit: 'un' },
];

// 2.12 Agendamentos pendentes de confirmação
// Conectar: GET /api/appointments?status=pendente&date=today
const mockPendingConfirmation = mockAppointments
  .filter(a => a.status === 'pendente')
  .map(a => ({
    id: a.id,
    client: a.client,
    time: a.time,
    phone: a.phone,
  }));

// 2.13 Loyalty Program — barbeiros
// Conectar: GET /api/loyalty/barbers?period=month
// Níveis: bronze (0–999 pts) | silver (1000–2499 pts) | gold (2500+ pts)
const mockLoyalty = [
  {
    barberId:  'marcos',
    points:    3120,
    level:     'gold',
    progress:  84,       // % rumo ao próximo benefício
    nextGoal:  3750,     // meta em pontos para próximo benefit
    benefits:  ['Folga extra', 'Comissão +2%', 'Kit premium'],
    rank:      1,
  },
  {
    barberId:  'andre',
    points:    2310,
    level:     'silver',
    progress:  63,
    nextGoal:  2500,
    benefits:  ['Folga extra', 'Kit básico'],
    rank:      2,
  },
  {
    barberId:  'joao',
    points:    890,
    level:     'bronze',
    progress:  89,
    nextGoal:  1000,
    benefits:  ['Certificado mensal'],
    rank:      3,
  },
];

// 2.14 Comissões — dados por período
// Conectar: GET /api/commissions?period=today|week|month&barberId=all
const mockCommissions = {
  today: {
    totalGenerated: 870,
    totalPayout:    217.5,
    appointments:   15,
    barbers: [
      { barberId: 'marcos', commissionPct: 30, generated: 360,   payout: 108,   appointments: 6, performance: 'good'    },
      { barberId: 'andre',  commissionPct: 28, generated: 300,   payout: 84,    appointments: 5, performance: 'good'    },
      { barberId: 'joao',   commissionPct: 25, generated: 210,   payout: 52.5,  appointments: 4, performance: 'medium'  },
    ],
  },
  week: {
    totalGenerated: 4830,
    totalPayout:    1257,
    appointments:   78,
    barbers: [
      { barberId: 'marcos', commissionPct: 30, generated: 2100,  payout: 630,   appointments: 33, performance: 'good'    },
      { barberId: 'andre',  commissionPct: 28, generated: 1560,  payout: 436.8, appointments: 25, performance: 'good'    },
      { barberId: 'joao',   commissionPct: 25, generated: 1170,  payout: 292.5, appointments: 20, performance: 'warning' },
    ],
  },
  month: {
    totalGenerated: 18450,
    totalPayout:    4847,
    appointments:   298,
    barbers: [
      { barberId: 'marcos', commissionPct: 30, generated: 8200,  payout: 2460,  appointments: 128, performance: 'good'   },
      { barberId: 'andre',  commissionPct: 28, generated: 6300,  payout: 1764,  appointments:  98, performance: 'good'   },
      { barberId: 'joao',   commissionPct: 25, generated: 3950,  payout: 987,   appointments:  72, performance: 'medium' },
    ],
  },
};

// 2.15 Relatórios rápidos — preview de dados por período
// Conectar: GET /api/reports/preview?period=today|week|month
const mockReportPreviews = {
  today: {
    period:   'Hoje',
    filename: 'relatorio-hoje',
    items: [
      { label: 'Faturamento',       value: 'R$ 870'    },
      { label: 'Agendamentos',      value: '15'         },
      { label: 'Ticket Médio',      value: 'R$ 58'      },
      { label: 'Top Serviço',       value: 'Corte + Barba' },
      { label: 'Comissões a pagar', value: 'R$ 217,50'  },
      { label: 'No-shows',          value: '1'          },
    ],
  },
  week: {
    period:   'Esta Semana',
    filename: 'relatorio-semana',
    items: [
      { label: 'Faturamento',       value: 'R$ 4.830'  },
      { label: 'Agendamentos',      value: '78'         },
      { label: 'Ticket Médio',      value: 'R$ 61,92'  },
      { label: 'Top Serviço',       value: 'Corte Masc.' },
      { label: 'Comissões a pagar', value: 'R$ 1.257'  },
      { label: 'Novos Clientes',    value: '7'          },
    ],
  },
  month: {
    period:   'Este Mês',
    filename: 'relatorio-junho-2025',
    items: [
      { label: 'Faturamento',       value: 'R$ 18.450' },
      { label: 'Agendamentos',      value: '298'        },
      { label: 'Ticket Médio',      value: 'R$ 61,91'  },
      { label: 'Top Serviço',       value: 'Corte Masc.' },
      { label: 'Comissões a pagar', value: 'R$ 4.847'  },
      { label: 'Taxa de Ocupação',  value: '78%'        },
    ],
  },
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
  return mockServices.find(s => s.id === id) || { name: id, price: 0, color: '#6B6762' };
}

/**
 * Busca barbeiro pelo id
 */
function getBarber(id) {
  return mockBarbers.find(b => b.id === id) || { name: id };
}

/**
 * Retorna label de status em PT
 */
function getStatusLabel(status) {
  const map = {
    'confirmado':    'Confirmado',
    'pendente':      'Pendente',
    'em-andamento':  'Em andamento',
    'concluido':     'Concluído',
    'no-show':       'No-show',
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
    'ahead':    { label: 'Superou',    css: 'goals-badge--ahead',    barCss: 'goals-bar-fill--green'  },
    'on-track': { label: 'No ritmo',   css: 'goals-badge--on-track', barCss: 'goals-bar-fill--blue'   },
    'almost':   { label: 'Quase lá',   css: 'goals-badge--almost',   barCss: 'goals-bar-fill--gold'   },
    'behind':   { label: 'Atrasado',   css: 'goals-badge--behind',   barCss: 'goals-bar-fill--orange' },
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

  const min  = Math.min(...points);
  const max  = Math.max(...points);
  const range = max - min || 1;

  // Normaliza para o viewBox com padding vertical de 3px
  const pad  = 3;
  const xs   = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys   = points.map(v => pad + ((1 - (v - min) / range) * (h - pad * 2)));

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
  // Saudação
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) {
    greetingEl.textContent = `${getGreeting()}, ${CONFIG.ownerFirstName}`;
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
    animateCounter(revenueEl, 0, mockKPIs.monthly.revenue, 1200, formatCurrency);
  }

  if (variationEl) {
    const v = calcVariation(mockKPIs.monthly.revenue, mockKPIs.monthly.revenuePrevMonth);
    variationEl.textContent = v.label;
    variationEl.className = `dash-header__revenue-badge dash-header__revenue-badge--${v.isUp ? 'up' : 'down'}`;

    // Atualiza o SVG de seta
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
  const kpi = mockKPIs.today;
  const week = mockKPIs.week;

  // Faturamento hoje
  const todayRevEl = document.getElementById('kpiTodayRevenue');
  if (todayRevEl) animateCounter(todayRevEl, 0, kpi.revenue, 1000, formatCurrency);

  const todayRevTrend = document.getElementById('kpiTodayRevenueTrend');
  if (todayRevTrend) {
    const v = calcVariation(kpi.revenue, kpi.revenueYesterday);
    todayRevTrend.textContent = v.label;
    todayRevTrend.className = `kpi-card__trend kpi-card__trend--${v.isUp ? 'up' : 'down'}`;
  }

  // Agendamentos hoje
  const apptEl = document.getElementById('kpiTodayAppts');
  if (apptEl) animateCounter(apptEl, 0, kpi.appointments, 800);

  const apptValueEl = document.getElementById('kpiTodayApptsValue');
  if (apptValueEl) apptValueEl.textContent = `${formatCurrency(kpi.appointmentsValue)} em serviços`;

  // Ocupação
  const occEl = document.getElementById('kpiOccupancy');
  const occFill = document.getElementById('kpiOccupancyFill');
  if (occEl) animateCounter(occEl, 0, kpi.occupancy, 1000, v => `${v}%`);
  if (occFill) {
    // Pequeno delay para a transição CSS ser visível
    setTimeout(() => { occFill.style.width = `${kpi.occupancy}%`; }, 200);
  }

  // Ticket médio
  const ticketEl = document.getElementById('kpiTicket');
  if (ticketEl) animateCounter(ticketEl, 0, kpi.ticketAvg, 900, formatCurrency);

  const ticketTrend = document.getElementById('kpiTicketTrend');
  if (ticketTrend) {
    const v = calcVariation(kpi.ticketAvg, kpi.ticketAvgLastWeek);
    ticketTrend.textContent = v.label;
    ticketTrend.className = `kpi-card__trend kpi-card__trend--${v.isUp ? 'up' : 'down'}`;
  }

  // No-shows
  const noShowEl = document.getElementById('kpiNoShows');
  if (noShowEl) animateCounter(noShowEl, 0, kpi.noShows, 600);

  const noShowValueEl = document.getElementById('kpiNoShowsValue');
  if (noShowValueEl) noShowValueEl.textContent = `${formatCurrency(kpi.noShowValue)} perdidos`;

  // Novos clientes
  const newClientsEl = document.getElementById('kpiNewClients');
  if (newClientsEl) animateCounter(newClientsEl, 0, week.newClients, 800);
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


/* ─── 6. CHARTS ─────────────────────────────────────────── */

// Paleta global para Chart.js (evita repetição)
const CHART_DEFAULTS = {
  gridColor: 'rgba(255,255,255,0.05)',
  tickColor: '#8A94A6',   // cinza-frio — alinhado com a paleta azul
  font: "'DM Sans', system-ui, sans-serif",
};

function applyChartDefaults() {
  Chart.defaults.color = CHART_DEFAULTS.tickColor;
  Chart.defaults.font.family = CHART_DEFAULTS.font;
  Chart.defaults.font.size = 11;
}

// 6.1 Gráfico de linha: Faturamento 30 dias
function initRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

  const labels = getLast30DayLabels();
  const data = mockRevenue30d;

  // Calcula total para tooltip do total
  const total = data.reduce((s, v) => s + v, 0);

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Faturamento',
        data,
        borderColor: '#3B82F6',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#3B82F6',
        pointHoverBorderColor: '#0A0A0A',
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          gradient.addColorStop(0, 'rgba(59,130,246,0.18)');
          gradient.addColorStop(1, 'rgba(59,130,246,0.00)');
          return gradient;
        },
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          borderColor: 'rgba(59,130,246,0.25)',
          borderWidth: 1,
          padding: 12,
          titleColor: '#94A3B8',
          bodyColor: '#FFFFFF',
          callbacks: {
            label: (ctx) => ` ${formatCurrency(ctx.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: CHART_DEFAULTS.gridColor, drawTicks: false },
          border: { dash: [4, 4], color: 'transparent' },
          ticks: {
            maxTicksLimit: 8,
            maxRotation: 0,
            color: CHART_DEFAULTS.tickColor,
          },
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
}

// 6.2 Donut: Distribuição de serviços
function initServicesChart() {
  const canvas = document.getElementById('servicesChart');
  if (!canvas) return;

  const total = mockServiceDistribution.reduce((s, d) => s + d.count, 0);

  const labels  = mockServiceDistribution.map(d => getService(d.serviceId).name);
  const data    = mockServiceDistribution.map(d => d.count);
  const colors  = mockServiceDistribution.map(d => getService(d.serviceId).color);

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'CC'),   // 80% opacidade
        borderColor:     colors,
        borderWidth: 1.5,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          borderColor: 'rgba(59,130,246,0.25)',
          borderWidth: 1,
          padding: 10,
          titleColor: '#94A3B8',
          bodyColor: '#FFFFFF',
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / total) * 100).toFixed(0)}%)`,
          },
        },
      },
    },
  });

  // Legenda customizada
  const legendEl = document.getElementById('donutLegend');
  if (legendEl) {
    legendEl.innerHTML = mockServiceDistribution.map((d, i) => {
      const pct = ((d.count / total) * 100).toFixed(0);
      return `
        <div class="donut-legend-item">
          <span class="donut-legend-dot" style="background:${colors[i]}"></span>
          <span>${getService(d.serviceId).name}</span>
          <span class="donut-legend-pct">${pct}%</span>
        </div>
      `;
    }).join('');
  }
}

// 6.3 Barras: Ocupação por horário
function initOccupancyChart() {
  const canvas = document.getElementById('occupancyChart');
  if (!canvas) return;

  const labels = mockOccupancyByHour.map(d => d.label);
  const data   = mockOccupancyByHour.map(d => d.value);

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
          backgroundColor: '#111827',
          borderColor: 'rgba(59,130,246,0.25)',
          borderWidth: 1,
          padding: 10,
          titleColor: '#94A3B8',
          bodyColor: '#FFFFFF',
          callbacks: {
            label: (ctx) => ` ${ctx.raw}% de ocupação`,
          },
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
          min: 0,
          max: 100,
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

// Período ativo das metas (week | month)
let currentGoalsPeriod = 'week';

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
  const data = mockBarberGoals[period];
  if (!data) return;

  renderGoalsTeamOverview(data);
  renderGoalsList(data);
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
  const sparkSVG   = buildSparklineSVG(data.teamTrend, sparkColor, 88, 32);

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
  'ahead':    '#4CAF79',  // green
  'on-track': '#3B82F6',  // blue (primário)
  'almost':   '#60A5FA',  // blue-light (quase lá)
  'behind':   '#E0924A',  // orange
};

/**
 * Renderiza a lista individual de barbeiros com progresso e sparkline.
 */
function renderGoalsList(data) {
  const el = document.getElementById('goalsList');
  if (!el) return;

  // Índice de avatar (1-3) baseado na posição para aplicar o gradiente correto
  const avatarIndex = { marcos: 1, andre: 2, joao: 3 };

  el.innerHTML = data.barbers.map((entry, i) => {
    const barber     = getBarber(entry.barberId);
    const pct        = Math.min(Math.round((entry.sold / entry.target) * 100), 100);
    const statusMeta = getGoalStatusMeta(entry.status);
    const aidx       = avatarIndex[entry.barberId] || (i + 1);
    const sparkColor = GOAL_SPARK_COLORS[entry.status] || '#3B82F6';
    const sparkSVG   = buildSparklineSVG(entry.trend, sparkColor, 64, 24);

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
  const subEl = document.getElementById('agendaSub');
  if (subEl) {
    const confirmed = mockAppointments.filter(a => a.status === 'confirmado' || a.status === 'em-andamento').length;
    subEl.textContent = `${mockAppointments.length} agendamentos — ${confirmed} confirmados`;
  }

  renderAgendaList(mockAppointments);
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
    const service = getService(appt.serviceId);
    const barber  = getBarber(appt.barberId);
    const actions = getActionButtons(appt);

    return `
      <div class="agenda-item" role="listitem" data-id="${appt.id}">
        <div class="agenda-time">
          <span class="agenda-time__hour">${appt.time}</span>
          <span class="agenda-time__duration">${service.duration}min</span>
        </div>

        <div class="agenda-info">
          <span class="agenda-client">${appt.client}</span>
          <div class="agenda-meta">
            <span class="agenda-service">${service.name}</span>
            <span class="agenda-separator">·</span>
            <span class="agenda-barber">${barber.name}</span>
          </div>
          <span class="status-badge status-badge--${appt.status}">${getStatusLabel(appt.status)}</span>
        </div>

        <div class="agenda-actions">
          <span class="agenda-value">${formatCurrency(service.price)}</span>
          <div class="agenda-btn-row">
            ${actions}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Eventos dos botões de ação
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
      renderAgendaList(mockAppointments);
    });
  });
}

function handleAgendaAction(e) {
  const btn    = e.currentTarget;
  const id     = btn.dataset.id;
  const action = btn.dataset.action;

  const appt = mockAppointments.find(a => a.id === id);
  if (!appt) return;

  if (action === 'start') {
    appt.status = 'em-andamento';
    showToast(`${appt.client} — Atendimento iniciado`, 'success');
  } else if (action === 'finish') {
    appt.status = 'concluido';
    showToast(`${appt.client} — Atendimento concluído`, 'blue');
  }

  renderAgendaList(mockAppointments);
  updatePendingAlerts(); // Atualiza painel de alertas em tempo real
}


/* ─── 9. ALERTAS & OPORTUNIDADES ───────────────────────── */

function initAlerts() {
  renderReactivate();
  renderBirthdays();
  renderLowStock();
  updatePendingAlerts();
}

function renderReactivate() {
  const listEl  = document.getElementById('reactivateList');
  const badgeEl = document.getElementById('reactivateBadge');

  if (badgeEl) badgeEl.textContent = mockReactivateClients.length;

  if (!listEl) return;
  listEl.innerHTML = mockReactivateClients.map(c => `
    <li class="alert-item" role="listitem" title="Última visita: ${c.lastVisit}">
      <span class="alert-item__name">${c.name}</span>
      <span class="alert-item__sub">${c.lastVisit}</span>
      <span class="alert-item__tag alert-item__tag--orange">Reativar</span>
    </li>
  `).join('');
}

function renderBirthdays() {
  const listEl  = document.getElementById('birthdayList');
  const badgeEl = document.getElementById('birthdayBadge');

  if (badgeEl) badgeEl.textContent = mockBirthdays.length;

  if (!listEl) return;
  listEl.innerHTML = mockBirthdays.map(c => `
    <li class="alert-item" role="listitem">
      <span class="alert-item__name">${c.name}</span>
      <span class="alert-item__sub">${c.day}</span>
      <span class="alert-item__tag alert-item__tag--gold">🎂</span>
    </li>
  `).join('');
}

function renderLowStock() {
  const listEl  = document.getElementById('stockList');
  const badgeEl = document.getElementById('stockBadge');

  if (badgeEl) badgeEl.textContent = mockLowStock.length;

  if (!listEl) return;
  listEl.innerHTML = mockLowStock.map(p => `
    <li class="alert-item" role="listitem">
      <span class="alert-item__name">${p.name}</span>
      <span class="alert-item__sub">${p.qty} ${p.unit}</span>
      <span class="alert-item__tag alert-item__tag--red">Crítico</span>
    </li>
  `).join('');
}

function updatePendingAlerts() {
  const pending = mockAppointments.filter(a => a.status === 'pendente');
  const listEl  = document.getElementById('pendingList');
  const badgeEl = document.getElementById('pendingBadge');

  if (badgeEl) badgeEl.textContent = pending.length;

  if (!listEl) return;
  listEl.innerHTML = pending.map(a => `
    <li class="alert-item" role="listitem">
      <span class="alert-item__name">${a.client}</span>
      <span class="alert-item__sub">${a.time}</span>
      <span class="alert-item__tag alert-item__tag--blue">Confirmar</span>
    </li>
  `).join('');
}


/* ─── 10. MODAL ─────────────────────────────────────────── */

function initModal() {
  const overlay    = document.getElementById('modalOverlay');
  const openBtns   = [
    document.getElementById('newAppointmentBtn'),
    document.getElementById('topbarNewBtn'),
  ];
  const closeBtn   = document.getElementById('modalClose');
  const cancelBtn  = document.getElementById('modalCancel');

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
  closeBtn  && closeBtn.addEventListener('click',  closeModal);
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


/* ─── 11. SIDEBAR MOBILE ────────────────────────────────── */

function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const burger   = document.getElementById('burgerBtn');

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

  burger  && burger.addEventListener('click',  () => {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });

  overlay && overlay.addEventListener('click', closeSidebar);

  // Fecha ao navegar (links da sidebar)
  sidebar && sidebar.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
}


/* ─── 12. TOAST ─────────────────────────────────────────── */

function showToast(message, type = 'success') {
  // Remove toast anterior se existir
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const colors = {
    success: { bg: 'var(--green-bg)',  border: 'rgba(76,175,121,0.3)',   text: 'var(--green)'   },
    blue:    { bg: 'var(--blue-bg)',   border: 'rgba(59,130,246,0.3)',   text: 'var(--blue-lt)' },
    gold:    { bg: 'var(--blue-bg)',   border: 'rgba(59,130,246,0.3)',   text: 'var(--blue-lt)' }, // alias legado → blue
    error:   { bg: 'var(--red-bg)',    border: 'rgba(224,84,84,0.3)',    text: 'var(--red)'     },
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
    position:     'fixed',
    bottom:       '24px',
    right:        '24px',
    zIndex:       '1000',
    display:      'flex',
    alignItems:   'center',
    gap:          '8px',
    padding:      '12px 18px',
    borderRadius: 'var(--r-md)',
    background:   c.bg,
    border:       `1px solid ${c.border}`,
    color:        c.text,
    fontSize:     '13px',
    fontWeight:   '500',
    fontFamily:   'var(--ff-b)',
    boxShadow:    'var(--shadow-md)',
    transform:    'translateY(16px)',
    opacity:      '0',
    transition:   'transform 300ms var(--ease-out), opacity 300ms',
    maxWidth:     'calc(100vw - 32px)',
  });

  document.body.appendChild(toast);

  // Anima entrada
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity   = '1';
    });
  });

  // Remove após 3.5s
  setTimeout(() => {
    toast.style.transform = 'translateY(8px)';
    toast.style.opacity   = '0';
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
          el.style.opacity   = '1';
          el.style.transform = 'translateY(0)';
        }, delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.08 });

  targets.forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(18px)';
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
    1: { css: 'loyalty-item--1st',  rankCss: 'loyalty-rank--gold',   avatarCss: 'loyalty-avatar--gold',   symbol: '🥇' },
    2: { css: '',                    rankCss: 'loyalty-rank--silver',  avatarCss: 'loyalty-avatar--silver', symbol: '🥈' },
    3: { css: '',                    rankCss: 'loyalty-rank--bronze',  avatarCss: 'loyalty-avatar--bronze', symbol: '🥉' },
  };

  const levelLabel = { gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

  container.innerHTML = mockLoyalty.map(entry => {
    const barber  = getBarber(entry.barberId);
    const meta    = rankMeta[entry.rank] || { css: '', rankCss: '', avatarCss: 'loyalty-avatar--default', symbol: entry.rank };
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
  const data      = mockCommissions[period];
  const totalsEl  = document.getElementById('commissionTotals');
  const listEl    = document.getElementById('commissionList');
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
    const info     = getBarber(barber.barberId);
    const barPct   = maxGenerated > 0 ? ((barber.generated / maxGenerated) * 100).toFixed(0) : 0;
    const perfCss  = `commission-perf--${barber.performance}`;

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
  const preview = mockReportPreviews[period];
  if (!preview) return [];

  return [
    {
      type:    'Financeiro',
      icon:    'revenue',
      title:   `Relatório Financeiro`,
      period:  preview.period,
      preview: preview.items.slice(0, 4),
      filename: `${preview.filename}-financeiro.pdf`,
    },
    {
      type:    'Serviços',
      icon:    'services',
      title:   `Top Serviços`,
      period:  preview.period,
      preview: [
        preview.items.find(i => i.label === 'Agendamentos') || { label: 'Agendamentos', value: '—' },
        preview.items.find(i => i.label === 'Top Serviço')  || { label: 'Top Serviço',  value: '—' },
        preview.items.find(i => i.label === 'Ticket Médio') || { label: 'Ticket Médio', value: '—' },
        preview.items.find(i => i.label === 'No-shows' || i.label === 'Taxa de Ocupação' || i.label === 'Novos Clientes') || preview.items[5],
      ].filter(Boolean),
      filename: `${preview.filename}-servicos.pdf`,
    },
    {
      type:    'Comissões',
      icon:    'commissions',
      title:   `Relatório de Comissões`,
      period:  preview.period,
      preview: [
        preview.items.find(i => i.label === 'Faturamento')        || { label: 'Faturamento',       value: '—' },
        preview.items.find(i => i.label === 'Comissões a pagar')  || { label: 'Comissões a pagar', value: '—' },
        preview.items.find(i => i.label === 'Agendamentos')       || { label: 'Agendamentos',      value: '—' },
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
      el.style.opacity   = '0';
      el.style.transform = 'translateY(14px)';
      el.style.transition = 'opacity 400ms var(--ease-out), transform 400ms var(--ease-out)';
      setTimeout(() => {
        el.style.opacity   = '1';
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
  const btn      = e.currentTarget;
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
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
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
        const el    = entry.target;
        const delay = parseInt(el.dataset.revealDelay || 0);
        setTimeout(() => {
          el.style.opacity   = '1';
          el.style.transform = 'translateY(0)';
        }, delay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.08 });

  targets.forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(18px)';
    el.style.transition = 'opacity 480ms var(--ease-out), transform 480ms var(--ease-out)';
    el.dataset.revealDelay = Math.min(i * 40, 300);
    observer.observe(el);
  });
}


/* ─── 18. BOOT ──────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Garante que Chart.js carregou antes de inicializar os gráficos
  function waitForChartJS(cb, retries = 20) {
    if (typeof Chart !== 'undefined') {
      cb();
    } else if (retries > 0) {
      setTimeout(() => waitForChartJS(cb, retries - 1), 100);
    } else {
      console.warn('InBarber: Chart.js não carregou.');
    }
  }

  // Inicializa partes que não dependem do Chart.js
  initHeader();
  initKPIs();
  initGoals();   // Metas dos Barbeiros (substitui heatmap)
  initAgenda();
  initAlerts();
  initModal();
  initSidebar();

  // ── NOVAS SEÇÕES ──────────────────────────────────────────
  initLoyalty();       // Loyalty Program (seção 2.13)
  initCommissions();   // Gestão de Comissões (seção 2.14)
  initReports();       // Relatórios Rápidos (seção 2.15)
  // ──────────────────────────────────────────────────────────

  initScrollReveal();

  // Inicializa gráficos após garantir Chart.js disponível
  waitForChartJS(() => {
    applyChartDefaults();
    initRevenueChart();
    initServicesChart();
    initOccupancyChart();
  });

  // Atualiza saudação se a hora mudar durante a sessão (ex: página aberta às 11:55)
  setInterval(() => {
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      greetingEl.textContent = `${getGreeting()}, ${CONFIG.ownerFirstName}`;
    }
  }, 60_000);
});