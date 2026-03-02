// navigation/RootNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TabsNavigator from "./TabsNavigator";
import WorkshopDetailsScreen from "../screens/WorkshopDetailsScreen";
import AllReviewsScreen from "../screens/AllReviewsScreen";
import AllPicturesScreen from "../screens/AllPicturesScreen";

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <RootStack.Navigator>
      {/* Tabs stay here */}
      <RootStack.Screen
        name="Tabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />

      {/* Details is OUTSIDE tabs -> tab bar disappears automatically */}
      <RootStack.Screen
        name="WorkshopDetails"
        component={WorkshopDetailsScreen}
        options={{ title: "Workshop" }}
      />

      {/* All reviews screen */}
      <RootStack.Screen
        name="AllReviews"
        component={AllReviewsScreen}
        options={{ 
          title: "Reviews",
          headerBackTitleVisible: false 
        }}
      />

      {/* All pictures screen */}
      <RootStack.Screen
        name="AllPictures"
        component={AllPicturesScreen}
        options={{ 
          title: "Photos",
          headerBackTitleVisible: false 
        }}
      />
    </RootStack.Navigator>
  );
}