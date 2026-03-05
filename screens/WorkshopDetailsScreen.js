// screens/WorkshopDetailsScreen.js
// Detailed workshop view with cover image, info, gallery, reviews, and booking
//
// Image Loading Optimization:
// - Cover image uses expo-image with cachePolicy="disk"
// - Gallery images loaded via PictureCard component (also uses disk caching)
// - Loading state tracked separately for cover image (loadingCoverImage state)
// - ActivityIndicator spinner shown while cover image downloads
//
// Performance Enhancements:
// - Images prefetched when selected from map (MapScreen calls prefetchWorkshopImages)
// - Prefetch runs in background when user taps marker - loads images before navigating here
// - Result: Cover image displays instantly when screen opens (no waiting)
// - All images cached on device after first view (<100ms on repeat visits)
//
// Data Loading:
// - Reviews fetched with AsyncStorage fallback (offline support)
// - Wikipedia content fetched asynchronously (cultural context)
// - Workshop images queried from Firebase Storage paths
// - All data loads in parallel for better perceived performance

import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable,
  Alert,
  Platform,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { fetchReviewsForWorkshop } from "../services/reviewService";
import { createBooking } from "../services/bookingService";
import {
  getWorkshopImageUrl,
  getAllWorkshopImages,
  getAllWorkshopImagesForDisplay,
  prefetchWorkshopImages,
} from "../services/workshopService";
import ModeBadge from "../components/ModeBadge";
import ReviewCard from "../components/ReviewCard";
import PictureCard from "../components/PictureCard";
import { useAppMode } from "../context/AppModeContext";
import { useUser } from "../context/UserContext";
import { fetchWikipediaContent } from "../utils/wikipedia";

const FAV_KEY = "kyoto_favourites";

export default function WorkshopDetailsScreen({ route, navigation }) {
  const workshop = route?.params?.workshop;
  const { activeMode, modeLabel } = useAppMode();
  const { currentUser } = useUser();
  const [isFav, setIsFav] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [wikipediaContent, setWikipediaContent] = useState(null);
  const [loadingWikipedia, setLoadingWikipedia] = useState(false);
  const [workshopImages, setWorkshopImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingCoverImage, setLoadingCoverImage] = useState(true);

  // Load saved/booked status, reviews, and Wikipedia content on mount
  useEffect(() => {
    if (!workshop) return;
    
    const loadStatus = async () => {
      try {
        const favs = await AsyncStorage.getItem(FAV_KEY);
        if (favs) {
          const arr = JSON.parse(favs);
          setIsFav(arr.includes(workshop.id));
        }
      } catch (err) {
        console.log("Error loading workshop status:", err);
      }
    };

    const loadReviews = async () => {
      setLoadingReviews(true);
      try {
        const data = await fetchReviewsForWorkshop(workshop.id);
        setReviews(data);
      } catch (error) {
        console.log("Error loading reviews:", error.message);
      } finally {
        setLoadingReviews(false);
      }
    };

    const loadWikipedia = async () => {
      setLoadingWikipedia(true);
      const content = await fetchWikipediaContent(workshop.wikipediaKeyword || workshop.category);
      setWikipediaContent(content);
      setLoadingWikipedia(false);
    };

    const loadWorkshopImages = async () => {
      setLoadingImages(true);
      try {
        const displayImages = await getAllWorkshopImagesForDisplay(workshop);
        if (displayImages.length > 0) {
          setWorkshopImages(displayImages);
        } else {
          setWorkshopImages(getAllWorkshopImages(workshop));
        }
      } catch (error) {
        console.log("Error loading workshop images:", error.message);
        setWorkshopImages(getAllWorkshopImages(workshop));
      } finally {
        setLoadingImages(false);
      }
    };
    
    loadStatus();
    loadReviews();
    loadWikipedia();
    loadWorkshopImages();

    // Screen-level safety net: if user opens details directly (without map),
    // we still prefetch/cache remote images for faster gallery interactions.
    prefetchWorkshopImages(workshop);
  }, [workshop]);

  if (!workshop) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workshop data found</Text>
      </View>
    );
  }

  const handleToggleFavourite = async () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}

    try {
      const stored = await AsyncStorage.getItem(FAV_KEY);
      let favs = stored ? JSON.parse(stored) : [];
      
      if (isFav) {
        favs = favs.filter(id => id !== workshop.id);
      } else {
        favs.push(workshop.id);
      }
      
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(favs));
      setIsFav(!isFav);
    } catch (err) {
      Alert.alert("Error", "Could not update favourites");
    }
  };

  const handleBookWorkshop = async () => {
    if (isBooked) {
      Alert.alert("Already Booked", "You've already booked this workshop");
      return;
    }

    if (!workshop?.id || !workshop?.title || typeof workshop?.priceYen !== "number") {
      Alert.alert("Invalid workshop", "This workshop has incomplete data and cannot be booked.");
      return;
    }

    const saveBooking = async (translatorRequested, translatorLanguage = null) => {
      try {
        const bookingData = {
          workshopId: workshop.id,
          userId: currentUser.id,
          status: "pending",
          translator: translatorRequested ? "Yes" : "No",
          translatorLanguage,
          priceYen: workshop.priceYen,
        };
        
        await createBooking(bookingData);
        setIsBooked(true);
        Alert.alert("Success!", "Workshop booked successfully");
      } catch (err) {
        Alert.alert("Error", err.message || "Could not complete booking");
      }
    };

    const askTranslatorLanguage = () => {
      Alert.alert("Choose translator language", "Select a language for translation support", [
        { text: "English", onPress: () => saveBooking(true, "English") },
        { text: "Arabic", onPress: () => saveBooking(true, "Arabic") },
        { text: "French", onPress: () => saveBooking(true, "French") },
        { text: "Cancel", style: "cancel" },
      ]);
    };

    Alert.alert(
      "Confirm Booking",
      `Book "${workshop.title}" for ¥${workshop.priceYen.toLocaleString()}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            Alert.alert("Need translator?", "Add translator support to this booking.", [
              { text: "No", onPress: () => saveBooking(false, null) },
              { text: "Yes", onPress: askTranslatorLanguage },
              { text: "Cancel", style: "cancel" },
            ]);
          }
        }
      ]
    );
  };

  const handleShowAllReviews = () => {
    navigation.navigate("AllReviews", { reviews });
  };

    const handleShowAllPictures = () => {
      navigation.navigate("AllPictures", { images: workshopImages, imageName: workshop.title });
    };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Workshop cover image */}
        <View style={styles.imagePlaceholder}>
          {loadingCoverImage && (
            <ActivityIndicator 
              size="large" 
              color="#8B7B6B"
              style={StyleSheet.absoluteFill}
            />
          )}
          {workshopImages[0] || getWorkshopImageUrl(workshop, 0) ? (
            <Image 
              source={workshopImages[0] || getWorkshopImageUrl(workshop, 0)} 
              style={styles.coverImage} 
              contentFit="cover"
              cachePolicy="disk"
              onLoadEnd={() => setLoadingCoverImage(false)}
              accessibilityLabel="Workshop cover image"
              accessibilityRole="image"
            />
          ) : (
            <Text style={styles.imagePlaceholderText}>📸</Text>
          )}
        </View>

        {/* Workshop header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{workshop.title}</Text>
            <Text style={styles.category}>{workshop.category}</Text>
            <View style={styles.modeBadgeWrap}>
              <ModeBadge mode={activeMode} label={modeLabel} />
            </View>
          </View>
          
          <Pressable 
            onPress={handleToggleFavourite}
            style={styles.favButton}
            accessibilityRole="button"
            accessibilityLabel={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Text style={styles.favIcon}>{isFav ? "♥" : "♡"}</Text>
          </Pressable>
        </View>

        {/* Location and details grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{workshop.ward}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>2-3 hours</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Group size</Text>
            <Text style={styles.infoValue}>Max 8 people</Text>
          </View>
        </View>

        {/* Workshop pictures section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workshop Photos</Text>
            {workshopImages.length > 3 && (
              <Pressable 
                onPress={handleShowAllPictures}
                accessibilityRole="button"
                accessibilityLabel="Show all pictures"
              >
                <Text style={styles.showAllLink}>Show all</Text>
              </Pressable>
            )}
          </View>
          {loadingImages ? (
            <ActivityIndicator size="small" style={{ marginVertical: 16 }} />
          ) : workshopImages.length > 0 ? (
            <FlatList
              data={workshopImages}
              keyExtractor={(_, index) => `workshop-image-${index}`}
              renderItem={({ item }) => <PictureCard source={item} />}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <Text style={styles.noReviews}>No workshop photos uploaded yet.</Text>
          )}
        </View>

        {/* Reviews section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
          </View>
          {loadingReviews ? (
            <ActivityIndicator size="small" style={{ marginVertical: 16 }} />
          ) : reviews.length > 0 ? (
            <>
              <View style={styles.ratingBar}>
                <Text style={styles.ratingAverage}>
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                </Text>
                <Text style={styles.ratingStars}>
                  {"⭐".repeat(Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length))}
                </Text>
                <Text style={styles.reviewCount}>
                  ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                </Text>
              </View>
              <FlatList
                data={reviews.slice(0, 3)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ReviewCard 
                    name={item.name}
                    rating={item.rating}
                    text={item.text}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                contentContainerStyle={styles.horizontalList}
              />
                <Pressable 
                  onPress={handleShowAllReviews}
                  style={styles.showAllButton}
                  accessibilityRole="button"
                  accessibilityLabel="Show all reviews"
                >
                  <Text style={styles.showAllButtonText}>Show all reviews</Text>
                </Pressable>
            </>
          ) : (
            <Text style={styles.noReviews}>No reviews yet. Be the first to review!</Text>
          )}
        </View>

        {/* About this workshop */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this workshop</Text>
          <Text style={styles.description}>
            Experience authentic {workshop.category.toLowerCase()} in the heart of Kyoto's {workshop.ward}. 
            This hands-on workshop is perfect for both beginners and those with some experience.
          </Text>
          <Text style={styles.description}>
            All materials are provided, and you'll take home your own creation. Our skilled instructors 
            will guide you through traditional techniques passed down through generations.
          </Text>
        </View>

        {/* Wikipedia information */}
        {loadingWikipedia ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learn More</Text>
            <ActivityIndicator size="small" color="#1F1F1F" />
          </View>
        ) : wikipediaContent ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About {wikipediaContent.title}</Text>
            <Text style={styles.wikipediaText}>{wikipediaContent.extract}</Text>
            <Text style={styles.wikipediaNote}>
              Source: Wikipedia
            </Text>
          </View>
        ) : null}

        {/* What's included */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's included</Text>
          <Text style={styles.listItem}>• All materials and tools</Text>
          <Text style={styles.listItem}>• Expert instruction</Text>
          <Text style={styles.listItem}>• Tea and light refreshments</Text>
          <Text style={styles.listItem}>• Take your creation home</Text>
        </View>

        {workshop.isTop && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ Top Rated Workshop</Text>
          </View>
        )}

        {/* Spacing for fixed bottom button */}
        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed bottom button bar */}
      <View style={styles.fixedBottom}>
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>¥{workshop.priceYen.toLocaleString()}</Text>
          <Text style={styles.priceUnit}>Per person</Text>
        </View>

        <Pressable 
          style={[styles.bookButton, isBooked && styles.bookedButton]}
          onPress={handleBookWorkshop}
          accessibilityRole="button"
          accessibilityLabel={isBooked ? "Already booked" : "Book now"}
        >
          <Text style={styles.bookButtonText}>
            {isBooked ? "Booked" : "Book now"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 90,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  imagePlaceholder: {
    width: "100%",
    height: 260,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  header: {
    flexDirection: "row",
    padding: 18,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 6,
  },
  category: {
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  modeBadgeWrap: {
    marginTop: 8,
  },
  favButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  favIcon: {
    fontSize: 22,
    color: "#C1121F",
  },
  section: {
    marginHorizontal: 18,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  showAllLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A4DBE",
  },
    showAllButton: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: "#F5F1E8",
      alignItems: "center",
    },
    showAllButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#1A4DBE",
    },
  horizontalList: {
    paddingVertical: 8,
  },
  infoGrid: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginBottom: 20,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    padding: 14,
    backgroundColor: "#F5F1E8",
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  ratingBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  ratingAverage: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F1F1F",
  },
  ratingStars: {
    fontSize: 14,
  },
  reviewCount: {
    fontSize: 13,
    color: "#666",
  },
  noReviews: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 12,
  },
  wikipediaText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
    marginBottom: 10,
  },
  wikipediaNote: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  listItem: {
    fontSize: 15,
    color: "#333",
    marginBottom: 8,
    lineHeight: 20,
  },
  badge: {
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F4E4A3",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B08A2E",
  },
  spacer: {
    height: 20,
  },
  // Fixed bottom button bar
  fixedBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6E2DA",
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    gap: 12,
  },
  priceSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F1F1F",
  },
  priceUnit: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  bookButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    alignItems: "center",
  },
  bookedButton: {
    backgroundColor: "#4A9D5F",
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
