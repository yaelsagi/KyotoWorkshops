# To-Do: Firebase Authentication Implementation

## 🔜 Current Follow-ups

- add heptics (added already to create workshop screen) and fallback
- go over all scripts to check for magic numbers
- audit extra auth guards before protected screens
- review and update data/workshops.json so the demo/offline dataset matches current app fields and structure
- 1️⃣ Software Architecture Diagram
  User
   ↓
  React Native App
   ↓
  Screens
   ↓
  Services
   ↓
  Firebase
- 2️⃣ Component Diagram
  App
   ├ Screens
   ├ Components
   ├ Services
   └ Firebase
- before final submission: remove `key_do not submit/` and any local Firebase service-account key files from project folder
- before final submission: delete `Lorem ipsum.md`
- replace "About this workshop" text in Firebase with Lorem Ipsum before final content pass

## ✅ Phase 1: Auth Foundation (COMPLETED)

### Completed Tasks
- ✅ **Firebase Auth SDK** - Added `getAuth` import and `auth` export to [firebase/firebase.js](firebase/firebase.js)
- ✅ **Auth Service** - Created [services/authService.js](services/authService.js) with:
  - `signUpWithEmail(email, password, displayName)` - Creates Firebase user + Firestore profile
  - `signInWithEmail(email, password)` - Signs in existing user
  - `signOutUser()` - Signs out current user
  - `getCurrentAuthUser()` - Returns current auth user
- ✅ **Auth Context** - Created [context/AuthContext.js](context/AuthContext.js) with:
  - `AuthProvider` component with `onAuthStateChanged` listener
  - `user`, `loading`, `authenticated` state
  - `useAuth()` hook for consuming auth state
- ✅ **Login Screen** - Created [screens/LoginScreen.js](screens/LoginScreen.js) with email/password form
- ✅ **Sign Up Screen** - Created [screens/SignUpScreen.js](screens/SignUpScreen.js) with validation
- ✅ **Split Navigation** - Updated [navigation/RootNavigator.js](navigation/RootNavigator.js):
  - AuthStack (Login/SignUp) shown when not authenticated
  - AppStack (Tabs/Details) shown when authenticated
  - Loading screen during auth state check
- ✅ **App Wrapper** - Updated [App.js](App.js) to wrap with `AuthProvider`
- ✅ **Profile Screen** - Updated [screens/ProfileScreen.js](screens/ProfileScreen.js):
  - Uses `useAuth()` to display real user data (displayName, email)
  - Sign Out button calls `signOutUser()` from authService

### What's Working Now
- Users must sign up or log in to access the app
- New accounts automatically create Firestore user profile with default roles (learner: true, host: false, translator: false)
- Sign out returns to login screen
- Auth state persists across app restarts
- Profile screen shows authenticated user's display name and email

---

## ✅ Phase 2: User Profiles + Roles (COMPLETED)

### Completed Tasks
- ✅ **User Service** - Created [services/userService.js](services/userService.js) with:
  - `getUserProfile(uid)` - Fetch user from Firestore
  - `updateUserProfile(uid, data)` - Update user fields
  - `updateUserRoles(uid, roles)` - Update roles object
  - `updateUserLanguages(uid, languages)` - Update languages array
- ✅ **UserContext Integration** - Updated [context/UserContext.js](context/UserContext.js):
  - Loads user profile from Firestore after authentication
  - Combines Firebase Auth user with Firestore profile
  - Provides `currentUser` with uid, email, displayName, roles, languages
- ✅ **UserCapabilitiesContext Firestore Sync** - Updated [context/UserCapabilitiesContext.js](context/UserCapabilitiesContext.js):
  - Loads approved roles from Firestore user.roles object
  - Syncs role toggles to Firestore via `updateUserRoles()`
  - Maintains AsyncStorage cache for offline mode

### What's Working Now
- User profiles stored in Firestore `users/{uid}` collection
- Role toggles (learner/host/translator) persist to Firestore
- Roles object: `{ learner: true, host: false, translator: false }`
- Role state synced between Firestore and UI

---

## ✅ Phase 3: Workshop Ownership (COMPLETED)

### Completed Tasks
- ✅ **Workshop Service Updates** - Updated [services/workshopService.js](services/workshopService.js):
  - `createWorkshop(workshopData, ownerId)` - Now requires ownerId parameter
  - `deleteWorkshop(workshopId)` - Delete workshop by ID
  - `fetchWorkshopsByOwner(ownerId)` - Query workshops where ownerId matches
- ✅ **My Workshops Screen** - Created [screens/MyWorkshopsScreen.js](screens/MyWorkshopsScreen.js):
  - Shows workshops owned by current user
  - Delete workshop with confirmation
  - "Your Workshop" badge on each card
  - Empty state when no workshops
- ✅ **Conditional Tab Navigation** - Updated [navigation/TabsNavigator.js](navigation/TabsNavigator.js):
  - "My Workshops" tab only visible when user has host role approved
  - Tab appears/disappears dynamically when role toggles

### What's Working Now
- Workshops have `ownerId` field linking to creator's UID
- Hosts can view their workshops in "My Workshops" tab
- Hosts can delete their workshops
- Tab bar adapts based on user roles

---

## ✅ Phase 4: Security Rules (COMPLETED)

### Completed Tasks
- ✅ **Security Rules Documentation** - Created [SECURITY_RULES.md](SECURITY_RULES.md) with:
  - Complete Firestore security rules for production
  - Rules protect users, workshops, bookings, and reviews collections
  - User ownership validation (users can only modify their own resources)
  - Workshop ownership validation (only ownerId can edit/delete workshop)
  - Booking privacy (users can only see their own bookings)
  - Firebase Storage rules for public image read, authenticated write

### Security Rules Summary
- **Users**: Read by anyone authenticated, write only own profile
- **Workshops**: Read by anyone authenticated, create by anyone, update/delete by owner only
- **Bookings**: Read/write only own bookings (userId matches auth.uid)
- **Reviews**: Read by anyone, write by authenticated users, update/delete own reviews only

### How to Apply
See [SECURITY_RULES.md](SECURITY_RULES.md) for detailed instructions on applying rules via Firebase Console.

---

## ✅ Phase 5: Progressive Authentication & Guest Mode (COMPLETED)

### Completed Tasks
- ✅ **Remove Auth Gate** - Updated [navigation/RootNavigator.js](navigation/RootNavigator.js):
  - App always loads to Tabs (Explore screen first)
  - Login/SignUp are modal routes with redirect params
- ✅ **Guest Mode UI** - Updated [screens/ProfileScreen.js](screens/ProfileScreen.js):
  - Dual-mode rendering (guest vs authenticated)
  - Guest shows Sign In/Create Account buttons
- ✅ **Auth Guards** - Added auth checks to:
  - [screens/BookingsScreen.js](screens/BookingsScreen.js) - "Sign in required" message
  - [screens/MyWorkshopsScreen.js](screens/MyWorkshopsScreen.js) - Sign-in prompt
- ✅ **Progressive Auth** - Updated [screens/WorkshopDetailsScreen.js](screens/WorkshopDetailsScreen.js):
  - Redirect to Login with return path on book attempt
- ✅ **Redirect Flow** - Updated [screens/LoginScreen.js](screens/LoginScreen.js) & [screens/SignUpScreen.js](screens/SignUpScreen.js):
  - Accept redirectTo and redirectParams from navigation
  - Return to original action after successful auth
- ✅ **Local Favourites** - Migrated favourites storage:
  - Changed AsyncStorage key from "kyoto_favourites" to "favourites"
  - Added legacy fallback for backward compatibility
- ✅ **Conditional Tab** - Updated [navigation/TabsNavigator.js](navigation/TabsNavigator.js):
  - Host tab only visible when authUser exists AND host role approved
- ✅ **Guest Role Safety** - Updated [context/UserCapabilitiesContext.js](context/UserCapabilitiesContext.js):
  - Guests always get learner-only capability set (prevent cached privileged roles)

### What's Working Now
- App loads to Explore screen without requiring login
- Guests can browse, search, filter, and save favourites without account
- Authentication only required for booking, creating workshops, accessing My Workshops
- Favourites stored locally in AsyncStorage (works offline)
- Login/SignUp redirect back to original action after auth success

---

## ✅ Phase 6: User Profile Enhancements (COMPLETED)

### Completed Tasks
- ✅ **Required Display Name** - Updated [screens/SignUpScreen.js](screens/SignUpScreen.js):
  - Display name now required (not optional)
  - Validation ensures display name is provided
  - Updated placeholder from "Display Name (optional)" to "Display Name *"
- ✅ **Auth Service Updates** - Updated [services/authService.js](services/authService.js):
  - Added display name validation (required field check)
  - Updated Firebase Auth profile with display name immediately
  - Removed "Workshop Explorer" fallback in Firestore profile creation
  - Added photoURL field to user profile schema (initially null)
- ✅ **UserContext Fixes** - Updated [context/UserContext.js](context/UserContext.js):
  - Removed "Workshop Explorer" fallbacks throughout
  - Now uses actual display name from Firestore or Firebase Auth
  - Added photoURL to user context object
- ✅ **Profile Photo Upload** - Updated [services/storageService.js](services/storageService.js):
  - Added `uploadUserProfilePhoto(userId, imageFile)` - Uploads to `user-photos/{userId}/profile.jpg`
  - Added `deleteUserProfilePhoto(userId)` - Removes profile photo from Storage
  - Proper error handling for missing photos
- ✅ **User Photo URL Service** - Updated [services/userService.js](services/userService.js):
  - Added `updateUserPhotoURL(uid, photoURL)` - Updates photoURL in Firestore
- ✅ **Profile Photo UI** - Updated [screens/ProfileScreen.js](screens/ProfileScreen.js):
  - Added expo-image-picker integration
  - Action sheet with options: Take Photo, Choose from Library, Remove Photo, Cancel
  - Camera icon button overlay on avatar (bottom-right capsule)
  - Shows profile photo when available, falls back to emoji icon
  - Loading indicator during photo upload
  - iOS uses native ActionSheetIOS, Android uses Alert
- ✅ **Storage Rules Update** - Updated [SECURITY_RULES.md](SECURITY_RULES.md):
  - Added Firebase Storage rules for user-photos path
  - Public read for profile photos, owner-only write
  - Separate rules for workshop-images (public read, authenticated write)

### What's Working Now
- Display name is mandatory during signup
- Users see their chosen display name throughout the app (not "Workshop Explorer")
- Profile photos can be uploaded via camera or photo library
- Profile photos stored in Firebase Storage at `user-photos/{userId}/profile.jpg`
- Photo URLs saved in Firestore user profile (photoURL field)
- Users can remove their profile photo
- Action sheet provides native UX for photo selection
- Profile photo visible on ProfileScreen with camera button overlay

### Security Considerations
- **Storage Rules**: Users can only modify their own photos (`user-photos/{userId}/`)
- **Firestore Rules**: Users can only update their own photoURL field
- **Photo Privacy**: Photos are publicly readable (needed for profile display), but only owner can upload/delete

---

## 🚀 Innovation Feature: Translator Role (Optional)

### Current Status
- ✅ Translator role toggle exists in ProfileScreen
- ✅ Firestore user profiles support translator role
- ✅ UserCapabilitiesContext supports translator capability toggles

### Simple Implementation (Coursework-sized)
Add translator request fields to bookings without building full marketplace:

1. **Booking Creation** - Add checkbox: "Request translator assistance"
2. **Booking Schema** - Add fields:
   ```javascript
   {
     translatorRequested: boolean,
     translatorId: string | null,
     translatorNotes: string
   }
   ```
3. **Innovation Points**:
   - Demonstrates forward-thinking architecture
   - Shows multi-role system design
   - Extensible for future marketplace features

### What NOT to Build (Over-engineering)
- ❌ Full translator discovery/search
- ❌ Translator profiles with ratings
- ❌ Booking request matching algorithm
- ❌ Chat/messaging system
- ❌ Payment split for translators

**Keep It Simple**: Translator role exists, bookings can request translators, but assignment is "future work"

---

## 📋 Remaining Tasks (Before Submission)

### High Priority
1. **Apply Security Rules** - Follow [SECURITY_RULES.md](SECURITY_RULES.md) to publish to Firebase Console:
   - ✅ Firestore rules (users, workshops, bookings, reviews)
   - ⚠️ **Storage rules** (user-photos and workshop-images) - NEEDS TO BE APPLIED
2. **Test Auth Flow** - Sign up → create workshop → book → delete workshop
3. **Test Profile Photo Flow** - Upload photo → change photo → remove photo
4. **Handle Loading States** - Where currentUser is accessed (may be null during load)

### Medium Priority
1. **Translator Request Fields** - Add translatorRequested checkbox (innovation)
2. **Improve Price Filter UX** - Airbnb-style slider
3. **Error Handling** - Permission-denied errors with friendly messages

### Low Priority
1. **Workshop Edit Screen** - Allow hosts to edit details
2. **User GPS Location** - "Near Me" filter
3. **Get Directions Button** - Open native maps

---

## ✅ Final Testing Pass (End Phase)

### Testing Strategy
- Do not write tests during feature implementation
- After core features complete, add/update tests for changed modules
- Run full test suite before final submission

### Test Coverage Needed
- Auth service (signup, signin, signout)
- User service (getUserProfile, updateUserRoles)
- Workshop ownership (fetchWorkshopsByOwner, createWorkshop with ownerId, deleteWorkshop)
- Booking enrichment with workshop snapshot
- Location normalization (already tested)

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

---

## 🔄 Phase 2: User Profiles + Roles (NEXT)

### Implementation Steps
1. Create `services/userService.js` with Firestore user CRUD:
   - `getUserProfile(uid)` - Fetch user document from `users/{uid}`
   - `updateUserProfile(uid, data)` - Update user fields
   - `updateUserRoles(uid, roles)` - Update roles object in user doc
   - `updateUserLanguages(uid, languages)` - Update languages array

2. Update `context/UserContext.js` to load from Firestore:
   - After `onAuthStateChanged` fires with user, call `getUserProfile(uid)`
   - Store full Firestore user data (displayName, email, roles, languages, createdAt)
   - Update `currentUser` to include roles and languages

3. Wire ProfileScreen role toggles to Firestore:
  - Update `setCapabilityEnabled` in UserCapabilitiesContext to call `updateUserRoles()`
   - Remove AsyncStorage dependency for roles (migrate to Firestore)
   - Keep role state synced between Firestore and context

4. Update Firestore user profile on role changes:
   - When user toggles host/translator, update `users/{uid}/roles`
   - Maintain AsyncStorage as cache fallback for offline mode

### Priority: HIGH (Unblocks Phase 3 workshop ownership)

---

## Phase 3: Workshop Ownership

### Implementation Steps
1. Add `ownerId` field to workshop schema:
   - Update `workshopService.createWorkshop()` to set `ownerId: currentUser.uid`
   - Add ownerId to workshop validation in `validateWorkshopData()`

2. Create `screens/MyWorkshopsScreen.js` for hosts:
   - Query workshops with `where("ownerId", "==", uid)`
   - Display host's workshops in list format
   - Add "Create Workshop" button for new workshop creation

3. Update `WorkshopDetailsScreen.js`:
   - Show Edit/Delete buttons only if `workshop.ownerId === currentUser.uid`
   - Add delete confirmation Alert
   - Call `workshopService.deleteWorkshop(id)` on delete

4. Create `screens/EditWorkshopScreen.js`:
   - Pre-populate form with existing workshop data
   - Call `workshopService.updateWorkshop(id, data)` on save
   - Navigate back to details on success

5. Update `TabsNavigator.js`:
   - Conditionally show "My Workshops" tab when `activeMode === "host"`
   - Use workshop emoji 🏺 for tab icon

### Priority: HIGH (Core feature for rubric complexity)

---

## Phase 4: Security Rules

### Implementation Steps
1. Update Firestore Security Rules in Firebase Console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Anyone authenticated can read workshops
    // Only owner can edit/delete workshop
    match /workshops/{workshopId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.ownerId;
    }
    
    // Users can only access their own bookings
    match /bookings/{bookingId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Anyone can read reviews, only authenticated can write
    match /reviews/{reviewId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

2. Test security rules:
   - Try editing another user's workshop → should fail with permission error
   - Try editing own workshop → should succeed
   - Try accessing another user's bookings → should fail
   - Handle errors gracefully in UI with Alert messages

3. Add permission error handling in services:
   - Catch permission-denied errors in try/catch blocks
   - Return user-friendly error messages

### Priority: HIGH (Required for production security)

---

## Additional Features (Post-Auth)

### Get Directions Button
- Use `expo-location` to get user's current coordinates
- Add "Get Directions" button in WorkshopDetailsScreen
- Call `Linking.openURL()` with Google Maps/Apple Maps URL
- Format: `https://maps.google.com/?daddr={lat},{lng}`

### User GPS Location & "Near Me" Filter
- Request location permission on app start
- Store user location in context
- Add "Near Me" filter option in FiltersSheet
- Calculate distance using Haversine formula
- Filter workshops within 5km radius

### Improve Price Filter UX (Airbnb-style)
- Implement an Airbnb-style dual-thumb price slider experience
- Keep live min/max price feedback while dragging
- Ensure behavior remains consistent with map marker filtering logic

### Translator Marketplace (Optional)
- Only implement if time permits after learner+host features
- Screen for translators to see available bookings needing translation
- Booking assignment flow for translators to claim bookings
- Chat/messaging system for translator-learner communication

---

## Final Testing Pass (End Phase)

### Testing Strategy
- **Do not write new tests during feature implementation phase**
- After core features (Phase 1-4) are complete:
  1. Run full test suite: `npm test`
  2. Identify coverage gaps in auth, user service, workshop ownership
  3. Add/update tests for all changed modules
  4. Fix regressions and edge cases
  5. Ensure 80%+ code coverage

### Manual Testing Checklist
- [ ] Sign up new account
- [ ] Sign in/out flow
- [ ] Role toggle (learner → host → translator)
- [ ] Create workshop as host
- [ ] Edit own workshop
- [ ] Delete own workshop
- [ ] Try editing other user's workshop (should fail)
- [ ] Book workshop as learner
- [ ] View bookings with images
- [ ] Favourites persist across sessions
- [ ] Filters work correctly (price, category, ward, language)
- [ ] Search returns relevant results
- [ ] Map markers update based on filters
- [ ] Workshop details show correct data
- [ ] Reviews display properly
- [ ] All images load with caching

### Priority: CRITICAL (Before final submission/demo)

---

## Legacy Content Below

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
