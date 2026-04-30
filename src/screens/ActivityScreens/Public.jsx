import React, { useState, useCallback } from "react";
import FadeInView from "../../components/FadeInView";
import InitialsAvatar from "../../components/InitialsAvatar";
import Stars from "../../components/Stars";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  collectionGroup,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  collection,
  where,
} from "firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Circle, Rect, Polyline } from "react-native-svg";

// ─── Constants ────────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  accent: "#52B788",
  accentSoft: "#52B78822",
  gold: "#F59E0B",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
  border2: "#2D6A4F",
  heart: "#EF4444",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Reviews", "Lists"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp?.toDate?.() ?? new Date(timestamp);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── Popular Review Card ──────────────────────────────────────────────────────

const PopularReviewCard = ({ item, onShowPress }) => (
  <TouchableOpacity style={styles.reviewCard} onPress={onShowPress} activeOpacity={0.82}>
    {/* Poster strip */}
    {item.posterUri ? (
      <Image source={{ uri: item.posterUri }} style={styles.reviewPoster} resizeMode="cover" />
    ) : (
      <View style={[styles.reviewPoster, styles.posterPlaceholder]}>
        <Svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <Rect x="2" y="7" width="20" height="15" rx="2" />
          <Polyline points="17 2 12 7 7 2" />
        </Svg>
      </View>
    )}

    <View style={styles.reviewBody}>
      {/* Top row: avatar + name + time */}
      <View style={styles.reviewUserRow}>
        <InitialsAvatar name={item.displayName} size={26} color={item.avatarColor} />
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewUsername}>{item.displayName ?? "Anonymous"}</Text>
          <View style={styles.reviewMeta}>
            {item.rating > 0 && <Stars rating={item.rating} size={10} />}
            <Text style={styles.reviewTime}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
        {/* Heart count */}
        <View style={styles.likesChip}>
          <Text style={styles.likesHeart}>♥</Text>
          <Text style={styles.likesCount}>{item.likes ?? 0}</Text>
        </View>
      </View>

      {/* Show name */}
      <Text style={styles.reviewShowName} numberOfLines={1}>{item.showName}</Text>

      {/* Review body */}
      <Text style={styles.reviewText} numberOfLines={4}>{item.text}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Popular List Card ────────────────────────────────────────────────────────

const PosterMosaic = ({ uris }) => {
  const tiles = [...uris, null, null, null, null].slice(0, 4);
  const size = 72;
  const tileSize = (size - 2) / 2;

  return (
    <View style={{ width: size, height: size, borderRadius: 8, overflow: "hidden", flexDirection: "row", flexWrap: "wrap", gap: 2, backgroundColor: C.card }}>
      {tiles.map((uri, i) =>
        uri ? (
          <Image key={i} source={{ uri }} style={{ width: tileSize, height: tileSize }} resizeMode="cover" />
        ) : (
          <View key={i} style={{ width: tileSize, height: tileSize, backgroundColor: C.muted, opacity: 0.3 }} />
        )
      )}
    </View>
  );
};

const PopularListCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.82}>
    <PosterMosaic uris={item.posterUris ?? []} />

    <View style={styles.listBody}>
      <View style={styles.listTitleRow}>
        <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.likesChip}>
          <Text style={styles.likesHeart}>♥</Text>
          <Text style={styles.likesCount}>{item.likes ?? 0}</Text>
        </View>
      </View>

      <View style={styles.listUserRow}>
        <InitialsAvatar name={item.ownerName} size={18} color={item.avatarColor} />
        <Text style={styles.listOwner}>@{item.ownerUsername}</Text>
      </View>

      {item.description ? (
        <Text style={styles.listDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <Text style={styles.listMeta}>
        {item.showCount} show{item.showCount !== 1 ? "s" : ""}
        {item.updatedAt ? `  ·  Updated ${timeAgo(item.updatedAt)}` : ""}
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Public = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("Reviews");
  const [popularReviews, setPopularReviews] = useState([]);
  const [popularLists, setPopularLists] = useState([]);
  const [posterMap, setPosterMap] = useState({});

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      // ── Popular reviews (collectionGroup across all shows) ──
      // Requires Firestore index on collectionGroup "reviews" by likes desc
      let reviews = [];
      try {
        const reviewSnap = await getDocs(
          query(collectionGroup(db, "reviews"), orderBy("likes", "desc"), limit(20))
        );
        reviews = reviewSnap.docs.map((d) => ({
          id: d.id,
          showId: d.ref.parent.parent?.id ?? null,
          ...d.data(),
        }));
      } catch {
        // Fallback: index not yet created — fetch from a flat reviews collection if you have one
        console.warn("[Public] reviews collectionGroup query failed — add Firestore index");
      }

      // ── Popular public lists ──
      let lists = [];
      try {
        const listSnap = await getDocs(
          query(
            collection(db, "lists"),
            where("isPublic", "==", true),
            orderBy("likes", "desc"),
            limit(20)
          )
        );
        lists = listSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((l) => l.isPublic && !l.isWatchlist);
      } catch (err) {
        console.warn("[Public] lists query failed:", err.message);
      }

      // ── Collect show IDs and fetch posters ──
      const showIds = [
        ...new Set([
          ...reviews.map((r) => r.showId).filter(Boolean),
          ...lists.flatMap((l) => (l.showIds ?? []).slice(0, 4)),
        ]),
      ];

      const posterResults = await Promise.allSettled(
        showIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id: String(id), uri: data?.image?.medium ?? null }))
        )
      );
      const newPosterMap = {};
      posterResults.forEach((r) => {
        if (r.status === "fulfilled" && r.value.uri)
          newPosterMap[r.value.id] = r.value.uri;
      });
      setPosterMap(newPosterMap);

      // ── Fetch user profiles for reviews ──
      const reviewUids = [...new Set(reviews.map((r) => r.uid).filter(Boolean))];
      const userProfiles = {};
      await Promise.allSettled(
        reviewUids.map((uid) =>
          getDoc(doc(db, "users", uid)).then((snap) => {
            if (snap.exists()) userProfiles[uid] = snap.data();
          })
        )
      );

      // ── Fetch user profiles for lists ──
      const listOwnerUids = [...new Set(lists.map((l) => l.userId).filter(Boolean))];
      await Promise.allSettled(
        listOwnerUids.map((uid) =>
          getDoc(doc(db, "users", uid)).then((snap) => {
            if (snap.exists()) userProfiles[uid] = snap.data();
          })
        )
      );

      // ── Shape data ──
      const shapedReviews = reviews.map((r) => {
        const p = userProfiles[r.uid] ?? {};
        return {
          ...r,
          displayName: p.displayName ?? r.displayName ?? "Anonymous",
          avatarColor: p.avatarColor ?? C.accent,
          posterUri: newPosterMap[String(r.showId)] ?? null,
          showName: r.showName ?? "Unknown Show",
        };
      });

      const shapedLists = lists.map((l) => {
        const p = userProfiles[l.userId] ?? {};
        return {
          ...l,
          ownerName: p.displayName ?? "User",
          ownerUsername: p.username ?? "unknown",
          avatarColor: p.avatarColor ?? C.accent,
          showCount: (l.showIds ?? []).length,
          posterUris: (l.showIds ?? [])
            .slice(0, 4)
            .map((id) => newPosterMap[String(id)])
            .filter(Boolean),
        };
      });

      setPopularReviews(shapedReviews);
      setPopularLists(shapedLists);
    } catch (err) {
      console.error("[Public] fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading popular…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FadeInView>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackChip}
            onPress={() => navigation.navigate("Friends")}
          >
            <Text style={styles.headerBackText}>‹ Friends</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Popular</Text>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.accent}
            />
          }
        >
          {/* ── Reviews tab ── */}
          {activeTab === "Reviews" && (
            <>
              {popularReviews.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round">
                    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </Svg>
                  <Text style={styles.emptyTitle}>No popular reviews yet</Text>
                  <Text style={styles.emptySubtitle}>Reviews gain visibility as they're liked by others</Text>
                </View>
              ) : (
                popularReviews.map((item) => (
                  <PopularReviewCard
                    key={item.id}
                    item={item}
                    onShowPress={() =>
                      item.showId
                        ? navigation.navigate("ShowCard", { showId: Number(item.showId) })
                        : null
                    }
                  />
                ))
              )}
            </>
          )}

          {/* ── Lists tab ── */}
          {activeTab === "Lists" && (
            <>
              {popularLists.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round">
                    <Rect x="3" y="3" width="7" height="7" rx="1" />
                    <Rect x="14" y="3" width="7" height="7" rx="1" />
                    <Rect x="3" y="14" width="7" height="7" rx="1" />
                    <Rect x="14" y="14" width="7" height="7" rx="1" />
                  </Svg>
                  <Text style={styles.emptyTitle}>No public lists yet</Text>
                  <Text style={styles.emptySubtitle}>Public lists appear here as users share them</Text>
                </View>
              ) : (
                popularLists.map((item) => (
                  <PopularListCard
                    key={item.id}
                    item={item}
                    onPress={() =>
                      navigation.navigate("ListDetail", {
                        listId: item.id,
                        listTitle: item.title,
                      })
                    }
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      </FadeInView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 4 },
  loadingScreen: {
    flex: 1, backgroundColor: C.bg,
    justifyContent: "center", alignItems: "center", gap: 14,
  },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerBackChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
  },
  headerBackText: { fontSize: 12, color: C.accent, fontWeight: "600" },
  headerTitle: {
    fontSize: 28,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.4,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  tabActive: { backgroundColor: C.card },
  tabText: { fontSize: 13, color: C.muted, fontWeight: "600" },
  tabTextActive: { color: C.accent, fontWeight: "700" },

  // Popular review card
  reviewCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  reviewPoster: {
    width: 52,
    height: 76,
    borderRadius: 7,
    backgroundColor: C.card,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border2,
  },
  reviewBody: { flex: 1, gap: 4 },
  reviewUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewUsername: {
    fontSize: 13,
    color: C.text,
    fontWeight: "700",
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  reviewTime: { fontSize: 10, color: C.muted },
  reviewShowName: {
    fontSize: 11,
    color: C.accent,
    fontWeight: "600",
  },
  reviewText: {
    fontSize: 13,
    color: C.subtext,
    lineHeight: 19,
    fontStyle: "italic",
  },

  // Likes chip
  likesChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EF444418",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#EF444430",
  },
  likesHeart: { fontSize: 10, color: "#EF4444" },
  likesCount: { fontSize: 11, color: "#EF4444", fontWeight: "700" },

  // Popular list card
  listCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    alignItems: "center",
  },
  listBody: { flex: 1, gap: 4 },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listTitle: {
    fontSize: 14,
    color: C.text,
    fontWeight: "700",
    flex: 1,
  },
  listUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  listOwner: { fontSize: 11, color: C.accent, fontWeight: "600" },
  listDesc: { fontSize: 12, color: C.subtext, lineHeight: 17 },
  listMeta: { fontSize: 11, color: C.muted, fontWeight: "500" },

  // Empty
  emptyWrap: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: C.subtext,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default Public;