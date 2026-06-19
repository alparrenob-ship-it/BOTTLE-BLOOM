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

const CLASSIFICATION_RULES = {
  green: {
    code: 'green',
    colorName: 'Verde',
    label: 'APTA',
    container: 'Contenedor Verde',
    instruction: 'La botella cumple el protocolo: PET, buen estado, limpia y alta reutilizacion.',
    category: 'Biofertilizante',
    ecoinsEarned: 10,
    xpEarned: 50
  },
  yellow: {
    code: 'yellow',
    colorName: 'Amarillo',
    label: 'REQUIERE LIMPIEZA',
    container: 'Contenedor Amarillo',
    instruction: 'La botella es PET, pero necesita limpieza ecologica antes de reutilizarse.',
    category: 'Limpieza',
    ecoinsEarned: 10,
    xpEarned: 50
  },
  red: {
    code: 'red',
    colorName: 'Rojo',
    label: 'NO APTA',
    container: 'Contenedor Rojo',
    instruction: 'La botella esta danada o no cumple el protocolo basico de reciclaje.',
    category: 'Reciclaje especial',
    ecoinsEarned: 10,
    xpEarned: 50
  }
};

let stream = null;
let currentImage = '';
let currentCaptureId = '';
let currentUploadName = '';
let detectionResult = null;
let registeredCaptureId = '';
let analysisTimers = [];
let analysisProgressTimer = null;

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
  $('.scan-help')?.addEventListener('click', () => showToast('La IA valida primero que sea una botella PET con 70% minimo de confianza. Luego clasifica el contenedor verde, amarillo o rojo.'));
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
    synced.scanHistory = bottles.slice(0, 12).map((bottle, index) => ({
      id: bottle.bottleId || bottle.id || createBottleId(index + 1),
      date: bottle.date || new Date().toISOString(),
      time: new Date(bottle.date || Date.now()).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }),
      type: bottle.type || 'PET',
      status: 'Validada',
      result: bottle.result || bottle.state || 'APTA',
      container: normalizeContainer(bottle.container || 'Contenedor Verde'),
      colorName: containerToColor(bottle.container || 'Contenedor Verde'),
      ecoinsEarned: Number(bottle.coins || 10),
      xpEarned: Number(bottle.xp || 50),
      image: bottle.image || ''
    }));
  }
  saveUserData(synced);
}

function renderDashboardData() {
  const data = getUserData();
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
    setStatus('Camara no disponible. Puedes subir una imagen.', 'bad');
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
    setStatus('Camara activa. Enfoca una botella PET en el centro.', 'good');
  } catch {
    setStatus('Camara no disponible. Puedes subir una imagen.', 'bad');
  }
}

function captureBottle() {
  const video = $('#cameraVideo');
  const canvas = $('#captureCanvas');
  const cameraBox = $('#scanCameraBox');
  if (!canvas) return;

  const hasLiveVideo = video && !video.hidden && video.videoWidth;
  if (!hasLiveVideo) {
    setStatus('Primero activa la camara o sube una imagen.', 'bad');
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  currentImage = canvas.toDataURL('image/png');
  currentUploadName = '';
  currentCaptureId = crypto.randomUUID();
  registeredCaptureId = '';
  detectionResult = null;
  canvas.hidden = false;
  video.hidden = true;
  cameraBox.classList.add('has-media');
  setStatus('Imagen capturada. Validando botella PET...');
  simulateBottleDetection();
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Imagen no valida', 'bad');
    return;
  }

  currentUploadName = file.name.toLowerCase();
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
    setStatus('Imagen cargada. Validando botella PET...');
    simulateBottleDetection();
  };
  reader.readAsDataURL(file);
}

async function simulateBottleDetection() {
  if (!currentImage) {
    setStatus('Necesitas una captura o imagen antes de analizar.', 'bad');
    return;
  }

  stopAnalysisFlow();
  $('#scanResult')?.classList.add('hidden');
  resetAnalysisRows();
  detectionResult = null;
  setText('#analysisPercent', '0%');
  setText('#analysisCopy', 'Validando si el objeto dentro del marco SCAN es una botella PET...');

  const inference = await runModelInference(currentImage);
  if (!isValidPetInference(inference)) {
    abortInvalidObject();
    return;
  }

  setAnalyzing(true);
  setStatus('Analizando con IA...');
  setText('#analysisCopy', `Botella PET detectada correctamente (${Math.round(inference.confidence * 100)}%). Analizando variables...`);

  const checks = ['plastic', 'state', 'clean', 'reuse', 'protocol'];
  checks.forEach((key, index) => {
    queueAnalysisTimer(() => markAnalysisRow(key, 'loading'), 260 * index);
  });

  let percent = 0;
  analysisProgressTimer = setInterval(() => {
    percent = Math.min(100, percent + 5);
    setText('#analysisPercent', `${percent}%`);
    if (percent >= 100) clearInterval(analysisProgressTimer);
  }, 100);

  queueAnalysisTimer(() => {
    const variables = analyzeBottleProperties(inference);
    detectionResult = classifyPetScan(variables, inference);
    applyFinalAnalysisRows(detectionResult);
    setAnalyzing(false);
    setText('#analysisPercent', '100%');
    setText('#analysisCopy', 'Analisis completado. Revisa el contenedor recomendado.');
    setStatus(`${detectionResult.label}: ${detectionResult.container}`, detectionResult.code === 'red' ? 'bad' : 'good');
    renderResult();
  }, 2100);
}

async function runModelInference(imageData) {
  await new Promise(resolve => setTimeout(resolve, 150));

  // Model Inference simulado. Reemplazar este bloque por TensorFlow.js, Roboflow,
  // Teachable Machine o un endpoint real cuando el modelo entrenado este disponible.
  const invalidName = /(lata|vidrio|fruta|mano|metal|glass|can|hand|invalid|no-pet|nopet)/i.test(currentUploadName);
  const lowConfidence = /(borrosa|oscura|duda|low|baja-confianza)/i.test(currentUploadName);
  if (invalidName) return { label: 'OBJETO_NO_PET', object: 'Objeto no PET', type: 'NO_PET', confidence: 0.91 };
  if (lowConfidence) return { label: 'BOTELLA_PET', object: 'Botella PET', type: 'PET', confidence: 0.62 };

  const confidence = Math.min(0.98, 0.82 + (hashValue(imageData) % 16) / 100);
  return { label: 'BOTELLA_PLASTICO_PET', object: 'Botella de plastico PET', type: 'PET', confidence };
}

function isValidPetInference(inference) {
  const classText = `${inference?.label || ''} ${inference?.object || ''} ${inference?.type || ''}`.toLowerCase();
  const isPetBottle = classText.includes('pet') && classText.includes('botella');
  return Boolean(inference && inference.confidence >= 0.7 && isPetBottle);
}

function abortInvalidObject() {
  stopAnalysisFlow();
  detectionResult = null;
  resetAnalysisRows();
  setAnalyzing(false);
  setText('#analysisPercent', '0%');
  setText('#analysisCopy', 'Analisis abortado. No se alcanzo la confianza minima o el objeto no es PET.');
  $('#scanResult')?.classList.add('hidden');
  const message = 'Objeto no identificado. Por favor, enfoca una botella de plastico PET valida.';
  setStatus(message, 'bad');
  showToast(message);
}

function analyzeBottleProperties(inference) {
  const seed = hashValue(`${currentImage}|${currentCaptureId}|${Math.round(inference.confidence * 100)}`);
  const mode = seed % 10;
  if (mode <= 5) {
    return { type: 'PET', state: 'Bueno', clean: 'Limpia', reuse: 'Alta', protocolOk: true };
  }
  if (mode <= 7) {
    return { type: 'PET', state: 'Bueno', clean: mode === 6 ? 'Sucia' : 'Con residuos', reuse: 'Media', protocolOk: true };
  }
  return { type: 'PET', state: 'Danado/Roto', clean: 'Con residuos', reuse: 'Baja', protocolOk: false };
}

function classifyPetScan(variables, inference) {
  let rule = CLASSIFICATION_RULES.red;
  if (variables.state === 'Danado/Roto' || !variables.protocolOk) {
    rule = CLASSIFICATION_RULES.red;
  } else if (variables.clean === 'Sucia' || variables.clean === 'Con residuos') {
    rule = CLASSIFICATION_RULES.yellow;
  } else if (variables.type === 'PET' && variables.state === 'Bueno' && variables.clean === 'Limpia' && variables.reuse === 'Alta') {
    rule = CLASSIFICATION_RULES.green;
  }

  return {
    ...rule,
    type: variables.type,
    state: variables.state,
    clean: variables.clean,
    reuse: variables.reuse,
    protocolOk: variables.protocolOk,
    confidence: inference.confidence,
    status: 'Validada'
  };
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

function applyFinalAnalysisRows(result) {
  setAnalysisValue('plastic', result.type);
  setAnalysisValue('state', result.state);
  setAnalysisValue('clean', result.clean);
  setAnalysisValue('reuse', result.reuse);
  setAnalysisValue('protocol', result.protocolOk ? 'Cumple' : 'No cumple');
}

function setAnalysisValue(key, value) {
  const row = document.querySelector(`[data-check="${key}"]`);
  if (!row) return;
  row.classList.remove('loading');
  row.classList.add('done');
  row.querySelector('strong').textContent = value;
}

function renderResult() {
  if (!detectionResult) return;
  $('#scanResult').classList.remove('hidden');
  $('#resultImage').src = currentImage;
  setText('#resultAi', `Botella PET detectada correctamente - ${detectionResult.label}`);
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
  registerBtn.textContent = 'REGISTRAR CLASIFICACION';
}

function registerBottle() {
  if (!currentImage || !detectionResult) {
    setStatus('Necesitas una botella PET detectada antes de registrar.', 'bad');
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
    status: 'Validada',
    result: detectionResult.label,
    container: detectionResult.container,
    colorName: detectionResult.colorName,
    category: detectionResult.category,
    ecoinsEarned: 10,
    xpEarned: detectionResult.xpEarned,
    co2: 0.08,
    image: currentImage
  };

  const updated = {
    ...data,
    ecoins: Number(data.ecoins || 0) + record.ecoinsEarned,
    xp: Number(data.xp || 0) + record.xpEarned,
    bottlesRegistered: bottleNumber,
    todayProgress: Math.min(3, Number(data.todayProgress || 0) + 1),
    scanHistory: [record, ...(data.scanHistory || [])]
  };
  updated.level = Math.max(Number(updated.level || 1), Math.floor(updated.xp / 250) + 1);
  saveUserData(updated);
  syncAppStorage(record, updated);
  registeredCaptureId = currentCaptureId;
  $('#registerBottle').disabled = true;
  $('#registerBottle').textContent = 'CLASIFICACION REGISTRADA';
  setStatus('Registro exitoso', 'good');
  renderDashboardData();
  renderHistory();
  showToast(`Botella registrada con exito. Contenedor ${record.colorName} | +10 Coins · Validada`);
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
    colorName: record.colorName,
    coins: record.ecoinsEarned,
    xp: record.xpEarned,
    co2: record.co2,
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
  list.innerHTML = history.length ? history.map(item => {
    const date = formatDate(item.date);
    const time = item.time || formatTime(item.date);
    const color = item.colorName || containerToColor(item.container || 'Contenedor Verde');
    return `
      <article class="history-row">
        <div>
          <strong>${date} - ${time}</strong>
          <span>Contenedor ${color} | +${item.ecoinsEarned || 10} Coins · ${item.status || 'Validada'}</span>
        </div>
        <small>${item.result || 'Botella PET'} · ${item.id || ''}</small>
      </article>
    `;
  }).join('') : '<p class="muted">Aun no hay escaneos registrados.</p>';
}

function resetScan() {
  stopAnalysisFlow();
  currentImage = '';
  currentCaptureId = '';
  currentUploadName = '';
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
  setText('#analysisCopy', 'Sube o captura una imagen para iniciar el analisis.');
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

function queueAnalysisTimer(callback, delay) {
  const timer = setTimeout(callback, delay);
  analysisTimers.push(timer);
}

function stopAnalysisFlow() {
  analysisTimers.forEach(clearTimeout);
  analysisTimers = [];
  if (analysisProgressTimer) clearInterval(analysisProgressTimer);
  analysisProgressTimer = null;
  setAnalyzing(false);
}

function createBottleId(sequence) {
  const year = String(new Date().getFullYear()).slice(-2);
  return `BB-${year}-${String(sequence + 55).padStart(5, '0')}`;
}

function normalizeContainer(container) {
  const color = containerToColor(container);
  return `Contenedor ${color}`;
}

function containerToColor(container) {
  const value = String(container || '').toLowerCase();
  if (value.includes('amarillo')) return 'Amarillo';
  if (value.includes('rojo')) return 'Rojo';
  return 'Verde';
}

function hashValue(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
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
