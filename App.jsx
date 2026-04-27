import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/config/firebase";

import Signup from "./src/screens/Signup";
import Login from "./src/screens/Login";
import Search from "./src/screens/Search";

import Friends from "./src/screens/ActivityScreens/Friends";
import Public from "./src/screens/ActivityScreens/Public";

import Discover from "./src/screens/DiscoverScreens/Discover";
import MostPopularComments from "./src/screens/DiscoverScreens/MostPopularComments";
import PublicLists from "./src/screens/DiscoverScreens/PublicLists";

import Profile from "./src/screens/ProfileScreens/Profile";
import Diary from "./src/screens/ProfileScreens/Diary";
import Lists from "./src/screens/ProfileScreens/Lists";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ActivityStack = createNativeStackNavigator();
const DiscoverStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const ActivityNavigator = () => (
  <ActivityStack.Navigator>
    <ActivityStack.Screen name="Friends" component={Friends} />
    <ActivityStack.Screen name="Public" component={Public} />
  </ActivityStack.Navigator>
);

const DiscoverNavigator = () => (
  <DiscoverStack.Navigator>
    <DiscoverStack.Screen name="Discover" component={Discover} />
    <DiscoverStack.Screen name="MostPopularComments" component={MostPopularComments} />
    <DiscoverStack.Screen name="PublicLists" component={PublicLists} />
  </DiscoverStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen name="Profile" component={Profile} />
    <ProfileStack.Screen name="Diary" component={Diary} />
    <ProfileStack.Screen name="Lists" component={Lists} />
  </ProfileStack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator>
    <Tab.Screen
      name="Activity"
      component={ActivityNavigator}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="DiscoverTab"
      component={DiscoverNavigator}
      options={{ headerShown: false, title: "Discover" }}
    />
    <Tab.Screen name="Search" component={Search} />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileNavigator}
      options={{ headerShown: false, title: "Profile" }}
    />
  </Tab.Navigator>
);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Signup" component={Signup} />
            <Stack.Screen name="Login" component={Login} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
