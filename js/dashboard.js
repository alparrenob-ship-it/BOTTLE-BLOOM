// ===== BOTTLE BLOOM — Dashboard =====

const LEADERBOARD_DATA = [
  { name: 'Pamela R.',     coins: 780 },
  { name: 'Emily O.',      coins: 650 },
  { name: 'Thomas H.',     coins: 520 },
  { name: 'Emanuel G.',    coins: 480 },
  { name: 'Juan Diego M.', coins: 450 },
  { name: 'Tú',           coins: parseInt(localStorage.getItem('bb_userCoins') || '450'), mine: true },
];

const ACHIEVEMENTS = [
  { icon: '🌱', title: 'Primer Reciclaje',    desc: 'Procesaste tu primera botella',       unlocked: true  },
  { icon: '🔟', title: 'Eco Iniciado',        desc: '10 botellas procesadas',               unlocked: true  },
  { icon: '💯', title: 'Centenar Verde',       desc: '100 botellas procesadas',              unlocked: false },
  { icon: '⛓️', title: 'Blockchain Pioneer',  desc: 'Primer registro en blockchain',        unlocked: true  },
  { icon: '🏆', title: 'Campeón Ecológico',   desc: 'Primer lugar en el ranking',           unlocked: false },
  { icon: '🌿', title: 'Eco Guerrero',         desc: '500 EcoCoins acumulados',              unlocked: true  },
];

function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return 'hace un momento';
  if (diff < 3600)  return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  return new Date(iso).toLocaleDateString();
}

function buildBlockchainLog() {
  const list = document.getElementById('blockList');
  const stored = JSON.parse(localStorage.getItem('bb_chain') || '[]');

  // Merge with demo data
  const demo = [
    { dot: '🟢', label: 'Botella Reutilizable', bottleId: 'BB-KX72P', timestamp: new Date(Date.now()-2*60000).toISOString(), hash: '0xab3f...7c21' },
    { dot: '🟡', label: 'Reciclaje Industrial',  bottleId: 'BB-M3NQR', timestamp: new Date(Date.now()-15*60000).toISOString(), hash: '0x54de...9a1f' },
    { dot: '🟢', label: 'Botella Reutilizable',  bottleId: 'BB-TX9VP', timestamp: new Date(Date.now()-38*60000).toISOString(), hash: '0xf2b8...3d90' },
    { dot: '🔴', label: 'Descarte Contaminado',  bottleId: 'BB-W8LJK', timestamp: new Date(Date.now()-2*3600000).toISOString(), hash: '0x19c7...5e44' },
    { dot: '🟢', label: 'Botella Reutilizable',  bottleId: 'BB-ZQ4RM', timestamp: new Date(Date.now()-4*3600000).toISOString(), hash: '0x8a01...2f67' },
  ];

  const all = [...stored, ...demo].slice(0, 8);

  list.innerHTML = all.map(b => `
    <div class="block-item">
      <span class="block-dot">${b.dot || '🟢'}</span>
      <div class="block-info">
        <strong>${b.label || b.title}</strong>
        <span>${b.hash || '0x' + b.bottleId + '...'} · ID: ${b.bottleId || b.id}</span>
      </div>
      <span class="block-time">${relativeTime(b.timestamp)}</span>
    </div>
  `).join('');
}

function buildLeaderboard() {
  const sorted = [...LEADERBOARD_DATA].sort((a, b) => b.coins - a.coins);
  const medals = ['🥇','🥈','🥉'];
  const list = document.getElementById('leaderboard');

  list.innerHTML = sorted.slice(0, 6).map((u, i) => `
    <div class="lb-item ${u.mine ? 'mine' : ''}">
      <span class="lb-rank">${medals[i] || (i+1)}</span>
      <span class="lb-name">${u.mine ? '⭐ ' : ''}${u.name}</span>
      <span class="lb-coins">${u.coins.toLocaleString()} 🪙</span>
    </div>
  `).join('');

  const userCoins = parseInt(localStorage.getItem('bb_userCoins') || '450');
  document.getElementById('userCoins').textContent = userCoins.toLocaleString();
}

function buildAchievements() {
  const container = document.getElementById('achievements');
  const history = JSON.parse(localStorage.getItem('bb_history') || '[]');
  const ACHIEVEMENTS_LOCAL = [...ACHIEVEMENTS];
  if (history.length >= 1)  ACHIEVEMENTS_LOCAL[0].unlocked = true;
  if (history.length >= 10) ACHIEVEMENTS_LOCAL[1].unlocked = true;

  container.innerHTML = ACHIEVEMENTS_LOCAL.map(a => `
    <div style="
      display:flex;align-items:center;gap:0.8rem;padding:0.8rem;
      border-radius:8px;
      background:${a.unlocked ? 'var(--green-50)' : 'var(--gray-100)'};
      border:1px solid ${a.unlocked ? 'var(--green-300)' : 'transparent'};
      opacity:${a.unlocked ? 1 : 0.5};
      transition:all .2s;
    ">
      <span style="font-size:1.6rem;">${a.icon}</span>
      <div>
        <strong style="font-size:0.85rem;display:block;">${a.title}</strong>
        <span style="font-size:0.75rem;color:var(--gray-400);">${a.desc}</span>
      </div>
      ${a.unlocked ? '<span style="margin-left:auto;font-size:0.75rem;color:var(--green-600);font-weight:700;">✓</span>' : '<span style="margin-left:auto;font-size:0.75rem;color:var(--gray-400);">🔒</span>'}
    </div>
  `).join('');
}

function buildCharts() {
  const history = JSON.parse(localStorage.getItem('bb_history') || '[]');
  const greenCount  = history.filter(h => h.type === 'green').length  + 148;
  const yellowCount = history.filter(h => h.type === 'yellow').length + 73;
  const redCount    = history.filter(h => h.type === 'red').length    + 26;

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
  const co2Data = [2.1, 5.4, 11.8, 23.5, 41.2, 62.7, 74.1 + history.length * 0.3];

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
  const stats   = JSON.parse(localStorage.getItem('bb_stats') || '{"bottles":247,"co2":74.1,"coins":9850}');
  const history = JSON.parse(localStorage.getItem('bb_history') || '[]');

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

  animN('m1', stats.bottles + history.length);
  animN('m2', Math.round((stats.bottles + history.length) * 0.6));
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
