# Firestore Security Rules

## Overview
These security rules protect user data and ensure only authorized users can modify resources they own.

## How to Apply Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Firestore Database** in the left menu
4. Click the **Rules** tab
5. Replace the existing rules with the rules below
6. Click **Publish**

## Production Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function: Check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function: Check if user owns the resource
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users collection
    // - Anyone authenticated can read user profiles (for displaying names, etc.)
    // - Users can only write to their own profile
    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isOwner(userId);
      allow update, delete: if isOwner(userId);
    }
    
    // Workshops collection
    // - Anyone authenticated can read workshops (browse/search)
    // - Any authenticated user can create a workshop
    // - Only the workshop owner can update or delete their workshop
    match /workshops/{workshopId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.ownerId == request.auth.uid;
    }
    
    // Bookings collection
    // - Users can only read their own bookings
    // - Users can only create bookings for themselves
    // - Users can only update/cancel their own bookings
    match /bookings/{bookingId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
    
    // Reviews collection
    // - Anyone can read reviews (public reviews on workshops)
    // - Only authenticated users can write reviews
    // - Users can only update/delete their own reviews
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isSignedIn();
      allow update, delete: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
  }
}
```

## Rule Explanation

### Users
- **Read**: Any authenticated user can view profiles (needed for displaying workshop host names)
- **Write**: Users can only modify their own profile

### Workshops
- **Read**: Any authenticated user can browse workshops
- **Create**: Any authenticated user can create a workshop (becomes a host)
- **Update/Delete**: Only the owner (ownerId matches auth.uid) can modify their workshop

### Bookings
- **Read/Write**: Users can only access their own bookings (userId matches auth.uid)
- This ensures booking privacy between users

### Reviews
- **Read**: Public (anyone can read reviews)
- **Write**: Only authenticated users can write reviews
- **Update/Delete**: Users can only modify their own reviews

## Testing Security Rules

### Test 1: Workshop Ownership
1. Sign in as User A
2. Create a workshop (should succeed, ownerId = User A)
3. Sign out and sign in as User B
4. Try to edit User A's workshop (should fail with permission error)
5. Try to delete User A's workshop (should fail with permission error)

### Test 2: Booking Privacy
1. Sign in as User A and create a booking
2. Sign out and sign in as User B
3. Try to read User A's bookings (should fail)
4. User B can only see their own bookings

### Test 3: User Profile
1. Sign in as User A
2. Try to edit User A's profile (should succeed)
3. Try to edit User B's profile (should fail)

## Handling Permission Errors in App

When a user tries an unauthorized action, Firestore will throw a permission error. The app should:

1. Catch the error in try/catch blocks (already implemented)
2. Show user-friendly error message via Alert
3. Example: "You don't have permission to edit this workshop"

## Migration from Test Mode

If your Firestore is currently in **Test Mode** (allows all reads/writes), follow these steps:

1. **Backup data** (optional but recommended)
2. Apply the production rules above
3. Test the app thoroughly
4. If something breaks, check the Firebase Console logs for denied requests

## Note on Storage Rules

Firebase Storage (for images) should have these rules to protect user photos while allowing public workshop images:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Workshop images - public read, authenticated write
    match /workshop-images/{allPaths=**} {
      allow read: if true;  // Anyone can view workshop images
      allow write: if request.auth != null;  // Only authenticated users can upload
    }
    
    // User profile photos - public read, owner-only write
    match /user-photos/{userId}/{allPaths=**} {
      allow read: if true;  // Anyone can view profile photos
      allow write: if request.auth != null && request.auth.uid == userId;  // Only owner can modify
    }
  }
}
```

**Storage Rules Explanation:**
- **Workshop Images**: Anyone can view (needed for browsing), authenticated users can upload
- **User Photos**: Anyone can view profile photos, but only the photo owner can upload or delete their own photos

**How to Apply Storage Rules:**
1. Go to Firebase Console > Storage
2. Click the **Rules** tab
3. Replace existing rules with the rules above
4. Click **Publish**
