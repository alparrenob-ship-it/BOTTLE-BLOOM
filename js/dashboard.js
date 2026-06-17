// ===== BOTTLE BLOOM — Dashboard =====

const BASE_COUNTS = {
  bottles: 247,
  reusable: 148,
  industrial: 73,
  discard: 26,
  co2: 74.1,
  coins: 9850,
};

function safeParseArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem('bb_stats') || '{}');
    return {
      bottles: Number.isFinite(parsed.bottles) ? parsed.bottles : BASE_COUNTS.bottles,
      co2: Number.isFinite(parsed.co2) ? parsed.co2 : BASE_COUNTS.co2,
      coins: Number.isFinite(parsed.coins) ? parsed.coins : BASE_COUNTS.coins,
    };
  } catch {
    return { bottles: BASE_COUNTS.bottles, co2: BASE_COUNTS.co2, coins: BASE_COUNTS.coins };
  }
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function getUserCoins() {
  return safeNumber(localStorage.getItem('bb_userCoins') || '450', 450);
}

function getLeaderboardData() {
  return [
    { name: 'Pamela R.',     coins: 780 },
    { name: 'Emily O.',      coins: 650 },
    { name: 'Thomas H.',     coins: 520 },
    { name: 'Emanuel G.',    coins: 480 },
    { name: 'Juan Diego M.', coins: 450 },
    { name: 'Tú',            coins: getUserCoins(), mine: true },
  ];
}

const ACHIEVEMENTS = [
  { icon: '🌱', title: 'Primer Reciclaje',    desc: 'Procesaste tu primera botella',       unlocked: true  },
  { icon: '🔟', title: 'Eco Iniciado',        desc: '10 botellas procesadas',               unlocked: true  },
  { icon: '💯', title: 'Centenar Verde',       desc: '100 botellas procesadas',              unlocked: false },
  { icon: '⛓️', title: 'Blockchain Pioneer',  desc: 'Primer registro simulado',             unlocked: true  },
  { icon: '🏆', title: 'Campeón Ecológico',   desc: 'Primer lugar en el ranking',           unlocked: false },
  { icon: '🌿', title: 'Eco Guerrero',         desc: '500 EcoCoins acumulados',              unlocked: true  },
];

function relativeTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'sin fecha';

  const diff = (Date.now() - date) / 1000;
  if (diff < 60)    return 'hace un momento';
  if (diff < 3600)  return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  return date.toLocaleDateString();
}

function buildBlockchainLog() {
  const list = document.getElementById('blockList');
  const stored = safeParseArray('bb_chain');

  // Demo data for presentation mode.
  const demo = [
    { dot: '🟢', label: 'Botella Reutilizable', bottleId: 'BB-KX72P', timestamp: new Date(Date.now()-2*60000).toISOString(), hash: '0xab3f...7c21', demoMode: true },
    { dot: '🟡', label: 'Reciclaje Industrial',  bottleId: 'BB-M3NQR', timestamp: new Date(Date.now()-15*60000).toISOString(), hash: '0x54de...9a1f', demoMode: true },
    { dot: '🟢', label: 'Botella Reutilizable',  bottleId: 'BB-TX9VP', timestamp: new Date(Date.now()-38*60000).toISOString(), hash: '0xf2b8...3d90', demoMode: true },
    { dot: '🔴', label: 'Descarte Contaminado',  bottleId: 'BB-W8LJK', timestamp: new Date(Date.now()-2*3600000).toISOString(), hash: '0x19c7...5e44', demoMode: true },
    { dot: '🟢', label: 'Botella Reutilizable',  bottleId: 'BB-ZQ4RM', timestamp: new Date(Date.now()-4*3600000).toISOString(), hash: '0x8a01...2f67', demoMode: true },
  ];

  const all = [...stored, ...demo].slice(0, 8);

  list.innerHTML = all.map(b => {
    const label = escapeHTML(b.label || b.title || 'Botella registrada');
    const hash = escapeHTML(b.hash || `0x${b.bottleId || b.id || 'demo'}...`);
    const bottleId = escapeHTML(b.bottleId || b.id || 'N/A');
    const dot = escapeHTML(b.dot || '🟢');
    const demoLabel = b.demoMode ? ' · Simulado' : '';

    return `
      <div class="block-item">
        <span class="block-dot">${dot}</span>
        <div class="block-info">
          <strong>${label}${demoLabel}</strong>
          <span>${hash} · ID: ${bottleId}</span>
        </div>
        <span class="block-time">${escapeHTML(relativeTime(b.timestamp))}</span>
      </div>
    `;
  }).join('');
}

function buildLeaderboard() {
  const sorted = getLeaderboardData().sort((a, b) => b.coins - a.coins);
  const medals = ['🥇','🥈','🥉'];
  const list = document.getElementById('leaderboard');

  list.innerHTML = sorted.slice(0, 6).map((u, i) => `
    <div class="lb-item ${u.mine ? 'mine' : ''}">
      <span class="lb-rank">${escapeHTML(medals[i] || (i+1))}</span>
      <span class="lb-name">${u.mine ? '⭐ ' : ''}${escapeHTML(u.name)}</span>
      <span class="lb-coins">${safeNumber(u.coins).toLocaleString()} 🪙</span>
    </div>
  `).join('');

  document.getElementById('userCoins').textContent = getUserCoins().toLocaleString();
}

function buildAchievements() {
  const container = document.getElementById('achievements');
  const history = safeParseArray('bb_history');
  const achievementsLocal = ACHIEVEMENTS.map(a => ({ ...a }));
  if (history.length >= 1)  achievementsLocal[0].unlocked = true;
  if (history.length >= 10) achievementsLocal[1].unlocked = true;

  container.innerHTML = achievementsLocal.map(a => `
    <div style="
      display:flex;align-items:center;gap:0.8rem;padding:0.8rem;
      border-radius:8px;
      background:${a.unlocked ? 'var(--green-50)' : 'var(--gray-100)'};
      border:1px solid ${a.unlocked ? 'var(--green-300)' : 'transparent'};
      opacity:${a.unlocked ? 1 : 0.5};
      transition:all .2s;
    ">
      <span style="font-size:1.6rem;">${escapeHTML(a.icon)}</span>
      <div>
        <strong style="font-size:0.85rem;display:block;">${escapeHTML(a.title)}</strong>
        <span style="font-size:0.75rem;color:var(--gray-400);">${escapeHTML(a.desc)}</span>
      </div>
      ${a.unlocked ? '<span style="margin-left:auto;font-size:0.75rem;color:var(--green-600);font-weight:700;">✓</span>' : '<span style="margin-left:auto;font-size:0.75rem;color:var(--gray-400);">🔒</span>'}
    </div>
  `).join('');
}

function showChartFallback() {
  document.querySelectorAll('.chart-wrap').forEach(wrap => {
    wrap.innerHTML = '<p style="font-size:0.85rem;color:var(--gray-400);text-align:center;padding:2rem 1rem;">No se pudieron cargar las gráficas. Revisa tu conexión e inténtalo de nuevo.</p>';
  });
}

function buildCharts() {
  if (typeof Chart === 'undefined') {
    showChartFallback();
    return;
  }

  const history = safeParseArray('bb_history');
  const greenCount  = history.filter(h => h.type === 'green').length  + BASE_COUNTS.reusable;
  const yellowCount = history.filter(h => h.type === 'yellow').length + BASE_COUNTS.industrial;
  const redCount    = history.filter(h => h.type === 'red').length    + BASE_COUNTS.discard;

  // Donut chart — classification
  new Chart(document.getElementById('classChart'), {
    type: 'doughnut',
    data: {
      labels: ['Reutilizable 🟢', 'Reciclaje 🟡', 'Descarte 🔴'],
      datasets: [{
        data: [greenCount, yellowCount, redCount],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12, family: 'Inter' }, padding: 12 } },
      },
      cutout: '65%',
    },
  });

  // Bar chart — weekly
  const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
  const weekData = [18, 27, 35, 42, 58, 67 + history.length];

  new Chart(document.getElementById('weekChart'), {
    type: 'bar',
    data: {
      labels: weeks,
      datasets: [{
        label: 'Botellas procesadas',
        data: weekData,
        backgroundColor: 'rgba(82,183,136,0.8)',
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Inter' } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } },
      },
    },
  });

  // Line chart — impact
  const days = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Ahora'];
  const co2Data = [2.1, 5.4, 11.8, 23.5, 41.2, 62.7, BASE_COUNTS.co2 + history.length * 0.3];

  new Chart(document.getElementById('impactChart'), {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'CO₂ ahorrado (kg)',
        data: co2Data,
        borderColor: '#2D6A4F',
        backgroundColor: 'rgba(82,183,136,0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2D6A4F',
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Inter' } } },
        x: { grid: { display: false }, ticks: { font: { family: 'Inter' } } },
      },
    },
  });
}

// Update metric cards with localStorage data
function updateMetrics() {
  const stats = safeParseStats();

  function animN(id, val, isFloat) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = Date.now();
    const update = () => {
      const p = Math.min((Date.now() - start) / 1500, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = isFloat ? (e * val).toFixed(1) : Math.round(e * val).toLocaleString();
      if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  animN('m1', stats.bottles);
  animN('m2', Math.round(stats.bottles * 0.6));
  animN('m3', stats.co2, true);
  animN('m4', stats.coins);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  buildCharts();
  buildBlockchainLog();
  buildLeaderboard();
  buildAchievements();
  updateMetrics();
});
