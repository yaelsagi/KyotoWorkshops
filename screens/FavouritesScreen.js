import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable,
  Alert,
  Platform,
  ActivityIndicator
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { CameraIcon, HeartIcon } from "react-native-heroicons/outline";
import { useFavourites } from "../context/FavouritesContext";
import { fetchWorkshops } from "../services/workshopService";

export default function FavouritesScreen({ navigation }) {
  const { favourites: favouriteIds, loadingFavourites, toggleFavourite } = useFavourites();
  const [favouriteWorkshops, setFavouriteWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageLoadingStates, setImageLoadingStates] = useState({});

  // Load workshop details when favourites change
  useEffect(() => {
    const loadWorkshopDetails = async () => {
      setLoading(true);
      try {
        if (favouriteIds.length === 0) {
          setFavouriteWorkshops([]);
        } else {
          const workshops = await fetchWorkshops();
          const favWorkshops = workshops.filter(w => favouriteIds.includes(w.id));
          setFavouriteWorkshops(favWorkshops);
        }
      } catch (err) {
        console.log("Error loading favourite workshops:", err);
        setFavouriteWorkshops([]);
      } finally {
        setLoading(false);
      }
    };

    if (!loadingFavourites) {
      loadWorkshopDetails();
    }
  }, [favouriteIds, loadingFavourites]);

  const handleRemoveFavourite = (workshopId) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}

    Alert.alert(
      "Remove from favourites?",
      "This workshop will be removed from your saved list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            toggleFavourite(workshopId);
          }
        }
      ]
    );
  };

  const renderWorkshop = ({ item }) => {
    const isImageLoading = imageLoadingStates[item.id] !== false;
    const firstImageUrl = item.images && item.images.length > 0 ? item.images[0] : null;

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("WorkshopDetails", { workshop: item })}
      >
        <View style={styles.cardImagePlaceholder}>
          {isImageLoading && (
            <ActivityIndicator 
              size="small" 
              color="#8B7B6B" 
              style={StyleSheet.absoluteFill}
            />
          )}
          {firstImageUrl ? (
            <Image 
              source={{ uri: firstImageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="disk"
              onLoadStart={() => setImageLoadingStates(prev => ({ ...prev, [item.id]: true }))}
              onLoadEnd={() => setImageLoadingStates(prev => ({ ...prev, [item.id]: false }))}
              onError={() => setImageLoadingStates(prev => ({ ...prev, [item.id]: false }))}
              accessibilityLabel={`${item.title} workshop image`}
              accessibilityRole="image"
            />
          ) : (
            <CameraIcon size={36} color="#8B7B6B" />
          )}
          
          {item.isTop && (
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>Top Workshop</Text>
            </View>
          )}
        </View>
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardCategory}>{item.category}</Text>
          </View>
          
          <Pressable 
            onPress={(e) => {
              e.stopPropagation();
              handleRemoveFavourite(item.id);
            }}
            style={styles.removeButton}
          >
            <HeartIcon size={18} color="#C1121F" />
          </Pressable>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.cardLocation}>{item.ward}</Text>
          <Text style={styles.cardPrice}>¥{item.priceYen.toLocaleString()}</Text>
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

  if (favouriteWorkshops.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <HeartIcon size={56} color="#DDD" style={styles.emptyIcon} />
        <Text style={styles.emptyTitle}>No favourites yet</Text>
        <Text style={styles.emptyText}>
          Save workshops you're interested in by tapping the heart icon
        </Text>
        <Pressable 
          style={styles.exploreButton}
          onPress={() => navigation.navigate("Explore")}
        >
          <Text style={styles.exploreButtonText}>Explore Workshops</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Workshops</Text>
        <Text style={styles.headerCount}>{favouriteWorkshops.length} saved</Text>
      </View>
      
      <FlatList
        data={favouriteWorkshops}
        keyExtractor={item => item.id}
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
    height: 160,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 13,
    color: "#666",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardLocation: {
    fontSize: 13,
    color: "#666",
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  topBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F1F1F",
    letterSpacing: 0.3,
  },
  emptyIcon: {
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
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});