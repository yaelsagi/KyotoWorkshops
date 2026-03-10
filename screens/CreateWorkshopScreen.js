import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  CameraIcon,
  XMarkIcon,
  PhotoIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";
import { useUser } from "../context/UserContext";
import { WORKSHOP_CATEGORIES } from "../constants/workshopCategories";
import { KYOTO_WARDS } from "../constants/kyotoWards";
import { createWorkshop, updateWorkshop } from "../services/workshopService";

const DURATION_OPTIONS = [
  "1 hour",
  "1.5 hours",
  "2 hours",
  "2.5 hours",
  "3 hours",
  "3.5 hours",
  "4 hours",
  "Half day (4-6 hours)",
  "Full day (6-8 hours)",
];

export default function CreateWorkshopScreen({ navigation, route }) {
  const { currentUser, updateUser } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const editingWorkshop = route?.params?.workshop || null;
  const isEditMode = Boolean(editingWorkshop?.id);

  // Workshop Details
  const [title, setTitle] = useState(editingWorkshop?.title || "");
  const [selectedCategories, setSelectedCategories] = useState(
    Array.isArray(editingWorkshop?.categories) && editingWorkshop.categories.length > 0
      ? editingWorkshop.categories
      : editingWorkshop?.category
        ? [editingWorkshop.category]
        : []
  );
  const [customCategorySuggestion, setCustomCategorySuggestion] = useState(editingWorkshop?.customCategorySuggestion || "");

  // Photos
  const [coverImage, setCoverImage] = useState(
    editingWorkshop?.coverImage
      ? { uri: editingWorkshop.coverImage }
      : editingWorkshop?.images?.[0]
        ? { uri: editingWorkshop.images[0] }
        : null
  );
  const [galleryImages, setGalleryImages] = useState(
    Array.isArray(editingWorkshop?.images)
      ? editingWorkshop.images
          .slice(editingWorkshop?.coverImage ? 1 : 0)
          .map((uri) => ({ uri }))
      : []
  );

  // Schedule & Capacity
  const [duration, setDuration] = useState(editingWorkshop?.duration || "");
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(
    editingWorkshop?.maxParticipants ? String(editingWorkshop.maxParticipants) : ""
  );

  // Location
  const [selectedWard, setSelectedWard] = useState(editingWorkshop?.ward || "");
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [address, setAddress] = useState(editingWorkshop?.address || "");

  // Description
  const [description, setDescription] = useState(editingWorkshop?.description || "");

  // What's Included
  const [whatsIncluded, setWhatsIncluded] = useState(editingWorkshop?.whatsIncluded || "");

  // Price
  const [price, setPrice] = useState(
    typeof editingWorkshop?.priceYen === "number" ? String(editingWorkshop.priceYen) : ""
  );

  // Category selection - max 3
  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      if (selectedCategories.length < 3) {
        setSelectedCategories([...selectedCategories, category]);
      } else {
        Alert.alert("Maximum Reached", "You can select up to 3 categories");
      }
    }
  };

  // Image picker for cover image
  const handlePickCoverImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to choose photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCoverImage(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking cover image:", error);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  // Image picker for gallery
  const handleAddGalleryImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to choose photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setGalleryImages([...galleryImages, result.assets[0]]);
      }
    } catch (error) {
      console.error("Error picking gallery image:", error);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  // Remove gallery image
  const handleRemoveGalleryImage = (index) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  // Validation
  const validateForm = () => {
    const errors = [];

    if (!title.trim()) {
      errors.push("Title is required");
    }

    if (selectedCategories.length === 0) {
      errors.push("At least one category is required");
    }

    if (!coverImage) {
      errors.push("Cover image is required");
    }

    if (galleryImages.length < 3) {
      errors.push("At least 3 gallery images are required");
    }

    if (!duration) {
      errors.push("Duration is required");
    }

    if (!maxParticipants || parseInt(maxParticipants) <= 0) {
      errors.push("Maximum participants must be a positive number");
    }

    if (!selectedWard) {
      errors.push("Ward location is required");
    }

    if (!address.trim()) {
      errors.push("Address is required");
    }

    if (!description.trim()) {
      errors.push("Workshop description is required");
    }

    if (!price || parseFloat(price) <= 0) {
      errors.push("Price must be a positive number");
    }

    return errors;
  };

  // Submit form
  const handleSubmit = async () => {
    const errors = validateForm();

    if (errors.length > 0) {
      Alert.alert(
        "Form Validation",
        "Please fix the following errors:\n\n" + errors.join("\n")
      );
      return;
    }

    setSubmitting(true);

    try {
      const workshopData = {
        title: title.trim(),
        categories: selectedCategories,
        customCategorySuggestion: customCategorySuggestion.trim() || null,
        coverImageAsset: coverImage,
        galleryImageAssets: galleryImages,
        duration,
        maxParticipants: parseInt(maxParticipants),
        ward: selectedWard,
        address: address.trim(),
        description: description.trim(),
        whatsIncluded: whatsIncluded.trim() || null,
        priceYen: parseFloat(price),
        ownerId: currentUser?.uid,
      };

      if (isEditMode) {
        await updateWorkshop(editingWorkshop.id, {
          title: workshopData.title,
          categories: workshopData.categories,
          category: workshopData.categories[0],
          customCategorySuggestion: workshopData.customCategorySuggestion,
          customCategorySuggestionStatus: workshopData.customCategorySuggestion ? "pending" : "none",
          ward: workshopData.ward,
          address: workshopData.address,
          duration: workshopData.duration,
          maxParticipants: workshopData.maxParticipants,
          description: workshopData.description,
          whatsIncluded: workshopData.whatsIncluded,
          priceYen: workshopData.priceYen,
          coverImageAsset: workshopData.coverImageAsset,
          galleryImageAssets: workshopData.galleryImageAssets,
        });
      } else {
        await createWorkshop(workshopData, currentUser?.uid);

        updateUser({
          roles: {
            ...(currentUser?.roles || {}),
            host: true,
          },
        });
      }

      Alert.alert(
        "Workshop submitted for review",
        "Your workshop is saved and pending admin approval. It will appear publicly once approved.",
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("MyWorkshops"),
          },
        ]
      );
    } catch (error) {
      console.error("Error creating workshop:", error);
      Alert.alert(
        "Error",
        "Could not create workshop. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>{isEditMode ? "Edit Workshop" : "Create Workshop"}</Text>
      <Text style={styles.pageSubtitle}>
        {isEditMode
          ? "Update your listing and submit changes for admin review"
          : "Share your craft expertise with learners in Kyoto"}
      </Text>

      {/* Workshop Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workshop Details</Text>

        <Text style={styles.label}>
          Workshop Title <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Traditional Kintsugi for Beginners"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, { marginTop: 20 }]}>
          Categories (Select up to 3) <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.categoryGrid}>
          {WORKSHOP_CATEGORIES.map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryChip,
                selectedCategories.includes(category) &&
                  styles.categoryChipSelected,
              ]}
              onPress={() => toggleCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategories.includes(category) &&
                    styles.categoryChipTextSelected,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>
          Other category suggestion (optional)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Suggest a new category if yours isn't listed"
          value={customCategorySuggestion}
          onChangeText={setCustomCategorySuggestion}
          placeholderTextColor="#999"
        />
        <Text style={styles.helperText}>
          💡 If your craft doesn't fit the categories above, suggest a new one
          here
        </Text>
      </View>

      {/* Photos Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>

        <Text style={styles.label}>
          Cover Image <Text style={styles.required}>*</Text>
        </Text>
        {coverImage ? (
          <View style={styles.coverImageContainer}>
            <Image
              source={{ uri: coverImage.uri }}
              style={styles.coverImagePreview}
            />
            <Pressable
              style={styles.removeImageButton}
              onPress={() => setCoverImage(null)}
            >
              <XMarkIcon size={16} color="#FFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.imagePickerButton}
            onPress={handlePickCoverImage}
          >
            <PhotoIcon size={32} color="#666" />
            <Text style={styles.imagePickerText}>Upload Cover Image</Text>
            <Text style={styles.imagePickerSubtext}>16:9 landscape format</Text>
          </Pressable>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Gallery Images (Minimum 3) <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.galleryGrid}>
          {galleryImages.map((image, index) => (
            <View key={index} style={styles.galleryImageContainer}>
              <Image
                source={{ uri: image.uri }}
                style={styles.galleryImagePreview}
              />
              <Pressable
                style={styles.removeGalleryImageButton}
                onPress={() => handleRemoveGalleryImage(index)}
              >
                <XMarkIcon size={12} color="#FFF" />
              </Pressable>
            </View>
          ))}
          {galleryImages.length < 10 && (
            <Pressable
              style={styles.addGalleryButton}
              onPress={handleAddGalleryImage}
            >
              <CameraIcon size={24} color="#666" />
              <Text style={styles.addGalleryText}>Add Photo</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.helperText}>
          📸 Show your workspace, materials, and finished pieces. Clear, bright
          photos help attract learners!
        </Text>
      </View>

      {/* Schedule & Capacity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule & Capacity</Text>

        <Text style={styles.label}>
          Duration <Text style={styles.required}>*</Text>
        </Text>
        <Pressable
          style={styles.dropdownButton}
          onPress={() => setShowDurationPicker(!showDurationPicker)}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              !duration && styles.dropdownPlaceholder,
            ]}
          >
            {duration || "Select duration"}
          </Text>
        </Pressable>
        {showDurationPicker && (
          <View style={styles.dropdownList}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={styles.dropdownItem}
                onPress={() => {
                  setDuration(option);
                  setShowDurationPicker(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Maximum Participants <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 8"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>

      {/* Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>

        <Text style={styles.label}>
          Ward <Text style={styles.required}>*</Text>
        </Text>
        <Pressable
          style={styles.dropdownButton}
          onPress={() => setShowWardPicker(!showWardPicker)}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              !selectedWard && styles.dropdownPlaceholder,
            ]}
          >
            {selectedWard || "Select ward"}
          </Text>
        </Pressable>
        {showWardPicker && (
          <View style={styles.dropdownList}>
            {KYOTO_WARDS.map((ward) => (
              <Pressable
                key={ward}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedWard(ward);
                  setShowWardPicker(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{ward}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Address <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Street address and building details"
          value={address}
          onChangeText={setAddress}
          placeholderTextColor="#999"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>

        <Text style={styles.label}>
          About the Workshop <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your workshop, what participants will learn, and what makes it special..."
          value={description}
          onChangeText={setDescription}
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Text style={styles.helperText}>
          ✍️ Write 3-5 paragraphs. Include skill level, what you'll teach, the
          experience, and what participants will create
        </Text>
      </View>

      {/* What's Included Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's Included</Text>

        <Text style={styles.label}>Materials & Services (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="List what's provided: tools, materials, refreshments, take-home items..."
          value={whatsIncluded}
          onChangeText={setWhatsIncluded}
          placeholderTextColor="#999"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Text style={styles.helperText}>
          🎁 Be specific: "All pottery tools, 1kg of clay, glazing materials,
          tea and wagashi, kiln firing included"
        </Text>
      </View>

      {/* Price Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price</Text>

        <Text style={styles.label}>
          Price per Person (JPY) <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 12000"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>

      {/* Submit Button */}
      <Pressable
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitButtonText}>{isEditMode ? "Submit Updates for Review" : "Submit Workshop for Review"}</Text>
        )}
      </Pressable>

      <Text style={styles.footerNote}>
        <InformationCircleIcon size={14} color="#666" /> Your workshop will be
        reviewed before being published to ensure quality standards
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F1F1F",
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 8,
  },
  required: {
    color: "#C1121F",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F1F1F",
    backgroundColor: "#FBFAF7",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    lineHeight: 18,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FBFAF7",
  },
  categoryChipSelected: {
    backgroundColor: "#1F1F1F",
    borderColor: "#1F1F1F",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#1F1F1F",
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  imagePickerButton: {
    height: 180,
    borderWidth: 2,
    borderColor: "#E6E2DA",
    borderRadius: 12,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBFAF7",
  },
  imagePickerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    marginTop: 8,
  },
  imagePickerSubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  coverImageContainer: {
    position: "relative",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
  },
  coverImagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  galleryImageContainer: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  galleryImagePreview: {
    width: "100%",
    height: "100%",
  },
  removeGalleryImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addGalleryButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#E6E2DA",
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBFAF7",
  },
  addGalleryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginTop: 4,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FBFAF7",
  },
  dropdownButtonText: {
    fontSize: 15,
    color: "#1F1F1F",
  },
  dropdownPlaceholder: {
    color: "#999",
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F1E8",
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#1F1F1F",
  },
  submitButton: {
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#999",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footerNote: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
});
