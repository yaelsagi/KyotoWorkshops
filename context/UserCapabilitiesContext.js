import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { updateUserRoles } from "../services/userService";

const USER_ROLES_KEY = "user_roles";

const UserCapabilitiesContext = createContext(null);

export function UserCapabilitiesProvider({ children }) {
  const { currentUser } = useUser();
  const [enabledRoles, setEnabledRoles] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadCapabilities = async () => {
      try {
        const storedRoles = await AsyncStorage.getItem(USER_ROLES_KEY);

        let parsedRoles = [];

        if (currentUser?.roles) {
          parsedRoles = Object.keys(currentUser.roles).filter((role) => currentUser.roles[role]);
        } else if (!currentUser && storedRoles) {
          parsedRoles = JSON.parse(storedRoles);
        }

        const safeRoles = Array.isArray(parsedRoles) ? parsedRoles : [];

        setEnabledRoles(safeRoles);
      } catch (err) {
        console.log("Failed loading capabilities", err);
        setEnabledRoles([]);
      } finally {
        setReady(true);
      }
    };

    loadCapabilities();
  }, [currentUser]);

  const setCapabilityEnabled = async (role, enabled) => {
    setEnabledRoles((prevRoles) => {
      let updatedRoles = [...prevRoles];

      if (enabled) {
        if (!updatedRoles.includes(role)) {
          updatedRoles.push(role);
        }
      } else {
        updatedRoles = updatedRoles.filter((item) => item !== role);
      }

      AsyncStorage.setItem(USER_ROLES_KEY, JSON.stringify(updatedRoles)).catch(() => {});

      if (currentUser?.uid) {
        const rolesObject = {
          host: updatedRoles.includes("host"),
          translator: updatedRoles.includes("translator"),
        };

        updateUserRoles(currentUser.uid, rolesObject).catch((error) => {
          console.error("Failed to update Firestore roles:", error);
        });
      }

      return updatedRoles;
    });
  };

  const hasCapability = (role) => enabledRoles.includes(role);

  const capabilities = useMemo(
    () => ({
      host: enabledRoles.includes("host"),
      translator: enabledRoles.includes("translator"),
    }),
    [enabledRoles]
  );

  const contextValue = useMemo(
    () => ({
      ready,
      enabledRoles,
      capabilities,
      hasCapability,
      setCapabilityEnabled,
    }),
    [ready, enabledRoles, capabilities]
  );

  return <UserCapabilitiesContext.Provider value={contextValue}>{children}</UserCapabilitiesContext.Provider>;
}

export function useUserCapabilities() {
  const context = useContext(UserCapabilitiesContext);
  if (!context) {
    throw new Error("useUserCapabilities must be used within UserCapabilitiesProvider");
  }
  return context;
}
