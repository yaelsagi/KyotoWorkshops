import React, { useState, useCallback } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
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
import ModeBadge from "../components/ModeBadge";
import { MODE_LABELS, useAppMode } from "../context/AppModeContext";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { useFavourites } from "../context/FavouritesContext";
import { fetchUserBookings } from "../services/bookingService";
import { signOutUser, deleteUserAccount } from "../services/authService";
import { uploadUserProfilePhoto, deleteUserProfilePhoto, deleteUserPhotoFolder } from "../services/storageService";
import { updateUserPhotoURL } from "../services/userService";

export default function ProfileScreen({ navigation }) {
  const { activeMode, approvedRoles, setActiveMode, setRoleApproved, modeLabel } = useAppMode();
  const { user: authUser } = useAuth();
  const { currentUser, updateUser } = useUser();
  const { favourites, clearFavourites } = useFavourites();
  const [bookingsCount, setBookingsCount] = useState(0);
  const [notifications, setNotifications] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadBookingsCount = useCallback(async () => {
    try {
      let nextBookingsCount = 0;
      if (currentUser?.id) {
        const bookingsData = await fetchUserBookings(currentUser.id);
        nextBookingsCount = bookingsData ? bookingsData.length : 0;
      }

      setBookingsCount(nextBookingsCount);
    } catch (err) {
      console.log("Error loading stats:", err);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadBookingsCount();
    }, [loadBookingsCount])
  );

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

  /**
   * Show the action sheet to choose how to update profile photo
   * Options: Take Photo, Choose from Library, Remove Photo, Cancel
   */
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

  /**
   * Open the device camera to take a new photo
   */
  const handleTakePhoto = async () => {
    try {
      // Request camera permissions first
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

  /**
   * Open the photo library to choose an existing photo
   */
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

  /**
   * Upload the selected photo to Firebase Storage and update user profile
   * If a photo already exists, delete it first before uploading the new one
   */
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
          await deleteUserProfilePhoto(currentUser.uid);
          console.log('Old profile photo deleted');
        } catch (error) {
          console.warn('Could not delete old photo, proceeding anyway:', error);
        }
      }

      // Upload the new photo to Firebase Storage
      const downloadUrl = await uploadUserProfilePhoto(currentUser.uid, imageAsset);
      
      // Update the user's profile in Firestore with the new photo URL
      await updateUserPhotoURL(currentUser.uid, downloadUrl);
      
      // Update the local user context so the UI shows the new photo immediately
      updateUser({ photoURL: downloadUrl });
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Could not upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  /**
   * Remove the user's profile photo
   */
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
              await deleteUserProfilePhoto(currentUser.uid);
              
              // Remove the photo URL from the user's Firestore profile
              await updateUserPhotoURL(currentUser.uid, null);
              
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

  /**
   * Delete the user's account completely
   * This removes: user document in Firestore, all profile photos from Storage, Firebase Auth account
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'All account data will be permanently removed.\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUploadingPhoto(true);
            try {
              if (!currentUser?.uid) {
                throw new Error('User ID not found');
              }

              // Delete all profile photos from Firebase Storage
              try {
                await deleteUserPhotoFolder(currentUser.uid);
                console.log('User photos deleted from Storage');
              } catch (error) {
                console.warn('Could not delete user photos:', error);
                // Continue anyway - Firestore and Auth deletion are more important
              }

              // Delete user account from Firebase Auth and Firestore
              await deleteUserAccount(currentUser.uid);
              console.log('User account deleted');

              // After successful deletion, the user will be signed out automatically
              // AuthContext will detect auth state change and redirect to login
              Alert.alert('Account Deleted', 'Your account has been permanently deleted');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', error.message || 'Could not delete account. Please try again.');
              setUploadingPhoto(false);
            }
          }
        }
      ]
    );
  };
  if (!authUser) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Guest Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <UserCircleIcon size={60} color="#999" />
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

          <Pressable style={styles.menuItem} onPress={handleShare}>
            <ShareIcon size={24} color="#1F1F1F" style={styles.menuIcon} />
            <Text style={styles.menuText}>Share App</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <Pressable 
            style={styles.menuItem}
            onPress={() => Alert.alert("Help", "For support, please contact support@kyotoworkshops.com")}
          >
            <QuestionMarkCircleIcon size={24} color="#1F1F1F" style={styles.menuIcon} />
            <Text style={styles.menuText}>Help & FAQ</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable 
            style={styles.menuItem}
            onPress={() => Alert.alert("Privacy Policy", "View our privacy policy at kyotoworkshops.com/privacy")}
          >
            <ShieldCheckIcon size={24} color="#1F1F1F" style={styles.menuIcon} />
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable style={styles.menuItem} onPress={handleAbout}>
            <InformationCircleIcon size={24} color="#1F1F1F" style={styles.menuIcon} />
            <Text style={styles.menuText}>About</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    );
  }

  // Authenticated mode - user is signed in
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {uploadingPhoto ? (
              <ActivityIndicator size="large" color="#1F1F1F" />
            ) : currentUser?.photoURL ? (
              <Image 
                source={{ uri: currentUser.photoURL }} 
                style={styles.avatarImage}
              />
            ) : (
              <UserCircleIcon size={60} color="#999" />
            )}
          </View>
          {/* Edit photo button - shows at bottom center of avatar */}
          <Pressable 
            style={styles.cameraButton}
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
          >
            <CameraIcon size={20} color="#1F1F1F" />
            <Text style={styles.cameraButtonText}>
              {currentUser?.photoURL ? 'Edit' : 'Add Photo'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.userName}>{currentUser?.displayName || authUser?.displayName}</Text>
        <Text style={styles.userEmail}>{authUser?.email || 'user@example.com'}</Text>
        <View style={styles.modeBadgeWrap}>
          <ModeBadge mode={activeMode} label={modeLabel} />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{bookingsCount}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{favourites.length}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Mode</Text>

        <View style={styles.settingItemColumn}>
          <Text style={styles.settingLabel}>Current mode</Text>
          <Text style={styles.settingHelp}>Switch the app view based on your approved roles</Text>

          <View style={styles.modeButtonsWrap}>
            {approvedRoles.map((role) => {
              const selected = activeMode === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => setActiveMode(role)}
                  style={[styles.modeButton, selected && styles.modeButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${MODE_LABELS[role]} mode`}
                >
                  <Text style={[styles.modeButtonText, selected && styles.modeButtonTextActive]}>
                    {MODE_LABELS[role]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Host access</Text>
            <Text style={styles.settingHelp}>Enable to manage and open workshops</Text>
          </View>
          <Switch
            value={approvedRoles.includes("host")}
            onValueChange={(value) => setRoleApproved("host", value)}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Translator access</Text>
            <Text style={styles.settingHelp}>Enable to offer translation during bookings</Text>
          </View>
          <Switch
            value={approvedRoles.includes("translator")}
            onValueChange={(value) => setRoleApproved("translator", value)}
          />
        </View>

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

        <Pressable style={styles.menuItem} onPress={handleShare}>
          <Text style={styles.menuIcon}>📤</Text>
          <Text style={styles.menuText}>Share App</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <Pressable 
          style={styles.menuItem}
          onPress={() => Alert.alert("Coming Soon", "This feature is not yet available")}
        >
          <PencilIcon size={24} color="#1F1F1F" style={styles.menuIcon} />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => Alert.alert("Coming Soon", "This feature is not yet available")}
        >
          <LockClosedIcon size={24} color="#1F1F1F" style={styles.menuIcon} />
          <Text style={styles.menuText}>Change Password</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={handleClearData}>
          <TrashIcon size={24} color="#1F1F1F" style={styles.menuIcon} />
          <Text style={styles.menuText}>Clear All Data</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable 
          style={[styles.menuItem, styles.menuItemDanger]}
          onPress={handleDeleteAccount}
        >
          <ExclamationTriangleIcon size={24} color="#C1121F" style={styles.menuIcon} />
          <Text style={[styles.menuText, styles.menuTextDanger]}>Delete Account</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <Pressable 
          style={styles.menuItem}
          onPress={() => Alert.alert("Help", "For support, please contact support@kyotoworkshops.com")}
        >
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuText}>Help & FAQ</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => Alert.alert("Privacy Policy", "View our privacy policy at kyotoworkshops.com/privacy")}
        >
          <Text style={styles.menuIcon}>🔐</Text>
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={handleAbout}>
          <Text style={styles.menuIcon}>ℹ️</Text>
          <Text style={styles.menuText}>About</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 70 : 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E6E2DA",
  },
  modeBadgeWrap: {
    marginTop: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -18,
    left: '50%',
    marginLeft: -55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1F1F1F',
    gap: 6,
  },
  cameraButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F1F1F',
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 18,
    backgroundColor: "#F5F1E8",
    borderRadius: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FBFAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    marginBottom: 12,
  },
  settingItemColumn: {
    padding: 16,
    backgroundColor: "#FBFAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 2,
  },
  settingHelp: {
    fontSize: 13,
    color: "#666",
  },
  modeButtonsWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D8D2C4",
    backgroundColor: "#FFFFFF",
  },
  modeButtonActive: {
    backgroundColor: "#1F1F1F",
    borderColor: "#1F1F1F",
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FBFAF7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    marginBottom: 8,
  },
  menuIcon: {
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  menuArrow: {
    fontSize: 24,
    color: "#999",
  },
  menuItemDanger: {
    borderColor: "#FFE6E6",
    backgroundColor: "#FFF5F5",
  },
  menuTextDanger: {
    color: "#C1121F",
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 30,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C1121F",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C1121F",
  },
  authButton: {
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  authButtonSecondary: {
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  authButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  authHelpText: {
    marginTop: 16,
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  version: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    color: "#999",
  },
});
