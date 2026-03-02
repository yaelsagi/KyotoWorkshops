const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = path.resolve(__dirname, '..');
const workshopsPath = path.join(projectRoot, 'data', 'workshops.json');

const workshopImageFolders = {
  workshop_kintsugi_basics: 'kintsugi basics',
  workshop_tea_ceremony: 'Tea ceremony experience',
  workshop_nihonga_intro: 'Nihonga painting',
  workshop_calligraphy_for_all: 'Calligraphy for all',
  workshop_flower_arrangement: 'Flower arrangement',
  workshop_traditional_pottery_techniques: 'Traditional pottery techniques',
  workshop_woodworking_for_beginners: 'Woodworking for beginners',
};

function buildPublicDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

async function ensureFirebaseInitialized() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(projectRoot, 'firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Missing service account JSON at: ${serviceAccountPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const projectId = serviceAccount.project_id;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket,
  });

  return {
    firestore: admin.firestore(),
    bucket: admin.storage().bucket(),
    storageBucket,
  };
}

async function uploadWorkshopImages(bucket, storageBucket, workshop) {
  const folderName = workshopImageFolders[workshop.id];
  if (!folderName || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return [];
  }

  const imageDir = path.join(projectRoot, 'assets', 'images', folderName);
  if (!fs.existsSync(imageDir)) {
    console.log(`- No local image folder found for ${workshop.id}: ${folderName}`);
    return [];
  }

  const uploadedUrls = [];

  for (const imageFileName of workshop.images) {
    const localPath = path.join(imageDir, imageFileName);
    if (!fs.existsSync(localPath)) {
      console.log(`- Missing image file for ${workshop.id}: ${localPath}`);
      continue;
    }

    const ext = path.extname(imageFileName) || '.jpg';
    const storagePath = `images/${workshop.id}/${path.basename(imageFileName, ext)}${ext}`;
    const token = crypto.randomUUID();

    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: {
        contentType: ext.toLowerCase() === '.png' ? 'image/png' : 'image/jpeg',
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    uploadedUrls.push(buildPublicDownloadUrl(storageBucket, storagePath, token));
  }

  return uploadedUrls;
}

async function seedWorkshopsAndReviews() {
  if (!fs.existsSync(workshopsPath)) {
    throw new Error(`Workshops file not found: ${workshopsPath}`);
  }

  const workshops = JSON.parse(fs.readFileSync(workshopsPath, 'utf8'));
  const { firestore, bucket, storageBucket } = await ensureFirebaseInitialized();

  console.log(`Seeding ${workshops.length} workshops...`);

  for (const workshop of workshops) {
    const uploadedImageUrls = await uploadWorkshopImages(bucket, storageBucket, workshop);

    const { reviews = [], ...workshopData } = workshop;
    const payload = {
      ...workshopData,
      images: uploadedImageUrls,
      seededAt: new Date().toISOString(),
    };

    await firestore.collection('workshops').doc(workshop.id).set(payload, { merge: true });
    console.log(`✓ Workshop seeded: ${workshop.id} (${uploadedImageUrls.length} images)`);

    for (const review of reviews) {
      await firestore.collection('reviews').doc(review.id).set(
        {
          ...review,
          workshopId: workshop.id,
        },
        { merge: true }
      );
    }

    if (reviews.length > 0) {
      console.log(`  ↳ Reviews seeded: ${reviews.length}`);
    }
  }

  console.log('Done. Firebase seed complete.');
}

seedWorkshopsAndReviews()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  });
