import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { uploadWorkshopImage, listWorkshopImages } from '../services/storageService';

/**
 * OPTIONAL UPLOAD SCREEN
 * 
 * Workshop images were uploaded manually via Firebase Console.
 * This screen is kept for future use cases:
 * - User-generated workshop content
 * - Dynamic image management by hosts
 * - Additional image uploads without console access
 * 
 * Not currently used in main navigation flow.
 */

// Workshop IDs from your data/workshops.json
const WORKSHOP_IDS = [
  'workshop_kintsugi_basics',
  'workshop_nihonga_intro',
  'workshop_tea_ceremony',
  'workshop_calligraphy_for_all',
  'workshop_flower_arrangement',
  'workshop_pottery_traditional_techniques',
  'workshop_woodworking_for_beginners',
];

export default function UploadImagesScreen() {
  const [selectedWorkshop, setSelectedWorkshop] = useState(WORKSHOP_IDS[0]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Load existing images for selected workshop
  const loadWorkshopImages = async (workshopId) => {
    setLoadingImages(true);
    try {
      const images = await listWorkshopImages(workshopId);
      setUploadedImages(images);
    } catch (error) {
      Alert.alert('Error', `Could not load images: ${error.message}`);
      setUploadedImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  // When workshop selection changes, reload images
  const handleWorkshopChange = (workshopId) => {
    setSelectedWorkshop(workshopId);
    loadWorkshopImages(workshopId);
  };

  // Pick image from device and upload
  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: true,
      });

      if (result.canceled) {
        return;
      }

      setUploading(true);
      const files = result.assets || [];

      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading ${i + 1}/${files.length}...`);

        try {
          await uploadWorkshopImage(selectedWorkshop, files[i]);
        } catch (error) {
          Alert.alert('Upload Failed', `Image ${i + 1}: ${error.message}`);
        }
      }

      setUploadProgress('');

      // Reload images list
      await loadWorkshopImages(selectedWorkshop);
      
    } catch (error) {
      Alert.alert('Error', `Pick failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upload Workshop Images</Text>

      {/* Instructions */}
      <View style={styles.instructionBox}>
        <Text style={styles.instructionText}>
          1. Select a workshop
          {'\n'}2. Pick images from your device
          {'\n'}3. They'll be uploaded to Firebase Storage
          {'\n'}4. URLs saved to Firestore workshop
        </Text>
      </View>

      {/* Workshop Selection */}
      <Text style={styles.label}>Select Workshop</Text>
      <View style={styles.workshopGrid}>
        {WORKSHOP_IDS.map(workshopId => (
          <Pressable
            key={workshopId}
            style={[
              styles.workshopButton,
              selectedWorkshop === workshopId && styles.workshopButtonActive,
            ]}
            onPress={() => handleWorkshopChange(workshopId)}
          >
            <Text
              style={[
                styles.workshopButtonText,
                selectedWorkshop === workshopId && styles.workshopButtonTextActive,
              ]}
              numberOfLines={2}
            >
              {workshopId.replace('workshop_', '').replace(/_/g, ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Upload Button */}
      <Pressable
        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        onPress={handlePickAndUpload}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.uploadButtonText}>{uploadProgress}</Text>
          </>
        ) : (
          <Text style={styles.uploadButtonText}>Pick & Upload Images</Text>
        )}
      </Pressable>

      {/* Uploaded Images List */}
      <Text style={styles.label}>Uploaded Images</Text>
      {loadingImages ? (
        <ActivityIndicator size="large" color="#666" style={styles.loader} />
      ) : uploadedImages.length === 0 ? (
        <Text style={styles.emptyText}>No images yet for this workshop</Text>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={uploadedImages}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item, index }) => (
            <View style={styles.imageItem}>
              <Text style={styles.imageIndex}>{index + 1}.</Text>
              <Text style={styles.imageName}>{item}</Text>
            </View>
          )}
        />
      )}

      {/* Storage Path Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Storage Path</Text>
        <Text style={styles.infoText}>
          All images saved to:
          {'\n'}
          <Text style={styles.pathCode}>
            workshop-images/{selectedWorkshop}/
          </Text>
        </Text>
      </View>

      {/* Folder Naming Guide */}
      <View style={styles.guideBox}>
        <Text style={styles.guideTitle}>Workshop IDs (Folder Names)</Text>
        <View style={styles.idList}>
          {WORKSHOP_IDS.map(id => (
            <Text key={id} style={styles.idItem}>
              • {id}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  instructionBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  instructionText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  workshopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  workshopButton: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  workshopButtonActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  workshopButtonText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  workshopButtonTextActive: {
    color: '#fff',
  },
  uploadButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#aaa',
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  imageItem: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  imageIndex: {
    fontWeight: 'bold',
    color: '#4caf50',
    marginRight: 8,
  },
  imageName: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  infoBox: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff9800',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  pathCode: {
    fontFamily: 'monospace',
    backgroundColor: '#fef5e7',
    padding: 4,
    borderRadius: 3,
    color: '#e65100',
  },
  guideBox: {
    backgroundColor: '#f3e5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 40,
    borderLeftWidth: 4,
    borderLeftColor: '#7b1fa2',
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7b1fa2',
    marginBottom: 8,
  },
  idList: {
    paddingLeft: 8,
  },
  idItem: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});
