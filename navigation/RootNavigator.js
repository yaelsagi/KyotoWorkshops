// navigation/RootNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MapScreen from "../screens/MapScreen";
import WorkshopDetailsScreen from "../screens/WorkshopDetailsScreen";
import FavouritesScreen from "../screens/FavouritesScreen";
import BookingsScreen from "../screens/BookingsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();
const Stack = createNativeStackNavigator();

function ExploreStackNavigator() {
  return (
    <ExploreStack.Navigator>
      <ExploreStack.Screen
        name="ExploreMap"
        component={MapScreen}
        options={{ headerShown: false }}
      />
      <ExploreStack.Screen
        name="WorkshopDetails"
        component={WorkshopDetailsScreen}
        options={{ title: "Workshop" }}
      />
    </ExploreStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // we control headers in stacks
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreStackNavigator}
        options={{
          tabBarLabel: "Explore",
          // add tabBarIcon later if you want
        }}
      />
      <Tab.Screen
        name="Favourites"
        component={FavouritesScreen}
        options={{ tabBarLabel: "Favourites" }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ tabBarLabel: "Bookings" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}