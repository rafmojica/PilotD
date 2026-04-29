import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";

// ─── Constants ──────────────────────────────────────────────────────────────

const TVMAZE = "https://api.tvmaze.com";

// BUG FIX 1: Added `heart: "#EF4444"` to the C palette.
// The original code used `C.heart` in JSX inline styles (e.g. `{ color: C.heart }`)
// but `C` had no `heart` property — the value was `undefined`. In React Native,
// `color: undefined` renders as no color (effectively invisible on the dark card
// background). The `C_heart` const defined further down existed but was unused.
// Fix: add the missing key directly to C so it's accessible everywhere in this file.
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
  success: "#40916C",
  heart: "#EF4444",       // BUG FIX 1: was missing, caused `color: undefined`
  heartSoft: "#EF444420", // added for consistency with other screens
  tag1: "#40916C",
  tag2: "#52B788",
  tag3: "#2D6A4F",
  tag4: "#95D5B2",
  tag5: "#F59E0B",
  tag6: "#EF4444",
};

// ─── Mock list data ───────────────────────────────────────────────────────────

const MOCK_LISTS = [
  {
    id: "l1",
    title: "Shows That Will Break You",
    description:
      "Emotionally devastating series that reward your investment with gut-punch finales. Watch with tissues.",
    createdBy: "sara_m",
    displayName: "Sara M.",
    initials: "SM",
    avatarColor: "#8B5CF6",
    likes: 8412,
    showCount: 14,
    tagColor: C.tag4,
    tagLabel: "Emotional",
    showIds: [169, 1621, 132, 4],
    featured: true,
  },
  {
    id: "l2",
    title: "Prestige TV Starter Pack",
    description:
      "The essential watching list for anyone wanting to get into quality television. Start here.",
    createdBy: "tv_dad",
    displayName: "James R.",
    initials: "JR",
    avatarColor: "#D97706",
    likes: 6203,
    showCount: 12,
    tagColor: C.tag1,
    tagLabel: "Essential",
    showIds: [169, 54782, 41734, 1399],
    featured: false,
  },
  {
    id: "l3",
    title: "Binge-Proof Series",
    description:
      "Shows so addictive you won't sleep. Each episode ends in a cliffhanger. Don't say you weren't warned.",
    createdBy: "night_owl_99",
    displayName: "Priya K.",
    initials: "PK",
    avatarColor: "#0EA5E9",
    likes: 5891,
    showCount: 10,
    tagColor: C.tag2,
    tagLabel: "Bingeable",
    showIds: [118, 73, 2993, 6771],
    featured: false,
  },
  {
    id: "l4",
    title: "Sci-Fi That Takes You Seriously",
    description:
      "Genre TV that respects your intelligence. Complex world-building, real consequences, actual science.",
    createdBy: "xeno_watch",
    displayName: "Alex T.",
    initials: "AT",
    avatarColor: "#10B981",
    likes: 4320,
    showCount: 9,
    tagColor: C.tag3,
    tagLabel: "Sci-Fi",
    showIds: [41734, 54782, 180, 155],
    featured: false,
  },
  {
    id: "l5",
    title: "Comfort Re-Watches",
    description:
      "Safe, warm, and endlessly re-watchable. Put these on when you need a hug from your TV.",
    createdBy: "cozy_viewer",
    displayName: "Lily C.",
    initials: "LC",
    avatarColor: "#F59E0B",
    likes: 3947,
    showCount: 11,
    tagColor: C.tag5,
    tagLabel: "Cozy",
    showIds: [66, 526, 1371, 216],
    featured: false,
  },
  {
    id: "l6",
    title: "Crime Thrillers That Slap",
    description:
      "Cat-and-mouse tension, moral ambiguity, and twists you didn't see coming. The best of crime TV.",
    createdBy: "detective_m",
    displayName: "Marco D.",
    initials: "MD",
    avatarColor: "#EF4444",
    likes: 3102,
    showCount: 8,
    tagColor: C.tag6,
    tagLabel: "Crime",
    showIds: [169, 132, 2993, 526],
    featured: false,
  },
  {
    id: "l7",
    title: "Hidden Gems Most People Miss",
    description:
      "Critically acclaimed but severely under-watched. These shows deserve 10x the audience they got.",
    createdBy: "underrated_tv",
    displayName: "Sam B.",
    initials: "SB",
    avatarColor: "#40916C",
    likes: 2714,
    showCount: 13,
    tagColor: C.tag1,
    tagLabel: "Hidden",
    showIds: [1621, 118, 41734, 2993],
    featured: false,
  },
];

const LIST_SORT = ["Most Liked", "Newest", "Most Shows"];
const LIST_TAGS = ["All", "Essential", "Emotional", "Sci-Fi", "Bingeable", "Cozy", "Crime"];

// ─── AvatarCircle ────────────────────────────────────────────────────────────

const AvatarCircle = ({ initials, color, size = 36 }) => (
  <View
    style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
  </View>
);

// ─── PosterMosaic component ───────────────────────────────────────────────────

const PosterMosaic = ({ posters, size = 100 }) => {
  const gap = 2;
  const tileSize = (size - gap) / 2;
  const tiles = [...posters, null, null, null, null].slice(0, 4);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        overflow: "hidden",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: gap,
        backgroundColor: C.surface,
      }}
    >
      {tiles.map((uri, i) =>
        uri ? (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: tileSize, height: tileSize }}
            resizeMode="cover"
          />
        ) : (
          <View
            key={i}
            style={{
              width: tileSize,
              height: tileSize,
              backgroundColor: C.muted,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 18, opacity: 0.4 }}>📺</Text>
          </View>
        )
      )}
    </View>
  );
};

// ─── FeaturedListCard component ───────────────────────────────────────────────

const FeaturedListCard = ({ list, posters }) => (
  <TouchableOpacity style={styles.featuredCard} activeOpacity={0.82}>
    {posters[0] && (
      <Image
        source={{ uri: posters[0] }}
        style={styles.featuredBg}
        resizeMode="cover"
      />
    )}
    <View style={styles.featuredOverlay} />

    <View style={styles.featuredContent}>
      <View style={[styles.tag, { backgroundColor: list.tagColor }]}>
        <Text style={styles.tagText}>{list.tagLabel}</Text>
      </View>

      <Text style={styles.featuredTitle}>{list.title}</Text>
      <Text style={styles.featuredDesc} numberOfLines={2}>
        {list.description}
      </Text>

      <View style={styles.featuredFooter}>
        <View style={styles.featuredUserRow}>
          <AvatarCircle initials={list.initials} color={list.avatarColor} size={28} />
          <View>
            <Text style={styles.featuredUser}>{list.displayName}</Text>
            <Text style={styles.featuredMeta}>
              {list.showCount} shows · ♥ {(list.likes / 1000).toFixed(1)}k
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View List →</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);

// ─── ListCard component ───────────────────────────────────────────────────────

const ListCard = ({ list, posters }) => {
  const [saved, setSaved] = useState(false);

  return (
    <TouchableOpacity style={styles.listCard} activeOpacity={0.78}>
      <PosterMosaic posters={posters} size={96} />

      <View style={styles.listInfo}>
        <View style={styles.listTitleRow}>
          <View style={[styles.tagSmall, { backgroundColor: list.tagColor + "25" }]}>
            <Text style={[styles.tagSmallText, { color: list.tagColor }]}>
              {list.tagLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.listTitle} numberOfLines={2}>
          {list.title}
        </Text>
        <Text style={styles.listDesc} numberOfLines={2}>
          {list.description}
        </Text>
        <View style={styles.listFooter}>
          <AvatarCircle initials={list.initials} color={list.avatarColor} size={22} />
          <Text style={styles.listAuthor}>{list.displayName}</Text>
          <Text style={styles.listDot}>·</Text>
          <Text style={styles.listMeta}>{list.showCount} shows</Text>
          <Text style={styles.listDot}>·</Text>
          {/* BUG FIX 1 (usage site): C.heart is now defined, renders correctly */}
          <Text style={[styles.listMeta, { color: C.heart }]}>
            ♥ {list.likes >= 1000 ? `${(list.likes / 1000).toFixed(1)}k` : list.likes}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saved && styles.saveBtnActive]}
        onPress={() => setSaved((p) => !p)}
      >
        <Text style={[styles.saveBtnText, saved && styles.saveBtnTextActive]}>
          {saved ? "✓" : "+"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─── PublicListsHeader component ──────────────────────────────────────────────
// BUG FIX 2: Extracted the list header to a standalone component defined OUTSIDE
// the main PublicLists component, for the same reason as MostPopularComments:
//
// Defining ListHeader inside the render function creates a new function reference
// on every state change (filter, sort). FlatList sees a new component type and
// REMOUNTS the entire header, resetting scroll position and flashing the UI each
// time the user taps a filter pill or sort option. Extracted to a named component
// here and wrapped in useCallback at the call site to keep the reference stable.

const PublicListsHeader = ({
  featured,
  getPostersForList,
  activeTag,
  onTagChange,
  activeSort,
  onSortChange,
  visibleCount,
}) => (
  <>
    {/* Top bar */}
    <View style={styles.topBar}>
      <View>
        <Text style={styles.logoText}>PILOTD</Text>
        <Text style={styles.logoSub}>Track. Rate. Discover.</Text>
      </View>
      <TouchableOpacity style={styles.createBtn}>
        <Text style={styles.createBtnText}>+ Create List</Text>
      </TouchableOpacity>
    </View>

    {/* Page heading */}
    <View style={styles.pageHead}>
      <Text style={styles.pageHeadTitle}>Public Lists</Text>
      <Text style={styles.pageHeadSub}>
        Curated collections from the community
      </Text>
    </View>

    {/* Featured list card */}
    {featured && (
      <View style={styles.featuredWrap}>
        <FeaturedListCard
          list={featured}
          posters={getPostersForList(featured)}
        />
      </View>
    )}

    {/* Tag filter pills */}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tagRow}
    >
      {LIST_TAGS.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.pill, activeTag === t && styles.pillActive]}
          onPress={() => onTagChange(t)}
        >
          <Text style={[styles.pillText, activeTag === t && styles.pillTextActive]}>
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    {/* Sort row */}
    <View style={styles.sortRow}>
      <Text style={styles.sortLabel}>Sort by:</Text>
      {LIST_SORT.map((s) => (
        <TouchableOpacity
          key={s}
          onPress={() => onSortChange(s)}
          style={[styles.sortOption, activeSort === s && styles.sortOptionActive]}
        >
          <Text style={[styles.sortOptionText, activeSort === s && styles.sortOptionTextActive]}>
            {s}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.listCountLabel}>
      {visibleCount} list{visibleCount !== 1 ? "s" : ""}
    </Text>
  </>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const PublicLists = () => {
  const [posterMap, setPosterMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSort, setActiveSort] = useState("Most Liked");
  const [activeTag, setActiveTag] = useState("All");

  const fetchPosters = useCallback(async () => {
    try {
      const allIds = [...new Set(MOCK_LISTS.flatMap((l) => l.showIds))];

      const results = await Promise.allSettled(
        allIds.map((id) =>
          fetch(`${TVMAZE}/shows/${id}`)
            .then((r) => r.json())
            .then((data) => ({ id, uri: data?.image?.medium ?? null }))
        )
      );

      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.uri) {
          map[r.value.id] = r.value.uri;
        }
      });
      setPosterMap(map);
    } catch (err) {
      console.error("[PublicLists] error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosters();
  }, [fetchPosters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosters();
  };

  const getPostersForList = useCallback(
    (list) => list.showIds.map((id) => posterMap[id]).filter(Boolean),
    [posterMap]
  );

  const visibleLists = MOCK_LISTS.filter(
    (l) => activeTag === "All" || l.tagLabel === activeTag
  ).sort((a, b) => {
    if (activeSort === "Most Liked") return b.likes - a.likes;
    if (activeSort === "Most Shows") return b.showCount - a.showCount;
    return b.id.localeCompare(a.id);
  });

  const featured = visibleLists.find((l) => l.featured) ?? visibleLists[0];
  const restLists = visibleLists.filter((l) => l.id !== featured?.id);

  const renderItem = ({ item }) => (
    <ListCard list={item} posters={getPostersForList(item)} />
  );

  // BUG FIX 2: renderListHeader is memoized; it only changes when the filter/sort
  // state actually changes, so FlatList's header stays mounted between unrelated
  // re-renders of the parent.
  const renderListHeader = useCallback(
    () => (
      <PublicListsHeader
        featured={featured}
        getPostersForList={getPostersForList}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        activeSort={activeSort}
        onSortChange={setActiveSort}
        visibleCount={visibleLists.length}
      />
    ),
    [featured, getPostersForList, activeTag, activeSort, visibleLists.length]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading lists…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FlatList
        data={restLists}
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
  separator: { height: 12 },

  // Top bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  logoText: { fontSize: 20, fontFamily: "DMSerifDisplay_400Regular", color: C.accent, letterSpacing: 3 },
  logoSub: { fontSize: 10, fontFamily: "DMSans_400Regular", color: C.subtext, letterSpacing: 1.2, marginTop: 1 },
  createBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Page head
  pageHead: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  pageHeadTitle: {
    fontSize: 30,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.5,
  },
  pageHeadSub: { fontSize: 13, fontFamily: "DMSans_400Regular", color: C.subtext, marginTop: 3, letterSpacing: 0.2 },

  // Featured card
  featuredWrap: { paddingHorizontal: 20, marginBottom: 20 },
  featuredCard: {
    height: 240,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  featuredBg: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  featuredOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#081C15",
    opacity: 0.82,
  },
  featuredContent: {
    flex: 1,
    padding: 18,
    justifyContent: "flex-end",
  },
  tag: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  tagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  featuredTitle: {
    fontSize: 20,
    fontFamily: "DMSerifDisplay_400Regular",
    color: C.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  featuredDesc: {
    fontSize: 13,
    color: "#9E9EB5",
    lineHeight: 19,
    marginBottom: 14,
  },
  featuredFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredUserRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featuredUser: { fontSize: 13, fontWeight: "700", color: C.text },
  featuredMeta: { fontSize: 11, color: C.subtext, marginTop: 1 },
  viewBtn: {
    backgroundColor: C.accent,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  viewBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Tag pills
  tagRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 6,
  },
  pillActive: { backgroundColor: C.accent, borderColor: C.accent },
  pillText: { fontSize: 13, fontWeight: "600", color: C.subtext },
  pillTextActive: { color: "#fff" },

  // Sort row
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 10,
  },
  sortLabel: { fontSize: 12, color: C.subtext, fontWeight: "500" },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  sortOptionActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent + "60",
  },
  sortOptionText: { fontSize: 12, color: C.subtext, fontWeight: "600" },
  sortOptionTextActive: { color: C.accent },

  listCountLabel: {
    fontSize: 11,
    color: C.subtext,
    paddingHorizontal: 20,
    marginBottom: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // List card
  listCard: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  listInfo: { flex: 1 },
  listTitleRow: { flexDirection: "row", marginBottom: 5 },
  tagSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  tagSmallText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.6 },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.1,
    marginBottom: 4,
  },
  listDesc: {
    fontSize: 12,
    color: C.subtext,
    lineHeight: 17,
    marginBottom: 8,
  },
  listFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  listAuthor: { fontSize: 11, color: C.text, fontWeight: "600" },
  listDot: { fontSize: 11, color: C.muted },
  listMeta: { fontSize: 11, color: C.subtext, fontWeight: "500" },

  saveBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  saveBtnActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent + "60",
  },
  saveBtnText: { fontSize: 16, color: C.subtext, fontWeight: "700" },
  saveBtnTextActive: { color: C.accent },

  // Avatar
  avatar: { justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
});

export default PublicLists;
