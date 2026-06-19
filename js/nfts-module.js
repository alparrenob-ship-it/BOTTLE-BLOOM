const USER_KEY = 'bb_user';
const APP_DATA_KEY = 'bottleBloomUserData';
const BOTTLES_KEY = 'bb_bottles';
const COINS_KEY = 'bb_coins_history';
const CHALLENGES_KEY = 'bb_daily_challenges';
const STREAK_KEY = 'bb_challenge_streak';
const NFT_STATE_KEY = 'bb_nfts_state';

const nftCatalog = [
  {
    id: 'primer-brote',
    name: 'Semilla Digital',
    rarity: 'comun',
    image: 'assets/NFT%20PLANTA.png',
    description: 'Por registrar tu primera botella y comenzar tu impacto ambiental.',
    condition: 'Registra 1 botella',
    reward: 10,
    metric: 'bottles',
    target: 1,
    date: '18 Jun 2025'
  },
  {
    id: 'guardian-reciclaje',
    name: 'Guardián del Reciclaje',
    rarity: 'raro',
    image: 'assets/NFT%20BOTELLA.png',
    description: 'Por registrar 10 botellas aptas o reutilizables.',
    condition: 'Registra 10 botellas aptas',
    reward: 20,
    metric: 'aptBottles',
    target: 10,
    date: '15 Jun 2025'
  },
  {
    id: 'eco-constructor',
    name: 'EcoConstructor',
    rarity: 'comun',
    image: 'assets/NFT%20ARDILLA.png',
    description: 'Por contribuir al biofertilizante y la reutilización circular.',
    condition: 'Crea 5 EcoBottles reutilizables',
    reward: 10,
    metric: 'reusable',
    target: 5,
    date: '12 Jun 2025'
  },
  {
    id: 'protector-verde',
    name: 'Protector Verde',
    rarity: 'epico',
    image: 'assets/NFT%20COLIBR%C3%8D.png',
    description: 'Por evitar 5 kg de CO2 con tus acciones ecológicas.',
    condition: 'Evita 5 kg de CO2',
    reward: 50,
    metric: 'co2',
    target: 5,
    date: '10 Jun 2025'
  },
  {
    id: 'maestro-impacto',
    name: 'Maestro del Impacto',
    rarity: 'legendario',
    image: 'assets/NFT%20PLANTA.png',
    description: 'Por evitar 10 kg de CO2 y sostener tu compromiso ambiental.',
    condition: 'Evita 10 kg de CO2',
    reward: 80,
    metric: 'co2',
    target: 10,
    date: 'Pendiente'
  },
  {
    id: 'coleccionista-elite',
    name: 'Coleccionista Elite',
    rarity: 'legendario',
    image: 'assets/NFT%20ARDILLA.png',
    description: 'Por obtener 10 NFTs dentro de tu colección BottleBloom.',
    condition: 'Obtén 10 NFTs',
    reward: 100,
    metric: 'ownedNfts',
    target: 10,
    date: 'Pendiente'
  },
  {
    id: 'leyenda-ambiental',
    name: 'Leyenda Ambiental',
    rarity: 'legendario',
    image: 'assets/NFT%20COLIBR%C3%8D.png',
    description: 'Por completar 30 retos ecológicos.',
    condition: 'Completa 30 retos',
    reward: 120,
    metric: 'challenges',
    target: 30,
    date: 'Pendiente'
  }
];

const rarityOrder = { comun: 1, raro: 2, epico: 3, legendario: 4 };
let activeFilter = 'all';
let sortMode = 'recent';

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

function getUserStats() {
  const user = readJson(USER_KEY, {});
  const data = readJson(APP_DATA_KEY, {});
  const bottles = readJson(BOTTLES_KEY, []);
  const challenges = readJson(CHALLENGES_KEY, {});
  const streak = readJson(STREAK_KEY, {});
  const coins = Number(user.coins ?? data.ecoins ?? 125);

  const bottlesRegistered = Number(data.bottlesRegistered ?? user.bottlesRegistered ?? bottles.length ?? 0);
  const aptBottles = bottles.filter((bottle) => {
    const result = String(bottle.result || bottle.status || bottle.estado || '').toLowerCase();
    const container = String(bottle.container || bottle.contenedor || '').toLowerCase();
    return result.includes('apta') || container.includes('verde');
  }).length || Math.min(bottlesRegistered, 4);
  const reusable = bottles.filter((bottle) => {
    const reuse = String(bottle.reuse || bottle.reutilizacion || bottle.reutilización || '').toLowerCase();
    return reuse.includes('alta') || reuse.includes('reutil');
  }).length || Math.min(bottlesRegistered, 2);
  const co2 = Number(data.co2Avoided ?? user.co2Avoided ?? (bottlesRegistered * 0.35));
  const completedChallenges = Object.values(challenges).filter((item) => item && (item.claimed || item.completed || item.progress >= item.target)).length || Number(data.completedChallenges ?? 1);
  const activeDays = Number(streak.current ?? data.streak ?? 12);

  return { user, data, bottlesRegistered, aptBottles, reusable, co2, completedChallenges, activeDays, coins };
}

function getMetricValue(metric, stats, ownedCount = 0) {
  const values = {
    bottles: stats.bottlesRegistered,
    aptBottles: stats.aptBottles,
    reusable: stats.reusable,
    co2: stats.co2,
    challenges: stats.completedChallenges,
    coins: stats.coins,
    ownedNfts: ownedCount
  };
  return Number(values[metric] || 0);
}

function calculateCollection() {
  const stats = getUserStats();
  const saved = readJson(NFT_STATE_KEY, {});
  let firstPass = nftCatalog.map((nft) => {
    const value = getMetricValue(nft.metric, stats, 0);
    return { ...nft, value, unlocked: Boolean(saved[nft.id]?.unlocked) || value >= nft.target, unlockedAt: saved[nft.id]?.unlockedAt || nft.date };
  });
  const ownedCount = firstPass.filter((nft) => nft.unlocked).length;
  const collection = firstPass.map((nft) => {
    const value = getMetricValue(nft.metric, stats, ownedCount);
    return { ...nft, value, unlocked: Boolean(saved[nft.id]?.unlocked) || value >= nft.target };
  });

  const nextState = { ...saved };
  collection.forEach((nft) => {
    if (nft.unlocked && !nextState[nft.id]?.unlocked) {
      nextState[nft.id] = { unlocked: true, unlockedAt: new Date().toISOString(), rewardClaimed: false };
      addReward(nft);
    }
  });
  writeJson(NFT_STATE_KEY, nextState);
  return { collection, stats };
}

function addReward(nft) {
  const user = readJson(USER_KEY, {});
  const data = readJson(APP_DATA_KEY, {});
  const history = readJson(COINS_KEY, []);
  const rewardId = `nft-reward-${nft.id}`;
  if (history.some((item) => item.id === rewardId)) return;

  const current = Number(user.coins ?? data.ecoins ?? 125);
  user.coins = current + nft.reward;
  data.ecoins = user.coins;
  history.unshift({ id: rewardId, date: new Date().toISOString(), action: `NFT desbloqueado: ${nft.name}`, detail: nft.rarity, coins: nft.reward, type: 'Ganado' });
  writeJson(USER_KEY, user);
  writeJson(APP_DATA_KEY, data);
  writeJson(COINS_KEY, history);
  showToast(`NFT desbloqueado: ${nft.name}. Ganaste +${nft.reward} Eight Coins.`);
}

function getFilteredCollection(collection) {
  let items = activeFilter === 'all' ? [...collection] : collection.filter((nft) => nft.rarity === activeFilter);
  if (sortMode === 'rarity') items.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
  if (sortMode === 'progress') items.sort((a, b) => (b.value / b.target) - (a.value / a.target));
  if (sortMode === 'recent') items.sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || rarityOrder[b.rarity] - rarityOrder[a.rarity]);
  return items;
}

function renderStats(collection, stats) {
  const owned = collection.filter((nft) => nft.unlocked);
  const rare = owned.filter((nft) => ['raro', 'epico', 'legendario'].includes(nft.rarity));
  $('#ownedTop').textContent = owned.length;
  $('#rareTop').textContent = rare.length;
  $('#ownedCount').textContent = owned.length;
  $('#rareCount').textContent = rare.length;
  $('#lockedCount').textContent = collection.length - owned.length;
  $('#activeDays').textContent = stats.activeDays;
}

function renderGrid(collection) {
  const grid = $('#nftGrid');
  if (!grid) return;
  const items = getFilteredCollection(collection);
  grid.innerHTML = items.map((nft) => {
    const progress = Math.max(0, Math.min(100, Math.round((nft.value / nft.target) * 100)));
    return `
      <article class="nft-card ${nft.unlocked ? '' : 'locked'}" data-id="${nft.id}" tabindex="0">
        <span class="rarity-pill rarity-${nft.rarity}">${nft.rarity}</span>
        <div class="nft-art"><img src="${nft.image}" alt="${nft.name}"></div>
        <div class="nft-info">
          <h2>${nft.name}</h2>
          <p>${nft.unlocked ? nft.description : nft.condition}</p>
          <small>${nft.unlocked ? nft.unlockedAt || nft.date : `${formatNumber(nft.value)} / ${formatNumber(nft.target)}`}</small>
          <div class="progress-track"><i style="--value:${progress}%"></i></div>
          <div class="reward-chip"><img src="assets/EIGHT%20COIN.png" alt="Eight Coins">+${nft.reward} Eight Coins</div>
        </div>
        ${nft.unlocked ? '' : '<div class="locked-banner">Bloqueado</div>'}
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.nft-card').forEach((card) => {
    const open = () => openNft(card.dataset.id, collection);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter') open(); });
  });
}

function renderNextUnlocks(collection) {
  const list = $('#nextUnlocks');
  if (!list) return;
  const locked = collection.filter((nft) => !nft.unlocked).sort((a, b) => (b.value / b.target) - (a.value / a.target)).slice(0, 3);
  list.innerHTML = locked.map((nft) => {
    const progress = Math.max(0, Math.min(100, Math.round((nft.value / nft.target) * 100)));
    return `
      <div class="unlock-item">
        <strong>${nft.name}</strong>
        <small>${nft.condition}</small>
        <div class="progress-track"><i style="--value:${progress}%"></i></div>
        <small>${formatNumber(nft.value)} / ${formatNumber(nft.target)}</small>
      </div>
    `;
  }).join('') || '<div class="unlock-item"><strong>Colección completa</strong><small>Todos los NFTs disponibles están desbloqueados.</small></div>';
}

function openNft(id, collection) {
  const nft = collection.find((item) => item.id === id);
  const modal = $('#nftModal');
  const content = $('#modalContent');
  if (!nft || !modal || !content) return;
  const progress = Math.max(0, Math.min(100, Math.round((nft.value / nft.target) * 100)));
  content.innerHTML = `
    <div class="modal-card">
      <img src="${nft.image}" alt="${nft.name}">
      <div>
        <span class="rarity-pill rarity-${nft.rarity}">${nft.rarity}</span>
        <h2>${nft.name}</h2>
        <p>${nft.description}</p>
        <p><strong>Condición:</strong> ${nft.condition}</p>
        <div class="progress-track"><i style="--value:${progress}%"></i></div>
        <p>${formatNumber(nft.value)} / ${formatNumber(nft.target)}</p>
        <div class="modal-actions">
          <a href="scan.html">Escanear botella</a>
          <a href="retos.html">Ver retos</a>
        </div>
      </div>
    </div>
  `;
  modal.showModal();
}

function formatNumber(value) {
  return Number(value).toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function renderPage() {
  const { collection, stats } = calculateCollection();
  renderStats(collection, stats);
  renderGrid(collection);
  renderNextUnlocks(collection);
}

function showToast(message) {
  const toast = $('#nftToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3000);
}

function bindActions() {
  $('.collapse-btn')?.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
  $('.logout-btn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
  $('#closeNftModal')?.addEventListener('click', () => $('#nftModal')?.close());
  $('#helpNfts')?.addEventListener('click', () => showToast('Los NFTs son logros digitales que desbloqueas al reciclar, completar retos y generar impacto.'));
  $('#openCollection')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  $('#showAllNfts')?.addEventListener('click', () => { activeFilter = 'all'; updateActiveTab(); renderPage(); });
  $('#sortNfts')?.addEventListener('change', (event) => { sortMode = event.target.value; renderPage(); });
  $('#filterTabs')?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    activeFilter = button.dataset.filter;
    updateActiveTab();
    renderPage();
  });
}

function updateActiveTab() {
  document.querySelectorAll('#filterTabs button').forEach((button) => button.classList.toggle('active', button.dataset.filter === activeFilter));
}

document.addEventListener('DOMContentLoaded', () => {
  bindActions();
  renderPage();
});
