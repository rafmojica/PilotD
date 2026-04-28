import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./src/config/firebase";

import Signup from "./src/screens/Signup";
import Login from "./src/screens/Login";
import TotpVerify from "./src/screens/TotpVerify";
import Search from "./src/screens/Search";

import Friends from "./src/screens/ActivityScreens/Friends";
import Public from "./src/screens/ActivityScreens/Public";

import Discover from "./src/screens/DiscoverScreens/Discover";
import MostPopularComments from "./src/screens/DiscoverScreens/MostPopularComments";
import PublicLists from "./src/screens/DiscoverScreens/PublicLists";

import Profile from "./src/screens/ProfileScreens/Profile";
import Diary from "./src/screens/ProfileScreens/Diary";
import Lists from "./src/screens/ProfileScreens/Lists";
import TotpSetup from "./src/screens/TotpSetup";

import ShowCard from "./src/screens/ShowCard";

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
    <ProfileStack.Screen name="TotpSetup" component={TotpSetup} options={{ title: "Two-Factor Auth" }} />
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
  const [authUser, setAuthUser] = useState(undefined); // undefined = loading
  const [totpPending, setTotpPending] = useState(false);
  const totpVerifiedRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!totpVerifiedRef.current) {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.data()?.totpEnabled) {
            setTotpPending(true);
          }
        }
        setAuthUser(user);
      } else {
        totpVerifiedRef.current = false;
        setTotpPending(false);
        setAuthUser(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleTotpVerified = () => {
    totpVerifiedRef.current = true;
    setTotpPending(false);
  };

  if (authUser === undefined) return null; // splash / loading

  if (authUser && totpPending) {
    return <TotpVerify onVerified={handleTotpVerified} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authUser ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Signup" component={Signup} />
            <Stack.Screen name="Login" component={Login} />
          </>
        )}
        <Stack.Screen name="ShowCard" component={ShowCard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
