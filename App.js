// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./navigation/RootNavigator";
import { AppModeProvider } from "./context/AppModeContext";
import { UserProvider } from "./context/UserContext";

export default function App() {
  return (
    <UserProvider>
      <AppModeProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AppModeProvider>
    </UserProvider>
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
