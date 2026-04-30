// src/screens/ActivityScreens/Friends.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import InitialsAvatar from "../../components/InitialsAvatar";
import FadeInView from "../../components/FadeInView";
import Svg, { Path } from "react-native-svg";
import { auth } from "../../config/firebase";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_FRIEND_ACTIVITY = [
  {
    id: "1",
    friend: {
      id: "u1",
      username: "elena_watches",
      displayName: "Elena",
      avatarUrl: "https://i.pravatar.cc/150?img=47",
    },
    type: "reviewed",
    show: {
      id: "s1",
      title: "The Bear",
      year: 2022,
      posterUrl: "https://picsum.photos/seed/bear/120/180",
      season: 3,
    },
    rating: 4.5,
    review:
      "Season 3 somehow manages to top everything that came before it. The kitchen sequences are genuinely stressful in the best way.",
    timestamp: "2h ago",
    likeCount: 14,
    commentCount: 3,
  },
  {
    id: "2",
    friend: {
      id: "u2",
      username: "marco_tv",
      displayName: "Marco",
      avatarUrl: "https://i.pravatar.cc/150?img=12",
    },
    type: "watched",
    show: {
      id: "s2",
      title: "Severance",
      year: 2022,
      posterUrl: "https://picsum.photos/seed/severance/120/180",
      season: 2,
      episode: 6,
    },
    timestamp: "5h ago",
    likeCount: 7,
    commentCount: 1,
  },
  {
    id: "3",
    friend: {
      id: "u3",
      username: "priya.streams",
      displayName: "Priya",
      avatarUrl: "https://i.pravatar.cc/150?img=31",
    },
    type: "added_to_list",
    show: {
      id: "s3",
      title: "Shōgun",
      year: 2024,
      posterUrl: "https://picsum.photos/seed/shogun/120/180",
    },
    listName: "2024 Favourites",
    timestamp: "Yesterday",
    likeCount: 2,
    commentCount: 0,
  },
  {
    id: "4",
    friend: {
      id: "u1",
      username: "elena_watches",
      displayName: "Elena",
      avatarUrl: "https://i.pravatar.cc/150?img=47",
    },
    type: "liked",
    show: {
      id: "s4",
      title: "Baby Reindeer",
      year: 2024,
      posterUrl: "https://picsum.photos/seed/reindeer/120/180",
    },
    timestamp: "Yesterday",
    likeCount: 0,
    commentCount: 0,
  },
  {
    id: "5",
    friend: {
      id: "u4",
      username: "james_binge",
      displayName: "James",
      avatarUrl: "https://i.pravatar.cc/150?img=68",
    },
    type: "reviewed",
    show: {
      id: "s5",
      title: "House of the Dragon",
      year: 2022,
      posterUrl: "https://picsum.photos/seed/hotd/120/180",
      season: 2,
    },
    rating: 3,
    review: "Solid but uneven. The second half picks up massively.",
    timestamp: "2 days ago",
    likeCount: 9,
    commentCount: 5,
  },
];

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  bg: "#081C15",
  surface: "#0d2b1d",
  border: "rgba(45,106,79,0.2)",
  accent: "#52B788",
  accentPress: "rgba(82,183,136,0.05)",
  text: "#D8F3DC",
  textSec: "#95D5B2",
  muted: "#40916C",
  star: "#F4A827",
  rose: "#C4788A",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getActivityLabel = (item) => {
  switch (item.type) {
    case "watched":
      return item.show.episode
        ? `watched S${item.show.season}E${item.show.episode} of`
        : item.show.season
          ? `finished Season ${item.show.season} of`
          : "watched";
    case "reviewed":
      return "reviewed";
    case "added_to_list":
      return `added to list "${item.listName}"`;
    case "liked":
      return "liked";
    default:
      return "";
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StarRating = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push("★");
    else if (rating >= i - 0.5) stars.push("½");
    else stars.push("☆");
  }
  return <Text style={styles.stars}>{stars.join("")}</Text>;
};

const ActivityItem = ({ item, onPressUser, onPressShow }) => {
  const showThumb = item.type !== "added_to_list" && item.show?.posterUrl;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        pressed && { backgroundColor: "rgba(82,183,136,0.05)" },
      ]}
      onPress={() => onPressShow(item.show)}
    >
      <TouchableOpacity onPress={() => onPressUser(item.friend)} activeOpacity={0.7}>
        <InitialsAvatar
          name={item.friend.displayName}
          size={38}
          style={{ flexShrink: 0, borderWidth: 1.5, borderColor: "#40916C" }}
        />
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={styles.topLine}>
          <TouchableOpacity onPress={() => onPressUser(item.friend)} activeOpacity={0.7}>
            <Text style={styles.username}>{item.friend.displayName}</Text>
          </TouchableOpacity>
          <Text style={styles.action}> {getActivityLabel(item)} </Text>
          <Text style={styles.showName}>{item.show.title}</Text>
        </View>

        {item.rating !== undefined && (
          <View style={styles.ratingRow}>
            <StarRating rating={item.rating} />
          </View>
        )}

        {item.review ? (
          <View style={styles.reviewBlock}>
            <Text style={styles.reviewText} numberOfLines={3}>
              {item.review}
            </Text>
          </View>
        ) : null}

        <Text style={styles.timestamp}>{item.timestamp}</Text>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn}>
            <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.rose} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </Svg>
            <Text style={styles.footerCount}>{item.likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn}>
            <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </Svg>
            <Text style={styles.footerCount}>{item.commentCount}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showThumb && (
        <TouchableOpacity onPress={() => onPressShow(item.show)} activeOpacity={0.8}>
          <Image source={{ uri: item.show.posterUrl }} style={styles.thumb} />
        </TouchableOpacity>
      )}
    </Pressable>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const Friends = ({ navigation }) => {
  const [activities] = useState(MOCK_FRIEND_ACTIVITY);

  const handlePressUser = (friend) => {
    if (friend.id === auth.currentUser?.uid) {
      navigation.navigate("ProfileTab");
    } else {
      navigation.navigate("UserProfile", { userId: friend.id, displayName: friend.displayName });
    }
  };

  const handlePressShow = (show) => {
    navigation.navigate("ShowCard", { showId: show.id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FadeInView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Activity</Text>
          {/* BELL ICON */}
          <View style={styles.bellWrap}>
            <Svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#95D5B2"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </Svg>
            <View style={styles.bellDot} />
          </View>
        </View>

        {activities.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySubtitle}>
              Follow people to see what they are watching.
            </Text>
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ActivityItem item={item} onPressUser={handlePressUser} onPressShow={handlePressShow} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </FadeInView>
    </SafeAreaView>
  );
};

export default Friends;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.5,
  },
  bellWrap: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  bell: { fontSize: 20 },
  bellDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.rose,
  },

  item: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
    alignItems: "flex-start",
  },
  itemPressed: {
    backgroundColor: "rgba(82,183,136,0.05)",
  },
  body: { flex: 1 },
  topLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  username: { fontSize: 13, fontWeight: "600", color: C.text },
  action: { fontSize: 13, color: C.textSec },
  showName: { fontSize: 13, fontWeight: "500", color: C.accent },
  ratingRow: { marginTop: 4 },
  stars: { color: C.star, fontSize: 11, letterSpacing: 1 },
  reviewBlock: {
    marginTop: 8,
    padding: 10,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: C.accent,
  },
  reviewText: {
    fontSize: 12,
    color: C.textSec,
    lineHeight: 18,
    fontStyle: "italic",
  },
  timestamp: { fontSize: 11, color: C.muted, marginTop: 4 },
  footer: { flexDirection: "row", gap: 16, marginTop: 8 },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 13, color: C.muted },
  footerCount: { fontSize: 12, color: C.muted },
  thumb: {
    width: 42,
    height: 60,
    borderRadius: 6,
    backgroundColor: C.surface,
    flexShrink: 0,
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: "600" },
  emptySubtitle: { color: C.muted, fontSize: 14, textAlign: "center" },
});
