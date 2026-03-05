/**
 * ⚠️ ONE-TIME SETUP HELPER SCRIPT (Not used in app)
 * 
 * This is a development utility to populate Firestore with workshop data.
 * It's NOT part of the app runtime - it's only used once during initial setup.
 * 
 * Purpose:
 * - Reads workshops and reviews from data/workshops.json
 * - Uploads them to Firestore database
 * - Links reviews to workshops
 * - Adds image URLs to workshop documents
 * 
 * Usage (terminal only, not in app):
 *   1. First run: npm run get-urls
 *   2. Copy IMAGE_URL_MAPPING output
 *   3. Paste into this file (see line 30)
 *   4. Then run: npm run seed
 * 
 * After running this once:
 * - Firestore has all data
 * - App loads workshops from Firebase at runtime
 * - This script can be deleted
 * 
 * IMPORTANT: This uses client-side Firebase Web SDK (not admin SDK)
 * - No service account needed
 * - Safe to commit to GitHub
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyB3wsqgKeAvjUCpoS73U6aTV1arKj98uuo',
  authDomain: 'kyoto-workshops.firebaseapp.com',
  projectId: 'kyoto-workshops',
  storageBucket: 'kyoto-workshops.firebasestorage.app',
  messagingSenderId: '927023563395',
  appId: '1:927023563395:web:52d5f0563541c6296e11b6',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Workshop data (from workshops.json)
const workshopsData = require('../data/workshops.json');

/**
 * IMPORTANT: Replace these with your actual Firebase Storage URLs
 * 
 * Get URLs from Firebase Console > Storage:
 * 1. Click on image file
 * 2. Copy "Download URL" 
 * 3. Paste below
 */
const IMAGE_URL_MAPPING = {
  workshop_kintsugi_basics: [
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2Fkintsugi_basics%2Fimage_1.jpg?alt=media&token=8b6e9e88-7527-468f-bd7b-38755d222d6b',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2Fkintsugi_basics%2Fimage_2.jpg?alt=media&token=c2eec83d-29fc-471a-b588-4b4b4273a23c',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2Fkintsugi_basics%2Fimage_3.jpg?alt=media&token=1bb9b0c9-9e6f-4ad7-8671-62309caf626d',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2Fkintsugi_basics%2Fimage_4.jpg?alt=media&token=799272e7-b8be-42cd-beb6-e4cfc768966d',
  ],
  workshop_calligraphy_for_all: [
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FCalligraphy_for_all%2Fimage_1.jpg?alt=media&token=3986557f-82d9-4686-bb23-7f80237bf3ca',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FCalligraphy_for_all%2Fimage_2.jpg?alt=media&token=7f920c46-b249-49f3-9ef5-857f58edcc98',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FCalligraphy_for_all%2Fimage_3.jpg?alt=media&token=35a7eb4a-d3de-48ff-801a-b4de5b3d0e5e',
  ],
  workshop_flower_arrangement: [
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FFlower_arrangement%2Fimage_1.jpg?alt=media&token=310715c1-939e-4939-b621-b02f6df5ddae',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FFlower_arrangement%2Fimage_2.jpg?alt=media&token=1c971242-5268-4910-b2b8-d161464e1b34',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FFlower_arrangement%2Fimage_3.jpg?alt=media&token=cd9fe7ea-9924-48a2-b90f-91443c06ebd3',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FFlower_arrangement%2Fimage_4.jpg?alt=media&token=86ea2fea-6108-4a17-a876-43522080c657',
  ],
  workshop_tea_ceremony: [
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FTea_ceremony_experience%2Fimage_1.jpg?alt=media&token=7d67a250-8a44-4543-b80f-26321d9461b6',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FTea_ceremony_experience%2Fimage_2.jpg?alt=media&token=b53aa517-6cdb-4bd5-9143-40282b2bf283',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FTea_ceremony_experience%2Fimage_3.jpg?alt=media&token=34c55e2c-a085-4822-8d5c-53800e66d237',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FTea_ceremony_experience%2Fimage_4.jpg?alt=media&token=05447cc8-ca0c-4102-b917-8834f542978d',
  ],
  workshop_traditional_pottery_techniques: [
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FTraditional_pottery_techniques%2Fimage_1.jpg?alt=media&token=d7db7dfb-5f87-4aac-9e32-cd9fcd622ed7',
  ],
  workshop_woodworking_for_beginners: [
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FWoodworking_for_beginners%2Fimage_1.jpg?alt=media&token=435b30b5-620b-4ec7-b6c6-eb140e75080a',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FWoodworking_for_beginners%2Fimage_2.jpg?alt=media&token=326a859f-ccc3-4fa2-805c-6a22b9c1d191',
    'https://firebasestorage.googleapis.com/v0/b/kyoto-workshops.firebasestorage.app/o/workshops%2FWoodworking_for_beginners%2Fimage_3.jpg?alt=media&token=fa798d13-b3c7-4c79-b5cc-d5765cf97ef5',
  ],
};

/**
 * Seed workshops collection
 */
async function seedWorkshops() {
  console.log('📚 Seeding workshops collection...');
  let successCount = 0;
  let errorCount = 0;

  for (const workshop of workshopsData) {
    try {
      // Get image URLs for this workshop (or use empty array if not mapped)
      const imageUrls = IMAGE_URL_MAPPING[workshop.id] || [];

      // Create workshop document (without reviews - they go in separate collection)
      const workshopData = {
        id: workshop.id,
        title: workshop.title,
        category: workshop.category,
        ward: workshop.ward,
        priceYen: workshop.priceYen,
        isTop: workshop.isTop,
        lat: workshop.lat,
        lng: workshop.lng,
        wikipediaKeyword: workshop.wikipediaKeyword,
        availableSlots: workshop.availableSlots,
        hostId: workshop.hostId,
        images: imageUrls,
      };

      // Add to Firestore using workshop ID as document ID
      const workshopDocRef = doc(db, 'workshops', workshop.id);
      await setDoc(workshopDocRef, workshopData);

      console.log(`✅ Added workshop: ${workshop.title} (${imageUrls.length} images)`);
      successCount++;

    } catch (error) {
      console.error(`❌ Failed to add ${workshop.title}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n✨ Workshops seeding complete: ${successCount} added, ${errorCount} failed\n`);
}

/**
 * Seed reviews collection
 */
async function seedReviews() {
  console.log('💬 Seeding reviews collection...');
  let successCount = 0;
  let errorCount = 0;

  for (const workshop of workshopsData) {
    if (!workshop.reviews || workshop.reviews.length === 0) {
      continue;
    }

    for (const review of workshop.reviews) {
      try {
        // Create review document with workshopId reference
        const reviewData = {
          id: review.id,
          workshopId: workshop.id, // Link to workshop
          userId: review.userId,
          name: review.name,
          rating: review.rating,
          text: review.text,
          createdAt: review.createdAt,
        };

        // Add to Firestore using review ID as document ID
        const reviewDocRef = doc(db, 'reviews', review.id);
        await setDoc(reviewDocRef, reviewData);

        console.log(`✅ Added review: ${review.id} for ${workshop.title}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to add review ${review.id}:`, error.message);
        errorCount++;
      }
    }
  }

  console.log(`\n✨ Reviews seeding complete: ${successCount} added, ${errorCount} failed\n`);
}

/**
 * Main seeding function - runs everything
 */
async function seedDatabase() {
  console.log('\n🚀 Starting Firestore database seeding...\n');
  console.log(`Project: ${firebaseConfig.projectId}`);
  console.log(`Workshops to add: ${workshopsData.length}`);
  
  const totalReviews = workshopsData.reduce((sum, w) => sum + (w.reviews?.length || 0), 0);
  console.log(`Reviews to add: ${totalReviews}\n`);

  try {
    // Seed workshops first
    await seedWorkshops();

    // Then seed reviews
    await seedReviews();

    console.log('\n🎉 DATABASE SEEDING COMPLETE! 🎉');
    console.log('\nNext steps:');
    console.log('1. Check Firebase Console > Firestore to verify data');
    console.log('2. Start your app: npm start');
    console.log('3. Workshops should load from Firebase!\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Fatal error:', err);
      process.exit(1);
    });
}

// Export for use in app
module.exports = { seedDatabase, seedWorkshops, seedReviews };
