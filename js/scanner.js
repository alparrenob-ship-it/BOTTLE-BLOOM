// ===== BOTTLE BLOOM — Scanner Logic =====

const CLASSIFICATIONS = [
  {
    type: 'green',
    dot: '🟢',
    title: 'Botella Reutilizable',
    subtitle: 'Apta para transformación en EcoBottle con biofertilizante',
    estado: 'Excelente',
    contam: '0% — Limpia',
    coins: 50,
    confidence: [92, 98],
    color: '#10B981',
    borderColor: 'var(--green-500)',
  },
  {
    type: 'yellow',
    dot: '🟡',
    title: 'Reciclaje Industrial',
    subtitle: 'Botella deformada. Enviada a reciclaje industrial',
    estado: 'Deformada',
    contam: '12% — Leve',
    coins: 25,
    confidence: [82, 91],
    color: '#F59E0B',
    borderColor: '#FCD34D',
  },
  {
    type: 'red',
    dot: '🔴',
    title: 'Descarte Contaminado',
    subtitle: 'Contaminantes detectados. Requiere disposición especial',
    estado: 'Contaminada',
    contam: '47% — Alta',
    coins: 10,
    confidence: [88, 96],
    color: '#EF4444',
    borderColor: '#FCA5A5',
  },
];

const VOLUMES = ['250 ml', '330 ml', '500 ml', '600 ml', '1000 ml', '1.5 L', '2 L'];
const TYPES   = ['PET #1 Transparente', 'PET #1 Verde', 'PET #1 Azul', 'PET #1 Celeste'];

let currentResult = null;
let stream = null;

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function requireCurrentResult(actionName) {
  if (currentResult) return true;
  alert(`Primero escanea una botella para ${actionName}.`);
  return false;
}

function startScan() {
  const area = document.getElementById('scannerArea');
  const progress = document.getElementById('scanProgress');
  const status = document.getElementById('scanStatus');
  const fill = document.getElementById('progressFill');
  const btn = document.getElementById('scanBtn');

  // Hide previous results
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('qrCard').classList.remove('show');
  document.getElementById('blockchainNotif').style.display = 'none';

  area.classList.add('scanning');
  progress.style.display = 'block';
  btn.disabled = true;
  btn.textContent = '⏳ Analizando...';

  const steps = [
    [300,  10, '📷 Capturando imagen...'],
    [600,  30, '🔍 Detectando contornos PET...'],
    [1000, 55, '🧠 Ejecutando simulación de IA...'],
    [1500, 75, '📊 Clasificando material...'],
    [2000, 90, '✅ Finalizando análisis...'],
    [2400, 100, '✓ Análisis simulado completado'],
  ];

  steps.forEach(([delay, pct, msg]) => {
    setTimeout(() => {
      fill.style.width = pct + '%';
      status.textContent = msg;
    }, delay);
  });

  setTimeout(() => {
    area.classList.remove('scanning');
    progress.style.display = 'none';
    btn.disabled = false;
    btn.textContent = '🤖 Analizar con IA';
    showResult();
  }, 2600);
}

function showResult() {
  // Demo mode: random weighted classification until a real model is connected.
  const roll = Math.random();
  let cls;
  if (roll < 0.5) cls = CLASSIFICATIONS[0];
  else if (roll < 0.8) cls = CLASSIFICATIONS[1];
  else cls = CLASSIFICATIONS[2];

  currentResult = { ...cls };

  const confidence = rand(cls.confidence[0], cls.confidence[1]);
  const volume = VOLUMES[rand(0, VOLUMES.length - 1)];
  const type = TYPES[rand(0, TYPES.length - 1)];
  const contam = cls.type === 'green' ? '0% — Limpia' : cls.type === 'yellow' ? `${rand(5,20)}% — Leve` : `${rand(30,65)}% — Alta`;

  currentResult.confidence = confidence;
  currentResult.volume = volume;
  currentResult.petType = type;
  currentResult.contamActual = contam;
  currentResult.bottleId = 'BB-' + Date.now().toString(36).toUpperCase();
  currentResult.timestamp = new Date().toISOString();
  currentResult.demoMode = true;

  const card = document.getElementById('resultCard');
  card.style.borderTopColor = cls.color;

  document.getElementById('resultDot').textContent = cls.dot;
  document.getElementById('resultTitle').textContent = cls.title;
  document.getElementById('resultSubtitle').textContent = 'Resultado simulado por Bottle Bloom Demo v1.0';
  document.getElementById('statEstado').textContent = cls.estado;
  document.getElementById('statTipo').textContent = type;
  document.getElementById('statContam').textContent = contam;
  document.getElementById('statVol').textContent = volume;
  document.getElementById('confidenceVal').textContent = confidence + '%';
  document.getElementById('ecoCoinsEarned').textContent = `+${cls.coins} EcoCoins ganados`;

  card.classList.add('show');

  setTimeout(() => {
    document.getElementById('confidenceBar').style.width = confidence + '%';
  }, 100);

  recordScanLocal(cls.type, cls.coins);
  window.recordScan && window.recordScan(cls.type);
}

function recordScanLocal(type, coins) {
  const history = readStoredArray('bb_history');
  history.unshift({
    id: currentResult.bottleId,
    type,
    coins,
    timestamp: new Date().toISOString(),
    label: currentResult.title,
    demoMode: true,
  });
  localStorage.setItem('bb_history', JSON.stringify(history.slice(0, 100)));

  const userCoins = parseInt(localStorage.getItem('bb_userCoins') || '400', 10) + coins;
  localStorage.setItem('bb_userCoins', userCoins);
}

function generateQR() {
  if (!requireCurrentResult('generar el QR')) return;

  const qrCard = document.getElementById('qrCard');
  const qrDiv  = document.getElementById('qrcode');
  qrDiv.innerHTML = '';

  document.getElementById('bottleId').textContent = currentResult.bottleId;

  const data = JSON.stringify({
    id: currentResult.bottleId,
    type: currentResult.type,
    classification: currentResult.title,
    confidence: currentResult.confidence + '%',
    volume: currentResult.volume,
    timestamp: currentResult.timestamp,
    blockchain: 'Simulación local de Flow Testnet',
    project: 'Bottle Bloom — Eight Academy',
    demoMode: true,
  });

  if (typeof QRCode === 'undefined') {
    qrDiv.textContent = 'No se pudo cargar la librería de QR. Revisa tu conexión e inténtalo de nuevo.';
  } else {
    new QRCode(qrDiv, {
      text: data,
      width: 180,
      height: 180,
      colorDark: '#1B4332',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H,
    });
  }

  qrCard.classList.add('show');
  qrCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function downloadQR() {
  if (!requireCurrentResult('descargar el QR')) return;

  const canvas = document.querySelector('#qrcode canvas');
  if (!canvas) {
    alert('Genera el QR antes de descargarlo.');
    return;
  }
  const link = document.createElement('a');
  link.download = `ecobottle-${currentResult.bottleId}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

function registerBlockchain() {
  if (!requireCurrentResult('registrar la botella')) return;

  const notif = document.getElementById('blockchainNotif');
  const hash = Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
  document.getElementById('blockHash').textContent = '0x' + hash.substring(0, 40) + '...';
  document.getElementById('blockTime').textContent = new Date().toLocaleString();
  notif.style.display = 'block';
  notif.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const chain = readStoredArray('bb_chain');
  chain.unshift({
    hash: '0x' + hash,
    bottleId: currentResult.bottleId,
    type: currentResult.type,
    label: currentResult.title,
    timestamp: new Date().toISOString(),
    dot: currentResult.dot,
    demoMode: true,
  });
  localStorage.setItem('bb_chain', JSON.stringify(chain.slice(0, 50)));
}

function scanAnother() {
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('qrCard').classList.remove('show');
  document.getElementById('blockchainNotif').style.display = 'none';
  document.getElementById('scannerArea').scrollIntoView({ behavior: 'smooth' });
  currentResult = null;
}

// Camera support
async function openCamera() {
  const feed  = document.getElementById('webcamFeed');
  const overlay = document.getElementById('scanOverlay');

  if (stream) {
    stopCamera();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Tu navegador no permite usar la cámara aquí. Usa "Cargar imagen" en su lugar.');
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    feed.srcObject = stream;
    feed.style.display = 'block';
    overlay.style.display = 'none';
    document.getElementById('camBtn').textContent = '📷 Capturar';
    document.getElementById('camBtn').onclick = captureFromCamera;
  } catch {
    alert('No se pudo acceder a la cámara. Usa "Cargar imagen" en su lugar.');
  }
}

function captureFromCamera() {
  const feed   = document.getElementById('webcamFeed');
  const canvas = document.getElementById('captureCanvas');
  canvas.width  = feed.videoWidth;
  canvas.height = feed.videoHeight;
  canvas.getContext('2d').drawImage(feed, 0, 0);
  stopCamera();
  canvas.style.display = 'block';
  startScan();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  const feed = document.getElementById('webcamFeed');
  feed.style.display = 'none';
  document.getElementById('scanOverlay').style.display = 'flex';
  document.getElementById('camBtn').textContent = '📷 Usar Cámara';
  document.getElementById('camBtn').onclick = openCamera;
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const area = document.getElementById('scannerArea');
    area.style.backgroundImage = `url(${ev.target.result})`;
    area.style.backgroundSize = 'cover';
    area.style.backgroundPosition = 'center';
    document.getElementById('scanOverlay').style.display = 'none';
    startScan();
  };
  reader.readAsDataURL(file);
}
