// navigation/RootNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TabsNavigator from "./TabsNavigator";
import WorkshopDetailsScreen from "../screens/WorkshopDetailsScreen";

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
    </RootStack.Navigator>
  );
}