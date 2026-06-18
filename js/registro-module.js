const bottlesKey = 'bb_bottles';
const userDataKey = 'bottleBloomUserData';
const coinsKey = 'bb_coins_history';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};

let records = [];
let selectedRecord = null;

window.addEventListener('DOMContentLoaded', () => {
  setupSidebar();
  records = buildRecords();
  renderSummary();
  renderTable();
  selectRecord(records[0]);
  $('#exportHistory')?.addEventListener('click', exportHistory);
  $('#closeDetail')?.addEventListener('click', () => $('.registry-detail')?.classList.toggle('compact'));
});

function setupSidebar() {
  $('.collapse-btn')?.addEventListener('click', () => $('.sidebar')?.classList.toggle('collapsed'));
  $('.logout-btn')?.addEventListener('click', () => location.href = 'index.html');
}

function buildRecords() {
  const bottles = readJSON(bottlesKey, []);
  const userData = readJSON(userDataKey, { scanHistory: [] });
  const scanHistory = Array.isArray(userData.scanHistory) ? userData.scanHistory : [];
  const merged = bottles.length ? bottles : scanHistory.map((item) => ({
    id: item.id,
    bottleId: item.id,
    date: item.date,
    type: item.type,
    state: item.status,
    result: item.result,
    container: item.container,
    category: item.category,
    coins: item.ecoinsEarned,
    xp: item.xpEarned,
    image: item.image
  }));

  const fallback = [
    mockRecord('BB-25-00061', '2025-06-18T08:45:00', 'Apta', 'Contenedor verde', 3),
    mockRecord('BB-25-00060', '2025-06-17T16:12:00', 'Requiere limpieza', 'Contenedor amarillo', 1),
    mockRecord('BB-25-00059', '2025-06-15T11:30:00', 'No apta', 'Contenedor rojo', 0),
    mockRecord('BB-25-00058', '2025-06-14T09:05:00', 'Apta', 'Contenedor verde', 3),
    mockRecord('BB-25-00057', '2025-06-12T15:20:00', 'Apta', 'Contenedor verde', 3),
    mockRecord('BB-25-00056', '2025-06-10T10:18:00', 'Requiere limpieza', 'Contenedor amarillo', 1),
    mockRecord('BB-25-00055', '2025-06-08T14:50:00', 'Apta', 'Contenedor verde', 3),
    mockRecord('BB-25-00054', '2025-06-05T09:40:00', 'No apta', 'Contenedor rojo', 0)
  ];

  return (merged.length ? merged : fallback).map(normalizeRecord).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function mockRecord(id, date, result, container, coins) {
  return { id, bottleId: id, date, type: 'PET', state: result, result, container, coins, image: '', category: result };
}

function normalizeRecord(item, index) {
  const id = item.bottleId || item.ecoBottleId || item.id || createBottleId(index + 1);
  const classification = classifyRecord(item);
  const date = item.date || new Date().toISOString();
  return {
    id,
    date,
    time: item.time || formatTime(date),
    result: classification.result,
    container: classification.container,
    tone: classification.tone,
    place: item.place || 'ZooBotánica',
    coins: Number(item.coins ?? item.ecoinsEarned ?? classification.coins),
    status: 'Registrada',
    type: item.type || 'PET',
    plasticType: item.plasticType || 'PET transparente',
    physicalState: item.state || classification.state,
    blockchainHash: item.blockchainHash || makeHash(id),
    image: item.image || 'assets/BOTELLA.png'
  };
}

function classifyRecord(item) {
  const text = `${item.result || ''} ${item.state || ''} ${item.container || ''} ${item.category || ''} ${item.reuse || ''}`.toLowerCase();
  if (text.includes('rojo') || text.includes('no apta') || text.includes('malo') || text.includes('contamin')) {
    return { result: 'No apta', container: 'Contenedor rojo', tone: 'red', coins: 0, state: 'Contaminada' };
  }
  if (text.includes('amarillo') || text.includes('limpieza') || text.includes('regular') || text.includes('media')) {
    return { result: 'Requiere limpieza', container: 'Contenedor amarillo', tone: 'yellow', coins: 1, state: 'Requiere limpieza' };
  }
  return { result: 'Apta', container: 'Contenedor verde', tone: 'green', coins: 3, state: 'Limpia' };
}

function renderSummary() {
  const apt = records.filter(r => r.tone === 'green').length;
  const clean = records.filter(r => r.tone === 'yellow').length;
  const bad = records.filter(r => r.tone === 'red').length;
  const coins = records.reduce((sum, record) => sum + Number(record.coins || 0), 0);
  setText('#summaryApt', apt);
  setText('#summaryClean', clean);
  setText('#summaryBad', bad);
  setText('#summaryCoins', coins);
}

function renderTable() {
  const body = $('#registryRows');
  if (!body) return;
  body.innerHTML = records.map((record) => `
    <tr data-id="${record.id}">
      <td>${formatDate(record.date)}</td>
      <td>${record.time}</td>
      <td><span class="result-dot ${record.tone}"></span>${record.result}</td>
      <td>${record.place}</td>
      <td><strong class="coin-gain">+${record.coins}</strong></td>
      <td><span class="state-pill">${record.status}</span></td>
      <td><button class="qr-action" type="button" aria-label="Ver detalle">QR</button><button class="row-open" type="button" aria-label="Abrir detalle">›</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7">Aun no hay entregas registradas.</td></tr>';

  $$('[data-id]', body).forEach(row => {
    row.addEventListener('click', () => selectRecord(records.find(record => record.id === row.dataset.id)));
  });
}

function selectRecord(record) {
  selectedRecord = record;
  if (!record) return;
  $$('[data-id]').forEach(row => row.classList.toggle('selected', row.dataset.id === record.id));
  const isGreen = record.tone === 'green';
  const isYellow = record.tone === 'yellow';
  setText('#detailTitle', isGreen ? 'Botella Apta' : isYellow ? 'Requiere Limpieza' : 'No Apta');
  setText('#detailSubtitle', isGreen ? 'Clasificación correcta' : isYellow ? 'Enviar a limpieza ecológica' : 'Clasificación de descarte');
  setText('#detailFecha', formatDate(record.date));
  setText('#detailHora', record.time);
  setText('#detailLugar', record.place);
  setText('#detailResultado', record.result === 'Apta' ? 'Apta para reutilización' : record.result);
  setText('#detailPlastic', record.plasticType);
  setText('#detailEstado', record.physicalState);
  setText('#detailCoins', `+${record.coins}`);
  setText('#detailHash', record.blockchainHash);
  setText('#detailChainState', 'Confirmado');
  $('#detailHeader').className = `detail-status ${record.tone}`;
  $('#detailQr').src = createQrSvg(record.id);
  $('#downloadQr').onclick = () => downloadQr(record);
}

function exportHistory() {
  const header = ['ID', 'Fecha', 'Hora', 'Resultado', 'Lugar', 'Eight Coins', 'Estado', 'Contenedor'];
  const rows = records.map(record => [record.id, formatDate(record.date), record.time, record.result, record.place, record.coins, record.status, record.container]);
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bottlebloom-registro-entregas.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function createQrSvg(seed) {
  const size = 21;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      const bit = finder ? (x === 0 || y === 0 || x === 6 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5)) : ((x * 13 + y * 17 + hash) % 5 < 2);
      if (bit) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><g fill="black">${cells.join('')}</g><circle cx="10.5" cy="10.5" r="2.2" fill="#7CFF2B"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function downloadQr(record) {
  const link = document.createElement('a');
  link.href = createQrSvg(record.id);
  link.download = `${record.id}-qr.svg`;
  link.click();
}

function makeHash(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  return `0x${Math.abs(hash).toString(16).padStart(8, '0')}...${seed.slice(-4)}`;
}

function createBottleId(sequence = 1) {
  const year = String(new Date().getFullYear()).slice(-2);
  return `BB-${year}-${String(sequence + 55).padStart(5, '0')}`;
}

function formatDate(date) {
  return new Date(date || Date.now()).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(date) {
  return new Date(date || Date.now()).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}
