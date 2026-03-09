import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { updateUserRoles } from "../services/userService";

// Storage keys used to persist user mode preferences between app sessions.
const APP_MODE_KEY = "kyoto_app_mode";
const APPROVED_ROLES_KEY = "kyoto_approved_roles";

// App always starts with learner access by default.
const DEFAULT_MODE = "learner";
const DEFAULT_ROLES = ["learner"];

// Shared context for role/mode state across screens.
const AppModeContext = createContext(null);

// Display labels for mode badges and buttons.
const MODE_LABELS = {
  learner: "Learner",
  host: "Host",
  translator: "Translator",
};

export function AppModeProvider({ children }) {
  const { currentUser } = useUser();
  const [activeMode, setActiveModeState] = useState(DEFAULT_MODE);
  const [approvedRoles, setApprovedRoles] = useState(DEFAULT_ROLES);
  const [ready, setReady] = useState(false);

  // Load saved values once on app startup or when user changes
  useEffect(() => {
    const load = async () => {
      try {
        const [storedMode, storedRoles] = await Promise.all([
          AsyncStorage.getItem(APP_MODE_KEY),
          AsyncStorage.getItem(APPROVED_ROLES_KEY),
        ]);

        // Prefer Firestore roles if available. Guests always get learner-only mode.
        let parsedRoles = DEFAULT_ROLES;
        
        if (currentUser?.roles) {
          // Convert Firestore roles object to array
          parsedRoles = Object.keys(currentUser.roles).filter(role => currentUser.roles[role]);
        } else if (currentUser && storedRoles) {
          parsedRoles = JSON.parse(storedRoles);
        }
        
        const safeRoles = Array.isArray(parsedRoles) && parsedRoles.length > 0 ? parsedRoles : DEFAULT_ROLES;

        // If saved mode is invalid for the current role list, fall back safely.
        const safeMode = storedMode && safeRoles.includes(storedMode) ? storedMode : safeRoles[0];

        setApprovedRoles(safeRoles);
        setActiveModeState(safeMode);
      } catch (err) {
        console.log("Failed loading mode settings", err);
      } finally {
        setReady(true);
      }
    };

    load();
  }, [currentUser]);

  // Switch to another mode if user is approved for it.
  const setActiveMode = async (mode) => {
    if (!approvedRoles.includes(mode)) return false;
    setActiveModeState(mode);
    try {
      await AsyncStorage.setItem(APP_MODE_KEY, mode);
    } catch (err) {
      console.log("Failed saving active mode", err);
    }
    return true;
  };

  // Grant/remove a role, keep learner as permanent baseline, and sync storage + Firestore
  const setRoleApproved = async (role, approved) => {
    if (role === "learner") return;

    setApprovedRoles((prevRoles) => {
      let updatedRoles = [...prevRoles];

      if (approved) {
        if (!updatedRoles.includes(role)) {
          updatedRoles.push(role);
        }
      } else {
        updatedRoles = updatedRoles.filter((item) => item !== role);
      }

      if (!updatedRoles.includes("learner")) {
        updatedRoles.unshift("learner");
      }

      // Update AsyncStorage cache
      AsyncStorage.setItem(APPROVED_ROLES_KEY, JSON.stringify(updatedRoles)).catch(() => {});

      // Update Firestore if user is authenticated
      if (currentUser?.uid) {
        const rolesObject = {
          learner: updatedRoles.includes("learner"),
          host: updatedRoles.includes("host"),
          translator: updatedRoles.includes("translator"),
        };
        updateUserRoles(currentUser.uid, rolesObject).catch((error) => {
          console.error("Failed to update Firestore roles:", error);
        });
      }

      if (!updatedRoles.includes(activeMode)) {
        setActiveModeState("learner");
        AsyncStorage.setItem(APP_MODE_KEY, "learner").catch(() => {});
      }

      return updatedRoles;
    });
  };

  // Memoize provider data so consumers don't re-render unless relevant state changes.
  const contextValue = useMemo(
    () => ({
      ready,
      activeMode,
      approvedRoles,
      setActiveMode,
      setRoleApproved,
      modeLabel: MODE_LABELS[activeMode] || "Learner",
    }),
    [ready, activeMode, approvedRoles]
  );

  return <AppModeContext.Provider value={contextValue}>{children}</AppModeContext.Provider>;
}

// Convenience hook so screens/components can read/update app mode safely.
export function useAppMode() {
  const ctx = useContext(AppModeContext);
  if (!ctx) {
    throw new Error("useAppMode must be used within AppModeProvider");
  }
  return ctx;
}

export { MODE_LABELS };