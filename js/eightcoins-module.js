const BB_USER_KEY = 'bb_user';
const BB_DATA_KEY = 'bottleBloomUserData';
const BB_HISTORY_KEY = 'bb_coins_history';

const seedTransactions = [
  { id: 'coin-demo-1', date: '2025-06-18T08:45:00', action: 'Botella apta entregada', detail: 'ZooBotanica', coins: 3, type: 'Ganado' },
  { id: 'coin-demo-2', date: '2025-06-18T10:20:00', action: 'Reto Semilla completado', detail: 'Deposita 3 botellas aptas', coins: 15, type: 'Ganado' },
  { id: 'coin-demo-3', date: '2025-06-17T16:12:00', action: 'Botella requiere limpieza', detail: 'ZooBotanica', coins: 1, type: 'Ganado' },
  { id: 'coin-demo-4', date: '2025-06-16T11:30:00', action: 'Usar escaner IA (2 veces)', detail: 'Actividad diaria', coins: 2, type: 'Ganado' },
  { id: 'coin-demo-5', date: '2025-06-15T14:05:00', action: 'Canje: NFT Semilla Digital', detail: 'Coleccion ecologica', coins: -20, type: 'Usado' }
];

const earningRules = [
  { icon: 'B', color: '#7CFF2B', title: 'Botella apta entregada', text: 'Clasificacion correcta por la IA', reward: '+3' },
  { icon: 'L', color: '#FFD23F', title: 'Botella requiere limpieza', text: 'Clasificacion por la IA', reward: '+1' },
  { icon: 'R', color: '#0EDFFF', title: 'Completar retos diarios', text: 'Segun el reto completado', reward: '+5 a +40' },
  { icon: 'IA', color: '#B46CFF', title: 'Usar el escaner IA', text: '2 veces al dia', reward: '+2' }
];

const levelTable = [
  { level: 1, rank: 'EcoInicial', min: 0, next: 250, reward: 20 },
  { level: 2, rank: 'Reciclador Verde', min: 250, next: 650, reward: 35 },
  { level: 3, rank: 'EcoGuardian', min: 650, next: 1000, reward: 50 },
  { level: 4, rank: 'Protector Verde', min: 1000, next: 1500, reward: 75 },
  { level: 5, rank: 'Bloom Master', min: 1500, next: 2200, reward: 100 }
];

let showAll = false;

const $ = (selector) => document.querySelector(selector);

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeHistory(history) {
  return history.map((item, index) => {
    const coins = Number(item.coins ?? item.amount ?? 0);
    return {
      id: item.id || `coin-${Date.now()}-${index}`,
      date: item.date || item.createdAt || new Date().toISOString(),
      action: item.action || item.description || 'Actividad BottleBloom',
      detail: item.detail || item.source || 'Impacto ambiental',
      coins,
      type: coins < 0 ? 'Usado' : 'Ganado'
    };
  });
}

function ensureDemoData() {
  const user = readJson(BB_USER_KEY, {});
  const data = readJson(BB_DATA_KEY, {});
  let history = normalizeHistory(readJson(BB_HISTORY_KEY, []));

  if (!history.length) {
    history = seedTransactions;
    writeJson(BB_HISTORY_KEY, history);
  }

  const hasBalance = Number.isFinite(Number(user.coins)) || Number.isFinite(Number(data.ecoins));
  if (!hasBalance || Number(user.coins ?? data.ecoins ?? 0) === 0) {
    user.coins = 125;
    user.level = user.level || 3;
    data.ecoins = 125;
    data.level = data.level || 3;
    data.xp = data.xp || 650;
    writeJson(BB_USER_KEY, user);
    writeJson(BB_DATA_KEY, data);
  }

  return { user, data, history };
}

function getWalletState() {
  const { user, data, history } = ensureDemoData();
  const coins = Number(user.coins ?? data.ecoins ?? 125);
  const xp = Number(user.xp ?? data.xp ?? 650);
  const level = Number(user.level ?? data.level ?? 3);
  const levelInfo = levelTable.find((item) => item.level === level) || levelTable[2];
  const nextInfo = levelTable.find((item) => item.level === level + 1) || levelTable[levelTable.length - 1];
  return { user, data, history, coins, xp, level, levelInfo, nextInfo };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Hoy';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getMonthlySummary(history) {
  const now = new Date();
  const monthItems = history.filter((item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const source = monthItems.length ? monthItems : history;
  return source.reduce((acc, item) => {
    const coins = Number(item.coins || 0);
    if (coins > 0) acc.earned += coins;
    if (coins < 0) {
      acc.used += Math.abs(coins);
      acc.redeemed += 1;
    }
    return acc;
  }, { earned: 0, used: 0, redeemed: 0 });
}

function renderRules() {
  const container = $('#earningRules');
  if (!container) return;
  container.innerHTML = earningRules.map((rule) => `
    <div class="earning-row">
      <span class="earning-icon" style="color:${rule.color}">${rule.icon}</span>
      <span><strong>${rule.title}</strong><small>${rule.text}</small></span>
      <b>${rule.reward}</b>
    </div>
  `).join('');
}

function renderHistory(history) {
  const container = $('#coinHistory');
  if (!container) return;
  const rows = (showAll ? history : history.slice(0, 5));
  container.innerHTML = rows.map((item) => {
    const positive = Number(item.coins) >= 0;
    return `
      <div class="coin-row">
        <span class="date">${formatDate(item.date)}</span>
        <span class="desc"><strong>${item.action}</strong><small>${item.detail || 'BottleBloom'}</small></span>
        <span class="coin-type ${positive ? 'ganado' : 'usado'}">${positive ? 'Ganado' : 'Usado'}</span>
        <span class="coin-amount ${positive ? 'plus' : 'minus'}">${positive ? '+' : ''}${item.coins}</span>
      </div>
    `;
  }).join('');

  const toggle = $('#showAllTransactions');
  if (toggle) toggle.textContent = showAll ? 'Ver menos transacciones' : 'Ver todas las transacciones';
}

function renderLevel(state) {
  const progress = Math.max(0, Math.min(100, Math.round(((state.xp - state.levelInfo.min) / (state.levelInfo.next - state.levelInfo.min)) * 100)));
  $('#currentLevel').textContent = `Nivel ${state.level}`;
  $('#currentRank').textContent = state.levelInfo.rank;
  $('#currentXp').textContent = state.xp;
  $('#nextXp').textContent = state.levelInfo.next;
  $('#nextLevel').textContent = `Nivel ${state.nextInfo.level}`;
  $('#nextRank').textContent = state.nextInfo.rank;
  $('#nextReward').textContent = `+${state.nextInfo.reward}`;
  const bar = $('#levelProgress');
  if (bar) bar.style.setProperty('--value', `${progress}%`);
}

function renderPage() {
  const state = getWalletState();
  const history = normalizeHistory(state.history).sort((a, b) => new Date(b.date) - new Date(a.date));
  const summary = getMonthlySummary(history);

  $('#coinBalance').textContent = state.coins;
  $('#monthEarned').textContent = summary.earned;
  $('#monthUsed').textContent = summary.used;
  $('#monthRedeemed').textContent = summary.redeemed;

  renderRules();
  renderHistory(history);
  renderLevel(state);
}

function showToast(message) {
  const toast = $('#coinsToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function resetDemo() {
  const user = readJson(BB_USER_KEY, {});
  const data = readJson(BB_DATA_KEY, {});
  user.coins = 125;
  user.level = 3;
  user.xp = 650;
  data.ecoins = 125;
  data.level = 3;
  data.xp = 650;
  writeJson(BB_USER_KEY, user);
  writeJson(BB_DATA_KEY, data);
  writeJson(BB_HISTORY_KEY, seedTransactions);
  showAll = false;
  renderPage();
  showToast('Demo reiniciada: saldo, nivel e historial restaurados.');
}

function bindActions() {
  const collapse = $('.collapse-btn');
  if (collapse) collapse.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

  const logout = $('.logout-btn');
  if (logout) logout.addEventListener('click', () => { window.location.href = 'index.html'; });

  $('#scrollHistory')?.addEventListener('click', () => $('#historyPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  $('#clearDemo')?.addEventListener('click', resetDemo);
  $('#showAllTransactions')?.addEventListener('click', () => { showAll = !showAll; renderPage(); });
  $('#openLevels')?.addEventListener('click', () => showToast('Niveles: EcoInicial, Reciclador Verde, EcoGuardian, Protector Verde y Bloom Master.'));
  $('#helpCoins')?.addEventListener('click', () => showToast('Ganas Eight Coins al escanear botellas, completar retos y mantener tu racha ecológica.'));
}

document.addEventListener('DOMContentLoaded', () => {
  bindActions();
  renderPage();
});
