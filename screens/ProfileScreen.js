import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Switch,
  Share,
  ActionSheetIOS,
  Image,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { 
  UserCircleIcon, 
  CameraIcon, 
  ShareIcon, 
  QuestionMarkCircleIcon, 
  ShieldCheckIcon, 
  InformationCircleIcon,
  PencilIcon,
  LockClosedIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from 'react-native-heroicons/outline';
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useFavourites } from "../context/FavouritesContext";
import { signOutUser } from "../services/authService";
import { uploadUserProfilePhoto, deleteUserProfilePhoto } from "../services/storageService";
import { updateUserPhotoURL } from "../services/userService";
import { TRANSLATOR_STATUS_LABELS } from "../constants/translatorOptions";
import ProfileMenuItem from "../components/ProfileMenuItem";
import { COLORS } from "../styles/colors";

export default function ProfileScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const { currentUser, updateUser, loading: loadingUser } = useUser();
  const { favourites, clearFavourites } = useFavourites();
  const [notifications, setNotifications] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const PHOTO_OPERATION_TIMEOUT_MS = 30000;
  const translatorStatus = currentUser?.translatorApplication?.status || "none";
  const translatorButtonLabel = TRANSLATOR_STATUS_LABELS[translatorStatus] || "Become a Translator";
  const isTranslatorApproved = currentUser?.roles?.translator === true && currentUser?.translatorProfile?.enabled === true;
  const isHostEnabled = currentUser?.roles?.host === true;
  const isAdmin = currentUser?.roles?.admin === true;

  const translatorStatusBanner = (() => {
    if (translatorStatus === "none") {
      return null;
    }

    if (translatorStatus === "approved") {
      return {
        text: "Translator approved. You can receive booking assignments.",
        style: styles.translatorBannerApproved,
        textStyle: styles.translatorBannerApprovedText,
      };
    }

    if (translatorStatus === "rejected") {
      return {
        text: "Application rejected. You can update details and apply again.",
        style: styles.translatorBannerRejected,
        textStyle: styles.translatorBannerRejectedText,
      };
    }

    if (translatorStatus === "interview_scheduled") {
      const interviewAt = currentUser?.translatorApplication?.interviewAt;
      return {
        text: interviewAt
          ? `Interview scheduled: ${interviewAt}. Awaiting final review.`
          : "Interview scheduled. Awaiting final review.",
        style: styles.translatorBannerPending,
        textStyle: styles.translatorBannerPendingText,
      };
    }

    return {
      text: "Application received. Awaiting interview scheduling.",
      style: styles.translatorBannerPending,
      textStyle: styles.translatorBannerPendingText,
    };
  })();

  // Prevent indefinite loading states when network/storage operations hang
  const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      });
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  // Gate admin review access
  const handleOpenAdminReview = () => {
    if (!authUser) {                        
      Alert.alert(
        "Admin Access",
        "Please sign in for admin access.",
        [
          {
            text: "Sign In",
            onPress: () => navigation.navigate("Login", { redirectTo: "AdminReview" }),
          },
          {
            text: "Create Account",
            onPress: () => navigation.navigate("SignUp", { redirectTo: "AdminReview" }),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    if (!isAdmin) {
      Alert.alert("Admin Access", "Admin access is restricted to admin accounts.");
      return;
    }

    navigation.navigate("AdminReview");
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOutUser();
            } catch (err) {
              Alert.alert("Error", err.message || "Could not sign out");
            }
          }
        }
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will remove all your favourites and bookings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearFavourites();
            Alert.alert("Success", "All data has been cleared");
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: "Check out Kyoto Workshops - discover authentic traditional craft experiences in Kyoto!",
      });
    } catch (err) {
      console.log(err);
    }
  };

  const handleAbout = () => {
    Alert.alert(
      "About Kyoto Workshops",
      "Version 1.0.0\n\nDiscover and book authentic traditional craft workshops in Kyoto, Japan.\n\n© 2026 Kyoto Workshops",
      [{ text: "OK" }]
    );
  };

  // Show photo action options
  const handleChangePhoto = () => {
    if (Platform.OS === 'ios') {
      // Use the native iOS action sheet for a better user experience
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take a Photo', 'Select from Library', 'Remove Photo', 'Cancel'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            handleTakePhoto();
          } else if (buttonIndex === 1) {
            handlePickFromLibrary();
          } else if (buttonIndex === 2) {
            handleRemovePhoto();
          }
        }
      );
    } else {
      // Android doesn't have ActionSheetIOS, so use Alert with buttons
      Alert.alert(
        'Change Photo',
        'Choose how you want to update your profile photo',
        [
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Library', onPress: handlePickFromLibrary },
          { 
            text: 'Remove Photo', 
            onPress: handleRemovePhoto,
            style: 'destructive'
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  // Take profile photo via camera
  const handleTakePhoto = async () => {
    try {
      // Request camera permissions 
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to take photos');
        return;
      }

      // Open front Camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        cameraType: ImagePicker.CameraType.front,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Could not take photo. Please try again.');
    }
  };

  // Choose profile photo from device's library
  const handlePickFromLibrary = async () => {
    try {
      // Request media library permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Photo library access is needed to choose photos');
        return;
      }

      // Launch the image picker to select a photo
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadPhoto(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Could not select photo. Please try again.');
    }
  };

  // Upload photo and sync profile url
  const uploadPhoto = async (imageAsset) => {
    if (!currentUser?.uid) {
      Alert.alert('Error', 'You must be logged in to update your photo');
      return;
    }

    setUploadingPhoto(true);

    try {
      // If user has an existing photo, delete it first to avoid storage clutter
      if (currentUser?.photoURL) {
        try {
          await withTimeout(
            deleteUserProfilePhoto(currentUser.uid),
            PHOTO_OPERATION_TIMEOUT_MS,
            'Timed out while removing old profile photo'
          );
        } catch (error) {
          console.warn('Could not delete old photo, proceeding anyway:', error);
        }
      }

      // Upload the new photo to Firebase Storage
      const downloadUrl = await withTimeout(
        uploadUserProfilePhoto(currentUser.uid, imageAsset),
        PHOTO_OPERATION_TIMEOUT_MS,
        'Timed out while uploading profile photo'
      );

      // Append timestamp to bypass cached avatar
      const freshUrl = `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      
      // Update the user's profile in Firestore with the new photo URL
      await withTimeout(
        updateUserPhotoURL(currentUser.uid, freshUrl),
        PHOTO_OPERATION_TIMEOUT_MS,
        'Timed out while saving profile photo'
      );
      
      // Update the local user context so the UI shows the new photo immediately
      updateUser({ photoURL: freshUrl });
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', error.message || 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Remove profile photo
  const handleRemovePhoto = async () => {
    if (!currentUser?.uid) {
      return;
    }

    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingPhoto(true);
            try {
              // Delete the photo from Firebase Storage
              await withTimeout(
                deleteUserProfilePhoto(currentUser.uid),
                PHOTO_OPERATION_TIMEOUT_MS,
                'Timed out while removing profile photo'
              );
              
              // Remove the photo URL from the user's Firestore profile
              await withTimeout(
                updateUserPhotoURL(currentUser.uid, null),
                PHOTO_OPERATION_TIMEOUT_MS,
                'Timed out while clearing profile photo'
              );
              
              // Update the local user context immediately
              updateUser({ photoURL: null });
              
              Alert.alert('Success', 'Profile photo removed');
            } catch (error) {
              console.error('Error removing photo:', error);
              Alert.alert('Error', 'Could not remove photo. Please try again.');
            } finally {
              setUploadingPhoto(false);
            }
          }
        }
      ]
    );
  };

  if (!authUser) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Guest Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <UserCircleIcon size={60} color={COLORS.tertiaryText} />
          </View>
          <Text style={styles.userName}>Guest</Text>
          <Text style={styles.userEmail}>Sign in to access all features</Text>
        </View>

        {/* Stats Cards - Show favorites only */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{favourites.length}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </View>

        {/* Authentication Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <Pressable 
            style={styles.authButton}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </Pressable>

          <Pressable 
            style={styles.authButtonSecondary}
            onPress={() => navigation.navigate("SignUp")}
          >
            <Text style={styles.authButtonSecondaryText}>Create Account</Text>
          </Pressable>

          <Text style={styles.authHelpText}>
            Sign in to book workshops, create your own workshops, and access all features
          </Text>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingHelp}>Get updates about workshops</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
            />
          </View>

          <ProfileMenuItem icon={<ShareIcon size={24} color={COLORS.primaryText} />} label="Share App" onPress={handleShare} />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <ProfileMenuItem icon={<QuestionMarkCircleIcon size={24} color={COLORS.primaryText} />} label="Help & FAQ" onPress={() => Alert.alert("Help", "For support, please contact support@kyotoworkshops.com")} />
          <ProfileMenuItem icon={<ShieldCheckIcon size={24} color={COLORS.primaryText} />} label="Privacy Policy" onPress={() => Alert.alert("Privacy Policy", "View our privacy policy at kyotoworkshops.com/privacy")} />
          <ProfileMenuItem icon={<InformationCircleIcon size={24} color={COLORS.primaryText} />} label="About" onPress={handleAbout} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer / Demo</Text>

          <ProfileMenuItem icon={<ShieldCheckIcon size={24} color={COLORS.primaryText} />} label="Admin Review" onPress={handleOpenAdminReview} />
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loadingUser && !currentUser) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.profileLoadingState}>
          <ActivityIndicator size="large" color={COLORS.primaryText} />
          <Text style={styles.profileLoadingText}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Authenticated mode - user is signed in
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {uploadingPhoto ? (
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color={COLORS.primaryText} />
              </View>
            ) : currentUser?.photoURL ? (
              <Image 
                source={{ uri: currentUser.photoURL }} 
                style={styles.avatarImage}
              />
            ) : (
              <UserCircleIcon size={60} color={COLORS.tertiaryText} />
            )}
          </View>
          {/* Edit photo button - shows at bottom center of avatar */}
          <Pressable 
            style={styles.cameraButton}
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
          >
            <CameraIcon size={16} color={COLORS.primaryText} />
            <Text style={styles.cameraButtonText}>
              {currentUser?.photoURL ? 'Edit' : 'Add Photo'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.userName}>
          {currentUser?.displayName || currentUser?.name || authUser?.displayName || 'User'}
        </Text>
        <Text style={styles.userEmail}>{authUser?.email || 'user@example.com'}</Text>
      </View>

      {translatorStatusBanner ? (
        <View style={[styles.translatorBanner, translatorStatusBanner.style]}>
          <Text style={[styles.translatorBannerText, translatorStatusBanner.textStyle]}>
            {translatorStatusBanner.text}
          </Text>
        </View>
      ) : null}

      {/* Action Cards */}
      <View style={styles.statsContainer}>
        <Pressable 
          style={styles.statCard}
          onPress={() => {
            if (isTranslatorApproved) {
              navigation.navigate("TranslatorDashboard");
            } else if (translatorStatus === "pending" || translatorStatus === "interview_scheduled") {
              Alert.alert("Application in progress", "Your translator application is under review.");
            } else {
              navigation.navigate("TranslatorSetup");
            }
          }}
        >
          <Text style={styles.statEmoji}>🌐</Text>
          <Text style={styles.statLabel}>
            {translatorButtonLabel}
          </Text>
        </Pressable>
        <Pressable 
          style={styles.statCard}
          onPress={() =>
            isHostEnabled
              ? navigation.navigate("MyWorkshops")
              : navigation.navigate("CreateWorkshop")
          }
        >
          <Text style={styles.statEmoji}>🎨</Text>
          <Text style={styles.statLabel}>
            {isHostEnabled ? "Workshop Host Dashboard" : "Host a Workshop"}
          </Text>
        </Pressable>
      </View>


      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingHelp}>Get updates about your bookings</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>

        <ProfileMenuItem icon={<ShareIcon size={24} color={COLORS.primaryText} />} label="Share App" onPress={handleShare} />
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <ProfileMenuItem icon={<PencilIcon size={24} color={COLORS.primaryText} />} label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
        <ProfileMenuItem icon={<LockClosedIcon size={24} color={COLORS.primaryText} />} label="Change Password" onPress={() => navigation.navigate("ChangePassword")} />
        <ProfileMenuItem icon={<TrashIcon size={24} color={COLORS.primaryText} />} label="Clear All Data" onPress={handleClearData} />
        <ProfileMenuItem icon={<ExclamationTriangleIcon size={24} color={COLORS.danger} />} label="Delete Account" onPress={() => navigation.navigate("DeleteAccount")} danger />
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <ProfileMenuItem icon={<QuestionMarkCircleIcon size={24} color={COLORS.primaryText} />} label="Help & FAQ" onPress={() => Alert.alert("Help", "For support, please contact support@kyotoworkshops.com")} />
        <ProfileMenuItem icon={<ShieldCheckIcon size={24} color={COLORS.primaryText} />} label="Privacy Policy" onPress={() => Alert.alert("Privacy Policy", "View our privacy policy at kyotoworkshops.com/privacy")} />
        <ProfileMenuItem icon={<InformationCircleIcon size={24} color={COLORS.primaryText} />} label="About" onPress={handleAbout} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer / Demo</Text>

        <ProfileMenuItem icon={<ShieldCheckIcon size={24} color={COLORS.primaryText} />} label="Admin Review" onPress={handleOpenAdminReview} />
      </View>

      {/* Logout Button */}
      <Pressable 
        style={styles.logoutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    paddingBottom: 40,
  },
  profileLoadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  profileLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.imagePlaceholderBackground,
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  spinnerContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryText,
    gap: 4,
  },
  cameraButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryText,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  translatorBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  translatorBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  translatorBannerPending: {
    backgroundColor: COLORS.pendingBackground,
    borderColor: COLORS.pending,
  },
  translatorBannerPendingText: {
    color: COLORS.pending,
  },
  translatorBannerApproved: {
    backgroundColor: COLORS.approvedBackground,
    borderColor: COLORS.approved,
  },
  translatorBannerApprovedText: {
    color: COLORS.approved,
  },
  translatorBannerRejected: {
    backgroundColor: COLORS.rejectedBackground,
    borderColor: COLORS.danger,
  },
  translatorBannerRejectedText: {
    color: COLORS.danger,
  },
  statCard: {
    flex: 1,
    padding: 18,
    backgroundColor: COLORS.imagePlaceholderBackground,
    borderRadius: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 4,
    ...Platform.select({
      ios: {
        fontFamily: 'Apple Color Emoji',
      },
      android: {
        fontFamily: 'Noto Color Emoji',
      },
    }),
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.secondaryText,
    fontWeight: "600",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginTop: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primaryText,
    marginBottom: 2,
  },
  settingHelp: {
    fontSize: 13,
    color: COLORS.secondaryText,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 30,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.danger,
  },
  authButton: {
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.primaryText,
    alignItems: "center",
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  authButtonSecondary: {
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryText,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  authButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryText,
  },
  authHelpText: {
    marginTop: 16,
    fontSize: 13,
    color: COLORS.secondaryText,
    textAlign: "center",
    lineHeight: 20,
  },
  version: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    color: COLORS.tertiaryText,
  },
});
