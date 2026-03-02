# Kyoto Workshops App

A React Native (Expo) mobile app for discovering and booking traditional Kyoto craft workshops.

## Runtime Model (Production-Style)

- Firebase is the source of truth for workshop and review data.
- Workshops and reviews are read from Firestore only.
- Workshop photos are loaded from Firebase Storage URLs.
- Remote photos are cached to local device files (`expo-file-system`) for faster repeat views.
- AsyncStorage is used for app state/persistence (favourites + image cache metadata), not as content source.

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
- `components/` reusable UI components
- `services/` business logic and data access
- `data/workshops.json` seed source file (used by seeding script)
- `scripts/seedFirebase.js` uploads seed data and local images to Firebase

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure client Firebase in `config/firebase.js`

Replace placeholder values with your Firebase web config.

3. (Optional but recommended) Seed Firebase with full workshops/reviews/images

Create a Firebase service account JSON and save it as:

`firebase-service-account.json`

Then run:

```bash
npm run seed:firebase
```

4. Start the app

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

## Seeding Details

`npm run seed:firebase` does the following:

1. Reads workshops from `data/workshops.json`
2. Uploads local workshop images from `assets/images/` to Firebase Storage
3. Writes workshop docs into Firestore `workshops` collection
4. Writes review docs into Firestore `reviews` collection

After seeding, every device gets workshop data and images from Firebase.

## Notes for Submission

- App demonstrates async state handling, validation, persistence, API integration, navigation, and test coverage.
- Ensure Firestore and Storage security rules are configured appropriately before final demo.
