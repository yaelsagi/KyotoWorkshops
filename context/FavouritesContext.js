// context/FavouritesContext.js
// Shared favourites state management across the app
// Provides single source of truth for workshop favourites
// Automatically syncs with AsyncStorage for offline persistence

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys for favourites persistence
const FAV_KEY = "favourites";
const LEGACY_FAV_KEY = "kyoto_favourites";

// Create context for favourites state
const FavouritesContext = createContext(null);

/**
 * FavouritesProvider
 * Wraps the app to provide shared favourites state
 * Loads favourites from AsyncStorage on mount
 * Persists changes to AsyncStorage automatically
 */
export function FavouritesProvider({ children }) {
  // Array of workshop IDs that are favourited
  const [favourites, setFavourites] = useState([]);
  
  // Loading state for initial load from AsyncStorage
  const [loadingFavourites, setLoadingFavourites] = useState(true);

  // Load favourites from AsyncStorage on mount
  useEffect(() => {
    const loadFavourites = async () => {
      try {
        // Try new key first, fallback to legacy key
        const stored = (await AsyncStorage.getItem(FAV_KEY)) || (await AsyncStorage.getItem(LEGACY_FAV_KEY));
        if (stored) {
          const ids = JSON.parse(stored);
          setFavourites(Array.isArray(ids) ? ids : []);
        } else {
          setFavourites([]);
        }
      } catch (err) {
        console.log("Error loading favourites:", err);
        setFavourites([]);
      } finally {
        setLoadingFavourites(false);
      }
    };

    loadFavourites();
  }, []);

  // Save favourites to AsyncStorage whenever they change
  // Writes to both keys for backwards compatibility
  useEffect(() => {
    // Skip saving on initial load
    if (loadingFavourites) return;

    const saveFavourites = async () => {
      try {
        const serialized = JSON.stringify(favourites);
        await Promise.all([
          AsyncStorage.setItem(FAV_KEY, serialized),
          AsyncStorage.setItem(LEGACY_FAV_KEY, serialized),
        ]);
      } catch (err) {
        console.log("Error saving favourites:", err);
      }
    };

    saveFavourites();
  }, [favourites, loadingFavourites]);

  /**
   * Check if a workshop is favourited
   * @param {string} workshopId - Workshop ID to check
   * @returns {boolean} - True if workshop is favourited
   */
  const isFavourited = useCallback((workshopId) => {
    return favourites.includes(workshopId);
  }, [favourites]);

  /**
   * Toggle favourite status for a workshop
   * Adds if not favourited, removes if already favourited
   * @param {string} workshopId - Workshop ID to toggle
   */
  const toggleFavourite = useCallback((workshopId) => {
    setFavourites(prev => {
      if (prev.includes(workshopId)) {
        // Remove from favourites
        return prev.filter(id => id !== workshopId);
      } else {
        // Add to favourites
        return [...prev, workshopId];
      }
    });
  }, []);

  /**
   * Clear all favourites
   * Removes all workshops from favourites list
   */
  const clearFavourites = useCallback(() => {
    setFavourites([]);
  }, []);

  const value = {
    favourites,
    loadingFavourites,
    isFavourited,
    toggleFavourite,
    clearFavourites,
  };

  return (
    <FavouritesContext.Provider value={value}>
      {children}
    </FavouritesContext.Provider>
  );
}

/**
 * Custom hook to access favourites context
 * Must be used within FavouritesProvider
 * @returns {object} - Favourites context value
 */
export function useFavourites() {
  const context = useContext(FavouritesContext);
  if (!context) {
    throw new Error("useFavourites must be used within FavouritesProvider");
  }
  return context;
}
