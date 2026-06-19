const userDataKey = 'bottleBloomUserData';
const bbUserKey = 'bb_user';
const bbBottlesKey = 'bb_bottles';
const bbCoinsKey = 'bb_coins_history';
const challengeStateKey = 'bb_daily_challenges';
const streakKey = 'bb_challenge_streak';

const $ = (selector) => document.querySelector(selector);
const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const todayKey = () => new Date().toISOString().slice(0, 10);

const challengeDefinitions = [
  { id: 'seed', title: 'Reto Semilla', type: 'green', icon: 'B', description: 'Deposita 3 botellas aptas', detail: 'Deposita 3 botellas aptas en el contenedor verde.', target: 3, reward: 15, fallbackProgress: 2, match: bottle => isAptBottle(bottle) },
  { id: 'clean', title: 'Reto Limpieza', type: 'yellow', icon: 'L', description: 'Deposita 2 botellas que requieren limpieza', detail: 'Deposita botellas PET que necesitan limpieza ecológica.', target: 2, reward: 10, fallbackProgress: 0, match: bottle => isCleanBottle(bottle) },
  { id: 'recycle', title: 'Reto Reciclaje', type: 'red', icon: 'R', description: 'Deposita 1 botella no apta', detail: 'Deposita una botella no apta en el contenedor rojo.', target: 1, reward: 5, fallbackProgress: 1, match: bottle => isBadBottle(bottle) },
  { id: 'scanner', title: 'Reto Scanner', type: 'purple', icon: 'IA', description: 'Usa el escáner IA 2 veces', detail: 'Usa el escáner IA para validar dos botellas PET.', target: 2, reward: 8, fallbackProgress: 1, match: bottle => Boolean(bottle) }
];

window.addEventListener('DOMContentLoaded', () => {
  setupShell();
  ensureDailyState();
  updateStreakState();
  autoRewardRealCompletions();
  renderChallenges();
  startResetTimer();
});

function setupShell() {
  $('.collapse-btn')?.addEventListener('click', () => $('.sidebar')?.classList.toggle('collapsed'));
  $('.logout-btn')?.addEventListener('click', () => location.href = 'index.html');
}

function ensureDailyState() {
  const state = readJSON(challengeStateKey, {});
  if (state.date !== todayKey()) {
    writeJSON(challengeStateKey, { date: todayKey(), claimed: {}, selected: 'seed', lastResetAt: new Date().toISOString() });
  }
}
function getChallengeState() { ensureDailyState(); return readJSON(challengeStateKey, { date: todayKey(), claimed: {}, selected: 'seed' }); }
function saveChallengeState(state) { writeJSON(challengeStateKey, { ...state, date: todayKey() }); }

function getUserWallet() {
  const appUser = readJSON(bbUserKey, {});
  const legacyUser = readJSON(userDataKey, {});
  const coins = Number(appUser.coins ?? legacyUser.ecoins ?? 125);
  const levelNumber = Number(String(appUser.level || legacyUser.level || 3).replace(/\D/g, '')) || 3;
  return { appUser, legacyUser, coins, levelNumber };
}
function setUserWallet(coins) {
  const { appUser, legacyUser, levelNumber } = getUserWallet();
  writeJSON(bbUserKey, { ...appUser, coins, level: `Nivel ${levelNumber}` });
  writeJSON(userDataKey, { ...legacyUser, ecoins: coins, level: levelNumber });
}

function getTodayBottles() {
  const all = readJSON(bbBottlesKey, []);
  const key = todayKey();
  return all.filter(bottle => String(bottle.date || '').slice(0, 10) === key);
}

function buildChallenges() {
  const bottles = getTodayBottles();
  const state = getChallengeState();
  return challengeDefinitions.map(definition => {
    const realProgress = bottles.filter(definition.match).length;
    const progress = Math.min(definition.target, Math.max(realProgress, definition.fallbackProgress));
    const completed = progress >= definition.target;
    const completedByRealData = realProgress >= definition.target;
    const claimed = Boolean(state.claimed?.[definition.id]);
    return { ...definition, realProgress, progress, completed, completedByRealData, claimed };
  });
}

function autoRewardRealCompletions() {
  const state = getChallengeState();
  const challenges = buildChallenges();
  const toReward = challenges.filter(challenge => challenge.completedByRealData && !state.claimed?.[challenge.id]);
  if (!toReward.length) return;
  let wallet = getUserWallet();
  const claimed = { ...(state.claimed || {}) };
  toReward.forEach(challenge => {
    wallet.coins += challenge.reward;
    claimed[challenge.id] = true;
    addCoinHistory(challenge);
  });
  setUserWallet(wallet.coins);
  saveChallengeState({ ...state, claimed, selected: toReward[0].id });
  animateCoins();
  showToast(`Retos actualizados. Ganaste +${toReward.reduce((sum, item) => sum + item.reward, 0)} Eight Coins.`);
}

function renderChallenges() {
  const wallet = getUserWallet();
  setText('#headerCoins', wallet.coins.toLocaleString('es-EC'));
  setText('#headerLevel', wallet.levelNumber);
  const streak = readJSON(streakKey, { current: 3, best: 7, lastVisit: todayKey() });
  setText('#currentStreak', streak.current || 3);
  setText('#bestStreak', streak.best || 7);
  const challenges = buildChallenges();
  const completed = challenges.filter(challenge => challenge.completed);
  setText('#completedCount', completed.length);
  setText('#totalChallenges', challenges.length + 1);
  setText('#completedBadge', completed.length);
  $('#dailyProgressBar')?.style.setProperty('--value', `${Math.round((completed.length / (challenges.length + 1)) * 100)}%`);
  renderChallengeList(challenges);
  renderActiveChallenge(challenges);
  renderCompleted(challenges);
}

function renderChallengeList(challenges) {
  const list = $('#challengeList');
  if (!list) return;
  list.innerHTML = challenges.map(challenge => {
    const percent = Math.round((challenge.progress / challenge.target) * 100);
    const button = challenge.completed
      ? '<button class="challenge-action" disabled>¡Completado!</button>'
      : `<button class="challenge-action ${challenge.id === 'seed' ? 'primary' : ''}" data-select="${challenge.id}">${challenge.id === 'seed' ? 'Continuar' : 'Ver reto'}</button>`;
    return `
      <article class="challenge-card ${challenge.type} ${challenge.completed ? 'completed' : ''}" data-id="${challenge.id}">
        <div class="challenge-icon">${challenge.icon}</div>
        <div class="challenge-copy">
          <h3>${challenge.title}<span class="daily-tag">Diario</span></h3>
          <p>${challenge.description}</p>
          <div class="challenge-meter"><div class="challenge-progress"><i style="--value:${percent}%"></i></div><b>${challenge.progress} / ${challenge.target}</b></div>
        </div>
        <div class="reward-box"><span>Recompensa</span><strong>+${challenge.reward}</strong></div>
        ${button}
      </article>`;
  }).join('');
  list.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => selectChallenge(button.dataset.select)));
}

function renderActiveChallenge(challenges) {
  const state = getChallengeState();
  const active = challenges.find(challenge => challenge.id === state.selected) || challenges.find(challenge => !challenge.completed) || challenges[0];
  const card = $('#activeChallenge');
  if (!card || !active) return;
  const percent = Math.round((active.progress / active.target) * 100);
  card.innerHTML = `
    <div class="active-label">Reto activo</div>
    <div class="active-visual">
      <div class="active-bottle">${active.icon}</div>
      <div class="active-copy"><h2>${active.title} <span class="daily-tag">Diario</span></h2><p>${active.detail}</p></div>
    </div>
    <div class="active-count">${active.progress} / ${active.target}</div>
    <div class="challenge-progress"><i style="--value:${percent}%"></i></div>
    <div class="active-reward"><b>+${active.reward}</b> Eight Coins</div>
    <a class="scan-link" href="scan.html">Ir a escanear</a>`;
}

function renderCompleted(challenges) {
  const completedList = $('#completedList');
  if (!completedList) return;
  const completed = challenges.filter(challenge => challenge.completed);
  completedList.innerHTML = completed.length ? completed.map(challenge => `
    <article class="completed-card ${challenge.type}">
      <div class="challenge-icon">${challenge.icon}</div>
      <div><h3>${challenge.title} <span class="daily-tag">Diario</span></h3><p>${challenge.description}</p><b>${challenge.claimed ? 'Recompensa cobrada' : 'Completado'}</b></div>
      <small>+${challenge.reward}</small>
    </article>`).join('') : '<p class="empty-completed">Aún no hay retos completados hoy.</p>';
}

function selectChallenge(id) { const state = getChallengeState(); saveChallengeState({ ...state, selected: id }); renderChallenges(); }

function addCoinHistory(challenge) {
  const history = readJSON(bbCoinsKey, []);
  history.unshift({ id: crypto.randomUUID(), action: `Reto diario: ${challenge.title}`, coins: challenge.reward, amount: challenge.reward, date: new Date().toISOString() });
  writeJSON(bbCoinsKey, history);
}

function updateStreakState() {
  const current = readJSON(streakKey, { current: 3, best: 7, lastVisit: todayKey() });
  const today = todayKey();
  if (current.lastVisit === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const nextCurrent = current.lastVisit === yesterday ? Number(current.current || 0) + 1 : 1;
  writeJSON(streakKey, { current: nextCurrent, best: Math.max(Number(current.best || 0), nextCurrent, 7), lastVisit: today });
}

function startResetTimer() {
  const tick = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff = Math.max(0, midnight - now);
    const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    setText('#resetTimer', `${hours}:${minutes}:${seconds}`);
    const state = readJSON(challengeStateKey, {});
    if (state.date && state.date !== todayKey()) {
      ensureDailyState();
      updateStreakState();
      renderChallenges();
    }
  };
  tick();
  setInterval(tick, 1000);
}

function isAptBottle(bottle) { const text = normalizeBottleText(bottle); return text.includes('apta') || text.includes('verde') || text.includes('biofertilizante'); }
function isCleanBottle(bottle) { const text = normalizeBottleText(bottle); return text.includes('limpieza') || text.includes('amarillo') || text.includes('sucia') || text.includes('residuos'); }
function isBadBottle(bottle) { const text = normalizeBottleText(bottle); return text.includes('no apta') || text.includes('rojo') || text.includes('danado') || text.includes('dañado') || text.includes('reciclaje especial'); }
function normalizeBottleText(bottle) { return [bottle?.result, bottle?.container, bottle?.colorName, bottle?.category, bottle?.state, bottle?.clean].filter(Boolean).join(' ').toLowerCase(); }

function animateCoins() {
  const block = $('#coinBlock');
  if (!block) return;
  block.classList.remove('adding');
  void block.offsetWidth;
  block.classList.add('adding');
}
function showToast(text) {
  const toast = $('#challengeToast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3600);
}
function setText(selector, value) { const element = $(selector); if (element) element.textContent = value; }
