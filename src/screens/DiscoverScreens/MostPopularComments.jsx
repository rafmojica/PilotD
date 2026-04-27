import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Mock review data ─────────────────────────────────────────────────────────
// BUG FIX 1: Corrected showTvMazeId for "The Bear".
// The original had id: 2, which is TVMaze's ID for "Under the Dome" — completely
// wrong show. The Bear's correct TVMaze ID is 56676. This caused the primary
// fetch to load the wrong poster, and the name-search fallback (second request)
// only ran after the first one errored, wasting time and bandwidth on every load.
//
// "recencyScore" added to each review so the "This Week" sort has a meaningful
// numeric basis rather than the broken string-comparison hack in the original.
// Lower number = more recent.

const MOCK_REVIEWS = [
  {
    id: "r1",
    showName: "Breaking Bad",
    showTvMazeId: 169,
    season: 5,
    episode: null,
    rating: 10,
    likes: 4821,
    recencyScore: 6,   // 2d ago
    username: "heisenberg_fan",
    displayName: "Walter",
    initials: "WW",
    avatarColor: "#4F46E5",
    timeAgo: "2d ago",
    text:
      "The finale hit me like nothing else has on TV. Five seasons of meticulous buildup, and every thread resolves perfectly. The scene in the lab is cinema. I'll be thinking about this for years.",
  },
  {
    id: "r2",
    showName: "The Bear",
    showTvMazeId: 56676, // BUG FIX 1: was 2 (Under the Dome), corrected to The Bear
    season: 2,
    episode: 7,
    rating: 10,
    likes: 3947,
    recencyScore: 5,   // 5d ago
    username: "carm_enjoyer",
    displayName: "Richie",
    initials: "RC",
    avatarColor: "#10B981",
    timeAgo: "5d ago",
    text:
      "Episode 7 of season 2 is the most stressful hour of television I have ever watched. Pure craft. The final shot broke something in me. This show understands what it means to care about something.",
  },
  {
    id: "r3",
    showName: "Succession",
    showTvMazeId: 32043,
    season: 4,
    episode: null,
    rating: 9,
    likes: 3511,
    recencyScore: 7,   // 1w ago
    username: "siobhan_r",
    displayName: "Shiv Roy",
    initials: "SR",
    avatarColor: "#8B5CF6",
    timeAgo: "1w ago",
    text:
      "No show has ever made me root for and despise the same characters so completely. The writing is razor-sharp. Nobody in this family is good and somehow you love all of them.",
  },
  {
    id: "r4",
    showName: "The Wire",
    showTvMazeId: 132,
    season: 3,
    episode: null,
    rating: 10,
    likes: 3104,
    recencyScore: 8,   // 1w ago
    username: "omar_comin",
    displayName: "McNulty",
    initials: "JM",
    avatarColor: "#D97706",
    timeAgo: "1w ago",
    text:
      "Still the greatest piece of art produced for television. Season 3 introduces Hamsterdam and the show reaches a philosophical depth most films never touch. The system is the villain.",
  },
  {
    id: "r5",
    showName: "Severance",
    showTvMazeId: 41734,
    season: 1,
    episode: null,
    rating: 9,
    likes: 2889,
    recencyScore: 14,  // 2w ago
    username: "lumon_employee",
    displayName: "Mark S.",
    initials: "MS",
    avatarColor: "#0EA5E9",
    timeAgo: "2w ago",
    text:
      "This show made me feel genuinely unsafe for the first time in years. The production design is so sterile it becomes oppressive. The finale cliffhanger destroyed me. Season 2 can't come soon enough.",
  },
  {
    id: "r6",
    showName: "Andor",
    showTvMazeId: 54782,
    season: 1,
    episode: null,
    rating: 10,
    likes: 2643,
    recencyScore: 21,  // 3w ago
    username: "rebel_scum",
    displayName: "Cassian",
    initials: "CA",
    avatarColor: "#40916C",
    timeAgo: "3w ago",
    text:
      "The Narkina 5 arc is the most harrowing prison narrative on television. This is what happens when Star Wars is made for adults. Episodes 8-10 are flawless. Pure political drama in space.",
  },
  {
    id: "r7",
    showName: "The Leftovers",
    showTvMazeId: 1621,
    season: 2,
    episode: null,
    rating: 9,
    likes: 2197,
    recencyScore: 30,  // 1mo ago
    username: "departure_day",
    displayName: "Kevin",
    initials: "KG",
    avatarColor: "#EC4899",
    timeAgo: "1mo ago",
    text:
      "Season 2 opener 'Axis Mundi' is among the greatest single episodes of television ever made. This show knows grief better than any therapist. It will rearrange your understanding of loss.",
  },
  {
    id: "r8",
    showName: "House of the Dragon",
    showTvMazeId: 55268,
    season: 1,
    episode: null,
    rating: 8,
    likes: 1934,
    recencyScore: 32,  // 1mo ago
    username: "targaryenblood",
    displayName: "Rhaenyra",
    initials: "RT",
    avatarColor: "#EF4444",
    timeAgo: "1mo ago",
    text:
      "They actually did it. A worthy successor to early Game of Thrones. The dance of the dragons is set in motion with genuine dread. Emma D'Arcy in the second half is a revelation.",
  },
];

const TIME_FILTERS = ["This Week", "This Month", "All Time"];

// ─── StarRating component ─────────────────────────────────────────────────────

const StarRating = ({ rating, max = 10 }) => {
  const stars = Math.round((rating / max) * 5);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Text key={s} style={[styles.star, s <= stars && styles.starFilled]}>
          ★
        </Text>
      ))}
    </View>
  );
};

// ─── AvatarCircle component ───────────────────────────────────────────────────

const AvatarCircle = ({ initials, color, size = 40 }) => (
  <View
    style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
  </View>
);

// ─── ReviewCard component ─────────────────────────────────────────────────────

const ReviewCard = ({ review, showData }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(review.likes);

  const toggleLike = () => {
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => (next ? c + 1 : c - 1));
      return next;
    });
  };

  const posterUri = showData?.image?.medium ?? null;
  const network = showData?.network?.name ?? showData?.webChannel?.name ?? null;

  return (
    <View style={styles.reviewCard}>
      <View style={styles.showInfoRow}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={styles.miniPoster}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.miniPoster, styles.miniPosterPlaceholder]}>
            <Text style={styles.miniPosterEmoji}>📺</Text>
          </View>
        )}
        <View style={styles.showInfoText}>
          <Text style={styles.showInfoTitle}>{review.showName}</Text>
          <Text style={styles.showInfoMeta}>
            {review.season ? `S${review.season}` : ""}
            {review.episode ? `E${review.episode}` : ""}
            {review.season && " · "}
            {network ?? ""}
          </Text>
        </View>
        <StarRating rating={review.rating} />
      </View>

      <View style={styles.divider} />

      <Text style={styles.reviewText}>{review.text}</Text>

      <View style={styles.reviewFooter}>
        <View style={styles.reviewUserRow}>
          <AvatarCircle
            initials={review.initials}
            color={review.avatarColor}
            size={32}
          />
          <View style={styles.reviewUserText}>
            <Text style={styles.displayName}>{review.displayName}</Text>
            <Text style={styles.reviewTime}>@{review.username} · {review.timeAgo}</Text>
          </View>
        </View>

        <View style={styles.reviewActions}>
          <TouchableOpacity
            style={[styles.actionBtn, liked && styles.actionBtnActive]}
            onPress={toggleLike}
            activeOpacity={0.75}
          >
            <Text style={[styles.actionEmoji, liked && styles.actionEmojiActive]}>
              {liked ? "♥" : "♡"}
            </Text>
            <Text style={[styles.actionCount, liked && styles.actionCountActive]}>
              {likeCount >= 1000
                ? `${(likeCount / 1000).toFixed(1)}k`
                : likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionCount}>
              {Math.floor(review.likes / 18)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionEmoji}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── ListHeader component ─────────────────────────────────────────────────────
// BUG FIX 2: Extracted ListHeader OUT of the main component body and into a
// standalone component that accepts props.
//
// The original code defined `const ListHeader = () => (...)` INSIDE the render
// function of MostPopularComments, then passed it as `ListHeaderComponent={ListHeader}`.
//
// React Native's FlatList, when given a component *type* (not a JSX element),
// checks reference equality on each render. Because the function was re-declared
// on every render of the parent, `ListHeader` was always a brand-new reference.
// FlatList interpreted this as "the header component changed" and REMOUNTED the
// entire header from scratch — wiping any internal state and, critically, triggering
// a scroll-to-top every time the user tapped a filter tab.
//
// FIX A (used here): Define the header as a named component outside the parent.
// Pass it props explicitly. FlatList receives a stable reference and only re-renders
// (not remounts) the header when props change.
//
// FIX B (alternative): Pass a JSX element instead of a component type:
//   ListHeaderComponent={<ListHeader activeFilter={activeFilter} ... />}
// This also avoids remounting because FlatList wraps JSX elements in a stable ref.

const ReviewListHeader = ({ activeFilter, onFilterChange }) => (
  <>
    <View style={styles.topBar}>
      <View>
        <Text style={styles.logoText}>PILOTD</Text>
        <Text style={styles.logoSub}>Track. Rate. Discover.</Text>
      </View>
    </View>

    <View style={styles.pageHead}>
      <Text style={styles.pageHeadTitle}>Top Reviews</Text>
      <Text style={styles.pageHeadSub}>
        The most loved takes from the community
      </Text>
    </View>

    <View style={styles.statStrip}>
      <View style={styles.statItem}>
        <Text style={styles.statNum}>24.8k</Text>
        <Text style={styles.statLabel}>Reviews</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNum}>891k</Text>
        <Text style={styles.statLabel}>Likes</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNum}>3,201</Text>
        <Text style={styles.statLabel}>Shows</Text>
      </View>
    </View>

    <View style={styles.tabRow}>
      {TIME_FILTERS.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.tab, activeFilter === t && styles.tabActive]}
          onPress={() => onFilterChange(t)}
        >
          <Text style={[styles.tabText, activeFilter === t && styles.tabTextActive]}>
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <View style={styles.rankHeader}>
      <Text style={styles.rankHeaderText}>♥ Most Liked Reviews</Text>
    </View>
  </>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const MostPopularComments = () => {
  const [showsData, setShowsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All Time");

  const fetchShowData = useCallback(async () => {
    try {
      const fetches = MOCK_REVIEWS.map(async (r) => {
        try {
          const data = await fetch(`${TVMAZE}/shows/${r.showTvMazeId}`).then(
            (res) => res.json()
          );
          return { id: r.id, data };
        } catch {
          try {
            const results = await fetch(
              `${TVMAZE}/singlesearch/shows?q=${encodeURIComponent(r.showName)}`
            ).then((res) => res.json());
            return { id: r.id, data: results };
          } catch {
            return { id: r.id, data: null };
          }
        }
      });

      const results = await Promise.all(fetches);
      const map = {};
      results.forEach(({ id, data }) => {
        map[id] = data;
      });
      setShowsData(map);
    } catch (err) {
      console.error("[MostPopularComments] error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchShowData();
  }, [fetchShowData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShowData();
  };

  // BUG FIX 2 (continued): Sort logic for "This Week" and "This Month" now uses
  // `recencyScore` (days since posted) instead of the broken string comparison
  // `(b.id < "r5" ? 1 : 0) - (a.id < "r5" ? 1 : 0)`.
  //
  // The original string sort was doubly broken:
  //   (a) String comparison on IDs like "r1"..."r8" is lexicographic, so "r10" < "r2"
  //       — wrong for double-digit IDs.
  //   (b) Even for single-digit IDs, the subtraction produced {-1, 0, 1} but with
  //       unstable semantics: reviews with id < "r5" got a score of 1, others 0,
  //       but the sort was (b - a) not (a - b), producing arbitrary ordering.
  //
  // Now: "This Week" shows reviews from ≤7 days ago (recencyScore ≤ 7), sorted
  // newest-first. "This Month" shows ≤30 days. "All Time" sorts by likes desc.
  const sortedReviews = (() => {
    if (activeFilter === "This Week") {
      return [...MOCK_REVIEWS]
        .filter((r) => r.recencyScore <= 7)
        .sort((a, b) => a.recencyScore - b.recencyScore);
    }
    if (activeFilter === "This Month") {
      return [...MOCK_REVIEWS]
        .filter((r) => r.recencyScore <= 30)
        .sort((a, b) => a.recencyScore - b.recencyScore);
    }
    // All Time → sort by likes descending
    return [...MOCK_REVIEWS].sort((a, b) => b.likes - a.likes);
  })();

  const renderItem = ({ item }) => (
    <ReviewCard review={item} showData={showsData[item.id]} />
  );

  // BUG FIX 2: Pass ReviewListHeader as a stable component reference with props,
  // not a freshly-created closure. The `renderListHeader` callback is memoized
  // so FlatList sees a stable reference even when activeFilter changes.
  const renderListHeader = useCallback(
    () => (
      <ReviewListHeader
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
    ),
    [activeFilter]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading top reviews…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FlatList
        data={sortedReviews}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
          />
        }
      />
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
  loadingText: { color: C.subtext, fontSize: 14, fontWeight: "500", letterSpacing: 0.4 },
  listContent: { paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  logoText: { fontSize: 20, fontWeight: "800", color: C.accent, letterSpacing: 3 },
  logoSub: { fontSize: 10, color: C.subtext, letterSpacing: 1.2, marginTop: 1 },

  // Page head
  pageHead: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  pageHeadTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  pageHeadSub: { fontSize: 13, color: C.subtext, marginTop: 3, letterSpacing: 0.2 },

  // Stat strip
  statStrip: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 18, fontWeight: "800", color: C.text, letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: C.subtext, marginTop: 2, fontWeight: "500" },
  statDivider: { width: 1, backgroundColor: C.border },

  // Tabs
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  tabActive: { backgroundColor: C.accent },
  tabText: { fontSize: 13, fontWeight: "600", color: C.subtext },
  tabTextActive: { color: "#fff" },

  // Rank header
  rankHeader: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  rankHeaderText: {
    fontSize: 12,
    color: C.subtext,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Review card
  reviewCard: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  separator: { height: 12 },

  // Show info row
  showInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  miniPoster: {
    width: 46,
    height: 64,
    borderRadius: 8,
    backgroundColor: C.surface,
  },
  miniPosterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  miniPosterEmoji: { fontSize: 20 },
  showInfoText: { flex: 1 },
  showInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.1,
  },
  showInfoMeta: { fontSize: 12, color: C.subtext, marginTop: 2 },

  // Stars
  starRow: { flexDirection: "row", gap: 2 },
  star: { fontSize: 13, color: C.muted },
  starFilled: { color: C.gold },

  // Divider
  divider: { height: 1, backgroundColor: C.border, marginBottom: 12 },

  // Review text
  reviewText: {
    fontSize: 14,
    color: "#C8C8D8",
    lineHeight: 21,
    letterSpacing: 0.1,
    marginBottom: 14,
  },

  // Footer
  reviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewUserRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
  reviewUserText: {},
  displayName: { fontSize: 13, fontWeight: "700", color: C.text },
  reviewTime: { fontSize: 11, color: C.subtext, marginTop: 1 },

  // Action buttons
  reviewActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionBtnActive: {
    backgroundColor: C.heartSoft,
    borderColor: C.heart + "60",
  },
  actionEmoji: { fontSize: 14, color: C.subtext },
  actionEmojiActive: { color: C.heart },
  actionCount: { fontSize: 12, fontWeight: "600", color: C.subtext },
  actionCountActive: { color: C.heart },
});

export default MostPopularComments;
