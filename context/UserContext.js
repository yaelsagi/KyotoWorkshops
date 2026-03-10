import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getUserProfile } from "../services/userService";

// Create the user context
const UserContext = createContext();

// Provider component that wraps the app
export const UserProvider = ({ children }) => {
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserProfile() {
      if (!authUser) {
        // Guest mode - no authenticated user yet
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        // Load the full user profile from Firestore to get all the details
        const profile = await getUserProfile(authUser.uid);
        
        if (profile) {
          // Combine Firebase Auth data with Firestore profile data to create a complete user object
          setCurrentUser({
            id: authUser.uid,
            uid: authUser.uid,
            name: profile.displayName || authUser.displayName,
            email: authUser.email,
            displayName: profile.displayName || authUser.displayName,
            photoURL: profile.photoURL || null,
            roles: profile.roles || { host: false, translator: false },
            translatorApplicationStatus: profile.translatorApplicationStatus || 'none',
            languages: profile.languages || [],
            createdAt: profile.createdAt,
          });
        } else {
          // Fallback if profile doesn't exist in Firestore (shouldn't happen normally)
          setCurrentUser({
            id: authUser.uid,
            uid: authUser.uid,
            name: authUser.displayName,
            email: authUser.email,
            displayName: authUser.displayName,
            photoURL: null,
            roles: { host: false, translator: false },
            translatorApplicationStatus: 'none',
            languages: [],
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to auth user data only if there's an error
        setCurrentUser({
          id: authUser.uid,
          uid: authUser.uid,
          name: authUser.displayName,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: null,
          roles: { host: false, translator: false },
          translatorApplicationStatus: 'none',
          languages: [],
        });
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [authUser]);

  // Update user profile
  const updateUser = (userData) => {
    setCurrentUser({
      ...currentUser,
      ...userData,
    });
  };

  return (
    <UserContext.Provider value={{ currentUser, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the user context anywhere in the app
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error(
      "useUser must be used within a UserProvider"
    );
  }
  return context;
};
