// Tests for storage service
// Tests image upload, download URL retrieval, and Firestore integration

import {
  uploadWorkshopImage,
  uploadMultipleImagesToWorkshop,
  updateWorkshopImages,
  listWorkshopImages,
  deleteWorkshopImage,
} from '../services/storageService';
import { uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { updateDoc } from 'firebase/firestore';

jest.mock('firebase/storage');
jest.mock('firebase/firestore');
jest.mock('../firebase/firebase', () => ({ db: {}, storage: {} }));

describe('Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadWorkshopImage', () => {
    test('uploads image to Firebase Storage and returns download URL', async () => {
      const mockImageFile = {
        uri: 'file:///mock-image.jpg',
        name: 'test.jpg',
        type: 'image/jpeg',
      };

      const mockDownloadUrl = 'https://firebasestorage.googleapis.com/mock-image.jpg';

      uploadBytes.mockResolvedValue({
        fullPath: 'workshop-images/workshop_tea_ceremony/image_123_abc.jpg',
        ref: {},
      });

      getDownloadURL.mockResolvedValue(mockDownloadUrl);

      // Mock fetch for blob conversion
      global.fetch = jest.fn(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['mock'], { type: 'image/jpeg' })),
        })
      );

      const result = await uploadWorkshopImage('workshop_tea_ceremony', mockImageFile);

      expect(result).toBe(mockDownloadUrl);
      expect(uploadBytes).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
    });

    test('throws error if workshop ID is missing', async () => {
      const mockImageFile = { uri: 'file:///test.jpg', name: 'test.jpg' };

      await expect(uploadWorkshopImage('', mockImageFile)).rejects.toThrow(
        'Workshop ID required'
      );
    });

    test('throws error if image file is missing', async () => {
      await expect(uploadWorkshopImage('workshop_tea_ceremony', null)).rejects.toThrow(
        'Image file required'
      );
    });
  });

  describe('updateWorkshopImages', () => {
    test('adds image URLs to workshop Firestore document', async () => {
      const imageUrls = [
        'https://firebasestorage.googleapis.com/image1.jpg',
        'https://firebasestorage.googleapis.com/image2.jpg',
      ];

      updateDoc.mockResolvedValue();

      await updateWorkshopImages('workshop_tea_ceremony', imageUrls);

      // updateDoc called once per URL (using arrayUnion)
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });

    test('throws error if no image URLs provided', async () => {
      await expect(updateWorkshopImages('workshop_tea_ceremony', [])).rejects.toThrow(
        'At least one image URL required'
      );
    });
  });

  describe('listWorkshopImages', () => {
    test('returns list of image filenames for workshop', async () => {
      const mockImages = [
        { name: 'image_1_abc.jpg' },
        { name: 'image_2_def.jpg' },
        { name: 'image_3_ghi.jpg' },
      ];

      listAll.mockResolvedValue({
        items: mockImages,
        prefixes: [],
      });

      const result = await listWorkshopImages('workshop_tea_ceremony');

      expect(result).toEqual(['image_1_abc.jpg', 'image_2_def.jpg', 'image_3_ghi.jpg']);
      expect(listAll).toHaveBeenCalled();
    });

    test('returns empty array if no images found', async () => {
      listAll.mockResolvedValue({
        items: [],
        prefixes: [],
      });

      const result = await listWorkshopImages('workshop_empty');

      expect(result).toEqual([]);
    });

    test('throws error if workshop ID is missing', async () => {
      await expect(listWorkshopImages('')).rejects.toThrow('Workshop ID required');
    });
  });

  describe('deleteWorkshopImage', () => {
    test('deletes image from Firebase Storage', async () => {
      deleteObject.mockResolvedValue();

      await deleteWorkshopImage('workshop_tea_ceremony', 'image_1_abc.jpg');

      expect(deleteObject).toHaveBeenCalled();
    });

    test('throws error if workshop ID or image name missing', async () => {
      await expect(deleteWorkshopImage('', 'image.jpg')).rejects.toThrow(
        'Workshop ID and image name required'
      );

      await expect(deleteWorkshopImage('workshop_tea_ceremony', '')).rejects.toThrow(
        'Workshop ID and image name required'
      );
    });
  });

  describe('uploadMultipleImagesToWorkshop', () => {
    test('uploads multiple images and saves URLs to Firestore', async () => {
      const mockImageFiles = [
        { uri: 'file:///image1.jpg', name: 'image1.jpg' },
        { uri: 'file:///image2.jpg', name: 'image2.jpg' },
      ];

      uploadBytes.mockResolvedValue({
        fullPath: 'workshop-images/workshop_tea_ceremony/image_123.jpg',
        ref: {},
      });

      getDownloadURL
        .mockResolvedValueOnce('https://firebasestorage.googleapis.com/image1.jpg')
        .mockResolvedValueOnce('https://firebasestorage.googleapis.com/image2.jpg');

      updateDoc.mockResolvedValue();

      global.fetch = jest.fn(() =>
        Promise.resolve({
          blob: () => Promise.resolve(new Blob(['mock'], { type: 'image/jpeg' })),
        })
      );

      const result = await uploadMultipleImagesToWorkshop(
        'workshop_tea_ceremony',
        mockImageFiles
      );

      expect(result).toHaveLength(2);
      expect(uploadBytes).toHaveBeenCalledTimes(2);
      expect(updateDoc).toBeCalled();
    });

    test('throws error if no images provided', async () => {
      await expect(uploadMultipleImagesToWorkshop('workshop_tea_ceremony', [])).rejects.toThrow(
        'At least one image required'
      );
    });
  });
});
