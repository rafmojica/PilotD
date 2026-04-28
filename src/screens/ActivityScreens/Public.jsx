// src/Screens/ActivityScreens/Public.jsx

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
      <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
      <View style={styles.headerText}>
        <Text style={styles.username}>
          @{item.user.username}
          {item.user.isVerified ? (
            <Text style={styles.verified}> ✓</Text>
          ) : null}
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
          <Text style={styles.reviewText} numberOfLines={4}>
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
      <StatusBar barStyle="light-content" />

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
                  style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
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

const COLORS = {
  bg: "#0f0f13",
  surface: "#1a1a22",
  border: "#2a2a36",
  accent: "#e8c97e",
  accentDim: "#3a3220",
  text: "#f0eeea",
  muted: "#888898",
  star: "#e8c97e",
  trendingBg: "#1f1a10",
  trendingText: "#e8c97e",
  verified: "#7eb8e8",
  followBorder: "#3a3a50",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  headerSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  trendingSection: { paddingTop: 16, paddingBottom: 8 },
  trendingSectionTitle: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  trendingScroll: { paddingHorizontal: 16, gap: 10 },
  trendingCard: { width: 72, alignItems: "center", gap: 6 },
  trendingPoster: {
    width: 72,
    height: 108,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  trendingShowTitle: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 13,
  },

  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterPillActive: {
    backgroundColor: COLORS.accentDim,
    borderColor: COLORS.accent,
  },
  filterPillText: { color: COLORS.muted, fontSize: 13, fontWeight: "500" },
  filterPillTextActive: { color: COLORS.accent },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendingBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.trendingBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  trendingBadgeText: { color: COLORS.trendingText, fontSize: 11, fontWeight: "600" },

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
  username: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  verified: { color: COLORS.verified, fontSize: 13 },
  actionLabel: { color: COLORS.muted, fontSize: 12, marginTop: 1 },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.followBorder,
  },
  followBtnText: { color: COLORS.text, fontSize: 12, fontWeight: "600" },

  showRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  poster: {
    width: 56,
    height: 84,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  showInfo: { flex: 1, gap: 4 },
  showTitle: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  showMeta: { color: COLORS.muted, fontSize: 12 },
  stars: { color: COLORS.star, fontSize: 14, letterSpacing: 1 },
  reviewText: { color: COLORS.text, fontSize: 13, lineHeight: 18, opacity: 0.85 },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  footerBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerIcon: { fontSize: 14 },
  footerCount: { color: COLORS.muted, fontSize: 13 },
  footerShare: { color: COLORS.muted, fontSize: 13 },

  empty: { paddingTop: 60, alignItems: "center", gap: 8 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "600" },
  emptySubtitle: { color: COLORS.muted, fontSize: 14 },
});