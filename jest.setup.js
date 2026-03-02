// Jest setup for testing
// Mocks Firebase and AsyncStorage so tests run fast without real database

// Mock Firebase completely
jest.mock('./config/firebase', () => ({
  database: {},
  storage: {}
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  arrayUnion: jest.fn(),
}));

// Mock Firebase Storage functions
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock Expo FileSystem for local image caching logic
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///mock-cache/',
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  makeDirectoryAsync: jest.fn(async () => true),
  downloadAsync: jest.fn(async (_url, fileUri) => ({ uri: fileUri })),
}));
