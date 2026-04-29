import React, { useState, useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./src/config/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";

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
import Settings from "./src/screens/ProfileScreens/Settings";
import EditProfile from "./src/screens/ProfileScreens/EditProfile";
import TotpSetup from "./src/screens/TotpSetup";

import ShowCard from "./src/screens/ShowCard";
import EpisodeCard from "./src/screens/EpisodeCard";
import UserProfile from "./src/screens/ActivityScreens/UserProfile";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ActivityStack = createNativeStackNavigator();
const DiscoverStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const ActivityNavigator = () => (
  <ActivityStack.Navigator screenOptions={{ headerShown: false }}>
    <ActivityStack.Screen name="Friends" component={Friends} />
    <ActivityStack.Screen name="Public" component={Public} />
  </ActivityStack.Navigator>
);

const DiscoverNavigator = () => (
  <DiscoverStack.Navigator screenOptions={{ headerShown: false }}>
    <DiscoverStack.Screen name="Discover" component={Discover} />
    <DiscoverStack.Screen name="MostPopularComments" component={MostPopularComments} />
    <DiscoverStack.Screen name="PublicLists" component={PublicLists} />
  </DiscoverStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="Profile" component={Profile} />
    <ProfileStack.Screen name="Diary" component={Diary} />
    <ProfileStack.Screen name="Lists" component={Lists} />
    <ProfileStack.Screen name="TotpSetup" component={TotpSetup} />
    <ProfileStack.Screen name="Settings" component={Settings} options={{ presentation: "modal" }} />
    <ProfileStack.Screen name="EditProfile" component={EditProfile} options={{ presentation: "modal" }} />
  </ProfileStack.Navigator>
);

const TAB_ICONS = {
  Activity: ["pulse", "pulse-outline"],
  DiscoverTab: ["compass", "compass-outline"],
  Search: ["search", "search-outline"],
  ProfileTab: ["person-circle", "person-circle-outline"],
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color }) => {
        const [active, inactive] = TAB_ICONS[route.name] ?? ["ellipse", "ellipse-outline"];
        return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
      },
      tabBarActiveTintColor: "#52B788",
      tabBarInactiveTintColor: "#40916C",
      tabBarStyle: {
        backgroundColor: "#081C15",
        borderTopColor: "rgba(82,183,136,0.12)",
        borderTopWidth: 1,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: "500",
        letterSpacing: 0.3,
      },
    })}
  >
    <Tab.Screen name="Activity" component={ActivityNavigator} />
    <Tab.Screen
      name="DiscoverTab"
      component={DiscoverNavigator}
      options={{ title: "Discover" }}
    />
    <Tab.Screen name="Search" component={Search} />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileNavigator}
      options={{ title: "Profile" }}
    />
  </Tab.Navigator>
);

const App = () => {
  const [authUser, setAuthUser] = useState(undefined); // undefined = loading
  const [totpPending, setTotpPending] = useState(false);
  const totpVerifiedRef = useRef(false);

  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

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

  if (authUser === undefined || !fontsLoaded) return null;

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
        <Stack.Screen name="EpisodeCard" component={EpisodeCard} />
        <Stack.Screen name="UserProfile" component={UserProfile} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
