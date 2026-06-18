const userDataKey = 'bottleBloomUserData';
const bbUserKey = 'bb_user';
const bbBottlesKey = 'bb_bottles';
const bbCoinsKey = 'bb_coins_history';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const defaultUserData = {
  name: 'Fabricio',
  ecoins: 0,
  level: 1,
  bottlesRegistered: 0,
  todayProgress: 0,
  xp: 0,
  scanHistory: []
};

const classifications = [
  {
    code: 'green',
    label: 'Apta para EcoBottle',
    container: 'Contenedor verde',
    instruction: 'Deposita la botella en reutilización para limpieza y llenado con biofertilizante.',
    type: 'PET',
    state: 'Bueno',
    clean: 'Limpia',
    reuse: 'Alta',
    status: 'Validada',
    category: 'Biofertilizante',
    ecoinsEarned: 15,
    xpEarned: 70
  },
  {
    code: 'yellow',
    label: 'Requiere limpieza',
    container: 'Contenedor amarillo',
    instruction: 'Deposita la botella en limpieza ecológica antes de convertirla en EcoBottle.',
    type: 'PET',
    state: 'Regular',
    clean: 'Requiere limpieza',
    reuse: 'Media',
    status: 'Limpieza requerida',
    category: 'Reutilización',
    ecoinsEarned: 8,
    xpEarned: 45
  },
  {
    code: 'red',
    label: 'No apta',
    container: 'Contenedor rojo',
    instruction: 'Deposita la botella en descarte contaminado o reciclaje especial. No debe usarse como EcoBottle.',
    type: 'PET contaminado',
    state: 'Malo',
    clean: 'Contaminada',
    reuse: 'Baja',
    status: 'No apta',
    category: 'Reciclaje',
    ecoinsEarned: 2,
    xpEarned: 15
  }
];

let stream = null;
let currentImage = '';
let currentCaptureId = '';
let detectionResult = null;
let registeredCaptureId = '';

window.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  syncFromExistingData();
  renderDashboardData();
  renderHistory();
  bindScanActions();
  resetAnalysisRows();
  setStatus('Esperando botella...');
});

function setupSidebar() {
  $('.collapse-btn')?.addEventListener('click', () => $('.sidebar')?.classList.toggle('collapsed'));
  $('.logout-btn')?.addEventListener('click', () => location.href = 'index.html');
}

function bindScanActions() {
  $('#startCamera')?.addEventListener('click', startCamera);
  $('#captureBtn')?.addEventListener('click', captureBottle);
  $('#uploadBtn')?.addEventListener('click', () => $('#scanUpload')?.click());
  $('#scanUpload')?.addEventListener('change', handleUpload);
  $('#registerBottle')?.addEventListener('click', registerBottle);
  $('#scanAnother')?.addEventListener('click', resetScan);
  $('.scan-help')?.addEventListener('click', () => showToast('La IA simula cinco criterios: plástico, estado, limpieza, reutilización y protocolo. Luego recomienda el contenedor correcto.'));
}

function getUserData() { return readJSON(userDataKey, defaultUserData); }
function saveUserData(data) { writeJSON(userDataKey, data); return data; }

function syncFromExistingData() {
  const appUser = readJSON(bbUserKey, {});
  const bottles = readJSON(bbBottlesKey, []);
  const data = getUserData();
  const synced = {
    ...defaultUserData,
    ...data,
    name: appUser.name || data.name || 'Fabricio',
    ecoins: Number(appUser.coins ?? data.ecoins ?? 0),
    level: Number(String(appUser.level || data.level || 1).replace(/\D/g, '')) || 1,
    bottlesRegistered: Math.max(Number(data.bottlesRegistered || 0), bottles.length || 0),
    xp: Number(appUser.xp ?? data.xp ?? 0),
    scanHistory: Array.isArray(data.scanHistory) ? data.scanHistory : []
  };
  if (!synced.scanHistory.length && bottles.length) {
    synced.scanHistory = bottles.slice(0, 12).map((bottle) => ({
      id: bottle.bottleId || bottle.id || createBottleId(1),
      date: bottle.date || new Date().toISOString(),
      time: new Date(bottle.date || Date.now()).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
      type: bottle.type || 'PET',
      status: bottle.state || 'Validada',
      container: bottle.container || 'Contenedor verde',
      ecoinsEarned: Number(bottle.coins || 10),
      xpEarned: Number(bottle.xp || 50),
      image: bottle.image || ''
    }));
  }
  saveUserData(synced);
}

function renderDashboardData() {
  const data = getUserData();
  const co2 = Number(data.bottlesRegistered || 0) * 0.08;
  setText('#topCoins', `${Number(data.ecoins || 0).toLocaleString('es-EC')} Eight Coins`);
  setText('#topLevel', `Nivel ${data.level || 1}`);
  const avatar = $('#topAvatar');
  if (avatar) avatar.src = readJSON(bbUserKey, {}).photo || 'assets/MASCOTA%20PLANTA.png';
}

async function startCamera() {
  const video = $('#cameraVideo');
  const cameraBox = $('#scanCameraBox');
  const empty = $('#cameraEmpty');
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Cámara no disponible. Puedes subir una imagen.', 'bad');
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    video.hidden = false;
    $('#captureCanvas').hidden = true;
    $('#scanPreview').classList.remove('visible');
    empty.hidden = true;
    cameraBox.classList.add('has-media');
    setStatus('Cámara activa. Enfoca la botella en el centro.', 'good');
  } catch {
    setStatus('Cámara no disponible. Puedes subir una imagen.', 'bad');
  }
}

function captureBottle() {
  const video = $('#cameraVideo');
  const canvas = $('#captureCanvas');
  const cameraBox = $('#scanCameraBox');
  if (!canvas) return;

  const hasLiveVideo = video && !video.hidden && video.videoWidth;
  if (!hasLiveVideo) {
    setStatus('Primero activa la cámara o sube una imagen.', 'bad');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  currentImage = canvas.toDataURL('image/png');
  currentCaptureId = crypto.randomUUID();
  registeredCaptureId = '';
  detectionResult = null;
  canvas.hidden = false;
  video.hidden = true;
  cameraBox.classList.add('has-media');
  setStatus('Imagen capturada. Analizando con IA...');
  simulateBottleDetection();
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Imagen no válida', 'bad');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    currentImage = reader.result;
    currentCaptureId = crypto.randomUUID();
    registeredCaptureId = '';
    detectionResult = null;
    const preview = $('#scanPreview');
    preview.src = currentImage;
    preview.classList.add('visible');
    $('#cameraVideo').hidden = true;
    $('#captureCanvas').hidden = true;
    $('#cameraEmpty').hidden = true;
    $('#scanCameraBox').classList.add('has-media');
    setStatus('Imagen cargada. Analizando con IA...');
    simulateBottleDetection();
  };
  reader.readAsDataURL(file);
}

function simulateBottleDetection() {
  if (!currentImage) {
    setStatus('Necesitas una captura o imagen antes de analizar.', 'bad');
    return;
  }

  $('#scanResult').classList.add('hidden');
  setAnalyzing(true);
  resetAnalysisRows();
  setStatus('Analizando con IA...');
  setText('#analysisCopy', 'Analizando imagen con inteligencia artificial simulada...');

  const checks = ['plastic', 'state', 'clean', 'reuse', 'protocol'];
  checks.forEach((key, index) => {
    setTimeout(() => markAnalysisRow(key, index === checks.length - 1 ? 'loading' : 'done'), 330 * (index + 1));
    setTimeout(() => markAnalysisRow(key, 'done'), 330 * (index + 1) + 260);
  });

  let percent = 0;
  const progress = setInterval(() => {
    percent = Math.min(100, percent + 13);
    setText('#analysisPercent', `${percent}%`);
    if (percent >= 100) clearInterval(progress);
  }, 220);

  setTimeout(() => {
    setAnalyzing(false);
    clearInterval(progress);
    setText('#analysisPercent', '100%');
    // Punto de integracion futura: aqui se puede reemplazar la simulacion por una IA real.
    const choice = Math.random();
    detectionResult = choice < 0.55 ? classifications[0] : choice < 0.83 ? classifications[1] : classifications[2];
    setText('#analysisCopy', 'Análisis completado. Revisa el contenedor recomendado.');
    setStatus(`${detectionResult.label}: ${detectionResult.container}`, detectionResult.code === 'red' ? 'bad' : 'good');
    renderResult();
  }, 2100);
}

function resetAnalysisRows() {
  $$('.analysis-row').forEach(row => {
    row.classList.remove('done', 'loading');
    row.querySelector('strong').textContent = 'Pendiente';
  });
  setText('#analysisPercent', '0%');
}

function markAnalysisRow(key, state) {
  const row = document.querySelector(`[data-check="${key}"]`);
  if (!row) return;
  row.classList.remove('done', 'loading');
  row.classList.add(state);
  row.querySelector('strong').textContent = state === 'done' ? 'Completado' : 'Analizando...';
}

function renderResult() {
  if (!detectionResult) return;
  $('#scanResult').classList.remove('hidden');
  $('#resultImage').src = currentImage;
  setText('#resultAi', detectionResult.label);
  setText('#resultContainer', `${detectionResult.container}. ${detectionResult.instruction}`);
  setText('#resultType', detectionResult.type);
  setText('#resultState', detectionResult.state);
  setText('#resultClean', detectionResult.clean);
  setText('#resultReuse', detectionResult.reuse);
  setText('#resultReward', `+${detectionResult.ecoinsEarned} Eight Coins`);
  setText('#resultXp', `+${detectionResult.xpEarned} XP`);
  setText('#resultBadge', detectionResult.container);
  const decision = $('#containerDecision');
  decision.className = `container-decision ${detectionResult.code}`;
  const registerBtn = $('#registerBottle');
  registerBtn.disabled = false;
  registerBtn.textContent = 'Registrar clasificación';
}

function registerBottle() {
  if (!currentImage || !detectionResult) {
    setStatus('Necesitas una botella detectada antes de registrar.', 'bad');
    return;
  }
  if (registeredCaptureId === currentCaptureId) {
    setStatus('Esta captura ya fue registrada.', 'bad');
    return;
  }

  const now = new Date();
  const data = getUserData();
  const bottleNumber = Number(data.bottlesRegistered || 0) + 1;
  const id = createBottleId(bottleNumber);
  const record = {
    id,
    date: now.toISOString(),
    time: now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
    type: detectionResult.type,
    status: detectionResult.status,
    result: detectionResult.label,
    container: detectionResult.container,
    category: detectionResult.category,
    ecoinsEarned: detectionResult.ecoinsEarned,
    xpEarned: detectionResult.xpEarned,
    image: currentImage
  };

  const updated = {
    ...data,
    ecoins: Number(data.ecoins || 0) + detectionResult.ecoinsEarned,
    xp: Number(data.xp || 0) + detectionResult.xpEarned,
    bottlesRegistered: bottleNumber,
    todayProgress: Math.min(3, Number(data.todayProgress || 0) + 1),
    scanHistory: [record, ...(data.scanHistory || [])]
  };
  updated.level = Math.max(Number(updated.level || 1), Math.floor(updated.xp / 250) + 1);
  saveUserData(updated);
  syncAppStorage(record, updated);
  registeredCaptureId = currentCaptureId;
  $('#registerBottle').disabled = true;
  $('#registerBottle').textContent = 'Clasificación registrada';
  setStatus(`Registro exitoso: ${detectionResult.container}`, 'good');
  renderDashboardData();
  renderHistory();
  showToast(`Clasificación registrada. ${detectionResult.container}. Ganaste ${detectionResult.ecoinsEarned} Eight Coins.`);
}

function syncAppStorage(record, data) {
  const appUser = readJSON(bbUserKey, {});
  writeJSON(bbUserKey, {
    ...appUser,
    name: appUser.name || data.name,
    coins: data.ecoins,
    xp: data.xp,
    level: `Nivel ${data.level}`,
    photo: appUser.photo || 'assets/MASCOTA%20PLANTA.png'
  });

  const bottles = readJSON(bbBottlesKey, []);
  bottles.unshift({
    id: record.id,
    bottleId: record.id,
    date: record.date,
    type: record.type,
    state: record.status,
    reuse: detectionResult.reuse,
    result: record.result,
    container: record.container,
    coins: record.ecoinsEarned,
    xp: record.xpEarned,
    co2: 0.08,
    image: record.image,
    category: record.category
  });
  writeJSON(bbBottlesKey, bottles);

  const history = readJSON(bbCoinsKey, []);
  history.unshift({
    id: crypto.randomUUID(),
    action: `${record.result} - ${record.container}`,
    coins: record.ecoinsEarned,
    amount: record.ecoinsEarned,
    date: record.date
  });
  writeJSON(bbCoinsKey, history);
}

function renderHistory() {
  const list = $('#quickHistory');
  if (!list) return;
  const history = (getUserData().scanHistory || []).slice(0, 3);
  list.innerHTML = history.length ? history.map(item => `
    <article class="history-row">
      <div>
        <strong>${item.result || item.type || 'Botella PET'}</strong>
        <span>${formatDate(item.date)} · ${item.time || formatTime(item.date)} · ${item.container || 'Contenedor verde'}</span>
      </div>
      <small>+${item.ecoinsEarned || 10} Coins · ${item.status || 'Validada'}</small>
    </article>
  `).join('') : '<p class="muted">Aun no hay escaneos registrados.</p>';
}

function resetScan() {
  currentImage = '';
  currentCaptureId = '';
  detectionResult = null;
  registeredCaptureId = '';
  $('#scanResult').classList.add('hidden');
  $('#captureCanvas').hidden = true;
  $('#scanPreview').classList.remove('visible');
  $('#scanPreview').removeAttribute('src');
  $('#cameraVideo').hidden = !stream;
  $('#cameraEmpty').hidden = !!stream;
  $('#scanCameraBox').classList.toggle('has-media', !!stream);
  $('#scanUpload').value = '';
  resetAnalysisRows();
  setText('#analysisCopy', 'Sube o captura una imagen para iniciar el análisis.');
  setStatus('Esperando botella...');
}

function setAnalyzing(active) {
  $('#scanCameraBox')?.classList.toggle('scanning', active);
  $('#scanLoader')?.classList.toggle('active', active);
}

function setStatus(text, tone = '') {
  setText('#scanStatus', text);
  const message = $('#scanMessage');
  if (message) {
    message.textContent = text;
    message.className = `scan-message scan-tip ${tone}`.trim();
  }
}

function showToast(text) {
  const toast = $('#scanToast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3600);
}

function createBottleId(sequence) {
  const year = String(new Date().getFullYear()).slice(-2);
  return `BB-${year}-${String(sequence + 55).padStart(5, '0')}`;
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function formatDate(value) {
  return new Date(value || Date.now()).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(value) {
  return new Date(value || Date.now()).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}
