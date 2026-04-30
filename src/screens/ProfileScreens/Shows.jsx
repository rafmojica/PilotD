import React, { useState, useCallback } from "react";
import FadeInView from "../../components/FadeInView";
import PressScale from "../../components/PressScale";
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
} from "react-native";
import { auth, db } from "../../config/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import Stars from "../../components/Stars";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Polyline, Rect, Path, Circle } from "react-native-svg";

// ─── Constants ────────────────────────────────────────────────────────────────
// Kept in sync with Profile.jsx and ShowCard.jsx

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  accent: "#52B788",
  accentSoft: "#52B78822",
  gold: "#F59E0B",
  goldSoft: "#F59E0B20",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
  border2: "#2D6A4F",
  heart: "#EF4444",
  heartSoft: "#EF444420",
};

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = ["Recent", "Rating ↓", "Rating ↑", "A–Z"];

// ─── Show row ─────────────────────────────────────────────────────────────────

const ShowRow = ({ item, onPress }) => {
  const { posterUri, showName, rating, hasReview, liked } = item;

  return (
    <PressScale scale={0.97} onPress={onPress}>
      <View style={styles.showRow}>
        {/* Poster */}
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.muted}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Rect x="2" y="7" width="20" height="15" rx="2" />
              <Polyline points="17 2 12 7 7 2" />
            </Svg>
          </View>
        )}

        {/* Info */}
        <View style={styles.showInfo}>
          <Text style={styles.showName} numberOfLines={2}>
            {showName}
          </Text>

          {/* Star rating */}
          <View style={styles.ratingRow}>
            {rating > 0 ? (
              <Stars rating={rating} size={13} />
            ) : (
              <Text style={styles.unratedText}>Not rated</Text>
            )}
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
            {liked && (
              <View style={[styles.badge, styles.badgeLiked]}>
                <Text style={styles.badgeLikedText}>♥ Liked</Text>
              </View>
            )}
            {hasReview && (
              <View style={[styles.badge, styles.badgeReview]}>
                <Svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={C.accent}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </Svg>
                <Text style={styles.badgeReviewText}>Reviewed</Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <Text style={styles.chevron}>›</Text>
      </View>
    </PressScale>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const Shows = ({ navigation }) => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSort, setActiveSort] = useState("Recent");

  const fetchAll = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);

    try {
      // 1. Fetch all show ratings
      const ratingsSnap = await getDocs(
        query(
          collection(db, "users", uid, "showRatings"),
          orderBy("updatedAt", "desc"),
        ),
      );

      if (ratingsSnap.empty) {
        setShows([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all diary entries to check reviews + likes
      const diarySnap = await getDocs(collection(db, "users", uid, "diary"));
      const diaryByShowId = {};
      diarySnap.docs.forEach((d) => {
        const data = d.data();
        if (data.showId) {
          diaryByShowId[String(data.showId)] = data;
        }
      });

      // 3. Build base list from ratings
      const baseList = ratingsSnap.docs.map((d) => {
        const showId = d.id;
        const { rating, updatedAt } = d.data();
        const diary = diaryByShowId[showId];
        return {
          showId,
          rating: rating ?? 0,
          updatedAt: updatedAt?.toMillis?.() ?? 0,
          hasReview: !!(diary?.review && diary.review.trim().length > 0),
          liked: diary?.liked ?? false,
          showName: diary?.showName ?? null,
          posterUri: null,
        };
      });

      // 4. Fetch TVMaze data in parallel (name + poster)
      const results = await Promise.allSettled(
        baseList.map((item) =>
          fetch(`${TVMAZE}/shows/${item.showId}`)
            .then((r) => r.json())
            .then((data) => ({
              showId: String(item.showId),
              showName: data?.name ?? item.showName ?? "Unknown Show",
              posterUri: data?.image?.medium ?? null,
            })),
        ),
      );

      const tvData = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value) {
          tvData[r.value.showId] = r.value;
        }
      });

      const enriched = baseList.map((item) => ({
        ...item,
        showName: tvData[item.showId]?.showName ?? item.showName ?? "Unknown Show",
        posterUri: tvData[item.showId]?.posterUri ?? null,
      }));

      setShows(enriched);
    } catch (err) {
      console.error("[Shows] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  // ── Sort ──
  const sorted = [...shows].sort((a, b) => {
    if (activeSort === "Recent") return b.updatedAt - a.updatedAt;
    if (activeSort === "Rating ↓") return b.rating - a.rating;
    if (activeSort === "Rating ↑") return a.rating - b.rating;
    if (activeSort === "A–Z")
      return (a.showName ?? "").localeCompare(b.showName ?? "");
    return 0;
  });

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading shows…</Text>
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
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.backBtn}
          >
            <Svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={C.accent}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shows</Text>
          <View style={styles.headerCount}>
            <Text style={styles.headerCountText}>{shows.length}</Text>
          </View>
        </View>

        {/* ── Sort bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortBar}
        >
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.sortChip, activeSort === opt && styles.sortChipActive]}
              onPress={() => setActiveSort(opt)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sortChipText,
                  activeSort === opt && styles.sortChipTextActive,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── List ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <Svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke={C.muted}
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Rect x="2" y="7" width="20" height="15" rx="2" />
                <Polyline points="17 2 12 7 7 2" />
              </Svg>
              <Text style={styles.emptyTitle}>No shows logged yet</Text>
              <Text style={styles.emptySubtitle}>
                Rate a show to see it here
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {sorted.map((item, index) => (
                <View key={item.showId}>
                  <ShowRow
                    item={item}
                    onPress={() =>
                      navigation.navigate("ShowCard", { showId: Number(item.showId) })
                    }
                  />
                  {index < sorted.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </FadeInView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 48, paddingTop: 8 },
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
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.3,
  },
  headerCount: {
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border2,
  },
  headerCountText: {
    fontSize: 13,
    color: C.subtext,
    fontWeight: "700",
  },

  // Sort bar
  sortBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
  },
  sortChipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent + "80",
  },
  sortChipText: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "600",
  },
  sortChipTextActive: {
    color: C.accent,
  },

  // List card wrapper
  listCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  // Show row
  showRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  poster: {
    width: 46,
    height: 68,
    borderRadius: 7,
    backgroundColor: C.card,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border2,
  },
  showInfo: {
    flex: 1,
    gap: 5,
  },
  showName: {
    fontSize: 14,
    color: C.text,
    fontWeight: "600",
    fontFamily: "DMSans_600SemiBold",
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  unratedText: {
    fontSize: 11,
    color: C.muted,
    fontStyle: "italic",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLiked: {
    backgroundColor: C.heartSoft,
    borderWidth: 1,
    borderColor: C.heart + "40",
  },
  badgeLikedText: {
    fontSize: 10,
    color: C.heart,
    fontWeight: "700",
  },
  badgeReview: {
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent + "40",
  },
  badgeReviewText: {
    fontSize: 10,
    color: C.accent,
    fontWeight: "700",
  },
  chevron: {
    fontSize: 20,
    color: C.muted,
    lineHeight: 22,
  },

  // Empty state
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: C.subtext,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.muted,
  },
});

export default Shows;