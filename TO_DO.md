# To-Do: Firebase Authentication Implementation

## Firebase Authentication Setup

Implement user authentication to provide real user management and personalized data.

### Why This Matters
- ✅ **Real user management** - Multiple users with their own accounts (instead of everyone being "Sarah Mitchell")
- ✅ **Personalized data** - Each user has their own bookings, favourites, and profile
- ✅ **Security** - Firestore security rules ensure users only access their own data
- ✅ **Already structured** - UserContext is designed for authentication integration
- ✅ **Booking system requirement** - Users booking workshops need proper identification

### Implementation Steps

#### 1. Enable Firebase Authentication
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Authentication** (left menu)
4. Click **Get Started**
5. Enable **Email/Password** provider
6. Enable **Google** provider (optional but recommended)

#### 2. Update `config/firebase.js`
Add Firebase Auth initialization:
```javascript
import { getAuth } from 'firebase/auth';

export const auth = getAuth(app);
```

#### 3. Update `context/UserContext.js`
Replace hardcoded "Sarah Mitchell" with real Firebase Auth:
- Use `onAuthStateChanged()` to listen for user login/logout
- Update `currentUser` from Firebase Auth user object
- Implement real `logout()` with Firebase `signOut()`

#### 4. Create `services/authService.js`
Add authentication functions:
- `signUpWithEmail(email, password)` - Register new user
- `loginWithEmail(email, password)` - Sign in existing user
- `signUpWithGoogle()` - Google sign-in
- `logout()` - Sign out user

#### 5. Create Authentication Screens
- `screens/LoginScreen.js` - Email/password login form
- `screens/SignUpScreen.js` - Registration form
- Update navigation to show Login/SignUp before app

#### 6. Update Security Rules
Modify Firestore rules to protect user data:
```javascript
match /bookings/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
```

#### 7. Update `UserContext` Consumer Screens
- `ProfileScreen.js` - Show real user email, add logout button
- `BookingsScreen.js` - Load only user's bookings (use `currentUser.id`)
- `FavouritesScreen.js` - Link favourites to user ID

#### 8. Testing
- Test sign up with new email
- Test login/logout
- Verify bookings are isolated per user
- Ensure favourites persist to user account

### Priority: HIGH (Before final submission)
This establishes proper user identification for the booking system.

---

# Production Setup Checklist

## Before Final Launch - Switch to Production Mode

Follow these steps right before final demo/submission (takes ~5-10 minutes):

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project: **kyoto-workshops**
3. Click **Firestore Database** (left menu)

### Step 2: Copy Current Test Mode Rules
1. Click **Rules** tab (top, next to "Data")
2. You'll see test mode rules (allow read, write)
3. Keep this window open or note it down

### Step 3: Replace with Production Rules
1. Delete all existing rules
2. Paste these security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read workshops
    match /workshops/{document=**} {
      allow read;
    }
    
    // Anyone can read reviews
    match /reviews/{document=**} {
      allow read;
    }
    
    // Users can only write their own bookings
    match /bookings/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Step 4: Publish Rules
1. Click **Publish** button
2. Wait for confirmation (should say "Rules deployed")
3. ✅ Done! Your Firestore is now in Production mode

### Step 5: Test the App
1. Run `npm start` in terminal
2. Test basic functionality:
   - ✅ See workshops list
   - ✅ View workshop details
   - ✅ Read reviews
   - ✅ Make a booking (should work if you have Firebase Auth setup)

### Step 6: Check Firebase Storage Rules (Optional)
1. Click **Storage** in Firebase Console
2. Click **Rules** tab
3. Default rules allow public read, authenticated write (usually fine for this app)

## If Something Breaks After Switching

**Problem**: Can't read workshops or reviews
- **Solution**: Check rules above - allow read should be there

**Problem**: Can't create/edit bookings  
- **Solution**: This requires Firebase Authentication (not yet implemented)
- **Temporary Fix**: Add this line if needed:
  ```
  match /bookings/{document=**} {
    allow read, write;
  }
  ```
  Then remove it once Auth is set up

**Problem**: App crashes or shows errors
- **Solution**: 
  - Check browser console for permission errors
  - Go back to Test mode temporarily
  - Switch back to Production with correct rules

## Note
After switching to Production mode, Test mode rules are no longer active. All data access is controlled by your production rules. Make sure rules are correct before moving forward.

---

# Optional Cleanup (After App is Working)

## Remove One-Time Setup Files

Once you've verified the app loads workshops and images from Firebase, you can clean up these setup-only files:

### Files Safe to Delete
- ✅ `/scripts/seedFirestoreClient.js` - One-time database population script
- ✅ `/scripts/getStorageUrls.js` - One-time URL fetching helper
- ✅ `/data/workshops.json` - Local source data (now in Firebase)
- ✅ `/services/storageService.js` - Upload functions (only used if you implement user uploads)
- ✅ `/screens/UploadImagesScreen.js` - Upload UI (optional feature)

### Why Safe to Delete
- Data is now in Firestore (not local)
- These files are **not imported by the app code**
- They're only used once during initial setup
- App never references them at runtime

### What to Keep
- ✅ `/config/firebase.js` - Needed for app to connect to Firebase
- ✅ `/services/workshopService.js` - Used by app to fetch workshops
- ✅ `/services/reviewService.js` - Used by app to fetch reviews

### Cleanup Steps
1. Run `npm start` and verify workshops load with images
2. Navigate through app - test that everything works
3. Delete the files listed above from your project
4. Run `npm test` - should still pass (these files aren't tested)
5. Commit changes to Git

### Optional: Keep Data Source Backup
If you ever need to re-seed the database, you could:
- Keep `/data/workshops.json` as a data backup
- Re-run the seed script if structure changes
- But not necessary after initial setup

**Priority**: LOW (Cleanup only - app works fine with these files present)
