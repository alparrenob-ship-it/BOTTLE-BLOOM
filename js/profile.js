const profileStorageKey = 'bb_profile_module';
const userStorageKey = 'bb_user';
const bottlesStorageKey = 'bb_bottles';

const defaultProfile = {
  fullName: 'Eco Guerrero',
  ecoName: 'EcoGuardián',
  phrase: 'Estudiante comprometido con el planeta.',
  birthDate: '2010-05-12',
  gender: 'Masculino',
  memberType: 'estudiante',
  institution: 'Eight Academy',
  email: 'ecoguardian@eightacademy.edu',
  level: 'Nivel 3',
  rank: 'EcoGuardián',
  xp: 650,
  neededXp: 1000,
  coins: 125,
  nfts: 4,
  avatar: 'assets/MASCOTA%20PLANTA.png'
};

const $ = (selector) => document.querySelector(selector);
const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};
const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let userProfile = loadProfile();

window.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  renderProfile();
  bindProfileActions();
});

function loadProfile() {
  const saved = readJSON(profileStorageKey, {});
  const appUser = readJSON(userStorageKey, {});
  return {
    ...defaultProfile,
    ...appUser,
    ...saved,
    fullName: saved.fullName || appUser.name || defaultProfile.fullName,
    email: saved.email || appUser.email || defaultProfile.email,
    institution: saved.institution || appUser.institution || defaultProfile.institution,
    memberType: normalizeMemberType(saved.memberType || appUser.memberType || defaultProfile.memberType),
    avatar: saved.avatar || appUser.photo || defaultProfile.avatar,
    coins: Number(saved.coins ?? appUser.coins ?? defaultProfile.coins),
    xp: Number(saved.xp ?? appUser.xp ?? defaultProfile.xp),
    level: saved.level || appUser.level || defaultProfile.level
  };
}

function saveProfile() {
  writeJSON(profileStorageKey, userProfile);
  const appUser = readJSON(userStorageKey, {});
  writeJSON(userStorageKey, {
    ...appUser,
    name: userProfile.fullName,
    email: userProfile.email,
    institution: userProfile.institution,
    memberType: userProfile.memberType,
    photo: userProfile.avatar,
    coins: userProfile.coins,
    xp: userProfile.xp,
    level: userProfile.level
  });
}

function initSidebar() {
  $('#profileSidebar')?.querySelector('.profile-collapse')?.addEventListener('click', () => {
    $('#profileSidebar').classList.toggle('collapsed');
  });
  $('#logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('bb_uid');
    location.href = 'index.html';
  });
}

function bindProfileActions() {
  $('#editProfileBtn')?.addEventListener('click', openModal);
  $('#closeProfileModal')?.addEventListener('click', closeModal);
  $('#profileModal')?.addEventListener('click', (event) => {
    if (event.target.id === 'profileModal') closeModal();
  });
  $('#editProfileForm')?.addEventListener('submit', saveModalData);
  $('#changePhotoBtn')?.addEventListener('click', () => $('#avatarInput')?.click());
  $('#avatarInput')?.addEventListener('change', handleAvatarUpload);
}

function renderProfile() {
  const bottles = readJSON(bottlesStorageKey, []);
  const bottlesCount = bottles.length || Number(userProfile.bottles || 12);
  const nftCount = Number(userProfile.nfts || computeNftCount(bottlesCount, userProfile.coins));
  const xpPercent = Math.min(100, Math.round((Number(userProfile.xp || 0) / Number(userProfile.neededXp || 1000)) * 100));

  setText('#headerCoins', formatNumber(userProfile.coins));
  setText('#headerLevel', userProfile.level);
  setText('#headerRank', userProfile.rank);
  setText('#ecoName', userProfile.ecoName || 'EcoGuardián');
  setText('#profileInstitution', userProfile.institution);
  setText('#profileEmail', userProfile.email);
  setText('#levelName', userProfile.level);
  setText('#rankName', userProfile.rank);
  setText('#profileXp', formatNumber(userProfile.xp));
  setText('#neededXp', formatNumber(userProfile.neededXp));
  setText('#summaryBottles', formatNumber(bottlesCount));
  setText('#summaryCoins', formatNumber(userProfile.coins));
  setText('#summaryNfts', formatNumber(nftCount));
  setText('#personalName', userProfile.fullName);
  setText('#personalBirth', formatDate(userProfile.birthDate));
  setText('#personalGender', userProfile.gender);
  setText('#personalMember', userProfile.memberType || 'estudiante');

  const avatar = $('#profileAvatar');
  if (avatar) avatar.src = userProfile.avatar || defaultProfile.avatar;

  requestAnimationFrame(() => {
    const bar = $('#xpBar');
    if (bar) bar.style.width = `${xpPercent}%`;
  });
}

function openModal() {
  const form = $('#editProfileForm');
  form.fullName.value = userProfile.fullName || '';
  form.birthDate.value = userProfile.birthDate || '';
  form.gender.value = userProfile.gender || 'Masculino';
  form.memberType.value = normalizeMemberType(userProfile.memberType || 'estudiante');
  form.institution.value = userProfile.institution || '';
  form.email.value = userProfile.email || '';
  $('#profileModal')?.classList.add('open');
  $('#profileModal')?.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  $('#profileModal')?.classList.remove('open');
  $('#profileModal')?.setAttribute('aria-hidden', 'true');
}

function saveModalData(event) {
  event.preventDefault();
  const form = event.currentTarget;
  userProfile = {
    ...userProfile,
    fullName: form.fullName.value.trim(),
    birthDate: form.birthDate.value,
    gender: form.gender.value,
    memberType: form.memberType.value,
    institution: form.institution.value.trim(),
    email: form.email.value.trim()
  };
  saveProfile();
  renderProfile();
  closeModal();
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    userProfile.avatar = reader.result;
    saveProfile();
    renderProfile();
  };
  reader.readAsDataURL(file);
}

function computeNftCount(bottles, coins) {
  let total = 0;
  if (bottles >= 1) total += 1;
  if (bottles >= 5) total += 1;
  if (coins >= 250) total += 1;
  if (coins >= 1000) total += 1;
  return total || 4;
}

function normalizeMemberType(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('docente')) return 'docente';
  if (normalized.includes('admin')) return 'administrativo';
  if (normalized.includes('padre') || normalized.includes('familia') || normalized.includes('representante')) return 'padre de familia';
  return 'estudiante';
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = value;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-EC');
}

function formatDate(value) {
  if (!value) return '12/05/2010';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}
