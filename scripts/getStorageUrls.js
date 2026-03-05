/**
 * ⚠️ ONE-TIME SETUP HELPER SCRIPT (Not used in app)
 * 
 * This is a development utility to fetch image URLs from Firebase Storage.
 * It's NOT part of the app runtime - it's only used once during setup.
 * 
 * Purpose:
 * - Reads all workshop image folders from Firebase Storage
 * - Generates image URLs for each workshop
 * - Outputs JavaScript object to copy into seedFirestoreClient.js
 * 
 * Usage (terminal only, not in app):
 *   npm run get-urls
 * 
 * Output:
 *   Copy the IMAGE_URL_MAPPING object it prints
 *   Paste into scripts/seedFirestoreClient.js
 *   Then run: npm run seed
 * 
 * This script can be deleted after initial database setup.
 */

const { initializeApp } = require('firebase/app');
const { getStorage, ref, listAll, getDownloadURL } = require('firebase/storage');

const firebaseConfig = {
  apiKey: 'AIzaSyB3wsqgKeAvjUCpoS73U6aTV1arKj98uuo',
  authDomain: 'kyoto-workshops.firebaseapp.com',
  projectId: 'kyoto-workshops',
  storageBucket: 'kyoto-workshops.firebasestorage.app',
  messagingSenderId: '927023563395',
  appId: '1:927023563395:web:52d5f0563541c6296e11b6',
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const WORKSHOP_FOLDERS = [
  { storageName: 'kintsugi_basics', workshopId: 'workshop_kintsugi_basics' },
  { storageName: 'Calligraphy_for_all', workshopId: 'workshop_calligraphy_for_all' },
  { storageName: 'Flower_arrangement', workshopId: 'workshop_flower_arrangement' },
  { storageName: 'Tea_ceremony_experience', workshopId: 'workshop_tea_ceremony' },
  { storageName: 'Traditional_pottery_techniques', workshopId: 'workshop_traditional_pottery_techniques' },
  { storageName: 'Woodworking_for_beginners', workshopId: 'workshop_woodworking_for_beginners' },
];

async function getWorkshopImageUrls(storageFolderName) {
  try {
    const folderRef = ref(storage, `workshops/${storageFolderName}`);
    const result = await listAll(folderRef);

    if (result.items.length === 0) {
      return [];
    }

    const urls = [];
    for (const itemRef of result.items) {
      const url = await getDownloadURL(itemRef);
      urls.push(url);
    }

    return urls;
  } catch (error) {
    console.error(`❌ Error getting URLs for ${storageFolderName}:`, error.message);
    return [];
  }
}

async function getAllUrls() {
  console.log('📥 Fetching all image URLs from Firebase Storage...\n');

  const urlMapping = {};

  for (const workshop of WORKSHOP_FOLDERS) {
    console.log(`Fetching: ${workshop.storageName}...`);
    const urls = await getWorkshopImageUrls(workshop.storageName);
    urlMapping[workshop.workshopId] = urls;
    console.log(`  ✅ Found ${urls.length} images\n`);
  }

  console.log('\n📋 Copy this IMAGE_URL_MAPPING into seedFirestoreClient.js:\n');
  console.log('const IMAGE_URL_MAPPING = ' + JSON.stringify(urlMapping, null, 2) + ';');
  console.log('\n✨ Done!');
}

getAllUrls().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
