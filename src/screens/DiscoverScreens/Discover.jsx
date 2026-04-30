import React, { useState, useEffect, useCallback } from "react";
import FadeInView from "../../components/FadeInView";
import PressScale from "../../components/PressScale";
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

const GENRE_FILTERS = ["All", "Drama", "Comedy", "Thriller", "Sci-Fi", "Crime", "Action"];

const GENRE_MAP = {
  "Sci-Fi": "Science-Fiction",
};

const toTvMazeGenre = (label) => GENRE_MAP[label] ?? label;

// ─── Curated popular show IDs ────────────────────────────────────────────────
// These are TVMaze IDs for critically acclaimed / widely popular shows.
// Used for the "Top Rated" row since TVMaze doesn't have a true popularity ranking.

const POPULAR_SHOW_IDS = [
  169,    // Breaking Bad
  132,    // The Wire
  1771,   // Game of Thrones
  41734,  // Severance
  32043,  // Succession
  1621,   // The Leftovers
  56676,  // The Bear
  54782,  // Andor
  169,    // Breaking Bad (anchor)
  4,      // Arrow (placeholder, swap as needed)
  82,     // Suits
  118,    // Sherlock
  73,     // Doctor Who
  526,    // Friends (US)
  2993,   // Hannibal
  6771,   // Stranger Things
  55268,  // House of the Dragon
  34481,  // Yellowstone
  14,     // Fargo
  44217,  // The Last of Us
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const stripHtml = (html) =>
  html ? html.replace(/<[^>]*>/g, "").trim() : "";

const formatRating = (r) => (r ? r.toFixed(1) : null);

// ─── ShowCard component ───────────────────────────────────────────────────────

const ShowCard = ({ show, size = "md", navigation }) => {
  const isSm = size === "sm";
  const cardW = isSm ? 100 : 126;
  const posterH = isSm ? 150 : 190;

  return (
    <PressScale
      style={[styles.card, { width: cardW }]}
      scale={0.96}
      onPress={() => navigation.navigate("ShowCard", { showId: show.id })}
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
    </PressScale>
  );
};

// ─── SectionRow component ────────────────────────────────────────────────────

const SectionRow = ({ emoji, title, data, cardSize, navigation }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
    <FlatList
      data={data}
      horizontal
      keyExtractor={(item) => `${title}-${item.id}`}
      renderItem={({ item }) => <ShowCard show={item} size={cardSize} navigation={navigation} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hList}
    />
  </View>
);

// ─── HeroBanner component ────────────────────────────────────────────────────

const HeroBanner = ({ show, navigation }) => {
  if (!show) return null;
  return (
    <PressScale
      style={styles.hero}
      scale={0.98}
      onPress={() => navigation.navigate("ShowCard", { showId: show.id })}
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
            onPress={() => navigation.navigate("ShowCard", { showId: show.id })}
          >
            <Text style={styles.heroBtnText}>View Show</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroSecBtn}
            onPress={() => navigation.navigate("ShowCard", { showId: show.id })}
          >
            <Text style={styles.heroSecBtnText}>+ Watchlist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </PressScale>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const Discover = ({ navigation }) => {
  const [featured, setFeatured] = useState(null);
  const [onAirToday, setOnAirToday] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [recentPremiers, setRecentPremiers] = useState([]);
  const [dramas, setDramas] = useState([]);
  const [comedies, setComedies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeSort, setActiveSort] = useState("Trending");

  const fetchShows = useCallback(async () => {
    try {
      // Get today's date in YYYY-MM-DD for the schedule endpoint
      const today = new Date().toISOString().slice(0, 10);

      const [scheduleRes, popularRes, recentRes] = await Promise.all([
        // Today's full US schedule — this gives us actually airing shows
        fetch(`${TVMAZE}/schedule?country=US&date=${today}`).then((r) => r.json()),
        // Fetch curated popular shows in parallel
        Promise.allSettled(
          POPULAR_SHOW_IDS.map((id) => fetch(`${TVMAZE}/shows/${id}`).then((r) => r.json()))
        ),
        // Recent pages (high page numbers = newer shows)
        Promise.all([
          fetch(`${TVMAZE}/shows?page=250`).then((r) => r.json()).catch(() => []),
          fetch(`${TVMAZE}/shows?page=260`).then((r) => r.json()).catch(() => []),
          fetch(`${TVMAZE}/shows?page=270`).then((r) => r.json()).catch(() => []),
        ]),
      ]);

      // ── Process today's schedule ──
      // Each schedule entry has show embedded; deduplicate by show id
      const scheduleShows = [];
      const seenIds = new Set();
      if (Array.isArray(scheduleRes)) {
        for (const entry of scheduleRes) {
          const show = entry._embedded?.show ?? entry.show;
          if (show && show.image?.medium && !seenIds.has(show.id)) {
            seenIds.add(show.id);
            scheduleShows.push(show);
          }
        }
      }

      // ── Process popular shows ──
      const popularShows = popularRes
        .filter((r) => r.status === "fulfilled" && r.value?.image?.medium)
        .map((r) => r.value)
        // Deduplicate (we have one duplicate ID in the list)
        .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

      // ── Process recent premiers ──
      const recentAll = [...recentRes[0], ...recentRes[1], ...recentRes[2]]
        .filter((s) => s?.image?.medium && s?.premiered);
      // Sort by premiere date descending
      recentAll.sort((a, b) => new Date(b.premiered) - new Date(a.premiered));

      // ── Top rated from popular pool ──
      const byRating = [...popularShows].sort(
        (a, b) => (b.rating?.average ?? 0) - (a.rating?.average ?? 0)
      );

      // ── Featured: pick from highly rated shows that have a backdrop image ──
      const featuredPool = [
        ...popularShows.filter((s) => s.image?.original && (s.rating?.average ?? 0) >= 8),
        ...scheduleShows.filter((s) => s.image?.original && (s.rating?.average ?? 0) >= 7),
      ];
      const featuredPick = featuredPool[Math.floor(Math.random() * Math.min(featuredPool.length, 10))]
        ?? popularShows[0];

      setFeatured(featuredPick ?? null);
      setOnAirToday(scheduleShows.slice(0, 20));
      setTopRated(byRating.slice(0, 20));
      setRecentPremiers(recentAll.slice(0, 20));
      setDramas(
        [...popularShows, ...scheduleShows]
          .filter((s) => s.genres?.includes("Drama") && s.image?.medium)
          .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
          .slice(0, 18)
      );
      setComedies(
        [...popularShows, ...scheduleShows]
          .filter((s) => s.genres?.includes("Comedy") && s.image?.medium)
          .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
          .slice(0, 18)
      );
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

  // Genre-filter the on-air pool, fall back to topRated if empty
  const filteredOnAir =
    activeFilter === "All"
      ? onAirToday
      : onAirToday.filter((s) => s.genres?.includes(toTvMazeGenre(activeFilter)));

  const basePool = filteredOnAir.length > 0
    ? filteredOnAir
    : topRated.filter((s) =>
        activeFilter === "All" ? true : s.genres?.includes(toTvMazeGenre(activeFilter))
      );

  // Apply sort to the browseable "first row" pool
  const trendingDisplay = [...basePool].sort((a, b) => {
    if (activeSort === "Top Rated") return (b.rating?.average ?? 0) - (a.rating?.average ?? 0);
    if (activeSort === "A–Z") return (a.name ?? "").localeCompare(b.name ?? "");
    if (activeSort === "New") return new Date(b.premiered ?? 0) - new Date(a.premiered ?? 0);
    // "Trending" — keep original order (on-air order / curated order)
    return 0;
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FadeInView>
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
        {/* ── Page heading ── */}
        <View style={styles.pageHead}>
          <Text style={styles.pageHeadTitle}>Discover</Text>
          <Text style={styles.pageHeadSub}>Find your next obsession</Text>
        </View>

        {/* ── Genre filter pills ── */}
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

        {/* ── Sort bar ── */}
        <View style={styles.sortBar}>
          {["Trending", "Top Rated", "A–Z", "New"].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.sortChip, activeSort === opt && styles.sortChipActive]}
              onPress={() => setActiveSort(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortChipText, activeSort === opt && styles.sortChipTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Hero banner ── */}
        <HeroBanner show={featured} navigation={navigation} />

        {/* ── Show rows ── */}
        {basePool.length > 0 && (
          <SectionRow
            emoji="📺"
            title={
              activeSort === "Top Rated" ? "Top Rated Shows" :
              activeSort === "A–Z" ? "Shows A–Z" :
              activeSort === "New" ? "Newest Shows" :
              "On Air Today"
            }
            data={trendingDisplay}
            navigation={navigation}
          />
        )}
        <SectionRow
          emoji="⭐"
          title="Top Rated All Time"
          data={topRated}
          navigation={navigation}
        />
        <SectionRow
          emoji="✨"
          title="Recently Added"
          data={recentPremiers}
          navigation={navigation}
        />
        {dramas.length > 0 && (
          <SectionRow
            emoji="🎭"
            title="Popular Dramas"
            data={dramas}
            navigation={navigation}
          />
        )}
        {comedies.length > 0 && (
          <SectionRow
            emoji="😂"
            title="Fan Favorite Comedies"
            data={comedies}
            navigation={navigation}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </FadeInView>
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
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.accent,
    letterSpacing: 3,
  },
  logoSub: {
    fontSize: 10,
    fontFamily: "DMSans_400Regular",
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
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.5,
  },
  pageHeadSub: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: C.subtext,
    marginTop: 2,
    letterSpacing: 0.2,
  },

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

  // Sort bar
  sortBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortChipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent + "80",
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.muted,
  },
  sortChipTextActive: {
    color: C.accent,
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
    fontFamily: "DMSerifDisplay_400Regular",
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
    fontFamily: "DMSans_700Bold",
    color: C.text,
    letterSpacing: -0.1,
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