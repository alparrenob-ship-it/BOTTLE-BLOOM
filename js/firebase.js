const firebaseConfig = {
  apiKey: "REEMPLAZA_CON_TU_API_KEY",
  authDomain: "REEMPLAZA.firebaseapp.com",
  projectId: "REEMPLAZA",
  storageBucket: "REEMPLAZA.appspot.com",
  messagingSenderId: "REEMPLAZA",
  appId: "REEMPLAZA"
};

const hasFirebaseConfig = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('REEMPLAZA');
let firebaseReady = false;
let auth = null;
let db = null;
let storage = null;
let firebaseFns = {};

if (hasFirebaseConfig) {
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const fireMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const storageMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');
    const app = appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db = fireMod.getFirestore(app);
    storage = storageMod.getStorage(app);
    firebaseFns = { ...authMod, ...fireMod, ...storageMod };
    firebaseReady = true;
  } catch (error) {
    console.warn('Firebase no pudo iniciar. La app usara modo local.', error);
  }
}

const local = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; }
};

function uid() {
  return localStorage.getItem('bb_uid') || 'demo-user';
}

function setUid(value) {
  localStorage.setItem('bb_uid', value || 'demo-user');
}

async function saveUserProfile(profile) {
  const id = profile.uid || uid();
  setUid(id);
  const payload = { ...profile, uid: id, updatedAt: new Date().toISOString() };
  if (firebaseReady && db) {
    await firebaseFns.setDoc(firebaseFns.doc(db, 'users', id), payload, { merge: true });
  }
  local.write('bb_user', payload);
  return payload;
}

async function getUserProfile() {
  const fallback = local.read('bb_user', {
    uid: uid(), name: 'Eco Guerrero', email: 'demo@bottlebloom.app', age: '', institution: 'Eight Academy',
    photo: 'assets/MASCOTA%20PLANTA.png', coins: 0, xp: 0, level: 'Nivel 1', currentStreak: 1, maxStreak: 1
  });
  if (firebaseReady && db) {
    const snap = await firebaseFns.getDoc(firebaseFns.doc(db, 'users', uid()));
    if (snap.exists()) return { ...fallback, ...snap.data() };
  }
  return fallback;
}

async function addBottle(bottle) {
  const userId = uid();
  const list = local.read('bb_bottles', []);
  const payload = { id: crypto.randomUUID(), userId, date: new Date().toISOString(), ...bottle };
  list.unshift(payload);
  local.write('bb_bottles', list);
  if (firebaseReady && db) await firebaseFns.addDoc(firebaseFns.collection(db, 'users', userId, 'bottles'), payload);
  return payload;
}

async function getBottles(limit = 40) {
  const list = local.read('bb_bottles', []);
  if (!firebaseReady || !db) return list.slice(0, limit);
  const q = firebaseFns.query(firebaseFns.collection(db, 'users', uid(), 'bottles'), firebaseFns.orderBy('date', 'desc'), firebaseFns.limit(limit));
  const snap = await firebaseFns.getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addCoins(action, coins) {
  const history = local.read('bb_coins_history', []);
  const row = { id: crypto.randomUUID(), userId: uid(), action, coins, date: new Date().toISOString() };
  history.unshift(row);
  local.write('bb_coins_history', history);
  const user = await getUserProfile();
  await saveUserProfile({ ...user, coins: Number(user.coins || 0) + coins, xp: Number(user.xp || 0) + coins * 2 });
  if (firebaseReady && db) await firebaseFns.addDoc(firebaseFns.collection(db, 'users', uid(), 'coins_history'), row);
  return row;
}

async function getCoinsHistory() {
  return local.read('bb_coins_history', []);
}

async function saveImpact(impact) {
  local.write('bb_impact', impact);
  if (firebaseReady && db) await firebaseFns.setDoc(firebaseFns.doc(db, 'users', uid(), 'impact', 'summary'), impact, { merge: true });
  return impact;
}

async function getImpact() {
  return local.read('bb_impact', { bottles: 0, co2: 0, water: 0, trees: 0, km: 0 });
}

async function uploadBottleImage(dataUrl) {
  if (!firebaseReady || !storage || !dataUrl) return dataUrl;
  const path = `users/${uid()}/bottles/${Date.now()}.png`;
  const ref = firebaseFns.ref(storage, path);
  await firebaseFns.uploadString(ref, dataUrl, 'data_url');
  return firebaseFns.getDownloadURL(ref);
}

export {
  firebaseReady,
  auth,
  db,
  storage,
  uid,
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
};
