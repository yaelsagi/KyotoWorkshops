import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { CalendarDaysIcon, CameraIcon, LockClosedIcon } from "react-native-heroicons/outline";
import { fetchUserBookings, cancelBooking } from "../services/bookingService";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import ScreenSpinner from "../components/ScreenSpinner";
import EmptyState from "../components/EmptyState";
import { COLORS } from "../styles/colors";

export default function BookingsScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const { currentUser } = useUser();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchUserBookings(currentUser.id);
      setBookings(data);
    } catch (err) {
      console.log("Error loading bookings:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const handleCancelBooking = (booking) => {
    Alert.alert(
      "Cancel Booking",
      `Cancel your booking for "${booking.title}"?`,
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelBooking(booking.id);
              setBookings(bookings.filter(b => b.id !== booking.id));
              Alert.alert("Cancelled", "Your booking has been cancelled");
            } catch (err) {
              Alert.alert("Error", err.message || "Could not cancel booking");
            }
          }
        }
      ]
    );
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const renderBooking = ({ item }) => (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate("WorkshopDetails", { workshop: item })}
    >
      {item.workshopImage ? (
        <Image
          source={{ uri: item.workshopImage }}
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
        <View style={styles.bookedBadge}>
          <Text style={styles.bookedBadgeText}>✓ Booked</Text>
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
        
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Booked on:</Text>
          <Text style={styles.dateValue}>{formatDate(item.bookedAt)}</Text>
        </View>
        
        <Pressable 
          style={styles.cancelButton}
          onPress={(e) => {
            e.stopPropagation();
            handleCancelBooking(item);
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel Booking</Text>
        </Pressable>
      </View>
    </Pressable>
  );

  if (loading) {
    return <ScreenSpinner />;
  }

  // Guest mode - require sign in
  if (!authUser) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <EmptyState
          icon={<LockClosedIcon size={56} color={COLORS.emptyStateIcon} />}
          title="Sign in required"
          message="Sign in to view and manage your workshop bookings"
          buttonLabel="Sign In"
          onButtonPress={() => navigation.navigate("Login")}
        />
      </SafeAreaView>
    );
  }

  if (bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <EmptyState
          icon={<CalendarDaysIcon size={56} color={COLORS.emptyStateIcon} />}
          title="No bookings yet"
          message="When you book a workshop, it will appear here"
          buttonLabel="Find Workshops"
          onButtonPress={() => navigation.navigate("Explore")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerCount}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Text>
        </View>

        <FlatList
          data={bookings}
          keyExtractor={(item, index) => `${item.id}-${item.bookedAt}-${index}`}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 16,
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
  bookedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E7F5EB",
    borderRadius: 8,
    marginBottom: 12,
  },
  bookedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4A9D5F",
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  dateLabel: {
    fontSize: 13,
    color: "#666",
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C1121F",
  },
});