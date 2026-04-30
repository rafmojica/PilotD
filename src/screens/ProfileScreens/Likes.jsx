import React, { useState, useCallback } from "react";
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
  FlatList,
  Dimensions,
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
} from "firebase/firestore";
import Stars from "../../components/Stars";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Rect, Polyline } from "react-native-svg";

// ─── Constants ────────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";
const { width: SCREEN_W } = Dimensions.get("window");

const GRID_COLS = 4;
const ITEM_MARGIN = 3;
const ITEM_W = (SCREEN_W - 16 * 2 - ITEM_MARGIN * (GRID_COLS - 1)) / GRID_COLS;
const ITEM_H = ITEM_W * 1.48;

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
  heartSoft: "#EF444420",
};

// ─── Poster grid item ─────────────────────────────────────────────────────────

const PosterItem = ({ item, onPress }) => {
  const hasReview = !!item.review;
  return (
    <TouchableOpacity
      style={styles.posterItem}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {item.posterUri ? (
        <Image
          source={{ uri: item.posterUri }}
          style={styles.posterImg}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.posterImg, styles.posterPlaceholder]}>
          <Text style={{ fontSize: 20 }}>📺</Text>
        </View>
      )}
      {/* Stars + icons row */}
      <View style={styles.posterMeta}>
        <Stars rating={item.rating ?? 0} size={9} />
        <View style={styles.posterIcons}>
          {hasReview && <Text style={styles.reviewDot}>≡</Text>}
          <Text style={styles.heartSmall}>♥</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = () => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyEmoji}>♡</Text>
    <Text style={styles.emptyTitle}>No liked shows yet</Text>
    <Text style={styles.emptySubtitle}>Tap the heart on any show to like it.</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Likes = ({ navigation }) => {
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [likedShows, setLikedShows] = useState([]);

  const fetchAll = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      // Fetch all diary entries where liked = true
      const snap = await getDocs(
        query(
            collection(db, "users", uid, "diary"),
            where("liked", "==", true)
        )
      );

      // Then sort client-side after:
      const all = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
            const aTime = a.watchedDate?.toMillis?.() ?? 0;
            const bTime = b.watchedDate?.toMillis?.() ?? 0;
            return bTime - aTime;
        });

      // Split: all liked = shows tab, liked + review = reviews tab
      setLikedShows(all);

      // Fetch posters + years
      const ids = [...new Set(all.map((e) => e.showId).filter(Boolean))];
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({
              id,
              uri: data?.image?.medium ?? null,
              year: data?.premiered?.slice(0, 4) ?? null,
            }))
        )
      );
      const posterMap = {};
      const yearMap = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          if (r.value.uri) posterMap[r.value.id] = r.value.uri;
          if (r.value.year) yearMap[r.value.id] = r.value.year;
        }
      });

      // Attach to entries
      const attach = (list) =>
        list.map((e) => ({
          ...e,
          posterUri: posterMap[e.showId] ?? null,
          year: yearMap[e.showId] ?? null,
        }));

      setLikedShows(attach(all));
    } catch (err) {
      console.error("[Likes] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const renderContent = () => {
    if (likedShows.length === 0) return <EmptyState />;
    if (viewMode === "grid") {
      return (
        <FlatList
          data={likedShows}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLS}
          scrollEnabled={false}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContainer}
          renderItem={({ item }) => (
            <PosterItem
              item={item}
              onPress={() => navigation?.navigate("ShowCard", { showId: item.showId })}
            />
          )}
        />
      );
    }
    return likedShows.map((item, i) => (
      <View key={item.id}>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => navigation?.navigate("ShowCard", { showId: item.showId })}
          activeOpacity={0.8}
        >
          {item.posterUri ? (
            <Image source={{ uri: item.posterUri }} style={styles.listPoster} resizeMode="cover" />
          ) : (
            <View style={[styles.listPoster, styles.posterPlaceholder]}>
              <Text style={{ fontSize: 18 }}>📺</Text>
            </View>
          )}
          <View style={styles.listInfo}>
            <View style={styles.listTitleRow}>
              <Text style={styles.showName} numberOfLines={1}>{item.showName ?? "Unknown Show"}</Text>
              {item.year ? <Text style={styles.yearText}>{item.year}</Text> : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Stars rating={item.rating ?? 0} size={12} />
              <Text style={styles.heartSmallRed}>♥</Text>
            </View>
          </View>
        </TouchableOpacity>
        {i < likedShows.length - 1 && <View style={styles.divider} />}
      </View>
    ));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading likes…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Likes</Text>

        <View style={styles.headerActions}>
          {/* Grid/List toggle */}
          <TouchableOpacity
            onPress={() => setViewMode((m) => (m === "grid" ? "list" : "grid"))}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.subtext} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {viewMode === "grid" ? (
                <>
                  <Polyline points="9 6 20 6" /><Polyline points="9 12 20 12" /><Polyline points="9 18 20 18" />
                  <Polyline points="4 6 4 6" /><Polyline points="4 12 4 12" /><Polyline points="4 18 4 18" />
                </>
              ) : (
                <>
                  <Rect x="3" y="3" width="7" height="7" /><Rect x="14" y="3" width="7" height="7" />
                  <Rect x="3" y="14" width="7" height="7" /><Rect x="14" y="14" width="7" height="7" />
                </>
              )}
            </Svg>
          </TouchableOpacity>
          {/* Filter icon (stub) */}
          <TouchableOpacity style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.subtext} strokeWidth="1.8" strokeLinecap="round">
              <Polyline points="3 6 21 6" /><Polyline points="6 12 18 12" /><Polyline points="9 18 15 18" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Count ── */}
      {likedShows.length > 0 && (
        <Text style={styles.countText}>{likedShows.length} shows</Text>
      )}

      {/* ── Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          likedShows.length === 0 && styles.scrollEmpty,
        ]}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: { paddingRight: 10 },
  backText: { fontSize: 28, color: C.text, lineHeight: 32 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  headerActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconBtn: { padding: 2 },

  // List mode items
  listItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    alignItems: "center",
  },
  listPoster: {
    width: 60,
    height: 88,
    borderRadius: 7,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
  },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  listInfo: { flex: 1, gap: 5 },

  // Count
  countText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 4,
  },

  // Scroll
  scrollContent: { paddingBottom: 48 },
  scrollEmpty: { flex: 1 },

  // Grid
  gridContainer: { paddingHorizontal: 16, paddingTop: 10 },
  gridRow: { gap: ITEM_MARGIN, marginBottom: ITEM_MARGIN },
  posterItem: { width: ITEM_W },
  posterImg: {
    width: ITEM_W,
    height: ITEM_H,
    borderRadius: 6,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderColor: C.border2,
  },
  posterMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 1,
  },
  posterIcons: { flexDirection: "row", alignItems: "center", gap: 3 },
  reviewDot: { fontSize: 9, color: C.subtext },
  heartSmall: { fontSize: 9, color: C.heart },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default Likes;