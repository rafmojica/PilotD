import React, { useState, useEffect, useCallback } from "react";
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

// ─── Constants ────────────────────────────────────────────────────────────────

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
};

// ─── Mock diary entries ───────────────────────────────────────────────────────
// Each entry can be a full show, a specific season, or a specific episode.
// Replace with real Firebase reads once auth is wired up.
//
// Firebase structure for reference:
//   users/{uid}/diary/{entryId} = {
//     showId, showName,
//     type: "show" | "season" | "episode",
//     seasonNumber?,
//     episodeNumber?,
//     episodeName?,
//     rating,        // 0–5
//     review?,       // optional text
//     watchedDate,   // timestamp
//     rewatch,       // bool
//     liked,         // bool
//   }

const MOCK_DIARY = [
  {
    id: "d1",
    showId: 169,
    showName: "Breaking Bad",
    type: "show",
    rating: 5,
    review: "One of the greatest shows ever made. The transformation of Walter White is unmatched in television history.",
    watchedDate: new Date("2024-04-18"),
    rewatch: false,
    liked: true,
  },
  {
    id: "d2",
    showId: 82,
    showName: "Game of Thrones",
    type: "season",
    seasonNumber: 4,
    rating: 5,
    review: "Peak Game of Thrones. The writing here is just incredible.",
    watchedDate: new Date("2024-04-12"),
    rewatch: true,
    liked: true,
  },
  {
    id: "d3",
    showId: 1621,
    showName: "Mr. Robot",
    type: "episode",
    seasonNumber: 3,
    episodeNumber: 5,
    episodeName: "eps3.4_runtime-error.r00",
    rating: 5,
    review: "The one-shot episode. Possibly the best single episode of television I have ever seen.",
    watchedDate: new Date("2024-04-05"),
    rewatch: false,
    liked: true,
  },
  {
    id: "d4",
    showId: 526,
    showName: "Black Mirror",
    type: "season",
    seasonNumber: 3,
    rating: 4,
    review: null,
    watchedDate: new Date("2024-03-29"),
    rewatch: false,
    liked: false,
  },
  {
    id: "d5",
    showId: 41734,
    showName: "Westworld",
    type: "show",
    rating: 3.5,
    review: "Started incredible, lost me by season 3.",
    watchedDate: new Date("2024-03-20"),
    rewatch: false,
    liked: false,
  },
  {
    id: "d6",
    showId: 118,
    showName: "Arrested Development",
    type: "show",
    rating: 5,
    review: "Still one of the funniest shows ever written.",
    watchedDate: new Date("2024-03-10"),
    rewatch: true,
    liked: true,
  },
  {
    id: "d7",
    showId: 132,
    showName: "The Wire",
    type: "season",
    seasonNumber: 4,
    rating: 5,
    review: null,
    watchedDate: new Date("2024-02-28"),
    rewatch: false,
    liked: true,
  },
  {
    id: "d8",
    showId: 2993,
    showName: "Fargo",
    type: "show",
    rating: 4.5,
    review: "Season 1 is perfect television.",
    watchedDate: new Date("2024-02-14"),
    rewatch: false,
    liked: false,
  },
  {
    id: "d9",
    showId: 66,
    showName: "Skins",
    type: "season",
    seasonNumber: 2,
    rating: 4,
    review: null,
    watchedDate: new Date("2024-01-30"),
    rewatch: true,
    liked: false,
  },
  {
    id: "d10",
    showId: 169,
    showName: "Breaking Bad",
    type: "episode",
    seasonNumber: 5,
    episodeNumber: 14,
    episodeName: "Ozymandias",
    rating: 5,
    review: "The single best episode of Breaking Bad. Maybe of anything.",
    watchedDate: new Date("2024-01-15"),
    rewatch: true,
    liked: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Groups diary entries by "Month Year" label
const groupByMonth = (entries) => {
  const groups = {};
  entries.forEach((entry) => {
    const label = entry.watchedDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  });
  // Return as array of { month, entries }
  return Object.entries(groups).map(([month, entries]) => ({ month, entries }));
};

const formatDay = (date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ─── Stars ────────────────────────────────────────────────────────────────────

const Stars = ({ rating, size = 12 }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {Array(full).fill(null).map((_, i) => (
        <Text key={`f${i}`} style={{ color: C.gold, fontSize: size }}>★</Text>
      ))}
      {half && <Text style={{ color: C.gold, fontSize: size }}>½</Text>}
      {Array(empty).fill(null).map((_, i) => (
        <Text key={`e${i}`} style={{ color: C.muted, fontSize: size }}>★</Text>
      ))}
    </View>
  );
};

// ─── Entry type label ─────────────────────────────────────────────────────────
// Shows what kind of entry it is: full show, season, or episode

const EntryTypeLabel = ({ entry }) => {
  let label = "Show";
  let color = C.accent;

  if (entry.type === "season") {
    label = `S${entry.seasonNumber}`;
    color = C.gold;
  } else if (entry.type === "episode") {
    label = `S${entry.seasonNumber}E${entry.episodeNumber}`;
    color = "#A78BFA"; // purple for episodes
  }

  return (
    <View style={[styles.typeTag, { backgroundColor: color + "25" }]}>
      <Text style={[styles.typeTagText, { color }]}>{label}</Text>
    </View>
  );
};

// ─── Diary entry row ──────────────────────────────────────────────────────────

const DiaryEntry = ({ entry, posterUri, onPress }) => {
  const [liked, setLiked] = useState(entry.liked);

  return (
    <TouchableOpacity style={styles.entryRow} onPress={onPress} activeOpacity={0.78}>
      {/* Date column */}
      <View style={styles.dateCol}>
        <Text style={styles.dateDay}>
          {entry.watchedDate.toLocaleDateString("en-US", { day: "numeric" })}
        </Text>
        <Text style={styles.dateMon}>
          {entry.watchedDate.toLocaleDateString("en-US", { month: "short" })}
        </Text>
      </View>

      {/* Poster */}
      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={{ fontSize: 20 }}>📺</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.entryInfo}>
        <View style={styles.entryTitleRow}>
          <Text style={styles.entryTitle} numberOfLines={1}>
            {entry.showName}
          </Text>
          <EntryTypeLabel entry={entry} />
        </View>

        {/* Episode name if applicable */}
        {entry.type === "episode" && entry.episodeName && (
          <Text style={styles.episodeName} numberOfLines={1}>
            <Text style={styles.episodeName} numberOfLines={1}>
              {`"${entry.episodeName}"`}
            </Text>
          </Text>
        )}

        {/* Rating + rewatch badge */}
        <View style={styles.entryMeta}>
          {entry.rating > 0 && <Stars rating={entry.rating} size={12} />}
          {entry.rewatch && (
            <View style={styles.rewatchBadge}>
              <Text style={styles.rewatchText}>↺ Rewatch</Text>
            </View>
          )}
        </View>

        {/* Review snippet */}
        {entry.review && (
          <Text style={styles.reviewSnippet} numberOfLines={2}>
            {entry.review}
          </Text>
        )}
      </View>

      {/* Like button */}
      <TouchableOpacity
        style={styles.likeBtn}
        onPress={(e) => {
          e.stopPropagation?.();
          setLiked((p) => !p);
          // TODO: update liked status in Firebase
        }}
      >
        <Text style={[styles.likeIcon, { color: liked ? C.heart : C.muted }]}>
          {liked ? "♥" : "♡"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─── Month group header ───────────────────────────────────────────────────────

const MonthHeader = ({ month, count }) => (
  <View style={styles.monthHeader}>
    <Text style={styles.monthLabel}>{month}</Text>
    <Text style={styles.monthCount}>{count} {count === 1 ? "entry" : "entries"}</Text>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const Diary = ({ navigation }) => {
  const [posterMap, setPosterMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPosters = useCallback(async () => {
    try {
      const allIds = [...new Set(MOCK_DIARY.map((e) => e.showId))];
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
      console.error("[Diary] poster fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosters(); }, [fetchPosters]);

  const grouped = groupByMonth(
    [...MOCK_DIARY].sort((a, b) => b.watchedDate - a.watchedDate)
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading diary…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Diary</Text>
            <Text style={styles.pageSub}>{MOCK_DIARY.length} entries</Text>
          </View>
        </View>

        {/* ── Grouped entries ── */}
        {grouped.map(({ month, entries }) => (
          <View key={month}>
            <MonthHeader month={month} count={entries.length} />
            {entries.map((entry, index) => (
              <View key={entry.id}>
                <DiaryEntry
                  entry={entry}
                  posterUri={posterMap[entry.showId]}
                  onPress={() =>
                    navigation.navigate("ShowCard", { showId: entry.showId })
                  }
                />
                {index < entries.length - 1 && (
                  <View style={styles.entryDivider} />
                )}
              </View>
            ))}
          </View>
        ))}

        {MOCK_DIARY.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyTitle}>Your diary is empty</Text>
            <Text style={styles.emptySub}>
              Start watching and rating shows to fill your diary
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 48 },
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
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.4,
  },
  pageSub: {
    fontSize: 12,
    color: C.subtext,
    marginTop: 2,
  },

  // Month group
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 10,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
  },
  monthCount: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
  },

  // Entry row
  entryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  entryDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  // Date column
  dateCol: {
    width: 32,
    alignItems: "center",
    paddingTop: 2,
  },
  dateDay: {
    fontSize: 17,
    fontWeight: "800",
    color: C.text,
    lineHeight: 20,
  },
  dateMon: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Poster
  poster: {
    width: 52,
    height: 76,
    borderRadius: 7,
    backgroundColor: C.surface,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Entry info
  entryInfo: { flex: 1, gap: 4 },
  entryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    flex: 1,
  },
  episodeName: {
    fontSize: 11,
    color: C.subtext,
    fontStyle: "italic",
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rewatchBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rewatchText: {
    fontSize: 10,
    color: C.accent,
    fontWeight: "600",
  },
  reviewSnippet: {
    fontSize: 12,
    color: C.subtext,
    lineHeight: 17,
    fontStyle: "italic",
  },

  // Type tag
  typeTag: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  // Like button
  likeBtn: {
    paddingTop: 2,
    paddingLeft: 4,
  },
  likeIcon: {
    fontSize: 18,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptySub: {
    fontSize: 13,
    color: C.subtext,
    textAlign: "center",
    lineHeight: 19,
  },
});

export default Diary;