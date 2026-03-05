import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyB3wsqgKeAvjUCpoS73U6aTV1arKj98uuo',
  authDomain: 'kyoto-workshops.firebaseapp.com',
  projectId: 'kyoto-workshops',
  storageBucket: 'kyoto-workshops.firebasestorage.app',
  messagingSenderId: '927023563395',
  appId: '1:927023563395:web:52d5f0563541c6296e11b6',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// Backward-compatible alias for existing imports while migrating files.
export const database = db;

export default app;
