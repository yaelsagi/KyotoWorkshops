# Quick Database Setup Guide

## ⚠️ One-Time Setup Only

These helper scripts are for **initial database setup ONLY**. They are:
- ✅ NOT part of the app runtime
- ✅ Development utilities only
- ✅ Can be deleted after setup is complete
- ✅ Safe to commit to GitHub (no sensitive keys exposed)

After you run these once, your app will load data directly from Firebase at runtime.

---

## Step 1: Get Your Firebase Storage URLs

You've already uploaded images to Firebase Storage. Now get their URLs using the helper script:

### Option A: Via Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com) → Your Project → **Storage**
2. Navigate to each workshop folder
3. Click on each image file
4. Click the **copy icon** next to "File location" to copy the download URL
5. The URL looks like: `https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshop-images%2Fkintsugi_basics%2Fimage_1.jpg?alt=media&token=...`

### Option B: List URLs with Script (Faster)

If you want to quickly get all URLs, I can create a script to list them all at once. Let me know!

---

## Step 2: Update the URL Mapping

1. Open `scripts/seedFirestoreClient.js`
2. Find the `IMAGE_URL_MAPPING` object (around line 30)
3. Replace the placeholder URLs with your actual Storage URLs
4. Example:
   ```javascript
   workshop_kintsugi_basics: [
     'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshop-images%2Fkintsugi_basics%2Fimage_1.jpg?alt=media&token=abc123',
     'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshop-images%2Fkintsugi_basics%2Fimage_2.jpg?alt=media&token=def456',
     // ... etc
   ],
   ```

**Mapping:**
- `workshop_kintsugi_basics` → your "kintsugi basics" folder URLs (4 images)
- `workshop_tea_ceremony` → your "Tea ceremony experience" folder URLs (4 images)
- `workshop_calligraphy_for_all` → your "Calligraphy for all" folder URLs (3 images)
- `workshop_flower_arrangement` → your "Flower arrangement" folder URLs (4 images)
- `workshop_traditional_pottery_techniques` → your "Traditional pottery techniques" folder URLs (1 image)
- `workshop_woodworking_for_beginners` → your "Woodworking for beginners" folder URLs (3 images)

---

## Step 3: Run the Seeding Script

```bash
cd "c:\Users\ASUS\Desktop\london_uni\mobile development\MD-final project-kyoto crafts app\KyotoWorkshops"
npm run seed
```

**What happens:**
- ✅ Creates `workshops` collection with 7 documents
- ✅ Creates `reviews` collection with 12 documents
- ✅ Links reviews to workshops via `workshopId`
- ✅ Adds your Storage URLs to each workshop's `images` array

**Output:**
```
🚀 Starting Firestore database seeding...

📚 Seeding workshops collection...
✅ Added workshop: Kintsugi Basics (4 images)
✅ Added workshop: Nihonga Intro (3 images)
✅ Added workshop: Tea Ceremony Experience (4 images)
✅ Added workshop: Calligraphy for All (3 images)
✅ Added workshop: Flower Arrangement (4 images)
✅ Added workshop: Traditional Pottery Techniques (1 image)
✅ Added workshop: Woodworking for Beginners (3 images)

✨ Workshops seeding complete: 7 added, 0 failed

💬 Seeding reviews collection...
✅ Added review: review_kintsugi_1 for Kintsugi Basics
✅ Added review: review_kintsugi_2 for Kintsugi Basics
... (12 total reviews)

✨ Reviews seeding complete: 12 added, 0 failed

🎉 DATABASE SEEDING COMPLETE! 🎉
```

---

## Step 4: Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com) → **Firestore Database**
2. You should see:
   - `workshops` collection with 7 documents
   - `reviews` collection with 12 documents
3. Click on a workshop → Check `images` array has your URLs

---

## Step 5: Test Your App

```bash
npm start
```

Then:
- Press `a` for Android or `i` for iOS
- Navigate to Workshops screen
- Workshops should load from Firebase with images! 🎉

---

## Troubleshooting

### "Module not found" error
Run: `npm install`

### "Permission denied" error
Check Firestore Rules in Firebase Console (should be in Test Mode for development)

### Images not showing
- Verify URLs are correct in `IMAGE_URL_MAPPING`
- Check Firebase Storage rules allow public read
- URLs must include `?alt=media` parameter

### Need to re-run seeding
The script uses `setDoc()` which overwrites existing documents, so you can run it multiple times safely.

---

## Alternative: Skip URL Mapping (Quick Test)

If you want to test without images first:

1. Leave `IMAGE_URL_MAPPING` as-is (empty arrays)
2. Run `npm run seed`
3. Workshops will be added without images
4. Add image URLs manually later in Firebase Console

---

**Ready?** Update the URLs in `scripts/seedFirestoreClient.js` and run `npm run seed`! 🚀
