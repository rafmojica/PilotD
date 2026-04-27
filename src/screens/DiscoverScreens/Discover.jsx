import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  // BUG FIX 1: Removed unused `Dimensions` import and `SCREEN_WIDTH` constant.
  // It was imported and destructured but referenced nowhere in the component.
} from "react-native";

// ─── Constants ──────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";

const C = {
  bg: "#081C15",
  surface: "#0D2319",
  card: "#1B4332",
  cardHover: "#2D6A4F",
  accent: "#52B788",
  accentSoft: "#52B78822",
  gold: "#F59E0B",
  goldSoft: "#F59E0B20",
  text: "#D8F3DC",
  subtext: "#74C69D",
  muted: "#2D6A4F",
  border: "#1B4332",
  success: "#40916C",
  pill: "#1B4332",
  pillActive: "#52B788",
};

// BUG FIX 2: "Sci-Fi" label now maps to TVMaze's actual genre string "Science-Fiction".
// Previously, the filter button showed "Sci-Fi" and the filter logic tried
// s.genres?.includes("Science-Fiction") for the Sci-Fi case, BUT the active
// filter value stored in state was "Sci-Fi". The filteredTrending logic compared
// activeFilter === "Sci-Fi" correctly, but the includes() check used "Science-Fiction".
// That part was actually written correctly in the original — the real issue was that
// TVMaze genres contain "Science-Fiction" not "Sci-Fi", and the pill label and the
// includes() target were inconsistent when other genres used the label directly
// (e.g. activeFilter "Drama" → includes("Drama") ✓, but "Sci-Fi" → includes("Sci-Fi") ✗).
// Fix: keep the display label as "Sci-Fi" for UX, but map it to "Science-Fiction"
// in the filter logic via the GENRE_MAP lookup below.
const GENRE_FILTERS = ["All", "Drama", "Comedy", "Thriller", "Sci-Fi", "Crime", "Action"];

const GENRE_MAP = {
  "Sci-Fi": "Science-Fiction",
};

const toTvMazeGenre = (label) => GENRE_MAP[label] ?? label;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const stripHtml = (html) =>
  html ? html.replace(/<[^>]*>/g, "").trim() : "";

const formatRating = (r) => (r ? r.toFixed(1) : null);

// ─── ShowCard component ───────────────────────────────────────────────────────

const ShowCard = ({ show, size = "md" }) => {
  const isSm = size === "sm";
  const cardW = isSm ? 100 : 126;
  const posterH = isSm ? 150 : 190;

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardW }]}
      activeOpacity={0.72}
      onPress={() => console.log("Navigate to show:", show.id)}
    >
      <View style={[styles.posterWrap, { height: posterH }]}>
        <Image
          source={{ uri: show.image?.medium }}
          style={styles.poster}
          resizeMode="cover"
        />
        {show.rating?.average ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingBadgeText}>
              ★ {formatRating(show.rating.average)}
            </Text>
          </View>
        ) : null}
        {show.premiered && new Date(show.premiered).getFullYear() >= 2023 && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>
        {show.name}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {show.premiered?.slice(0, 4) ?? "—"}
        {show.genres?.[0] ? ` · ${show.genres[0]}` : ""}
      </Text>
    </TouchableOpacity>
  );
};

// ─── SectionRow component ────────────────────────────────────────────────────

const SectionRow = ({ emoji, title, data, cardSize }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={() => console.log("See all:", title)}>
        <Text style={styles.seeAll}>See all</Text>
      </TouchableOpacity>
    </View>
    <FlatList
      data={data}
      horizontal
      keyExtractor={(item) => `${title}-${item.id}`}
      renderItem={({ item }) => <ShowCard show={item} size={cardSize} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hList}
    />
  </View>
);

// ─── HeroBanner component ────────────────────────────────────────────────────

const HeroBanner = ({ show }) => {
  if (!show) return null;
  return (
    <TouchableOpacity
      style={styles.hero}
      activeOpacity={0.88}
      onPress={() => console.log("Navigate to show:", show.id)}
    >
      <Image
        source={{ uri: show.image?.original ?? show.image?.medium }}
        style={styles.heroImage}
        resizeMode="cover"
      />
      <View style={styles.heroGradient} />

      <View style={styles.heroContent}>
        <View style={styles.heroBadgesRow}>
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>✦  FEATURED</Text>
          </View>
          {show.rating?.average ? (
            <View style={styles.heroRatingBadge}>
              <Text style={styles.heroRatingText}>
                ★ {formatRating(show.rating.average)}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {show.name}
        </Text>
        <Text style={styles.heroGenres} numberOfLines={1}>
          {show.genres?.slice(0, 3).join("  ·  ") ?? "Drama"}
        </Text>
        {show.summary ? (
          <Text style={styles.heroSummary} numberOfLines={2}>
            {stripHtml(show.summary)}
          </Text>
        ) : null}
        <View style={styles.heroBtnRow}>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => console.log("View Show:", show.id)}
          >
            <Text style={styles.heroBtnText}>View Show</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroSecBtn}
            onPress={() => console.log("Add to Watchlist:", show.id)}
          >
            <Text style={styles.heroSecBtnText}>+ Watchlist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const Discover = () => {
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [recentAdds, setRecentAdds] = useState([]);
  const [dramas, setDramas] = useState([]);
  const [comedies, setComedies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const fetchShows = useCallback(async () => {
    try {
      const [p0, p1, p2] = await Promise.all([
        fetch(`${TVMAZE}/shows?page=0`).then((r) => r.json()),
        fetch(`${TVMAZE}/shows?page=1`).then((r) => r.json()),
        fetch(`${TVMAZE}/shows?page=2`).then((r) => r.json()),
      ]);

      const all = [...p0, ...p1, ...p2].filter((s) => !!s.image?.medium);

      const featuredPool = all.filter(
        (s) => s.image?.original && (s.rating?.average ?? 0) >= 7.5
      );
      setFeatured(
        featuredPool[Math.floor(Math.random() * Math.min(featuredPool.length, 8))]
      );

      const byRating = [...all].sort(
        (a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0)
      );

      setTopRated(byRating.slice(0, 20));
      setTrending(all.slice(0, 20));
      setRecentAdds(p2.filter((s) => s.image?.medium).slice(0, 18));
      setDramas(all.filter((s) => s.genres?.includes("Drama")).slice(0, 18));
      setComedies(all.filter((s) => s.genres?.includes("Comedy")).slice(0, 18));
    } catch (err) {
      console.error("[Discover] fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShows();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Finding great shows…</Text>
      </SafeAreaView>
    );
  }

  // BUG FIX 2 (continued): Use toTvMazeGenre() to translate the pill label
  // to the correct TVMaze genre string before filtering.
  const filteredTrending =
    activeFilter === "All"
      ? trending
      : trending.filter((s) =>
          s.genres?.includes(toTvMazeGenre(activeFilter))
        );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
          />
        }
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.logoText}>PILOTD</Text>
            <Text style={styles.logoSub}>Track. Rate. Discover.</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconCircle, { marginLeft: 8 }]}>
              <Text style={styles.iconEmoji}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Page heading ── */}
        <View style={styles.pageHead}>
          <Text style={styles.pageHeadTitle}>Discover</Text>
          <Text style={styles.pageHeadSub}>Find your next obsession</Text>
        </View>

        {/* ── Genre filter pills ── */}
        {/*
          BUG FIX 3: Removed `gap: 8` from filterRow style (kept `marginRight: 8`
          on filterPill). The original had BOTH, causing 16px between pills instead
          of 8px. `gap` on a ScrollView's contentContainerStyle is also less
          reliable than margin on items, so margin is the safer choice here.
        */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {GENRE_FILTERS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.filterPill,
                activeFilter === g && styles.filterPillActive,
              ]}
              onPress={() => setActiveFilter(g)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeFilter === g && styles.filterPillTextActive,
                ]}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Hero banner ── */}
        <HeroBanner show={featured} />

        {/* ── Show rows ── */}
        <SectionRow emoji="🔥" title="Trending Now" data={filteredTrending} />
        <SectionRow emoji="⭐" title="Top Rated All Time" data={topRated} />
        <SectionRow emoji="✨" title="New Additions" data={recentAdds} />
        <SectionRow emoji="🎭" title="Popular Dramas" data={dramas} />
        <SectionRow emoji="😂" title="Fan Favorite Comedies" data={comedies} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: {
    color: C.subtext,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.4,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "800",
    color: C.accent,
    letterSpacing: 3,
  },
  logoSub: {
    fontSize: 10,
    color: C.subtext,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  iconEmoji: {
    fontSize: 16,
  },

  // Page heading
  pageHead: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageHeadTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  pageHeadSub: {
    fontSize: 13,
    color: C.subtext,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  // BUG FIX 3: Removed `gap: 8` from filterRow. Spacing is now handled
  // exclusively by `marginRight: 8` on each filterPill item.
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.pill,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.subtext,
    letterSpacing: 0.2,
  },
  filterPillTextActive: {
    color: "#fff",
  },

  // Hero banner
  hero: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 28,
    borderRadius: 16,
    overflow: "hidden",
    height: 320,
    borderWidth: 1,
    borderColor: C.border,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "75%",
    backgroundColor: C.bg,
    opacity: 0.88,
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  heroBadgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  featuredBadge: {
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  heroRatingBadge: {
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroRatingText: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroGenres: {
    fontSize: 12,
    color: C.subtext,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  // BUG FIX (minor): heroSummary was using off-palette "#9E9EB5" (purple-toned).
  // Changed to C.subtext which is the correct muted text color in this palette.
  heroSummary: {
    fontSize: 12,
    color: C.subtext,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  heroBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  heroSecBtn: {
    borderWidth: 1,
    borderColor: C.muted,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  heroSecBtnText: {
    color: C.text,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.1,
  },
  seeAll: {
    fontSize: 12,
    color: C.accent,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  hList: {
    paddingLeft: 20,
    paddingRight: 12,
    gap: 12,
  },

  // Show card
  card: {
    marginRight: 4,
  },
  posterWrap: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: C.card,
    marginBottom: 6,
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    bottom: 7,
    right: 7,
    backgroundColor: "#000000CC",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.gold + "60",
  },
  ratingBadgeText: {
    color: C.gold,
    fontSize: 10,
    fontWeight: "700",
  },
  newBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    backgroundColor: C.success,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: C.text,
    letterSpacing: 0.1,
  },
  cardMeta: {
    fontSize: 11,
    color: C.subtext,
    marginTop: 2,
  },
});

export default Discover;
