// ===== BOTTLE BLOOM — Firebase integration placeholder =====
// Copia este archivo como firebase.js cuando el proyecto tenga credenciales reales.
// No subas claves privadas ni credenciales sensibles al repositorio.

const firebaseConfig = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID',
};

// Estructura sugerida para Firestore:
// users/{userId}
//   name, grade, coins, createdAt
// scans/{scanId}
//   userId, bottleId, type, coins, confidence, volume, createdAt, demoMode
// blockchainLogs/{logId}
//   scanId, hash, network, status, createdAt
// rewards/{rewardId}
//   userId, scanId, coins, reason, createdAt

export { firebaseConfig };
