const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const serviceAccountPath = path.join(
  projectRoot,
  'key_do not submit',
  'kyoto-workshops-firebase-adminsdk-fbsvc-9339fd9992.json'
);
const workshopsPath = path.join(projectRoot, 'data', 'workshops.json');

async function run() {
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account file not found: ${serviceAccountPath}`);
  }

  if (!fs.existsSync(workshopsPath)) {
    throw new Error(`Workshop data file not found: ${workshopsPath}`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const workshops = JSON.parse(fs.readFileSync(workshopsPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const db = admin.firestore();
  let workshopSuccess = 0;
  let reviewSuccess = 0;

  for (const workshop of workshops) {
    const workshopRef = db.collection('workshops').doc(workshop.id);
    const existingSnapshot = await workshopRef.get();
    const existingData = existingSnapshot.exists ? existingSnapshot.data() : {};

    const payload = {
      id: workshop.id,
      title: workshop.title,
      category: workshop.category,
      categories: Array.isArray(existingData.categories) && existingData.categories.length > 0
        ? existingData.categories
        : [workshop.category],
      ward: workshop.ward,
      priceYen: workshop.priceYen,
      isTop: workshop.isTop,
      lat: workshop.lat,
      lng: workshop.lng,
      wikipediaKeyword: workshop.wikipediaKeyword,
      availableSlots: workshop.availableSlots,
      sessions: Array.isArray(workshop.sessions) ? workshop.sessions : [],
      hostId: workshop.hostId,
      ownerId: existingData.ownerId || workshop.hostId || null,
      images: Array.isArray(existingData.images) ? existingData.images : [],
      coverImage: existingData.coverImage || (Array.isArray(existingData.images) ? existingData.images[0] : null) || null,
      status: existingData.status || 'approved',
      updatedAt: new Date().toISOString(),
    };

    if (existingData.createdAt) {
      payload.createdAt = existingData.createdAt;
    }

    await workshopRef.set(payload, { merge: true });
    workshopSuccess += 1;
    console.log(`Updated workshop: ${workshop.id}`);

    for (const review of workshop.reviews || []) {
      const reviewRef = db.collection('reviews').doc(review.id);
      await reviewRef.set(
        {
          id: review.id,
          workshopId: workshop.id,
          userId: review.userId,
          name: review.name,
          rating: review.rating,
          text: review.text,
          createdAt: review.createdAt,
        },
        { merge: true }
      );
      reviewSuccess += 1;
      console.log(`Updated review: ${review.id}`);
    }
  }

  console.log(`Done. ${workshopSuccess} workshops updated and ${reviewSuccess} reviews updated.`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Workshop content seed failed:', error.message);
    process.exit(1);
  });
