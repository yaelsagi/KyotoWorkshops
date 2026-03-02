// navigation/TabsNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, Platform } from "react-native";

import MapScreen from "../screens/MapScreen";
import FavouritesScreen from "../screens/FavouritesScreen";
import BookingsScreen from "../screens/BookingsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();

function ExploreStackNavigator() {
  return (
    <ExploreStack.Navigator>
      <ExploreStack.Screen
        name="ExploreMap"
        component={MapScreen}
        options={{ headerShown: false }}
      />
    </ExploreStack.Navigator>
  );
}

export default function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#1F1F1F",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#E6E2DA",
          backgroundColor: "#FFFFFF",
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          height: Platform.OS === "ios" ? 85 : 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen 
        name="Explore" 
        component={ExploreStackNavigator}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 22 }}>{focused ? "🗺️" : "🗺"}</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Favourites" 
        component={FavouritesScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 22 }}>{focused ? "♥" : "♡"}</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 22 }}>{focused ? "📅" : "📆"}</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ fontSize: 22 }}>{focused ? "👤" : "👤"}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}