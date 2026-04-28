// src/screens/ActivityScreens/Public.jsx

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
  ScrollView,
} from "react-native";
import InitialsAvatar from "../../components/InitialsAvatar";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const TRENDING_SHOWS = [
  { id: "t1", title: "Andor", year: 2022, posterUrl: "https://picsum.photos/seed/andor/80/120" },
  { id: "t2", title: "The Penguin", year: 2024, posterUrl: "https://picsum.photos/seed/penguin/80/120" },
  { id: "t3", title: "Slow Horses", year: 2022, posterUrl: "https://picsum.photos/seed/slowhorses/80/120" },
  { id: "t4", title: "Mr. & Mrs. Smith", year: 2024, posterUrl: "https://picsum.photos/seed/mrsmith/80/120" },
  { id: "t5", title: "The Franchise", year: 2024, posterUrl: "https://picsum.photos/seed/franchise/80/120" },
];

const MOCK_PUBLIC_ACTIVITY = [
  {
    id: "p1",
    user: {
      id: "u10",
      username: "cinephile_kay",
      avatarUrl: "https://i.pravatar.cc/150?img=5",
      isVerified: true,
    },
    type: "reviewed",
    show: {
      id: "s10",
      title: "Andor",
      year: 2022,
      posterUrl: "https://picsum.photos/seed/andor/120/180",
      genre: "Sci-Fi",
    },
    rating: 5,
    review:
      "The most politically mature thing Star Wars has ever produced. Feels more like a Le Carré adaptation than a space opera — in the best possible way.",
    timestamp: "3h ago",
    likeCount: 312,
    commentCount: 47,
    isTrending: true,
  },
  {
    id: "p2",
    user: {
      id: "u11",
      username: "tvsommelier",
      avatarUrl: "https://i.pravatar.cc/150?img=22",
    },
    type: "reviewed",
    show: {
      id: "s11",
      title: "Slow Horses",
      year: 2022,
      posterUrl: "https://picsum.photos/seed/slowhorses/120/180",
      genre: "Thriller",
    },
    rating: 4.5,
    review:
      "Gary Oldman is doing career-best work here and somehow not a single outlet is screaming about it. Season 4 goes hard.",
    timestamp: "6h ago",
    likeCount: 198,
    commentCount: 29,
    isTrending: true,
  },
  {
    id: "p3",
    user: {
      id: "u12",
      username: "nightmode_nadia",
      avatarUrl: "https://i.pravatar.cc/150?img=9",
    },
    type: "watched",
    show: {
      id: "s12",
      title: "Mr. & Mrs. Smith",
      year: 2024,
      posterUrl: "https://picsum.photos/seed/mrsmith/120/180",
      genre: "Action",
    },
    timestamp: "8h ago",
    likeCount: 54,
    commentCount: 6,
  },
  {
    id: "p4",
    user: {
      id: "u13",
      username: "rerun_republic",
      avatarUrl: "https://i.pravatar.cc/150?img=59",
    },
    type: "added_to_list",
    show: {
      id: "s13",
      title: "The Penguin",
      year: 2024,
      posterUrl: "https://picsum.photos/seed/penguin/120/180",
      genre: "Crime",
    },
    listName: "Best Comic Adaptations Ever",
    timestamp: "10h ago",
    likeCount: 87,
    commentCount: 12,
  },
  {
    id: "p5",
    user: {
      id: "u14",
      username: "binge.theory",
      avatarUrl: "https://i.pravatar.cc/150?img=44",
      isVerified: true,
    },
    type: "reviewed",
    show: {
      id: "s14",
      title: "The Franchise",
      year: 2024,
      posterUrl: "https://picsum.photos/seed/franchise/120/180",
      genre: "Comedy",
    },
    rating: 3.5,
    review:
      "Razor sharp satire of the superhero industrial complex. Not everything lands but when it does, it's genuinely scathing.",
    timestamp: "Yesterday",
    likeCount: 143,
    commentCount: 21,
  },
];

const FILTER_OPTIONS = ["All", "Reviews", "Watched", "Lists"];

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  bg: "#081C15",
  surface: "#0d2b1d",
  card: "#1B4332",
  border: "rgba(45,106,79,0.2)",
  borderStrong: "#2D6A4F",
  accent: "#52B788",
  accentPress: "rgba(82,183,136,0.05)",
  text: "#D8F3DC",
  textSec: "#95D5B2",
  muted: "#40916C",
  star: "#F4A827",
  rose: "#C4788A",
  trending: "rgba(244,168,39,0.15)",
  trendingText: "#F4A827",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getActivityLabel = (item) => {
  switch (item.type) {
    case "reviewed":
      return "reviewed";
    case "watched":
      return "watched";
    case "added_to_list":
      return `added to list "${item.listName}"`;
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

const TrendingStrip = () => (
  <View style={styles.trendingSection}>
    <Text style={styles.trendingSectionTitle}>Trending This Week</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.trendingScroll}
    >
      {TRENDING_SHOWS.map((show) => (
        <TouchableOpacity key={show.id} style={styles.trendingCard}>
          <Image source={{ uri: show.posterUrl }} style={styles.trendingPoster} />
          <Text style={styles.trendingShowTitle} numberOfLines={2}>
            {show.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const PublicActivityCard = ({ item }) => (
  <View style={styles.card}>
    {item.isTrending && (
      <View style={styles.trendingBadge}>
        <Text style={styles.trendingBadgeText}>🔥 Trending</Text>
      </View>
    )}

    <View style={styles.cardHeader}>
      <InitialsAvatar name={item.user.username} size={36} />
      <View style={styles.headerText}>
        <Text style={styles.username}>
          @{item.user.username}
          {item.user.isVerified ? <Text style={styles.verified}> ✓</Text> : null}
        </Text>
        <Text style={styles.actionLabel}>
          {getActivityLabel(item)} · {item.timestamp}
        </Text>
      </View>
      <TouchableOpacity style={styles.followBtn}>
        <Text style={styles.followBtnText}>Follow</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.showRow}>
      <Image source={{ uri: item.show.posterUrl }} style={styles.poster} />
      <View style={styles.showInfo}>
        <Text style={styles.showTitle}>{item.show.title}</Text>
        <Text style={styles.showMeta}>
          {item.show.year}
          {item.show.genre ? ` · ${item.show.genre}` : ""}
        </Text>
        {item.rating !== undefined && <StarRating rating={item.rating} />}
        {item.review ? (
          <View style={styles.reviewBlock}>
            <Text style={styles.reviewText} numberOfLines={4}>
              {item.review}
            </Text>
          </View>
        ) : null}
      </View>
    </View>

    <View style={styles.cardFooter}>
      <TouchableOpacity style={styles.footerBtn}>
        <Text style={[styles.footerIcon, { color: C.rose }]}>♥</Text>
        <Text style={styles.footerCount}>{item.likeCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.footerBtn}>
        <Text style={styles.footerIcon}>💬</Text>
        <Text style={styles.footerCount}>{item.commentCount}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.footerBtn, { marginLeft: "auto" }]}>
        <Text style={styles.footerShare}>Share ↗</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const Public = () => {
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = MOCK_PUBLIC_ACTIVITY.filter((item) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Reviews") return item.type === "reviewed";
    if (activeFilter === "Watched") return item.type === "watched";
    if (activeFilter === "Lists") return item.type === "added_to_list";
    return true;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Popular</Text>
        <Text style={styles.headerSubtitle}>What everyone is watching</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PublicActivityCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <TrendingStrip />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTER_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    activeFilter === f && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      activeFilter === f && styles.filterPillTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySubtitle}>Check back soon.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default Public;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: 13, fontFamily: "DMSans_400Regular", color: C.muted, marginTop: 2 },

  trendingSection: { paddingTop: 16, paddingBottom: 8 },
  trendingSectionTitle: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  trendingScroll: { paddingHorizontal: 20, gap: 10 },
  trendingCard: { width: 72, alignItems: "center", gap: 6 },
  trendingPoster: {
    width: 72,
    height: 108,
    borderRadius: 8,
    backgroundColor: C.card,
  },
  trendingShowTitle: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },

  filterRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: "rgba(45,106,79,0.3)",
  },
  filterPillActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterPillText: { color: C.textSec, fontSize: 12, fontWeight: "500" },
  filterPillTextActive: { color: "#081C15", fontWeight: "600" },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  trendingBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.trending,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(244,168,39,0.25)",
  },
  trendingBadgeText: { color: C.trendingText, fontSize: 11, fontWeight: "600" },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  headerText: { flex: 1 },
  username: { color: C.text, fontWeight: "600", fontSize: 13 },
  verified: { color: "#52B788", fontSize: 12 },
  actionLabel: { color: C.muted, fontSize: 12, marginTop: 1 },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.accent,
  },
  followBtnText: { color: C.accent, fontSize: 12, fontWeight: "600" },

  showRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  poster: {
    width: 56,
    height: 84,
    borderRadius: 6,
    backgroundColor: C.card,
  },
  showInfo: { flex: 1, gap: 4 },
  showTitle: { color: C.text, fontWeight: "700", fontSize: 14 },
  showMeta: { color: C.muted, fontSize: 12 },
  stars: { color: C.star, fontSize: 11, letterSpacing: 1 },
  reviewBlock: {
    marginTop: 4,
    padding: 10,
    backgroundColor: "#081C15",
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: C.accent,
  },
  reviewText: { color: C.textSec, fontSize: 12, lineHeight: 18, fontStyle: "italic" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 13, color: C.muted },
  footerCount: { color: C.muted, fontSize: 12 },
  footerShare: { color: C.muted, fontSize: 12 },

  empty: { paddingTop: 60, alignItems: "center", gap: 8 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: "600" },
  emptySubtitle: { color: C.muted, fontSize: 14 },
});
