const BOTTLES_KEY = 'bb_bottles';
const USER_KEY = 'bb_user';
const DATA_KEY = 'bottleBloomUserData';
let activeChart = 'co2';
let rangeDays = 30;

const $ = (selector) => document.querySelector(selector);

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (error) { return fallback; }
}

function getImpactData() {
  const bottles = readJson(BOTTLES_KEY, []);
  const user = readJson(USER_KEY, {});
  const data = readJson(DATA_KEY, {});
  const hasRealData = bottles.length > 0 || Number(data.bottlesRegistered || user.bottlesRegistered || 0) > 0;
  const bottleCount = hasRealData ? Number(data.bottlesRegistered ?? user.bottlesRegistered ?? bottles.length) : 22;
  const co2 = hasRealData ? Number(data.co2Avoided ?? user.co2Avoided ?? (bottleCount * 0.35)) : 6.8;
  const trees = Math.max(1, Math.round(bottleCount / 5));
  const water = bottleCount * 10;
  const km = bottleCount / 4;
  const fertilizer = hasRealData ? Number(data.fertilizer ?? (bottleCount * 0.055)) : 1.2;
  const ecoBottles = Math.max(0, Math.round(bottleCount * 0.62));
  return { bottles, bottleCount, co2, trees, water, km, fertilizer, ecoBottles, hasRealData };
}

function format(value, digits = 1) {
  return Number(value).toLocaleString('es-ES', { maximumFractionDigits: digits });
}

function renderStats(data) {
  $('#statBottles').textContent = format(data.bottleCount, 0);
  $('#statCo2').textContent = `${format(data.co2, 1)} kg`;
  $('#statTrees').textContent = format(data.trees, 0);
  $('#statFert').textContent = `${format(data.fertilizer, 1)} kg`;
  $('#statKmMini').textContent = `${format(data.km, 1)} km`;
  $('#currentDate').textContent = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getSeries(data) {
  const labels = rangeDays === 7 ? ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Hoy'] : rangeDays === 90 ? ['Mar', 'Abr', 'May', 'Jun', 'Hoy'] : ['20 May', '27 May', '3 Jun', '10 Jun', '18 Jun'];
  const max = { co2: data.co2, bottles: data.bottleCount, trees: data.trees, fert: data.fertilizer }[activeChart];
  const multipliers = [0.18, 0.41, 0.68, 0.84, 1];
  return labels.map((label, index) => ({ label, value: Math.max(0.1, max * multipliers[index]) }));
}

function renderLineChart(data) {
  const chart = $('#lineChart');
  if (!chart) return;
  const series = getSeries(data);
  const maxValue = Math.max(...series.map((item) => item.value), 1);
  const width = 720;
  const height = 245;
  const padX = 54;
  const padY = 34;
  const points = series.map((item, index) => {
    const x = padX + index * ((width - padX * 2) / (series.length - 1));
    const y = height - padY - (item.value / maxValue) * (height - padY * 2);
    return { ...item, x, y };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;
  const suffix = activeChart === 'co2' ? 'kg' : activeChart === 'fert' ? 'kg' : '';
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de impacto">
    <defs><linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7CFF2B" stop-opacity="0.35"/><stop offset="100%" stop-color="#7CFF2B" stop-opacity="0.02"/></linearGradient></defs>
    ${[0,1,2,3].map(i => `<line x1="${padX}" x2="${width-padX}" y1="${padY + i*48}" y2="${padY + i*48}" stroke="rgba(255,255,255,.08)"/>`).join('')}
    <polygon points="${area}" fill="url(#impactFill)"/>
    <polyline points="${line}" fill="none" stroke="#7CFF2B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#F5F7F6" stroke="#7CFF2B" stroke-width="3"/><text x="${p.x}" y="${p.y-14}" text-anchor="middle" fill="#7CFF2B" font-size="14" font-weight="800">${format(p.value,1)}${suffix}</text><text x="${p.x}" y="${height-10}" text-anchor="middle" fill="#A8B0AD" font-size="13">${p.label}</text>`).join('')}
  </svg>`;
}

function renderBreakdown(data) {
  const total = data.bottleCount + data.co2 + data.fertilizer + data.trees;
  const items = [
    { label: 'Botellas reutilizadas', value: data.bottleCount, detail: `${format(data.bottleCount, 0)} botellas`, color: '#36D64A' },
    { label: 'CO2 evitado', value: data.co2, detail: `${format(data.co2, 1)} kg`, color: '#0EDFFF' },
    { label: 'Biofertilizante generado', value: data.fertilizer, detail: `${format(data.fertilizer, 1)} kg`, color: '#FFD23F' },
    { label: 'Árboles beneficiados', value: data.trees, detail: `${format(data.trees, 0)} árboles`, color: '#A8B0AD' }
  ].map((item) => ({ ...item, pct: Math.round((item.value / total) * 100) }));
  const donut = $('#impactDonut');
  if (donut) {
    let start = 0;
    const stops = items.map((item) => {
      const end = start + item.pct;
      const part = `${item.color} ${start}% ${end}%`;
      start = end;
      return part;
    }).join(',');
    donut.style.background = `conic-gradient(${stops})`;
  }
  $('#breakdownList').innerHTML = items.map((item) => `<div class="breakdown-item"><i style="--color:${item.color}"></i><span>${item.label}<br><small>${item.detail}</small></span><strong>${item.pct}%</strong></div>`).join('');
}

function renderEquivalences(data) {
  const values = [
    { value: Math.round(data.co2 * 6), label: 'Horas de luz encendida equivalentes' },
    { value: Math.round(data.water / 2), label: 'Duchas de 5 minutos equivalentes' },
    { value: Math.round(data.bottleCount * 3.5), label: 'Cargas de celular equivalentes' },
    { value: format(data.trees * 0.15, 1), label: 'Árboles en un año de trabajo equivalente' }
  ];
  $('#equivGrid').innerHTML = values.map((item) => `<div class="equiv-item"><strong>${item.value}</strong><span>${item.label}</span></div>`).join('');
}

function renderRanking(data) {
  const pct = Math.max(12, Math.min(92, Math.round((data.co2 / 12.8) * 100)));
  $('#rankingBar').style.setProperty('--value', `${pct}%`);
  $('#rankingPosition').textContent = data.co2 >= 6 ? '#12' : '#34';
  $('#schoolAverage').textContent = '4.2 kg CO2';
  $('#topAverage').textContent = '12.8 kg CO2';
}

function renderPage() {
  const data = getImpactData();
  renderStats(data);
  renderLineChart(data);
  renderBreakdown(data);
  renderEquivalences(data);
  renderRanking(data);
}

function showToast(message) {
  const toast = $('#impactToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

function bindActions() {
  $('.collapse-btn')?.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
  $('.logout-btn')?.addEventListener('click', () => { window.location.href = 'index.html'; });
  $('#methodBtn')?.addEventListener('click', () => $('#methodModal')?.showModal());
  $('#openMethod')?.addEventListener('click', () => $('#methodModal')?.showModal());
  $('#closeMethod')?.addEventListener('click', () => $('#methodModal')?.close());
  $('#rangeSelect')?.addEventListener('change', (event) => { rangeDays = Number(event.target.value); renderPage(); });
  document.querySelectorAll('.chart-tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      activeChart = button.dataset.chart;
      document.querySelectorAll('.chart-tabs button').forEach((item) => item.classList.toggle('active', item === button));
      renderPage();
      showToast('Gráfica actualizada.');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => { bindActions(); renderPage(); });
