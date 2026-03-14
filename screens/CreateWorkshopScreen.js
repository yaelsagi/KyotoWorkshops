import React, { useState, useEffect } from "react";
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
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  CameraIcon,
  XMarkIcon,
  PhotoIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";
import * as Haptics from "expo-haptics";
import { useUser } from "../context/UserContext";
import { WORKSHOP_CATEGORIES } from "../constants/workshopCategories";
import { KYOTO_WARDS } from "../constants/kyotoWards";
import {
  fetchPlatformCategories,
  createWorkshop,
  updateWorkshop,
} from "../services/workshopService";
import KeyboardDoneBar from "../components/KeyboardDoneBar";

// workshop duration options
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

const MAX_CATEGORIES = 3;
const MIN_GALLERY_IMAGES = 3;
const MAX_GALLERY_IMAGES = 10;
const NUMERIC_INPUT_ACCESSORY_ID = "createWorkshopNumericAccessory";

// Patterns for form validation
const TITLE_PATTERN = /^[A-Za-z0-9 ]+$/;
const TITLE_INVALID_CHARS_PATTERN = /[^A-Za-z0-9 ]/g;
const CATEGORY_SUGGESTION_INVALID_CHARS_PATTERN = /[^A-Za-z0-9 ]/g;
const MULTIPLE_SPACES_PATTERN = /\s+/g;
const LEADING_SPACES_PATTERN = /^\s+/;

export default function CreateWorkshopScreen({ navigation, route }) {
  const { currentUser, updateUser } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const editingWorkshop = route?.params?.workshop || null;
  const isEditMode = Boolean(editingWorkshop?.id);
  const [activeSingleSelectPicker, setActiveSingleSelectPicker] = useState(null);

  // Workshop Details
  const [title, setTitle] = useState(editingWorkshop?.title || "");
  const [titleHasInvalidChars, setTitleHasInvalidChars] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState(
    Array.isArray(editingWorkshop?.categories) && editingWorkshop.categories.length > 0
      ? editingWorkshop.categories
      : editingWorkshop?.category
        ? [editingWorkshop.category]
        : []
  );
  const [customCategorySuggestion, setCustomCategorySuggestion] = useState(editingWorkshop?.customCategorySuggestion || "");
  const [customCategorySuggestionHasInvalidChars, setCustomCategorySuggestionHasInvalidChars] = useState(false);

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
  const [maxParticipants, setMaxParticipants] = useState(
    editingWorkshop?.maxParticipants ? String(editingWorkshop.maxParticipants) : ""
  );

  // Location
  const [selectedWard, setSelectedWard] = useState(editingWorkshop?.ward || "");
  const [address, setAddress] = useState(editingWorkshop?.address || "");

  // Description
  const [description, setDescription] = useState(editingWorkshop?.description || "");

  // What's Included
  const [whatsIncluded, setWhatsIncluded] = useState(editingWorkshop?.whatsIncluded || "");

  // Price
  const [price, setPrice] = useState(
    typeof editingWorkshop?.priceYen === "number" ? String(editingWorkshop.priceYen) : ""
  );

  // Load approved categories, fallback to defaults
  const [availableCategories, setAvailableCategories] = useState(WORKSHOP_CATEGORIES);
  useEffect(() => {
    let cancelled = false;
    fetchPlatformCategories().then((cats) => {
      if (!cancelled) setAvailableCategories(cats);
    });
    return () => { cancelled = true; };
  }, []);

  // Detect invalid title characters while typing
  const handleTitleChange = (text) => {
    const sanitizedTitle = text.replace(TITLE_INVALID_CHARS_PATTERN, "");
    setTitleHasInvalidChars(sanitizedTitle !== text);
    setTitle(sanitizedTitle);
  };

  // Remove dots from price input while typing
  const handlePriceChange = (text) => {
    const sanitizedPrice = text.replace(/[^0-9]/g, "");
    setPrice(sanitizedPrice);
  };

  // Format category suggestion before saving
  const normalizeCategorySuggestion = (text) => {
    const sanitized = String(text || "")
      .replace(CATEGORY_SUGGESTION_INVALID_CHARS_PATTERN, "")
      .replace(MULTIPLE_SPACES_PATTERN, " ")
      .trim();

    if (!sanitized) {
      return "";
    }

    return sanitized
      .split(" ")
      .filter(Boolean)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
      .join(" ");
  };

  // Clean category suggestion input while typing
  const handleCustomCategorySuggestionChange = (text) => {
    const sanitized = String(text || "")
      .replace(CATEGORY_SUGGESTION_INVALID_CHARS_PATTERN, "")
      .replace(MULTIPLE_SPACES_PATTERN, " ")
      .replace(LEADING_SPACES_PATTERN, "");

    setCustomCategorySuggestionHasInvalidChars(sanitized !== text);
    setCustomCategorySuggestion(sanitized);
  };

  // Limit category selection to three
  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      if (selectedCategories.length < MAX_CATEGORIES) {
        setSelectedCategories([...selectedCategories, category]);
      } else {
        Alert.alert("Maximum Reached", `You can select up to ${MAX_CATEGORIES} categories`);
      }
    }
  };

  const closeSingleSelectPicker = () => {
    setActiveSingleSelectPicker(null);
  };

  // Picker config for duration and ward
  const singleSelectPickerConfig = activeSingleSelectPicker === "duration"
    ? {
        title: "Select Duration",
        selectedValue: duration,
        options: DURATION_OPTIONS,
        onSelect: (option) => setDuration(option),
      }
    : activeSingleSelectPicker === "ward"
      ? {
          title: "Select Ward",
          selectedValue: selectedWard,
          options: KYOTO_WARDS,
          onSelect: (option) => setSelectedWard(option),
        }
      : null;

  // Pick cover image
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

  // Pick gallery images
  const handleAddGalleryImage = async () => {
    try {
      // Keep gallery within the upload limit
      const remainingSlots = Math.max(0, MAX_GALLERY_IMAGES - galleryImages.length);
      if (remainingSlots === 0) {
        Alert.alert("Gallery Full", `You can upload up to ${MAX_GALLERY_IMAGES} gallery images.`);
        return;
      }

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
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAssets = result.assets.slice(0, remainingSlots);
        setGalleryImages([...galleryImages, ...selectedAssets]);
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

  // Success haptic with strong feedback
  const triggerSubmitSuccessHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log("Haptics unavailable (success):", error?.message || error);
    }
  };

  // Error haptic with strong feedback
  const triggerSubmitErrorHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log("Haptics unavailable (error):", error?.message || error);
    }
  };

  // Validation
  const validateForm = () => {
    const errors = [];

    if (!title.trim()) {
      errors.push("Title is required");
    } else if (!TITLE_PATTERN.test(title.trim())) {
      errors.push("Workshop title can only include letters, numbers, and spaces (no symbols)");
    }

    if (selectedCategories.length === 0) {
      errors.push("At least one category is required");
    }

    if (!coverImage) {
      errors.push("Cover image is required");
    }

    if (galleryImages.length < MIN_GALLERY_IMAGES) {
      errors.push(`At least ${MIN_GALLERY_IMAGES} gallery images are required`);
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
      // Validation error haptic
      await triggerSubmitErrorHaptic();
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
        customCategorySuggestion: normalizeCategorySuggestion(customCategorySuggestion) || null,
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

      // Submit success haptic
      await triggerSubmitSuccessHaptic();

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
      // Submit failure haptic
      await triggerSubmitErrorHaptic();
      Alert.alert(
        "Error",
        "Could not create workshop. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel="Create workshop form"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
    >
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
          onChangeText={handleTitleChange}
          placeholderTextColor="#999"
          accessibilityLabel="Workshop title"
          accessibilityHint="Enter letters and numbers only. Symbols are not allowed."
        />
        <Text style={styles.helperText}>Use letters and numbers only. Symbols are not allowed.</Text>
        {titleHasInvalidChars ? (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            Symbols are not allowed in workshop title.
          </Text>
        ) : null}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Categories (Select up to {MAX_CATEGORIES}) <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.categoryGrid}>
          {availableCategories.map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryChip,
                selectedCategories.length >= MAX_CATEGORIES &&
                  !selectedCategories.includes(category) &&
                  styles.categoryChipDisabled,
                selectedCategories.includes(category) &&
                  styles.categoryChipSelected,
              ]}
              disabled={selectedCategories.length >= MAX_CATEGORIES && !selectedCategories.includes(category)}
              onPress={() => toggleCategory(category)}
              accessibilityRole="button"
              accessibilityLabel={`Category ${category}`}
              accessibilityHint={
                selectedCategories.length >= MAX_CATEGORIES && !selectedCategories.includes(category)
                  ? `Disabled because maximum of ${MAX_CATEGORIES} categories has been selected`
                  : "Double tap to select or deselect category"
              }
              accessibilityState={{
                selected: selectedCategories.includes(category),
                disabled: selectedCategories.length >= MAX_CATEGORIES && !selectedCategories.includes(category),
              }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategories.length >= MAX_CATEGORIES &&
                    !selectedCategories.includes(category) &&
                    styles.categoryChipTextDisabled,
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
          onChangeText={handleCustomCategorySuggestionChange}
          placeholderTextColor="#999"
          accessibilityLabel="Other category suggestion"
          accessibilityHint="Optional. Use letters and numbers only. Symbols and dots are not allowed."
        />
        <Text style={styles.helperText}>
          Optional. Use letters and numbers only (no symbols or dots). Extra spaces are cleaned automatically.
        </Text>
        {customCategorySuggestionHasInvalidChars ? (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            Symbols and dots are not allowed in category suggestions.
          </Text>
        ) : null}
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
              accessibilityRole="button"
              accessibilityLabel="Remove cover image"
              accessibilityHint="Removes the current cover image"
            >
              <XMarkIcon size={16} color="#FFF" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.imagePickerButton}
            onPress={handlePickCoverImage}
            accessibilityRole="button"
            accessibilityLabel="Upload cover image"
            accessibilityHint="Opens photo library to choose a single cover image"
          >
            <PhotoIcon size={32} color="#666" />
            <Text style={styles.imagePickerText}>Upload Cover Image</Text>
            <Text style={styles.imagePickerSubtext}>16:9 landscape format</Text>
          </Pressable>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>
          Gallery Images (Minimum {MIN_GALLERY_IMAGES}) <Text style={styles.required}>*</Text>
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
                accessibilityRole="button"
                accessibilityLabel={`Remove gallery image ${index + 1}`}
                accessibilityHint="Removes this gallery image"
              >
                <XMarkIcon size={12} color="#FFF" />
              </Pressable>
            </View>
          ))}
          {galleryImages.length < MAX_GALLERY_IMAGES && (
            <Pressable
              style={styles.addGalleryButton}
              onPress={handleAddGalleryImage}
              accessibilityRole="button"
              accessibilityLabel="Add gallery images"
              accessibilityHint="Opens photo library to select multiple gallery images"
            >
              <CameraIcon size={24} color="#666" />
              <Text style={styles.addGalleryText}>Add Photo</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.helperText}>
          Show your workspace, materials, and finished pieces. Clear, bright
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
          onPress={() => setActiveSingleSelectPicker("duration")}
          accessibilityRole="button"
          accessibilityLabel="Select workshop duration"
          accessibilityHint="Opens duration picker as a bottom sheet"
          accessibilityState={{ expanded: activeSingleSelectPicker === "duration" }}
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

        <Text style={[styles.label, { marginTop: 20 }]}>
          Maximum Participants <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 8"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          // Attach iOS keyboard accessory
          // Android uses KeyboardAvoidingView, tap dismiss, and drag dismiss from this screen
          inputAccessoryViewID={Platform.OS === "ios" ? NUMERIC_INPUT_ACCESSORY_ID : undefined}
          placeholderTextColor="#999"
          accessibilityLabel="Maximum participants"
          accessibilityHint="Enter the maximum number of participants"
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
          onPress={() => setActiveSingleSelectPicker("ward")}
          accessibilityRole="button"
          accessibilityLabel="Select ward"
          accessibilityHint="Opens ward picker as a bottom sheet"
          accessibilityState={{ expanded: activeSingleSelectPicker === "ward" }}
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
          accessibilityLabel="Workshop address"
          accessibilityHint="Enter street address and building details"
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
          accessibilityLabel="Workshop description"
          accessibilityHint="Describe what participants will learn and the workshop experience"
        />
        <Text style={styles.helperText}>
          Write 3-5 paragraphs. Include skill level, what you'll teach, the
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
          accessibilityLabel="Materials and services included"
          accessibilityHint="Optional. List tools, materials, and services included"
        />
        <Text style={styles.helperText}>
          Be specific: "All pottery tools, 1kg of clay, glazing materials,
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
          onChangeText={handlePriceChange}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          // Attach iOS keyboard accessory
          // Android uses KeyboardAvoidingView, tap dismiss, and drag dismiss from this screen
          inputAccessoryViewID={Platform.OS === "ios" ? NUMERIC_INPUT_ACCESSORY_ID : undefined}
          placeholderTextColor="#999"
          accessibilityLabel="Price per person in Japanese yen"
          accessibilityHint="Enter the workshop price in yen (numbers only, no dots)"
        />
      </View>

      {/* Submit Button */}
      <Pressable
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={isEditMode ? "Submit workshop updates for review" : "Submit workshop for review"}
        accessibilityHint="Saves your workshop and sends it for admin review"
        accessibilityState={{ disabled: submitting, busy: submitting }}
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
    <KeyboardDoneBar nativeID={NUMERIC_INPUT_ACCESSORY_ID} />
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
    <Modal
      visible={Boolean(singleSelectPickerConfig)}
      animationType="slide"
      transparent
      onRequestClose={closeSingleSelectPicker}
    >
      <View style={styles.selectionSheetBackdrop}>
        <Pressable
          style={styles.selectionSheetBackdropTap}
          onPress={closeSingleSelectPicker}
          accessibilityRole="button"
          accessibilityLabel="Close picker"
          accessibilityHint="Closes the selection sheet"
        />

        <View style={styles.selectionSheet} accessibilityViewIsModal>
          <View style={styles.selectionSheetHandle} />

          <View style={styles.selectionSheetHeader}>
            <Text style={styles.selectionSheetTitle}>{singleSelectPickerConfig?.title}</Text>

            <Pressable
              onPress={closeSingleSelectPicker}
              style={styles.selectionSheetClose}
              accessibilityRole="button"
              accessibilityLabel="Close picker"
            >
              <XMarkIcon size={18} color="#333" />
            </Pressable>
          </View>

          <ScrollView style={styles.selectionSheetScroll} contentContainerStyle={styles.selectionSheetScrollContent}>
            {singleSelectPickerConfig?.options.map((option) => {
              const isSelected = singleSelectPickerConfig.selectedValue === option;

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.selectionSheetOption,
                    isSelected && styles.selectionSheetOptionSelected,
                  ]}
                  onPress={() => {
                    singleSelectPickerConfig.onSelect(option);
                    closeSingleSelectPicker();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${singleSelectPickerConfig.title} option ${option}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.selectionSheetOptionText,
                      isSelected && styles.selectionSheetOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
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
  errorText: {
    fontSize: 13,
    color: "#C1121F",
    marginTop: 4,
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
  categoryChipDisabled: {
    backgroundColor: "#F0EFEC",
    borderColor: "#DDD8CF",
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
  categoryChipTextDisabled: {
    color: "#9A9488",
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
  selectionSheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  selectionSheetBackdropTap: {
    flex: 1,
  },
  selectionSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    maxHeight: "70%",
  },
  selectionSheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DDD8CF",
    marginBottom: 12,
  },
  selectionSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  selectionSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  selectionSheetClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F1E8",
  },
  selectionSheetScroll: {
    maxHeight: 420,
  },
  selectionSheetScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectionSheetOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FBFAF7",
    marginTop: 8,
  },
  selectionSheetOptionSelected: {
    backgroundColor: "#1F1F1F",
    borderColor: "#1F1F1F",
  },
  selectionSheetOptionText: {
    fontSize: 15,
    color: "#1F1F1F",
    fontWeight: "600",
  },
  selectionSheetOptionTextSelected: {
    color: "#FFFFFF",
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
