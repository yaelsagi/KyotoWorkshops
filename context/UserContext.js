import React, { createContext, useContext, useState } from "react";

// Create the user context
const UserContext = createContext();

// Provider component that wraps the app
export const UserProvider = ({ children }) => {
  // In a real app, this would come from Firebase Auth or another authentication service
  // For now, using a default guest user that persists throughout the session
  const [currentUser, setCurrentUser] = useState({
    id: "user_sarah_mitchell",
    name: "Sarah Mitchell",
    email: "sarah@example.com",
    avatar: null,
  });

  // Update user profile (called after successful authentication)
  const updateUser = (userData) => {
    setCurrentUser({
      ...currentUser,
      ...userData,
    });
  };

  // Logout function (resets to default guest user)
  const logout = () => {
    setCurrentUser({
      id: "user_sarah_mitchell",
      name: "Sarah Mitchell",
      email: "sarah@example.com",
      avatar: null,
    });
  };

  return (
    <UserContext.Provider value={{ currentUser, updateUser, logout }}>
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
