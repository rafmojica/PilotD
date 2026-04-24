import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import Auth from './src/components/Auth';
import Signup from './src/screens/Signup';

import Friends from './src/screens/ActivityScreens/Friends';
import Public from './src/screens/ActivityScreens/Public';

import Discover from './src/screens/DiscoverScreens/Discover';
import MostPopularComments from './src/screens/DiscoverScreens/MostPopularComments';
import PublicLists from './src/screens/DiscoverScreens/PublicLists';

import Search from './src/screens/Search';

import Profile from './src/screens/ProfileScreens/Profile';
import Diary from './src/screens/ProfileScreens/Diary';
import Lists from './src/screens/ProfileScreens/Lists';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const ActivityStack = createNativeStackNavigator();
const DiscoverStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function ActivityNavigator() {
  return (
    <ActivityStack.Navigator>
      <ActivityStack.Screen name="Friends" component={Friends} />
      <ActivityStack.Screen name="Public" component={Public} />
    </ActivityStack.Navigator>
  );
}

function DiscoverNavigator() {
  return (
    <DiscoverStack.Navigator>
      <DiscoverStack.Screen name="Discover" component={Discover} />
      <DiscoverStack.Screen name="MostPopularComments" component={MostPopularComments} />
      <DiscoverStack.Screen name="PublicLists" component={PublicLists} />
    </DiscoverStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="Profile" component={Profile} />
      <ProfileStack.Screen name="Diary" component={Diary} />
      <ProfileStack.Screen name="Lists" component={Lists} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Activity: 'pulse',
            Discover: 'compass',
            Search: 'search',
            Profile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00E054', // Letterboxd green — swap to your brand color
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#14181C' },
      })}
    >
      <Tab.Screen name="Activity" component={ActivityNavigator} />
      <Tab.Screen name="Discover" component={DiscoverNavigator} />
      <Tab.Screen name="Search" component={Search} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth flow — swap these out once you add real auth state */}
        <RootStack.Screen name="Auth" component={Auth} />
        <RootStack.Screen name="Signup" component={Signup} />
        <RootStack.Screen name="Main" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}