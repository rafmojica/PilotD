// src/Screens/ActivityScreens/Friends.jsx

import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";

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

const ActivityCard = ({ item }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Image source={{ uri: item.friend.avatarUrl }} style={styles.avatar} />
      <View style={styles.headerText}>
        <Text style={styles.friendName}>
          {item.friend.displayName}{" "}
          <Text style={styles.actionLabel}>{getActivityLabel(item)}</Text>
        </Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </View>

    <View style={styles.showRow}>
      <Image source={{ uri: item.show.posterUrl }} style={styles.poster} />
      <View style={styles.showInfo}>
        <Text style={styles.showTitle}>{item.show.title}</Text>
        <Text style={styles.showYear}>{item.show.year}</Text>
        {item.rating !== undefined && <StarRating rating={item.rating} />}
        {item.review ? (
          <Text style={styles.reviewText} numberOfLines={3}>
            {item.review}
          </Text>
        ) : null}
      </View>
    </View>

    <View style={styles.cardFooter}>
      <TouchableOpacity style={styles.footerBtn}>
        <Text style={styles.footerIcon}>♥</Text>
        <Text style={styles.footerCount}>{item.likeCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerBtn}>
        <Text style={styles.footerIcon}>💬</Text>
        <Text style={styles.footerCount}>{item.commentCount}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const Friends = () => {
  const [activities] = useState(MOCK_FRIEND_ACTIVITY);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
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
          renderItem={({ item }) => <ActivityCard item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default Friends;

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0f0f13",
  surface: "#1a1a22",
  border: "#2a2a36",
  accent: "#e8c97e",
  text: "#f0eeea",
  muted: "#888898",
  star: "#e8c97e",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  list: { paddingVertical: 12, paddingHorizontal: 16, gap: 12 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
  },
  headerText: { flex: 1 },
  friendName: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  actionLabel: { color: COLORS.muted, fontWeight: "400" },
  timestamp: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  showRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  poster: {
    width: 56,
    height: 84,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  showInfo: { flex: 1, gap: 4 },
  showTitle: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  showYear: { color: COLORS.muted, fontSize: 12 },
  stars: { color: COLORS.star, fontSize: 14, letterSpacing: 1 },
  reviewText: { color: COLORS.text, fontSize: 13, lineHeight: 18, opacity: 0.85 },

  cardFooter: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 14 },
  footerCount: { color: COLORS.muted, fontSize: 13 },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "600" },
  emptySubtitle: { color: COLORS.muted, fontSize: 14, textAlign: "center" },
});