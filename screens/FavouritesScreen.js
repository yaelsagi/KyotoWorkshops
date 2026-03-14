import React, { useState, useEffect } from "react";
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
import * as Haptics from "expo-haptics";
import { HeartIcon } from "react-native-heroicons/outline";
import WorkshopCard from "../components/WorkshopCard";
import ScreenSpinner from "../components/ScreenSpinner";
import { useFavourites } from "../context/FavouritesContext";
import { fetchWorkshops } from "../services/workshopService";

export default function FavouritesScreen({ navigation }) {
  const { favourites: favouriteIds, loadingFavourites, toggleFavourite } = useFavourites();
  const [favouriteWorkshops, setFavouriteWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Render each favourite workshop using the shared card component
  const renderWorkshop = ({ item }) => (
    <WorkshopCard
      workshop={item}
      onPress={() => navigation.navigate("WorkshopDetails", { workshop: item })}
      onFavouriteToggle={handleRemoveFavourite}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenSpinner />
      </SafeAreaView>
    );
  }

  if (favouriteWorkshops.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
    </SafeAreaView>
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