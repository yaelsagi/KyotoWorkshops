// My Workshops screen - shows workshops owned by the host
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { CameraIcon, LockClosedIcon, PencilIcon } from "react-native-heroicons/outline";

import { fetchWorkshopsByOwner, deleteWorkshop } from "../services/workshopService";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import ModeBadge from "../components/ModeBadge";
import { useAppMode } from "../context/AppModeContext";

export default function MyWorkshopsScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const { currentUser } = useUser();
  const { activeMode, modeLabel } = useAppMode();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWorkshops = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchWorkshopsByOwner(currentUser.uid);
      setWorkshops(data);
    } catch (err) {
      console.error("Error loading workshops:", err);
      setWorkshops([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadWorkshops();
    }, [loadWorkshops])
  );

  const handleDeleteWorkshop = (workshop) => {
    Alert.alert(
      "Delete Workshop",
      `Are you sure you want to delete "${workshop.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWorkshop(workshop.id);
              setWorkshops(workshops.filter(w => w.id !== workshop.id));
              Alert.alert("Deleted", "Workshop has been removed");
            } catch (err) {
              Alert.alert("Error", err.message || "Could not delete workshop");
            }
          }
        }
      ]
    );
  };

  const renderWorkshop = ({ item }) => {
    const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("WorkshopDetails", { workshop: item })}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy="disk"
            accessibilityRole="image"
            accessibilityLabel={`${item.title} workshop image`}
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <CameraIcon size={32} color="#8B7B6B" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.ownedBadge}>
            <Text style={styles.ownedBadgeText}>Your Workshop</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardCategory}>{item.category}</Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{item.ward}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Price</Text>
              <Text style={styles.infoValue}>¥{item.priceYen.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteWorkshop(item);
              }}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Guest mode - require authentication
  if (!authUser) {
    return (
      <View style={styles.centerContainer}>
        <LockClosedIcon size={56} color="#DDD" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptyText}>
          Sign in to create and manage your workshops
        </Text>
        <Pressable 
          style={styles.authButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.authButtonText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (workshops.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <PencilIcon size={56} color="#DDD" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No workshops yet</Text>
        <Text style={styles.emptyText}>
          Your hosted workshops will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Workshops</Text>
        <ModeBadge mode={activeMode} label={modeLabel} />
        <Text style={styles.headerCount}>
          {workshops.length} workshop{workshops.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={workshops}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkshop}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E2DA",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  headerCount: {
    fontSize: 14,
    color: "#666",
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E2DA",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#F5F1E8",
  },
  cardImageText: {
    fontSize: 32,
  },
  cardContent: {
    padding: 16,
  },
  ownedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E8F4F8",
    borderRadius: 8,
    marginBottom: 12,
  },
  ownedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3498db",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E6E2DA",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C1121F",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  authButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
  },
  authButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
