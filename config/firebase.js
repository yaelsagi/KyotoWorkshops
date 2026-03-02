// Firebase setup for Kyoto Workshops app
// Uses Firestore to store workshops, reviews, and bookings

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuration from Firebase console
// Note: These are public keys (safe to commit), API restrictions are set on Firebase side
const firebaseConfig = {
  apiKey: "AIzaSyDemoKey-ReplaceWithYourActualKey",
  authDomain: "kyoto-workshops.firebaseapp.com",
  projectId: "kyoto-workshops",
  storageBucket: "kyoto-workshops.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

// Initialize the Firebase app
const app = initializeApp(firebaseConfig);

// Get a reference to Firestore database
// Used throughout the app to read and write data
export const database = getFirestore(app);

// Get a reference to Firebase Storage for image uploads
export const storage = getStorage(app);
