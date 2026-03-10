// navigation/RootNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TabsNavigator from "./TabsNavigator";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import WorkshopDetailsScreen from "../screens/WorkshopDetailsScreen";
import AllReviewsScreen from "../screens/AllReviewsScreen";
import AllPicturesScreen from "../screens/AllPicturesScreen";
import MyWorkshopsScreen from "../screens/MyWorkshopsScreen";
import TranslatorSetupScreen from "../screens/TranslatorSetupScreen";
import CreateWorkshopScreen from "../screens/CreateWorkshopScreen";
import AdminReviewScreen from "../screens/AdminReviewScreen";

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <RootStack.Navigator>
      {/* Main app - always accessible */}
      <RootStack.Screen
        name="Tabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />

      {/* Workshop detail screens */}
      <RootStack.Screen
        name="WorkshopDetails"
        component={WorkshopDetailsScreen}
        options={{ title: "Workshop" }}
      />

      <RootStack.Screen
        name="AllReviews"
        component={AllReviewsScreen}
        options={{ 
          title: "Reviews",
          headerBackTitleVisible: false 
        }}
      />

      <RootStack.Screen
        name="AllPictures"
        component={AllPicturesScreen}
        options={{ 
          title: "Photos",
          headerBackTitleVisible: false 
        }}
      />

      <RootStack.Screen
        name="MyWorkshops"
        component={MyWorkshopsScreen}
        options={{
          title: "My Workshops",
          headerBackTitleVisible: false,
        }}
      />

      <RootStack.Screen
        name="CreateWorkshop"
        component={CreateWorkshopScreen}
        options={{
          title: "Create Workshop",
          headerBackTitleVisible: false,
        }}
      />

      <RootStack.Screen
        name="TranslatorSetup"
        component={TranslatorSetupScreen}
        options={{
          title: "Translator Setup",
          headerBackTitleVisible: false,
        }}
      />

      <RootStack.Screen
        name="AdminReview"
        component={AdminReviewScreen}
        options={{
          title: "Admin Review",
          headerBackTitleVisible: false,
        }}
      />

      {/* Auth screens - presented when needed */}
      <RootStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ 
          title: "Sign In",
          presentation: "modal",
          headerBackTitleVisible: false 
        }}
      />
      
      <RootStack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ 
          title: "Create Account",
          presentation: "modal",
          headerBackTitleVisible: false 
        }}
      />
    </RootStack.Navigator>
  );
}