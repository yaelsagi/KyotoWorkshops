// Progress: the main app entry is implemented and currently stable for core flows.
// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./navigation/RootNavigator";
import { AuthProvider } from "./context/AuthContext";
import { UserCapabilitiesProvider } from "./context/UserCapabilitiesContext";
import { UserProvider } from "./context/UserContext";
import { FavouritesProvider } from "./context/FavouritesContext";

export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <FavouritesProvider>
          <UserCapabilitiesProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </UserCapabilitiesProvider>
        </FavouritesProvider>
      </UserProvider>
    </AuthProvider>
  );
}
// // App.js
// import React from "react";
// import { NavigationContainer } from "@react-navigation/native";
// import { createStackNavigator } from "@react-navigation/stack";
// import MapScreen from "./screens/MapScreen";
// import RootNavigator from "./navigation/RootNavigator";

// const Stack = createStackNavigator();

// export default function App() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator initialRouteName="Explore">
//         <Stack.Screen
//           name="Explore"
//           component={MapScreen}
//           options={{ headerShown: false }}
//         />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

