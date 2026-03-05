# Image Upload Guide

**Note:** Workshop images for this project were uploaded manually via Firebase Console. The upload screen and storage service are **optional** tools for future image management or user-generated content.

## Current Setup (Manual Upload)

Images uploaded to Firebase Storage via Console with folder structure:

### Option 1: Use the Upload Screen (Easiest)

The `UploadImagesScreen.js` provides a complete UI for uploading images.

1. Add the screen to your navigation (in `RootNavigator.js` or `TabsNavigator.js`):

```javascript
import UploadImagesScreen from '../screens/UploadImagesScreen';

// In your navigation stack:
<Stack.Screen name="UploadImages" component={UploadImagesScreen} />
```

2. Navigate to it from any screen:

```javascript
navigation.navigate('UploadImages');
```

3. In the app:
   - Select a workshop from the list
   - Tap "Pick & Upload Images"
   - Select one or more images from your device
   - Images upload and save to both Storage and Firestore

### Option 2: Use Storage Service Functions Directly

Import and call functions from `services/storageService.js`:

```javascript
import {
  uploadWorkshopImage,
  uploadMultipleImagesToWorkshop,
  listWorkshopImages,
  deleteWorkshopImage,
} from '../services/storageService';

// Upload single image
const url = await uploadWorkshopImage('workshop_tea_ceremony', imageFile);

// Upload multiple images
const urls = await uploadMultipleImagesToWorkshop('workshop_tea_ceremony', [
  imageFile1,
  imageFile2,
]);

// List uploaded images
const images = await listWorkshopImages('workshop_tea_ceremony');

// Delete image
await deleteWorkshopImage('workshop_tea_ceremony', 'image_1_abc.jpg');
```

## Workshop IDs (Folder Names in Storage)

Images are automatically organized by workshop ID in Firebase Storage:

```
workshop-images/
├── workshop_kintsugi_basics/
├── workshop_nihonga_intro/
├── workshop_tea_ceremony/
├── workshop_calligraphy_for_all/
├── workshop_flower_arrangement/
├── workshop_pottery_traditional_techniques/
└── workshop_woodworking_for_beginners/
```

**These match your `data/workshops.json` IDs exactly**.

## How Data Flows

### 1. Upload Process
```
Device → Pick Image File → Firebase Storage
                        ↓
                   Firebase Returns Download URL
                        ↓
                   Firestore Workshop Document
                   (images array + URL)
```

### 2. Image Storage Path Format
```
workshop-images/{workshopId}/image_{timestamp}_{random}.{ext}

Example:
workshop-images/workshop_tea_ceremony/image_1709734800000_abc123.jpg
```

### 3. Firestore Document Update
When images upload, the workshop document's `images` array gets updated:

```javascript
{
  id: "workshop_tea_ceremony",
  title: "Tea Ceremony Experience",
  images: [
    "https://firebasestorage.googleapis.com/...image_1.jpg?alt=media&token=xxx",
    "https://firebasestorage.googleapis.com/...image_2.jpg?alt=media&token=yyy",
    "https://firebasestorage.googleapis.com/...image_3.jpg?alt=media&token=zzz"
  ],
  // ... other fields
}
```

## Storage Service API

### `uploadWorkshopImage(workshopId, imageFile)`
Upload a single image to Storage and save URL to Firestore.

**Parameters:**
- `workshopId` (string): e.g., `"workshop_tea_ceremony"`
- `imageFile` (object): File object with `uri`, `name`, `type` from document picker

**Returns:** Download URL string

**Example:**
```javascript
try {
  const url = await uploadWorkshopImage('workshop_tea_ceremony', {
    uri: 'file:///var/mobile/Containers/...',
    name: 'IMG_1234.jpg',
    type: 'image/jpeg',
  });
  console.log('Image uploaded:', url);
} catch (error) {
  console.error('Upload failed:', error);
}
```

### `uploadMultipleImagesToWorkshop(workshopId, imageFiles)`
Upload multiple images at once.

**Parameters:**
- `workshopId` (string): e.g., `"workshop_tea_ceremony"`
- `imageFiles` (array): Array of file objects from document picker

**Returns:** Array of download URLs

**Example:**
```javascript
const urls = await uploadMultipleImagesToWorkshop('workshop_tea_ceremony', [
  imageFile1,
  imageFile2,
  imageFile3,
]);
```

### `updateWorkshopImages(workshopId, imageUrls)`
Manually save image URLs to Firestore workshop document.

Only needed if uploading images separately from Firestore.

**Parameters:**
- `workshopId` (string)
- `imageUrls` (array): Array of download URLs

**Example:**
```javascript
await updateWorkshopImages('workshop_tea_ceremony', [
  'https://firebasestorage.googleapis.com/...url1',
  'https://firebasestorage.googleapis.com/...url2',
]);
```

### `listWorkshopImages(workshopId)`
Get list of all image filenames uploaded for a workshop.

**Parameters:**
- `workshopId` (string)

**Returns:** Array of filenames

**Example:**
```javascript
const images = await listWorkshopImages('workshop_tea_ceremony');
console.log(images);
// Output: ['image_1_abc.jpg', 'image_2_def.jpg', 'image_3_ghi.jpg']
```

### `deleteWorkshopImage(workshopId, imageName)`
Delete an image from Storage (doesn't remove URL from Firestore).

**Parameters:**
- `workshopId` (string)
- `imageName` (string): Filename from `listWorkshopImages()`

**Example:**
```javascript
await deleteWorkshopImage('workshop_tea_ceremony', 'image_1_abc.jpg');
```

### `getWorkshopImageUrl(workshopId, imageName)`
Get download URL for a specific image file.

**Parameters:**
- `workshopId` (string)
- `imageName` (string)

**Returns:** Download URL string

**Example:**
```javascript
const url = await getWorkshopImageUrl('workshop_tea_ceremony', 'image_1_abc.jpg');
```

## Testing

Run tests to verify storage service:

```bash
npm test storageService
```

Or run all tests:

```bash
npm test
```

## Firebase Storage Security

Default allow-all rules for development. **Before production**, update Storage rules in Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /workshop-images/{allPaths=**} {
      // Allow public read
      allow read;
      // Only authenticated users can upload
      allow write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### Images not uploading
- Check Firebase Storage is enabled in Console
- Verify Storage security rules allow write access
- Check device has internet connection
- Look at console logs for error details

### URLs not saving to Firestore
- Verify Firestore `workshops` collection exists
- Check workshop ID matches exactly (case-sensitive)
- Check Firestore security rules allow document updates

### Permission errors
- Check Firebase Console > Storage > Rules
- Ensure user is authenticated if using restrictive rules

## Next Steps

1. ✅ Upload images using UploadImagesScreen
2. ✅ Verify images appear in Firebase Console > Storage
3. ✅ Check Firestore workshop documents have image URLs in `images` array
4. ✅ Screens will automatically load images from Firestore URLs
5. ✅ Images will be cached locally on device by workshopService

## Integration with Workshop Display

Once images are uploaded:

1. `workshopService.js` automatically loads images from Firestore
2. Images are cached locally (expo-file-system) for faster repeat views
3. Screens display images from cache or Storage URL
4. ImageCarousel and AllPicturesScreen show all images

**No additional code needed** - images appear automatically once URLs are in Firestore!
