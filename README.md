# Kyoto Workshops App

A React Native (Expo) mobile app for discovering and booking traditional Kyoto craft workshops.

## Runtime Model (Production-Style)

- Firebase is the source of truth for workshop and review data.
- Workshops and reviews are read from Firestore only.
- Workshop photos are loaded from Firebase Storage URLs.
- Remote photos are cached to local device files (`expo-file-system`) for faster repeat views.
- AsyncStorage is used for app state/persistence (favourites + image cache metadata), not as content source.

## Firebase Architecture

### Cloud Firestore (Database)
Stores **structured text-based data** in JSON-like documents:
- Workshop details (title, description, price, location, duration, etc.)
- Reviews (text, ratings, user IDs, timestamps)
- Bookings (dates, user IDs, workshop IDs, status)
- User profiles (name, email, preferences)

Think of Firestore as your **database** with queryable collections and documents.

### Firebase Storage (File Storage)
Stores **binary files** (images, videos, PDFs):
- Workshop photos (JPG/PNG files at `/workshop-images/{workshopId}/`)
- User profile pictures
- Any large binary content

Think of Storage as your **file system** or cloud drive for media files.

### How They Work Together
- Firestore documents contain **references** to Storage files (URLs/paths as strings)
- Example: A workshop document in Firestore has an `images` array with Storage URLs
- The app queries Firestore for data, then loads images from Storage URLs
- This separation keeps database queries fast and handles large files efficiently

## Features

- Multi-screen app with tab + stack navigation
- Workshop map with filtering, favourites, and quick details
- Workshop details with:
  - Cloud-backed photos
  - Reviews
  - Wikipedia cultural context
  - Booking flow with validation and translator options
- Async loading/error handling across services and screens
- Unit tests for data services and validation flows

## Tech Stack

- Expo + React Native
- Firebase Firestore + Firebase Storage
- AsyncStorage + Expo FileSystem
- Jest + jest-expo

## Project Structure

- `screens/` UI screens
  - `UploadImagesScreen.js` - (Optional) Upload workshop images to Firebase Storage
- `components/` reusable UI components
- `services/` business logic and data access helpers
  - `storageService.js` - (Optional) Firebase Storage upload/delete/list functions
- `firebase/firebase.js` - Firebase Web SDK initialization (`db`, `storage`)
- `data/workshops.json` - local sample seed/source data for development content

## Image Management

Workshop images are stored in Firebase Storage and referenced in Firestore workshop documents.

**Images uploaded via Firebase Console** to folder structure:
```
workshop-images/
├── workshop_calligraphy_for_all/
├── workshop_flower_arrangement/
├── workshop_kintsugi_basics/
├── workshop_tea_ceremony/
├── workshop_pottery_traditional_techniques/
└── workshop_woodworking_for_beginners/
```

**Optional:** `UploadImagesScreen.js` and `storageService.js` provide client-side upload functionality for future user-generated content or dynamic image management. Not required for basic workshop display.

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure client Firebase in `firebase/firebase.js`

Replace placeholder values with your Firebase web config.

3. Start the app

```bash
npm start
```

Then run on:
- iOS simulator: press `i`
- Android emulator: press `a`
- Expo Go (device): scan QR code

## Testing

Run all tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

## Firestore Usage Pattern

Use client-side Firebase Web SDK calls from services:

- Read workshops: `getDocs(collection(db, 'workshops'))`
- Realtime workshops (optional): `onSnapshot(collection(db, 'workshops'), ...)`
- Create booking/review: `addDoc(collection(db, 'bookings'), payload)`
- Update docs: `updateDoc(doc(db, 'bookings', bookingId), updates)`
- Save favourites (suggested): `setDoc(doc(db, 'users', userId, 'favourites', workshopId), favouriteData)`

Keep async loading and error handling in screens/services (`ActivityIndicator`, try/catch, empty-state UI).

## Suggested Data Model

- `workshops`: `{ title, category, ward, lat, lng, priceYen, isTop, imagePathOrUrl }`
- `users`: `{ displayName, role: 'visitor' | 'host' | 'translator' }`
- `bookings`: `{ userId, workshopId, date, status }`
- `users/{userId}/favourites/{workshopId}`: workshop reference + metadata

## Notes for Submission

- App demonstrates async state handling, validation, persistence, API integration, navigation, and test coverage.
- Ensure Firestore and Storage security rules are configured appropriately before final demo.
