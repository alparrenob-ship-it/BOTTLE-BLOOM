// ===== BOTTLE BLOOM — Global App =====

const DEFAULT_STATS = { bottles: 247, co2: 74, coins: 9850 };
const DEMO_STORAGE_KEYS = ['bb_stats', 'bb_history', 'bb_chain', 'bb_userCoins'];

function readStats() {
  try {
    const stats = JSON.parse(localStorage.getItem('bb_stats') || '{}');
    return {
      bottles: Number.isFinite(stats.bottles) ? stats.bottles : DEFAULT_STATS.bottles,
      co2: Number.isFinite(stats.co2) ? stats.co2 : DEFAULT_STATS.co2,
      coins: Number.isFinite(stats.coins) ? stats.coins : DEFAULT_STATS.coins,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function resetDemoData({ reload = true } = {}) {
  DEMO_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  localStorage.setItem('bb_stats', JSON.stringify(DEFAULT_STATS));
  localStorage.setItem('bb_userCoins', '450');

  const message = 'Datos demo reiniciados. La presentación vuelve a sus valores iniciales.';
  const liveRegion = document.getElementById('demoResetStatus');
  if (liveRegion) liveRegion.textContent = message;
  else alert(message);

  if (reload) window.location.reload();
}

window.resetDemoData = resetDemoData;

// Hide loading screen
window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hide');
  }, 600);
});

// Mobile nav toggle
function toggleMenu() {
  const links = document.getElementById('navLinks');
  links.classList.toggle('open');
}

// Close nav on link click (mobile)
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('navLinks')?.classList.remove('open');
  });
});

// Intersection observer for fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) { el.target.classList.add('visible'); observer.unobserve(el.target); }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Animated counter utility
function animateCounter(el, target, duration = 1800) {
  const start = Date.now();
  const update = () => {
    const progress = Math.min((Date.now() - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// Hero stats counters (index page only)
if (document.getElementById('counterBottles')) {
  const stats = readStats();
  animateCounter(document.getElementById('counterBottles'), stats.bottles);
  animateCounter(document.getElementById('counterCO2'), stats.co2);
  animateCounter(document.getElementById('counterCoins'), stats.coins);
}

// Persist a new scan result into global stats
function recordScan(type) {
  const stats = readStats();
  stats.bottles += 1;
  stats.co2 = +(stats.co2 + 0.3).toFixed(1);
  const coinsMap = { green: 50, yellow: 25, red: 10 };
  stats.coins += coinsMap[type] || 25;
  localStorage.setItem('bb_stats', JSON.stringify(stats));
}
