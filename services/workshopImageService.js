// Progress: this service now handles workshop image upload and display helpers.
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Image } from 'expo-image';
import { storage } from '../firebase/firebase';

export async function uploadImageAsset(workshopId, imageAsset, kind, index = 0) {
  if (!workshopId || !imageAsset?.uri) {
    throw new Error('Workshop ID and image asset are required');
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const extensionSource = imageAsset?.fileName || imageAsset?.uri || '';
  const extension = extensionSource.split('?')[0].split('.').pop() || 'jpg';
  const imageRef = ref(storage, `workshop-images/${workshopId}/${kind}_${index}_${timestamp}_${random}.${extension}`);

  let blob;
  try {
    blob = await fetch(imageAsset.uri).then((response) => response.blob());
    await uploadBytes(imageRef, blob);
    return getDownloadURL(imageRef);
  } catch (error) {
    throw new Error(`Failed to upload ${kind} image ${index + 1}: ${error.message}`);
  } finally {
    if (blob && typeof blob.close === 'function') {
      blob.close();
    }
  }
}

export async function uploadImageAssetsWithConcurrency(
  workshopId,
  imageAssets,
  kind,
  startIndex = 0,
  maxConcurrency = 2
) {
  if (!Array.isArray(imageAssets) || imageAssets.length === 0) {
    return [];
  }

  const results = [];

  for (let index = 0; index < imageAssets.length; index += maxConcurrency) {
    const batch = imageAssets.slice(index, index + maxConcurrency);
    const batchUrls = await Promise.all(
      batch.map((asset, batchIndex) =>
        uploadImageAsset(workshopId, asset, kind, startIndex + index + batchIndex)
      )
    );
    results.push(...batchUrls);

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}

export function getWorkshopImageUrl(workshop, imageIndex = 0) {
  try {
    if (!workshop?.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
      return null;
    }

    if (imageIndex >= workshop.images.length) {
      imageIndex = 0;
    }

    const imageUrl = workshop.images[imageIndex];

    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      return { uri: imageUrl };
    }

    if (typeof imageUrl === 'string' && imageUrl.startsWith('file://')) {
      return { uri: imageUrl };
    }

    return null;
  } catch (error) {
    console.log(`Could not load image for ${workshop?.id || 'unknown workshop'}:`, error.message);
    return null;
  }
}

export function getAllWorkshopImages(workshop) {
  if (!workshop.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return [];
  }

  return workshop.images
    .map((_, index) => getWorkshopImageUrl(workshop, index))
    .filter(Boolean);
}

export async function prefetchWorkshopImages(workshop) {
  if (!workshop?.id || !workshop?.images || !Array.isArray(workshop.images)) {
    return;
  }

  const remoteUrls = workshop.images.filter(
    (url) => typeof url === 'string' && url.startsWith('http')
  );

  if (remoteUrls.length > 0) {
    Promise.all(remoteUrls.map((url) => Image.prefetch(url).catch(() => false))).catch(
      () => {}
    );
  }
}

export async function getAllWorkshopImagesForDisplay(workshop) {
  if (!workshop?.images || !Array.isArray(workshop.images) || workshop.images.length === 0) {
    return [];
  }

  return workshop.images
    .filter((url) => typeof url === 'string' && (url.startsWith('http') || url.startsWith('file://')))
    .map((url) => ({ uri: url }));
}
