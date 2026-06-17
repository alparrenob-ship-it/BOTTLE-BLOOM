import {
  setUid,
  saveUserProfile,
  getUserProfile,
  addBottle,
  getBottles,
  addCoins,
  getCoinsHistory,
  saveImpact,
  getImpact,
  uploadBottleImage
} from './firebase.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const routes = {
  'unete.html': initRegister,
  'home.html': initHome,
  'scan.html': initScan,
  'registro.html': initRegistro,
  'profile.html': initProfile,
  'retos.html': initRetos,
  'impacto.html': initImpacto,
  'eightcoins.html': initEightCoins,
  'nfts.html': initNfts
};

const currentPage = location.pathname.split('/').pop() || 'index.html';

window.addEventListener('DOMContentLoaded', async () => {
  initShared();
  const init = routes[currentPage];
  if (init) await init();
});

function initShared() {
  $$('.collapse-btn').forEach(btn => btn.addEventListener('click', () => $('.sidebar')?.classList.toggle('collapsed')));
  $$('.logout-btn').forEach(btn => btn.addEventListener('click', () => location.href = 'index.html'));
  $$('.side-nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });
}

function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

async function initRegister() {
  const form = $('#registerForm');
  const nextBtn = $('#nextBtn');
  if (!form) return;
  const fields = ['fullName', 'email', 'age', 'institution'];
  const validate = () => {
    let ok = true;
    fields.forEach(name => {
      const input = form.elements[name];
      const wrap = input.closest('.field');
      const message = $('small', wrap);
      let valid = input.value.trim().length > 0;
      if (name === 'email') valid = validEmail(input.value.trim());
      if (name === 'age') valid = Number(input.value) >= 6 && Number(input.value) <= 100;
      wrap.classList.toggle('invalid', input.value.trim() && !valid);
      message.textContent = input.value.trim() && !valid ? 'Revisa este campo.' : '';
      ok = ok && valid;
    });
    nextBtn.classList.toggle('hidden', !ok);
    return ok;
  };
  fields.forEach(name => form.elements[name].addEventListener('input', validate));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validate()) return;
    const uid = crypto.randomUUID();
    setUid(uid);
    await saveUserProfile({
      uid,
      name: form.fullName.value.trim(),
      email: form.email.value.trim(),
      age: form.age.value,
      institution: form.institution.value.trim(),
      photo: 'assets/MASCOTA%20PLANTA.png',
      coins: 0,
      xp: 0,
      level: 'Nivel 1',
      currentStreak: 1,
      maxStreak: 1,
      createdAt: new Date().toISOString()
    });
    location.href = 'home.html';
  });
}

async function loadTopbar() {
  const user = await getUserProfile();
  const name = user.name || 'Eco Guerrero';
  const first = name.split(' ')[0];
  const hello = $('#helloName');
  const coins = $('#topCoins');
  const level = $('#topLevel');
  const avatar = $('#topAvatar');
  if (hello) hello.textContent = `Hola, ${first}`;
  if (coins) coins.textContent = `${Number(user.coins || 0).toLocaleString()} Eight Coins`;
  if (level) level.textContent = user.level || 'Nivel 1';
  if (avatar) avatar.src = user.photo || 'assets/MASCOTA%20PLANTA.png';
  return user;
}

async function initHome() {
  const user = await loadTopbar();
  const bottles = await getBottles(200);
  const impact = computeImpact(bottles.length);
  setText('#statBottles', bottles.length);
  setText('#statCo2', `${impact.co2.toFixed(2)} kg`);
  setText('#statCoins', Number(user.coins || 0).toLocaleString());
  setText('#statToday', `${Math.min(bottles.length, 3)}/3`);
}

function setText(selector, value) { const el = $(selector); if (el) el.textContent = value; }

let stream = null;
let capturedImage = '';
let lastResult = null;

async function initScan() {
  await loadTopbar();
  $('#startCamera')?.addEventListener('click', startCamera);
  $('#captureBtn')?.addEventListener('click', captureImage);
  $('#analyzeBtn')?.addEventListener('click', analyzeBottle);
  $('#saveScan')?.addEventListener('click', saveScan);
}

async function startCamera() {
  const video = $('#cameraVideo');
  const empty = $('.camera-empty');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    video.hidden = false;
    if (empty) empty.hidden = true;
  } catch {
    if (empty) empty.textContent = 'No se pudo activar la camara. Puedes continuar con simulacion.';
  }
}

function captureImage() {
  const video = $('#cameraVideo');
  const canvas = $('#captureCanvas');
  if (!canvas) return;
  const w = video?.videoWidth || 960;
  const h = video?.videoHeight || 540;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (video && !video.hidden && video.videoWidth) ctx.drawImage(video, 0, 0, w, h);
  else {
    ctx.fillStyle = '#050505'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#5CFF5C'; ctx.lineWidth = 6; ctx.strokeRect(80,80,w-160,h-160);
    ctx.fillStyle = '#42D9FF'; ctx.font = '42px Orbitron'; ctx.fillText('BottleBloom Scan', 120, 150);
  }
  capturedImage = canvas.toDataURL('image/png');
  canvas.hidden = false;
}

function analyzeBottle() {
  const box = $('.camera-box');
  box?.classList.add('scanning');
  setTimeout(() => {
    box?.classList.remove('scanning');
    const types = ['PET', 'HDPE', 'Plastico mixto'];
    const states = ['Bueno', 'Regular', 'Malo'];
    const reuse = ['Alta', 'Media', 'Baja'];
    const type = types[Math.floor(Math.random() * types.length)];
    const state = states[Math.floor(Math.random() * states.length)];
    const level = reuse[state === 'Bueno' ? 0 : state === 'Regular' ? 1 : 2];
    const result = level === 'Alta' ? 'Botella apta' : level === 'Media' ? 'Mas o menos apta' : 'No apta';
    let coins = 8;
    if (level === 'Alta') coins += 15;
    if (type === 'PET' && state === 'Bueno') coins += 20;
    lastResult = { type, state, reuse: level, result, coins, co2: 0.35 };
    renderScanResult(lastResult);
  }, 1800);
}

function renderScanResult(result) {
  $('#scanResult')?.classList.remove('hidden');
  setText('#rType', result.type);
  setText('#rState', result.state);
  setText('#rReuse', result.reuse);
  setText('#rResult', result.result);
  setText('#rCoins', `+${result.coins}`);
  setText('#rCo2', `${result.co2} kg`);
}

async function saveScan() {
  if (!lastResult) analyzeBottle();
  setTimeout(async () => {
    if (!lastResult) return;
    const image = await uploadBottleImage(capturedImage || $('#captureCanvas')?.toDataURL?.('image/png') || '');
    await addBottle({ image, ...lastResult });
    await addCoins('Botella registrada', lastResult.coins);
    const bottles = await getBottles(500);
    await saveImpact(computeImpact(bottles.length));
    location.href = 'registro.html';
  }, lastResult ? 0 : 1900);
}

async function initRegistro() {
  await loadTopbar();
  renderBottleList(await getBottles(20));
}

function renderBottleList(bottles) {
  const list = $('#bottleList');
  if (!list) return;
  list.innerHTML = bottles.map((b, index) => `
    <article class="bottle-card" data-id="${b.id}">
      <img src="${b.image || 'assets/MASCOTA%20BOTELLA.png'}" alt="Botella registrada">
      <h3>Botella ${bottles.length - index}</h3>
      <div class="meta">
        <span><strong>Fecha:</strong> ${formatDate(b.date)}</span>
        <span><strong>Tipo:</strong> ${b.type}</span>
        <span><strong>Estado:</strong> ${b.state}</span>
        <span><strong>Reutilizacion:</strong> ${b.reuse}</span>
        <span><strong>Coins:</strong> +${b.coins}</span>
      </div>
    </article>`).join('') || emptyState('Aun no hay botellas registradas.');
  $$('.bottle-card').forEach(card => card.addEventListener('click', () => openBottleDetail(bottles.find(b => b.id === card.dataset.id))));
}

function openBottleDetail(bottle) {
  if (!bottle) return;
  const modal = $('#detailModal');
  $('#detailContent').innerHTML = `
    <div class="card-title"><h2>Detalle de botella</h2><button class="btn ghost" data-close>Cerrar</button></div>
    <img class="camera-preview" src="${bottle.image || 'assets/MASCOTA%20BOTELLA.png'}" alt="Botella">
    <div class="result-grid" style="margin-top:16px">
      <div class="result-box"><label>Tipo</label><strong>${bottle.type}</strong></div>
      <div class="result-box"><label>Estado</label><strong>${bottle.state}</strong></div>
      <div class="result-box"><label>Resultado</label><strong>${bottle.result}</strong></div>
      <div class="result-box"><label>Reutilizacion</label><strong>${bottle.reuse}</strong></div>
      <div class="result-box"><label>Coins</label><strong>+${bottle.coins}</strong></div>
      <div class="result-box"><label>CO2 evitado</label><strong>${bottle.co2} kg</strong></div>
    </div>`;
  modal.classList.add('open');
  $('[data-close]', modal).addEventListener('click', () => modal.classList.remove('open'));
}

async function initProfile() {
  const user = await loadTopbar();
  const form = $('#profileForm');
  form.name.value = user.name || '';
  form.email.value = user.email || '';
  form.age.value = user.age || '';
  form.institution.value = user.institution || '';
  $('#profilePhoto').src = user.photo || 'assets/MASCOTA%20PLANTA.png';
  const bottles = await getBottles(500);
  setText('#profileCoins', Number(user.coins || 0).toLocaleString());
  setText('#profileXp', Number(user.xp || 0).toLocaleString());
  setText('#profileLevel', user.level || 'Nivel 1');
  setText('#profileStreak', user.currentStreak || 1);
  setText('#profileMaxStreak', user.maxStreak || 1);
  setText('#profileImpact', `${computeImpact(bottles.length).co2.toFixed(2)} kg CO2`);
  setText('#profileNfts', computeNfts(bottles.length, user.coins || 0, user.maxStreak || 1, 0).filter(n => n.unlocked).length);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    await saveUserProfile({
      ...user,
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      age: form.age.value,
      institution: form.institution.value.trim()
    });
    location.reload();
  });
}

async function initRetos() {
  await loadTopbar();
  const bottles = await getBottles(500);
  const user = await getUserProfile();
  const excellent = bottles.filter(b => b.type === 'PET' && b.state === 'Bueno').length;
  const impact = computeImpact(bottles.length);
  const retos = [
    ['Registrar 3 botellas', 'Completa tres registros en la estacion BottleBloom.', bottles.length, 3, 25],
    ['Reducir 1 kg de CO2', 'Acumula impacto ambiental verificable.', impact.co2, 1, 25],
    ['Reutilizar una botella', 'Logra una clasificacion de reutilizacion alta.', bottles.filter(b => b.reuse === 'Alta').length, 1, 25],
    ['Completar 3 dias de racha', 'Mantente activo tres dias seguidos.', user.currentStreak || 1, 3, 25],
    ['Escanear una botella excelente', 'Obtiene PET en buen estado.', excellent, 1, 20]
  ];
  const list = $('#challengeList');
  list.innerHTML = retos.map(([title, desc, value, goal, reward]) => {
    const pct = Math.min(100, Math.round((value / goal) * 100));
    const state = pct >= 100 ? 'completado' : pct > 0 ? 'en progreso' : 'pendiente';
    return `<article class="challenge-card"><div class="card-title"><h3>${title}</h3><span class="pill">${state}</span></div><p>${desc}</p><div class="progress" style="--value:${pct}%"><i></i></div><div class="meta"><span>${Number(value).toFixed(value % 1 ? 2 : 0)} / ${goal}</span><strong>+${reward} Eight Coins</strong></div></article>`;
  }).join('');
  startCountdown();
}

function startCountdown() {
  const timer = $('#challengeTimer');
  if (!timer) return;
  setInterval(() => {
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setHours(24,0,0,0);
    const diff = tomorrow - now;
    const h = String(Math.floor(diff / 3600000)).padStart(2,'0');
    const m = String(Math.floor(diff % 3600000 / 60000)).padStart(2,'0');
    const s = String(Math.floor(diff % 60000 / 1000)).padStart(2,'0');
    timer.textContent = `${h}:${m}:${s}`;
  }, 1000);
}

async function initImpacto() {
  await loadTopbar();
  const bottles = await getBottles(500);
  const impact = computeImpact(bottles.length);
  setText('#impactBottles', bottles.length);
  setText('#impactCo2', `${impact.co2.toFixed(2)} kg`);
  setText('#impactTrees', impact.trees.toFixed(1));
  setText('#impactWater', `${impact.water} L`);
  setText('#impactKm', `${impact.km.toFixed(1)} km`);
  const rows = $('#impactChart');
  rows.innerHTML = [
    ['Botellas recuperadas', bottles.length, Math.max(5, bottles.length * 20)],
    ['CO2 evitado', impact.co2, Math.max(1, impact.co2 * 2)],
    ['Agua ahorrada', impact.water, Math.max(10, impact.water * 1.5)]
  ].map(([label, value, max]) => `<div class="chart-row"><span>${label}</span><div class="progress" style="--value:${Math.min(100, value/max*100)}%"><i></i></div><strong>${Number(value).toFixed(value % 1 ? 2 : 0)}</strong></div>`).join('');
}

async function initEightCoins() {
  await loadTopbar();
  const user = await getUserProfile();
  setText('#coinBalance', Number(user.coins || 0).toLocaleString());
  const history = await getCoinsHistory(80);
  const list = $('#coinHistory');
  list.innerHTML = history.map(item => `<div class="coin-row"><div><strong>${item.action}</strong><div class="meta">${formatDate(item.date)}</div></div><span class="pill">+${item.amount}</span></div>`).join('') || emptyState('Aun no hay movimientos de Eight Coins.');
}

async function initNfts() {
  await loadTopbar();
  const user = await getUserProfile();
  const bottles = await getBottles(500);
  const nfts = computeNfts(bottles.length, user.coins || 0, user.maxStreak || 1, 0);
  $('#nftList').innerHTML = nfts.map(n => `<article class="nft-card ${n.unlocked ? '' : 'locked'}"><div class="nft-art"><img src="${n.image}" alt="${n.name}"></div><h3>${n.name}</h3><p>${n.rarity}</p><div class="meta"><span>${n.condition}</span><strong>${n.unlocked ? 'Desbloqueado' : 'Bloqueado'}</strong></div></article>`).join('');
}

function computeImpact(count) {
  return { co2: count * 0.35, trees: count / 5, water: count * 10, km: count / 4 };
}

function computeNfts(bottles, coins, streak, completedChallenges) {
  return [
    { name: 'Primer Brote', rarity: 'Comun', condition: 'Registrar 1 botella', unlocked: bottles >= 1, image: 'assets/MASCOTA%20PLANTA.png' },
    { name: 'Reutilizador', rarity: 'Raro', condition: 'Registrar 5 botellas', unlocked: bottles >= 5, image: 'assets/MASCOTA%20BOTELLA.png' },
    { name: 'Eco Guerrero', rarity: 'Epico', condition: 'Completar 3 retos', unlocked: completedChallenges >= 3, image: 'assets/MASCOTA%20PLANTA.png' },
    { name: 'Bloom Genesis', rarity: 'Legendario', condition: '15 dias de racha', unlocked: streak >= 15, image: 'assets/MASCOTA%20BOTELLA.png' },
    { name: 'Eight Elite', rarity: 'Legendario', condition: '1000 Eight Coins', unlocked: coins >= 1000, image: 'assets/MASCOTA%20PLANTA.png' }
  ];
}

function formatDate(date) { return new Date(date || Date.now()).toLocaleDateString('es-EC', { day:'2-digit', month:'short', year:'numeric' }); }
function emptyState(text) { return `<div class="glass-card"><p>${text}</p></div>`; }
