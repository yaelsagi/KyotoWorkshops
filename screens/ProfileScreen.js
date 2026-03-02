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
  Share
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import ModeBadge from "../components/ModeBadge";
import { MODE_LABELS, useAppMode } from "../context/AppModeContext";
import { useUser } from "../context/UserContext";
import { fetchUserBookings } from "../services/bookingService";

const FAV_KEY = "kyoto_favourites";

export default function ProfileScreen() {
  const { activeMode, approvedRoles, setActiveMode, setRoleApproved, modeLabel } = useAppMode();
  const { currentUser } = useUser();
  const [stats, setStats] = useState({
    favourites: 0,
    bookings: 0
  });
  const [notifications, setNotifications] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const favs = await AsyncStorage.getItem(FAV_KEY);
      const bookingsData = await fetchUserBookings(currentUser.id);
      
      setStats({
        favourites: favs ? JSON.parse(favs).length : 0,
        bookings: bookingsData ? bookingsData.length : 0
      });
    } catch (err) {
      console.log("Error loading stats:", err);
    }
  }, [currentUser.id]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will remove all your favourites and bookings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([FAV_KEY, BOOKINGS_KEY]);
              setStats({ favourites: 0, bookings: 0 });
              Alert.alert("Success", "All data has been cleared");
            } catch (err) {
              Alert.alert("Error", "Could not clear data");
            }
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.userName}>Workshop Explorer</Text>
        <Text style={styles.userEmail}>user@example.com</Text>
        <View style={styles.modeBadgeWrap}>
          <ModeBadge mode={activeMode} label={modeLabel} />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.bookings}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.favourites}</Text>
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
          <Text style={styles.menuIcon}>✏️</Text>
          <Text style={styles.menuText}>Edit Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable 
          style={styles.menuItem}
          onPress={() => Alert.alert("Coming Soon", "This feature is not yet available")}
        >
          <Text style={styles.menuIcon}>🔒</Text>
          <Text style={styles.menuText}>Change Password</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>

        <Pressable style={styles.menuItem} onPress={handleClearData}>
          <Text style={styles.menuIcon}>🗑️</Text>
          <Text style={styles.menuText}>Clear All Data</Text>
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
        onPress={() => Alert.alert("Logout", "Logout functionality coming soon")}
      >
        <Text style={styles.logoutText}>Log Out</Text>
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
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 40,
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
    fontSize: 20,
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
  version: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    color: "#999",
  },
});
