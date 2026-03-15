// Progress: this screen is implemented and integrated in the current app flow.
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
import { CameraIcon, LockClosedIcon, PencilIcon, PlusIcon } from "react-native-heroicons/outline";
import { fetchWorkshopsByOwner, deleteWorkshop } from "../services/workshopService";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import ScreenSpinner from "../components/ScreenSpinner";
import EmptyState from "../components/EmptyState";
import { COLORS } from "../styles/colors";

// Map workshop status to display label, text color, and background color
function getStatusMeta(status) {
  if (status === "approved") {
    return { label: "Approved", color: COLORS.approved, bg: COLORS.approvedBackground };
  }
  if (status === "rejected") {
    return { label: "Rejected", color: COLORS.danger, bg: COLORS.rejectedBackground };
  }
  return { label: "Pending Review", color: COLORS.pending, bg: COLORS.pendingBackground };
}

export default function MyWorkshopsScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const { currentUser } = useUser();
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
              setWorkshops((prev) => prev.filter((entry) => entry.id !== workshop.id));
              Alert.alert("Deleted", "Workshop has been removed");
            } catch (err) {
              Alert.alert("Error", err.message || "Could not delete workshop");
            }
          },
        },
      ]
    );
  };

  const renderWorkshop = ({ item }) => {
    const imageUrl = item.coverImage || (item.images && item.images.length > 0 ? item.images[0] : null);
    const statusMeta = getStatusMeta(item.status);

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
            <CameraIcon size={32} color={COLORS.imagePlaceholderIcon} />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedBadgeText}>Your Workshop</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusMeta.bg }]}> 
              <Text style={[styles.statusBadgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
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
              <Text style={styles.infoValue}>¥{Number(item.priceYen || 0).toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.editButton}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("CreateWorkshop", { workshop: item });
              }}
            >
              <Text style={styles.editButtonText}>Edit & Re-submit</Text>
            </Pressable>
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
    return <ScreenSpinner />;
  }

  // Guest mode - require sign in
  if (!authUser) {
    return (
      <EmptyState
        icon={<LockClosedIcon size={56} color={COLORS.emptyStateIcon} />}
        title="Sign in required"
        message="Sign in to create and manage your workshops"
        buttonLabel="Sign In"
        onButtonPress={() => navigation.navigate("Login")}
      />
    );
  }

  // No workshops created yet
  if (workshops.length === 0) {
    return (
      <EmptyState
        icon={<PencilIcon size={56} color={COLORS.emptyStateIcon} />}
        title="No workshops yet"
        message="Create your first workshop and submit it for admin review"
        buttonLabel="Create Workshop"
        onButtonPress={() => navigation.navigate("CreateWorkshop")}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Workshops</Text>
        <Text style={styles.headerCount}>
          {workshops.length} workshop{workshops.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={workshops}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkshop}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Pressable style={styles.fab} onPress={() => navigation.navigate("CreateWorkshop")}>
        <PlusIcon size={24} color={COLORS.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  headerCount: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.imagePlaceholderBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: {
    width: "100%",
    height: 140,
    backgroundColor: COLORS.imagePlaceholderBackground,
  },
  cardContent: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ownedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  ownedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryText,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 14,
    color: COLORS.secondaryText,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
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
    color: COLORS.secondaryText,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryText,
    backgroundColor: COLORS.primaryText,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.white,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.danger,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryText,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

